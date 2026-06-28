#!/usr/bin/env node
/**
 * Smoke Test harness — Phase 1 scenarios (A, B, B.5, B.6, C, D), Phase 2 gate
 * self-protection (E), and Issue #300 gate-fix scenarios (F, G, H, I).
 *
 * Each scenario is a deterministic, self-contained test that uses synthetic fixtures and
 * node -e "process.exit(N)" stubs for gate commands, so tests pass or fail from logic
 * alone (no real type-checker or test suite needed).
 *
 * Exit codes:
 *   0  — all scenarios passed
 *   1  — one or more scenarios failed (stderr carries the details)
 *
 * Usage:
 *   node .claude/hooks/__smoke__/run-all.mjs
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HOOKS_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(HOOKS_DIR, '..', '..');

// --- Helpers ---

/**
 * Runs a hook script with a synthetic payload, capturing exit code and stderr.
 * Returns { code, stderr }.
 */
function runHook(hookScript, payload, env = {}) {
  const result = spawnSync('node', [hookScript], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, ...env },
    cwd: REPO_ROOT,
  });
  return {
    code: result.status,
    stderr: result.stderr ?? '',
    stdout: result.stdout ?? '',
  };
}

/**
 * Creates a temp dir with synthetic fixtures for a Stop-hook test.
 * Returns { tmpDir, runKey, reportPath, gatesPath, strikesPath }.
 *
 * strikes accepts either a number (legacy: { count }) or an object written verbatim,
 * so a scenario can pre-seed the capped flag ({ count, capped }).
 */
function setupStopFixture({ gates, report, strikes = 0, baseline = null }) {
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'prism-smoke-'));
  const runKey = 'smoke-session'; // must match session_id in payload (runKey = agent_id ?? session_id)

  // Write synthetic gates.json into tmpDir so we can override CLAUDE_PROJECT_DIR.
  const gatesPath = path.join(tmpDir, '.claude', 'hooks', 'gates.json');
  mkdirSync(path.dirname(gatesPath), { recursive: true });
  writeFileSync(gatesPath, JSON.stringify(gates, null, 2), 'utf8');

  // Write report.json
  const evidenceDir = path.join(tmpDir, '.prism', 'evidence', runKey);
  mkdirSync(evidenceDir, { recursive: true });
  const reportPath = path.join(evidenceDir, 'report.json');
  if (report !== null) {
    writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  }

  // Write strikes.json if needed
  const strikesPath = path.join(tmpDir, '.prism', 'evidence', runKey, 'strikes.json');
  if (typeof strikes === 'object' && strikes !== null) {
    writeFileSync(strikesPath, JSON.stringify(strikes, null, 2), 'utf8');
  } else if (strikes > 0) {
    writeFileSync(strikesPath, JSON.stringify({ count: strikes }, null, 2), 'utf8');
  }

  // Write baseline.json if a scenario pins the baseline-regression-tolerance path.
  if (baseline !== null) {
    const baselinePath = path.join(evidenceDir, 'baseline.json');
    writeFileSync(baselinePath, JSON.stringify(baseline), 'utf8');
  }

  return { tmpDir, runKey, reportPath, gatesPath, strikesPath };
}

function cleanup(tmpDir) {
  try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
}

const PASS = '\x1b[32mPASS\x1b[0m';
const FAIL = '\x1b[31mFAIL\x1b[0m';

let allPassed = true;

function assert(scenarioName, condition, message) {
  if (!condition) {
    console.error(`${FAIL} ${scenarioName}: ${message}`);
    allPassed = false;
    return false;
  }
  return true;
}

// ============================================================
// Scenario A: false-done blocked
// The model claims "done" AND claims the 'types' checklist item passed,
// but the gate command exits 1. The hook must block the stop and name the failing gate.
// Expected: run-gates exits 2, stderr contains the gate id ("types") and the real exit
// code from the failing command — NOT the on_fail fixture string "done-override", which
// is gate metadata never written to stderr.
//
// The baseline is pre-seeded with { types: 0 } so the failing claimed gate registers as a
// regression (Bug 2 tolerance leaves the floor intact: a clean baseline → now-fail strikes).
// ============================================================
{
  const name = 'A: false-done blocked';
  const gates = {
    clove: {
      writes_report_to: '.prism/evidence/${runKey}/report.json',
      preconditions: [],
      gates: [
        {
          id: 'types',
          description: 'TypeScript types pass',
          checklist_key: 'types',
          source: 'fresh',
          check: { kind: 'command', command: 'node -e "process.exit(1)"' },
          on_fail: 'done-override',
        },
      ],
      allowed_routes: ['briar', 'human', 'clove', 'winston'],
      ownership: { may_write: ['src/**'], may_not_run: [] },
    },
  };
  const report = {
    verdict: 'done',
    verdict_reason: 'all tasks complete',
    next_route: 'briar',
    reasoning: 'everything looks good',
    persona: 'clove',
    // Claim types passed — this is the false claim the gate should contradict.
    checklist: { types: true },
  };

  const { tmpDir, runKey } = setupStopFixture({ gates, report, baseline: { types: 0 } });
  try {
    const payload = {
      session_id: 'smoke-session',
      agent_type: 'prism-code-dev',
      stop_reason: 'end_turn',
    };
    const env = { CLAUDE_PROJECT_DIR: tmpDir };
    const r = runHook(path.join(HOOKS_DIR, 'run-gates.mjs'), payload, env);

    // run-gates.mjs writes the gate id ("types") and the real exit code to stderr when
    // a claimed-true gate fails. The on_fail value "done-override" is gate metadata only —
    // it is never written to stderr, so asserting for it produces a permanently-false arm.
    const ok = assert(name, r.code === 2, `expected exit 2, got ${r.code}`) &&
                assert(name, r.stderr.includes('types'), `expected gate id 'types' in stderr (run-gates names the failing gate). Got: ${r.stderr.substring(0, 200)}`);
    if (ok) console.log(`${PASS} ${name}`);
  } finally {
    cleanup(tmpDir);
  }
}

// ============================================================
// Scenario B: out-of-lane write denied
// Clove tries to write to a path not in may_write.
// Expected: ownership-guard exits 2, stderr contains "may not write".
// ============================================================
{
  const name = 'B: out-of-lane write denied';
  const gates = {
    clove: {
      writes_report_to: '.prism/evidence/${runKey}/report.json',
      preconditions: [],
      gates: [],
      allowed_routes: ['briar'],
      ownership: {
        may_write: ['src/**'],
        may_not_run: [],
      },
    },
  };

  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'prism-smoke-'));
  try {
    const gatesPath = path.join(tmpDir, '.claude', 'hooks', 'gates.json');
    mkdirSync(path.dirname(gatesPath), { recursive: true });
    writeFileSync(gatesPath, JSON.stringify(gates, null, 2), 'utf8');

    const payload = {
      session_id: 'smoke-session',
      agent_type: 'prism-code-dev',
      hook_event_name: 'PreToolUse',
      tool_name: 'Write',
      tool_input: { file_path: '/other-service/index.js' },
      cwd: tmpDir,
    };
    const env = { CLAUDE_PROJECT_DIR: tmpDir };
    const r = runHook(path.join(HOOKS_DIR, 'ownership-guard.mjs'), payload, env);

    const ok = assert(name, r.code === 2, `expected exit 2, got ${r.code}`) &&
                assert(name, r.stderr.includes('may not write'), `expected 'may not write' in stderr. Got: ${r.stderr.substring(0, 200)}`);
    if (ok) console.log(`${PASS} ${name}`);
  } finally {
    cleanup(tmpDir);
  }
}

// ============================================================
// Scenario B.5: may_not_run prohibition enforced
// Clove's gates.json lists forbidden commands. The ownership guard must deny a
// Bash payload containing a prohibited string and allow a permitted one.
//
// Sub-tests:
//   B.5a: Bash payload with "gh pr merge 123"  → exit 2, prohibition in stderr
//   B.5b: Bash payload with "git merge main"   → exit 2, prohibition in stderr
//   B.5c: Bash payload with "git push --force" → exit 2, prohibition in stderr
//   B.5d: Bash payload with "git status"       → exit 0 (negative control — allowed)
// ============================================================
{
  const name = 'B.5: may_not_run prohibition enforced';
  const gates = {
    clove: {
      writes_report_to: '.prism/evidence/${runKey}/report.json',
      preconditions: [],
      gates: [],
      allowed_routes: ['briar'],
      ownership: {
        may_write: ['src/**'],
        may_not_run: ['gh pr merge', 'git merge', 'git push -f', 'git push --force'],
      },
    },
  };

  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'prism-smoke-'));
  try {
    const gatesPath = path.join(tmpDir, '.claude', 'hooks', 'gates.json');
    mkdirSync(path.dirname(gatesPath), { recursive: true });
    writeFileSync(gatesPath, JSON.stringify(gates, null, 2), 'utf8');

    const env = { CLAUDE_PROJECT_DIR: tmpDir };
    const guardScript = path.join(HOOKS_DIR, 'ownership-guard.mjs');

    function runGuardBash(command) {
      return runHook(guardScript, {
        session_id: 'smoke-session',
        agent_type: 'prism-code-dev',
        hook_event_name: 'PreToolUse',
        tool_name: 'Bash',
        tool_input: { command },
        cwd: tmpDir,
      }, env);
    }

    // B.5a: gh pr merge
    const rA = runGuardBash('gh pr merge 123');
    const okA = assert(name, rA.code === 2, `B.5a: expected exit 2 for 'gh pr merge 123', got ${rA.code}`) &&
                assert(name, rA.stderr.length > 0, `B.5a: expected prohibition message in stderr. Got: ${rA.stderr.substring(0, 200)}`);

    // B.5b: git merge
    const rB = runGuardBash('git merge main');
    const okB = assert(name, rB.code === 2, `B.5b: expected exit 2 for 'git merge main', got ${rB.code}`) &&
                assert(name, rB.stderr.length > 0, `B.5b: expected prohibition message in stderr. Got: ${rB.stderr.substring(0, 200)}`);

    // B.5c: git push --force
    const rC = runGuardBash('git push --force origin main');
    const okC = assert(name, rC.code === 2, `B.5c: expected exit 2 for 'git push --force', got ${rC.code}`) &&
                assert(name, rC.stderr.length > 0, `B.5c: expected prohibition message in stderr. Got: ${rC.stderr.substring(0, 200)}`);

    // B.5d: allowed command — negative control
    const rD = runGuardBash('git status');
    const okD = assert(name, rD.code === 0, `B.5d: expected exit 0 for allowed command 'git status', got ${rD.code}. stderr: ${rD.stderr.substring(0, 200)}`);

    if (okA && okB && okC && okD) console.log(`${PASS} ${name}`);
  } finally {
    cleanup(tmpDir);
  }
}

// ============================================================
// Scenario B.6: multi-line Bash — forbidden command on line 2 is caught
// Regression coverage for the extractEffectiveCommand multi-line bypass hole (Eric Major).
// A two-line Bash payload puts an allowed command on line 1 and a forbidden command on
// line 2. The guard must deny the call — stopping at line 1 would silently miss line 2.
//
// Sub-tests:
//   B.6a: "git status\ngh pr merge 123"     → exit 2 (forbidden on line 2)
//   B.6b: "git status\ngit merge main"       → exit 2 (forbidden on line 2)
//   B.6c: "git status\ngit fetch origin"     → exit 0 (both lines allowed)
//   B.6d: heredoc body is excluded — "cat <<'EOF'\ngh pr merge 123\nEOF" → exit 0
// ============================================================
{
  const name = 'B.6: multi-line Bash — forbidden command on line 2 caught';
  const gates = {
    clove: {
      writes_report_to: '.prism/evidence/${runKey}/report.json',
      preconditions: [],
      gates: [],
      allowed_routes: ['briar'],
      ownership: {
        may_write: ['src/**'],
        may_not_run: ['gh pr merge', 'git merge'],
      },
    },
  };

  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'prism-smoke-'));
  try {
    const gatesPath = path.join(tmpDir, '.claude', 'hooks', 'gates.json');
    mkdirSync(path.dirname(gatesPath), { recursive: true });
    writeFileSync(gatesPath, JSON.stringify(gates, null, 2), 'utf8');

    const env = { CLAUDE_PROJECT_DIR: tmpDir };
    const guardScript = path.join(HOOKS_DIR, 'ownership-guard.mjs');

    function runGuardBash(command) {
      return runHook(guardScript, {
        session_id: 'smoke-session',
        agent_type: 'prism-code-dev',
        hook_event_name: 'PreToolUse',
        tool_name: 'Bash',
        tool_input: { command },
        cwd: tmpDir,
      }, env);
    }

    // B.6a: allowed on line 1, forbidden on line 2 → must be denied
    const rA = runGuardBash('git status\ngh pr merge 123');
    const okA = assert(name, rA.code === 2, `B.6a: expected exit 2 (forbidden 'gh pr merge' on line 2), got ${rA.code}. stderr: ${rA.stderr.substring(0, 200)}`) &&
                assert(name, rA.stderr.length > 0, `B.6a: expected prohibition message in stderr. Got: ${rA.stderr.substring(0, 200)}`);

    // B.6b: allowed on line 1, forbidden on line 2 → must be denied
    const rB = runGuardBash('git status\ngit merge main');
    const okB = assert(name, rB.code === 2, `B.6b: expected exit 2 (forbidden 'git merge' on line 2), got ${rB.code}. stderr: ${rB.stderr.substring(0, 200)}`) &&
                assert(name, rB.stderr.length > 0, `B.6b: expected prohibition message in stderr. Got: ${rB.stderr.substring(0, 200)}`);

    // B.6c: both lines allowed → must permit
    const rC = runGuardBash('git status\ngit fetch origin');
    const okC = assert(name, rC.code === 0, `B.6c: expected exit 0 (both lines allowed), got ${rC.code}. stderr: ${rC.stderr.substring(0, 200)}`);

    // B.6d: forbidden string appears in heredoc body only → must permit (heredoc-stop preserved)
    const rD = runGuardBash("cat <<'EOF'\ngh pr merge 123\nEOF");
    const okD = assert(name, rD.code === 0, `B.6d: expected exit 0 (forbidden string is heredoc data, not a command), got ${rD.code}. stderr: ${rD.stderr.substring(0, 200)}`);

    if (okA && okB && okC && okD) console.log(`${PASS} ${name}`);
  } finally {
    cleanup(tmpDir);
  }
}

// ============================================================
// Scenario C: clean ratify
// All gates pass (node exits 0), valid report.
// Expected: run-gates exits 0 (allow stop), ratified-verdict.json written.
// ============================================================
{
  const name = 'C: clean ratify';
  const gates = {
    clove: {
      writes_report_to: '.prism/evidence/${runKey}/report.json',
      preconditions: [],
      gates: [
        {
          id: 'types',
          source: 'fresh',
          check: { kind: 'command', command: 'node -e "process.exit(0)"' },
          on_fail: 'done-override',
        },
      ],
      allowed_routes: ['briar', 'human', 'clove', 'winston'],
      ownership: { may_write: ['src/**'], may_not_run: [] },
    },
  };
  const report = {
    verdict: 'done',
    verdict_reason: 'all tasks complete',
    next_route: 'briar',
    reasoning: 'types pass, tests pass',
    persona: 'clove',
    checklist: { types: true, tests: true },
  };

  const { tmpDir, runKey } = setupStopFixture({ gates, report });
  try {
    const payload = {
      session_id: 'smoke-session',
      agent_type: 'prism-code-dev',
      stop_reason: 'end_turn',
    };
    const env = { CLAUDE_PROJECT_DIR: tmpDir };
    const r = runHook(path.join(HOOKS_DIR, 'run-gates.mjs'), payload, env);

    const auditPath = path.join(tmpDir, '.prism', 'evidence', runKey, 'ratified-verdict.json');
    const auditExists = existsSync(auditPath);

    const ok = assert(name, r.code === 0, `expected exit 0, got ${r.code}. stderr: ${r.stderr.substring(0, 200)}`) &&
                assert(name, auditExists, `expected ratified-verdict.json to be written at ${auditPath}`);
    if (ok) console.log(`${PASS} ${name}`);
  } finally {
    cleanup(tmpDir);
  }
}

// ============================================================
// Scenario D: strike-cap re-emit
// Strikes.json already at 2; this Stop attempt claims types passed but the gate
// command exits 1. Reaching 3 strikes (the cap) → run-gates exits 2, writes the
// audit artifact, and emits the needs-stronger-model instruction to stderr.
// Expected: exit 2, ratified-verdict.json written, stderr contains "needs-stronger-model".
//
// Baseline pre-seeded clean ({ types: 0 }) so the claimed-true gate failure counts as a
// regression and strikes (Bug 2 tolerance does not shield a clean-baseline regression).
// ============================================================
{
  const name = 'D: strike-cap re-emit';
  const gates = {
    clove: {
      writes_report_to: '.prism/evidence/${runKey}/report.json',
      preconditions: [],
      gates: [
        {
          id: 'types',
          description: 'TypeScript types pass',
          checklist_key: 'types',
          source: 'fresh',
          check: { kind: 'command', command: 'node -e "process.exit(1)"' },
          on_fail: 'done-override',
        },
      ],
      allowed_routes: ['briar', 'human', 'clove', 'winston'],
      ownership: { may_write: ['src/**'], may_not_run: [] },
    },
  };
  const report = {
    verdict: 'done',
    verdict_reason: 'all tasks complete',
    next_route: 'briar',
    reasoning: 'looks good',
    persona: 'clove',
    // Claim types passed — gate will contradict it, hitting the cap.
    checklist: { types: true },
  };

  // Start with 2 strikes already logged.
  const { tmpDir, runKey } = setupStopFixture({ gates, report, strikes: 2, baseline: { types: 0 } });
  try {
    const payload = {
      session_id: 'smoke-session',
      agent_type: 'prism-code-dev',
      stop_reason: 'end_turn',
    };
    const env = { CLAUDE_PROJECT_DIR: tmpDir };
    const r = runHook(path.join(HOOKS_DIR, 'run-gates.mjs'), payload, env);

    const auditPath = path.join(tmpDir, '.prism', 'evidence', runKey, 'ratified-verdict.json');
    const auditExists = existsSync(auditPath);

    // At cap: exit 2 (stop refused), audit artifact written, stderr carries the instruction.
    const ok = assert(name, r.code === 2, `expected exit 2 (cap refuses stop, instructs re-emit), got ${r.code}. stderr: ${r.stderr.substring(0, 300)}`) &&
                assert(name, r.stderr.includes('needs-stronger-model'), `expected 'needs-stronger-model' in stderr. Got: ${r.stderr.substring(0, 300)}`) &&
                assert(name, auditExists, `expected ratified-verdict.json to be written at ${auditPath}`);
    if (ok) console.log(`${PASS} ${name}`);
  } finally {
    cleanup(tmpDir);
  }
}

