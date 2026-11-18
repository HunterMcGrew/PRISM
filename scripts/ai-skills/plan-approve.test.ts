/**
 * Suite for the approval script: every refusal, the intent checks, the
 * keypress path, the chat-token path, and the agent markers of each host.
 */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";

import { approve } from "./hooks/plan/approve.mjs";
import { findTokenPath, hashFile, takeChatToken } from "./hooks/plan/chat-approval.mjs";
import { approvalLines, readFrontmatter } from "./hooks/plan/frontmatter.mjs";

const APPROVE_SCRIPT = fileURLToPath(
	new URL("./hooks/plan/approve.mjs", import.meta.url)
);
const HOST_MARKERS = [
	"CLAUDECODE",
	"CLAUDE_CODE_SESSION_ID",
	"CODEX_THREAD_ID",
	"CODEX_SESSION_ID",
	"CODEX_CI",
	"PRISM_HOOK_DISABLE",
	"PRISM_HOOK_DENY_DISABLE",
];
const TEMP_ROOTS: string[] = [];

after(() => {
	for (const root of TEMP_ROOTS) rmSync(root, { recursive: true, force: true });
});

// A global git config on the developer's machine must not change what the
// fixture repos or the spawned script's git calls do.
const EMPTY_GIT_CONFIG = path.join(
	mkdtempSync(path.join(os.tmpdir(), "approve-gitcfg-")),
	"gitconfig"
);
TEMP_ROOTS.push(path.dirname(EMPTY_GIT_CONFIG));
writeFileSync(EMPTY_GIT_CONFIG, "");
process.env.GIT_CONFIG_NOSYSTEM = "1";
process.env.GIT_CONFIG_GLOBAL = EMPTY_GIT_CONFIG;

const DEFAULT_SECTIONS: Record<string, string> = {
	Problem: "The search page is slow.",
	"Proposed outcome": "Search answers in under a second.",
	"Regression surface":
		"<!-- guidance -->\nThe search results page could break.",
	"Security surface": "none — the change reads no user input.",
	Design: "not needed — no UI change.",
	"Acceptance criteria":
		"**Results load fast**\n- Setup: a dealer site\n- Action: search\n- Expected: results in a second",
	"Open questions": "none",
};

function buildIntent({
	size = "standard",
	status = "status: draft",
	sections = {},
	omit = [],
}: {
	size?: string;
	status?: string;
	sections?: Record<string, string>;
	omit?: string[];
} = {}): string {
	const merged = { ...DEFAULT_SECTIONS, ...sections };
	const body = Object.entries(merged)
		.filter(([heading]) => !omit.includes(heading))
		.map(([heading, text]) => `## ${heading}\n\n${text}\n`)
		.join("\n");

	return `---\ntitle: Fast search\nticket: ACME-1\nstage: intent\n${status}\nsize: ${size}\n---\n\n<!-- copy as is -->\n\n${body}`;
}

function makeTempDir(): string {
	const root = mkdtempSync(path.join(os.tmpdir(), "approve-test-"));
	TEMP_ROOTS.push(root);

	return root;
}

function placeFile(root: string, relative: string, text: string): string {
	const file = path.join(root, relative);
	mkdirSync(path.dirname(file), { recursive: true });
	writeFileSync(file, text);

	return file;
}

type Overrides = Partial<Parameters<typeof approve>[0]>;

function run(file: string, overrides: Overrides = {}) {
	const writes: string[] = [];

	return approve({
		path: file,
		isTTY: true,
		env: {},
		readKey: async () => "y",
		userName: "Hunter McGrew",
		today: "2026-11-01",
		write: (target, text) => {
			writes.push(target);
			writeFileSync(target, text);
		},
		...overrides,
	}).then((result) => ({ ...result, writes }));
}

async function assertRefused(
	file: string,
	overrides: Overrides,
	pattern: RegExp
) {
	const before = readFileSync(file, "utf8");
	const result = await run(file, overrides);
	assert.equal(result.code, 1, result.message);
	assert.match(result.message, pattern);
	assert.equal(result.writes.length, 0);
	assert.equal(readFileSync(file, "utf8"), before);
}

// --- Refusals that run before the file is read ---

