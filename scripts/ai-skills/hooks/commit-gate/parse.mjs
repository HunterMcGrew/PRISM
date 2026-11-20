// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
//
// Reads the commit and the push out of an agent's shell command for the
// commit gate: a `git commit` segment or a `node <runtime>/plan/commit.mjs
// "<subject>" <paths…>` call, and a `git push` segment. For a commit it
// reports the subject, the named paths, the directory the commit runs in, and
// the forms the gate denies outright. For a push it reports only the forms
// that skip the pre-push hook. `readKillSwitch` reads, on any command, an
// assignment (`NAME=` or `NAME+=`), export, `printf -v`, or `read` of
// `PRISM_HOOK_DISABLE` or `PRISM_HOOK_DENY_DISABLE`. It never runs anything.
//
// It walks the command with `walkSegments` from `lib/segments.mjs`, so shell
// grammar, wrappers (`env`, `command`, `nice`, `nohup`, `timeout`), nested
// `-c` strings and heredoc-fed shells, `eval`, and command substitutions reach
// the same reading, and a `cd` stays inside the subshell or nested shell that
// ran it. Each `git -C` folds on top of the segment's directory the way git
// folds repeated `-C`, and a `-C` or `cd` path built from a command
// substitution reads as unresolved. The hook writes the toplevel in place of
// every `$(git rev-parse --show-toplevel)` before calling here, so each one
// reaches the walk as a literal path. A `-C` or `cd` path an agent writes in Git
// Bash form (`/d/...`) maps to `D:/...` on win32 before any git call reads it.
//
// A `commit.mjs` call is a `node` segment whose first operand, past node's own
// options, resolves from the segment's directory to this runtime's
// `plan/commit.mjs` by native realpath, so a copy elsewhere reads as no commit
// and so does a script path that doesn't resolve. The runtime is the directory
// above this file's, `.claude/hooks` in a consumer. Its next operand is the
// subject and the rest are paths. `commit.mjs` passes `--literal-pathspecs`, so
// a `:` path there is a file name and gets no magic-pathspec deny.
//
// The denies are `-a`, `-i`, a commit naming no paths, `--no-verify` or `-n`,
// `-c core.hooksPath=…`, a named path the shell would expand (for `commit.mjs`,
// also one holding `*` or `?`, which the script would read literally), a
// `git commit` pathspec with `:` magic, and more than one commit in the command. On a push
// the denies are `--no-verify` and `-c core.hooksPath=…` only. Push's `-n` is
// `--dry-run`, so it passes.
//
// Known misses:
// - every shape `lib/segments.mjs` lists as its own miss, such as `xargs`,
//   `find -exec`, `sudo`, and git aliases
// - `git revert`, `git cherry-pick`, `git merge`, `git am`, `git rebase -x`,
//   and `git commit-tree`, which create commits without a `git commit`
//   segment
// - a commit inside a `docker exec` command, whose paths are container paths
// - a `$VAR` in a `cd` or `-C` path, which leaves `cwd` null, and a
//   `commit.mjs` path written relative to such a directory, which can't
//   resolve and reads as no commit
// - a toplevel substitution after a `cd` into another repo, which the hook
//   resolves to the session's toplevel where bash uses that repo's
// - git config reaching core.hooksPath through `GIT_CONFIG_*` variables or an
//   earlier `git config` segment
// - `--pathspec-from-file`, whose paths the gate can't see, reads as no paths
// - a `git commit` glob path is read the way git reads a pathspec, not the way
//   the shell expands it
// - a quoted path holding a literal `$` is denied as one the shell expands
// - a path starting with `:` under git's `--literal-pathspecs` is denied as
//   magic, though git would read it literally
// - a `commit.mjs` run behind a node option this parser doesn't know takes a
//   value, since the option's value reads as the script
import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	containsSubstitution,
	readFedStdin,
	resolveDir,
	toHostPath,
	walkSegments,
} from "../lib/segments.mjs";

