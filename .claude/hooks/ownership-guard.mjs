#!/usr/bin/env node
/**
 * ownership-guard.mjs — PreToolUse ownership enforcement hook.
 *
 * Fires on Edit, Write, MultiEdit, and Bash tool calls. Resolves the active persona,
 * then enforces two constraints from the persona's ownership matrix in gates.json:
 *   - may_write: glob patterns the persona may write to. A write to any other path
 *     is denied before the tool executes.
 *   - may_not_run: command substrings the persona may never run via Bash. A match
 *     on the effective command (first line of the command string, before any heredoc
 *     content) is denied before execution.
 *
 * Exit 2 blocks the tool call; stderr becomes Claude's feedback (naming allowed paths
 * or the prohibition that fired). This is the negative half of handoff enforcement:
 * making the next lane's work physically impossible, so handoff is the only remaining move.
 * See ADR-0067 § Handoff is enforced as named and coherent.
 *
 * Payload shape (PreToolUse, confirmed against Claude Code hook docs 2026-06-26):
 *   { session_id, cwd, hook_event_name, tool_name, tool_input: { file_path?, command? }, agent_id?, agent_type? }
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { resolvePersona } from './lib/resolve-persona.mjs';

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
// Matching applies to the effective command only — the first non-comment, non-empty
// line of the command string before any heredoc delimiter. This prevents false positives
// where prohibited strings appear in heredoc content or quoted strings rather than as
// actual shell invocations. A heredoc starts with '<<' after the command; content after
// the delimiter is data, not executable commands.
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
}

// All checks passed — permit the tool call.
process.exit(0);

/**
 * Extracts the effective shell command — the first non-empty, non-comment line of the
 * command string, stopping at the first heredoc delimiter ('<<' or '<<-').
 *
 * A heredoc delimiter marks the start of inline data, not executable commands. Matching
 * may_not_run against heredoc content would produce false positives when prohibited strings
 * appear as data (e.g. a JSON file being written that contains "gh pr merge" as a value).
 * The invariant we enforce: the actual shell command being invoked, not the data it writes.
 */
function extractEffectiveCommand(cmd) {
  const lines = cmd.split('\n');
  const parts = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    // Stop at heredoc delimiter — content after is data, not commands.
    if (/<<-?\s*['"`]?\w/.test(trimmed)) {
      // Include everything before the << on this line.
      const beforeHeredoc = trimmed.split(/<<-?\s*['"`]?\w/)[0];
      if (beforeHeredoc.trim()) parts.push(beforeHeredoc);
      break;
    }
    parts.push(trimmed);
    // Stop after the first logical command (ignoring continuation characters).
    // A ';' ends a command on the same line; '&&' and '||' separate commands.
    // For simplicity, treat the first full line as the effective command.
    break;
  }
  return parts.join(' ');
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
