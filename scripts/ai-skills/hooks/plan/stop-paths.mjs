// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
/**
 * The repo paths that stop auto-approval of a folder plan: dependency
 * manifests and lockfiles, and the shared contract trees other systems read.
 *
 * Auto-approval and any later gate that checks stop paths read the same two
 * lists through `resolveStopPaths`, so they never disagree on what a stop path
 * is. Paths are repo-relative with forward slashes.
 */
import path from "node:path";

import { compileMatcher } from "../lib/match.mjs";

/**
 * @typedef {{ dependency: string[], contract: string[] }} StopPaths
 */

// Each root file is listed on its own, because a `**/` prefix does not match a
// file at the repo root.
export const DEFAULT_DEPENDENCY_FILES = [
	"package.json",
	"**/package.json",
	"package-lock.json",
	"**/package-lock.json",
	"pnpm-lock.yaml",
	"**/pnpm-lock.yaml",
	"yarn.lock",
	"**/yarn.lock",
	"bun.lockb",
	"**/bun.lockb",
	"composer.json",
	"**/composer.json",
	"composer.lock",
	"**/composer.lock",
	"pyproject.toml",
	"**/pyproject.toml",
	"poetry.lock",
	"**/poetry.lock",
	"uv.lock",
	"**/uv.lock",
	"requirements.txt",
	"**/requirements.txt",
	"go.mod",
	"**/go.mod",
	"go.sum",
	"**/go.sum",
	"Cargo.toml",
	"**/Cargo.toml",
	"Cargo.lock",
	"**/Cargo.lock",
	"Gemfile",
	"**/Gemfile",
	"Gemfile.lock",
	"**/Gemfile.lock",
];

const KINDS = ["dependency", "contract"];

/**
 * The two lists a repo's config sets, each falling back to its default when
 * the config leaves it unset. A list that is set replaces its default.
 *
 * Throws when the config misspells a key, sets a list to something other than
 * an array, lists something other than a string, or uses a `{` brace pattern,
 * because the config validator accepts all four and each would otherwise turn
 * a stop path off without a word.
 *
 * @param {{ stopPaths?: { dependency?: unknown, contract?: unknown } } | null | undefined} config
 * @returns {StopPaths}
 */
export function resolveStopPaths(config) {
	const stopPaths = config?.stopPaths;
	for (const key of Object.keys(stopPaths ?? {})) {
		if (!KINDS.includes(key)) {
			throw new Error(
				`stopPaths has an unknown key "${key}"; the keys are "dependency" and "contract".`
			);
		}
	}

	const dependency = checkList("dependency", stopPaths?.dependency);
	const contract = checkList("contract", stopPaths?.contract);

	return {
		dependency: dependency ?? DEFAULT_DEPENDENCY_FILES,
		contract: contract ?? [],
	};
}

/**
 * The list a config set for `kind`, or undefined when the config left it
 * unset. A set value that is not an array would otherwise fall back to its
 * default, and an empty default for `contract` approves past the paths the
 * config meant to stop on.
 *
 * @param {string} kind
 * @param {unknown} list
 * @returns {string[] | undefined}
 */
function checkList(kind, list) {
	if (list === undefined) return undefined;
	if (!Array.isArray(list)) {
		throw new Error(
			`stopPaths.${kind} is ${JSON.stringify(list)}, which is not an array of patterns.`
		);
	}
	list.forEach((entry) => checkPattern(kind, entry));

	return list;
}

/**
 * @param {string} kind
 * @param {unknown} entry
 */
function checkPattern(kind, entry) {
	if (typeof entry !== "string") {
		throw new Error(
			`stopPaths.${kind} holds ${JSON.stringify(entry)}, which is not a string pattern.`
		);
	}
	if (entry.includes("{")) {
		throw new Error(
			`stopPaths.${kind} pattern "${entry}" uses "{", and braces are not supported. List each alternative as its own pattern.`
		);
	}
}

/**
 * Returns `{ kind, glob }` for the first stop-path pattern the file matches,
 * where `kind` is `"dependency"` or `"contract"`, or null when none match.
 * `glob` is the pattern as the config spelled it.
 *
 * Case is ignored, because macOS paths ignore it. A directory that holds a
 * stop path, such as `src` or `src/contracts`, matches as well, judged
 * against the part of the pattern before its first wildcard segment.
 *
 * @param {string} file
 * @param {StopPaths} stopPaths
 * @returns {{ kind: "dependency" | "contract", glob: string } | null}
 */
export function matchStopPath(file, stopPaths) {
	const normalized = path.posix
		.normalize(file)
		.replace(/^\.\//, "")
		.replace(/\/+$/, "")
		.toLowerCase();

	/** @type {["dependency" | "contract", string[]][]} */
	const kinds = [
		["dependency", stopPaths.dependency],
		["contract", stopPaths.contract],
	];
	for (const [kind, globs] of kinds) {
		for (const glob of globs) {
			const pattern = glob.toLowerCase();
			if (
				expandMiddleGlobstars(pattern).some((variant) =>
					compileMatcher(variant)(normalized)
				) ||
				holdsGlob(normalized, pattern)
			)
				return { kind, glob };
		}
	}

	return null;
}

/**
 * Every spelling of `pattern` in which each globstar between two path
 * segments either crosses directories or stands for none. `compileMatcher`
 * needs at least one directory there, so the pattern `api/**` plus
 * `/schema.graphql` would otherwise miss `api/schema.graphql`.
 *
 * @param {string} pattern
 * @returns {string[]}
 */
function expandMiddleGlobstars(pattern) {
	const [first = "", ...rest] = pattern.split("/**/");

	return rest.reduce(
		(variants, part) =>
			variants.flatMap((variant) => [`${variant}/**/${part}`, `${variant}/${part}`]),
		[first]
	);
}

/**
 * True when `directory` is, or sits above, the literal part of `glob`.
 *
 * @param {string} directory
 * @param {string} glob
 * @returns {boolean}
 */
function holdsGlob(directory, glob) {
	/** @type {string[]} */
	const literal = [];
	for (const segment of glob.split("/")) {
		if (segment.includes("*")) break;

		literal.push(segment);
	}

	const prefix = literal.join("/");
	if (!prefix) return false;

	return prefix === directory || prefix.startsWith(`${directory}/`);
}
