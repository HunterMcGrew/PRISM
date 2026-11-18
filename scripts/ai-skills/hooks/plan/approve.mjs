// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
/**
 * Approves a plan-chain file: `node plan/approve.mjs <path>`, from the runtime directory.
 *
 * Approval is a person's act, and it reaches this script two ways. In their
 * own terminal, the person runs it and presses `y`. In chat, the person types
 * `approve`, the approval guard's prompt arm writes a chat approval token
 * (`plan/chat-approval.mjs`), and the agent runs this script, which
 * takes the token in place of the keypress and adds `approved_via: chat`.
 *
 * A file already approved can be approved again, which replaces the old
 * approval lines, so an approved intent edited later goes back through the
 * person rather than keeping a stamp for text they never read.
 *
 * Inside an agent session (a Claude Code or Codex marker in the environment)
 * or without a terminal on stdin, it runs only on an unused token from the same session that names the same file,
 * when the person named one. The token never expires, but a file whose text
 * changed after the approve message is refused. It takes no flag that skips
 * either path. The approval guard hook (`approve-guard.mjs`) denies agents running this script without a token, editing the three
 * approval lines by hand, and touching the token file.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { findTokenPath, hashFile, takeChatToken } from "./chat-approval.mjs";
import {
	approvalLines,
	CHAIN_FILE,
	formatLocalDate,
	readFrontmatter,
	replaceFrontmatterLine,
	sectionBody,
	stampApproval,
} from "./frontmatter.mjs";

/**
 * @typedef {object} ChatToken
 * @property {string} session
 * @property {string | null} path
 * @property {Record<string, string>} hashes
 */

/**
 * @typedef {object} TokenRead
 * @property {"missing" | "invalid" | "fresh"} state
 * @property {ChatToken | null} token
 */

/**
 * @typedef {object} ApproveResult
 * @property {number} code
 * @property {string} message
 */

const SIZES = new Set(["standard", "epic"]);
// Every host's agent marker, so an agent session never reads as a person at a terminal.
const AGENT_MARKERS = [
	"CLAUDECODE",
	"CODEX_THREAD_ID",
	"CODEX_SESSION_ID",
	"CODEX_CI",
];
const REQUIRED_INTENT_SECTIONS = [
	"Regression surface",
	"Security surface",
	"Design",
	"Acceptance criteria",
];
// The reason has to sit on the same line as "none", after a dash, colon, or comma.
const NONE_WITH_REASON = /^none[ \t]*[—–:,-][ \t]*\S/i;

/**
 * Runs every refusal and check, asks for confirmation, then writes the
 * approval lines. Returns `{ code, message }`, where `code` is the exit code.
 *
 * Every input is a parameter so tests reach the write path by import. The CLI
 * at the bottom passes the real terminal, environment, and git identity.
 * `readKey(prompt)` shows the prompt and resolves to one keypress. `write(file,
 * text)` writes a file. `takeToken()` consumes the chat approval token and
 * returns `{ state, token }` as `takeChatToken` does, and `sessionId` is the
 * harness session running this, when the harness exposes one.
 *
 * @param {object} options
 * @param {string} options.path
 * @param {boolean} options.isTTY
 * @param {Record<string, string | undefined>} options.env
 * @param {(prompt: string) => Promise<string>} options.readKey
 * @param {string | null | undefined} options.userName
 * @param {string} options.today
 * @param {(file: string, text: string) => void} options.write
 * @param {() => TokenRead} [options.takeToken]
 * @param {string | null} [options.sessionId]
 * @returns {Promise<ApproveResult>}
 */
