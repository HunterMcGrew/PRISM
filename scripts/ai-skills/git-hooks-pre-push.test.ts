/**
 * Contract for the pre-push hook module: it lints the union of files the
 * pushed commits add or change, once, against the right base, and skips with a
 * notice when it cannot judge the push.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runPrePush } from "./hooks/git-hooks/pre-push.mjs";

const ZERO_SHA = "0".repeat(40);

/** Appends its argv to `lint.log` and exits 1 if any file it was given contains `LINT_ERROR`. */
const STUB_LINTER = `
import fs from "node:fs";
const files = process.argv.slice(2);
fs.appendFileSync("lint.log", files.join("|") + "\\n");
process.exit(files.some((file) => fs.readFileSync(file, "utf8").includes("LINT_ERROR")) ? 1 : 0);
`;

const DEFAULT_PRE_PUSH = { command: "node lint.mjs {files}", globs: ["**/*.txt"] };

interface Fixture {
	root: string;
	env: NodeJS.ProcessEnv;
	git(...args: string[]): string;
	/** Writes and commits files; a `null` value deletes the file. Returns the new HEAD. */
	commit(files: Record<string, string | null>): string;
	/** The lines the stub linter logged, one per run. */
	lintRuns(): string[];
}

function cleanEnv(emptyGlobalConfig: string): NodeJS.ProcessEnv {
	const env: NodeJS.ProcessEnv = {};
	for (const [key, value] of Object.entries(process.env)) {
		if (!key.startsWith("GIT_")) {
			env[key] = value;
		}
	}

	return { ...env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: emptyGlobalConfig };
}

function withFixture(
	options: { config?: Record<string, unknown> | null; publishMain?: boolean },
	body: (fixture: Fixture) => void
): void {
	const { config = { gitHooks: { prePush: DEFAULT_PRE_PUSH } }, publishMain = true } = options;
	const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "prism-pre-push-")));
	try {
		const root = path.join(base, "work");
		const remote = path.join(base, "remote.git");
		const emptyGlobalConfig = path.join(base, "gitconfig");
		fs.mkdirSync(root);
		fs.writeFileSync(emptyGlobalConfig, "");
		const env = cleanEnv(emptyGlobalConfig);
		const git = (...args: string[]): string =>
			execFileSync(
				"git",
				["-c", "user.name=t", "-c", "user.email=t@t", "-c", "core.quotePath=false", ...args],
				{ cwd: root, env, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
			);
		const commit = (files: Record<string, string | null>): string => {
			for (const [name, content] of Object.entries(files)) {
				const target = path.join(root, name);
				if (content === null) {
					fs.rmSync(target);
				} else {
					fs.mkdirSync(path.dirname(target), { recursive: true });
					fs.writeFileSync(target, content);
				}
			}
			git("add", "-A");
			git("commit", "-q", "-m", "change");

			return git("rev-parse", "HEAD").trim();
		};

		git("init", "-q", "-b", "main");
		execFileSync("git", ["init", "-q", "--bare", remote], { env });
		git("remote", "add", "origin", remote);
		fs.writeFileSync(path.join(root, "lint.mjs"), STUB_LINTER);
		fs.writeFileSync(path.join(root, ".gitignore"), "lint.log\n");
		if (config !== null) {
			fs.mkdirSync(path.join(root, ".ai-skills"));
			fs.writeFileSync(path.join(root, ".ai-skills", "config.json"), JSON.stringify(config));
		}
		commit({ "seed.txt": "seed\n", "gone.txt": "gone\n" });
		if (publishMain) {
			git("push", "-q", "origin", "main");
		}

		body({
			root,
			env,
			git,
			commit,
			lintRuns: () => {
				const log = path.join(root, "lint.log");

				return fs.existsSync(log)
					? fs.readFileSync(log, "utf8").split("\n").filter(Boolean)
					: [];
			},
		});
	} finally {
		fs.rmSync(base, { force: true, recursive: true, maxRetries: 10, retryDelay: 200 });
	}
}

function refLine(localSha: string, remoteSha = ZERO_SHA, localRef = "refs/heads/feature"): string {
	return `${localRef} ${localSha} refs/heads/feature ${remoteSha}\n`;
}

test("a lint error refuses the push and the linter ran exactly once", () => {
	withFixture({}, ({ root, env, commit, lintRuns }) => {
		const head = commit({ "a.txt": "LINT_ERROR\n", "b.txt": "fine\n" });

		const result = runPrePush({ toplevel: root, remote: "origin", stdinText: refLine(head), env });

		assert.equal(result.exitCode, 1);
		assert.match(result.stderr, /pre-push: `node lint\.mjs \{files\}` failed; fix the lint errors/);
		assert.equal(lintRuns().length, 1);
	});
});

test("a clean push passes with both changed files in one run", () => {
	withFixture({}, ({ root, env, commit, lintRuns }) => {
		const head = commit({ "a.txt": "fine\n", "b.txt": "fine\n" });

		const result = runPrePush({ toplevel: root, remote: "origin", stdinText: refLine(head), env });

		assert.equal(result.exitCode, 0);
		assert.deepEqual(lintRuns(), ["a.txt|b.txt"]);
	});
});

