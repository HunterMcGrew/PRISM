#!/usr/bin/env node
/**
 * run-gates.mjs — Stop and SubagentStop verdict ratification hook.
 *
 * Fires when a persona attempts to stop. Reads the persona's report.json, validates its
 * shape and coherence, then runs evidence gates to ratify or override the claimed verdict.
 * Exit 2 prevents the stop and injects the real failure as feedback (the model's next turn
 * sees it). Allows the stop on exit 0. See ADR-0067 (the inversion principle).
 *
 * Channel-hardening: ratified-verdict.json is written as an audit artifact only — what
 * ran, exit codes, strike count. It is never read back as a routing input. Sol and the
 * human read the model's structured return, which this hook guarantees is gate-consistent
 * before the stop is allowed.
 *
 * Payload shape (Stop, confirmed against Claude Code hook docs 2026-06-26):
 *   { session_id, cwd, hook_event_name, stop_reason, permission_mode, effort,
 *     agent_id?, agent_type? }
 *   Note: stop_hook_active does NOT exist in the Stop payload (confirmed 2026-06-26).
 *   The stop_reason field is present ("end_turn", "max_tokens", "tool_use", "stop_sequence").
 *   The 3-strike counter is the sole ceiling against infinite re-injection.
 *
 * SubagentStop carries the same fields plus agent_id and agent_type in subagent context.
 */

import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { resolvePersona } from './lib/resolve-persona.mjs';

const STRIKE_CAP = 3;
const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

const VALID_VERDICTS = new Set([
  'done', 'needs-fix', 'blocked', 'needs-replan', 'needs-stronger-model', 'needs-human',
]);

// Universal verdict-to-route constraints (per report-contract.md § Verdict-to-route coherence).
const VERDICT_ROUTE_CONSTRAINTS = {
  'needs-replan':         { allowed: ['winston', 'human'] },
  'blocked':              { allowed: ['human'] },
  'needs-stronger-model': { gateInjected: true }, // persona must not emit directly
  'needs-human':          { allowed: ['human'] },
};

// --- Entry point ---

const raw = readFileSync(0, 'utf8');
let payload;
try {
  payload = JSON.parse(raw);
} catch (e) {
  process.stderr.write(`run-gates: failed to parse hook payload: ${e.message}\n`);
  process.exit(0);
}

let gatesData;
try {
  const gatesPath = path.join(projectDir, '.claude', 'hooks', 'gates.json');
  gatesData = JSON.parse(readFileSync(gatesPath, 'utf8'));
} catch (e) {
  process.stderr.write(`run-gates: could not load gates.json: ${e.message}\n`);
  process.exit(0);
}

const resolved = resolvePersona(payload, gatesData, projectDir);
if (resolved === null) {
  // Non-gated dispatch — permit the stop.
  process.exit(0);
}

const { persona } = resolved;
const entry = gatesData[persona];
if (!entry) {
  process.exit(0);
}

// runKey = agent_id ?? session_id — keyed by agent to prevent fleet-lane collision.
const runKey = payload.agent_id ?? payload.session_id;
if (!runKey) {
  process.stderr.write(`run-gates: cannot determine runKey — no agent_id or session_id in payload\n`);
  process.exit(0);
}

const evidenceDir = path.join(projectDir, '.prism', 'evidence', runKey);
mkdirSync(evidenceDir, { recursive: true });

// --- Strike counter ---

const strikeFile = path.join(evidenceDir, 'strikes.json');
let strikeCount = 0;
try {
  const strikeRaw = readFileSync(strikeFile, 'utf8');
  const strikes = JSON.parse(strikeRaw);
  strikeCount = strikes.count ?? 0;
} catch (e) {
  if (e.code === 'ENOENT') {
    // No strike file yet — first stop attempt, strike count starts at 0.
  } else {
    // File exists but is corrupted (parse error or other I/O failure).
    // Fail safe: treat as at-cap rather than silently resetting to 0.
    // A corrupted ceiling must escalate, not disappear — the 3-strike counter is the
    // sole loop ceiling (stop_hook_active confirmed absent from Stop payload).
    process.stderr.write(
      `run-gates: strikes.json is corrupted (${e.message}) — treating as at strike cap to fail safe.\n` +
      `Delete .prism/evidence/${runKey}/strikes.json to reset.\n`
    );
    strikeCount = STRIKE_CAP;
  }
}

