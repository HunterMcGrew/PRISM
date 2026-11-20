/**
 * Pins every hook registration in the two install templates and PRISM's own
 * `.claude/settings.json`, by event, matcher, command, and timeout, because
 * each gate's own suite cannot see whether a host calls it. A row keeps an
 * absent timeout absent, so adding a timeout to any registration is a visible
 * change.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { HOOK_COMMAND_PATH_RE } from "./doctor";
import { PRISM_CODEX_HOOK_COMMAND_PATTERN, PRISM_HOOK_COMMAND_PATTERN } from "./update";

const prismRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

interface HookRow {
	event: string;
	matcher?: string;
	command: string;
	timeout?: number;
}

interface HookFile {
	hooks: Record<
		string,
		Array<{ matcher?: string; hooks: Array<{ command: string; timeout?: number }> }>
	>;
}

/** Flattens a hook file into one row per registered command, keeping an absent key absent. */
async function readRows(relativePath: string): Promise<HookRow[]> {
	const file = JSON.parse(
		await fs.readFile(path.join(prismRoot, relativePath), "utf8"),
	) as HookFile;
	const rows: HookRow[] = [];

	for (const [event, groups] of Object.entries(file.hooks)) {
		for (const group of groups) {
			for (const hook of group.hooks) {
				const row: HookRow = { event, command: hook.command };

				if (group.matcher !== undefined) {
					row.matcher = group.matcher;
				}

				if (hook.timeout !== undefined) {
					row.timeout = hook.timeout;
				}

				rows.push(row);
			}
		}
	}

	return rows;
}

const claudeTemplate = (script: string, flags: string) =>
	`node "$CLAUDE_PROJECT_DIR/.claude/hooks/${script}" ${flags}`;
const claudeOwn = (script: string, flags: string) =>
	`node "$CLAUDE_PROJECT_DIR/scripts/ai-skills/hooks/${script}" ${flags}`;
const codexTemplate = (script: string, flags: string) =>
	`node ".claude/hooks/${script}" ${flags}`;

function claudeRows(command: (script: string, flags: string) => string): HookRow[] {
	return [
		{
			event: "PreToolUse",
			matcher: "Write|Edit|Bash",
			command: command("hook.mjs", "--tool=claude --event=PreToolUse"),
		},
		{
			event: "PreToolUse",
			matcher: "Bash",
			command: command("git-gates.mjs", "--tool=claude --event=PreToolUse"),
		},
		{
			event: "PreToolUse",
			matcher: "Bash|PowerShell|Edit|Write|MultiEdit",
			command: command("approve-guard.mjs", "--tool=claude --event=PreToolUse"),
		},
		{
			event: "UserPromptSubmit",
			command: command("approve-guard.mjs", "--tool=claude --event=UserPromptSubmit"),
		},
		{
			event: "PostToolUse",
			matcher: "Read|Grep|Bash",
			command: command("hook.mjs", "--tool=claude"),
		},
		{
			event: "PostCompact",
			command: command("hook.mjs", "--tool=claude --event=PostCompact"),
		},
		{
			event: "PreCompact",
			command: command("hook.mjs", "--tool=claude --event=PreCompact"),
		},
		{
			event: "SessionStart",
			matcher: "startup|resume|compact",
			command: command("hook.mjs", "--tool=claude --event=SessionStart"),
		},
	];
}

/** Inserts the secrets gate row after the approve-guard PreToolUse row, where each file carries it. */
function withSecretsGate(rows: HookRow[], row: HookRow): HookRow[] {
	const at = rows.findIndex(
		(r) => r.event === "PreToolUse" && r.command.includes("approve-guard.mjs"),
	);

	return [...rows.slice(0, at + 1), row, ...rows.slice(at + 1)];
}

const CLAUDE_SECRETS_MATCHER = "Read|Grep|Bash|PowerShell";

/** Inserts the commit gate row after the secrets gate PreToolUse row, where each file carries it. */
function withCommitGate(rows: HookRow[], row: HookRow): HookRow[] {
	const at = rows.findIndex(
		(r) => r.event === "PreToolUse" && r.command.includes("secrets-gate.mjs"),
	);

	return [...rows.slice(0, at + 1), row, ...rows.slice(at + 1)];
}

const CLAUDE_COMMIT_MATCHER = "Bash|PowerShell";

