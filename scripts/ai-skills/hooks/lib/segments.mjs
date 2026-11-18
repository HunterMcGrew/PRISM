// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
// Walks a shell command into the simple commands bash would run, for the
// agent hooks that judge one command at a time. It never runs anything.
//
// Each segment is one simple command between control operators, with its
// redirects kept beside it. Before a segment's argv is read, leading
// `NAME=value` words, reserved words (`if`, `then`, `do`, `!`, `{`, `time`,
// and the rest), `function <name>`, and the wrappers `env`, `command`,
// `exec`, `nice`, `nohup`, `timeout`, `docker exec` or `docker container
// exec` with its container, and `docker compose exec` or `run` with its
// service are stripped, so `argv[0]` is the program that runs. The walk
// descends into a `-c` string handed to `bash`, `sh`, `zsh`, `dash`, or `ksh`
// wherever that shell word sits in argv, reading the string as the shell's
// first operand after its options, a heredoc or here-string fed to one
// of those shells when it is the command itself (directly or piped from
// `cat`), the words after `eval`, and every command substitution.
//
// It tracks the directory each segment runs in. `cd`, `pushd`, `popd`, and
// PowerShell's `Set-Location`, `Push-Location`, `Pop-Location`, and `sl`
// move it for the segments after them in the same shell. A move inside a
// `( … )` subshell, a nested shell string, a substitution, a pipeline, a
// backgrounded command, or a function body stays there. A move inside other
// `{ … }` braces carries on, because braces run in the same shell. A
// directory the walk can't know statically reads as null: a `$` expansion, a
// word holding a command substitution, and the start of a `-c` string whose
// shell sits past argv[0], under a runner such as `sudo` or `docker run`.
//
// What each segment means is the calling hook's rule, and so is what an
// unreadable command means: the walk walks the longest part of it ending in a
// newline that does tokenize, since bash runs those lines before it reaches
// the bad one, lists the text from the first unreadable line on, and carries
// on.
//
// Accepted false walks:
// - a word naming a shell is read as running one wherever it sits, so
//   `echo bash -c 'x'` walks `x`
// - the readable lines before an unreadable one are walked even when they
//   open a compound command, such as `if`, that the bad line leaves unfinished
//   and bash never runs
//
// Known misses:
// - `xargs`, `find -exec`, `sudo`, `doas`, `docker run`, `devcontainer exec`,
//   `env -S`, `pwsh -Command`, the v1 `docker-compose` binary, and git aliases
//   hide a command this walk doesn't unwrap, unless it is a shell running a
//   `-c` string
// - a heredoc fed to a shell under one of those runners (`sudo bash <<EOF`)
// - a script file run by a shell (`bash x.sh`, `bash < x.sh`), whose text the
//   walk never reads
// - a substitution is walked with the directory its whole string started in,
//   not the directory at the point it appears
// - a function body is walked where it is defined, and calling the function
//   never moves the caller's directory
// - a `case` arm is walked as though it ran, so its `cd` moves the directory
//   for what follows
// - `cd -P`, `cd -L`, and PowerShell's `-Path` form read the flag as the
//   directory
import os from "node:os";
import path from "node:path";

import { flattenCommand, PIPES, REDIRECTS, tokenize } from "./tokenize.mjs";

export const SHELLS = new Set(["bash", "sh", "zsh", "dash", "ksh"]);
// A short-flag cluster holding `c`, such as `-c` or `-lc`.
export const SHELL_STRING_FLAG = /^-[a-zA-Z]*c[a-zA-Z]*$/;

