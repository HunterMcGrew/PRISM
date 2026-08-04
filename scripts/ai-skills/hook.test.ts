/**
 * Regression suite for the multi-host hook dispatcher (plan `thr-2171-port`
 * task 2, generalizing `context-delivery-mechanism.md` task 2's single
 * Claude Code adapter). Covers what `architect-route.test.ts` cannot: the
 * stdin/output shape per harness, the `PRISM_HOOK_DISABLE` kill switch the
 * A/B control arm depends on, the fail-open catch, the early exits on a
 * missing file path or session id, and the field-name boundary between
 * `harnesses.ts` and every other file in `hooks/`.
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
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

import { HARNESSES } from "./hooks/harnesses";
import { resolveHarnessFromArgv, runAdapter } from "./hooks/hook";

async function withTempRepo<T>(
	build: (repoRoot: string) => Promise<T>
): Promise<T> {
	const tempRoot = await fs.mkdtemp(
		path.join(os.tmpdir(), "prism-hook-")
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
			const result = await runAdapter("claude", HARNESSES.claude, stdin);
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

		const result = await runAdapter("claude", HARNESSES.claude, stdin);
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

		const result = await runAdapter("claude", HARNESSES.claude, stdin);
		assert.equal(result, null);
	});
});

test("runAdapter: missing file_path returns null", async () => {
	const stdin = JSON.stringify({ session_id: "session-1", cwd: "/repo" });
	const result = await runAdapter("claude", HARNESSES.claude, stdin);
	assert.equal(result, null);
});

test("runAdapter: missing session_id returns null", async () => {
	const stdin = JSON.stringify({
		cwd: "/repo",
		tool_input: { file_path: "/repo/README.md" },
	});
	const result = await runAdapter("claude", HARNESSES.claude, stdin);
	assert.equal(result, null);
});

test("runAdapter: malformed stdin JSON is caught and returns null rather than throwing", async () => {
	const result = await runAdapter("claude", HARNESSES.claude, "{not valid json");
	assert.equal(result, null);
});

async function withCapturedStderr<T>(run: () => Promise<T>): Promise<{ result: T; stderr: string }> {
	const originalWrite = process.stderr.write.bind(process.stderr);
	let captured = "";
	process.stderr.write = ((chunk: string | Uint8Array) => {
		captured += chunk.toString();
		return true;
	}) as typeof process.stderr.write;

	try {
		const result = await run();
		return { result, stderr: captured };
	} finally {
		process.stderr.write = originalWrite;
	}
}

test("runAdapter: a camelCase hook_event_name under --tool=claude is declined silently — Cursor's third-party-config import re-running this hook", async () => {
	const stdin = JSON.stringify({
		hook_event_name: "postToolUse",
		session_id: "session-1",
		cwd: "/repo",
		tool_input: { file_path: "/repo/README.md" },
	});

	const { result, stderr } = await withCapturedStderr(() =>
		runAdapter("claude", HARNESSES.claude, stdin)
	);
	assert.equal(result, null, "a foreign (Cursor-shaped) payload writes nothing to stdout");
	assert.equal(stderr, "", "a foreign payload writes nothing to stderr either");
});

test("runAdapter: a PascalCase hook_event_name under --tool=claude is accepted — Claude's own event casing", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifestAndDoc(
			repoRoot,
			{ "scripts/ai-skills/**": "_toolkit/spec-editing.md" },
			"_toolkit/spec-editing.md",
			"Spec editing constraints go here."
		);
		const stdin = JSON.stringify({
			hook_event_name: "PostToolUse",
			session_id: "session-1",
			cwd: repoRoot,
			tool_input: { file_path: path.join(repoRoot, "scripts", "ai-skills", "build.ts") },
		});

		const result = await runAdapter("claude", HARNESSES.claude, stdin);
		assert.ok(result, "a Claude-shaped (PascalCase) event name is processed normally");
	});
});

test("resolveHarnessFromArgv: returns null for an unknown --tool value — the fail-open case AC-5 covers", () => {
	assert.equal(resolveHarnessFromArgv(["--tool=bogus"]), null);
});

test("resolveHarnessFromArgv: returns null when --tool is absent", () => {
	assert.equal(resolveHarnessFromArgv([]), null);
});

test("resolveHarnessFromArgv: resolves a known --tool value to its harness spec", () => {
	const result = resolveHarnessFromArgv(["--tool=claude"]);
	assert.ok(result);
	assert.equal(result?.tool, "claude");
	assert.equal(result?.spec, HARNESSES.claude);
});

test("boundary: harness-specific field names appear only in harnesses.ts", async () => {
	const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
	const hooksDir = path.join(scriptDirectory, "hooks");
	const harnessesSource = await fs.readFile(
		path.join(hooksDir, "harnesses.ts"),
		"utf8"
	);

	const harnessFieldNames = [
		"session_id",
		"conversation_id",
		"additional_context",
		"additionalContext",
		"hookSpecificOutput",
	];

	for (const fieldName of harnessFieldNames) {
		assert.ok(
			harnessesSource.includes(fieldName),
			`expected harnesses.ts to reference "${fieldName}"`
		);
	}

	const otherFiles = (await fs.readdir(hooksDir)).filter(
		(name) => name.endsWith(".ts") && name !== "harnesses.ts"
	);
	assert.ok(otherFiles.length > 0, "expected at least one other file under hooks/ to check");

	for (const file of otherFiles) {
		const source = await fs.readFile(path.join(hooksDir, file), "utf8");
		for (const fieldName of harnessFieldNames) {
			assert.ok(
				!source.includes(fieldName),
				`${file} must not reference harness-specific field "${fieldName}" — that belongs in harnesses.ts`
			);
		}
	}
});
