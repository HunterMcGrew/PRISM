/**
 * Pins the commit gate's entry point: the order its checks run in, the flag
 * denies that hold before any config read, the commands it reads the first
 * commit out of, and the fail-open and kill-switch behavior of the spawned
 * hook. Each case builds a throwaway repo whose branch names a plan folder.
 */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	renameSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { runGate } from "./hooks/commit-gate.mjs";
import type { HookPayload } from "./hooks/harnesses.mjs";

const RUNTIME_PATH = fileURLToPath(new URL("./hooks/", import.meta.url));
// Forward slashes on every platform, because `tokenize` reads a `\` in a
// command string as an escape.
const RUNTIME = RUNTIME_PATH.split(path.sep).join("/").replace(/\/$/, "");
const HOOK = path.join(RUNTIME_PATH, "commit-gate.mjs");
const COMMIT_SCRIPT = path.join(RUNTIME_PATH, "plan", "commit.mjs");
const KILL_SWITCHES = ["PRISM_HOOK_DISABLE", "PRISM_HOOK_DENY_DISABLE"];
const PLAN_DIR = ".prism/plans/prism-1";
const APPROVAL = "status: approved\napproved_by: Test\napproved_at: 2026-11-02";
const CARD = "frontend/components/Card.tsx";
const CARD_TEST = "frontend/components/Card.test.tsx";
const TOOL = "scripts/tool.mjs";
const DEFAULT_TASKS = `### T1: Build the card
- files: ${CARD}, ${CARD_TEST}
- depends on: none

### T2: Build the tool
- files: ${TOOL}
- depends on: none
`;
const BASE_FILES: Record<string, string> = {
	".prism/architect/manifest.json": '{ "code": {}, "authoring": {} }\n',
	".ai-skills/config.json": '{ "ticketPrefix": "PRISM" }\n',
	[CARD]: "export const Card = () => null;\n",
	[CARD_TEST]: 'test("card", () => {\n\texpect(Card).toBeDefined();\n});\n',
	[TOOL]: "export const tool = 1;\n",
	"a.txt": "a\n",
	"b.txt": "b\n",
	"notes.md": "# Notes\n",
	// A test file under a directory named ":", beside a root file the same name
	// reads as through git's `:/` magic. A colon is not a legal Windows name.
	...(process.platform === "win32"
		? {}
		: { ":/x.test.txt": "a\nb\n", "x.test.txt": "a\nb\n" }),
};
const TICKET_SUBJECT = "PRISM-1: Build the card";
const PASS = { decision: "pass" };
// Keeps each fixture repo off the caller's git config and identity.
const GIT_ENV = {
	...process.env,
	GIT_CONFIG_GLOBAL: "/dev/null",
	GIT_CONFIG_NOSYSTEM: "1",
	GIT_AUTHOR_NAME: "Test",
	GIT_AUTHOR_EMAIL: "test@example.com",
	GIT_COMMITTER_NAME: "Test",
	GIT_COMMITTER_EMAIL: "test@example.com",
};
const TEMP_DIRS: string[] = [];

after(() => {
	for (const dir of TEMP_DIRS) rmSync(dir, { recursive: true, force: true });
});

// --- Fixtures ---

function git(cwd: string, ...args: string[]): string {
	return execFileSync("git", args, {
		cwd,
		env: GIT_ENV,
		encoding: "utf8",
	}).trim();
}

function write(repo: string, file: string, text: string): void {
	mkdirSync(path.dirname(path.join(repo, file)), { recursive: true });
	writeFileSync(path.join(repo, file), text);
}

function change(repo: string, ...files: string[]): void {
	for (const file of files) {
		const full = path.join(repo, file);
		writeFileSync(full, `${readFileSync(full, "utf8")}// changed\n`);
	}
}

function planText({
	approved = true,
	tasks = DEFAULT_TASKS,
}: { approved?: boolean; tasks?: string } = {}): string {
	const status = approved ? APPROVAL : "status: draft";

	return `---\ntitle: Test\nticket: PRISM-1\nstage: plan\n${status}\n---\n\n## Tasks\n\n${tasks}\n## Review\n\n## History\n`;
}