const MAX_DEPTH = 6;
const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;
const RESERVED = new Set([
	"!",
	"{",
	"}",
	"if",
	"then",
	"elif",
	"else",
	"fi",
	"while",
	"until",
	"do",
	"done",
	"time",
	"coproc",
]);
// Words that open a construct whose remaining words are not a command.
const NON_COMMANDS = new Set(["for", "select", "case", "esac"]);
const DIR_CHANGES = new Set([
	"cd",
	"pushd",
	"Set-Location",
	"Push-Location",
	"sl",
]);
const DIR_RESTORES = new Set(["popd", "Pop-Location"]);
const SHELL_LONG_OPTS_WITH_ARG = new Set(["--rcfile", "--init-file"]);
const DOCKER_OPTS_WITH_ARG = new Set([
	"-e",
	"--env",
	"--env-file",
	"-u",
	"--user",
	"-w",
	"--workdir",
	"--detach-keys",
]);
const COMPOSE_OPTS_WITH_ARG = new Set([
	"-f",
	"--file",
	"-p",
	"--project-name",
	"--profile",
	"--env-file",
	"--project-directory",
	"--ansi",
	"--progress",
	"--parallel",
]);
const COMPOSE_COMMAND_OPTS_WITH_ARG = new Set([
	...DOCKER_OPTS_WITH_ARG,
	"--index",
	"--name",
	"--entrypoint",
	"-v",
	"--volume",
	"-p",
	"--publish",
	"-l",
	"--label",
	"--cap-add",
	"--cap-drop",
	"--pull",
]);
const TIMEOUT_OPTS_WITH_ARG = new Set(["-s", "--signal", "-k", "--kill-after"]);

/**
 * One simple command found by `walkSegments`.
 *
 * @typedef {object} Segment
 * @property {string[]} argv The words that run, after assignments, reserved
 *   words, wrappers, and redirects are stripped. Empty for a keyword alone or
 *   a `for` list.
 * @property {string[]} words Every word as written, wrappers and redirect
 *   targets included, heredoc bodies excluded.
 * @property {string[]} assignments Every `NAME=value` in prefix position,
 *   including those passed to `env`.
 * @property {string[]} wrappers The wrappers stripped from `argv`, in order,
 *   with a docker form such as `docker exec` or `docker compose run` as one
 *   name.
 * @property {{ op: string, target: string }[]} redirects Every redirect but
 *   a heredoc or here-string.
 * @property {string[]} stdinTexts Heredoc bodies and here-string text.
 * @property {string | null} cwd The directory the command runs in.
 * @property {string | null} container The container or compose service a
 *   docker wrapper runs it in, or null on the host.
 * @property {number} depth How many nested shells, substitutions, or evals
 *   it sits inside.
 * @property {"top" | "shell-string" | "shell-stdin" | "eval" | "substitution"} via
 *   How the walk reached it.
 * @property {Segment | null} pipedFrom The segment piping into this one.
 * @property {string[]} substitutions The inner text of every substitution in
 *   the command string this segment came from, whose flattened words the
 *   tokenizer joins into the word they sit in.
 */

/**
 * @typedef {{ cwd: string | null, dirStack: (string | null)[] }} Shell
 * @typedef {{ text: string, op: boolean, body: boolean }} Item
 * @typedef {{ depth: number, functionNext: boolean, bodies: { depth: number, saved: Shell }[] }} Braces
 * @typedef {{ cwd: string | null, container: string | null, depth: number, maxDepth: number, via: Segment["via"] }} Ctx
 * @typedef {{ segments: Segment[], unreadable: string[] }} Out
 * @typedef {(dir: string | null | undefined, base: string | null) => string | null} Resolve
 * @typedef {{ argv: string[], assignments: string[], wrappers: string[], cwd: string | null, container: string | null }} Unwrapped
 */

/**
 * Walks every simple command in `command`, in the order bash runs them.
 *
 * `cwd` is the directory the command starts in, and `maxDepth` bounds the
 * nesting the walk descends into. `unreadable` lists, for each command string
 * the tokenizer couldn't read, the top-level one included, its text from the
 * first line the walk couldn't read.
 *
 * @param {string} command
 * @param {{ cwd?: string | null, maxDepth?: number }} [options]
 * @returns {{ segments: Segment[], unreadable: string[] }}
 */
export function walkSegments(
	command,
	{ cwd = null, maxDepth = MAX_DEPTH } = {}
) {
	/** @type {Out} */
	const out = { segments: [], unreadable: [] };
	walkString(
		command,
		{ cwd, container: null, depth: 0, via: "top", maxDepth },
		out
	);

	return out;
}

/**
 * Resolves `dir` the way `cd` would from `base`. `~` and `~/…` read as the
 * home directory, and a `$` expansion, `~user`, or a relative path with no
 * base read as null.
 *
 * @param {string | null | undefined} dir
 * @param {string | null} base
 * @returns {string | null}
 */
export function resolveDir(dir, base) {
	if (!dir || dir.includes("$")) return null;

	let host = dir;
	if (host === "~" || host.startsWith("~/"))
		host = path.join(os.homedir(), host.slice(1));
	else if (host.startsWith("~")) return null;

	host = toHostPath(host);
	if (path.isAbsolute(host)) return path.normalize(host);
	if (!base) return null;

	return path.normalize(path.join(base, host));
}