export async function approve({
	path: filePath,
	isTTY,
	env,
	readKey,
	userName,
	today,
	write,
	takeToken = () => ({ state: "missing", token: null }),
	sessionId = null,
}) {
	const absolute = path.resolve(filePath).split(path.sep).join("/");
	const inAgentSession = AGENT_MARKERS.some((marker) => Boolean(env[marker]));
	const viaChat = inAgentSession || !isTTY;
	/** @type {ChatToken | null} */
	let chatToken = null;
	if (viaChat) {
		// Taken before any other check, so one approve message allows one run
		// and an agent can't edit the file and retry on the same message.
		const taken = takeToken();
		const problem = checkChatToken(taken, absolute, sessionId, inAgentSession);
		if (problem) return refuse(problem);
		chatToken = taken.token;
	}

	const chain = CHAIN_FILE.exec(absolute);
	if (!chain) {
		return refuse(
			`${filePath} is not a chain file (.prism/plans/<folder>/{intent,design,plan}.md).`
		);
	}

	const folder = chain[1] ?? "";
	const stage = (chain[2] ?? "").toLowerCase();
	if (stage === "spec") return refuse("the spec needs no approval.");
	if (!existsSync(absolute)) return refuse(`${filePath} does not exist.`);
	if (
		chatToken &&
		recordedHash(chatToken.hashes, absolute) !== hashFile(absolute)
	) {
		return refuse(
			`${filePath} changed after the approve message, so the approval was discarded. Ask the person to read it again and type \`approve\`.`
		);
	}

	const text = readFileSync(absolute, "utf8");
	const block = readFrontmatter(text);
	if (!block) return refuse(`${filePath} has no frontmatter block.`);

	const lines = approvalLines(text);
	const reapproves = isSingleApproval(lines);
	if (
		!reapproves &&
		(lines.approved_by !== null ||
			lines.approved_at !== null ||
			lines.status === "approved")
	) {
		return refuse(
			`${filePath} has a partial or repeated approval (status: ${lines.status}, approved_by: ${lines.approved_by}, approved_at: ${lines.approved_at}). Leave one "status: draft" line and no approval lines.`
		);
	}

	if (
		!reapproves &&
		(lines.status !== "draft" || block.fields.status !== "draft")
	) {
		return refuse(
			`${filePath} needs exactly one "status: draft" line in its frontmatter.`
		);
	}

	const { fields } = block;
	let designLine = "-";
	if (stage === "intent") {
		const problem = checkIntent(text, fields, folder);
		if (problem) return refuse(problem);
		designLine = (sectionBody(text, "Design") ?? "").split("\n")[0] ?? "";
	}

	if (stage === "design") {
		if (fields.approval !== "required") {
			return refuse(
				`${filePath} says "approval: ${fields.approval ?? ""}", and only "approval: required" is approved here.`
			);
		}

		designLine = "approval: required";
	}

	const approver = (userName ?? "").trim();
	if (!approver)
		return refuse(
			"git config user.name is empty. Set it, then run this again."
		);

	if (!viaChat) {
		const prompt = [
			`Title:  ${fields.title ?? ""}`,
			`Size:   ${fields.size ?? "-"}`,
			`Design: ${designLine}`,
			reapproves
				? `Approved by ${lines.approved_by} on ${lines.approved_at}. Approve ${filePath} again? [y/N] `
				: `Approve ${filePath}? [y/N] `,
		].join("\n");
		const key = await readKey(prompt);
		if (key !== "y")
			return { code: 1, message: "Not approved. Nothing was written." };
	}

	const via = viaChat ? "chat" : null;
	const draft = reapproves ? clearApproval(text) : text;
	write(absolute, stampApproval(draft, approver, today, via));
	if (reapproves) {
		return {
			code: 0,
			message: `Approved ${filePath} again, replacing ${lines.approved_by}'s approval from ${lines.approved_at}.`,
		};
	}

	return { code: 0, message: `Approved ${filePath}.` };
}

/**
 * @param {string} reason
 * @returns {ApproveResult}
 */
function refuse(reason) {
	return { code: 1, message: `approve.mjs: ${reason}` };
}

/**
 * True when the frontmatter holds one complete approval, so the file can be
 * approved again after an edit. A repeated or half-written approval is not
 * one, and stays refused.
 *
 * @param {Record<"status" | "approved_by" | "approved_at", string | null>} lines
 * @returns {boolean}
 */
function isSingleApproval(lines) {
	return (
		lines.status === "approved" &&
		[lines.approved_by, lines.approved_at].every(
			(value) => value !== null && value !== "" && !value.includes("\n")
		)
	);
}

/**
 * Returns the text with its approval undone: `status: draft`, and the
 * `approved_by`, `approved_at`, and `approved_via` lines removed from the
 * frontmatter, so `stampApproval` writes a fresh set.
 *
 * @param {string} text
 * @returns {string}
 */
function clearApproval(text) {
	const block = readFrontmatter(text);
	if (!block) return text;

	const body = text
		.slice(block.start, block.end)
		.replace(/^approved_(?:by|at|via):[^\r\n]*\r?\n?/gm, "");

	return replaceFrontmatterLine(
		text.slice(0, block.start) + body + text.slice(block.end),
		"status",
		"status: draft"
	);
}

/**
 * Returns why a taken chat approval token can't approve `absolute`, or null
 * when it can. A missing token keeps the two refusals this script gave before
 * chat approval existed, so each still names its own cause.
 *
 * @param {TokenRead} taken
 * @param {string} absolute
 * @param {string | null} sessionId
 * @param {boolean} inAgentSession
 * @returns {string | null}
 */
function checkChatToken({ state, token }, absolute, sessionId, inAgentSession) {
	const fallback =
		"Ask the person to type `approve` in chat, or to run this in their own terminal.";
	if (state === "missing" && inAgentSession)
		return `approval is a human step and can't run inside an agent session without a chat approval. ${fallback}`;
	if (state === "missing")
		return `stdin is not a terminal and there is no chat approval. ${fallback}`;
	if (state === "invalid" || token === null)
		return `the chat approval token is unreadable, so it was discarded. ${fallback}`;
	if (sessionId && token.session !== sessionId)
		return `the chat approval came from another session, so it was discarded. ${fallback}`;

	if (token.path && comparablePath(token.path) !== comparablePath(absolute))
		return `the chat approval names ${token.path}, not this file, so it was discarded. ${fallback}`;

	return null;
}

