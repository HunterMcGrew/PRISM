// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
/**
 * Compaction arms that keep a compacted session's state close to what a
 * handoff document would carry. `hook.mjs` dispatches both.
 *
 * - `PreCompact`: returns a summary template. Claude Code uses a `PreCompact`
 *   hook's stdout as the instructions for the compaction summary, capped at
 *   10,000 characters per hook and cut with a marker past that, not saved to
 *   a file the way other hook output is. The template is the whole of
 *   stdout. It carries the branch, the plan path, and `git status -s` read
 *   from disk, so the summary copies those facts instead of recalling them.
 * - `SessionStart` with source `compact`: returns a note that lands in the
 *   compacted context, telling the session to re-read the branch plan and
 *   write unrecorded decisions into it. A compact does not re-run a skill's
 *   startup, so nothing else prompts that re-read.
 *
 * A hook cannot run a model turn, so it cannot write session state into the
 * plan before the summary is made. The template has the summary carry
 * unrecorded decisions in full instead, and the post-compact note has the
 * session write them down first.
 *
 * Text the user types after `/compact` reaches the summarizer alongside this
 * template, so the template does not repeat it. That was observed in one live
 * manual compact. The docs say only that the hook receives the typed text as
 * `custom_instructions` (null on an automatic compact). The docs describe each
 * `PreCompact` hook's stdout as summary instructions; how several hooks'
 * output combines is unverified. PRISM's state reset runs on `PostCompact`
 * and prints nothing to stdout, so this module is the runtime's only
 * `PreCompact` stdout writer.
 *
 * The plan path comes from the shared lookup in `plan/lookup.mjs`, so plan
 * folders and the `## Ticket` scan count. A miss still sends the post-compact
 * note to the full lookup rather than saying no plan exists.
 *
 * Both arms return `null` rather than throwing on anything unexpected. A
 * `PreCompact` exit code of 2 blocks the compaction, and a blocked compaction
 * that was recovering from a context-limit error fails the request.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

import { findRepoRoot } from "./architect-route.mjs";
import { findArchivedPlan, resolvePlan } from "./plan/lookup.mjs";

const STATUS_LINE_LIMIT = 40;

/**
 * @typedef {object} LiveState
 * @property {string} branch
 * @property {string | null} plan Repo-relative plan path, or null when none matches the branch.
 * @property {string} status `git status -s` output, capped at `STATUS_LINE_LIMIT` lines.
 */

/**
 * @param {string} cwd
 * @param {string[]} args
 * @returns {string | null} Trimmed stdout, or null when git fails or times out.
 */
function runGit(cwd, args) {
	try {
		return execFileSync("git", ["-C", cwd, ...args], {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
			timeout: 5000,
		}).trimEnd();
	} catch {
		return null;
	}
}

/**
 * Reads `ticketPrefix` from the repo's `.ai-skills/config.json`.
 *
 * @param {string} repoRoot
 * @returns {string | null}
 */
function readTicketPrefix(repoRoot) {
	try {
		const config = JSON.parse(
			readFileSync(path.join(repoRoot, ".ai-skills", "config.json"), "utf8")
		);
		return typeof config.ticketPrefix === "string" && config.ticketPrefix
			? config.ticketPrefix
			: null;
	} catch {
		return null;
	}
}

/**
 * Finds the plan for the ticket ID in the branch name: a live plan first,
 * through the shared lookup (plan folders, flat plans, and the `## Ticket`
 * scan), then an archived one. Returns null when the lookup throws, because
 * the compaction arms must never fail.
 *
 * The ID pattern comes from the config's `ticketPrefix` because a consumer's
 * prefix is their own. A generic `<letters>-<digits>` match would also hit
 * slug fragments like `pr-896` in an unrelated branch name.
 *
 * @param {string} repoRoot
 * @param {string} branch
 * @returns {string | null}
 */
export function findPlanForBranch(repoRoot, branch) {
	const prefix = readTicketPrefix(repoRoot);
	if (!prefix || !branch) {
		return null;
	}

	const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const match = new RegExp(`(?:^|[^a-z0-9])(${escaped}-\\d+)(?![0-9])`, "i").exec(branch);
	if (!match) {
		return null;
	}

	const id = match[1].toLowerCase();

	try {
		return (
			resolvePlan(repoRoot, id)?.file ??
			findArchivedPlan(repoRoot, id)?.file ??
			null
		);
	} catch {
		return null;
	}
}

/**
 * Renders `git status -s` output for the state block. A failed or timed-out
 * call says so rather than reading as a clean tree, because the summary
 * copies this line as fact.
 *
 * @param {string | null} status
 * @returns {string}
 */
export function formatStatus(status) {
	if (status === null) {
		return "(git status unavailable — do not assume the tree is clean)";
	}

	const lines = status.split("\n").filter(Boolean);
	const shown = lines.slice(0, STATUS_LINE_LIMIT);

	if (lines.length > shown.length) {
		shown.push(`… ${lines.length - shown.length} more`);
	}

	return shown.length ? shown.join("\n") : "(clean)";
}

/**
 * @param {string} cwd
 * @param {string} repoRoot
 * @returns {LiveState}
 */
function readLiveState(cwd, repoRoot) {
	const branch = runGit(cwd, ["branch", "--show-current"]) ?? "";

	return {
		branch: branch || "(detached HEAD or not a git checkout)",
		plan: findPlanForBranch(repoRoot, branch),
		status: formatStatus(runGit(cwd, ["status", "-s"])),
	};
}

/**
 * @param {string} repoRoot
 * @param {LiveState} state
 * @returns {string}
 */
