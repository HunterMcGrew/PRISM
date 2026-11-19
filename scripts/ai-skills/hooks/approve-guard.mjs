#!/usr/bin/env node
// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
//
// Approval guard. Approving a plan-chain file is a human step, done by a
// person running `node <rel> <path>` in their own terminal, or by typing
// `approve` in chat. `<rel>` is `plan/approve.mjs` beside this file, spelled
// from the repo root, so the texts below hold in PRISM's tree and in a
// consumer's. This hook denies an agent the ways around that: running
// approve.mjs with no chat approval, changing a chain file's `status`,
// `approved_by`, or `approved_at` line with a file-edit tool, and writing the
// chat approval token itself. One script serves Claude Code and Codex, and
// each registration passes `--tool=<harness>` to pick its `HARNESSES` row.
//
// It is its own entry point and never reads `PRISM_HOOK_DISABLE` or
// `PRISM_HOOK_DENY_DISABLE`. `hook.mjs` checks both switches before it parses
// stdin, and an approval path an agent can turn off is not a control.
//
// A session in a git worktree runs whatever copy its hook command names, which
// resolves through the directory the session started in, usually the main
// checkout. When the payload's `cwd` sits in another worktree of the same
// repository that holds its own copy at the same path, this copy hands the
// event to that one and passes its output through, so the guard and the
// `approve.mjs` it names are always the session's own. A session checkout with
// no copy, or a checkout of a different repository, runs this one.
//
// Chat approval has a prompt arm, run on the harness's prompt-submit event
// (`promptEvent` in each row, passed as `--event`). When the person approves in
// a prompt, as `parseApprovePrompt` reads it, it writes the token
// `plan/chat-approval.mjs` describes, holding the time, the session id, the
// file when the prompt names one, and a hash of every chain artifact. The
// execution arm then lets exactly `node <this repo's plan/approve.mjs> <path>`
// through, as one bare command, when an unused token from the same session
// exists, however old. approve.mjs takes the token, checks it again, and
// refuses a file edited since. The token arm runs before anything else. It
// reads a shell command the way the execution arm does, with the token file
// name and the prompt event names standing in for the script name, so a
// read-only command such as `grep UserPromptSubmit .claude/settings.json`
// passes, and running the prompt arm by hand, or feeding it a payload down a
// pipe, is denied. It also denies any file-edit call whose target names the
// token file.
//
// It is an accident backstop, not a sandbox. It stops accidental and casual
// runs of approve.mjs and accidental edits to the approval lines. A determined
// agent can get past it, with `sed -i` on the frontmatter or a shape from the
// known misses below. The real control is the person reading the commit that
// carries `approved_by`. The parser is frozen, so a new bypass shape goes on
// the known-miss list rather than into the tokenizer. The prompt and
// execution arms are the one exception to the freeze: under the approve-once
// rule the prompt arm records each chain artifact's hash, and the execution
// arm no longer checks the token's age.
//
// The execution arm fails closed. It tokenizes the command, splits it into
// segments at control operators, and judges each segment by its command word,
// the first word left after leading `VAR=val` assignments, shell reserved
// words, and redirections with their targets. A word names approve.mjs when it,
// or any brace expansion of it, contains `approve.mjs` with no letter, digit,
// `_`, or `-` before it, or contains both `approve` and a glob character
// (`*?[{`), ignoring case. A word holding shell syntax is also tokenized again
// and its own words checked, so `$'appr\x6fve.mjs'` and `bash -c` strings
// count. A segment that names approve.mjs is denied unless its command word is
// on `READ_ONLY_COMMANDS`, so `git add plan/approve.mjs`, `grep
// approve.mjs`, and commit or PR heredocs that mention the command go through.
// A read-only segment is still denied when a leading assignment names the
// script (`GIT_PAGER=…`), or when it names the script outside a heredoc body
// and writes a file, which is how `cat approve.mjs > x.mjs` copies it.
//
// Output carries the name down a pipe. A segment fed by an upstream segment
// that named the script, heredoc bodies included, is judged as if it named it,
// so `… | xargs node` and `… | bash` are denied. A read-only command passes
// tainted unless it writes a file. `sort`, `uniq`, and `jq` (`PIPE_FILTERS`)
// pass tainted unless they name the script, redirect to a file, or take an
// argument that writes or runs one (`sort -o`, `sort --compress-program` or
// its `--co` prefix, a second `uniq` operand). A `sort` or `uniq` argument
// holding a brace, `$`, or backtick is denied, since it can expand into one. A `{ }`, `( )`, or compound command passes
// everything its inner segments named to a pipe after it.
//
// Every command substitution, `$( … )`, `<( … )`, `>( … )`, or backticks
// outside single quotes and quoted heredocs, is checked again as a command of
// its own, and its words also count as words of the command around it. A
// command that defines a function or alias, sources a file, or changes `PATH`
// or bash's command hash can make a read-only name run something else, so
// none of its words counts as read-only. A command holding a carriage return
// is denied when it contains `approve`, because bash reads `\r` as part of a
// word and a mismatch there hides the next command. A command the tokenizer
// can't read is denied when it contains `approve`, and allowed otherwise.
// Codex's `apply_patch` reached through its shell runs nothing, so its patch
// text goes to the frontmatter arm instead, and only the patch body is exempt
// from the name check. In Claude Code `apply_patch` is an ordinary command
// word.
//
// Accepted false denies: a formatter or linter run on approve.mjs by name, such
// as `npx prettier --check plan/approve.mjs`; a read-only command that names it
// and writes a file, such as `git log -- plan/approve.mjs > log.txt`; `find`
// and `xargs`, which can run commands; `tee`, which writes files; `graphify
// explain approve.mjs`; and `docker exec … bash -lc '…'` with the name inside
// the string. The token arm adds the same shapes for the token file and prompt
// event names, and an `apply_patch` to a hook registration that names a prompt
// event.
// Under a token, approve.mjs run any other way than the one bare command, such
// as behind `cd … &&`, is still denied.
//
// The frontmatter arm compares the approval lines of a chain file
// (`CHAIN_FILE` in `plan/frontmatter.mjs`, matched without regard to case
// because macOS paths ignore it) before and after the edit, through
// `approvalLines`, the same reader approve.mjs uses. Both sides read CRLF as
// LF and curly quotes as straight ones. An Edit whose `old_string` still
// isn't found is denied when its approval lines differ from its
// `new_string`'s. A new chain file passes only as `status: draft` with no
// approval lines. A Codex patch that adds or removes a `---` line in a chain
// file is denied, because moving the fence moves lines into or out of the
// frontmatter. `approved_via` is not an approval line, so an edit that changes
// only it passes.
//
// The tokenizer comes from `lib/tokenize.mjs`. The harness table and the
// Cursor-payload decline are local to this file, because no PRISM install
// delivers a Cursor hook. The tokenizer throws on syntax it can't read, and
// this hook decides what that means: it denies when the command holds
// `approve`. A PowerShell command is tokenized with the same POSIX rules after
// its backslashes become slashes.
//
// Fail open, always: every error writes one stderr line and exits 0, and a
// deny travels in the harness's envelope rather than an exit code.
//
// Known misses: a script name built at run time, from a variable, `$( … )`
// output, `base64 -d`, or an interpreter's own string operations; a glob that
// leaves out `approve` (`plan/a*`, `appr?ve.mjs`); a file that names the script
// written through a heredoc and run later (`cat > w.mjs <<'EOF'`), left open
// because PR bodies are written the same way; a link or copy of the script made
// by a command that doesn't name it, hardlinks included; functions or aliases
// defined in a file sourced by an earlier command; a read-only command that can
// run another (`git -c alias.x='!…'`, `gh alias`, `awk` `system()`, `sed` `e`,
// `rg --pre`); frontmatter written through a shell command (`sed -i`, `>`,
// `mv`); zsh-only syntax, since the tokenizer follows bash; a Cursor terminal,
// which carries no agent marker and may give approve.mjs a terminal; edits to
// this guard or to the harness settings files that register it, including the
// copy in the checkout the payload's `cwd` points into, which this guard hands
// the event to. approve.mjs
// refuses without a terminal and inside an agent session unless it holds a
// token, which catches accidental runs only.
//
// Known chat-approval misses: a token file name or prompt event name built at
// run time, the same class as a built script name; an approve.mjs the agent
// edited, run under a real token; and a prompt the person didn't type. Claude
// Code also fires its prompt event for messages from other sessions and task
// notifications. Those open with harness text ("Another Claude session sent a
// message:", `<task-notification>`), and `parseApprovePrompt` reads no prompt
// that opens that way. A brief one session writes to start another can say
// `approve` in any sentence, and the arm can't tell it from a typed prompt.
// The approve-once rule accepts that gap: the token is used once and is bound
// to the child session, and a start brief arrives before the child has drafted
// anything, so approve.mjs refuses any draft the child writes after it.
// `approved_via: chat` plus a person reading the commit is the real control.
// A stray sentence holding `approve`, such as "the PR got approved", leaves
// an unused token for the rest of the session, since a token no longer
// expires, and it can approve any chain draft whose text hasn't changed
// since that sentence. The rule accepts that too, for the same real control.
// Codex payloads were read off its docs, not probed live, and whether a Codex
// hook payload's `session_id` equals the `CODEX_THREAD_ID` a command sees is
// unconfirmed. A mismatch fails closed, since approve.mjs refuses a token from
// another session.
//
// Known parser gaps, one class per line:
//   - a `)` inside quotes, a comment, or a case pattern within `$( … )`
//   - a heredoc delimiter spelled `$'…'`
//   - shadowing through `BASH_CMDS=( … )`, `declare -n`, `builtin hash` or
//     `command hash`, functions defined through `eval`, and `builtin source`
//   - a copy to a file through a group redirect or a descriptor above 2
//
// Wire shapes:
//   Claude Code  PreToolUse; tool_name Bash or PowerShell with
//     tool_input.command, or Edit / Write / MultiEdit with tool_input.file_path;
//     deny via hookSpecificOutput.permissionDecision
//   Codex        PreToolUse; tool_name Bash with tool_input.command, or
//     apply_patch with the patch text in tool_input.command; same envelope.
//     Edit and Write are listed as edit tools like the write gate lists them,
//     and their field names are the same unverified guess.
//   Prompt arm   Claude Code and Codex: UserPromptSubmit with prompt,
//     session_id, and cwd; plain stdout becomes context.

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PIPES, REDIRECTS, tokenize } from "./lib/tokenize.mjs";
import { HARNESSES as WIRE } from "./harnesses.mjs";
import {
	findTokenPath,
	hashChainFiles,
	parseApprovePrompt,
	readChatToken,
	TOKEN_FILE,
} from "./plan/chat-approval.mjs";
import {
	approvalLines,
	CHAIN_FILE,
	matchApprovalLine,
} from "./plan/frontmatter.mjs";

