/**
 * Test suite for the migrate-skill CLI.
 *
 * Covers:
 *   - Round-trip fidelity per source shape (claude, cursor, agents, codex) using
 *     the live prism-changelog skill — decompose the generated artifact and assert
 *     the recovered frontmatter/body match canonical source.
 *   - `normalizeSkillId` unit cases: prism-foo + org acme → acme-foo; org PRISM →
 *     stays prism-foo (in-PRISM exception); no org → custom-foo; --id override.
 *   - TOML unescape round-trip: strings with `"""`, backslashes, and newlines
 *     survive `escapeTomlMultiline` → `unescapeTomlMultiline`.
 *   - `detectSourceShape` path heuristics.
 *   - `detectPersona` body detection.
 */
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import { escapeToml, escapeTomlMultiline, pathExists } from "./utils";
import {
	decomposeCodexToml,
	decomposeSkillMarkdown,
	detectPersona,
	detectSourceShape,
	normalizeSkillId,
	rewriteIdInContent,
	unescapeToml,
	unescapeTomlMultiline,
} from "./migrate-skill";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "../..");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function readCanonicalFrontmatter(skillId: string): Promise<string> {
	const filePath = path.join(
		repoRoot,
		".ai-skills",
		"skills",
		skillId,
		"frontmatter.yml"
	);
	const raw = await fs.readFile(filePath, "utf8");
	return raw.trim();
}

async function readCanonicalShared(skillId: string): Promise<string> {
	const filePath = path.join(
		repoRoot,
		".ai-skills",
		"skills",
		skillId,
		"shared.md"
	);
	const raw = await fs.readFile(filePath, "utf8");
	return raw.trim();
}

async function readGeneratedFile(relPath: string): Promise<string> {
	const filePath = path.join(repoRoot, relPath);
	return fs.readFile(filePath, "utf8");
}

// ---------------------------------------------------------------------------
// detectSourceShape
// ---------------------------------------------------------------------------

test("detectSourceShape: .toml extension → codex", () => {
	assert.equal(
		detectSourceShape("/repo/.codex/agents/prism-foo.toml"),
		"codex"
	);
});

test("detectSourceShape: .claude/ ancestor → claude", () => {
	assert.equal(
		detectSourceShape("/repo/.claude/skills/prism-foo/SKILL.md"),
		"claude"
	);
});

test("detectSourceShape: .cursor/ ancestor → cursor", () => {
	assert.equal(
		detectSourceShape("/repo/.cursor/skills/prism-foo/SKILL.md"),
		"cursor"
	);
});

test("detectSourceShape: .agents/ ancestor → agents", () => {
	assert.equal(
		detectSourceShape("/repo/.agents/skills/prism-foo/SKILL.md"),
		"agents"
	);
});

test("detectSourceShape: --platform override wins over path heuristic", () => {
	// Even if the path looks like claude, explicit override wins.
	assert.equal(
		detectSourceShape("/repo/.claude/skills/prism-foo/SKILL.md", "cursor"),
		"cursor"
	);
});

test("detectSourceShape: ambiguous path without --platform throws guidance error", () => {
	assert.throws(
		() => detectSourceShape("/some/external/SKILL.md"),
		/Pass --platform/
	);
});

test("detectSourceShape: invalid --platform value throws", () => {
	assert.throws(
		() => detectSourceShape("/any/path.md", "openai"),
		/--platform must be one of/
	);
});

// ---------------------------------------------------------------------------
// normalizeSkillId
// ---------------------------------------------------------------------------

test("normalizeSkillId: prism-foo + org acme → acme-foo", () => {
	assert.equal(normalizeSkillId("prism-foo", "acme", undefined), "acme-foo");
});

test("normalizeSkillId: org PRISM (uppercase) → in-PRISM exception, stays prism-foo", () => {
	assert.equal(normalizeSkillId("prism-foo", "PRISM", undefined), "prism-foo");
});

test("normalizeSkillId: org prism (lowercase) → in-PRISM exception, stays prism-foo", () => {
	assert.equal(normalizeSkillId("prism-foo", "prism", undefined), "prism-foo");
});

test("normalizeSkillId: no org token → custom-foo", () => {
	assert.equal(normalizeSkillId("prism-foo", undefined, undefined), "custom-foo");
});

test("normalizeSkillId: empty org string → custom-foo", () => {
	assert.equal(normalizeSkillId("prism-foo", "", undefined), "custom-foo");
});

test("normalizeSkillId: --id explicit override wins verbatim", () => {
	assert.equal(normalizeSkillId("prism-foo", "acme", "bar-baz"), "bar-baz");
});

test("normalizeSkillId: --id explicit override wins even with prism org", () => {
	assert.equal(
		normalizeSkillId("prism-foo", "prism", "contrib-foo"),
		"contrib-foo"
	);
});

