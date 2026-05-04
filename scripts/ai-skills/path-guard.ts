/**
 * Build-time path guard: fails when canonical content cites platform-dir paths
 * (`.claude/<area>/`, `.codex/<area>/`, `.cursor/<area>/`) for an area that
 * gets mirrored to those dirs by `prism:build`.
 *
 * Limited to copied areas because copied content lands at every platform — a
 * file under `.prism/rules/` ships to `.claude/rules/`, `.codex/rules/`, and
 * `.cursor/rules/`. Citing one platform's path inside content that propagates
 * to all three is incorrect.
 *
 * Areas not copied (plans/, lessons.md) live only at canonical and may
 * legitimately reference platform paths when the ticket itself concerns
 * platform layout — they're out of scope.
 *
 * Called once per canonical content root by `build.ts` — once for the dogfood
 * canonical (`.prism/`) and once for the templates-surface mirror that ships
 * to consumer installs (`templates/install/.prism/`). The allowlist keys are
 * relative to the contentRoot, so the same allowlist applies to both surfaces.
 */
import fs from "node:fs/promises";
import path from "node:path";

import { pathExists } from "./utils";

export const PATH_GUARD_COPIED_AREAS = [
	"rules",
	"architect",
	"spec",
	"templates",
	"references",
] as const;
export const PATH_GUARD_LOOSE_FILES = ["SPEC.md"] as const;

/**
 * Files allowed to mention legacy platform-dir paths outside fenced code
 * blocks. Each entry needs a comment in the source explaining why.
 */
export const PATH_GUARD_FILE_ALLOWLIST: ReadonlySet<string> = new Set([
	// ADR documenting the bifurcation; the Context section discusses the old
	// layout in prose so the decision reads against its own history.
	"spec/adrs/0031-bifurcated-install-layout.md",
	// Architect doc explaining the layout. Walks through the canonical-vs-copy
	// distinction with concrete platform-dir paths in the example block — that
	// is the doc's job, not a violation.
	"architect/install-layout.md",
]);

const PATH_GUARD_PATTERN =
	/(\.claude|\.codex|\.cursor)\/(rules|architect|spec|templates|references|plans)\//;

export interface PathGuardViolation {
	relativePath: string;
	line: number;
	text: string;
}

interface RelativeEntry {
	kind: "file" | "directory";
	relativePath: string;
}

async function listMarkdownFiles(
	rootPath: string,
	currentPath: string = rootPath
): Promise<RelativeEntry[]> {
	const out: RelativeEntry[] = [];
	const entries = await fs.readdir(currentPath, { withFileTypes: true });
	for (const entry of entries) {
		if (entry.name.startsWith(".")) {
			continue;
		}
		const entryPath = path.join(currentPath, entry.name);
		if (entry.isDirectory()) {
			out.push(...(await listMarkdownFiles(rootPath, entryPath)));
			continue;
		}
		if (entry.isFile() && entry.name.endsWith(".md")) {
			out.push({
				kind: "file",
				relativePath: path.relative(rootPath, entryPath),
			});
		}
	}
	return out;
}

function scanLines(
	lines: string[],
	relativePath: string
): PathGuardViolation[] {
	const violations: PathGuardViolation[] = [];
	let inFence = false;
	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index];
		if (/^\s{0,3}```/.test(line)) {
			inFence = !inFence;
			continue;
		}
		if (inFence) {
			continue;
		}
		if (PATH_GUARD_PATTERN.test(line)) {
			violations.push({
				relativePath,
				line: index + 1,
				text: line.trim(),
			});
		}
	}
	return violations;
}

export async function runPathGuard(
	contentRoot: string
): Promise<PathGuardViolation[]> {
	if (!(await pathExists(contentRoot))) {
		return [];
	}

	const violations: PathGuardViolation[] = [];

	for (const area of PATH_GUARD_COPIED_AREAS) {
		const areaPath = path.join(contentRoot, area);
		if (!(await pathExists(areaPath))) {
			continue;
		}
		const entries = await listMarkdownFiles(areaPath);
		for (const entry of entries) {
			const relativeFromContentRoot = path
				.join(area, entry.relativePath)
				.split(path.sep)
				.join("/");
			if (PATH_GUARD_FILE_ALLOWLIST.has(relativeFromContentRoot)) {
				continue;
			}
			const filePath = path.join(areaPath, entry.relativePath);
			const lines = (await fs.readFile(filePath, "utf8")).split(/\r?\n/);
			violations.push(...scanLines(lines, relativeFromContentRoot));
		}
	}

	for (const looseFile of PATH_GUARD_LOOSE_FILES) {
		const filePath = path.join(contentRoot, looseFile);
		if (!(await pathExists(filePath))) {
			continue;
		}
		if (PATH_GUARD_FILE_ALLOWLIST.has(looseFile)) {
			continue;
		}
		const lines = (await fs.readFile(filePath, "utf8")).split(/\r?\n/);
		violations.push(...scanLines(lines, looseFile));
	}

	return violations;
}
