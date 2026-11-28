// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
/**
 * Says whether a diff still fits the small size:
 * `node size.mjs <base> [--tree <treeish>]`.
 *
 * It diffs the merge base of `<base>` and HEAD against the working tree, or
 * against `<treeish>` with `--tree`, and prints `small` or `standard`, then
 * one reason line per limit that is over. It exits 0 for `small`, 1 for
 * `standard`, and 2 on a usage error, an unknown base or tree, a directory
 * outside a repo, or a config it cannot read.
 *
 * A diff is small when it adds at most 100 product lines, adds at most one new
 * product file, keeps every product file in one area, and touches no stop
 * path. Only added lines count: a deleted line adds no code to review. A file
 * is product code unless it is a test (`testGlobs`), a doc (under
 * `documentation.location`, or any `.md`), a lockfile, a config file, or any
 * path under `.prism/`, which holds plans and records. A stop path counts
 * before those classes, so a manifest edit is never small. A product file
 * that adds no line, such as a deleted file, counts toward no limit, and a
 * binary product file is over the line limit because its size is unknown.
 */
import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolveTestGlobs } from "../commit-gate/test-guard.mjs";
import { runGit } from "../commit-gate/tree.mjs";
import { compileMatcher } from "../lib/match.mjs";
import { matchStopPath, resolveStopPaths } from "./stop-paths.mjs";
import { readPlanConfig } from "./tasks.mjs";

/**
 * @typedef {{ path: string, status: string, added: number | null }} ChangedFile
 * @typedef {{ testGlobs: string[], stopPaths: import("./stop-paths.mjs").StopPaths, docsRoot: string | null }} SizeOptions
 * @typedef {{ size: "small" | "standard", reasons: string[] }} SizeResult
 */

const LINE_LIMIT = 100;
const NEW_FILE_LIMIT = 1;
const CONFIG_FILE = /\.(json|ya?ml|toml)$/i;
const LOCKFILE = /(\.lockb?|^go\.sum)$/i;
const USAGE = "Usage: size.mjs <base> [--tree <treeish>]";

/**
 * The classifier's inputs from a repo's config. Throws on a `testGlobs` or
 * `stopPaths` value the config cannot mean, as the commit gate and
 * auto-approval do.
 *
 * @param {Record<string, unknown> | null | undefined} config
 * @returns {SizeOptions}
 */
export function resolveSizeOptions(config) {
	const documentation = /** @type {{ location?: unknown } | undefined} */ (
		config?.["documentation"]
	);

	return {
		testGlobs: resolveTestGlobs(config),
		stopPaths: resolveStopPaths(
			/** @type {Parameters<typeof resolveStopPaths>[0]} */ (config)
		),
		docsRoot: normalizeDocsRoot(documentation?.location),
	};
}

/**
 * Judges the changed files against the small limits. Reasons come in the
 * order lines, new files, areas, stop paths.
 *
 * @param {ChangedFile[]} files
 * @param {SizeOptions} options
 * @returns {SizeResult}
 */
export function classifyDiff(files, { testGlobs, stopPaths, docsRoot }) {
	const testMatchers = testGlobs.map(compileMatcher);
	/** @type {string[]} */
	const stopReasons = [];
	/** @type {string[]} */
	const binaryReasons = [];
	const areas = new Set();
	let addedLines = 0;
	let newFiles = 0;

	for (const file of files) {
		if (matchStopPath(file.path, stopPaths)) {
			stopReasons.push(`stop path: ${file.path}`);
		}

		const notProduct =
			file.path.startsWith(".prism/") ||
			testMatchers.some((matches) => matches(file.path)) ||
			isDoc(file.path, docsRoot) ||
			LOCKFILE.test(path.posix.basename(file.path)) ||
			CONFIG_FILE.test(file.path);
		if (notProduct || file.added === 0) continue;

		if (file.added === null) {
			binaryReasons.push(`lines: ${file.path} is binary, so its added lines are unknown`);
		} else {
			addedLines += file.added;
		}

		if (file.status === "A") newFiles += 1;

		areas.add(areaOf(file.path));
	}

	const reasons = [];
	if (addedLines > LINE_LIMIT) {
		reasons.push(`lines: ${addedLines} added product lines, limit ${LINE_LIMIT}`);
	}

	reasons.push(...binaryReasons);
	if (newFiles > NEW_FILE_LIMIT) {
		reasons.push(`new files: ${newFiles} new product files, limit ${NEW_FILE_LIMIT}`);
	}

	if (areas.size > 1) {
		reasons.push(
			`areas: product files in ${areas.size} areas (${[...areas].sort().join(", ")})`
		);
	}

	reasons.push(...stopReasons);

	return { size: reasons.length > 0 ? "standard" : "small", reasons };
}

/**
 * The files changed from `mergeBase` to `tree`, or to the working tree when
 * `tree` is absent, with paths relative to `repoRoot`. The working tree also
 * brings untracked files git does not ignore, each read as new. A binary
 * file's `added` is null. Throws when git fails.
 *
 * @param {string} repoRoot
 * @param {string} mergeBase
 * @param {string} [tree]
 * @returns {ChangedFile[]}
 */
export function readChangedFiles(repoRoot, mergeBase, tree) {
	const range = tree ? [mergeBase, tree] : [mergeBase];
	const statuses = parseNameStatus(
		runGit(repoRoot, ["diff", "--name-status", "-M", "-z", ...range], { trim: false })
	);
	const added = parseNumstat(
		runGit(repoRoot, ["diff", "--numstat", "-M", "-z", ...range], { trim: false })
	);
	/** @type {ChangedFile[]} */
	const files = [...statuses].map(([file, status]) => ({
		path: file,
		status,
		added: added.has(file) ? /** @type {number | null} */ (added.get(file)) : 0,
	}));
	if (tree) return files;

	const untracked = runGit(
		repoRoot,
		["ls-files", "--others", "--exclude-standard", "-z"],
		{ trim: false }
	)
		.split("\0")
		.filter(Boolean);
	for (const file of untracked) {
		files.push({ path: file, status: "A", added: countLines(path.join(repoRoot, file)) });
	}

	return files;
}