/**
 * A repo whose base commit is `origin/main`. `kind` picks what sits on top: a
 * PRISM-1 plan folder (`folder`), a flat PRISM-2 plan (`legacy`), or no
 * architect manifest at all (`foreign`).
 */
function createRepo({
	kind = "folder",
	approved = true,
	tasks = DEFAULT_TASKS,
}: { kind?: string; approved?: boolean; tasks?: string } = {}): string {
	const repo = mkdtempSync(path.join(os.tmpdir(), "commit-gate-hook-"));
	TEMP_DIRS.push(repo);
	git(repo, "init", "-q");
	for (const [file, text] of Object.entries(BASE_FILES)) {
		if (kind === "foreign" && file.startsWith(".prism/architect/")) continue;
		write(repo, file, text);
	}
	if (kind === "folder") {
		write(
			repo,
			`${PLAN_DIR}/intent.md`,
			`---\ntitle: Test\nticket: PRISM-1\nstage: intent\nsize: standard\n${APPROVAL}\n---\n\n## Goal\n\nTest.\n`
		);
		write(repo, `${PLAN_DIR}/plan.md`, planText({ approved, tasks }));
	}
	if (kind === "legacy") {
		write(
			repo,
			".prism/plans/prism-2.md",
			"# PRISM-2\n\n## Implementation Tasks\n\n- [ ] Change the notes\n"
		);
	}
	git(repo, "add", ".");
	git(repo, "commit", "-q", "-m", "PRISM-1: Base");
	git(repo, "update-ref", "refs/remotes/origin/main", "HEAD");
	git(
		repo,
		"checkout",
		"-q",
		"-b",
		kind === "legacy" ? "dev/prism-2-legacy" : "dev/prism-1-test"
	);

	return repo;
}

/** The `node <runtime>/plan/commit.mjs` command that commits `files` under `subject`. */
function commitMjs(subject: string, ...files: string[]): string {
	return `node ${RUNTIME}/plan/commit.mjs "${subject}" ${files.join(" ")}`;
}

/** Removes the test body's assertion line, a weakening no task permits. */
function weaken(repo: string): void {
	write(repo, CARD_TEST, 'test("card", () => {\n});\n');
}

function claudePayload(repo: string, command: string): HookPayload {
	return {
		session_id: "s1",
		hook_event_name: "PreToolUse",
		tool_name: "Bash",
		tool_input: { command },
		cwd: repo,
	};
}

function gate(repo: string, command: string) {
	return runGate(claudePayload(repo, command), { tool: "claude" });
}

function assertDeny(
	result: ReturnType<typeof runGate>,
	name: string,
	pattern: RegExp
): string {
	assert.equal(result.decision, "deny");
	const reason = result.decision === "deny" ? result.reason : "";
	assert.ok(
		reason.startsWith(`Commit gate (${name}): `),
		`expected the ${name} check to deny: ${reason}`
	);
	assert.match(reason, pattern);

	return reason;
}

type Result = { status: number | null; stdout: string; stderr: string };

function runCli(
	repo: string,
	payload: unknown,
	{
		tool = "claude",
		env = {},
		raw = null,
	}: { tool?: string; env?: Record<string, string>; raw?: string | null } = {}
): Result {
	const base: NodeJS.ProcessEnv = { ...GIT_ENV };
	for (const name of KILL_SWITCHES) delete base[name];

	const child = spawnSync(
		process.execPath,
		[HOOK, `--tool=${tool}`, "--event=PreToolUse"],
		{
			cwd: repo,
			env: { ...base, ...env },
			input: raw ?? JSON.stringify(payload),
			encoding: "utf8",
		}
	);

	return { status: child.status, stdout: child.stdout, stderr: child.stderr };
}

// --- Passes ---

test("a command with no commit passes", () => {
	const repo = createRepo();

	assert.deepEqual(gate(repo, "git status -s"), PASS);
});

test("a call that isn't a shell call passes", () => {
	const repo = createRepo();
	const payload = {
		...claudePayload(repo, commitMjs(TICKET_SUBJECT, CARD)),
		tool_name: "Read",
	};

	assert.deepEqual(runGate(payload, { tool: "claude" }), PASS);
});

