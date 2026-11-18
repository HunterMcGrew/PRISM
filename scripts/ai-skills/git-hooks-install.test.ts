/**
 * Contract for the git hooks installer: it points `core.hooksPath` at
 * `.githooks` only when that cannot displace a hooks setup PRISM does not
 * recognize, at every git config scope, and reports what it left alone.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
	classifyHooksPath,
	installGitHooks,
	readGitHooksState,
	runSessionStartInstall,
} from "./hooks/git-hooks/install.mjs";

const SHIM_WITH_MARKER = "#!/bin/sh\n# @prism-hook-runtime: PRISM git hook shim.\n";

interface Fixture {
	root: string;
	globalConfig: string;
	git(...args: string[]): string;
}

/**
 * A repo with PRISM's marked shim, run with git config isolated from the
 * developer's machine. The installer reads `process.env`, so the isolation is
 * applied there and restored afterwards.
 */
function withFixture(
	options: { shim?: string | null },
	body: (fixture: Fixture) => void
): void {
	const { shim = SHIM_WITH_MARKER } = options;
	const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "prism-hooks-install-")));
	const savedEnv = { ...process.env };
	try {
		for (const key of Object.keys(process.env)) {
			if (key.startsWith("GIT_")) {
				delete process.env[key];
			}
		}
		const globalConfig = path.join(base, "gitconfig");
		fs.writeFileSync(globalConfig, "");
		process.env.GIT_CONFIG_NOSYSTEM = "1";
		process.env.GIT_CONFIG_GLOBAL = globalConfig;

		const root = path.join(base, "repo");
		fs.mkdirSync(root);
		const git = (...args: string[]): string => {
			try {
				return execFileSync("git", args, {
					cwd: root,
					encoding: "utf8",
					stdio: ["ignore", "pipe", "ignore"],
				}).trim();
			} catch {
				return "";
			}
		};
		git("init", "-q");
		if (shim !== null) {
			fs.mkdirSync(path.join(root, ".githooks"));
			fs.writeFileSync(path.join(root, ".githooks", "pre-commit"), shim);
		}

		body({ root, globalConfig, git });
	} finally {
		for (const key of Object.keys(process.env)) {
			delete process.env[key];
		}
		Object.assign(process.env, savedEnv);
		fs.rmSync(base, { force: true, recursive: true, maxRetries: 10, retryDelay: 200 });
	}
}

test("an unset hooks path becomes .githooks", () => {
	withFixture({}, ({ root, git }) => {
		const result = installGitHooks(root);

		assert.deepEqual(result, {
			action: "set",
			message: "prism hooks: set core.hooksPath to .githooks",
		});
		assert.equal(git("config", "--local", "--get", "core.hooksPath"), ".githooks");
	});
});

test("running the installer twice reports already installed", () => {
	withFixture({}, ({ root }) => {
		installGitHooks(root);

		assert.deepEqual(installGitHooks(root), {
			action: "already",
			message: "prism hooks: already installed",
		});
	});
});

test("a local absolute path to this repo's .githooks with a trailing slash is replaced", () => {
	withFixture({}, ({ root, git }) => {
		git("config", "--local", "core.hooksPath", `${root}/.githooks/`);

		assert.equal(installGitHooks(root).action, "set");
		assert.equal(git("config", "--local", "--get", "core.hooksPath"), ".githooks");
	});
});

test("a worktree-scope value pointing at this repo's .githooks is unset and local becomes .githooks", () => {
	withFixture({}, ({ root, git }) => {
		git("config", "extensions.worktreeConfig", "true");
		git("config", "--worktree", "core.hooksPath", `${root}/.githooks`);

		const result = installGitHooks(root);

		assert.equal(result.action, "set");
		assert.match(result.message, /, and removed this worktree's '.*\.githooks'$/);
		assert.equal(git("config", "--worktree", "--get", "core.hooksPath"), "");
		assert.equal(git("config", "--local", "--get", "core.hooksPath"), ".githooks");
	});
});

test("a local .husky is left alone with the exact message and nothing is written", () => {
	withFixture({}, ({ root, git }) => {
		git("config", "--local", "core.hooksPath", ".husky");

		assert.deepEqual(installGitHooks(root), {
			action: "left-alone",
			message:
				"prism hooks: the local core.hooksPath is '.husky'. Git reads one hooks directory, so PRISM's hooks are not active. Compose them with yours by hand. Nothing was changed.",
		});
		assert.equal(git("config", "--local", "--get", "core.hooksPath"), ".husky");
	});
});

test("a foreign global value is left alone and no local value is written", () => {
	withFixture({}, ({ root, git, globalConfig }) => {
		fs.writeFileSync(globalConfig, "[core]\n\thooksPath = /team/hooks\n");

		const result = installGitHooks(root);

		assert.equal(result.action, "left-alone");
		assert.match(result.message, /^prism hooks: the global core\.hooksPath is '\/team\/hooks'/);
		assert.equal(git("config", "--local", "--get", "core.hooksPath"), "");
	});
});

test("a .githooks directory in a different repo is foreign", () => {
	withFixture({}, ({ root, git }) => {
		const otherRepo = path.join(path.dirname(root), "other");
		fs.mkdirSync(path.join(otherRepo, ".githooks"), { recursive: true });
		execFileSync("git", ["init", "-q"], { cwd: otherRepo });
		git("config", "--local", "core.hooksPath", `${otherRepo}/.githooks`);

		assert.equal(classifyHooksPath(`${otherRepo}/.githooks`, root), "foreign");
		assert.equal(installGitHooks(root).action, "left-alone");
	});
});

test("a .githooks directory in another worktree of the same clone is ours", () => {
	withFixture({}, ({ root, git }) => {
		git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "--allow-empty", "-m", "init");
		const linked = path.join(path.dirname(root), "linked");
		git("worktree", "add", "-q", linked, "-b", "linked");
		fs.mkdirSync(path.join(linked, ".githooks"), { recursive: true });

		assert.equal(classifyHooksPath(`${linked}/.githooks`, root), "ours");
	});
});