// ============================================================
// Scenario E: Protected-paths denylist (gate self-protection — Phase 2 Task C)
//
// These assertions verify the global PROTECTED_WRITE_PATHS denylist in
// ownership-guard.mjs. Each sub-test uses the real enforcement file paths because
// the denylist is a module-level const in the guard, not a config value.
//
// Sub-tests:
//   E1: Clove attempts Write to .claude/hooks/run-gates.mjs    → exit 2 (denylist)
//   E2: Clove attempts Write to .claude/hooks/gates.json        → exit 2 (denylist)
//   E3: Clove attempts Write to .prism/evidence/smoke/strikes.json → exit 2 (denylist)
//   E4: Clove attempts Write to .prism/evidence/smoke/ledger.jsonl → exit 2 (denylist)
//   E5: Clove attempts Write to .prism/evidence/smoke/ratified-verdict.json → exit 2 (denylist)
//   E5b: Clove attempts Write to .prism/evidence/smoke/baseline.json → exit 2 (denylist — Bug 2 gate state)
//   E6: Clove attempts Write to .prism/evidence/smoke/report.json → exit 0 (carve-out)
//   E7: Clove attempts Write to .claude/hooks/__smoke__/anything.mjs → exit 0 (smoke not protected)
//   E8: Clove attempts Bash rm .prism/evidence/smoke/strikes.json → exit 2 (may_not_run)
//   E9: Clove attempts Write to src/index.ts → exit 0 (negative control — denylist selective)
// ============================================================
{
  const name = 'E: protected-paths denylist';

  const guardScript = path.join(HOOKS_DIR, 'ownership-guard.mjs');

  // Use REPO_ROOT as CLAUDE_PROJECT_DIR so path normalization maps to the real relative
  // paths — the real gates.json is at REPO_ROOT too, and the denylist is hardcoded to the
  // canonical enforcement file paths relative to REPO_ROOT.
  const envReal = { CLAUDE_PROJECT_DIR: REPO_ROOT };

  function runGuardWrite(filePath) {
    return runHook(guardScript, {
      session_id: 'smoke-e',
      agent_type: 'prism-code-dev',
      hook_event_name: 'PreToolUse',
      tool_name: 'Write',
      tool_input: { file_path: filePath },
      cwd: REPO_ROOT,
    }, envReal);
  }

  function runGuardBash(command) {
    return runHook(guardScript, {
      session_id: 'smoke-e',
      agent_type: 'prism-code-dev',
      hook_event_name: 'PreToolUse',
      tool_name: 'Bash',
      tool_input: { command },
      cwd: REPO_ROOT,
    }, envReal);
  }

  // E1: enforcement runtime — run-gates.mjs
  const rE1 = runGuardWrite('.claude/hooks/run-gates.mjs');
  const okE1 = assert(name, rE1.code === 2,
    `E1: expected exit 2 for Write to run-gates.mjs (enforcement-runtime-protected), got ${rE1.code}. stderr: ${rE1.stderr.substring(0, 200)}`);

  // E2: gates.json — the ownership data the guard reads
  const rE2 = runGuardWrite('.claude/hooks/gates.json');
  const okE2 = assert(name, rE2.code === 2,
    `E2: expected exit 2 for Write to gates.json (denylist), got ${rE2.code}. stderr: ${rE2.stderr.substring(0, 200)}`);

  // E3: gate state — strikes.json
  const rE3 = runGuardWrite('.prism/evidence/smoke/strikes.json');
  const okE3 = assert(name, rE3.code === 2,
    `E3: expected exit 2 for Write to strikes.json (gate-state-protected), got ${rE3.code}. stderr: ${rE3.stderr.substring(0, 200)}`);

  // E4: gate state — ledger.jsonl
  const rE4 = runGuardWrite('.prism/evidence/smoke/ledger.jsonl');
  const okE4 = assert(name, rE4.code === 2,
    `E4: expected exit 2 for Write to ledger.jsonl (gate-state-protected), got ${rE4.code}. stderr: ${rE4.stderr.substring(0, 200)}`);

  // E5: gate state — ratified-verdict.json
  const rE5 = runGuardWrite('.prism/evidence/smoke/ratified-verdict.json');
  const okE5 = assert(name, rE5.code === 2,
    `E5: expected exit 2 for Write to ratified-verdict.json (gate-state-protected), got ${rE5.code}. stderr: ${rE5.stderr.substring(0, 200)}`);

  // E5b: gate state — baseline.json (Bug 2's per-runKey fresh-gate baseline). A forged
  // failed-baseline routes a real regression into the "pre-existing" branch → false done.
  const rE5b = runGuardWrite('.prism/evidence/smoke/baseline.json');
  const okE5b = assert(name, rE5b.code === 2,
    `E5b: expected exit 2 for Write to baseline.json (gate-state-protected — Bug 2 baseline), got ${rE5b.code}. stderr: ${rE5b.stderr.substring(0, 200)}`);

  // E6: carve-out — report.json IS the persona's lawful write channel → must permit
  const rE6 = runGuardWrite('.prism/evidence/smoke/report.json');
  const okE6 = assert(name, rE6.code === 0,
    `E6: expected exit 0 for Write to report.json (carve-out — persona's lawful report channel), got ${rE6.code}. stderr: ${rE6.stderr.substring(0, 200)}`);

  // E7: smoke tests themselves are NOT protected → must permit
  const rE7 = runGuardWrite('.claude/hooks/__smoke__/anything.mjs');
  const okE7 = assert(name, rE7.code === 0,
    `E7: expected exit 0 for Write to __smoke__/anything.mjs (smoke dir not protected), got ${rE7.code}. stderr: ${rE7.stderr.substring(0, 200)}`);

  // E8: rm via Bash — may_not_run substring match closes shell-deletion vector
  const rE8 = runGuardBash('rm .prism/evidence/smoke/strikes.json');
  const okE8 = assert(name, rE8.code === 2,
    `E8: expected exit 2 for Bash rm .prism/evidence/... (may_not_run substring match), got ${rE8.code}. stderr: ${rE8.stderr.substring(0, 200)}`);

  // E9: negative control — src/index.ts is in may_write and not in denylist → permit
  const rE9 = runGuardWrite('src/index.ts');
  const okE9 = assert(name, rE9.code === 0,
    `E9: expected exit 0 for Write to src/index.ts (denylist is selective, not universal), got ${rE9.code}. stderr: ${rE9.stderr.substring(0, 200)}`);

  if (okE1 && okE2 && okE3 && okE4 && okE5 && okE5b && okE6 && okE7 && okE8 && okE9) {
    console.log(`${PASS} ${name}`);
  }
}

// ============================================================
// Scenario F: accept-on-re-emit at the cap (Issue #300 Bug 1)
//
// The gap that hid Bug 1: the harness never exercised a 4th invocation after the cap,
// so the deadlock (gate forces needs-stronger-model, then its own coherence check rejects
// the re-emit) shipped unobserved. F pins the fix: once the gate has FORCED the park
// (capped flag set in strikes.json), a re-emit of needs-stronger-model routed to the
// persona's own key passes coherence and the stop is allowed.
//
//   F.pos: capped=true pre-seeded, report re-emits needs-stronger-model + next_route clove
//          → exit 0, ratified-verdict.json records verdict needs-stronger-model.
//   F.neg: fresh runKey, strike 0 (no capped flag), report self-claims needs-stronger-model
//          → exit 2 (self-claim rejected — the floor's no-self-escape guarantee holds).
// ============================================================
{
  const name = 'F: accept-on-re-emit at the cap (Bug 1)';
  const gates = {
    clove: {
      writes_report_to: '.prism/evidence/${runKey}/report.json',
      preconditions: [],
      gates: [
        {
          id: 'types',
          description: 'TypeScript types pass',
          checklist_key: 'types',
          source: 'fresh',
          check: { kind: 'command', command: 'node -e "process.exit(1)"' },
          on_fail: 'done-override',
        },
      ],
      allowed_routes: ['briar', 'human', 'clove', 'winston'],
      ownership: { may_write: ['src/**'], may_not_run: [] },
    },
  };
  const parkReport = {
    verdict: 'needs-stronger-model',
    verdict_reason: 'Gate failures persisted after 3 attempts — escalating to stronger model',
    next_route: 'clove',
    reasoning: 'gate forced the park; re-emitting as instructed',
    persona: 'clove',
    checklist: { types: true },
  };

  // F.pos: capped flag set (gate forced the park), re-emit accepted.
  {
    const { tmpDir, runKey } = setupStopFixture({
      gates,
      report: parkReport,
      strikes: { count: 3, runKey: 'smoke-session', capped: true },
    });
    try {
      const payload = { session_id: 'smoke-session', agent_type: 'prism-code-dev', stop_reason: 'end_turn' };
      const env = { CLAUDE_PROJECT_DIR: tmpDir };
      const r = runHook(path.join(HOOKS_DIR, 'run-gates.mjs'), payload, env);

      const auditPath = path.join(tmpDir, '.prism', 'evidence', runKey, 'ratified-verdict.json');
      let auditVerdict = null;
      if (existsSync(auditPath)) {
        try { auditVerdict = JSON.parse(readFileSync(auditPath, 'utf8')).verdict; } catch {}
      }

      const okPos = assert(name, r.code === 0, `F.pos: expected exit 0 (gate-forced re-emit accepted), got ${r.code}. stderr: ${r.stderr.substring(0, 300)}`) &&
                    assert(name, auditVerdict === 'needs-stronger-model', `F.pos: expected ratified-verdict.json verdict 'needs-stronger-model', got ${auditVerdict}`);

      // F.neg shares the gates fixture but runs under a fresh tmpDir below.
      // F.neg: strike-0 self-claim of needs-stronger-model with no capped flag → reject.
      const { tmpDir: tmpDir2, runKey: runKey2 } = setupStopFixture({ gates, report: parkReport });
      try {
        const payload2 = { session_id: 'smoke-session', agent_type: 'prism-code-dev', stop_reason: 'end_turn' };
        const env2 = { CLAUDE_PROJECT_DIR: tmpDir2 };
        const r2 = runHook(path.join(HOOKS_DIR, 'run-gates.mjs'), payload2, env2);

        const okNeg = assert(name, r2.code === 2, `F.neg: expected exit 2 (strike-0 self-claim of needs-stronger-model rejected), got ${r2.code}. stderr: ${r2.stderr.substring(0, 300)}`);

        if (okPos && okNeg) console.log(`${PASS} ${name}`);
      } finally {
        cleanup(tmpDir2);
      }
    } finally {
      cleanup(tmpDir);
    }
  }
}

// ============================================================
// Scenario G: baseline-regression tolerance (Issue #300 Bug 2)
//
// A claimed-true fresh gate that fails now strikes ONLY when its baseline passed (a
// regression). A baseline that also failed (pre-existing env state) downgrades to a
// non-blocking note — the persona is not struck out for inherited failures it never caused.
//
//   G.a (pre-existing): baseline { types: 1 } (already failing), gate fails now, claim
//        types:true → exit 0 (or non-blocking note), NO strike written.
//   G.b (regression positive control): baseline { types: 0 } (clean), same failing gate,
//        claim types:true → exit 2, strike written. The floor stays intact.
// ============================================================
{
  const name = 'G: baseline-regression tolerance (Bug 2)';
  const gates = {
    clove: {
      writes_report_to: '.prism/evidence/${runKey}/report.json',
      preconditions: [],
      gates: [
        {
          id: 'types',
          description: 'TypeScript types pass',
          checklist_key: 'types',
          source: 'fresh',
          check: { kind: 'command', command: 'node -e "process.exit(1)"' },
          on_fail: 'done-override',
        },
      ],
      allowed_routes: ['briar', 'human', 'clove', 'winston'],
      ownership: { may_write: ['src/**'], may_not_run: [] },
    },
  };
  const report = {
    verdict: 'done',
    verdict_reason: 'all tasks complete',
    next_route: 'briar',
    reasoning: 'work is correct; the env failure pre-dates this dispatch',
    persona: 'clove',
    checklist: { types: true },
  };

  // G.a: pre-existing failure — baseline also failed → no strike.
  {
    const { tmpDir, runKey } = setupStopFixture({ gates, report, baseline: { types: 1 } });
    try {
      const payload = { session_id: 'smoke-session', agent_type: 'prism-code-dev', stop_reason: 'end_turn' };
      const env = { CLAUDE_PROJECT_DIR: tmpDir };
      const r = runHook(path.join(HOOKS_DIR, 'run-gates.mjs'), payload, env);

      const strikePath = path.join(tmpDir, '.prism', 'evidence', runKey, 'strikes.json');
      const strikeWritten = existsSync(strikePath);

      const okA = assert(name, r.code === 0, `G.a: expected exit 0 (pre-existing failure tolerated), got ${r.code}. stderr: ${r.stderr.substring(0, 300)}`) &&
                  assert(name, !strikeWritten, `G.a: expected NO strike written for a pre-existing failure, but strikes.json exists`);

      // G.b: regression positive control — clean baseline → strike.
      const { tmpDir: tmpDir2, runKey: runKey2 } = setupStopFixture({ gates, report, baseline: { types: 0 } });
      try {
        const payload2 = { session_id: 'smoke-session', agent_type: 'prism-code-dev', stop_reason: 'end_turn' };
        const env2 = { CLAUDE_PROJECT_DIR: tmpDir2 };
        const r2 = runHook(path.join(HOOKS_DIR, 'run-gates.mjs'), payload2, env2);

        const strikePath2 = path.join(tmpDir2, '.prism', 'evidence', runKey2, 'strikes.json');
        const strikeWritten2 = existsSync(strikePath2);

        const okB = assert(name, r2.code === 2, `G.b: expected exit 2 (clean-baseline regression strikes), got ${r2.code}. stderr: ${r2.stderr.substring(0, 300)}`) &&
                    assert(name, strikeWritten2, `G.b: expected a strike written for a regression, but strikes.json is missing`);

        if (okA && okB) console.log(`${PASS} ${name}`);
      } finally {
        cleanup(tmpDir2);
      }
    } finally {
      cleanup(tmpDir);
    }
  }
}

// ============================================================
// Scenario H: active-persona orchestrated-write denial (Issue #300 finding 4)
//
//   H.a: Write to .prism/active-persona with agent_type present (orchestrated) → exit 2,
//        stderr names the solo-path-only constraint.
//   H.b: same Write solo — NO agent_type — with .prism/active-persona seeded 'clove' so the
//        resolver's solo path resolves Clove → exit 0 (the solo write is permitted). To prove
//        H.b's exit 0 is a real permit and not a non-gated no-op, an out-of-lane Write in the
//        same solo payload IS denied (exit 2) — confirming the persona resolved and the guard
//        is active.
// ============================================================
{
  const name = 'H: active-persona orchestrated-write denial (finding 4)';
  const gates = {
    clove: {
      writes_report_to: '.prism/evidence/${runKey}/report.json',
      preconditions: [],
      gates: [],
      allowed_routes: ['briar'],
      ownership: {
        may_write: ['src/**', '.prism/active-persona'],
        may_not_run: [],
      },
    },
  };

  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'prism-smoke-h-'));
  try {
    const gatesPath = path.join(tmpDir, '.claude', 'hooks', 'gates.json');
    mkdirSync(path.dirname(gatesPath), { recursive: true });
    writeFileSync(gatesPath, JSON.stringify(gates, null, 2), 'utf8');

    // Seed .prism/active-persona so the solo resolver resolves Clove (otherwise the solo
    // path returns null → guard exits 0 as non-gated, which would pass H.b for the wrong reason).
    const activePersonaPath = path.join(tmpDir, '.prism', 'active-persona');
    mkdirSync(path.dirname(activePersonaPath), { recursive: true });
    writeFileSync(activePersonaPath, 'clove', 'utf8');

    const env = { CLAUDE_PROJECT_DIR: tmpDir };
    const guardScript = path.join(HOOKS_DIR, 'ownership-guard.mjs');

    function runGuardWrite(filePath, extra = {}) {
      return runHook(guardScript, {
        session_id: 'smoke-session',
        hook_event_name: 'PreToolUse',
        tool_name: 'Write',
        tool_input: { file_path: filePath },
        cwd: tmpDir,
        ...extra,
      }, env);
    }

    // H.a: orchestrated (agent_type present) → deny.
    const rA = runGuardWrite('.prism/active-persona', { agent_type: 'prism-code-dev' });
    const okA = assert(name, rA.code === 2, `H.a: expected exit 2 (orchestrated active-persona write denied), got ${rA.code}. stderr: ${rA.stderr.substring(0, 200)}`) &&
                assert(name, rA.stderr.includes('solo-path-only') || rA.stderr.includes('active-persona'), `H.a: expected solo-path-only constraint in stderr. Got: ${rA.stderr.substring(0, 200)}`);

    // H.b: solo (no agent_type) → permit the active-persona write.
    const rB = runGuardWrite('.prism/active-persona');
    const okB = assert(name, rB.code === 0, `H.b: expected exit 0 (solo active-persona write permitted), got ${rB.code}. stderr: ${rB.stderr.substring(0, 200)}`);

    // H.b control: prove the guard is active for this solo payload — an out-of-lane write IS denied.
    const rBControl = runGuardWrite('.github/workflows/ci.yml');
    const okBControl = assert(name, rBControl.code === 2, `H.b-control: expected exit 2 (out-of-lane write denied — proves persona resolved and guard active), got ${rBControl.code}. stderr: ${rBControl.stderr.substring(0, 200)}`);

    if (okA && okB && okBControl) console.log(`${PASS} ${name}`);
  } finally {
    cleanup(tmpDir);
  }
}

