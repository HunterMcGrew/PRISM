/**
 * Regression suite for the umbrella-section speed bump: the write-gate deny
 * that stops a new heading in an umbrella doc or a rule file once per scope,
 * doc, and heading, and lets the same edit through on retry.
 *
 * The three gate legs run on the Claude and Codex rows, the two hosts whose
 * deny envelope the hook answers in. Cursor has no deny envelope and no
 * delivery path, so its test asserts the edit passes.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

import {
	extractNewHeadings,
	formatUmbrellaReason,
	loadRouteState,
	saveRouteState,
} from "./hooks/architect-route.mjs";
import { runPostToolUseArm, runPreToolUseArm } from "./hooks/hook.mjs";
import { extractPatchAddedText, HARNESSES } from "./hooks/harnesses.mjs";
import {
	compileMatcher,
	manifestRoutes,
	manifestUmbrellas,
} from "./hooks/lib/match.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const prismRepoRoot = path.resolve(scriptDirectory, "..", "..");

const RULE_PATH = ".prism/rules/sample.md";
const RULE_BODY = "---\nload: always\n---\n\n# Sample\n\n## Existing\n\nBody.\n";
const UMBRELLA_DOC = "_toolkit/big.md";
const UMBRELLA_PATH = `.prism/architect/${UMBRELLA_DOC}`;
const OTHER_PATH = ".prism/architect/_toolkit/other.md";
const GOVERNING_DOCS = ["_toolkit/spec-editing.md", "guides/writing-an-architect-doc.md"];

const RULE_REASON =
	'You\'re adding "## Brand new" to `.prism/rules/sample.md`, a rule file that loads in every session. ' +
	"Name the files this section governs. If it applies whichever file is being touched, retry this edit unchanged. " +
	"If not, put it in a routed architect doc, per .prism/architect/guides/writing-an-architect-doc.md § Where new content goes, " +
	"and keep what stays short, per .prism/rules/writing-voice.md § Keep it short enough to be read.";

async function withTempRepo<T>(build: (repoRoot: string) => Promise<T>): Promise<T> {
	const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "prism-umbrella-"));
	try {
		return await build(tempRoot);
	} finally {
		await fs.rm(tempRoot, { force: true, recursive: true });
	}
}

async function writeRepoFile(repoRoot: string, relativePath: string, body: string): Promise<void> {
	const absolutePath = path.join(repoRoot, ...relativePath.split("/"));
	await fs.mkdir(path.dirname(absolutePath), { recursive: true });
	await fs.writeFile(absolutePath, body, "utf8");
}

/**
 * Seeds a repo with one rule file and one umbrella doc, both on the
 * `umbrellas` list, and an off-list doc. When `credited` is true the scope
 * has already read every governing doc, so only the speed bump can deny.
 */
async function seedUmbrellaRepo(
	repoRoot: string,
	{ credited = true, scopeId = "session-1" } = {}
): Promise<void> {
	await writeRepoFile(
		repoRoot,
		".prism/architect/manifest.json",
		JSON.stringify(
			{
				".prism/rules/**": GOVERNING_DOCS[0],
				".prism/architect/**": GOVERNING_DOCS[1],
				"src/**": UMBRELLA_DOC,
				umbrellas: [".prism/rules/*.md", UMBRELLA_PATH],
			},
			null,
			"\t"
		)
	);
	for (const doc of [...GOVERNING_DOCS, UMBRELLA_DOC]) {
		await writeRepoFile(repoRoot, `.prism/architect/${doc}`, `# ${doc}\n\n## Existing\n`);
	}
	await writeRepoFile(repoRoot, OTHER_PATH, "# Other\n");
	await writeRepoFile(repoRoot, RULE_PATH, RULE_BODY);

	if (credited) {
		await saveRouteState(repoRoot, scopeId, { read: [...GOVERNING_DOCS], announced: [] });
	}
}

/** A Claude `Edit` that adds one heading below an existing one. */
function claudeEdit(repoRoot: string, relativePath: string, heading = "## Brand new"): string {
	return JSON.stringify({
		session_id: "session-1",
		cwd: repoRoot,
		tool_name: "Edit",
		tool_input: {
			file_path: path.join(repoRoot, ...relativePath.split("/")),
			old_string: "## Existing",
			new_string: `## Existing\n\n${heading}\n`,
		},
	});
}

/** A Codex `apply_patch` that adds one heading to the rule file. */
function codexPatch(repoRoot: string): string {
	return JSON.stringify({
		session_id: "session-1",
		cwd: repoRoot,
		tool_name: "apply_patch",
		tool_input: {
			command: `*** Begin Patch\n*** Update File: ${RULE_PATH}\n@@\n ## Existing\n+\n+## Brand new\n*** End Patch\n`,
		},
	});
}

/** The deny envelope's reason text, or `null` when the call was allowed. */
function denyReason(result: string | null): string | null {
	if (result === null) {
		return null;
	}
	const parsed = JSON.parse(result);
	assert.equal(parsed.hookSpecificOutput.permissionDecision, "deny");
	return parsed.hookSpecificOutput.permissionDecisionReason;
}