// --- Shape validation ---

const reportPath = path.join(evidenceDir, 'report.json');
const shapeResult = validateShape(reportPath, entry.allowed_routes ?? []);
if (!shapeResult.ok) {
  // Shape validation failed — re-inject the error message, increment strikes, force continue.
  const newStrike = strikeCount + 1;
  writeStrikeFile(strikeFile, newStrike, runKey);

  if (newStrike >= STRIKE_CAP) {
    injectNeedsStrongerModel(runKey, persona, evidenceDir, [`Shape validation failed: ${shapeResult.error}`]);
  } else {
    process.stderr.write(
      `[run-gates] Shape validation failed (strike ${newStrike}/${STRIKE_CAP}):\n` +
      `${shapeResult.error}\n\n` +
      `Fix report.json at ${reportPath} and try again.\n`
    );
    process.exit(2);
  }
}

const report = shapeResult.report;

// --- Preconditions ---

const preconditionFailures = [];
for (const pre of (entry.preconditions ?? [])) {
  const result = runCheck(pre.check, runKey, evidenceDir, projectDir);
  if (!result.passed) {
    preconditionFailures.push({ pre, result });
  }
}

if (preconditionFailures.length > 0) {
  // A precondition failure is a protocol miss — the environment was wrong (e.g. report.json
  // not found), not a substantive gate failure (work did not hold up). Protocol misses get
  // a re-prompt without consuming a gate strike, so a missing report file cannot burn the
  // sole loop ceiling (the 3-strike cap) on what is essentially a setup error.
  const failure = preconditionFailures[0];
  const onFail = failure.pre.on_fail ?? 'needs-replan';
  const message = (
    `[run-gates] Precondition '${failure.pre.id}' failed (→ ${onFail}):\n` +
    `${failure.pre.description}\n` +
    `Check result: ${failure.result.output ?? failure.result.error ?? 'non-zero exit'}\n` +
    `Resolve the precondition before stopping. (This re-prompt does not consume a gate strike.)\n`
  );

  // No strike increment — precondition misses do not count toward the 3-strike ceiling.
  process.stderr.write(message);
  process.exit(2);
}

// --- Evidence gates ---

const gateFailures = [];
const gateResults = [];

for (const gate of (entry.gates ?? [])) {
  const claimed = report.checklist?.[gate.checklist_key];
  // Use runGateCheck (not runCheck) to respect the gate's source field:
  // 'ledger' gates read prior evidence before falling back to fresh;
  // 'fresh' gates always run the command now.
  const result = runGateCheck(gate, runKey, evidenceDir, projectDir);

  gateResults.push({ gate, claimed, result });

  if (claimed && !result.passed) {
    // Persona claimed this checklist item was satisfied — the gate says otherwise.
    gateFailures.push({ gate, result });
  } else if (!claimed && !result.passed && gate.checklist_key) {
    // Gate ran, failed, and the persona did not claim it. Non-blocking visibility note:
    // checklist: {} passes all gates because nothing is claimed, so a failing gate
    // that goes unclaimed would be silently ignored without this warning. This does not
    // block the stop — it surfaces the gap so Phase 5 can address unclaimed gates properly.
    process.stderr.write(
      `[run-gates] Warning: gate '${gate.id}' failed but '${gate.checklist_key}' was not claimed in the checklist.\n` +
      `The gate did not block (unclaimed), but the underlying check is failing. ` +
      `Consider claiming the checklist key or investigating the failure.\n`
    );
  }
}

// --- Verdict reconciliation ---

const hasFailures = gateFailures.length > 0;
const claimedDone = report.verdict === 'done';

if (hasFailures) {
  // One or more claimed-true items failed their gate — override the verdict.
  const newStrike = strikeCount + 1;
  writeStrikeFile(strikeFile, newStrike, runKey);

  const failureLines = gateFailures.map(({ gate, result }) =>
    `  Gate '${gate.id}' (${gate.description}): ${formatCheckResult(result)}`
  );

  if (newStrike >= STRIKE_CAP) {
    injectNeedsStrongerModel(runKey, persona, evidenceDir, failureLines);
  } else {
    process.stderr.write(
      `[run-gates] Verdict override: claimed '${report.verdict}' but ${gateFailures.length} gate(s) failed ` +
      `(strike ${newStrike}/${STRIKE_CAP}):\n` +
      failureLines.join('\n') + '\n\n' +
      `Fix the failing checks and re-emit your report before stopping.\n`
    );
    process.exit(2);
  }
}

