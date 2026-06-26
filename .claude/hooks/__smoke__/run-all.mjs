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
// but the gate command exits 1. The hook must override to done-override.
// Expected: run-gates exits 2 (block the stop), stderr contains "done-override" or "types".
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

    const ok = assert(name, r.code === 2, `expected exit 2, got ${r.code}`) &&
                assert(name, r.stderr.includes('done-override') || r.stderr.includes('types'), `expected 'done-override' or 'types' in stderr. Got: ${r.stderr.substring(0, 200)}`);
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
  console.log('\nAll 4 smoke scenarios passed.');
  process.exit(0);
} else {
  console.error('\nOne or more smoke scenarios FAILED.');
  process.exit(1);
}
