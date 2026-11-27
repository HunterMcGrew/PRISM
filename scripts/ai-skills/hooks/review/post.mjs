// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
/**
 * Posts one inline review comment on a PR's head commit:
 * `node <hook-runtime>/review/post.mjs <pr> <file> <line> <body-file>`.
 *
 * The session posts decision items and leftover Critical or Major findings
 * through it, never through `gh` directly, so every agent comment carries the
 * `<!-- prism-agent -->` marker `reconcile.mjs` reads and no comment lands on
 * a path the review never raises a finding on.
 *
 * Exits 0 once the comment is posted, 1 when `<file>` is never-reviewed, when
 * the line sits outside the diff (GitHub's 422), or on any other `gh`
 * failure, and 2 on a usage or config error.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { asRecord, readRepoConfig } from "../lib/command.mjs";
import { isNeverReviewed, normalizeReviewPath, resolveReviewIgnore } from "./ignore.mjs";

const MARKER = "<!-- prism-agent -->";

const PR_PATTERN = /^(?:#|https?:\/\/\S+\/pull\/)?([1-9]\d*)$/;

// The owner and repo are spliced into an API path, so a slash or a `?` would
// send the comment to another endpoint.
const GITHUB_NAME_PATTERN = /^[A-Za-z0-9._-]+$/;

const USAGE = "usage: node <hook-runtime>/review/post.mjs <pr> <file> <line> <body-file>";

/**
 * @typedef {{ status: number | null, stdout: string, stderr: string }} GhResult
 * @typedef {(args: string[]) => GhResult} GhRunner
 * @typedef {{ status: 0 | 1 | 2, message: string }} PostResult
 */

/**
 * Posts `bodyFile`'s text as one comment on `file` at `line` of `pr`'s head
 * commit, and returns the exit status with a one-line message.
 *
 * `pr` is `N`, `#N`, or a URL ending `/pull/N`. `cwd` is the repo top level:
 * the config is read from its `.ai-skills/config.json`, a relative `bodyFile`
 * resolves against it, and `file` is made relative to it.
 * `gh(args)` returns `{ status, stdout, stderr }`, so a test drives every
 * branch without GitHub. Nothing is posted unless every check passes first.
 *
 * @param {{
 *   pr: string,
 *   file: string,
 *   line: string,
 *   bodyFile: string,
 *   gh?: GhRunner,
 *   cwd: string,
 * }} input
 * @returns {PostResult}
 */
export function postComment({ pr, file, line, bodyFile, gh = runGh, cwd }) {
	if (!pr || !file || !bodyFile) {
		return { status: 2, message: USAGE };
	}

	const prNumber = PR_PATTERN.exec(pr)?.[1];
	if (!prNumber) {
		return {
			status: 2,
			message: `post: PR "${pr}" is not N, #N, or a URL ending /pull/N`,
		};
	}

	if (!/^[1-9]\d*$/.test(line)) {
		return { status: 2, message: `post: line "${line}" is not a positive integer` };
	}

	let body;
	try {
		body = readFileSync(path.resolve(cwd, bodyFile), "utf8");
	} catch (error) {
		return { status: 2, message: `post: cannot read ${bodyFile}: ${describe(error)}` };
	}

	const config = readRepoConfig(cwd);
	const github = asRecord(config?.["github"]);
	const { owner, repo } = github;
	if (typeof owner !== "string" || !owner || typeof repo !== "string" || !repo) {
		return {
			status: 2,
			message: "post: github.owner and github.repo must be set in .ai-skills/config.json",
		};
	}

	if (!GITHUB_NAME_PATTERN.test(owner) || !GITHUB_NAME_PATTERN.test(repo)) {
		return {
			status: 2,
			message: `post: github.owner "${owner}" and github.repo "${repo}" may hold only letters, digits, ".", "_", and "-"`,
		};
	}

	let lists;
	try {
		lists = resolveReviewIgnore(config);
	} catch (error) {
		return { status: 2, message: `post: ${describe(error)}` };
	}

	const reviewPath = normalizeReviewPath(file, cwd);
	if (isNeverReviewed(reviewPath, lists)) {
		return {
			status: 1,
			message: `post: ${reviewPath} is never reviewed (reviewIgnore), so nothing was posted`,
		};
	}

	const view = gh([
		"pr",
		"view",
		prNumber,
		"--repo",
		`${owner}/${repo}`,
		"--json",
		"headRefOid",
		"-q",
		".headRefOid",
	]);
	const head = view.stdout.trim();
	if (view.status !== 0 || !head) {
		return { status: 1, message: `post: gh pr view ${prNumber} failed: ${failure(view)}` };
	}

	const firstLine = body.split("\n", 1)[0]?.trim();
	const markedBody = firstLine === MARKER ? body : `${MARKER}\n${body}`;
	const result = gh([
		"api",
		`repos/${owner}/${repo}/pulls/${prNumber}/comments`,
		"-f",
		`body=${markedBody}`,
		"-f",
		`commit_id=${head}`,
		"-f",
		`path=${reviewPath}`,
		"-F",
		`line=${line}`,
		"-f",
		"side=RIGHT",
	]);

	if (result.status === 0) {
		return { status: 0, message: `post: commented on ${reviewPath}:${line} at ${head}` };
	}

	// GitHub answers 422 for a line outside the diff's hunks. Retrying another
	// line would pin the comment somewhere the finding is not, so the caller
	// moves the item to the PR body instead.
	if (/HTTP 422/.test(`${result.stderr}\n${result.stdout}`)) {
		return { status: 1, message: "post: line outside the diff (422)" };
	}

	return { status: 1, message: `post: gh api failed: ${failure(result)}` };
}

/**
 * @param {GhResult} result
 * @returns {string}
 */
function failure(result) {
	return result.stderr.trim() || `exit ${result.status}`;
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function describe(error) {
	return error instanceof Error ? error.message : String(error);
}

// --- CLI ---

/** @type {GhRunner} */
function runGh(args) {
	const result = spawnSync("gh", args, { encoding: "utf8" });

	return {
		status: result.status,
		stdout: result.stdout ?? "",
		stderr: result.stderr ?? "",
	};
}

/** @returns {string} */
function findToplevel() {
	const result = spawnSync("git", ["rev-parse", "--show-toplevel"], {
		encoding: "utf8",
	});
	const toplevel = (result.stdout ?? "").trim();

	return result.status === 0 && toplevel ? toplevel : process.cwd();
}

if (
	process.argv[1] &&
	realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	const [pr, file, line, bodyFile] = process.argv.slice(2);
	if (!pr || !file || !line || !bodyFile) {
		process.stderr.write(`${USAGE}\n`);
		process.exitCode = 2;
	} else {
		const result = postComment({
			pr,
			file,
			line,
			bodyFile: path.resolve(bodyFile),
			cwd: findToplevel(),
		});
		(result.status === 0 ? process.stdout : process.stderr).write(`${result.message}\n`);
		process.exitCode = result.status;
	}
}
