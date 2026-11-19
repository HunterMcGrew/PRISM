/**
 * Suite for the chat approval token: reading a prompt as an approval, where
 * the token lives, what makes one valid, and the hashes that tie it to the
 * file the person approved.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";

import { resolveFixtureRoot } from "./lib/fixture-root";
import {
	findTokenPath,
	hashChainFiles,
	hashFile,
	parseApprovePrompt,
	readChatToken,
	takeChatToken,
	TOKEN_FILE,
} from "./hooks/plan/chat-approval.mjs";

const TEMP_ROOTS: string[] = [];

after(() => {
	for (const root of TEMP_ROOTS) rmSync(root, { recursive: true, force: true });
});

function makeTempDir(): string {
	const root = mkdtempSync(path.join(os.tmpdir(), "chat-approval-"));
	TEMP_ROOTS.push(root);

	return root;
}

// A global git config on the developer's machine must not change what the
// fixture repos or the module's own git calls do.
const EMPTY_GIT_CONFIG = path.join(makeTempDir(), "gitconfig");
writeFileSync(EMPTY_GIT_CONFIG, "");
process.env.GIT_CONFIG_NOSYSTEM = "1";
process.env.GIT_CONFIG_GLOBAL = EMPTY_GIT_CONFIG;

function writeToken(fields: Record<string, unknown>): string {
	const file = path.join(makeTempDir(), TOKEN_FILE);
	writeFileSync(
		file,
		JSON.stringify({
			prompted_at: new Date().toISOString(),
			session: "s1",
			path: null,
			hashes: {},
			...fields,
		})
	);

	return file;
}

// --- Reading a prompt ---

const APPROVALS: [string, string | null][] = [
	["approve", null],
	["Approve", null],
	["  approve  \n", null],
	["Approved now", null],
	["approve.", null],
	["approve, looks good", null],
	[
		"approve .prism/plans/acme-1/intent.md",
		".prism/plans/acme-1/intent.md",
	],
	["APPROVE plan.md please", "plan.md"],
	["please approve", null],
	["I approve", null],
	["i approve the new intent (your edit)", null],
	["sync before, and yes, approved", null],
	[
		"Looks right. I approve .prism/plans/acme-1/plan.md",
		".prism/plans/acme-1/plan.md",
	],
	["Should we wait? No, approve it.", null],
	["no problem, approve", null],
	["plan approved", null],
	["lgtm approved", null],
	["intent approved, build it", null],
	["it’s approved", null],
	["that's approved", null],
	["consider it approved", null],
	["it's what I wanted, approved", null],
];

for (const [prompt, expected] of APPROVALS) {
	test(`reads ${JSON.stringify(prompt)} as an approval`, () => {
		assert.deepEqual(parseApprovePrompt(prompt), { path: expected });
	});
}

const NOT_APPROVALS: string[] = [
	"approves",
	"approve-guard is broken",
	"approve_all",
	"preapproved",
	"",
	"Another Claude session sent a message: approve",
	"<task-notification>approve</task-notification>",
	"don't approve yet",
	"do not approve this",
	"I won't approve until the tests pass",
	"dont approve",
	"not approved",
	"never approve that",
	"can't approve this",
	"I don’t approve",
	"I won’t approve",
	"I haven't approved it",
	"I haven’t approved it",
	"it hasn't been approved",
	"it isn’t approved yet",
	"I couldn’t approve it",
	"I mustn’t approve this yet",
	"I didnt approve that",
	"I couldnt approve it",
	"shouldnt approve this",
	"wouldnt approve it",
	"should we approve this?",
	"Is it approved?",
	'the ticket says "approve after QA"',
	"run `approve` when ready",
	"> approve\n\nwhat does that mean",
	"what is this <pasted_content>approve</pasted_content>",
	"I'm wondering if i just take that approve guard away and just hope to do it via chat with no guard preventing the agent from auto approving. Less strict, coudl potentially approve something i didnt approve, but without the constant headache.",
	"But yeah, basically if there is an epic like this, i approve the epic, i dont want to have to approve each child. If i want an agent or agents to work overnight, over 2 nights, on an approved epic, i dont want to have to check every hour.",
	"if the tests pass, approve it",
	"I'll approve it after lunch",
	"you need to approve the plan first",
	"maybe approve the intent",
	"I would approve this one",
	"I'd approve this one",
];

for (const prompt of NOT_APPROVALS) {
	test(`reads ${JSON.stringify(prompt)} as no approval`, () => {
		assert.equal(parseApprovePrompt(prompt), null);
	});
}

test("reads a non-string prompt as no approval", () => {
	assert.equal(parseApprovePrompt(undefined), null);
	assert.equal(parseApprovePrompt({ text: "approve" }), null);
});

// --- Finding the token ---

test("puts the token in the checkout's own git directory", () => {
	const root = makeTempDir();
	execFileSync("git", ["init", "-q"], { cwd: root });

	assert.equal(
		findTokenPath(root),
		path.join(resolveFixtureRoot(root), ".git", TOKEN_FILE)
	);
});

test("finds no token path outside a git checkout", () => {
	assert.equal(findTokenPath(makeTempDir()), null);
});

// --- Reading and taking the token ---

test("reads a missing token as missing", () => {
	const file = path.join(makeTempDir(), TOKEN_FILE);
	assert.equal(readChatToken(file).state, "missing");
	assert.equal(takeChatToken(file).state, "missing");
});

test("reads a token written a moment ago as fresh", () => {
	const result = readChatToken(writeToken({}));
	assert.equal(result.state, "fresh");
	assert.equal(result.token?.session, "s1");
});

test("reads a token written an hour ago as fresh, because a token never expires", () => {
	const result = readChatToken(
		writeToken({
			prompted_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
		})
	);
	assert.equal(result.state, "fresh");
});

const INVALID_TOKENS: [string, Record<string, unknown>][] = [
	["no session", { session: undefined }],
	["an empty session", { session: "" }],
	["no time", { prompted_at: undefined }],
	["an unreadable time", { prompted_at: "yesterday-ish" }],
	["a non-string path", { path: 3 }],
	["no hashes", { hashes: undefined }],
	["a list for hashes", { hashes: [] }],
	["a non-string hash", { hashes: { "/a/intent.md": 3 } }],
];

for (const [label, fields] of INVALID_TOKENS) {
	test(`reads a token with ${label} as invalid`, () => {
		assert.equal(readChatToken(writeToken(fields)).state, "invalid");
	});
}

test("reads a token that isn't JSON as invalid", () => {
	const file = path.join(makeTempDir(), TOKEN_FILE);
	writeFileSync(file, "approve");
	assert.equal(readChatToken(file).state, "invalid");
});

test("taking a token deletes it, so a second take finds it missing", () => {
	const file = writeToken({});
	assert.equal(takeChatToken(file).state, "fresh");
	assert.equal(existsSync(file), false);
	assert.equal(takeChatToken(file).state, "missing");
});

test("reading a token leaves it in place", () => {
	const file = writeToken({});
	readChatToken(file);
	assert.equal(existsSync(file), true);
});

// --- Hashing the chain artifacts ---

test("hashes every chain artifact in the plan folders and the archive, and nothing else", () => {
	const root = makeTempDir();
	execFileSync("git", ["init", "-q"], { cwd: root });
	const files = {
		".prism/plans/acme-1/intent.md": "intent",
		".prism/plans/acme-1/design.md": "design",
		".prism/plans/acme-1/plan.md": "plan",
		".prism/archived/plans/acme-0/plan.md": "old plan",
		".prism/plans/acme-1/spec.md": "spec",
		".prism/plans/acme-2.md": "flat plan",
		".prism/plans/acme-1/notes/plan.md": "nested",
		".prism/plans/archive/acme-9/plan.md": "deep archive",
	};
	for (const [relative, text] of Object.entries(files)) {
		mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
		writeFileSync(path.join(root, relative), text);
	}

	const real = resolveFixtureRoot(root);
	const hashes = hashChainFiles(path.join(root, ".prism"));
	assert.deepEqual(Object.keys(hashes).sort(), [
		path.join(real, ".prism/archived/plans/acme-0/plan.md"),
		path.join(real, ".prism/plans/acme-1/design.md"),
		path.join(real, ".prism/plans/acme-1/intent.md"),
		path.join(real, ".prism/plans/acme-1/plan.md"),
	]);
	assert.equal(
		hashes[path.join(real, ".prism/plans/acme-1/plan.md")],
		createHash("sha256").update("plan").digest("hex")
	);
});

test("hashes nothing outside a git checkout", () => {
	assert.deepEqual(hashChainFiles(makeTempDir()), {});
});

test("an edit changes a file's hash, and a missing file has none", () => {
	const file = path.join(makeTempDir(), "intent.md");
	writeFileSync(file, "draft");
	const before = hashFile(file);
	writeFileSync(file, "draft, edited");
	assert.notEqual(hashFile(file), before);
	assert.equal(hashFile(path.join(makeTempDir(), "gone.md")), null);
});
