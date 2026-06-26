#!/usr/bin/env node
/**
 * Phase 1 Smoke Test harness — 4 scenarios from the epic plan's ## Phase 1 Smoke Test spec.
 *
 * Each scenario is a deterministic, self-contained test that uses synthetic fixtures and
 * node -e "process.exit(N)" stubs for gate commands, so tests pass or fail from logic
 * alone (no real type-checker or test suite needed).
 *
 * Exit codes:
 *   0  — all 4 scenarios passed
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
 */
function setupStopFixture({ gates, report, strikes = 0 }) {
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
  if (strikes > 0) {
    writeFileSync(strikesPath, JSON.stringify({ count: strikes }, null, 2), 'utf8');
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

  const { tmpDir, runKey } = setupStopFixture({ gates, report });
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
  const { tmpDir, runKey } = setupStopFixture({ gates, report, strikes: 2 });
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
// Final result
// ============================================================
if (allPassed) {
  console.log('\nAll smoke scenarios passed.');
  process.exit(0);
} else {
  console.error('\nOne or more smoke scenarios FAILED.');
  process.exit(1);
}