for (const marker of [
	"CLAUDECODE",
	"CODEX_THREAD_ID",
	"CODEX_SESSION_ID",
	"CODEX_CI",
]) {
	test(`refuses inside an agent session marked by ${marker}`, async () => {
		const file = placeFile(
			makeTempDir(),
			".prism/plans/acme-1/intent.md",
			buildIntent()
		);
		await assertRefused(file, { env: { [marker]: "1" } }, /agent session/);
	});
}

test("refuses when stdin is not a terminal", async () => {
	const file = placeFile(
		makeTempDir(),
		".prism/plans/acme-1/intent.md",
		buildIntent()
	);
	await assertRefused(file, { isTTY: false }, /not a terminal/);
});

test("refuses a file outside the plan chain", async () => {
	const file = placeFile(
		makeTempDir(),
		".prism/plans/acme-1.md",
		buildIntent()
	);
	await assertRefused(file, {}, /not a chain file/);
});

test("refuses spec.md, which needs no approval", async () => {
	const file = placeFile(
		makeTempDir(),
		".prism/plans/acme-1/spec.md",
		buildIntent()
	);
	await assertRefused(file, {}, /spec needs no approval/);
});

test("approves an approved file again, replacing its approval lines", async () => {
	const approved = buildIntent({
		status:
			"status: approved\napproved_by: Ada\napproved_at: 2026-10-01\napproved_via: chat",
	});
	const file = placeFile(
		makeTempDir(),
		".prism/plans/acme-1/intent.md",
		approved
	);
	let shown = "";
	const result = await run(file, {
		readKey: async (prompt) => {
			shown = prompt;
			return "y";
		},
	});

	assert.equal(result.code, 0, result.message);
	assert.match(
		result.message,
		/again, replacing Ada's approval from 2026-10-01/
	);
	assert.match(shown, /Approved by Ada on 2026-10-01\. Approve .* again\?/);
	const text = readFileSync(file, "utf8");
	assert.match(
		text,
		/status: approved\napproved_by: Hunter McGrew\napproved_at: 2026-11-01\n/
	);
	assert.doesNotMatch(text, /Ada|approved_via/);
	assert.equal(result.writes.length, 1);
});

test("re-approves through a chat token the same way", async () => {
	const approved = buildIntent({
		status: "status: approved\napproved_by: Ada\napproved_at: 2026-10-01",
	});
	const file = placeFile(
		makeTempDir(),
		".prism/plans/acme-1/intent.md",
		approved
	);
	const result = await run(file, {
		env: { CLAUDECODE: "1" },
		takeToken: () => chatToken(file, { session: "s1", path: null }),
		sessionId: "s1",
	});

	assert.equal(result.code, 0, result.message);
	assert.match(
		readFileSync(file, "utf8"),
		/approved_by: Hunter McGrew\napproved_at: 2026-11-01\napproved_via: chat/
	);
});

test("refuses a repeated approval line", async () => {
	const twice = buildIntent({
		status:
			"status: approved\napproved_by: Ada\napproved_by: Bo\napproved_at: 2026-10-01",
	});
	const file = placeFile(
		makeTempDir(),
		".prism/plans/acme-1/intent.md",
		twice
	);
	await assertRefused(file, {}, /partial or repeated approval/);
});

test("refuses a half-written approval and names what it found", async () => {
	const half = buildIntent({
		status: "status: draft\napproved_by: Ada",
	});
	const file = placeFile(
		makeTempDir(),
		".prism/plans/acme-1/intent.md",
		half
	);
	await assertRefused(
		file,
		{},
		/partial or repeated approval \(status: draft, approved_by: Ada, approved_at: null\)/
	);
});

test("refuses a second status line", async () => {
	const file = placeFile(
		makeTempDir(),
		".prism/plans/acme-1/intent.md",
		buildIntent({ status: "status: draft\nstatus: draft" })
	);
	await assertRefused(file, {}, /exactly one "status: draft"/);
});

test("refuses a file with no frontmatter block", async () => {
	const file = placeFile(
		makeTempDir(),
		".prism/plans/acme-1/plan.md",
		"## Tasks\n"
	);
	await assertRefused(file, {}, /no frontmatter block/);
});

