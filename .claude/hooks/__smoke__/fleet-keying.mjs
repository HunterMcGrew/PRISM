#!/usr/bin/env node
/**
 * Phase 2 Task 3 — Fleet-keying validation.
 *
 * Asserts that two concurrent lanes sharing the same session_id but with distinct
 * agent_id values write to separate .prism/evidence/<runKey>/ directories and
 * accumulate independent strike counters. This proves the runKey = agent_id ?? session_id
 * keying prevents cross-lane collision under real Sol fleet dispatch.
 *
 * Without distinct agent_id values, both lanes would hash to the same session_id runKey,
 * colliding their ledger.jsonl, strikes.json, and ratified-verdict.json. Fleet correctness
 * depends on isolation at the per-agent level.
 *
 * Scenarios:
 *   E1: Two lanes share session_id but differ in agent_id → separate evidence dirs, independent strikes.
 *   E2: Lane with no agent_id falls back to session_id as runKey (solo path still works).
 *   E3: Negative control — two lanes with identical agent_id share the same runKey (expected collision).
 *
 * Exit codes:
 *   0  — all fleet-keying scenarios passed
 *   1  — one or more scenarios failed
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HOOKS_DIR = path.resolve(__dirname, '..');

// --- Helpers (mirrors run-all.mjs) ---

function runHook(hookScript, payload, env = {}) {
  const result = spawnSync('node', [hookScript], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  return {
    code: result.status,
    stderr: result.stderr ?? '',
    stdout: result.stdout ?? '',
  };
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

/**
 * Builds a synthetic gates.json with a single failing gate so every stop attempt
 * increments a strike counter in a deterministic, observable way.
 */
function buildFailingGates() {
  return {
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
      ownership: { may_write: ['src/**'], may_not_run: ['gh pr merge'] },
    },
  };
}

function buildReport(runKey) {
  return {
    verdict: 'done',
    verdict_reason: 'all tasks complete',
    next_route: 'briar',
    reasoning: 'looks good',
    persona: 'clove',
    checklist: { types: true },
  };
}

/**
 * Sets up a tmpDir with a gates.json and writes a report.json for the given runKey.
 */
function setupLane(tmpDir, gates, runKey) {
  const gatesPath = path.join(tmpDir, '.claude', 'hooks', 'gates.json');
  mkdirSync(path.dirname(gatesPath), { recursive: true });
  writeFileSync(gatesPath, JSON.stringify(gates, null, 2), 'utf8');

  const evidenceDir = path.join(tmpDir, '.prism', 'evidence', runKey);
  mkdirSync(evidenceDir, { recursive: true });
  const reportPath = path.join(evidenceDir, 'report.json');
  writeFileSync(reportPath, JSON.stringify(buildReport(runKey), null, 2), 'utf8');

  return { evidenceDir, reportPath };
}

function readStrikeCount(evidenceDir) {
  const strikePath = path.join(evidenceDir, 'strikes.json');
  if (!existsSync(strikePath)) return 0;
  try {
    const raw = JSON.parse(readFileSync(strikePath, 'utf8'));
    return raw.count ?? 0;
  } catch {
    return 0;
  }
}

// ============================================================
// Scenario E1: Two lanes share session_id, differ in agent_id
//
// Both send the same session_id ("shared-session") but carry different agent_id values
// ("lane-alpha" and "lane-beta"). The runKey resolves to agent_id for each, so they
// write to separate evidence dirs. Lane alpha accumulates 1 strike; lane beta accumulates
// 1 strike independently. Neither touches the other's counter.
// ============================================================
{
  const name = 'E1: distinct agent_ids → separate evidence dirs, independent strikes';
  const gates = buildFailingGates();
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'prism-fleet-'));

  try {
    const runKeyAlpha = 'lane-alpha';
    const runKeyBeta  = 'lane-beta';

    const { evidenceDir: dirAlpha } = setupLane(tmpDir, gates, runKeyAlpha);
    const { evidenceDir: dirBeta  } = setupLane(tmpDir, gates, runKeyBeta);

    const env = { CLAUDE_PROJECT_DIR: tmpDir };

    // Fire one stop attempt for each lane — both share session_id but differ in agent_id.
    const payloadAlpha = {
      session_id: 'shared-session',
      agent_id:   'lane-alpha',
      agent_type: 'prism-code-dev',
      hook_event_name: 'SubagentStop',
      stop_reason: 'end_turn',
    };
    const payloadBeta = {
      session_id: 'shared-session',
      agent_id:   'lane-beta',
      agent_type: 'prism-code-dev',
      hook_event_name: 'SubagentStop',
      stop_reason: 'end_turn',
    };

    const rAlpha = runHook(path.join(HOOKS_DIR, 'run-gates.mjs'), payloadAlpha, env);
    const rBeta  = runHook(path.join(HOOKS_DIR, 'run-gates.mjs'), payloadBeta,  env);

    // Both stops must be refused (the gate fails).
    const bothRefused =
      assert(name, rAlpha.code === 2, `lane-alpha: expected exit 2 (gate fails), got ${rAlpha.code}`) &&
      assert(name, rBeta.code  === 2, `lane-beta:  expected exit 2 (gate fails), got ${rBeta.code}`);

    // Each lane must have accumulated exactly 1 strike in its own dir.
    const strikesAlpha = readStrikeCount(dirAlpha);
    const strikesBeta  = readStrikeCount(dirBeta);

    const separateCounters =
      assert(name, strikesAlpha === 1, `lane-alpha: expected 1 strike, got ${strikesAlpha}`) &&
      assert(name, strikesBeta  === 1, `lane-beta:  expected 1 strike, got ${strikesBeta}`);

    // The evidence dirs must be separate (alpha's strikes.json must NOT appear in beta's dir).
    const alphaStrikeFile = path.join(dirAlpha, 'strikes.json');
    const betaStrikeFile  = path.join(dirBeta,  'strikes.json');
    const separateDirs =
      assert(name, existsSync(alphaStrikeFile), `lane-alpha strikes.json missing at ${alphaStrikeFile}`) &&
      assert(name, existsSync(betaStrikeFile),  `lane-beta  strikes.json missing at ${betaStrikeFile}`);

    // Confirm the dirs are genuinely different paths.
    const dirsAreDifferent = assert(name, dirAlpha !== dirBeta, 'evidence dirs must differ');

    if (bothRefused && separateCounters && separateDirs && dirsAreDifferent) {
      console.log(`${PASS} ${name}`);
    }
  } finally {
    cleanup(tmpDir);
  }
}

