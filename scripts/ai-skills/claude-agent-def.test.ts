/**
 * Regression suite for the Claude agent-definition emitter. Catches:
 *   - frontmatter shape (name / description / model)
 *   - per-skill model defaults (opus for conductor + architect, sonnet otherwise)
 *   - the generated SKILL.md body riding after the frontmatter
 *   - token substitution applied to the description
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
	buildClaudeAgentMarkdown,
	CLAUDE_AGENT_MODEL_DEFAULTS,
} from "./build";

function parseModelFromFrontmatter(markdown: string): string | undefined {
	const match = markdown.match(/^model: (.+)$/m);
	return match?.[1];
}

test("buildClaudeAgentMarkdown emits name, description, and model frontmatter", () => {
	const output = buildClaudeAgentMarkdown({
		claudeSkillMarkdown: "# Body\n\nSkill content here.",
		description: "A test persona that does a thing.",
		skillId: "prism-test",
		tokenMap: new Map(),
	});

	assert.match(output, /^---\nname: prism-test\n/);
	assert.match(output, /description: "A test persona that does a thing\."/);
	assert.match(output, /model: sonnet/);
	assert.match(output, /<!-- Target: claude-agent/);
	assert.ok(output.includes("Skill content here."), "body must ride along");
});

test("conductor and architect default to opus; other personas to sonnet", () => {
	const conductor = buildClaudeAgentMarkdown({
		claudeSkillMarkdown: "body",
		description: "Sol.",
		skillId: "prism-conductor",
		tokenMap: new Map(),
	});
	const architect = buildClaudeAgentMarkdown({
		claudeSkillMarkdown: "body",
		description: "Winston.",
		skillId: "prism-architect",
		tokenMap: new Map(),
	});
	const worker = buildClaudeAgentMarkdown({
		claudeSkillMarkdown: "body",
		description: "Clove.",
		skillId: "prism-code-dev",
		tokenMap: new Map(),
	});

	assert.equal(parseModelFromFrontmatter(conductor), "opus");
	assert.equal(parseModelFromFrontmatter(architect), "opus");
	assert.equal(parseModelFromFrontmatter(worker), "sonnet");
});

test("the model-defaults map names only the strong-tier personas", () => {
	assert.equal(CLAUDE_AGENT_MODEL_DEFAULTS.get("prism-conductor"), "opus");
	assert.equal(CLAUDE_AGENT_MODEL_DEFAULTS.get("prism-architect"), "opus");
	assert.equal(CLAUDE_AGENT_MODEL_DEFAULTS.has("prism-code-dev"), false);
});

test("description is collapsed to one line and token-substituted", () => {
	const output = buildClaudeAgentMarkdown({
		claudeSkillMarkdown: "body",
		description: "Line one\n  continued onto line two.",
		skillId: "prism-test",
		tokenMap: new Map(),
	});

	assert.match(output, /description: "Line one continued onto line two\."/);
});