test("normalizeSkillId: non-prism raw ID with consumer org → org-rawid", () => {
	// A skill that wasn't prefixed with prism- keeps its full id after re-prefix
	assert.equal(
		normalizeSkillId("my-custom-skill", "acme", undefined),
		"acme-my-custom-skill"
	);
});

// ---------------------------------------------------------------------------
// rewriteIdInContent
// ---------------------------------------------------------------------------

test("rewriteIdInContent: replaces all occurrences", () => {
	const input =
		'Triggers: "prism-foo", see also prism-foo documentation, prism-foo';
	const result = rewriteIdInContent(input, "prism-foo", "acme-foo");
	assert.equal(
		result,
		'Triggers: "acme-foo", see also acme-foo documentation, acme-foo'
	);
});

test("rewriteIdInContent: no-op when ids are equal", () => {
	const input = "prism-foo is the skill";
	assert.equal(rewriteIdInContent(input, "prism-foo", "prism-foo"), input);
});

// ---------------------------------------------------------------------------
// TOML unescape round-trips
// ---------------------------------------------------------------------------

test("unescapeToml: inverts escapeToml for strings with quotes and newlines", () => {
	const original = 'He said "hello"\nNew line here\rCarriage return\\backslash';
	const escaped = escapeToml(original);
	const unescaped = unescapeToml(escaped);
	assert.equal(unescaped, original);
});

test("unescapeTomlMultiline: inverts escapeTomlMultiline for triple-quote and backslash", () => {
	const original = 'Text with """ triple quotes\\ and backslashes\\\\double';
	const escaped = escapeTomlMultiline(original);
	const unescaped = unescapeTomlMultiline(escaped);
	assert.equal(unescaped, original);
});

test("unescapeTomlMultiline: raw newlines pass through unchanged", () => {
	const original = "line one\nline two\nline three";
	const escaped = escapeTomlMultiline(original);
	// Raw newlines are not escaped in multiline basic strings
	assert.equal(escaped, original);
	assert.equal(unescapeTomlMultiline(escaped), original);
});

// ---------------------------------------------------------------------------
// detectPersona
// ---------------------------------------------------------------------------

test("detectPersona: bold form You are **Name** (she/her)", () => {
	const body = "You are **Sage** (she/her), a technical writer with…";
	assert.equal(detectPersona(body), "Sage");
});

test("detectPersona: bold form with comma and extra text", () => {
	const body =
		"You are **Clove** (she/her), a dev fairy who ships production code.";
	assert.equal(detectPersona(body), "Clove");
});

test("detectPersona: plain form You are Name.", () => {
	const body = "You are Sage.";
	assert.equal(detectPersona(body), "Sage");
});

test("detectPersona: utility body with no persona opener returns undefined", () => {
	const body = "## Changelog Generator\n\nGenerates release notes.";
	assert.equal(detectPersona(body), undefined);
});

test("detectPersona: empty body returns undefined", () => {
	assert.equal(detectPersona(""), undefined);
});

test("detectPersona: skips leading blank lines", () => {
	const body = "\n\nYou are **Winston** (he/him), the architect.";
	assert.equal(detectPersona(body), "Winston");
});

// ---------------------------------------------------------------------------
// decomposeSkillMarkdown — unit level
// ---------------------------------------------------------------------------

test("decomposeSkillMarkdown: splits frontmatter and strips generated header", () => {
	const input = [
		"---",
		"name: test-skill",
		"description: >",
		"  A test skill.",
		"---",
		"",
		"<!-- AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY. -->",
		"<!-- Source: .ai-skills/skills/test-skill -->",
		"<!-- Target: claude | Regenerate with: pnpm prism:build -->",
		"",
		"You are **Test** (she/her), a tester.",
	].join("\n");

	const result = decomposeSkillMarkdown(input, "test.md");
	assert.equal(result.frontmatter, "name: test-skill\ndescription: >\n  A test skill.");
	assert.equal(result.body, "You are **Test** (she/her), a tester.");
});

test("decomposeSkillMarkdown: throws on missing frontmatter", () => {
	assert.throws(
		() => decomposeSkillMarkdown("No frontmatter here.", "test.md"),
		/Missing or invalid frontmatter/
	);
});

test("decomposeSkillMarkdown: handles cursor target in header", () => {
	const input = [
		"---",
		"name: foo",
		"---",
		"",
		"<!-- AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY. -->",
		"<!-- Source: .ai-skills/skills/foo -->",
		"<!-- Target: cursor | Regenerate with: pnpm prism:build -->",
		"",
		"Body content here.",
	].join("\n");

	const result = decomposeSkillMarkdown(input);
	assert.equal(result.body, "Body content here.");
});

// ---------------------------------------------------------------------------
// Round-trip tests — one per source shape using live prism-changelog
//
// Round-trip fidelity = idempotent rebuild green, not byte-identity to the
// original artifact. The generated files have token substitution applied
// (e.g. PRISM instead of ${TICKET_PREFIX}), so the decomposed body will not
// match canonical shared.md byte-for-byte. Instead these tests verify:
//   1. The generated header block is stripped (body does not start with <!--)
//   2. The frontmatter is recovered correctly (matches canonical frontmatter.yml)
//   3. The body starts with the expected content and ends with the expected tail
//   4. For codex: the persona name is recovered correctly
// ---------------------------------------------------------------------------

