/**
 * Pins the commit gate's size check: on a branch whose intent, read from the
 * tree the commit would produce, says `size: small`, a commit that takes the
 * branch's diff past the small limits is denied with `size.mjs`'s reasons and
 * the remedy to go standard. Any other branch, and a branch with no
 * `origin/<defaultBranch>`, passes. Each case builds a throwaway repo whose
 * branch names a plan folder.
 */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { runGate } from "./hooks/commit-gate.mjs";
import type { HookPayload } from "./hooks/harnesses.mjs";

const HOOK = fileURLToPath(new URL("./hooks/commit-gate.mjs", import.meta.url));
const RUNTIME_PATH = fileURLToPath(new URL("./hooks/", import.meta.url));
// Forward slashes on every platform, because `tokenize` reads a `\` in a
// command string as an escape.
const RUNTIME = RUNTIME_PATH.split(path.sep).join("/").replace(/\/$/, "");
const PLAN_DIR = ".prism/plans/prism-9";
const INTENT = `${PLAN_DIR}/intent.md`;
const APPROVAL = "status: approved\napproved_by: Test\napproved_at: 2026-11-02";
const BIG = "src/app/big.mjs";
const SUBJECT = "PRISM-9: Build the app";
const KILL_SWITCHES = ["PRISM_HOOK_DISABLE", "PRISM_HOOK_DENY_DISABLE"];
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
	return execFileSync("git", args, { cwd, env: GIT_ENV, encoding: "utf8" }).trim();
}

function write(repo: string, file: string, text: string): void {
	mkdirSync(path.dirname(path.join(repo, file)), { recursive: true });
	writeFileSync(path.join(repo, file), text);
}

function read(repo: string, file: string): string {
	return readFileSync(path.join(repo, file), "utf8");
}

function intentText(size: string): string {
	return `---\ntitle: Test\nticket: PRISM-9\nstage: intent\nsize: ${size}\n${APPROVAL}\n---\n\n## Goal\n\nTest.\n`;
}

/** A small ticket's record-only plan: no `## Tasks`. */
function smallPlanText(): string {
	return `---\ntitle: Test\nticket: PRISM-9\nstage: plan\n${APPROVAL}\n---\n\n## Verification\n\n## Review\n\n## PR Readiness\n\nRetro:\n`;
}

/** `count` lines of product code. */
function lines(count: number): string {
	return Array.from({ length: count }, (_, i) => `export const v${i} = ${i};\n`).join("");
}

/**
 * A repo whose base commit holds a product file, a test file, the architect
 * manifest the gate looks for, a config naming the `PRISM` ticket prefix, and a
 * PRISM-9 plan folder whose intent says `size`. The base is `origin/main`, and
 * the branch checked out names the ticket.
 */
function createRepo({ size = "small" } = {}): string {
	const repo = mkdtempSync(path.join(os.tmpdir(), "commit-gate-size-"));
	TEMP_DIRS.push(repo);
	git(repo, "init", "-q");
	write(repo, "src/app/a.mjs", "export const a = 1;\n");
	write(repo, "src/app/a.test.mjs", 'test("a", () => {\n\tassert.ok(true);\n});\n');
	write(repo, ".prism/architect/manifest.json", '{ "code": {}, "authoring": {} }\n');
	write(repo, ".ai-skills/config.json", `${JSON.stringify({ ticketPrefix: "PRISM" })}\n`);
	write(repo, INTENT, intentText(size));
	write(repo, `${PLAN_DIR}/plan.md`, smallPlanText());
	git(repo, "add", ".");
	git(repo, "commit", "-q", "-m", "PRISM-9: Base");
	git(repo, "update-ref", "refs/remotes/origin/main", "HEAD");
	git(repo, "checkout", "-q", "-b", "u/prism-9-x");

	return repo;
}

function setIntentSize(repo: string, size: string): void {
	write(repo, INTENT, read(repo, INTENT).replace(/^size: .*$/m, `size: ${size}`));
}

function commitMjs(subject: string, ...files: string[]): string {
	return `node ${RUNTIME}/plan/commit.mjs "${subject}" ${files.join(" ")}`;
}

function payload(repo: string, command: string): HookPayload {
	return {
		session_id: "s1",
		hook_event_name: "PreToolUse",
		tool_name: "Bash",
		tool_input: { command },
		cwd: repo,
	};
}

function gate(repo: string, command: string) {
	return runGate(payload(repo, command), { tool: "claude" });
}

