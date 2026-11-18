/**
 * Suite for the plan commit script: named paths only, a refusal for an
 * unchanged path, literal pathspecs, and the index.lock retry.
 */
import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

import { runPlanCommit } from "./hooks/plan/commit.mjs";

const COMMIT_SCRIPT = fileURLToPath(
	new URL("./hooks/plan/commit.mjs", import.meta.url)
);
const GLOBAL_CONFIG_DIR = mkdtempSync(path.join(os.tmpdir(), "plan-commit-gitcfg-"));
const EMPTY_GLOBAL_CONFIG = path.join(GLOBAL_CONFIG_DIR, "gitconfig");
writeFileSync(EMPTY_GLOBAL_CONFIG, "");
const GIT_ENV = {
	...process.env,
	GIT_CONFIG_GLOBAL: EMPTY_GLOBAL_CONFIG,
	GIT_CONFIG_NOSYSTEM: "1",
	GIT_AUTHOR_NAME: "Test",
	GIT_AUTHOR_EMAIL: "test@example.com",
	GIT_COMMITTER_NAME: "Test",
	GIT_COMMITTER_EMAIL: "test@example.com",
};
const tempDirs: string[] = [GLOBAL_CONFIG_DIR];

after(() => {
	for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

function git(cwd: string, ...args: string[]): string {
	return execFileSync("git", args, { cwd, env: GIT_ENV, encoding: "utf8" });
}

function createRepo(): string {
	const repo = mkdtempSync(path.join(os.tmpdir(), "plan-commit-"));
	tempDirs.push(repo);
	git(repo, "init", "-q");
	writeFileSync(path.join(repo, "base.txt"), "base\n");
	git(repo, "add", "base.txt");
	git(repo, "commit", "-q", "-m", "ACME-1: Base");

	return repo;
}

function runCommit(repo: string, args: string[], env: Record<string, string> = {}) {
	return spawnSync(process.execPath, [COMMIT_SCRIPT, ...args], {
		cwd: repo,
		env: { ...GIT_ENV, ...env },
		encoding: "utf8",
	});
}

/**
 * Returns a PATH whose `git` prints to stdout and exits 3 on the given
 * subcommand and runs the real git otherwise. POSIX only: the stand-in is a
 * shell script.
 */
function pathWithGitFailingOn(subcommand: string): string {
	const realGit = execFileSync("sh", ["-c", "command -v git"], {
		encoding: "utf8",
	}).trim();
	const shimDir = mkdtempSync(path.join(os.tmpdir(), "plan-commit-shim-"));
	tempDirs.push(shimDir);
	writeFileSync(
		path.join(shimDir, "git"),
		`#!/bin/sh\nfor arg in "$@"; do\n  if [ "$arg" = ${subcommand} ]; then echo "git said no on stdout"; exit 3; fi\ndone\nexec "${realGit}" "$@"\n`,
		{ mode: 0o755 }
	);

	return `${shimDir}${path.delimiter}${process.env["PATH"] ?? ""}`;
}

function lastCommitFiles(repo: string): string[] {
	return git(repo, "show", "--name-only", "--format=", "HEAD")
		.split("\n")
		.filter(Boolean);
}

describe("commit.mjs", () => {
	test("commits only the named paths and leaves a sibling's staged file staged", () => {
		const repo = createRepo();
		writeFileSync(path.join(repo, "mine.txt"), "mine\n");
		writeFileSync(path.join(repo, "sibling.txt"), "sibling\n");
		git(repo, "add", "sibling.txt");

		const result = runCommit(repo, ["T1: Add mine", "mine.txt"]);

		assert.equal(result.status, 0, result.stderr);
		assert.deepEqual(lastCommitFiles(repo), ["mine.txt"]);
		assert.equal(git(repo, "log", "-1", "--format=%s"), "T1: Add mine\n");
		assert.equal(git(repo, "diff", "--cached", "--name-only"), "sibling.txt\n");
	});

	test("commits the subject literally and treats a dash-led path as a path", () => {
		const repo = createRepo();
		const subject = 'T2: $(touch pwned) `touch pwned` "; touch pwned';
		writeFileSync(path.join(repo, "--dry-run"), "dash\n");

		const result = runCommit(repo, [subject, "--dry-run"]);

		assert.equal(result.status, 0, result.stderr);
		assert.equal(git(repo, "log", "-1", "--format=%s").trimEnd(), subject);
		assert.deepEqual(lastCommitFiles(repo), ["--dry-run"]);
		assert.equal(existsSync(path.join(repo, "pwned")), false);
	});

	test("reads a magic pathspec literally, so ':/' never sweeps the tree", () => {
		const repo = createRepo();
		writeFileSync(path.join(repo, "base.txt"), "changed\n");
		writeFileSync(path.join(repo, "sibling.txt"), "sibling\n");

		const result = runCommit(repo, ["T7: Sweep", ":/"]);

		assert.notEqual(result.status, 0);
		assert.equal(git(repo, "log", "-1", "--format=%s"), "ACME-1: Base\n");
		assert.equal(git(repo, "diff", "--cached", "--name-only"), "");
	});

	test("retries through an index.lock released mid-run and commits", async () => {
		const repo = createRepo();
		const lock = path.join(repo, ".git", "index.lock");
		writeFileSync(path.join(repo, "mine.txt"), "mine\n");
		writeFileSync(lock, "");
		const child = spawn(process.execPath, [COMMIT_SCRIPT, "T3: Add mine", "mine.txt"], {
			cwd: repo,
			env: {
				...GIT_ENV,
				PRISM_PLAN_COMMIT_RETRIES: "40",
				PRISM_PLAN_COMMIT_RETRY_DELAY_MS: "100",
			},
		});
		let stderr = "";
		child.stderr.on("data", (chunk) => {
			stderr += chunk;
		});
		const exitCode = new Promise((resolve) => child.on("close", resolve));

		setTimeout(() => rmSync(lock), 300);

		assert.equal(await exitCode, 0, stderr);
		assert.deepEqual(lastCommitFiles(repo), ["mine.txt"]);
	});

	test("exits 1 naming the lock path when the lock outlasts the retries", () => {
		const repo = createRepo();
		writeFileSync(path.join(repo, "mine.txt"), "mine\n");
		writeFileSync(path.join(repo, ".git", "index.lock"), "");

		const result = runCommit(repo, ["T4: Add mine", "mine.txt"], {
			PRISM_PLAN_COMMIT_RETRIES: "2",
			PRISM_PLAN_COMMIT_RETRY_DELAY_MS: "50",
		});

		assert.equal(result.status, 1);
		assert.match(result.stderr, /gave up after 2 attempts/);
		assert.match(result.stderr, /\.git\/index\.lock/);
		assert.equal(git(repo, "log", "-1", "--format=%s"), "ACME-1: Base\n");
	});

	test("passes any other git failure through with git's code and stderr", () => {
		const repo = createRepo();

		const result = runCommit(repo, ["T5: Add missing", "missing.txt"]);

		assert.equal(result.status, 128);
		assert.match(result.stderr, /pathspec 'missing\.txt' did not match/);
	});

	test("honors a retry delay of 0 instead of falling back to the default wait", () => {
		const repo = createRepo();
		writeFileSync(path.join(repo, "mine.txt"), "mine\n");
		writeFileSync(path.join(repo, ".git", "index.lock"), "");
		const started = Date.now();

		const result = runCommit(repo, ["T4: Add mine", "mine.txt"], {
			PRISM_PLAN_COMMIT_RETRIES: "3",
			PRISM_PLAN_COMMIT_RETRY_DELAY_MS: "0",
		});

		assert.equal(result.status, 1);
		assert.match(result.stderr, /gave up after 3 attempts/);
		// The default 500 ms wait would put two waits, a full second, before the give-up.
		assert.ok(Date.now() - started < 900, `took ${Date.now() - started} ms`);
	});

	test(
		"passes through what git printed to stdout when a step fails",
		{ skip: process.platform === "win32" && "the git stand-in is a shell script" },
		() => {
			const repo = createRepo();
			writeFileSync(path.join(repo, "mine.txt"), "mine\n");

			const result = runCommit(repo, ["T4: Add mine", "mine.txt"], {
				PATH: pathWithGitFailingOn("commit"),
			});

			assert.equal(result.status, 3);
			assert.match(result.stdout, /git said no on stdout/);
		}
	);

	test("reports git's own error when git status itself fails, not an unchanged path", () => {
		const outsideRepo = mkdtempSync(path.join(os.tmpdir(), "plan-commit-norepo-"));
		tempDirs.push(outsideRepo);
		writeFileSync(path.join(outsideRepo, "mine.txt"), "mine\n");

		const result = runCommit(outsideRepo, ["T4: Add mine", "mine.txt"]);

		assert.equal(result.status, 128);
		assert.match(result.stderr, /not a git repository/);
		assert.doesNotMatch(result.stderr, /no change to commit/);
	});

	test(
		"passes through what git printed to stdout when git status fails",
		{ skip: process.platform === "win32" && "the git stand-in is a shell script" },
		() => {
			const repo = createRepo();
			writeFileSync(path.join(repo, "mine.txt"), "mine\n");

			const result = runCommit(repo, ["T4: Add mine", "mine.txt"], {
				PATH: pathWithGitFailingOn("status"),
			});

			assert.equal(result.status, 3);
			assert.match(result.stdout, /git said no on stdout/);
		}
	);

	test("exits 1 naming a path with no change, and commits nothing", () => {
		const repo = createRepo();
		writeFileSync(path.join(repo, "mine.txt"), "mine\n");

		const result = runCommit(repo, ["T8: Add mine", "mine.txt", "base.txt"]);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /no change to commit in: base\.txt/);
		assert.equal(git(repo, "log", "-1", "--format=%s"), "ACME-1: Base\n");
		assert.equal(git(repo, "diff", "--cached", "--name-only"), "");
	});

	test("commits once the unchanged path is dropped", () => {
		const repo = createRepo();
		writeFileSync(path.join(repo, "mine.txt"), "mine\n");

		assert.equal(runCommit(repo, ["T8: Add mine", "mine.txt", "base.txt"]).status, 1);
		const result = runCommit(repo, ["T8: Add mine", "mine.txt"]);

		assert.equal(result.status, 0, result.stderr);
		assert.deepEqual(lastCommitFiles(repo), ["mine.txt"]);
	});

	test("commits a new file when git status hides untracked files", () => {
		const repo = createRepo();
		git(repo, "config", "status.showUntrackedFiles", "no");
		writeFileSync(path.join(repo, "mine.txt"), "mine\n");

		const result = runCommit(repo, ["T8: Add mine", "mine.txt"]);

		assert.equal(result.status, 0, result.stderr);
		assert.deepEqual(lastCommitFiles(repo), ["mine.txt"]);
	});

	test("commits a named path deleted from the working tree", () => {
		const repo = createRepo();
		rmSync(path.join(repo, "base.txt"));

		const result = runCommit(repo, ["T9: Drop base", "base.txt"]);

		assert.equal(result.status, 0, result.stderr);
		assert.deepEqual(lastCommitFiles(repo), ["base.txt"]);
	});

	test("exits 2 with the usage line without a path or with an empty subject", () => {
		const repo = createRepo();
		writeFileSync(path.join(repo, "mine.txt"), "mine\n");

		const noPath = runCommit(repo, ["T6: No paths"]);
		assert.equal(noPath.status, 2);
		assert.match(noPath.stderr, /Usage: commit\.mjs "<subject>" <path>\.\.\./);
		assert.equal(runCommit(repo, ["", "mine.txt"]).status, 2);
		assert.equal(git(repo, "log", "-1", "--format=%s"), "ACME-1: Base\n");
	});
});

describe("runPlanCommit", () => {
	test("returns the exit code and output instead of writing them", () => {
		const repo = createRepo();
		writeFileSync(path.join(repo, "mine.txt"), "mine\n");

		const result = runPlanCommit({
			cwd: repo,
			subject: "T1: Add mine",
			paths: ["mine.txt"],
			env: GIT_ENV,
		});

		assert.equal(result.exitCode, 0, result.stderr);
		assert.match(result.stdout, /T1: Add mine/);
	});
});
