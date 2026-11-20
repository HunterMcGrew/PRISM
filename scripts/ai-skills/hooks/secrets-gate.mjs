#!/usr/bin/env node
// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
//
// The secrets gate. It denies an agent's read of a secret file before the
// harness runs it, so a dotenv value, key, or certificate never lands in a
// transcript. The remedy is `node <runtime>/env-keys.mjs <file>`, which prints
// a dotenv file's key names and never a value, or reading `.env.example`.
// `<runtime>` is this file's directory, written in the deny text relative to
// the call's `cwd`, so the printed command runs from wherever the agent is.
// Ported from the reference implementation's secrets gate.
//
// A secret path is any path whose repo-relative form (or absolute form, for a
// path outside this repo) has a `.env` or `.env.*` basename other than
// `.env.example`, a `secrets` folder segment, or a `*.pem` or `*.key`
// basename, compared without case because a macOS disk reads `.ENV` as
// `.env`. An absolute path as written keeps only the basename tests, so a
// checkout under a `secrets` folder still reads. A symlink that resolves to a
// secret path is one too. `matchesSecretPath` owns the exact shapes. The `secretPaths` list in
// `.ai-skills/config.json` at the git toplevel adds patterns in the manifest
// route syntax, matched against the lowercased repo-relative path, and never
// removes a built-in. A `secretPaths` value that isn't a list of strings, or a
// config that doesn't parse, keeps the built-ins alone and writes one stderr
// line.
//
// Every registration passes `--tool=<claude|codex>`. Three arms judge a call:
//
// - Read: Claude's Read tool, on its `file_path`.
// - Grep: Claude's Grep tool. A `path` or `glob` naming a secret shape denies.
//   Otherwise the gate lists the files under the search root with
//   `git ls-files -co --exclude-standard`, because Grep's ripgrep honors
//   `.gitignore` the same way, and denies only when that list holds a secret
//   path. `.env`, `.env.local`, and `*.pem` are usually ignored, while
//   `.env.production`, `*.key`, and `secrets/` folders are not. A root that is
//   itself gitignored lists nothing, and ripgrep still searches a root it is
//   handed, so that root is walked on disk instead, up to `MAX_WALK` entries.
// - Shell: Claude's Bash and PowerShell, and Codex's Bash, read through
//   `readShellCall`, so a Codex argv array and a PowerShell backslash path
//   reach the walk as words. `walkSegments` finds every simple command,
//   including those in the shell strings, fed heredocs, `eval`s, and
//   substitutions its header lists, with the directory each one runs in. Every
//   word is judged as a path, including redirect targets, the value after a
//   `=`, the path after a `rev:` colon, and brace expansions. An unquoted glob
//   word expands against the segment's cwd, and one that could match a secret
//   name (`.en*`, `*.k?y`) denies even when nothing matches on disk. A
//   filename filter, the value of `-g`, `--glob`, `--iglob`, or `--include`,
//   denies when it could select a secret name, quoted or not. A bare word
//   whose only secret shape is a `.pem` or `.key` suffix, such as
//   `event.key`, counts only when that file exists. A program that prints only
//   metadata with any flag, `test`, `[`, `[[`, `stat`, `ls`, or
//   `git check-ignore`, is judged on its redirect targets alone, so
//   `--stdin < .env` still denies. It must be a bare name, and it keeps that
//   pass only when every simple command is a metadata program, `echo`,
//   `printf` without `-v`, `true`, or `false`, none carries an assignment, and
//   the command defines no function. Any other command could put a reading
//   program behind the name, through `hash`, `BASH_CMDS[stat]=`, `eval`, and
//   more, so the allowed commands are a closed list rather than the renaming
//   ones. An allowed command can still assign through an argument, so the pass
//   also drops when any word holds `${`, as in
//   `${BASH_CMDS[stat]:=/bin/cat}`, or `$[`, and when a `[[` holds an
//   arithmetic comparison, `-eq`, `-ne`, `-lt`, `-le`, `-gt`, or `-ge`, whose
//   operands bash and zsh evaluate, as in `[[ 1 -eq PATH=0 ]]`, when a
//   `test`, `[`, or `[[` `-v` operand holds `[`, and when a `printf` argument
//   after the format holds `=`. The one exempt command is exactly one segment
//   of `node`, this runtime's `env-keys.mjs`, and one file word, with no
//   redirect, pipe, assignment, or substitution. The script is matched by
//   realpath, so a copy elsewhere is judged like any other command.
//
// It reads neither `PRISM_HOOK_DISABLE` nor `PRISM_HOOK_DENY_DISABLE`, because
// a secrets path an agent can turn off is not a control.
//
// Its own errors fail open: one stderr line, exit 0, no reply. A glob word
// that won't compile fails open for that word only.
//
// Known gaps, each passing:
//
// - A recursive search over a tree, such as `grep -r KEY .`, names no secret
//   path, so the shell arm can't see that it reaches one.
// - A read through a program the walk can't see into: code text in
//   `node -e`, a script file, a variable (`cat $F`), or a path assembled at
//   run time, such as the names `find -exec` or `xargs` hand to a command.
// - A relative word after a `cd` the walk can't resolve, such as `cd $DIR`,
//   is judged as written only.
// - A line the tokenizer can't read, and every line after it, passes, since
//   bash stops at the same unbalanced quote, backtick, or substitution. The
//   lines before it are judged, because bash runs them first.
// - A word holding a blank counts only when it names a file that exists, so
//   a commit message stays allowed and a quoted path to a file not yet
//   written passes.
// - A brace sequence whose bounds the gate can't read, such as `{$a..$b}`, or
//   whose forms run past `MAX_EXPANSIONS`, after which it stops expanding.
//   It reads a padded sequence like `{01..03}` without the padding, which
//   can't change a secret shape.
// - A Grep outside any git repo passes, because there is no file list to
//   check. Claude's Grep tool exposes no option that disables ignore files,
//   so no payload field marks one.
// - A bare `secrets` word with no slash is not a path to this gate, so
//   `rg secrets` stays allowed, and `gh api …/actions/secrets` is denied.
// - A `secretPaths` pattern is matched against paths the call names or the
//   disk holds, and is never probed through a glob word, so `cat config/*`
//   denies only when a matching file exists.
// - A metadata program shadowed before the command starts, such as by a
//   function or alias from the user's shell profile or a `BASH_ENV` file,
//   passes as the metadata program, since the command itself holds nothing
//   that renames it.
// - An allowed command whose argument assigns through a shape other than a
//   `${` or `$[` expansion, a `[[` arithmetic comparison, a `-v` array
//   subscript, or a `printf` argument holding `=` keeps the metadata pass.
//   Bash and zsh have no closed list of such shapes, so this check names the
//   known ones rather than closing the class.
//
// Accepted false denies, each costing a rephrased command:
//
// - A write whose target is named like a secret, such as
//   `cp .env.example .env`, because a word is judged without knowing whether
//   the program reads or writes it.
// - A search term spelled exactly like a secret name, such as `rg .env src`.
// - A word holding a glob character that the source spells with a quote or
//   escape inside it, such as `"$(pwd)/*.key"`, because the word is probed
//   as a glob whenever it isn't written verbatim.
// - Every absolute path when the checkout sits under a `secrets` folder and
//   isn't a git repo, because only a repo has a toplevel to cut the folders
//   above it away.
// - A `~/` or `$HOME/` path into a checkout that sits under a `secrets`
//   folder, because the gate reads the word as written and never expands the
//   home directory, so the `secrets` folder above the repo shows.
// - A metadata program beside any command outside the allowed list, or
//   carrying an assignment, such as `ls -la .env | cat`, `cd x && stat .env`,
//   or `LC_ALL=C stat .env`, because the metadata pass then drops.
import { execFileSync } from "node:child_process";
import {
	existsSync,
	readdirSync,
	readFileSync,
	realpathSync,
	statSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	HARNESSES,
	readShellCall,
	resolveListedToolKind,
	writeStdout,
} from "./harnesses.mjs";
import { compileMatcher } from "./lib/match.mjs";
import { walkSegments } from "./lib/segments.mjs";
import { flattenCommand, tokenize } from "./lib/tokenize.mjs";

