/**
 * Regression suite for canonical-source invariants. Run via `pnpm prism:test`.
 *
 * Catches the failure modes that would silently break skill discovery on at
 * least one platform:
 *   - missing required canonical files
 *   - missing role definition for a canonical skill
 *   - description longer than Codex's discovery limit
 *   - generated files written without the managed marker
 *   - role IDs that don't match the canonical skill folder names
 */
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import {
	escapeToml,
	escapeTomlMultiline,
	GENERATED_HEADER_LINE,
	listDirectories,
	loadPathDefinitions,
	MANAGED_MARKER,
	MAX_FRONTMATTER_DESCRIPTION_LENGTH,
	normalizeFrontmatter,
	parseFrontmatter,
	pathExists,
} from "./utils";

interface RoleDefinition {
	id: string;
	persona: string;
}

interface RolesDefinitions {
	skills: RoleDefinition[];
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "../..");

async function loadRoleDefinitions(): Promise<RolesDefinitions> {
	const rolesPath = path.join(
		repoRoot,
		".ai-skills",
		"definitions",
		"roles.json"
	);
	const raw = await fs.readFile(rolesPath, "utf8");
	return JSON.parse(raw) as RolesDefinitions;
}

test("every canonical skill has frontmatter.yml and shared.md", async () => {
	const skillsRoot = path.join(repoRoot, ".ai-skills", "skills");
	if (!(await pathExists(skillsRoot))) {
		// Pre-bootstrap state — nothing to check.
		return;
	}
	const skillIds = await listDirectories(skillsRoot);
	for (const skillId of skillIds) {
		const skillRoot = path.join(skillsRoot, skillId);
		assert.ok(
			await pathExists(path.join(skillRoot, "frontmatter.yml")),
			`Missing frontmatter.yml for ${skillId}`
		);
		assert.ok(
			await pathExists(path.join(skillRoot, "shared.md")),
			`Missing shared.md for ${skillId}`
		);
	}
});

test("every canonical skill has a matching role definition", async () => {
	const skillsRoot = path.join(repoRoot, ".ai-skills", "skills");
	if (!(await pathExists(skillsRoot))) {
		return;
	}
	const skillIds = await listDirectories(skillsRoot);
	const roles = await loadRoleDefinitions();
	const roleIds = new Set(roles.skills.map((role) => role.id));
	for (const skillId of skillIds) {
		assert.ok(
			roleIds.has(skillId),
			`No role definition for skill '${skillId}' in roles.json`
		);
	}
	for (const role of roles.skills) {
		assert.ok(role.id, "Role missing id field");
		assert.ok(role.persona, `Role '${role.id}' missing persona field`);
	}
});

test("frontmatter descriptions stay under Codex discovery limit", async () => {
	const skillsRoot = path.join(repoRoot, ".ai-skills", "skills");
	if (!(await pathExists(skillsRoot))) {
		return;
	}
	const skillIds = await listDirectories(skillsRoot);
	for (const skillId of skillIds) {
		const frontmatterPath = path.join(skillsRoot, skillId, "frontmatter.yml");
		const raw = await normalizeFrontmatter(frontmatterPath);
		const map = parseFrontmatter(raw);
		const description = map.get("description");
		if (typeof description !== "string") {
			continue;
		}
		assert.ok(
			description.length <= MAX_FRONTMATTER_DESCRIPTION_LENGTH,
			`Description for '${skillId}' is ${description.length} chars (max ${MAX_FRONTMATTER_DESCRIPTION_LENGTH})`
		);
	}
});

test("generated skill directories carry the managed marker", async () => {
	// Only check directories whose ID matches a canonical source. Hand-authored
	// skill directories without a corresponding `.ai-skills/skills/<id>/` entry
	// are intentional and unmanaged — the marker check doesn't apply.
	const pathDefinitions = await loadPathDefinitions(repoRoot);
	const canonicalRoot = path.join(
		repoRoot,
		pathDefinitions.canonical.skillsRoot
	);
	if (!(await pathExists(canonicalRoot))) {
		return;
	}
	const canonicalIds = new Set(await listDirectories(canonicalRoot));
	const generatedRoots = [
		pathDefinitions.generated.claudeSkillsRoot,
		pathDefinitions.generated.codexSkillsRoot,
		pathDefinitions.generated.cursorSkillsRoot,
	];
	for (const relative of generatedRoots) {
		const root = path.join(repoRoot, relative);
		if (!(await pathExists(root))) {
			continue;
		}
		const dirs = await listDirectories(root);
		for (const dir of dirs) {
			if (!canonicalIds.has(dir)) {
				continue;
			}
			const markerPath = path.join(root, dir, MANAGED_MARKER);
			assert.ok(
				await pathExists(markerPath),
				`Missing managed marker at ${markerPath}`
			);
		}
	}
});

test("escapeToml escapes backslash, quote, and newline characters", () => {
	assert.equal(escapeToml("plain text"), "plain text");
	assert.equal(escapeToml('quote: "x"'), 'quote: \\"x\\"');
	assert.equal(escapeToml("backslash: \\"), "backslash: \\\\");
	assert.equal(escapeToml("line one\nline two"), "line one\\nline two");
	assert.equal(escapeToml("crlf: a\r\nb"), "crlf: a\\r\\nb");
});

test("escapeTomlMultiline escapes backslash and triple-quote but preserves newlines", () => {
	assert.equal(escapeTomlMultiline("plain text"), "plain text");
	assert.equal(escapeTomlMultiline("backslash: \\"), "backslash: \\\\");
	assert.equal(escapeTomlMultiline('triple: """end'), 'triple: \\"\\"\\"end');
	assert.equal(escapeTomlMultiline("line one\nline two"), "line one\nline two");
});

test("generated codex agent TOML files start with the managed header", async () => {
	const pathDefinitions = await loadPathDefinitions(repoRoot);
	const codexAgentsRoot = path.join(
		repoRoot,
		pathDefinitions.generated.codexAgentsRoot
	);
	if (!(await pathExists(codexAgentsRoot))) {
		return;
	}
	const entries = await fs.readdir(codexAgentsRoot, { withFileTypes: true });
	for (const entry of entries) {
		if (!entry.isFile() || !entry.name.endsWith(".toml")) {
			continue;
		}
		const contents = await fs.readFile(
			path.join(codexAgentsRoot, entry.name),
			"utf8"
		);
		assert.ok(
			contents.startsWith(GENERATED_HEADER_LINE),
			`Codex agent ${entry.name} missing managed header line`
		);
	}
});