// --- Heading extraction ---

test("extractNewHeadings: returns only the ## to ###### lines the file lacks, trimmed and in order", () => {
	const current = "# Title\n\n## Existing\n";
	const edit = "## Existing\n\n  ## Added   \n### Deeper\n# Another title\n####### Too deep\n## Added\n";

	assert.deepEqual(extractNewHeadings(edit, current), ["## Added", "### Deeper"]);
});

test("extractNewHeadings: a heading inside a fenced block is quoted text, not structure", () => {
	const edit = "Example:\n\n```md\n## Quoted heading\n```\n\n## Real heading\n";

	assert.deepEqual(extractNewHeadings(edit, ""), ["## Real heading"]);
});

test("extractNewHeadings: a file being created counts every heading it carries", () => {
	assert.deepEqual(extractNewHeadings("# Rule\n\n## One\n\n## Two\n", ""), ["## One", "## Two"]);
});

test("extractPatchAddedText: reads only the added lines of the named file's section", () => {
	const patch =
		"*** Begin Patch\n*** Update File: a.md\n@@\n ## Context\n-## Removed\n+## Added to a\n" +
		"*** Add File: b.md\n+# B\n+## Added to b\n*** End Patch\n";

	assert.equal(extractPatchAddedText(patch, "a.md"), "## Added to a");
	assert.equal(extractPatchAddedText(patch, "b.md"), "# B\n## Added to b");
	assert.equal(extractPatchAddedText(patch, "c.md"), "");
});

// --- The reserved manifest key ---

test("manifestRoutes leaves out the umbrellas key, and manifestUmbrellas keeps only its strings", () => {
	const manifest = { "src/**": "a.md", umbrellas: [".prism/rules/*.md", 7] };

	assert.deepEqual(manifestRoutes(manifest), [["src/**", "a.md"]]);
	assert.deepEqual(manifestUmbrellas(manifest), [".prism/rules/*.md"]);
	assert.deepEqual(manifestUmbrellas({ umbrellas: "not a list" }), []);
});

test("every umbrella entry in PRISM's live manifest matches at least one tracked file", async () => {
	const manifest = JSON.parse(
		await fs.readFile(path.join(prismRepoRoot, ".prism", "architect", "manifest.json"), "utf8")
	) as Record<string, unknown>;
	const trackedFiles = execFileSync("git", ["ls-files"], { cwd: prismRepoRoot, encoding: "utf8" })
		.split("\n")
		.filter(Boolean);
	const umbrellas = manifestUmbrellas(manifest);

	assert.ok(umbrellas.length > 0, "the live manifest names at least one umbrella");
	const dead = umbrellas.filter(
		(entry) => !trackedFiles.some((file) => compileMatcher(entry)(file))
	);
	assert.deepEqual(dead, [], "an entry that matches no file never fires the speed bump");
});

// --- Deny wording ---

test("formatUmbrellaReason: a rule file's wording follows its load key", () => {
	const reason = (load: string) =>
		formatUmbrellaReason(RULE_PATH, ["## New"], [], `---\nload: ${load}\n---\n`);

	assert.match(reason("always"), /a rule file that loads in every session\./);
	assert.match(reason("paths"), /a rule file that loads whenever its `paths` match\./);
	assert.match(reason("skill"), /a rule file that loads whenever a skill cites it\./);
	assert.match(
		formatUmbrellaReason(RULE_PATH, ["## New"], [], "# No frontmatter\n"),
		/a rule file that loads in every session\./
	);
});

test("formatUmbrellaReason: an umbrella doc's wording names its routes, capped with a tail", () => {
	const reason = formatUmbrellaReason(
		UMBRELLA_PATH,
		["## A", "## B", "## C", "## D"],
		["r1/**", "r2/**", "r3/**", "r4/**", "r5/**"],
		""
	);

	assert.equal(
		reason,
		'You\'re adding "## A", "## B", "## C", and 1 more to `.prism/architect/_toolkit/big.md`, an umbrella doc that loads on r1/**, r2/**, r3/**, r4/**, and 1 more. ' +
			"A section here costs every session that reaches those routes. Name the files this section governs. " +
			"If it applies to every file those routes reach, retry this edit unchanged. If not, put it in the topic doc that owns the subject " +
			"or a new doc with its own route, per .prism/architect/guides/writing-an-architect-doc.md § Where new content goes."
	);
});

// --- The gate legs, on both hosts that deny ---

const DENYING_HOSTS = [
	{ host: "claude", payload: (repoRoot: string) => claudeEdit(repoRoot, RULE_PATH) },
	{ host: "codex", payload: codexPatch },
] as const;