test("a repo with no PRISM shims gets no-shims and nothing is written", () => {
	withFixture({ shim: null }, ({ root, git }) => {
		assert.equal(installGitHooks(root).action, "no-shims");
		assert.equal(git("config", "--local", "--get", "core.hooksPath"), "");
	});
});

test("an unmarked .githooks/pre-commit is the consumer's own, so there is nothing to install", () => {
	withFixture({ shim: "#!/bin/sh\necho mine\n" }, ({ root }) => {
		assert.equal(installGitHooks(root).action, "no-shims");
	});
});

test("dryRun writes nothing and prefixes the message with 'would'", () => {
	withFixture({}, ({ root, git }) => {
		const result = installGitHooks(root, { dryRun: true });

		assert.deepEqual(result, {
			action: "set",
			message: "would prism hooks: set core.hooksPath to .githooks",
		});
		assert.equal(git("config", "--local", "--get", "core.hooksPath"), "");
	});
});

test("readGitHooksState reports installed only when the shim carries the marker", () => {
	withFixture({ shim: "#!/bin/sh\necho mine\n" }, ({ root, git }) => {
		git("config", "--local", "core.hooksPath", ".githooks");
		assert.equal(readGitHooksState(root).installed, false);

		fs.writeFileSync(path.join(root, ".githooks", "pre-commit"), SHIM_WITH_MARKER);
		const state = readGitHooksState(root);
		assert.equal(state.installed, true);
		assert.equal(state.effective, ".githooks");
		assert.equal(state.scopes.local, ".githooks");
	});
});

test("readGitHooksState reports not installed for a foreign value even with a marked shim", () => {
	withFixture({}, ({ root, git }) => {
		git("config", "--local", "core.hooksPath", ".husky");

		assert.equal(readGitHooksState(root).installed, false);
	});
});

test("classifyHooksPath handles unset, trailing separators, and Windows spellings", () => {
	withFixture({}, ({ root }) => {
		assert.equal(classifyHooksPath("", root), "unset");
		assert.equal(classifyHooksPath(null, root), "unset");
		assert.equal(classifyHooksPath(".githooks", root), "ours");
		assert.equal(classifyHooksPath(".githooks/", root), "ours");
		assert.equal(classifyHooksPath(".githooks\\", root), "ours");
		assert.equal(classifyHooksPath(".husky", root), "foreign");
		assert.equal(classifyHooksPath("hooks/.githooks", root), "foreign");
		assert.equal(classifyHooksPath(`${root.replaceAll("/", "\\")}\\.githooks`, root), "ours");
	});
});

test("runSessionStartInstall ignores a compact and writes nothing", () => {
	withFixture({}, ({ root, git }) => {
		const result = runSessionStartInstall(JSON.stringify({ source: "compact", cwd: root }));

		assert.equal(result, null);
		assert.equal(git("config", "--local", "--get", "core.hooksPath"), "");
	});
});

test("runSessionStartInstall on startup in an unset repo sets the value and returns the message", () => {
	withFixture({}, ({ root, git }) => {
		const result = runSessionStartInstall(JSON.stringify({ source: "startup", cwd: root }));

		assert.equal(result, "prism hooks: set core.hooksPath to .githooks");
		assert.equal(git("config", "--local", "--get", "core.hooksPath"), ".githooks");
	});
});

test("runSessionStartInstall on resume installs the same way", () => {
	withFixture({}, ({ root }) => {
		assert.equal(
			runSessionStartInstall(JSON.stringify({ source: "resume", cwd: root })),
			"prism hooks: set core.hooksPath to .githooks"
		);
	});
});

test("runSessionStartInstall leaves a foreign setup alone and prints nothing", () => {
	withFixture({}, ({ root, git }) => {
		git("config", "--local", "core.hooksPath", ".husky");

		assert.equal(runSessionStartInstall(JSON.stringify({ source: "startup", cwd: root })), null);
		assert.equal(git("config", "--local", "--get", "core.hooksPath"), ".husky");
	});
});

test("runSessionStartInstall returns null for an unparseable payload", () => {
	assert.equal(runSessionStartInstall("not json"), null);
});

test("running install.mjs as a script installs and prints the message", () => {
	withFixture({}, ({ root, git }) => {
		const installScript = path.join(
			path.dirname(fileURLToPath(import.meta.url)),
			"hooks",
			"git-hooks",
			"install.mjs"
		);
		const output = execFileSync(process.execPath, [installScript], {
			cwd: root,
			encoding: "utf8",
			env: process.env,
		});

		assert.equal(output, "prism hooks: set core.hooksPath to .githooks\n");
		assert.equal(git("config", "--local", "--get", "core.hooksPath"), ".githooks");
	});
});
