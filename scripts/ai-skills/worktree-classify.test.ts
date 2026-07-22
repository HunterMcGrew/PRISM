/**
 * Coverage for the GREEN/RED/YELLOW predicate in `worktree-classify.ts`.
 *
 * Each test builds a throwaway bare remote plus a `main` clone in a `mkdtemp`
 * directory, adds one worktree per case off that clone, and injects
 * `fetchMergedHeadOid` directly — no `gh` on `PATH`, no stub executables, no
 * `chmod`. The regression-guard case is the one this port exists for: it
 * reproduces the exact false-GREEN gap PRISM's last worktree cleanup was
 * exposed to (a `merge-base`-style check trusting a commit that shipped
 * before further, unpushed commits landed).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { classifyWorktree } from "./worktree-classify";

/** True when `git` resolves on PATH — every test skips gracefully when it does not. */
let gitAvailable = true;

try {
	execFileSync("git", ["--version"], { stdio: "ignore" });
} catch {
	gitAvailable = false;
}

/** A `fetchMergedHeadOid` stub that asserts it is never called — proves the fast path skips `gh` entirely. */
function unreachableFetch(): Promise<string | null> {
	throw new Error("fetchMergedHeadOid should not be called on the fast path");
}

/** A `fetchMergedHeadOid` stub returning a fixed answer regardless of branch or cwd. */
function fixedFetch(oid: string | null): (branch: string, cwd: string) => Promise<string | null> {
	return async () => oid;
}

/**
 * Builds a bare remote and a `main` clone with one seed commit, both under a
 * fresh `mkdtemp` directory. Returns the paths needed to add per-case
 * worktrees off the clone.
 */
async function createFixtureRepo(): Promise<{ tempRoot: string; mainRepo: string }> {
	const tempRoot = await fs.mkdtemp(
		path.join(os.tmpdir(), "prism-worktree-classify-")
	);
	const remoteDir = path.join(tempRoot, "remote.git");
	const mainRepo = path.join(tempRoot, "main");

	execFileSync("git", ["init", "--quiet", "--bare", "-b", "main", remoteDir], {
		stdio: "ignore",
	});
	execFileSync("git", ["clone", "--quiet", remoteDir, mainRepo], {
		stdio: "ignore",
	});
	execFileSync("git", ["config", "user.email", "test@prism.local"], {
		cwd: mainRepo,
		stdio: "ignore",
	});
	execFileSync("git", ["config", "user.name", "PRISM Test"], {
		cwd: mainRepo,
		stdio: "ignore",
	});
	await fs.writeFile(path.join(mainRepo, "README.md"), "seed\n");
	execFileSync("git", ["add", "README.md"], { cwd: mainRepo, stdio: "ignore" });
	execFileSync("git", ["commit", "--quiet", "-m", "seed"], {
		cwd: mainRepo,
		stdio: "ignore",
	});
	execFileSync("git", ["push", "--quiet", "-u", "origin", "main"], {
		cwd: mainRepo,
		stdio: "ignore",
	});

	return { tempRoot, mainRepo };
}

/** Adds a new branch + worktree off `main`'s current tip. */
function addWorktree(mainRepo: string, worktreeDir: string, branch: string): void {
	execFileSync(
		"git",
		["worktree", "add", "--quiet", "-b", branch, worktreeDir, "main"],
		{ cwd: mainRepo, stdio: "ignore" }
	);
}

/** Stages and commits a file already written to `worktreeDir` via `fs.writeFile`. */
function commitFile(worktreeDir: string, fileName: string, message: string): void {
	execFileSync("git", ["add", fileName], { cwd: worktreeDir, stdio: "ignore" });
	execFileSync("git", ["commit", "--quiet", "-m", message], {
		cwd: worktreeDir,
		stdio: "ignore",
	});
}

function currentHeadOid(worktreeDir: string): string {
	return execFileSync("git", ["rev-parse", "HEAD"], {
		cwd: worktreeDir,
		encoding: "utf8",
	}).trim();
}

test("GREEN pushed — clean, fully pushed", async (t) => {
	if (!gitAvailable) {
		t.skip("git not available on PATH");
		return;
	}

	const { tempRoot, mainRepo } = await createFixtureRepo();

	try {
		const worktreeDir = path.join(tempRoot, "green-pushed");
		addWorktree(mainRepo, worktreeDir, "green-pushed");
		execFileSync("git", ["push", "--quiet", "-u", "origin", "green-pushed"], {
			cwd: worktreeDir,
			stdio: "ignore",
		});

		const result = await classifyWorktree(worktreeDir, {
			fetchMergedHeadOid: unreachableFetch,
		});

		assert.deepEqual(result, { color: "GREEN", reason: "pushed" });
	} finally {
		await fs.rm(tempRoot, { recursive: true, force: true });
	}
});

