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
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
  // The build emitter — a gated persona editing this file could emit a weakened
  // runtime without being caught by the canonical-source prefix check (which covers
  // .ai-skills/hooks/** but not scripts/). Protecting it here and in
  // isEnforcementSourceProtected closes the vector; maintenance mode unlocks it for
  // legitimate servicing alongside the rest of the enforcement surface.
  'scripts/ai-skills/build.ts',
];
const PROTECTED_LIB_PREFIX = '.claude/hooks/lib/';
const PROTECTED_EVIDENCE_BASENAMES = ['strikes.json', 'ledger.jsonl', 'ratified-verdict.json', 'baseline.json', 'maintenance-ledger.jsonl'];

// Canonical enforcement source — the build emits these to the runtime, so protecting
// only the runtime (PROTECTED_WRITE_PATHS) left a back door: a gated persona could edit
// canonical .ai-skills/hooks/gates.json (drop its tests gate / widen may_write) or a
// canonical *.mjs, run `pnpm prism:build`, and the weakened runtime would go live. The
// whole canonical hooks tree is protected except __smoke__/ (which gates nothing — same
// carve-out as the runtime .claude/hooks/__smoke__/ exemption). prism-code-dev/** is a
// separate tree (.ai-skills/skills/), not under this prefix, so Clove's own skill source
// stays writable. See issue #305.
const PROTECTED_CANONICAL_HOOKS_PREFIX = '.ai-skills/hooks/';
const CANONICAL_HOOKS_SMOKE_CARVEOUT = '.ai-skills/hooks/__smoke__/';

// The complete, closed set of POSIX control operators that start a NEW command head:
// sequence (;), background (&), and/or (&&, ||), pipe (|), and NEWLINE. This is fixed by
// the shell grammar, not an open list of "forms we've seen" — see the Decision's
// completeness argument. Every Bash scan arm derives its segmentation from this one
// constant so the three arms cannot drift against each other (the defect behind the
// newline leak: extractEffectiveCommand and splitCommandSegments disagreed on separators).
//
// Declared here in the module-const block, not beside splitCommandSegments, because the
// Bash branch calls splitCommandSegments during the synchronous module body — a const
// declared lower would be in the temporal dead zone at that call.
const SEGMENT_SEPARATORS = /(?:&&|\|\||[;\n|&])/;

// Git subcommands that mutate the working tree by pathspec — both accept a path list that
// names exactly which files to restore. When the pathspec set is empty (bare invocation),
// these become whole-tree ops and fall through to the Tier 2 denial path.
const GIT_PATH_SUBCOMMANDS = new Set(['checkout', 'restore']);

// Git subcommands that unconditionally mutate the whole working tree without a pathspec
// argument — there is no path-level granularity to check, so the protection must work by
// subcommand. Includes both commands that can take a pathspec but may not (checkout/restore
// without `--` or an explicit pathspec) and commands that never take one (reset, stash, etc.).
// Whole-tree ops during a gated dispatch have no legitimate use case (they disrupt the
// lane's own working state) and maintenance mode is the lawful escape if one is genuinely
// needed for floor servicing.
const GIT_WHOLE_TREE_SUBCOMMANDS = new Set([
  'reset', 'stash', 'switch', 'clean', 'apply', 'am', 'checkout', 'restore',
]);

/**
 * Returns true when the human has set the maintenance-mode env var.
 *
 * The switch is an env var rather than a file or config key — a persona cannot set an
 * env var on a hook's process (each hook is a fresh Node process spawned with Claude
 * Code's environment, not the persona's shell), and the one file-based injection path
 * (settings.json env block) is denylist-protected. See Decision "Maintenance-mode seam
 * design (Phase 4.5, Winston)".
 */
