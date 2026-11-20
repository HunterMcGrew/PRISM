/**
 * Pins the reconcile stop gate: a `prism-pr-review` subagent that stops while
 * reconcile reports the PR unclean is sent back to work, at most three times,
 * and the fourth stop passes and logs the fact. The in-process cases stub
 * `execFile`, and the spawned cases run a temp copy of the runtime whose
 * `review/reconcile.mjs` is a stub, so no case calls `gh`.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
	appendFileSync,
	copyFileSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";

import fixtureData from "./review-reconcile.fixtures.json";
import type { HookPayload } from "./hooks/harnesses.mjs";
import { RECONCILE_SCRIPT, runGate } from "./hooks/reconcile-gate.mjs";
import { reconcile, toJsonReport } from "./hooks/review/reconcile.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOOKS = path.join(HERE, "hooks");
const PRISM_ROOT = path.resolve(HERE, "..", "..");
const TEMPLATE = path.join(PRISM_ROOT, ".prism", "templates", "pr-description.md");
const FIXTURES = fixtureData as Record<string, Record<string, unknown>>;
const PR = 2847;
const REPO = "acme/app";
const AGENT = "agent-bot";
const DISCUSSION = (id: number) => `https://github.com/acme/app/pull/${PR}#discussion_r${id}`;
const READ_ROUTES: [RegExp, string][] = [
	[/\/pulls\/\d+$/, "pr.json"],
	[/\/issues\/\d+\/comments$/, "issue-comments.json"],
	[/\/pulls\/\d+\/comments$/, "review-comments.json"],
	[/\/pulls\/\d+\/reviews$/, "reviews.json"],
];
const EMPTY_REPORT = {
	clean: false,
	unloggedComments: [],
	threadsNeedingReply: [],
	missingHeadings: [],
	badLogLines: [],
	truncatedThreads: false,
};
const SCRIPT = RECONCILE_SCRIPT.split(path.sep).join("/");
const MISSES_LOG = ".prism/metrics/review-misses.jsonl";
const ASK_FOR_PR_LINE =
	'End your report with the line "prism-pr: <n>" naming the PR you reviewed, so this stop reconciles that PR.';
const askAgain = (pr: number) =>
	`End your report with the line "prism-pr: ${pr}", so the next stop checks the same PR.`;

const TEMP_ROOTS: string[] = [];
const SPAWNED_COUNTERS: string[] = [];

after(() => {
	for (const root of TEMP_ROOTS) rmSync(root, { recursive: true, force: true });
	for (const file of SPAWNED_COUNTERS) rmSync(file, { force: true });
});

function makeTemp(prefix: string) {
	const root = mkdtempSync(path.join(os.tmpdir(), prefix));
	TEMP_ROOTS.push(root);

	return root;
}

/** A git repo the gate reads as this repo's root, plus a state dir. */
function makeRepo() {
	const repoRoot = makeTemp("reconcile-gate-repo-");
	const git = (...args: string[]) =>
		spawnSync("git", args, { cwd: repoRoot, encoding: "utf8" });
	git("init", "-q");
	git("config", "user.name", "Test");
	git("config", "user.email", "test@example.com");
	git("config", "commit.gpgsign", "false");
	mkdirSync(path.join(repoRoot, ".prism", "architect"), { recursive: true });
	writeFileSync(path.join(repoRoot, ".prism", "architect", "manifest.json"), "{}");

	return {
		repoRoot,
		stateDir: makeTemp("reconcile-gate-state-"),
		logPath: path.join(makeTemp("reconcile-gate-misses-"), "misses.jsonl"),
	};
}

/**
 * A stop payload, by default a `prism-pr-review` subagent stop whose report
 * names `PR`. A null `agentType` or `message` leaves that field out.
 */
function stopPayload(
	cwd: string,
	{
		event = "SubagentStop",
		active = false,
		agentType = "prism-pr-review",
		message = `Review done.\nprism-pr: ${PR}`,
		session = "s-1",
	}: {
		event?: string;
		active?: boolean;
		agentType?: string | null;
		message?: string | null;
		session?: string;
	} = {}
): HookPayload {
	return {
		hook_event_name: event,
		session_id: session,
		cwd,
		stop_hook_active: active,
		...(agentType === null ? {} : { agent_type: agentType }),
		...(message === null ? {} : { last_assistant_message: message }),
	};
}

