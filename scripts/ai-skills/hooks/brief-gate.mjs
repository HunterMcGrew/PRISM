#!/usr/bin/env node
// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
//
// Brief gate. A workflow agent's instructions come from its skill and the plan
// folder, so a long dispatch brief is plan content that never reached
// `plan.md`, and an override line in a brief can talk the agent out of its
// own rules. This hook denies a dispatch to a gated agent (`GATED_ROLES`) when
// the brief runs over 15 non-blank lines or carries a listed override phrase.
// One script serves Claude Code and Codex, and each registration passes
// `--tool=<harness>` to pick its `HARNESSES` row.
//
// Brief text is untrusted input: the hook only counts and matches it. The hook
// exits at once, before it reads stdin, when `PRISM_HOOK_DISABLE` or
// `PRISM_HOOK_DENY_DISABLE` is `1` in its own environment, as `hook.mjs` does.
//
// Codex never denies. Its `SubagentStart` can't block a subagent, so the hook
// appends a `would-deny` line to `prism-hooks.jsonl` in the git directory
// instead.
//
// It fails open. A repo with no `.prism/architect/manifest.json` above the
// payload's cwd, a payload with no brief, and any error in the hook itself all
// pass, because a gate that breaks a dispatch on its own bug costs more than a
// missed deny.
//
// Known misses:
// - Claude's `PreToolUse` doesn't fire for a Workflow-internal agent stage
// - Codex's `SubagentStart` payload documents no brief field
//   (https://learn.chatgpt.com/docs/hooks, checked 2026-11-02), so its
//   would-deny line fires only if a `prompt` field arrives
// - an override phrase reworded past the patterns below, including a bare
//   "ignore instructions" or "disregard rules" with no "the", "all", or
//   "previous" before the noun
// - a long brief to an agent type outside `GATED_ROLES`, such as
//   `general-purpose`, which the gate never reads
// - a brief packed into a few very long lines, because the limit counts lines
//   and not characters
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { findRepoRoot } from "./architect-route.mjs";
import { HARNESSES, writeStdout } from "./harnesses.mjs";
import { appendHookLog } from "./lib/hook-log.mjs";

/**
 * @typedef {import("./harnesses.mjs").HookPayload} HookPayload
 * @typedef {{ decision: "pass" } | { decision: "deny", reason: string, type: string, lines: number, repoRoot: string }} Decision
 */

const HOOK_NAME = "brief-gate";
const MAX_LINES = 15;

// A consumer has no `roles.json` on disk, so the set is written out here, and
// the test holds it equal to the roles marked `gated: true` there.
const GATED_ROLES = new Set([
	"prism-spec",
	"prism-challenge",
	"prism-verify",
	"prism-implement",
	"prism-docs",
	"prism-pr-review",
]);

// One or two qualifiers (`the`, `all`, `previous`) must precede the noun, as in
// "ignore all previous instructions". A `your` among them always denies, because it names the agent's own rules
// wherever they live. Without one, the second pattern exempts a target other
// than the plan, so "ignore all instructions in them" about fetched content
// passes while "ignore the rules in plan.md" denies. The last pattern passes
// "do not read plan.md History".
const OVERRIDE_PATTERNS = [
	/(?:ignore|disregard)\s+(?=(?:(?:the|all|previous)\s+)?your\s)(?:(?:your|the|all|previous)\s+){1,2}(?:instructions|rules)/i,
	/(?:ignore|disregard)\s+(?:(?:the|all|previous)\s+){1,2}(?:instructions|rules)(?!\s+(?:in|inside|within|from|of)\s+(?!(?:the\s+)?plan\b))/i,
	/you\s+may\s+skip/i,
	/do\s+not\s+read\s+(?:the\s+)?plan(?:\.md)?(?=\s*(?:[.,;:!?)](?=\s|$)|$)|\s+(?:and|or|but|so|just|first)\b)/im,
];

/**
 * @param {string[]} causes
 * @returns {string}
 */
function denyReason(causes) {
	return `A brief to a gated subagent names what that stage reads (the plan folder with the task IDs, round, or base ref, or the PR for a PR review), the worktree path, and the report shape, in 15 lines or fewer. ${causes.join(" ")}`;
}