/**
 * @typedef {import("../lib/segments.mjs").Segment} Segment
 * @typedef {{ id: string, flag: string }} Deny
 * @typedef {{ form: "git" | "commit.mjs", subject: string | null, subjectFile?: string | null, paths: string[], cwd: string | null, flags: string[], denies: Deny[] }} Commit
 * @typedef {{ cPaths: string[], configs: string[], sub: string | null, args: string[] }} GitSegment
 * @typedef {{ paths: string[], flags: string[], messages: string[], messageFile: string | null, all: string | null, include: string | null, noVerify: string | null }} CommitArgs
 */

const RUNTIME_DIR = path.dirname(
	path.dirname(fileURLToPath(import.meta.url))
);
const COMMIT_SCRIPT = realPath(path.join(RUNTIME_DIR, "plan", "commit.mjs"));
const KILL_SWITCHES = ["PRISM_HOOK_DISABLE", "PRISM_HOOK_DENY_DISABLE"];
const EXPORT_COMMANDS = new Set(["export", "declare", "typeset", "readonly"]);
// Node options that take the next word as their value, and the ones after
// which node runs no script file.
const NODE_OPTS_WITH_ARG = new Set([
	"-r",
	"--require",
	"--import",
	"--loader",
	"--experimental-loader",
	"--env-file",
	"-C",
	"--conditions",
	"--input-type",
]);
const NODE_NO_SCRIPT = new Set([
	"-e",
	"--eval",
	"-p",
	"--print",
	"-c",
	"--check",
	"-i",
	"--interactive",
]);
const NODE_COMMANDS = new Set(["node", "node.exe"]);
const MESSAGE_FEEDERS = new Set(["echo", "printf"]);
const GLOBAL_OPTS_WITH_ARG = new Set([
	"-C",
	"-c",
	"--git-dir",
	"--work-tree",
	"--namespace",
	"--exec-path",
	"--super-prefix",
	"--config-env",
]);
const COMMIT_LONG_WITH_ARG = new Set([
	"--message",
	"--file",
	"--reuse-message",
	"--reedit-message",
	"--fixup",
	"--squash",
	"--author",
	"--date",
	"--template",
	"--cleanup",
	"--trailer",
	"--pathspec-from-file",
]);
const COMMIT_SHORT_WITH_ARG = new Set(["m", "F", "C", "c", "t"]);
// These take a value only when it's glued on (`-uno`), so the rest of the
// cluster is that value and the next word is not.
const COMMIT_SHORT_GLUED_ARG = new Set(["u", "S"]);
// git takes any unambiguous prefix of a long option, and these are the
// shortest prefixes that still name only the denied option.
const ABBREVIATED = [
	{ option: "--no-verify", shortest: "--no-veri" },
	{ option: "--include", shortest: "--inc" },
];
// A word the shell rewrites before git sees it: a parameter expansion, a
// leading `~`, or a `{a,b}` or `{1..3}` brace expansion.
const SHELL_EXPANDS = /\$|^~|\{[^{}]*(,|\.\.)[^{}]*\}/;
// The characters a `commit.mjs` path may not hold, since the script reads each
// path literally and the shell would have expanded a glob first.
const SCRIPT_GLOB = /[*?]/;
// A leading `NAME+=value` word, which the segmenter leaves in argv.
const APPEND_ASSIGNMENT = /^([A-Za-z_][A-Za-z0-9_]*)\+=/;

/**
 * Returns the first commit in `command`, or null when it holds none or the
 * tokenizer can't read it.
 *
 * `paths` are as written, relative to `cwd`, which is null when a `cd` or
 * `-C` path can't be resolved statically. `subject` is the message's first
 * line, or null when no `-m` or readable `-F` gives one. `denies` lists
 * `{ id, flag }` for each form the gate denies, where `id` is `all`,
 * `include`, `no-paths`, `no-verify`, `hooks-path`, `expanded-paths`,
 * `magic-pathspec`, or `multiple-commits`.
 *
 * @param {string} command
 * @param {string} sessionCwd
 * @returns {Commit | null}
 */
