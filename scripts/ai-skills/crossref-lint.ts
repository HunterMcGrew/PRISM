#!/usr/bin/env tsx
/**
 * Prose cross-reference lint: fails when a content carrier in a scanned root
 * references a repo-root-absolute path that does not exist on disk.
 *
 * Closes the gap that PR #156's three-pass sweep revealed — existing checks
 * guard generated-output drift and manifest coverage, but none guards source-
 * prose resolvability. A moved `_toolkit/` path in a canonical doc passes
 * `prism:check` green today; this lint makes it fail.
 *
 * Composes with `pnpm prism:check` as a fourth step, following the
 * `verify-manifest-coverage.ts` standalone-script-per-invariant pattern.
 * Independently runnable: `npx tsx scripts/ai-skills/crossref-lint.ts`.
 *
 * Resolution model: only repo-root-absolute refs starting with `.prism/`,
 * `scripts/`, `.ai-skills/`, or `templates/` are resolved. Relative links
 * (`./`, `../`, bare paths) and refs into generated/published surfaces
 * (`.claude/`, `.codex/`, `.cursor/`, `.github/`, `docs/`) are skipped —
 * canonical content authors those to resolve in the consumer's installed tree,
 * not in this partial monorepo. See the plan's resolution-model decision.
 *
 * Scan roots: `.prism/{rules,architect,spec,references,templates}` +
 * `templates/install/.prism/` mirror + repo-root loose files (AGENTS.md,
 * templates/install/AGENTS.md.tmpl, templates/install/.claude/CLAUDE.md.tmpl).
 *
 * Excluded by search-root choice (not by grep -v): `plans/`, `lessons.md`,
 * `audits/`, `retros/`, `prds/`, `design/` — historical and agent-generated
 * working surfaces that legitimately reference moved/deleted paths as working
 * records or evidence.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";

import { pathExists } from "./utils";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.env.PRISM_REPO_ROOT
	? path.resolve(process.env.PRISM_REPO_ROOT)
	: path.resolve(scriptDirectory, "../..");

// ---------------------------------------------------------------------------
// Public constants
// ---------------------------------------------------------------------------

/**
 * The full set of extensions that can carry repo path references. Used as the
 * shape-test set in `looksLikeRepoPath` and `isExternalOrToken` to recognize
 * path candidates in inline-code spans.
 *
 * Note: `.json` and `.toml` files are excluded from the file walk (see
 * `PROSE_SCAN_EXTENSIONS`) because extracting path references from structured
 * data requires a dedicated parser — applying markdown-link and inline-code
 * regexes to JSON/TOML produces high false-positive rates.
 */
export const CARRIER_EXTENSIONS = [
	".md",
	".tmpl",
	".mdc",
	".json",
	".toml",
] as const;

/**
 * Subset of CARRIER_EXTENSIONS actually walked during the file scan. Prose
 * files only — `.json` and `.toml` are excluded until a dedicated parser is
 * available (see CARRIER_EXTENSIONS note).
 */
const PROSE_SCAN_EXTENSIONS = [".md", ".tmpl", ".mdc"] as const;

/**
 * Repo-root segments that identify a path as repo-root-absolute regardless of
 * the referencing file's location. Used by `extractRefs` / `looksLikeRepoPath`
 * for shape-testing only — resolution uses the narrower VERIFIABLE_ROOT_PREFIXES
 * set below.
 */
const REPO_ROOT_SEGMENTS = [
	".prism/",
	"templates/",
	"scripts/",
	".ai-skills/",
	".claude/",
] as const;

/**
 * Repo-root-absolute prefixes the monorepo materializes and can verify. A ref
 * is resolved only when it starts with one of these — relative links and refs
 * into generated/published surfaces (.claude/, .codex/, .cursor/, .github/,
 * docs/) are authored to resolve in the consumer's installed tree, not in this
 * partial canonical tree, so the monorepo can't validate them. See the plan's
 * resolution-model decision.
 */
const VERIFIABLE_ROOT_PREFIXES = [
	".prism/",
	"scripts/",
	".ai-skills/",
	"templates/",
] as const;

/**
 * Scan descriptor for a content root. `areas` are subdirectories walked
 * recursively; `looseFiles` are single files at the root level.
 */
