#!/usr/bin/env node
// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
/**
 * Multi-host entry point for the architect-context read hook (ADR-0071),
 * dispatching over `HARNESSES` on the `--tool=` argv flag.
 *
 * Reads the hook's stdin JSON, looks up the harness named by the `--tool=`
 * argv flag, extracts the read paths and session id through that harness's
 * own accessors, decides per path whether the observed call earns read
 * credit (`resolveTargets`), calls the host-agnostic resolver in
 * `architect-route.mjs`,
 * and writes that harness's own envelope shape to stdout when it returns an
 * announcement. An unrecognized `--tool` value, a payload missing its file
 * path or session id, a payload that belongs to a different host's
 * registration (see `isForeignPayload`), or any caught failure all write
 * nothing and exit 0 — a `PostToolUse` hook must never block or fail the
 * tool call it observed.
 *
 * `PostToolUse` announces and never blocks. `PreToolUse` is the arm that
 * blocks: a write to a path a manifest route matches is denied until the
 * route's docs have been read, and the message names the literal `cat`
 * command that clears it (ADR-0072). The remedy is performable because the
 * announce arm's credit channel observes exactly those reads — which is why
 * the two arms live in one file and share one state format.
 *
 * A `Bash` call cannot be judged that way, because no parser short of a real
 * shell can say what an arbitrary command writes. So the shell arm inverts
 * the question: it reroutes every routed path a command names *unless* it can
 * prove the command only reads it (`parseUnprovenShellPaths`). Refusing what
 * it cannot prove is what makes an unmodelled shell form a re-spelled command
 * rather than a silently missed write.
 *
 * Every safety check lives in this script, never in a host's registration
 * matcher — a matcher-less harness would otherwise silently inherit nothing.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	ARCHITECT_DIR_PREFIX,
	findRepoRoot,
	MAX_EMISSION_BYTES,
	filterRoutedPaths,
	resolveArchitectNag,
	resolveUnreadDocs,
	toRepoRelativePath,
} from "./architect-route.mjs";
import {
	HARNESSES,
	resolveListedToolKind,
	resolveToolKind,
} from "./harnesses.mjs";

/**
 * The characters a whole command may contain and still be considered for read
 * credit: letters, digits, `_ . / - @ + = , : ~`, both quote characters (so
 * `unquote` keeps working), space and tab, and `;` and line breaks as the only
 * command separators. A command carrying anything else parses to zero targets,
 * in its entirety.
 *
 * The direction matters more than the contents. This was a deny-list of shell
 * metacharacters, and the enumeration escaped twice inside the single PR that
 * wrote it. An allow-list fails the other way: a miss on a deny-list marks an
 * unread document read and opens the write gate on it; a miss on an allow-list
 * costs one re-read. Every other credit judgment in this channel already
 * resolves that direction — `{ credit: false }` by default, only `cat`
 * credits, a flagged `cat` does not.
 *
 * The test runs over the whole command rather than per segment, and that is
 * the load it carries. A construct this class does not model can change what
 * the *following* lines mean: a heredoc introducer turns every line up to its
 * delimiter into data, so a body line reading `cat <doc>` is text being
 * written, not a document being read. Judging segments independently credited
 * exactly that. Refusing the whole command whenever any part of it is outside
 * the class is the only rule that cannot be fooled by a construct nobody
 * enumerated, and its cost is one re-read.
 *
 * What the class refuses, none of it individually enumerated: `$VAR` and
 * `${…}`, backslash escapes, globs, brace expansion, `!` history expansion,
 * `#`, every pipeline, redirect, and heredoc form, `&&`, `||`, and `&`. What
 * it costs: a path carrying a space, a `%`, or a non-ASCII character stops
 * crediting, and one unparseable clause costs the whole command rather than
 * itself.
 *
 * `;` and line breaks are in the class because `splitShellSegments` cuts on
 * them and the commands they separate each run unconditionally, printing to
 * the same transcript. A multi-line remedy is several commands, not one
 * unparseable one.
 *
 * @type {RegExp}
 */