test("an unknown harness passes", () => {
	const repo = createRepo();

	assert.deepEqual(
		runGate(claudePayload(repo, commitMjs(TICKET_SUBJECT, CARD)), {
			tool: "other",
		}),
		PASS
	);
});

test("a repo whose toplevel has no architect manifest passes", () => {
	const repo = createRepo({ kind: "foreign" });

	assert.deepEqual(gate(repo, "git commit -a -m x"), PASS);
});

// --- The three legs ---

test("commit gate leg 1: git commit -a is denied with the all reason", () => {
	const repo = createRepo();
	change(repo, CARD);

	assertDeny(
		gate(repo, 'git commit -a -m "T1: Build the card"'),
		"stops",
		/`-a` commits every tracked change/
	);
});

test("commit gate leg 2: with a staged sibling file and a folder plan whose T1 lists a.txt, commit.mjs naming a.txt with subject T1: x passes", () => {
	const repo = createRepo({
		tasks: "### T1: Build a\n- files: a.txt\n- depends on: none\n",
	});
	change(repo, "a.txt", "b.txt");
	git(repo, "add", "b.txt");

	assert.deepEqual(gate(repo, commitMjs("T1: x", "a.txt")), PASS);
});

test("commit gate leg 3: the remedy commit.mjs passes the spawned gate and commits only the named path", () => {
	const repo = createRepo({
		tasks: "### T1: Build a\n- files: a.txt\n- depends on: none\n",
	});
	change(repo, "a.txt", "b.txt");
	git(repo, "add", "b.txt");

	const result = runCli(repo, claudePayload(repo, commitMjs("T1: x", "a.txt")));
	assert.equal(result.status, 0, result.stderr);
	assert.equal(result.stdout, "");

	execFileSync(process.execPath, [COMMIT_SCRIPT, "T1: x", "a.txt"], {
		cwd: repo,
		env: GIT_ENV,
		stdio: "ignore",
	});
	assert.equal(git(repo, "show", "--name-only", "--format=", "HEAD"), "a.txt");
	assert.equal(git(repo, "diff", "--cached", "--name-only"), "b.txt");
});

// --- Folder-plan branch ---

test("any subject passes on a folder-plan branch, a ticket subject included", () => {
	const repo = createRepo();
	change(repo, CARD);

	for (const subject of [TICKET_SUBJECT, "T1: Build the card", "committing plan"]) {
		assert.deepEqual(gate(repo, commitMjs(subject, CARD)), PASS, subject);
	}
});

test("a task commit passes and leaves the shared index alone", () => {
	const repo = createRepo();
	change(repo, CARD, TOOL);
	git(repo, "add", TOOL);
	const staged = git(repo, "diff", "--cached", "--name-only");

	assert.deepEqual(gate(repo, commitMjs("T1: Build the card", CARD)), PASS);
	assert.equal(git(repo, "diff", "--cached", "--name-only"), staged);
});

test("a live remedy: naming the path through commit.mjs passes and commits", () => {
	const repo = createRepo();
	change(repo, CARD);

	const denied = gate(repo, 'git commit -m "T1: Build the card"');
	const reason = assertDeny(denied, "stops", /names no paths/);
	assert.match(reason, /Name the paths/);

	assert.deepEqual(gate(repo, commitMjs("T1: Build the card", CARD)), PASS);
	execFileSync(process.execPath, [COMMIT_SCRIPT, "T1: Build the card", CARD], {
		cwd: repo,
		env: GIT_ENV,
		stdio: "ignore",
	});
	assert.equal(git(repo, "log", "-1", "--format=%s"), "T1: Build the card");
});

test("a removed test line is denied whatever the subject, and the flag denies come first", () => {
	const repo = createRepo();
	weaken(repo);

	for (const subject of [TICKET_SUBJECT, "T1: Build the card"]) {
		assertDeny(
			gate(repo, commitMjs(subject, CARD_TEST)),
			"weakened tests",
			/loses 1 line/
		);
	}
	assertDeny(
		gate(repo, `git commit --no-verify -m x -- ${CARD_TEST}`),
		"stops",
		/skips the git hooks/
	);
});

