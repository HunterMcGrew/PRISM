// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
/**
 * The paths the review never raises a finding on: operational records,
 * PRISM's own shipped content, and the generated host copies of it.
 *
 * `record.mjs` and `post.mjs` read the same lists through
 * `resolveReviewIgnore`, so a finding the review may not record is also one
 * it may not post. Paths are repo-relative with forward slashes.
 */
import path from "node:path";

import { compileMatcher } from "../lib/match.mjs";

/**
 * @typedef {{ ignore: string[], keep: string[] }} ReviewIgnoreLists
 */

const HOSTS = [".claude", ".codex", ".cursor"];

const SKILL_ROOTS = [".claude/skills", ".cursor/skills", ".agents/skills"];

// The `.prism/` trees after the operational paths spell out `PRISM_OWNED_GLOBS`
// from `ownership.ts`, because the runtime ships no TypeScript to import.
// `review-ignore.test.ts` holds the two equal.
export const DEFAULT_REVIEW_IGNORE = [
	".prism/plans/**",
	".prism/lessons.md",
	".prism/retros/**",
	".prism/audits/**",
	".prism/metrics/**",
	"REVIEW.md",
	".githooks/**",
	".claude/hooks/**",
	".prism/architect/_toolkit/**",
	".prism/architect/guides/**",
	".prism/spec/adrs/_toolkit/**",
	".prism/rules/**",
	".prism/templates/**",
	".prism/references/**",
	".prism/review/**",
	".prism/spec/**",
	".prism/SPEC.md",
	...HOSTS.flatMap((host) => [
		`${host}/rules/**`,
		`${host}/architect/**`,
		`${host}/spec/**`,
		`${host}/templates/**`,
		`${host}/references/**`,
		`${host}/review/**`,
		`${host}/SPEC.md`,
	]),
	...SKILL_ROOTS.flatMap((root) => [`${root}/prism-*/**`, `${root}/tdd/**`]),
	".claude/agents/prism-*.md",
	".codex/agents/prism-*.toml",
];

// `CONSUMER_OWNED_GLOBS` from `ownership.ts` minus `plans/**` and `lessons.md`,
// which the ignore list names. These sit inside ignored trees and stay the
// consumer's to review.
export const DEFAULT_REVIEW_KEEP = [
	".prism/architect/*.md",
	".prism/spec/adrs/*.md",
	".prism/architect/manifest.json",
	".prism/custom/**",
	".prism/review/stack/**",
];

/**
 * The lists a repo's config sets, or both defaults when `reviewIgnore` is
 * unset. A set list replaces both defaults, the keep list included, so the
 * config states every never-reviewed path itself.
 *
 * Throws an `Error` naming `reviewIgnore` on a value that is not an array, a
 * non-string entry, or a pattern holding `{`, because `compileMatcher` reads a
 * brace literally and the pattern would silently match nothing.
 *
 * @param {{ reviewIgnore?: unknown } | null | undefined} config
 * @returns {ReviewIgnoreLists}
 */
export function resolveReviewIgnore(config) {
	const list = config?.reviewIgnore;
	if (list === undefined) {
		return { ignore: DEFAULT_REVIEW_IGNORE, keep: DEFAULT_REVIEW_KEEP };
	}

	if (!Array.isArray(list)) {
		throw new Error(
			`reviewIgnore is ${JSON.stringify(list)}, which is not an array of patterns.`
		);
	}

	for (const entry of list) {
		if (typeof entry !== "string") {
			throw new Error(
				`reviewIgnore holds ${JSON.stringify(entry)}, which is not a string pattern.`
			);
		}
		if (entry.includes("{")) {
			throw new Error(
				`reviewIgnore pattern "${entry}" uses "{", and braces are not supported. List each alternative as its own pattern.`
			);
		}
	}

	return { ignore: list, keep: [] };
}

/**
 * The repo-relative, forward-slash form of a path a finding cites, so the
 * ignore lists see one spelling of each file.
 *
 * Backslashes become slashes, a path absolute on either platform is made
 * relative to `repoRoot`, dot segments collapse, and a leading `./` goes.
 * Without the collapse, `src/../.prism/lessons.md` would slip past a pattern
 * written for `.prism/lessons.md`.
 *
 * @param {string} file
 * @param {string} repoRoot
 * @returns {string}
 */
export function normalizeReviewPath(file, repoRoot) {
	let normalized = file.replace(/\\/g, "/");

	if (path.posix.isAbsolute(normalized) || /^[A-Za-z]:\//.test(normalized)) {
		normalized = path.posix.relative(repoRoot.replace(/\\/g, "/"), normalized);
	}

	return path.posix.normalize(normalized).replace(/^\.\//, "");
}

/**
 * True when `file` matches an `ignore` pattern and no `keep` pattern. Case
 * counts, as it does for the architect routes whose dialect the patterns use.
 *
 * @param {string} file
 * @param {ReviewIgnoreLists} lists
 * @returns {boolean}
 */
export function isNeverReviewed(file, lists) {
	const matches = (/** @type {string} */ pattern) => compileMatcher(pattern)(file);

	return lists.ignore.some(matches) && !lists.keep.some(matches);
}
