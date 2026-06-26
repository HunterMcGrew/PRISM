#!/usr/bin/env node
/**
 * evidence-ledger.mjs — PostToolUse evidence recording hook.
 *
 * Fires after every Bash tool call. Reads the confirmed top-level exit_code and
 * tool_output from the PostToolUse payload, then appends one entry to the persona's
 * evidence ledger at .prism/evidence/<runKey>/ledger.jsonl.
 *
 * The ledger enables 'source: ledger' gates in run-gates.mjs: instead of re-running
 * expensive commands (test suites) at Stop time, the gate reads the most recent matching
 * exit code from the ledger. This is the cost knob — ledger lookups avoid double-running
 * already-proven checks. See ADR-0067 § Evidence ledger reads top-level payload fields.
 *
 * Payload shape (PostToolUse, confirmed against Claude Code hook docs 2026-06-26):
 *   { session_id, cwd, hook_event_name, tool_name, tool_input: { command },
 *     tool_output, exit_code, stdout, stderr, agent_id?, agent_type? }
 *
 * runKey = agent_id ?? session_id — keyed by agent to prevent fleet-lane collision
 * (subagents share the parent's session_id; agent_id is unique per lane).
 */

import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

const raw = readFileSync(0, 'utf8');
let payload;
try {
  payload = JSON.parse(raw);
} catch {
  // Malformed payload — don't block the Bash result, just skip recording.
  process.exit(0);
}

// Only record Bash tool calls — other PostToolUse events (Edit, Write, etc.)
// don't produce exit codes meaningful to the evidence gates.
if (payload.tool_name !== 'Bash') {
  process.exit(0);
}

const runKey = payload.agent_id ?? payload.session_id;
if (!runKey) {
  // Cannot identify the run lane — skip recording.
  process.exit(0);
}

const command = payload.tool_input?.command ?? '';

// exit_code is top-level on PostToolUse payload (confirmed: live docs 2026-06-26).
// The prototype guessed tool_response?.exit_code which recorded 0 for everything.
// The plan's corrected Decision is correct: the field is at the top level.
const exitCode = typeof payload.exit_code === 'number' ? payload.exit_code : null;

const entry = {
  ts: new Date().toISOString(),
  cmd: command,
  exit_code: exitCode,
  runKey,
};

const evidenceDir = path.join(projectDir, '.prism', 'evidence', runKey);
const ledgerPath = path.join(evidenceDir, 'ledger.jsonl');

try {
  mkdirSync(evidenceDir, { recursive: true });
  appendFileSync(ledgerPath, JSON.stringify(entry) + '\n', 'utf8');
} catch (e) {
  // Ledger write failure is non-fatal — the run continues, but 'source: ledger'
  // gates will fall back to 'fresh' execution at Stop time.
  process.stderr.write(`evidence-ledger: failed to write ledger entry: ${e.message}\n`);
}

process.exit(0);