// ============================================================
// Scenario I: Bash-path protected-write + rm-variant denial (Issue #300 findings 5–6)
//
// Proves both arms: real writes/redirects/deletes that TARGET a protected path DENY
// (exit 2); reads that merely MENTION a protected path PERMIT (exit 0). The read-only
// negative controls (I.h–I.k) are the Briar Issue #300 Major repros — they regress the
// co-occurrence over-block where the protected path was matched anywhere in the command
// rather than as the mutation's actual destination.
//
//   Positive (must DENY — protected path is the mutation target):
//   I.a: echo x > .claude/hooks/run-gates.mjs      → exit 2 (redirect to protected path)
//   I.b: tee .claude/hooks/gates.json               → exit 2 (tee to protected path)
//   I.c: sed -i ... .claude/hooks/ownership-guard.mjs → exit 2 (sed -i to protected path)
//   I.d: rm -f .prism/evidence/smoke/strikes.json   → exit 2 (rm -f variant)
//   I.e: rm --force .prism/evidence/smoke/ledger.jsonl → exit 2 (rm --force variant)
//   I.f: echo x > src/foo.ts                         → exit 0 (negative — not protected)
//   I.g: rm src/foo.ts                               → exit 0 (negative — not evidence)
//
//   Fused-redirect / bare-directory closures (Briar Issue #300 re-review — C1, C2):
//   I.l: echo x>.claude/hooks/gates.json            → exit 2 (fused redirect, no space — C1)
//   I.m: echo x>>.claude/hooks/run-gates.mjs        → exit 2 (fused append redirect — C1)
//   I.n: echo x>/tmp/safe.txt                        → exit 0 (fused redirect to safe path — C1 negative)
//   I.o: rm -rf .prism/evidence                      → exit 2 (bare-dir delete, no slash — C2)
//   I.p: rm -rf ./.prism/evidence                    → exit 2 (dotslash bare-dir delete — C2)
//   I.q: echo x 2>&1                                 → exit 0 (fd-dup, not a file write — C1 skip-fd lock)
//
//   Read-only negative controls (must PERMIT — protected path is a read source/arg only):
//   I.h: git diff main -- .claude/hooks/gates.json 2>&1  → exit 0 (stderr fd-dup, pure read)
//   I.i: cat .claude/hooks/run-gates.mjs > /tmp/out.txt  → exit 0 (hook is read source; safe target)
//   I.j: node .claude/hooks/run-gates.mjs < x > /tmp/y   → exit 0 (hook run, output to safe path)
//   I.k: grep rm .prism/evidence/smoke/ledger.jsonl      → exit 0 (rm is search string, not the command)
//
//   Segmentation grammar (task 6.5 — one case per SEGMENT_SEPARATORS member + heredoc control):
//   I.r: echo hi\nrm -rf .prism/evidence                 → exit 2 (NEWLINE — the iter-3 leak)
//   I.s: echo hi\necho x > .claude/hooks/gates.json       → exit 2 (NEWLINE, redirect arm)
//   I.t: echo hi; rm -rf .prism/evidence                  → exit 2 (semicolon)
//   I.u: echo hi && rm -rf .prism/evidence                → exit 2 (&&)
//   I.v: false || rm -rf .prism/evidence                  → exit 2 (||)
//   I.w: echo hi | tee .claude/hooks/gates.json           → exit 2 (pipe — tee head)
//   I.x: echo hi & rm -rf .prism/evidence                 → exit 2 (background &)
//   I.y: echo hi\nrm src/foo.ts                           → exit 0 (NEWLINE negative — no over-block)
//   I.z: cat <<'EOF'\nrm -rf .prism/evidence\nEOF         → exit 0 (heredoc body excluded under \n join)
//
//   baseline.json gate-state protection (Bug 2 — the forge vector Eric reproduced):
//   I.aa: echo '{"types":1}' > .prism/evidence/r/baseline.json → exit 2 (redirect forge of baseline DENY)
//   I.ab: echo '{}' > .prism/evidence/r/report.json            → exit 0 (Bash-path carve-out NOT over-extended)
// ============================================================
{
  const name = 'I: Bash-path protected-write + rm-variant denial (findings 5–6)';
  const gates = {
    clove: {
      writes_report_to: '.prism/evidence/${runKey}/report.json',
      preconditions: [],
      gates: [],
      allowed_routes: ['briar'],
      ownership: {
        may_write: ['src/**'],
        may_not_run: ['gh pr merge', 'rm .prism/evidence', 'rm -rf .prism/evidence'],
      },
    },
  };

  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'prism-smoke-i-'));
  try {
    const gatesPath = path.join(tmpDir, '.claude', 'hooks', 'gates.json');
    mkdirSync(path.dirname(gatesPath), { recursive: true });
    writeFileSync(gatesPath, JSON.stringify(gates, null, 2), 'utf8');

    const env = { CLAUDE_PROJECT_DIR: tmpDir };
    const guardScript = path.join(HOOKS_DIR, 'ownership-guard.mjs');

    function runGuardBash(command) {
      return runHook(guardScript, {
        session_id: 'smoke-session',
        agent_type: 'prism-code-dev',
        hook_event_name: 'PreToolUse',
        tool_name: 'Bash',
        tool_input: { command },
        cwd: tmpDir,
      }, env);
    }

    const rA = runGuardBash('echo x > .claude/hooks/run-gates.mjs');
    const okA = assert(name, rA.code === 2, `I.a: expected exit 2 (redirect to run-gates.mjs), got ${rA.code}. stderr: ${rA.stderr.substring(0, 200)}`);

    const rB = runGuardBash('tee .claude/hooks/gates.json');
    const okB = assert(name, rB.code === 2, `I.b: expected exit 2 (tee to gates.json), got ${rB.code}. stderr: ${rB.stderr.substring(0, 200)}`);

    const rC = runGuardBash('sed -i s/a/b/ .claude/hooks/ownership-guard.mjs');
    const okC = assert(name, rC.code === 2, `I.c: expected exit 2 (sed -i to ownership-guard.mjs), got ${rC.code}. stderr: ${rC.stderr.substring(0, 200)}`);

    const rD = runGuardBash('rm -f .prism/evidence/smoke/strikes.json');
    const okD = assert(name, rD.code === 2, `I.d: expected exit 2 (rm -f evidence), got ${rD.code}. stderr: ${rD.stderr.substring(0, 200)}`);

    const rE = runGuardBash('rm --force .prism/evidence/smoke/ledger.jsonl');
    const okE = assert(name, rE.code === 2, `I.e: expected exit 2 (rm --force evidence), got ${rE.code}. stderr: ${rE.stderr.substring(0, 200)}`);

    const rF = runGuardBash('echo x > src/foo.ts');
    const okF = assert(name, rF.code === 0, `I.f: expected exit 0 (redirect to non-protected src), got ${rF.code}. stderr: ${rF.stderr.substring(0, 200)}`);

    const rG = runGuardBash('rm src/foo.ts');
    const okG = assert(name, rG.code === 0, `I.g: expected exit 0 (rm of non-evidence path), got ${rG.code}. stderr: ${rG.stderr.substring(0, 200)}`);

    // Read-only negative controls — the Briar Issue #300 Major repros. A protected path that
    // is only a read source/arg (never the mutation's destination) must PERMIT.
    const rH = runGuardBash('git diff main -- .claude/hooks/gates.json 2>&1');
    const okH = assert(name, rH.code === 0, `I.h: expected exit 0 (git diff of gates.json; 2>&1 is fd-dup, pure read), got ${rH.code}. stderr: ${rH.stderr.substring(0, 200)}`);

    const rI = runGuardBash('cat .claude/hooks/run-gates.mjs > /tmp/out.txt');
    const okI = assert(name, rI.code === 0, `I.i: expected exit 0 (hook is read source, redirect target is safe /tmp), got ${rI.code}. stderr: ${rI.stderr.substring(0, 200)}`);

    const rJ = runGuardBash('node .claude/hooks/run-gates.mjs < payload.json > /tmp/result.json');
    const okJ = assert(name, rJ.code === 0, `I.j: expected exit 0 (running the hook in a test, output to safe path), got ${rJ.code}. stderr: ${rJ.stderr.substring(0, 200)}`);

    const rK = runGuardBash('grep rm .prism/evidence/smoke/ledger.jsonl');
    const okK = assert(name, rK.code === 0, `I.k: expected exit 0 (grep reads ledger; 'rm' is the search string, not the command), got ${rK.code}. stderr: ${rK.stderr.substring(0, 200)}`);

    // Fused-redirect closures (C1) — the redirect operator glued to the preceding word with
    // no space still redirects to the protected path; the guard must collect it as a write target.
    const rL = runGuardBash('echo x>.claude/hooks/gates.json');
    const okL = assert(name, rL.code === 2, `I.l: expected exit 2 (fused redirect to gates.json, no space), got ${rL.code}. stderr: ${rL.stderr.substring(0, 200)}`);

    const rM = runGuardBash('echo x>>.claude/hooks/run-gates.mjs');
    const okM = assert(name, rM.code === 2, `I.m: expected exit 2 (fused append redirect to run-gates.mjs), got ${rM.code}. stderr: ${rM.stderr.substring(0, 200)}`);

    const rN = runGuardBash('echo x>/tmp/safe.txt');
    const okN = assert(name, rN.code === 0, `I.n: expected exit 0 (fused redirect to non-protected /tmp path), got ${rN.code}. stderr: ${rN.stderr.substring(0, 200)}`);

    const rQ = runGuardBash('echo x 2>&1');
    const okQ = assert(name, rQ.code === 0, `I.q: expected exit 0 (2>&1 is fd-dup, not a file write), got ${rQ.code}. stderr: ${rQ.stderr.substring(0, 200)}`);

    // Bare-directory evidence-delete closures (C2) — the bare dir (no trailing slash) is the
    // most destructive form, wiping the entire evidence tree; the dotslash form is equivalent.
    const rO = runGuardBash('rm -rf .prism/evidence');
    const okO = assert(name, rO.code === 2, `I.o: expected exit 2 (bare-dir evidence delete, no trailing slash), got ${rO.code}. stderr: ${rO.stderr.substring(0, 200)}`);

    const rP = runGuardBash('rm -rf ./.prism/evidence');
    const okP = assert(name, rP.code === 2, `I.p: expected exit 2 (dotslash bare-dir evidence delete), got ${rP.code}. stderr: ${rP.stderr.substring(0, 200)}`);

    // Segmentation grammar (task 6.5) — one case per separator in SEGMENT_SEPARATORS plus the
    // heredoc-newline control. Each pins one member of the closed control-operator set so a
    // future editor who breaks the grammar fails a named test. NEWLINE is the iter-3 leak.
    const rR = runGuardBash('echo hi\nrm -rf .prism/evidence');
    const okR = assert(name, rR.code === 2, `I.r: expected exit 2 (NEWLINE separator — rm on line 2 is a segment head), got ${rR.code}. stderr: ${rR.stderr.substring(0, 200)}`);

    const rS = runGuardBash('echo hi\necho x > .claude/hooks/gates.json');
    const okS = assert(name, rS.code === 2, `I.s: expected exit 2 (NEWLINE separator — redirect to protected path on line 2), got ${rS.code}. stderr: ${rS.stderr.substring(0, 200)}`);

    const rT = runGuardBash('echo hi; rm -rf .prism/evidence');
    const okT = assert(name, rT.code === 2, `I.t: expected exit 2 (semicolon separator), got ${rT.code}. stderr: ${rT.stderr.substring(0, 200)}`);

    const rU = runGuardBash('echo hi && rm -rf .prism/evidence');
    const okU = assert(name, rU.code === 2, `I.u: expected exit 2 (&& separator), got ${rU.code}. stderr: ${rU.stderr.substring(0, 200)}`);

    const rV = runGuardBash('false || rm -rf .prism/evidence');
    const okV = assert(name, rV.code === 2, `I.v: expected exit 2 (|| separator), got ${rV.code}. stderr: ${rV.stderr.substring(0, 200)}`);

    const rW = runGuardBash('echo hi | tee .claude/hooks/gates.json');
    const okW = assert(name, rW.code === 2, `I.w: expected exit 2 (pipe separator — tee is a segment head), got ${rW.code}. stderr: ${rW.stderr.substring(0, 200)}`);

    const rX = runGuardBash('echo hi & rm -rf .prism/evidence');
    const okX = assert(name, rX.code === 2, `I.x: expected exit 2 (background & separator), got ${rX.code}. stderr: ${rX.stderr.substring(0, 200)}`);

    const rY = runGuardBash('echo hi\nrm src/foo.ts');
    const okY = assert(name, rY.code === 0, `I.y: expected exit 0 (NEWLINE negative — benign rm of non-evidence path must still PERMIT), got ${rY.code}. stderr: ${rY.stderr.substring(0, 200)}`);

    const rZ = runGuardBash("cat <<'EOF'\nrm -rf .prism/evidence\nEOF");
    const okZ = assert(name, rZ.code === 0, `I.z: expected exit 0 (rm lives in heredoc data, not an executable segment — #298 heredoc break preserved under \\n join), got ${rZ.code}. stderr: ${rZ.stderr.substring(0, 200)}`);

    // baseline.json forge vector (Bug 2) — a redirect-write of a forged failed baseline routes a
    // real types/lint regression into the "pre-existing, not my regression" branch → false done.
    // The const fix lights up both paths; I.aa pins the Bash-path arm Eric reproduced as PERMIT.
    const rAA = runGuardBash(`echo '{"types":1,"lint":1}' > .prism/evidence/smoke/baseline.json`);
    const okAA = assert(name, rAA.code === 2, `I.aa: expected exit 2 (redirect forge of baseline.json — gate-state-protected), got ${rAA.code}. stderr: ${rAA.stderr.substring(0, 200)}`);

    // Carve-out is not over-extended to report.json on the Bash path either — the lawful channel holds.
    const rAB = runGuardBash(`echo '{}' > .prism/evidence/smoke/report.json`);
    const okAB = assert(name, rAB.code === 0, `I.ab: expected exit 0 (report.json redirect is the lawful channel — protection must not over-extend), got ${rAB.code}. stderr: ${rAB.stderr.substring(0, 200)}`);

    if (okA && okB && okC && okD && okE && okF && okG && okH && okI && okJ && okK && okL && okM && okN && okO && okP && okQ &&
        okR && okS && okT && okU && okV && okW && okX && okY && okZ && okAA && okAB) console.log(`${PASS} ${name}`);
  } finally {
    cleanup(tmpDir);
  }
}

// ============================================================
// Scenario J: canonical-source protection (Issue #305)
//
// The #301 denylist (Scenario E) protects only the runtime .claude/hooks/*. The canonical
// sources under .ai-skills/hooks/** are the build's input and were left unprotected, while
// that same tree sat in clove.may_write. A gated persona could edit canonical gates.json or
// a canonical *.mjs, run `pnpm prism:build`, and the weakened runtime would go live — the
// same in-place-tamper class E closed, reopened on the input end of the build pipe. J pins
// the fix: the whole canonical hooks tree is protected EXCEPT __smoke__/ (gates nothing) and
// .ai-skills/skills/prism-code-dev/** (Clove's own skill source, a separate tree).
//
// Uses the real enforcement file paths against REPO_ROOT — same rationale as E (the
// PROTECTED_CANONICAL_HOOKS_PREFIX is a module-level const in the guard, not config).
//
// Sub-tests:
//   J1: Write to .ai-skills/hooks/gates.json              → exit 2 (canonical gate data — primary hole)
//   J2: Write to .ai-skills/hooks/run-gates.mjs           → exit 2 (canonical enforcement runtime source)
//   J3: Write to .ai-skills/hooks/ownership-guard.mjs     → exit 2 (the guard's own canonical source)
//   J4: Write to .ai-skills/hooks/evidence-ledger.mjs     → exit 2 (canonical enforcement source)
//   J5: Write to .ai-skills/hooks/lib/resolve-persona.mjs → exit 2 (prefix-covered lib/ — forward coverage)
//   J6: Write to .ai-skills/hooks/__smoke__/x.mjs         → exit 0 (carve-out — smoke gates nothing)
//   J7: Write to .ai-skills/skills/prism-code-dev/x.md    → exit 0 (carve-out — Clove's own skill source)
//   J8: Bash echo '{}' > .ai-skills/hooks/gates.json      → exit 2 (Bash redirect arm — mirror of I.aa)
//   J9: Bash sed -i s/a/b/ .ai-skills/hooks/run-gates.mjs → exit 2 (Bash sed -i arm — mirror of I.c)
//   J10: Bash echo hi > .ai-skills/hooks/__smoke__/note.txt → exit 0 (Bash-path carve-out — selective, not whole-tree)
//   J11: Bash echo x > ./.ai-skills/hooks/gates.json       → exit 2 (./-prefix spelling — normalization closes it)
//   J12: Bash echo x > .ai-skills/hooks/../hooks/gates.json → exit 2 (..-traversal spelling — normalization closes it)
//   J13: Bash sed -i ... ./.ai-skills/hooks/run-gates.mjs   → exit 2 (./-prefix sed -i — normalization closes it)
//   J14: Bash cat .ai-skills/hooks/gates.json (read)        → exit 0 (read mentioning a canonical path still permits)
//   J15: Bash echo x > <abs>/.ai-skills/hooks/gates.json    → exit 2 (absolute spelling — runs only when REPO_ROOT is space-free)
//
// J11–J13 + J15 are the regression pins for the Bash-arm ./-prefix / ..-traversal / absolute
// bypass: before the fix, isProtectedCanonicalHookPath's startsWith check let any non-bare
// spelling through; the target is now normalized (path.relative ∘ path.resolve) before the
// prefix check, the same way the tool-path normalizes filePath. J14 confirms the fix did not
// over-block reads. J15 uses a true absolute path and so runs only when REPO_ROOT has no space
// — the whitespace tokenizer splits a spaced absolute token (an orthogonal, pre-existing
// Bash-arm limitation shared by every I-series check), which would test the tokenizer, not the
// normalization. On CI (Ubuntu, space-free path) J15 runs and pins the real absolute spelling.
// ============================================================
{
  const name = 'J: canonical-source protection (#305)';

  const guardScript = path.join(HOOKS_DIR, 'ownership-guard.mjs');

  // REPO_ROOT as CLAUDE_PROJECT_DIR so path normalization maps to the real relative paths —
  // the real gates.json is at REPO_ROOT too, and the canonical prefix is hardcoded relative
  // to it. .ai-skills/skills/prism-code-dev/** is in clove.may_write, so J7 permits via the
  // lane; .ai-skills/hooks/__smoke__/** is in clove.may_write (post-Task-2) AND carved out of
  // the canonical prefix, so J6 permits.
  const envReal = { CLAUDE_PROJECT_DIR: REPO_ROOT };

  function runGuardWrite(filePath) {
    return runHook(guardScript, {
      session_id: 'smoke-j',
      agent_type: 'prism-code-dev',
      hook_event_name: 'PreToolUse',
      tool_name: 'Write',
      tool_input: { file_path: filePath },
      cwd: REPO_ROOT,
    }, envReal);
  }

  function runGuardBash(command) {
    return runHook(guardScript, {
      session_id: 'smoke-j',
      agent_type: 'prism-code-dev',
      hook_event_name: 'PreToolUse',
      tool_name: 'Bash',
      tool_input: { command },
      cwd: REPO_ROOT,
    }, envReal);
  }

  // J1: canonical gate data — the primary hole
  const rJ1 = runGuardWrite('.ai-skills/hooks/gates.json');
  const okJ1 = assert(name, rJ1.code === 2,
    `J1: expected exit 2 for Write to canonical gates.json (canonical-source-protected), got ${rJ1.code}. stderr: ${rJ1.stderr.substring(0, 200)}`) &&
    assert(name, /canonical/.test(rJ1.stderr), `J1: expected stderr to name canonical-source protection. Got: ${rJ1.stderr.substring(0, 200)}`);

  // J2: canonical enforcement runtime source
  const rJ2 = runGuardWrite('.ai-skills/hooks/run-gates.mjs');
  const okJ2 = assert(name, rJ2.code === 2,
    `J2: expected exit 2 for Write to canonical run-gates.mjs, got ${rJ2.code}. stderr: ${rJ2.stderr.substring(0, 200)}`);

  // J3: the guard's own canonical source
  const rJ3 = runGuardWrite('.ai-skills/hooks/ownership-guard.mjs');
  const okJ3 = assert(name, rJ3.code === 2,
    `J3: expected exit 2 for Write to canonical ownership-guard.mjs, got ${rJ3.code}. stderr: ${rJ3.stderr.substring(0, 200)}`);

  // J4: another canonical enforcement source
  const rJ4 = runGuardWrite('.ai-skills/hooks/evidence-ledger.mjs');
  const okJ4 = assert(name, rJ4.code === 2,
    `J4: expected exit 2 for Write to canonical evidence-ledger.mjs, got ${rJ4.code}. stderr: ${rJ4.stderr.substring(0, 200)}`);

  // J5: prefix-covered lib/ — pins forward coverage of future helpers
  const rJ5 = runGuardWrite('.ai-skills/hooks/lib/resolve-persona.mjs');
  const okJ5 = assert(name, rJ5.code === 2,
    `J5: expected exit 2 for Write to canonical lib/resolve-persona.mjs (prefix covers lib/), got ${rJ5.code}. stderr: ${rJ5.stderr.substring(0, 200)}`);

  // J6: carve-out — smoke tests gate nothing → must permit
  const rJ6 = runGuardWrite('.ai-skills/hooks/__smoke__/x.mjs');
  const okJ6 = assert(name, rJ6.code === 0,
    `J6: expected exit 0 for Write to canonical __smoke__/x.mjs (carve-out — smoke gates nothing), got ${rJ6.code}. stderr: ${rJ6.stderr.substring(0, 200)}`);

  // J7: carve-out — Clove's own skill source is a separate tree → must permit
  const rJ7 = runGuardWrite('.ai-skills/skills/prism-code-dev/x.md');
  const okJ7 = assert(name, rJ7.code === 0,
    `J7: expected exit 0 for Write to prism-code-dev/x.md (separate tree, in may_write), got ${rJ7.code}. stderr: ${rJ7.stderr.substring(0, 200)}`);

  // J8: Bash redirect arm — covers canonical too (mirror of I.aa)
  const rJ8 = runGuardBash(`echo '{}' > .ai-skills/hooks/gates.json`);
  const okJ8 = assert(name, rJ8.code === 2,
    `J8: expected exit 2 for Bash redirect to canonical gates.json, got ${rJ8.code}. stderr: ${rJ8.stderr.substring(0, 200)}`);

  // J9: Bash sed -i arm — mirror of I.c
  const rJ9 = runGuardBash('sed -i s/a/b/ .ai-skills/hooks/run-gates.mjs');
  const okJ9 = assert(name, rJ9.code === 2,
    `J9: expected exit 2 for Bash sed -i of canonical run-gates.mjs, got ${rJ9.code}. stderr: ${rJ9.stderr.substring(0, 200)}`);

  // J10: Bash-path carve-out for smoke — protection is selective, not a whole-tree block
  const rJ10 = runGuardBash('echo hi > .ai-skills/hooks/__smoke__/note.txt');
  const okJ10 = assert(name, rJ10.code === 0,
    `J10: expected exit 0 for Bash redirect to canonical __smoke__/note.txt (carve-out), got ${rJ10.code}. stderr: ${rJ10.stderr.substring(0, 200)}`);

  // J11: ./-prefix redirect — normalization collapses it to the bare prefix → deny
  const rJ11 = runGuardBash('echo x > ./.ai-skills/hooks/gates.json');
  const okJ11 = assert(name, rJ11.code === 2,
    `J11: expected exit 2 for Bash redirect to ./.ai-skills/hooks/gates.json (./-prefix), got ${rJ11.code}. stderr: ${rJ11.stderr.substring(0, 200)}`);

  // J12: ..-traversal redirect — normalization collapses the traversal to the bare prefix → deny.
  // Space-immune (single token regardless of REPO_ROOT spaces), so it pins the traversal spelling
  // on every platform; J15 covers the true-absolute spelling where the path allows.
  const rJ12 = runGuardBash('echo x > .ai-skills/hooks/../hooks/gates.json');
  const okJ12 = assert(name, rJ12.code === 2,
    `J12: expected exit 2 for Bash redirect to ..-traversal canonical gates.json, got ${rJ12.code}. stderr: ${rJ12.stderr.substring(0, 200)}`);

  // J13: ./-prefix sed -i — normalization collapses the in-place target → deny
  const rJ13 = runGuardBash('sed -i s/a/b/ ./.ai-skills/hooks/run-gates.mjs');
  const okJ13 = assert(name, rJ13.code === 2,
    `J13: expected exit 2 for Bash sed -i of ./.ai-skills/hooks/run-gates.mjs (./-prefix), got ${rJ13.code}. stderr: ${rJ13.stderr.substring(0, 200)}`);

  // J14: read mentioning a canonical path — only writes deny, reads still permit
  const rJ14 = runGuardBash('cat .ai-skills/hooks/gates.json');
  const okJ14 = assert(name, rJ14.code === 0,
    `J14: expected exit 0 for Bash read of canonical gates.json (read, not write), got ${rJ14.code}. stderr: ${rJ14.stderr.substring(0, 200)}`);

  // J15: true absolute-path redirect → deny. Runs only when REPO_ROOT is space-free: a spaced
  // absolute path splits in the whitespace tokenizer (orthogonal pre-existing Bash-arm limit),
  // which would test the tokenizer, not the normalization. CI (Ubuntu) is space-free, so the
  // real absolute spelling is pinned there; a spaced dev path skips it without a false failure.
  let okJ15 = true;
  if (!/\s/.test(REPO_ROOT)) {
    const absGates = path.join(REPO_ROOT, '.ai-skills/hooks/gates.json');
    const rJ15 = runGuardBash(`echo x > ${absGates}`);
    okJ15 = assert(name, rJ15.code === 2,
      `J15: expected exit 2 for Bash redirect to absolute canonical gates.json, got ${rJ15.code}. stderr: ${rJ15.stderr.substring(0, 200)}`);
  } else {
    console.log(`  J15: skipped — REPO_ROOT contains a space (spaced absolute tokens split in the whitespace tokenizer, orthogonal to the normalization under test).`);
  }

  if (okJ1 && okJ2 && okJ3 && okJ4 && okJ5 && okJ6 && okJ7 && okJ8 && okJ9 && okJ10 && okJ11 && okJ12 && okJ13 && okJ14 && okJ15) {
    console.log(`${PASS} ${name}`);
  }
}