/**
 * Measures the diff from the merge base of `base` and HEAD, with `code` the
 * exit code.
 *
 * @param {string} cwd
 * @param {string} base
 * @param {string} [tree]
 * @returns {({ code: 0 | 1 } & SizeResult) | { code: 2, message: string }}
 */
export function measureSize(cwd, base, tree) {
	const root = runGit(cwd, ["rev-parse", "--show-toplevel"], { fallback: null });
	if (root === null) return { code: 2, message: `size: ${cwd} is not inside a git repo.` };

	/** @type {SizeOptions} */
	let options;
	try {
		options = resolveSizeOptions(readPlanConfig(root));
	} catch (error) {
		return {
			code: 2,
			message: `size: ${error instanceof Error ? error.message : String(error)}`,
		};
	}

	const mergeBase = runGit(root, ["merge-base", base, "HEAD"], { fallback: null });
	if (mergeBase === null) {
		return { code: 2, message: `size: no merge base between "${base}" and HEAD.` };
	}

	const treeArgs = ["rev-parse", "--verify", "--quiet", `${tree}^{tree}`];
	if (tree && runGit(root, treeArgs, { fallback: null }) === null) {
		return { code: 2, message: `size: "${tree}" names no tree.` };
	}

	const result = classifyDiff(readChangedFiles(root, mergeBase, tree), options);

	return { code: result.size === "small" ? 0 : 1, ...result };
}

// --- Private utilities ---

/**
 * `documentation.location` as a path prefix with no leading `./` or trailing
 * slash, or null when it is unset or names the repo root, which would make
 * every file a doc.
 *
 * @param {unknown} location
 * @returns {string | null}
 */
function normalizeDocsRoot(location) {
	if (typeof location !== "string") return null;

	const root = path.posix.normalize(location).replace(/^\.\//, "").replace(/\/+$/, "");

	return root === "" || root === "." ? null : root;
}

/**
 * @param {string} file
 * @param {string | null} docsRoot
 */
function isDoc(file, docsRoot) {
	if (file.toLowerCase().endsWith(".md")) return true;

	return docsRoot !== null && (file === docsRoot || file.startsWith(`${docsRoot}/`));
}

/**
 * The file's directory cut to its first two segments, or `.` at the root.
 *
 * @param {string} file
 */
function areaOf(file) {
	const dir = path.posix.dirname(file);

	return dir === "." ? "." : dir.split("/").slice(0, 2).join("/");
}

/**
 * Maps each path to its status letter. A rename maps its new path to `R`.
 *
 * @param {string} output
 * @returns {Map<string, string>}
 */
function parseNameStatus(output) {
	const tokens = output.split("\0");
	const statuses = new Map();
	for (let i = 0; i < tokens.length; i++) {
		const status = tokens[i]?.[0];
		if (!status) continue;

		if (status === "R" || status === "C") {
			statuses.set(tokens[i + 2], status);
			i += 2;
		} else {
			statuses.set(tokens[i + 1], status);
			i += 1;
		}
	}

	return statuses;
}

/**
 * Maps each path to its added line count, or null for a binary file. A
 * rename's count sits under its new path.
 *
 * @param {string} output
 * @returns {Map<string, number | null>}
 */
function parseNumstat(output) {
	const tokens = output.split("\0");
	const added = new Map();
	for (let i = 0; i < tokens.length; i++) {
		const match = /^(\d+|-)\t(?:\d+|-)\t(.*)$/s.exec(tokens[i] ?? "");
		if (!match) continue;

		const count = match[1] === "-" ? null : Number(match[1]);
		if (match[2]) {
			added.set(match[2], count);
		} else {
			added.set(tokens[i + 2], count);
			i += 2;
		}
	}

	return added;
}

/**
 * The line count of a new file, or null when it holds a NUL byte, the test
 * git uses for binary.
 *
 * @param {string} file
 * @returns {number | null}
 */
function countLines(file) {
	const content = readFileSync(file);
	if (content.includes(0)) return null;
	if (content.length === 0) return 0;

	const newlines = content.toString("utf8").split("\n").length - 1;

	return content[content.length - 1] === 0x0a ? newlines : newlines + 1;
}

// --- CLI ---

/** @param {string[]} args */
function runCli(args) {
	const [base, flag, tree, ...rest] = args;
	const valid =
		base !== undefined &&
		!base.startsWith("-") &&
		rest.length === 0 &&
		(flag === undefined || (flag === "--tree" && tree !== undefined));
	if (!valid) {
		process.stderr.write(`${USAGE}\n`);
		process.exitCode = 2;

		return;
	}

	/** @type {ReturnType<typeof measureSize>} */
	let result;
	try {
		result = measureSize(process.cwd(), base, tree);
	} catch (error) {
		result = {
			code: 2,
			message: `size: ${error instanceof Error ? error.message : String(error)}`,
		};
	}

	if (result.code === 2) {
		process.stderr.write(`${result.message}\n`);
	} else {
		process.stdout.write(`${[result.size, ...result.reasons].join("\n")}\n`);
	}

	process.exitCode = result.code;
}

if (
	process.argv[1] &&
	realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	runCli(process.argv.slice(2));
}