/**
 * A read-only fake `gh api` over the recorded reconcile fixtures. A file the
 * case lacks is read from `_default`.
 */
function fixtureGh(caseName: string) {
	const load = (file: string): unknown =>
		structuredClone(FIXTURES[caseName]?.[file] ?? FIXTURES["_default"]?.[file]);

	return (args: string[]): unknown => {
		if (args.includes("graphql")) return load("threads.graphql.json");

		const route = args.find((arg) => arg.startsWith("repos/")) ?? "";
		const match = READ_ROUTES.find(([pattern]) => pattern.test(route));
		if (!match) throw new Error(`no fixture for ${route}`);

		const data = load(match[1]);

		return args.includes("--slurp") ? [data] : data;
	};
}

/** Runs the real reconcile over a fixture case and returns its JSON report. */
function liveReport(caseName: string, logPath: string) {
	return toJsonReport(
		reconcile({
			pr: PR,
			repo: REPO,
			gh: fixtureGh(caseName),
			git: () => "",
			agentLogin: AGENT,
			logPath,
			templatePath: TEMPLATE,
			write: false,
		})
	);
}

type ExecCallback = (error: Error | null, stdout: string, stderr: string) => void;
type Stub = { file: string; args: string[]; cwd: string | undefined };

/**
 * A stub of `execFile`'s callback form. The reconcile call answers with
 * `report()`, exiting 1 the way reconcile does when the report is unclean.
 */
function stubExec({
	report = () => ({ ...EMPTY_REPORT, clean: true }) as unknown,
}: { report?: () => unknown } = {}) {
	const calls: Stub[] = [];
	const timeouts: unknown[] = [];
	const exec = (
		file: string,
		args: string[],
		options: Record<string, unknown>,
		callback: ExecCallback
	) => {
		calls.push({ file, args, cwd: options["cwd"] as string | undefined });
		timeouts.push(options["timeout"]);
		const body = report();
		const stdout = typeof body === "string" ? body : JSON.stringify(body);
		if ((body as { clean?: boolean } | null)?.clean === true) {
			return callback(null, stdout, "");
		}

		return callback(Object.assign(new Error("exit 1"), { code: 1 }), stdout, "");
	};

	return { exec, calls, timeouts };
}

function readHookLog(repoRoot: string): Record<string, unknown>[] {
	const file = path.join(repoRoot, ".git", "prism-hooks.jsonl");
	if (!existsSync(file)) return [];

	return readFileSync(file, "utf8")
		.split("\n")
		.filter(Boolean)
		.map((line) => JSON.parse(line));
}

function seedCounter(stateDir: string, tool: string, session: string, state: unknown) {
	const file = path.join(stateDir, tool, `${session}.json`);
	mkdirSync(path.dirname(file), { recursive: true });
	writeFileSync(file, JSON.stringify(state));

	return file;
}

// --- Three legs ---

test("reconcile gate leg 1: an unclean report blocks and lists each item", async () => {
	const { repoRoot, stateDir, logPath } = makeRepo();
	const { exec, calls } = stubExec({
		report: () => liveReport("same-login-human", logPath),
	});

	const result = await runGate(stopPayload(repoRoot), {
		tool: "claude",
		exec,
		stateDir,
	});

	assert.deepEqual(result, {
		decision: "block",
		reason: [
			`Classify these 1 human comments and append review-misses rows: ${DISCUSSION(3001)}`,
			`Reply to these 1 review threads: ${DISCUSSION(3001)}`,
			askAgain(PR),
		].join("\n"),
	});
	assert.deepEqual(calls, [
		{
			file: process.execPath,
			args: [RECONCILE_SCRIPT, String(PR), "--json"],
			cwd: repoRoot,
		},
	]);
});

