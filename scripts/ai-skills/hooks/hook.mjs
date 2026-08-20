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
 * Every safety check lives in this script, never in a host's registration
 * matcher — a matcher-less harness would otherwise silently inherit nothing.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	ARCHITECT_DIR_PREFIX,
	findRepoRoot,
	MAX_EMISSION_BYTES,
	checkPathIsRouted,
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
 * The characters a command may contain and still be considered for read
 * credit: letters, digits, `_ . / - @ + = , : ~`, both quote characters (so
 * `unquote` keeps working), and space and tab as the only separators. A
 * command carrying anything else parses to zero targets.
 *
 * The direction matters more than the contents. This was a deny-list of shell
 * metacharacters, and the enumeration escaped twice inside the single PR that
 * wrote it — `\n` was missing, so a multi-line command whose first line was a
 * bare `cat` credited every bare token on every later line as fully read, and
 * `#` was added in the same pass. Two escapes from one enumeration is a defect
 * in the shape rather than two defects in the contents.
 *
 * An allow-list fails the other way. A miss on a deny-list marks an unread
 * document read and opens the write gate on it; a miss on an allow-list costs
 * one re-read. Every other credit judgment in this channel already resolves
 * that direction — `{ credit: false }` by default, only `cat` credits, a
 * flagged `cat` does not — and this was the last place resolved the other way.
 *
 * What the class refuses, none of it individually enumerated: `$VAR` and
 * `${…}`, backslash escapes, globs, brace expansion, `!` history expansion,
 * `#`, every pipeline and redirect form, and whatever metacharacter the next
 * shell introduces. What it costs: a path carrying a space, a `%`, or a
 * non-ASCII character stops crediting.
 *
 * Line breaks are the one exception, and they are handled before this class
 * sees anything: `splitShellSegments` cuts on them, and each resulting
 * segment is tested on its own. A multi-line command is several commands, not
 * one unparseable one.
 *
 * @type {RegExp}
 */
