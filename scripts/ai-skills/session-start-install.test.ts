/**
 * Contract for the agent session-start install arm: `hook.mjs --event=SessionStart`
 * installs PRISM's git hooks on a fresh or resumed session in an unconfigured
 * clone, leaves a compaction to the post-compact note alone, and stays silent
 * where a foreign hooks setup is present. The registration templates are
 * pinned so the arm is actually reached.
 */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const prismRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const HOOK_ENTRY = path.join(prismRoot, "scripts", "ai-skills", "hooks", "hook.mjs");

interface Fixture {
	root: string;
	env: NodeJS.ProcessEnv;
	git(...args: string[]): string;
	/** Spawns the session-start arm with a payload for this fixture. */
	sessionStart(source: string): { status: number | null; stdout: string };
}

function withFixture(body: (fixture: Fixture) => void): void {
	const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "prism-session-start-")));
	try {
		const env: NodeJS.ProcessEnv = {};
		for (const [key, value] of Object.entries(process.env)) {
			if (!key.startsWith("GIT_")) {
				env[key] = value;
			}
		}
		fs.writeFileSync(path.join(base, "gitconfig"), "");
		env.GIT_CONFIG_NOSYSTEM = "1";
		env.GIT_CONFIG_GLOBAL = path.join(base, "gitconfig");

		const root = path.join(base, "repo");
		fs.mkdirSync(path.join(root, ".githooks"), { recursive: true });
		execFileSync("git", ["init", "-q"], { cwd: root, env });
		// The post-compact note is only written inside a PRISM install, which the manifest marks.
		fs.mkdirSync(path.join(root, ".prism", "architect"), { recursive: true });
		fs.writeFileSync(path.join(root, ".prism", "architect", "manifest.json"), "{}");
		fs.writeFileSync(
			path.join(root, ".githooks", "pre-commit"),
			"#!/bin/sh\n# @prism-hook-runtime: PRISM git hook shim.\n"
		);

		body({
			root,
			env,
			git: (...args) => {
				try {
					return execFileSync("git", args, {
						cwd: root,
						env,
						encoding: "utf8",
						stdio: ["ignore", "pipe", "ignore"],
					}).trim();
				} catch {
					return "";
				}
			},
			sessionStart: (source) => {
				const result = spawnSync(
					process.execPath,
					[HOOK_ENTRY, "--tool=claude", "--event=SessionStart"],
					{
						input: JSON.stringify({ session_id: "s1", source, cwd: root }),
						env,
						encoding: "utf8",
					}
				);

				return { status: result.status, stdout: result.stdout };
			},
		});
	} finally {
		fs.rmSync(base, { force: true, recursive: true, maxRetries: 10, retryDelay: 200 });
	}
}

test("a startup session in an unset repo with marked shims installs the hooks and says so", () => {
	withFixture(({ git, sessionStart }) => {
		const result = sessionStart("startup");

		assert.equal(result.status, 0);
		assert.equal(result.stdout, "prism hooks: set core.hooksPath to .githooks");
		assert.equal(git("config", "--local", "--get", "core.hooksPath"), ".githooks");
	});
});

test("a compact session leaves core.hooksPath unset and prints the post-compact note", () => {
	withFixture(({ git, sessionStart }) => {
		const result = sessionStart("compact");

		assert.equal(result.status, 0);
		assert.ok(result.stdout.startsWith("Context was compacted."));
		assert.equal(git("config", "--local", "--get", "core.hooksPath"), "");
	});
});

test("a repo with .husky set stays unchanged and prints nothing", () => {
	withFixture(({ git, sessionStart }) => {
		git("config", "--local", "core.hooksPath", ".husky");

		const result = sessionStart("startup");

		assert.equal(result.status, 0);
		assert.equal(result.stdout, "");
		assert.equal(git("config", "--local", "--get", "core.hooksPath"), ".husky");
	});
});

test("the Claude templates and PRISM's own settings register SessionStart for startup, resume, and compact", () => {
	for (const settingsPath of [
		path.join(prismRoot, "templates", "install", ".claude", "settings.json"),
		path.join(prismRoot, ".claude", "settings.json"),
	]) {
		const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
		const entries = settings.hooks.SessionStart;

		assert.equal(entries.length, 1, settingsPath);
		assert.equal(entries[0].matcher, "startup|resume|compact", settingsPath);
		assert.match(entries[0].hooks[0].command, /hook\.mjs" --tool=claude --event=SessionStart$/);
	}
});

test("the Codex template registers SessionStart for startup and resume only", () => {
	const hooks = JSON.parse(
		fs.readFileSync(path.join(prismRoot, "templates", "install", ".codex", "hooks.json"), "utf8")
	);
	const entries = hooks.hooks.SessionStart;

	assert.equal(entries.length, 1);
	assert.equal(entries[0].matcher, "startup|resume");
	assert.equal(
		entries[0].hooks[0].command,
		'node ".claude/hooks/hook.mjs" --tool=codex --event=SessionStart'
	);
});