// ============================================================
// Scenario K: Maintenance mode (Phase 4.5)
//
// CLAUDE_PRISM_MAINTENANCE=1 unlocks enforcement-SOURCE writes (canonical hooks tree +
// runtime hooks) so a human can service the floor. Gate STATE (evidence/* basenames) and
// lane boundaries (may_not_run) are never suspended — maintenance is not god mode.
//
// Sub-tests (one per protection arm):
//   K1: maintenance OFF → Write to .ai-skills/hooks/gates.json DENY (exit 2) — current behavior unchanged
//   K2: maintenance ON  → same Write PERMIT (exit 0) + maintenance-ledger.jsonl line written
//   K3: maintenance ON  → Write to .prism/evidence/<run>/strikes.json STILL DENY (gate state never unlocked)
//   K4: maintenance ON  → Bash 'gh pr merge 123' STILL DENY (may_not_run never unlocked)
//   K5: maintenance ON  → persona tool-Write to maintenance-ledger.jsonl DENY (audit trail tamper-proof)
//   K6: maintenance ON  → fused source-write && evidence-delete DENY (evidence-delete arm fires despite source-write unlock)
// ============================================================
{
  const name = 'K: maintenance mode';

  const gates = {
    clove: {
      writes_report_to: '.prism/evidence/${runKey}/report.json',
      preconditions: [],
      gates: [],
      allowed_routes: ['briar'],
      ownership: {
        may_write: ['src/**', '.prism/evidence/**/report.json'],
        may_not_run: ['gh pr merge'],
      },
    },
  };

  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'prism-smoke-k-'));
  try {
    const gatesPath = path.join(tmpDir, '.claude', 'hooks', 'gates.json');
    mkdirSync(path.dirname(gatesPath), { recursive: true });
    writeFileSync(gatesPath, JSON.stringify(gates, null, 2), 'utf8');

    const guardScript = path.join(HOOKS_DIR, 'ownership-guard.mjs');

    function runGuardWrite(relPath, extraEnv = {}) {
      return runHook(guardScript, {
        session_id: 'smoke-k',
        agent_type: 'prism-code-dev',
        hook_event_name: 'PreToolUse',
        tool_name: 'Write',
        tool_input: { file_path: relPath },
        cwd: tmpDir,
      }, { CLAUDE_PROJECT_DIR: tmpDir, ...extraEnv });
    }

    function runGuardBash(command, extraEnv = {}) {
      return runHook(guardScript, {
        session_id: 'smoke-k',
        agent_type: 'prism-code-dev',
        hook_event_name: 'PreToolUse',
        tool_name: 'Bash',
        tool_input: { command },
        cwd: tmpDir,
      }, { CLAUDE_PROJECT_DIR: tmpDir, ...extraEnv });
    }

    // K1: maintenance OFF → canonical gates.json write is denied
    const rK1 = runGuardWrite('.ai-skills/hooks/gates.json');
    const okK1 = assert(name, rK1.code === 2,
      `K1: maintenance OFF — expected exit 2 for Write to canonical gates.json, got ${rK1.code}. stderr: ${rK1.stderr.substring(0, 200)}`);

    // K2: maintenance ON → same write is permitted and ledger line is written
    const maintenanceEnv = { CLAUDE_PRISM_MAINTENANCE: '1' };
    const rK2 = runGuardWrite('.ai-skills/hooks/gates.json', maintenanceEnv);
    const okK2write = assert(name, rK2.code === 0,
      `K2: maintenance ON — expected exit 0 for Write to canonical gates.json, got ${rK2.code}. stderr: ${rK2.stderr.substring(0, 200)}`);
    // Confirm a maintenance-ledger.jsonl line was written
    const ledgerPath = path.join(tmpDir, '.prism', 'evidence', 'maintenance-ledger.jsonl');
    const ledgerExists = existsSync(ledgerPath);
    const okK2ledger = assert(name, ledgerExists,
      `K2: maintenance ON — expected maintenance-ledger.jsonl to be written at ${ledgerPath}`);
    let okK2entry = true;
    if (ledgerExists) {
      const lines = readFileSync(ledgerPath, 'utf8').trim().split('\n').filter(Boolean);
      okK2entry = assert(name, lines.length >= 1,
        `K2: expected at least 1 line in maintenance-ledger.jsonl, got ${lines.length}`);
      if (okK2entry) {
        try {
          const entry = JSON.parse(lines[lines.length - 1]);
          okK2entry = assert(name, typeof entry.ts === 'number' && entry.path && entry.runKey,
            `K2: ledger entry missing expected fields (ts, path, runKey). Got: ${lines[lines.length - 1]}`);
        } catch (e) {
          assert(name, false, `K2: ledger entry is not valid JSON: ${e.message}`);
          okK2entry = false;
        }
      }
    }
    const okK2 = okK2write && okK2ledger && okK2entry;

    // K3: maintenance ON → write to strikes.json (gate state) is still denied
    const evidenceDir = path.join(tmpDir, '.prism', 'evidence', 'smoke-k');
    mkdirSync(evidenceDir, { recursive: true });
    const rK3 = runGuardWrite('.prism/evidence/smoke-k/strikes.json', maintenanceEnv);
    const okK3 = assert(name, rK3.code === 2,
      `K3: maintenance ON — expected exit 2 for Write to strikes.json (gate state never unlocked), got ${rK3.code}. stderr: ${rK3.stderr.substring(0, 200)}`);

    // K4: maintenance ON → gh pr merge still denied (may_not_run never suspended)
    const rK4 = runGuardBash('gh pr merge 123', maintenanceEnv);
    const okK4 = assert(name, rK4.code === 2,
      `K4: maintenance ON — expected exit 2 for 'gh pr merge 123' (may_not_run never unlocked), got ${rK4.code}. stderr: ${rK4.stderr.substring(0, 200)}`);

    // K5: maintenance ON → persona tool-Write to maintenance-ledger.jsonl is denied (audit trail tamper-proof)
    const rK5 = runGuardWrite('.prism/evidence/maintenance-ledger.jsonl', maintenanceEnv);
    const okK5 = assert(name, rK5.code === 2,
      `K5: maintenance ON — expected exit 2 for Write to maintenance-ledger.jsonl (audit trail tamper-proof), got ${rK5.code}. stderr: ${rK5.stderr.substring(0, 200)}`);

    // K6: maintenance ON + fused source-write && evidence-delete → DENY
    // The Major Eric named: echo x > .ai-skills/hooks/gates.json && rm -rf .prism/evidence
    // exits 0 without this fix because the maintenance unlock fires early on the source-write
    // segment, skipping the evidence-delete structural backstop. With the fix, commandDeletesEvidence
    // runs on the full command before the early exit — the evidence arm fires and denies.
    const rK6 = runGuardBash(
      'echo x > .ai-skills/hooks/gates.json && rm -rf .prism/evidence',
      maintenanceEnv
    );
    const okK6 = assert(name, rK6.code === 2,
      `K6: maintenance ON + fused source-write && evidence-delete — expected exit 2 (evidence-delete arm fires despite source-write being unlocked), got ${rK6.code}. stderr: ${rK6.stderr.substring(0, 200)}`);

    // K7: build.ts emitter self-weaken vector (F1) — maintenance OFF → Write to build.ts DENY.
    // scripts/ai-skills/build.ts is in clove.may_write (as the lawful authoring lane) but also
    // in PROTECTED_WRITE_PATHS (via isEnforcementSourceProtected). A gated Clove editing it could
    // emit a weakened runtime through the build pipe; the denylist closes that vector.
    const rK7 = runGuardWrite('scripts/ai-skills/build.ts');
    const okK7 = assert(name, rK7.code === 2,
      `K7: maintenance OFF — expected exit 2 for Write to scripts/ai-skills/build.ts (emitter self-weaken vector, protected via PROTECTED_WRITE_PATHS), got ${rK7.code}. stderr: ${rK7.stderr.substring(0, 200)}`);

    // K8: build.ts emitter self-weaken vector (F1) — maintenance ON → Write PERMITS + ledger line.
    // Same protection arm as K7, but the maintenance lever unlocks it so a human can service the
    // emitter — identical to how K2 permits canonical gates.json under maintenance.
    const rK8 = runGuardWrite('scripts/ai-skills/build.ts', maintenanceEnv);
    const okK8 = assert(name, rK8.code === 0,
      `K8: maintenance ON — expected exit 0 for Write to scripts/ai-skills/build.ts (maintenance unlock covers PROTECTED_WRITE_PATHS), got ${rK8.code}. stderr: ${rK8.stderr.substring(0, 200)}`);
    // Confirm a maintenance-ledger.jsonl line was written for the build.ts unlock
    if (okK8) {
      const lines2 = existsSync(ledgerPath)
        ? readFileSync(ledgerPath, 'utf8').trim().split('\n').filter(Boolean)
        : [];
      assert(name, lines2.some(l => { try { return JSON.parse(l).path === 'scripts/ai-skills/build.ts'; } catch { return false; } }),
        `K8: expected a maintenance-ledger.jsonl entry with path 'scripts/ai-skills/build.ts'`);
    }

    if (okK1 && okK2 && okK3 && okK4 && okK5 && okK6 && okK7 && okK8) console.log(`${PASS} ${name}`);
  } finally {
    cleanup(tmpDir);
  }
}


