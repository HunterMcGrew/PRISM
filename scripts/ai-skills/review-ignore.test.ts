/**
 * Suite for the review's never-reviewed paths: the default ignore and keep
 * lists, how a repo's `reviewIgnore` replaces both, the config errors, and
 * which paths the default leaves reviewable.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
	DEFAULT_REVIEW_IGNORE,
	DEFAULT_REVIEW_KEEP,
	isNeverReviewed,
	normalizeReviewPath,
	resolveReviewIgnore,
} from "./hooks/review/ignore.mjs";
import { CONSUMER_OWNED_GLOBS, PRISM_OWNED_GLOBS } from "./ownership";

const OPERATIONAL_PRISM_PATHS = [
	".prism/plans/**",
	".prism/lessons.md",
	".prism/retros/**",
	".prism/audits/**",
	".prism/metrics/**",
];

test("the default ignore list names the operational paths, the PRISM-owned trees, and the generated host copies", () => {
	for (const pattern of [
		...OPERATIONAL_PRISM_PATHS,
		"REVIEW.md",
		".githooks/**",
		".claude/hooks/**",
		".claude/rules/**",
		".codex/architect/**",
		".cursor/SPEC.md",
		".codex/review/**",
		".claude/skills/prism-*/**",
		".cursor/skills/tdd/**",
		".agents/skills/prism-*/**",
		".claude/agents/prism-*.md",
		".codex/agents/prism-*.toml",
	]) {
		assert.ok(DEFAULT_REVIEW_IGNORE.includes(pattern), `missing ${pattern}`);
	}
});

test("the default's .prism/ entries are the operational paths plus PRISM_OWNED_GLOBS", () => {
	const prismEntries = DEFAULT_REVIEW_IGNORE.filter((pattern) =>
		pattern.startsWith(".prism/")
	);

	assert.deepEqual(
		[...prismEntries].sort(),
		[...OPERATIONAL_PRISM_PATHS, ...PRISM_OWNED_GLOBS.map((glob) => `.prism/${glob}`)].sort()
	);
});

test("the default keep list is CONSUMER_OWNED_GLOBS minus plans and lessons", () => {
	const expected = CONSUMER_OWNED_GLOBS.filter(
		(glob) => glob !== "plans/**" && glob !== "lessons.md"
	).map((glob) => `.prism/${glob}`);

	assert.deepEqual([...DEFAULT_REVIEW_KEEP].sort(), [...expected].sort());
});

test("an absent reviewIgnore returns both defaults", () => {
	assert.deepEqual(resolveReviewIgnore({}), {
		ignore: DEFAULT_REVIEW_IGNORE,
		keep: DEFAULT_REVIEW_KEEP,
	});
	assert.deepEqual(resolveReviewIgnore(null), {
		ignore: DEFAULT_REVIEW_IGNORE,
		keep: DEFAULT_REVIEW_KEEP,
	});
});

const NEVER_REVIEWED = [
	".prism/plans/prism-1/plan.md",
	".prism/lessons.md",
	".prism/spec/adrs/_toolkit/0001-x.md",
	".prism/architect/_toolkit/hook-runtime.md",
	".prism/rules/workflow.md",
	".claude/skills/prism-review/SKILL.md",
	".claude/agents/prism-review.md",
	".codex/agents/prism-review.toml",
	".claude/hooks/hook.mjs",
	"REVIEW.md",
];

const REVIEWABLE = [
	".prism/spec/adrs/0001-x.md",
	".prism/architect/team-topic.md",
	".prism/architect/manifest.json",
	".prism/review/stack/react.md",
	".prism/custom/rules/x.md",
	".claude/skills/acme-x/SKILL.md",
	".claude/agents/acme.md",
	"src/index.ts",
	".prism/Plans/x.md",
];

for (const file of NEVER_REVIEWED) {
	test(`the default never reviews ${file}`, () => {
		assert.equal(isNeverReviewed(file, resolveReviewIgnore({})), true);
	});
}

for (const file of REVIEWABLE) {
	test(`the default reviews ${file}`, () => {
		assert.equal(isNeverReviewed(file, resolveReviewIgnore({})), false);
	});
}

test("a set list replaces the default, its keep list included", () => {
	const lists = resolveReviewIgnore({ reviewIgnore: ["docs/**", ".prism/spec/**"] });

	assert.deepEqual(lists, { ignore: ["docs/**", ".prism/spec/**"], keep: [] });
	assert.equal(isNeverReviewed("docs/guide.md", lists), true);
	assert.equal(isNeverReviewed(".prism/spec/adrs/0001-x.md", lists), true);
	assert.equal(isNeverReviewed(".prism/plans/prism-1/plan.md", lists), false);
});

test("an empty set list reviews every path", () => {
	const lists = resolveReviewIgnore({ reviewIgnore: [] });

	assert.equal(isNeverReviewed(".prism/plans/prism-1/plan.md", lists), false);
});

const MALFORMED: [string, unknown][] = [
	["a string", ".prism/plans/**"],
	["an object", { glob: ".prism/plans/**" }],
	["null", null],
	["a non-string entry", [".prism/plans/**", 3]],
	["a brace pattern", ["docs/*.{md,mdx}"]],
];

for (const [label, value] of MALFORMED) {
	test(`reviewIgnore set to ${label} throws naming the key`, () => {
		assert.throws(() => resolveReviewIgnore({ reviewIgnore: value }), /reviewIgnore/);
	});
}

const NORMALIZED: [string, string, string][] = [
	["a bare repo-relative path", "src/a.ts", "src/a.ts"],
	["a leading ./", "./src/a.ts", "src/a.ts"],
	["backslashes", "src\\lib\\a.ts", "src/lib/a.ts"],
	["a .\\ prefix", ".\\src\\a.ts", "src/a.ts"],
	["dot segments", "src/./lib/../a.ts", "src/a.ts"],
	["an absolute path inside the repo", "/repo/root/.prism/plans/x/plan.md", ".prism/plans/x/plan.md"],
	["an absolute path with dot segments", "/repo/root/src/../.prism/lessons.md", ".prism/lessons.md"],
];

for (const [label, file, expected] of NORMALIZED) {
	test(`normalizeReviewPath turns ${label} into a repo-relative path`, () => {
		assert.equal(normalizeReviewPath(file, "/repo/root"), expected);
	});
}

test("normalizeReviewPath makes a Windows absolute path repo-relative", () => {
	assert.equal(
		normalizeReviewPath("C:\\work\\repo\\.prism\\plans\\x\\plan.md", "C:\\work\\repo"),
		".prism/plans/x/plan.md"
	);
});

test("an absolute or dot-segmented path to a never-reviewed file is caught once normalized", () => {
	const lists = resolveReviewIgnore({});

	assert.equal(
		isNeverReviewed(normalizeReviewPath("/repo/root/.prism/plans/x/plan.md", "/repo/root"), lists),
		true
	);
	assert.equal(
		isNeverReviewed(normalizeReviewPath("./src/../REVIEW.md", "/repo/root"), lists),
		true
	);
});
