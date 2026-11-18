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
 * own setup script (the guarded `runInstallCli` import) — so "is this hooks
 * path ours?" has exactly one definition.
 *
 * Git reads one hooks directory. A `core.hooksPath` at any scope that is not
 * PRISM's own (husky's `.husky`, another repo's `.githooks`), or hooks already
 * in `.git/hooks` (`describeForeignHooks`), mean PRISM's hooks cannot also be
 * active, so the installer reports it and changes nothing. The value it
 * writes is the relative `.githooks`: local config is shared by every worktree
 * of a clone, and git resolves a relative hooks path per worktree, so each
 * branch runs its own hooks. An absolute path into one checkout would make
 * every worktree run that checkout's hooks.
 */
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import path from "node:path";

const HOOK_RUNTIME_MARKER = "@prism-hook-runtime";

const OUR_HOOKS_DIR = ".githooks";

/** The hook files PRISM ships shims for, named relative to `.githooks/`. */
const SHIM_NAMES = ["pre-commit", "pre-push"];

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
 * @property {{ "pre-commit": boolean, "pre-push": boolean }} active whether git runs PRISM's own shim for each hook
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
 * Reads one scope's `core.hooksPath`, following `include.path` and
 * `includeIf`. A scoped read leaves includes off unless asked, so without
 * `--includes` a hooks path that a global config pulls in from a team file
 * would read as unset here while `effective` still sees it.
 *
 * @param {string} repoRoot
 * @param {string} scope
 * @returns {string | null}
 */
function readScope(repoRoot, scope) {
	return git(["config", `--${scope}`, "--includes", "--get", "core.hooksPath"], repoRoot);
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
 * Whether git will run this file as PRISM's hook: it carries the marker and,
 * off Windows, the executable bit.
 *
 * Git skips a hook without the executable bit and prints only an
 * `advice.ignoredHook` hint, so a marked shim that lost its mode (a path
 * added fresh from a `core.fileMode=false` clone, or a tool that drops modes)
 * runs no checks at all. Windows has no executable bit, and Git for Windows runs the
 * shim regardless.
 *
 * @param {string} filePath
 * @param {NodeJS.Platform} [platform]
 * @returns {boolean}
 */
export function isRunnableShim(filePath, platform = process.platform) {
	if (!isPrismShim(filePath)) {
		return false;
	}

	try {
		return platform === "win32" || (statSync(filePath).mode & 0o111) !== 0;
	} catch {
		return false;
	}
}

/**
 * PRISM's own shims in this checkout's `.githooks/` that git would skip for
 * lack of the executable bit. Always empty on Windows, where the bit does not
 * exist.
 *
 * @param {string} repoRoot
 * @returns {string[]} absolute shim paths
 */
function findNonExecutableShims(repoRoot) {
	return SHIM_NAMES.map((name) => path.join(repoRoot, OUR_HOOKS_DIR, name)).filter(
		(shimPath) => isPrismShim(shimPath) && !isRunnableShim(shimPath)
	);
}

/**
 * @param {string} shimPath
 * @returns {boolean} whether the shim now has the executable bit
 */
function makeExecutable(shimPath) {
	try {
		chmodSync(shimPath, 0o755);
	} catch {
		return false;
	}

	return isRunnableShim(shimPath);
}

/**
 * @param {string[]} shimPaths
 * @returns {string} the shim file names, such as `pre-commit and pre-push`
 */
function joinShimNames(shimPaths) {
	return shimPaths.map((shim) => path.basename(shim)).join(" and ");
}

/**
 * What git is configured to do about hooks in this repo, scope by scope, and
 * whether PRISM's own hooks are the ones that will run.
 *
 * `worktree` is read only when `extensions.worktreeConfig` is on, because
 * without it git has no worktree scope and the read would fail. Every read
 * tolerates failure: an unreadable scope is an unset one.
 *
 * `active` is judged per hook, so a consumer's own unmarked `pre-push` beside
 * PRISM's `pre-commit` does not count as PRISM's lint running.
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
	const hooksDir =
		effective !== null && classifyHooksPath(effective, repoRoot) === "ours"
			? path.resolve(repoRoot, effective)
			: null;
	const isActive = (/** @type {string} */ name) =>
		hooksDir !== null && isRunnableShim(path.join(hooksDir, name));

	return {
		scopes,
		effective,
		active: { "pre-commit": isActive("pre-commit"), "pre-push": isActive("pre-push") },
	};
}

