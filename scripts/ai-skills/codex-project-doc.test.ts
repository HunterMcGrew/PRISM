/**
 * Regression suite for the Codex `project_doc_max_bytes` sync. Pins:
 *   - the size rule (round up to a 64 KiB multiple, plus one 64 KiB step)
 *   - reading only the top-level key, never one inside a table
 *   - an unreadable value reported as `unparseable`, not guessed at
 *   - the line-based merge: other lines untouched, trailing comments and CRLF kept
 *   - `syncCodexProjectDocLimit`: no AGENTS.md, a fresh write, a larger existing
 *     value left alone, and dry-run writing nothing
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import {
	CODEX_CONFIG_RELATIVE_PATH,
	computeProjectDocMaxBytes,
	mergeProjectDocMaxBytes,
	readProjectDocMaxBytes,
	syncCodexProjectDocLimit,
} from "./codex-project-doc";

async function withTempRepo(run: (repoRoot: string) => Promise<void>): Promise<void> {
	const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "prism-codex-doc-"));

	try {
		await run(repoRoot);
	} finally {
		await fs.rm(repoRoot, { force: true, recursive: true });
	}
}

async function readIfExists(filePath: string): Promise<string | null> {
	try {
		return await fs.readFile(filePath, "utf8");
	} catch {
		return null;
	}
}

test("computeProjectDocMaxBytes rounds up to a 64 KiB multiple and adds one step", () => {
	assert.equal(computeProjectDocMaxBytes(132_790), 262_144);
	assert.equal(computeProjectDocMaxBytes(65_536), 131_072);
	assert.equal(computeProjectDocMaxBytes(1), 131_072);
});

test("readProjectDocMaxBytes is absent for null input and for a file with no key", () => {
	assert.deepEqual(readProjectDocMaxBytes(null), { kind: "absent" });
	assert.deepEqual(readProjectDocMaxBytes('model = "x"\n'), { kind: "absent" });
});

test("readProjectDocMaxBytes ignores a key that sits only under a table", () => {
	const toml = 'model = "x"\n\n[profiles.x]\nproject_doc_max_bytes = 999999\n';

	assert.deepEqual(readProjectDocMaxBytes(toml), { kind: "absent" });
});

test("readProjectDocMaxBytes reads an integer with underscores and a trailing comment", () => {
	assert.deepEqual(readProjectDocMaxBytes("project_doc_max_bytes = 1_048_576  # mine\n"), {
		kind: "set",
		value: 1_048_576,
	});
});

test("readProjectDocMaxBytes reports a value it cannot read as unparseable", () => {
	assert.deepEqual(readProjectDocMaxBytes("project_doc_max_bytes = 0x100000\n"), {
		kind: "unparseable",
		raw: "0x100000",
	});
});

test("mergeProjectDocMaxBytes into null yields the comment and key with a trailing line ending", () => {
	const merged = mergeProjectDocMaxBytes(null, 131_072);

	assert.equal(merged.split("\n").length, 3);
	assert.ok(merged.endsWith("project_doc_max_bytes = 131072\n"));
	assert.match(merged, /^# Raises Codex's AGENTS\.md read limit/);
});

test("mergeProjectDocMaxBytes adds the key at the top and leaves every other line byte-identical", () => {
	const existing = 'model = "gpt-5"\n\n[mcp_servers.x]\ncommand = "x"\n';

	const merged = mergeProjectDocMaxBytes(existing, 262_144);

	assert.ok(merged.endsWith(`\n\n${existing}`), "existing content follows unchanged");
	assert.deepEqual(readProjectDocMaxBytes(merged), { kind: "set", value: 262_144 });
	assert.ok(merged.indexOf("project_doc_max_bytes") < merged.indexOf("model"));
});

test("mergeProjectDocMaxBytes replaces an existing smaller value and keeps its trailing comment", () => {
	const existing = 'model = "x"\nproject_doc_max_bytes = 65_536  # raised by hand\n[t]\nk = 1\n';

	const merged = mergeProjectDocMaxBytes(existing, 262_144);

	assert.equal(
		merged,
		'model = "x"\nproject_doc_max_bytes = 262144  # raised by hand\n[t]\nk = 1\n'
	);
});

test("mergeProjectDocMaxBytes preserves CRLF line endings", () => {
	const merged = mergeProjectDocMaxBytes('model = "x"\r\n', 131_072);

	assert.ok(!/[^\r]\n/.test(merged), "every line ending is CRLF");
	assert.ok(merged.endsWith('model = "x"\r\n'));
});

test("syncCodexProjectDocLimit returns null when the repo has no AGENTS.md", async () => {
	await withTempRepo(async (repoRoot) => {
		assert.equal(await syncCodexProjectDocLimit(repoRoot, false), null);
	});
});

test("syncCodexProjectDocLimit writes the computed value when no config exists", async () => {
	await withTempRepo(async (repoRoot) => {
		await fs.writeFile(path.join(repoRoot, "AGENTS.md"), "a".repeat(40_000), "utf8");

		const result = await syncCodexProjectDocLimit(repoRoot, false);

		assert.deepEqual(result?.outcome, { relativePath: CODEX_CONFIG_RELATIVE_PATH, action: "written" });

		const written = await fs.readFile(path.join(repoRoot, CODEX_CONFIG_RELATIVE_PATH), "utf8");
		assert.deepEqual(readProjectDocMaxBytes(written), { kind: "set", value: 131_072 });
	});
});

test("syncCodexProjectDocLimit keeps a larger existing value and leaves the file unchanged", async () => {
	await withTempRepo(async (repoRoot) => {
		await fs.writeFile(path.join(repoRoot, "AGENTS.md"), "a".repeat(40_000), "utf8");
		await fs.mkdir(path.join(repoRoot, ".codex"));
		const configPath = path.join(repoRoot, CODEX_CONFIG_RELATIVE_PATH);
		const existing = "project_doc_max_bytes = 1048576\n";
		await fs.writeFile(configPath, existing, "utf8");

		const result = await syncCodexProjectDocLimit(repoRoot, false);

		assert.equal(result?.outcome.action, "no-op");
		assert.equal(await fs.readFile(configPath, "utf8"), existing);
	});
});

test("syncCodexProjectDocLimit overwrites a smaller existing value", async () => {
	await withTempRepo(async (repoRoot) => {
		await fs.writeFile(path.join(repoRoot, "AGENTS.md"), "a".repeat(40_000), "utf8");
		await fs.mkdir(path.join(repoRoot, ".codex"));
		const configPath = path.join(repoRoot, CODEX_CONFIG_RELATIVE_PATH);
		await fs.writeFile(configPath, "project_doc_max_bytes = 32768\n", "utf8");

		const result = await syncCodexProjectDocLimit(repoRoot, false);

		assert.equal(result?.outcome.action, "overwritten");
		assert.equal(await fs.readFile(configPath, "utf8"), "project_doc_max_bytes = 131072\n");
	});
});

test("syncCodexProjectDocLimit leaves an unreadable value alone and warns with the value to set", async () => {
	await withTempRepo(async (repoRoot) => {
		await fs.writeFile(path.join(repoRoot, "AGENTS.md"), "a".repeat(40_000), "utf8");
		await fs.mkdir(path.join(repoRoot, ".codex"));
		const configPath = path.join(repoRoot, CODEX_CONFIG_RELATIVE_PATH);
		const existing = "project_doc_max_bytes = 0x100000\n";
		await fs.writeFile(configPath, existing, "utf8");

		const result = await syncCodexProjectDocLimit(repoRoot, false);

		assert.equal(result?.outcome.action, "no-op");
		assert.match(result?.warning ?? "", /0x100000.*Set it to 131072 or more/);
		assert.equal(await fs.readFile(configPath, "utf8"), existing);
	});
});

test("syncCodexProjectDocLimit with dryRun reports the outcome and writes nothing", async () => {
	await withTempRepo(async (repoRoot) => {
		await fs.writeFile(path.join(repoRoot, "AGENTS.md"), "a".repeat(40_000), "utf8");

		const result = await syncCodexProjectDocLimit(repoRoot, true);

		assert.equal(result?.outcome.action, "written");
		assert.equal(await readIfExists(path.join(repoRoot, CODEX_CONFIG_RELATIVE_PATH)), null);
		assert.equal(await readIfExists(path.join(repoRoot, ".codex")), null);
	});
});
