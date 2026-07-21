/**
 * Build-time literal-Thrive guard: fails when platform outputs still contain
 * Thrive-flavored literals after token substitution has had its chance to
 * resolve them. Catches drift where a backport or new content lands with a
 * hardcoded `Thrive`, `tractru`, `TracTru/thrive`, `THR-NNNN`, or
 * `thrive.<key>` reference that should have been tokenized at the canonical
 * source instead.
 *
 * Scope is platform outputs only — the canonical surface (`.prism/`) can
 * legitimately contain these literals (frozen incident citations in
 * lessons.md, originating-incident ADRs). The allowlist exempts the post-
 * substitution mirrors of those frozen files by path prefix.
 *
 * Allowlist lives at `.ai-skills/definitions/literal-allowlist.json`. Entries
 * are path-prefix matches relative to repo root — any file whose path starts
 * with an allowlisted prefix is exempt entirely. File-level granularity keeps
 * the JSON small (one entry per file) while staying robust to line drift.
 */
import fs from "node:fs/promises";
import path from "node:path";

import { pathExists } from "./utils";

const LITERAL_GUARD_PATTERN =
	/(Thrive|tractru|TracTru\/thrive|THR-[0-9A-Z#*\\]+|thrive\.[a-zA-Z]+)/;

/**
 * Matches a leftover `${TOKEN}` literal — an UPPER_SNAKE_CASE token that the
 * substitution layer should have resolved before the file reached a platform
 * output. Mirrors the token shape in `lib/tokens.ts`'s `TOKEN_LITERAL_PATTERN`.
 * Unlike the Thrive-literal guard, this one is safe to run on consumer output:
 * a consumer legitimately contains "Thrive"-flavored words, but should never
 * carry an unresolved token.
 */
const LEFTOVER_TOKEN_PATTERN = /\$\{[A-Z][A-Z0-9_]*\}/;

/**
 * Dogfooding literals that must never reach a consumer's `.prism/`. The de-
 * thriving set (`Thrive`/`TracTru`/`THR-`/`thrive.`) plus PRISM's own ticket
 * refs (`PRISM-NNN`) and the migration meta-reference (`de-thriving`). `Sol`,
 * `Iris`, `ADR-NNNN` are deliberately absent — they are legitimate framework
 * content that ships to consumers. `Linear` is included because the install
 * seed must stay tracker-neutral; files that legitimately name Linear (the
 * onboarding tracker choice, Linear-specific gotchas) are carried on the
 * allowlist instead. Scans the install seed, the tree consumers receive
 * verbatim; allowlisted files (legitimate provenance) are exempt.
 */
const SEED_DOGFOODING_PATTERN =
	/(Thrive|tractru|TracTru\/thrive|THR-[0-9A-Z#*\\]+|thrive\.[a-zA-Z]+|PRISM-[0-9]+|de-thriving|\bLinear\b)/;

export interface LiteralGuardViolation {
	relativePath: string;
	line: number;
	match: string;
}

interface AllowlistEntry {
	path: string;
	reason: string;
}

interface AllowlistFile {
	files: AllowlistEntry[];
}

interface RelativeEntry {
	relativePath: string;
}

async function listFilesRecursively(
	rootPath: string,
	currentPath: string = rootPath
): Promise<RelativeEntry[]> {
	const out: RelativeEntry[] = [];
	const entries = await fs.readdir(currentPath, { withFileTypes: true });

	for (const entry of entries) {
		if (entry.name.startsWith(".") && entry.name !== ".managed-by-build") {
			continue;
		}

		// Per-tool worktrees/ dirs (.claude/worktrees/, .codex/worktrees/,
		// .cursor/worktrees/) hold operational state — full checkouts of other
		// branches that may legitimately contain Thrive-flavored literals. They
		// are gitignored and never part of the canonical mirror surface. Scoped
		// to depth 1 from rootPath so a nested directory that happens to be
		// named "worktrees" is still scanned.
		if (entry.name === "worktrees" && currentPath === rootPath) {
			continue;
		}

		const entryPath = path.join(currentPath, entry.name);

		if (entry.isDirectory()) {
			out.push(...(await listFilesRecursively(rootPath, entryPath)));
			continue;
		}

		if (entry.isFile()) {
			out.push({
				relativePath: path.relative(rootPath, entryPath),
			});
		}
	}

	return out;
}

async function loadAllowlist(repoRoot: string): Promise<string[]> {
	const allowlistPath = path.join(
		repoRoot,
		".ai-skills",
		"definitions",
		"literal-allowlist.json"
	);

	if (!(await pathExists(allowlistPath))) {
		return [];
	}

	const raw = await fs.readFile(allowlistPath, "utf8");
	let parsed: unknown;

	try {
		parsed = JSON.parse(raw);
	} catch (error) {
		throw new Error(
			`Invalid JSON in ${allowlistPath}: ${error instanceof Error ? error.message : String(error)}`
		);
	}

	if (
		parsed === null ||
		typeof parsed !== "object" ||
		Array.isArray(parsed) ||
		!Array.isArray((parsed as AllowlistFile).files)
	) {
		throw new Error(
			`${allowlistPath}: expected { "files": [...] } shape.`
		);
	}

	const allowlistFile = parsed as AllowlistFile;
	return allowlistFile.files.map((entry) => entry.path);
}

function isAllowlistedPath(
	relativePath: string,
	allowlist: string[]
): boolean {
	const normalized = relativePath.split(path.sep).join("/");
	for (const prefix of allowlist) {
		if (normalized === prefix || normalized.startsWith(`${prefix}/`)) {
			return true;
		}
	}
	return false;
}

function scanLines(
	lines: string[],
	relativePath: string,
	pattern: RegExp
): LiteralGuardViolation[] {
	const violations: LiteralGuardViolation[] = [];

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index];
		const match = pattern.exec(line);
		if (match) {
			violations.push({
				relativePath,
				line: index + 1,
				match: match[0],
			});
		}
	}

	return violations;
}

/**
 * Scans the given platform-output roots for lines matching `pattern`, returning
 * one violation per matching line. Files under an allowlisted path prefix are
 * exempt entirely. Shared engine behind both `runLiteralGuard` (Thrive-literal,
 * PRISM-only) and `runLeftoverTokenGuard` (leftover `${}`, PRISM and consumer).
 */
async function scanPlatformRoots(
	repoRoot: string,
	platformRoots: string[],
	pattern: RegExp
): Promise<LiteralGuardViolation[]> {
	const allowlist = await loadAllowlist(repoRoot);
	const violations: LiteralGuardViolation[] = [];

	for (const platformRoot of platformRoots) {
		if (!(await pathExists(platformRoot))) {
			continue;
		}

		const entries = await listFilesRecursively(platformRoot);
		for (const entry of entries) {
			const relativeFromRepoRoot = path
				.relative(repoRoot, path.join(platformRoot, entry.relativePath))
				.split(path.sep)
				.join("/");

			if (isAllowlistedPath(relativeFromRepoRoot, allowlist)) {
				continue;
			}

			const filePath = path.join(platformRoot, entry.relativePath);
			const lines = (await fs.readFile(filePath, "utf8")).split(/\r?\n/);
			violations.push(...scanLines(lines, relativeFromRepoRoot, pattern));
		}
	}

	return violations;
}

/**
 * Scans the given platform-output roots for Thrive-flavored literals. Returns
 * one violation per matching line. Files under an allowlisted path prefix are
 * exempt entirely.
 *
 * PRISM-build-only: this is a de-thriving canary. A consumer's output
 * legitimately contains "Thrive"-flavored words, so this guard never runs on
 * consumer output — only `runLeftoverTokenGuard` does (see plan prism-242
 * Decision "Two guards, not one").
 */
export async function runLiteralGuard(
	repoRoot: string,
	platformRoots: string[]
): Promise<LiteralGuardViolation[]> {
	return scanPlatformRoots(repoRoot, platformRoots, LITERAL_GUARD_PATTERN);
}

/**
 * Scans the given platform-output roots for leftover `${TOKEN}` literals that
 * the substitution layer should have resolved. Returns one violation per
 * matching line; allowlisted paths are exempt.
 *
 * Safe on both PRISM and consumer output — an unresolved token is a build bug
 * in either, so both the PRISM build and the consumer `prism:update`/`adopt`
 * flow run this guard over their rendered skill output.
 */
export async function runLeftoverTokenGuard(
	repoRoot: string,
	platformRoots: string[]
): Promise<LiteralGuardViolation[]> {
	return scanPlatformRoots(repoRoot, platformRoots, LEFTOVER_TOKEN_PATTERN);
}

/**
 * Scans the install seed (`templates/install/.prism`) for dogfooding literals
 * that would reach a consumer's `.prism/` verbatim. Reuses the allowlist-aware
 * scan engine; one violation per matching line.
 */
export async function runConsumerSeedLiteralGuard(
	repoRoot: string,
	seedRoot: string
): Promise<LiteralGuardViolation[]> {
	return scanPlatformRoots(repoRoot, [seedRoot], SEED_DOGFOODING_PATTERN);
}