const SHELL_READ_SAFE_CHARACTERS = /^[\w./@+=,:~"' \t;\r\n-]*$/;

/** Shell commands whose bare form reads a file. `cat` is the only one that reads the whole of it.
 * @type {Set<string>}
 */
const SHELL_READ_COMMANDS = new Set(["cat", "head", "tail", "sed", "less", "more"]);

/**
 * Strips one layer of matching surrounding quotes from a token.
 *
 * @param {string} token
 * @returns {string}
 */
function unquote(token) {
	const quoted = /^(["'])(.*)\1$/.exec(token);
	return quoted ? quoted[2] : token;
}

/**
 * Extracts the paths a shell read command names, and whether reading them
 * that way delivered the whole file.
 *
 * Only `cat` with no flags credits. `head`, `tail`, `sed -n`, `less`, and
 * `more` each announce the path but never credit it, because each of them
 * can hand back an arbitrary slice of a document the model then treats as
 * the whole thing. `cat` carrying any flag (`-n`, `-A`) is treated the same
 * way — the flag does not truncate, but under-crediting costs one re-read
 * while over-crediting silently defeats the write gate this channel feeds.
 *
 * Deliberate parsing gaps, all of which yield zero targets rather than a
 * guess: every command carrying a character outside
 * `SHELL_READ_SAFE_CHARACTERS`, which covers pipelines, redirects,
 * substitution, heredocs, globs, and variable expansion in one rule; `xargs`
 * and any other command that names its files indirectly; and unquoted paths
 * containing spaces.
 *
 * The class is tested once, over the raw command, and a failure costs every
 * segment rather than the offending one. Segment-independent judgment is what
 * let a heredoc body credit the documents its own text named — see the class's
 * own JSDoc for why the whole-command form is the only one that holds.
 *
 * @param {string | undefined} command
 * @returns {{filePath: string, credit: boolean}[]}
 */
export function parseShellReadTargets(command) {
	if (typeof command !== "string" || command.trim().length === 0) {
		return [];
	}

	if (!SHELL_READ_SAFE_CHARACTERS.test(command)) {
		return [];
	}

	const targets = [];
	for (const tokens of splitShellSegments(command)) {
		targets.push(...parseSegmentReadTargets(tokens));
	}

	return targets;
}

/**
 * One command segment's read targets, or an empty array when the segment
 * names a command that does not read a file. The caller has already tested
 * the whole command against `SHELL_READ_SAFE_CHARACTERS`, so a segment
 * reaching here carries nothing outside that class.
 *
 * @param {string[]} tokens
 * @returns {{filePath: string, credit: boolean}[]}
 */
function parseSegmentReadTargets(tokens) {
	const [name, ...args] = tokens;
	if (!SHELL_READ_COMMANDS.has(name)) {
		return [];
	}

	const operands = [];
	for (const arg of args) {
		if (arg.startsWith("-") && arg !== "-") {
			continue;
		}

		operands.push(unquote(arg));
	}

	// Only `cat` credits, and only unflagged. Everything else — a `head`
	// count operand, a `sed` script operand — is a non-path token that can
	// at worst cost one route lookup that finds nothing, since a manifest
	// route never matches a bare number or a `1,5p` script.
	const credit = name === "cat" && !args.some((arg) => arg.startsWith("-"));

	return operands.map((filePath) => ({ filePath, credit }));
}

/**
 * Splits a raw command into one token array per command segment, cutting at
 * every unquoted `;`, `&&`, `||`, `|`, `&`, and line break.
 *
 * Both callers run on this rather than tokenizing the raw command
 * themselves. `resolveProvenSafePaths` needs the cuts so one segment's
 * read-only head token cannot vouch for the next command's operands; the read
 * detector needs them so a remedy pasted as several lines into one call
 * credits each line. A shared splitter is what keeps those two answers from
 * drifting.
 *
 * This scans characters rather than splitting on whitespace and comparing
 * whole tokens against a separator set. The token form could only see a
 * separator that had space on both sides, so `a;b` and `a&&b` never cut — the
 * write arm resumed claiming operands past the separator and named a path the
 * command only read. Two things make the character form worth its length over
 * a regex split on the separators:
 *
 * - **Quotes.** `sed -i 's/a/b/;s/c/d/' out.md` carries a `;` that is part of
 *   the script, not a separator. Cutting there loses `out.md` — a real write
 *   the gate then never sees.
 * - **Heredocs.** A `<<DELIM` introducer makes every line up to `DELIM` data
 *   rather than commands, so the body is skipped whole. Without that, a PR
 *   body written through `tee <<'E'` has its own text parsed as commands.
 *
 * Two things it still does not model:
 *
 * - **Substitution containing a separator** — `$(a; b)` and its backtick
 *   twin. This produces an *extra* cut the shell would not make, stranding
 *   the token after it in a segment whose head is not a command. Unreachable
 *   in practice: `$` and `` ` `` sit outside `SHELL_READ_SAFE_CHARACTERS`,
 *   and every caller tests the whole command against that class first.
 * - **A separator inside an unterminated quote**, which is swallowed rather
 *   than cut. Quotes are in the class, so this one is reachable — and it
 *   matches what the shell itself does with an unterminated quote, which is
 *   to treat the rest of the line as one quoted word rather than as further
 *   commands.
 *
 * @param {string} command
 * @returns {string[][]}
 */
function splitShellSegments(command) {
	/** @type {string[][]} */
	const segments = [];
	/** @type {string[]} */
	const pendingHeredocs = [];
	/** @type {string[]} */
	let tokens = [];
	let token = "";
	let started = false;
	/** @type {string | null} */
	let quote = null;

	const endToken = () => {
		if (started) {
			tokens.push(token);
			token = "";
			started = false;
		}
	};

	const endSegment = () => {
		endToken();
		if (tokens.length > 0) {
			segments.push(tokens);
			tokens = [];
		}
	};

	for (let index = 0; index < command.length; index++) {
		const char = command[index];

		if (quote !== null) {
			token += char;
			if (char === "\\" && quote === '"' && index + 1 < command.length) {
				token += command[index + 1];
				index++;
			} else if (char === quote) {
				quote = null;
			}
			continue;
		}

		if (char === "\n" || char === "\r") {
			endSegment();
			if (pendingHeredocs.length > 0) {
				index = skipHeredocBodies(command, index, pendingHeredocs);
			}
			continue;
		}

		if (char === " " || char === "\t") {
			endToken();
			continue;
		}

		if (char === ";" || char === "&" || char === "|") {
			if (char !== ";" && command[index + 1] === char) {
				index++;
			}
			endSegment();
			continue;
		}

		if (char === "<" && command[index + 1] === "<" && command[index + 2] !== "<") {
			endToken();
			index = readHeredocDelimiter(command, index, pendingHeredocs);
			continue;
		}

		if (char === "'" || char === '"') {
			quote = char;
			token += char;
			started = true;
			continue;
		}

		if (char === "\\" && index + 1 < command.length) {
			token += command[index + 1];
			index++;
			started = true;
			continue;
		}

		token += char;
		started = true;
	}

	endSegment();

	return segments;
}

/**
 * Records the delimiter word of the heredoc introduced at `index` and returns
 * the index of its last consumed character.
 *
 * The introducer and its delimiter are dropped rather than kept as tokens —
 * neither is an operand of the command, and `tee out.md <<'E'` previously
 * yielded `<<'E'` as a write target alongside the real one.
 *
 * @param {string} command
 * @param {number} index index of the first `<` of the `<<`
 * @param {string[]} pendingHeredocs delimiters awaiting their body, in order
 * @returns {number}
 */
function readHeredocDelimiter(command, index, pendingHeredocs) {
	let cursor = index + 2;
	if (command[cursor] === "-") {
		cursor++;
	}

	while (command[cursor] === " " || command[cursor] === "\t") {
		cursor++;
	}

	let delimiter = "";
	while (cursor < command.length && !/[\s;&|<>]/.test(command[cursor])) {
		if (command[cursor] !== "'" && command[cursor] !== '"') {
			delimiter += command[cursor];
		}
		cursor++;
	}

	if (delimiter.length > 0) {
		pendingHeredocs.push(delimiter);
	}

	return cursor - 1;
}

/**
 * Skips the bodies of every heredoc awaiting one, starting from the line break
 * at `index`, and returns the index of the last consumed character.
 *
 * A body line is data the command writes, not a command. An unterminated
 * heredoc consumes the rest of the input, which is what the shell does too.
 *
 * @param {string} command
 * @param {number} index
 * @param {string[]} pendingHeredocs
 * @returns {number}
 */
function skipHeredocBodies(command, index, pendingHeredocs) {
	let cursor = index;

	while (pendingHeredocs.length > 0 && cursor < command.length) {
		while (
			cursor < command.length &&
			(command[cursor] === "\n" || command[cursor] === "\r")
		) {
			cursor++;
		}

		let lineEnd = cursor;
		while (
			lineEnd < command.length &&
			command[lineEnd] !== "\n" &&
			command[lineEnd] !== "\r"
		) {
			lineEnd++;
		}

		if (command.slice(cursor, lineEnd).trim() === pendingHeredocs[0]) {
			pendingHeredocs.shift();
		}

		cursor = lineEnd;
	}

	return cursor - 1;
}

/**
 * Flags the `grep` family accepts that select, format, or filter matches —
 * none of them names an output file or hands control to another program.
 *
 * @type {string}
 */
const GREP_INERT_FLAGS =
	"-# -i -v -n -H -h -c -l -L -w -x -F -E -G -P -o -q -s -r -R -a -I -m -A -B -C -e -f -z " +
	"--ignore-case --invert-match --line-number --count --files-with-matches --files-without-match " +
	"--word-regexp --line-regexp --fixed-strings --extended-regexp --perl-regexp --only-matching " +
	"--quiet --no-messages --recursive --max-count --after-context --before-context --context " +
	"--regexp --file --color --colour --with-filename --no-filename --include --exclude --exclude-dir";

/**
 * Head tokens whose operands a shell command reads rather than writes, each
 * mapped to the flags that command is known not to write or execute through.
 *
 * This is the whole of what the shell arm claims to model. Everything else —
 * `tee`, `cp`, `dd`, `python`, a binary nobody has heard of, any command
 * behind a `sudo`/`nohup`/`VAR=value` prefix — is treated as a write, so the
 * arm never has to enumerate the ways a command can write a file. Three
 * earlier rounds tried the other direction, each one shipping a new missed
 * write behind a green suite, because a list of write forms is wrong the
 * moment the shell grows a form nobody listed.
 *
 * The flag sets carry the same inversion one level down, and they are here
 * because the command-only form leaked: `sort -o <path> in.md` was certified
 * a read and wrote the path, as were `git diff --output <path>` and
 * `rg --pre <program>`. A read-only command's own write mode arrives as a
 * flag value, so a proof that skips every `-`-prefixed token cannot see it.
 * An unlisted flag now costs the whole segment its proof.
 *
 * The two directions are what makes this safe. A command or flag missing
 * from here costs one reroute message on a command that only read —
 * recoverable, and only when the command also names a routed path. A command
 * or flag wrongly present costs a silently missed write. So membership asks
 * two questions: is this command read-only on plain operands, and is every
 * flag listed beside it incapable of naming an output file or running
 * another program? If either answer needs a "usually", it stays out.
 *
 * Membership is the one place in this arm where a mistake is silent. No unit
 * test can check the list against reality — a test can only confirm the arm
 * agrees with the list — so the second reading happens here, when an entry is
 * added.
 *
 * Absent on purpose, each for the reason beside it: `sort`, `uniq`, and `xxd`
 * write through an output operand indistinguishable from an input by position
 * (`uniq in out`); `sed` is an editor whose `w` script command writes an
 * arbitrary path from inside a data operand, with no `-` prefix to catch —
 * `jq` is listed despite the same shape, a whole program in an unprefixed
 * data operand, because its language has no write or exec builtin and so
 * supplies nothing `sed`'s `w` does;
 * `git` reads or writes depending on its subcommand and is decided per call
 * by `checkSegmentWritesNoFile`.
 *
 * @type {Map<string, Set<string>>}
 */
export const SHELL_INSPECTION_COMMANDS = new Map(
	Object.entries({
		cat: "-n -b -s -v -e -t -E -T -A",
		head: "-# -n -c -q -v",
		tail: "-# -n -c -q -v -f",
		less: "-# -N -S -R -F -X",
		more: "-# -s",
		nl: "-b -n -w",
		od: "-# -A -t -N -j -c -x -b",
		grep: GREP_INERT_FLAGS,
		egrep: GREP_INERT_FLAGS,
		fgrep: GREP_INERT_FLAGS,
		ag: GREP_INERT_FLAGS,
		rg:
			`${GREP_INERT_FLAGS} -S -u -g -t -T -p -N ` +
			"--smart-case --case-sensitive --glob --type --hidden --no-ignore " +
			"--no-heading --json --stats --files --sort",
		wc: "-l -w -c -m -L",
		diff: "-# -u -U -r -q -w -b -B -i -N -a -c -y",
		ls: "-l -a -A -h -R -t -r -S -1 -d -F -i -n -p",
		stat: "-c -f -L -t",
		file: "-b -i -L -h -z",
		cut: "-d -f -c -b -s",
		tr: "-d -s -c",
		jq: "-r -n -c -e -s -S -a -j -M -C",
		echo: "-n -e -E",
		basename: "-z -a -s",
		dirname: "-z",
		which: "-a",
		pwd: "-L -P",
		true: "",
		false: "",
	}).map(([name, flags]) => [name, new Set(flags.split(/\s+/).filter(Boolean))])
);

/** `git` subcommands that only read the working tree.
 * @type {Set<string>}
 */
export const GIT_INSPECTION_SUBCOMMANDS = new Set([
	"diff",
	"log",
	"show",
	"status",
	"blame",
	"grep",
	"ls-files",
	"cat-file",
	"rev-parse",
]);

/**
 * Flags a read-only `git` subcommand accepts without writing a file.
 *
 * `--output` and `-o` are absent because `git diff|log|show --output <path>`
 * writes the diff to that path while the subcommand still reads as read-only;
 * `-O` is absent because `git grep -O <cmd>` opens matches in an arbitrary
 * pager command; `-C` is absent because it means two different things at the
 * two positions git accepts it — a working-directory change before the
 * subcommand, copy detection after it — and the arm resolves paths against
 * neither. `-p` is absent for the same positional reason: after the
 * subcommand it selects patch output, but `git -p log <path>` reads it as
 * `--paginate` and runs the program `core.pager` names. `--patch` stays,
 * because it means the diff format at either position.
 *
 * @type {Set<string>}
 */
const GIT_INERT_FLAGS = new Set(
	(
		"-# -n -1 -l -w -b -s -q -z -L -i -E -F -v " +
		"--oneline --stat --numstat --shortstat --name-only --name-status --patch --no-patch " +
		"--graph --pretty --format --abbrev-commit --date --since --until --author --grep " +
		"--follow --cached --staged --word-diff --color --no-color --unified --reverse " +
		"--first-parent --merges --no-merges --all --decorate --summary --raw"
	).split(/\s+/)
);

/**
 * `git` subcommands that write only inside `.git/`, never a working-tree file.
 *
 * Separate from `GIT_INSPECTION_SUBCOMMANDS` because these are not reads —
 * they write the index, a ref, or a remote. What they share with a read is
 * the only property this arm needs: no spelling of them writes a file a
 * manifest route can match, so every path-shaped token they name is safe to
 * drop.
 *
 * The arm needs the distinction because `git commit -m "…"` carries its
 * message as a plain operand, and `scanPathShapedTokens` cannot tell a
 * filename mentioned in prose from a path the command operates on. Without
 * this set every commit whose subject names a routed path denies, and none of
 * `formatShellRerouteMessage`'s remedies reaches it — a commit is not an edit
 * to redo with a file-edit tool, and it is not a read to respell.
 *
 * The failure direction is unchanged by admitting them. A subcommand wrongly
 * listed here still cannot write a routed path, because a subcommand that
 * writes the working tree — `checkout`, `restore`, `apply`, `stash`, `clone`,
 * `merge` — is absent, and each of those is a working-tree write the gate is
 * meant to see.
 *
 * @type {Set<string>}
 */
export const GIT_TREE_SAFE_SUBCOMMANDS = new Set([
	"commit",
	"add",
	"push",
	"fetch",
	"tag",
	"remote",
]);

/**
 * Flags the tree-safe subcommands accept without naming an output file or
 * running another program.
 *
 * Absent on purpose: `--upload-pack`, `--receive-pack`, and `--exec` each
 * name a program git runs across a transport; `-c` sets arbitrary config
 * before the subcommand, `core.pager` included; `-p` is `--paginate` at that
 * same position, the two-position ambiguity `GIT_INERT_FLAGS` documents for
 * `-C`; `-t`/`--template` names a path git hands to the editor. `--no-verify`
 * is absent because `.prism/rules/git-conventions.md` forbids it, so listing
 * it would widen the proof for a spelling nothing should use.
 *
 * @type {Set<string>}
 */
const GIT_TREE_SAFE_FLAGS = new Set(
	(
		"-# -m -F -a -q -v -n -f -u -d -s -S -e " +
		"--message --file --all --quiet --verbose --dry-run --force --amend " +
		"--no-edit --allow-empty --allow-empty-message --set-upstream --delete " +
		"--annotate --signoff --porcelain --tags --patch --update --intent-to-add"
	).split(/\s+/)
);

const PATH_SHAPED_RUN = /[\w./@~+-]+/g;

/**
 * Every path-shaped token a command names, anywhere in its text, with quote
 * and backslash characters removed first.
 *
 * Stripping those two before scanning is what makes the scan see through the
 * spellings a token-level parser gets wrong: `tee ".prism/x"/y.md`,
 * `tee .prism/'x'/y.md`, an unterminated quote, and a backslash-newline
 * continuation all still contain the literal path once the punctuation is
 * gone. The scan runs over the raw command rather than over parsed tokens
 * precisely so that no parsing mistake can hide a path from it.
 *
 * Junk tokens ride along — `tee`, `-i`, a `sed` script. They cost one route
 * lookup each and match nothing, which is cheaper than teaching the scanner
 * which words are paths and being wrong about it.
 *
 * @param {string | undefined} command
 * @returns {string[]}
 */
function scanPathShapedTokens(command) {
	if (typeof command !== "string" || command.trim().length === 0) {
		return [];
	}

	const stripped = command.replace(/["'\\]/g, "");
	const tokens = new Set();
	for (const run of stripped.match(PATH_SHAPED_RUN) ?? []) {
		tokens.add(run);

		// `-` belongs inside a path (`context-reuse.md`) but not at its front,
		// where it is a flag marker or the tail of an expansion operator —
		// `${OUT:-src/x.ts}` otherwise yields `-src/x.ts`, which matches no
		// route. Both spellings ride along rather than choosing between them.
		const unprefixed = run.replace(/^[-+]+/, "");
		if (unprefixed.length > 0) {
			tokens.add(unprefixed);
		}
	}

	return [...tokens];
}

/**
 * True when a segment names a command that cannot write a working-tree file,
 * carrying only flags that command cannot write or execute through.
 *
 * Both halves are required. The command test alone certified `sort -o <path>`
 * and `git diff --output <path>` as safe, because the write mode lived in a
 * flag the proof skipped rather than in the head token.
 *
 * Most of the surface is read-only commands, where "writes no file" and
 * "only reads" are the same claim. `git` is the exception, and it is decided
 * here rather than by list membership because it does three different things
 * depending on its subcommand: `git diff` reads, `git commit` writes `.git/`
 * only, and `git checkout` overwrites working-tree files. The first two are
 * safe for opposite reasons and the third is the write this arm exists to
 * catch. A `git` whose subcommand is not stated (only flags) is not provable.
 *
 * @param {string[]} tokens
 * @returns {boolean}
 */
function checkSegmentWritesNoFile(tokens) {
	const [name, ...args] = tokens;

	if (name === "git") {
		const subcommand = args.find((arg) => !arg.startsWith("-"));
		if (subcommand === undefined) {
			return false;
		}

		if (GIT_INSPECTION_SUBCOMMANDS.has(subcommand)) {
			return checkFlagsAreInert(args, GIT_INERT_FLAGS);
		}

		return (
			GIT_TREE_SAFE_SUBCOMMANDS.has(subcommand) &&
			checkFlagsAreInert(args, GIT_TREE_SAFE_FLAGS)
		);
	}

	const inertFlags = SHELL_INSPECTION_COMMANDS.get(name);
	return inertFlags !== undefined && checkFlagsAreInert(args, inertFlags);
}

/**
 * The flag names one token states — `--color=always` names `--color`, and a
 * short cluster `-rn` names `-r` and `-n` separately, because a cluster is
 * exactly as dangerous as its most dangerous letter.
 *
 * Digits collapse to `-#` so a count spelled as a flag (`head -20`, `git
 * log -5`) is one thing to allow rather than ten.
 *
 * @param {string} token
 * @returns {string[]}
 */
function resolveFlagNames(token) {
	if (token.startsWith("--")) {
		return [token.split("=")[0]];
	}

	const names = new Set();
	for (const character of token.slice(1)) {
		names.add(/\d/.test(character) ? "-#" : `-${character}`);
	}

	return [...names];
}

/**
 * True when every flag in a segment's arguments is on that command's inert
 * list. An unrecognized flag returns false, which costs the whole command its
 * proof — the direction this arm fails in everywhere else.
 *
 * `-` is a stdin operand and `--` ends option parsing; neither names a flag.
 *
 * @param {string[]} args
 * @param {Set<string>} inertFlags
 * @returns {boolean}
 */
function checkFlagsAreInert(args, inertFlags) {
	for (const arg of args) {
		if (!arg.startsWith("-") || arg === "-" || arg === "--") {
			continue;
		}

		for (const flag of resolveFlagNames(arg)) {
			if (!inertFlags.has(flag)) {
				return false;
			}
		}
	}

	return true;
}

/**
 * The paths a command names that it cannot be proven to only read — the
 * shell arm's whole judgment, and the inverse of what earlier rounds tried
 * to compute.
 *
 * Two steps. First, every path-shaped token in the raw command is a
 * candidate, whatever position it sits in. Second, a candidate is dropped
 * only when the command is *provably* a set of segments that write no
 * working-tree file, and the candidate is one of their operands. Anything the
 * proof does not cover stays, and the caller reroutes it if a manifest route
 * matches.
 *
 * The proof reuses the read arm's own `SHELL_READ_SAFE_CHARACTERS` class and
 * `splitShellSegments`, and it is all-or-nothing over the whole command: one
 * character outside the class, or one segment whose head is not a known
 * read-only command, and nothing is proven. That is what makes the five
 * shapes this arm used to miss unreachable rather than handled — an
 * interpreter write, a `cp`, a process substitution, an `exec` redirect, and
 * an expansion carrying a separator each fail the class test or the head-token
 * test, so none of them can produce a proof.
 *
 * Two gaps survive. A write whose target path never appears in the command
 * text — assembled from a variable, or reached through a `cd` — is invisible
 * to any scan over the command, and no parser short of a shell closes it. The
 * second is the read-only lists themselves: membership is a human judgment,
 * and a command or flag wrongly admitted is a silent write. See
 * `SHELL_INSPECTION_COMMANDS` for the questions membership has to answer.
 *
 * @param {string | undefined} command
 * @returns {string[]}
 */
export function parseUnprovenShellPaths(command) {
	const candidates = scanPathShapedTokens(command);
	if (candidates.length === 0) {
		return [];
	}

	const provenSafe = resolveProvenSafePaths(command);
	return candidates.filter((candidate) => !provenSafe.has(candidate));
}

/**
 * The operands of a command proven to consist only of segments that write no
 * working-tree file, or an empty set when no such proof holds.
 *
 * Distinct from `parseShellReadTargets`, which answers a different question
 * for the announce arm — which paths were read, and whether the read
 * delivered the whole file. This one asks only whether a mention is safe to
 * ignore, so it takes every operand of a safe segment and grades none of
 * them. That is why a `git commit` message body clears here and earns no read
 * credit anywhere: safe to ignore is not the same claim as read.
 *
 * @param {string | undefined} command
 * @returns {Set<string>}
 */
function resolveProvenSafePaths(command) {
	if (typeof command !== "string" || !SHELL_READ_SAFE_CHARACTERS.test(command)) {
		return new Set();
	}

	const operands = new Set();
	for (const tokens of splitShellSegments(command)) {
		if (!checkSegmentWritesNoFile(tokens)) {
			return new Set();
		}

		for (const token of tokens.slice(1)) {
			// Safe to skip only because `checkSegmentWritesNoFile` has already
			// confirmed every flag in this segment is on its command's inert
			// list, so no flag reaching here names an output file.
			if (token.startsWith("-") && token !== "-") {
				continue;
			}

			// Both the whole operand and its path-shaped runs, so an operand
			// carrying a space still matches the runs `scanPathShapedTokens`
			// recovered from the same text.
			const operand = unquote(token);
			operands.add(operand);
			for (const run of scanPathShapedTokens(operand)) {
				operands.add(run);
			}
		}
	}

	return operands;
}

/**
 * Resolves one payload into the paths to route and whether each one earns
 * read credit — the single place the credit judgment is made, so every
 * channel answers it the same way.
 *
 * - `read`: credits only when the payload carries neither `offset` nor
 *   `limit`. A `Read(limit: 1)` names the doc and delivers one line of it,
 *   which is exactly the over-credit that would make a write gate
 *   satisfiable without reading anything.
 * - `shell`: whatever `parseShellReadTargets` recovers, on its own terms,
 *   with each operand resolved against the command's own working directory.
 * - Everything else, `search` included: announce, never credit. A `Grep`
 *   whose results quote a routed doc has not delivered that doc.
 *
 * @param {import("./harnesses.mjs").HarnessSpec} spec
 * @param {import("./harnesses.mjs").HookPayload} payload
 * @returns {{filePath: string, credit: boolean}[]}
 */
export function resolveTargets(spec, payload) {
	const kind = resolveToolKind(spec, payload.tool_name);

	if (kind === "shell") {
		// A shell operand is relative to the command's own working directory,
		// unlike every other channel's path, which arrives absolute. Resolving
		// it here rather than downstream against the repo root is what keeps a
		// repo-root-relative `cat` issued from a subdirectory — a command that
		// fails — from crediting the doc it names.
		const cwd = payload.cwd ?? process.cwd();
		return parseShellReadTargets(payload.tool_input?.command).map(
			(target) => ({ ...target, filePath: path.resolve(cwd, target.filePath) })
		);
	}

	const isFullRead =
		kind === "read" &&
		payload.tool_input?.offset === undefined &&
		payload.tool_input?.limit === undefined;

	return spec
		.filePaths(payload)
		.map((filePath) => ({ filePath, credit: isFullRead }));
}

/**
 * Cursor's own hook-config event keys — camelCase, unlike Claude Code and
 * Codex's PascalCase. Cursor also executes `.claude/settings.json`'s hooks
 * behind a per-user "include third-party configs" setting, so without this
 * guard every Cursor tool call would run this hook twice: once through
 * `.cursor/hooks.json`'s own registration and once through Claude's,
 * crediting into two different state files.
 *
 * @type {Set<string>}
 */
const CURSOR_EVENT_NAMES = new Set([
	"preToolUse",
	"postToolUse",
	"sessionStart",
	"sessionEnd",
]);

/**
 * True when a payload fired through the `claude` registration but carries a
 * Cursor event name — the signature of Cursor's third-party-config import
 * re-running this hook through `.claude/settings.json` on top of its own
 * `.cursor/hooks.json` registration. Any other `--tool` value proceeds
 * normally; only the `claude` row can receive a foreign payload this way.
 *
 * @param {string} tool
 * @param {import("./harnesses.mjs").HookPayload} payload
 * @returns {boolean}
 */
function isForeignPayload(tool, payload) {
	return (
		tool === "claude" &&
		typeof payload.hook_event_name === "string" &&
		CURSOR_EVENT_NAMES.has(payload.hook_event_name)
	);
}

/**
 * Resolves a harness's own "nothing to report" output — `null` for Claude
 * and Codex (write nothing), or Cursor's explicit empty envelope, whose
 * runtime is expected to want a response even on a no-op (see
 * `HARNESSES.cursor.emitNone`).
 *
 * @param {import("./harnesses.mjs").HarnessSpec} spec
 * @returns {string | null}
 */
function emitNoneOutput(spec) {
	const none = spec.emitNone();
	return none === null ? null : JSON.stringify(none);
}

/**
 * Computes one harness's `PostToolUse` result for an already-read stdin
 * payload — the JSON string to write to stdout, or `null` when nothing
 * should be written (kill switch active, a foreign payload, a missing file
 * path or session id, no manifest match, or a caught failure, logged to
 * stderr as a side effect).
 *
 * Deliberately does no process-level I/O beyond that stderr log: no
 * `process.stdout.write`, no `process.exitCode`. `main()` below is the only
 * caller that touches either, which is what makes this function safe to
 * call directly from a test — no global mutable process state to restore
 * around the call.
 *
 * @param {string} tool
 * @param {import("./harnesses.mjs").HarnessSpec} spec
 * @param {string} rawStdin
 * @returns {Promise<string | null>}
 */
export async function runPostToolUseArm(tool, spec, rawStdin) {
	if (process.env.PRISM_HOOK_DISABLE === "1") {
		return null;
	}

	try {
		const payload = JSON.parse(rawStdin);

		if (isForeignPayload(tool, payload)) {
			return null;
		}

		const scopeId = spec.scopeId(payload);
		const targets = resolveTargets(spec, payload);
		if (!scopeId || targets.length === 0) {
			return emitNoneOutput(spec);
		}

		const cwd = payload.cwd ?? process.cwd();
		const repoRoot = (await findRepoRoot(cwd)) ?? cwd;

		// Every path the payload names, not just the first. `resolveTargets`
		// returns an array because one Codex `apply_patch` blob can carry several
		// `*** Update File:` headers, and routing only the first would leave
		// the architect context for every other file in that patch unnamed.
		//
		// The budget check runs before resolving the next path rather than
		// before emitting the one just resolved: `resolveArchitectNag` marks a
		// doc announced as it names it, so discarding an already-resolved
		// announcement would silence those docs for the session without ever
		// naming them. The emission can therefore overshoot by at most one
		// announcement — the same never-emit-what-you-marked exception
		// `formatNag` makes for a single over-length entry.
		const announcements = [];
		let remainingBytes = MAX_EMISSION_BYTES;
		for (const { filePath, credit } of targets) {
			if (remainingBytes <= 0) {
				break;
			}

			const nag = await resolveArchitectNag(repoRoot, filePath, scopeId, {
				credit,
			});
			if (nag === null) {
				continue;
			}

			announcements.push(nag);
			remainingBytes -= Buffer.byteLength(nag, "utf8") + 1;
		}

		if (announcements.length === 0) {
			return emitNoneOutput(spec);
		}

		return JSON.stringify(spec.emitNag(announcements.join("\n")));
	} catch (error) {
		process.stderr.write(
			`architect-route hook failed: ${error instanceof Error ? error.message : String(error)}\n`
		);
		return null;
	}
}

/**
 * Builds the deny message for a write to a routed path with unread docs.
 *
 * The literal `cat` command is the message's whole job. A gate whose remedy
 * has to be inferred is a gate the model cannot reliably clear, and the
 * credit channel only credits a flagless `cat` or a rangeless `Read` — so
 * naming the doc without naming how to read it in full is the unsatisfiable
 * shape this wording exists to avoid. One line per unread doc, because the
 * model performs them one at a time.
 *
 * @param {string} relativePath
 * @param {string[]} unreadDocs
 * @returns {string}
 */
export function formatDenyMessage(relativePath, unreadDocs) {
	const remedies = unreadDocs
		.map((doc) => `cat ${ARCHITECT_DIR_PREFIX}${doc}`)
		.join("\n");
	return `You're editing \`${relativePath}\`. Read its governing docs in full first, then retry:\n${remedies}`;
}

/**
 * The shell reroute's message. It judges no prerequisites at all, which is
 * what makes it impossible to render unsatisfiable — the model is pointed at
 * a surface the gate can actually check rather than told to satisfy a
 * condition through a channel that cannot report satisfying it.
 *
 * All three of its remedies are performable, which matters because the arm
 * fires on commands that only read, and on commands that neither read nor
 * write the path at all, as well as on writes: an edit moves to the file-edit
 * tool, a read the arm could not prove is rewritten in a form it can, and a
 * path named only as prose inside a message or body moves into a file passed
 * by path. The third one exists because the first two are unreachable for a
 * `git commit -m` whose subject names a routed doc — there is no edit to redo
 * and no read to respell, which is the unsatisfiable shape this gate is built
 * to avoid rather than a louder version of the over-refusal ADR-0072 accepts.
 * Naming an environment variable as a way out would be a false remedy — the
 * deny switch is read from the hook process's own environment, which a
 * command's inline assignment never reaches.
 *
 * @param {string} relativePath
 * @returns {string}
 */
export function formatShellRerouteMessage(relativePath) {
	return (
		`You're running a shell command that names \`${relativePath}\`, a path with governing architect docs. ` +
		`The gate clears a shell command only when it can prove the command is a read, so everything else counts as a write — ` +
		`redo this edit with your file-edit tool so the gate can check its prerequisites. ` +
		"If the command only reads, spell it as a plain `cat`, `head`, or `grep` with no pipe, " +
		"redirect, substitution, or unusual flag — the proof covers the whole command, not just its first word. " +
		"If the path is only prose inside a message or body, move that text into a file and pass it by path " +
		"(`git commit -F <file>`, `gh pr create --body-file <file>`), or leave the path out of the message."
	);
}

/**
 * `PreToolUse` arm — denies a write to a routed path whose governing docs
 * this scope has not read, and reroutes a shell write on a routed path to a
 * file-edit tool. Returns the JSON string to write to stdout, or `null` when
 * the write proceeds.
 *
 * Five conditions all hold before anything is denied, and each one is
 * load-bearing:
 *
 * 1. Neither `PRISM_HOOK_DISABLE=1` nor `PRISM_HOOK_DENY_DISABLE=1` is set.
 * 2. The payload carries a scope id. No id, no deny — the gate has no state
 *    to judge against and would block every write in a session it cannot
 *    identify.
 * 3. `resolveListedToolKind` returns a kind the harness's table actually
 *    states. The unlisted-name fallback is right for announce and wrong here
 *    (see `harnesses.mjs`).
 * 4. A manifest route matches the path. A route existing is the opt-in; an
 *    unrouted path is never denied, which is what keeps a consumer's first
 *    edit to their own application code from being blocked.
 * 5. A doc that route names is absent from this scope's `read` array and
 *    still exists on disk.
 *
 * Nothing here writes state. A denied write must be able to produce the same
 * message again after the model's remedy fails, and appending to `announced`
 * would silence the very doc the deny is asking for.
 *
 * @param {string} tool
 * @param {import("./harnesses.mjs").HarnessSpec} spec
 * @param {string} rawStdin
 * @returns {Promise<string | null>}
 */
export async function runPreToolUseArm(tool, spec, rawStdin) {
	if (
		process.env.PRISM_HOOK_DISABLE === "1" ||
		process.env.PRISM_HOOK_DENY_DISABLE === "1"
	) {
		return null;
	}

	try {
		const payload = JSON.parse(rawStdin);

		if (isForeignPayload(tool, payload)) {
			return null;
		}

		const scopeId = spec.scopeId(payload);
		if (!scopeId) {
			return null;
		}

		const kind = resolveListedToolKind(spec, payload.tool_name);
		if (kind !== "write" && kind !== "shell") {
			return null;
		}

		const cwd = payload.cwd ?? process.cwd();
		const repoRoot = (await findRepoRoot(cwd)) ?? cwd;

		const reason =
			kind === "shell"
				? await resolveShellRerouteReason(repoRoot, cwd, payload)
				: await resolveWriteDenyReason(repoRoot, scopeId, spec.filePaths(payload));
		if (reason === null) {
			return null;
		}

		const envelope = spec.emitDeny(reason);
		return envelope === null ? null : JSON.stringify(envelope);
	} catch (error) {
		process.stderr.write(
			`architect-route deny arm failed: ${error instanceof Error ? error.message : String(error)}\n`
		);
		return null;
	}
}

/**
 * The deny reason for a file-edit write, or `null` when every path it names
 * is clear. Only the first gated path is reported: the model retries the same
 * call after reading, so naming one path's docs is what it can act on, and a
 * multi-path patch surfaces its next gate on the next attempt.
 *
 * @param {string} repoRoot
 * @param {string} scopeId
 * @param {string[]} filePaths
 * @returns {Promise<string | null>}
 */
async function resolveWriteDenyReason(repoRoot, scopeId, filePaths) {
	for (const filePath of filePaths) {
		const unreadDocs = await resolveUnreadDocs(repoRoot, filePath, scopeId);
		if (unreadDocs.length === 0) {
			continue;
		}

		const relativePath = toRepoRelativePath(repoRoot, filePath) ?? filePath;
		return formatDenyMessage(relativePath, unreadDocs);
	}

	return null;
}

/**
 * The reroute reason for a shell command naming a routed path it cannot be
 * proven to only read, or `null` when it names no such path. Tokens resolve
 * against the command's own working directory, the same way `resolveTargets`
 * resolves a shell read.
 *
 * @param {string} repoRoot
 * @param {string} cwd
 * @param {import("./harnesses.mjs").HookPayload} payload
 * @returns {Promise<string | null>}
 */
async function resolveShellRerouteReason(repoRoot, cwd, payload) {
	const unproven = parseUnprovenShellPaths(payload.tool_input?.command);
	const routed = await filterRoutedPaths(
		repoRoot,
		unproven.map((target) => path.resolve(cwd, target))
	);
	if (routed.length === 0) {
		return null;
	}

	return formatShellRerouteMessage(
		toRepoRelativePath(repoRoot, routed[0]) ?? routed[0]
	);
}

/**
 * `PostCompact` arm — deletes the session's state file so docs re-announce
 * and re-gate after compaction. Compaction can drop the conversation
 * history that made a doc "read"; leaving the state intact would silence
 * that doc permanently. Fires on `PostCompact`, not `PreCompact` — before
 * the drop, the tail of the pre-compaction conversation can still re-credit
 * what is about to be deleted, so acting before the drop would erase state
 * a moment before the conversation re-populates it.
 *
 * With no session id in the payload: a no-op, one stderr line, exit 0.
 * There is deliberately no age sweep here — `pruneStaleRouteState` in
 * `architect-route.mjs` is the one owner of orphan-state hygiene, and a
 * second age constant in a second file would be a second source of truth
 * for the same concern.
 *
 * @param {string} rawStdin
 * @returns {Promise<void>}
 */
export async function runPostCompactArm(rawStdin) {
	if (process.env.PRISM_HOOK_DISABLE === "1") {
		return;
	}

	try {
		const payload = JSON.parse(rawStdin);
		const sessionId = payload.session_id ?? payload.conversation_id ?? null;
		if (!sessionId) {
			process.stderr.write("architect-route: PostCompact with no session id — no-op\n");
			return;
		}

		const cwd = payload.cwd ?? process.cwd();
		const repoRoot = (await findRepoRoot(cwd)) ?? cwd;

		const fs = await import("node:fs/promises");
		const safeSessionId = sessionId.replace(/[^a-zA-Z0-9._-]/g, "_");
		const stateDir = path.join(repoRoot, ".prism");

		// Subagents of this session hold their own state files, named with the
		// session id as prefix and their agent id after it, so the reset that
		// follows a compaction has to sweep the whole prefix rather than the
		// one exact name — a child file left behind would keep suppressing
		// announcements the compacted context no longer holds.
		//
		// The trailing dot is what keeps the sweep inside this session: a bare
		// prefix test also matches a sibling whose id merely starts with this
		// one, and resetting a live unrelated session re-announces every doc
		// it had already delivered. Both `<session>.json` and
		// `<session>.<agent>.json` clear the dotted form.
		const prefix = `architect-route-state.${safeSessionId}.`;
		const entries = await fs.readdir(stateDir).catch(() => []);
		await Promise.all(
			entries
				.filter((name) => name.startsWith(prefix) && name.endsWith(".json"))
				.map((name) => fs.rm(path.join(stateDir, name), { force: true }))
		);
	} catch (error) {
		process.stderr.write(
			`architect-route PostCompact reset failed: ${error instanceof Error ? error.message : String(error)}\n`
		);
	}
}

/** Parses the `--tool=<name>` argv flag naming which `HARNESSES` row this process runs as.
 * @param {string[]} argv
 * @returns {string | undefined}
 */
function parseToolFlag(argv) {
	for (const arg of argv) {
		const match = /^--tool=(.+)$/.exec(arg);
		if (match) {
			return match[1];
		}
	}
	return undefined;
}

/**
 * Resolves argv's `--tool=<name>` flag to a `HARNESSES` row, or `null` when
 * the flag is absent or names a row that doesn't exist — the fail-open case
 * `main()` below exits 0 on without calling either arm at all. Separated
 * out from `main()` so this resolution is directly testable without
 * spawning a process or feeding it real stdin.
 *
 * @param {string[]} argv
 * @returns {{tool: string, spec: import("./harnesses.mjs").HarnessSpec} | null}
 */
export function resolveHarnessFromArgv(argv) {
	const tool = parseToolFlag(argv);
	const spec = tool ? HARNESSES[tool] : undefined;
	return tool && spec ? { tool, spec } : null;
}

/**
 * The kill switch checked before stdin is even parsed — the first statement
 * in this module's entry path. `PRISM_HOOK_DISABLE=1` makes the hook stay
 * registered and fire, but produce no output and exit 0.
 *
 * Every path sets `process.exitCode` rather than calling `process.exit()`
 * directly and returns — `process.exit()` does not guarantee pending
 * asynchronous `stdout` writes are flushed before the process tears down.
 * Setting `exitCode` and returning lets Node drain the write queue before
 * exiting on its own.
 */
async function main() {
	if (process.env.PRISM_HOOK_DISABLE === "1") {
		process.exitCode = 0;
		return;
	}

	const resolved = resolveHarnessFromArgv(process.argv.slice(2));
	if (resolved === null) {
		process.exitCode = 0;
		return;
	}
	const { tool, spec } = resolved;

	let rawStdin = "";
	try {
		rawStdin = await readStdin();
	} catch {
		process.exitCode = 0;
		return;
	}

	const eventName = parseEventFlag(process.argv.slice(2));
	if (eventName === "PostCompact") {
		await runPostCompactArm(rawStdin);
		process.exitCode = 0;
		return;
	}

	const output =
		eventName === "PreToolUse"
			? await runPreToolUseArm(tool, spec, rawStdin)
			: await runPostToolUseArm(tool, spec, rawStdin);
	if (output !== null) {
		process.stdout.write(output);
	}
	process.exitCode = 0;
}

/** Parses an optional `--event=<name>` argv flag selecting the arm; absent means `PostToolUse`.
 * @param {string[]} argv
 * @returns {string | undefined}
 */
function parseEventFlag(argv) {
	for (const arg of argv) {
		const match = /^--event=(.+)$/.exec(arg);
		if (match) {
			return match[1];
		}
	}
	return undefined;
}

function readStdin() {
	return new Promise((resolve, reject) => {
		let data = "";
		process.stdin.setEncoding("utf8");
		process.stdin.on("data", (chunk) => {
			data += chunk;
		});
		process.stdin.on("end", () => resolve(data));
		process.stdin.on("error", reject);
	});
}

/**
 * Only runs `main()` — which blocks on stdin — when this file is the process
 * entry point. Without this guard, `hook-gate.test.ts` importing
 * `runPostToolUseArm`/`runPostCompactArm` from this module also runs
 * `main()` at import time, which waits on a `process.stdin` that never ends
 * in a test process — hanging the whole suite rather than failing a single
 * test.
 */
const isEntryPoint =
	process.argv[1] !== undefined &&
	fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isEntryPoint) {
	// The file's own contract is that every failure writes nothing and exits 0.
	// `main` awaits `process.stdout.write`, which rejects on a closed pipe, and
	// an unhandled rejection would exit 1 with a stack trace instead.
	main().catch(() => {
		process.exitCode = 0;
	});
}
