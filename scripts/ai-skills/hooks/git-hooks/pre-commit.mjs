#!/usr/bin/env node
// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
/**
 * The pre-commit git hook: refuses a commit whose staged files are not
 * formatted, using the formatter `gitHooks.preCommit` in
 * `.ai-skills/config.json` names.
 *
 * The formatter contract is stdin to stdout. The hook feeds it one file's
 * staged content and compares what it prints with what went in, byte for byte.
 * A formatter's own `--check` mode is not used because Prettier's exits 0 on
 * a parse error when it reads stdin, which would wave a broken file through.
 *
 * Nothing is ever written: no `--write`, no `git add`, no change to the index
 * or the working tree. The hook runs the staged blob, so a partially staged
 * file is judged on what the commit will contain, not on the working copy.
 * `process.env` passes through untouched because `git commit -a` and `git
 * commit <paths>` point hooks at a temporary index through `GIT_INDEX_FILE`.
 *
 * A missing config block or a missing formatter binary skips with a notice and
 * exits 0: a hook that blocked on its own setup would be one people bypass.
 *
 * `--all` checks every tracked file that matches, from disk, for a consumer's
 * CI: `node .claude/hooks/git-hooks/pre-commit.mjs --all`.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

import { asRecord, fillCommand, isCommandNotFound, readRepoConfig } from "../lib/command.mjs";

const MAX_BUFFER_BYTES = 64 * 1024 * 1024;

/**
 * @typedef {Object} HookResult
 * @property {number} exitCode
 * @property {string} stdout
 * @property {string} stderr
 */

/**
 * @param {string} toplevel
 * @param {NodeJS.ProcessEnv} env
 * @param {string[]} args
 */
function runGit(toplevel, env, args) {
	return spawnSync("git", ["-c", "core.quotePath=false", ...args], {
		cwd: toplevel,
		env,
		maxBuffer: MAX_BUFFER_BYTES,
		windowsHide: true,
	});
}

/**
 * Splits `git ... -z` output into paths.
 *
 * @param {Buffer} output
 * @returns {string[]}
 */
function splitNulSeparated(output) {
	return output
		.toString("utf8")
		.split("\0")
		.filter((entry) => entry.length > 0);
}

/**
 * @param {string} toplevel
 * @param {NodeJS.ProcessEnv} env
 * @param {boolean} all
 * @param {string[]} globs
 * @returns {string[]}
 */
function listCandidatePaths(toplevel, env, all, globs) {
	const pathspecs = globs.map((glob) => `:(glob)${glob}`);
	const args = all
		? ["ls-files", "-z", "--", ...pathspecs]
		: ["diff", "--cached", "--name-only", "-z", "--diff-filter=ACMR", "--", ...pathspecs];
	const result = runGit(toplevel, env, args);
	if (result.status !== 0) {
		return [];
	}

	return splitNulSeparated(result.stdout);
}

/**
 * The content to judge: the staged blob normally, the file on disk in
 * `--all` mode. `null` when there is nothing to read, such as a tracked file
 * deleted from the working tree.
 *
 * @param {string} toplevel
 * @param {NodeJS.ProcessEnv} env
 * @param {boolean} all
 * @param {string} filePath
 * @returns {Buffer | null}
 */
function readContent(toplevel, env, all, filePath) {
	if (all) {
		try {
			return readFileSync(path.join(toplevel, filePath));
		} catch {
			return null;
		}
	}

	const result = runGit(toplevel, env, ["show", `:${filePath}`]);

	return result.status === 0 ? result.stdout : null;
}

/**
 * @param {{ toplevel: string, all?: boolean, env?: NodeJS.ProcessEnv, platform?: NodeJS.Platform }} options
 * @returns {HookResult}
 */
export function runPreCommit({ toplevel, all = false, env = process.env, platform = process.platform }) {
	const preCommit = asRecord(asRecord(readRepoConfig(toplevel)?.gitHooks).preCommit);
	const command = preCommit.command;
	const globs = preCommit.globs;
	if (
		typeof command !== "string" ||
		command.trim().length === 0 ||
		!Array.isArray(globs) ||
		globs.length === 0
	) {
		return {
			exitCode: 0,
			stdout: "",
			stderr: "pre-commit: skipped (no gitHooks.preCommit in .ai-skills/config.json)\n",
		};
	}

	/** @type {string[]} */
	const failed = [];
	let stderr = "";
	for (const filePath of listCandidatePaths(toplevel, env, all, globs)) {
		const content = readContent(toplevel, env, all, filePath);
		if (content === null) {
			continue;
		}

		const result = spawnSync(fillCommand(command, "{path}", [filePath], platform), {
			shell: true,
			cwd: toplevel,
			env,
			input: content,
			maxBuffer: MAX_BUFFER_BYTES,
			windowsHide: true,
		});

		if (isCommandNotFound(result)) {
			return {
				exitCode: 0,
				stdout: "",
				stderr: `pre-commit: skipped (\`${command}\` not found)\n`,
			};
		}

		if (result.error !== undefined || result.status !== 0) {
			failed.push(filePath);
			const detail = result.error?.message ?? String(result.stderr ?? "");
			stderr += `pre-commit: could not format ${filePath}:\n${detail.trimEnd()}\n`;
		} else if (!result.stdout.equals(content)) {
			failed.push(filePath);
		}
	}

	if (failed.length === 0) {
		return { exitCode: 0, stdout: "", stderr: "" };
	}

	const fix = preCommit.fix;
	const stageNote = all ? "" : ", then stage the result";
	stderr += "pre-commit: these files are not formatted:\n";
	stderr += failed.map((filePath) => `  ${filePath}\n`).join("");
	stderr +=
		typeof fix === "string" && fix.trim().length > 0
			? `Format them${stageNote}:\n  ${fillCommand(fix, "{files}", failed, platform)}\n`
			: `Format them with your formatter${stageNote}.\n`;

	return { exitCode: 1, stdout: "", stderr };
}

function main() {
	const top = spawnSync("git", ["rev-parse", "--show-toplevel"], {
		encoding: "utf8",
		windowsHide: true,
	});
	if (top.status !== 0) {
		return;
	}

	const result = runPreCommit({
		toplevel: top.stdout.trim(),
		all: process.argv.includes("--all"),
	});
	process.stdout.write(result.stdout);
	process.stderr.write(result.stderr);
	process.exitCode = result.exitCode;
}

/**
 * Compared by basename rather than `import.meta.url` so an `esbuild` bundle,
 * which collapses every module's URL to the output file's, never treats this
 * module as the entry.
 */
if (path.basename(process.argv[1] ?? "") === "pre-commit.mjs") {
	try {
		main();
	} catch (error) {
		// A crash in the hook itself must not block a commit.
		process.stderr.write(
			`pre-commit: skipped (internal error: ${error instanceof Error ? error.message : String(error)})\n`
		);
	}
}
