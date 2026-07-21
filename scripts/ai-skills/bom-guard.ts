/**
 * Build-time UTF-8 BOM guard: fails when any canonical source file contains
 * a UTF-8 BOM (0xEF 0xBB 0xBF) at any byte offset. Catches the recurring
 * defect where an editor saves a canonical `.ai-skills/**` file as "UTF-8
 * with BOM", which corrupts the `<!-- atlas:specializes-in -->` anchor
 * substitution on the four core personas and breaks direct Unix shebang
 * execution on generated hooks (the kernel sees `\xEF\xBB\xBF#!`, not `#!`).
 * A trailing or embedded BOM is as damaging as a leading one and shipped to
 * npm in 0.7.3 under the older leading-bytes-only check — see issue #430.
 *
 * Scope is canonical source files only — `.ai-skills` tree (`.md`, `.mjs`, `.json`).
 * Generated platform outputs (.claude/, .cursor/, .codex/, templates/) are
 * not checked here; if a source is BOM-free, the build outputs will be too.
 */
import fs from "node:fs/promises";
import path from "node:path";

import { pathExists } from "./utils";

const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);

export interface BomGuardViolation {
	relativePath: string;
	/** Byte offsets of every UTF-8 BOM occurrence in the file, ascending. Offset 0 is a leading BOM. */
	byteOffsets: number[];
}

const CANONICAL_SOURCE_EXTENSIONS = new Set([".md", ".mjs", ".json"]);

async function collectCanonicalSources(
	aiSkillsRoot: string,
	repoRoot: string
): Promise<BomGuardViolation[]> {
	const violations: BomGuardViolation[] = [];
	await walk(aiSkillsRoot, aiSkillsRoot, repoRoot, violations);
	return violations;
}

async function walk(
	dirPath: string,
	aiSkillsRoot: string,
	repoRoot: string,
	violations: BomGuardViolation[]
): Promise<void> {
	if (!(await pathExists(dirPath))) {
		return;
	}

	const entries = await fs.readdir(dirPath, { withFileTypes: true });

	for (const entry of entries) {
		const entryPath = path.join(dirPath, entry.name);

		if (entry.isDirectory()) {
			await walk(entryPath, aiSkillsRoot, repoRoot, violations);
			continue;
		}

		if (!entry.isFile()) {
			continue;
		}

		const ext = path.extname(entry.name).toLowerCase();

		if (!CANONICAL_SOURCE_EXTENSIONS.has(ext)) {
			continue;
		}

		const contents = await fs.readFile(entryPath);
		const byteOffsets: number[] = [];
		let found = contents.indexOf(UTF8_BOM);

		while (found !== -1) {
			byteOffsets.push(found);
			found = contents.indexOf(UTF8_BOM, found + UTF8_BOM.length);
		}

		if (byteOffsets.length > 0) {
			violations.push({
				relativePath: path.relative(repoRoot, entryPath).split(path.sep).join("/"),
				byteOffsets,
			});
		}
	}
}

/**
 * Scans all `.md`, `.mjs`, and `.json` files under `.ai-skills/` for a
 * UTF-8 BOM at any byte offset. Returns one violation per affected file,
 * carrying every occurrence's offset. An empty array means the canonical
 * surface is BOM-free.
 */
export async function runBomGuard(repoRoot: string): Promise<BomGuardViolation[]> {
	const aiSkillsRoot = path.join(repoRoot, ".ai-skills");
	return collectCanonicalSources(aiSkillsRoot, repoRoot);
}
