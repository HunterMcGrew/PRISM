/**
 * Guard test: a minimal cold-init config (Slack skipped) must survive
 * `deriveTokenMap` → `substituteTokens` over every skill's substitution
 * surface without throwing.
 *
 * The scan covers `shared.md` plus any platform bodies (`claude.md`,
 * `codex.md`, `cursor.md`) for each skill under `.ai-skills/skills/`. The
 * `references/` subdirectory is excluded because the build copies references
 * verbatim via `fs.cp` (no `substituteTokens` call), and those files contain
 * shell-variable `${...}` references that are resolved at Lilac's runtime by
 * the shell, not by the build's substitution layer. Scanning them would
 * false-positive on every shell variable.
 *
 * A new optional token added to skill content without a default in
 * `deriveTokenMap` causes this test to fail deterministically — which is the
 * class-level guarantee this guard provides.
 */
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import { deriveTokenMap, substituteTokens, type PrismConfig } from "./lib/tokens";

const REPO_ROOT = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../.."
);

const SKILLS_DIR = path.join(REPO_ROOT, ".ai-skills", "skills");

/**
 * Minimal valid config matching exactly what `init` writes when every optional
 * field is skipped: no `slackChannel`, no `linearWorkspace`/`teamKey`, but
 * `github.owner`/`repo` are always written by `init` so they belong here.
 */
const MINIMAL_INIT_CONFIG: PrismConfig = {
	org: "ACME",
	project: "WIDGET",
	ticketPrefix: "WGT",
	ticketSystem: { kind: "github-issues" },
	github: { owner: "acme", repo: "widget" },
	defaultBranch: "main",
};

/**
 * Reads the substitution surface for one skill: `shared.md` (always present)
 * plus any of `claude.md`, `codex.md`, `cursor.md` that exist. Concatenates
 * per skill. References are excluded — they are copied verbatim.
 */
async function readSkillSurface(skillDir: string): Promise<string> {
	const platformFiles = ["shared.md", "claude.md", "codex.md", "cursor.md"];
	const chunks: string[] = [];

	for (const filename of platformFiles) {
		const filePath = path.join(skillDir, filename);

		try {
			const content = await fs.readFile(filePath, "utf8");
			chunks.push(content);
		} catch {
			// File absent — skip. shared.md is always present; platform bodies are optional.
		}
	}

	return chunks.join("\n");
}

test("minimal cold-init config survives substituteTokens over all skill content without throwing", async () => {
	const tokenMap = deriveTokenMap(MINIMAL_INIT_CONFIG);

	const entries = await fs.readdir(SKILLS_DIR, { withFileTypes: true });
	const skillDirs = entries
		.filter((e) => e.isDirectory())
		.map((e) => path.join(SKILLS_DIR, e.name));

	assert.ok(skillDirs.length > 0, "expected at least one skill directory under .ai-skills/skills/");

	for (const skillDir of skillDirs) {
		const skillName = path.basename(skillDir);
		const surface = await readSkillSurface(skillDir);

		assert.doesNotThrow(
			() => substituteTokens(surface, tokenMap),
			`substituteTokens threw on skill "${skillName}" with minimal cold-init config — a token in that skill's content is missing from deriveTokenMap`
		);
	}
});
