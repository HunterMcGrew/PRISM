#!/usr/bin/env tsx
/**
 * One-time importer: reads `.claude/skills/<id>/SKILL.md` and splits each into
 * the canonical `.ai-skills/skills/<id>/{frontmatter.yml, shared.md, claude.md, codex.md, cursor.md}`
 * shape.
 *
 * Renames any `thrive-` skill ID prefix to `prism-` during import (for the
 * agent-crew → PRISM migration). Replaces literal `thrive-<role>` references
 * inside skill content with `prism-<role>` so cross-skill triggers stay
 * coherent post-rename.
 *
 * Run once with `pnpm prism:bootstrap`. Pass `--force` to overwrite an existing
 * canonical source. Otherwise the script skips files that already exist so
 * hand-edited canonical content survives a re-run.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ensureDirectory, listDirectories, pathExists } from "./utils";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "../..");

const claudeSkillsRoot = path.join(repoRoot, ".claude", "skills");
const canonicalSkillsRoot = path.join(repoRoot, ".ai-skills", "skills");

const forceMode = process.argv.includes("--force");

const SKILL_ID_RENAMES: ReadonlyArray<readonly [string, string]> = [
	["thrive-architect", "prism-architect"],
	["thrive-changelog", "prism-changelog"],
	["thrive-code-dev", "prism-code-dev"],
	["thrive-code-review-pr", "prism-code-review-pr"],
	["thrive-code-review-self", "prism-code-review-self"],
	["thrive-debugger", "prism-debugger"],
	["thrive-documentation", "prism-documentation"],
	["thrive-pixel", "prism-pixel"],
	["thrive-qa-test-plan", "prism-qa-test-plan"],
	["thrive-standup-summary", "prism-standup-summary"],
	["thrive-ticket-start", "prism-ticket-start"],
	["thrive-user-stories", "prism-user-stories"],
];

interface SplitSkill {
	body: string;
	frontmatter: string;
}

function rewriteSkillIdReferences(content: string): string {
	let result = content;
	for (const [from, to] of SKILL_ID_RENAMES) {
		result = result.replaceAll(from, to);
	}
	return result;
}

function renameSkillId(skillId: string): string {
	const match = SKILL_ID_RENAMES.find(([from]) => from === skillId);
	return match ? match[1] : skillId;
}

function splitFrontmatter(skillPath: string, skillContent: string): SplitSkill {
	const match = skillContent.match(
		/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/
	);
	if (!match) {
		throw new Error(`Missing or invalid frontmatter in ${skillPath}`);
	}

	return {
		body: match[2].trim(),
		frontmatter: match[1].trim(),
	};
}

async function writeIfMissingOrForce(
	filePath: string,
	content: string
): Promise<boolean> {
	if (!forceMode && (await pathExists(filePath))) {
		return false;
	}

	await ensureDirectory(path.dirname(filePath));
	await fs.writeFile(filePath, `${content.trim()}\n`, "utf8");
	return true;
}

async function main(): Promise<void> {
	if (!(await pathExists(claudeSkillsRoot))) {
		throw new Error(`Missing .claude skills directory: ${claudeSkillsRoot}`);
	}

	await ensureDirectory(canonicalSkillsRoot);

	const sourceSkillIds = await listDirectories(claudeSkillsRoot);
	let createdFileCount = 0;

	for (const sourceSkillId of sourceSkillIds) {
		const sourceSkillPath = path.join(
			claudeSkillsRoot,
			sourceSkillId,
			"SKILL.md"
		);
		if (!(await pathExists(sourceSkillPath))) {
			continue;
		}

		const skillContent = await fs.readFile(sourceSkillPath, "utf8");
		const parsedSkill = splitFrontmatter(sourceSkillPath, skillContent);

		const targetSkillId = renameSkillId(sourceSkillId);
		const targetSkillRoot = path.join(canonicalSkillsRoot, targetSkillId);
		const frontmatterPath = path.join(targetSkillRoot, "frontmatter.yml");
		const sharedPath = path.join(targetSkillRoot, "shared.md");
		const claudePath = path.join(targetSkillRoot, "claude.md");
		const codexPath = path.join(targetSkillRoot, "codex.md");
		const cursorPath = path.join(targetSkillRoot, "cursor.md");

		const renamedFrontmatter = rewriteSkillIdReferences(parsedSkill.frontmatter);
		const renamedBody = rewriteSkillIdReferences(parsedSkill.body);

		const createdFrontmatter = await writeIfMissingOrForce(
			frontmatterPath,
			renamedFrontmatter
		);
		const createdShared = await writeIfMissingOrForce(sharedPath, renamedBody);
		const createdClaude = await writeIfMissingOrForce(
			claudePath,
			"<!-- Optional Claude-only additions. Keep this file empty when not needed. -->"
		);
		const createdCodex = await writeIfMissingOrForce(
			codexPath,
			"<!-- Optional Codex-only additions. Keep this file empty when not needed. -->"
		);
		const createdCursor = await writeIfMissingOrForce(
			cursorPath,
			"<!-- Optional Cursor-only additions. Keep this file empty when not needed. -->"
		);

		for (const wasCreated of [
			createdFrontmatter,
			createdShared,
			createdClaude,
			createdCodex,
			createdCursor,
		]) {
			if (wasCreated) {
				createdFileCount += 1;
			}
		}
	}

	const modeLabel = forceMode ? "overwritten/created" : "created";
	console.log(
		`prism:bootstrap completed. ${modeLabel} ${createdFileCount} file(s).`
	);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
