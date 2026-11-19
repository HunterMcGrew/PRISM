/**
 * Pins how the approval guard is registered: the event, matcher, and command
 * each host's template and PRISM's own settings carry for it, and what a
 * consumer's update does with those entries. The guard is the third hook entry
 * point beside `hook.mjs` and `git-gates.mjs`, so its registration has to
 * survive repeat merges and leave a consumer's own entries alone.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import {
	PRISM_CODEX_HOOK_COMMAND_PATTERN,
	PRISM_HOOK_COMMAND_PATTERN,
	mergeHookCodexRegistration,
	mergeHookSettingsRegistration,
} from "./update";

const prismRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

interface HookEntry {
	matcher?: string;
	hooks: Array<{ type: string; command: string }>;
}

interface HookFile {
	hooks: Record<string, HookEntry[]>;
}

const TEMP_ROOTS: string[] = [];

after(async () => {
	for (const root of TEMP_ROOTS) {
		await fs.rm(root, { recursive: true, force: true });
	}
});

async function makeConsumerRoot(): Promise<string> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), "approve-guard-registration-"));
	TEMP_ROOTS.push(root);

	return root;
}

async function readHookFile(root: string, relativePath: string): Promise<HookFile> {
	return JSON.parse(await fs.readFile(path.join(root, relativePath), "utf8")) as HookFile;
}

/** The entries of one event whose command runs the approval guard. */
function guardEntries(file: HookFile, eventName: string): HookEntry[] {
	return (file.hooks[eventName] ?? []).filter((entry) =>
		entry.hooks.some((hook) => hook.command.includes("approve-guard.mjs"))
	);
}

const CLAUDE_GUARD_PATH = "$CLAUDE_PROJECT_DIR/.claude/hooks/approve-guard.mjs";

test("the Claude template registers the guard on PreToolUse for shell and edit tools, and on UserPromptSubmit", async () => {
	const template = await readHookFile(prismRoot, "templates/install/.claude/settings.json");

	assert.deepEqual(guardEntries(template, "PreToolUse"), [
		{
			matcher: "Bash|PowerShell|Edit|Write|MultiEdit",
			hooks: [
				{
					type: "command",
					command: `node "${CLAUDE_GUARD_PATH}" --tool=claude --event=PreToolUse`,
				},
			],
		},
	]);
	assert.deepEqual(guardEntries(template, "UserPromptSubmit"), [
		{
			hooks: [
				{
					type: "command",
					command: `node "${CLAUDE_GUARD_PATH}" --tool=claude --event=UserPromptSubmit`,
				},
			],
		},
	]);
});

test("the Codex template registers the guard on PreToolUse for shell and edit tools, and on UserPromptSubmit", async () => {
	const template = await readHookFile(prismRoot, "templates/install/.codex/hooks.json");

	assert.deepEqual(guardEntries(template, "PreToolUse"), [
		{
			matcher: "^(Bash|apply_patch|Edit|Write)$",
			hooks: [
				{
					type: "command",
					command: 'node ".claude/hooks/approve-guard.mjs" --tool=codex --event=PreToolUse',
				},
			],
		},
	]);
	assert.deepEqual(guardEntries(template, "UserPromptSubmit"), [
		{
			hooks: [
				{
					type: "command",
					command: 'node ".claude/hooks/approve-guard.mjs" --tool=codex --event=UserPromptSubmit',
				},
			],
		},
	]);
});

test("PRISM's own settings register the guard from its source path", async () => {
	const settings = await readHookFile(prismRoot, ".claude/settings.json");
	const sourcePath = "$CLAUDE_PROJECT_DIR/scripts/ai-skills/hooks/approve-guard.mjs";

	assert.deepEqual(guardEntries(settings, "PreToolUse"), [
		{
			matcher: "Bash|PowerShell|Edit|Write|MultiEdit",
			hooks: [
				{
					type: "command",
					command: `node "${sourcePath}" --tool=claude --event=PreToolUse`,
				},
			],
		},
	]);

	const [prompt] = guardEntries(settings, "UserPromptSubmit");
	assert.equal(guardEntries(settings, "UserPromptSubmit").length, 1);
	assert.match(
		prompt?.hooks[0]?.command ?? "",
		/^f="\$CLAUDE_PROJECT_DIR\/scripts\/ai-skills\/hooks\/approve-guard\.mjs"; if \[ -f "\$f" \]; then node "\$f" --tool=claude --event=UserPromptSubmit; else /
	);
});