test("GREEN pr-merged — merged PR's shipped commit contains a stale-tracking-ref HEAD", async (t) => {
	if (!gitAvailable) {
		t.skip("git not available on PATH");
		return;
	}

	const { tempRoot, mainRepo } = await createFixtureRepo();

	try {
		const worktreeDir = path.join(tempRoot, "green-pr-merged");
		addWorktree(mainRepo, worktreeDir, "green-pr-merged");
		execFileSync(
			"git",
			["push", "--quiet", "-u", "origin", "green-pr-merged"],
			{ cwd: worktreeDir, stdio: "ignore" }
		);

		await fs.writeFile(path.join(worktreeDir, "second.txt"), "second\n");
		commitFile(worktreeDir, "second.txt", "second commit");
		execFileSync("git", ["push", "--quiet", "origin", "green-pr-merged"], {
			cwd: worktreeDir,
			stdio: "ignore",
		});

		const shippedOid = currentHeadOid(worktreeDir);

		// Rewind the local tracking ref one commit behind reality, so the
		// worktree reads as ahead of a stale `@{u}` even though everything it
		// carries already shipped in the merged PR.
		execFileSync(
			"git",
			[
				"update-ref",
				"refs/remotes/origin/green-pr-merged",
				"HEAD~1",
			],
			{ cwd: worktreeDir, stdio: "ignore" }
		);

		const result = await classifyWorktree(worktreeDir, {
			fetchMergedHeadOid: fixedFetch(shippedOid),
		});

		assert.deepEqual(result, { color: "GREEN", reason: "pr-merged" });
	} finally {
		await fs.rm(tempRoot, { recursive: true, force: true });
	}
});

test("RED tracked-changes, then positive control after reverting", async (t) => {
	if (!gitAvailable) {
		t.skip("git not available on PATH");
		return;
	}

	const { tempRoot, mainRepo } = await createFixtureRepo();

	try {
		const worktreeDir = path.join(tempRoot, "red-tracked-changes");
		addWorktree(mainRepo, worktreeDir, "red-tracked-changes");
		execFileSync(
			"git",
			["push", "--quiet", "-u", "origin", "red-tracked-changes"],
			{ cwd: worktreeDir, stdio: "ignore" }
		);

		await fs.writeFile(path.join(worktreeDir, "README.md"), "modified\n");

		const dirtyResult = await classifyWorktree(worktreeDir, {
			fetchMergedHeadOid: unreachableFetch,
		});

		assert.deepEqual(dirtyResult, { color: "RED", reason: "tracked-changes" });

		execFileSync("git", ["checkout", "--quiet", "--", "README.md"], {
			cwd: worktreeDir,
			stdio: "ignore",
		});

		const cleanResult = await classifyWorktree(worktreeDir, {
			fetchMergedHeadOid: unreachableFetch,
		});

		assert.deepEqual(
			cleanResult,
			{ color: "GREEN", reason: "pushed" },
			"RED must be responsive to state, not sticky, once the tracked change is reverted"
		);
	} finally {
		await fs.rm(tempRoot, { recursive: true, force: true });
	}
});

test("RED unpushed-commits — upstream configured, one commit ahead, no merged PR", async (t) => {
	if (!gitAvailable) {
		t.skip("git not available on PATH");
		return;
	}

	const { tempRoot, mainRepo } = await createFixtureRepo();

	try {
		const worktreeDir = path.join(tempRoot, "red-unpushed");
		addWorktree(mainRepo, worktreeDir, "red-unpushed");
		execFileSync("git", ["push", "--quiet", "-u", "origin", "red-unpushed"], {
			cwd: worktreeDir,
			stdio: "ignore",
		});

		await fs.writeFile(path.join(worktreeDir, "second.txt"), "second\n");
		commitFile(worktreeDir, "second.txt", "unpushed commit");

		const result = await classifyWorktree(worktreeDir, {
			fetchMergedHeadOid: fixedFetch(null),
		});

		assert.deepEqual(result, { color: "RED", reason: "unpushed-commits" });
	} finally {
		await fs.rm(tempRoot, { recursive: true, force: true });
	}
});

