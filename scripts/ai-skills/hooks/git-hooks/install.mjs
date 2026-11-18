#!/usr/bin/env node
// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
/**
 * Points git at PRISM's `.githooks/` directory, and never at the cost of a
 * hooks setup PRISM does not recognize.
 *
 * One module serves every caller — `prism hooks install`, `prism update`, the
 * agent session-start hook, `prism doctor`, the push gate, and a consumer's
 * own setup script (`node .claude/hooks/git-hooks/install.mjs`) — so "is this
 * hooks path ours?" has exactly one definition.
 *
 * Git reads one hooks directory. A `core.hooksPath` at any scope that is not
 * PRISM's own (husky's `.husky`, another repo's `.githooks`) means PRISM's
 * hooks cannot also be active, so the installer reports it and changes
 * nothing. The value it writes is the relative `.githooks`: local config is
 * shared by every worktree of a clone, and git resolves a relative hooks path
 * per worktree, so each branch runs its own hooks. An absolute path into one
 * checkout would make every worktree run that checkout's hooks.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";

const HOOK_RUNTIME_MARKER = "@prism-hook-runtime";

const OUR_HOOKS_DIR = ".githooks";

/**
 * Most specific first, so a report names the scope git would read first.
 *
 * @type {Array<"worktree" | "local" | "global" | "system">}
 */
const SCOPES_BY_SPECIFICITY = ["worktree", "local", "global", "system"];

/**
 * @typedef {"set" | "already" | "left-alone" | "no-shims"} InstallAction
 *
 * @typedef {Object} InstallResult
 * @property {InstallAction} action
 * @property {string} message
 *
 * @typedef {Object} GitHooksState
 * @property {{ system: string | null, global: string | null, local: string | null, worktree: string | null }} scopes
 * @property {string | null} effective
 * @property {boolean} installed
 */

/**
 * @param {string[]} args
 * @param {string} cwd
 * @returns {string | null} trimmed stdout, or `null` when git failed
 */
function git(args, cwd) {
	const result = spawnSync("git", args, { cwd, encoding: "utf8", windowsHide: true });

	return result.status === 0 ? result.stdout.trim() : null;
}

/**
 * @param {string} dir
 * @returns {string | null}
 */
function resolveCommonDir(dir) {
	const commonDir = git(["-C", dir, "rev-parse", "--path-format=absolute", "--git-common-dir"], dir);
	if (commonDir === null) {
		return null;
	}

	try {
		return realpathSync(commonDir);
	} catch {
		return null;
	}
}

/**
 * Whether a `core.hooksPath` value is unset, PRISM's own `.githooks`, or
 * something else.
 *
 * An absolute path to a `.githooks` directory is ours only when it belongs to
 * this repository, which is what lets a stale absolute value from any
 * worktree of the same clone be recognized and replaced, while a `.githooks`
 * in some other repository is left alone.
 *
 * @param {string | null | undefined} value
 * @param {string} repoRoot
 * @returns {"unset" | "ours" | "foreign"}
 */
export function classifyHooksPath(value, repoRoot) {
	const normalized = (value ?? "").replaceAll("\\", "/").replace(/\/$/, "");
	if (normalized === "") {
		return "unset";
	}

	if (normalized === OUR_HOOKS_DIR) {
		return "ours";
	}

	if (!/^([A-Za-z]:)?\//.test(normalized) || path.posix.basename(normalized) !== OUR_HOOKS_DIR) {
		return "foreign";
	}

	const theirs = resolveCommonDir(path.posix.dirname(normalized));
	const mine = resolveCommonDir(repoRoot);

	return theirs !== null && theirs === mine ? "ours" : "foreign";
}

/**
 * @param {string} repoRoot
 * @param {string} scope
 * @returns {string | null}
 */
function readScope(repoRoot, scope) {
	return git(["config", `--${scope}`, "--get", "core.hooksPath"], repoRoot);
}

/**
 * Whether a file exists and carries PRISM's marker, i.e. is PRISM's own shim.
 *
 * @param {string} filePath
 * @returns {boolean}
 */
function isPrismShim(filePath) {
	try {
		return existsSync(filePath) && readFileSync(filePath, "utf8").includes(HOOK_RUNTIME_MARKER);
	} catch {
		return false;
	}
}

/**
 * What git is configured to do about hooks in this repo, scope by scope, and
 * whether PRISM's own hooks are the ones that will run.
 *
 * `worktree` is read only when `extensions.worktreeConfig` is on, because
 * without it git has no worktree scope and the read would fail. Every read
 * tolerates failure: an unreadable scope is an unset one.
 *
 * @param {string} repoRoot
 * @returns {GitHooksState}
 */
