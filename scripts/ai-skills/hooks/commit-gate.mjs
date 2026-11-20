#!/usr/bin/env node
// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
//
// The commit gate. An agent commit that sweeps a sibling's staged files, weakens
// a test, changes a stop path no task lists, or bypasses a hook costs a review
// round to find. The gate never judges a commit's subject: any message passes.
// This hook reads the first commit out of a shell command and runs three checks
// against the tree that commit would produce: config, weakened tests, and
// stops, in that order. A commit is a `git commit` or a
// `node <runtime>/plan/commit.mjs "<subject>" <paths>` call, which every
// folder-plan stage commits through. One script serves Claude Code and Codex,
// and each registration passes `--tool=<harness>`, which picks how
// `readShellCall` reads the payload. A host with no shell call to read, such as
// Cursor, passes.
//
// It judges, before any config read, a command that assigns or exports
// `PRISM_HOOK_DISABLE` or `PRISM_HOOK_DENY_DISABLE`, then a push or commit's
// flag denies, which hold on every branch, so no later failure can drop them.
// The kill-switch deny runs on every command, whatever repo it names. The
// hook itself exits at once when either switch is `1` in its own environment,
// before it reads stdin, as `hook.mjs` does. Before reading the command, the
// hook writes the toplevel of the session's directory in place of every
// `$(git rev-parse --show-toplevel)` anywhere in the command, with any
// spacing, its backtick form, and either one with `2>/dev/null`, so the walker
// reads a commit under it as a literal path and every check runs. A toplevel
// holding a quote, `$`, a backslash, or a shell operator stays a substitution.
// Two known misses: one inside single quotes is replaced too, though bash
// leaves it literal, and one after a `cd` into another repo gets the session's
// toplevel, where bash uses that repo's. Any other directory it can't resolve,
// such as `$S`, and a directory that resolves but doesn't exist, leave only the
// flag denies. It passes a command with no commit and a repo whose toplevel has
// no `.prism/architect/manifest.json`. While a merge, cherry-pick, or revert is
// in progress it runs only the flag denies, so the concluding commit may name
// no paths. Otherwise it denies a named path that takes the whole repo, such as
// `.` at the root or `'*'`, with the `-a` reason. A glob that matches
// everything another way, such as `?*`, is a known miss. It then builds the
// would-be index in a temp file, runs the three checks, and denies on the first
// failure. A `commit.mjs` call builds the index with `--literal-pathspecs`, as
// the script commits. It never stages anything in the shared index.
//
// It fails open on any error in the hook itself, because a gate that breaks a
// commit on its own bug blocks every agent, and each git call gives up after
// 5 s in `runGit` from `commit-gate/tree.mjs`. A config it can't read is not an
// error in the hook: the config check denies it. The command parser's known
// misses live in the header of `commit-gate/parse.mjs`, and each check's in its
// own module.
import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CONFIG_CHECK, loadContext, STOPS_CHECK } from "./commit-gate/checks.mjs";
import {
	readCommit,
	readKillSwitch,
	readPushes,
	repoRelativePaths,
} from "./commit-gate/parse.mjs";
import { TEST_GUARD_CHECK } from "./commit-gate/test-guard.mjs";
import { buildWouldBeIndex, runGit } from "./commit-gate/tree.mjs";
import { HARNESSES, readShellCall, writeStdout } from "./harnesses.mjs";

/**
 * @typedef {import("./harnesses.mjs").HookPayload} HookPayload
 * @typedef {import("./commit-gate/parse.mjs").Commit} Commit
 * @typedef {import("./commit-gate/parse.mjs").Deny} Deny
 * @typedef {{ decision: "pass" } | { decision: "deny", reason: string }} Decision
 */

const HOOK_NAME = "commit-gate";
const MANIFEST = ".prism/architect/manifest.json";
/** @type {Decision} */
const PASS = Object.freeze({ decision: "pass" });
const GATE_CHECKS = [CONFIG_CHECK, TEST_GUARD_CHECK, STOPS_CHECK];
const IN_PROGRESS_HEADS = ["MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD"];
// `$(git rev-parse --show-toplevel)` or its backtick form, with any spacing
// and an optional `2>/dev/null`.
const TOPLEVEL_SUBSTITUTION =
	/\$\(\s*git\s+rev-parse\s+--show-toplevel(?:\s+2>\s*\/dev\/null)?\s*\)|`\s*git\s+rev-parse\s+--show-toplevel(?:\s+2>\s*\/dev\/null)?\s*`/g;