test("a deleted file is not passed to the linter", () => {
	withFixture({}, ({ root, env, commit, lintRuns }) => {
		const head = commit({ "a.txt": "fine\n", "gone.txt": null });

		runPrePush({ toplevel: root, remote: "origin", stdinText: refLine(head), env });

		assert.deepEqual(lintRuns(), ["a.txt"]);
	});
});

test("a push of only a deletion runs nothing", () => {
	withFixture({}, ({ root, env, commit, lintRuns }) => {
		const head = commit({ "gone.txt": null });

		const result = runPrePush({ toplevel: root, remote: "origin", stdinText: refLine(head), env });

		assert.equal(result.exitCode, 0);
		assert.deepEqual(lintRuns(), []);
	});
});

test("a known remote SHA lints only the new commits", () => {
	withFixture({}, ({ root, env, git, commit, lintRuns }) => {
		const first = commit({ "old.txt": "LINT_ERROR\n" });
		git("push", "-q", "origin", "HEAD:refs/heads/feature");
		const second = commit({ "new.txt": "fine\n" });

		const result = runPrePush({
			toplevel: root,
			remote: "origin",
			stdinText: refLine(second, first),
			env,
		});

		assert.equal(result.exitCode, 0);
		assert.deepEqual(lintRuns(), ["new.txt"]);
	});
});

test("a ref delete line runs nothing", () => {
	withFixture({}, ({ root, env, commit, lintRuns }) => {
		const head = commit({ "a.txt": "LINT_ERROR\n" });

		const result = runPrePush({
			toplevel: root,
			remote: "origin",
			stdinText: `(delete) ${ZERO_SHA} refs/heads/feature ${head}\n`,
			env,
		});

		assert.equal(result.exitCode, 0);
		assert.deepEqual(lintRuns(), []);
	});
});

test("a ref that is not HEAD runs nothing and prints the notice", () => {
	withFixture({}, ({ root, env, commit, lintRuns }) => {
		const other = commit({ "a.txt": "LINT_ERROR\n" });
		commit({ "b.txt": "fine\n" });

		const result = runPrePush({
			toplevel: root,
			remote: "origin",
			stdinText: refLine(other, ZERO_SHA, "refs/heads/other"),
			env,
		});

		assert.equal(result.exitCode, 0);
		assert.match(result.stderr, /pre-push: skipped refs\/heads\/other \(not the checked-out HEAD/);
		assert.deepEqual(lintRuns(), []);
	});
});

test("with no origin/main and a zero remote SHA the push skips with the notice", () => {
	withFixture({ publishMain: false }, ({ root, env, commit, lintRuns }) => {
		const head = commit({ "a.txt": "LINT_ERROR\n" });

		const result = runPrePush({ toplevel: root, remote: "origin", stdinText: refLine(head), env });

		assert.equal(result.exitCode, 0);
		assert.match(
			result.stderr,
			/pre-push: skipped refs\/heads\/feature \(no origin\/main to diff against\)/
		);
		assert.deepEqual(lintRuns(), []);
	});
});

test("a configured defaultBranch picks the fallback base", () => {
	withFixture(
		{ config: { defaultBranch: "trunk", gitHooks: { prePush: DEFAULT_PRE_PUSH } } },
		({ root, env, git, commit, lintRuns }) => {
			git("push", "-q", "origin", "main:refs/heads/trunk");
			git("fetch", "-q", "origin");
			const head = commit({ "a.txt": "fine\n" });

			runPrePush({ toplevel: root, remote: "origin", stdinText: refLine(head), env });

			assert.deepEqual(lintRuns(), ["a.txt"]);
		}
	);
});

test("a missing linter binary skips with the not-found notice", () => {
	const command = "prism-no-such-linter-xyz {files}";
	withFixture(
		{ config: { gitHooks: { prePush: { command, globs: ["**/*.txt"] } } } },
		({ root, env, commit }) => {
			const head = commit({ "a.txt": "fine\n" });

			const result = runPrePush({ toplevel: root, remote: "origin", stdinText: refLine(head), env });

			assert.equal(result.exitCode, 0);
			assert.match(result.stderr, /pre-push: skipped \(`prism-no-such-linter-xyz \{files\}` not found\)/);
		}
	);
});

test("a config with no gitHooks block skips", () => {
	withFixture({ config: { commands: {} } }, ({ root, env, commit, lintRuns }) => {
		const head = commit({ "a.txt": "LINT_ERROR\n" });

		const result = runPrePush({ toplevel: root, remote: "origin", stdinText: refLine(head), env });

		assert.equal(result.exitCode, 0);
		assert.equal(result.stderr, "pre-push: skipped (no gitHooks.prePush in .ai-skills/config.json)\n");
		assert.deepEqual(lintRuns(), []);
	});
});

test("a non-ASCII name reaches the linter unquoted", () => {
	withFixture({}, ({ root, env, commit, lintRuns }) => {
		const head = commit({ "café.txt": "fine\n" });

		runPrePush({ toplevel: root, remote: "origin", stdinText: refLine(head), env });

		assert.deepEqual(lintRuns(), ["café.txt"]);
	});
});
