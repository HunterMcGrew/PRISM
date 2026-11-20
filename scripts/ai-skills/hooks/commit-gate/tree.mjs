// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
/**
 * Builds the tree a commit would produce, in a temporary index of its own,
 * and holds `runGit`, the one git runner every commit-gate module calls.
 *
 * The shared index holds whatever sibling sessions have staged, so the commit
 * gate never builds from it, reads it, or writes it. The temporary index
 * starts from HEAD and takes only the named paths from the working tree,
 * which is what `plan/commit.mjs` and `git add <path> && git commit --
 * <path>` commit.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const GIT_TIMEOUT_MS = 5_000;

/**
 * Returns `{ indexFile, treeHash, cleanup }` for HEAD plus `paths`, which are
 * relative to `repoRoot`.
 *
 * With `literal`, every git call that builds the index passes
 * `--literal-pathspecs`, so a path holding a glob character or a leading `:`
 * names itself. `plan/commit.mjs` commits that way, and the tree the gate
 * judges has to be the one it commits.
 *
 * `git add -A` runs under `GIT_INDEX_FILE`, so a named path deleted from the
 * working tree leaves the index and a `git mv` pair named on both sides
 * commits as a rename. Throws when git can't add a path, after removing the
 * temporary index. The caller runs `cleanup()` once it is done with the index.
 *
 * @param {string} repoRoot
 * @param {string[]} paths
 * @param {{ literal?: boolean }} [options]
 */
export function buildWouldBeIndex(repoRoot, paths, { literal = false } = {}) {
	const dir = mkdtempSync(path.join(os.tmpdir(), "commit-gate-"));
	const indexFile = path.join(dir, "index");
	const cleanup = () => rmSync(dir, { recursive: true, force: true });
	const env = { GIT_INDEX_FILE: indexFile };
	const literalFlag = literal ? ["--literal-pathspecs"] : [];

	try {
		runGit(repoRoot, [...literalFlag, "read-tree", "HEAD"], { env });
		if (paths.length > 0)
			runGit(repoRoot, [...literalFlag, "add", "-A", "--", ...paths], { env });

		const treeHash = runGit(repoRoot, [...literalFlag, "write-tree"], { env });

		return { indexFile, treeHash, cleanup };
	} catch (error) {
		cleanup();
		throw error;
	}
}

/**
 * Runs git in `cwd` with an argument array and returns its stdout, trimmed
 * unless `trim` is false. `env` adds to the process environment. A call that
 * fails or runs past 5 s throws, or returns `fallback` when one is given, so
 * a hung git can't hold a commit past the hook's own timeout.
 *
 * @param {string} cwd
 * @param {string[]} args
 * @param {{ env?: Record<string, string>, trim?: boolean, fallback?: unknown }} [options]
 */
export function runGit(cwd, args, options = {}) {
	const { env = {}, trim = true } = options;
	try {
		const stdout = execFileSync("git", args, {
			cwd,
			env: { ...process.env, ...env },
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
			timeout: GIT_TIMEOUT_MS,
			maxBuffer: 256 * 1024 * 1024,
		});

		return trim ? stdout.trim() : stdout;
	} catch (error) {
		if (Object.hasOwn(options, "fallback")) return options.fallback;

		throw error;
	}
}
