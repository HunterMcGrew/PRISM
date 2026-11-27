/**
 * Contract for `hooks/review/reconcile.mjs`: it tells agent comments from
 * human ones by the `<!-- prism-agent -->` marker, resolves addressed agent
 * threads, and reports what is still unclean.
 * Every `gh` and `git` call is a fake over the recorded cases in
 * `review-reconcile.fixtures.json`, keyed by case name and then by the file
 * name a case would hold on disk.
 */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

import fixtureData from "./review-reconcile.fixtures.json";
import {
	isAgent,
	isAuthorNote,
	isBot,
	isHuman,
	missingHeadings,
	needsReply,
	openClasses,
	ownAddressed,
	readLog,
	readsAsAgent,
	reconcile,
	toJsonReport,
} from "./hooks/review/reconcile.mjs";
import type { Comment } from "./hooks/review/reconcile.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, "hooks", "review", "reconcile.mjs");
const PRISM_ROOT = path.resolve(HERE, "..", "..");
const TEMPLATE = path.join(PRISM_ROOT, ".prism", "templates", "pr-description.md");
const FIXTURES = fixtureData as Record<string, Record<string, unknown>>;
const REPO = "acme/app";
const PR = 2847;
const AGENT = "agent-bot";
const ROUTE = `repos/${REPO}`;
const CANNED_SHA = "5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f";
const BLOCKED_BODY =
	'{"message":"GitHub GraphQL is not available from Claude Code sessions"}';
const READ_ROUTES: [RegExp, string][] = [
	[/\/pulls\/\d+$/, "pr.json"],
	[/\/issues\/\d+\/comments$/, "issue-comments.json"],
	[/\/pulls\/\d+\/comments$/, "review-comments.json"],
	[/\/pulls\/\d+\/reviews$/, "reviews.json"],
	[/\/ccr\/review_threads$/, "threads.ccr.json"],
];

const scratchDir = fs.mkdtempSync(path.join(os.tmpdir(), "reconcile-"));

after(() => {
	fs.rmSync(scratchDir, { recursive: true, force: true });
});

interface Write {
	method: string;
	route: string | undefined;
	fields: Record<string, string | string[]>;
}

/** Host markers that would change what a spawned process believes it runs in. */
function cleanEnv(): NodeJS.ProcessEnv {
	const env: NodeJS.ProcessEnv = { ...process.env };
	for (const key of [
		"CLAUDECODE",
		"CLAUDE_CODE_SESSION_ID",
		"CODEX_THREAD_ID",
		"CODEX_SESSION_ID",
		"CODEX_CI",
		"PRISM_HOOK_DISABLE",
		"PRISM_HOOK_DENY_DISABLE",
	]) {
		delete env[key];
	}

	return env;
}

/**
 * Returns the log path for a case. A case's rows are written under the
 * scratch directory, one JSON line each, and a row held as a string is
 * written raw so a case can carry a line that doesn't parse. A case with no
 * rows gets a path to a file that does not exist.
 */
function logPathFor(caseName: string): string {
	const dir = path.join(scratchDir, caseName);
	const logPath = path.join(dir, "review-misses.jsonl");
	const rows = FIXTURES[caseName]?.["review-misses.jsonl"] as unknown[] | undefined;
	if (rows && !fs.existsSync(logPath)) {
		fs.mkdirSync(dir, { recursive: true });
		fs.writeFileSync(
			logPath,
			`${rows.map((row) => (typeof row === "string" ? row : JSON.stringify(row))).join("\n")}\n`
		);
	}

	return logPath;
}

/**
 * Returns a fake `gh` that answers reads from a fixture case and records
 * every write as `{ method, route, fields }`. A file the case lacks is read
 * from `_default`.
 *
 * `--paginate --slurp` wraps the one recorded page in an array, as `gh` does.
 * With `graphqlBlocked`, the GraphQL thread query throws the cloud-session 403.
 */
