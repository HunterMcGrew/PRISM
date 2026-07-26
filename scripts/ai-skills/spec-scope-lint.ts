#!/usr/bin/env tsx
/**
 * Spec-content-scope lint: fails when a changed path is always-on process or
 * spec content and is unrelated to the branch's live plan.
 *
 * `.prism/rules/followup-scope.md` already forbade unrelated work riding a
 * ticket, and it was ignored because each edit looked like a one-liner — size
 * is what already failed, so this check cannot key on size either. It keys on
 * two computable conditions instead: whether the changed path *is* always-on
 * spec content, and whether that content is unrelated to the ticket. See
 * `.prism/rules/followup-scope.md` § Spec content never rides an unrelated
 * ticket and the plan's spec-content-trip-wire Decision.
 *
 * Composes with `pnpm prism:check`, following the `crossref-lint.ts`
 * standalone-script-per-invariant pattern. Independently runnable:
 * `npx tsx scripts/ai-skills/spec-scope-lint.ts`.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { pathExists, parseFrontmatter } from "./utils";
import {
	resolveLivePlan,
	extractTicketId,
	findUnfiledPlanCandidatesBySlug,
} from "./lib/resolve-live-plan";

const execFileAsync = promisify(execFile);

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.env.PRISM_REPO_ROOT
	? path.resolve(process.env.PRISM_REPO_ROOT)
	: path.resolve(scriptDirectory, "..", "..");

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface SpecScopeViolation {
	path: string;
	planPath: string;
}

export interface SpecScopeLintResult {
	violations: SpecScopeViolation[];
	planPath: string | null;
}

// ---------------------------------------------------------------------------
// Condition A — is this always-on process/spec content?
// ---------------------------------------------------------------------------

/**
 * Root prefixes for generated mirrors of canonical content. A changed path
 * under any of these is skipped entirely rather than evaluated — the mirror
 * inherits its canonical source's verdict, and `pnpm prism:build` regenerates
 * mirrors from canonical changes that land in the same diff, so the
 * canonical path is evaluated on its own when it too is a changed path.
 *
 * This holds unconditionally for `.claude/`, `.codex/`, `.cursor/` — `build.ts`
 * fully rewrites and content-diffs those on every `prism:check`. It does not
 * hold for every path under `templates/install/`: `isCuratedSeedTwin` carves
 * out the exception where the mirror claim is false.
 */
const MIRROR_ROOT_PREFIXES = [
	".claude/",
	".codex/",
	".cursor/",
	"templates/install/",
] as const;

/** The canonical content root's install-seed mirror, per `paths.json#canonical.templatesContentRoot`. */
const TEMPLATES_INSTALL_PRISM_PREFIX = "templates/install/.prism/";

/** Matches `.prism/references/review-<anything>.md`. */
const REVIEW_REFERENCE_RE = /^\.prism\/references\/review-[^/]+\.md$/;

/** Matches a file's `---\n...\n---` frontmatter block. */
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;

export function isMirrorPath(changedPath: string): boolean {
	return MIRROR_ROOT_PREFIXES.some((prefix) => changedPath.startsWith(prefix));
}

const curatedSeedPathsCache = new Map<string, Promise<Set<string>>>();

/**
 * Reads `.ai-skills/definitions/seed-curation.json`'s `curated` array —
 * the same source `build.ts`'s `checkSeedDrift` treats as authoritative —
 * and returns it as a set of canonical-relative paths (e.g.
 * `references/review-docs-impact.md`). Cached per repo root: this lint may
 * evaluate many changed paths per run and the file doesn't change mid-run.
 */
async function loadCuratedSeedPaths(repoRootPath: string): Promise<Set<string>> {
	const cached = curatedSeedPathsCache.get(repoRootPath);
	if (cached) {
		return cached;
	}

	const curatedPaths = (async () => {
		const curationPath = path.join(
			repoRootPath,
			".ai-skills",
			"definitions",
			"seed-curation.json"
		);

		if (!(await pathExists(curationPath))) {
			return new Set<string>();
		}

		const raw = await fs.readFile(curationPath, "utf8");
		const parsed = JSON.parse(raw) as { curated?: string[] };
		return new Set(parsed.curated ?? []);
	})();

	curatedSeedPathsCache.set(repoRootPath, curatedPaths);
	return curatedPaths;
}