export function readCommit(command, sessionCwd) {
	const { segments } = walkSegments(command, { cwd: toHostPath(sessionCwd) });
	/** @type {Commit[]} */
	const commits = [];
	for (const segment of segments) {
		if (segment.container) continue;

		const commit = readSegmentCommit(segment);
		if (commit) commits.push(commit);
	}
	if (commits.length === 0) return null;

	const [commit] = commits;
	if (commit.paths.length === 0)
		commit.denies.push({ id: "no-paths", flag: "" });
	if (commits.length > 1)
		commit.denies.push({ id: "multiple-commits", flag: "" });

	return commit;
}

/**
 * Returns every `git push` in `command` that skips the pre-push hook, as
 * `{ cwd, denies }` in command order, so the caller can judge each one's
 * repo. `denies` holds `no-verify` or `hooks-path`, the same ids a commit
 * uses, and `cwd` is null when a `cd` or `-C` path can't be resolved
 * statically.
 *
 * @param {string} command
 * @param {string} sessionCwd
 */
export function readPushes(command, sessionCwd) {
	const { segments } = walkSegments(command, { cwd: toHostPath(sessionCwd) });
	/** @type {{ cwd: string | null, denies: Deny[] }[]} */
	const pushes = [];
	for (const segment of segments) {
		if (segment.container) continue;

		const git = parseGitSegment(segment.argv);
		if (git?.sub !== "push") continue;

		/** @type {Deny[]} */
		const denies = [];
		const noVerify = readPushNoVerify(git.args);
		if (noVerify) denies.push({ id: "no-verify", flag: noVerify });
		if (git.configs.some((entry) => /^core\.hookspath=/i.test(entry)))
			denies.push({ id: "hooks-path", flag: "-c core.hooksPath=" });
		if (denies.length > 0)
			pushes.push({ cwd: resolveGitDir(git, segment), denies });
	}

	return pushes;
}

/**
 * Returns `{ id: "kill-switch", flag }` when any segment of `command` assigns
 * or exports `PRISM_HOOK_DISABLE` or `PRISM_HOOK_DENY_DISABLE`, with `flag`
 * the variable's name, and null otherwise. A command the tokenizer can't read
 * counts when the unread text names either variable, since the gate can't see
 * what it does.
 *
 * @param {string} command
 * @param {string} sessionCwd
 * @returns {{ id: "kill-switch", flag: string } | null}
 */
export function readKillSwitch(command, sessionCwd) {
	const { segments, unreadable } = walkSegments(command, {
		cwd: toHostPath(sessionCwd),
	});
	for (const segment of segments) {
		const flag = killSwitchIn(segment);
		if (flag) return { id: "kill-switch", flag };
	}
	for (const text of unreadable) {
		const flag = KILL_SWITCHES.find((name) => text.includes(name));
		if (flag) return { id: "kill-switch", flag };
	}

	return null;
}

/**
 * Maps a commit's named paths to repo-relative paths with forward slashes,
 * resolved against its effective cwd, or against `repoRoot` when that is null.
 *
 * @param {Pick<Commit, "cwd" | "paths">} commit
 * @param {string} repoRoot
 */
export function repoRelativePaths(commit, repoRoot) {
	const base = commit.cwd ?? repoRoot;

	return commit.paths.map(
		(p) =>
			path
				.relative(repoRoot, path.resolve(base, toHostPath(p)))
				.split(path.sep)
				.join("/") || "."
	);
}

// --- Segments ---

/**
 * The kill-switch variable one segment assigns or exports, or null.
 *
 * @param {Segment} segment
 */
function killSwitchIn(segment) {
	const { argv } = segment;
	for (const assignment of segment.assignments) {
		const name = KILL_SWITCHES.find((n) => assignment.startsWith(`${n}=`));
		if (name) return name;
	}
	for (const word of argv) {
		const appended = APPEND_ASSIGNMENT.exec(word)?.[1];
		if (appended === undefined) break;
		if (KILL_SWITCHES.includes(appended)) return appended;
	}

	const command = path.basename(argv[0] ?? "");
	if (command === "printf") return printfTarget(argv);
	if (command === "read") {
		return KILL_SWITCHES.find((n) => argv.slice(1).includes(n)) ?? null;
	}
	if (!EXPORT_COMMANDS.has(command)) return null;

	for (const operand of argv.slice(1)) {
		const name = KILL_SWITCHES.find(
			(n) =>
				operand === n ||
				operand.startsWith(`${n}=`) ||
				operand.startsWith(`${n}+=`)
		);
		if (name) return name;
	}

	return null;
}