/**
 * @param {string} text
 * @returns {number}
 */
function nonBlankLines(text) {
	return text.split(/\r?\n/).filter((line) => line.trim() !== "").length;
}

/**
 * Returns the first override phrase the brief carries, with its whitespace
 * collapsed so a phrase split across lines reads as one, or null.
 *
 * @param {string} text
 * @returns {string | null}
 */
function matchedOverride(text) {
	for (const pattern of OVERRIDE_PATTERNS) {
		const match = pattern.exec(text);
		if (match) return match[0].replace(/\s+/g, " ");
	}

	return null;
}

/**
 * Judges one payload. A dispatch to a gated role with an over-long or
 * overriding brief is a deny, and everything else passes.
 *
 * @param {HookPayload} payload
 * @param {{ tool: string }} options
 * @returns {Promise<Decision>}
 */
export async function runGate(payload, { tool }) {
	const dispatch = HARNESSES[tool]?.subagentDispatch(payload);
	if (
		!dispatch ||
		typeof dispatch.prompt !== "string" ||
		typeof dispatch.type !== "string" ||
		!GATED_ROLES.has(dispatch.type)
	)
		return { decision: "pass" };

	const repoRoot = await findRepoRoot(payload.cwd || process.cwd());
	if (!repoRoot) return { decision: "pass" };

	const lines = nonBlankLines(dispatch.prompt);
	const phrase = matchedOverride(dispatch.prompt);
	if (lines <= MAX_LINES && phrase === null) return { decision: "pass" };

	const causes = [];
	if (lines > MAX_LINES)
		causes.push(
			`It has ${lines} non-blank lines, over the limit of ${MAX_LINES}.`
		);
	if (phrase !== null) causes.push(`It says "${phrase}".`);

	return {
		decision: "deny",
		reason: denyReason(causes),
		type: dispatch.type,
		lines,
		repoRoot,
	};
}

// --- Entry ---

/**
 * @param {string[]} argv
 * @returns {Record<string, string>}
 */
function parseArgs(argv) {
	/** @type {Record<string, string>} */
	const args = {};
	for (const arg of argv) {
		const match = /^--([a-zA-Z]+)=(.*)$/.exec(arg);
		if (match) args[match[1] ?? ""] = match[2] ?? "";
	}

	return args;
}

/**
 * @param {string[]} argv
 * @param {() => string} readStdin
 */
async function main(argv, readStdin) {
	if (
		process.env.PRISM_HOOK_DISABLE === "1" ||
		process.env.PRISM_HOOK_DENY_DISABLE === "1"
	)
		return;

	const { tool } = parseArgs(argv);
	if (!tool || !Object.hasOwn(HARNESSES, tool)) {
		process.stderr.write(
			`${HOOK_NAME}: unknown or missing --tool "${tool}", exiting fail-open\n`
		);
		return;
	}

	const result = await runGate(JSON.parse(readStdin()), { tool });
	if (result.decision !== "deny") return;

	if (tool === "codex") {
		appendHookLog(result.repoRoot, {
			ts: new Date().toISOString(),
			hook: HOOK_NAME,
			tool,
			note: "would-deny",
			type: result.type,
			lines: result.lines,
		});
		return;
	}

	// A host with no observed deny envelope answers nothing.
	const reply = HARNESSES[tool]?.emitDeny(result.reason);
	if (reply !== null && reply !== undefined) writeStdout(reply);
}

export { denyReason, GATED_ROLES, MAX_LINES, OVERRIDE_PATTERNS };

// Runs only as the entry module. It compares real paths, because Node resolves
// symlinks for import.meta.url, and a hook path reached through a link would
// otherwise never run.
if (
	process.argv[1] &&
	realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	main(process.argv.slice(2), () => readFileSync(0, "utf8")).catch((err) => {
		try {
			process.stderr.write(
				`${HOOK_NAME}: ${err instanceof Error ? err.message : String(err)}\n`
			);
		} catch {
			// stderr itself failing leaves nothing more to do
		}
	});
}
