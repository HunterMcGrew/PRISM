/**
 * Build-time UTF-8 BOM guard: fails when any canonical source file begins
 * with a UTF-8 BOM (0xEF 0xBB 0xBF). Catches the recurring defect where an
 * editor saves a canonical `.ai-skills/**` file as "UTF-8 with BOM", which
 * corrupts the `<!-- atlas:specializes-in -->` anchor substitution on the
 * four core personas and breaks direct Unix shebang execution on generated
 * hooks (the kernel sees `\xEF\xBB\xBF#!`, not `#!`).
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

		const handle = await fs.open(entryPath, "r");

		try {
			const headerBuf = Buffer.alloc(3);
			await handle.read(headerBuf, 0, 3, 0);

			if (headerBuf.equals(UTF8_BOM)) {
				violations.push({
					relativePath: path.relative(repoRoot, entryPath).split(path.sep).join("/"),
				});
			}
		} finally {
			await handle.close();
		}
	}
}

/**
 * Scans all `.md`, `.mjs`, and `.json` files under `.ai-skills/` for a
 * leading UTF-8 BOM. Returns one violation per affected file. An empty array
 * means the canonical surface is BOM-free.
 */
export async function runBomGuard(repoRoot: string): Promise<BomGuardViolation[]> {
	const aiSkillsRoot = path.join(repoRoot, ".ai-skills");
	return collectCanonicalSources(aiSkillsRoot, repoRoot);
}