test("round-trip: .claude SKILL.md → decomposeSkillMarkdown strips header and recovers frontmatter", async () => {
	const generated = await readGeneratedFile(
		".claude/skills/prism-changelog/SKILL.md"
	);
	const canonicalFrontmatter = await readCanonicalFrontmatter("prism-changelog");
	const canonicalBody = await readCanonicalShared("prism-changelog");

	const result = decomposeSkillMarkdown(
		generated,
		".claude/skills/prism-changelog/SKILL.md"
	);

	assert.equal(
		result.frontmatter,
		canonicalFrontmatter,
		"frontmatter must match canonical frontmatter.yml"
	);
	assert.ok(
		!result.body.startsWith("<!-- AUTO-GENERATED"),
		"body must not start with the generated HTML header block"
	);
	// Body starts where canonical body starts (token substitution may change
	// interior content but the first line is the same).
	const firstLineCanonical = canonicalBody.split("\n")[0];
	assert.ok(
		result.body.startsWith(firstLineCanonical),
		`body must start with canonical first line: ${firstLineCanonical}`
	);
});

test("round-trip: .cursor SKILL.md → decomposeSkillMarkdown strips header and recovers frontmatter", async () => {
	const generated = await readGeneratedFile(
		".cursor/skills/prism-changelog/SKILL.md"
	);
	const canonicalFrontmatter = await readCanonicalFrontmatter("prism-changelog");
	const canonicalBody = await readCanonicalShared("prism-changelog");

	const result = decomposeSkillMarkdown(
		generated,
		".cursor/skills/prism-changelog/SKILL.md"
	);

	assert.equal(
		result.frontmatter,
		canonicalFrontmatter,
		"cursor frontmatter must match canonical"
	);
	assert.ok(
		!result.body.startsWith("<!-- AUTO-GENERATED"),
		"cursor body must not start with the generated HTML header block"
	);
	const firstLineCanonical = canonicalBody.split("\n")[0];
	assert.ok(
		result.body.startsWith(firstLineCanonical),
		`cursor body must start with canonical first line: ${firstLineCanonical}`
	);
});

test("round-trip: .agents SKILL.md → decomposeSkillMarkdown strips header and recovers frontmatter", async (t) => {
	// `.agents/skills/` is the codexSkillsRoot (paths.json) and is generated by
	// `pnpm prism:build`. Skip gracefully in a fresh worktree where build hasn't
	// run yet — the round-trip assertion is identical to the .claude shape, which
	// already verifies the decompose logic.
	const agentsPath = path.join(repoRoot, ".agents/skills/prism-changelog/SKILL.md");
	const agentsExists = await pathExists(agentsPath);
	if (!agentsExists) {
		t.skip(".agents/skills/prism-changelog/SKILL.md not yet generated — run pnpm prism:build first");
		return;
	}

	const generated = await fs.readFile(agentsPath, "utf8");
	const canonicalFrontmatter = await readCanonicalFrontmatter("prism-changelog");
	const canonicalBody = await readCanonicalShared("prism-changelog");

	const result = decomposeSkillMarkdown(
		generated,
		".agents/skills/prism-changelog/SKILL.md"
	);

	assert.equal(
		result.frontmatter,
		canonicalFrontmatter,
		"agents frontmatter must match canonical"
	);
	assert.ok(
		!result.body.startsWith("<!-- AUTO-GENERATED"),
		"agents body must not start with the generated HTML header block"
	);
	const firstLineCanonical = canonicalBody.split("\n")[0];
	assert.ok(
		result.body.startsWith(firstLineCanonical),
		`agents body must start with canonical first line: ${firstLineCanonical}`
	);
});

test("round-trip: .codex TOML → decomposeCodexToml strips scaffolding and recovers persona", async () => {
	const generated = await readGeneratedFile(
		".codex/agents/prism-changelog.toml"
	);
	const canonicalFrontmatter = await readCanonicalFrontmatter("prism-changelog");
	const canonicalBody = await readCanonicalShared("prism-changelog");

	const result = decomposeCodexToml(
		generated,
		".codex/agents/prism-changelog.toml"
	);

	assert.equal(
		result.frontmatter,
		canonicalFrontmatter,
		"codex frontmatter must match canonical"
	);
	assert.ok(
		!result.body.startsWith("<!-- AUTO-GENERATED"),
		"codex body must not start with the generated HTML header block"
	);
	const firstLineCanonical = canonicalBody.split("\n")[0];
	assert.ok(
		result.body.startsWith(firstLineCanonical),
		`codex body must start with canonical first line: ${firstLineCanonical}`
	);
	assert.equal(result.persona, "Sage", "codex persona must be recovered as Sage");
});
