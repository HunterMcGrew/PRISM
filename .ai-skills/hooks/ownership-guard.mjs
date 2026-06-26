#!/usr/bin/env node
/**
 * ownership-guard.mjs — PreToolUse ownership enforcement hook.
 *
 * Fires on Edit, Write, MultiEdit, and Bash tool calls. Resolves the active persona,
 * then enforces two constraints from the persona's ownership matrix in gates.json:
 *   - may_write: glob patterns the persona may write to. A write to any other path
 *     is denied before the tool executes.
 *   - may_not_run: command substrings the persona may never run via Bash. A match
 *     on any non-heredoc command line is denied before execution. All non-heredoc
 *     lines are checked so multi-line commands cannot bypass the guard by placing a
 *     forbidden command after line 1.
 *
 * Exit 2 blocks the tool call; stderr becomes Claude's feedback (naming allowed paths
 * or the prohibition that fired). This is the negative half of handoff enforcement:
 * making the next lane's work physically impossible, so handoff is the only remaining move.
 * See ADR-0067 § Handoff is enforced as named and coherent.
 *
 * Payload shape (PreToolUse, confirmed against Claude Code hook docs 2026-06-26):
 *   { session_id, cwd, hook_event_name, tool_name, tool_input: { file_path?, command? }, agent_id?, agent_type? }
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { resolvePersona } from './lib/resolve-persona.mjs';

// Paths no persona may write via tools, regardless of its may_write lane.
// The enforcement runtime and gate state — a gated party editing or resetting
// the runtime that gates it would void the floor's guarantee (ADR-0067 §
// gate non-circumventability). The evidence carve-out permits the one file the
// persona legitimately writes: its own report.json.
//
// These are checked BEFORE may_write so a may_write entry can never grant write
// access to the enforcement surface. No per-persona exception path exists — this
// is a global invariant by design.
//
// lib/ coverage: .claude/hooks/lib/ is entirely enforcement code (resolve-persona.mjs
// and any future helpers). The prefix match protects all current and future lib/ files
// without requiring individual path entries per module.
const PROTECTED_WRITE_PATHS = [
  '.claude/hooks/run-gates.mjs',
  '.claude/hooks/ownership-guard.mjs',
  '.claude/hooks/evidence-ledger.mjs',
  '.claude/hooks/gates.json',
  '.claude/settings.json',
];
const PROTECTED_LIB_PREFIX = '.claude/hooks/lib/';
const PROTECTED_EVIDENCE_BASENAMES = ['strikes.json', 'ledger.jsonl', 'ratified-verdict.json'];

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

const raw = readFileSync(0, 'utf8');
let payload;
try {
  payload = JSON.parse(raw);
} catch (e) {
  process.stderr.write(`ownership-guard: failed to parse hook payload: ${e.message}\n`);
  process.exit(0);
}

let gatesData;
try {
  const gatesPath = path.join(projectDir, '.claude', 'hooks', 'gates.json');
  gatesData = JSON.parse(readFileSync(gatesPath, 'utf8'));
} catch (e) {
  process.stderr.write(`ownership-guard: could not load gates.json at ${e.message}\n`);
  process.exit(0);
}

const resolved = resolvePersona(payload, gatesData, projectDir);
if (resolved === null) {
  // Non-gated dispatch (helper agent, unknown persona) — stay out of the way.
  process.exit(0);
}

const { persona } = resolved;
const entry = gatesData[persona];
if (!entry?.ownership) {
  process.exit(0);
}

const { may_write, may_not_run } = entry.ownership;
const toolName = payload.tool_name ?? '';
const toolInput = payload.tool_input ?? {};

// may_not_run: deny forbidden Bash commands before they execute.
// The prohibition invariant: these commands represent lane boundaries the persona
// must never cross (e.g. Clove cannot merge — must hand to human, per ADR-0011).
//
// All non-heredoc command lines are checked. Heredoc body content is excluded to prevent
// false positives where prohibited strings appear as data (e.g. a JSON payload that
// contains "gh pr merge" as a value). A heredoc delimiter ('<<') marks where executable
// commands end and inline data begins.
if (toolName === 'Bash' && toolInput.command) {
  const cmd = toolInput.command;
  const effectiveCmd = extractEffectiveCommand(cmd);
  const forbidden = may_not_run.find(sub => effectiveCmd.includes(sub));
  if (forbidden) {
    process.stderr.write(
      `[ownership-guard] Denied: '${effectiveCmd.trim()}' contains '${forbidden}', which ${persona} may not run.\n` +
      `Prohibited commands for ${persona}: ${may_not_run.map(s => `'${s}'`).join(', ')}\n` +
      `This is a lane boundary — hand off to the appropriate persona instead.\n`
    );
    process.exit(2);
  }

  // Bash-path protected-write scan (finding 5). A redirect/tee/cp/mv/sed -i/dd that
  // writes a protected enforcement path takes this Bash branch, which the may_not_run
  // check alone would let through. Deny structurally so the redirect bypass cannot reach
  // the runtime — hooks are authored in canonical .ai-skills/hooks/, never via Bash here.
  const protectedWrite = commandWritesProtectedPath(effectiveCmd);
  if (protectedWrite) {
    process.stderr.write(
      `[ownership-guard] Denied: this Bash command writes '${protectedWrite}', which is\n` +
      `enforcement-runtime-protected (ADR-0067 § gate non-circumventability). A shell\n` +
      `redirect/copy/sed cannot be used to write the live runtime or gate state.\n` +
      `To author hook changes, edit canonical source at .ai-skills/hooks/ — the build emits here.\n`
    );
    process.exit(2);
  }

  // Bash-path evidence-deletion scan (finding 6). rm with any flag form targeting
  // .prism/evidence/ deletes gate state. The may_not_run substrings cover the common
  // forms; this scan closes the variant-flag gap (rm -f / -fr / --force) structurally.
  if (commandDeletesEvidence(effectiveCmd)) {
    process.stderr.write(
      `[ownership-guard] Denied: this Bash command deletes a .prism/evidence/ path.\n` +
      `Gate state (strikes.json, ledger.jsonl, ratified-verdict.json) is hook-managed;\n` +
      `${persona} may not delete evidence regardless of rm flag form. This is a lane boundary.\n`
    );
    process.exit(2);
  }

  // Bash with an allowed command — permit.
  process.exit(0);
}

// may_write: deny writes outside the persona's ownership globs.
// Applies to Edit, Write, MultiEdit. File path must match at least one allowed glob.
const writeTools = new Set(['Edit', 'Write', 'MultiEdit']);
if (writeTools.has(toolName)) {
  const filePath = toolInput.file_path ?? toolInput.path ?? '';
  if (!filePath) {
    // No file path in payload — can't check, permit and let the tool handle it.
    process.exit(0);
  }

  // Resolve the file path relative to the project dir for glob matching.
  const relativePath = path.relative(projectDir, path.resolve(payload.cwd ?? projectDir, filePath));
  // Normalize to forward slashes for glob matching on all platforms.
  const normalizedPath = relativePath.replace(/\\/g, '/');

  // active-persona orchestrated-write denial (finding 4).
  // The solo resolver reads .prism/active-persona, so the solo write must land (and the
  // skill prose still writes it). But under orchestration (agent_type present) the resolver
  // reads agent_type from the payload and never the file — and a subagent's write clobbers
  // the solo session's value and races other fleet lanes (the corruption the payload-first
  // resolver Decision warned about). Deny the write only when orchestrated; permit when solo.
  if (normalizedPath === '.prism/active-persona' && payload.agent_type) {
    process.stderr.write(
      `[ownership-guard] Denied: '.prism/active-persona' is solo-path-only.\n` +
      `Under orchestration the persona resolver reads agent_type from the hook payload,\n` +
      `not this file. Writing it from a subagent corrupts the solo session's value and races\n` +
      `concurrent fleet lanes. The orchestrated dispatch is already resolved — no write needed.\n`
    );
    process.exit(2);
  }

  // Global protected-paths check — runs BEFORE may_write for every persona.
  // No per-persona override path exists: a may_write entry cannot grant write
  // access to the enforcement runtime or gate state (ADR-0067 § gate non-circumventability).
  if (PROTECTED_WRITE_PATHS.includes(normalizedPath) || normalizedPath.startsWith(PROTECTED_LIB_PREFIX)) {
    process.stderr.write(
      `[ownership-guard] Denied: '${normalizedPath}' is enforcement-runtime-protected.\n` +
      `The enforcement runtime (hook scripts, lib/, gates.json, settings.json) cannot be\n` +
      `written by any persona during a gated dispatch — the gate's guarantee depends on it\n` +
      `(ADR-0067 § gate non-circumventability).\n` +
      `To author hook changes, use the canonical source at .ai-skills/hooks/ — the build\n` +
      `pipeline emits the runtime here. Never write the live runtime directly.\n`
    );
    process.exit(2);
  }

  // Gate-state protection — deny writes to evidence files except report.json.
  // Hook scripts (run-gates.mjs, evidence-ledger.mjs) write gate state via Node fs,
  // never via tool calls. The persona's only lawful evidence write is its own report.json.
  const evidencePrefix = '.prism/evidence/';
  if (normalizedPath.startsWith(evidencePrefix)) {
    const basename = path.basename(normalizedPath);
    if (PROTECTED_EVIDENCE_BASENAMES.includes(basename)) {
      process.stderr.write(
        `[ownership-guard] Denied: '${normalizedPath}' is gate-state-protected.\n` +
        `Gate state files (strikes.json, ledger.jsonl, ratified-verdict.json) are written\n` +
        `only by the hook runtime — not by persona tool calls. The persona's only writable\n` +
        `evidence file is its own report.json (e.g. .prism/evidence/<runKey>/report.json).\n`
      );
      process.exit(2);
    }
  }

  const allowed = may_write.some(pattern => matchGlob(pattern, normalizedPath));
  if (!allowed) {
    process.stderr.write(
      `[ownership-guard] Denied: ${persona} may not write to '${normalizedPath}'.\n` +
      `Allowed write paths for ${persona}:\n` +
      may_write.map(p => `  - ${p}`).join('\n') + '\n' +
      `Write to one of the allowed paths, or hand off to the persona that owns this path.\n`
    );
    process.exit(2);
  }

  // First-write baseline capture (Bug 2 fix — baseline-regression tolerance).
  // PreToolUse fires before the write executes, so on the persona's FIRST write the tree
  // is still in its dispatch-start state. Capture each fresh gate's exit code here as the
  // baseline run-gates.mjs reconciles against: a claimed fresh gate that passed at baseline
  // but fails at stop is a regression (strike); one that already failed is pre-existing env
  // state (no strike). Runs exactly once per runKey, guarded by baseline.json existence,
  // and is non-fatal — a capture failure leaves the baseline absent, which run-gates treats
  // as "no regression provable" and downgrades fresh-gate failures to non-blocking notes.
  captureBaseline(payload, entry, projectDir);
}

// All checks passed — permit the tool call.
process.exit(0);

/**
 * Captures the persona's fresh-gate baseline on its first write-tool fire.
 *
 * Keyed by runKey = agent_id ?? session_id. Writes { [gateId]: exitCode } for every
 * 'fresh'-source gate to .prism/evidence/<runKey>/baseline.json. Idempotent: the
 * existsSync guard makes it run exactly once per run. Non-fatal: any failure is swallowed
 * so the guard never blocks a legitimate write on a capture problem.
 */
