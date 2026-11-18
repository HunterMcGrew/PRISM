/**
 * Contract for the four plan-chain templates: the frontmatter keys and `##`
 * headings the scripts read by name, a consumer-neutral vocabulary, and the
 * example task and glob block that must stay inert until a person fills them.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { readFrontmatter, sectionBody } from "./hooks/plan/frontmatter.mjs";
import { parseTasks } from "./hooks/plan/tasks.mjs";
import { collectPlanFolderViolations } from "./plan-folder-citations";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const TEMPLATES: Record<string, { keys: string[]; headings: string[] }> = {
	"intent.md": {
		keys: ["title", "ticket", "stage", "status", "size"],
		headings: [
			"Problem",
			"Proposed outcome",
			"Regression surface",
			"Security surface",
			"Design",
			"Acceptance criteria",
			"Open questions",
		],
	},
	"design.md": {
		keys: ["title", "ticket", "stage", "status", "approval"],
		headings: [
			"User & Goal",
			"Feeling",
			"States",
			"Interaction notes",
			"Reused components",
			"New patterns",
			"Accessibility notes",
			"Copy direction",
			"Mobile behavior",
			"Open questions",
			"Architectural inputs for the spec",
		],
	},
	"spec.md": {
		keys: ["title", "ticket", "stage", "status"],
		headings: [
			"Requirements",
			"Design",
			"Affected systems",
			"Children",
			"Merge order",
			"Decisions",
		],
	},
	"plan.md": {
		keys: ["title", "ticket", "stage", "status"],
		headings: [
			"Tasks",
			"Challenge",
			"Decisions",
			"History",
			"Sessions",
			"Verification",
			"Review",
			"PR Readiness",
		],
	},
};

const FORBIDDEN = [".ai-spec", "thrive", "Linear", "THR"];

async function readTemplate(name: string): Promise<string> {
	return fs.readFile(path.join(repoRoot, ".prism", "templates", name), "utf8");
}

for (const [name, expected] of Object.entries(TEMPLATES)) {
	test(`${name} keeps the frontmatter keys and headings the scripts read, in order`, async () => {
		const text = await readTemplate(name);
		const stage = name.replace(/\.md$/, "");

		assert.deepEqual(Object.keys(readFrontmatter(text)?.fields ?? {}), expected.keys);
		assert.equal(readFrontmatter(text)?.fields["stage"], stage);
		assert.equal(readFrontmatter(text)?.fields["status"], "draft");
		assert.deepEqual(
			[...text.matchAll(/^## (.+)$/gm)].map((match) => match[1]),
			expected.headings
		);
	});

	test(`${name} copies into a plan folder with no citation`, async () => {
		const text = await readTemplate(name);

		assert.deepEqual(collectPlanFolderViolations(text, name), []);
	});

	test(`${name} names no tracker, ticket number, or framework of its own`, async () => {
		const text = await readTemplate(name);

		for (const word of FORBIDDEN) {
			assert.equal(text.includes(word), false, `${name} mentions ${word}`);
		}
	});

	test(`${name} tells the reader to copy it into a plan folder`, async () => {
		const text = await readTemplate(name);

		assert.ok(text.includes(`Copy this file to .prism/plans/<ticket>/${name}`));
	});
}

test("the plan template's example task sits inside a comment, so it parses to no tasks", async () => {
	assert.deepEqual(parseTasks(await readTemplate("plan.md")), []);
});

test("the spec template's Affected systems block is an empty text fence", async () => {
	const body = sectionBody(await readTemplate("spec.md"), "Affected systems");

	assert.match(body ?? "", /^```text\n\n```$/m);
});