function isMaintenanceMode() {
  return process.env.CLAUDE_PRISM_MAINTENANCE === '1';
}

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
  // Evidence-rm prohibitions (e.g. "rm .prism/evidence", "rm -rf .prism/evidence") are the
  // declarative floor for evidence deletion, but a pure substring match over-blocks reads
  // that merely mention the pattern (grep rm .prism/evidence/...). Defer those entries to the
  // structural commandDeletesEvidence scan, which fires only when rm is the operating command;
  // every other may_not_run entry stays a strict substring lane boundary.
  const forbidden = may_not_run.find(sub => {
    if (!effectiveCmd.includes(sub)) return false;
    if (/^rm\b.*\.prism\/evidence/.test(sub)) return commandDeletesEvidence(effectiveCmd);
    return true;
  });
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
  // Under maintenance mode, source-protection writes are permitted and audited instead.
  const protectedWrite = commandWritesProtectedPath(effectiveCmd, payload.cwd ?? projectDir);
  if (protectedWrite) {
    if (isMaintenanceMode() && isEnforcementSourceProtected(protectedWrite)) {
      // A fused command may both write a protected source path AND delete evidence — for example,
      // `echo x > .ai-skills/hooks/gates.json && rm -rf .prism/evidence`. Maintenance unlocks
      // only the source-write; the evidence-delete protection is never suspended. Check the full
      // command for evidence deletion before permitting the early exit so a co-fused rm cannot
      // slip through the unlock — each protection is evaluated independently per its own target.
      if (commandDeletesEvidence(effectiveCmd)) {
        process.stderr.write(
          `[ownership-guard] Denied: this Bash command deletes a .prism/evidence/ path.\n` +
          `Gate state (strikes.json, ledger.jsonl, ratified-verdict.json, baseline.json) is hook-managed;\n` +
          `${persona} may not delete evidence regardless of rm flag form. This is a lane boundary.\n` +
          `Maintenance mode suspends enforcement-source writes only — evidence deletion is never unlocked.\n`
        );
        process.exit(2);
      }
      appendMaintenanceLedger(payload, protectedWrite, persona, projectDir);
      process.exit(0);
    }
    process.stderr.write(
      `[ownership-guard] Denied: this Bash command writes '${protectedWrite}', which is\n` +
      `enforcement-source-protected (ADR-0067 § gate non-circumventability, #305). A shell\n` +
      `redirect/copy/sed cannot write the runtime, the canonical source (.ai-skills/hooks/),\n` +
      `or gate state. Changing a hook lawfully goes through the human-granted, build-reverted\n` +
      `path (ADR-0067 § the lawful hook-authoring path). The __smoke__/ trees stay writable.\n`
    );
    process.exit(2);
  }

  // Git working-tree mutation guard. A git checkout/restore with a protected pathspec is
  // the same write vector as a redirect — it restores a file from history, overwriting the
  // working-tree copy — but it takes the Bash branch where commandWritesProtectedPath can't
  // see it (there's no `>` operator to match). Tier 1 path-named ops (checkout/restore with
  // an explicit pathspec) are matched by resolved path; Tier 2 whole-tree ops (reset --hard,
  // stash pop/apply, switch, clean, apply, am, or bare checkout/restore) are matched by
  // subcommand because there is no pathspec to resolve. Maintenance mode unlocks Tier 2
  // unconditionally and Tier 1 only when the path is an enforcement SOURCE (not gate state).
  const gitMutation = commandMutatesProtectedViaGit(effectiveCmd, payload.cwd ?? projectDir);
  if (gitMutation) {
    if (isMaintenanceMode() && (gitMutation.tier === 2 || isEnforcementSourceProtected(gitMutation.path))) {
      // Co-fused evidence-delete guard — same discipline as the commandWritesProtectedPath
      // unlock above: check the full command before permitting, so a fused command like
      // `git checkout HEAD -- .ai-skills/hooks/gates.json && rm -rf .prism/evidence` cannot
      // slip the evidence arm through the source-write maintenance unlock.
      if (commandDeletesEvidence(effectiveCmd)) {
        process.stderr.write(
          `[ownership-guard] Denied: this Bash command deletes a .prism/evidence/ path.\n` +
          `Gate state (strikes.json, ledger.jsonl, ratified-verdict.json, baseline.json) is hook-managed;\n` +
          `${persona} may not delete evidence regardless of rm flag form. This is a lane boundary.\n` +
          `Maintenance mode suspends enforcement-source writes only — evidence deletion is never unlocked.\n`
        );
        process.exit(2);
      }
      appendMaintenanceLedger(payload, gitMutation.path ?? `git ${gitMutation.subcommand}`, persona, projectDir);
      process.exit(0);
    }
    if (gitMutation.tier === 1) {
      process.stderr.write(
        `[ownership-guard] Denied: 'git ${gitMutation.subcommand}' writes to '${gitMutation.path}', which is\n` +
        `enforcement-source-protected (ADR-0067 § gate non-circumventability). A git pathspec restore\n` +
        `overwrites the working-tree file from history — the same vector as a shell redirect. To change\n` +
        `a hook lawfully, go through the human-granted build-reverted path (ADR-0067 § lawful hook-authoring path).\n` +
        `To service the floor, set CLAUDE_PRISM_MAINTENANCE=1 in the shell that launches Claude Code.\n`
      );
    } else {
      process.stderr.write(
        `[ownership-guard] Denied: 'git ${gitMutation.subcommand}' is a whole-tree working-tree op.\n` +
        `Whole-tree git ops (reset --hard, stash pop/apply, switch, checkout <branch>, clean, apply, am)\n` +
        `restore files without naming a pathspec, which is the half of the git-mutation vector that\n` +
        `path-matching structurally cannot see. Gated personas never legitimately need a whole-tree reset\n` +
        `mid-dispatch — these are disruptive workspace ops. If floor servicing requires one, a human\n` +
        `sets CLAUDE_PRISM_MAINTENANCE=1 to unlock it (ADR-0067 § gate non-circumventability, #289).\n`
      );
    }
    process.exit(2);
  }

  // Bash-path evidence-deletion scan (finding 6). rm with any flag form targeting
  // .prism/evidence/ deletes gate state. The may_not_run substrings cover the common
  // forms; this scan closes the variant-flag gap (rm -f / -fr / --force) structurally.
  if (commandDeletesEvidence(effectiveCmd)) {
    process.stderr.write(
      `[ownership-guard] Denied: this Bash command deletes a .prism/evidence/ path.\n` +
      `Gate state (strikes.json, ledger.jsonl, ratified-verdict.json, baseline.json) is hook-managed;\n` +
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
  // Under maintenance mode, enforcement-SOURCE writes are permitted and audited — gate state
  // (PROTECTED_EVIDENCE_BASENAMES) and the Bash-deletion/may_not_run paths are never suspended.
  if (isEnforcementSourceProtected(normalizedPath)) {
    if (isMaintenanceMode()) {
      appendMaintenanceLedger(payload, normalizedPath, persona, projectDir);
      process.exit(0);
    }
    process.stderr.write(
      `[ownership-guard] Denied: '${normalizedPath}' is enforcement-source-protected.\n` +
      `Both the runtime (.claude/hooks/) and its canonical source (.ai-skills/hooks/) are\n` +
      `protected — the build emits canonical → runtime, so editing canonical then rebuilding\n` +
      `would weaken the live gate just the same (ADR-0067 § gate non-circumventability, #305).\n` +
      `No persona may write either end during a gated dispatch. To change a hook lawfully, a\n` +
      `human grants a scoped runtime widening for the task and the build reverts it (ADR-0067\n` +
      `§ the lawful hook-authoring path). The __smoke__/ trees stay writable.\n`
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
        `Gate state files (strikes.json, ledger.jsonl, ratified-verdict.json, baseline.json) are written\n` +
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
  // Join with a newline, not a space: the newline is a control operator in
  // SEGMENT_SEPARATORS, so a multi-line command surfaces each line as its own segment with
  // a real command head. A space-join would erase the boundary before splitCommandSegments
  // runs, collapsing `echo hi\nrm ...` into one `echo`-headed segment the rm-anchored scans
  // never see. Heredoc bodies are already excluded above (the break), so they never reach here.
  return parts.join('\n');
}

/**
 * Returns true if a normalized path is enforcement-source-protected.
 *
 * Combines the three sources of source protection into one predicate so the deny site
 * and the maintenance-unlock site always consult the same test — when Phase 5 adds
 * build.ts to protection, it updates one function and both sites pick it up automatically
 * (the SEGMENT_SEPARATORS single-source-of-truth discipline applied to path protection).
 *
 * Gate STATE (strikes/ledger/ratified/baseline/maintenance-ledger under .prism/evidence/)
 * is NOT covered here — those are handled by the PROTECTED_EVIDENCE_BASENAMES check and
 * are never unlocked by maintenance mode.
 */
function isEnforcementSourceProtected(normalizedPath) {
  return (
    PROTECTED_WRITE_PATHS.includes(normalizedPath) ||
    normalizedPath.startsWith(PROTECTED_LIB_PREFIX) ||
    isProtectedCanonicalHookPath(normalizedPath)
  );
}

/**
 * Appends one JSON audit line to the maintenance ledger for each source write permitted
 * under maintenance mode.
 *
 * The ledger is hook-written via Node fs, so the PROTECTED_EVIDENCE_BASENAMES check that
 * blocks persona tool-writes to 'maintenance-ledger.jsonl' does not block this function.
 * The append is non-fatal — a write failure does not block the permitted tool call.
 */
function appendMaintenanceLedger(payload, normalizedPath, resolvedPersona, projectDir) {
  try {
    const ledgerDir = path.join(projectDir, '.prism', 'evidence');
    mkdirSync(ledgerDir, { recursive: true });
    const ledgerPath = path.join(ledgerDir, 'maintenance-ledger.jsonl');
    const entry = JSON.stringify({
      ts: Date.now(),
      persona: resolvedPersona,
      tool: payload.tool_name,
      path: normalizedPath,
      runKey: payload.agent_id ?? payload.session_id,
    });
    appendFileSync(ledgerPath, entry + '\n', 'utf8');
  } catch {
    // Non-fatal — a write failure does not block the permitted tool call.
  }
}

/**
 * Returns true if a normalized path is a protected canonical enforcement source.
 *
 * The canonical hooks tree (.ai-skills/hooks/) is the build's input; the runtime
 * (.claude/hooks/) is its output. Protecting only the output left the canonical back door
 * (issue #305). Everything under the canonical hooks prefix is protected except __smoke__/
 * — smoke tests gate nothing, so a gated persona may still adjust coverage there.
 */
function isProtectedCanonicalHookPath(normalizedPath) {
  return (
    normalizedPath.startsWith(PROTECTED_CANONICAL_HOOKS_PREFIX) &&
    !normalizedPath.startsWith(CANONICAL_HOOKS_SMOKE_CARVEOUT)
  );
}

/**
 * Returns the first protected path a Bash command would WRITE, or null if none.
 *
 * A command writes a protected path only when that path is the destination of a mutation
 * operator — not when it merely co-occurs with one. The write targets are computed by
 * collectWriteTargets (redirect right-hand side, tee args, cp/mv destination, sed -i / dd
 * file arg); a protected path appearing only as a read source (`cat X >`, `node X <`,
 * `git diff -- X`, `grep X`) or behind a non-protected redirect target never trips it.
 *
 * Each target is normalized the same way the tool-path normalizes filePath (line ~183) —
 * path.relative(projectDir, path.resolve(cwdBase, target)) with backslashes forwarded —
 * BEFORE the protected checks. This collapses `./`, `..`, and absolute spellings to the same
 * canonical relative path the prefix checks expect, so a redirect to `./.ai-skills/hooks/
 * gates.json` or an absolute spelling denies just as the bare form does (issue #305). Without
 * it, isProtectedCanonicalHookPath's startsWith check was defeated by a leading `./`.
 *
 * Conservative bias survives on genuine ambiguity (a redirect whose target we can't
 * confidently parse still matches by substring within that target token), but unambiguous
 * reads of a protected path are permitted (finding 5; Briar Issue #300 self-review).
 */
function commandWritesProtectedPath(effectiveCmd, cwdBase) {
  const targets = collectWriteTargets(effectiveCmd);
  if (targets.length === 0) return null;

  for (const rawTarget of targets) {
    const target = normalizeWriteTarget(rawTarget, cwdBase);

    for (const protectedPath of PROTECTED_WRITE_PATHS) {
      if (target.includes(protectedPath)) return protectedPath;
    }
    if (target.includes(PROTECTED_LIB_PREFIX)) return PROTECTED_LIB_PREFIX;
    if (isProtectedCanonicalHookPath(target)) return target;

    // Protected gate-state files under .prism/evidence/ — match only when the write
    // target itself names both the evidence dir and a protected basename.
    if (target.includes('.prism/evidence/')) {
      for (const basename of PROTECTED_EVIDENCE_BASENAMES) {
        if (target.includes(basename)) return `.prism/evidence/.../${basename}`;
      }
    }
  }

  return null;
}

/**
 * Normalizes a Bash write-target token to a project-relative, forward-slash path.
 *
 * Mirrors the tool-path normalization (path.relative(projectDir, path.resolve(cwdBase, ...)))
 * so the Bash arm and the tool-path arm collapse `./`, `..`, and absolute spellings to the
 * same canonical form before the protected-path checks — the two arms cannot drift on path
 * spelling (issue #305 Bash-arm bypass). cwdBase matches the tool-path base (payload.cwd ??
 * projectDir). Falls back to the raw token if resolution throws (a malformed token still hits
 * the substring checks conservatively).
 */
function normalizeWriteTarget(rawTarget, cwdBase) {
  try {
    return path.relative(projectDir, path.resolve(cwdBase, rawTarget)).replace(/\\/g, '/');
  } catch {
    return rawTarget;
  }
}

/**
 * Collects the file tokens a Bash command would actually write to.
 *
 * Associates each mutation operator with its target rather than scanning the whole command:
 *   - redirect (`>`, `>>`): the token immediately after the operator. `2>&1` and other
 *     fd-duplications (`>&N`) are skipped — they redirect a descriptor, not a file.
 *   - `tee`: every non-flag argument to tee (tee writes its file args).
 *   - `cp` / `mv`: the destination — the last positional (non-flag) argument.
 *   - `sed -i` / `dd`: the operated-on file argument(s) (sed -i: positionals after the
 *     script; dd: the `of=` operand).
 *
 * Splitting on command separators (`;`, `&&`, `||`, `|`, `&`) keeps each segment's operator
 * bound to its own arguments, so a read segment piped into a write segment doesn't leak.
 */
function collectWriteTargets(effectiveCmd) {
  const targets = [];

  for (const segment of splitCommandSegments(effectiveCmd)) {
    const tokens = tokenize(segment);

    // Redirects: scan for `>`/`>>` operators (possibly fused with an fd, e.g. `2>file`).
    for (let i = 0; i < tokens.length; i++) {
      const redirectTarget = redirectTargetFor(tokens, i);
      if (redirectTarget !== null) targets.push(redirectTarget);
    }

    const head = commandHead(tokens);

    if (head === 'tee') {
      // tee writes every file argument (flags like -a are skipped).
      for (const arg of tokens.slice(tokens.indexOf('tee') + 1)) {
        if (!arg.startsWith('-') && !isRedirectToken(arg)) targets.push(arg);
      }
    }

    if (head === 'cp' || head === 'mv') {
      // Destination is the last positional argument.
      const positionals = tokens.slice(tokens.indexOf(head) + 1).filter(t => !t.startsWith('-') && !isRedirectToken(t));
      if (positionals.length >= 1) targets.push(positionals[positionals.length - 1]);
    }

    if (head === 'sed' && /(^|\s)-i/.test(segment)) {
      // sed -i edits its file args in place: positionals after the script expression.
      // Take every non-flag positional except the first (the script), conservatively.
      const after = tokens.slice(tokens.indexOf('sed') + 1).filter(t => !t.startsWith('-') && !isRedirectToken(t));
      for (const f of after.slice(1)) targets.push(f);
    }

    if (head === 'dd') {
      for (const t of tokens) {
        if (t.startsWith('of=')) targets.push(t.slice(3));
      }
    }
  }

  return targets;
}

/**
 * Returns the redirect target file at token index i, or null if tokens[i] does not
 * contain a file-writing redirect.
 *
 * Handles four forms — the operator may sit anywhere in the token, not just at its start,
 * so a redirect fused to the preceding word (`x>file`, `echo`'d with no space) is caught:
 *   `>` / `>>` as a standalone token   → target is tokens[i+1]
 *   `>file` / `2>file` / `>>file`      → target is the suffix after the operator
 *   `x>file` / `x>>file` (word-fused)  → target is the suffix after the operator
 * Fd-duplications (`>&1`, `2>&1`, `x>&1`) redirect a descriptor, not a file, and return null.
 *
 * The match scans for the first `>`/`>>` not immediately preceded by `<` (so `<>` and read
 * redirects don't false-match) and not immediately followed by `&` (fd-dup). The suffix after
 * the operator is the destination; an empty suffix means the operator is standalone and the
 * destination is the next token.
 */
function redirectTargetFor(tokens, i) {
  const tok = tokens[i];
  // Find an embedded `>`/`>>` operator anywhere in the token. The preceding char (if any)
  // may be a word char or an fd digit — both fuse a redirect to a destination.
  const m = tok.match(/(>>?)([^>&].*|$)/);
  if (!m) return null;

  // Fd-duplication: the char right after the operator is `&` (e.g. `2>&1`, `x>&1`).
  const opEnd = m.index + m[1].length;
  if (tok[opEnd] === '&') return null;

  const rest = tok.slice(opEnd);
  if (rest.length > 0) return rest; // fused or word-fused form: `>file`, `x>file`
  // Standalone operator: the file is the next token (skip an fd-dup like `&1`).
  const next = tokens[i + 1];
  if (next === undefined || next.startsWith('&')) return null;
  return next;
}

function isRedirectToken(tok) {
  return /^\d*>>?/.test(tok) || /^<+/.test(tok);
}

/**
 * Splits a command string on shell separators so each segment carries its own operators.
 * Uses SEGMENT_SEPARATORS — the single source of truth for command-segment boundaries, so
 * every Bash scan arm derives its segmentation from one constant and the arms cannot drift.
 *
 * After splitting, each segment is also unwrapped from a command-substitution or subshell
 * prefix/suffix — `$(cmd args)`, `` `cmd args` ``, and `(cmd args)` — so git (and rm/tee/
 * etc.) nested inside a substitution is still detected as the command head. A persona cannot
 * bypass the guard by wrapping a mutation in `$(...)` or backticks.
 */
function splitCommandSegments(cmd) {
  return cmd.split(SEGMENT_SEPARATORS).map(s => peelSubstitutionWrapper(s.trim())).filter(Boolean);
}

/**
 * Strips a leading command-substitution or subshell wrapper from a segment so the actual
 * command head is visible to commandHead and parseGitInvocation.
 *
 * Handles: `$(cmd ...)` → `cmd ...`, `` `cmd ...` `` → `cmd ...`, `(cmd ...)` → `cmd ...`.
 * The trailing delimiter is stripped only when a matching opener is present — plain segments
 * without wrappers pass through unchanged.
 */
function peelSubstitutionWrapper(segment) {
  if (segment.startsWith('$(') && segment.endsWith(')')) {
    return segment.slice(2, -1).trim();
  }
  if (segment.startsWith('`') && segment.endsWith('`') && segment.length > 1) {
    return segment.slice(1, -1).trim();
  }
  if (segment.startsWith('(') && segment.endsWith(')')) {
    return segment.slice(1, -1).trim();
  }

  return segment;
}

/** Whitespace tokenization — sufficient for the redirect/command-head analysis here. */
function tokenize(segment) {
  return segment.split(/\s+/).filter(Boolean);
}

/**
 * Returns the effective command name of a segment — the first token that isn't an
 * environment-variable assignment (`FOO=bar`) or a redirect token.
 */
function commandHead(tokens) {
  for (const tok of tokens) {
    if (isRedirectToken(tok)) continue;
    if (/^\w+=/.test(tok)) continue; // leading env assignment
    return tok;
  }
  return '';
}

/**
 * Returns true if a Bash command deletes a .prism/evidence/ path with `rm` as the
 * operating command (any flag form).
 *
 * Anchors `rm` as a command head per segment — so `grep rm .prism/evidence/...` (rm as a
 * search string) and `echo "rm .prism/evidence/"` (rm as data) are permitted, while
 * `rm -f .prism/evidence/...` / `rm --force ...` (rm actually deleting) deny. Closes the
 * variant-flag gap the may_not_run substrings miss (finding 6); the declarative
 * may_not_run strings remain the floor, this is the structural backstop.
 */
function commandDeletesEvidence(effectiveCmd) {
  for (const segment of splitCommandSegments(effectiveCmd)) {
    const tokens = tokenize(segment);
    if (commandHead(tokens) !== 'rm') continue;
    if (tokens.some(t => targetsEvidence(t))) return true;
  }
  return false;
}

/**
 * Returns true if a token targets the .prism/evidence tree — the bare directory itself
 * (`.prism/evidence`, the most destructive form, wipes all runs' gate state) OR any path
 * beneath it (`.prism/evidence/<runKey>/strikes.json`). The `./`-prefixed forms are matched
 * too. A trailing-slash-only match (`.includes('.prism/evidence/')`) would miss the bare
 * directory — the original C2 hole.
 */
function targetsEvidence(token) {
  return (
    token === '.prism/evidence' ||
    token === './.prism/evidence' ||
    token.startsWith('.prism/evidence/') ||
    token.startsWith('./.prism/evidence/')
  );
}

/**
 * Returns a git mutation descriptor when a command contains a git subcommand that would
 * write a protected enforcement path, or null when no protected git mutation is found.
 *
 * Two tiers:
 *   Tier 1 — path-named ops (checkout, restore with a pathspec). Each resolved pathspec is
 *   checked against the same enforcement-source + gate-state protected sets that the tool-path
 *   arm uses. Returns { tier: 1, path, subcommand } on the first protected-path hit, or
 *   { tier: 2, subcommand } when the pathspec list is empty (bare invocation = whole-tree).
 *
 *   Tier 2 — whole-tree ops (reset, stash, switch, clean, apply, am, and bare checkout/restore).
 *   These restore/clobber working-tree files without naming a pathspec, so the only protection
 *   strategy is denial by subcommand. Returns { tier: 2, subcommand }.
 *
 * Returns null when no git segment is found or when the git op is read-only (status, diff, log).
 */
function commandMutatesProtectedViaGit(effectiveCmd, cwdBase) {
  for (const segment of splitCommandSegments(effectiveCmd)) {
    const tokens = tokenize(segment);
    if (commandHead(tokens) !== 'git') continue;

    const { subcommand, args } = parseGitInvocation(tokens);
    if (!subcommand) continue;

    if (GIT_PATH_SUBCOMMANDS.has(subcommand)) {
      const pathspecs = extractGitPathspecs(args);
      if (pathspecs.length === 0) {
        // Bare checkout/restore with no pathspec — whole-tree op.
        return { tier: 2, subcommand };
      }
      for (const raw of pathspecs) {
        // Strip surrounding single or double quotes before path resolution — a shell-quoted
        // pathspec like ".claude/settings.json" or '.claude/settings.json' is semantically
        // identical to the unquoted form, but path.resolve treats the leading quote as part
        // of the filename, producing a path that matches nothing in the protected sets.
        const unquoted = raw.replace(/^(['"])(.*)\1$/, '$2');
        const target = normalizeWriteTarget(unquoted, cwdBase);
        if (isEnforcementSourceProtected(target)) {
          return { tier: 1, path: target, subcommand };
        }
        if (target.startsWith('.prism/evidence/')) {
          for (const basename of PROTECTED_EVIDENCE_BASENAMES) {
            if (target.includes(basename)) {
              return { tier: 1, path: target, subcommand };
            }
          }
        }
      }
      // Pathspecs present but none protected — not a protected mutation.
      continue;
    }

    if (GIT_WHOLE_TREE_SUBCOMMANDS.has(subcommand)) {
      return { tier: 2, subcommand };
    }
  }

  return null;
}

/**
 * Parses git global options and returns { subcommand, args } for the real git subcommand.
 *
 * Git accepts global options before the subcommand — `-C <dir>`, `--git-dir=<path>`,
 * `--work-tree=<path>`, `-c <k=v>`, `--namespace=<ns>`. These must be skipped to find
 * the real subcommand. Value-taking flags in bare form (`-C`, `-c`, `--git-dir`,
 * `--work-tree`, `--namespace`) consume the next token; `=`-fused forms (`--git-dir=x`,
 * `-c k=v`) are single tokens and advance by one. The first non-option token is the
 * subcommand; everything after it is args.
 */
function parseGitInvocation(tokens) {
  const valueFlags = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace']);
  const gitIdx = tokens.indexOf('git');
  if (gitIdx < 0) return { subcommand: null, args: [] };

  let i = gitIdx + 1;
  while (i < tokens.length) {
    const tok = tokens[i];
    if (!tok.startsWith('-')) break; // first non-option = subcommand
    if (valueFlags.has(tok)) {
      i += 2; // bare value flag — skip flag and its value token
    } else {
      i += 1; // single-token option (--flag=val or standalone flag like --no-pager)
    }
  }

  if (i >= tokens.length) return { subcommand: null, args: [] };
  return { subcommand: tokens[i], args: tokens.slice(i + 1) };
}

/**
 * Extracts the pathspec list from git subcommand args.
 *
 * Two forms:
 *   With `--`: everything after `--` is a literal pathspec (empty after `--` is still empty).
 *   Without `--`: positional args (non-flag tokens). A single positional with no `--` is
 *   ambiguous — it could be a branch name (`git checkout main`) or a path. Without `--`
 *   to disambiguate, a single positional is treated as a whole-tree branch switch → returns []
 *   so the caller sees Tier 2 (whole-tree). Two or more positionals → the first is a tree-ish
 *   ref and the rest are pathspecs (e.g. `git checkout HEAD -- file.ts` already handled by the
 *   `--` path; without `--`: `git checkout main -- src/` → handled; bare `git checkout main src/`
 *   is unusual but we conservatively take positionals[1:] as pathspecs). A bare `.` pathspec
 *   normalizes to the project root and will not match any protected prefix — it falls through
 *   to Tier 2 at the caller (pathspecs.length would be 1 after removing the treeish — the
 *   caller receives ['.'] which normalizes to '' or the project dir; isEnforcementSourceProtected
 *   won't match, so it continues to the next segment, landing in the GIT_WHOLE_TREE fallback).
 */
function extractGitPathspecs(args) {
  const ddIdx = args.indexOf('--');
  if (ddIdx >= 0) {
    return args.slice(ddIdx + 1).filter(Boolean);
  }
  // No `--`: take non-flag positionals. Drop flags (start with `-`).
  const positionals = args.filter(a => !a.startsWith('-'));
  // Single positional without `--` → ambiguous branch name → whole-tree.
  if (positionals.length <= 1) return [];
  // Two or more positionals: first is tree-ish, rest are pathspecs.
  return positionals.slice(1);
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
