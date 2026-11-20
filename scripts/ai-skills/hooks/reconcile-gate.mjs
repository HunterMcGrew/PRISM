#!/usr/bin/env node
// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
//
// Reconcile stop gate. A PR review that ends with human comments missing from
// the review-misses log, or with threads nobody answered, loses the record the
// next review learns from. This hook runs `review/reconcile.mjs --json` when a
// `prism-pr-review` subagent stops, and sends the agent back to work while the
// PR is unclean. One script serves Claude Code and Codex, which spell every
// field it reads the same way, and each registration passes `--tool=<harness>`.
// Cursor registers no stop hook, so a Cursor review runs reconcile by hand.
//
// It acts only on a `SubagentStop` whose agent type is `prism-pr-review`, and
// every other event passes. The PR is the one a `prism-pr: <n>` last line of
// the agent's final message names, so a review of another branch's PR
// reconciles that PR. Backticks, asterisks, and a `#` before the number are
// ignored. A retry stop without the line reuses the PR stored with the block
// count, and every block asks for the line again. A stop with neither blocks
// once asking for the line, without running reconcile, and passes on a second
// miss. It never looks up the session branch's PR, because that may not be
// the PR the agent reviewed. A clean report deletes the stored count and PR.
// It blocks on any unclean report, naming the comment and thread URLs, and
// relays nothing else from a comment, because comment bodies are data. It
// writes no labels and calls no GitHub route itself, so every write is
// reconcile's, under the developer's own login.
//
// It blocks at most 3 stops in a row. The count and the PR live at
// `<os.tmpdir()>/prism-hooks/reconcile/<tool>/<session>.json`, because
// `stop_hook_active` is a boolean and can't count. A stop carrying it as false
// starts the count over. The fourth unclean stop passes and appends a
// `reconcile:unclean` line to `prism-hooks.jsonl` in the git directory.
//
// The hook exits at once, before it reads stdin, when `PRISM_HOOK_DISABLE` or
// `PRISM_HOOK_DENY_DISABLE` is `1` in its own environment, as `hook.mjs` does.
// Its inner limit, 90 s for reconcile, sits under the 120 s registration
// timeout, because a harness that kills a hook discards its reply and the
// stop passes unchecked.
//
// It fails open. Reconcile output that isn't a report, a counter it can't
// write, and any error in the hook itself all pass the stop, because a stop
// gate that breaks on its own bug can trap a session.
//
// Known misses:
// - parallel `prism-pr-review` subagents in one session share one counter
//   and its stored PR
// - a harness that omits `stop_hook_active` never resets the count or the
//   stored PR early, so it passes every fourth unclean stop rather than the
//   fourth in a turn
// - Codex's `SubagentStop` hasn't been live-probed for
//   `last_assistant_message`, so a Codex review may get the ask and then pass
import { execFile } from "node:child_process";
import {
	mkdirSync,
	readFileSync,
	realpathSync,
	renameSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { findRepoRoot } from "./architect-route.mjs";
import { HARNESSES, writeStdout } from "./harnesses.mjs";
import { appendHookLog } from "./lib/hook-log.mjs";

/**
 * @typedef {import("./harnesses.mjs").HookPayload} HookPayload
 * @typedef {{ decision: "pass" } | { decision: "block", reason: string }} Decision
 * @typedef {(file: string, args: string[], options: Record<string, unknown>, callback: (error: Error | null, stdout: string, stderr: string) => void) => unknown} Exec
 */

const HOOK_NAME = "reconcile-gate";
const REVIEW_AGENT = "prism-pr-review";
const MAX_BLOCKS = 3;
const RECONCILE_SCRIPT = fileURLToPath(
	new URL("./review/reconcile.mjs", import.meta.url)
);
const MISSES_LOG = ".prism/metrics/review-misses.jsonl";
const RECONCILE_TIMEOUT_MS = 90_000;
const DEFAULT_STATE_DIR = path.join(os.tmpdir(), "prism-hooks", "reconcile");
const SUBAGENT_STOP_EVENT = "SubagentStop";
const PR_LINE = /^prism-pr:\s*#?(\d+)$/;
/** @type {Decision} */
const PASS = Object.freeze({ decision: "pass" });
const ASK_FOR_PR_LINE =
	'End your report with the line "prism-pr: <n>" naming the PR you reviewed, so this stop reconciles that PR.';

/**
 * Decides one stop and returns `{ decision: "pass" }` or `{ decision:
 * "block", reason }`. The caller writes the block envelope.
 *
 * `exec` has the callback signature of `execFile`, so tests pass a stub.
 * `now` returns the Date stamped on the `reconcile:unclean` log line, and
 * `stateDir` holds the per-harness counter directories. A harness with no stop
 * event, or a payload with no agent type, never matches the review agent and
 * passes.
 *
 * @param {HookPayload} payload
 * @param {{ tool: string, exec: Exec, now?: () => Date, stateDir?: string }} options
 * @returns {Promise<Decision>}
 */
export async function runGate(
	payload,
	{ tool, exec, now = () => new Date(), stateDir = DEFAULT_STATE_DIR }
) {
	const stop = HARNESSES[tool]?.subagentStop(payload);
	if (
		!stop ||
		payload.hook_event_name !== SUBAGENT_STOP_EVENT ||
		stop.agentType !== REVIEW_AGENT
	)
		return PASS;

	const repoRoot =
		typeof payload.cwd === "string" ? await findRepoRoot(payload.cwd) : null;
	if (!repoRoot) return PASS;

	const counterPath = path.join(
		stateDir,
		tool,
		`${safeName(payload.session_id)}.json`
	);
	const stored = stop.active === false ? null : readState(counterPath);
	const pr = namedPr(stop.message) ?? stored?.pr ?? null;

	// With no PR named or stored, it asks for the line once, and a second miss passes.
	if (pr === null) {
		if (stored !== null) {
			rmSync(counterPath, { force: true });
			return PASS;
		}

		return writeState(counterPath, { count: 1, pr: null })
			? { decision: "block", reason: ASK_FOR_PR_LINE }
			: PASS;
	}

	const report = await runReconcile(exec, repoRoot, pr);
	if (report === null) return PASS;
	if (report.clean) {
		rmSync(counterPath, { force: true });
		return PASS;
	}

	const count = (stored?.count ?? 0) + 1;
	if (count > MAX_BLOCKS) {
		rmSync(counterPath, { force: true });
		appendHookLog(repoRoot, {
			ts: now().toISOString(),
			hook: HOOK_NAME,
			tool,
			note: "reconcile:unclean",
			pr,
		});
		return PASS;
	}

	// A block with no recorded count would block every retry, so it passes.
	if (!writeState(counterPath, { count, pr })) return PASS;

	return { decision: "block", reason: blockReason(report, pr) };
}

// --- Commands ---

/**
 * Returns the PR a `prism-pr: <n>` line names when it is the message's last
 * non-blank line, or null. A line anywhere else may be quoted comment text.
 * Markdown emphasis around the line is dropped first.
 *
 * @param {string | undefined} message
 * @returns {number | null}
 */
function namedPr(message) {
	if (typeof message !== "string") return null;

	const last = (message.trimEnd().split(/\r?\n/).at(-1) ?? "")
		.replace(/[`*]/g, "")
		.trim();
	const number = Number(PR_LINE.exec(last)?.[1]);

	return Number.isSafeInteger(number) && number > 0 ? number : null;
}

/**
 * Returns reconcile's `--json` report, or null when its output isn't one.
 * Reconcile exits 1 on an unclean PR, so the exit code alone says nothing
 * about whether the output is readable.
 *
 * @param {Exec} exec
 * @param {string} repoRoot
 * @param {number} pr
 * @returns {Promise<Record<string, any> | null>}
 */
async function runReconcile(exec, repoRoot, pr) {
	const stdout = await runCommand(
		exec,
		process.execPath,
		[RECONCILE_SCRIPT, String(pr), "--json"],
		{ cwd: repoRoot, timeout: RECONCILE_TIMEOUT_MS }
	);
	const report = parseJson(stdout);
	if (
		!report ||
		typeof report !== "object" ||
		typeof report.clean !== "boolean"
	)
		return null;

	return report;
}

/**
 * Runs `exec` and resolves its stdout, never rejecting.
 *
 * @param {Exec} exec
 * @param {string} file
 * @param {string[]} args
 * @param {Record<string, unknown>} options
 * @returns {Promise<string>}
 */
function runCommand(exec, file, args, options) {
	return new Promise((resolve) => {
		try {
			exec(file, args, { encoding: "utf8", ...options }, (_error, stdout) => {
				resolve(String(stdout ?? ""));
			});
		} catch {
			resolve("");
		}
	});
}

/**
 * @param {string} text
 * @returns {any}
 */
function parseJson(text) {
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}

// --- Block text ---

/**
 * One sentence per kind of finding, one per line. A failed write's entry is
 * reconcile's own description of the write plus GitHub's error, never a
 * comment body. A report with no `failedWrites` list comes from a reconcile
 * older than that field, where unclean with every list empty can only mean a
 * failed write.
 *
 * Every block ends by asking for the `prism-pr:` line, because the review
 * agent's report is where that line comes from.
 *
 * @param {Record<string, any>} report
 * @param {number} pr
 * @returns {string}
 */
function blockReason(report, pr) {
	/** @param {unknown} items */
	const list = (items) => (Array.isArray(items) ? items : []);
	/** @param {unknown} items */
	const urls = (items) =>
		list(items)
			.map((item) => item?.url)
			.filter((url) => typeof url === "string");
	const reconcileCommand = `node ${RECONCILE_SCRIPT.split(path.sep).join("/")} ${pr}`;
	const unlogged = urls(report.unloggedComments);
	const threads = urls(report.threadsNeedingReply);
	const headings = list(report.missingHeadings);
	const badLines = list(report.badLogLines);
	const failed = list(report.failedWrites).filter(
		(item) => typeof item === "string"
	);

	const sentences = [];
	if (unlogged.length > 0)
		sentences.push(
			`Classify these ${unlogged.length} human comments and append review-misses rows: ${unlogged.join(", ")}`
		);
	if (threads.length > 0)
		sentences.push(
			`Reply to these ${threads.length} review threads: ${threads.join(", ")}`
		);
	if (headings.length > 0)
		sentences.push(
			`Add these missing PR body headings: ${headings.join(", ")}`
		);
	if (badLines.length > 0)
		sentences.push(
			`Fix these unparseable lines in ${MISSES_LOG}: ${badLines.join(", ")}`
		);
	if (report.truncatedThreads === true)
		sentences.push(
			"The PR has more than 100 review threads, and reconcile reads only the first 100, so check the rest by hand."
		);
	if (failed.length > 0)
		sentences.push(
			`Re-run ${reconcileCommand} once for these ${failed.length} writes GitHub refused, then report any that still fail: ${failed.join("; ")}`
		);
	if (sentences.length === 0)
		sentences.push(
			`Reconcile reported PR ${pr} unclean with every list empty, which means one of its GitHub writes failed: a thread reply, a thread resolve, or a label change. Run ${reconcileCommand} to see which one.`
		);
	sentences.push(
		`End your report with the line "prism-pr: ${pr}", so the next stop checks the same PR.`
	);

	return sentences.join("\n");
}

// --- Counter ---

/**
 * Keeps a session id usable as one file name.
 *
 * @param {unknown} session
 * @returns {string}
 */
function safeName(session) {
	const name = String(session ?? "").replace(/[^A-Za-z0-9._-]/g, "_");

	return name === "" || /^\.+$/.test(name) ? "unknown" : name;
}

/**
 * Returns the stored `{ count, pr }`, or null when there is no readable count.
 * A stored PR that isn't a positive integer comes back as null.
 *
 * @param {string} counterPath
 * @returns {{ count: number, pr: number | null } | null}
 */
function readState(counterPath) {
	try {
		const { count, pr } = JSON.parse(readFileSync(counterPath, "utf8"));
		if (!Number.isInteger(count) || count <= 0) return null;

		return { count, pr: Number.isSafeInteger(pr) && pr > 0 ? pr : null };
	} catch {
		return null;
	}
}

/**
 * Writes the state to a `.tmp` sibling and renames it into place, and reports
 * success.
 *
 * @param {string} counterPath
 * @param {{ count: number, pr: number | null }} state
 * @returns {boolean}
 */
function writeState(counterPath, state) {
	try {
		mkdirSync(path.dirname(counterPath), { recursive: true });
		const temp = `${counterPath}.${process.pid}.tmp`;
		writeFileSync(temp, JSON.stringify(state));
		renameSync(temp, counterPath);

		return true;
	} catch {
		return false;
	}
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

	const result = await runGate(JSON.parse(readStdin()), {
		tool,
		exec: /** @type {Exec} */ (execFile),
	});
	if (result.decision !== "block") return;

	// A host with no stop reply answers nothing.
	const reply = HARNESSES[tool]?.emitBlockStop(result.reason);
	if (reply !== null && reply !== undefined) writeStdout(reply);
}

export { RECONCILE_SCRIPT };

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
