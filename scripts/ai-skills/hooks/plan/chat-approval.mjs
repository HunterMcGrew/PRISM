// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
/**
 * The chat approval token: what lets a person approve a plan-chain file by
 * typing `approve` in chat instead of running approve.mjs in a terminal.
 *
 * The approval guard's prompt arm (`approve-guard.mjs`, run on the
 * harness's prompt-submit event) writes the token when the person
 * says `approve` or `approved` in a message, per `parseApprovePrompt`.
 * `plan/approve.mjs` takes it, which deletes it, so one message
 * approves one run. The guard denies any tool call that names
 * the token file, which is the forging path.
 *
 * The token never expires, so the agent can run approve.mjs long after the
 * message. It records a hash of every chain artifact instead, and approve.mjs
 * refuses a file whose text changed after the person said `approve`.
 *
 * The token lives in the worktree's own git directory (`git rev-parse
 * --absolute-git-dir`), where agents don't write and where a session in
 * another worktree can't reach it. It carries the session id, so another
 * session in the same checkout can't use it either.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";

export const TOKEN_FILE = "prism-chat-approval.json";

/** @typedef {{ prompted_at: string, session: string, path: string | null, hashes: Record<string, string> }} ChatToken */

const CHAIN_STAGES = ["intent.md", "design.md", "plan.md"];

// `approve` or `approved` as a whole word, so `approve-guard is broken`,
// `approves`, and `preapproved` don't count.
const APPROVE_WORD = /(?<![\w-])approved?(?![\w-])/i;
// Messages the harness writes rather than the person: another session's
// message, and anything opening with a tag, such as `<task-notification>`.
const HARNESS_OPENER = /^(?:<|Another Claude session sent a message:)/i;
// Text the person quoted rather than said: fenced and inline code, quoted
// strings, `>` quote lines, and pasted blocks.
const QUOTED_TEXT = [
	/```[\s\S]*?```/g,
	/`[^`\n]*`/g,
	/"[^"\n]*"/g,
	/“[^”\n]*”/g,
	/^\s*>.*$/gm,
	/<pasted_content[\s\S]*?<\/pasted_content[^>]*>/gi,
];
// Any word ending in `n't` is a negation too, per `CONTRACTED_NEGATION`.
const NEGATIONS = new Set([
	"not",
	"never",
	"cannot",
	"dont",
	"cant",
	"wont",
	"didnt",
	"doesnt",
	"shouldnt",
	"wouldnt",
	"couldnt",
	"mustnt",
	"havent",
	"hasnt",
	"isnt",
	"arent",
	"wasnt",
	"werent",
]);
// A bare `nt` ending isn't matched, so `intent approved` still approves.
const CONTRACTED_NEGATION = /n't$/;
// Words that make a sentence talk about approving rather than approve: a
// condition, a wish, a guess, or a future. Any of them earlier in the sentence
// voids it, so "if it's an epic, i approve the epic" gives no approval. A miss
// here costs the person one more message, while a false approval stamps a file.
const HEDGES = new Set([
	"if",
	"when",
	"whether",
	"unless",
	"once",
	"wonder",
	"wondering",
	"maybe",
	"perhaps",
	"potentially",
	"probably",
	"might",
	"could",
	"would",
	"should",
	"may",
	"will",
	"gonna",
	"want",
	"wants",
	"wanted",
	"wanna",
	"hope",
	"hoping",
]);
// `I'll approve` is a future too.
const CONTRACTED_FUTURE = /'ll$/;

/**
 * Reads a prompt as a chat approval. Returns `{ path }` when a sentence the
 * person wrote says `approve` or `approved`, where `path` is the first word
 * after it ending in `.md`, or null.
 *
 * A sentence ending in `?`, with a negation in the three words before the
 * match, or with `to` or a hedge such as `if`, `could`, or `want` anywhere
 * before it, doesn't count, and neither do quoted text and harness-written
 * messages. Any other prompt returns null.
 *
 * @param {unknown} prompt
 * @returns {{ path: string | null } | null}
 */
