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
import { resolveLivePlan } from "./lib/resolve-live-plan";

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
 */
const MIRROR_ROOT_PREFIXES = [
	".claude/",
	".codex/",
	".cursor/",
	"templates/install/",
] as const;

/** Matches `.prism/references/review-<anything>.md`. */
const REVIEW_REFERENCE_RE = /^\.prism\/references\/review-[^/]+\.md$/;

/** Matches a file's `---\n...\n---` frontmatter block. */
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;

export function isMirrorPath(changedPath: string): boolean {
	return MIRROR_ROOT_PREFIXES.some((prefix) => changedPath.startsWith(prefix));
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
 */
export async function isAlwaysOnSpecContent(
	repoRootPath: string,
	changedPath: string
): Promise<boolean> {
	if (changedPath.startsWith(".ai-skills/skills/")) {
		return true;
	}

	if (changedPath === ".prism/lessons.md") {
		return true;
	}

	if (REVIEW_REFERENCE_RE.test(changedPath)) {
		return true;
	}

	return declaresLoadAlways(repoRootPath, changedPath);
}

// ---------------------------------------------------------------------------
// Condition B — is it unrelated to the ticket?
// ---------------------------------------------------------------------------

/**
 * Condition B — is `changedPath` unrelated to the ticket? True when its
 * basename appears nowhere in `planText`. A `## Decisions` entry naming the
 * path is itself part of the plan file, so it satisfies this same basename
 * check — no separate section-scoped search is needed. Known false negative,
 * accepted: a basename cited in the plan for an unrelated reason also
 * satisfies this check and suppresses the error, which is the permissive
 * bias this lint deliberately takes (see the plan's Decision).
 */
export function isUnrelatedToTicket(changedPath: string, planText: string): boolean {
	return !planText.includes(path.basename(changedPath));
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
		if (isMirrorPath(changedPath)) {
			continue;
		}

		if (!(await isAlwaysOnSpecContent(repoRootPath, changedPath))) {
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

async function readDefaultBranch(repoRootPath: string): Promise<string> {
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

async function resolveMergeBaseRef(
	repoRootPath: string,
	defaultBranch: string
): Promise<string> {
	const remoteRef = `origin/${defaultBranch}`;
	if ((await tryGit(["rev-parse", "--verify", remoteRef], repoRootPath)) !== null) {
		return remoteRef;
	}
	return defaultBranch;
}

async function main(): Promise<void> {
	const branchName = (await tryGit(["branch", "--show-current"], repoRoot)) ?? "";
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
		console.log(
			"spec-scope-lint: no live plan resolved for this branch — skipping."
		);
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
