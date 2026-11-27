/**
 * Contract for retiring the reconcile stop gate on update: a merge drops
 * PRISM's own registration from an event key the new template no longer
 * carries while the consumer's entries under that key survive, and the
 * delivered gate file is backed up and removed.
 *
 * The fixtures copy PRISM's 1.0.0 `SubagentStop` registration, because that
 * is the shape an existing consumer holds on disk.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
	HOOK_RUNTIME_MARKER,
	mergeHookRegistration,
	PRISM_HOOK_COMMAND_PATTERN,
	refreshHookRuntime,
} from "./update";

const prismRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const RETIRED_PRISM_ENTRY = {
	matcher: "^prism-pr-review$",
	hooks: [
		{
			type: "command",
			command:
				'node "$CLAUDE_PROJECT_DIR/.claude/hooks/reconcile-gate.mjs" --tool=claude --event=SubagentStop',
			timeout: 120,
		},
	],
};

const CONSUMER_ENTRY = {
	matcher: "^my-agent$",
	hooks: [{ type: "command", command: "node scripts/mine.mjs" }],
};

/**
 * Writes the current Claude install template, minus any `SubagentStop` key,
 * as the incoming source, so the merge sees a template that has retired it.
 */
async function writeRetiredSource(dir: string): Promise<string> {
	const template = JSON.parse(
		await fs.readFile(path.join(prismRoot, "templates/install/.claude/settings.json"), "utf8")
	) as { hooks: Record<string, unknown> };
	delete template.hooks.SubagentStop;

	const sourcePath = path.join(dir, "source-settings.json");
	await fs.writeFile(sourcePath, JSON.stringify(template), "utf8");

	return sourcePath;
}

async function mergeTargetWith(subagentStop: unknown[]): Promise<Record<string, unknown>> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "prism-retire-merge-"));
	try {
		const sourcePath = await writeRetiredSource(dir);
		const targetPath = path.join(dir, "settings.json");
		await fs.writeFile(
			targetPath,
			JSON.stringify({ hooks: { SubagentStop: subagentStop } }),
			"utf8"
		);

		await mergeHookRegistration(sourcePath, targetPath, PRISM_HOOK_COMMAND_PATTERN, false);

		const merged = JSON.parse(await fs.readFile(targetPath, "utf8")) as {
			hooks: Record<string, unknown>;
		};

		return merged.hooks;
	} finally {
		await fs.rm(dir, { recursive: true, force: true });
	}
}

test("a merge drops PRISM's entry from an event key the template retired and keeps the consumer's", async () => {
	const hooks = await mergeTargetWith([RETIRED_PRISM_ENTRY, CONSUMER_ENTRY]);

	assert.deepEqual(hooks.SubagentStop, [CONSUMER_ENTRY]);
});

test("a merge deletes an event key the template retired when only PRISM's entry was under it", async () => {
	const hooks = await mergeTargetWith([RETIRED_PRISM_ENTRY]);

	assert.ok(!("SubagentStop" in hooks), "SubagentStop key still present");
});

test("an update backs up and removes a delivered reconcile gate", async () => {
	const consumerRoot = await fs.mkdtemp(path.join(os.tmpdir(), "prism-retire-gate-"));
	try {
		const gatePath = path.join(consumerRoot, ".claude/hooks/reconcile-gate.mjs");
		await fs.mkdir(path.dirname(gatePath), { recursive: true });
		await fs.writeFile(gatePath, `#!/usr/bin/env node\n// ${HOOK_RUNTIME_MARKER}\n`, "utf8");

		await refreshHookRuntime(prismRoot, consumerRoot, false, ["claude"]);

		await assert.rejects(fs.access(gatePath), "reconcile-gate.mjs is still delivered");
		await fs.access(`${gatePath}.bak`);
	} finally {
		await fs.rm(consumerRoot, { recursive: true, force: true });
	}
});
