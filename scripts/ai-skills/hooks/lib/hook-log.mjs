// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import path from "node:path";

const LOG_FILE = "prism-hooks.jsonl";
const GIT_TIMEOUT_MS = 5000;

/**
 * Returns the absolute git directory of the repo `cwd` sits in, or null when
 * `cwd` is not in a repo or git fails.
 *
 * The git directory keeps a hook's files out of the working tree with no
 * `.gitignore` line, as the chat approval token is kept.
 *
 * @param {string} cwd
 * @returns {string | null}
 */
export function findGitDir(cwd) {
	try {
		const gitDir = execFileSync("git", ["rev-parse", "--absolute-git-dir"], {
			cwd,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
			timeout: GIT_TIMEOUT_MS,
		}).trim();

		return gitDir === "" ? null : gitDir;
	} catch {
		return null;
	}
}

/**
 * Appends one JSON line to `prism-hooks.jsonl` in the git directory of the
 * repo `cwd` sits in.
 *
 * Every error is swallowed, because the log is a record and never a reason to
 * fail the call.
 *
 * @param {string} cwd
 * @param {Record<string, unknown>} entry
 */
export function appendHookLog(cwd, entry) {
	const gitDir = findGitDir(cwd);
	if (gitDir === null) return;

	try {
		appendFileSync(path.join(gitDir, LOG_FILE), `${JSON.stringify(entry)}\n`);
	} catch {
		// The log is a record, so a failed write costs nothing the caller needs.
	}
}