test("a plan: subject naming code passes, a draft plan needs no approval, and the flag denies still run", () => {
	const repo = createRepo({ approved: false });
	const plan = `${PLAN_DIR}/plan.md`;
	change(repo, plan, CARD);

	assert.deepEqual(gate(repo, commitMjs("plan: Draft the plan", plan)), PASS);
	assert.deepEqual(
		gate(repo, commitMjs("plan: Draft the plan", plan, CARD)),
		PASS
	);
	assertDeny(
		gate(repo, `git commit --no-verify -m "plan: Draft" -- ${plan}`),
		"stops",
		/skips the git hooks/
	);
});

test("a config that doesn't parse is denied by the config check", () => {
	const repo = createRepo();
	change(repo, CARD);
	write(repo, ".ai-skills/config.json", "{ not json");

	assertDeny(
		gate(repo, commitMjs("T1: Build the card", CARD)),
		"config",
		/config\.json/
	);
});

// --- Legacy branch ---

test("a flat-plan branch passes a named-path commit and skips the plan checks", () => {
	const repo = createRepo({ kind: "legacy" });
	change(repo, "notes.md");

	assert.deepEqual(
		gate(repo, 'git add notes.md && git commit -m "PRISM-2: x" -- notes.md'),
		PASS
	);
});

test("a flat-plan branch passes a plan: subject naming code, because the subject check needs a plan folder", () => {
	const repo = createRepo({ kind: "legacy" });
	change(repo, CARD);

	assert.deepEqual(gate(repo, commitMjs("plan: Note", CARD)), PASS);
});

// --- Merge, cherry-pick, and revert ---

function createMergeRepo(): string {
	const repo = createRepo();
	git(repo, "checkout", "-q", "-b", "side");
	write(repo, "notes.md", "side\n");
	git(repo, "commit", "-q", "-am", "side");
	git(repo, "checkout", "-q", "dev/prism-1-test");
	write(repo, "notes.md", "ours\n");
	git(repo, "commit", "-q", "-am", "ours");
	spawnSync("git", ["merge", "side"], { cwd: repo, env: GIT_ENV });

	return repo;
}

test("a concluding merge commit passes with no paths", () => {
	const repo = createMergeRepo();
	write(repo, "notes.md", "merged\n");
	git(repo, "add", "notes.md");

	assert.deepEqual(gate(repo, 'git commit -m "Merge side"'), PASS);
});

test("a concluding merge commit still meets the flag denies", () => {
	const repo = createMergeRepo();

	assertDeny(
		gate(repo, 'git commit --no-verify -m "Merge side"'),
		"stops",
		/skips the git hooks/
	);
});

test("a merge-time -a deny names a remedy git accepts mid-merge", () => {
	const repo = createMergeRepo();

	const reason = assertDeny(
		gate(repo, 'git commit -a -m "Merge side"'),
		"stops",
		/then run git commit with no paths/
	);
	assert.doesNotMatch(reason, /git commit -- <path>/);
});

for (const operation of ["cherry-pick", "revert"]) {
	test(`concluding a conflicted ${operation} passes with no paths, and its flags still deny`, () => {
		const repo = createRepo();
		if (operation === "cherry-pick") {
			git(repo, "checkout", "-q", "-b", "side");
			write(repo, "notes.md", "side\n");
			git(repo, "commit", "-q", "-am", "side");
			git(repo, "checkout", "-q", "dev/prism-1-test");
			write(repo, "notes.md", "ours\n");
			git(repo, "commit", "-q", "-am", "ours");
			spawnSync("git", ["cherry-pick", "side"], { cwd: repo, env: GIT_ENV });
		} else {
			write(repo, "notes.md", "one\n");
			git(repo, "commit", "-q", "-am", "one");
			write(repo, "notes.md", "two\n");
			git(repo, "commit", "-q", "-am", "two");
			spawnSync("git", ["revert", "--no-edit", "HEAD~1"], {
				cwd: repo,
				env: GIT_ENV,
			});
		}
		write(repo, "notes.md", "resolved\n");
		git(repo, "add", "notes.md");

		assert.deepEqual(gate(repo, 'git commit -m "Conclude"'), PASS);
		assertDeny(
			gate(repo, 'git commit --no-verify -m "Conclude"'),
			"stops",
			/skips the git hooks/
		);
	});
}