for (const { host, payload } of DENYING_HOSTS) {
	// Leg 1 — the deny fires and says what the section costs.
	test(`${host}: a new heading in a rule file is denied once, naming its load trigger`, async () => {
		await withTempRepo(async (repoRoot) => {
			await seedUmbrellaRepo(repoRoot);

			const reason = denyReason(await runPreToolUseArm(host, HARNESSES[host], payload(repoRoot)));
			assert.equal(reason, RULE_REASON);
		});
	});

	// Leg 2 — seeded state clears it.
	test(`${host}: a seeded acknowledgement lets the same edit through`, async () => {
		await withTempRepo(async (repoRoot) => {
			await seedUmbrellaRepo(repoRoot);
			await saveRouteState(repoRoot, "session-1", {
				read: [...GOVERNING_DOCS],
				announced: [],
				umbrellaAcks: [`${RULE_PATH}\n## Brand new`],
			});

			assert.equal(await runPreToolUseArm(host, HARNESSES[host], payload(repoRoot)), null);
		});
	});

	// Leg 3 — the retry through the gate clears it, even with a read in between.
	test(`${host}: retrying the denied edit passes, after a read rewrites the state file`, async () => {
		await withTempRepo(async (repoRoot) => {
			await seedUmbrellaRepo(repoRoot);

			assert.notEqual(
				denyReason(await runPreToolUseArm(host, HARNESSES[host], payload(repoRoot))),
				null,
				"the first attempt is stopped"
			);

			await runPostToolUseArm(
				"claude",
				HARNESSES.claude,
				JSON.stringify({
					session_id: "session-1",
					cwd: repoRoot,
					tool_name: "Read",
					tool_input: { file_path: path.join(repoRoot, ".prism", "architect", ...UMBRELLA_DOC.split("/")) },
				})
			);
			const state = await loadRouteState(repoRoot, "session-1");
			assert.ok(state.read.includes(UMBRELLA_DOC), "the read in between saved state");

			assert.equal(
				await runPreToolUseArm(host, HARNESSES[host], payload(repoRoot)),
				null,
				"the retry passes because the acknowledgement survived the save"
			);
		});
	});
}

// --- What the speed bump does not do ---

test("an unread governing doc denies first, with the read-credit message", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedUmbrellaRepo(repoRoot, { credited: false });

		const reason = denyReason(
			await runPreToolUseArm("claude", HARNESSES.claude, claudeEdit(repoRoot, RULE_PATH))
		);
		assert.match(reason ?? "", /^You're working on `\.prism\/rules\/sample\.md`\. Read its governing docs/);
	});
});

test("an acknowledgement in one file does not clear the same heading in another", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedUmbrellaRepo(repoRoot);
		await runPreToolUseArm("claude", HARNESSES.claude, claudeEdit(repoRoot, RULE_PATH));

		const reason = denyReason(
			await runPreToolUseArm("claude", HARNESSES.claude, claudeEdit(repoRoot, UMBRELLA_PATH))
		);
		assert.match(reason ?? "", /to `\.prism\/architect\/_toolkit\/big\.md`, an umbrella doc that loads on src\/\*\*\./);
	});
});

test("an edit that only repeats an existing heading passes", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedUmbrellaRepo(repoRoot);

		assert.equal(
			await runPreToolUseArm("claude", HARNESSES.claude, claudeEdit(repoRoot, RULE_PATH, "Plain text, no heading.")),
			null
		);
	});
});

test("an off-list doc never meets the speed bump", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedUmbrellaRepo(repoRoot);

		assert.equal(await runPreToolUseArm("claude", HARNESSES.claude, claudeEdit(repoRoot, OTHER_PATH)), null);
	});
});

test("an acknowledgement that cannot be saved allows the edit rather than denying every retry", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedUmbrellaRepo(repoRoot);
		// A directory where the atomic write's temp file goes makes the save throw.
		await fs.mkdir(path.join(repoRoot, ".prism", "architect-route-state.session-1.json.tmp"));

		assert.equal(await runPreToolUseArm("claude", HARNESSES.claude, claudeEdit(repoRoot, RULE_PATH)), null);
	});
});

test("codex: a multi-file patch charges a heading only to the file that gains it", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedUmbrellaRepo(repoRoot);
		const patch =
			`*** Begin Patch\n*** Update File: ${OTHER_PATH}\n@@\n+## Only in the other doc\n` +
			`*** Update File: ${RULE_PATH}\n@@\n ## Existing\n+A plain line.\n*** End Patch\n`;

		const result = await runPreToolUseArm(
			"codex",
			HARNESSES.codex,
			JSON.stringify({ session_id: "session-1", cwd: repoRoot, tool_name: "apply_patch", tool_input: { command: patch } })
		);
		assert.equal(result, null);
	});
});

test("cursor: the edit passes, because Cursor has no deny envelope or write tool listed", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedUmbrellaRepo(repoRoot, { scopeId: "conversation-1" });

		const result = await runPreToolUseArm(
			"cursor",
			HARNESSES.cursor,
			JSON.stringify({
				conversation_id: "conversation-1",
				cwd: repoRoot,
				tool_name: "Write",
				tool_input: { file_path: path.join(repoRoot, ...RULE_PATH.split("/")), content: `${RULE_BODY}\n## Brand new\n` },
			})
		);
		assert.equal(result, null);
		assert.equal(HARNESSES.cursor.emitDeny("any reason"), null);
	});
});