/**
 * Names the hooks setup that setting `core.hooksPath` would displace, or
 * returns `null` when there is none.
 *
 * Two setups count. A foreign value at any scope is one, named by the most
 * specific scope that holds it. The other is hooks in the default hooks
 * directory (`.git/hooks`, or the common dir's for a linked worktree) while
 * every scope is unset: git reads that directory only until `core.hooksPath`
 * is set, so writing the value would silently stop those hooks. Any file
 * there that is not a `.sample` counts, because a hook manager that installs
 * into `.git/hooks` writes plain files under the hook names. Once any scope
 * holds a value of ours, git already skips the default directory and setting
 * the local value changes nothing about it.
 *
 * @param {string} repoRoot
 * @param {GitHooksState["scopes"]} scopes
 * @returns {string | null} a clause such as `the local core.hooksPath is '.husky'`
 */
export function describeForeignHooks(repoRoot, scopes) {
	const foreignScope = SCOPES_BY_SPECIFICITY.find(
		(scope) => classifyHooksPath(scopes[scope], repoRoot) === "foreign"
	);
	if (foreignScope !== undefined) {
		return `the ${foreignScope} core.hooksPath is '${scopes[foreignScope]}'`;
	}

	if (
		SCOPES_BY_SPECIFICITY.some((scope) => classifyHooksPath(scopes[scope], repoRoot) !== "unset")
	) {
		return null;
	}

	const defaultHooksDir = git(["rev-parse", "--git-path", "hooks"], repoRoot);
	if (defaultHooksDir === null) {
		return null;
	}

	let hookNames;
	try {
		hookNames = readdirSync(path.resolve(repoRoot, defaultHooksDir), { withFileTypes: true })
			.filter((entry) => !entry.isDirectory() && !entry.name.endsWith(".sample"))
			.map((entry) => entry.name)
			.sort();
	} catch {
		return null;
	}

	return hookNames.length === 0
		? null
		: `${defaultHooksDir} holds ${hookNames.join(", ")}, which git stops running once core.hooksPath is set`;
}

/**
 * Sets `core.hooksPath` to `.githooks` when that cannot displace a hooks
 * setup PRISM does not recognize.
 *
 * Nothing is written when there are no PRISM shims to point at, or when it
 * would displace another hooks setup (`describeForeignHooks`). A system or
 * global value that is ours is left where it is; only the local value is
 * written, and a worktree-scope value is unset because it would shadow the
 * local one.
 *
 * Git skips a hook without the executable bit, so a marked shim that lacks it
 * is chmodded first, off Windows. When the bit cannot be set, no config value
 * is written and the result is `left-alone`, because `set` and `already` both
 * tell the caller that PRISM's hooks will run.
 *
 * `shimsDelivered` lets `prism update --dry-run` preview the install on a
 * consumer whose shims the same dry run would have written but did not.
 *
 * @param {string} repoRoot
 * @param {{ dryRun?: boolean, shimsDelivered?: boolean }} [options]
 * @returns {InstallResult}
 */