const ENV_KEYS_PATH = fileURLToPath(new URL("./env-keys.mjs", import.meta.url));
const RUNTIME_DIR = path.dirname(ENV_KEYS_PATH);
const CONFIG_FILE = ".ai-skills/config.json";
// Stand-ins for each secret name, used to ask whether a glob could match one.
const BASENAME_PROBES = [".env", ".env.local", "a.pem", "a.key"];
const GLOB_CHAR = /[*?[]/;
const URL_WORD = /^[a-z][a-z0-9+.-]*:\/\//i;
const KEY_SUFFIX = /.\.(pem|key)$/i;
const MAX_DEPTH = 6;
const MAX_EXPANSIONS = 64;
const MAX_GLOB_MATCHES = 2000;
const MAX_WALK = 5000;
// Shell words take only `/` as a separator, since a backslash in a bash word
// is a literal character, such as the `\.` in a quoted regex.
const SHELL_FORM = { backslashSeparates: false };
// Search options whose value is a filename glob, such as rg's `-g '.env*'`.
const FILTER_GLOB_FLAGS = new Set(["-g", "--glob", "--iglob", "--include"]);
// Programs whose every flag prints metadata and never a file's content.
const METADATA_PROGRAMS = new Set(["test", "[", "[[", "stat", "ls"]);
// Programs that print only their own arguments, allowed beside a metadata
// program because none can change what a later name runs.
const PRINTS_ARGUMENTS = new Set(["echo", "printf", "true", "false"]);
// `[[` comparisons that evaluate their operands as arithmetic, which can assign.
const ARITHMETIC_TESTS = new Set(["-eq", "-ne", "-lt", "-le", "-gt", "-ge"]);
const TEST_COMMANDS = new Set(["test", "[", "[["]);
// A function definition, in its `name ()` or `function name` form.
const DEFINES_FUNCTION = /\(\s*\)|(?:^|[\s;&|(){}`])function(?=\s)/;
// Events Cursor sends when it runs `.claude/settings.json`'s hooks beside its
// own. Claude Code never emits these camelCase names, so the claude arm
// declines a payload carrying one.
const CURSOR_EVENT_NAMES = new Set([
	"preToolUse",
	"postToolUse",
	"sessionStart",
	"sessionEnd",
	"beforeSubmitPrompt",
]);

/**
 * What one call knows about its repo: the git toplevel of its `cwd` spelled as
 * the `cwd` spells it and as git does, and the compiled `secretPaths`. `judge`
 * replaces it at the start of every call, and the process handles one call, so
 * the path helpers below read it as module state rather than taking it as an
 * argument.
 *
 * @type {{ roots: string[], extra: Array<(path: string) => boolean> }}
 */
let context = { roots: [], extra: [] };

/**
 * The deny text, with the remedy's path written relative to the call's `cwd`,
 * so the command it prints runs from wherever the agent is. The path is cut
 * from the real `cwd`, because the shell resolves `..` physically, and from
 * `.` when the `cwd` is the runtime directory itself.
 *
 * @param {string} cwd
 */
export function denyReason(cwd) {
	const runtime =
		path
			.relative(realPath(cwd) ?? cwd, RUNTIME_DIR)
			.split(path.sep)
			.join("/") || ".";

	return `Secret files stay unread. Run node ${runtime}/env-keys.mjs <file> for key names, or read .env.example.`;
}

/**
 * Reads the git toplevel of `cwd` and the `secretPaths` the config at it adds.
 *
 * @param {string} cwd
 */
function loadContext(cwd) {
	const toplevel = runGit(["rev-parse", "--show-toplevel"], cwd)?.trim() || null;
	if (toplevel === null) return { roots: [], extra: [] };

	const roots = [toplevel];
	try {
		// A `cwd` reached through a symlink spells the toplevel differently
		// from git, which prints the real path.
		const given = path.resolve(
			cwd,
			path.relative(realpathSync.native(cwd), toplevel)
		);
		if (given !== toplevel) roots.unshift(given);
	} catch {
		// a cwd that can't resolve leaves git's spelling alone
	}

	return { roots, extra: readSecretPaths(toplevel) };
}

/**
 * The matchers for `secretPaths` in the config at `toplevel`. An absent
 * config or key adds nothing. Any other value writes one stderr line and adds
 * nothing, so the built-in patterns still hold.
 *
 * @param {string} toplevel
 */
function readSecretPaths(toplevel) {
	let text;
	try {
		text = readFileSync(path.join(toplevel, CONFIG_FILE), "utf8");
	} catch {
		return [];
	}

	let list;
	try {
		list = JSON.parse(text)?.secretPaths;
	} catch {
		return warnSecretPaths();
	}
	if (list === undefined) return [];
	if (!Array.isArray(list) || !list.every((entry) => typeof entry === "string"))
		return warnSecretPaths();

	return list.map((entry) => compileMatcher(entry.toLowerCase()));
}

function warnSecretPaths() {
	process.stderr.write(
		`secrets-gate: secretPaths in ${CONFIG_FILE} is not a list of strings; using the built-in patterns.\n`
	);

	return [];
}

/**
 * True when a path names a secret file or folder.
 *
 * Splits on both separators by default, so a Windows path matches too. A bare
 * `secrets` word needs a separator to count, because it is far more often a
 * search term than a folder, and a URL never counts.
 *
 * @param {unknown} candidate
 * @param {{ backslashSeparates?: boolean }} [options]
 */
export function matchesSecretPath(
	candidate,
	{ backslashSeparates = true } = {}
) {
	if (typeof candidate !== "string" || candidate === "") return false;
	if (URL_WORD.test(candidate)) return false;

	const separator = backslashSeparates ? /[\\/]+/ : /\/+/;
	const segments = candidate.toLowerCase().split(separator).filter(Boolean);
	const base = segments.at(-1);
	if (base === undefined) return false;
	if (namesEnvFile(base) || KEY_SUFFIX.test(base)) return true;

	return separator.test(candidate) && segments.includes("secrets");
}

/**
 * @param {string} name
 */
function namesEnvFile(name) {
	const base = name.toLowerCase();
	return (
		base === ".env" || (base.startsWith(".env.") && base !== ".env.example")
	);
}

/**
 * Returns the deny reason for one tool call, or null when it may run.
 *
 * A shell call is whatever `readShellCall` recognizes. Any other call routes
 * by its `tool_name` against the harness row's `toolKinds`, and only a listed
 * read or search tool is judged.
 *
 * @param {string} tool
 * @param {import("./harnesses.mjs").HookPayload} payload
 * @returns {string | null}
 */
export function judge(tool, payload) {
	const shellCall = readShellCall(tool, payload);
	const kind = shellCall
		? "shell"
		: resolveListedToolKind(HARNESSES[tool], payload.tool_name);
	if (kind !== "shell" && kind !== "read" && kind !== "search") return null;

	const cwd =
		typeof payload.cwd === "string" && payload.cwd !== ""
			? payload.cwd
			: process.cwd();
	context = loadContext(cwd);
	const reason = denyReason(cwd);
	if (shellCall) {
		if (runsEnvKeys(shellCall.command, cwd)) return null;

		return judgeShell(shellCall.command, cwd) ? reason : null;
	}
	if (kind === "read") {
		const target = payload.tool_input?.file_path;
		return typeof target === "string" && target !== "" && pathDenies(target, cwd)
			? reason
			: null;
	}

	return grepDenies(payload.tool_input ?? {}, cwd) ? reason : null;
}

// --- Paths and globs ---

/**
 * True when a Read or Grep path names a secret as written, as resolved from
 * `cwd`, or through a glob that could match or does match a secret.
 *
 * @param {string} target
 * @param {string} cwd
 * @param {{ dotglob?: boolean }} [options]
 */
function pathDenies(target, cwd, { dotglob = false } = {}) {
	for (const variant of expandBraces(target)) {
		if (!path.isAbsolute(variant) && matchesSecretPath(variant)) return true;
		if (secretAt(path.resolve(cwd, variant))) return true;
		if (GLOB_CHAR.test(variant) && globDenies(variant, cwd, dotglob))
			return true;
	}

	return false;
}

/**
 * The repo-relative form of an absolute path, or the path itself when it sits
 * outside the call's repo, so a folder above the repo can't make every path
 * match.
 *
 * @param {string} absolute
 */
function repoForm(absolute) {
	for (const root of context.roots) {
		const relative = path.relative(root, absolute);
		if (
			relative !== ".." &&
			!relative.startsWith(`..${path.sep}`) &&
			!path.isAbsolute(relative)
		)
			return relative === "" ? "." : relative;
	}

	return absolute;
}

/**
 * True when an absolute path, or the file it resolves to, is a secret in its
 * repo-relative form: one of the built-in shapes, or one of the config's
 * `secretPaths`, which match the lowercased repo-relative path with a `/`
 * separator.
 *
 * @param {string} absolute
 * @param {{ backslashSeparates?: boolean }} [options]
 */
function secretAt(absolute, options) {
	if (namesSecret(absolute, options)) return true;

	let resolved;
	try {
		resolved = realpathSync.native(absolute);
	} catch {
		return false;
	}

	return resolved !== absolute && namesSecret(resolved, options);
}

/**
 * @param {string} absolute
 * @param {{ backslashSeparates?: boolean }} [options]
 */
function namesSecret(absolute, options) {
	const form = repoForm(absolute);
	if (matchesSecretPath(form, options)) return true;
	if (form === absolute) return false;

	const lowered = form.split(path.sep).join("/").toLowerCase();
	return context.extra.some((matches) => matches(lowered));
}

/**
 * True when a glob could match a secret name, or expands on disk to a secret
 * path. A segment with no literal character, such as `*`, says nothing about
 * what it matches, so only its expansion is judged. A null `cwd` skips the
 * expansion of a relative glob.
 *
 * @param {string} pattern
 * @param {string | null} cwd
 * @param {boolean} dotglob
 */
function globDenies(pattern, cwd, dotglob) {
	const segments = pattern.split(/[\\/]+/);
	const last = segments.length - 1;
	for (const [index, segment] of segments.entries()) {
		if (!GLOB_CHAR.test(segment) || !/[^*?[\]]/.test(segment)) continue;

		const regex = segmentRegex(segment, dotglob);
		const probes =
			index === last
				? [...BASENAME_PROBES, ...(last > 0 ? ["secrets"] : [])]
				: ["secrets"];
		if (probes.some((probe) => regex.test(probe))) return true;
	}
	if (cwd === null && !path.isAbsolute(pattern)) return false;

	return expandGlob(pattern, cwd, dotglob).some((match) => secretAt(match));
}

/**
 * Converts one glob segment to a regex. Without `dotglob`, a segment that
 * doesn't start with a literal `.` never matches a dotfile, as in bash.
 * Throws on a class bash would read but a regex can't, such as `[z-a]`.
 *
 * @param {string} segment
 * @param {boolean} dotglob
 * @returns {RegExp}
 */
function segmentRegex(segment, dotglob) {
	let source = "";
	for (let i = 0; i < segment.length; i += 1) {
		const c = segment[i];
		if (c === "*") source += ".*";
		else if (c === "?") source += ".";
		else if (c === "[" && segment.indexOf("]", i + 2) !== -1) {
			const close = segment.indexOf("]", i + 2);
			const body = segment.slice(i + 1, close).replace(/^!/, "^");
			source += `[${body.replace(/\\/g, "\\\\")}]`;
			i = close;
		} else source += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
	}
	const hidden = dotglob || segment.startsWith(".") ? "" : "(?!\\.)";

	return new RegExp(`^${hidden}${source}$`);
}

/**
 * Absolute paths a glob matches from `cwd`, capped so a wide tree stays cheap.
 *
 * @param {string} pattern
 * @param {string | null} cwd
 * @param {boolean} dotglob
 * @returns {string[]}
 */
function expandGlob(pattern, cwd, dotglob) {
	const segments = pattern.split(/[\\/]+/);
	/** @type {string[]} */
	let bases = [path.isAbsolute(pattern) ? path.parse(pattern).root : (cwd ?? "")];
	for (const segment of segments) {
		if (segment === "") continue;

		/** @type {string[]} */
		const next = [];
		for (const base of bases) {
			if (!GLOB_CHAR.test(segment)) {
				next.push(path.join(base, segment));
				continue;
			}

			const regex = segmentRegex(segment, dotglob);
			for (const name of listDir(base))
				if (regex.test(name)) next.push(path.join(base, name));
		}
		bases = next.slice(0, MAX_GLOB_MATCHES);
	}

	return bases;
}

/**
 * @param {string} dir
 * @returns {string[]}
 */
function listDir(dir) {
	try {
		return readdirSync(dir);
	} catch {
		return [];
	}
}

/**
 * Returns the brace expansions of a word, `a{b,c}` as `ab` and `ac`, and
 * `a{1..3}` as `a1`, `a2`, `a3`, stopping after `MAX_EXPANSIONS` forms. A word
 * with no brace group returns itself.
 *
 * @param {string} word
 * @param {{ left: number }} [budget]
 * @returns {string[]}
 */
function expandBraces(word, budget = { left: MAX_EXPANSIONS }) {
	const group = findBraceGroup(word);
	if (!group) return [word];

	/** @type {string[]} */
	const forms = [];
	for (const choice of group.choices) {
		if (budget.left <= 0) break;

		budget.left -= 1;
		const expanded =
			word.slice(0, group.start) + choice + word.slice(group.end);
		forms.push(...expandBraces(expanded, budget));
	}

	return forms;
}

/**
 * Finds the first brace group holding a top-level comma or a `..` sequence,
 * and skips a group with neither, such as the `{PWD}` in `${PWD}`. Returns its
 * bounds and its choices, or null when there is none.
 *
 * @param {string} word
 * @returns {{ start: number, end: number, choices: string[] } | null}
 */
function findBraceGroup(word) {
	let start = word.indexOf("{");
	while (start !== -1) {
		const end = findClosingBrace(word, start);
		if (end === -1) return null;

		const choices =
			splitTopLevelCommas(word.slice(start + 1, end)) ??
			expandSequence(word.slice(start + 1, end));
		if (choices) return { start, end: end + 1, choices };

		start = word.indexOf("{", start + 1);
	}

	return null;
}

/**
 * @param {string} word
 * @param {number} start
 * @returns {number}
 */
function findClosingBrace(word, start) {
	let depth = 0;
	for (let i = start; i < word.length; i += 1) {
		if (word[i] === "{") depth += 1;
		else if (word[i] === "}" && --depth === 0) return i;
	}

	return -1;
}

/**
 * Splits brace contents at commas outside nested braces, or returns null.
 *
 * @param {string} inside
 * @returns {string[] | null}
 */
function splitTopLevelCommas(inside) {
	/** @type {string[]} */
	const choices = [];
	let depth = 0;
	let from = 0;
	for (let i = 0; i < inside.length; i += 1) {
		if (inside[i] === "{") depth += 1;
		else if (inside[i] === "}") depth -= 1;
		else if (inside[i] === "," && depth === 0) {
			choices.push(inside.slice(from, i));
			from = i + 1;
		}
	}
	if (choices.length === 0) return null;

	choices.push(inside.slice(from));
	return choices;
}

/**
 * Expands `1..3` or `a..c`, ignoring any step and any zero padding, or
 * returns null.
 *
 * @param {string} inside
 * @returns {string[] | null}
 */
function expandSequence(inside) {
	const numbers = /^(-?\d+)\.\.(-?\d+)(?:\.\.-?\d+)?$/.exec(inside);
	const letters = /^(.)\.\.(.)(?:\.\.-?\d+)?$/.exec(inside);
	if (!numbers && !letters) return null;

	const [from, to] = numbers
		? [Number(numbers[1]), Number(numbers[2])]
		: [
				(letters?.[1] ?? "").charCodeAt(0),
				(letters?.[2] ?? "").charCodeAt(0),
			];
	const step = from <= to ? 1 : -1;
	/** @type {string[]} */
	const choices = [];
	for (let n = from; choices.length < MAX_EXPANSIONS; n += step) {
		choices.push(numbers ? String(n) : String.fromCharCode(n));
		if (n === to) break;
	}

	return choices;
}

// --- Grep arm ---

/**
 * True when a Grep call names a secret, or searches a root whose
 * gitignore-visible files include one.
 *
 * @param {{ path?: string, glob?: string }} input
 * @param {string} cwd
 */
function grepDenies(input, cwd) {
	if (input.path && pathDenies(input.path, cwd, { dotglob: true })) return true;
	if (input.glob && globNamesSecret(input.glob)) return true;

	return rootHoldsVisibleSecret(path.resolve(cwd, input.path ?? "."));
}

/**
 * True when a Grep `glob` could select a secret file, with no disk check.
 *
 * @param {string} glob
 */
function globNamesSecret(glob) {
	return expandBraces(glob).some((variant) => {
		if (matchesSecretPath(variant)) return true;

		const base = variant.split(/[\\/]+/).at(-1) ?? "";
		if (!/[^*?[\]]/.test(base)) return false;

		const regex = segmentRegex(base, true);
		return BASENAME_PROBES.some((probe) => regex.test(probe));
	});
}

/**
 * @param {string} root
 */
function rootHoldsVisibleSecret(root) {
	let gitCwd = root;
	try {
		if (!statSync(root).isDirectory()) gitCwd = path.dirname(root);
	} catch {
		return false;
	}

	const listing = runGit(
		["ls-files", "-co", "--exclude-standard", "--", root],
		gitCwd
	);
	if (listing === null) return false;
	if (
		listing
			.split("\n")
			.some((file) => file !== "" && secretAt(path.resolve(gitCwd, file)))
	)
		return true;

	return (
		runGit(["check-ignore", "-q", "--", root], gitCwd) !== null &&
		walkFindsSecret(root)
	);
}

/**
 * True when a secret path sits at or under `root` on disk. Skips `.git` and
 * stops after `MAX_WALK` entries, passing a tree too wide to finish.
 *
 * @param {string} root
 */
function walkFindsSecret(root) {
	const pending = [root];
	let seen = 0;
	while (pending.length > 0 && seen < MAX_WALK) {
		const current = /** @type {string} */ (pending.pop());
		if (secretAt(current)) return true;

		let entries;
		try {
			entries = readdirSync(current, { withFileTypes: true });
		} catch {
			continue;
		}
		for (const entry of entries) {
			seen += 1;
			if (entry.name === ".git") continue;

			const full = path.join(current, entry.name);
			if (entry.isDirectory()) pending.push(full);
			else if (secretAt(full)) return true;
		}
	}

	return false;
}

/**
 * Runs git and returns its stdout, or null when it exits non-zero or fails.
 *
 * @param {string[]} args
 * @param {string} cwd
 * @returns {string | null}
 */
function runGit(args, cwd) {
	try {
		return execFileSync("git", args, {
			cwd,
			encoding: "utf8",
			maxBuffer: 256 * 1024 * 1024,
			stdio: ["ignore", "pipe", "ignore"],
		});
	} catch {
		return null;
	}
}

// --- Shell arm ---

/**
 * True when the command is exactly `node <script> <file>`: three bare words,
 * no operator, no substitution, and no heredoc, where the script is this
 * runtime's own `env-keys.mjs`.
 *
 * @param {string} command
 * @param {string} cwd
 */
function runsEnvKeys(command, cwd) {
	let parsed;
	try {
		parsed = tokenize(command);
	} catch {
		return false;
	}
	if (parsed.tokens.length !== 3 || parsed.operators.size > 0) return false;
	if (parsed.substitutions.length > 0 || parsed.bodies.size > 0) return false;
	if (parsed.tokens[0] !== "node") return false;

	const script = realPath(path.resolve(cwd, parsed.tokens[1]));
	return script !== null && script === realPath(ENV_KEYS_PATH);
}

/**
 * @param {string} target
 * @returns {string | null}
 */
function realPath(target) {
	try {
		return realpathSync.native(target);
	} catch {
		return null;
	}
}

/**
 * True when any simple command in the shell command reads a secret path.
 *
 * @param {string} command
 * @param {string} cwd
 */
function judgeShell(command, cwd) {
	const { segments } = walkSegments(command, { cwd, maxDepth: MAX_DEPTH });
	const spelling = { command, words: segments.flatMap(({ words }) => words) };
	/**
	 * @param {import("./lib/segments.mjs").Segment} segment
	 * @param {string} written
	 */
	const deniesIn = (segment, written) =>
		wordDenies(
			stripSubstitutions(written, segment.substitutions),
			segment.cwd,
			spelling
		);
	const source = [
		command,
		...segments.map((segment) => segment.words.join(" ")),
	].join("\n");
	const metadataOnly =
		!DEFINES_FUNCTION.test(source) && segments.every(staysMetadata);
	/** @param {import("./lib/segments.mjs").Segment} segment */
	const readsSecret = (segment) =>
		metadataOnly && printsMetadataOnly(segment.argv)
			? segment.redirects.some(({ target }) => deniesIn(segment, target))
			: readFilterGlobs(segment.argv).some(filterGlobDenies) ||
				segment.words.some((written) => deniesIn(segment, written));

	return segments.some(readsSecret);
}

/**
 * True for a command that prints a file's existence, size, or ignore status
 * and never its content, so naming a secret in its arguments reads nothing.
 * The name must be bare, since a path can name any program.
 *
 * @param {string[]} argv
 */
function printsMetadataOnly(argv) {
	const name = argv[0];
	return (
		METADATA_PROGRAMS.has(name) ||
		(name === "git" && argv[1] === "check-ignore")
	);
}

/**
 * True for a segment that can't change which program a later name runs: a
 * metadata program, or one that prints only its arguments, with no
 * assignment. `printf -v` assigns, so it doesn't count. A segment of only
 * reserved words passes.
 *
 * An argument can assign too. A `${name:=value}` expansion or a `$[…]`
 * arithmetic expansion does it in any word. `[[` evaluates the operands of
 * its arithmetic comparisons, so `[[ 1 -eq PATH=0 ]]` sets `PATH`, and a
 * `-v` test evaluates an array subscript, as in `[ -v "a[PATH=0]" ]`.
 * `printf` evaluates a numeric argument the same way, as zsh's
 * `printf "%d" PATH=0` does.
 *
 * @param {{ argv: string[], words: string[], assignments: string[] }} segment
 */
function staysMetadata({ argv, words, assignments }) {
	if (assignments.length > 0) return false;
	if (words.some((word) => word.includes("${") || word.includes("$[")))
		return false;
	if (argv[0] === "[[" && argv.some((word) => ARITHMETIC_TESTS.has(word)))
		return false;
	if (TEST_COMMANDS.has(argv[0]) && testsArraySubscript(argv)) return false;
	if (argv.length === 0 || printsMetadataOnly(argv)) return true;
	if (argv[0] === "printf")
		return (
			!argv[1]?.startsWith("-v") &&
			!argv.slice(2).some((word) => word.includes("="))
		);

	return PRINTS_ARGUMENTS.has(argv[0]);
}

/**
 * True when a `-v` test names an array element, whose subscript the shell evaluates.
 *
 * @param {string[]} argv
 */
function testsArraySubscript(argv) {
	return argv.some(
		(word, i) => word === "-v" && argv[i + 1]?.includes("[") === true
	);
}

/**
 * The filename globs a search command filters on, from `-g`, `--glob`,
 * `--iglob`, and `--include`, as a separate word, after `=`, or attached to
 * `-g`. An `--iglob` value is lowercased to match case-insensitively.
 *
 * @param {string[]} argv
 * @returns {string[]}
 */
function readFilterGlobs(argv) {
	const globs = [];
	for (const [i, word] of argv.entries()) {
		const flag = word.split("=")[0];
		let value;
		if (FILTER_GLOB_FLAGS.has(word)) value = argv[i + 1];
		else if (word.includes("=") && FILTER_GLOB_FLAGS.has(flag))
			value = word.slice(flag.length + 1);
		else if (/^-g[^-]/.test(word)) value = word.slice(2);
		if (typeof value !== "string") continue;

		globs.push(flag === "--iglob" ? value.toLowerCase() : value);
	}

	return globs;
}

/**
 * `globNamesSecret` for one filter glob, skipping a glob that won't compile.
 *
 * @param {string} glob
 */
function filterGlobDenies(glob) {
	try {
		return globNamesSecret(glob);
	} catch {
		return false;
	}
}

/**
 * Removes the flattened words of each substitution from a word, leaving the
 * literal text around it. `"$(pwd)/.env"` becomes `/.env`, while the
 * substitution itself is judged as its own command.
 *
 * @param {string} word
 * @param {string[]} substitutions
 */
function stripSubstitutions(word, substitutions) {
	let literal = word;
	for (const inner of substitutions) {
		const flat = flattenCommand(inner);
		if (literal.includes(flat)) literal = literal.split(flat).join("");
	}

	return literal.trim();
}

/**
 * True when a word, the value after its first `=`, or the path after its
 * first `:` is a secret path.
 *
 * A word holding a blank is usually prose, such as a commit message, so it
 * counts only when it names a file that exists. A word whose glob won't
 * compile is skipped rather than failing the whole command open.
 *
 * @param {string} word
 * @param {string | null} cwd
 * @param {{ command: string, words: string[] }} source
 */
function wordDenies(word, cwd, source) {
	if (word === "" || URL_WORD.test(word)) return false;
	if (/\s/.test(word)) {
		if (cwd === null) return false;

		const absolute = path.resolve(cwd, word);
		return existsSync(absolute) && secretAt(absolute, SHELL_FORM);
	}

	try {
		if (shellPathDenies(word, cwd, source)) return true;
		for (const cut of ["=", ":"]) {
			const at = word.indexOf(cut);
			if (at !== -1 && shellPathDenies(word.slice(at + 1), cwd, source))
				return true;
		}
	} catch {
		return false;
	}

	return false;
}

/**
 * True when one shell word names a secret as written or as resolved from
 * `cwd`, or is an unquoted glob that could match or does match one.
 *
 * @param {string} word
 * @param {string | null} cwd
 * @param {{ command: string, words: string[] }} source
 */
function shellPathDenies(word, cwd, source) {
	const globbing = GLOB_CHAR.test(word) && !quotedInSource(word, source);
	for (const variant of expandBraces(word)) {
		if (literalDenies(variant, cwd)) return true;
		if (globbing && GLOB_CHAR.test(variant) && globDenies(variant, cwd, false))
			return true;
	}

	return false;
}

/**
 * True when a literal word names a secret path. A bare word whose only
 * secret shape is a `.pem` or `.key` suffix counts only when the file exists,
 * so `event.key` in a jq filter passes.
 *
 * @param {string} word
 * @param {string | null} cwd
 */
function literalDenies(word, cwd) {
	const absolute = path.isAbsolute(word)
		? word
		: cwd === null
			? null
			: path.resolve(cwd, word);
	const named =
		(!path.isAbsolute(word) && matchesSecretPath(word, SHELL_FORM)) ||
		(absolute !== null && secretAt(absolute, SHELL_FORM));
	if (!named) return false;

	const bareSuffix =
		!word.includes("/") && KEY_SUFFIX.test(word) && !namesEnvFile(word);
	if (!bareSuffix) return true;

	return absolute !== null && existsSync(absolute);
}

/**
 * True when every copy of `word` in the call sits wrapped in a quote. A copy
 * of the word the command never spells verbatim had a quote or escape inside
 * it, and a glob character outside that quote still expands, so the word reads
 * as unquoted: `".env"*` and `'.e'nv*` are probed as globs. So does a word the
 * segments hold more copies of than the command spells, as in
 * `echo '.en*'; cat .en''*`.
 *
 * @param {string} word
 * @param {{ command: string, words: string[] }} source
 */
function quotedInSource(word, { command, words }) {
	let spelled = 0;
	for (
		let at = command.indexOf(word);
		at !== -1;
		at = command.indexOf(word, at + 1)
	) {
		const before = command[at - 1];
		const after = command[at + word.length];
		const wrapped = (before === "'" || before === '"') && after === before;
		if (!wrapped) return false;

		spelled += 1;
	}

	return (
		spelled > 0 && words.filter((held) => held === word).length <= spelled
	);
}

// --- Entry ---

/**
 * Parses `--key=value` argv tokens into a flat object. A bare flag is
 * ignored, so an unknown flag never breaks the fail-open contract.
 *
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
 * @param {string} stdin
 */
function main(argv, stdin) {
	const { tool } = parseArgs(argv);
	if (!Object.hasOwn(HARNESSES, tool)) {
		process.stderr.write(
			`secrets-gate: unknown or missing --tool "${tool}", exiting fail-open\n`
		);
		return;
	}

	const payload = JSON.parse(stdin);
	if (tool === "claude" && CURSOR_EVENT_NAMES.has(payload?.hook_event_name))
		return;

	const reason = judge(tool, payload);
	if (reason === null) return;

	// A host with no observed deny envelope answers nothing.
	const reply = HARNESSES[tool].emitDeny(reason);
	if (reply !== null) writeStdout(reply);
}

// Runs only as the entry module. It compares real paths, because Node resolves
// symlinks for import.meta.url, and a hook path reached through a link would
// otherwise never run.
if (
	process.argv[1] &&
	realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	try {
		main(process.argv.slice(2), readFileSync(0, "utf8"));
	} catch (err) {
		try {
			process.stderr.write(
				`secrets-gate: ${err instanceof Error ? err.message : String(err)}\n`
			);
		} catch {
			// stderr itself failing leaves nothing more to do
		}
	}
}
// Deliberately no process.exit(): exit() doesn't wait for a pending stdout
// write to flush, and every throwing path above is already caught, so
// falling off the end exits 0 with the payload drained.