/**
 * True when `word` holds the flattened text of one of `substitutions`, the
 * inner texts a segment carries, so its value is only known at run time.
 *
 * @param {string} word
 * @param {string[]} substitutions
 * @returns {boolean}
 */
export function containsSubstitution(word, substitutions) {
	return substitutions.some(
		(inner) => inner.trim() !== "" && word.includes(flattenCommand(inner))
	);
}

/**
 * The text a segment reads on stdin: its own heredoc or here-string, or else
 * the heredoc of a lone `cat` piping into it, since bash gives a command's
 * own redirect precedence over the pipe.
 *
 * @param {Segment} segment
 * @returns {string[]}
 */
export function readFedStdin(segment) {
	if (segment.stdinTexts.length > 0) return segment.stdinTexts;

	const feeder = segment.pipedFrom;

	return feeder?.argv.length === 1 && path.basename(feeder.argv[0]) === "cat"
		? feeder.stdinTexts
		: [];
}

/**
 * Maps a Git Bash drive path (`/d/x`) to the form a Windows program reads
 * (`D:/x`) on win32, and returns every other path unchanged.
 *
 * @param {string} p
 * @returns {string}
 */
export function toHostPath(p) {
	if (process.platform !== "win32" || typeof p !== "string") return p;

	const drive = /^\/([a-zA-Z])(\/|$)/.exec(p);

	return drive ? `${drive[1].toUpperCase()}:/${p.slice(drive[0].length)}` : p;
}

// --- Walk ---

/**
 * @param {string} command
 * @param {Ctx} ctx
 * @param {Out} out
 */
function walkString(command, ctx, out) {
	if (
		ctx.depth > ctx.maxDepth ||
		typeof command !== "string" ||
		!command.trim()
	)
		return;

	let parsed;
	try {
		parsed = tokenize(command);
	} catch {
		const prefix = readablePrefix(command);
		out.unreadable.push(command.slice(prefix?.length ?? 0));
		if (prefix !== null) walkString(prefix, ctx, out);
		return;
	}

	for (const inner of parsed.substitutions)
		walkString(inner, nested(ctx, ctx.cwd, ctx.container, "substitution"), out);

	/** @type {Shell} */
	const shell = { cwd: ctx.cwd, dirStack: [] };
	/** @type {Shell[]} */
	const subshells = [];
	/** @type {Braces} */
	const braces = { depth: 0, functionNext: false, bodies: [] };
	/** @type {Item[]} */
	let items = [];
	/** @type {string | null} */
	let before = null;
	/** @type {Segment | null} */
	let previous = null;

	/** @param {string | null} after */
	const finish = (after) => {
		if (items.length > 0) {
			scopeFunctionBody(items, braces, shell);
			previous = runSegment(
				items,
				{ before, after, previous },
				shell,
				ctx,
				parsed,
				out
			);
		} else previous = null;
		items = [];
		before = after;
	};

	for (const [i, text] of parsed.tokens.entries()) {
		const op = parsed.operators.has(i);
		if (!op || REDIRECTS.has(text)) {
			items.push({ text, op, body: parsed.bodies.has(i) });
			continue;
		}

		const namesFunction =
			text === "(" &&
			items.length === 1 &&
			!items[0].op &&
			parsed.tokens[i + 1] === ")" &&
			parsed.operators.has(i + 1);
		finish(text);
		if (namesFunction) braces.functionNext = true;
		if (text === "(")
			subshells.push({ cwd: shell.cwd, dirStack: [...shell.dirStack] });
		if (text === ")" && subshells.length > 0)
			Object.assign(shell, subshells.pop());
	}
	finish(null);
}

/**
 * The longest part of `command` ending in a newline that tokenizes, or null.
 * Bash reads a command line by line and runs each line before reading the
 * next, so the lines before an unreadable one still run.
 *
 * @param {string} command
 * @returns {string | null}
 */
function readablePrefix(command) {
	for (
		let end = command.lastIndexOf("\n");
		end > 0;
		end = command.lastIndexOf("\n", end - 1)
	) {
		const prefix = command.slice(0, end + 1);
		try {
			tokenize(prefix);
			return prefix;
		} catch {
			// A quote, backtick, or substitution still open at this newline, so
			// try an earlier one.
		}
	}

	return null;
}