const SHELL_READ_SAFE_CHARACTERS = /^[\w./@+=,:~"' \t-]*$/;

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
 * guess: every command form carrying a character outside
 * `SHELL_READ_SAFE_CHARACTERS`, which covers pipelines, redirects,
 * substitution, globs, and variable expansion in one rule; `xargs` and any
 * other command that names its files indirectly; and paths containing spaces,
 * since splitting on whitespace cannot recover them even when they are quoted.
 *
 * Each segment is judged on its own, so one unparseable segment costs only
 * itself. `cat a.md` on one line and `echo $VAR` on the next credits `a.md`
 * and drops the second, rather than refusing both.
 *
 * @param {string | undefined} command
 * @returns {{filePath: string, credit: boolean}[]}
 */
export function parseShellReadTargets(command) {
	if (typeof command !== "string" || command.trim().length === 0) {
		return [];
	}

	const targets = [];
	for (const tokens of splitShellSegments(command, SHELL_SEQUENTIAL_BOUNDARIES)) {
		targets.push(...parseSegmentReadTargets(tokens));
	}

	return targets;
}

/**
 * One command segment's read targets, or an empty array when the segment
 * carries anything outside `SHELL_READ_SAFE_CHARACTERS` or names a command
 * that does not read a file.
 *
 * The safe-character test runs per token rather than over the raw command,
 * because the segment split has already consumed the separators. Every
 * metacharacter the class refuses still sits inside some token — a `|`, a
 * `>`, a `$VAR` — so a segment carrying one still parses to nothing.
 *
 * @param {string[]} tokens
 * @returns {{filePath: string, credit: boolean}[]}
 */
function parseSegmentReadTargets(tokens) {
	if (!tokens.every((token) => SHELL_READ_SAFE_CHARACTERS.test(token))) {
		return [];
	}

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

/** Tokens that end one command and start the next, so a `tee` or `sed -i` stops claiming operands at them.
 * @type {Set<string>}
 */
const SHELL_SEGMENT_BOUNDARIES = new Set(["|", "||", "&&", ";", "&"]);

/**
 * The boundaries a read may be credited across — the ones after which the
 * next command runs unconditionally and prints to the same transcript.
 *
 * Only `;` qualifies, and the omissions are the whole point. `|` sends the
 * first command's output to the second instead of to the model, so crediting
 * `cat doc | head -5` would mark a document fully read on five lines of it.
 * `&&` and `||` are conditional — the second command may never have run — and
 * `&` backgrounds. Each of those still fails the per-token safe-character
 * test inside its own segment, so the segment yields nothing rather than a
 * guess.
 *
 * Line breaks are not members of either set. `splitShellSegments` splits on
 * them unconditionally, because a newline separates commands under every
 * shell and adding `"\n"` here would be inert anyway — the whitespace split
 * consumes it before any token could equal it.
 *
 * @type {Set<string>}
 */
const SHELL_SEQUENTIAL_BOUNDARIES = new Set([";"]);

/**
 * Splits a raw command into one token array per command segment, cutting at
 * every line break and at each of `boundaries`.
 *
 * Both detectors run on this rather than tokenizing the raw command
 * themselves. The write detector needs the boundaries so a `tee` stops
 * claiming operands at the end of its own command; the read detector needs
 * them so a remedy pasted as several lines into one call credits each line.
 * A shared splitter is what keeps those two answers from drifting: the write
 * arm previously treated a newline as ordinary whitespace and claimed the
 * next line's tokens, while the read arm refused the same command outright.
 *
 * @param {string} command
 * @param {Set<string>} boundaries
 * @returns {string[][]}
 */
function splitShellSegments(command, boundaries) {
	const segments = [];
	let current = [];

	for (const line of command.split(/[\n\r]+/)) {
		for (const token of line.trim().split(/\s+/)) {
			if (token.length === 0) {
				continue;
			}

			if (boundaries.has(token)) {
				if (current.length > 0) {
					segments.push(current);
					current = [];
				}
				continue;
			}

			current.push(token);
		}

		if (current.length > 0) {
			segments.push(current);
			current = [];
		}
	}

	return segments;
}

/** Commands that write the files they name, when carrying the flag that makes them do so.
 * @type {Set<string>}
 */
const SHELL_WRITE_COMMANDS = new Set(["tee", "sed"]);

/**
 * Extracts the paths a shell command writes to, across exactly five forms:
 * `>`, `>>`, `tee`, `tee -a`, and `sed -i`.
 *
 * This cannot reuse `SHELL_READ_SAFE_CHARACTERS` — `>` sits outside that class
 * by construction, which is the whole point of the class — so it admits those
 * five as its only metacharacters. It shares `unquote` and
 * `splitShellSegments` with `parseShellReadTargets` and nothing else. Keeping
 * both in one function family is what stops the write detector from growing a
 * second, looser notion of what a safe command looks like — and the shared
 * splitter is what keeps the two arms answering the same question about where
 * one command ends.
 *
 * Deliberately open gaps, each of which yields no target rather than a guess:
 * word-prefixed redirects (`echo hello>f`, where the `>` abuts the preceding
 * token), `python -c` and every other interpreter writing through its own
 * runtime, and `cp` / `mv` / `dd`. The remedy this feeds judges no
 * prerequisites at all, so an unparsed write is simply not rerouted — deny
 * what you can parse, and where you cannot, stay out of the way.
 *
 * A non-flag operand that is not a path — `sed`'s script, `tee`'s `-a` value
 * if one is ever written detached — rides along as a target no manifest route
 * can match, the same trade `parseShellReadTargets` already makes rather than
 * teaching the parser each command's operand grammar.
 *
 * @param {string | undefined} command
 * @returns {string[]}
 */
export function parseShellWriteTargets(command) {
	if (typeof command !== "string" || command.trim().length === 0) {
		return [];
	}

	const targets = [];
	for (const tokens of splitShellSegments(command, SHELL_SEGMENT_BOUNDARIES)) {
		targets.push(...parseSegmentWriteTargets(tokens));
	}

	return targets.filter((target) => target.length > 0);
}

/**
 * One command segment's write targets. The segment's first token decides
 * whether its later operands are written to, so this cannot run over a whole
 * multi-command string — a `tee` in the first segment would claim the second
 * segment's filenames and produce a reroute naming a path the command only
 * reads.
 *
 * @param {string[]} tokens
 * @returns {string[]}
 */
function parseSegmentWriteTargets(tokens) {
	const targets = [];
	let segmentCommand = null;
	let segmentWrites = false;

	for (let index = 0; index < tokens.length; index++) {
		const token = tokens[index];

		if (token === ">" || token === ">>") {
			const operand = tokens[index + 1];
			if (operand !== undefined) {
				targets.push(unquote(operand));
				index++;
			}
			continue;
		}

		if (token.startsWith(">")) {
			targets.push(unquote(token.replace(/^>>?/, "")));
			continue;
		}

		if (segmentCommand === null) {
			segmentCommand = token;
			// `sed` writes only in place. `tee` writes on every invocation, so
			// `tee -a` needs no separate case — the append flag changes how it
			// writes, not whether it does.
			segmentWrites =
				token === "tee" ||
				(token === "sed" && checkInPlaceFlag(tokens, index + 1));
			continue;
		}

		if (
			segmentWrites &&
			SHELL_WRITE_COMMANDS.has(segmentCommand) &&
			!token.startsWith("-")
		) {
			targets.push(unquote(token));
		}
	}

	return targets;
}

/**
 * True when the tokens from `start` onward carry `sed`'s in-place flag, in
 * any of its spellings — `-i`, `-i.bak`, `-ni`, `--in-place`.
 *
 * The scan runs to the end of the array because `splitShellSegments` has
 * already cut the command at its boundaries, so a later pipeline stage's
 * `-i` is in a different array and cannot make an earlier read-only `sed`
 * look like a write.
 *
 * @param {string[]} tokens
 * @param {number} start
 * @returns {boolean}
 */
function checkInPlaceFlag(tokens, start) {
	for (let index = start; index < tokens.length; index++) {
		const token = tokens[index];
		if (/^--in-place/.test(token) || /^-[a-zA-Z]*i/.test(token)) {
			return true;
		}
	}

	return false;
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
 * The shell-write reroute's message. It judges no prerequisites at all,
 * which is what makes it impossible to render unsatisfiable — the model is
 * pointed at a surface the gate can actually check rather than told to
 * satisfy a condition through a channel that cannot report satisfying it.
 *
 * @param {string} relativePath
 * @returns {string}
 */
export function formatShellRerouteMessage(relativePath) {
	return `You're writing to \`${relativePath}\` via a shell write — redo this edit with your file-edit tool so the gate can check its prerequisites.`;
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
 * The reroute reason for a shell command writing to a routed path, or `null`
 * when it writes nowhere routed. Operands resolve against the command's own
 * working directory, the same way `resolveTargets` resolves a shell read.
 *
 * @param {string} repoRoot
 * @param {string} cwd
 * @param {import("./harnesses.mjs").HookPayload} payload
 * @returns {Promise<string | null>}
 */
async function resolveShellRerouteReason(repoRoot, cwd, payload) {
	for (const target of parseShellWriteTargets(payload.tool_input?.command)) {
		const absolutePath = path.resolve(cwd, target);
		if (!(await checkPathIsRouted(repoRoot, absolutePath))) {
			continue;
		}

		const relativePath = toRepoRelativePath(repoRoot, absolutePath) ?? target;
		return formatShellRerouteMessage(relativePath);
	}

	return null;
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