test("reconcile gate leg 2: a counter seeded at 3 lets the stop through and logs reconcile:unclean", async () => {
	const { repoRoot, stateDir } = makeRepo();
	const counter = seedCounter(stateDir, "claude", "s-1", { count: 3, pr: PR });
	const { exec } = stubExec({ report: () => EMPTY_REPORT });
	const at = new Date("2026-11-02T15:00:00.000Z");

	const result = await runGate(stopPayload(repoRoot, { active: true }), {
		tool: "claude",
		exec,
		now: () => at,
		stateDir,
	});

	assert.deepEqual(result, { decision: "pass" });
	assert.equal(existsSync(counter), false);
	assert.deepEqual(readHookLog(repoRoot), [
		{
			ts: "2026-11-02T15:00:00.000Z",
			hook: "reconcile-gate",
			tool: "claude",
			note: "reconcile:unclean",
			pr: PR,
		},
	]);
});

/** The runtime files the gate imports, copied beside a reconcile stub. */
function makeRuntimeCopy() {
	const runtime = makeTemp("reconcile-gate-runtime-");
	for (const file of [
		"reconcile-gate.mjs",
		"harnesses.mjs",
		"architect-route.mjs",
		path.join("lib", "match.mjs"),
		path.join("lib", "hook-log.mjs"),
	]) {
		mkdirSync(path.dirname(path.join(runtime, file)), { recursive: true });
		copyFileSync(path.join(HOOKS, file), path.join(runtime, file));
	}

	mkdirSync(path.join(runtime, "review"));
	writeFileSync(
		path.join(runtime, "review", "reconcile.mjs"),
		'process.stdout.write(process.env.STUB_REPORT ?? "{}");\n'
	);

	return path.join(runtime, "reconcile-gate.mjs");
}

function runSpawnedGate(
	gate: string,
	tool: string,
	body: unknown,
	{ report = EMPTY_REPORT as unknown, env = {}, raw = null }: {
		report?: unknown;
		env?: Record<string, string>;
		raw?: string | null;
	} = {}
) {
	const childEnv: NodeJS.ProcessEnv = {
		...process.env,
		STUB_REPORT: JSON.stringify(report),
		...env,
	};
	if (!("PRISM_HOOK_DISABLE" in env)) delete childEnv.PRISM_HOOK_DISABLE;
	if (!("PRISM_HOOK_DENY_DISABLE" in env)) delete childEnv.PRISM_HOOK_DENY_DISABLE;

	const child = spawnSync(
		process.execPath,
		[gate, `--tool=${tool}`, "--event=SubagentStop"],
		{ input: raw ?? JSON.stringify(body), env: childEnv, encoding: "utf8" }
	);
	assert.equal(child.status, 0, child.stderr);

	return child;
}

/** The counter file a spawned gate uses, which lives under the shared temp dir. */
function spawnedCounter(tool: string, session: string) {
	const file = path.join(os.tmpdir(), "prism-hooks", "reconcile", tool, `${session}.json`);
	SPAWNED_COUNTERS.push(file);

	return file;
}

test("reconcile gate leg 3: a clean reconcile run through the spawned gate passes and deletes the counter", () => {
	const gate = makeRuntimeCopy();
	const { repoRoot } = makeRepo();
	const session = `leg3-${process.pid}`;
	const counter = spawnedCounter("claude", session);
	mkdirSync(path.dirname(counter), { recursive: true });
	writeFileSync(counter, JSON.stringify({ count: 1, pr: PR }));

	const child = runSpawnedGate(
		gate,
		"claude",
		stopPayload(repoRoot, { active: true, session }),
		{ report: { ...EMPTY_REPORT, clean: true } }
	);

	assert.equal(child.stdout, "");
	assert.equal(existsSync(counter), false);
});

// --- Block text ---

test("a seeded clean report passes the stop", async () => {
	const { repoRoot, stateDir } = makeRepo();
	const { exec } = stubExec({
		report: () => ({ ...EMPTY_REPORT, clean: true }),
	});

	const result = await runGate(stopPayload(repoRoot), {
		tool: "claude",
		exec,
		stateDir,
	});

	assert.deepEqual(result, { decision: "pass" });
});