/**
 * Tracks the `{` and `}` words that open and close a segment, and saves the
 * shell's directory when a function body opens and restores it when that
 * body closes. A body is the first brace group after `function <name>` or
 * `<name> ()`.
 *
 * @param {Item[]} items
 * @param {Braces} braces
 * @param {Shell} shell
 */
function scopeFunctionBody(items, braces, shell) {
	const words = items
		.filter((item) => !item.op && !item.body)
		.map((item) => item.text);
	if (words[0] === "}") {
		braces.depth -= 1;
		if (braces.bodies.at(-1)?.depth === braces.depth)
			Object.assign(shell, /** @type {{ saved: Shell }} */ (braces.bodies.pop()).saved);
	}

	const header = words[0] === "function";
	let i = header ? 2 : 0;
	if (header) braces.functionNext = true;
	else if (words[0] !== "{") braces.functionNext = false;

	for (; words[i] === "{"; i += 1) {
		if (braces.functionNext) {
			braces.bodies.push({
				depth: braces.depth,
				saved: { cwd: shell.cwd, dirStack: [...shell.dirStack] },
			});
			braces.functionNext = false;
		}
		braces.depth += 1;
	}
}

/**
 * Builds one segment, records it, walks what it hands to another shell, and
 * applies its directory change. Returns the segment.
 *
 * @param {Item[]} items
 * @param {{ before: string | null, after: string | null, previous: Segment | null }} links
 * @param {Shell} shell
 * @param {Ctx} ctx
 * @param {import("./tokenize.mjs").TokenizeResult} parsed
 * @param {Out} out
 * @returns {Segment}
 */
function runSegment(items, links, shell, ctx, parsed, out) {
	const { words, argvWords, redirects, stdinTexts } = readItems(items);
	/** @type {Resolve} */
	const resolve = (dir, base) =>
		typeof dir === "string" && containsSubstitution(dir, parsed.substitutions)
			? null
			: resolveDir(dir, base);
	const unwrapped = unwrap(argvWords, shell.cwd, resolve);
	/** @type {Segment} */
	const segment = {
		argv: unwrapped.argv,
		words,
		assignments: unwrapped.assignments,
		wrappers: unwrapped.wrappers,
		redirects,
		stdinTexts,
		cwd: unwrapped.cwd,
		container: unwrapped.container ?? ctx.container,
		depth: ctx.depth,
		via: ctx.via,
		pipedFrom: PIPES.has(/** @type {string} */ (links.before)) ? links.previous : null,
		substitutions: parsed.substitutions,
	};
	out.segments.push(segment);

	walkNested(segment, ctx, out);

	const ownShell =
		segment.wrappers.length === 0 &&
		!PIPES.has(/** @type {string} */ (links.before)) &&
		!PIPES.has(/** @type {string} */ (links.after)) &&
		links.after !== "&";
	if (ownShell) changeDir(segment.argv, shell, resolve);

	return segment;
}

/**
 * Walks the command text a segment hands to a shell or to `eval`. A `-c`
 * string counts wherever its shell word sits, and a fed heredoc counts only
 * when the shell is `argv[0]`, so `cat <<EOF | grep bash` walks nothing.
 *
 * @param {Segment} segment
 * @param {Ctx} ctx
 * @param {Out} out
 */
function walkNested(segment, ctx, out) {
	const { argv } = segment;
	if (argv.length === 0) return;

	if (path.basename(argv[0]) === "eval") {
		walkString(
			argv.slice(1).join(" "),
			nested(ctx, segment.cwd, segment.container, "eval"),
			out
		);
		return;
	}

	const shellAt = argv.findIndex((word) => SHELLS.has(path.basename(word)));
	if (shellAt === -1) return;

	const flag = argv.findIndex(
		(word, i) => i > shellAt && SHELL_STRING_FLAG.test(word)
	);
	if (flag !== -1) {
		const cwd = shellAt === 0 ? segment.cwd : null;
		walkString(
			argv[shellOperandAt(argv, flag)],
			nested(ctx, cwd, segment.container, "shell-string"),
			out
		);
		return;
	}
	if (argv.slice(1).some((word) => !word.startsWith("-"))) return;

	for (const text of readFedStdin(segment))
		walkString(
			text,
			nested(ctx, segment.cwd, segment.container, "shell-stdin"),
			out
		);
}