function formatStateBlock(repoRoot, state) {
	return [
		`- Checkout: ${repoRoot}`,
		`- Branch: ${state.branch}`,
		`- Branch plan: ${state.plan ?? "none found"}`,
		"- Uncommitted files (git status -s):",
		"```",
		state.status,
		"```",
	].join("\n");
}

/**
 * @param {string} repoRoot
 * @param {LiveState} state
 * @returns {string}
 */
export function buildSummaryTemplate(repoRoot, state) {
	const planRule = state.plan
		? `Decisions already written in ${state.plan} are not copied into the summary. Point at that path instead.`
		: "No plan file was found for this branch's ticket, by name, by ticket field, or in the archive, so the summary may be the only record of this session's decisions. Keep all of them.";

	return `Write the compaction summary with the sections below, in this order, using these headings. Use plain declarative sentences and bullets. Leave out greetings and persona voice. If the user typed their own compact instructions, those win where they conflict with these.

These facts were read from disk when compaction started. Copy them into "Live state" as written instead of recalling them:

${formatStateBlock(repoRoot, state)}

## Continue from
Where the work stands, the next action, and any reasoning that was in progress when compaction ran. Name the step of a multi-step run.

## User framing and corrections
What the user asked for, in their own words where the wording matters. Every correction, preference, and scope limit the user gave this session. Keep these even when they look small.

## Unrecorded decisions (not in the plan yet)
Every decision made this session that has not been written to the branch plan, each with its reason and any alternative that was rejected. ${planRule}

## Open threads
Unresolved questions, each with the current leaning. Questions put to the user that have no answer yet.

## Dead ends
Approaches that were tried and failed, each with why it failed, so they are not retried.

## Active skill and in-flight work
Which skill or persona is active and which step it is on. Background processes, dev servers, subagents, and other sessions that are still running, with what each was asked to do.

## Live state
The facts above, plus open PRs and tickets by URL or ID.

## Artifacts
Paths and URLs only: plans, PRs, tickets, key source files. No file contents.

Mark any claim that comes from memory rather than from tool output in this session as (unverified).

Leave out: threads that were resolved, file contents that are on disk, raw tool output, and step-by-step narration of work that is finished.
`;
}

/**
 * @param {string} repoRoot
 * @param {LiveState} state
 * @returns {string}
 */
export function buildPostCompactNote(repoRoot, state) {
	const planSteps = state.plan
		? [
				`1. Re-read ${state.plan} in full. A read from before the compaction no longer counts.`,
				'2. If the summary has an "Unrecorded decisions" section, write each one into that plan\'s `## Decisions`, and add a `## History` line, before other work.',
			]
		: [
				"1. No plan file named for this branch's ticket was found. Run the lookup in `.prism/rules/branch-plan.md` § Plan Lookup before concluding there is none, and do not create a plan to hold the summary.",
				'2. If the lookup finds a plan, re-read it in full and write the summary\'s "Unrecorded decisions" into its `## Decisions`. If it finds none, keep that section as the record and tell the user when a decision there needs a plan.',
			];

	return `Context was compacted. Before continuing:

${planSteps.join("\n")}
3. If a skill or persona was active, resume at the step the summary names. Its startup did not re-run, so re-read the architect docs and rules that step depends on.
4. Re-check anything the summary marks (unverified) before acting on it.

Current state, read from disk just now:

${formatStateBlock(repoRoot, state)}
`;
}

/**
 * Parses the payload and resolves the PRISM repo root it runs in, or `null`
 * when the payload is not JSON or the cwd is outside a PRISM install.
 *
 * @param {string} rawStdin
 * @returns {Promise<{payload: Record<string, unknown>, cwd: string, repoRoot: string} | null>}
 */
async function resolveContext(rawStdin) {
	const payload = JSON.parse(rawStdin);
	const cwd = path.resolve(typeof payload.cwd === "string" ? payload.cwd : process.cwd());
	const repoRoot = await findRepoRoot(cwd);

	return repoRoot ? { payload, cwd, repoRoot } : null;
}

/**
 * `PreCompact` arm. Returns the summary template, or `null` outside a PRISM
 * install, on a malformed payload, or with `PRISM_HOOK_DISABLE=1`.
 *
 * @param {string} rawStdin
 * @returns {Promise<string | null>}
 */
export async function runPreCompactArm(rawStdin) {
	if (process.env.PRISM_HOOK_DISABLE === "1") {
		return null;
	}

	try {
		const context = await resolveContext(rawStdin);
		if (!context) {
			return null;
		}

		return buildSummaryTemplate(context.repoRoot, readLiveState(context.cwd, context.repoRoot));
	} catch (error) {
		process.stderr.write(
			`compact-handoff: PreCompact failed: ${error instanceof Error ? error.message : String(error)}\n`
		);
		return null;
	}
}

/**
 * `SessionStart` arm. Returns the post-compact note only when the payload's
 * `source` is `compact`. Every other source returns `null`, so a registration
 * without the `compact` matcher still stays quiet on startup and resume.
 *
 * @param {string} rawStdin
 * @returns {Promise<string | null>}
 */
export async function runSessionStartArm(rawStdin) {
	if (process.env.PRISM_HOOK_DISABLE === "1") {
		return null;
	}

	try {
		const context = await resolveContext(rawStdin);
		if (!context || context.payload.source !== "compact") {
			return null;
		}

		return buildPostCompactNote(context.repoRoot, readLiveState(context.cwd, context.repoRoot));
	} catch (error) {
		process.stderr.write(
			`compact-handoff: SessionStart failed: ${error instanceof Error ? error.message : String(error)}\n`
		);
		return null;
	}
}