interface ScanRoot {
	/** Absolute path to the root directory, or null for repo-root loose files. */
	contentRoot: string | null;
	areas: string[];
	looseFiles: string[];
}

export const CROSSREF_SCAN_ROOTS: ScanRoot[] = [
	{
		contentRoot: ".prism",
		areas: ["rules", "architect", "spec", "references", "templates"],
		looseFiles: ["SPEC.md"],
	},
	{
		contentRoot: "templates/install/.prism",
		areas: ["rules", "architect", "spec", "references", "templates"],
		looseFiles: ["SPEC.md.tmpl"],
	},
	{
		// Repo-root loose files — contentRoot null means resolve against repoRoot
		contentRoot: null,
		areas: [],
		looseFiles: [
			"AGENTS.md",
			"templates/install/AGENTS.md.tmpl",
			"templates/install/.claude/CLAUDE.md.tmpl",
		],
	},
];

export interface CrossRefViolation {
	relativePath: string;
	line: number;
	ref: string;
	resolved: string;
}

/**
 * File+ref allowlist for illustrative or intentionally-broken refs that should
 * not be flagged. Each entry is a `relativePath::ref` pair. Seeded empty —
 * add entries only when a genuine illustrative ref surfaces in a scanned doc,
 * with a source comment explaining why the specific ref is exempt.
 *
 * Matched by exact `(relativePath, ref)` pair — never by path-substring grep.
 *
 * Gitignored targets (e.g. `.prism/.sync-manifest.json`) do not need entries
 * here — the gitignore gate in `runCrossRefLint` / `resolveGitignored` skips
 * them upstream before the existence check, so they never reach this allowlist.
 */
export const CROSSREF_FILE_ALLOWLIST: ReadonlySet<string> = new Set<string>([
	// Atlas generates these per consumer stack (see rule-generation.md);
	// PRISM does not ship them — illustrative references to generated output.
	".prism/architect/_toolkit/onboarding.md::.prism/rules/security.md",
	"templates/install/.prism/architect/_toolkit/onboarding.md::.prism/rules/security.md",
	".prism/architect/_toolkit/rule-generation.md::.prism/rules/security.md",
	"templates/install/.prism/architect/_toolkit/rule-generation.md::.prism/rules/security.md",
	".prism/architect/_toolkit/rule-generation.md::.prism/rules/react-guidelines.md",
	"templates/install/.prism/architect/_toolkit/rule-generation.md::.prism/rules/react-guidelines.md",
	// ADR-0029 illustrates the self-declare rule with a manifest.json example;
	// PRISM does not ship manifest.json — generated per consumer stack.
	".prism/spec/adrs/_toolkit/0029-rules-self-declare-applicability.md::.prism/rules/manifest.json",
	"templates/install/.prism/spec/adrs/_toolkit/0029-rules-self-declare-applicability.md::.prism/rules/manifest.json",
	// ADR-0044 narrates this script's intentional absence in PRISM (extracted
	// before install-cursor.ts was added) — prose mention, not a live link.
	".prism/spec/adrs/_toolkit/0044-direct-write-tool-outputs.md::scripts/ai-skills/install-cursor.ts",
	"templates/install/.prism/spec/adrs/_toolkit/0044-direct-write-tool-outputs.md::scripts/ai-skills/install-cursor.ts",
	// .prism/business/strategy.md is a lazy artifact — Vera (prism-founder) creates
	// it on first real write per lazy-artifacts.md; it is never seeded in the
	// monorepo tree. ADR-0060, business-layer.md, the strategy template, and the
	// ADR README all reference it as the live artifact location.
	".prism/architect/_toolkit/business-layer.md::.prism/business/strategy.md",
	"templates/install/.prism/architect/_toolkit/business-layer.md::.prism/business/strategy.md",
	".prism/spec/adrs/_toolkit/0060-business-layer-substrate.md::.prism/business/strategy.md",
	"templates/install/.prism/spec/adrs/_toolkit/0060-business-layer-substrate.md::.prism/business/strategy.md",
	".prism/spec/adrs/_toolkit/README.md::.prism/business/strategy.md",
	"templates/install/.prism/spec/adrs/_toolkit/README.md::.prism/business/strategy.md",
	".prism/templates/business-strategy.md::.prism/business/strategy.md",
	"templates/install/.prism/templates/business-strategy.md::.prism/business/strategy.md",
]);