function createFakeGh(caseName: string, { graphqlBlocked = false } = {}) {
	const writes: Write[] = [];
	const load = (file: string): unknown => {
		const own = FIXTURES[caseName]?.[file];

		return structuredClone(own ?? FIXTURES["_default"]?.[file]);
	};
	const gh = (args: string[]): unknown => {
		const route = args.find((arg) => arg === "graphql" || arg.startsWith("repos/"));
		const fields = readFields(args);
		if (route === "graphql") {
			if ((fields["query"] as string).startsWith("mutation")) {
				writes.push({ method: "POST", route, fields });

				return {};
			}

			if (graphqlBlocked) {
				throw { status: 403, body: BLOCKED_BODY };
			}

			return load("threads.graphql.json");
		}

		const method = args[args.indexOf("-X") + 1] ?? "GET";
		if (args.includes("-X") && method !== "GET") {
			writes.push({ method, route, fields });

			return {};
		}

		const match = READ_ROUTES.find(([pattern]) => pattern.test(route ?? ""));
		if (!match) {
			throw new Error(`no fixture for ${route}`);
		}

		const data = load(match[1]);

		return args.includes("--slurp") ? [data] : data;
	};

	return { gh, writes };
}

function readFields(args: string[]): Record<string, string | string[]> {
	const fields: Record<string, string | string[]> = {};
	args.forEach((arg, i) => {
		if (arg !== "-f" && arg !== "-F") {
			return;
		}

		const value = args[i + 1] as string;
		const split = value.indexOf("=");
		const key = value.slice(0, split);
		const text = value.slice(split + 1);
		if (key.endsWith("[]")) {
			fields[key] = [...((fields[key] as string[] | undefined) ?? []), text];
		} else {
			fields[key] = text;
		}
	});

	return fields;
}

function runCase(caseName: string, options: { graphqlBlocked?: boolean; write?: boolean } = {}) {
	const { gh, writes } = createFakeGh(caseName, options);
	const result = reconcile({
		pr: PR,
		repo: REPO,
		gh,
		git: () => `${CANNED_SHA}\n`,
		agentLogin: AGENT,
		logPath: logPathFor(caseName),
		templatePath: TEMPLATE,
		write: options.write ?? true,
	});

	return { result, writes };
}

const urlsOf = (comments: Comment[]) => comments.map((comment) => comment.html_url);
const discussion = (id: number) => `https://github.com/acme/app/pull/${PR}#discussion_r${id}`;

describe("marker logic", () => {
	const pull = { user: { login: "author-1" } };
	const comment = (login: string, body: string, type = "User"): Comment => ({
		user: { login, type },
		body,
	});

	test("isAgent needs both the marker and the agent's login", () => {
		const marked = "<!-- prism-agent -->\nhi";

		assert.equal(isAgent(comment(AGENT, marked), AGENT), true);
		assert.equal(isAgent(comment(AGENT, "hi"), AGENT), false);
		assert.equal(isAgent(comment("mallory", marked), AGENT), false);
	});

	test("readsAsAgent accepts a marked comment from any non-bot login", () => {
		const marked = "<!-- prism-agent -->\nhi";

		assert.equal(readsAsAgent(comment(AGENT, marked)), true);
		assert.equal(readsAsAgent(comment("reviewer-1", marked)), true);
		assert.equal(readsAsAgent(comment("reviewer-1", "hi")), false);
		assert.equal(readsAsAgent(comment("a[bot]", marked)), false);
	});

	test("another login's marked comment is classified as an agent but passes no write gate", () => {
		const other = comment("reviewer-1", "<!-- prism-agent -->\nhi");
		const opening = { resolved: false, outdated: true, comments: [other] };

		assert.equal(isHuman(other, pull), false);
		assert.equal(needsReply(opening, pull), false);
		assert.equal(isAgent(other, AGENT), false);
		assert.equal(ownAddressed(opening, AGENT), false);
	});

	test("a bot's marked thread still needs a reply", () => {
		const bot = comment("qodo-merge-pro[bot]", "<!-- prism-agent -->\nhi");

		assert.equal(needsReply({ resolved: false, comments: [bot] }, pull), true);
	});

	test("a thread answered by another login's agent needs no reply", () => {
		const thread = {
			resolved: false,
			comments: [
				comment("mallory", "why?"),
				comment("reviewer-1", "<!-- prism-agent -->\nbecause"),
			],
		};

		assert.equal(needsReply(thread, pull), false);
	});

	test("isBot accepts a Bot type or a [bot] login", () => {
		assert.equal(isBot(comment("qodo-merge-pro[bot]", "x")), true);
		assert.equal(isBot(comment("renovate", "x", "Bot")), true);
		assert.equal(isBot(comment(AGENT, "x")), false);
	});

	test("isAuthorNote is an unmarked comment by the PR author", () => {
		assert.equal(isAuthorNote(comment("author-1", "note"), pull), true);
		assert.equal(
			isAuthorNote(comment(AGENT, "<!-- prism-agent -->\nx"), {
				user: { login: AGENT },
			}),
			false
		);
	});

	test("isHuman excludes agents, bots, and author notes", () => {
		assert.equal(isHuman(comment(AGENT, "x"), pull), true);
		assert.equal(isHuman(comment("author-1", "x"), pull), false);
		assert.equal(isHuman(comment("a[bot]", "x"), pull), false);
		assert.equal(isHuman(comment(AGENT, "<!-- prism-agent -->\nx"), pull), false);
	});

	test("needsReply skips resolved threads", () => {
		const thread = { resolved: true, comments: [comment(AGENT, "x")] };

		assert.equal(needsReply(thread, pull), false);
	});

	test("ownAddressed needs an unresolved, outdated agent thread", () => {
		const opening = comment(AGENT, "<!-- prism-agent -->\nx");

		assert.equal(
			ownAddressed({ resolved: false, outdated: true, comments: [opening] }, AGENT),
			true
		);
		assert.equal(
			ownAddressed({ resolved: true, outdated: true, comments: [opening] }, AGENT),
			false
		);
	});

	test("ownAddressed holds back an outdated agent thread while a person has the last word", () => {
		const opening = comment(AGENT, "<!-- prism-agent -->\nx");
		const pushback = comment("author-1", "This is still broken.");
		const answer = comment(AGENT, "<!-- prism-agent -->\nFixed in abc123.");
		const fromBot = comment("ci[bot]", "noted", "Bot");

		assert.equal(
			ownAddressed(
				{ resolved: false, outdated: true, comments: [opening, pushback] },
				AGENT
			),
			false
		);
		assert.equal(
			ownAddressed(
				{ resolved: false, outdated: true, comments: [opening, pushback, answer] },
				AGENT
			),
			true
		);
		assert.equal(
			ownAddressed(
				{ resolved: false, outdated: true, comments: [opening, fromBot] },
				AGENT
			),
			true
		);
	});

	test("a comment carrying thrive's marker and no PRISM marker is human", () => {
		const foreign = comment("reviewer-1", "<!-- thrive-agent -->\nhi");

		assert.equal(readsAsAgent(foreign), false);
		assert.equal(isHuman(foreign, pull), true);
	});
});