// --- Flag denies ---

test("the flag denies are judged before the index is built", () => {
	const repo = createRepo();

	assertDeny(
		gate(repo, 'git commit --no-verify -m "T1: x" -- missing.txt'),
		"stops",
		/skips the git hooks/
	);
});

test("the flags of a commit a runner hands to a shell string are judged", () => {
	const repo = createRepo();

	for (const command of [
		"sudo sh -c 'git commit --no-verify -m x -- a'",
		"pnpm exec sh -c 'git commit --no-verify -m x -- a'",
		"xargs sh -c 'git commit --no-verify -m x -- a'",
		"find . -exec sh -c 'git commit --no-verify -m x -- a' \\;",
	]) {
		assertDeny(gate(repo, command), "stops", /skips the git hooks/);
	}
});

test("a cd into a directory that doesn't exist runs only the flag denies", () => {
	const repo = createRepo();
	change(repo, CARD);

	assert.deepEqual(
		gate(repo, `cd nowhere && git commit -m "${TICKET_SUBJECT}" -- ${CARD}`),
		PASS
	);
	assertDeny(
		gate(repo, "cd nowhere && git commit --no-verify -m x -- a"),
		"stops",
		/skips the git hooks/
	);
});

test("a Codex argv array is read", () => {
	const repo = createRepo();
	change(repo, CARD);
	const payload = {
		session_id: "s1",
		hook_event_name: "PreToolUse",
		tool_name: "Bash",
		tool_input: {
			command: [
				"bash",
				"-lc",
				"git commit --no-verify -m x -- a",
			] as unknown as string,
		},
		cwd: repo,
	};

	assertDeny(
		runGate(payload, { tool: "codex" }),
		"stops",
		/skips the git hooks/
	);
});

// --- Kill switches ---

test("a command that sets a kill switch inline is denied", () => {
	const repo = createRepo();
	const foreign = createRepo({ kind: "foreign" });

	for (const command of [
		"PRISM_HOOK_DISABLE=1 git commit -m x -- a",
		"export PRISM_HOOK_DENY_DISABLE=1 && git status",
		"env PRISM_HOOK_DISABLE=1 true",
	]) {
		for (const dir of [repo, foreign]) {
			assertDeny(
				gate(dir, command),
				"stops",
				/turns the agent hooks off/
			);
		}
	}
});

test("either kill switch in the hook's environment passes leg 1's payload and reads no stdin", () => {
	const repo = createRepo();
	change(repo, CARD);
	const payload = claudePayload(repo, 'git commit -a -m "T1: Build the card"');

	const denied = runCli(repo, payload);
	assert.equal(JSON.parse(denied.stdout).hookSpecificOutput.permissionDecision, "deny");

	for (const name of KILL_SWITCHES) {
		const result = runCli(repo, payload, { env: { [name]: "1" } });
		assert.equal(result.status, 0, name);
		assert.equal(result.stdout, "", name);
		assert.equal(result.stderr, "", name);

		const unread = runCli(repo, null, { env: { [name]: "1" }, raw: "not json" });
		assert.equal(unread.stderr, "", `${name} read stdin`);
	}
});

// --- The CLI entry ---

test("a Claude deny envelope is written to stdout", () => {
	const repo = createRepo();
	weaken(repo);
	const result = runCli(repo, claudePayload(repo, commitMjs("T1: x", CARD_TEST)));

	assert.equal(result.status, 0);
	const body = JSON.parse(result.stdout);
	assert.equal(body.hookSpecificOutput.permissionDecision, "deny");
	assert.match(
		body.hookSpecificOutput.permissionDecisionReason,
		/^Commit gate \(weakened tests\): /
	);
});

test("a crash fails open: malformed JSON on stdin writes nothing to stdout and one stderr line", () => {
	const repo = createRepo();
	const result = runCli(repo, null, { raw: "not json" });

	assert.equal(result.status, 0);
	assert.equal(result.stdout, "");
	assert.match(result.stderr, /^commit-gate: [^\n]*\n$/);
});