/**
 * The index of a shell's first operand at or after `i`, which bash runs as
 * the `-c` string. A `--` ends the options, and every other `-` or `+` word
 * is an option. Each `o` or `O` in a short-option word, as in `-o`, `-co`, or
 * `+O`, takes one following word as its value, and so do `--rcfile` and
 * `--init-file`.
 *
 * @param {string[]} argv
 * @param {number} i
 * @returns {number}
 */
export function shellOperandAt(argv, i) {
	while (i < argv.length) {
		const word = argv[i];
		if (word === "--") return i + 1;
		if (!/^[-+]/.test(word)) return i;

		const values = /^[-+][a-zA-Z]+$/.test(word)
			? (word.match(/[oO]/g)?.length ?? 0)
			: Number(SHELL_LONG_OPTS_WITH_ARG.has(word));
		i += 1 + values;
	}

	return i;
}

/**
 * @param {Ctx} ctx
 * @param {string | null} cwd
 * @param {string | null} container
 * @param {Segment["via"]} via
 * @returns {Ctx}
 */
function nested(ctx, cwd, container, via) {
	return { ...ctx, cwd, container, depth: ctx.depth + 1, via };
}

/**
 * Splits a segment's items into its words, the words left for argv, its
 * redirects, and its stdin text. A redirect's target leaves argv, and so does
 * the fd digit before a redirect, so `2>&1` is never read as an argument.
 *
 * @param {Item[]} items
 */
function readItems(items) {
	/** @type {string[]} */
	const words = [];
	/** @type {string[]} */
	const argvWords = [];
	/** @type {{ op: string, target: string }[]} */
	const redirects = [];
	/** @type {string[]} */
	const stdinTexts = [];
	for (let i = 0; i < items.length; i += 1) {
		const item = items[i];
		if (item.body) {
			stdinTexts.push(item.text);
			continue;
		}
		if (item.op) {
			const target = items[i + 1];
			if (target && !target.op && !target.body) {
				words.push(target.text);
				if (item.text === "<<<") stdinTexts.push(target.text);
				else redirects.push({ op: item.text, target: target.text });
				i += 1;
			}
			continue;
		}

		words.push(item.text);
		if (!(/^\d+$/.test(item.text) && items[i + 1]?.op))
			argvWords.push(item.text);
	}

	return { words, argvWords, redirects, stdinTexts };
}

// --- Prefixes ---

/**
 * Strips assignments, reserved words, and wrappers from the front of `words`.
 * Returns the argv left with what was stripped, the directory the command
 * runs in, and the container `docker exec` names, if any.
 *
 * @param {string[]} words
 * @param {string | null} shellCwd
 * @param {Resolve} resolve
 * @returns {Unwrapped}
 */
function unwrap(words, shellCwd, resolve) {
	/** @type {Unwrapped} */
	const result = {
		argv: words,
		assignments: [],
		wrappers: [],
		cwd: shellCwd,
		container: null,
	};
	for (;;) {
		while (result.argv.length > 0 && ASSIGNMENT.test(result.argv[0])) {
			result.assignments.push(result.argv[0]);
			result.argv = result.argv.slice(1);
		}
		const head = result.argv[0];
		if (head === undefined) break;
		if (NON_COMMANDS.has(head)) {
			result.argv = [];
			break;
		}
		if (RESERVED.has(head) || head === "function") {
			const skip =
				head === "function" ||
				(head === "time" && result.argv[1] === "-p") ||
				(head === "coproc" && result.argv[2] === "{")
					? 2
					: 1;
			result.argv = result.argv.slice(skip);
			continue;
		}

		const name = path.basename(head);
		if (name === "docker") {
			const docker = unwrapDocker(result.argv.slice(1), resolve);
			if (!docker) break;

			result.wrappers.push(docker.form);
			result.container = docker.container;
			result.cwd = docker.cwd;
			result.argv = docker.argv;
			continue;
		}

		const stripped = WRAPPERS[name]?.(result.argv.slice(1), result, resolve);
		if (!stripped) break;

		result.wrappers.push(name);
		result.argv = stripped;
	}

	return result;
}