const CODEX_ROWS: HookRow[] = [
	{
		event: "PreToolUse",
		matcher: "^(Bash|apply_patch|Edit|Write)$",
		command: codexTemplate("hook.mjs", "--tool=codex --event=PreToolUse"),
	},
	{
		event: "PreToolUse",
		matcher: "^Bash$",
		command: codexTemplate("git-gates.mjs", "--tool=codex --event=PreToolUse"),
	},
	{
		event: "PreToolUse",
		matcher: "^(Bash|apply_patch|Edit|Write)$",
		command: codexTemplate("approve-guard.mjs", "--tool=codex --event=PreToolUse"),
	},
	{
		event: "PreToolUse",
		matcher: "^Bash$",
		command: codexTemplate("secrets-gate.mjs", "--tool=codex --event=PreToolUse"),
		timeout: 21,
	},
	{
		event: "PreToolUse",
		matcher: "^Bash$",
		command: codexTemplate("commit-gate.mjs", "--tool=codex --event=PreToolUse"),
		timeout: 21,
	},
	{
		event: "UserPromptSubmit",
		command: codexTemplate("approve-guard.mjs", "--tool=codex --event=UserPromptSubmit"),
	},
	{
		event: "PostToolUse",
		matcher: "^(Bash|apply_patch|Edit|Write)$",
		command: codexTemplate("hook.mjs", "--tool=codex"),
	},
	{
		event: "SessionStart",
		matcher: "startup|resume",
		command: codexTemplate("hook.mjs", "--tool=codex --event=SessionStart"),
	},
	{
		event: "PostCompact",
		command: codexTemplate("hook.mjs", "--tool=codex --event=PostCompact"),
	},
];

test("the Claude install template registers each hook with the matcher and timeout it ships", async () => {
	const expected = withCommitGate(
		withSecretsGate(claudeRows(claudeTemplate), {
			event: "PreToolUse",
			matcher: CLAUDE_SECRETS_MATCHER,
			command: claudeTemplate("secrets-gate.mjs", "--tool=claude --event=PreToolUse"),
			timeout: 21,
		}),
		{
			event: "PreToolUse",
			matcher: CLAUDE_COMMIT_MATCHER,
			command: claudeTemplate("commit-gate.mjs", "--tool=claude --event=PreToolUse"),
			timeout: 21,
		},
	);

	assert.deepEqual(await readRows("templates/install/.claude/settings.json"), expected);
});

test("the Codex install template registers each hook with the matcher and timeout it ships", async () => {
	assert.deepEqual(await readRows("templates/install/.codex/hooks.json"), CODEX_ROWS);
});

test("PRISM's own Claude settings register each hook from scripts/ai-skills/hooks", async () => {
	const rows = await readRows(".claude/settings.json");
	const expected = withCommitGate(
		withSecretsGate(claudeRows(claudeOwn), {
			event: "PreToolUse",
			matcher: CLAUDE_SECRETS_MATCHER,
			command: claudeOwn("secrets-gate.mjs", "--tool=claude --event=PreToolUse"),
			timeout: 21,
		}),
		{
			event: "PreToolUse",
			matcher: CLAUDE_COMMIT_MATCHER,
			command: claudeOwn("commit-gate.mjs", "--tool=claude --event=PreToolUse"),
			timeout: 21,
		},
	);

	// PRISM's own prompt hook wraps the guard in a missing-file fallback, so only its prefix is pinned.
	const promptAt = expected.findIndex((r) => r.event === "UserPromptSubmit");

	assert.ok(
		rows[promptAt].command.startsWith(
			'f="$CLAUDE_PROJECT_DIR/scripts/ai-skills/hooks/approve-guard.mjs"',
		),
	);
	assert.deepEqual(
		rows.map((r, i) => (i === promptAt ? { ...r, command: expected[promptAt].command } : r)),
		expected,
	);
});

test("every template command matches the pattern an update uses to claim PRISM's registrations", async () => {
	const claude = await readRows("templates/install/.claude/settings.json");
	const codex = await readRows("templates/install/.codex/hooks.json");

	for (const row of claude) {
		assert.match(row.command, PRISM_HOOK_COMMAND_PATTERN);
	}

	for (const row of codex) {
		assert.match(row.command, PRISM_CODEX_HOOK_COMMAND_PATTERN);
	}
});

test("every runtime file a template command names exists under scripts/ai-skills/hooks", async () => {
	const rows = [
		...(await readRows("templates/install/.claude/settings.json")),
		...(await readRows("templates/install/.codex/hooks.json")),
	];

	for (const row of rows) {
		const script = /hooks\/([\w./-]+\.mjs)"/.exec(row.command)?.[1];

		assert.ok(script, `no runtime file named in: ${row.command}`);
		await fs.access(path.join(prismRoot, "scripts", "ai-skills", "hooks", script));
	}
});

test("every registered command's script path matches the pattern doctor reads registrations with", async () => {
	const rows = [
		...(await readRows("templates/install/.claude/settings.json")),
		...(await readRows("templates/install/.codex/hooks.json")),
		...(await readRows(".claude/settings.json")),
	];

	for (const row of rows) {
		const script = /hooks\/([\w./-]+\.mjs)"/.exec(row.command)?.[1];
		const found = [...row.command.matchAll(HOOK_COMMAND_PATH_RE)].map((match) => match[1]);

		assert.ok(script, `no runtime file named in: ${row.command}`);
		assert.equal(found.length, 1, `doctor reads no script path from: ${row.command}`);
		assert.ok(found[0]?.endsWith(script), `doctor reads ${found[0]} from: ${row.command}`);
	}
});