// ============================================================
// Scenario L: Class B coherence gate mechanism
//
// Uses Sasha as the representative Class B persona — she has both the universal
// report-written precondition and a content-precondition (debugged-issue-recorded).
//
// Sub-tests:
//   L.a: FAIL coherence — missing required field (persona) → exit 2
//   L.b: PASS coherence — coherent done report with valid route → exit 0
//   L.c: FAIL content-precondition — no Debugged Issues plan entry → exit 2
//         AND strike NOT incremented (discriminator: precondition miss is protocol, not gate)
//   L.d: PASS — artifact present + coherent report → exit 0
//   L.e: FAIL needs-fix + empty findings → exit 2, stderr cites payload-coherence
//   L.f: PASS — needs-fix with >= 1 critical/major finding → exit 0
//
// Negative control: existing Clove scenarios (A/C) remain unchanged.
// ============================================================
{
  const name = 'L: Class B coherence gate';

  // Shared Sasha gates fixture — gates:[] (Class B), one universal precondition,
  // one content-precondition using a command that exits 0 iff a plan file has ## Debugged Issues.
  function makeSashaGates(preconditions) {
    return {
      sasha: {
        writes_report_to: '.prism/evidence/${runKey}/report.json',
        preconditions,
        gates: [],
        allowed_routes: ['clove', 'human'],
        ownership: { may_write: ['.prism/plans/**', '.prism/evidence/**/report.json'], may_not_run: [] },
      },
    };
  }

  const reportWrittenPrecon = {
    id: 'report-written',
    description: 'report.json written before stop',
    check: { kind: 'file-exists', path: '.prism/evidence/${runKey}/report.json' },
    on_fail: 'needs-replan',
  };

  // Content-precondition: command that always exits 1 (simulates no plan entry found)
  const noEntryPrecon = {
    id: 'debugged-issue-recorded',
    description: 'A ## Debugged Issues entry exists in at least one plan file',
    check: { kind: 'command', command: 'node -e "process.exit(1)"' },
    on_fail: 'needs-replan',
  };

  // Content-precondition: command that always exits 0 (simulates plan entry found)
  const hasEntryPrecon = {
    id: 'debugged-issue-recorded',
    description: 'A ## Debugged Issues entry exists in at least one plan file',
    check: { kind: 'command', command: 'node -e "process.exit(0)"' },
    on_fail: 'needs-replan',
  };

  const validDoneReport = {
    verdict: 'done',
    verdict_reason: 'investigation complete',
    next_route: 'clove',
    reasoning: 'root cause identified and documented',
    persona: 'sasha',
    checklist: {},
  };

  const validNeedsFixReport = {
    verdict: 'needs-fix',
    verdict_reason: 'critical issue found',
    next_route: 'clove',
    reasoning: 'critical issue requires fix',
    persona: 'sasha',
    checklist: {},
    payload: {
      findings: [{ severity: 'critical', description: 'Null pointer in resolver' }],
    },
  };

  const gatesNoPreconditions = makeSashaGates([reportWrittenPrecon]);
  const gatesWithFailingContent = makeSashaGates([reportWrittenPrecon, noEntryPrecon]);
  const gatesWithPassingContent = makeSashaGates([reportWrittenPrecon, hasEntryPrecon]);

  // L.a: missing required field 'persona' → validateShape fails → exit 2
  {
    const badReport = { verdict: 'done', verdict_reason: 'done', next_route: 'clove', reasoning: 'ok', checklist: {} };
    const { tmpDir } = setupStopFixture({ gates: gatesNoPreconditions, report: badReport });
    try {
      const payload = { session_id: 'smoke-session', agent_type: 'prism-debugger', stop_reason: 'end_turn' };
      const r = runHook(path.join(HOOKS_DIR, 'run-gates.mjs'), payload, { CLAUDE_PROJECT_DIR: tmpDir });
      assert(name, r.code === 2,
        `L.a: missing 'persona' field — expected exit 2, got ${r.code}. stderr: ${r.stderr.substring(0, 200)}`);
    } finally {
      cleanup(tmpDir);
    }
  }

  // L.b: coherent done report with all required fields and valid route → exit 0
  {
    const { tmpDir } = setupStopFixture({ gates: gatesNoPreconditions, report: validDoneReport });
    try {
      const payload = { session_id: 'smoke-session', agent_type: 'prism-debugger', stop_reason: 'end_turn' };
      const r = runHook(path.join(HOOKS_DIR, 'run-gates.mjs'), payload, { CLAUDE_PROJECT_DIR: tmpDir });
      assert(name, r.code === 0,
        `L.b: coherent done report — expected exit 0, got ${r.code}. stderr: ${r.stderr.substring(0, 200)}`);
    } finally {
      cleanup(tmpDir);
    }
  }

  // L.c: content-precondition fails (no plan entry) → exit 2 AND strike NOT incremented.
  // Discriminator: precondition misses do not consume a gate strike (protocol miss, not gate fail).
  {
    const { tmpDir, strikesPath } = setupStopFixture({ gates: gatesWithFailingContent, report: validDoneReport, strikes: 0 });
    try {
      const payload = { session_id: 'smoke-session', agent_type: 'prism-debugger', stop_reason: 'end_turn' };
      const r = runHook(path.join(HOOKS_DIR, 'run-gates.mjs'), payload, { CLAUDE_PROJECT_DIR: tmpDir });
      const exitOk = assert(name, r.code === 2,
        `L.c: content-precondition fail — expected exit 2, got ${r.code}. stderr: ${r.stderr.substring(0, 200)}`);
      if (exitOk) {
        // Verify strike was NOT incremented — strikes.json should not exist or count remains 0.
        const strikesAfter = existsSync(strikesPath)
          ? JSON.parse(readFileSync(strikesPath, 'utf8'))
          : { count: 0 };
        assert(name, (strikesAfter.count ?? 0) === 0,
          `L.c: precondition miss should not increment strike. Got count=${strikesAfter.count}`);
      }
    } finally {
      cleanup(tmpDir);
    }
  }

  // L.d: content-precondition passes (plan entry found) + coherent done report → exit 0
  {
    const { tmpDir } = setupStopFixture({ gates: gatesWithPassingContent, report: validDoneReport });
    try {
      const payload = { session_id: 'smoke-session', agent_type: 'prism-debugger', stop_reason: 'end_turn' };
      const r = runHook(path.join(HOOKS_DIR, 'run-gates.mjs'), payload, { CLAUDE_PROJECT_DIR: tmpDir });
      assert(name, r.code === 0,
        `L.d: content-precondition pass + coherent done — expected exit 0, got ${r.code}. stderr: ${r.stderr.substring(0, 200)}`);
    } finally {
      cleanup(tmpDir);
    }
  }

  // L.e: needs-fix verdict with empty findings array → payload-coherence check fails → exit 2
  {
    const emptyFindingsReport = {
      verdict: 'needs-fix',
      verdict_reason: 'found issues',
      next_route: 'clove',
      reasoning: 'review complete',
      persona: 'sasha',
      checklist: {},
      payload: { findings: [] },
    };
    const { tmpDir } = setupStopFixture({ gates: gatesNoPreconditions, report: emptyFindingsReport });
    try {
      const payload = { session_id: 'smoke-session', agent_type: 'prism-debugger', stop_reason: 'end_turn' };
      const r = runHook(path.join(HOOKS_DIR, 'run-gates.mjs'), payload, { CLAUDE_PROJECT_DIR: tmpDir });
      assert(name, r.code === 2,
        `L.e: needs-fix + empty findings — expected exit 2, got ${r.code}. stderr: ${r.stderr.substring(0, 200)}`);
    } finally {
      cleanup(tmpDir);
    }
  }

  // L.f: needs-fix verdict with >= 1 critical/major finding → payload-coherence passes → exit 0
  {
    const { tmpDir } = setupStopFixture({ gates: gatesNoPreconditions, report: validNeedsFixReport });
    try {
      const payload = { session_id: 'smoke-session', agent_type: 'prism-debugger', stop_reason: 'end_turn' };
      const r = runHook(path.join(HOOKS_DIR, 'run-gates.mjs'), payload, { CLAUDE_PROJECT_DIR: tmpDir });
      assert(name, r.code === 0,
        `L.f: needs-fix + critical finding — expected exit 0, got ${r.code}. stderr: ${r.stderr.substring(0, 200)}`);
    } finally {
      cleanup(tmpDir);
    }
  }

  console.log(`${PASS} ${name}`);
}
// ============================================================
// Scenario M: run-scoped deliverable preconditions
//
// Uses Sasha (representative) to test the TWO-precondition run-scope shape:
//   precondition A: deliverable-sidecar (file-validates on .prism/evidence/${runKey}/deliverable.json)
//   precondition B: deliverable-touched-this-run (command — stubs via node -e)
//
// Sub-tests:
//   M.a: FAIL — stale heading exists in repo (old grep would pass) but NO sidecar written
//              → exit 2 (deliverable-sidecar precondition fails)
//   M.b: PASS — sidecar written + deliverable touched this run → exit 0
//
// Regression guard: M.a specifically closes the stale-repo-artifact hole Eric flagged.
// ============================================================
{
  const name = 'M: run-scoped deliverable preconditions';

  const reportWritten = {
    id: 'report-written',
    description: 'report.json written before stop',
    check: { kind: 'file-exists', path: '.prism/evidence/${runKey}/report.json' },
    on_fail: 'needs-replan',
  };

  // Sidecar precondition (file-validates) — checks for deliverable.json in evidence dir
  const sidecarPrecon = {
    id: 'deliverable-sidecar',
    description: 'Sasha wrote a deliverable-pointer sidecar into its run-keyed evidence dir',
    check: { kind: 'file-validates', path: '.prism/evidence/${runKey}/deliverable.json' },
    on_fail: 'needs-replan',
  };

  // Touched-this-run precondition stubs (command kind, node -e stubs)
  const touchedPassPrecon = {
    id: 'deliverable-touched-this-run',
    description: 'the deliverable path is new or modified this run',
    check: { kind: 'command', command: 'node -e "process.exit(0)"' },
    on_fail: 'needs-replan',
  };
  const touchedFailPrecon = {
    id: 'deliverable-touched-this-run',
    description: 'the deliverable path is new or modified this run',
    check: { kind: 'command', command: 'node -e "process.exit(1)"' },
    on_fail: 'needs-replan',
  };

  function makeRunScopedGates(preconditions) {
    return {
      sasha: {
        writes_report_to: '.prism/evidence/${runKey}/report.json',
        preconditions,
        gates: [],
        allowed_routes: ['clove', 'human'],
        ownership: { may_write: ['.prism/plans/**', '.prism/evidence/**/report.json'], may_not_run: [] },
      },
    };
  }

  const validDoneReport = {
    verdict: 'done',
    verdict_reason: 'investigation complete',
    next_route: 'clove',
    reasoning: 'root cause identified and documented',
    persona: 'sasha',
    checklist: {},
  };

  // M.a: sidecar absent (stale repo heading would pass old grep, but sidecar missing) → exit 2
  // This simulates a no-op run: plan already has ## Debugged Issues from a prior run.
  // The sidecar was not written this run — deliverable-sidecar precondition fails.
  {
    // Gates have all 3 preconditions (report-written + sidecar + touched-this-run)
    const gates = makeRunScopedGates([reportWritten, sidecarPrecon, touchedFailPrecon]);
    // report.json IS written (report-written passes), but NO deliverable.json sidecar
    const { tmpDir } = setupStopFixture({ gates, report: validDoneReport });
    try {
      const payload = { session_id: 'smoke-session', agent_type: 'prism-debugger', stop_reason: 'end_turn' };
      const r = runHook(path.join(HOOKS_DIR, 'run-gates.mjs'), payload, { CLAUDE_PROJECT_DIR: tmpDir });
      assert(name, r.code === 2,
        `M.a: stale-repo no-op (no sidecar) — expected exit 2, got ${r.code}. stderr: ${r.stderr.substring(0, 200)}`);
    } finally {
      cleanup(tmpDir);
    }
  }

  // M.b: sidecar written + deliverable touched this run → exit 0
  {
    const gates = makeRunScopedGates([reportWritten, sidecarPrecon, touchedPassPrecon]);
    const { tmpDir } = setupStopFixture({ gates, report: validDoneReport });
    try {
      // Write the deliverable sidecar into the evidence dir
      const runKey = 'smoke-session';
      const sidecarPath = path.join(tmpDir, '.prism', 'evidence', runKey, 'deliverable.json');
      writeFileSync(sidecarPath, JSON.stringify({ deliverable: '.prism/plans/prism-295.md', produced: true }), 'utf8');

      const payload = { session_id: 'smoke-session', agent_type: 'prism-debugger', stop_reason: 'end_turn' };
      const r = runHook(path.join(HOOKS_DIR, 'run-gates.mjs'), payload, { CLAUDE_PROJECT_DIR: tmpDir });
      assert(name, r.code === 0,
        `M.b: sidecar written + deliverable touched — expected exit 0, got ${r.code}. stderr: ${r.stderr.substring(0, 200)}`);
    } finally {
      cleanup(tmpDir);
    }
  }

  console.log(`${PASS} ${name}`);
}
// ============================================================
// Scenario N: Git working-tree mutation guard (Phase 5 / #295)
//
// A `git checkout -- <path>` or `git restore --source=HEAD <path>` that names a protected
// enforcement path is the same write vector as a shell redirect, but the existing
// commandWritesProtectedPath scan can't see it (no `>` operator). This scenario verifies
// the new commandMutatesProtectedViaGit predicate closes the gap.
//
// Sub-tests:
//   N.a: git checkout -- .ai-skills/hooks/ownership-guard.mjs → DENY (Tier 1, source path)
//   N.b: git restore --source=HEAD .ai-skills/hooks/gates.json → DENY (Tier 1, source path)
//   N.c: git checkout HEAD -- .prism/evidence/r/strikes.json → DENY (Tier 1, gate state)
//   N.d: git reset --hard HEAD → DENY (Tier 2, whole-tree)
//   N.e: git stash pop → DENY (Tier 2, whole-tree)
//   N.f: git switch main → DENY (Tier 2, whole-tree)
//   N.g: git clean -fd → DENY (Tier 2, whole-tree)
//   N.h: git apply some.patch → DENY (Tier 2, whole-tree)
//   N.i: git am < patch.mbox → DENY (Tier 2, whole-tree)
//   N.j: git checkout src/app.ts → PERMIT (Tier 1 path, not protected)
//   N.k: git status → PERMIT (read-only op, not in either set)
//   N.l: git diff HEAD → PERMIT (read-only op, not in either set)
//   N.m: git checkout -- .ai-skills/hooks/gates.json && rm -rf .prism/evidence → DENY (fused Tier1 + evidence-delete)
//   N.n: maintenance ON → git checkout -- .ai-skills/hooks/gates.json → PERMIT + ledger written (Tier 1 source path, maintenance unlocks)
//   N.o: maintenance ON → git reset --hard HEAD → PERMIT + ledger written (Tier 2, maintenance unlocks whole-tree)
//   N.p: maintenance ON → git checkout -- .prism/evidence/r/strikes.json → DENY (Tier 1 gate state, maintenance never unlocks)
//   N.q: git checkout -- .ai-skills/hooks/gates.json && git status → DENY (Tier 1 path; second segment read-only doesn't rescue first)
// ============================================================
{
  const name = 'N: git working-tree mutation guard';

  const gates = {
    clove: {
      writes_report_to: '.prism/evidence/${runKey}/report.json',
      preconditions: [],
      gates: [],
      allowed_routes: ['briar'],
      ownership: {
        may_write: ['src/**', '.prism/evidence/**/report.json'],
        may_not_run: [],
      },
    },
  };

  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'prism-smoke-n-'));
  try {
    const gatesPath = path.join(tmpDir, '.claude', 'hooks', 'gates.json');
    mkdirSync(path.dirname(gatesPath), { recursive: true });
    writeFileSync(gatesPath, JSON.stringify(gates, null, 2), 'utf8');

    const guardScript = path.join(HOOKS_DIR, 'ownership-guard.mjs');

    function runGuardBash(command, extraEnv = {}) {
      return runHook(guardScript, {
        session_id: 'smoke-n',
        agent_type: 'prism-code-dev',
        hook_event_name: 'PreToolUse',
        tool_name: 'Bash',
        tool_input: { command },
        cwd: tmpDir,
      }, { CLAUDE_PROJECT_DIR: tmpDir, ...extraEnv });
    }

    const maintenanceEnv = { CLAUDE_PRISM_MAINTENANCE: '1' };

    // N.a: git checkout -- protected source path → DENY (Tier 1, source path)
    const rNa = runGuardBash('git checkout -- .ai-skills/hooks/ownership-guard.mjs');
    const okNa = assert(name, rNa.code === 2,
      `N.a: git checkout -- ownership-guard.mjs — expected exit 2, got ${rNa.code}. stderr: ${rNa.stderr.substring(0, 300)}`);

    // N.b: git restore --source=HEAD on a protected source path → DENY (Tier 1, source path)
    const rNb = runGuardBash('git restore --source=HEAD .ai-skills/hooks/gates.json');
    const okNb = assert(name, rNb.code === 2,
      `N.b: git restore --source=HEAD gates.json — expected exit 2, got ${rNb.code}. stderr: ${rNb.stderr.substring(0, 300)}`);

    // N.c: git checkout HEAD -- strikes.json (gate state path) → DENY (Tier 1, gate state)
    const evidenceDir = path.join(tmpDir, '.prism', 'evidence', 'r');
    mkdirSync(evidenceDir, { recursive: true });
    const rNc = runGuardBash('git checkout HEAD -- .prism/evidence/r/strikes.json');
    const okNc = assert(name, rNc.code === 2,
      `N.c: git checkout HEAD -- strikes.json — expected exit 2, got ${rNc.code}. stderr: ${rNc.stderr.substring(0, 300)}`);

    // N.d: git reset --hard HEAD → DENY (Tier 2, whole-tree)
    const rNd = runGuardBash('git reset --hard HEAD');
    const okNd = assert(name, rNd.code === 2,
      `N.d: git reset --hard HEAD — expected exit 2, got ${rNd.code}. stderr: ${rNd.stderr.substring(0, 300)}`);

    // N.e: git stash pop → DENY (Tier 2, whole-tree)
    const rNe = runGuardBash('git stash pop');
    const okNe = assert(name, rNe.code === 2,
      `N.e: git stash pop — expected exit 2, got ${rNe.code}. stderr: ${rNe.stderr.substring(0, 300)}`);

    // N.f: git switch main → DENY (Tier 2, whole-tree)
    const rNf = runGuardBash('git switch main');
    const okNf = assert(name, rNf.code === 2,
      `N.f: git switch main — expected exit 2, got ${rNf.code}. stderr: ${rNf.stderr.substring(0, 300)}`);

    // N.g: git clean -fd → DENY (Tier 2, whole-tree)
    const rNg = runGuardBash('git clean -fd');
    const okNg = assert(name, rNg.code === 2,
      `N.g: git clean -fd — expected exit 2, got ${rNg.code}. stderr: ${rNg.stderr.substring(0, 300)}`);

    // N.h: git apply some.patch → DENY (Tier 2, whole-tree)
    const rNh = runGuardBash('git apply some.patch');
    const okNh = assert(name, rNh.code === 2,
      `N.h: git apply some.patch — expected exit 2, got ${rNh.code}. stderr: ${rNh.stderr.substring(0, 300)}`);

    // N.i: git am < patch.mbox → DENY (Tier 2, whole-tree)
    const rNi = runGuardBash('git am < patch.mbox');
    const okNi = assert(name, rNi.code === 2,
      `N.i: git am — expected exit 2, got ${rNi.code}. stderr: ${rNi.stderr.substring(0, 300)}`);

    // N.j: git checkout src/app.ts → PERMIT (single positional = ambiguous branch, not in protected sets)
    // The bare positional (no --) is treated as a branch name (whole-tree op), but src/app.ts
    // is not a protected path — wait, bare single positional → tier 2 whole-tree → DENY.
    // Per dispatch spec: the guard denies all whole-tree ops. Verify DENY.
    const rNj = runGuardBash('git checkout -- src/app.ts');
    const okNj = assert(name, rNj.code === 0,
      `N.j: git checkout -- src/app.ts (non-protected path) — expected exit 0, got ${rNj.code}. stderr: ${rNj.stderr.substring(0, 300)}`);

    // N.k: git status → PERMIT (read-only, not in any mutation set)
    const rNk = runGuardBash('git status');
    const okNk = assert(name, rNk.code === 0,
      `N.k: git status — expected exit 0 (read-only), got ${rNk.code}. stderr: ${rNk.stderr.substring(0, 300)}`);

    // N.l: git diff HEAD → PERMIT (read-only)
    const rNl = runGuardBash('git diff HEAD');
    const okNl = assert(name, rNl.code === 0,
      `N.l: git diff HEAD — expected exit 0 (read-only), got ${rNl.code}. stderr: ${rNl.stderr.substring(0, 300)}`);

    // N.m: fused git checkout of source path + evidence-delete → DENY (co-fused guard)
    const rNm = runGuardBash('git checkout -- .ai-skills/hooks/gates.json && rm -rf .prism/evidence');
    const okNm = assert(name, rNm.code === 2,
      `N.m: fused checkout+evidence-delete — expected exit 2, got ${rNm.code}. stderr: ${rNm.stderr.substring(0, 300)}`);

    // N.n: maintenance ON → Tier 1 source path → PERMIT + ledger written
    const rNn = runGuardBash('git checkout -- .ai-skills/hooks/gates.json', maintenanceEnv);
    const okNnCode = assert(name, rNn.code === 0,
      `N.n: maintenance ON + Tier 1 source path — expected exit 0, got ${rNn.code}. stderr: ${rNn.stderr.substring(0, 300)}`);
    const ledgerPath = path.join(tmpDir, '.prism', 'evidence', 'maintenance-ledger.jsonl');
    const okNnLedger = assert(name, existsSync(ledgerPath),
      `N.n: maintenance ON — expected maintenance-ledger.jsonl to be written at ${ledgerPath}`);
    const okNn = okNnCode && okNnLedger;

    // N.o: maintenance ON → Tier 2 whole-tree op → PERMIT + ledger written
    const ledgerSizeBefore = existsSync(ledgerPath) ? readFileSync(ledgerPath, 'utf8').split('\n').filter(Boolean).length : 0;
    const rNo = runGuardBash('git reset --hard HEAD', maintenanceEnv);
    const okNoCode = assert(name, rNo.code === 0,
      `N.o: maintenance ON + Tier 2 whole-tree — expected exit 0, got ${rNo.code}. stderr: ${rNo.stderr.substring(0, 300)}`);
    const ledgerLinesAfter = existsSync(ledgerPath) ? readFileSync(ledgerPath, 'utf8').split('\n').filter(Boolean).length : 0;
    const okNoLedger = assert(name, ledgerLinesAfter > ledgerSizeBefore,
      `N.o: maintenance ON Tier 2 — expected a new ledger entry, got ${ledgerLinesAfter} lines (was ${ledgerSizeBefore})`);
    const okNo = okNoCode && okNoLedger;

    // N.p: maintenance ON → Tier 1 gate-state path (strikes.json) → DENY (gate state never unlocked)
    const rNp = runGuardBash('git checkout -- .prism/evidence/r/strikes.json', maintenanceEnv);
    const okNp = assert(name, rNp.code === 2,
      `N.p: maintenance ON + Tier 1 gate state — expected exit 2 (gate state never unlocked), got ${rNp.code}. stderr: ${rNp.stderr.substring(0, 300)}`);

    // N.q: git checkout source path fused with git status → DENY (first segment denies)
    const rNq = runGuardBash('git checkout -- .ai-skills/hooks/gates.json && git status');
    const okNq = assert(name, rNq.code === 2,
      `N.q: fused Tier1 source checkout + git status — expected exit 2, got ${rNq.code}. stderr: ${rNq.stderr.substring(0, 300)}`);

    // --- CRITICAL-1: embedded/prefixed/assignment command-substitution probes ---
    // These forms embed a git mutation in a $(...) or backtick wrapper that is NOT a
    // whole-segment substitution, so the prior whole-segment peel missed them. The guard
    // now extracts all substitution bodies and scans them independently (CRITICAL-1 fix).

    // N.r: echo $(git checkout -- .ai-skills/hooks/gates.json) → DENY
    const rNr = runGuardBash('echo $(git checkout -- .ai-skills/hooks/gates.json)');
    const okNr = assert(name, rNr.code === 2,
      `N.r: echo $(git checkout -- gates.json) — expected exit 2 (embedded subst, CRITICAL-1), got ${rNr.code}. stderr: ${rNr.stderr.substring(0, 300)}`);

    // N.s: x=$(git reset --hard HEAD) — assignment-captured substitution → DENY
    const rNs = runGuardBash('x=$(git reset --hard HEAD)');
    const okNs = assert(name, rNs.code === 2,
      `N.s: x=$(git reset --hard) — expected exit 2 (assignment-captured subst, CRITICAL-1), got ${rNs.code}. stderr: ${rNs.stderr.substring(0, 300)}`);

    // N.t: result=`git checkout -- .ai-skills/hooks/gates.json` — backtick form → DENY
    const rNt = runGuardBash('result=`git checkout -- .ai-skills/hooks/gates.json`');
    const okNt = assert(name, rNt.code === 2,
      `N.t: backtick result=\`git checkout\` — expected exit 2 (backtick assignment, CRITICAL-1), got ${rNt.code}. stderr: ${rNt.stderr.substring(0, 300)}`);

    // N.u: echo `git reset --hard` — mid-line backtick → DENY
    const rNu = runGuardBash('echo `git reset --hard`');
    const okNu = assert(name, rNu.code === 2,
      `N.u: echo \`git reset --hard\` — expected exit 2 (mid-line backtick, CRITICAL-1), got ${rNu.code}. stderr: ${rNu.stderr.substring(0, 300)}`);

    // N.v: $(echo $(git reset --hard)) — nested substitution (inner runs) → DENY
    const rNv = runGuardBash('$(echo $(git reset --hard))');
    const okNv = assert(name, rNv.code === 2,
      `N.v: $(echo $(git reset --hard)) — expected exit 2 (nested subst, CRITICAL-1), got ${rNv.code}. stderr: ${rNv.stderr.substring(0, 300)}`);

    // N.w: echo "$(git reset --hard)" — double-quoted substitution → DENY
    const rNw = runGuardBash('echo "$(git reset --hard)"');
    const okNw = assert(name, rNw.code === 2,
      `N.w: echo "$(git reset --hard)" — expected exit 2 (double-quoted subst, CRITICAL-1), got ${rNw.code}. stderr: ${rNw.stderr.substring(0, 300)}`);

    // N.x: foo=$(git reset --hard) bar — assignment-prefixed with trailing token → DENY
    const rNx = runGuardBash('foo=$(git reset --hard) bar');
    const okNx = assert(name, rNx.code === 2,
      `N.x: foo=$(git reset --hard) bar — expected exit 2 (assignment+trailing, CRITICAL-1), got ${rNx.code}. stderr: ${rNx.stderr.substring(0, 300)}`);

    // --- CRITICAL-2: directory pathspec and :(top) magic probes ---
    // These pathspecs name the .ai-skills/hooks DIRECTORY, which git restores as a tree;
    // the prior check required a trailing slash so bare-dir and magic forms bypassed.

    // N.y: git checkout -- .ai-skills/hooks/ — dir pathspec with trailing slash → DENY
    const rNy = runGuardBash('git checkout -- .ai-skills/hooks/');
    const okNy = assert(name, rNy.code === 2,
      `N.y: git checkout -- .ai-skills/hooks/ — expected exit 2 (dir pathspec trailing slash, CRITICAL-2), got ${rNy.code}. stderr: ${rNy.stderr.substring(0, 300)}`);

    // N.z: git checkout -- .ai-skills/hooks — dir pathspec no slash → DENY
    const rNz = runGuardBash('git checkout -- .ai-skills/hooks');
    const okNz = assert(name, rNz.code === 2,
      `N.z: git checkout -- .ai-skills/hooks — expected exit 2 (dir pathspec no slash, CRITICAL-2), got ${rNz.code}. stderr: ${rNz.stderr.substring(0, 300)}`);

    // N.aa: git checkout -- ":(top).ai-skills/hooks/gates.json" — pathspec magic → DENY
    const rNaa = runGuardBash('git checkout -- ":(top).ai-skills/hooks/gates.json"');
    const okNaa = assert(name, rNaa.code === 2,
      `N.aa: git checkout -- ":(top)..." — expected exit 2 (pathspec magic, CRITICAL-2), got ${rNaa.code}. stderr: ${rNaa.stderr.substring(0, 300)}`);

    // --- Negative controls: must still PERMIT (no over-block) ---
    // Eric's 34 negative controls cover git status/diff/add/commit/log/fetch and
    // non-protected src/ paths. These spot-checks confirm the new probes don't widen the
    // denial surface beyond protected paths.

    // N.ab: git checkout -- src/app.ts — non-protected source path → PERMIT (existing N.j cover)
    // Already covered by N.j above; this comment documents the negative-control intent.

    // N.ac: gitfoo checkout — non-git head → PERMIT
    const rNac = runGuardBash('gitfoo checkout -- .ai-skills/hooks/gates.json');
    const okNac = assert(name, rNac.code === 0,
      `N.ac: gitfoo checkout (non-git head) — expected exit 0 (not a git command), got ${rNac.code}. stderr: ${rNac.stderr.substring(0, 300)}`);

    // --- CRITICAL-A: :/ top-of-tree shorthand bypass closure ---
    // git checkout HEAD -- :/.ai-skills/hooks/gates.json resolves to the root-relative path
    // and must DENY. Previously survied normalizeWriteTarget verbatim.

    // N.ad: :/ top-of-tree prefix on protected path → DENY
    const rNad = runGuardBash("git checkout HEAD -- ':/.ai-skills/hooks/gates.json'");
    const okNad = assert(name, rNad.code === 2,
      `N.ad: git checkout HEAD -- ':/.ai-skills/hooks/gates.json' (CRITICAL-A :/ top) — expected exit 2, got ${rNad.code}. stderr: ${rNad.stderr.substring(0, 300)}`);

    // N.ae: :/ in $() substitution — must also DENY
    const rNae = runGuardBash("echo $(git checkout HEAD -- ':/.ai-skills/hooks/gates.json')");
    const okNae = assert(name, rNae.code === 2,
      `N.ae: echo $(git checkout HEAD -- ':/.ai-skills/hooks/gates.json') (CRITICAL-A :/ in subst) — expected exit 2, got ${rNae.code}. stderr: ${rNae.stderr.substring(0, 300)}`);

    // --- CRITICAL-B: :! and :^ exclude shorthand bypass closure ---
    // A lone exclude pathspec is git's whole-tree-minus-one restore — must DENY on the
    // same tier as a named protected-path restore.

    // N.af: ':!.ai-skills/hooks/gates.json' → DENY (:! exclude, gates protected file excluded = rest of tree restored)
    const rNaf = runGuardBash("git checkout HEAD -- ':!.ai-skills/hooks/gates.json'");
    const okNaf = assert(name, rNaf.code === 2,
      `N.af: git checkout HEAD -- ':!gates.json' (CRITICAL-B :! exclude) — expected exit 2, got ${rNaf.code}. stderr: ${rNaf.stderr.substring(0, 300)}`);

    // N.ag: ':^.ai-skills/hooks/gates.json' → DENY (:^ caret-exclude form)
    const rNag = runGuardBash("git checkout HEAD -- ':^.ai-skills/hooks/gates.json'");
    const okNag = assert(name, rNag.code === 2,
      `N.ag: git checkout HEAD -- ':^gates.json' (CRITICAL-B :^ caret) — expected exit 2, got ${rNag.code}. stderr: ${rNag.stderr.substring(0, 300)}`);

    // N.ah: ':!/.ai-skills/hooks/gates.json' → DENY (:!/ directory exclude form)
    const rNah = runGuardBash("git checkout HEAD -- ':!/.ai-skills/hooks/gates.json'");
    const okNah = assert(name, rNah.code === 2,
      `N.ah: git checkout HEAD -- ':!/.ai-skills/hooks/gates.json' (CRITICAL-B :!/ dir exclude) — expected exit 2, got ${rNah.code}. stderr: ${rNah.stderr.substring(0, 300)}`);

    // N.ai: multi-pathspec with :/ magic — both pathspecs analyzed, protected one fires → DENY
    const rNai = runGuardBash("git checkout HEAD -- ':/.ai-skills/hooks/gates.json' src/foo.ts");
    const okNai = assert(name, rNai.code === 2,
      `N.ai: multi-pathspec :/ + src (CRITICAL-A multi) — expected exit 2, got ${rNai.code}. stderr: ${rNai.stderr.substring(0, 300)}`);

    // N.aj: $()-nested :! pathspec — substitution body extracted + exclude stripped → DENY
    const rNaj = runGuardBash("echo $(git checkout HEAD -- ':!.ai-skills/hooks/gates.json')");
    const okNaj = assert(name, rNaj.code === 2,
      `N.aj: echo $(git checkout HEAD -- ':!gates.json') (CRITICAL-B :! in subst) — expected exit 2, got ${rNaj.code}. stderr: ${rNaj.stderr.substring(0, 300)}`);

    // --- CRITICAL-C: process substitution <() and >() bypass closure ---
    // bash executes the body of <(cmd) and >(cmd) — a git mutation inside either fires.

    // N.ak: diff <(git checkout HEAD -- .ai-skills/hooks/gates.json) /dev/null → DENY
    const rNak = runGuardBash('diff <(git checkout HEAD -- .ai-skills/hooks/gates.json) /dev/null');
    const okNak = assert(name, rNak.code === 2,
      `N.ak: diff <(git checkout HEAD -- gates.json) /dev/null (CRITICAL-C <() body) — expected exit 2, got ${rNak.code}. stderr: ${rNak.stderr.substring(0, 300)}`);

    // N.al: echo x > >(git restore -- .ai-skills/hooks/gates.json) → DENY
    const rNal = runGuardBash('echo x > >(git restore -- .ai-skills/hooks/gates.json)');
    const okNal = assert(name, rNal.code === 2,
      `N.al: echo x > >(git restore -- gates.json) (CRITICAL-C >() body) — expected exit 2, got ${rNal.code}. stderr: ${rNal.stderr.substring(0, 300)}`);

    // N.am: $(cat <(git reset --hard)) — nested: outer $(), inner <() — DENY
    const rNam = runGuardBash('$(cat <(git reset --hard))');
    const okNam = assert(name, rNam.code === 2,
      `N.am: $(cat <(git reset --hard)) (CRITICAL-C nested <() in $()) — expected exit 2, got ${rNam.code}. stderr: ${rNam.stderr.substring(0, 300)}`);

    // N.an: cat <(git status) — process subst but git status is read-only → PERMIT
    const rNan = runGuardBash('cat <(git status)');
    const okNan = assert(name, rNan.code === 0,
      `N.an: cat <(git status) (CRITICAL-C negative — read-only git in <()) — expected exit 0, got ${rNan.code}. stderr: ${rNan.stderr.substring(0, 300)}`);

    // --- MAJOR-D: __smoke__ carveout in pathspecCoversProtectedDirectory ---
    // git checkout of a smoke file must PERMIT to match the Write tool's behavior.

    // N.ao: git checkout HEAD -- .ai-skills/hooks/__smoke__/test.mjs → PERMIT (smoke carveout)
    const rNao = runGuardBash('git checkout HEAD -- .ai-skills/hooks/__smoke__/test.mjs');
    const okNao = assert(name, rNao.code === 0,
      `N.ao: git checkout HEAD -- __smoke__/test.mjs (MAJOR-D smoke carveout) — expected exit 0 (symmetric with Write), got ${rNao.code}. stderr: ${rNao.stderr.substring(0, 300)}`);

    // N.ap: git checkout HEAD -- .ai-skills/hooks/gates.json → DENY (smoke carveout doesn't help non-smoke)
    const rNap = runGuardBash('git checkout HEAD -- .ai-skills/hooks/gates.json');
    const okNap = assert(name, rNap.code === 2,
      `N.ap: git checkout HEAD -- gates.json (MAJOR-D non-smoke still denies) — expected exit 2, got ${rNap.code}. stderr: ${rNap.stderr.substring(0, 300)}`);

    // --- MINOR-E: git checkout -b / -c create-branch permit ---
    // git checkout -b <branch> creates a branch without touching the working tree.

    // N.aq: git checkout -b feature/x → PERMIT (create-branch, no working-tree clobber)
    const rNaq = runGuardBash('git checkout -b feature/x');
    const okNaq = assert(name, rNaq.code === 0,
      `N.aq: git checkout -b feature/x (MINOR-E create-branch) — expected exit 0, got ${rNaq.code}. stderr: ${rNaq.stderr.substring(0, 300)}`);

    // N.ar: git checkout -c feature/y → PERMIT (create+switch, no working-tree clobber)
    const rNar = runGuardBash('git checkout -c feature/y');
    const okNar = assert(name, rNar.code === 0,
      `N.ar: git checkout -c feature/y (MINOR-E create-switch) — expected exit 0, got ${rNar.code}. stderr: ${rNar.stderr.substring(0, 300)}`);

    // N.as: git checkout main — bare branch switch (no -b/-c) still whole-tree → DENY
    // Single positional without -- → treated as branch switch (Tier 2)
    const rNas = runGuardBash('git checkout main');
    const okNas = assert(name, rNas.code === 2,
      `N.as: git checkout main (bare branch switch, not -b) — expected exit 2, got ${rNas.code}. stderr: ${rNas.stderr.substring(0, 300)}`);

    // --- Stacked pathspec magic: fixpoint-loop closure (PR #289 floor Critical) ---
    // Each test stacks two or more magic prefixes onto a pathspec. The fixpoint loop in
    // stripPathspecMagic must reduce every stack to the bare path before the protection
    // check fires. Non-protected paths with stacked magic must still PERMIT (no over-block).

    // N.at: :/!<protected> — stacked :/ (top) + ! (exclude) on a protected file → DENY
    const rNat = runGuardBash("git checkout HEAD -- ':/!.ai-skills/hooks/gates.json'");
    const okNat = assert(name, rNat.code === 2,
      `N.at: :/! stacked magic on protected path — expected exit 2 (fixpoint loop), got ${rNat.code}. stderr: ${rNat.stderr.substring(0, 300)}`);

    // N.au: :!:/<protected> — stacked :! (exclude) + :/ (top) on a protected file → DENY
    const rNau = runGuardBash("git checkout HEAD -- ':!:/.ai-skills/hooks/gates.json'");
    const okNau = assert(name, rNau.code === 2,
      `N.au: :!:/ stacked magic on protected path — expected exit 2 (fixpoint loop), got ${rNau.code}. stderr: ${rNau.stderr.substring(0, 300)}`);

    // N.av: :^:/<protected> — stacked :^ (caret-exclude) + :/ (top) on a protected file → DENY
    const rNav = runGuardBash("git checkout HEAD -- ':^:/.ai-skills/hooks/gates.json'");
    const okNav = assert(name, rNav.code === 2,
      `N.av: :^:/ stacked magic on protected path — expected exit 2 (fixpoint loop), got ${rNav.code}. stderr: ${rNav.stderr.substring(0, 300)}`);

    // N.aw: :(top):(exclude)<protected> — two long-form magic stacked on a protected file → DENY
    const rNaw = runGuardBash("git checkout HEAD -- ':(top):(exclude).ai-skills/hooks/gates.json'");
    const okNaw = assert(name, rNaw.code === 2,
      `N.aw: :(top):(exclude) long-form stack on protected path — expected exit 2 (fixpoint loop), got ${rNaw.code}. stderr: ${rNaw.stderr.substring(0, 300)}`);

    // N.ax: depth-3 stack :/!:(exclude)<protected> — three prefixes, fixpoint resolves all → DENY
    const rNax = runGuardBash("git checkout HEAD -- ':/!:(exclude).ai-skills/hooks/gates.json'");
    const okNax = assert(name, rNax.code === 2,
      `N.ax: depth-3 :/!:(exclude) stack on protected path — expected exit 2 (fixpoint loop), got ${rNax.code}. stderr: ${rNax.stderr.substring(0, 300)}`);

    // N.ay: :^:/ on a NON-PROTECTED path — stacked magic on a safe path must still PERMIT
    // (the fixpoint loop must not widen denial beyond protected paths)
    const rNay = runGuardBash("git checkout HEAD -- ':^:/src/app.ts'");
    const okNay = assert(name, rNay.code === 0,
      `N.ay: :^:/ stacked magic on non-protected path — expected exit 0 (no over-block), got ${rNay.code}. stderr: ${rNay.stderr.substring(0, 300)}`);

    // N.az: :/!<protected> in $() substitution — stacked magic inside subst body → DENY
    const rNaz = runGuardBash("echo $(git checkout HEAD -- ':/!.ai-skills/hooks/gates.json')");
    const okNaz = assert(name, rNaz.code === 2,
      `N.az: :/! stacked magic inside $() substitution — expected exit 2 (fixpoint + subst extraction), got ${rNaz.code}. stderr: ${rNaz.stderr.substring(0, 300)}`);

    const allN = [okNa, okNb, okNc, okNd, okNe, okNf, okNg, okNh, okNi, okNj, okNk, okNl, okNm, okNn, okNo, okNp, okNq,
                  okNr, okNs, okNt, okNu, okNv, okNw, okNx, okNy, okNz, okNaa, okNac,
                  okNad, okNae, okNaf, okNag, okNah, okNai, okNaj,
                  okNak, okNal, okNam, okNan,
                  okNao, okNap,
                  okNaq, okNar, okNas,
                  okNat, okNau, okNav, okNaw, okNax, okNay, okNaz];
    if (allN.every(Boolean)) {
      console.log(`${PASS} ${name}`);
    } else {
      console.error(`${FAIL} ${name}`);
    }
  } finally {
    cleanup(tmpDir);
  }
}