/**
 * Reads `docker exec`, `docker container exec`, and `docker compose exec` or
 * `run` up to the command they run. Returns the form's name, the container
 * or service, the `-w` directory, and the command words, or null for any
 * other docker command.
 *
 * @param {string[]} args
 * @param {Resolve} resolve
 * @returns {{ form: string, container: string, cwd: string | null, argv: string[] } | null}
 */
function unwrapDocker(args, resolve) {
	let i;
	let form;
	let options = DOCKER_OPTS_WITH_ARG;
	if (args[0] === "exec") {
		form = "docker exec";
		i = 1;
	} else if (args[0] === "container" && args[1] === "exec") {
		form = "docker container exec";
		i = 2;
	} else if (args[0] === "compose") {
		i = 1;
		while (i < args.length && args[i].startsWith("-"))
			i += COMPOSE_OPTS_WITH_ARG.has(args[i]) ? 2 : 1;
		if (args[i] !== "exec" && args[i] !== "run") return null;

		form = `docker compose ${args[i]}`;
		options = COMPOSE_COMMAND_OPTS_WITH_ARG;
		i += 1;
	} else return null;

	/** @type {string | null | undefined} */
	let workdir = null;
	while (i < args.length && args[i].startsWith("-")) {
		const word = args[i];
		if (word === "-w" || word === "--workdir") workdir = args[i + 1];
		else if (word.startsWith("--workdir=")) workdir = word.slice(10);
		i += options.has(word) ? 2 : 1;
	}
	if (args[i] === undefined) return null;

	return {
		form,
		container: args[i],
		cwd: resolve(workdir, null),
		argv: args.slice(i + 1),
	};
}

/**
 * Each wrapper takes the words after its name and returns the command words
 * it runs, or null when this use of it runs no command to unwrap.
 *
 * @type {Record<string, (args: string[], result: Unwrapped, resolve: Resolve) => string[] | null>}
 */
const WRAPPERS = {
	env(args, result, resolve) {
		let i = 0;
		while (i < args.length && args[i].startsWith("-")) {
			const word = args[i];
			if (word === "--") {
				i += 1;
				break;
			}
			if (word === "-C" || word === "--chdir")
				result.cwd = resolve(args[i + 1], result.cwd);
			else if (word.startsWith("--chdir="))
				result.cwd = resolve(word.slice(8), result.cwd);
			i += ["-u", "--unset", "-C", "--chdir", "-S", "--split-string"].includes(
				word
			)
				? 2
				: 1;
		}
		while (i < args.length && ASSIGNMENT.test(args[i])) {
			result.assignments.push(args[i]);
			i += 1;
		}

		return args.slice(i);
	},
	command(args) {
		let i = 0;
		while (args[i] === "-p") i += 1;

		return args[i] === "-v" || args[i] === "-V" ? null : args.slice(i);
	},
	exec(args) {
		let i = 0;
		while (i < args.length && args[i].startsWith("-"))
			i += args[i] === "-a" ? 2 : 1;

		return args.slice(i);
	},
	nice(args) {
		let i = 0;
		while (i < args.length && args[i].startsWith("-"))
			i += args[i] === "-n" || args[i] === "--adjustment" ? 2 : 1;

		return args.slice(i);
	},
	nohup(args) {
		return args[0] === "--" ? args.slice(1) : args;
	},
	timeout(args) {
		let i = 0;
		while (i < args.length && args[i].startsWith("-"))
			i += TIMEOUT_OPTS_WITH_ARG.has(args[i]) ? 2 : 1;

		return args.slice(i + 1);
	},
};

// --- Directory ---

/**
 * Applies a `cd`-style segment to the shell's directory state, resolving its
 * target through `resolve`.
 *
 * @param {string[]} argv
 * @param {Shell} shell
 * @param {Resolve} resolve
 */
function changeDir(argv, shell, resolve) {
	const command = argv[0];
	if (DIR_RESTORES.has(command)) {
		shell.cwd =
			shell.dirStack.length > 0
				? /** @type {string | null} */ (shell.dirStack.pop())
				: null;
		return;
	}
	if (!DIR_CHANGES.has(command)) return;

	const target = argv[1];
	const next =
		target === undefined
			? command === "cd"
				? os.homedir()
				: shell.cwd
			: target === "-"
				? null
				: resolve(target, shell.cwd);
	if (command === "pushd" || command === "Push-Location")
		shell.dirStack.push(shell.cwd);
	shell.cwd = next;
}