export function readGitHooksState(repoRoot) {
	const worktreeConfigOn =
		git(["config", "--type=bool", "--get", "extensions.worktreeConfig"], repoRoot) === "true";
	const scopes = {
		system: readScope(repoRoot, "system"),
		global: readScope(repoRoot, "global"),
		local: readScope(repoRoot, "local"),
		worktree: worktreeConfigOn ? readScope(repoRoot, "worktree") : null,
	};
	const effective = git(["config", "--get", "core.hooksPath"], repoRoot);
	const installed =
		effective !== null &&
		classifyHooksPath(effective, repoRoot) === "ours" &&
		isPrismShim(path.join(path.resolve(repoRoot, effective), "pre-commit"));

	return { scopes, effective, installed };
}

/**
 * Sets `core.hooksPath` to `.githooks` when that cannot displace a hooks
 * setup PRISM does not recognize.
 *
 * Nothing is written when there are no PRISM shims to point at, or when any
 * scope holds a foreign value. A system or global value that is ours is left
 * where it is; only the local value is written, and a worktree-scope value is
 * unset because it would shadow the local one.
 *
 * @param {string} repoRoot
 * @param {{ dryRun?: boolean }} [options]
 * @returns {InstallResult}
 */
export function installGitHooks(repoRoot, { dryRun = false } = {}) {
	if (!isPrismShim(path.join(repoRoot, OUR_HOOKS_DIR, "pre-commit"))) {
		return {
			action: "no-shims",
			message: `prism hooks: no PRISM shims in ${OUR_HOOKS_DIR}/, so there is nothing to point git at`,
		};
	}

	const { scopes } = readGitHooksState(repoRoot);
	const foreignScope = SCOPES_BY_SPECIFICITY.find(
		(scope) => classifyHooksPath(scopes[scope], repoRoot) === "foreign"
	);
	if (foreignScope !== undefined) {
		return {
			action: "left-alone",
			message: `prism hooks: the ${foreignScope} core.hooksPath is '${scopes[foreignScope]}'. Git reads one hooks directory, so PRISM's hooks are not active. Compose them with yours by hand. Nothing was changed.`,
		};
	}

	const staleWorktreeValue = scopes.worktree;
	const localIsCurrent = scopes.local === OUR_HOOKS_DIR;
	if (localIsCurrent && staleWorktreeValue === null) {
		return { action: "already", message: "prism hooks: already installed" };
	}

	if (!dryRun) {
		if (!localIsCurrent) {
			git(["config", "--local", "core.hooksPath", OUR_HOOKS_DIR], repoRoot);
		}

		if (staleWorktreeValue !== null) {
			git(["config", "--worktree", "--unset", "core.hooksPath"], repoRoot);
		}
	}

	const removedNote =
		staleWorktreeValue === null ? "" : `, and removed this worktree's '${staleWorktreeValue}'`;
	const message = `prism hooks: set core.hooksPath to ${OUR_HOOKS_DIR}${removedNote}`;

	return { action: "set", message: dryRun ? `would ${message}` : message };
}

/**
 * The agent `SessionStart` arm: installs the hooks at the start of a fresh or
 * resumed session in a clone where nothing has configured a hooks path yet.
 *
 * It acts only on `startup` and `resume`, and only when every scope is unset,
 * so a foreign setup is never reported here, since a message at every session
 * start is noise, and `prism doctor` carries that report instead. Every other
 * path returns `null`, a thrown error included: a session must never fail to
 * start because of the install.
 *
 * @param {string} rawStdin
 * @returns {string | null} the install message when it set the value
 */
export function runSessionStartInstall(rawStdin) {
	try {
		const payload = JSON.parse(rawStdin);
		if (payload.source !== "startup" && payload.source !== "resume") {
			return null;
		}

		const toplevel = git(["rev-parse", "--show-toplevel"], payload.cwd ?? process.cwd());
		if (toplevel === null) {
			return null;
		}

		const { scopes } = readGitHooksState(toplevel);
		if (SCOPES_BY_SPECIFICITY.some((scope) => classifyHooksPath(scopes[scope], toplevel) !== "unset")) {
			return null;
		}

		const result = installGitHooks(toplevel);

		return result.action === "set" ? result.message : null;
	} catch {
		return null;
	}
}

/**
 * The line a consumer puts in its own setup script. Exits 0 on every action,
 * `left-alone` included: that is a report, and a non-zero exit would break a
 * `prepare` script in a repo that is set up correctly in its own way.
 */
function main() {
	const toplevel = git(["rev-parse", "--show-toplevel"], process.cwd());
	if (toplevel === null) {
		return;
	}

	const { action, message } = installGitHooks(toplevel);
	(action === "left-alone" ? process.stderr : process.stdout).write(`${message}\n`);
}

/**
 * Compared by basename rather than `import.meta.url` so the `esbuild` bundle
 * of `prism`, which folds this module in and collapses every module's URL to
 * `dist/cli.js`, never treats it as the entry.
 */
if (path.basename(process.argv[1] ?? "") === "install.mjs") {
	main();
}
