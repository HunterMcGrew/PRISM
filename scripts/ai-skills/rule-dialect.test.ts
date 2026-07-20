/**
 * Regression suite for the Cursor rule-dialect translation. Canonical rules
 * carry the Claude dialect (`load: paths` + a `paths:` list for Tier 2,
 * `load: always` for Tier 1); Cursor needs `.mdc` files with
 * `globs:`/`alwaysApply:`. These tests pin the frontmatter rewrite and the
 * `.md` → `.mdc` rename so a verbatim regression (the #73 bug) fails loudly.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { codexRuleDialect, cursorRuleDialect, verbatimRuleDialect } from "./rule-dialect";

test("cursor dialect rewrites a load: paths list to globs: with the same globs", () => {
	const canonical = `---
load: paths
paths:
  - "**/*.tsx"
  - "**/*.jsx"
---

# Accessibility

Body content.
`;
	const out = cursorRuleDialect.transformContent("rules", canonical);

	assert.match(out, /^---\nglobs:\n {2}- "\*\*\/\*\.tsx"\n {2}- "\*\*\/\*\.jsx"\n---/);
	assert.doesNotMatch(out, /paths:/);
	assert.doesNotMatch(out, /load:/);
	assert.match(out, /# Accessibility/);
});

test("cursor dialect gives a load: always rule alwaysApply: true", () => {
	const canonical = "---\nload: always\n---\n\n# Writing Voice\n\nBody content.\n";
	const out = cursorRuleDialect.transformContent("rules", canonical);

	assert.match(out, /^---\nalwaysApply: true\n---\n\n# Writing Voice/);
});

test("cursor dialect treats a rule with no load: declaration as always-on (ratified legacy default)", () => {
	const canonical = "# Legacy Rule\n\nPredates the load: mechanism.\n";
	const out = cursorRuleDialect.transformContent("rules", canonical);

	assert.match(out, /^---\nalwaysApply: true\n---\n\n# Legacy Rule/);
});

test("cursor dialect leaves non-rule areas untouched", () => {
	const canonical = "---\npaths:\n  - foo\n---\n\n# Architect doc\n";
	const out = cursorRuleDialect.transformContent("architect", canonical);

	assert.equal(out, canonical);
});

test("cursor dialect renames .md to .mdc inside the rules area only", () => {
	assert.equal(
		cursorRuleDialect.mapTargetRelativePath("rules", "accessibility.md"),
		"accessibility.mdc"
	);
	assert.equal(
		cursorRuleDialect.mapTargetRelativePath("architect", "doc.md"),
		"doc.md"
	);
	assert.equal(
		cursorRuleDialect.mapTargetRelativePath("rules", ".ai-skill-generated"),
		".ai-skill-generated"
	);
});

test("cursor dialect maps .mdc back to .md for orphan cleanup", () => {
	assert.equal(
		cursorRuleDialect.mapSourceRelativePath("rules", "accessibility.mdc"),
		"accessibility.md"
	);
	assert.equal(
		cursorRuleDialect.mapSourceRelativePath("rules", ".ai-skill-generated"),
		".ai-skill-generated"
	);
});

test("codex dialect strips a load: paths block, leaving body only", () => {
	const input = `---\nload: paths\npaths:\n  - "**/*.tsx"\n---\n\n# Accessibility\n\nBody.\n`;
	const out = codexRuleDialect.transformContent("rules", input);

	assert.doesNotMatch(out, /paths:/);
	assert.doesNotMatch(out, /load:/);
	assert.doesNotMatch(out, /^---/);
	assert.match(out, /# Accessibility/);
});

test("codex dialect strips a load: always rule's frontmatter too, leaving body only", () => {
	const input = "---\nload: always\n---\n\n# Writing Voice\n\nBody.\n";
	const out = codexRuleDialect.transformContent("rules", input);

	assert.doesNotMatch(out, /load:/);
	assert.doesNotMatch(out, /^---/);
	assert.match(out, /# Writing Voice/);
});

test("codex dialect leaves a genuinely frontmatter-less rule untouched", () => {
	const input = "# Legacy Rule\n\nPredates the load: mechanism.\n";
	const out = codexRuleDialect.transformContent("rules", input);

	assert.equal(out, input);
});

test("codex dialect leaves non-rule areas untouched", () => {
	const input = `---\nload: paths\npaths:\n  - "**/*.tsx"\n---\n\n# Architect doc\n`;
	const out = codexRuleDialect.transformContent("architect", input);

	assert.equal(out, input);
});

test("codex dialect path maps are identity", () => {
	assert.equal(
		codexRuleDialect.mapTargetRelativePath("rules", "accessibility.md"),
		"accessibility.md"
	);
	assert.equal(
		codexRuleDialect.mapSourceRelativePath("rules", "accessibility.md"),
		"accessibility.md"
	);
});

test("verbatim dialect is the identity across content and path mapping", () => {
	const canonical = "---\npaths:\n  - foo\n---\n\n# Body\n";
	assert.equal(verbatimRuleDialect.transformContent("rules", canonical), canonical);
	assert.equal(
		verbatimRuleDialect.mapTargetRelativePath("rules", "foo.md"),
		"foo.md"
	);
	assert.equal(
		verbatimRuleDialect.mapSourceRelativePath("rules", "foo.md"),
		"foo.md"
	);
});