test("an unknown --tool fails open with one stderr line", () => {
	const repo = createRepo();
	const result = runCli(repo, {}, { tool: "vim" });

	assert.equal(result.status, 0);
	assert.equal(result.stdout, "");
	assert.match(result.stderr, /^commit-gate: unknown or missing --tool "vim"[^\n]*\n$/);
});

test(
	"a git call that hangs is given up on after 5 s and the commit passes",
	{ skip: process.platform === "win32" },
	() => {
		const repo = createRepo();
		const bin = mkdtempSync(path.join(os.tmpdir(), "commit-gate-bin-"));
		TEMP_DIRS.push(bin);
		writeFileSync(path.join(bin, "git"), "#!/bin/sh\nexec sleep 10\n", {
			mode: 0o755,
		});
		const started = Date.now();

		const result = runCli(
			repo,
			claudePayload(repo, "git commit -m x -- a"),
			{ env: { PATH: `${bin}:${process.env.PATH}` } }
		);

		assert.equal(result.status, 0);
		assert.equal(result.stdout, "");
		assert.ok(Date.now() - started < 9000, "the hook waited out the sleep");
	}
);

// --- Pushes ---

test("a push that skips the pre-push hook is denied", () => {
	const repo = createRepo();

	for (const [command, pattern] of [
		["git push --no-verify", /`--no-verify` skips the git hooks/],
		["git push origin HEAD --no-verify", /`--no-verify` skips/],
		["git push --no-veri origin HEAD", /`--no-veri` skips/],
		[`bash -lc 'git push --no-verify'`, /`--no-verify` skips/],
		[`bash -lc "git push origin HEAD --no-verify"`, /`--no-verify` skips/],
		["git -c core.hooksPath=x push", /core\.hooksPath/],
	] as const) {
		assertDeny(gate(repo, command), "stops", pattern);
	}
});

test("a plain push, a dry run, and an ambiguous prefix pass", () => {
	const repo = createRepo();

	for (const command of [
		"git push",
		"git push -u origin HEAD",
		"git push -n",
		"git push --dry-run origin HEAD",
		"git push --no-ver origin HEAD",
	]) {
		assert.deepEqual(gate(repo, command), PASS, command);
	}
});

test("a push in a repo whose toplevel has no architect manifest passes", () => {
	const repo = createRepo({ kind: "foreign" });

	assert.deepEqual(gate(repo, "git push --no-verify"), PASS);
});

test("a bypassing push here is denied after one into a repo without the manifest", () => {
	const repo = createRepo();
	const foreign = createRepo({ kind: "foreign" });

	for (const command of [
		`git -C ${foreign} push --no-verify; git push --no-verify`,
		`git push --no-verify; git -C ${foreign} push --no-verify`,
	]) {
		assertDeny(gate(repo, command), "stops", /`--no-verify` skips/);
	}
});

// --- Toplevel substitution and unresolved directories ---

const TOPLEVEL = 'cd "$(git rev-parse --show-toplevel)"';

test("a toplevel substitution runs every check from the session's directory", () => {
	const repo = createRepo();
	change(repo, CARD, TOOL);
	git(repo, "add", TOOL);

	assertDeny(
		gate(repo, `${TOPLEVEL} && git commit -m "T2: x"`),
		"stops",
		/names no paths/
	);
	weaken(repo);
	assertDeny(
		gate(repo, `${TOPLEVEL} && git commit -m "T1: x" -- ${CARD_TEST}`),
		"weakened tests",
		/loses 1 line/
	);
	assertDeny(
		gate(repo, 'cd `git rev-parse --show-toplevel` && git commit -m "T2: x"'),
		"stops",
		/names no paths/
	);
	assert.deepEqual(gate(repo, `cd $NOWHERE && git commit -m "T2: x"`), PASS);
});

test("an unresolved directory runs only the flag denies", () => {
	const repo = createRepo();

	assert.deepEqual(gate(repo, "cd $S && git init && git commit -qm base"), PASS);
	assertDeny(
		gate(repo, "cd $S && git commit --no-verify -qm base -- a"),
		"stops",
		/skips the git hooks/
	);
});