// All gates passed — write the audit artifact and allow the stop.
writeAuditArtifact(evidenceDir, runKey, persona, report, gateResults, strikeCount);

// Channel-hardening: the audit artifact is written above as an audit record only.
// It is never read back as a routing input — Sol and the human read the model's
// structured return (report.json). The stop is allowed on exit 0.
process.exit(0);

// --- Helper functions ---

/**
 * Validates the shape of report.json for the current run.
 * Implements the four-step validation from report-contract.md § Reference validator.
 */
function validateShape(reportPath, allowedRoutes) {
  let raw;
  try {
    raw = readFileSync(reportPath, 'utf8');
  } catch {
    return { ok: false, error: 'report.json not found — emit your report before stopping.' };
  }

  let report;
  try {
    report = JSON.parse(raw);
  } catch (e) {
    return { ok: false, error: `report.json is not valid JSON: ${e.message}` };
  }

  const required = ['reasoning', 'persona', 'checklist', 'verdict', 'verdict_reason', 'next_route'];
  for (const field of required) {
    if (report[field] === undefined || report[field] === null) {
      return { ok: false, error: `Missing required field: ${field}` };
    }
  }

  if (!VALID_VERDICTS.has(report.verdict)) {
    return {
      ok: false,
      error: `Unknown verdict '${report.verdict}' — must be one of: ${[...VALID_VERDICTS].join(', ')}`,
    };
  }

  if (!isCoherent(report.verdict, report.next_route, allowedRoutes)) {
    return {
      ok: false,
      error: `next_route '${report.next_route}' is incoherent with verdict '${report.verdict}' — see report-contract.md § Verdict-to-route coherence.`,
    };
  }

  return { ok: true, report };
}

function isCoherent(verdict, nextRoute, allowedRoutes) {
  const constraint = VERDICT_ROUTE_CONSTRAINTS[verdict];
  // needs-stronger-model is gate-injected only — the persona cannot emit it directly.
  if (constraint?.gateInjected) return false;
  if (constraint?.allowed) return constraint.allowed.includes(nextRoute);
  // 'done' and 'needs-fix': validate against the persona's allowed_routes from gates.json.
  return allowedRoutes.includes(nextRoute);
}

/**
 * Runs a single CheckSpec and returns { passed: boolean, output?: string, error?: string }.
 *
 * Supports check kinds: 'command', 'file-exists', 'file-validates'.
 * For 'ledger' source gates, looks up the most recent matching command in the ledger;
 * falls back to running the command fresh if no matching entry is found.
 */
function runCheck(check, runKey, evidenceDir, projectDir) {
  if (check.kind === 'file-exists') {
    const checkPath = resolvePath(check.path, runKey, projectDir);
    return { passed: existsSync(checkPath) };
  }

  if (check.kind === 'file-validates') {
    const checkPath = resolvePath(check.path, runKey, projectDir);
    if (!existsSync(checkPath)) {
      return { passed: false, error: `File not found: ${checkPath}` };
    }
    try {
      JSON.parse(readFileSync(checkPath, 'utf8'));
      return { passed: true };
    } catch (e) {
      return { passed: false, error: `JSON parse failed: ${e.message}` };
    }
  }

  if (check.kind === 'command') {
    const cmd = resolveToken(check.command, projectDir);
    const expectedExit = check.exit_code ?? 0;

    const result = spawnSync(cmd, { shell: true, cwd: projectDir, encoding: 'utf8', timeout: 120000 });
    const actualExit = result.status ?? 1;
    const passed = actualExit === expectedExit;

    return {
      passed,
      output: (result.stdout ?? '') + (result.stderr ?? ''),
      exitCode: actualExit,
    };
  }

  return { passed: false, error: `Unknown check kind: ${check.kind}` };
}

/**
 * Runs a gate check using the ledger, falling back to fresh if no match found.
 *
 * For 'ledger' source gates: reads ledger.jsonl for the most recent entry whose
 * cmd matches the resolved command. Falls back to fresh if no match.
 * For 'fresh' source gates: always runs the command.
 */
