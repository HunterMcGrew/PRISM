// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
/**
 * Stages and commits exactly the named paths, so parallel task agents sharing
 * one worktree never sweep a sibling's staged files into their commit. Paths
 * are literal, so a magic pathspec such as `:/` can't widen the commit.
 *
 * Usage: node commit.mjs "<subject>" <path>...
 *
 * Every git call is an argv array with no shell, so quoting is the same on
 * every platform. A step that fails on a held index.lock is retried, because
 * a sibling's git call holding the lock is the normal case when agents commit
 * in parallel. PRISM_PLAN_COMMIT_RETRIES (default 20) is the number of
 * attempts in total, and PRISM_PLAN_COMMIT_RETRY_DELAY_MS (default 500) is the
 * wait between them. Any other failure exits with git's own code.
 *
 * A named path with no change against HEAD exits 1 before anything is staged,
 * because git would commit the other paths and the subject would then
 * describe a change the commit doesn't carry.
 */
import { spawnSync } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const USAGE = 'Usage: commit.mjs "<subject>" <path>...';
const DEFAULT_RETRIES = 20;
const DEFAULT_RETRY_DELAY_MS = 500;

/**
 * @typedef {{ exitCode: number, stdout: string, stderr: string }} CommitResult
 */

/**
 * Commits `paths` with `subject` from `cwd`.
 *
 * @param {{ cwd: string, subject: string, paths: string[], env?: NodeJS.ProcessEnv }} input
 * @returns {CommitResult}
 */
export function runPlanCommit({ cwd, subject, paths, env = process.env }) {
	if (!subject || paths.length === 0) {
		return { exitCode: 2, stdout: "", stderr: `${USAGE}\n` };
	}

	const retries = readPositiveInteger(
		env["PRISM_PLAN_COMMIT_RETRIES"],
		DEFAULT_RETRIES
	);
	const delayMs = readPositiveInteger(
		env["PRISM_PLAN_COMMIT_RETRY_DELAY_MS"],
		DEFAULT_RETRY_DELAY_MS
	);

	/**
	 * @param {string[]} args
	 * @returns {{ status: number, stdout: string, stderr: string }}
	 */
	const git = (args) => {
		const result = spawnSync("git", args, { cwd, env, encoding: "utf8" });

		return {
			status: result.status ?? 1,
			stdout: result.stdout ?? "",
			stderr: result.stderr || (result.error ? String(result.error.message) : ""),
		};
	};

	const unchanged = paths.filter(
		(file) =>
			existsSync(path.resolve(cwd, file)) &&
			git([
				"--literal-pathspecs",
				"status",
				"--porcelain",
				"--untracked-files=all",
				"--",
				file,
			]).stdout.trim() === ""
	);

	if (unchanged.length > 0) {
		return {
			exitCode: 1,
			stdout: "",
			stderr: `commit.mjs: no change to commit in: ${unchanged.join(" ")}. Make the edit first, in its own command, or drop the path.\n`,
		};
	}

	let stdout = "";
	let stderr = "";

	for (const args of [
		["--literal-pathspecs", "add", "--", ...paths],
		["--literal-pathspecs", "commit", "-m", subject, "--", ...paths],
	]) {
		let attempt = 1;

		for (;;) {
			const step = git(args);

			if (step.status === 0) {
				stdout += step.stdout;
				stderr += step.stderr;
				break;
			}

			if (!step.stderr.includes("index.lock")) {
				return { exitCode: step.status, stdout, stderr: stderr + step.stderr };
			}

			if (attempt >= retries) {
				const lock = git(["rev-parse", "--git-path", "index.lock"]).stdout.trim();

				return {
					exitCode: 1,
					stdout,
					stderr: `${stderr}commit.mjs: gave up after ${attempt} attempts; the lock is still held at ${lock}\n`,
				};
			}

			attempt += 1;
			sleep(delayMs);
		}
	}

	return { exitCode: 0, stdout, stderr };
}

/**
 * @param {string | undefined} value
 * @param {number} fallback
 * @returns {number}
 */
function readPositiveInteger(value, fallback) {
	const parsed = Number.parseInt(value ?? "", 10);

	return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/** @param {number} ms */
function sleep(ms) {
	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** @param {string[]} argv */
function runCli(argv) {
	const [subject = "", ...paths] = argv;
	const result = runPlanCommit({
		cwd: process.cwd(),
		subject: argv.length < 2 ? "" : subject,
		paths,
	});

	process.stdout.write(result.stdout);
	process.stderr.write(result.stderr);
	process.exitCode = result.exitCode;
}

const isEntryModule =
	process.argv[1] !== undefined &&
	realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntryModule) runCli(process.argv.slice(2));