/**
 * The kill-switch variable `printf -v <name>` assigns, in `-v NAME` or
 * `-vNAME` form, or null.
 *
 * @param {string[]} argv
 */
function printfTarget(argv) {
	for (let i = 1; i < argv.length; i += 1) {
		const word = argv[i];
		if (word === "-v") return KILL_SWITCHES.find((n) => n === argv[i + 1]) ?? null;
		if (word.startsWith("-v"))
			return KILL_SWITCHES.find((n) => n === word.slice(2)) ?? null;
		if (!word.startsWith("-")) break;
	}

	return null;
}

/**
 * The commit one segment runs, or null when it runs none.
 *
 * @param {Segment} segment
 * @returns {Commit | null}
 */
function readSegmentCommit(segment) {
	const { argv, cwd } = segment;
	if (argv.length === 0) return null;

	if (NODE_COMMANDS.has(path.basename(argv[0]))) {
		const script = findNodeScript(argv);
		if (script !== -1 && isCommitScript(argv[script], cwd))
			return readScriptCommit(argv.slice(script), segment);
	}

	const git = parseGitSegment(argv);
	if (git?.sub !== "commit") return null;

	return readGitCommit(git, resolveGitDir(git, segment), segment);
}

/**
 * The directory a git segment runs in once its `-C` paths fold on top of the
 * segment's own, or null when one is built from a substitution.
 *
 * @param {GitSegment} git
 * @param {Segment} segment
 * @returns {string | null}
 */
function resolveGitDir(git, segment) {
	let dir = segment.cwd;
	for (const p of git.cPaths) {
		dir = containsSubstitution(p, segment.substitutions)
			? null
			: resolveDir(p, dir);
	}

	return dir;
}

/**
 * The index of the script file `node` runs, past its options, or -1 when it
 * runs an inline script or none.
 *
 * @param {string[]} argv
 */
function findNodeScript(argv) {
	let i = 1;
	while (i < argv.length) {
		const word = argv[i];
		if (word === "--") return i + 1 < argv.length ? i + 1 : -1;
		if (!word.startsWith("-")) return i;
		if (
			NODE_NO_SCRIPT.has(word) ||
			word.startsWith("--eval=") ||
			word.startsWith("--print=")
		)
			return -1;

		i += NODE_OPTS_WITH_ARG.has(word) ? 2 : 1;
	}

	return -1;
}

/**
 * True when `word`, resolved against the directory the segment runs in, is
 * this runtime's `plan/commit.mjs` by native realpath. A word that can't be
 * resolved, or names no file, is not.
 *
 * @param {string} word
 * @param {string | null} cwd
 */
function isCommitScript(word, cwd) {
	const resolved = resolveDir(word, cwd);
	const target = resolved === null ? null : realPath(resolved);

	return target !== null && target === COMMIT_SCRIPT;
}

/**
 * The native realpath of `target`, or null when it names no file.
 *
 * @param {string} target
 */
function realPath(target) {
	try {
		return realpathSync.native(target);
	} catch {
		return null;
	}
}

/**
 * Walks the `git` word and git's global options to reach the subcommand.
 * `cPaths` collects every `-C` argument in order, and `configs` every `-c`
 * and `--config-env` value.
 *
 * @param {string[]} argv
 * @returns {GitSegment | null}
 */