// ---------------------------------------------------------------------------
// Gitignore gate
// ---------------------------------------------------------------------------

/**
 * Returns the subset of `candidates` that git considers gitignored, resolved
 * against `repoRootPath`.
 *
 * Shells out to `git check-ignore --stdin` — pattern-based, not
 * filesystem-based — so it returns the same result on the dogfood tree and
 * on a clean CI checkout, which is the property that fixes the
 * local-false-pass problem.
 *
 * Exit-code handling:
 *   exit 0  — some paths matched; stdout lists them one per line.
 *   exit 1 with empty stderr — zero paths matched; not an error.
 *   any other code (e.g. 128 = not a git repo) — fail-open: return an empty
 *   Set so resolution falls through to the normal existence check rather than
 *   crashing the lint.
 */
export async function resolveGitignored(
	candidates: string[],
	repoRootPath: string
): Promise<Set<string>> {
	if (candidates.length === 0) {
		return new Set();
	}

	return new Promise((resolve) => {
		const child = execFile(
			"git",
			["check-ignore", "--stdin"],
			{ cwd: repoRootPath },
			(error, stdout, stderr) => {
				// exit 0 — some paths matched
				if (!error) {
					const ignored = stdout
						.split(/\r?\n/)
						.filter((line) => line.length > 0);

					resolve(new Set(ignored));

					return;
				}

				// exit 1 with empty stderr — zero paths matched (not an error)
				const code = error.code;
				if (code === 1 && stderr.trim() === "") {
					resolve(new Set());

					return;
				}

				// Any other exit code — fail-open: degrade to today's behavior
				resolve(new Set());
			}
		);

		child.stdin?.write(candidates.join("\n"));
		child.stdin?.end();
	});
}

// ---------------------------------------------------------------------------
// Pure helpers (exported for tests)
// ---------------------------------------------------------------------------

/**
 * Returns true for repo-root-absolute targets that are intentionally absent —
 * persona state files created on first write (per lazy-artifacts.md), the
 * onboarding registry, lazy archive files, and historical plan citations.
 * These are skipped before the existence check.
 */
export function isLazyOrHistoricalTarget(cleaned: string): boolean {
	if (/^\.prism\/[a-z-]+-state\.json(\.tmp)?$/.test(cleaned)) {
		return true;
	}

	if (cleaned.startsWith(".ai-skills/registry/")) {
		return true;
	}

	if (/(^|\/)lessons-archive\.md$/.test(cleaned)) {
		return true;
	}

	if (cleaned.startsWith(".prism/plans/")) {
		return true;
	}

	return false;
}

/** Markdown inline-link regex: [text](target) */
const MARKDOWN_LINK_RE = /\[[^\]]*\]\(([^)]+)\)/g;