describe("reconcile over recorded fixtures", () => {
	test("own-addressed: replies with the marker and the sha, then resolves", () => {
		const { result, writes } = runCase("own-addressed");

		assert.deepEqual(writes, [
			{
				method: "POST",
				route: `${ROUTE}/pulls/${PR}/comments/1001/replies`,
				fields: { body: `<!-- prism-agent -->\naddressed in ${CANNED_SHA}` },
			},
			{
				method: "POST",
				route: "graphql",
				fields: {
					query: writes[1]?.fields["query"],
					id: "PRRT_own1001",
				},
			},
		]);
		assert.match(writes[1]?.fields["query"] as string, /resolveReviewThread/);
		assert.equal(result.code, 0);
	});

	test("own-addressed-pushback: a person's reply blocks the resolve and lists the thread", () => {
		const { result, writes } = runCase("own-addressed-pushback");

		assert.deepEqual(writes, []);
		assert.deepEqual(
			result.findings.needsReply.map((thread) => thread.id),
			["PRRT_own1001"]
		);
		assert.equal(result.code, 1);
	});

	test("agent-thread-open: an agent thread that isn't outdated gets no write", () => {
		const { result, writes } = runCase("agent-thread-open");

		assert.deepEqual(writes, []);
		assert.deepEqual(result.findings.needsReply, []);
		assert.equal(result.code, 0);
	});

	test("agent-thread-pushback: a person's last word on an agent thread that isn't outdated needs a reply", () => {
		const { result, writes } = runCase("agent-thread-pushback");

		assert.deepEqual(writes, []);
		assert.deepEqual(
			result.findings.needsReply.map((thread) => thread.id),
			["PRRT_own1001"]
		);
		assert.equal(result.code, 1);
	});

	test("same-login-human: an unmarked comment under the agent's login needs a reply and is a miss", () => {
		const { result } = runCase("same-login-human");

		assert.equal(result.findings.needsReply.length, 1);
		assert.deepEqual(urlsOf(result.findings.unlogged), [discussion(3001)]);
		assert.equal(result.code, 1);
	});

	test("author-note: the PR author's unmarked thread needs no reply and is not logged", () => {
		const { result } = runCase("author-note");

		assert.deepEqual(result.findings.needsReply, []);
		assert.deepEqual(result.findings.unlogged, []);
		assert.equal(result.code, 0);
	});

	test("bot-thread: an unresolved bot thread needs a reply and is not logged", () => {
		const { result } = runCase("bot-thread");

		assert.equal(result.findings.needsReply.length, 1);
		assert.deepEqual(result.findings.unlogged, []);
		assert.equal(result.code, 1);
	});

	test("replied-thread: a marked reply clears the thread, and the human comment stays unlogged", () => {
		const { result } = runCase("replied-thread");

		assert.deepEqual(result.findings.needsReply, []);
		assert.deepEqual(urlsOf(result.findings.unlogged), [discussion(6001)]);
	});

	test("body-missing-heading: a missing required heading is unclean, a missing optional one is not", () => {
		const { result } = runCase("body-missing-heading");

		assert.deepEqual(result.findings.missingHeadings, ["## Why did you do it?"]);
		assert.equal(result.code, 1);

		const template = fs.readFileSync(TEMPLATE, "utf8");
		const pull = FIXTURES["clean"]?.["pr.json"] as { body: string };
		const withoutNotes = pull.body.replace("## Notes\n\n- None.\n\n", "");

		assert.ok(!withoutNotes.includes("## Notes"));
		assert.deepEqual(missingHeadings(withoutNotes, template), []);
	});

	test("misses-listing: lists only the unlogged comment and reports the bad log line", () => {
		const { result } = runCase("misses-listing");

		assert.deepEqual(urlsOf(result.findings.unlogged), [
			`https://github.com/acme/app/pull/${PR}#issuecomment-9002`,
		]);
		assert.deepEqual(
			result.findings.badLines.map((bad) => bad.line),
			[2]
		);
		assert.ok(result.lines.includes("Existing classes: missed invalidation path"));
		assert.equal(result.code, 1);
	});

	test("graphql-blocked: reads ccr threads and resolves through the ccr route", () => {
		const { result, writes } = runCase("graphql-blocked", { graphqlBlocked: true });

		assert.deepEqual(
			writes.map((write) => `${write.method} ${write.route}`),
			[
				`POST ${ROUTE}/pulls/${PR}/comments/10001/replies`,
				`POST ${ROUTE}/pulls/${PR}/ccr/comments/10001/resolve`,
			]
		);
		assert.equal(result.code, 0);
	});

	test("clean: exits 0 with no writes", () => {
		const { result, writes } = runCase("clean");

		assert.deepEqual(writes, []);
		assert.equal(result.code, 0);
		assert.match(result.lines[0] as string, /: clean$/);
	});

	test("classes: prints only the unresolved class with 3 or more rows", () => {
		const logPath = logPathFor("classes");

		assert.deepEqual(openClasses(readLog(logPath).rows), [
			{
				class: "missing null guard",
				count: 3,
				passes: ["correctness", "none"],
			},
		]);

		const output = execFileSync(process.execPath, [SCRIPT, "--classes", "--log", logPath], {
			encoding: "utf8",
			env: cleanEnv(),
		});

		assert.equal(
			output.trim(),
			"missing null guard: 3 rows, nearest passes correctness, none"
		);
	});

	test("forged-marker: the author's marked thread gets no writes", () => {
		const { result, writes } = runCase("forged-marker");

		assert.deepEqual(writes, []);
		assert.deepEqual(result.findings.needsReply, []);
		assert.deepEqual(result.findings.unlogged, []);
		assert.equal(result.code, 0);
	});

	test("other-agent: another dev's agent is no miss, owes no reply, and gets no writes", () => {
		const { result, writes } = runCase("other-agent");

		assert.deepEqual(writes, []);
		assert.deepEqual(result.findings.needsReply, []);
		assert.deepEqual(result.findings.unlogged, []);
		assert.equal(result.code, 0);
	});

	test("repeat-reply: a thread already holding the reply is only resolved", () => {
		const { result, writes } = runCase("repeat-reply");

		assert.deepEqual(
			writes.map((write) => `${write.method} ${write.route}`),
			["POST graphql"]
		);
		assert.match(writes[0]?.fields["query"] as string, /resolveReviewThread/);
		assert.equal(result.code, 0);
	});

	test("threads-truncated: more than 100 threads is unclean", () => {
		const { result } = runCase("threads-truncated");

		assert.deepEqual(result.findings.unchecked, ["more than 100 threads; not checked"]);
		assert.ok(result.lines.includes("- more than 100 threads; not checked"));
		assert.equal(result.code, 1);
	});

	test("no-write: the own-addressed case records zero writes", () => {
		const { result, writes } = runCase("own-addressed", { write: false });

		assert.deepEqual(writes, []);
		assert.ok(result.actions.some((action) => action.startsWith("would reply")));
		assert.ok(result.actions.some((action) => action.startsWith("would resolve")));
	});

	test("the PR description template defaults to the repo's own, found through git's top level", () => {
		const { gh } = createFakeGh("clean");
		const result = reconcile({
			pr: PR,
			repo: REPO,
			gh,
			git: (args) => (args[0] === "rev-parse" ? `${PRISM_ROOT}\n` : `${CANNED_SHA}\n`),
			agentLogin: AGENT,
			logPath: logPathFor("clean"),
			write: false,
		});

		assert.equal(result.code, 0);
	});
});