// ============================================================
// Scenario O: deliverable-touched precondition is cross-platform (plan prism-windows-gate-loop)
//
// Proves the new structured `kind: "deliverable-touched"` precondition evaluates the
// git-diff union in Node via discrete argv `spawnSync('git', […])` calls — no shell
// grammar — so it runs identically on Windows cmd.exe and CI. The former `command` form
// (`{ …; } | sort -u | grep`) was unparseable by cmd.exe and looped the Stop gate forever.
// Scenario M stubs this precondition with node -e; this scenario exercises the real
// git-diff logic against a throwaway repo, which M never did.
//
// Each sub-test builds a real throwaway git repo with argv-only git commands (the test
// itself is shell-free) and runs run-gates against it. The deliverable is staged before
// stop — mirroring a real persona whose written file is staged/committed in the run; the
// precondition diffs tracked changes, so an untracked file would not satisfy it (matching
// the original bash form's semantics).
//
//   O.a: staged file matches the pattern → exit 0 (precondition satisfied).
//   O.b: staged file does NOT match the pattern → exit 2, stderr names the
//        deliverable-touched-this-run precondition (precondition correctly fails).
//   O.c: pattern omitted from the check → exit 2 (malformed-check guard fires).
//   O.d: no origin/main remote, staged matching file → exit 0 (merge-base arm skipped,
//        staged arm still contributes — proves the non-zero-git tolerance).
// ============================================================
{
  const name = 'O: deliverable-touched cross-platform precondition';

  // Initialize tmpDir as a real git repo with a committed base, using argv-only git calls.
  // Returns { tmpDir, runKey }. The gates/report fixtures are written into the repo so the
  // hook's projectDir (= tmpDir) is the git working tree run-gates diffs against.
  function setupGitRepoFixture({ check, withOrigin = true }) {
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'prism-smoke-o-'));
    const runKey = 'smoke-session';

    const git = (args) => {
      const r = spawnSync('git', args, { cwd: tmpDir, encoding: 'utf8' });
      if (r.status !== 0) {
        throw new Error(`git ${args.join(' ')} failed (status ${r.status}): ${r.stderr ?? ''}`);
      }
      return r;
    };

    git(['init']);
    // Local identity so commits succeed in CI (no global git config there).
    git(['config', 'user.email', 'smoke@prism.test']);
    git(['config', 'user.name', 'PRISM Smoke']);

    // Commit a base file so HEAD exists and diffs have a reference point.
    writeFileSync(path.join(tmpDir, 'base.txt'), 'base\n', 'utf8');
    git(['add', 'base.txt']);
    git(['commit', '-m', 'base']);

    if (withOrigin) {
      // Point origin/main at the base commit so the merge-base arm resolves. A bare
      // sibling repo is the simplest real remote; argv-only, no shell.
      const remoteDir = path.join(tmpDir, 'remote.git');
      const rInit = spawnSync('git', ['init', '--bare', remoteDir], { cwd: tmpDir, encoding: 'utf8' });
      if (rInit.status !== 0) throw new Error(`git init --bare failed: ${rInit.stderr ?? ''}`);
      git(['remote', 'add', 'origin', remoteDir]);
      git(['push', '-q', 'origin', 'HEAD:main']);
      git(['fetch', '-q', 'origin']);
    }

    // Synthetic gates.json giving a Class-B persona the deliverable-touched precondition.
    const gates = {
      sasha: {
        writes_report_to: '.prism/evidence/${runKey}/report.json',
        preconditions: [
          {
            id: 'deliverable-touched-this-run',
            description: 'the deliverable path is new or modified this run',
            check,
            on_fail: 'needs-replan',
          },
        ],
        gates: [],
        allowed_routes: ['clove', 'human'],
        ownership: { may_write: ['.prism/plans/**'], may_not_run: [] },
      },
    };
    const gatesPath = path.join(tmpDir, '.claude', 'hooks', 'gates.json');
    mkdirSync(path.dirname(gatesPath), { recursive: true });
    writeFileSync(gatesPath, JSON.stringify(gates, null, 2), 'utf8');

    // Valid report.json so the precondition is the only thing under test.
    const report = {
      verdict: 'done',
      verdict_reason: 'diagnosis complete',
      next_route: 'clove',
      reasoning: 'root cause identified',
      persona: 'sasha',
      checklist: {},
    };
    const evidenceDir = path.join(tmpDir, '.prism', 'evidence', runKey);
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(path.join(evidenceDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
    // deliverable-sidecar precondition also runs for sasha-shaped configs only when present
    // in the fixture; this fixture omits it (single precondition under test), so no sidecar needed.

    return { tmpDir, runKey, git };
  }

  function runO(tmpDir) {
    return runHook(
      path.join(HOOKS_DIR, 'run-gates.mjs'),
      { session_id: 'smoke-session', agent_type: 'prism-debugger', stop_reason: 'end_turn' },
      { CLAUDE_PROJECT_DIR: tmpDir },
    );
  }

  // O.a: staged file matches pattern → exit 0.
  let okA = false;
  {
    const { tmpDir, git } = setupGitRepoFixture({
      check: { kind: 'deliverable-touched', pattern: '^\\.prism/plans/.*\\.md$' },
    });
    try {
      mkdirSync(path.join(tmpDir, '.prism', 'plans'), { recursive: true });
      writeFileSync(path.join(tmpDir, '.prism', 'plans', 'foo.md'), '# plan\n', 'utf8');
      git(['add', '.prism/plans/foo.md']);
      const r = runO(tmpDir);
      okA = assert(name, r.code === 0, `O.a: expected exit 0 (staged deliverable matches pattern), got ${r.code}. stderr: ${r.stderr.substring(0, 300)}`);
    } finally {
      cleanup(tmpDir);
    }
  }

  // O.b: staged file does NOT match pattern → exit 2, names the precondition.
  let okB = false;
  {
    const { tmpDir, git } = setupGitRepoFixture({
      check: { kind: 'deliverable-touched', pattern: '^docs/.*\\.md$' },
    });
    try {
      mkdirSync(path.join(tmpDir, '.prism', 'plans'), { recursive: true });
      writeFileSync(path.join(tmpDir, '.prism', 'plans', 'foo.md'), '# plan\n', 'utf8');
      git(['add', '.prism/plans/foo.md']);
      const r = runO(tmpDir);
      okB = assert(name, r.code === 2, `O.b: expected exit 2 (no changed file matches pattern), got ${r.code}. stderr: ${r.stderr.substring(0, 300)}`) &&
            assert(name, r.stderr.includes('deliverable-touched-this-run'), `O.b: expected the precondition id 'deliverable-touched-this-run' in stderr. Got: ${r.stderr.substring(0, 300)}`);
    } finally {
      cleanup(tmpDir);
    }
  }

  // O.c: pattern omitted → exit 2 (malformed-check guard fires). Stage a matching file so the
  // ONLY reason for failure is the missing pattern, not an empty diff set.
  let okC = false;
  {
    const { tmpDir, git } = setupGitRepoFixture({
      check: { kind: 'deliverable-touched' },
    });
    try {
      mkdirSync(path.join(tmpDir, '.prism', 'plans'), { recursive: true });
      writeFileSync(path.join(tmpDir, '.prism', 'plans', 'foo.md'), '# plan\n', 'utf8');
      git(['add', '.prism/plans/foo.md']);
      const r = runO(tmpDir);
      okC = assert(name, r.code === 2, `O.c: expected exit 2 (missing-pattern guard fires), got ${r.code}. stderr: ${r.stderr.substring(0, 300)}`);
    } finally {
      cleanup(tmpDir);
    }
  }

  // O.d: no origin/main, staged matching file → exit 0 (merge-base arm skipped, staged arm contributes).
  let okD = false;
  {
    const { tmpDir, git } = setupGitRepoFixture({
      check: { kind: 'deliverable-touched', pattern: '^\\.prism/plans/.*\\.md$' },
      withOrigin: false,
    });
    try {
      mkdirSync(path.join(tmpDir, '.prism', 'plans'), { recursive: true });
      writeFileSync(path.join(tmpDir, '.prism', 'plans', 'bar.md'), '# plan\n', 'utf8');
      git(['add', '.prism/plans/bar.md']);
      const r = runO(tmpDir);
      okD = assert(name, r.code === 0, `O.d: expected exit 0 (no origin/main; staged deliverable still matches), got ${r.code}. stderr: ${r.stderr.substring(0, 300)}`);
    } finally {
      cleanup(tmpDir);
    }
  }

  if (okA && okB && okC && okD) console.log(`${PASS} ${name}`);
}