/**
 * True when `changedPath` is a curated install-seed twin — a
 * `templates/install/.prism/` file whose canonical-relative path is listed
 * in `seed-curation.json`'s `curated` array. `checkSeedDrift` only verifies
 * a curated twin *exists*, never compares its content against the canonical
 * source, so an edit to a curated twin alone can drift silently. Curated
 * twins are evaluated the same as canonical content instead of being
 * skipped as a mirror.
 */
export async function isCuratedSeedTwin(
	repoRootPath: string,
	changedPath: string
): Promise<boolean> {
	if (!changedPath.startsWith(TEMPLATES_INSTALL_PRISM_PREFIX)) {
		return false;
	}

	const canonicalRelPath = changedPath.slice(TEMPLATES_INSTALL_PRISM_PREFIX.length);
	const curatedPaths = await loadCuratedSeedPaths(repoRootPath);
	return curatedPaths.has(canonicalRelPath);
}

/**
 * The path Condition A's pattern checks (skills root, `lessons.md`, the
 * `review-*.md` namespace) should match against. A curated seed twin lives
 * under `templates/install/.prism/`, but the patterns describe canonical
 * shapes (`.prism/references/review-*.md`) — so a curated twin is matched
 * against its canonical-equivalent path, not its own location on disk.
 */
function patternPathFor(changedPath: string, isCuratedTwin: boolean): string {
	if (!isCuratedTwin) {
		return changedPath;
	}

	return path.posix.join(
		".prism",
		changedPath.slice(TEMPLATES_INSTALL_PRISM_PREFIX.length)
	);
}

/**
 * Reads `changedPath`'s frontmatter and returns true when its `load` field is
 * `always`. Returns false when the file has no frontmatter or no longer
 * exists on disk (a deleted path has nothing to read) — permissive by design,
 * matching this lint's fail-permissive bias.
 */
async function declaresLoadAlways(
	repoRootPath: string,
	changedPath: string
): Promise<boolean> {
	const absPath = path.join(repoRootPath, changedPath);

	if (!(await pathExists(absPath))) {
		return false;
	}

	const raw = await fs.readFile(absPath, "utf8");
	const match = raw.match(FRONTMATTER_RE);

	if (!match) {
		return false;
	}

	const fields = parseFrontmatter(match[1]);
	return fields.get("load") === "always";
}

/**
 * Condition A — is `changedPath` always-on process/spec content? True when
 * the canonical source declares `load: always` in its frontmatter, or lives
 * under `.ai-skills/skills/**`, or is `.prism/lessons.md`, or matches
 * `.prism/references/review-*.md`. Reads the `load` field rather than
 * hard-coding a path list, per the plan's Decision.
 *
 * `patternPath` defaults to `changedPath` and drives the three path-pattern
 * checks; a curated seed twin passes its canonical-equivalent path here (see
 * `patternPathFor`) so the patterns match the shape they describe. Frontmatter
 * is always read from `changedPath` — the file whose bytes actually changed.
 */
export async function isAlwaysOnSpecContent(
	repoRootPath: string,
	changedPath: string,
	patternPath: string = changedPath
): Promise<boolean> {
	if (patternPath.startsWith(".ai-skills/skills/")) {
		return true;
	}

	if (patternPath === ".prism/lessons.md") {
		return true;
	}

	if (REVIEW_REFERENCE_RE.test(patternPath)) {
		return true;
	}

	return declaresLoadAlways(repoRootPath, changedPath);
}

// ---------------------------------------------------------------------------
// Condition B — is it unrelated to the ticket?
// ---------------------------------------------------------------------------

/** Root prefix under which the same handful of basenames repeat across every skill directory. */
const SKILLS_ROOT_PREFIX = ".ai-skills/skills/";

/**
 * The substring Condition B searches for in the plan text. Plain basename
 * works for every always-on-spec-content path except one class: a skill
 * body under `.ai-skills/skills/**` shares its basename (`shared.md`,
 * `claude.md`, `codex.md`, `cursor.md`) with every other skill's same-named
 * file, so basename alone can't tell one skill's body from another's — the
 * discriminator there is the skill directory plus the basename
 * (`prism-architect/shared.md`), which still satisfies the `## Decisions`
 * escape hatch (a Decision naming the full path contains that substring).
 * Every other class (a `.prism/rules/*.md` rule, `.prism/lessons.md`, a
 * `review-*.md` reference) carries a basename that's already unique in its
 * namespace, so plain basename stays the discriminator there.
 */
