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
		// are gitignored and never part of the canonical mirror surface.
		if (entry.name === "worktrees") {
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
	relativePath: string
): LiteralGuardViolation[] {
	const violations: LiteralGuardViolation[] = [];

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index];
		const match = LITERAL_GUARD_PATTERN.exec(line);
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
 * Scans the given platform-output roots for Thrive-flavored literals. Returns
 * one violation per matching line. Files under an allowlisted path prefix are
 * exempt entirely.
 */
export async function runLiteralGuard(
	repoRoot: string,
	platformRoots: string[]
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
			violations.push(...scanLines(lines, relativeFromRepoRoot));
		}
	}

	return violations;
}
