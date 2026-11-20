/**
 * Pins the commit gate's would-be tree: a temporary index built from HEAD plus
 * the named paths, which never reads or writes the shared index, so a file a
 * sibling session staged and the commit doesn't name stays out of the tree the
 * gate judges.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
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
import test, { after } from "node:test";

import { buildWouldBeIndex, runGit } from "./hooks/commit-gate/tree.mjs";

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

/** Runs git in `cwd` under `GIT_ENV` and returns its trimmed stdout. */
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

function tempDir(prefix: string): string {
	const dir = mkdtempSync(path.join(os.tmpdir(), prefix));
	TEMP_DIRS.push(dir);

	return dir;
}

function createRepo(): string {
	const repo = tempDir("commit-gate-tree-");
	git(repo, "init", "-q");
	write(repo, "a.txt", "a\n");
	write(repo, "b.txt", "b\n");
	write(repo, "src/old.mjs", "export const old = 1;\n");
	git(repo, "add", ".");
	git(repo, "commit", "-q", "-m", "PRISM-1: Base");

	return repo;
}

function treeFiles(repo: string, treeHash: string): string[] {
	return git(repo, "ls-tree", "-r", "--name-only", treeHash).split("\n");
}

/** The paths the would-be index changes against HEAD, the way the gate reads them. */
function changedPaths(
	repo: string,
	index: { indexFile: string }
): string[] {
	return runGit(
		repo,
		["diff", "--cached", "--name-only", "--no-renames", "-z", "HEAD"],
		{ env: { GIT_INDEX_FILE: index.indexFile }, trim: false }
	)
		.split("\0")
		.filter(Boolean);
}

function withIndex<T>(
	repo: string,
	paths: string[],
	fn: (index: ReturnType<typeof buildWouldBeIndex>) => T,
	options?: { literal?: boolean }
): T {
	const index = buildWouldBeIndex(repo, paths, options);
	try {
		return fn(index);
	} finally {
		index.cleanup();
	}
}

// --- buildWouldBeIndex ---

test("buildWouldBeIndex holds HEAD plus the named paths' working-tree changes", () => {
	const repo = createRepo();
	write(repo, "a.txt", "a changed\n");
	write(repo, "new.txt", "new\n");

	withIndex(repo, ["a.txt", "new.txt"], ({ treeHash }) => {
		assert.equal(git(repo, "show", `${treeHash}:a.txt`), "a changed");
		assert.ok(treeFiles(repo, treeHash).includes("new.txt"));
	});
});

test("buildWouldBeIndex leaves out a sibling's staged file and never touches the shared index", () => {
	const repo = createRepo();
	write(repo, "sibling.txt", "staged by someone else\n");
	git(repo, "add", "sibling.txt");
	write(repo, "a.txt", "a changed\n");
	const sharedIndex = path.join(repo, ".git", "index");
	const before = readFileSync(sharedIndex);

	withIndex(repo, ["a.txt"], ({ treeHash }) => {
		assert.ok(!treeFiles(repo, treeHash).includes("sibling.txt"));
		assert.equal(git(repo, "show", `${treeHash}:a.txt`), "a changed");
	});

	assert.deepEqual(readFileSync(sharedIndex), before);
	assert.equal(git(repo, "diff", "--cached", "--name-only"), "sibling.txt");
});

test("a sibling's staged file is not in the would-be tree and the shared index is unchanged", () => {
	const repo = createRepo();
	write(repo, "a.txt", "a changed\n");
	write(repo, "b.txt", "b changed\n");
	git(repo, "add", "b.txt");

	withIndex(repo, ["a.txt"], (index) => {
		assert.deepEqual(changedPaths(repo, index), ["a.txt"]);
	});

	assert.equal(git(repo, "diff", "--cached", "--name-only"), "b.txt");
});