test("appending the miss row the block asked for clears the next stop", async () => {
	const { repoRoot, stateDir, logPath } = makeRepo();
	const { exec } = stubExec({
		report: () => liveReport("replied-thread", logPath),
	});
	const first = await runGate(stopPayload(repoRoot), {
		tool: "claude",
		exec,
		stateDir,
	});
	assert.equal(first.decision, "block");

	appendFileSync(
		logPath,
		`${JSON.stringify({
			pr: PR,
			reviewer: AGENT,
			file: "src/example.ts",
			summary: "Asked why the retry count is hard-coded.",
			class: "unexplained constant",
			nearest_pass: "readability",
			comment: DISCUSSION(6001),
			logged_at: "2026-11-02",
		})}\n`
	);
	const retry = await runGate(stopPayload(repoRoot, { active: true }), {
		tool: "claude",
		exec,
		stateDir,
	});

	assert.deepEqual(retry, { decision: "pass" });
});

test("a thread needing a reply blocks with that thread's URL", async () => {
	const { repoRoot, stateDir, logPath } = makeRepo();
	const { exec } = stubExec({
		report: () => liveReport("bot-thread", logPath),
	});

	const result = await runGate(stopPayload(repoRoot), {
		tool: "claude",
		exec,
		stateDir,
	});

	assert.deepEqual(result, {
		decision: "block",
		reason: [
			`Reply to these 1 review threads: ${DISCUSSION(5001)}`,
			askAgain(PR),
		].join("\n"),
	});
});

test("the block relays URLs and never a comment body", async () => {
	const { repoRoot, stateDir, logPath } = makeRepo();
	const { exec } = stubExec({
		report: () => liveReport("replied-thread", logPath),
	});

	const result = await runGate(stopPayload(repoRoot), {
		tool: "claude",
		exec,
		stateDir,
	});

	assert.equal(result.decision, "block");
	assert.doesNotMatch(
		(result as { reason: string }).reason,
		/retry count is hard-coded/
	);
});

test("an unclean report with every list empty blocks and says a write failed", async () => {
	const { repoRoot, stateDir } = makeRepo();
	const { exec } = stubExec({ report: () => EMPTY_REPORT });

	const result = await runGate(stopPayload(repoRoot), {
		tool: "claude",
		exec,
		stateDir,
	});

	assert.deepEqual(result, {
		decision: "block",
		reason: [
			`Reconcile reported PR ${PR} unclean with every list empty, which means one of its GitHub writes failed: a thread reply, a thread resolve, or a label change. Run node ${SCRIPT} ${PR} to see which one.`,
			askAgain(PR),
		].join("\n"),
	});
});

test("failed writes get their own sentence beside the other findings", async () => {
	const { repoRoot, stateDir } = makeRepo();
	const refused = `resolve the thread at ${DISCUSSION(1001)}: HTTP 422 Validation Failed`;
	const { exec } = stubExec({
		report: () => ({
			...EMPTY_REPORT,
			threadsNeedingReply: [{ url: DISCUSSION(5001), path: null, author: "x" }],
			failedWrites: [refused],
		}),
	});

	const result = await runGate(stopPayload(repoRoot), {
		tool: "claude",
		exec,
		stateDir,
	});

	assert.deepEqual(result, {
		decision: "block",
		reason: [
			`Reply to these 1 review threads: ${DISCUSSION(5001)}`,
			`Re-run node ${SCRIPT} ${PR} once for these 1 writes GitHub refused, then report any that still fail: ${refused}`,
			askAgain(PR),
		].join("\n"),
	});
});

test("missing headings, bad log lines, and truncated threads each get a sentence", async () => {
	const { repoRoot, stateDir } = makeRepo();
	const { exec } = stubExec({
		report: () => ({
			...EMPTY_REPORT,
			missingHeadings: ["## Summary", "## Testing"],
			badLogLines: [2, 7],
			truncatedThreads: true,
		}),
	});

	const result = await runGate(stopPayload(repoRoot), {
		tool: "claude",
		exec,
		stateDir,
	});

	assert.deepEqual(result, {
		decision: "block",
		reason: [
			"Add these missing PR body headings: ## Summary, ## Testing",
			`Fix these unparseable lines in ${MISSES_LOG}: 2, 7`,
			"The PR has more than 100 review threads, and reconcile reads only the first 100, so check the rest by hand.",
			askAgain(PR),
		].join("\n"),
	});
});

