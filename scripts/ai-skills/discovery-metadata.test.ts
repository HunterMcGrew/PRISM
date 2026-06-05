/**
 * Regression suite for canonical-source invariants. Run via `pnpm prism:test`.
 *
 * Catches the failure modes that would silently break skill discovery on at
 * least one platform:
 *   - missing required canonical files
 *   - missing role definition for a canonical skill
 *   - description longer than Codex's discovery limit
 *   - generated Claude body longer than Anthropic's line cap
 *   - generated files written without the managed marker
 *   - role IDs that don't match the canonical skill folder names
 */
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import {
	buildCodexAgentToml,
	buildRoleMap,
	type RolesDefinitions,
} from "./build";
import {
	escapeToml,
	escapeTomlMultiline,
	GENERATED_HEADER_LINE,
	listDirectories,
	loadPathDefinitions,
	MANAGED_MARKER,
	MAX_FRONTMATTER_DESCRIPTION_LENGTH,
	MAX_SKILL_BODY_LINES,
	normalizeFrontmatter,
	parseFrontmatter,
	pathExists,
} from "./utils";

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
		if (role.type !== "utility") {
			assert.ok(role.persona, `Role '${role.id}' missing persona field`);
		}
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

test("generated Claude skill bodies stay under Anthropic's line cap", async () => {
	// Checks every Claude skill body, not just canonical-sourced ones like the
	// managed-marker test below — Anthropic's line cap degrades discovery for any
	// skill it loads, so an unmanaged hand-authored skill is in scope too.
	const skillsRoot = path.join(repoRoot, ".claude", "skills");
	if (!(await pathExists(skillsRoot))) {
		// Pre-build state — generated bodies don't exist yet.
		return;
	}
	const skillIds = await listDirectories(skillsRoot);
	for (const skillId of skillIds) {
		const bodyPath = path.join(skillsRoot, skillId, "SKILL.md");
		if (!(await pathExists(bodyPath))) {
			continue;
		}
		const body = await fs.readFile(bodyPath, "utf8");
		const lineCount = body.split("\n").length;
		assert.ok(
			lineCount <= MAX_SKILL_BODY_LINES,
			`Body for '${skillId}' is ${lineCount} lines (max ${MAX_SKILL_BODY_LINES})`
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

test("buildRoleMap accepts a utility entry with no persona", () => {
	const definitions: RolesDefinitions = {
		skills: [
			{ id: "prism-code-dev", persona: "Clove" },
			{ id: "prism-handoff", type: "utility" },
		],
	};
	const roleMap = buildRoleMap(definitions);
	assert.equal(roleMap.get("prism-handoff")?.type, "utility");
	assert.equal(roleMap.get("prism-code-dev")?.persona, "Clove");
});

test("buildRoleMap rejects a persona-less entry that is not a utility", () => {
	assert.throws(
		() => buildRoleMap({ skills: [{ id: "prism-mystery" }] }),
		/persona unless type is "utility"/
	);
});

test("buildRoleMap rejects a utility entry that carries a persona", () => {
	assert.throws(
		() =>
			buildRoleMap({
				skills: [{ id: "prism-handoff", persona: "Ghost", type: "utility" }],
			}),
		/must not carry a persona/
	);
});

test("buildRoleMap rejects an unrecognized type value", () => {
	// Built via JSON.parse to mirror the production path — roles.json arrives
	// as an unchecked cast, so a typo'd discriminator reaches buildRoleMap at
	// runtime even though the compile-time union forbids it.
	const definitions = JSON.parse(
		'{"skills": [{"id": "prism-mystery", "persona": "Ghost", "type": "utilty"}]}'
	) as RolesDefinitions;
	assert.throws(() => buildRoleMap(definitions), /unrecognized type 'utilty'/);
});

test("buildCodexAgentToml opens with the persona line for persona entries", () => {
	const toml = buildCodexAgentToml({
		codexSkillMarkdown: "# Skill body",
		description: "A persona skill.",
		roleDefinition: { id: "prism-code-dev", persona: "Clove" },
		skillId: "prism-code-dev",
		tokenMap: new Map(),
	});
	assert.match(toml, /You are Clove\./);
});

test("buildCodexAgentToml omits the persona line when persona is absent", () => {
	const toml = buildCodexAgentToml({
		codexSkillMarkdown: "# Skill body",
		description: "A utility skill.",
		roleDefinition: { id: "prism-handoff", type: "utility" },
		skillId: "prism-handoff",
		tokenMap: new Map(),
	});
	assert.doesNotMatch(toml, /You are /);
	assert.match(toml, /Canonical skill source: \.ai-skills\/skills\/prism-handoff/);
});

test("utility skills generate skill adapters but no codex agent adapter", async () => {
	const pathDefinitions = await loadPathDefinitions(repoRoot);
	const roles = await loadRoleDefinitions();
	const utilityIds = roles.skills
		.filter((role) => role.type === "utility")
		.map((role) => role.id);
	const skillRoots = [
		pathDefinitions.generated.claudeSkillsRoot,
		pathDefinitions.generated.codexSkillsRoot,
		pathDefinitions.generated.cursorSkillsRoot,
	];
	for (const utilityId of utilityIds) {
		for (const relative of skillRoots) {
			const root = path.join(repoRoot, relative);
			// Skip platforms whose skills root doesn't exist locally — e.g. the
			// gitignored Codex root on a fresh clone.
			if (!(await pathExists(root))) {
				continue;
			}
			const bodyPath = path.join(root, utilityId, "SKILL.md");
			assert.ok(
				await pathExists(bodyPath),
				`Missing generated skill adapter at ${bodyPath}`
			);
		}
		const agentTomlPath = path.join(
			repoRoot,
			pathDefinitions.generated.codexAgentsRoot,
			`${utilityId}.toml`
		);
		assert.ok(
			!(await pathExists(agentTomlPath)),
			`Utility skill '${utilityId}' must not have a codex agent adapter at ${agentTomlPath}`
		);
	}
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