test("literal mode reads a path holding a glob character as itself", () => {
	const repo = createRepo();
	write(repo, "x*.txt", "star\n");
	write(repo, "xa.txt", "not named\n");

	withIndex(
		repo,
		["x*.txt"],
		(index) => {
			assert.deepEqual(changedPaths(repo, index), ["x*.txt"]);
		},
		{ literal: true }
	);
});

test("without literal mode a glob character expands as a pathspec", () => {
	const repo = createRepo();
	write(repo, "x*.txt", "star\n");
	write(repo, "xa.txt", "matched by the glob\n");

	withIndex(repo, ["x*.txt"], (index) => {
		assert.deepEqual(changedPaths(repo, index).sort(), ["x*.txt", "xa.txt"]);
	});
});

test("buildWouldBeIndex drops a named path deleted from the working tree", () => {
	const repo = createRepo();
	rmSync(path.join(repo, "b.txt"));

	withIndex(repo, ["b.txt"], ({ treeHash }) => {
		assert.ok(!treeFiles(repo, treeHash).includes("b.txt"));
	});
});

test("buildWouldBeIndex commits a git mv pair as a rename when both paths are named", () => {
	const repo = createRepo();
	git(repo, "mv", "src/old.mjs", "src/new.mjs");

	withIndex(repo, ["src/old.mjs", "src/new.mjs"], ({ treeHash }) => {
		const status = git(
			repo,
			"diff-tree",
			"-r",
			"-M",
			"--name-status",
			"HEAD",
			treeHash
		);
		assert.match(status, /^R100\tsrc\/old\.mjs\tsrc\/new\.mjs$/);
	});
});

test("buildWouldBeIndex cleanup removes the temporary index", () => {
	const repo = createRepo();
	const index = buildWouldBeIndex(repo, ["a.txt"]);

	assert.ok(existsSync(index.indexFile));
	index.cleanup();
	assert.ok(!existsSync(index.indexFile));
});

test("buildWouldBeIndex throws on a named path git can't add", () => {
	const repo = createRepo();

	assert.throws(() => buildWouldBeIndex(repo, ["missing.txt"]));
	assert.throws(() =>
		buildWouldBeIndex(repo, ["missing.txt"], { literal: true })
	);
});

test("buildWouldBeIndex removes the temporary index when it throws", () => {
	const repo = createRepo();
	const tmp = tempDir("commit-gate-tmpdir-");
	// `os.tmpdir()` reads TMPDIR on POSIX and TEMP on Windows.
	const tmpVar = process.platform === "win32" ? "TEMP" : "TMPDIR";
	const saved = process.env[tmpVar];
	process.env[tmpVar] = tmp;
	try {
		assert.throws(() => buildWouldBeIndex(repo, ["missing.txt"]));
	} finally {
		if (saved === undefined) delete process.env[tmpVar];
		else process.env[tmpVar] = saved;
	}

	assert.deepEqual(readdirSync(tmp), []);
});

// --- runGit ---

test("runGit returns trimmed stdout, or the fallback when git fails", () => {
	const repo = createRepo();

	assert.equal(runGit(repo, ["rev-parse", "--is-inside-work-tree"]), "true");
	assert.equal(
		runGit(repo, ["rev-parse", "--verify", "-q", "nope"], { fallback: null }),
		null
	);
	assert.throws(() => runGit(repo, ["rev-parse", "--verify", "nope"]));
});

test("runGit gives up on a git call after 5 s", { skip: process.platform === "win32" }, () => {
	const repo = createRepo();
	const bin = tempDir("commit-gate-tree-bin-");
	writeFileSync(path.join(bin, "git"), "#!/bin/sh\nexec sleep 10\n", {
		mode: 0o755,
	});
	const started = Date.now();

	assert.throws(() =>
		runGit(repo, ["status"], {
			env: { PATH: `${bin}${path.delimiter}${process.env.PATH}` },
		})
	);
	assert.ok(Date.now() - started < 9000, "runGit waited out the sleep");
});