// --- Retry count ---

test("three unclean stops block, the fourth passes and logs reconcile:unclean", async () => {
	const { repoRoot, stateDir } = makeRepo();
	const { exec } = stubExec({ report: () => EMPTY_REPORT });
	const at = new Date("2026-11-02T15:00:00.000Z");
	const stop = (active: boolean) =>
		runGate(stopPayload(repoRoot, { active }), {
			tool: "claude",
			exec,
			now: () => at,
			stateDir,
		});

	const decisions = [];
	decisions.push((await stop(false)).decision);
	decisions.push((await stop(true)).decision);
	decisions.push((await stop(true)).decision);
	assert.deepEqual(readHookLog(repoRoot), []);
	decisions.push((await stop(true)).decision);

	assert.deepEqual(decisions, ["block", "block", "block", "pass"]);
	assert.deepEqual(readHookLog(repoRoot), [
		{
			ts: "2026-11-02T15:00:00.000Z",
			hook: "reconcile-gate",
			tool: "claude",
			note: "reconcile:unclean",
			pr: PR,
		},
	]);
});

test("a stop with stop_hook_active false starts the count over", async () => {
	const { repoRoot, stateDir } = makeRepo();
	const { exec } = stubExec({ report: () => EMPTY_REPORT });
	const stop = (active: boolean) =>
		runGate(stopPayload(repoRoot, { active }), {
			tool: "claude",
			exec,
			stateDir,
		});

	await stop(false);
	await stop(true);
	await stop(true);
	const decisions = [];
	for (const active of [false, true, true, true]) {
		decisions.push((await stop(active)).decision);
	}

	assert.deepEqual(decisions, ["block", "block", "block", "pass"]);
});

test("a counter it can't write lets the stop through", async () => {
	const { repoRoot } = makeRepo();
	const blocker = path.join(makeTemp("reconcile-gate-file-"), "not-a-dir");
	writeFileSync(blocker, "");
	const { exec } = stubExec({ report: () => EMPTY_REPORT });

	const result = await runGate(stopPayload(repoRoot), {
		tool: "claude",
		exec,
		stateDir: blocker,
	});

	assert.deepEqual(result, { decision: "pass" });
});

test("the counter is written through a temp file that is renamed away", async () => {
	const { repoRoot, stateDir } = makeRepo();
	const { exec } = stubExec({ report: () => EMPTY_REPORT });

	await runGate(stopPayload(repoRoot), { tool: "claude", exec, stateDir });

	const dir = path.join(stateDir, "claude");
	assert.deepEqual(
		JSON.parse(readFileSync(path.join(dir, "s-1.json"), "utf8")),
		{ count: 1, pr: PR }
	);
	assert.deepEqual(readdirSync(dir), ["s-1.json"]);
});

// --- Scope ---

test("a main-session Stop passes without a reconcile call", async () => {
	for (const message of [null, `prism-pr: ${PR}`]) {
		const { repoRoot, stateDir } = makeRepo();
		const { exec, calls } = stubExec({ report: () => EMPTY_REPORT });

		const result = await runGate(
			stopPayload(repoRoot, { event: "Stop", agentType: null, message }),
			{ tool: "claude", exec, stateDir }
		);

		assert.deepEqual(result, { decision: "pass" }, String(message));
		assert.deepEqual(calls, [], String(message));
	}
});

test("a stop from another agent type passes without a reconcile call", async () => {
	const { repoRoot, stateDir } = makeRepo();
	const { exec, calls } = stubExec({ report: () => EMPTY_REPORT });

	const result = await runGate(
		stopPayload(repoRoot, { agentType: "prism-verify" }),
		{ tool: "claude", exec, stateDir }
	);

	assert.deepEqual(result, { decision: "pass" });
	assert.deepEqual(calls, []);
});

test("a SubagentStop from prism-pr-review runs the gate", async () => {
	const { repoRoot, stateDir } = makeRepo();
	const { exec } = stubExec({ report: () => EMPTY_REPORT });

	const result = await runGate(stopPayload(repoRoot), {
		tool: "claude",
		exec,
		stateDir,
	});

	assert.equal(result.decision, "block");
});

