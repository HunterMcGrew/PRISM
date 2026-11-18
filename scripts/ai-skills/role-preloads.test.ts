/**
 * Coverage for the `agent` role type and the `preloads` field in the roles
 * registry:
 *   - a role with preloads renders a `skills:` list in its Claude agent def
 *     and leaves its Codex agent def untouched
 *   - an unknown, self, or duplicate preload fails the build
 *   - an agent role carries no persona, and still gets both agent files
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import {
	buildClaudeAgentMarkdown,
	buildCodexAgentToml,
	buildRoleMap,
	generatePlatformSkills,
	type GeneratePlatformSkillsOptions,
	type RoleDefinition,
} from "./generate-skills";

const PRELOADED: RoleDefinition = {
	id: "prism-implement",
	persona: "Clove",
	routing: "auto",
	preloads: ["tdd"],
};
const PLAIN: RoleDefinition = { ...PRELOADED, preloads: undefined };
const TDD: RoleDefinition = { id: "tdd", type: "utility", routing: "named-only" };

function buildClaudeDef(preloads?: string[]): string {
	return buildClaudeAgentMarkdown({
		claudeSkillMarkdown: "body",
		description: "Clove.",
		preloads,
		skillId: "prism-implement",
		tokenMap: new Map(),
	});
}

function buildCodexDef(roleDefinition: RoleDefinition): string {
	return buildCodexAgentToml({
		codexSkillMarkdown: "body",
		description: "Clove.",
		roleDefinition,
		skillId: "prism-implement",
		tokenMap: new Map(),
	});
}

test("a role with preloads renders a skills list in its Claude agent def", () => {
	assert.match(
		buildClaudeDef(["tdd"]),
		/^---\nname: prism-implement\n[\s\S]*\nmodel: sonnet\nskills:\n {2}- tdd\n---\n/
	);
});

test("a role with no preloads renders no skills line", () => {
	assert.doesNotMatch(buildClaudeDef(), /skills:/);
	assert.doesNotMatch(buildClaudeDef([]), /skills:/);
});

test("preloads leave the Codex agent def byte-identical", () => {
	assert.equal(buildCodexDef(PRELOADED), buildCodexDef(PLAIN));
});

test("buildRoleMap accepts a preload naming another role", () => {
	const roleMap = buildRoleMap({ skills: [PRELOADED, TDD] });
	assert.deepEqual(roleMap.get("prism-implement")?.preloads, ["tdd"]);
});

test("buildRoleMap rejects a preload naming no role", () => {
	assert.throws(
		() => buildRoleMap({ skills: [PRELOADED] }),
		/Role 'prism-implement' preloads 'tdd', which names no role/
	);
});

test("buildRoleMap rejects a role that preloads itself", () => {
	assert.throws(
		() =>
			buildRoleMap({
				skills: [{ ...PRELOADED, preloads: ["prism-implement"] }],
			}),
		/Role 'prism-implement' preloads 'prism-implement', which is the role itself/
	);
});

test("buildRoleMap rejects a duplicate preload", () => {
	assert.throws(
		() =>
			buildRoleMap({ skills: [{ ...PRELOADED, preloads: ["tdd", "tdd"] }, TDD] }),
		/Role 'prism-implement' preloads 'tdd', which is listed twice/
	);
});

test("buildRoleMap rejects an agent role that carries a persona", () => {
	assert.throws(
		() =>
			buildRoleMap({
				skills: [
					{
						id: "prism-spec",
						persona: "Ghost",
						type: "agent",
						routing: "named-only",
					},
				],
			}),
		/Agent role 'prism-spec' must not carry a persona/
	);
});

test("buildRoleMap accepts an agent role with no persona", () => {
	const roleMap = buildRoleMap({
		skills: [{ id: "prism-spec", type: "agent", routing: "named-only" }],
	});
	assert.equal(roleMap.get("prism-spec")?.type, "agent");
});

test("an agent role gets both agent files and no persona line", async () => {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), "prism-preloads-"));
	try {
		const sourceSkillsRoot = path.join(root, "source");
		const skillRoot = path.join(sourceSkillsRoot, "prism-spec");
		await fs.mkdir(skillRoot, { recursive: true });
		await fs.writeFile(
			path.join(skillRoot, "frontmatter.yml"),
			"name: prism-spec\ndescription: A stage agent.\n"
		);
		await fs.writeFile(path.join(skillRoot, "shared.md"), "Write the spec.\n");

		const out = path.join(root, "out");
		const targetRoots: GeneratePlatformSkillsOptions["targetRoots"] = {
			claude: path.join(out, ".claude", "skills"),
			claudeAgents: path.join(out, ".claude", "agents"),
			codex: path.join(out, ".agents", "skills"),
			codexAgents: path.join(out, ".codex", "agents"),
			cursor: path.join(out, ".cursor", "skills"),
		};
		await generatePlatformSkills({
			sourceSkillsRoot,
			targetRoots,
			codexConfigPath: path.join(out, ".codex", "codex-config.toml"),
			roleMap: buildRoleMap({
				skills: [{ id: "prism-spec", type: "agent", routing: "named-only" }],
			}),
			tokenMap: new Map(),
			optedIn: {
				claude: true,
				codex: true,
				cursor: true,
				codexAgents: true,
				claudeAgents: true,
				codexConfig: false,
			},
			checkMode: false,
			changedPaths: [],
		});

		const claudeDef = await fs.readFile(
			path.join(targetRoots.claudeAgents, "prism-spec.md"),
			"utf8"
		);
		const codexDef = await fs.readFile(
			path.join(targetRoots.codexAgents, "prism-spec.toml"),
			"utf8"
		);
		assert.match(claudeDef, /^---\nname: prism-spec\n/);
		assert.doesNotMatch(codexDef, /You are /);
		assert.match(codexDef, /Canonical skill source: \.ai-skills\/skills\/prism-spec/);
	} finally {
		await fs.rm(root, { force: true, recursive: true });
	}
});