function parseGitSegment(argv) {
	const command = path.basename(argv[0]);
	if (command !== "git" && command !== "git.exe") return null;

	/** @type {string[]} */
	const cPaths = [];
	/** @type {string[]} */
	const configs = [];
	let i = 1;
	while (i < argv.length) {
		const word = argv[i];
		if (word === "-C" || word === "-c" || word === "--config-env") {
			if (argv[i + 1] !== undefined) {
				(word === "-C" ? cPaths : configs).push(argv[i + 1]);
			}
			i += 2;
			continue;
		}
		if (word.startsWith("--config-env=")) {
			configs.push(word.slice("--config-env=".length));
			i += 1;
			continue;
		}
		if (GLOBAL_OPTS_WITH_ARG.has(word)) {
			i += 2;
			continue;
		}
		if (word.startsWith("-")) {
			i += 1;
			continue;
		}
		break;
	}

	return { cPaths, configs, sub: argv[i] ?? null, args: argv.slice(i + 1) };
}

// --- Commit forms ---

/**
 * @param {string[]} argv `commit.mjs` and its operands
 * @param {Segment} segment
 * @returns {Commit}
 */
function readScriptCommit(argv, segment) {
	const paths = argv.slice(2);

	return {
		form: "commit.mjs",
		subject: argv[1] === undefined ? null : firstLine(argv[1]),
		subjectFile: null,
		paths,
		cwd: segment.cwd,
		flags: [],
		denies: expansionDenies(paths, segment, SCRIPT_GLOB),
	};
}

/**
 * @param {GitSegment} git
 * @param {string | null} cwd
 * @param {Segment} segment
 * @returns {Commit}
 */
function readGitCommit(git, cwd, segment) {
	const args = readCommitArgs(git.args);
	/** @type {Deny[]} */
	const denies = [];
	if (args.all) denies.push({ id: "all", flag: args.all });
	if (args.include) denies.push({ id: "include", flag: args.include });
	if (args.noVerify) denies.push({ id: "no-verify", flag: args.noVerify });
	if (git.configs.some((entry) => /^core\.hookspath=/i.test(entry)))
		denies.push({ id: "hooks-path", flag: "-c core.hooksPath=" });
	denies.push(...expansionDenies(args.paths, segment));
	const magic = args.paths.find((p) => p.startsWith(":"));
	if (magic !== undefined) denies.push({ id: "magic-pathspec", flag: magic });

	return {
		form: "git",
		subject: readSubject(args, cwd, segment),
		subjectFile: readSubjectFile(args),
		paths: args.paths,
		cwd,
		flags: args.flags,
		denies,
	};
}

/**
 * Denies the first path the shell rewrites before git reads it, because the
 * gate builds its tree from the words as written and would judge a different
 * set of files than git commits.
 *
 * `glob` also denies a path that holds those characters, for a script that
 * reads each path literally.
 *
 * @param {string[]} paths
 * @param {Segment} segment
 * @param {RegExp} [glob]
 * @returns {Deny[]}
 */
function expansionDenies(paths, segment, glob) {
	const expanded = paths.find(
		(p) =>
			SHELL_EXPANDS.test(p) ||
			glob?.test(p) === true ||
			containsSubstitution(p, segment.substitutions)
	);

	return expanded === undefined
		? []
		: [{ id: "expanded-paths", flag: expanded }];
}

/**
 * Reads `git commit`'s own arguments. A short-flag cluster is read letter by
 * letter, so `-am` is `-a` plus `-m`, while in `-mabc` the `abc` is the
 * message and holds no `-a`.
 *
 * @param {string[]} args
 * @returns {CommitArgs}
 */