function discriminatorFor(changedPath: string): string {
	if (changedPath.startsWith(SKILLS_ROOT_PREFIX)) {
		return changedPath.slice(SKILLS_ROOT_PREFIX.length);
	}

	return path.basename(changedPath);
}

/**
 * Condition B — is `changedPath` unrelated to the ticket? True when its
 * discriminator (see `discriminatorFor`) appears nowhere in `planText`. A
 * `## Decisions` entry naming the path is itself part of the plan file, so
 * it satisfies this same check — no separate section-scoped search is
 * needed. Known false negative, accepted: a discriminator cited in the plan
 * for an unrelated reason also satisfies this check and suppresses the
 * error, which is the permissive bias this lint deliberately takes (see the
 * plan's Decision).
 */
export function isUnrelatedToTicket(changedPath: string, planText: string): boolean {
	return !planText.includes(discriminatorFor(changedPath));
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluates every changed path against Condition A and Condition B, resolving
 * the branch's live plan through the shared `resolveLivePlan` helper so this
 * lint and the queued plan-drift check can't disagree about which plan a
 * branch owns. Returns `planPath: null` when no live plan resolves — the
 * caller treats that as a pass, not a failure; a branch with no plan is a
 * `branch-plan.md` concern, not this lint's.
 */
export async function evaluateSpecScopeLint(
	repoRootPath: string,
	changedPaths: string[],
	branchName: string
): Promise<SpecScopeLintResult> {
	const planPath = await resolveLivePlan(branchName, repoRootPath);

	if (planPath === null) {
		return { violations: [], planPath: null };
	}

	const planText = await fs.readFile(path.join(repoRootPath, planPath), "utf8");
	const violations: SpecScopeViolation[] = [];

	for (const changedPath of changedPaths) {
		const curatedTwin = await isCuratedSeedTwin(repoRootPath, changedPath);

		if (isMirrorPath(changedPath) && !curatedTwin) {
			continue;
		}

		const patternPath = patternPathFor(changedPath, curatedTwin);
		if (!(await isAlwaysOnSpecContent(repoRootPath, changedPath, patternPath))) {
			continue;
		}

		if (!isUnrelatedToTicket(changedPath, planText)) {
			continue;
		}

		violations.push({ path: changedPath, planPath });
	}

	return { violations, planPath };
}

/** Exit code a run of this lint should produce for a given violation set. */
export function deriveExitCode(violations: SpecScopeViolation[]): number {
	return violations.length > 0 ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function tryGit(args: string[], cwd: string): Promise<string | null> {
	try {
		const { stdout } = await execFileAsync("git", args, { cwd });
		return stdout.trim();
	} catch {
		return null;
	}
}

export async function readDefaultBranch(repoRootPath: string): Promise<string> {
	const configPath = path.join(repoRootPath, ".ai-skills", "config.json");
	const raw = await fs.readFile(configPath, "utf8").catch(() => null);

	if (!raw) {
		return "main";
	}

	try {
		const parsed = JSON.parse(raw) as { defaultBranch?: string };
		return parsed.defaultBranch ?? "main";
	} catch {
		return "main";
	}
}

/**
 * Resolves the ref to diff against, fetching it on demand when the local
 * repository doesn't already have it.
 *
 * `actions/checkout@v4`'s default `pull_request` checkout is a single-branch,
 * depth-1 fetch that scopes `remote.origin.fetch` to just the PR's own ref —
 * `origin/<defaultBranch>` never exists locally under that config, so a plain
 * `rev-parse --verify` fails and the merge-base step silently no-ops. Because
 * the configured refspec doesn't cover `defaultBranch`, `git fetch origin
 * <defaultBranch>` alone only updates `FETCH_HEAD`; the destination refspec
 * (`<defaultBranch>:refs/remotes/origin/<defaultBranch>`) is what actually
 * creates the `origin/<defaultBranch>` tracking ref the rest of this
 * function (and `main()`'s merge-base call) depends on.
 *
 * A depth-1 fetch of `defaultBranch` only retrieves its current tip, not the
 * historical commit the PR branch actually forked from — fetching more of
 * `defaultBranch`'s history doesn't fix that on its own, because the local
 * HEAD (the PR branch itself) is also shallow: its own commit object still
 * has a real parent pointer, but git's shallow boundary hides that parent
 * during traversal, so `merge-base` can't walk back to a common ancestor no
 * matter how much of `defaultBranch` is fetched. `git fetch --unshallow`
 * removes that boundary and deepens HEAD's own history to the root, which is
 * what actually makes a common ancestor discoverable again.
 */
export async function resolveMergeBaseRef(
	repoRootPath: string,
	defaultBranch: string
): Promise<string> {
	const remoteRef = `origin/${defaultBranch}`;
	if ((await tryGit(["rev-parse", "--verify", remoteRef], repoRootPath)) !== null) {
		return remoteRef;
	}

	await tryGit(["fetch", "--unshallow", "origin"], repoRootPath);
	await tryGit(
		["fetch", "origin", `${defaultBranch}:refs/remotes/${remoteRef}`],
		repoRootPath
	);
	if ((await tryGit(["rev-parse", "--verify", remoteRef], repoRootPath)) !== null) {
		return remoteRef;
	}

	return defaultBranch;
}

/**
 * Reads the PR's head branch name from `GITHUB_HEAD_REF` — the environment
 * variable GitHub Actions populates for `pull_request` events — before
 * falling back to `git branch --show-current`. `actions/checkout@v4` checks
 * out `pull_request` events at a detached HEAD by default, where
 * `git branch --show-current` returns an empty string; that empty string
 * makes `extractTicketId` return null, which makes this lint silently no-op
 * in the one place it's meant to enforce: CI on every PR.
 */
export function resolveBranchNameFromEnv(): string | null {
	const headRef = process.env.GITHUB_HEAD_REF;
	return headRef && headRef.trim().length > 0 ? headRef.trim() : null;
}

/**
 * Explains why `resolveLivePlan` returned null for `branchName` — no
 * candidate at all, or several unfiled plans whose slugs all matched (a
 * state `resolveLivePlan`'s own `string | null` return can't distinguish
 * from "nothing matched," since it fails closed on both). Only the
 * unfiled-plan-by-slug tier can be ambiguous — a branch carrying a ticket-id
 * token resolves through the deterministic ticket-id tiers instead, so this
 * only re-scans when `extractTicketId` finds nothing.
 */
export async function describeNoLivePlan(
	branchName: string,
	repoRootPath: string
): Promise<string> {
	if (extractTicketId(branchName) === null) {
		const candidates = await findUnfiledPlanCandidatesBySlug(
			branchName,
			repoRootPath
		);
		if (candidates.length > 1) {
			return `spec-scope-lint: ${candidates.length} unfiled plans match this branch slug (${candidates.join(", ")}) — refusing to guess. Skipping.`;
		}
	}

	return "spec-scope-lint: no live plan resolved for this branch — skipping.";
}

async function main(): Promise<void> {
	const branchName =
		resolveBranchNameFromEnv() ??
		(await tryGit(["branch", "--show-current"], repoRoot)) ??
		"";
	const defaultBranch = await readDefaultBranch(repoRoot);
	const mergeBaseRef = await resolveMergeBaseRef(repoRoot, defaultBranch);
	const mergeBase = await tryGit(
		["merge-base", mergeBaseRef, "HEAD"],
		repoRoot
	);

	if (mergeBase === null) {
		console.log(
			"spec-scope-lint: could not resolve a merge-base against the default branch — skipping."
		);
		return;
	}

	const diffOutput = await tryGit(
		["diff", "--name-only", mergeBase, "HEAD"],
		repoRoot
	);
	const changedPaths = (diffOutput ?? "")
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	const result = await evaluateSpecScopeLint(repoRoot, changedPaths, branchName);

	if (result.planPath === null) {
		console.log(await describeNoLivePlan(branchName, repoRoot));
		return;
	}

	const exitCode = deriveExitCode(result.violations);

	if (exitCode === 0) {
		console.log("spec-scope-lint passed. No unrelated spec content found.");
		return;
	}

	for (const violation of result.violations) {
		console.error(
			`${violation.path}: always-on spec content unrelated to this ticket (basename absent from ${violation.planPath}). Ship it as a follow-up PR per .prism/rules/followup-scope.md, or add a ## Decisions entry naming this path and the reason.`
		);
	}

	process.exit(exitCode);
}

const invokedDirectly =
	process.argv[1] &&
	fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invokedDirectly) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	});
}