/** Backtick-span regex */
const INLINE_CODE_RE = /`([^`]+)`/g;

/**
 * Returns true when a candidate string (after stripping anchor/query) looks
 * like a repo-relative path: it contains a `/`, has no spaces (paths never
 * contain spaces in this repo), and at least one of —
 *   - starts with `./` or `../`
 *   - starts with a known repo-root segment
 *   - ends in a CARRIER_EXTENSIONS member
 */
export function looksLikeRepoPath(candidate: string): boolean {
	// Strip anchor and query string for the shape test
	const withoutFragment = candidate.split("#")[0];
	const withoutQuery = withoutFragment.split("?")[0];
	const s = withoutQuery;

	// Paths never contain spaces; commands like `gh pr create --body-file /tmp/x.md` do
	if (s.includes(" ")) {
		return false;
	}

	if (!s.includes("/")) {
		return false;
	}

	if (s.startsWith("./") || s.startsWith("../")) {
		return true;
	}

	for (const seg of REPO_ROOT_SEGMENTS) {
		if (s.startsWith(seg)) {
			return true;
		}
	}

	const lastDotIndex = s.lastIndexOf(".");
	if (lastDotIndex !== -1) {
		const ext = s.slice(lastDotIndex);
		if ((CARRIER_EXTENSIONS as ReadonlyArray<string>).includes(ext)) {
			return true;
		}
	}

	return false;
}

/**
 * Returns true when the target is not a resolvable filesystem path — external
 * URLs, template tokens, angle-bracket placeholders, glob patterns, section
 * references, line-number suffixes, ellipsis paths, absolute OS paths, and
 * directory-only refs (ending in `/`). These are skipped before resolution.
 */
export function isExternalOrToken(target: string): boolean {
	if (/^(https?|mailto|tel|ftp):/.test(target)) {
		return true;
	}
	if (/^\/\//.test(target)) {
		return true;
	}
	if (target.includes("${")) {
		return true;
	}
	// Angle-bracket placeholders like <ticket-id>, <skill>, <file>
	if (target.includes("<") || target.includes(">")) {
		return true;
	}
	// Square-bracket placeholders like [name], [id]
	if (target.includes("[") || target.includes("]")) {
		return true;
	}
	// Glob patterns — never real filesystem paths
	if (target.includes("*") || target.includes("{") || target.includes("}")) {
		return true;
	}
	// Section references using § separator (not a fragment but a content section)
	if (target.includes("§")) {
		return true;
	}
	// Ellipsis in path (…/plan-mode.md) — truncated display path, not resolvable
	if (target.includes("…")) {
		return true;
	}
	// Line-number suffixes like file.md:12 — not a filesystem path
	if (/\.(?:md|tmpl|mdc|json|toml):\d+$/.test(target)) {
		return true;
	}
	// Absolute OS paths like /mnt/... — not repo-relative
	if (target.startsWith("/")) {
		return true;
	}
	// Directory-only refs ending in / — not a file path we can check with pathExists
	if (target.endsWith("/")) {
		return true;
	}
	return false;
}

/**
 * Given a line of text, extracts all raw ref targets from:
 *   (a) Markdown inline links: [text](target) — shape-tested via looksLikeRepoPath
 *   (b) Inline-code spans whose content looks like a repo path
 *
 * Does not filter externals or tokens — callers apply `isExternalOrToken`.
 */
export function extractRefs(line: string): string[] {
	const refs: string[] = [];

	// (a) Markdown inline links — shape-tested to avoid bare words like `url`
	let match: RegExpExecArray | null;
	MARKDOWN_LINK_RE.lastIndex = 0;
	while ((match = MARKDOWN_LINK_RE.exec(line)) !== null) {
		const target = match[1];
		// External URLs and tokens have no slash requirement, so check
		// isExternalOrToken first, then shape-test the rest
		if (
			/^(https?|mailto|tel|ftp):/.test(target) ||
			/^\/\//.test(target) ||
			target.startsWith("#") ||
			looksLikeRepoPath(target)
		) {
			refs.push(target);
		}
	}

	// (b) Inline-code spans — shape-tested
	INLINE_CODE_RE.lastIndex = 0;
	while ((match = INLINE_CODE_RE.exec(line)) !== null) {
		const candidate = match[1];
		if (looksLikeRepoPath(candidate)) {
			refs.push(candidate);
		}
	}

	return refs;
}

/**
 * Strips the anchor fragment and query string from a ref target, then resolves
 * it to an absolute path.
 *
 * Repo-root-absolute refs (starting with a known root segment) resolve against
 * `repoRootPath`. All other refs resolve relative to the referencing file's
 * own directory.
 *
 * Kept exported for the test suite. `scanLines` no longer calls this function —
 * under the repo-root-absolute-only model it resolves directly via
 * `path.resolve(repoRootPath, cleaned)` after gating on VERIFIABLE_ROOT_PREFIXES.
 */
export function resolveRef(
	referencingFileAbsPath: string,
	repoRootPath: string,
	target: string
): string {
	// Strip anchor fragment and query string
	const withoutFragment = target.split("#")[0];
	const withoutQuery = withoutFragment.split("?")[0];
	const cleaned = withoutQuery;

	if (!cleaned) {
		// Pure anchor ref — caller should skip pure-anchor refs before calling
		return "";
	}

	// Check for repo-root-absolute ref
	for (const seg of REPO_ROOT_SEGMENTS) {
		if (cleaned.startsWith(seg)) {
			return path.resolve(repoRootPath, cleaned);
		}
	}

	// Relative ref — resolve against the referencing file's directory
	return path.resolve(path.dirname(referencingFileAbsPath), cleaned);
}

/**
 * Returns true when the resolved path exists on disk, or when its `.tmpl`
 * twin (or the `.md` form of a `.tmpl` path) exists.
 */
export async function refResolves(resolvedAbsPath: string): Promise<boolean> {
	if (await pathExists(resolvedAbsPath)) {
		return true;
	}
	// Check for a .tmpl twin of a .md path
	if (await pathExists(resolvedAbsPath + ".tmpl")) {
		return true;
	}
	// Check for the .md form of a .tmpl path (seed stores .tmpl twins of .md files)
	if (resolvedAbsPath.endsWith(".tmpl")) {
		const mdForm = resolvedAbsPath.slice(0, -".tmpl".length);
		if (await pathExists(mdForm)) {
			return true;
		}
	}
	return false;
}

/**
 * Scans a file's lines for prose cross-reference violations.
 *
 * `relativePath` is used in violation records and the allowlist lookup.
 * `referencingFileAbsPath` is the absolute path of the file being scanned.
 * `repoRootPath` is the absolute repo root.
 * `allowlist` defaults to `CROSSREF_FILE_ALLOWLIST`.
 * `gitignoredSet` is the pre-resolved set of gitignored paths (repo-root-relative
 * POSIX strings). Refs matching this set are skipped before the existence check —
 * gitignored targets are runtime-generated and absent on clean checkouts by design.
 * Defaults to an empty Set so callers that don't batch the git call still work.
 */
export async function scanLines(
	lines: string[],
	relativePath: string,
	referencingFileAbsPath: string,
	repoRootPath: string,
	allowlist: ReadonlySet<string> = CROSSREF_FILE_ALLOWLIST,
	gitignoredSet: ReadonlySet<string> = new Set()
): Promise<CrossRefViolation[]> {
	const violations: CrossRefViolation[] = [];
	let inFence = false;

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index];

		// Toggle fence state on opening/closing fence markers
		if (/^\s{0,3}```/.test(line)) {
			inFence = !inFence;
			continue;
		}

		if (inFence) {
			continue;
		}

		// Skip indented code blocks (4+ spaces following a blank line)
		if (index > 0 && lines[index - 1].trim() === "" && /^ {4}/.test(line)) {
			continue;
		}

		const rawRefs = extractRefs(line);

		for (const rawRef of rawRefs) {
			// Skip externals and token literals
			if (isExternalOrToken(rawRef)) {
				continue;
			}

			// Strip anchor/query to get the path part
			const cleaned = rawRef.split("#")[0].split("?")[0];

			// Skip pure-anchor refs (empty path part)
			if (!cleaned) {
				continue;
			}

			// Resolve only repo-root-absolute refs with verifiable prefixes.
			// Relative links (./,  ../, bare paths) and refs into generated/
			// published surfaces (.claude/, .codex/, docs/) are authored for
			// the consumer's installed tree — the monorepo can't validate them.
			if (!VERIFIABLE_ROOT_PREFIXES.some((p) => cleaned.startsWith(p))) {
				continue;
			}

			// Skip lazy-artifact and historical-plan targets — intentionally absent.
			if (isLazyOrHistoricalTarget(cleaned)) {
				continue;
			}

			// Skip gitignored targets — runtime-generated files are absent on
			// clean checkouts by design; the gitignore gate handles them upstream.
			if (gitignoredSet.has(cleaned)) {
				continue;
			}

			const allowlistKey = `${relativePath}::${rawRef}`;
			if (allowlist.has(allowlistKey)) {
				continue;
			}

			const resolved = path.resolve(repoRootPath, cleaned);

			if (!(await refResolves(resolved))) {
				violations.push({
					relativePath,
					line: index + 1,
					ref: rawRef,
					resolved,
				});
			}
		}
	}

	return violations;
}