test("an event other than SubagentStop passes without a reconcile call", async () => {
	const { repoRoot, stateDir } = makeRepo();
	const { exec, calls } = stubExec({ report: () => EMPTY_REPORT });

	const result = await runGate(stopPayload(repoRoot, { event: "PreToolUse" }), {
		tool: "claude",
		exec,
		stateDir,
	});

	assert.deepEqual(result, { decision: "pass" });
	assert.deepEqual(calls, []);
});

test("a session outside this repo passes without a reconcile call", async () => {
	const { stateDir } = makeRepo();
	const { exec, calls } = stubExec({ report: () => EMPTY_REPORT });

	const result = await runGate(stopPayload(makeTemp("reconcile-gate-out-")), {
		tool: "claude",
		exec,
		stateDir,
	});

	assert.deepEqual(result, { decision: "pass" });
	assert.deepEqual(calls, []);
});

test("a Codex review stop runs the gate, and a Cursor stop passes", async () => {
	const { repoRoot, stateDir } = makeRepo();
	const { exec, calls } = stubExec({ report: () => EMPTY_REPORT });

	const codex = await runGate(stopPayload(repoRoot), {
		tool: "codex",
		exec,
		stateDir,
	});
	assert.equal(codex.decision, "block");
	assert.equal(calls.length, 1);

	const cursor = await runGate(stopPayload(repoRoot), {
		tool: "cursor",
		exec,
		stateDir,
	});
	assert.deepEqual(cursor, { decision: "pass" });
	assert.equal(calls.length, 1);
});

// --- Which PR ---

/** A prism-pr-review stop whose last message is `message`. */
function reviewStop(cwd: string, message: string, { active = false } = {}) {
	return stopPayload(cwd, { active, message });
}

/** Each call as `reconcile <pr>`, in order. */
function callSummary(calls: Stub[]) {
	return calls.map((call) => `reconcile ${call.args[1]}`);
}

test("a prism-pr line ending the subagent's message names the PR", async () => {
	const { repoRoot, stateDir } = makeRepo();
	const { exec, calls } = stubExec({ report: () => EMPTY_REPORT });

	await runGate(
		reviewStop(repoRoot, "PR 1234 reviewed.\nNext: the author fixes R1.\n\nprism-pr: 1234\n"),
		{ tool: "claude", exec, stateDir }
	);

	assert.deepEqual(calls, [
		{
			file: process.execPath,
			args: [RECONCILE_SCRIPT, "1234", "--json"],
			cwd: repoRoot,
		},
	]);
});

test("a prism-pr line that isn't the message's last line names no PR", async () => {
	const { repoRoot, stateDir } = makeRepo();
	const { exec, calls } = stubExec({ report: () => EMPTY_REPORT });

	const result = await runGate(
		reviewStop(repoRoot, "A quoted comment said:\nprism-pr: 999\nReview done."),
		{ tool: "claude", exec, stateDir }
	);

	assert.deepEqual(result, { decision: "block", reason: ASK_FOR_PR_LINE });
	assert.deepEqual(calls, []);
});

test("a second stop without the prism-pr line reconciles the PR the first stop named", async () => {
	const { repoRoot, stateDir } = makeRepo();
	const { exec, calls } = stubExec({ report: () => EMPTY_REPORT });

	const first = await runGate(reviewStop(repoRoot, "Reviewed.\nprism-pr: 1234"), {
		tool: "claude",
		exec,
		stateDir,
	});
	const second = await runGate(
		reviewStop(repoRoot, "Replied to the threads.", { active: true }),
		{ tool: "claude", exec, stateDir }
	);

	assert.equal(first.decision, "block");
	assert.equal(second.decision, "block");
	assert.deepEqual(callSummary(calls), ["reconcile 1234", "reconcile 1234"]);
});