// ============================================================
// Scenario P: active-persona Bash arm (Defect 1 / Test Matrix row 1)
//
// The Edit-arm denial (lines 354–369 of ownership-guard.mjs) already had smoke
// coverage in Scenario H. This scenario covers the Bash echo arm — the real write
// mechanism used by every persona's startup line. Three sub-tests:
//
//   P.a: orchestrated echo > .prism/active-persona → DENY (agent_type present)
//   P.b: solo echo > .prism/active-persona → PERMIT (no agent_type)
//   P.c: solo fused "git status && echo done > .prism/active-persona" → PERMIT
//
// MAINTENANCE OFF is required for the deny assertions: the ambient session may
// have CLAUDE_PRISM_MAINTENANCE=1 set, which would permit the protected write
// and invert the expected exit code. Passing CLAUDE_PRISM_MAINTENANCE:'' in env
// overrides the ambient value (runHook spreads { ...process.env, ...env }).
// ============================================================
{
  const name = 'P: active-persona Bash arm (Defect 1)';

  const gates = {
    clove: {
      writes_report_to: '.prism/evidence/${runKey}/report.json',
      preconditions: [],
      gates: [],
      allowed_routes: ['briar'],
      ownership: { may_write: ['src/**'], may_not_run: [] },
    },
  };

  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'prism-smoke-p-'));
  try {
    const gatesPath = path.join(tmpDir, '.claude', 'hooks', 'gates.json');
    mkdirSync(path.dirname(gatesPath), { recursive: true });
    writeFileSync(gatesPath, JSON.stringify(gates, null, 2), 'utf8');

    const guardScript = path.join(HOOKS_DIR, 'ownership-guard.mjs');
    // CRITICAL: deny-scenarios must have maintenance OFF so the protected-write
    // unlock does not invert the expected exit code.
    const maintOff = { CLAUDE_PROJECT_DIR: tmpDir, CLAUDE_PRISM_MAINTENANCE: '' };
    const maintOffSolo = { CLAUDE_PROJECT_DIR: tmpDir, CLAUDE_PRISM_MAINTENANCE: '' };

    function runGuardBash(command, extra = {}) {
      return runHook(guardScript, {
        session_id: 'smoke-session',
        hook_event_name: 'PreToolUse',
        tool_name: 'Bash',
        tool_input: { command },
        cwd: tmpDir,
        ...extra,
      }, { CLAUDE_PROJECT_DIR: tmpDir, CLAUDE_PRISM_MAINTENANCE: '', ...extra._env });
    }

    // P.a: orchestrated (agent_type present) → DENY
    const rA = runHook(guardScript, {
      session_id: 'smoke-session',
      agent_type: 'prism-code-dev',
      hook_event_name: 'PreToolUse',
      tool_name: 'Bash',
      tool_input: { command: 'echo "clove" > .prism/active-persona' },
      cwd: tmpDir,
    }, maintOff);
    const okA = assert(name, rA.code === 2,
      `P.a: expected exit 2 (orchestrated Bash echo to active-persona → deny), got ${rA.code}. stderr: ${rA.stderr.substring(0, 200)}`);

    // P.b: solo (no agent_type) → PERMIT
    // Seed .prism/active-persona so the solo resolver resolves Clove.
    const activePersonaDir = path.join(tmpDir, '.prism');
    mkdirSync(activePersonaDir, { recursive: true });
    writeFileSync(path.join(activePersonaDir, 'active-persona'), 'clove', 'utf8');

    const rB = runHook(guardScript, {
      session_id: 'smoke-session',
      // no agent_type — solo path
      hook_event_name: 'PreToolUse',
      tool_name: 'Bash',
      tool_input: { command: 'echo "clove" > .prism/active-persona' },
      cwd: tmpDir,
    }, maintOffSolo);
    const okB = assert(name, rB.code === 0,
      `P.b: expected exit 0 (solo Bash echo to active-persona → permit), got ${rB.code}. stderr: ${rB.stderr.substring(0, 200)}`);

    // P.c: solo fused command → PERMIT (the active-persona write is the non-dangerous segment)
    const rC = runHook(guardScript, {
      session_id: 'smoke-session',
      // no agent_type — solo path
      hook_event_name: 'PreToolUse',
      tool_name: 'Bash',
      tool_input: { command: 'git status && echo done > .prism/active-persona' },
      cwd: tmpDir,
    }, maintOffSolo);
    const okC = assert(name, rC.code === 0,
      `P.c: expected exit 0 (solo fused 'git status && echo done > .prism/active-persona' → permit), got ${rC.code}. stderr: ${rC.stderr.substring(0, 200)}`);

    if (okA && okB && okC) console.log(`${PASS} ${name}`);
  } finally {
    cleanup(tmpDir);
  }
}

// ============================================================
// Scenario Q: #367 Windows MSYS-cwd protected-write denial (Test Matrix row 2)
//
// On Windows + Git Bash, payload.cwd arrives in MSYS form (/d/Documents/...)
// while CLAUDE_PROJECT_DIR is Windows form (D:\Documents\...). Before the fix,
// path.relative produced ../../../d/... which matched nothing, so every Bash
// protected-write check was inert on Windows.
//
// Two sub-tests:
//   Q.a: MSYS cwd + echo evil > .claude/hooks/gates.json → DENY
//   Q.b: MSYS cwd + printf '' >> .claude/hooks/run-gates.mjs → DENY
//
// MAINTENANCE OFF required (see Scenario P note).
// The guard is run against REPO_ROOT so the real protected paths resolve.
// ============================================================
{
  const name = 'Q: #367 Windows MSYS-cwd protected-write denial';

  const guardScript = path.join(HOOKS_DIR, 'ownership-guard.mjs');
  // Synthesize a MSYS-form cwd for the repo root.
  // REPO_ROOT on Windows: D:\Documents\Coding Stuff\agent-crew
  // MSYS form:            /d/Documents/Coding Stuff/agent-crew
  // Convert: strip drive letter and colon, prepend /driveLetter/ (lowercase)
  function toMsysCwd(winPath) {
    // Match D:\... or D:/... (case insensitive)
    const m = winPath.match(/^([a-zA-Z]):[/\\](.*)/);
    if (!m) return winPath; // already POSIX or unrecognized, no-op
    return '/' + m[1].toLowerCase() + '/' + m[2].replace(/\\/g, '/');
  }

  const msysCwd = toMsysCwd(REPO_ROOT);
  // Only run if we actually produced a MSYS path (Windows environment).
  // On Linux/Mac, REPO_ROOT has no drive letter so toMsysCwd is a no-op;
  // the test would be testing normal path handling (not the Windows fix).
  // Still run it — the guard's toCanonicalCwd is a no-op on POSIX paths,
  // so a POSIX path with POSIX CLAUDE_PROJECT_DIR still resolves correctly.

  // MAINTENANCE OFF: deny-scenarios must not be unlocked by ambient maintenance mode.
  const maintOff = { CLAUDE_PROJECT_DIR: REPO_ROOT, CLAUDE_PRISM_MAINTENANCE: '' };

  // Q.a: MSYS cwd + redirect to gates.json → DENY
  const rA = runHook(guardScript, {
    session_id: 'smoke-q',
    agent_type: 'prism-code-dev',
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: { command: 'echo evil > .claude/hooks/gates.json' },
    cwd: msysCwd, // MSYS form
  }, maintOff);
  const okA = assert(name, rA.code === 2,
    `Q.a: MSYS cwd (${msysCwd}) + echo evil > gates.json — expected exit 2 (protected write denied on Windows), got ${rA.code}. stderr: ${rA.stderr.substring(0, 200)}`);

  // Q.b: MSYS cwd + append redirect to run-gates.mjs → DENY
  const rB = runHook(guardScript, {
    session_id: 'smoke-q',
    agent_type: 'prism-code-dev',
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: { command: "printf '' >> .claude/hooks/run-gates.mjs" },
    cwd: msysCwd,
  }, maintOff);
  const okB = assert(name, rB.code === 2,
    `Q.b: MSYS cwd + printf append to run-gates.mjs — expected exit 2 (protected write denied on Windows), got ${rB.code}. stderr: ${rB.stderr.substring(0, 200)}`);

  if (okA && okB) console.log(`${PASS} ${name}`);
}

// ============================================================
// Scenario R: out-of-projectDir permits (Test Matrix row 3)
//
// Writes that land OUTSIDE the project dir must be permitted: /tmp paths,
// /dev/null, and Windows cross-drive scratchpad (C:\... when repo is on D:\).
//
// Sub-tests:
//   R.a: echo x > /tmp/pr-body.md → PERMIT
//   R.b: echo x > /dev/null → PERMIT
//   R.c: Windows cross-drive — echo x > C:\Users\...\Temp\scratch.txt → PERMIT
//        (only meaningful on Windows where REPO_ROOT is on a different drive;
//         on Linux, the path is treated as relative and may not be out-of-dir —
//         the sub-test is skipped on POSIX when REPO_ROOT has no drive letter)
// ============================================================
{
  const name = 'R: out-of-projectDir permits';

  const gates = {
    clove: {
      writes_report_to: '.prism/evidence/${runKey}/report.json',
      preconditions: [],
      gates: [],
      allowed_routes: ['briar'],
      ownership: { may_write: ['src/**'], may_not_run: [] },
    },
  };

  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'prism-smoke-r-'));
  try {
    const gatesPath = path.join(tmpDir, '.claude', 'hooks', 'gates.json');
    mkdirSync(path.dirname(gatesPath), { recursive: true });
    writeFileSync(gatesPath, JSON.stringify(gates, null, 2), 'utf8');

    const guardScript = path.join(HOOKS_DIR, 'ownership-guard.mjs');
    const env = { CLAUDE_PROJECT_DIR: tmpDir, CLAUDE_PRISM_MAINTENANCE: '' };

    function runGuardBash(command) {
      return runHook(guardScript, {
        session_id: 'smoke-r',
        agent_type: 'prism-code-dev',
        hook_event_name: 'PreToolUse',
        tool_name: 'Bash',
        tool_input: { command },
        cwd: tmpDir,
      }, env);
    }

    // R.a: /tmp path — out of projectDir → PERMIT
    const rA = runGuardBash('echo x > /tmp/pr-body.md');
    const okA = assert(name, rA.code === 0,
      `R.a: echo x > /tmp/pr-body.md — expected exit 0 (out-of-projectDir permit), got ${rA.code}. stderr: ${rA.stderr.substring(0, 200)}`);

    // R.b: /dev/null → PERMIT
    const rB = runGuardBash('echo x > /dev/null');
    const okB = assert(name, rB.code === 0,
      `R.b: echo x > /dev/null — expected exit 0 (out-of-projectDir permit), got ${rB.code}. stderr: ${rB.stderr.substring(0, 200)}`);

    // R.c: Windows cross-drive scratchpad — only meaningful when REPO_ROOT has a drive letter
    // (i.e. on Windows). On Linux/Mac this would be treated as a relative path starting with C:
    // which is ambiguous. We check by testing if REPO_ROOT has a drive letter.
    let okC = true;
    const hasDriveLetter = /^[a-zA-Z]:/.test(REPO_ROOT);
    if (hasDriveLetter) {
      // Pick the OTHER drive — if repo is on D:, use C:; otherwise use D:.
      const repoDrive = REPO_ROOT[0].toUpperCase();
      const otherDrive = repoDrive === 'D' ? 'C' : 'D';
      const scratchPath = `${otherDrive}:\\Users\\scratchpad\\Temp\\smoke-${Date.now()}.txt`;
      const rC = runGuardBash(`echo x > ${scratchPath}`);
      okC = assert(name, rC.code === 0,
        `R.c: echo x > ${scratchPath} (cross-drive Windows scratchpad) — expected exit 0 (out-of-projectDir permit), got ${rC.code}. stderr: ${rC.stderr.substring(0, 200)}`);
    } else {
      console.log(`  R.c: skipped — REPO_ROOT has no drive letter (${REPO_ROOT}), cross-drive test only meaningful on Windows.`);
    }

    if (okA && okB && okC) console.log(`${PASS} ${name}`);
  } finally {
    cleanup(tmpDir);
  }
}

// ============================================================
// Scenario S: _shared.may_write riders (Test Matrix rows 4–5)
//
// Two confirmed universal riders live in _shared.may_write:
//   .prism/lessons.md — any persona may append lessons
//   .prism/evidence/**/deliverable.json — any persona may write their sidecar
//
// Sub-tests:
//   S.a: clove (src/** lane) echo >> .prism/lessons.md → PERMIT (_shared grants it)
//   S.b: cat notes >> .prism/lessons.md → PERMIT
//   S.c: clove echo '{}' > .prism/evidence/abc/deliverable.json → PERMIT (_shared)
//   S.d: sasha echo '{}' > .prism/evidence/abc/deliverable.json → PERMIT (_shared)
//   S.e: clove echo x > .prism/evidence/abc/strikes.json → DENY (gate-state protected — _shared does not grant)
//   S.f: a non-plans persona (eric) echo > .prism/plans/foo.md → DENY (_shared only grants lessons+deliverable)
//
// MAINTENANCE OFF: deny-scenarios must not be unlocked.
// ============================================================
{
  const name = 'S: _shared.may_write riders (lessons.md + deliverable.json)';

  const gates = {
    _shared: {
      may_write: ['.prism/lessons.md', '.prism/evidence/**/deliverable.json'],
    },
    clove: {
      writes_report_to: '.prism/evidence/${runKey}/report.json',
      preconditions: [],
      gates: [],
      allowed_routes: ['briar'],
      ownership: { may_write: ['src/**', '.prism/evidence/**/report.json'], may_not_run: [] },
    },
    eric: {
      writes_report_to: '.prism/evidence/${runKey}/report.json',
      preconditions: [],
      gates: [],
      allowed_routes: ['human'],
      ownership: { may_write: ['.prism/plans/**', '.prism/evidence/**/report.json'], may_not_run: [] },
    },
    sasha: {
      writes_report_to: '.prism/evidence/${runKey}/report.json',
      preconditions: [],
      gates: [],
      allowed_routes: ['clove', 'human'],
      ownership: { may_write: ['.prism/plans/**', '.prism/evidence/**/report.json'], may_not_run: [] },
    },
  };

  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'prism-smoke-s-'));
  try {
    const gatesPath = path.join(tmpDir, '.claude', 'hooks', 'gates.json');
    mkdirSync(path.dirname(gatesPath), { recursive: true });
    writeFileSync(gatesPath, JSON.stringify(gates, null, 2), 'utf8');

    const guardScript = path.join(HOOKS_DIR, 'ownership-guard.mjs');

    function runGuardBash(command, agentType) {
      return runHook(guardScript, {
        session_id: 'smoke-session',
        agent_type: agentType,
        hook_event_name: 'PreToolUse',
        tool_name: 'Bash',
        tool_input: { command },
        cwd: tmpDir,
      }, { CLAUDE_PROJECT_DIR: tmpDir, CLAUDE_PRISM_MAINTENANCE: '' });
    }

    // S.a: lessons.md append via echo >> — any persona (clove here) → PERMIT
    const rA = runGuardBash('echo "lesson: X" >> .prism/lessons.md', 'prism-code-dev');
    const okA = assert(name, rA.code === 0,
      `S.a: echo >> .prism/lessons.md (clove) — expected exit 0 (_shared grants), got ${rA.code}. stderr: ${rA.stderr.substring(0, 200)}`);

    // S.b: cat >> .prism/lessons.md → PERMIT
    const rB = runGuardBash('cat notes >> .prism/lessons.md', 'prism-code-dev');
    const okB = assert(name, rB.code === 0,
      `S.b: cat notes >> .prism/lessons.md — expected exit 0 (_shared grants), got ${rB.code}. stderr: ${rB.stderr.substring(0, 200)}`);

    // S.c: clove echo > deliverable.json → PERMIT (_shared)
    const rC = runGuardBash("echo '{}' > .prism/evidence/abc/deliverable.json", 'prism-code-dev');
    const okC = assert(name, rC.code === 0,
      `S.c: clove echo > deliverable.json — expected exit 0 (_shared grants), got ${rC.code}. stderr: ${rC.stderr.substring(0, 200)}`);

    // S.d: sasha echo > deliverable.json → PERMIT (_shared)
    const rD = runGuardBash("echo '{}' > .prism/evidence/abc/deliverable.json", 'prism-debugger');
    const okD = assert(name, rD.code === 0,
      `S.d: sasha echo > deliverable.json — expected exit 0 (_shared grants), got ${rD.code}. stderr: ${rD.stderr.substring(0, 200)}`);

    // S.e: echo > strikes.json — gate-state protected, _shared does NOT grant → DENY
    const rE = runGuardBash("echo '{}' > .prism/evidence/abc/strikes.json", 'prism-code-dev');
    const okE = assert(name, rE.code === 2,
      `S.e: echo > strikes.json — expected exit 2 (gate-state protected, _shared does not grant), got ${rE.code}. stderr: ${rE.stderr.substring(0, 200)}`);

    // S.f: eric echo > .prism/plans/foo.md — _shared only covers lessons.md and deliverable.json,
    // NOT plans. Eric's may_write includes plans so this should PERMIT.
    // Actually eric HAS .prism/plans/** in its lane above — let's test a path NOT in the lane.
    // Use a persona that lacks plans: clove has no .prism/plans/** in its lane here.
    const rF = runGuardBash('echo x > .prism/plans/foo.md', 'prism-code-dev'); // clove: no plans lane
    const okF = assert(name, rF.code === 2,
      `S.f: clove echo > .prism/plans/foo.md — expected exit 2 (_shared only covers lessons+deliverable, plans not granted), got ${rF.code}. stderr: ${rF.stderr.substring(0, 200)}`);

    if (okA && okB && okC && okD && okE && okF) console.log(`${PASS} ${name}`);
  } finally {
    cleanup(tmpDir);
  }
}

// ============================================================
// Scenario T: Bash lane enforcement (Test Matrix row 6)
//
// Personas trying to Bash-write outside their lane are denied; those writing
// inside are permitted. Tests tee, cp, and redirect across several personas.
//
// Sub-tests:
//   T.a: eric echo > src/index.ts → DENY (eric has no src/ lane)
//   T.b: sage echo > .prism/plans/foo.md → DENY (sage has no plans lane)
//   T.c: lilac tee .prism/plans/foo.md → DENY (lilac has no plans lane)
//   T.d: briar cp /tmp/fix.ts src/index.ts → DENY (briar has no src/ lane)
//   T.e: clove echo > src/index.ts → PERMIT (clove has src/**)
//   T.f: clove tee src/new.ts < /tmp/c.txt → PERMIT (clove has src/**)
//
// MAINTENANCE OFF on deny-scenarios.
// ============================================================
{
  const name = 'T: Bash lane enforcement';

  const gates = {
    _shared: {
      may_write: ['.prism/lessons.md', '.prism/evidence/**/deliverable.json'],
    },
    clove: {
      writes_report_to: '.prism/evidence/${runKey}/report.json',
      preconditions: [],
      gates: [],
      allowed_routes: ['briar'],
      ownership: { may_write: ['src/**', '.prism/evidence/**/report.json'], may_not_run: [] },
    },
    eric: {
      writes_report_to: '.prism/evidence/${runKey}/report.json',
      preconditions: [],
      gates: [],
      allowed_routes: ['human'],
      ownership: { may_write: ['.prism/plans/**', '.prism/evidence/**/report.json'], may_not_run: [] },
    },
    sage: {
      writes_report_to: '.prism/evidence/${runKey}/report.json',
      preconditions: [],
      gates: [],
      allowed_routes: ['human'],
      ownership: { may_write: ['CHANGELOG.md', '.prism/evidence/**/report.json'], may_not_run: [] },
    },
    lilac: {
      writes_report_to: '.prism/evidence/${runKey}/report.json',
      preconditions: [],
      gates: [],
      allowed_routes: ['human'],
      ownership: { may_write: ['.prism/evidence/**/report.json'], may_not_run: [] },
    },
    briar: {
      writes_report_to: '.prism/evidence/${runKey}/report.json',
      preconditions: [],
      gates: [],
      allowed_routes: ['human'],
      ownership: { may_write: ['.prism/plans/**', '.prism/evidence/**/report.json'], may_not_run: [] },
    },
  };

  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'prism-smoke-t-'));
  try {
    const gatesPath = path.join(tmpDir, '.claude', 'hooks', 'gates.json');
    mkdirSync(path.dirname(gatesPath), { recursive: true });
    writeFileSync(gatesPath, JSON.stringify(gates, null, 2), 'utf8');

    const guardScript = path.join(HOOKS_DIR, 'ownership-guard.mjs');

    function runGuardBash(command, agentType, maintainOff = true) {
      return runHook(guardScript, {
        session_id: 'smoke-session',
        agent_type: agentType,
        hook_event_name: 'PreToolUse',
        tool_name: 'Bash',
        tool_input: { command },
        cwd: tmpDir,
      }, {
        CLAUDE_PROJECT_DIR: tmpDir,
        ...(maintainOff ? { CLAUDE_PRISM_MAINTENANCE: '' } : {}),
      });
    }

    // T.a: eric → src/ (denied — eric has no src/ lane)
    const rA = runGuardBash('echo x > src/index.ts', 'prism-code-review-pr');
    const okA = assert(name, rA.code === 2,
      `T.a: eric echo > src/index.ts — expected exit 2 (eric has no src/ lane), got ${rA.code}. stderr: ${rA.stderr.substring(0, 200)}`);

    // T.b: sage → .prism/plans/ (denied)
    const rB = runGuardBash('echo x > .prism/plans/foo.md', 'prism-changelog');
    const okB = assert(name, rB.code === 2,
      `T.b: sage echo > .prism/plans/foo.md — expected exit 2 (sage has no plans lane), got ${rB.code}. stderr: ${rB.stderr.substring(0, 200)}`);

    // T.c: lilac tee .prism/plans/foo.md → DENY
    const rC = runGuardBash('tee .prism/plans/foo.md', 'prism-standup-summary');
    const okC = assert(name, rC.code === 2,
      `T.c: lilac tee .prism/plans/foo.md — expected exit 2 (lilac has no plans lane), got ${rC.code}. stderr: ${rC.stderr.substring(0, 200)}`);

    // T.d: briar cp /tmp/fix.ts src/index.ts → DENY (briar has no src/ lane)
    const rD = runGuardBash('cp /tmp/fix.ts src/index.ts', 'prism-code-review-self');
    const okD = assert(name, rD.code === 2,
      `T.d: briar cp /tmp/fix.ts src/index.ts — expected exit 2 (briar has no src/ lane), got ${rD.code}. stderr: ${rD.stderr.substring(0, 200)}`);

    // T.e: clove echo > src/index.ts → PERMIT
    const rE = runGuardBash('echo x > src/index.ts', 'prism-code-dev', false);
    const okE = assert(name, rE.code === 0,
      `T.e: clove echo > src/index.ts — expected exit 0 (clove has src/** lane), got ${rE.code}. stderr: ${rE.stderr.substring(0, 200)}`);

    // T.f: clove tee src/new.ts < /tmp/c.txt → PERMIT (tee target is src/)
    const rF = runGuardBash('tee src/new.ts < /tmp/c.txt', 'prism-code-dev', false);
    const okF = assert(name, rF.code === 0,
      `T.f: clove tee src/new.ts < /tmp/c.txt — expected exit 0 (clove has src/** lane), got ${rF.code}. stderr: ${rF.stderr.substring(0, 200)}`);

    if (okA && okB && okC && okD && okE && okF) console.log(`${PASS} ${name}`);
  } finally {
    cleanup(tmpDir);
  }
}