describe("reconcile --json report", () => {
	const EXAMPLE_PATH = "src/lib/example.ts";
	const emptyReport = {
		clean: true,
		unloggedComments: [],
		threadsNeedingReply: [],
		missingHeadings: [],
		badLogLines: [],
		truncatedThreads: false,
		failedWrites: [],
	};

	test("clean: reports clean with every list empty and exits 0", () => {
		const { result } = runCase("clean", { write: false });

		assert.deepEqual(toJsonReport(result), emptyReport);
		assert.equal(result.code, 0);
	});

	test("replied-thread: lists the unlogged human comment and exits 1", () => {
		const { result } = runCase("replied-thread", { write: false });

		assert.deepEqual(toJsonReport(result), {
			...emptyReport,
			clean: false,
			unloggedComments: [{ url: discussion(6001), author: AGENT, path: EXAMPLE_PATH }],
		});
		assert.equal(result.code, 1);
	});

	test("bot-thread: lists the thread needing a reply and exits 1", () => {
		const { result } = runCase("bot-thread", { write: false });

		assert.deepEqual(toJsonReport(result), {
			...emptyReport,
			clean: false,
			threadsNeedingReply: [
				{
					url: discussion(5001),
					path: EXAMPLE_PATH,
					author: "qodo-merge-pro[bot]",
				},
			],
		});
		assert.equal(result.code, 1);
	});

	test("same-login-human: lists the comment and the thread separately and exits 1", () => {
		const { result } = runCase("same-login-human", { write: false });

		assert.deepEqual(toJsonReport(result), {
			...emptyReport,
			clean: false,
			unloggedComments: [{ url: discussion(3001), author: AGENT, path: EXAMPLE_PATH }],
			threadsNeedingReply: [{ url: discussion(3001), path: EXAMPLE_PATH, author: AGENT }],
		});
		assert.equal(result.code, 1);
	});

	test("misses-listing: reports a PR-level comment's path as null and the bad log line by number", () => {
		const { result } = runCase("misses-listing", { write: false });
		const report = toJsonReport(result);

		assert.deepEqual(report.unloggedComments, [
			{
				url: `https://github.com/acme/app/pull/${PR}#issuecomment-9002`,
				author: AGENT,
				path: null,
			},
		]);
		assert.deepEqual(report.badLogLines, [2]);
		assert.equal(report.clean, false);
		assert.equal(result.code, 1);
	});

	test("threads-truncated: reports truncatedThreads as true", () => {
		const { result } = runCase("threads-truncated", { write: false });

		assert.equal(toJsonReport(result).truncatedThreads, true);
		assert.equal(result.code, 1);
	});

	test("failed writes: lists each refused write beside the other findings and exits 1", () => {
		const { gh } = createFakeGh("own-addressed");
		const refusing = (args: string[]): unknown => {
			const isWrite =
				(args.includes("-X") && args[args.indexOf("-X") + 1] !== "GET") ||
				args.some((arg) => arg.startsWith("query=mutation"));
			if (isWrite) {
				throw { status: 422, body: "HTTP 422 Validation Failed" };
			}

			return gh(args);
		};
		const result = reconcile({
			pr: PR,
			repo: REPO,
			gh: refusing,
			git: () => `${CANNED_SHA}\n`,
			agentLogin: AGENT,
			logPath: logPathFor("own-addressed"),
			templatePath: TEMPLATE,
		});

		assert.deepEqual(toJsonReport(result), {
			...emptyReport,
			clean: false,
			failedWrites: [
				`reply "addressed in ${CANNED_SHA}" on ${discussion(1001)}: HTTP 422 Validation Failed`,
				`resolve the thread at ${discussion(1001)}: HTTP 422 Validation Failed`,
			],
		});
		assert.equal(result.code, 1);
	});
});