test("PRISM's own prompt registration warns the person and the agent when the guard is missing", async (t) => {
	if (process.platform === "win32") return t.skip("the registration runs under sh");

	const settings = await readHookFile(prismRoot, ".claude/settings.json");
	const command = guardEntries(settings, "UserPromptSubmit")[0]?.hooks[0]?.command ?? "";
	const emptyCheckout = await makeConsumerRoot();
	const child = spawnSync("sh", ["-c", command], {
		input: JSON.stringify({ prompt: "approve", session_id: "s1", cwd: emptyCheckout }),
		env: { ...process.env, CLAUDE_PROJECT_DIR: emptyCheckout },
		encoding: "utf8",
	});

	assert.equal(child.status, 0, child.stderr);
	const reply = JSON.parse(child.stdout) as {
		systemMessage: string;
		hookSpecificOutput: { hookEventName: string; additionalContext: string };
	};
	assert.match(reply.systemMessage, /approve guard is missing/);
	assert.equal(reply.hookSpecificOutput.hookEventName, "UserPromptSubmit");
	assert.match(reply.hookSpecificOutput.additionalContext, /Tell the person/);
});

test("a second update leaves exactly one guard entry per event in each host's file", async () => {
	const consumerRoot = await makeConsumerRoot();

	for (let run = 0; run < 2; run += 1) {
		await mergeHookSettingsRegistration(prismRoot, consumerRoot, false);
		await mergeHookCodexRegistration(prismRoot, consumerRoot, false);
	}

	for (const file of [".claude/settings.json", ".codex/hooks.json"]) {
		const merged = await readHookFile(consumerRoot, file);
		for (const eventName of ["PreToolUse", "UserPromptSubmit"]) {
			assert.equal(
				guardEntries(merged, eventName).length,
				1,
				`${file} holds one guard entry on ${eventName} after two merges`
			);
		}
	}
});

test("a consumer's own UserPromptSubmit entry survives the merge beside the guard's", async () => {
	const consumerEntry: HookEntry = {
		hooks: [{ type: "command", command: "./scripts/consumer-prompt-hook.sh" }],
	};

	for (const [file, merge] of [
		[".claude/settings.json", mergeHookSettingsRegistration],
		[".codex/hooks.json", mergeHookCodexRegistration],
	] as const) {
		const consumerRoot = await makeConsumerRoot();
		await fs.mkdir(path.join(consumerRoot, path.dirname(file)), { recursive: true });
		await fs.writeFile(
			path.join(consumerRoot, file),
			`${JSON.stringify({ hooks: { UserPromptSubmit: [consumerEntry] } }, null, "\t")}\n`
		);

		await merge(prismRoot, consumerRoot, false);
		await merge(prismRoot, consumerRoot, false);

		const merged = await readHookFile(consumerRoot, file);
		const prompts = merged.hooks.UserPromptSubmit ?? [];
		assert.deepEqual(prompts[0], consumerEntry, `${file} keeps the consumer's entry first, unchanged`);
		assert.equal(prompts.length, 2, `${file} holds the consumer's entry plus exactly one guard entry`);
		assert.equal(guardEntries(merged, "UserPromptSubmit").length, 1);
	}
});

test("the command patterns claim the guard's own commands and not a consumer's wrapper around it", () => {
	assert.ok(PRISM_HOOK_COMMAND_PATTERN.test(`node "${CLAUDE_GUARD_PATH}" --tool=claude --event=UserPromptSubmit`));
	assert.ok(PRISM_CODEX_HOOK_COMMAND_PATTERN.test('node ".claude/hooks/approve-guard.mjs" --tool=codex --event=PreToolUse'));

	assert.equal(
		PRISM_HOOK_COMMAND_PATTERN.test(`bash -c 'my-check && node "${CLAUDE_GUARD_PATH}" --tool=claude'`),
		false
	);
	assert.equal(
		PRISM_CODEX_HOOK_COMMAND_PATTERN.test('node ".claude/hooks/approve-guard.mjs.bak" --tool=codex'),
		false
	);
});