test("RED unpushed-commits — regression guard: a commit after the merged PR's oid must never read GREEN", async (t) => {
	if (!gitAvailable) {
		t.skip("git not available on PATH");
		return;
	}

	const { tempRoot, mainRepo } = await createFixtureRepo();

	try {
		const worktreeDir = path.join(tempRoot, "red-regression-guard");
		addWorktree(mainRepo, worktreeDir, "red-regression-guard");
		execFileSync(
			"git",
			["push", "--quiet", "-u", "origin", "red-regression-guard"],
			{ cwd: worktreeDir, stdio: "ignore" }
		);

		const shippedOid = currentHeadOid(worktreeDir);

		await fs.writeFile(path.join(worktreeDir, "after-merge.txt"), "after\n");
		commitFile(
			worktreeDir,
			"after-merge.txt",
			"commit added after the PR merged"
		);

		const result = await classifyWorktree(worktreeDir, {
			fetchMergedHeadOid: fixedFetch(shippedOid),
		});

		assert.deepEqual(
			result,
			{ color: "RED", reason: "unpushed-commits" },
			"a commit landing after the merged PR's shipped oid must fall through to RED, never GREEN"
		);
	} finally {
		await fs.rm(tempRoot, { recursive: true, force: true });
	}
});

test("YELLOW untracked-only — clean and pushed, one untracked file", async (t) => {
	if (!gitAvailable) {
		t.skip("git not available on PATH");
		return;
	}

	const { tempRoot, mainRepo } = await createFixtureRepo();

	try {
		const worktreeDir = path.join(tempRoot, "yellow-untracked");
		addWorktree(mainRepo, worktreeDir, "yellow-untracked");
		execFileSync(
			"git",
			["push", "--quiet", "-u", "origin", "yellow-untracked"],
			{ cwd: worktreeDir, stdio: "ignore" }
		);

		await fs.writeFile(path.join(worktreeDir, "scratch.txt"), "untracked\n");

		const result = await classifyWorktree(worktreeDir, {
			fetchMergedHeadOid: unreachableFetch,
		});

		assert.deepEqual(result, { color: "YELLOW", reason: "untracked-only" });
	} finally {
		await fs.rm(tempRoot, { recursive: true, force: true });
	}
});

test("YELLOW no-upstream — commits exist, no upstream configured", async (t) => {
	if (!gitAvailable) {
		t.skip("git not available on PATH");
		return;
	}

	const { tempRoot, mainRepo } = await createFixtureRepo();

	try {
		const worktreeDir = path.join(tempRoot, "yellow-no-upstream");
		addWorktree(mainRepo, worktreeDir, "yellow-no-upstream");

		const result = await classifyWorktree(worktreeDir, {
			fetchMergedHeadOid: fixedFetch(null),
		});

		assert.deepEqual(result, { color: "YELLOW", reason: "no-upstream" });
	} finally {
		await fs.rm(tempRoot, { recursive: true, force: true });
	}
});

test("YELLOW detached-dangling — detached HEAD at a commit no ref contains", async (t) => {
	if (!gitAvailable) {
		t.skip("git not available on PATH");
		return;
	}

	const { tempRoot, mainRepo } = await createFixtureRepo();

	try {
		const worktreeDir = path.join(tempRoot, "yellow-detached-dangling");
		addWorktree(mainRepo, worktreeDir, "yellow-detached-dangling");
		execFileSync("git", ["checkout", "--quiet", "--detach"], {
			cwd: worktreeDir,
			stdio: "ignore",
		});
		await fs.writeFile(path.join(worktreeDir, "dangling.txt"), "dangling\n");
		commitFile(
			worktreeDir,
			"dangling.txt",
			"commit while detached, no ref will contain it"
		);

		const result = await classifyWorktree(worktreeDir, {
			fetchMergedHeadOid: unreachableFetch,
		});

		assert.deepEqual(result, {
			color: "YELLOW",
			reason: "detached-dangling",
		});
	} finally {
		await fs.rm(tempRoot, { recursive: true, force: true });
	}
});

test("YELLOW detached-referenced — detached HEAD at a tip still on a branch", async (t) => {
	if (!gitAvailable) {
		t.skip("git not available on PATH");
		return;
	}

	const { tempRoot, mainRepo } = await createFixtureRepo();

	try {
		const worktreeDir = path.join(tempRoot, "yellow-detached-referenced");
		addWorktree(mainRepo, worktreeDir, "yellow-detached-referenced");
		execFileSync("git", ["checkout", "--quiet", "--detach"], {
			cwd: worktreeDir,
			stdio: "ignore",
		});

		const result = await classifyWorktree(worktreeDir, {
			fetchMergedHeadOid: unreachableFetch,
		});

		assert.deepEqual(result, {
			color: "YELLOW",
			reason: "detached-referenced",
		});
	} finally {
		await fs.rm(tempRoot, { recursive: true, force: true });
	}
});
