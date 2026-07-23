#!/usr/bin/env tsx
/**
 * Deterministic implementation of the removal-safety predicate documented in
 * `.prism/rules/worktree-git.md § Removing a worktree`.
 *
 * Called from two places: a persona's end-of-task self-cleanup check
 * (`pnpm prism:worktree-classify <path>`) and Zoe's worktree hygiene lane,
 * which classifies every entry in `git worktree list` before proposing a
 * removal set. The logic is shared rather than re-typed at each call site
 * because it guards a safety-critical RED condition — a second, slightly
 * different copy of the same predicate is exactly the kind of drift that
 * produced the false-GREEN gap this port exists to close.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type WorktreeColor = "GREEN" | "RED" | "YELLOW";

/**
 * Injected lookup for a merged PR's shipped commit, keyed by branch name.
 *
 * Separated from `classifyWorktree` so tests can supply a deterministic
 * answer instead of shelling out to `gh` — the real implementation (the CLI
 * entry point below) is the only caller that talks to `gh`.
 */
export interface ClassifyDeps {
	fetchMergedHeadOid(branch: string, cwd: string): Promise<string | null>;
}

export interface ClassifyResult {
	color: WorktreeColor;
	reason: string;
}

// ---------------------------------------------------------------------------
// Predicate
// ---------------------------------------------------------------------------

/**
 * Runs a git subcommand and returns trimmed stdout, or `null` if the command
 * exits non-zero. Several steps below (`symbolic-ref -q`, `rev-parse -q
 * --verify`) use a non-zero exit as their normal "absent" signal rather than
 * as an error, so callers that need to distinguish a real failure call
 * `execFileAsync` directly instead.
 */
async function tryGit(args: string[], cwd: string): Promise<string | null> {
	try {
		const { stdout } = await execFileAsync("git", args, { cwd });
		return stdout.trim();
	} catch {
		return null;
	}
}

/**
 * Classifies a worktree as GREEN (safe to remove), RED (preserve), or YELLOW
 * (ask, naming what's at risk) against the predicate in
 * `.prism/rules/worktree-git.md § Removing a worktree`.
 *
 * Branch order is load-bearing — each step's placement is what makes the
 * step below it correct. Do not reorder.
 */
export async function classifyWorktree(
	worktreePath: string,
	deps: ClassifyDeps
): Promise<ClassifyResult> {
	try {
		await execFileAsync("git", ["rev-parse", "--is-inside-work-tree"], {
			cwd: worktreePath,
		});
	} catch (error) {
		throw new Error(
			`${worktreePath} is not a readable git working tree: ${
				error instanceof Error ? error.message : String(error)
			}`
		);
	}

	const porcelain = await tryGit(["status", "--porcelain"], worktreePath);
	const statusLines = porcelain ? porcelain.split("\n").filter(Boolean) : [];

	// An empty status string never matches `^??`, so this guard must check
	// non-empty explicitly before scanning lines — otherwise a clean tree
	// would fall through to the tracked-changes branch below.
	if (
		statusLines.length > 0 &&
		statusLines.some((line) => !line.startsWith("??"))
	) {
		return { color: "RED", reason: "tracked-changes" };
	}

	const hasUntracked = statusLines.some((line) => line.startsWith("??"));

	const branch = await tryGit(
		["symbolic-ref", "-q", "--short", "HEAD"],
		worktreePath
	);

	// From here, detached HEAD resolves only to YELLOW — a dirty detached tree
	// was already caught as RED above, and there is no branch to measure
	// ahead-count or merge state against.
	if (!branch) {
		const containingRefs = await tryGit(
			["for-each-ref", "--format=%(refname)", "--contains", "HEAD"],
			worktreePath
		);
		const isReferenced = Boolean(
			containingRefs && containingRefs.split("\n").filter(Boolean).length > 0
		);

		return isReferenced
			? { color: "YELLOW", reason: "detached-referenced" }
			: { color: "YELLOW", reason: "detached-dangling" };
	}

	const upstream = await tryGit(
		["rev-parse", "-q", "--verify", "@{u}"],
		worktreePath
	);
	const hasUpstream = upstream !== null;

	let ahead: number | null = null;

	if (hasUpstream) {
		const aheadOutput = await tryGit(
			["rev-list", "--count", "@{u}..HEAD"],
			worktreePath
		);
		ahead = aheadOutput === null ? null : Number(aheadOutput);
	}

	// Fast path: already pushed, so there's nothing a merged-PR lookup could
	// add — skip the `gh` call entirely.
	if (hasUpstream && ahead === 0) {
		return hasUntracked
			? { color: "YELLOW", reason: "untracked-only" }
			: { color: "GREEN", reason: "pushed" };
	}

	const mergedHeadOid = await deps.fetchMergedHeadOid(branch, worktreePath);

	if (mergedHeadOid) {
		const extraOutput = await tryGit(
			["rev-list", "--count", `${mergedHeadOid}..HEAD`],
			worktreePath
		);
		const extra = extraOutput === null ? null : Number(extraOutput);

		// Only a zero-commit gap between the merged PR's shipped commit and the
		// current HEAD proves the worktree carries nothing beyond what that PR
		// already shipped. A non-zero gap means a commit landed after the PR
		// merged and was never shipped by it — do not simplify this to "a
		// merged PR exists," which is the exact bug this port closes.
		if (extra === 0) {
			return hasUntracked
				? { color: "YELLOW", reason: "untracked-only" }
				: { color: "GREEN", reason: "pr-merged" };
		}
	}

	if (!hasUpstream) {
		return { color: "YELLOW", reason: "no-upstream" };
	}

	return { color: "RED", reason: "unpushed-commits" };
}

// ---------------------------------------------------------------------------
// CLI entry
// ---------------------------------------------------------------------------

/**
 * Looks up the merged PR that shipped `branch`, via `gh pr list`. `gh` being
 * absent, the branch never having a merged PR, or the lookup returning no
 * result are all the same outcome here — `null`, meaning "no merged-PR
 * evidence" — not an error.
 */
async function fetchMergedHeadOidViaGh(
	branch: string,
	cwd: string
): Promise<string | null> {
	try {
		const { stdout } = await execFileAsync(
			"gh",
			[
				"pr",
				"list",
				"--head",
				branch,
				"--state",
				"merged",
				"--json",
				"headRefOid",
				"-q",
				".[0].headRefOid",
			],
			{ cwd }
		);
		const oid = stdout.trim();

		return oid === "" || oid === "null" ? null : oid;
	} catch {
		return null;
	}
}

async function main(): Promise<void> {
	const worktreePath = process.argv[2];

	if (!worktreePath) {
		console.error("Usage: prism:worktree-classify <worktree-path>");
		process.exit(1);
	}

	try {
		const result = await classifyWorktree(worktreePath, {
			fetchMergedHeadOid: fetchMergedHeadOidViaGh,
		});
		console.log(`${result.color} ${result.reason}`);
		process.exit(0);
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
}

const invokedDirectly =
	process.argv[1] &&
	fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (invokedDirectly) {
	main();
}
