/**
 * Regression suite for the Cursor rule-dialect translation. Canonical rules
 * carry the Claude dialect (`paths:` for Tier 2, no frontmatter for Tier 1);
 * Cursor needs `.mdc` files with `globs:`/`alwaysApply:`. These tests pin the
 * frontmatter rewrite and the `.md` → `.mdc` rename so a verbatim regression
 * (the #73 bug) fails loudly.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { codexRuleDialect, cursorRuleDialect, verbatimRuleDialect } from "./rule-dialect";

test("cursor dialect rewrites a Tier 2 paths: list to globs: with the same globs", () => {
	const canonical = `---
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
	assert.match(out, /# Accessibility/);
});

test("cursor dialect gives a frontmatter-less Tier 1 rule alwaysApply: true", () => {
	const canonical = "# Writing Voice\n\nBody content.\n";
	const out = cursorRuleDialect.transformContent("rules", canonical);

	assert.match(out, /^---\nalwaysApply: true\n---\n\n# Writing Voice/);
});

test("cursor dialect preserves non-paths frontmatter verbatim", () => {
	const canonical = "---\ndescription: A rule\n---\n\n# Body\n";
	const out = cursorRuleDialect.transformContent("rules", canonical);

	assert.match(out, /^---\ndescription: A rule\n---\n\n# Body/);
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

test("codex dialect strips a Tier 2 paths: block, leaving body only", () => {
	const input = `---\npaths:\n  - "**/*.tsx"\n---\n\n# Accessibility\n\nBody.\n`;
	const out = codexRuleDialect.transformContent("rules", input);

	assert.doesNotMatch(out, /paths:/);
	assert.doesNotMatch(out, /^---/);
	assert.match(out, /# Accessibility/);
});

test("codex dialect leaves a frontmatter-less Tier 1 rule untouched", () => {
	const input = "# Writing Voice\n\nBody.\n";
	const out = codexRuleDialect.transformContent("rules", input);

	assert.equal(out, input);
});

test("codex dialect leaves non-rule areas untouched", () => {
	const input = `---\npaths:\n  - "**/*.tsx"\n---\n\n# Architect doc\n`;
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