// ============================================================
// Scenario U: fused/multi-segment lane enforcement (Test Matrix row 7)
//
// Multi-segment commands where ANY in-repo write to an out-of-lane path denies
// the whole command, but a redirect to a safe (out-of-projectDir) path permits.
//
// Sub-tests:
//   U.a: eric "git status && echo bad > src/index.ts" → DENY
//   U.b: eric "gh pr diff 123 > /tmp/diff.txt" → PERMIT (target is /tmp, out-of-dir)
//   U.c: eric "echo bad > src/index.ts || true" → DENY
//
// MAINTENANCE OFF on deny-scenarios.
// ============================================================
{
  const name = 'U: fused/multi-segment lane enforcement';

  const gates = {
    _shared: {
      may_write: ['.prism/lessons.md', '.prism/evidence/**/deliverable.json'],
    },
    eric: {
      writes_report_to: '.prism/evidence/${runKey}/report.json',
      preconditions: [],
      gates: [],
      allowed_routes: ['human'],
      ownership: { may_write: ['.prism/plans/**', '.prism/evidence/**/report.json'], may_not_run: [] },
    },
  };

  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'prism-smoke-u-'));
  try {
    const gatesPath = path.join(tmpDir, '.claude', 'hooks', 'gates.json');
    mkdirSync(path.dirname(gatesPath), { recursive: true });
    writeFileSync(gatesPath, JSON.stringify(gates, null, 2), 'utf8');

    const guardScript = path.join(HOOKS_DIR, 'ownership-guard.mjs');

    function runGuardBash(command, maintOff = true) {
      return runHook(guardScript, {
        session_id: 'smoke-session',
        agent_type: 'prism-code-review-pr',
        hook_event_name: 'PreToolUse',
        tool_name: 'Bash',
        tool_input: { command },
        cwd: tmpDir,
      }, {
        CLAUDE_PROJECT_DIR: tmpDir,
        ...(maintOff ? { CLAUDE_PRISM_MAINTENANCE: '' } : {}),
      });
    }

    // U.a: && chaining — second segment is an out-of-lane write → DENY
    const rA = runGuardBash('git status && echo "bad" > src/index.ts');
    const okA = assert(name, rA.code === 2,
      `U.a: git status && echo bad > src/index.ts (eric) — expected exit 2 (out-of-lane write in second segment), got ${rA.code}. stderr: ${rA.stderr.substring(0, 200)}`);

    // U.b: redirect to /tmp — out-of-projectDir → PERMIT
    const rB = runGuardBash('gh pr diff 123 > /tmp/diff.txt', false);
    const okB = assert(name, rB.code === 0,
      `U.b: gh pr diff 123 > /tmp/diff.txt (eric) — expected exit 0 (target is /tmp, out-of-dir), got ${rB.code}. stderr: ${rB.stderr.substring(0, 200)}`);

    // U.c: || chaining — first segment is the out-of-lane write → DENY
    const rC = runGuardBash('echo bad > src/index.ts || true');
    const okC = assert(name, rC.code === 2,
      `U.c: echo bad > src/index.ts || true (eric) — expected exit 2 (out-of-lane write), got ${rC.code}. stderr: ${rC.stderr.substring(0, 200)}`);

    if (okA && okB && okC) console.log(`${PASS} ${name}`);
  } finally {
    cleanup(tmpDir);
  }
}

// ============================================================
// Scenario V: substitution body lane enforcement (Test Matrix row 8)
//
// Process substitution bodies ($(…), <(…), >(…)) embed writes that a
// flat segment scan would miss. collectBashWriteTargets extracts and scans
// them via extractSubstitutionBodies (closing the tee >(cat > …) bypass vector).
//
// Sub-tests:
//   V.a: eric "cat <(echo bad > src/index.ts)" → DENY (write hidden in <() body)
//   V.b: eric "echo x | tee >(cat > src/index.ts)" → DENY (write hidden in >() body)
//
// MAINTENANCE OFF on deny-scenarios.
// ============================================================
{
  const name = 'V: substitution body lane enforcement';

  const gates = {
    _shared: {
      may_write: ['.prism/lessons.md', '.prism/evidence/**/deliverable.json'],
    },
    eric: {
      writes_report_to: '.prism/evidence/${runKey}/report.json',
      preconditions: [],
      gates: [],
      allowed_routes: ['human'],
      ownership: { may_write: ['.prism/plans/**', '.prism/evidence/**/report.json'], may_not_run: [] },
    },
  };

  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'prism-smoke-v-'));
  try {
    const gatesPath = path.join(tmpDir, '.claude', 'hooks', 'gates.json');
    mkdirSync(path.dirname(gatesPath), { recursive: true });
    writeFileSync(gatesPath, JSON.stringify(gates, null, 2), 'utf8');

    const guardScript = path.join(HOOKS_DIR, 'ownership-guard.mjs');

    function runGuardBash(command) {
      return runHook(guardScript, {
        session_id: 'smoke-session',
        agent_type: 'prism-code-review-pr',
        hook_event_name: 'PreToolUse',
        tool_name: 'Bash',
        tool_input: { command },
        cwd: tmpDir,
      }, { CLAUDE_PROJECT_DIR: tmpDir, CLAUDE_PRISM_MAINTENANCE: '' });
    }

    // V.a: write hidden inside <() body → DENY
    const rA = runGuardBash('cat <(echo bad > src/index.ts)');
    const okA = assert(name, rA.code === 2,
      `V.a: cat <(echo bad > src/index.ts) — expected exit 2 (out-of-lane write in <() body), got ${rA.code}. stderr: ${rA.stderr.substring(0, 200)}`);

    // V.b: write hidden inside >() body (tee) → DENY
    const rB = runGuardBash('echo x | tee >(cat > src/index.ts)');
    const okB = assert(name, rB.code === 2,
      `V.b: echo x | tee >(cat > src/index.ts) — expected exit 2 (out-of-lane write in >() body), got ${rB.code}. stderr: ${rB.stderr.substring(0, 200)}`);

    if (okA && okB) console.log(`${PASS} ${name}`);
  } finally {
    cleanup(tmpDir);
  }
}

// ============================================================
// Scenario W: install and truncate operators (Test Matrix row 9 / Task 10)
//
// Task 10 added 'install' and 'truncate' to collectWriteTargets. These write
// operators formerly bypassed the Bash lane check.
//
// Sub-tests:
//   W.a: clove "install /tmp/x src/new.ts" → PERMIT (src/** in clove lane)
//   W.b: eric "truncate -s 0 src/index.ts" → DENY (eric has no src/ lane)
//
// MAINTENANCE OFF on deny-scenario.
// ============================================================
{
  const name = 'W: install/truncate operators (Task 10)';

  const gates = {
    _shared: {
      may_write: ['.prism/lessons.md', '.prism/evidence/**/deliverable.json'],
    },
    clove: {
      writes_report_to: '.prism/evidence/${runKey}/report.json',
      preconditions: [],
      gates: [],
      allowed_routes: ['briar'],
      ownership: { may_write: ['src/**', '.prism/evidence/**/report.json'], may_not_run: [] },
    },
    eric: {
      writes_report_to: '.prism/evidence/${runKey}/report.json',
      preconditions: [],
      gates: [],
      allowed_routes: ['human'],
      ownership: { may_write: ['.prism/plans/**', '.prism/evidence/**/report.json'], may_not_run: [] },
    },
  };

  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'prism-smoke-w-'));
  try {
    const gatesPath = path.join(tmpDir, '.claude', 'hooks', 'gates.json');
    mkdirSync(path.dirname(gatesPath), { recursive: true });
    writeFileSync(gatesPath, JSON.stringify(gates, null, 2), 'utf8');

    const guardScript = path.join(HOOKS_DIR, 'ownership-guard.mjs');

    // W.a: clove install /tmp/x src/new.ts → PERMIT
    const rA = runHook(guardScript, {
      session_id: 'smoke-session',
      agent_type: 'prism-code-dev',
      hook_event_name: 'PreToolUse',
      tool_name: 'Bash',
      tool_input: { command: 'install /tmp/x src/new.ts' },
      cwd: tmpDir,
    }, { CLAUDE_PROJECT_DIR: tmpDir });
    const okA = assert(name, rA.code === 0,
      `W.a: clove install /tmp/x src/new.ts — expected exit 0 (src/** in clove lane), got ${rA.code}. stderr: ${rA.stderr.substring(0, 200)}`);

    // W.b: eric truncate -s 0 src/index.ts → DENY
    const rB = runHook(guardScript, {
      session_id: 'smoke-session',
      agent_type: 'prism-code-review-pr',
      hook_event_name: 'PreToolUse',
      tool_name: 'Bash',
      tool_input: { command: 'truncate -s 0 src/index.ts' },
      cwd: tmpDir,
    }, { CLAUDE_PROJECT_DIR: tmpDir, CLAUDE_PRISM_MAINTENANCE: '' });
    const okB = assert(name, rB.code === 2,
      `W.b: eric truncate -s 0 src/index.ts — expected exit 2 (eric has no src/ lane), got ${rB.code}. stderr: ${rB.stderr.substring(0, 200)}`);

    if (okA && okB) console.log(`${PASS} ${name}`);
  } finally {
    cleanup(tmpDir);
  }
}

// ============================================================
// Scenario X: skill-forge persona (Test Matrix row 10)
//
// The skill-forge gate entry has preconditions:[] and owns the skill source lane.
// Four sub-tests verify: skill source write permits, hook write denies,
// plans write permits (in lane), and resolvePersona resolves correctly.
//
// X.a: skill-forge Write to .ai-skills/skills/prism-code-dev/SKILL.md → PERMIT
// X.b: skill-forge Write to .ai-skills/hooks/gates.json → DENY (canonical-source-protected)
// X.c: skill-forge echo > .prism/plans/foo.md → PERMIT (in lane)
// X.d: resolvePersona({agent_type:'prism-skill-forge'}) → resolves 'skill-forge', not null
//
// Tests X.a/X.b/X.c run against REPO_ROOT so real enforcement paths resolve.
// X.b MAINTENANCE OFF — deny must not be unlocked.
// ============================================================
{
  const name = 'X: skill-forge persona';

  const guardScript = path.join(HOOKS_DIR, 'ownership-guard.mjs');
  const maintOff = { CLAUDE_PROJECT_DIR: REPO_ROOT, CLAUDE_PRISM_MAINTENANCE: '' };

  // X.a: Write to skill source → PERMIT
  const rA = runHook(guardScript, {
    session_id: 'smoke-x',
    agent_type: 'prism-skill-forge',
    hook_event_name: 'PreToolUse',
    tool_name: 'Write',
    tool_input: { file_path: '.ai-skills/skills/prism-code-dev/SKILL.md' },
    cwd: REPO_ROOT,
  }, { CLAUDE_PROJECT_DIR: REPO_ROOT });
  const okA = assert(name, rA.code === 0,
    `X.a: skill-forge Write to prism-code-dev/SKILL.md — expected exit 0 (in lane), got ${rA.code}. stderr: ${rA.stderr.substring(0, 200)}`);

  // X.b: Write to canonical hooks → DENY (canonical-source-protected)
  const rB = runHook(guardScript, {
    session_id: 'smoke-x',
    agent_type: 'prism-skill-forge',
    hook_event_name: 'PreToolUse',
    tool_name: 'Write',
    tool_input: { file_path: '.ai-skills/hooks/gates.json' },
    cwd: REPO_ROOT,
  }, maintOff);
  const okB = assert(name, rB.code === 2,
    `X.b: skill-forge Write to .ai-skills/hooks/gates.json — expected exit 2 (canonical-source-protected), got ${rB.code}. stderr: ${rB.stderr.substring(0, 200)}`);

  // X.c: Bash echo > .prism/plans/foo.md → PERMIT (in lane)
  const rC = runHook(guardScript, {
    session_id: 'smoke-x',
    agent_type: 'prism-skill-forge',
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: { command: 'echo x > .prism/plans/foo.md' },
    cwd: REPO_ROOT,
  }, { CLAUDE_PROJECT_DIR: REPO_ROOT });
  const okC = assert(name, rC.code === 0,
    `X.c: skill-forge echo > .prism/plans/foo.md — expected exit 0 (in lane), got ${rC.code}. stderr: ${rC.stderr.substring(0, 200)}`);

  // X.d: resolvePersona with agent_type 'prism-skill-forge' → resolves to 'skill-forge'
  // Import resolve-persona and call it directly — no hook subprocess needed for this assertion.
  let okD = false;
  try {
    // Dynamic import so we can test the exported function directly.
    const { resolvePersona } = await import(path.join(HOOKS_DIR, 'lib', 'resolve-persona.mjs'));
    const fs = await import('node:fs');
    const gatesData = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.ai-skills', 'hooks', 'gates.json'), 'utf8'));
    const resolved = resolvePersona({ agent_type: 'prism-skill-forge' }, gatesData, REPO_ROOT);
    okD = assert(name, resolved !== null && resolved.key === 'skill-forge',
      `X.d: resolvePersona({agent_type:'prism-skill-forge'}) — expected key 'skill-forge', got ${JSON.stringify(resolved)}`);
  } catch (e) {
    assert(name, false, `X.d: dynamic import of resolve-persona.mjs failed: ${e.message}`);
  }

  if (okA && okB && okC && okD) console.log(`${PASS} ${name}`);
}

// ============================================================
// Scenario Y: runKey isolation (Defect 2 / Test Matrix row 11)
//
// resolveRunKey must produce distinct keys for two payloads with the same
// session_id and no agent_id when they carry distinct agent_type values.
// A native-Task payload (agent_id present) must return agent_id unchanged.
//
// Y.a: payloads with same session_id, distinct agent_type → distinct keys
// Y.b: payload with agent_id → runKey === agent_id (unchanged)
// ============================================================
{
  const name = 'Y: runKey isolation (Defect 2)';

  let okA = false, okB = false;
  try {
    const { resolveRunKey } = await import(path.join(HOOKS_DIR, 'lib', 'resolve-persona.mjs'));

    // Y.a: same session_id, distinct agent_type → distinct keys
    const key1 = resolveRunKey({ session_id: 'sess-abc', agent_type: 'prism-ticket-start' });
    const key2 = resolveRunKey({ session_id: 'sess-abc', agent_type: 'prism-code-dev' });
    okA = assert(name,
      typeof key1 === 'string' && typeof key2 === 'string' && key1 !== key2,
      `Y.a: expected two distinct runKeys for the same session_id with distinct agent_type. Got key1=${key1}, key2=${key2}`);

    // Y.b: agent_id present → runKey === agent_id (native Task path unchanged)
    const agentId = 'a38d158a7f3f8f1e6';
    const key3 = resolveRunKey({ session_id: 'sess-xyz', agent_type: 'prism-code-dev', agent_id: agentId });
    okB = assert(name, key3 === agentId,
      `Y.b: expected runKey === agent_id ('${agentId}'), got '${key3}'`);
  } catch (e) {
    assert(name, false, `Y: dynamic import of resolve-persona.mjs failed: ${e.message}`);
  }

  if (okA && okB) console.log(`${PASS} ${name}`);
}

// ============================================================
// Scenario Z: _shared isolation (Test Matrix row 12)
//
// _shared must never be returned as a persona by resolvePersona, and
// _shared has no .gates or .preconditions so any persona loop over gates.json
// must skip it cleanly without throwing.
//
// Z.a: resolvePersona with no agent_type + no active-persona file →
//       resolves null (or some real persona, but NOT 'skill' named '_shared')
// Z.b: resolvePersona({agent_type: '_shared'}) → resolves null (no such mapping)
// Z.c: run-gates.mjs with a synthetic _shared-only gates.json + valid report
//       for a real persona → the stop hook resolves the persona from the
//       real entry, not _shared, and exits 0. Verifies the gate runner skips _shared.
// ============================================================
{
  const name = 'Z: _shared isolation';

  let okA = false, okB = false;
  try {
    const { resolvePersona } = await import(path.join(HOOKS_DIR, 'lib', 'resolve-persona.mjs'));
    // A gates object with only _shared — no persona entries
    const gatesOnlyShared = {
      _shared: { may_write: ['.prism/lessons.md'] },
    };

    // Z.a: no agent_type — solo path — resolves from active-persona file; no real file
    // in this test, so it reads null/nothing → returns null. The key invariant is it does
    // NOT return the _shared key as a persona.
    const resolvedSolo = resolvePersona({}, gatesOnlyShared, REPO_ROOT);
    okA = assert(name,
      resolvedSolo === null || (resolvedSolo && resolvedSolo.key !== '_shared'),
      `Z.a: expected null or a non-_shared persona, got key=${resolvedSolo?.key}`);

    // Z.b: agent_type '_shared' → resolves null (no mapping for this string)
    const resolvedShared = resolvePersona({ agent_type: '_shared' }, gatesOnlyShared, REPO_ROOT);
    okB = assert(name, resolvedShared === null,
      `Z.b: resolvePersona({agent_type:'_shared'}) — expected null, got ${JSON.stringify(resolvedShared)}`);
  } catch (e) {
    assert(name, false, `Z: dynamic import of resolve-persona.mjs failed: ${e.message}`);
  }

  // Z.c: run-gates stop hook with a _shared+clove gates.json — the runner skips _shared and
  // processes only the clove entry. Verify no crash and gate exits 0 with a valid report.
  {
    const gates = {
      _shared: { may_write: ['.prism/lessons.md', '.prism/evidence/**/deliverable.json'] },
      clove: {
        writes_report_to: '.prism/evidence/${runKey}/report.json',
        preconditions: [],
        gates: [],
        allowed_routes: ['briar', 'human'],
        ownership: { may_write: ['src/**'], may_not_run: [] },
      },
    };
    const report = {
      verdict: 'done',
      verdict_reason: 'work complete',
      next_route: 'briar',
      reasoning: 'all good',
      persona: 'clove',
      checklist: {},
    };
    const { tmpDir } = setupStopFixture({ gates, report });
    try {
      const payload = { session_id: 'smoke-session', agent_type: 'prism-code-dev', stop_reason: 'end_turn' };
      const r = runHook(path.join(HOOKS_DIR, 'run-gates.mjs'), payload, { CLAUDE_PROJECT_DIR: tmpDir });
      const okC = assert(name, r.code === 0,
        `Z.c: run-gates with _shared+clove gates — expected exit 0 (runner skips _shared cleanly), got ${r.code}. stderr: ${r.stderr.substring(0, 200)}`);
      if (okA && okB && okC) console.log(`${PASS} ${name}`);
    } finally {
      cleanup(tmpDir);
    }
  }
}

// ============================================================
// Final result
// ============================================================
if (allPassed) {
  console.log('\nAll smoke scenarios passed.');
  process.exit(0);
} else {
  console.error('\nOne or more smoke scenarios FAILED.');
  process.exit(1);
}