describe("reconcile.mjs command line", () => {
	const run = (args: string[], script = SCRIPT) =>
		spawnSync(process.execPath, [script, ...args], { encoding: "utf8", env: cleanEnv() });

	test("--log with no value exits 2", () => {
		const child = run(["--log"]);

		assert.equal(child.status, 2);
		assert.match(child.stderr, /--log needs a path/);
	});

	test("--log followed by a flag exits 2 instead of taking the flag", () => {
		const child = run(["--log", "--no-write"]);

		assert.equal(child.status, 2);
		assert.match(child.stderr, /--log needs a path/);
	});

	test("--json is a known flag, and the usage line names it", () => {
		const child = run(["--json", "--log", logPathFor("classes")]);

		assert.equal(child.status, 2);
		assert.doesNotMatch(child.stderr, /unknown argument/);
		assert.match(child.stderr, /\[--json\]/);
	});

	test("--classes on a log whose file does not exist prints the empty line and exits 0", () => {
		const child = run(["--classes", "--log", path.join(scratchDir, "no-such-log.jsonl")]);

		assert.equal(child.status, 0, child.stderr);
		assert.equal(child.stdout.trim(), "No open class has 3 or more rows.");
	});

	test("--classes outside a git repository with no --log exits 2 naming the flag", () => {
		const child = spawnSync(process.execPath, [SCRIPT, "--classes"], {
			encoding: "utf8",
			env: cleanEnv(),
			cwd: scratchDir,
		});

		assert.equal(child.status, 2, child.stderr);
		assert.match(child.stderr, /not inside a git repository.*pass --log/);
	});

	test("a large report reaches a pipe whole before the process exits", () => {
		const logPath = path.join(scratchDir, "large-review-misses.jsonl");
		const classes = Array.from(
			{ length: 2000 },
			(_, index) => `class ${String(index).padStart(4, "0")} ${"x".repeat(400)}`
		);
		fs.writeFileSync(
			logPath,
			classes
				.flatMap((name) => [name, name, name])
				.map((name) => JSON.stringify({ class: name }))
				.join("\n")
		);

		const child = run(["--classes", "--log", logPath]);

		assert.equal(child.status, 0, child.stderr);
		assert.equal(child.stdout.trimEnd().split("\n").length, classes.length);
	});

	test("main sets the exit code instead of calling process.exit, which drops queued pipe writes", () => {
		const source = fs.readFileSync(SCRIPT, "utf8");
		const main = source.slice(source.indexOf("function main("));

		assert.doesNotMatch(main, /process\.exit\(/);
	});

	test("runs when invoked through a symlink", (t) => {
		const link = path.join(scratchDir, "reconcile-link.mjs");
		try {
			fs.symlinkSync(SCRIPT, link);
		} catch (error) {
			if (process.platform === "win32" && (error as NodeJS.ErrnoException).code === "EPERM") {
				t.skip("creating a symlink needs a privilege this Windows runner lacks");

				return;
			}

			throw error;
		}

		const child = run(["--classes", "--log", logPathFor("classes")], link);

		assert.equal(child.status, 0, child.stderr);
		assert.match(child.stdout, /missing null guard: 3 rows/);
	});
});

describe("PR argument", () => {
	const logPath = path.join(scratchDir, "pr-argument-misses.jsonl");
	const run = (arg: string) =>
		spawnSync(process.execPath, [SCRIPT, arg, "--classes", "--log", logPath], {
			encoding: "utf8",
			env: cleanEnv(),
		});

	for (const arg of ["#12", "12", "https://github.com/o/r/pull/12"]) {
		test(`accepts ${arg}`, () => {
			const child = run(arg);

			assert.equal(child.status, 0, child.stderr);
		});
	}

	for (const arg of ["0", "007", "abc", "https://github.com/o/r/issues/12", "99999999999999999999"]) {
		test(`rejects ${arg} with exit 2`, () => {
			const child = run(arg);

			assert.equal(child.status, 2, child.stderr);
			assert.match(child.stderr, /unknown argument/);
		});
	}

	for (const pr of [0, 1.5, Number.NaN]) {
		test(`reconcile() throws before any gh call for pr ${String(pr)}`, () => {
			let ghCalls = 0;
			const gh = () => {
				ghCalls += 1;

				return null;
			};

			assert.throws(
				() =>
					reconcile({
						pr,
						repo: "o/r",
						gh,
						git: () => "",
						agentLogin: "me",
						logPath,
					}),
				/positive integer/
			);
			assert.equal(ghCalls, 0);
		});
	}
});