/**
 * Returns the hash the token recorded for a file under any spelling of its
 * path, or null when the file wasn't there at the approve message.
 *
 * @param {Record<string, string>} hashes
 * @param {string} absolute
 * @returns {string | null}
 */
function recordedHash(hashes, absolute) {
	const target = comparablePath(absolute);
	const entry = Object.entries(hashes).find(
		([file]) => comparablePath(file) === target
	);

	return entry ? entry[1] : null;
}

/**
 * A path in a form two spellings of one file share: symlinks resolved, so
 * macOS's `/var` and `/private/var` agree, and a Windows 8.3 short name equals
 * its long form, and lowercased, since macOS and Windows paths ignore case.
 *
 * @param {string} file
 * @returns {string}
 */
function comparablePath(file) {
	let resolved = path.resolve(file);
	try {
		resolved = realpathSync.native(resolved);
	} catch {
		// a path that doesn't exist compares as written
	}

	return resolved.split(path.sep).join("/").toLowerCase();
}

/**
 * Returns the first reason an intent can't be approved, or null when it
 * passes every check.
 *
 * @param {string} text
 * @param {Record<string, string>} fields
 * @param {string} folder
 * @returns {string | null}
 */
function checkIntent(text, fields, folder) {
	if (!SIZES.has(fields["size"] ?? "")) {
		return `size must be standard or epic, not "${fields.size ?? ""}".`;
	}

	if (fields["size"] === "epic" && !folder.toLowerCase().startsWith("epic-")) {
		return `size: epic belongs only in an epic-*/ folder, and this one is ${folder}/.`;
	}

	for (const heading of REQUIRED_INTENT_SECTIONS) {
		const body = sectionBody(text, heading);
		if (body === null) return `## ${heading} is missing.`;
		if (!body) return `## ${heading} is empty.`;
		if (/^none\.?$/i.test(body))
			return `## ${heading} says only "none". Add the reason: "none — <why>".`;
	}

	const criteria = sectionBody(text, "Acceptance criteria") ?? "";
	if (fields["size"] !== "epic" && /^none\b/i.test(criteria)) {
		return "## Acceptance criteria can be none only on an epic intent.";
	}

	for (const heading of [
		"Regression surface",
		"Security surface",
		"Acceptance criteria",
	]) {
		const body = sectionBody(text, heading) ?? "";
		if (/^none\b/i.test(body) && !NONE_WITH_REASON.test(body)) {
			return `## ${heading} needs its reason on the "none" line: "none — <why>".`;
		}
	}

	const design = /^(not needed|needed|supplement)\b([\s\S]*)$/i.exec(
		sectionBody(text, "Design") ?? ""
	);
	if (!design || !(design[2] ?? "").replace(/^[\s—–:,.-]+/, "")) {
		return '## Design must open with "needed", "supplement", or "not needed", then a reason.';
	}

	return null;
}

// --- CLI ---

/**
 * @param {string} cwd
 * @returns {string}
 */
function readGitUserName(cwd) {
	try {
		return execFileSync("git", ["config", "user.name"], {
			cwd,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
	} catch {
		return "";
	}
}

/**
 * @param {string} prompt
 * @returns {Promise<string>}
 */
function readKeyFromTerminal(prompt) {
	process.stdout.write(prompt);

	return new Promise((resolve) => {
		process.stdin.setRawMode(true);
		process.stdin.resume();
		process.stdin.once("data", (chunk) => {
			process.stdin.setRawMode(false);
			process.stdin.pause();
			process.stdout.write("\n");
			resolve(chunk.toString("utf8"));
		});
	});
}

if (
	process.argv[1] &&
	realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	const target = process.argv[2];
	if (!target) {
		process.stderr.write("Usage: approve.mjs <path>\n");
		process.exitCode = 2;
	} else {
		const targetDir = path.dirname(path.resolve(target));
		const tokenPath = findTokenPath(targetDir);
		const result = await approve({
			path: target,
			isTTY: process.stdin.isTTY === true,
			env: process.env,
			readKey: readKeyFromTerminal,
			userName: readGitUserName(targetDir),
			today: formatLocalDate(new Date()),
			write: (file, text) => writeFileSync(file, text),
			takeToken: () =>
				tokenPath
					? takeChatToken(tokenPath)
					: { state: "missing", token: null },
			// Claude Code and Codex expose their session ids to the commands an agent
			// runs, so a host with neither leaves the guard's check standing alone.
			sessionId:
				process.env.CLAUDE_CODE_SESSION_ID ||
				process.env.CODEX_THREAD_ID ||
				null,
		});
		(result.code === 0 ? process.stdout : process.stderr).write(
			`${result.message}\n`
		);
		process.exitCode = result.code;
	}
}
