/**
 * Regression suite for the Claude Code adapter (plan
 * `context-delivery-mechanism.md` task 2). Covers what `architect-route.test.ts`
 * cannot: the stdin/output shape, the `PRISM_HOOK_DISABLE` kill switch task 9's
 * A/B control arm depends on, the fail-open catch, and the early exits on
 * missing `file_path` / `session_id`.
 *
 * `runAdapter` returns its result rather than writing to `process.stdout`
 * (see its own doc comment) specifically so these tests can assert on a
 * plain return value — no monkey-patching `process.stdout.write` or
 * `process.exitCode` inside a node:test worker process, where both are
 * live state the test runner's own reporting depends on.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { runAdapter } from "./hooks/claude-post-read";

async function withTempRepo<T>(
	build: (repoRoot: string) => Promise<T>
): Promise<T> {
	const tempRoot = await fs.mkdtemp(
		path.join(os.tmpdir(), "prism-claude-post-read-")
	);
	try {
		return await build(tempRoot);
	} finally {
		await fs.rm(tempRoot, { force: true, recursive: true });
	}
}

async function seedManifestAndDoc(
	repoRoot: string,
	manifest: Record<string, string | string[]>,
	docRelativePath: string,
	docBody: string
): Promise<void> {
	const architectDir = path.join(repoRoot, ".prism", "architect");
	await fs.mkdir(architectDir, { recursive: true });
	await fs.writeFile(
		path.join(architectDir, "manifest.json"),
		JSON.stringify(manifest, null, "\t"),
		"utf8"
	);
	const docPath = path.join(architectDir, docRelativePath);
	await fs.mkdir(path.dirname(docPath), { recursive: true });
	await fs.writeFile(docPath, docBody, "utf8");
}

test("runAdapter: PRISM_HOOK_DISABLE=1 returns null even with a matching doc", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifestAndDoc(
			repoRoot,
			{ "scripts/ai-skills/**": "_toolkit/spec-editing.md" },
			"_toolkit/spec-editing.md",
			"Spec editing constraints go here."
		);
		const stdin = JSON.stringify({
			session_id: "session-1",
			cwd: repoRoot,
			tool_name: "Read",
			tool_input: { file_path: path.join(repoRoot, "scripts", "ai-skills", "build.ts") },
		});

		process.env.PRISM_HOOK_DISABLE = "1";
		try {
			const result = await runAdapter(stdin);
			assert.equal(result, null);
		} finally {
			delete process.env.PRISM_HOOK_DISABLE;
		}
	});
});

test("runAdapter: a matching doc produces Claude Code's hookSpecificOutput shape", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifestAndDoc(
			repoRoot,
			{ "scripts/ai-skills/**": "_toolkit/spec-editing.md" },
			"_toolkit/spec-editing.md",
			"Spec editing constraints go here."
		);
		const stdin = JSON.stringify({
			session_id: "session-1",
			cwd: repoRoot,
			tool_name: "Read",
			tool_input: { file_path: path.join(repoRoot, "scripts", "ai-skills", "build.ts") },
		});

		const result = await runAdapter(stdin);
		assert.ok(result, "expected a non-null result for a matching doc");
		const parsed = JSON.parse(result as string);

		assert.equal(parsed.hookSpecificOutput.hookEventName, "PostToolUse");
		assert.match(
			parsed.hookSpecificOutput.additionalContext,
			/_toolkit\/spec-editing\.md/
		);
		assert.doesNotMatch(
			parsed.hookSpecificOutput.additionalContext,
			/Spec editing constraints go here\./,
			"the adapter forwards a nag naming the doc's path, never its body"
		);
	});
});

test("runAdapter: no manifest match returns null", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifestAndDoc(
			repoRoot,
			{ "scripts/ai-skills/**": "_toolkit/spec-editing.md" },
			"_toolkit/spec-editing.md",
			"Spec editing constraints go here."
		);
		const stdin = JSON.stringify({
			session_id: "session-1",
			cwd: repoRoot,
			tool_name: "Read",
			tool_input: { file_path: path.join(repoRoot, "README.md") },
		});

		const result = await runAdapter(stdin);
		assert.equal(result, null);
	});
});

test("runAdapter: missing file_path returns null", async () => {
	const stdin = JSON.stringify({ session_id: "session-1", cwd: "/repo" });
	const result = await runAdapter(stdin);
	assert.equal(result, null);
});

test("runAdapter: missing session_id returns null", async () => {
	const stdin = JSON.stringify({
		cwd: "/repo",
		tool_input: { file_path: "/repo/README.md" },
	});
	const result = await runAdapter(stdin);
	assert.equal(result, null);
});

test("runAdapter: malformed stdin JSON is caught and returns null rather than throwing", async () => {
	const result = await runAdapter("{not valid json");
	assert.equal(result, null);
});