test("the toplevel resolves from a session in a subdirectory", () => {
	const repo = createRepo();
	weaken(repo);
	const fromSubdir = (command: string) =>
		runGate(
			{ ...claudePayload(repo, command), cwd: path.join(repo, "frontend") },
			{ tool: "claude" }
		);

	assertDeny(
		fromSubdir(`${TOPLEVEL} && git commit -m "T1: x" -- ${CARD_TEST}`),
		"weakened tests",
		/loses 1 line/
	);
	assertDeny(
		fromSubdir(
			`git -C "$(git rev-parse --show-toplevel)" commit -m "T1: x" -- ${CARD_TEST}`
		),
		"weakened tests",
		/loses 1 line/
	);
});

test("a toplevel substitution with a literal tail or a redirect resolves", () => {
	const repo = createRepo();
	change(repo, CARD, TOOL);
	git(repo, "add", TOOL);

	for (const command of [
		'cd "$(git rev-parse --show-toplevel)/frontend" && git commit -m "T2: x"',
		'git -C "$(git rev-parse --show-toplevel)/frontend" commit -m "T2: x"',
		'cd `git rev-parse --show-toplevel`/frontend && git commit -m "T2: x"',
		'cd "$(git rev-parse --show-toplevel 2>/dev/null)" && git commit -m "T2: x"',
		`${TOPLEVEL} && cd frontend && git commit -m "T2: x"`,
		`${TOPLEVEL} && git -C frontend commit -m "T2: x"`,
	]) {
		assertDeny(gate(repo, command), "stops", /names no paths/);
	}
	assert.deepEqual(
		gate(
			repo,
			'cd "$(git rev-parse --show-toplevel)/frontend" && git commit -m "T1: Build the card" -- components/Card.tsx'
		),
		PASS
	);
});

test("a toplevel substitution with extra spaces or a spaced redirect resolves", () => {
	const repo = createRepo();
	change(repo, TOOL);
	git(repo, "add", TOOL);

	for (const command of [
		'cd "$( git rev-parse --show-toplevel )" && git commit -m "T2: x"',
		'cd "$(git  rev-parse --show-toplevel)" && git commit -m "T2: x"',
		'cd "$(git rev-parse --show-toplevel 2> /dev/null)" && git commit -m "T2: x"',
		'cd `git rev-parse --show-toplevel 2>/dev/null` && git commit -m "T2: x"',
	]) {
		assertDeny(gate(repo, command), "stops", /names no paths/);
	}
});

test("every toplevel substitution in the command resolves, not only the first", () => {
	const repo = createRepo();
	change(repo, TOOL);
	git(repo, "add", TOOL);

	assertDeny(
		gate(
			repo,
			`${TOPLEVEL} && git -C "$(git rev-parse --show-toplevel)/frontend" commit -m "T2: x"`
		),
		"stops",
		/names no paths/
	);
});

test(
	"a toplevel holding a shell-special character stays a substitution",
	{ skip: process.platform === "win32" },
	() => {
		const parent = mkdtempSync(path.join(os.tmpdir(), "commit-gate-special-"));
		TEMP_DIRS.push(parent);
		const repo = path.join(parent, "re;po");
		renameSync(createRepo(), repo);
		change(repo, TOOL);
		git(repo, "add", TOOL);

		assert.deepEqual(gate(repo, `${TOPLEVEL} && git commit -m "T2: x"`), PASS);
		assertDeny(
			gate(repo, `${TOPLEVEL} && git commit --no-verify -m x -- a`),
			"stops",
			/skips the git hooks/
		);
	}
);

test("a toplevel followed by an unresolved word runs only the flag denies", () => {
	const repo = createRepo();
	change(repo, TOOL);
	git(repo, "add", TOOL);

	for (const command of [
		'cd "$(git rev-parse --show-toplevel)$S" && git commit -m "T2: x"',
		`${TOPLEVEL} && cd $S && git commit -m "T2: x"`,
		'cd "$(git rev-parse --show-toplevel; rm -rf x)" && git commit -m "T2: x"',
	]) {
		assert.deepEqual(gate(repo, command), PASS, command);
	}
});