export function parseApprovePrompt(prompt) {
	if (typeof prompt !== "string") return null;

	let text = prompt.trim();
	if (HARNESS_OPENER.test(text)) return null;
	for (const pattern of QUOTED_TEXT) text = text.replace(pattern, " ");

	for (const sentence of text.split(/(?<=[.!?])\s+|\n+/)) {
		const match = APPROVE_WORD.exec(sentence);
		if (!match || sentence.trim().endsWith("?")) continue;

		// Phones and macOS type a curly apostrophe, which the word split would break a contraction on.
		const before = sentence
			.slice(0, match.index)
			.toLowerCase()
			.replaceAll("’", "'");
		const words = before.split(/[^\w']+/).filter(Boolean);
		const lead = words.slice(-3);
		if (
			lead.some((word) => NEGATIONS.has(word) || CONTRACTED_NEGATION.test(word))
		)
			continue;
		if (
			words.at(-1) === "to" ||
			words.some((word) => HEDGES.has(word) || CONTRACTED_FUTURE.test(word))
		)
			continue;

		const after = sentence.slice(match.index + match[0].length);
		const file = /\S+\.md(?![\w-])/i.exec(after);
		return { path: file ? file[0] : null };
	}

	return null;
}

/**
 * Returns the token's path for a directory inside a git checkout, or null.
 *
 * @param {string} cwd
 * @returns {string | null}
 */
export function findTokenPath(cwd) {
	try {
		const gitDir = execFileSync("git", ["rev-parse", "--absolute-git-dir"], {
			cwd,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();

		return gitDir ? path.join(gitDir, TOKEN_FILE) : null;
	} catch {
		return null;
	}
}

/**
 * Returns the sha256 of a file's bytes as hex, or null when it can't be read.
 *
 * @param {string} file
 * @returns {string | null}
 */
export function hashFile(file) {
	try {
		return createHash("sha256").update(readFileSync(file)).digest("hex");
	} catch {
		return null;
	}
}

/**
 * Returns `{ <absolute path>: <sha256> }` for every approvable chain artifact
 * in the checkout holding `cwd`: each `intent.md`, `design.md`, and `plan.md`
 * one folder below `.prism/plans/` or `.prism/archived/plans/`.
 *
 * @param {string} cwd
 * @returns {Record<string, string>}
 */
export function hashChainFiles(cwd) {
	let root;
	try {
		root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
			cwd,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
	} catch {
		return {};
	}

	/** @type {Record<string, string>} */
	const hashes = {};
	for (const parent of [".prism/plans", ".prism/archived/plans"]) {
		for (const folder of listFolders(path.join(root, parent))) {
			for (const stage of CHAIN_STAGES) {
				const file = path.join(root, parent, folder, stage);
				const hash = hashFile(file);
				if (hash) hashes[file] = hash;
			}
		}
	}

	return hashes;
}

/**
 * @param {string} dir
 * @returns {string[]}
 */
function listFolders(dir) {
	try {
		return readdirSync(dir, { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name);
	} catch {
		return [];
	}
}

/**
 * Reads the token without consuming it. Returns `{ state, token }`, where
 * `state` is `missing`, `invalid`, or `fresh`, meaning readable and unused.
 *
 * @param {string} file
 * @returns {{ state: "missing" | "invalid" | "fresh", token: ChatToken | null }}
 */
export function readChatToken(file) {
	let text;
	try {
		text = readFileSync(file, "utf8");
	} catch {
		return { state: "missing", token: null };
	}

	return judgeToken(text);
}

/**
 * Reads the token and deletes it, so it approves at most one run. A token
 * another process deleted first reads as missing.
 *
 * @param {string} file
 * @returns {{ state: "missing" | "invalid" | "fresh", token: ChatToken | null }}
 */
export function takeChatToken(file) {
	const result = readChatToken(file);
	if (result.state === "missing") return result;

	try {
		unlinkSync(file);
	} catch {
		return { state: "missing", token: null };
	}

	return result;
}

/**
 * @param {string} text
 * @returns {{ state: "invalid" | "fresh", token: ChatToken | null }}
 */
function judgeToken(text) {
	let token;
	try {
		token = JSON.parse(text);
	} catch {
		return { state: "invalid", token: null };
	}

	if (
		Number.isNaN(Date.parse(token?.prompted_at)) ||
		typeof token.session !== "string" ||
		!token.session ||
		(token.path !== null && typeof token.path !== "string") ||
		!isHashMap(token.hashes)
	)
		return { state: "invalid", token: null };

	return { state: "fresh", token };
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isHashMap(value) {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value) &&
		Object.values(value).every((hash) => typeof hash === "string")
	);
}
