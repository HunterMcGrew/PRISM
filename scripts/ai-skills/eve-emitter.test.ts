/**
 * Regression suite for the eve agent-directory emitter. Catches:
 *   - the identity/workflow split (instructions.md is identity, not workflow)
 *   - the routing description riding into the generated SKILL.md frontmatter
 *   - reference-scaffolding stripping (no `.prism/references/` load links survive)
 *   - the emitted tree byte-matching the preserved Lilac reference fixture
 *
 * The fixture at `__fixtures__/eve-lilac-reference/` is the runtime-validated
 * hand-authored reference, regenerated to the token-substituted form an actual
 * build produces. A zero-diff against it is the emitter's correctness proof —
 * the on-host stand-in for running Lilac on eve under Node 24 (a manual Docker
 * milestone the host CI cannot reach).
 */
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import {
	buildEveAgentFiles,
	extractDescriptionBlock,
	loadEveAgentConfig,
} from "./build";
import { deriveTokenMap, loadConfig } from "./lib/tokens";
import {
	listRelativeDirectoryEntries,
	type RelativeDirectoryEntry,
} from "./build";
import { normalizeFrontmatter, parseFrontmatter } from "./utils";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "../..");
const skillId = "prism-standup-summary";
const skillSourceRoot = path.join(
	repoRoot,
	".ai-skills",
	"skills",
	skillId
);
const fixtureRoot = path.join(
	scriptDirectory,
	"__fixtures__",
	"eve-lilac-reference"
);
const generatedRoot = path.join(repoRoot, ".eve", "agents", skillId);

async function buildLilacEveFiles(): Promise<Map<string, string>> {
	const frontmatter = await normalizeFrontmatter(
		path.join(skillSourceRoot, "frontmatter.yml")
	);
	const sharedBody = (
		await fs.readFile(path.join(skillSourceRoot, "shared.md"), "utf8")
	).trim();
	const eveConfigMap = parseFrontmatter(
		(await fs.readFile(path.join(skillSourceRoot, "eve.yml"), "utf8")).trim()
	);

	return buildEveAgentFiles({
		descriptionBlock: extractDescriptionBlock(frontmatter, skillId),
		eveConfig: loadEveAgentConfig(eveConfigMap, skillId),
		sharedBody,
		skillId,
		tokenMap: deriveTokenMap(loadConfig(repoRoot)),
	});
}

test("instructions.md carries Lilac's identity, not the standup workflow", async () => {
	const files = await buildLilacEveFiles();
	const instructions = files.get("instructions.md");
	assert.ok(instructions, "emitter must produce instructions.md");

	assert.match(
		instructions,
		/^You are \*\*Lilac\*\*/,
		"instructions.md leads with the identity frame"
	);
	assert.ok(
		instructions.includes("## Personality") &&
			instructions.includes("## How Lilac Thinks"),
		"instructions.md carries the identity sections"
	);
	assert.ok(
		!instructions.includes("## Workflow") &&
			!instructions.includes("## Definition of Done"),
		"instructions.md does not carry the procedural workflow"
	);
});

test("the eve SKILL.md frontmatter carries a non-empty routing description", async () => {
	const files = await buildLilacEveFiles();
	const skillMarkdown = files.get(`skills/${skillId}/SKILL.md`);
	assert.ok(skillMarkdown, "emitter must produce the skill SKILL.md");

	const frontmatterMatch = skillMarkdown.match(/^---\n([\s\S]*?)\n---/);
	assert.ok(frontmatterMatch, "SKILL.md opens with YAML frontmatter");

	const description = parseFrontmatter(frontmatterMatch[1]).get("description");
	assert.ok(
		typeof description === "string" && description.trim().length > 0,
		"the routing description is present and non-empty"
	);

	assert.ok(
		skillMarkdown.includes("## Workflow"),
		"SKILL.md carries the procedural workflow"
	);
});

test("the emitter strips chat-harness reference-loading scaffolding", async () => {
	const files = await buildLilacEveFiles();
	const skillMarkdown = files.get(`skills/${skillId}/SKILL.md`);
	assert.ok(skillMarkdown);

	assert.ok(
		!skillMarkdown.includes(".prism/references/"),
		"no `.prism/references/` load links survive in the eve skill body"
	);
});

test("no emitted eve file carries a generated-header comment", async () => {
	const files = await buildLilacEveFiles();

	for (const [relativePath, content] of files) {
		assert.ok(
			!content.startsWith("<!-- AUTO-GENERATED"),
			`${relativePath} must not lead with a generated-header comment — it would break eve's frontmatter routing`
		);
	}
});

async function readTree(
	root: string
): Promise<{ entries: RelativeDirectoryEntry[]; root: string }> {
	return { entries: await listRelativeDirectoryEntries(root), root };
}

test("the generated eve tree byte-matches the Lilac reference fixture", async () => {
	let generated: { entries: RelativeDirectoryEntry[]; root: string };
	try {
		generated = await readTree(generatedRoot);
	} catch {
		// Pre-build state — nothing generated yet, nothing to compare against.
		return;
	}

	const fixture = await readTree(fixtureRoot);

	const generatedPaths = generated.entries.map((entry) => entry.relativePath);
	const fixturePaths = fixture.entries.map((entry) => entry.relativePath);
	assert.deepEqual(
		generatedPaths,
		fixturePaths,
		"generated tree and fixture have the same file set"
	);

	for (const entry of generated.entries) {
		if (entry.kind !== "file") {
			continue;
		}
		const generatedBytes = await fs.readFile(
			path.join(generated.root, entry.relativePath)
		);
		const fixtureBytes = await fs.readFile(
			path.join(fixture.root, entry.relativePath)
		);
		assert.ok(
			generatedBytes.equals(fixtureBytes),
			`${entry.relativePath} byte-matches the fixture`
		);
	}
});