// ============================================================
// Scenario E2: No agent_id → falls back to session_id as runKey (solo path)
//
// A stop payload carrying no agent_id resolves runKey to session_id ("solo-session").
// The gate fires, refuses the stop, and the strike appears under .prism/evidence/solo-session/.
// ============================================================
{
  const name = 'E2: no agent_id → session_id fallback (solo path still works)';
  const gates = buildFailingGates();
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'prism-fleet-'));

  try {
    const runKey = 'solo-session';
    const { evidenceDir } = setupLane(tmpDir, gates, runKey);

    const env = { CLAUDE_PROJECT_DIR: tmpDir };

    const payload = {
      session_id: 'solo-session',
      // No agent_id — solo path.
      agent_type: 'prism-code-dev',
      hook_event_name: 'Stop',
      stop_reason: 'end_turn',
    };

    const r = runHook(path.join(HOOKS_DIR, 'run-gates.mjs'), payload, env);

    const refused = assert(name, r.code === 2, `expected exit 2 (gate fails), got ${r.code}. stderr: ${r.stderr.slice(0, 200)}`);
    const strikeFile = path.join(evidenceDir, 'strikes.json');
    const strikeAppeared = assert(name, existsSync(strikeFile), `strikes.json not written at ${strikeFile}`);
    const strikeCount = readStrikeCount(evidenceDir);
    const countCorrect = assert(name, strikeCount === 1, `expected 1 strike, got ${strikeCount}`);

    if (refused && strikeAppeared && countCorrect) {
      console.log(`${PASS} ${name}`);
    }
  } finally {
    cleanup(tmpDir);
  }
}

// ============================================================
// Scenario E3: Negative control — identical agent_id values share the same runKey
//
// Two lanes send the same agent_id ("same-agent"). Their evidence is expected to collide
// in the same dir — the second strike increments the first lane's counter. This confirms
// the keying mechanism is strictly by agent_id, and that the isolation in E1 comes from
// the distinct ids, not from some other isolation mechanism.
// ============================================================
{
  const name = 'E3: identical agent_ids → shared runKey (expected collision — negative control)';
  const gates = buildFailingGates();
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'prism-fleet-'));

  try {
    const sharedRunKey = 'same-agent';
    const { evidenceDir } = setupLane(tmpDir, gates, sharedRunKey);

    const env = { CLAUDE_PROJECT_DIR: tmpDir };

    const payload = {
      session_id: 'any-session',
      agent_id:   'same-agent',
      agent_type: 'prism-code-dev',
      hook_event_name: 'SubagentStop',
      stop_reason: 'end_turn',
    };

    // Fire twice with the same agent_id.
    runHook(path.join(HOOKS_DIR, 'run-gates.mjs'), payload, env);
    runHook(path.join(HOOKS_DIR, 'run-gates.mjs'), payload, env);

    const strikes = readStrikeCount(evidenceDir);
    // Two invocations on the same agent_id must accumulate 2 strikes in the shared dir.
    const collisionConfirmed = assert(name, strikes === 2, `expected 2 strikes (collision), got ${strikes}`);

    if (collisionConfirmed) {
      console.log(`${PASS} ${name} (collision as expected)`);
    }
  } finally {
    cleanup(tmpDir);
  }
}

// ============================================================
// Final result
// ============================================================
if (allPassed) {
  console.log('\nAll fleet-keying scenarios passed.');
  process.exit(0);
} else {
  console.error('\nOne or more fleet-keying scenarios FAILED.');
  process.exit(1);
}