test("a cd inside a subshell doesn't move the commit", () => {
	const repo = createRepo();
	weaken(repo);

	assertDeny(
		gate(
			repo,
			`${TOPLEVEL} && (cd .prism) && git commit -m "T1: x" -- ${CARD_TEST}`
		),
		"weakened tests",
		/loses 1 line/
	);
});

test("popd returns to the directory pushd saved", () => {
	const repo = createRepo();
	change(repo, TOOL);
	git(repo, "add", TOOL);

	assertDeny(
		gate(
			repo,
			'pushd "$(git rev-parse --show-toplevel)" && pushd frontend && popd && git commit -m "T2: x"'
		),
		"stops",
		/names no paths/
	);
});

test("a named path under a task subject passes after a toplevel substitution", () => {
	const repo = createRepo();
	change(repo, CARD);

	assert.deepEqual(
		gate(repo, `${TOPLEVEL} && git commit -m "T1: Build the card" -- ${CARD}`),
		PASS
	);
});

test("the flag denies still come first after a toplevel substitution", () => {
	const repo = createRepo();

	assertDeny(
		gate(repo, `${TOPLEVEL} && git commit --no-verify -m x -- a`),
		"stops",
		/skips the git hooks/
	);
});

// --- Whole-repo pathspecs ---

test("a pathspec that takes the whole repo is denied", () => {
	const repo = createRepo();
	change(repo, CARD);

	for (const command of [
		'git commit -m "T1: x" -- .',
		"git commit -m \"T1: x\" -- '*'",
		'git commit -m "T1: x" -- ./',
		'cd frontend && git commit -m "T1: x" -- ..',
		commitMjs("T1: x", "."),
	]) {
		assertDeny(gate(repo, command), "stops", /commits every tracked change/);
	}
});

test("a directory below the root passes as a pathspec", () => {
	const repo = createRepo();
	change(repo, CARD);

	assert.deepEqual(
		gate(repo, 'cd frontend && git commit -m "T1: Build the card" -- .'),
		PASS
	);
});

// --- The temporary index ---

test(
	"the temporary index is removed after a pass and after a check denies",
	{ skip: process.platform === "win32" },
	() => {
		const repo = createRepo();
		change(repo, CARD);
		const tmp = mkdtempSync(path.join(os.tmpdir(), "commit-gate-tmpdir-"));
		TEMP_DIRS.push(tmp);
		const saved = process.env.TMPDIR;
		process.env.TMPDIR = tmp;
		try {
			assert.deepEqual(
				gate(repo, `git commit -m "T1: Build the card" -- ${CARD}`),
				PASS
			);
			weaken(repo);
			assertDeny(
				gate(repo, `git commit -m "T1: x" -- ${CARD_TEST}`),
				"weakened tests",
				/loses 1 line/
			);
		} finally {
			if (saved === undefined) delete process.env.TMPDIR;
			else process.env.TMPDIR = saved;
		}

		assert.deepEqual(readdirSync(tmp), []);
	}
);

// --- Review fixes ---

test(
	"a commit.mjs path starting with a colon is read as a literal file, not as git magic",
	{ skip: process.platform === "win32" },
	() => {
		const repo = createRepo();
		write(repo, ":/x.test.txt", "a\n");

		assertDeny(
			gate(repo, commitMjs("T1: x", ":/x.test.txt")),
			"weakened tests",
			/:\/x\.test\.txt loses 1 line/
		);
	}
);

test(
	"a session reaching the repo through a symlink is judged against the real directory",
	{ skip: process.platform === "win32" },
	() => {
		const repo = createRepo();
		change(repo, CARD);
		weaken(repo);
		const parent = mkdtempSync(path.join(os.tmpdir(), "commit-gate-link-"));
		TEMP_DIRS.push(parent);
		const link = path.join(parent, "link");
		symlinkSync(repo, link);

		assertDeny(
			gate(link, commitMjs("T1: Build the card", CARD_TEST)),
			"weakened tests",
			/loses 1 line/
		);
		assert.deepEqual(gate(link, commitMjs("T1: Build the card", CARD)), PASS);
	}
);