// A letter, digit, `_`, or `-` before the name makes it another script, such
// as `auto-approve.mjs`, which the plan stage runs.
const SCRIPT_WORD = /(?:^|[^\w-])approve\.mjs/i;
const READ_ONLY_COMMANDS = new Set([
	"git",
	"gh",
	"grep",
	"rg",
	"cat",
	"sed",
	"awk",
	"ls",
	"head",
	"tail",
	"echo",
	"printf",
	"wc",
	"diff",
	"less",
	"file",
	"stat",
	"cut",
	"tr",
	"nl",
	"column",
	"tac",
	"test",
	"[",
]);
// Filters that pass when only a pipe taints them. `sort -o` and a second
// `uniq` operand write a file, and `sort --compress-program` runs one.
const PIPE_FILTERS = new Set(["sort", "uniq", "jq"]);
const RESERVED_WORDS = new Set([
	"if",
	"then",
	"elif",
	"else",
	"do",
	"while",
	"until",
	"for",
	"!",
	"{",
	"(",
	"fi",
	"done",
	"esac",
	"}",
]);
// Words that open and close a compound command, whose inner segments all feed
// a pipe after it. Each closer names the openers it ends.
const COMPOUND_OPENERS = new Set([
	"if",
	"while",
	"until",
	"for",
	"select",
	"case",
	"{",
]);
const COMPOUND_CLOSERS = {
	fi: ["if"],
	done: ["while", "until", "for", "select"],
	esac: ["case"],
	"}": ["{"],
};
// Commands after which a read-only name may run something else.
const SHADOWING_COMMANDS = new Set([
	"alias",
	"enable",
	"function",
	"hash",
	"source",
	".",
]);
const SHADOWING_WORD = /^(?:PATH\+?=|BASH_ALIASES\[|BASH_CMDS\[)/;
const DEVICE_TARGETS = new Set([
	"/dev/null",
	"/dev/stdout",
	"/dev/stderr",
	"/dev/tty",
]);
const PATCH_COMMAND = "apply_patch";
const PATCH_BODY = "*** Begin Patch";
const GLOB_CHARS = /[*?[{]/;
const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;
// How many times a word holding shell syntax is tokenized again in search of
// the script name, and how many brace expansions are tried.
const NAME_DEPTH = 3;
const BRACE_LIMIT = 64;
const TOKEN_DENY =
	"The chat approval token is written only when the person types `approve` in chat. Ask them to type it, and leave the token file and the prompt hook alone.";
// The words that write or reach the token: its file name, and the prompt
// events whose arm writes it.
const TOKEN_WORD = new RegExp(
	[TOKEN_FILE, "UserPromptSubmit", "beforeSubmitPrompt"]
		.map((word) => word.replace(/[.]/g, "\\."))
		.join("|"),
	"i"
);
const TOKEN_FILE_WORD = new RegExp(TOKEN_FILE.replace(/[.]/g, "\\."), "i");
// What an unreadable command has to hold to count as naming the script, or
// the token. The token form never matches the bare word `submit`, which
// commit messages use.
const APPROVE_UNREADABLE = /approve/i;
const TOKEN_UNREADABLE = /promptsubmit|submitprompt|chat-approval/i;
// One bare command, with no shell syntax for an assignment, a second command,
// or an expansion to hide in. A word may open with a drive letter, so an
// absolute Windows path passes after a PowerShell call's backslashes become
// slashes.
const CHAT_APPROVE_COMMAND =
	/^[ \t]*node[ \t]+((?:[A-Za-z]:)?[\w./-]+)[ \t]+((?:[A-Za-z]:)?[\w./-]+)[ \t]*$/;
const PLAIN_WORD = /^(?:[A-Za-z]:)?[\w./-]+$/;
const SELF = fileURLToPath(import.meta.url);
const APPROVE_SCRIPT = path.resolve(path.dirname(SELF), "plan/approve.mjs");
const ARTIFACT_PLACEHOLDER = "<artifact>";

/**
 * The approval script's path as a session spells it: relative to the repo's
 * top level, with forward slashes. A directory outside a git checkout reads
 * relative to itself, so the text still names a command that resolves.
 *
 * @param {string} cwd
 * @returns {string}
 */
function approveCommandPath(cwd) {
	let base = cwd;
	try {
		base =
			execFileSync("git", ["rev-parse", "--show-toplevel"], {
				cwd,
				encoding: "utf8",
				stdio: ["ignore", "pipe", "ignore"],
			}).trim() || cwd;
	} catch {
		try {
			base = realpathSync(cwd);
		} catch {
			// a directory that doesn't exist reads as written
		}
	}

	return path.relative(base, APPROVE_SCRIPT).split(path.sep).join("/");
}

/** @param {string} cwd */
function execDeny(cwd) {
	const command = `node ${approveCommandPath(cwd)} ${ARTIFACT_PLACEHOLDER}`;

	return `Approval is a human step. Ask the person to run \`${command}\` in their own terminal, or to type \`approve\` in chat. After they type it, run exactly \`${command}\` as its own command.`;
}

/** @param {string} cwd */
function frontmatterDeny(cwd) {
	return `\`status\`, \`approved_by\`, and \`approved_at\` change only through \`node ${approveCommandPath(cwd)} ${ARTIFACT_PLACEHOLDER}\`. Edit the body and leave those lines as they are.`;
}

/**
 * A hook payload as the host sends it. Every field a row reads is optional,
 * and a field of the wrong type reads as absent.
 *
 * @typedef {Record<string, any>} Payload
 */

/**
 * The wire data each host's registration implies. A row holds strings and
 * arrays only, so the hook's own functions sit in `HARNESSES` below.
 * `sessionKey` and `cwdKey` name payload fields, and the tool lists name what
 * the host sends as `tool_name` for a shell or an edit call.
 */
const LIB = {
	claude: {
		sessionKey: "session_id",
		cwdKey: "cwd",
		shellTools: ["Bash", "PowerShell"],
		editTools: ["Edit", "Write", "MultiEdit"],
		promptEvent: "UserPromptSubmit",
	},
	codex: {
		sessionKey: "session_id",
		cwdKey: "cwd",
		shellTools: ["Bash"],
		editTools: ["apply_patch", "Edit", "Write"],
		promptEvent: "UserPromptSubmit",
	},
};

// Events Cursor sends when it runs `.claude/settings.json`'s hooks beside its
// own. Claude Code never emits these camelCase names, so the claude arm
// declines a payload carrying one, `beforeSubmitPrompt` included.
const CURSOR_EVENT_NAMES = new Set([
	"preToolUse",
	"postToolUse",
	"sessionStart",
	"sessionEnd",
	"beforeSubmitPrompt",
]);

/**
 * True when the payload came from a harness other than the one `tool` names.
 * It checks that exact known set and nothing wider, so any other payload
 * proceeds and a wrong guess shows up as a hook firing, not a hook gone quiet.
 *
 * @param {string} tool
 * @param {Payload} payload
 * @returns {boolean}
 */
function declineForeignPayload(tool, payload) {
	return tool === "claude" && CURSOR_EVENT_NAMES.has(payload?.hook_event_name);
}

/**
 * Per-harness wire contract. Each row spreads that host's data from `LIB` and
 * adds this hook's functions. `editTarget` is the edited path, or for Codex's
 * `apply_patch` the patch text, which names its own paths. `deniesEdit`
 * decides the frontmatter arm in the shape that harness's edit payload
 * carries. `checksShellPatches` marks a harness whose shell can run
 * `apply_patch`. `promptEvent`, `prompt`, `promptCwd`, and `emitPromptReply`
 * drive the prompt arm, and `sessionId` ties a token to the session that typed
 * it. `emitDeny` is the host's deny envelope from `harnesses.mjs`, the one
 * `hook.mjs` answers in.
 *
 * @typedef {object} Harness
 * @property {string} sessionKey
 * @property {string} cwdKey
 * @property {string[]} shellTools
 * @property {string[]} editTools
 * @property {string} promptEvent
 * @property {(payload: Payload) => string | undefined} prompt
 * @property {(payload: Payload) => string | undefined} promptCwd
 * @property {(payload: Payload) => string | undefined} sessionId
 * @property {(token: ChatToken | null, cwd: string) => string | null} emitPromptReply
 * @property {(payload: Payload) => boolean} isShellCall
 * @property {(payload: Payload) => unknown} command
 * @property {boolean} checksShellPatches
 * @property {(payload: Payload) => boolean} isEditCall
 * @property {(payload: Payload) => unknown} editTarget
 * @property {(payload: Payload, cwd: string) => boolean} deniesEdit
 * @property {(payload: Payload) => string | undefined} cwd
 * @property {(reason: string) => unknown} emitDeny
 */

/** @typedef {{ prompted_at: string, session: string, path: string | null, hashes: Record<string, string> }} ChatToken */

/** @type {Record<string, Harness>} */
const HARNESSES = {
	claude: {
		...LIB.claude,
		prompt: (payload) => payload["prompt"],
		promptCwd: (payload) => payload["cwd"],
		sessionId: (payload) => payload[LIB.claude.sessionKey],
		emitPromptReply: (token, cwd) => (token ? promptContext(token, cwd) : null),
		isShellCall: (payload) => LIB.claude.shellTools.includes(payload["tool_name"]),
		// PowerShell escapes with a backtick, not a backslash, so its backslashes
		// are path separators and become slashes before the POSIX tokenizer runs.
		command: (payload) =>
			payload["tool_name"] === "PowerShell" &&
			typeof payload["tool_input"]?.command === "string"
				? payload["tool_input"].command.replaceAll("\\", "/")
				: payload["tool_input"]?.command,
		checksShellPatches: false,
		isEditCall: (payload) => LIB.claude.editTools.includes(payload["tool_name"]),
		editTarget: (payload) => payload["tool_input"]?.file_path,
		deniesEdit: (payload, cwd) =>
			editChangesApproval(HARNESSES["claude"], payload, cwd),
		cwd: (payload) => payload[LIB.claude.cwdKey],
		emitDeny: WIRE["claude"].emitDeny,
	},
	codex: {
		...LIB.codex,
		prompt: (payload) => payload["prompt"],
		promptCwd: (payload) => payload["cwd"],
		sessionId: (payload) => payload[LIB.codex.sessionKey],
		emitPromptReply: (token, cwd) => (token ? promptContext(token, cwd) : null),
		isShellCall: (payload) => LIB.codex.shellTools.includes(payload["tool_name"]),
		command: (payload) => payload["tool_input"]?.command,
		checksShellPatches: true,
		isEditCall: (payload) => LIB.codex.editTools.includes(payload["tool_name"]),
		// Only `apply_patch` carries its target in the patch text. Codex's `Edit`
		// and `Write` are assumed to name a path as Claude's do, which is
		// unverified.
		editTarget: (payload) =>
			payload["tool_name"] === "apply_patch"
				? payload["tool_input"]?.command
				: payload["tool_input"]?.file_path,
		deniesEdit: (payload, cwd) => {
			if (payload["tool_name"] === "apply_patch")
				return patchChangesApproval(HARNESSES["codex"].editTarget(payload), cwd);

			return editChangesApproval(HARNESSES["codex"], payload, cwd);
		},
		cwd: (payload) => payload[LIB.codex.cwdKey],
		emitDeny: WIRE["codex"].emitDeny,
	},
};

/**
 * @param {string[]} argv
 * @param {string} stdin
 */
function main(argv, stdin) {
	const { tool = "", event = "" } = parseArgs(argv);
	const harness = Object.hasOwn(HARNESSES, tool) ? HARNESSES[tool] : undefined;
	if (!harness) {
		process.stderr.write(
			`approve-guard hook: unknown or missing --tool "${tool}", exiting fail-open\n`
		);
		return;
	}

	/** @type {Payload} */
	const payload = JSON.parse(stdin);
	if (declineForeignPayload(tool, payload)) return;

	const sessionCopy = findSessionCopy(harness.cwd(payload) || process.cwd());
	if (sessionCopy) {
		runSessionCopy(sessionCopy, argv, stdin);
		return;
	}

	if (event.toLowerCase() === harness.promptEvent.toLowerCase()) {
		const promptCwd = harness.promptCwd(payload);
		const reply = harness.emitPromptReply(
			recordChatApproval(harness, payload, Date.now()),
			promptCwd ?? process.cwd()
		);
		if (reply !== null) writeStdout(reply);
		return;
	}

	const cwd = harness.cwd(payload) || process.cwd();
	if (touchesToken(harness, payload)) {
		writeStdout(harness.emitDeny(TOKEN_DENY));
		return;
	}

	if (harness.isShellCall(payload)) {
		const { runsApprove, patches } = inspectCommand(harness.command(payload), {
			checksShellPatches: harness.checksShellPatches,
			shadowed: false,
		});
		if (runsApprove) {
			if (!allowsChatApproval(harness, payload, cwd))
				writeStdout(harness.emitDeny(execDeny(cwd)));
		} else if (
			harness.checksShellPatches &&
			patches.some((patch) => patchChangesApproval(patch, cwd))
		)
			writeStdout(harness.emitDeny(frontmatterDeny(cwd)));
		return;
	}

	if (harness.isEditCall(payload) && harness.deniesEdit(payload, cwd)) {
		writeStdout(harness.emitDeny(frontmatterDeny(cwd)));
	}
}

/**
 * Returns the guard's copy in the session's own checkout when the session works
 * in another checkout than the one this file sits in, or null. A worktree
 * session's hook command resolves through the project directory the session
 * started in, usually the main checkout, which can be stale or missing the
 * guard. The session's copy names its own `approve.mjs`, so its deny and
 * prompt texts give a command that runs this checkout's script. Only another
 * worktree of the same repository counts, so a `cwd` in an unrelated checkout
 * can't pick which guard runs.
 *
 * @param {string} cwd
 * @returns {string | null}
 */
function findSessionCopy(cwd) {
	const self = findCheckout(path.dirname(SELF));
	const session = findCheckout(cwd);
	if (!self || !session || self.root === session.root) return null;
	if (self.common !== session.common) return null;

	try {
		const selfPath = realpathSync.native(SELF);
		const copy = path.join(session.root, path.relative(self.root, selfPath));

		return realpathSync.native(copy) === selfPath ? null : copy;
	} catch {
		return null;
	}
}

/**
 * Returns the real paths of the checkout holding `dir` and of the git
 * directory its worktrees share, or null outside a checkout. The native
 * realpath expands a Windows 8.3 short name, so two spellings of one folder
 * compare equal.
 *
 * @param {string} dir
 * @returns {{ root: string, common: string } | null}
 */
function findCheckout(dir) {
	try {
		const [top, common] = execFileSync(
			"git",
			[
				"rev-parse",
				"--path-format=absolute",
				"--show-toplevel",
				"--git-common-dir",
			],
			{ cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
		)
			.trim()
			.split("\n");
		if (!top || !common) return null;

		return {
			root: realpathSync.native(top.trim()),
			common: realpathSync.native(common.trim()),
		};
	} catch {
		return null;
	}
}

/**
 * Runs the session checkout's guard on the same arguments and payload, and
 * passes its output through.
 *
 * @param {string} copy
 * @param {string[]} argv
 * @param {string} stdin
 */
function runSessionCopy(copy, argv, stdin) {
	const child = spawnSync(process.execPath, [copy, ...argv], {
		input: stdin,
		encoding: "utf8",
	});
	if (child.error)
		process.stderr.write(
			`approve-guard hook: could not run ${copy}: ${child.error.message}\n`
		);
	if (child.stderr) process.stderr.write(child.stderr);
	if (child.stdout) writeStdout(child.stdout);
}

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

// --- Chat approval ---

/**
 * Writes the chat approval token when `parseApprovePrompt` reads the prompt as
 * an approval and the payload names a session and a directory inside a git
 * checkout. Returns the token written, or null.
 *
 * @param {Harness} harness
 * @param {Payload} payload
 * @param {number} now
 * @returns {ChatToken | null}
 */
function recordChatApproval(harness, payload, now) {
	const approval = parseApprovePrompt(harness.prompt(payload));
	const session = harness.sessionId(payload);
	const cwd = harness.promptCwd(payload);
	if (!approval || typeof session !== "string" || !session) return null;
	if (typeof cwd !== "string" || !cwd) return null;

	const file = findTokenPath(cwd);
	if (!file) return null;

	const token = {
		prompted_at: new Date(now).toISOString(),
		session,
		path: approval.path ? path.resolve(cwd, approval.path) : null,
		hashes: hashChainFiles(cwd),
	};
	writeFileSync(file, `${JSON.stringify(token)}\n`);

	return token;
}

/**
 * @param {ChatToken} token
 * @param {string} cwd
 * @returns {string}
 */
function promptContext(token, cwd) {
	const target = token.path ?? ARTIFACT_PLACEHOLDER;

	return `The person's message reads as an approval, so run exactly \`node ${approveCommandPath(cwd)} ${target}\` as its own command. The approval covers one run of the file as it is now.`;
}

/**
 * True when a call may reach the token: a shell command the execution arm's
 * rules would deny if the token file and prompt event names were the script's
 * name, or a file-edit call whose target names the token file. A Codex patch
 * is its edit target, so its text counts.
 *
 * @param {Harness} harness
 * @param {Payload} payload
 * @returns {boolean}
 */
function touchesToken(harness, payload) {
	if (harness.isShellCall(payload)) {
		return inspectCommand(harness.command(payload), {
			checksShellPatches: false,
			shadowed: false,
			names: holdsTokenWord,
			unreadable: TOKEN_UNREADABLE,
		}).runsApprove;
	}

	const target = harness.isEditCall(payload)
		? harness.editTarget(payload)
		: null;
	return typeof target === "string" && TOKEN_FILE_WORD.test(target);
}

/**
 * True when text names the token file or a prompt event, directly, through a
 * brace expansion, or through the words of the shell syntax it holds, the way
 * `namesApprove` reads the script name. Syntax that can't be read counts when
 * it holds `promptsubmit`, `submitprompt`, or `chat-approval`, never the bare
 * word `submit`, which commit messages use.
 *
 * @param {unknown} text
 * @param {number} [depth]
 * @returns {boolean}
 */
function holdsTokenWord(text, depth = 0) {
	if (typeof text !== "string") return false;
	if (expandBraces(text).some((form) => TOKEN_WORD.test(form))) return true;
	if (depth >= NAME_DEPTH || !/[\s'"\\$`]/.test(text)) return false;

	try {
		return tokenize(text).tokens.some((word) =>
			holdsTokenWord(word, depth + 1)
		);
	} catch {
		return TOKEN_UNREADABLE.test(text);
	}
}

/**
 * True when a command that names approve.mjs may run anyway: it is exactly
 * `node <this repo's approve.mjs> <path>`, and an unused token from the same
 * session exists. approve.mjs takes the token and checks it again.
 *
 * @param {Harness} harness
 * @param {Payload} payload
 * @param {string} cwd
 * @returns {boolean}
 */
function allowsChatApproval(harness, payload, cwd) {
	if (!isChatApproveCommand(harness.command(payload), cwd)) return false;

	const session = harness.sessionId(payload);
	const file = findTokenPath(cwd);
	if (typeof session !== "string" || !session || !file) return false;

	const { state, token } = readChatToken(file);
	return state === "fresh" && token?.session === session;
}

/**
 * @param {unknown} command
 * @param {string} cwd
 * @returns {boolean}
 */
function isChatApproveCommand(command, cwd) {
	/** @type {string | undefined} */
	let script;
	if (Array.isArray(command)) {
		const words = command.map(String);
		if (words.length !== 3 || words[0] !== "node") return false;
		if (!words.every((word) => PLAIN_WORD.test(word))) return false;
		script = words[1];
	} else {
		const match =
			typeof command === "string" ? CHAT_APPROVE_COMMAND.exec(command) : null;
		if (!match) return false;
		script = match[1];
	}

	if (script === undefined) return false;

	// The native call expands a Windows 8.3 short name such as `RUNNER~1`, which
	// the JS one keeps, so the payload's spelling of a path and git's still match.
	try {
		return (
			realpathSync.native(path.resolve(cwd, script)) ===
			realpathSync.native(APPROVE_SCRIPT)
		);
	} catch {
		return false;
	}
}

// --- Execution arm ---

/** @typedef {{ text: string, op: boolean, body: boolean }} Item */

/** @typedef {{ kind: string | null, tainted: boolean, named: boolean }} Group */

/**
 * @typedef {object} Context
 * @property {boolean} checksShellPatches
 * @property {boolean} shadowed
 * @property {(word: string) => boolean} [names]
 * @property {RegExp} [unreadable]
 */

/** @typedef {{ runsApprove: boolean, patches: string[] }} Inspection */

/** @typedef {{ runsApprove: boolean, patch?: string, names: boolean }} Verdict */

/**
 * Reads a command string, or a Codex argv array, and returns whether it may
 * run approve.mjs plus the text of every `apply_patch` it runs. A string the
 * tokenizer can't read counts as running approve.mjs when it holds `approve`.
 * `context.names` and `context.unreadable` swap in another name to judge, which
 * is how the token arm reuses these rules, and default to the script's.
 *
 * @param {unknown} command
 * @param {Context} context
 * @returns {Inspection}
 */
function inspectCommand(command, context) {
	const unreadable = context.unreadable ?? APPROVE_UNREADABLE;
	if (Array.isArray(command)) {
		const words = command.map(String);
		if (holdsCarriageReturn(words.join(" "), unreadable))
			return { runsApprove: true, patches: [] };

		const items = words.map((text) => ({ text, op: false, body: false }));
		return inspectItems(items, [], context);
	}
	if (typeof command !== "string" || !command.trim())
		return { runsApprove: false, patches: [] };
	if (holdsCarriageReturn(command, unreadable))
		return { runsApprove: true, patches: [] };

	let parsed;
	try {
		parsed = tokenize(command);
	} catch (err) {
		const runsApprove = unreadable.test(command);
		process.stderr.write(
			`approve-guard hook: ${err instanceof Error ? err.message : err}, ${runsApprove ? "denying" : "allowing"} the command\n`
		);
		return { runsApprove, patches: [] };
	}

	const items = parsed.tokens.map((text, i) => ({
		text,
		op: parsed.operators.has(i),
		body: parsed.bodies.has(i),
	}));
	return inspectItems(items, parsed.substitutions, context);
}

/**
 * @param {string} text
 * @param {RegExp} unreadable
 * @returns {boolean}
 */
function holdsCarriageReturn(text, unreadable) {
	return text.includes("\r") && unreadable.test(text);
}

/**
 * Judges every segment in order. Each entry in `groups` is a `{ }`, `( )`, or
 * compound command still open, with the top level at the bottom. `tainted`
 * says whether output naming the script flows into the group's next segment,
 * and `named` whether any segment inside it named the script, which is what
 * the whole group then feeds a pipe after it closes.
 *
 * @param {Item[]} items
 * @param {string[]} substitutions
 * @param {Context} context
 * @returns {Inspection}
 */
function inspectItems(items, substitutions, context) {
	const shadowed = context.shadowed || shadowsCommands(items);
	const inner = { ...context, shadowed };
	let runsApprove = substitutions.some(
		(text) => inspectCommand(text, inner).runsApprove
	);
	/** @type {string[]} */
	const patches = [];
	/** @type {Group[]} */
	const groups = [{ kind: null, tainted: false, named: false }];

	for (const { segment, separator } of splitSegments(items)) {
		trackCompounds(segment, groups);
		const group = groups[groups.length - 1];
		if (segment.length > 0) {
			const verdict = judgeSegment(segment, group.tainted, inner);
			if (verdict.runsApprove) runsApprove = true;
			if (verdict.patch !== undefined) patches.push(verdict.patch);
			if (verdict.names) {
				group.tainted = true;
				group.named = true;
			}
		}

		if (separator === "(") {
			groups.push({ kind: "(", tainted: group.tainted, named: false });
		} else if (separator === ")") {
			closeGroup(groups, ["("]);
		} else if (separator !== null && !PIPES.has(separator)) {
			group.tainted = false;
		}
	}

	return { runsApprove, patches };
}

/**
 * Opens and closes groups for the reserved words leading a segment.
 *
 * @param {Item[]} segment
 * @param {Group[]} groups
 * @returns {void}
 */
function trackCompounds(segment, groups) {
	for (const { text, op } of segment) {
		if (op || !RESERVED_WORDS.has(text)) return;

		if (COMPOUND_OPENERS.has(text)) {
			const outer = groups[groups.length - 1];
			groups.push({ kind: text, tainted: outer.tainted, named: false });
		} else if (Object.hasOwn(COMPOUND_CLOSERS, text)) {
			closeGroup(
				groups,
				COMPOUND_CLOSERS[/** @type {keyof typeof COMPOUND_CLOSERS} */ (text)]
			);
		}
	}
}

/**
 * Pops the innermost group when one of `kinds` opened it.
 *
 * @param {Group[]} groups
 * @param {readonly (string | null)[]} kinds
 * @returns {void}
 */
function closeGroup(groups, kinds) {
	if (groups.length < 2 || !kinds.includes(groups[groups.length - 1].kind))
		return;

	const closed = /** @type {Group} */ (groups.pop());
	const outer = groups[groups.length - 1];
	outer.tainted = outer.tainted || closed.named;
	outer.named = outer.named || closed.named;
}

/**
 * Returns whether one segment may run approve.mjs, its patch text when it is
 * a Codex `apply_patch`, and whether its output carries the script's name.
 *
 * @param {Item[]} segment
 * @param {boolean} tainted
 * @param {Context} context
 * @returns {Verdict}
 */
function judgeSegment(segment, tainted, context) {
	const { command, assignments, index } = readCommand(segment);
	const namesWord = context.names ?? namesApprove;
	if (
		command === PATCH_COMMAND &&
		context.checksShellPatches &&
		!context.shadowed
	) {
		return {
			runsApprove: segment.some(
				({ text }) =>
					!text.trimStart().startsWith(PATCH_BODY) && namesWord(text)
			),
			patch: segment.map(({ text }) => text).join("\n"),
			names: false,
		};
	}

	const names = segment.some(({ text, body }) => !body && namesWord(text));
	const bodyNames = segment.some(({ text, body }) => body && namesWord(text));
	if (command === null) return { runsApprove: names || bodyNames, names };

	const readOnly = !context.shadowed && READ_ONLY_COMMANDS.has(command);
	const filter = !context.shadowed && PIPE_FILTERS.has(command);
	let runsApprove;
	if (readOnly) {
		runsApprove =
			assignments.some((text) => namesWord(text)) ||
			((names || tainted) && writesFile(segment));
	} else if (filter) {
		runsApprove =
			names ||
			bodyNames ||
			(tainted &&
				(writesFile(segment) ||
					filterWritesOrRuns(command, segment.slice(index + 1))));
	} else {
		runsApprove = names || bodyNames || tainted;
	}

	return { runsApprove, names: names || bodyNames };
}

/**
 * True when a `PIPE_FILTERS` command's arguments write a file or run a
 * program. Long options match by prefix, because GNU accepts `--out=f`.
 *
 * @param {string} command
 * @param {Item[]} rest
 * @returns {boolean}
 */
function filterWritesOrRuns(command, rest) {
	/** @type {string[]} */
	const args = [];
	for (let i = 0; i < rest.length; i++) {
		const item = rest[i];
		if (readsAsRedirect(item)) {
			i += 1;
		} else if (!item.op && !item.body) {
			args.push(item.text);
		}
	}

	if (command !== "sort" && command !== "uniq") return false;
	// A brace, variable, or substitution can expand into a write option, so an
	// argument that can't be read as written fails closed.
	if (args.some((arg) => /[{$`]/.test(arg))) return true;
	// GNU accepts any unambiguous long-option prefix, and `--co` is the
	// shortest one for --compress-program.
	if (command === "sort")
		return args.some((arg) => /^--(?:o|co)/.test(arg) || /^-[^-]*o/.test(arg));

	let operands = 0;
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--") {
			operands += args.length - i - 1;
			break;
		}
		if (arg === "-" || !arg.startsWith("-")) operands += 1;
		else if (/^--(?:s|ch)[^=]*$/.test(arg) || /^-[^-]*[fsw]$/.test(arg)) i += 1;
	}
	return operands > 1;
}

/**
 * Splits items at control operators. A redirection stays inside its segment,
 * so the word after it reads as its target rather than as the next command.
 * Each segment carries the operator that ended it, or null at the end.
 *
 * @param {Item[]} items
 * @returns {{ segment: Item[], separator: string | null }[]}
 */
function splitSegments(items) {
	/** @type {{ segment: Item[], separator: string | null }[]} */
	const segments = [];
	/** @type {Item[]} */
	let segment = [];
	for (const item of items) {
		if (!item.op || REDIRECTS.has(item.text)) {
			segment.push(item);
			continue;
		}

		segments.push({ segment, separator: item.text });
		segment = [];
	}
	segments.push({ segment, separator: null });

	return segments;
}

/**
 * Returns the lowercased word a segment runs, after leading assignments,
 * reserved words, and redirections with their targets, or null when none is
 * left, plus the leading assignments it skipped and the command word's index.
 *
 * @param {Item[]} segment
 * @returns {{ command: string | null, assignments: string[], index: number }}
 */
function readCommand(segment) {
	/** @type {string[]} */
	const assignments = [];
	let i = 0;
	while (i < segment.length) {
		const { text } = segment[i];
		if (readsAsRedirect(segment[i])) {
			i += 2;
		} else if (/^\d+$/.test(text) && readsAsRedirect(segment[i + 1])) {
			i += 1;
		} else if (ASSIGNMENT.test(text)) {
			assignments.push(text);
			i += 1;
		} else if (RESERVED_WORDS.has(text)) {
			i += 1;
		} else {
			return { command: text.toLowerCase(), assignments, index: i };
		}
	}

	return { command: null, assignments, index: segment.length };
}

/**
 * @param {Item | undefined} item
 * @returns {boolean}
 */
function readsAsRedirect(item) {
	return item !== undefined && item.op && REDIRECTS.has(item.text);
}

/**
 * True when a segment redirects output to a file. A copy to a duplicated file
 * descriptor or a device such as `/dev/null` writes nothing that could run.
 *
 * @param {Item[]} segment
 * @returns {boolean}
 */
function writesFile(segment) {
	return segment.some((item, i) => {
		if (!readsAsRedirect(item) || !item.text.includes(">")) return false;

		const target = segment[i + 1]?.text ?? "";
		if (item.text.endsWith("&") && /^(?:\d+-?|-)$/.test(target)) return false;

		return !DEVICE_TARGETS.has(target);
	});
}

/**
 * True when a command lets a read-only name run something else: it defines a
 * function or alias, sources a file, or changes `PATH` or bash's command hash.
 *
 * @param {Item[]} items
 * @returns {boolean}
 */
function shadowsCommands(items) {
	const definesFunction = items.some(
		(item, i) =>
			item.op &&
			item.text === "(" &&
			items[i + 1]?.op &&
			items[i + 1].text === ")"
	);
	const changesLookup = items.some(
		({ text, op, body }) =>
			!op && !body && (text === "PATH" || SHADOWING_WORD.test(text))
	);

	return (
		definesFunction ||
		changesLookup ||
		splitSegments(items).some(({ segment }) => {
			const { command } = readCommand(segment);
			return command !== null && SHADOWING_COMMANDS.has(command);
		})
	);
}

/**
 * True when a word names approve.mjs, directly, through a brace expansion, or
 * through the words of the shell syntax it holds, such as a `bash -c` string
 * or ANSI-C quoting. Syntax that can't be read counts when it holds `approve`.
 *
 * @param {string} word
 * @param {number} [depth]
 * @returns {boolean}
 */
function namesApprove(word, depth = 0) {
	const named = expandBraces(word).some(
		(form) =>
			SCRIPT_WORD.test(form) || (GLOB_CHARS.test(form) && /approve/i.test(form))
	);
	if (named) return true;
	if (depth >= NAME_DEPTH || !/[\s'"\\$`]/.test(word)) return false;

	try {
		return tokenize(word).tokens.some((text) => namesApprove(text, depth + 1));
	} catch {
		return /approve/i.test(word);
	}
}

/**
 * Returns the brace expansions of a word, `a{b,c}` as `ab` and `ac`, and
 * `a{1..3}` as `a1`, `a2`, `a3`, stopping after `BRACE_LIMIT` forms. A word
 * with no brace group returns itself.
 *
 * @param {string} word
 * @param {{ left: number }} [budget]
 * @returns {string[]}
 */
function expandBraces(word, budget = { left: BRACE_LIMIT }) {
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
 * Finds the first brace group holding a top-level comma or a `..` sequence.
 * Returns its bounds and its choices, or null when there is none.
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
 * Expands `1..3` or `a..c`, ignoring any step, or returns null.
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
	for (let n = from; choices.length < BRACE_LIMIT; n += step) {
		choices.push(numbers ? String(n) : String.fromCharCode(n));
		if (n === to) break;
	}

	return choices;
}

// --- Frontmatter arm ---

/** @typedef {{ kind: string, path: string, moveTo: string | null, removed: string[], added: string[] }} PatchSection */

/**
 * Returns the absolute path when `filePath` names a chain file, else null.
 * The path is checked as given and with its existing directories resolved
 * through symlinks, so a link into `.prism/plans/` still counts.
 *
 * @param {unknown} filePath
 * @param {string} cwd
 * @returns {string | null}
 */
function resolveChainFile(filePath, cwd) {
	if (typeof filePath !== "string" || !filePath) return null;

	const absolute = path.resolve(cwd, filePath);
	const candidates = [absolute, resolveExistingPart(absolute)];

	return candidates.some((candidate) =>
		CHAIN_FILE.test(candidate.split(path.sep).join("/"))
	)
		? absolute
		: null;
}

/**
 * @param {string} absolute
 * @returns {string}
 */
function resolveExistingPart(absolute) {
	let existing = absolute;
	while (!existsSync(existing) && path.dirname(existing) !== existing)
		existing = path.dirname(existing);

	return path.join(realpathSync(existing), path.relative(existing, absolute));
}

/**
 * True when an `Edit`, `MultiEdit`, or `Write` call targets a chain file and
 * changes its approval lines. Both rows call this with their own `editTarget`,
 * because Codex's `Edit` and `Write` are assumed, unverified, to carry the
 * shape Claude Code's do.
 *
 * @param {Harness} harness
 * @param {Payload} payload
 * @param {string} cwd
 * @returns {boolean}
 */
function editChangesApproval(harness, payload, cwd) {
	const target = resolveChainFile(harness.editTarget(payload), cwd);
	if (!target) return false;

	const before = existsSync(target) ? readFileSync(target, "utf8") : null;
	return claudeEditChangesApproval(payload, before);
}

/**
 * True when a Claude Edit, MultiEdit, or Write changes the approval lines.
 * Edits match after CRLF and curly quotes are normalized on both sides. An
 * `old_string` that still isn't found fails in the tool, but it is denied
 * when its approval lines differ from its `new_string`'s, since a match the
 * guard can't reproduce may still land.
 *
 * @param {Payload} payload
 * @param {string | null} before
 * @returns {boolean}
 */
function claudeEditChangesApproval(payload, before) {
	const input = payload.tool_input ?? {};
	if (payload.tool_name === "Write")
		return (
			typeof input.content === "string" &&
			changesApproval(before, input.content)
		);

	const edits = payload.tool_name === "MultiEdit" ? input.edits : [input];
	if (!Array.isArray(edits)) return false;

	const original = before === null ? null : normalizeText(before);
	let text = original ?? "";
	for (const edit of edits) {
		if (typeof edit?.old_string !== "string") continue;
		if (typeof edit.new_string !== "string") continue;

		const from = normalizeText(edit.old_string);
		const to = normalizeText(edit.new_string);
		if (from !== "" && !text.includes(from)) {
			if (approvalMultiset(from) !== approvalMultiset(to)) return true;
			continue;
		}

		if (edit.replace_all) {
			if (from !== "") text = text.split(from).join(to);
			continue;
		}

		const at = text.indexOf(from);
		text = text.slice(0, at) + to + text.slice(at + from.length);
	}

	return changesApproval(original, text);
}

/**
 * @param {string} text
 * @returns {string}
 */
function normalizeText(text) {
	return text
		.replace(/\r\n/g, "\n")
		.replace(/[\u2018\u2019]/g, "'")
		.replace(/[\u201C\u201D]/g, '"');
}

/**
 * The approval lines in a text fragment, sorted and joined, for comparison.
 *
 * @param {string} text
 * @returns {string}
 */
function approvalMultiset(text) {
	return text
		.split("\n")
		.flatMap((line) => {
			const match = matchApprovalLine(line);
			return match ? [`${match.key}: ${match.value}`] : [];
		})
		.sort()
		.join("\n");
}

/**
 * True when an edit changes the approval lines. `before` is null for a file
 * that doesn't exist yet, which passes only as a draft with no approval lines.
 *
 * @param {string | null} before
 * @param {string} after
 * @returns {boolean}
 */
function changesApproval(before, after) {
	const next = approvalLines(after);
	if (before === null) {
		return !(
			next.status === "draft" &&
			next.approved_by === null &&
			next.approved_at === null
		);
	}

	const previous = approvalLines(before);
	return Object.entries(previous).some(
		([key, value]) =>
			value !==
			next[/** @type {import("./plan/frontmatter.mjs").ApprovalKey} */ (key)]
	);
}

/**
 * True when a Codex patch changes approval lines in a chain file: an added
 * chain file that isn't a bare draft, a move onto a chain path, or an update
 * that adds or removes a `---` line or whose removed and added approval lines
 * differ as multisets.
 *
 * @param {unknown} patch
 * @param {string} cwd
 * @returns {boolean}
 */
function patchChangesApproval(patch, cwd) {
	if (typeof patch !== "string") return false;

	for (const section of readPatchSections(patch)) {
		const target = resolveChainFile(section.path, cwd);
		const destination = section.moveTo
			? resolveChainFile(section.moveTo, cwd)
			: null;
		if (destination && destination !== target) return true;
		if (!target) continue;

		if (
			section.kind === "Add File" &&
			changesApproval(null, `${section.added.join("\n")}\n`)
		)
			return true;
		if (section.kind !== "Update File") continue;

		if (
			[...section.removed, ...section.added].some(
				(line) => line.trim() === "---"
			)
		)
			return true;
		if (
			approvalMultiset(section.removed.join("\n")) !==
			approvalMultiset(section.added.join("\n"))
		)
			return true;
	}

	return false;
}

/**
 * @param {string} patch
 * @returns {PatchSection[]}
 */
function readPatchSections(patch) {
	/** @type {PatchSection[]} */
	const sections = [];
	/** @type {PatchSection | null} */
	let current = null;
	for (const line of patch.split("\n")) {
		const header = /^\*\*\* (Add File|Update File|Delete File): (.+)$/.exec(
			line.trim()
		);
		if (header) {
			current = {
				kind: header[1] ?? "",
				path: (header[2] ?? "").trim(),
				moveTo: null,
				removed: [],
				added: [],
			};
			sections.push(current);
			continue;
		}

		const move = /^\*\*\* Move to: (.+)$/.exec(line.trim());
		if (move && current) current.moveTo = (move[1] ?? "").trim();
		else if (current && line.startsWith("+")) current.added.push(line.slice(1));
		else if (current && line.startsWith("-"))
			current.removed.push(line.slice(1));
	}

	return sections;
}

/**
 * @param {unknown} body
 * @returns {void}
 */
function writeStdout(body) {
	// A reader that stops early raises EPIPE as a stream event, not a throw,
	// so it needs its own listener to keep the fail-open guarantee real.
	process.stdout.on("error", () => {});
	process.stdout.write(typeof body === "string" ? body : JSON.stringify(body));
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
				`approve-guard hook: ${err instanceof Error ? err.message : String(err)}\n`
			);
		} catch {
			// stderr itself failing leaves nothing more to do
		}
	}
}
// Deliberately no process.exit(): exit() doesn't wait for a pending stdout
// write to flush, and every throwing path above is already caught, so
// falling off the end exits 0 with the payload drained.