function captureBaseline(payload, entry, projectDir) {
  try {
    const runKey = payload.agent_id ?? payload.session_id;
    if (!runKey) return;

    const evidenceDir = path.join(projectDir, '.prism', 'evidence', runKey);
    const baselinePath = path.join(evidenceDir, 'baseline.json');
    if (existsSync(baselinePath)) return;

    const baseline = {};
    for (const gate of (entry.gates ?? [])) {
      if (gate.source === 'ledger') continue;
      if (gate.check?.kind !== 'command' || !gate.check.command) continue;
      const result = spawnSync(gate.check.command, { shell: true, cwd: projectDir, timeout: 120000 });
      baseline[gate.id] = result.status ?? 1;
    }

    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(baselinePath, JSON.stringify(baseline), 'utf8');
  } catch {
    // Non-fatal — absent baseline downgrades fresh-gate failures to non-blocking notes.
  }
}

/**
 * Extracts all non-heredoc shell command lines from a multi-line Bash command string.
 *
 * Returns the joined text of every non-empty, non-comment line up to (but not including)
 * the first heredoc delimiter. Heredoc body content is excluded because it is inline data,
 * not executable commands — matching may_not_run against heredoc bodies would produce false
 * positives (e.g. a JSON file being written that contains "gh pr merge" as a value).
 *
 * Why all lines, not just the first: Claude Code regularly produces multi-line Bash calls
 * (git status on line 1, gh pr merge on line 2). Stopping at the first line would let a
 * forbidden command on any subsequent line bypass the guard entirely.
 */
