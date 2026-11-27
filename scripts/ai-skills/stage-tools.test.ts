/**
 * Regression suite for stage tool lists. Catches:
 *   - a malformed `tools` frontmatter value reaching the build
 *   - a stage skill whose declared list drifts from the pinned one
 *   - a gated role's Claude agent file missing its `tools:` line, or an
 *     ungated one gaining it
 *   - Edit or Write reaching the review and verify agents
 */
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import {
	buildClaudeAgentMarkdown,
	parseToolsField,
	type RolesDefinitions,
} from "./generate-skills";
import { parseFrontmatter } from "./utils";

const EXPECTED_TOOLS = new Map<string, string[]>([
	["prism-intent", ["Read", "Grep", "Glob", "Bash", "Edit", "Write"]],
	["prism-design", ["Read", "Grep", "Glob", "Bash", "Edit", "Write"]],
	["prism-spec", ["Read", "Grep", "Glob", "Bash", "Edit", "Write"]],
	["prism-plan", ["Read", "Grep", "Glob", "Bash", "Edit", "Write", "Agent"]],
	[
		"prism-challenge",
		["Read", "Grep", "Glob", "Bash", "Edit", "Write", "WebFetch", "WebSearch"],
	],
	[
		"prism-implement",
		["Read", "Grep", "Glob", "Bash", "Edit", "Write", "WebFetch", "WebSearch"],
	],
	["prism-docs", ["Read", "Grep", "Glob", "Bash", "Edit", "Write"]],
	["prism-verify", ["Read", "Bash"]],
	[
		"prism-review",
		["Read", "Grep", "Glob", "Bash", "Agent", "WebFetch", "WebSearch"],
	],
	["prism-retro", ["Read", "Grep", "Glob", "Bash", "Edit", "Write"]],
]);

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "../..");

async function loadRoleDefinitions(): Promise<RolesDefinitions> {
	const raw = await fs.readFile(
		path.join(repoRoot, ".ai-skills", "definitions", "roles.json"),
		"utf8"
	);

	return JSON.parse(raw) as RolesDefinitions;
}

/** Reads the lines of an agent file's first frontmatter block, because the body repeats the skill's own frontmatter. */
async function readFirstFrontmatterBlock(skillId: string): Promise<string[]> {
	const markdown = await fs.readFile(
		path.join(repoRoot, ".claude", "agents", `${skillId}.md`),
		"utf8"
	);
	const lines = markdown.split(/\r?\n/);
	const start = lines.indexOf("---");
	const end = lines.indexOf("---", start + 1);

	return lines.slice(start + 1, end);
}

test("rejects a malformed tools list", () => {
	for (const value of [
		"",
		"Read, , Bash",
		"Read,",
		"Read, Read",
		"read",
		"Bash(git:*)",
	]) {
		assert.throws(() => parseToolsField("prism-x", value), /prism-x/, value);
	}

	assert.deepEqual(parseToolsField("prism-x", "Read, Bash, mcp__srv__tool"), [
		"Read",
		"Bash",
		"mcp__srv__tool",
	]);
});

test("pins each stage skill's tools", async () => {
	for (const [skillId, expected] of EXPECTED_TOOLS) {
		const frontmatter = await fs.readFile(
			path.join(repoRoot, ".ai-skills", "skills", skillId, "frontmatter.yml"),
			"utf8"
		);
		const tools = parseFrontmatter(frontmatter).get("tools");
		assert.ok(tools !== undefined, `${skillId} declares no tools`);
		assert.deepEqual(
			tools.split(",").map((name) => name.trim()),
			expected,
			skillId
		);
	}
});

test("writes the list into every gated role's agent file", async () => {
	const { skills } = await loadRoleDefinitions();

	for (const role of skills.filter((entry) => entry.gated === true)) {
		const block = await readFirstFrontmatterBlock(role.id);
		const modelIndex = block.findIndex((line) => line.startsWith("model: "));
		assert.ok(modelIndex >= 0, `${role.id} has no model line`);
		assert.equal(
			block[modelIndex + 1],
			`tools: ${EXPECTED_TOOLS.get(role.id)?.join(", ")}`,
			role.id
		);
	}
});

test("leaves every other agent file unrestricted", async () => {
	const { skills } = await loadRoleDefinitions();

	for (const role of skills.filter(
		(entry) => entry.type !== "utility" && entry.gated !== true
	)) {
		const block = await readFirstFrontmatterBlock(role.id);
		assert.ok(
			!block.some((line) => line.startsWith("tools:")),
			`${role.id} carries a tools line`
		);
	}
});

test("keeps Edit and Write off the review and verify agents", async () => {
	for (const skillId of ["prism-review", "prism-verify"]) {
		const block = await readFirstFrontmatterBlock(skillId);
		const toolsLine = block.find((line) => line.startsWith("tools:"));
		assert.ok(toolsLine !== undefined, `${skillId} has no tools line`);
		const names = toolsLine
			.slice("tools:".length)
			.split(",")
			.map((name) => name.trim());

		for (const forbidden of ["Edit", "Write", "NotebookEdit"]) {
			assert.ok(!names.includes(forbidden), `${skillId} names ${forbidden}`);
		}
	}
});

test("buildClaudeAgentMarkdown writes tools for a gated role and throws without them", () => {
	const baseArgs = {
		claudeSkillMarkdown: "Body.",
		description: "A test skill.",
		skillId: "prism-test",
		tokenMap: new Map<string, string>(),
	};

	const gated = buildClaudeAgentMarkdown({
		...baseArgs,
		gated: true,
		tools: "Read, Bash",
	});
	assert.ok(gated.includes("model: sonnet\ntools: Read, Bash\n"));

	assert.throws(
		() => buildClaudeAgentMarkdown({ ...baseArgs, gated: true }),
		/prism-test/
	);

	const ungated = buildClaudeAgentMarkdown({
		...baseArgs,
		gated: false,
		tools: "Read",
	});
	assert.ok(!/^tools:/m.test(ungated));
});
