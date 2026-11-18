/**
 * Contract for `prism hooks install`: it sets `core.hooksPath` in an
 * unconfigured clone, reports a foreign value it left alone on stderr, exits 0
 * for both, and prints usage with a non-zero exit for anything else.
 */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { runHooksCli } from "./hooks-cli";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

interface Fixture {
	root: string;
	git(...args: string[]): string;
}

/** A repo with PRISM's marked pre-commit shim, with git config isolated from the machine's. */
async function withFixture(body: (fixture: Fixture) => Promise<void>): Promise<void> {
	const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "prism-hooks-cli-")));
	const savedEnv = { ...process.env };
	try {
		for (const key of Object.keys(process.env)) {
			if (key.startsWith("GIT_")) {
				delete process.env[key];
			}
		}
		fs.writeFileSync(path.join(base, "gitconfig"), "");
		process.env.GIT_CONFIG_NOSYSTEM = "1";
		process.env.GIT_CONFIG_GLOBAL = path.join(base, "gitconfig");

		const root = path.join(base, "repo");
		fs.mkdirSync(path.join(root, ".githooks"), { recursive: true });
		execFileSync("git", ["init", "-q"], { cwd: root });
		fs.writeFileSync(
			path.join(root, ".githooks", "pre-commit"),
			"#!/bin/sh\n# @prism-hook-runtime: PRISM git hook shim.\n",
			{ mode: 0o755 }
		);

		await body({
			root,
			git: (...args) => {
				try {
					return execFileSync("git", args, {
						cwd: root,
						encoding: "utf8",
						stdio: ["ignore", "pipe", "ignore"],
					}).trim();
				} catch {
					return "";
				}
			},
		});
	} finally {
		for (const key of Object.keys(process.env)) {
			delete process.env[key];
		}
		Object.assign(process.env, savedEnv);
		fs.rmSync(base, { force: true, recursive: true, maxRetries: 10, retryDelay: 200 });
	}
}

/** Runs `body` with `console.log` and `console.error` captured. */
async function captureConsole(
	body: () => Promise<void>
): Promise<{ stdout: string; stderr: string }> {
	const originalLog = console.log;
	const originalError = console.error;
	let stdout = "";
	let stderr = "";
	console.log = (...parts: unknown[]) => {
		stdout += `${parts.join(" ")}\n`;
	};
	console.error = (...parts: unknown[]) => {
		stderr += `${parts.join(" ")}\n`;
	};
	try {
		await body();
	} finally {
		console.log = originalLog;
		console.error = originalError;
	}

	return { stdout, stderr };
}

test("hooks install sets core.hooksPath in a repo with marked shims", async () => {
	await withFixture(async ({ root, git }) => {
		const output = await captureConsole(() => runHooksCli(["install", "--consumer", root]));

		assert.equal(output.stdout, "prism hooks: set core.hooksPath to .githooks\n");
		assert.equal(git("config", "--local", "--get", "core.hooksPath"), ".githooks");
		assert.equal(process.exitCode ?? 0, 0);
	});
});

test("hooks install leaves a .husky value unchanged and names it on stderr", async () => {
	await withFixture(async ({ root, git }) => {
		git("config", "--local", "core.hooksPath", ".husky");

		const output = await captureConsole(() => runHooksCli(["install", "--consumer", root]));

		assert.match(output.stderr, /core\.hooksPath is '\.husky'/);
		assert.equal(output.stdout, "");
		assert.equal(git("config", "--local", "--get", "core.hooksPath"), ".husky");
		assert.equal(process.exitCode ?? 0, 0, "a left-alone report is not a failure");
	});
});

test("hooks with no sub-subcommand prints usage and sets exit code 1", async () => {
	const output = await captureConsole(() => runHooksCli([]));

	try {
		assert.equal(output.stderr, "Usage: prism hooks install [--consumer <path>]\n");
		assert.equal(process.exitCode, 1);
	} finally {
		process.exitCode = 0;
	}
});

test("prism --help lists the hooks install command", () => {
	const result = spawnSync(
		process.execPath,
		[require.resolve("tsx/cli"), path.join(scriptDirectory, "cli.ts"), "--help"],
		{ encoding: "utf8" }
	);

	assert.equal(result.status, 0);
	assert.match(result.stdout, /^ {2}prism hooks install {3}Point git at PRISM's \.githooks/m);
});
