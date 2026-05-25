/**
 * Regression suite for verify-manifest-coverage. Covers the three matcher
 * shapes (exact, prefix-with-slash, glob) and the multi-route collection
 * contract documented in `.prism/references/architect-context.md`.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
	compileMatcher,
	findMissingCoverage,
	loadedDocsForScope,
} from "./verify-manifest-coverage";

test("compileMatcher: exact path", () => {
	const matcher = compileMatcher(".prism/SPEC.md");
	assert.equal(matcher(".prism/SPEC.md"), true);
	assert.equal(matcher(".prism/spec.md"), false);
	assert.equal(matcher(".prism/SPEC.md.bak"), false);
});

test("compileMatcher: prefix with trailing slash matches files under the prefix", () => {
	const matcher = compileMatcher(".claude/skills/prism-qa-test-plan/");
	assert.equal(matcher(".claude/skills/prism-qa-test-plan/SKILL.md"), true);
	assert.equal(matcher(".claude/skills/prism-qa-test-plan/"), true);
	assert.equal(matcher(".claude/skills/other-skill/SKILL.md"), false);
});

test("compileMatcher: ** matches across path segments", () => {
	const matcher = compileMatcher(".claude/skills/**");
	assert.equal(matcher(".claude/skills/foo/SKILL.md"), true);
	assert.equal(matcher(".claude/skills/foo/bar/baz.md"), true);
	assert.equal(matcher(".codex/skills/foo/SKILL.md"), false);
});

test("compileMatcher: ** in the middle of a pattern matches multi-segment", () => {
	const matcher = compileMatcher(".claude/skills/**/SKILL.md");
	assert.equal(matcher(".claude/skills/prism-architect/SKILL.md"), true);
	assert.equal(matcher(".claude/skills/foo/bar/SKILL.md"), true);
	assert.equal(matcher(".codex/skills/prism-architect/SKILL.md"), false);
	assert.equal(matcher(".claude/skills/prism-architect/other.md"), false);
});

test("compileMatcher: * matches within a single segment", () => {
	const matcher = compileMatcher("*.md");
	assert.equal(matcher("foo.md"), true);
	assert.equal(matcher("foo/bar.md"), false);
});

test("compileMatcher: catch-all ** matches every path", () => {
	const matcher = compileMatcher("**");
	assert.equal(matcher("anything"), true);
	assert.equal(matcher("a/b/c/d.md"), true);
});

test("compileMatcher: regex metacharacters in the pattern are escaped", () => {
	const matcher = compileMatcher(".prism/architect/manifest.json");
	assert.equal(matcher(".prism/architect/manifest.json"), true);
	// The dots in the pattern would otherwise act as regex wildcards.
	assert.equal(matcher("xprismxarchitectxmanifestxjson"), false);
});

test("loadedDocsForScope: collects matches from every key per file", () => {
	const manifest = {
		".prism/SPEC.md": "spec-editing.md",
		".claude/skills/**": "spec-editing.md",
		".prism/**": "install-layout.md",
		"**": "skills-ecosystem.md",
	};
	const docs = loadedDocsForScope(manifest, [
		".claude/skills/prism-architect/SKILL.md",
	]);
	assert.deepEqual(docs, ["skills-ecosystem.md", "spec-editing.md"]);
});

test("loadedDocsForScope: dedupes when multiple keys map to the same doc", () => {
	const manifest = {
		".prism/SPEC.md": "spec-editing.md",
		".prism/**": "spec-editing.md",
	};
	const docs = loadedDocsForScope(manifest, [".prism/SPEC.md"]);
	assert.deepEqual(docs, ["spec-editing.md"]);
});

test("loadedDocsForScope: collects across multiple files in the scope", () => {
	const manifest = {
		".claude/skills/**": "spec-editing.md",
		".prism/**": "install-layout.md",
	};
	const docs = loadedDocsForScope(manifest, [
		".claude/skills/foo/SKILL.md",
		".prism/plans/some-plan.md",
	]);
	assert.deepEqual(docs, ["install-layout.md", "spec-editing.md"]);
});

test("loadedDocsForScope: returns empty when no key matches", () => {
	const manifest = {
		".claude/skills/**": "spec-editing.md",
	};
	const docs = loadedDocsForScope(manifest, ["package.json"]);
	assert.deepEqual(docs, []);
});

test("findMissingCoverage: empty when every expected positive has skills-ecosystem.md", () => {
	const result = {
		nora: ["skills-ecosystem.md", "spec-editing.md"],
		zoe: ["skills-ecosystem.md"],
		winston: ["skills-ecosystem.md"],
		eric: ["skills-ecosystem.md"],
		sage: ["skills-ecosystem.md"],
		fallthrough: [],
	};
	assert.deepEqual(findMissingCoverage(result), []);
});

test("findMissingCoverage: reports each expected positive that is missing the doc", () => {
	const result = {
		nora: ["skills-ecosystem.md"],
		zoe: ["spec-editing.md"],
		winston: ["skills-ecosystem.md"],
		eric: [],
		sage: ["skills-ecosystem.md"],
		fallthrough: [],
	};
	const failures = findMissingCoverage(result);
	assert.equal(failures.length, 2);
	assert.ok(failures.some((message) => message.startsWith("zoe ")));
	assert.ok(failures.some((message) => message.startsWith("eric ")));
});
