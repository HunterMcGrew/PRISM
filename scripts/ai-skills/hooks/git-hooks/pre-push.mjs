#!/usr/bin/env node
// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
/**
 * The pre-push git hook: lints the files a push carries, with the command
 * `gitHooks.prePush` in `.ai-skills/config.json` names.
 *
 * Git writes one `<local_ref> <local_sha> <remote_ref> <remote_sha>` line per
 * ref being pushed to stdin. For each ref the hook diffs the pushed commits
 * against what the remote already has, collects the files that match the
 * configured globs, and runs the lint command once over the union.
 *
 * The linter reads the working tree, so a ref whose tip is not the checked-out
 * HEAD is skipped with a notice: linting the working tree would judge files
 * the push does not carry. A missing config block, a missing linter binary,
 * and a ref with nothing to diff against all skip with a notice and exit 0,
 * because a hook that blocks on its own setup is one people bypass.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import { asRecord, fillCommand, isCommandNotFound, readRepoConfig } from "../lib/command.mjs";

const MAX_BUFFER_BYTES = 64 * 1024 * 1024;

const DEFAULT_BRANCH_FALLBACK = "main";

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
		encoding: "utf8",
		maxBuffer: MAX_BUFFER_BYTES,
		windowsHide: true,
	});
}

/**
 * The commit a push of this ref should be diffed against: the remote's own
 * tip when this clone has it, otherwise the remote's default branch, or
 * `null` when neither resolves.
 *
 * @param {string} toplevel
 * @param {NodeJS.ProcessEnv} env
 * @param {string} remoteSha
 * @param {string} remoteDefaultBranch
 * @returns {string | null}
 */
function resolveBase(toplevel, env, remoteSha, remoteDefaultBranch) {
	const remoteIsKnown =
		!/^0+$/.test(remoteSha) &&
		runGit(toplevel, env, ["cat-file", "-e", `${remoteSha}^{commit}`]).status === 0;
	if (remoteIsKnown) {
		return remoteSha;
	}

	const fallback = runGit(toplevel, env, [
		"rev-parse",
		"-q",
		"--verify",
		`${remoteDefaultBranch}^{commit}`,
	]);

	return fallback.status === 0 ? remoteDefaultBranch : null;
}

/**
 * @param {{ toplevel: string, remote: string, stdinText: string, env?: NodeJS.ProcessEnv, platform?: NodeJS.Platform }} options
 * @returns {HookResult}
 */
export function runPrePush({
	toplevel,
	remote,
	stdinText,
	env = process.env,
	platform = process.platform,
}) {
	const config = readRepoConfig(toplevel);
	const prePush = asRecord(asRecord(config?.gitHooks).prePush);
	const command = prePush.command;
	const globs = prePush.globs;
	if (
		typeof command !== "string" ||
		command.trim().length === 0 ||
		!Array.isArray(globs) ||
		globs.length === 0
	) {
		return {
			exitCode: 0,
			stdout: "",
			stderr: "pre-push: skipped (no gitHooks.prePush in .ai-skills/config.json)\n",
		};
	}

	const defaultBranch =
		typeof config?.defaultBranch === "string" ? config.defaultBranch : DEFAULT_BRANCH_FALLBACK;
	const pathspecs = globs.map((glob) => `:(glob)${glob}`);
	const headSha = runGit(toplevel, env, ["rev-parse", "-q", "--verify", "HEAD"]).stdout.trim();

	let stderr = "";
	/** @type {Set<string>} */
	const files = new Set();
	for (const line of stdinText.split("\n")) {
		const [localRef, localSha, , remoteSha = ""] = line.trim().split(/\s+/);
		if (localSha === undefined || localSha === "" || /^0+$/.test(localSha)) {
			continue;
		}

		if (localSha !== headSha) {
			stderr += `pre-push: skipped ${localRef} (not the checked-out HEAD; the lint reads the working tree)\n`;
			continue;
		}

		const remoteDefaultBranch = `${remote}/${defaultBranch}`;
		const base = resolveBase(toplevel, env, remoteSha, remoteDefaultBranch);
		if (base === null) {
			stderr += `pre-push: skipped ${localRef} (no ${remoteDefaultBranch} to diff against)\n`;
			continue;
		}

		const diff = runGit(toplevel, env, [
			"diff",
			"--name-only",
			"-z",
			"--diff-filter=d",
			`${base}...${localSha}`,
			"--",
			...pathspecs,
		]);
		if (diff.status !== 0) {
			continue;
		}

		for (const filePath of diff.stdout.split("\0")) {
			if (filePath.length > 0 && existsSync(path.join(toplevel, filePath))) {
				files.add(filePath);
			}
		}
	}

	if (files.size === 0) {
		return { exitCode: 0, stdout: "", stderr };
	}

	// stderr is piped, not inherited: under cmd.exe a missing command only
	// announces itself in its stderr text, so `isCommandNotFound` needs to read it.
	const result = spawnSync(fillCommand(command, "{files}", [...files].sort(), platform), {
		shell: true,
		cwd: toplevel,
		env,
		stdio: ["inherit", "inherit", "pipe"],
		encoding: "utf8",
		maxBuffer: MAX_BUFFER_BYTES,
		windowsHide: true,
	});

	if (isCommandNotFound(result)) {
		return {
			exitCode: 0,
			stdout: "",
			stderr: `${stderr}pre-push: skipped (\`${command}\` not found)\n`,
		};
	}

	stderr += result.stderr ?? "";
	if (result.error !== undefined || result.status !== 0) {
		stderr += `pre-push: \`${command}\` failed; fix the lint errors, commit, and push again\n`;

		return { exitCode: 1, stdout: "", stderr };
	}

	return { exitCode: 0, stdout: "", stderr };
}

async function readStdinText() {
	let text = "";
	process.stdin.setEncoding("utf8");
	for await (const chunk of process.stdin) {
		text += chunk;
	}

	return text;
}

async function main() {
	const top = spawnSync("git", ["rev-parse", "--show-toplevel"], {
		encoding: "utf8",
		windowsHide: true,
	});
	if (top.status !== 0) {
		return;
	}

	const result = runPrePush({
		toplevel: top.stdout.trim(),
		remote: process.argv[2] ?? "origin",
		stdinText: await readStdinText(),
	});
	process.stdout.write(result.stdout);
	process.stderr.write(result.stderr);
	process.exitCode = result.exitCode;
}

/**
 * A crash in the hook itself must not block a push, so it is reported and skipped.
 *
 * @param {unknown} error
 */
function reportCrash(error) {
	process.stderr.write(
		`pre-push: skipped (internal error: ${error instanceof Error ? error.message : String(error)})\n`
	);
}

/**
 * Compared by basename rather than `import.meta.url` so an `esbuild` bundle,
 * which collapses every module's URL to the output file's, never treats this
 * module as the entry.
 */
if (path.basename(process.argv[1] ?? "") === "pre-push.mjs") {
	main().catch(reportCrash);
}