// ---------------------------------------------------------------------------
// File walker
// ---------------------------------------------------------------------------

/**
 * Recursively lists files under `dirPath` with the given extensions,
 * skipping dotfile directories.
 */
async function listCarrierFiles(dirPath: string): Promise<string[]> {
	const out: string[] = [];
	try {
		const entries = await fs.readdir(dirPath, { withFileTypes: true });

		for (const entry of entries) {
			if (entry.name.startsWith(".")) {
				continue;
			}
			const entryPath = path.join(dirPath, entry.name);
			if (entry.isDirectory()) {
				out.push(...(await listCarrierFiles(entryPath)));
				continue;
			}
			if (entry.isFile()) {
				const ext = path.extname(entry.name);
				if ((PROSE_SCAN_EXTENSIONS as ReadonlyArray<string>).includes(ext)) {
					out.push(entryPath);
				}
			}
		}
	} catch {
		return out;
	}

	return out;
}

// ---------------------------------------------------------------------------
// Main lint runner
// ---------------------------------------------------------------------------

/**
 * Collects the (relativePath, absPath, lines) tuples for every carrier file
 * across all `CROSSREF_SCAN_ROOTS` descriptors. Shared by `runCrossRefLint`
 * so the full file list is available before the gitignore batch call.
 */
async function collectCarrierFiles(
	repoRootPath: string
): Promise<Array<{ relativePath: string; absPath: string; lines: string[] }>> {
	const files: Array<{
		relativePath: string;
		absPath: string;
		lines: string[];
	}> = [];

	for (const scanRoot of CROSSREF_SCAN_ROOTS) {
		const rootAbsPath =
			scanRoot.contentRoot === null
				? repoRootPath
				: path.resolve(repoRootPath, scanRoot.contentRoot);

		for (const area of scanRoot.areas) {
			const areaAbsPath = path.join(rootAbsPath, area);

			if (!(await pathExists(areaAbsPath))) {
				continue;
			}

			for (const absPath of await listCarrierFiles(areaAbsPath)) {
				const relativePath = path
					.relative(repoRootPath, absPath)
					.split(path.sep)
					.join("/");
				const lines = (await fs.readFile(absPath, "utf8")).split(/\r?\n/);
				files.push({ relativePath, absPath, lines });
			}
		}

		for (const looseFile of scanRoot.looseFiles) {
			const absPath =
				scanRoot.contentRoot === null
					? path.resolve(repoRootPath, looseFile)
					: path.resolve(rootAbsPath, looseFile);

			if (!(await pathExists(absPath))) {
				continue;
			}

			const relativePath = path
				.relative(repoRootPath, absPath)
				.split(path.sep)
				.join("/");
			const lines = (await fs.readFile(absPath, "utf8")).split(/\r?\n/);
			files.push({ relativePath, absPath, lines });
		}
	}

	return files;
}

