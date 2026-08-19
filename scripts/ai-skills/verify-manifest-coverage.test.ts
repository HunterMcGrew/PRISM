/**
 * Regression suite for verify-manifest-coverage. Covers the three matcher
 * shapes (exact, prefix-with-slash, glob) and the multi-route collection
 * contract documented in `.prism/references/architect-context.md`.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
	collectRoutedDocs,
	findBraceGlobKeys,
	findCatchAllKeys,
	findMissingCoverage,
	findShipRoutingGaps,
	loadedDocsForScope,
} from "./verify-manifest-coverage";
import { compileMatcher } from "./hooks/lib/match.mjs";

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

test("loadedDocsForScope: array value loads all docs for a matching file", () => {
	const manifest = {
		".claude/skills/**": ["spec-editing.md", "skills-ecosystem.md"],
	};
	const docs = loadedDocsForScope(manifest, [
		".claude/skills/prism-architect/SKILL.md",
	]);
	assert.deepEqual(docs, ["skills-ecosystem.md", "spec-editing.md"]);
});

test("loadedDocsForScope: array value dedupes against other keys mapping to the same doc", () => {
	const manifest = {
		".prism/**": ["install-layout.md", "skills-ecosystem.md"],
		".prism/plans/**": "skills-ecosystem.md",
	};
	const docs = loadedDocsForScope(manifest, [".prism/plans/some-plan.md"]);
	assert.deepEqual(docs, [
		"install-layout.md",
		"skills-ecosystem.md",
	]);
});

test("loadedDocsForScope: mixed string and array values across keys", () => {
	const manifest = {
		".claude/skills/**": ["spec-editing.md", "skills-ecosystem.md"],
		".prism/**": "install-layout.md",
	};
	const docs = loadedDocsForScope(manifest, [
		".claude/skills/foo/SKILL.md",
		".prism/plans/bar.md",
	]);
	assert.deepEqual(docs, [
		"install-layout.md",
		"skills-ecosystem.md",
		"spec-editing.md",
	]);
});

test("findCatchAllKeys: every wildcard-only opening segment is flagged, not just the two that match the empty string", () => {
	// `**` and `*` accept the empty string, so an empty-string probe catches
	// them. The other three compile to a regex requiring a separator, reject
	// the empty string, and still match every nested path — which is why the
	// check is a leading-literal-segment requirement rather than a probe.
	for (const spelling of ["**", "*", "**/*", "*/**", "**/**"]) {
		const failures = findCatchAllKeys({ [spelling]: "skills-ecosystem.md" });
		assert.equal(
			failures.length,
			1,
			`"${spelling}" opens with a wildcard-only segment and must be flagged`
		);
	}

	assert.equal(compileMatcher("**/*")(""), false);
	assert.equal(
		compileMatcher("**/*")("scripts/ai-skills/build.ts"),
		true,
		"the spelling an empty-string probe accepts still matches every nested path"
	);
});

test("findCatchAllKeys: empty when every route opens with a literal segment", () => {
	const failures = findCatchAllKeys({
		".prism/**": "install-layout.md",
		".prism/SPEC.md": "spec-editing.md",
		"scripts/**/*.ts": "spec-editing.md",
	});
	assert.deepEqual(failures, []);
});

test("findBraceGlobKeys: a brace-glob key is flagged", () => {
	const failures = findBraceGlobKeys({
		"scripts/ai-skills/**/*.{ts,tsx}": "spec-editing.md",
	});
	assert.equal(failures.length, 1);
	assert.match(failures[0], /brace glob/);
});

test("findBraceGlobKeys: empty when no key contains braces", () => {
	const failures = findBraceGlobKeys({
		".prism/**": "install-layout.md",
	});
	assert.deepEqual(failures, []);
});

test("findMissingCoverage: empty when every expected positive has skills-ecosystem.md", () => {
	const result = {
		nora: ["_toolkit/skills-ecosystem.md", "_toolkit/spec-editing.md"],
		zoe: ["_toolkit/skills-ecosystem.md"],
		winston: ["_toolkit/skills-ecosystem.md"],
		eric: ["_toolkit/skills-ecosystem.md"],
		sage: ["_toolkit/skills-ecosystem.md"],
		fallthrough: [],
	};
	assert.deepEqual(findMissingCoverage(result), []);
});

test("findMissingCoverage: reports each expected positive that is missing the doc", () => {
	const result = {
		nora: ["_toolkit/skills-ecosystem.md"],
		zoe: ["_toolkit/spec-editing.md"],
		winston: ["_toolkit/skills-ecosystem.md"],
		eric: [],
		sage: ["_toolkit/skills-ecosystem.md"],
		fallthrough: [],
	};
	const failures = findMissingCoverage(result);
	assert.equal(failures.length, 2);
	assert.ok(failures.some((message) => message.startsWith("zoe ")));
	assert.ok(failures.some((message) => message.startsWith("eric ")));
});

test("collectRoutedDocs: flattens the single-doc and multi-doc route forms", () => {
	const routed = collectRoutedDocs({
		"docs/": "_toolkit/documentation.md",
		".claude/skills/**": ["_toolkit/skills-ecosystem.md", "_toolkit/closing-messages.md"],
	});

	assert.deepEqual(
		[...routed].sort(),
		[
			"_toolkit/closing-messages.md",
			"_toolkit/documentation.md",
			"_toolkit/skills-ecosystem.md",
		]
	);
});

test("findShipRoutingGaps: silent when every shipped doc is routed on both sides", () => {
	const shipped = new Set(["_toolkit/spec-editing.md", "guides/writing-a-rule.md"]);

	assert.deepEqual(findShipRoutingGaps(shipped, shipped, shipped), []);
});

test("findShipRoutingGaps: reports a doc the stub routes that PRISM's own tables do not", () => {
	const shipped = new Set(["_toolkit/closing-messages.md"]);
	const failures = findShipRoutingGaps(shipped, shipped, new Set<string>());

	assert.equal(failures.length, 1);
	assert.match(failures[0], /^_toolkit\/closing-messages\.md ships to consumers/);
});

test("findShipRoutingGaps: reports a shipped doc the consumer stub does not route", () => {
	const shipped = new Set(["_toolkit/spec-editing.md"]);
	const failures = findShipRoutingGaps(shipped, new Set<string>(), shipped);

	assert.equal(failures.length, 1);
	assert.match(failures[0], /ships in the install seed but no route/);
});

test("findShipRoutingGaps: reports a stub route naming a doc the seed does not carry", () => {
	const failures = findShipRoutingGaps(
		new Set<string>(),
		new Set(["_toolkit/absent.md"]),
		new Set<string>()
	);

	assert.equal(failures.length, 1);
	assert.match(failures[0], /that doc is not in the install seed/);
});

test("findShipRoutingGaps: a doc routed only in PRISM's tables and never shipped is not a gap", () => {
	const failures = findShipRoutingGaps(
		new Set<string>(),
		new Set<string>(),
		new Set(["_toolkit/output-guards.md"])
	);

	assert.deepEqual(
		failures,
		[],
		"a PRISM-dev-only doc satisfies the invariant without an exception list"
	);
});