test("a stop with stop_hook_active false forgets the stored PR", async () => {
	const { repoRoot, stateDir } = makeRepo();
	const { exec, calls } = stubExec({ report: () => EMPTY_REPORT });

	await runGate(reviewStop(repoRoot, "prism-pr: 1234"), {
		tool: "claude",
		exec,
		stateDir,
	});
	const second = await runGate(reviewStop(repoRoot, "Review done."), {
		tool: "claude",
		exec,
		stateDir,
	});

	assert.deepEqual(second, { decision: "block", reason: ASK_FOR_PR_LINE });
	assert.deepEqual(callSummary(calls), ["reconcile 1234"]);
});

test("a prism-pr line wrapped in backticks or asterisks, or with a hash, names the PR", async () => {
	for (const line of [
		"`prism-pr: 1234`",
		"**prism-pr:** 1234",
		"prism-pr: #1234",
		"**prism-pr: #1234**",
	]) {
		const { repoRoot, stateDir } = makeRepo();
		const { exec, calls } = stubExec({ report: () => EMPTY_REPORT });

		await runGate(reviewStop(repoRoot, `Review done.\n${line}\n`), {
			tool: "claude",
			exec,
			stateDir,
		});

		assert.deepEqual(callSummary(calls), ["reconcile 1234"], line);
	}
});

test("a PR line with another prefix or a non-number names no PR", async () => {
	for (const line of ["review-pr: 1234", "pr: 1234", "prism-pr: abc"]) {
		const { repoRoot, stateDir } = makeRepo();
		const { exec, calls } = stubExec({ report: () => EMPTY_REPORT });

		const result = await runGate(reviewStop(repoRoot, `Review done.\n${line}`), {
			tool: "claude",
			exec,
			stateDir,
		});

		assert.deepEqual(result, { decision: "block", reason: ASK_FOR_PR_LINE }, line);
		assert.deepEqual(calls, [], line);
	}
});

test("a first SubagentStop with no prism-pr line blocks once asking for it, with no reconcile call", async () => {
	const { repoRoot, stateDir } = makeRepo();
	const { exec, calls } = stubExec({ report: () => EMPTY_REPORT });

	const first = await runGate(reviewStop(repoRoot, "Review done."), {
		tool: "claude",
		exec,
		stateDir,
	});
	const second = await runGate(
		reviewStop(repoRoot, "Still no line.", { active: true }),
		{ tool: "claude", exec, stateDir }
	);

	assert.deepEqual(first, { decision: "block", reason: ASK_FOR_PR_LINE });
	assert.deepEqual(second, { decision: "pass" });
	assert.deepEqual(calls, []);
});

test("a second SubagentStop with no prism-pr line removes the stored state", async () => {
	const { repoRoot, stateDir } = makeRepo();
	const { exec } = stubExec({ report: () => EMPTY_REPORT });
	const counter = path.join(stateDir, "claude", "s-1.json");

	await runGate(reviewStop(repoRoot, "Review done."), {
		tool: "claude",
		exec,
		stateDir,
	});
	assert.ok(existsSync(counter));

	await runGate(reviewStop(repoRoot, "Still no line.", { active: true }), {
		tool: "claude",
		exec,
		stateDir,
	});

	assert.equal(existsSync(counter), false);
});

test("answering the ask with a prism-pr line reconciles that PR", async () => {
	const { repoRoot, stateDir } = makeRepo();
	const { exec, calls } = stubExec({ report: () => EMPTY_REPORT });

	await runGate(reviewStop(repoRoot, "Review done."), {
		tool: "claude",
		exec,
		stateDir,
	});
	const answer = await runGate(
		reviewStop(repoRoot, "Review done.\nprism-pr: 1234", { active: true }),
		{ tool: "claude", exec, stateDir }
	);

	assert.equal(answer.decision, "block");
	assert.deepEqual(callSummary(calls), ["reconcile 1234"]);
});

test("a clean pass removes the stored count and PR", async () => {
	const { repoRoot, stateDir } = makeRepo();
	let clean = false;
	const { exec } = stubExec({ report: () => ({ ...EMPTY_REPORT, clean }) });
	const counter = path.join(stateDir, "claude", "s-1.json");

	await runGate(reviewStop(repoRoot, "prism-pr: 1234"), {
		tool: "claude",
		exec,
		stateDir,
	});
	assert.ok(existsSync(counter));

	clean = true;
	const result = await runGate(
		reviewStop(repoRoot, "prism-pr: 1234", { active: true }),
		{ tool: "claude", exec, stateDir }
	);

	assert.deepEqual(result, { decision: "pass" });
	assert.equal(existsSync(counter), false);
});