/**
 * Walks all `CROSSREF_SCAN_ROOTS` descriptors, reads each carrier file, and
 * collects cross-reference violations. Returns `[]` when a root does not exist.
 *
 * Batches the gitignore check: collects all candidate refs across all files
 * first, resolves the ignored set once (one `git check-ignore` call), then
 * passes the set into `scanLines` so ignored targets are never existence-checked.
 */
export async function runCrossRefLint(
	repoRootPath: string
): Promise<CrossRefViolation[]> {
	const carrierFiles = await collectCarrierFiles(repoRootPath);

	// Collect every cleaned candidate ref across all files to batch the git call.
	const candidateSet = new Set<string>();
	for (const { lines } of carrierFiles) {
		for (const line of lines) {
			for (const rawRef of extractRefs(line)) {
				if (isExternalOrToken(rawRef)) {
					continue;
				}

				const cleaned = rawRef.split("#")[0].split("?")[0];

				if (
					!cleaned ||
					!VERIFIABLE_ROOT_PREFIXES.some((p) => cleaned.startsWith(p))
				) {
					continue;
				}

				if (isLazyOrHistoricalTarget(cleaned)) {
					continue;
				}

				candidateSet.add(cleaned);
			}
		}
	}

	const gitignoredSet = await resolveGitignored(
		[...candidateSet],
		repoRootPath
	);

	const violations: CrossRefViolation[] = [];

	for (const { relativePath, absPath, lines } of carrierFiles) {
		violations.push(
			...(await scanLines(
				lines,
				relativePath,
				absPath,
				repoRootPath,
				CROSSREF_FILE_ALLOWLIST,
				gitignoredSet
			))
		);
	}

	return violations;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
	const violations = await runCrossRefLint(repoRoot);

	if (violations.length > 0) {
		for (const v of violations) {
			console.error(
				`crossref-lint: ${v.relativePath}:${v.line}: ${v.ref} → ${v.resolved} (does not exist)`
			);
		}
		console.error(
			`\ncrossref-lint failed. ${violations.length} unresolved reference${violations.length === 1 ? "" : "s"} found.`
		);
		process.exit(1);
	}

	console.log("crossref-lint passed. All prose cross-references resolve.");
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