// Characters the shell treats differently when written into a command than
// when a substitution expands to them. Whitespace and globs split and expand
// the same either way, so they stay.
const SHELL_SPECIAL = /["'\\$`;&|<>(){}#\n]/;
// A repo-relative pathspec that takes every change, the same sweep as `-a`:
// the root itself, or a glob made only of `*` and `/`.
const WHOLE_REPO = /^(\.|[*/]+)$/;
// Mid-merge git refuses a commit that names paths, so the usual remedy can't
// clear an `-a` deny there.
const CONCLUDING_ALL_REMEDY =
	"Stage the resolved files with git add <path>, then run git commit with no paths.";

/**
 * Decides one shell call and returns `{ decision: "pass" }` or `{ decision:
 * "deny", reason }`. The caller writes the deny envelope.
 *
 * The call is read with `readShellCall`. `cwd` stands in when the payload
 * carries no directory. Throws on a git failure, and the CLI turns that into a
 * pass.
 *
 * @param {HookPayload} payload
 * @param {{ tool: string, cwd?: string }} options
 * @returns {Decision}
 */
export function runGate(payload, { tool, cwd = process.cwd() }) {
	const call = readShellCall(tool, payload);
	if (!call) return PASS;

	const sessionCwd = call.cwd || cwd;
	const command = substituteToplevel(call.command, sessionCwd);
	const killSwitch = readKillSwitch(command, sessionCwd);
	if (killSwitch) return judgeFlags(flagsOnly([killSwitch], null), false);

	const push = readPushes(command, sessionCwd).find(
		(entry) => !outsidePrismRepo(entry.cwd)
	);
	if (push) return judge(STOPS_CHECK, STOPS_CHECK.run({ commit: flagsOnly(push.denies, push.cwd) }));

	const parsed = readCommit(command, sessionCwd);
	if (!parsed) return PASS;

	const dir = parsed.cwd;
	if (!dir || !existsSync(dir)) return judgeFlags(parsed, false);

	const repoRoot = findPrismRoot(dir);
	if (!repoRoot) return PASS;

	// git reports the toplevel with symlinks resolved, so the commit's own
	// directory is resolved too before paths are made relative to it.
	const commit = { ...parsed, cwd: realpathSync(dir) };
	const concluding = IN_PROGRESS_HEADS.some((head) =>
		runGit(repoRoot, ["rev-parse", "-q", "--verify", head], {
			fallback: null,
		})
	);
	const flags = judgeFlags(commit, concluding);
	if (flags.decision === "deny" || concluding) return flags;

	const paths = repoRelativePaths(commit, repoRoot);
	const sweep = paths.findIndex((p) => WHOLE_REPO.test(p));
	if (sweep !== -1) {
		return judgeFlags(
			flagsOnly([{ id: "all", flag: commit.paths[sweep] ?? "" }], commit.cwd),
			false
		);
	}

	const index = buildWouldBeIndex(repoRoot, paths, {
		literal: commit.form === "commit.mjs",
	});
	try {
		const ctx = loadContext({ repoRoot, commit, index });
		for (const check of GATE_CHECKS) {
			const result = check.run(ctx);
			if (result) return judge(check, result);
		}

		return PASS;
	} finally {
		index.cleanup();
	}
}

/**
 * `command` with every toplevel substitution replaced by the toplevel of the
 * session's directory, so the walker tracks every later `cd`, `pushd`, and
 * subshell from a literal path. The command is unchanged when it holds no
 * substitution, the session is outside a repo, or the toplevel holds a
 * character the shell would read differently written out.
 *
 * @param {string} command
 * @param {string} sessionCwd
 */
function substituteToplevel(command, sessionCwd) {
	if (command.search(TOPLEVEL_SUBSTITUTION) === -1) return command;
	if (!existsSync(sessionCwd)) return command;

	const toplevel = runGit(sessionCwd, ["rev-parse", "--show-toplevel"], {
		fallback: null,
	});
	if (typeof toplevel !== "string" || !toplevel || SHELL_SPECIAL.test(toplevel))
		return command;

	return command.replaceAll(TOPLEVEL_SUBSTITUTION, () => toplevel);
}

/**
 * True when `dir` resolves to a repo without the architect manifest, the same
 * case in which a commit passes. A directory that can't be resolved counts as
 * inside, so its bypass forms are still judged.
 *
 * @param {string | null} dir
 */
function outsidePrismRepo(dir) {
	if (!dir || !existsSync(dir)) return false;

	return findPrismRoot(dir) === null;
}

/**
 * The toplevel of `dir`'s repo when it holds the architect manifest, else null.
 *
 * @param {string} dir
 * @returns {string | null}
 */
function findPrismRoot(dir) {
	const repoRoot = runGit(dir, ["rev-parse", "--show-toplevel"], {
		fallback: null,
	});

	return typeof repoRoot === "string" &&
		repoRoot &&
		existsSync(path.join(repoRoot, MANIFEST))
		? repoRoot
		: null;
}

/**
 * A commit that carries only deny forms, which is all `STOPS_CHECK` reads from
 * a push, a kill switch, or a whole-repo sweep.
 *
 * @param {Deny[]} denies
 * @param {string | null} cwd
 * @returns {Commit}
 */
function flagsOnly(denies, cwd) {
	return { form: "git", subject: null, paths: [], cwd, denies };
}

/**
 * Judges the parser's denies other than a missing path list, which hold on
 * every branch. While a merge, cherry-pick, or revert concludes, an `-a` deny
 * names the remedy git accepts there.
 *
 * @param {Commit} commit
 * @param {boolean} concluding
 * @returns {Decision}
 */
function judgeFlags(commit, concluding) {
	const denies = commit.denies.filter((deny) => deny.id !== "no-paths");
	const result = STOPS_CHECK.run({ commit: { ...commit, denies } });
	if (result && concluding && denies[0]?.id === "all")
		return judge(STOPS_CHECK, { ...result, remedy: CONCLUDING_ALL_REMEDY });

	return judge(STOPS_CHECK, result);
}

/**
 * Turns a check's result into the gate's decision.
 *
 * @param {{ name: string }} check
 * @param {{ reason: string, remedy: string } | null} result
 * @returns {Decision}
 */
function judge(check, result) {
	if (!result) return PASS;

	return {
		decision: "deny",
		reason: `Commit gate (${check.name}): ${result.reason} ${result.remedy}`,
	};
}

// --- Entry ---

/**
 * @param {string[]} argv
 * @returns {Record<string, string>}
 */
function parseArgs(argv) {
	/** @type {Record<string, string>} */
	const args = {};
	for (const arg of argv) {
		const match = /^--([a-zA-Z]+)=(.*)$/.exec(arg);
		if (match) args[match[1] ?? ""] = match[2] ?? "";
	}

	return args;
}

/**
 * @param {string[]} argv
 * @param {() => string} readStdin
 */
function main(argv, readStdin) {
	if (
		process.env.PRISM_HOOK_DISABLE === "1" ||
		process.env.PRISM_HOOK_DENY_DISABLE === "1"
	)
		return;

	const { tool } = parseArgs(argv);
	if (!tool || !Object.hasOwn(HARNESSES, tool)) {
		process.stderr.write(
			`${HOOK_NAME}: unknown or missing --tool "${tool}", exiting fail-open\n`
		);
		return;
	}

	const result = runGate(JSON.parse(readStdin()), { tool });
	if (result.decision !== "deny") return;

	// A host with no observed deny envelope answers nothing.
	const reply = HARNESSES[tool]?.emitDeny(result.reason);
	if (reply !== null && reply !== undefined) writeStdout(reply);
}

// Runs only as the entry module. It compares real paths, because Node resolves
// symlinks for import.meta.url, and a hook path reached through a link would
// otherwise never run.
if (
	process.argv[1] &&
	realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	try {
		main(process.argv.slice(2), () => readFileSync(0, "utf8"));
	} catch (err) {
		try {
			process.stderr.write(
				`${HOOK_NAME}: ${err instanceof Error ? err.message : String(err)}\n`
			);
		} catch {
			// stderr itself failing leaves nothing more to do
		}
	}
}