function extractEffectiveCommand(cmd) {
  const lines = cmd.split('\n');
  const parts = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    // Stop at heredoc delimiter — everything from here is inline data, not commands.
    if (/<<-?\s*['"`]?\w/.test(trimmed)) {
      // Include everything before the << on this line (the command that opens the heredoc).
      const beforeHeredoc = trimmed.split(/<<-?\s*['"`]?\w/)[0];
      if (beforeHeredoc.trim()) parts.push(beforeHeredoc);
      break;
    }
    // Collect every non-heredoc command line — do not stop after the first.
    parts.push(trimmed);
  }
  return parts.join(' ');
}

/**
 * Returns the first protected path a Bash command would write, or null if none.
 *
 * A command "writes" a protected path when it pairs a mutation operator (redirect,
 * tee, cp, mv, sed -i, dd) with a protected path string. Conservative by design: a
 * benign command that merely mentions a protected path next to a redirect is denied,
 * which is acceptable because hooks are authored in canonical source, never via Bash
 * redirect to the runtime (finding 5).
 */
function commandWritesProtectedPath(effectiveCmd) {
  const hasMutationOperator =
    effectiveCmd.includes('>') ||
    /\btee\b/.test(effectiveCmd) ||
    /\bcp\s/.test(effectiveCmd) ||
    /\bmv\s/.test(effectiveCmd) ||
    /\bsed\s+-i/.test(effectiveCmd) ||
    /\bdd\s/.test(effectiveCmd);

  if (!hasMutationOperator) return null;

  for (const protectedPath of PROTECTED_WRITE_PATHS) {
    if (effectiveCmd.includes(protectedPath)) return protectedPath;
  }
  if (effectiveCmd.includes(PROTECTED_LIB_PREFIX)) return PROTECTED_LIB_PREFIX;

  // Protected gate-state files under .prism/evidence/ (by basename, anywhere in the path).
  if (effectiveCmd.includes('.prism/evidence/')) {
    for (const basename of PROTECTED_EVIDENCE_BASENAMES) {
      if (effectiveCmd.includes(basename)) return `.prism/evidence/.../${basename}`;
    }
  }

  return null;
}

/**
 * Returns true if a Bash command deletes a .prism/evidence/ path with any rm flag form.
 *
 * Closes the variant-flag gap (rm -f / rm -fr / rm --force) that the may_not_run
 * substrings miss because the flag sits between 'rm' and the path (finding 6). The
 * declarative may_not_run strings remain the floor; this is the structural backstop.
 */
function commandDeletesEvidence(effectiveCmd) {
  return /\brm\b[^\n]*\.prism\/evidence\//.test(effectiveCmd);
}

/**
 * Minimal glob matcher supporting the patterns used in gates.json ownership matrices:
 *   **  — matches any number of path segments (including zero)
 *   *   — matches any characters within a single path segment (no slashes)
 *   ?   — matches exactly one character (no slash)
 */
function matchGlob(pattern, filePath) {
  let regex = '';
  let i = 0;
  while (i < pattern.length) {
    if (pattern[i] === '*' && pattern[i + 1] === '*') {
      regex += '.*';
      i += 2;
      if (pattern[i] === '/') {
        i++;
      }
    } else if (pattern[i] === '*') {
      regex += '[^/]*';
      i++;
    } else if (pattern[i] === '?') {
      regex += '[^/]';
      i++;
    } else {
      regex += pattern[i].replace(/[.+^${}()|[\]\\]/g, '\\$&');
      i++;
    }
  }
  return new RegExp('^' + regex + '$').test(filePath);
}