test("a SubagentStop block ends by asking for the prism-pr line", async () => {
	const { repoRoot, stateDir } = makeRepo();
	const { exec } = stubExec({
		report: () => ({
			...EMPTY_REPORT,
			threadsNeedingReply: [{ url: DISCUSSION(5001), path: null, author: "x" }],
		}),
	});

	const result = await runGate(reviewStop(repoRoot, "prism-pr: 1234"), {
		tool: "claude",
		exec,
		stateDir,
	});

	assert.deepEqual(result, {
		decision: "block",
		reason: [
			`Reply to these 1 review threads: ${DISCUSSION(5001)}`,
			'End your report with the line "prism-pr: 1234", so the next stop checks the same PR.',
		].join("\n"),
	});
});

// --- Reconcile call ---

test("the gate's inner time limit fits under a 120 s registration with 10 s spare", async () => {
	const { repoRoot, stateDir } = makeRepo();
	const { exec, timeouts } = stubExec({
		report: () => ({ ...EMPTY_REPORT, clean: true }),
	});

	await runGate(stopPayload(repoRoot), { tool: "claude", exec, stateDir });

	assert.equal(timeouts.length, 1);
	const [timeout] = timeouts;
	assert.ok(Number.isInteger(timeout) && (timeout as number) > 0);
	assert.ok((timeout as number) <= 110_000, `inner limit is ${String(timeout)} ms`);
});

test("reconcile output that isn't a report passes the stop", async () => {
	const { repoRoot, stateDir } = makeRepo();
	const { exec } = stubExec({ report: () => "Error: gh api failed\n" });

	const result = await runGate(stopPayload(repoRoot), {
		tool: "claude",
		exec,
		stateDir,
	});

	assert.deepEqual(result, { decision: "pass" });
});

// --- Command line ---

test("the spawned gate writes the block envelope for the harness it serves", () => {
	const gate = makeRuntimeCopy();
	const { repoRoot } = makeRepo();

	for (const tool of ["claude", "codex"]) {
		const session = `envelope-${tool}-${process.pid}`;
		spawnedCounter(tool, session);

		const child = runSpawnedGate(gate, tool, stopPayload(repoRoot, { session }));

		const body = JSON.parse(child.stdout);
		assert.equal(body.decision, "block", tool);
		assert.equal(
			body.reason.split("\n").at(-1),
			askAgain(PR),
			tool
		);
	}
});

test("leg 1's payload passes under each kill switch", () => {
	const gate = makeRuntimeCopy();
	const { repoRoot } = makeRepo();

	for (const switchName of ["PRISM_HOOK_DISABLE", "PRISM_HOOK_DENY_DISABLE"]) {
		const session = `switch-${switchName}-${process.pid}`;
		const counter = spawnedCounter("claude", session);

		const child = runSpawnedGate(gate, "claude", stopPayload(repoRoot, { session }), {
			env: { [switchName]: "1" },
		});

		assert.equal(child.stdout, "", switchName);
		assert.equal(existsSync(counter), false, switchName);
	}
});

test("a crash fails open: malformed JSON on stdin writes nothing to stdout and one stderr line", () => {
	const gate = makeRuntimeCopy();

	const child = runSpawnedGate(gate, "claude", null, { raw: "not json" });

	assert.equal(child.stdout, "");
	const stderrLines = child.stderr.trim().split("\n");
	assert.equal(stderrLines.length, 1);
	assert.match(stderrLines[0] ?? "", /^reconcile-gate:/);
});

test("an unknown --tool exits 0 with no output and one stderr line", () => {
	const gate = makeRuntimeCopy();

	const child = spawnSync(process.execPath, [gate, "--tool=vim"], {
		input: "{}",
		encoding: "utf8",
	});

	assert.equal(child.status, 0);
	assert.equal(child.stdout, "");
	assert.match(child.stderr, /^reconcile-gate: unknown or missing --tool "vim"/);
});