function readCommitArgs(args) {
	/** @type {CommitArgs} */
	const result = {
		paths: [],
		flags: [],
		messages: [],
		messageFile: null,
		all: null,
		include: null,
		noVerify: null,
	};
	let pastSeparator = false;
	for (let i = 0; i < args.length; i += 1) {
		const arg = args[i];
		if (pastSeparator || arg === "-" || !arg.startsWith("-")) {
			result.paths.push(arg);
			continue;
		}
		if (arg === "--") {
			pastSeparator = true;
			continue;
		}

		if (arg.startsWith("--")) {
			const equals = arg.indexOf("=");
			const name = equals === -1 ? arg : arg.slice(0, equals);
			result.flags.push(name);
			if (name === "--all") result.all = name;
			if (abbreviates(name, "--include")) result.include = name;
			if (abbreviates(name, "--no-verify")) result.noVerify = name;
			if (!COMMIT_LONG_WITH_ARG.has(name)) continue;

			const value = equals === -1 ? args[(i += 1)] : arg.slice(equals + 1);
			if (name === "--message") result.messages.push(value);
			if (name === "--file") result.messageFile = value;
			continue;
		}

		for (let j = 1; j < arg.length; j += 1) {
			const letter = arg[j];
			result.flags.push(`-${letter}`);
			if (letter === "a") result.all = "-a";
			if (letter === "i") result.include = "-i";
			if (letter === "n") result.noVerify = "-n";
			if (COMMIT_SHORT_GLUED_ARG.has(letter)) break;
			if (!COMMIT_SHORT_WITH_ARG.has(letter)) continue;

			const value = arg.slice(j + 1) || args[(i += 1)];
			if (letter === "m") result.messages.push(value);
			if (letter === "F") result.messageFile = value;
			break;
		}
	}

	return result;
}

/**
 * The `--no-verify` spelling a push carries before any `--`, or null. Only long
 * options count, because push's `-n` is `--dry-run`.
 *
 * @param {string[]} args
 */
function readPushNoVerify(args) {
	for (const arg of args) {
		if (arg === "--") return null;
		if (!arg.startsWith("--")) continue;

		const equals = arg.indexOf("=");
		const name = equals === -1 ? arg : arg.slice(0, equals);
		if (abbreviates(name, "--no-verify")) return name;
	}

	return null;
}

/**
 * True when git would read `name` as `option` or an unambiguous prefix of it.
 *
 * @param {string} name
 * @param {string} option
 */
function abbreviates(name, option) {
	const entry = ABBREVIATED.find((candidate) => candidate.option === option);

	return (
		entry !== undefined &&
		name.length >= entry.shortest.length &&
		option.startsWith(name)
	);
}

/**
 * The file `-F` names when the subject came from it, or null when a `-m`
 * message or stdin gave the subject. The gate names the file in a deny and
 * never quotes its text.
 *
 * @param {CommitArgs} args
 * @returns {string | null}
 */
function readSubjectFile(args) {
	if (args.messages.length > 0) return null;

	return args.messageFile && args.messageFile !== "-" ? args.messageFile : null;
}

/**
 * The first line of the first `-m` message, of the `-F` file when it can be
 * read, or of the stdin text `-F -` reads. A heredoc message reaches here
 * flattened as `cat << <body>`, so that prefix is dropped first. `-F -` also
 * reads a lone `echo` or `printf` argument piped into the commit.
 *
 * @param {CommitArgs} args
 * @param {string | null} cwd
 * @param {Segment} segment
 * @returns {string | null}
 */
function readSubject(args, cwd, segment) {
	if (args.messages.length > 0 && typeof args.messages[0] === "string") {
		return firstLine(args.messages[0].trim().replace(/^cat\s+<<-?\s+/, ""));
	}
	if (args.messageFile === "-") {
		const [stdin] = readFedStdin(segment);
		const text = stdin ?? readEchoedText(segment.pipedFrom);

		return text === null ? null : firstLine(text);
	}
	if (!args.messageFile || !cwd) return null;

	try {
		return firstLine(readFileSync(path.resolve(cwd, args.messageFile), "utf8"));
	} catch {
		return null;
	}
}

/**
 * The text a single-argument `echo` or `printf` writes, or null for any other
 * feeder. A `printf` format's first `\n` escape ends the subject line too.
 *
 * @param {Segment | null} feeder
 * @returns {string | null}
 */
function readEchoedText(feeder) {
	if (feeder?.argv.length !== 2) return null;

	const [command, text] = feeder.argv;
	const name = path.basename(command);
	if (!MESSAGE_FEEDERS.has(name) || text.startsWith("-")) return null;

	return name === "printf" ? text.split("\\n")[0] : text;
}

/** @param {string} text */
function firstLine(text) {
	return text.split("\n")[0].trim();
}
