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
// Final result
// ============================================================
if (allPassed) {
  console.log('\nAll smoke scenarios passed.');
  process.exit(0);
} else {
  console.error('\nOne or more smoke scenarios FAILED.');
  process.exit(1);
}