test("refuses a chain path that does not exist", async () => {
	const result = await run(
		path.join(makeTempDir(), ".prism/plans/acme-1/intent.md")
	);
	assert.equal(result.code, 1);
	assert.match(result.message, /does not exist/);
	assert.equal(result.writes.length, 0);
});

// --- Intent checks ---

for (const heading of [
	"Regression surface",
	"Security surface",
	"Design",
	"Acceptance criteria",
]) {
	test(`refuses an intent missing ## ${heading}`, async () => {
		const file = placeFile(
			makeTempDir(),
			".prism/plans/acme-1/intent.md",
			buildIntent({ omit: [heading] })
		);
		await assertRefused(file, {}, new RegExp(`## ${heading} is missing`));
	});
}

test("refuses a section holding only an HTML comment", async () => {
	const file = placeFile(
		makeTempDir(),
		".prism/plans/acme-1/intent.md",
		buildIntent({ sections: { "Regression surface": "<!-- fill this in -->" } })
	);
	await assertRefused(file, {}, /## Regression surface is empty/);
});

for (const heading of ["Regression surface", "Security surface"]) {
	for (const bare of ["none", "None."]) {
		test(`refuses a bare "${bare}" in ## ${heading}`, async () => {
			const file = placeFile(
				makeTempDir(),
				".prism/plans/acme-1/intent.md",
				buildIntent({ sections: { [heading]: bare } })
			);
			await assertRefused(
				file,
				{},
				new RegExp(`## ${heading} says only "none"`)
			);
		});
	}
}

for (const [label, text] of [
	["a dash and no reason", "none —"],
	["no separator before the reason", "none because nothing reads it"],
	["the reason on the next line", "none\n\nnothing existing reads it"],
]) {
	test(`refuses a surface reading "none" with ${label}`, async () => {
		const file = placeFile(
			makeTempDir(),
			".prism/plans/acme-1/intent.md",
			buildIntent({ sections: { "Regression surface": text } })
		);
		await assertRefused(
			file,
			{},
			/## Regression surface needs its reason on the "none" line/
		);
	});
}

for (const text of ["none —", "none because no behavior changes"]) {
	test(`refuses acceptance criteria reading ${JSON.stringify(text)} on a standard intent`, async () => {
		const file = placeFile(
			makeTempDir(),
			".prism/plans/acme-1/intent.md",
			buildIntent({ sections: { "Acceptance criteria": text } })
		);
		await assertRefused(
			file,
			{},
			/Acceptance criteria can be none only on an epic intent/
		);
	});
}

test('approves "none — reason" on a surface', async () => {
	const file = placeFile(
		makeTempDir(),
		".prism/plans/acme-1/intent.md",
		buildIntent({
			sections: {
				"Regression surface": "none: nothing existing reads this file.",
			},
		})
	);
	const result = await run(file);
	assert.equal(result.code, 0, result.message);
	assert.equal(approvalLines(readFileSync(file, "utf8")).status, "approved");
});

test('refuses "none — reason" acceptance criteria on a standard intent', async () => {
	const file = placeFile(
		makeTempDir(),
		".prism/plans/acme-1/intent.md",
		buildIntent({
			sections: { "Acceptance criteria": "none — the children carry them." },
		})
	);
	await assertRefused(
		file,
		{},
		/Acceptance criteria can be none only on an epic intent/
	);
});

test('approves "none — reason" acceptance criteria on an epic intent', async () => {
	const file = placeFile(
		makeTempDir(),
		".prism/plans/epic-acme-1/intent.md",
		buildIntent({
			size: "epic",
			sections: { "Acceptance criteria": "none — the children carry them." },
		})
	);
	const result = await run(file);
	assert.equal(result.code, 0, result.message);
});

test("refuses size: epic outside an epic-*/ folder", async () => {
	const file = placeFile(
		makeTempDir(),
		".prism/plans/acme-1/intent.md",
		buildIntent({ size: "epic" })
	);
	await assertRefused(
		file,
		{},
		/size: epic belongs only in an epic-\*\/ folder/
	);
});

for (const size of ["small", "short", "normal", ""]) {
	test(`refuses size "${size}", which is outside standard and epic`, async () => {
		const file = placeFile(
			makeTempDir(),
			".prism/plans/acme-1/intent.md",
			buildIntent({ size })
		);
		await assertRefused(file, {}, /size must be standard or epic/);
	});
}

for (const design of ["maybe — not sure yet", "needed", "not needed."]) {
	test(`refuses a Design section reading "${design}"`, async () => {
		const file = placeFile(
			makeTempDir(),
			".prism/plans/acme-1/intent.md",
			buildIntent({ sections: { Design: design } })
		);
		await assertRefused(file, {}, /## Design must open with/);
	});
}

// --- Design and plan files ---

test("refuses design.md whose approval is not required", async () => {
	const design =
		"---\ntitle: Fast search\nticket: ACME-1\nstage: design\nstatus: draft\napproval: not-required\n---\n";
	const file = placeFile(
		makeTempDir(),
		".prism/plans/acme-1/design.md",
		design
	);
	await assertRefused(file, {}, /only "approval: required"/);
});

test("approves design.md whose approval is required", async () => {
	const design =
		"---\ntitle: Fast search\nticket: ACME-1\nstage: design\nstatus: draft\napproval: required\n---\n";
	const file = placeFile(
		makeTempDir(),
		".prism/plans/acme-1/design.md",
		design
	);
	const result = await run(file);
	assert.equal(result.code, 0, result.message);
	assert.equal(approvalLines(readFileSync(file, "utf8")).status, "approved");
});

test("approves plan.md with no section checks", async () => {
	const plan =
		"---\ntitle: Fast search\nticket: ACME-1\nstage: plan\nstatus: draft\n---\n\n## Tasks\n";
	const file = placeFile(makeTempDir(), ".prism/plans/acme-1/plan.md", plan);
	const result = await run(file);
	assert.equal(result.code, 0, result.message);
});

test("approves plan.md in an archived plan folder", async () => {
	const plan =
		"---\ntitle: Fast search\nticket: ACME-1\nstage: plan\nstatus: draft\n---\n\n## Tasks\n";
	const file = placeFile(
		makeTempDir(),
		".prism/archived/plans/acme-1/plan.md",
		plan
	);
	const result = await run(file);
	assert.equal(result.code, 0, result.message);
	assert.equal(approvalLines(readFileSync(file, "utf8")).status, "approved");
});

test("reads an upper-case chain path as its stage and runs the intent checks", async () => {
	const file = placeFile(
		makeTempDir(),
		".prism/plans/acme-1/INTENT.md",
		buildIntent({ omit: ["Security surface"] })
	);
	await assertRefused(file, {}, /## Security surface is missing/);
});

test("refuses an intent carrying a capitalized Status line beside the draft one", async () => {
	const file = placeFile(
		makeTempDir(),
		".prism/plans/acme-1/intent.md",
		buildIntent({ status: "status: draft\nStatus: approved" })
	);
	await assertRefused(file, {}, /exactly one "status: draft" line/);
});

// --- Confirmation and the write ---

test("shows title, size, and design in the prompt, and writes nothing on a key other than y", async () => {
	const file = placeFile(
		makeTempDir(),
		".prism/plans/acme-1/intent.md",
		buildIntent()
	);
	let prompt = "";
	for (const key of ["n", "Y", "\r", "\u0003"]) {
		await assertRefused(
			file,
			{
				readKey: async (text) => {
					prompt = text;
					return key;
				},
			},
			/Not approved/
		);
	}

	assert.match(prompt, /Title: {2}Fast search/);
	assert.match(prompt, /Size: {3}standard\n/);
	assert.match(prompt, /Design: not needed — no UI change\./);
	assert.match(prompt, /\[y\/N\] $/);
});

test("refuses when git user.name is empty, before asking", async () => {
	const file = placeFile(
		makeTempDir(),
		".prism/plans/acme-1/intent.md",
		buildIntent()
	);
	let asked = false;
	await assertRefused(
		file,
		{
			userName: "  ",
			readKey: async () => {
				asked = true;
				return "y";
			},
		},
		/user\.name is empty/
	);
	assert.equal(asked, false);
});

test("writes the three approval lines after status and leaves every other byte as it was", async () => {
	const file = placeFile(
		makeTempDir(),
		".prism/plans/acme-1/intent.md",
		buildIntent()
	);
	const result = await run(file);
	assert.equal(result.code, 0, result.message);

	const expected = [
		"---",
		"title: Fast search",
		"ticket: ACME-1",
		"stage: intent",
		"status: approved",
		"approved_by: Hunter McGrew",
		"approved_at: 2026-11-01",
		"size: standard",
		"---",
		"",
		"<!-- copy as is -->",
		"",
		"## Problem",
		"",
		"The search page is slow.",
		"",
		"## Proposed outcome",
		"",
		"Search answers in under a second.",
		"",
		"## Regression surface",
		"",
		"<!-- guidance -->",
		"The search results page could break.",
		"",
		"## Security surface",
		"",
		"none — the change reads no user input.",
		"",
		"## Design",
		"",
		"not needed — no UI change.",
		"",
		"## Acceptance criteria",
		"",
		"**Results load fast**",
		"- Setup: a dealer site",
		"- Action: search",
		"- Expected: results in a second",
		"",
		"## Open questions",
		"",
		"none",
		"",
	].join("\n");
	assert.equal(readFileSync(file, "utf8"), expected);
});

test("a user name holding $& is written literally", async () => {
	const file = placeFile(
		makeTempDir(),
		".prism/plans/acme-1/plan.md",
		"---\nstatus: draft\n---\n"
	);
	await run(file, { userName: "Ada $& $1" });
	assert.equal(
		approvalLines(readFileSync(file, "utf8")).approved_by,
		"Ada $& $1"
	);
});

// --- No plan.md ---

test("approving an intent creates no plan.md", async () => {
	const root = makeTempDir();
	const file = placeFile(
		root,
		".prism/plans/acme-1/intent.md",
		buildIntent()
	);
	await run(file);
	assert.equal(
		existsSync(path.join(root, ".prism/plans/acme-1/plan.md")),
		false
	);
});

// --- The CLI ---

/** The process environment with every host marker removed, so the host running the suite never leaks in. */
function cleanEnv(overrides: Record<string, string> = {}): NodeJS.ProcessEnv {
	const env = { ...process.env };
	for (const marker of HOST_MARKERS) delete env[marker];

	return { ...env, ...overrides };
}

for (const [label, marker, pattern] of [
	["with CLAUDECODE=1", "CLAUDECODE", /agent session/],
	["with CODEX_THREAD_ID set", "CODEX_THREAD_ID", /agent session/],
	["without a host marker", null, /not a terminal/],
] as [string, string | null, RegExp][]) {
	test(`the CLI exits 1 on piped stdin ${label} and leaves the file unchanged`, () => {
		const file = placeFile(
			makeTempDir(),
			".prism/plans/acme-1/intent.md",
			buildIntent()
		);
		const before = readFileSync(file, "utf8");

		const child = spawnSync(process.execPath, [APPROVE_SCRIPT, file], {
			env: cleanEnv(marker ? { [marker]: "1" } : {}),
			input: "y\n",
			encoding: "utf8",
		});
		assert.equal(child.status, 1, child.stderr);
		assert.match(child.stderr, pattern);
		assert.equal(readFileSync(file, "utf8"), before);
	});
}

test("the CLI prints the usage line and exits 2 with no argument", () => {
	const child = spawnSync(process.execPath, [APPROVE_SCRIPT], {
		env: cleanEnv(),
		input: "",
		encoding: "utf8",
	});

	assert.equal(child.status, 2);
	assert.match(child.stderr, /Usage: approve\.mjs <path>/);
});

// --- Chat approval ---

const SESSION = "session-1";

function chatToken(file: string, fields: Record<string, unknown> = {}) {
	const hash = hashFile(file);

	return {
		state: "fresh" as const,
		token: {
			prompted_at: "2026-11-01T12:00:00.000Z",
			session: SESSION,
			path: file,
			hashes: hash ? { [file]: hash } : {},
			...fields,
		},
	};
}

function runChat(file: string, overrides: Overrides = {}) {
	const taken: boolean[] = [];

	return run(file, {
		isTTY: false,
		env: { CLAUDECODE: "1" },
		readKey: async () => {
			throw new Error("chat approval asks for no key");
		},
		sessionId: SESSION,
		takeToken: () => {
			taken.push(true);
			return chatToken(file);
		},
		...overrides,
	}).then((result) => ({ ...result, taken: taken.length }));
}

test("inside an agent session, a fresh token approves without a key and records approved_via: chat", async () => {
	const file = placeFile(
		makeTempDir(),
		".prism/plans/acme-1/intent.md",
		buildIntent()
	);
	const result = await runChat(file);
	assert.equal(result.code, 0, result.message);
	assert.equal(result.taken, 1);

	const fields = readFrontmatter(readFileSync(file, "utf8"))?.fields ?? {};
	assert.equal(fields.status, "approved");
	assert.equal(fields.approved_by, "Hunter McGrew");
	assert.equal(fields.approved_at, "2026-11-01");
	assert.equal(fields.approved_via, "chat");
});

test("without a terminal or a host marker, a fresh token approves the same way", async () => {
	const file = placeFile(
		makeTempDir(),
		".prism/plans/acme-1/plan.md",
		"---\nstatus: draft\n---\n"
	);
	const result = await runChat(file, { env: {}, sessionId: null });
	assert.equal(result.code, 0, result.message);
	assert.equal(
		readFrontmatter(readFileSync(file, "utf8"))?.fields.approved_via,
		"chat"
	);
});

test("a token naming no file approves the file the agent passes", async () => {
	const file = placeFile(
		makeTempDir(),
		".prism/plans/acme-1/intent.md",
		buildIntent()
	);
	const result = await runChat(file, {
		takeToken: () => chatToken(file, { path: null }),
	});
	assert.equal(result.code, 0, result.message);
});

function writeTokenFile(root: string, file: string, promptedAt: number): string {
	const tokenFile = path.join(root, "chat-token.json");
	writeFileSync(
		tokenFile,
		JSON.stringify({
			prompted_at: new Date(promptedAt).toISOString(),
			session: SESSION,
			path: null,
			hashes: {
				[file]: hashFile(file),
			},
		})
	);

	return tokenFile;
}

test("a chat approval written an hour ago still approves the unedited file", async () => {
	const root = makeTempDir();
	const file = placeFile(
		root,
		".prism/plans/acme-1/intent.md",
		buildIntent()
	);
	const tokenFile = writeTokenFile(root, file, Date.now() - 60 * 60 * 1000);

	const result = await runChat(file, {
		takeToken: () => takeChatToken(tokenFile),
	});
	assert.equal(result.code, 0, result.message);
	assert.equal(
		readFrontmatter(readFileSync(file, "utf8"))?.fields.approved_via,
		"chat"
	);
	assert.equal(existsSync(tokenFile), false);
});

test("refuses a file edited after the approve message and writes nothing", async () => {
	const root = makeTempDir();
	const file = placeFile(
		root,
		".prism/plans/acme-1/intent.md",
		buildIntent()
	);
	const tokenFile = writeTokenFile(root, file, Date.now());
	writeFileSync(
		file,
		`${readFileSync(file, "utf8")}\nAn edit after approve.\n`
	);
	const before = readFileSync(file, "utf8");

	const result = await runChat(file, {
		takeToken: () => takeChatToken(tokenFile),
	});
	assert.equal(result.code, 1, result.message);
	assert.match(result.message, /changed after the approve message/);
	assert.match(result.message, /read it again and type `approve`/);
	assert.equal(result.writes.length, 0);
	assert.equal(readFileSync(file, "utf8"), before);
});

test("refuses a file drafted after the approve message and writes nothing", async () => {
	const root = makeTempDir();
	const file = path.join(root, ".prism/plans/acme-1/intent.md");
	const taken = chatToken(file, { path: null });
	assert.deepEqual(taken.token.hashes, {});
	placeFile(root, ".prism/plans/acme-1/intent.md", buildIntent());
	const before = readFileSync(file, "utf8");

	const result = await runChat(file, { takeToken: () => taken });
	assert.equal(result.code, 1, result.message);
	assert.match(result.message, /changed after the approve message/);
	assert.equal(result.writes.length, 0);
	assert.equal(readFileSync(file, "utf8"), before);
});

const CHAT_REFUSALS: [
	string,
	(file: string) => ReturnType<typeof takeChatToken>,
	RegExp,
][] = [
	[
		"an unreadable token",
		() => ({ state: "invalid" as const, token: null }),
		/unreadable/,
	],
	[
		"a token from another session",
		(file) => chatToken(file, { session: "session-2" }),
		/another session/,
	],
	[
		"a token naming another file",
		() => chatToken("/elsewhere/.prism/plans/acme-2/intent.md"),
		/names \/elsewhere/,
	],
];

for (const [label, takeToken, pattern] of CHAT_REFUSALS) {
	test(`inside an agent session, refuses ${label} and writes nothing`, async () => {
		const file = placeFile(
			makeTempDir(),
			".prism/plans/acme-1/intent.md",
			buildIntent()
		);
		const before = readFileSync(file, "utf8");
		const result = await runChat(file, { takeToken: () => takeToken(file) });
		assert.equal(result.code, 1);
		assert.match(result.message, pattern);
		assert.match(result.message, /type `approve` in chat/);
		assert.equal(result.writes.length, 0);
		assert.equal(readFileSync(file, "utf8"), before);
	});
}

test("the token is taken even when a later check refuses, so a fixed file needs a new approve", async () => {
	const file = placeFile(
		makeTempDir(),
		".prism/plans/acme-1/intent.md",
		buildIntent({ omit: ["Design"] })
	);
	const result = await runChat(file);
	assert.equal(result.code, 1);
	assert.match(result.message, /## Design is missing/);
	assert.equal(result.taken, 1);
});

test("a terminal approval asks for the key, takes no token, and writes no approved_via line", async () => {
	const file = placeFile(
		makeTempDir(),
		".prism/plans/acme-1/intent.md",
		buildIntent()
	);
	let asked = false;
	let taken = false;
	const result = await run(file, {
		readKey: async () => {
			asked = true;
			return "y";
		},
		takeToken: () => {
			taken = true;
			return chatToken(file);
		},
	});
	assert.equal(result.code, 0, result.message);
	assert.equal(asked, true);
	assert.equal(taken, false);
	assert.doesNotMatch(readFileSync(file, "utf8"), /approved_via/);
});

// --- Chat approval through the CLI and each host's session id ---

function makeGitRepo(): string {
	const root = makeTempDir();
	execFileSync("git", ["init", "-q"], { cwd: root });
	execFileSync("git", ["config", "user.name", "Hunter McGrew"], { cwd: root });

	return root;
}

function writeRepoToken(root: string, file: string, session: string): void {
	const tokenPath = findTokenPath(root);
	assert.ok(tokenPath, "the fixture repo has a git directory");
	writeFileSync(
		tokenPath,
		JSON.stringify({
			prompted_at: "2026-11-01T12:00:00.000Z",
			session,
			path: null,
			hashes: { [file]: hashFile(file) },
		})
	);
}

function runCli(root: string, target: string, env: Record<string, string>) {
	return spawnSync(process.execPath, [APPROVE_SCRIPT, target], {
		cwd: root,
		env: cleanEnv(env),
		input: "",
		encoding: "utf8",
	});
}

test("the CLI accepts a token whose session is the Codex thread id when no Claude session id is set", () => {
	const root = makeGitRepo();
	const target = ".prism/plans/acme-1/intent.md";
	const file = placeFile(root, target, buildIntent());
	writeRepoToken(root, file, "thread-1");

	const child = runCli(root, target, { CODEX_THREAD_ID: "thread-1" });

	assert.equal(child.status, 0, child.stderr);
	assert.match(readFileSync(file, "utf8"), /approved_via: chat/);
});

test("the CLI refuses a token whose session is not the Codex thread id", () => {
	const root = makeGitRepo();
	const target = ".prism/plans/acme-1/intent.md";
	const file = placeFile(root, target, buildIntent());
	writeRepoToken(root, file, "thread-1");
	const before = readFileSync(file, "utf8");

	const child = runCli(root, target, { CODEX_THREAD_ID: "thread-2" });

	assert.equal(child.status, 1);
	assert.match(child.stderr, /another session/);
	assert.equal(readFileSync(file, "utf8"), before);
});

test("the CLI prefers the Claude session id over the Codex thread id", () => {
	const root = makeGitRepo();
	const target = ".prism/plans/acme-1/intent.md";
	const file = placeFile(root, target, buildIntent());
	writeRepoToken(root, file, "claude-1");

	const child = runCli(root, target, {
		CLAUDECODE: "1",
		CLAUDE_CODE_SESSION_ID: "claude-1",
		CODEX_THREAD_ID: "thread-1",
	});

	assert.equal(child.status, 0, child.stderr);
});

// --- Chat approval through the prompt hook ---

const PROMPT_HOOK = fileURLToPath(
	new URL("./hooks/approve-guard.mjs", import.meta.url)
);

function submitPrompt(root: string, prompt: string, session = SESSION): void {
	const child = spawnSync(
		process.execPath,
		[PROMPT_HOOK, "--tool=claude", "--event=UserPromptSubmit"],
		{
			input: JSON.stringify({
				hook_event_name: "UserPromptSubmit",
				prompt,
				session_id: session,
				cwd: root,
			}),
			env: cleanEnv(),
			encoding: "utf8",
		}
	);
	assert.equal(child.status, 0, child.stderr);
}

function runClaudeCli(root: string, target: string, session = SESSION) {
	return runCli(root, target, {
		CLAUDECODE: "1",
		CLAUDE_CODE_SESSION_ID: session,
	});
}

test("the CLI approves once on a token the prompt hook wrote", () => {
	const root = makeGitRepo();
	const target = ".prism/plans/acme-1/intent.md";
	placeFile(root, target, buildIntent());
	placeFile(root, ".prism/plans/acme-2/intent.md", buildIntent());
	submitPrompt(root, "approve");

	const first = runClaudeCli(root, target);
	assert.equal(first.status, 0, first.stderr);
	assert.match(
		readFileSync(path.join(root, target), "utf8"),
		/approved_via: chat/
	);

	const second = runClaudeCli(root, ".prism/plans/acme-2/intent.md");
	assert.equal(second.status, 1);
	assert.match(second.stderr, /without a chat approval/);
});

test("the CLI refuses a token the prompt hook wrote for another session", () => {
	const root = makeGitRepo();
	const target = ".prism/plans/acme-1/intent.md";
	placeFile(root, target, buildIntent());
	submitPrompt(root, "approve", "session-2");

	const child = runClaudeCli(root, target);
	assert.equal(child.status, 1);
	assert.match(child.stderr, /another session/);
});

test("the CLI refuses after a prompt that isn't an approval", () => {
	const root = makeGitRepo();
	const target = ".prism/plans/acme-1/intent.md";
	placeFile(root, target, buildIntent());
	submitPrompt(root, "looks good, keep going");

	const child = runClaudeCli(root, target);
	assert.equal(child.status, 1);
	assert.match(child.stderr, /without a chat approval/);
});

test("the CLI refuses a draft written after the prompt hook ran", () => {
	const root = makeGitRepo();
	const target = ".prism/plans/acme-1/intent.md";
	submitPrompt(root, "approve");
	placeFile(root, target, buildIntent());
	const before = readFileSync(path.join(root, target), "utf8");

	const child = runClaudeCli(root, target);
	assert.equal(child.status, 1);
	assert.match(child.stderr, /changed after the approve message/);
	assert.equal(readFileSync(path.join(root, target), "utf8"), before);
});

test("the CLI refuses a token that names a different draft", () => {
	const root = makeGitRepo();
	placeFile(root, ".prism/plans/acme-1/intent.md", buildIntent());
	placeFile(root, ".prism/plans/acme-2/intent.md", buildIntent());
	submitPrompt(root, "approve .prism/plans/acme-2/intent.md");

	const child = runClaudeCli(root, ".prism/plans/acme-1/intent.md");
	assert.equal(child.status, 1);
	assert.match(child.stderr, /names .*acme-2[\\/]intent\.md, not this file/);
});