export function installGitHooks(repoRoot, { dryRun = false, shimsDelivered = false } = {}) {
	if (!shimsDelivered && !isPrismShim(path.join(repoRoot, OUR_HOOKS_DIR, "pre-commit"))) {
		return {
			action: "no-shims",
			message: `prism hooks: no PRISM shims in ${OUR_HOOKS_DIR}/, so there is nothing to point git at`,
		};
	}

	const { scopes } = readGitHooksState(repoRoot);
	const foreignHooks = describeForeignHooks(repoRoot, scopes);
	if (foreignHooks !== null) {
		return {
			action: "left-alone",
			message: `prism hooks: ${foreignHooks}. Git reads one hooks directory, so PRISM's hooks are not active. Compose them with yours by hand. Nothing was changed.`,
		};
	}

	const nonExecutableShims = findNonExecutableShims(repoRoot);
	const unfixableShims = dryRun ? [] : nonExecutableShims.filter((shim) => !makeExecutable(shim));
	if (unfixableShims.length > 0) {
		const fixedShims = nonExecutableShims.filter((shim) => !unfixableShims.includes(shim));
		const verb = unfixableShims.length === 1 ? "is" : "are";
		const outcome =
			fixedShims.length === 0
				? "Nothing was changed."
				: `Made ${joinShimNames(fixedShims)} executable, but core.hooksPath was not changed.`;

		return {
			action: "left-alone",
			message: `prism hooks: ${OUR_HOOKS_DIR}/${joinShimNames(unfixableShims)} ${verb} not executable and could not be made so, and git skips a hook without the executable bit. ${outcome}`,
		};
	}

	const executableNote =
		nonExecutableShims.length === 0
			? ""
			: `${dryRun ? "make" : "made"} ${joinShimNames(nonExecutableShims)} executable`;
	const staleWorktreeValue = scopes.worktree;
	const localIsCurrent = scopes.local === OUR_HOOKS_DIR;
	if (localIsCurrent && staleWorktreeValue === null) {
		if (executableNote === "") {
			return { action: "already", message: "prism hooks: already installed" };
		}

		const repairMessage = `prism hooks: ${executableNote}`;

		return { action: "set", message: dryRun ? `would ${repairMessage}` : repairMessage };
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
	const repairedNote = executableNote === "" ? "" : `; ${executableNote}`;
	const message = `prism hooks: set core.hooksPath to ${OUR_HOOKS_DIR}${removedNote}${repairedNote}`;

	return { action: "set", message: dryRun ? `would ${message}` : message };
}

/**
 * Whether a worktree of this clone other than the one `repoRoot` is in has a
 * PRISM shim in its own `.githooks/`.
 *
 * Both sides of the comparison come from git, `--show-toplevel` for this
 * worktree and `worktree list` for the rest, and both go through the same
 * `realpathSync`. Node's own spelling of `repoRoot` is left out because
 * Windows spells one directory differently in Node and in git, so the current
 * worktree would read as a sibling.
 *
 * @param {string} repoRoot
 * @returns {boolean}
 */
function otherWorktreeHasShim(repoRoot) {
	const porcelain = git(["worktree", "list", "--porcelain"], repoRoot);
	if (porcelain === null) {
		return false;
	}

	const resolve = (/** @type {string} */ dir) => {
		try {
			return realpathSync(dir);
		} catch {
			return path.resolve(dir);
		}
	};
	const self = resolve(git(["rev-parse", "--show-toplevel"], repoRoot) ?? repoRoot);

	return porcelain
		.split("\n")
		.filter((line) => line.startsWith("worktree "))
		.map((line) => resolve(line.slice("worktree ".length)))
		.some(
			(dir) =>
				dir !== self &&
				SHIM_NAMES.some((name) => isPrismShim(path.join(dir, OUR_HOOKS_DIR, name)))
		);
}

/**
 * Unsets the local `core.hooksPath` when it is exactly `.githooks`, for a
 * consumer with neither `claude` nor `codex` as a host and no `.githooks/` in
 * this checkout, whether this pass removed the shims or a pulled commit
 * already had. Left set, it points git at a missing directory, so git runs no
 * hooks and still skips `.git/hooks`.
 *
 * The local value is shared by every worktree of the clone, so it stays set
 * while any other worktree still has a PRISM shim in its `.githooks/`.
 * Unsetting it would stop that worktree's hooks until its next session start
 * set the value again.
 *
 * @param {string} repoRoot
 * @param {{ dryRun?: boolean }} [options]
 * @returns {string | null} the message when it unset (or would unset) the value
 */
export function removeGitHooksPath(repoRoot, { dryRun = false } = {}) {
	if (
		git(["config", "--local", "--get", "core.hooksPath"], repoRoot) !== OUR_HOOKS_DIR ||
		otherWorktreeHasShim(repoRoot)
	) {
		return null;
	}

	if (!dryRun) {
		git(["config", "--local", "--unset", "core.hooksPath"], repoRoot);
	}

	const message = `prism hooks: unset core.hooksPath, since ${OUR_HOOKS_DIR}/ was removed`;

	return dryRun ? `would ${message}` : message;
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
 *
 * Exported so the guarded setup-script form can import this module and call
 * it, which also exits 0 when the file is absent (a clone that never ran an
 * update).
 */
export function runInstallCli() {
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
	runInstallCli();
}