function spawnGate(repo: string, command: string) {
	const env: NodeJS.ProcessEnv = { ...GIT_ENV };
	for (const name of KILL_SWITCHES) delete env[name];

	return spawnSync(process.execPath, [HOOK, "--tool=claude", "--event=PreToolUse"], {
		cwd: repo,
		env,
		input: JSON.stringify(payload(repo, command)),
		encoding: "utf8",
	});
}

function denyReason(result: ReturnType<typeof runGate>, name: string): string {
	assert.equal(result.decision, "deny", "expected a deny");
	const reason = result.decision === "deny" ? result.reason : "";
	assert.ok(reason.startsWith(`Commit gate (${name}): `), reason);

	return reason;
}

// --- The three legs of a small branch ---

test("denies a commit that takes a small branch past the limits, naming the size check, the reasons, and the remedy", () => {
	const repo = createRepo();
	write(repo, BIG, lines(120));

	const reason = denyReason(gate(repo, commitMjs(SUBJECT, BIG)), "size");

	assert.match(reason, /lines: 120 added product lines, limit 100/);
	assert.match(reason, /size: standard/);
	assert.match(reason, /approve/);
});

test("passes the same commit once the intent in the would-be tree says size: standard", () => {
	const repo = createRepo();
	write(repo, BIG, lines(120));
	setIntentSize(repo, "standard");

	denyReason(gate(repo, commitMjs(SUBJECT, BIG)), "size");
	assert.deepEqual(gate(repo, commitMjs(SUBJECT, BIG, INTENT)), { decision: "pass" });
});

test("the spawned gate denies the over-limit commit and passes the remedy commit and a diff that fits", () => {
	const repo = createRepo();
	write(repo, BIG, lines(120));
	git(repo, "add", BIG);
	git(repo, "commit", "-q", "-m", SUBJECT, "--", BIG);
	write(repo, "src/app/a.mjs", `${read(repo, "src/app/a.mjs")}${lines(1)}`);

	const denied = spawnGate(repo, commitMjs(SUBJECT, "src/app/a.mjs"));
	assert.equal(denied.status, 0);
	assert.match(denied.stdout, /Commit gate \(size\)/);

	setIntentSize(repo, "standard");
	const remedy = spawnGate(repo, commitMjs("plan: Go standard", INTENT));
	assert.equal(remedy.status, 0);
	assert.equal(remedy.stdout, "");

	const fits = createRepo();
	write(fits, BIG, lines(90));
	const passed = spawnGate(fits, commitMjs(SUBJECT, BIG));
	assert.equal(passed.status, 0);
	assert.equal(passed.stdout, "");
});

// --- What the size check measures ---

test("measures the whole branch from the merge base, not just the commit", () => {
	const repo = createRepo();
	write(repo, "src/app/b.mjs", lines(60));
	git(repo, "add", "src/app/b.mjs");
	git(repo, "commit", "-q", "-m", SUBJECT, "--", "src/app/b.mjs");
	write(repo, "src/app/a.mjs", `${read(repo, "src/app/a.mjs")}${lines(60)}`);

	const reason = denyReason(gate(repo, commitMjs(SUBJECT, "src/app/a.mjs")), "size");
	assert.match(reason, /lines: 120 added product lines/);
});

test("names a stop path on a small branch", () => {
	const repo = createRepo();
	write(repo, "package.json", "{}\n");

	const reason = denyReason(gate(repo, commitMjs(SUBJECT, "package.json")), "size");
	assert.match(reason, /stop path: package\.json/);
});

test("runs before the weakened-tests check", () => {
	const repo = createRepo();
	write(repo, BIG, lines(120));
	write(repo, "src/app/a.test.mjs", 'test("a", () => {\n});\n');

	denyReason(gate(repo, commitMjs(SUBJECT, BIG, "src/app/a.test.mjs")), "size");
});

// --- Branches the size check passes ---

test("passes an over-limit diff when the intent does not say small", () => {
	for (const size of ["standard", "epic"]) {
		const repo = createRepo({ size });
		write(repo, BIG, lines(120));

		assert.deepEqual(gate(repo, commitMjs(SUBJECT, BIG)), { decision: "pass" }, size);
	}
});

test("passes an over-limit diff on a small branch whose origin/<defaultBranch> can't be resolved", () => {
	const repo = createRepo();
	git(repo, "update-ref", "-d", "refs/remotes/origin/main");
	write(repo, BIG, lines(120));

	assert.deepEqual(gate(repo, commitMjs(SUBJECT, BIG)), { decision: "pass" });
});
