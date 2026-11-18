/**
 * Contract for the shared command helpers the git hooks and the push gate
 * use: shell quoting per platform, placeholder substitution, the two
 * "command not found" spellings, and the never-throwing config read.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
	fillCommand,
	isCommandNotFound,
	quoteForShell,
	readRepoConfig,
} from "./hooks/lib/command.mjs";

test("quoteForShell single-quotes on POSIX and keeps a space inside the quotes", () => {
	assert.equal(quoteForShell("my file.txt", "linux"), "'my file.txt'");
});

test("quoteForShell writes an embedded single quote as '\\'' on POSIX", () => {
	assert.equal(quoteForShell("it's.txt", "linux"), "'it'\\''s.txt'");
});

test("quoteForShell double-quotes on win32", () => {
	assert.equal(quoteForShell("my file.txt", "win32"), '"my file.txt"');
});

test("quoteForShell throws on win32 for a name with a double quote", () => {
	assert.throws(() => quoteForShell('a"b.txt', "win32"), /double quote/);
});

test("fillCommand replaces a {files} token with the quoted paths", () => {
	assert.equal(
		fillCommand("eslint {files} --quiet", "{files}", ["a.ts", "b c.ts"], "linux"),
		"eslint 'a.ts' 'b c.ts' --quiet"
	);
});

test("fillCommand replaces every {path} token", () => {
	assert.equal(
		fillCommand("fmt {path} --name {path}", "{path}", ["a.ts"], "linux"),
		"fmt 'a.ts' --name 'a.ts'"
	);
});

test("fillCommand appends the paths when the token is absent", () => {
	assert.equal(fillCommand("eslint", "{files}", ["a.ts", "b.ts"], "linux"), "eslint 'a.ts' 'b.ts'");
});

test("fillCommand returns the command unchanged for an empty path list", () => {
	assert.equal(fillCommand("eslint {files}", "{files}", [], "linux"), "eslint {files}");
});

test("fillCommand keeps a dollar-sign pattern in a path literal", () => {
	assert.equal(fillCommand("fmt {path}", "{path}", ["a$&b.ts"], "linux"), "fmt 'a$&b.ts'");
});

test("isCommandNotFound is true for exit 127", () => {
	assert.equal(isCommandNotFound({ status: 127, stderr: "" }), true);
});

test("isCommandNotFound is true for the cmd.exe message on a non-zero exit", () => {
	assert.equal(
		isCommandNotFound({
			status: 1,
			stderr: "'nope' is not recognized as an internal or external command,",
		}),
		true
	);
});

test("isCommandNotFound is false for a real failure with other stderr", () => {
	assert.equal(isCommandNotFound({ status: 1, stderr: "lint error" }), false);
});

test("isCommandNotFound is false for a clean exit", () => {
	assert.equal(isCommandNotFound({ status: 0, stderr: "" }), false);
});

async function withTempDir<T>(body: (dir: string) => Promise<T>): Promise<T> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "prism-hook-command-"));
	try {
		return await body(dir);
	} finally {
		await fs.rm(dir, { force: true, recursive: true, maxRetries: 10, retryDelay: 200 });
	}
}

test("readRepoConfig returns null when the config is absent", async () => {
	await withTempDir(async (dir) => {
		assert.equal(readRepoConfig(dir), null);
	});
});

test("readRepoConfig returns null for invalid JSON without throwing", async () => {
	await withTempDir(async (dir) => {
		await fs.mkdir(path.join(dir, ".ai-skills"));
		await fs.writeFile(path.join(dir, ".ai-skills", "config.json"), "{ not json", "utf8");
		assert.equal(readRepoConfig(dir), null);
	});
});

test("readRepoConfig returns the parsed object for a valid config", async () => {
	await withTempDir(async (dir) => {
		await fs.mkdir(path.join(dir, ".ai-skills"));
		await fs.writeFile(
			path.join(dir, ".ai-skills", "config.json"),
			JSON.stringify({ defaultBranch: "trunk" }),
			"utf8"
		);
		assert.deepEqual(readRepoConfig(dir), { defaultBranch: "trunk" });
	});
});