function runGateCheck(gate, runKey, evidenceDir, projectDir) {
  if (gate.source === 'ledger') {
    const ledgerPath = path.join(evidenceDir, 'ledger.jsonl');
    if (existsSync(ledgerPath)) {
      const resolvedCmd = resolveToken(gate.check.command, projectDir);
      const lines = readFileSync(ledgerPath, 'utf8').trim().split('\n').filter(Boolean);

      // Search from newest to oldest for the most recent matching entry.
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const entry = JSON.parse(lines[i]);
          if (entry.cmd?.trim() === resolvedCmd.trim() && entry.exit_code !== null) {
            const expectedExit = gate.check.exit_code ?? 0;
            return { passed: entry.exit_code === expectedExit, exitCode: entry.exit_code, source: 'ledger' };
          }
        } catch {
          // Skip malformed ledger entries.
        }
      }
    }
    // No matching ledger entry — fall through to fresh run.
  }

  return { ...runCheck(gate.check, runKey, evidenceDir, projectDir), source: 'fresh' };
}

function resolvePath(p, runKey, projectDir) {
  return path.join(projectDir, p.replace(/\$\{runKey\}/g, runKey));
}

function resolveToken(command, projectDir) {
  // Phase 1: tokens like {{commands.typecheck}} are not yet wired to config.json.
  // Return the command string as-is; Phase 3 implements token resolution.
  return command;
}

function formatCheckResult(result) {
  if (result.exitCode !== undefined) {
    return `exit ${result.exitCode}${result.output ? ` — ${result.output.trim().slice(0, 200)}` : ''}`;
  }
  return result.error ?? 'check failed';
}

function writeStrikeFile(strikeFile, count, runKey) {
  writeFileSync(strikeFile, JSON.stringify({ count, runKey, ts: new Date().toISOString() }), 'utf8');
}

/**
 * Injects the needs-stronger-model re-emit instruction on strike cap.
 *
 * The gate, not the persona, owns this verdict. The injection tells the model to
 * re-emit its report with verdict: needs-stronger-model and next_route to the same
 * persona key (so Sol retries this persona at a stronger model tier). Per the report
 * contract, the persona cannot emit needs-stronger-model directly — the gate forces it.
 */
function injectNeedsStrongerModel(runKey, persona, evidenceDir, failureLines) {
  const message = (
    `[run-gates] Strike cap reached (${STRIKE_CAP}/${STRIKE_CAP}). Persistent gate failures:\n` +
    failureLines.join('\n') + '\n\n' +
    `ACTION REQUIRED: Re-emit your report.json with:\n` +
    `  verdict: "needs-stronger-model"\n` +
    `  next_route: "${persona}"\n` +
    `  verdict_reason: "Gate failures persisted after ${STRIKE_CAP} attempts — escalating to stronger model"\n` +
    `Then stop. Do not emit "done" — the gates will verify and override it again.\n`
  );

  writeAuditArtifact(evidenceDir, runKey, persona, null, [], STRIKE_CAP);
  process.stderr.write(message);
  process.exit(2);
}

/**
 * Writes ratified-verdict.json as an audit artifact only.
 *
 * Channel-hardening: this file records what the gate ran and the outcome.
 * It is NEVER read back as a routing input — Sol and the human read the model's
 * structured return (report.json). The audit artifact exists for forensics only.
 */
function writeAuditArtifact(evidenceDir, runKey, persona, report, gateResults, strikeCount) {
  const artifact = {
    ts: new Date().toISOString(),
    runKey,
    persona,
    verdict: report?.verdict ?? null,
    next_route: report?.next_route ?? null,
    strike_count: strikeCount,
    gates_run: gateResults.map(({ gate, claimed, result }) => ({
      id: gate.id,
      claimed,
      passed: result.passed,
      source: result.source,
      exit_code: result.exitCode ?? null,
    })),
  };

  try {
    writeFileSync(
      path.join(evidenceDir, 'ratified-verdict.json'),
      JSON.stringify(artifact, null, 2),
      'utf8'
    );
  } catch (e) {
    process.stderr.write(`run-gates: failed to write audit artifact: ${e.message}\n`);
  }
}
