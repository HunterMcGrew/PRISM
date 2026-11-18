/**
 * Contract for the git hooks installer: it points `core.hooksPath` at
 * `.githooks` only when that cannot displace a hooks setup PRISM does not
 * recognize, at every git config scope, and reports what it left alone.
 */
import assert from "node:assert/strict";
import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
	classifyHooksPath,
	installGitHooks,
	isRunnableShim,
	readGitHooksState,
	removeGitHooksPath,
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
		// `git init` copies `.git/hooks` from a template dir that a machine may not have.
		fs.mkdirSync(path.join(root, ".git", "hooks"), { recursive: true });
		if (shim !== null) {
			fs.mkdirSync(path.join(root, ".githooks"));
			fs.writeFileSync(path.join(root, ".githooks", "pre-commit"), shim, { mode: 0o755 });
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

test("a foreign hooks path pulled in through the global config's include.path is left alone", () => {
	withFixture({}, ({ root, git, globalConfig }) => {
		const teamConfig = path.join(path.dirname(globalConfig), "team.gitconfig");
		fs.writeFileSync(teamConfig, "[core]\n\thooksPath = /team/hooks\n");
		fs.writeFileSync(globalConfig, `[include]\n\tpath = ${teamConfig.replaceAll("\\", "/")}\n`);

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

test("readGitHooksState reports a hook active only when its shim carries the marker", () => {
	withFixture({ shim: "#!/bin/sh\necho mine\n" }, ({ root, git }) => {
		git("config", "--local", "core.hooksPath", ".githooks");
		assert.equal(readGitHooksState(root).active["pre-commit"], false);

		fs.writeFileSync(path.join(root, ".githooks", "pre-commit"), SHIM_WITH_MARKER);
		const state = readGitHooksState(root);
		assert.equal(state.active["pre-commit"], true);
		assert.equal(state.effective, ".githooks");
		assert.equal(state.scopes.local, ".githooks");
	});
});

test("readGitHooksState judges each hook on its own shim", () => {
	withFixture({}, ({ root, git }) => {
		git("config", "--local", "core.hooksPath", ".githooks");
		fs.writeFileSync(path.join(root, ".githooks", "pre-push"), "#!/bin/sh\necho mine\n", {
			mode: 0o755,
		});

		assert.deepEqual(readGitHooksState(root).active, { "pre-commit": true, "pre-push": false });
	});
});

test("readGitHooksState reports no hook active for a foreign value even with a marked shim", () => {
	withFixture({}, ({ root, git }) => {
		git("config", "--local", "core.hooksPath", ".husky");

		assert.deepEqual(readGitHooksState(root).active, { "pre-commit": false, "pre-push": false });
	});
});

test(
	"a marked shim without the executable bit is not runnable, and so not active",
	{ skip: process.platform === "win32" && "Windows has no executable bit" },
	() => {
		withFixture({}, ({ root, git }) => {
			git("config", "--local", "core.hooksPath", ".githooks");
			const shimPath = path.join(root, ".githooks", "pre-commit");
			fs.chmodSync(shimPath, 0o644);

			assert.equal(isRunnableShim(shimPath), false);
			assert.equal(readGitHooksState(root).active["pre-commit"], false);

			fs.chmodSync(shimPath, 0o755);
			assert.equal(isRunnableShim(shimPath), true);
			assert.equal(readGitHooksState(root).active["pre-commit"], true);
		});
	}
);

test(
	"the installer makes a marked shim without the executable bit executable before it reports set",
	{ skip: process.platform === "win32" && "Windows has no executable bit" },
	() => {
		withFixture({}, ({ root, git }) => {
			const shimPath = path.join(root, ".githooks", "pre-commit");
			fs.chmodSync(shimPath, 0o644);

			assert.deepEqual(installGitHooks(root), {
				action: "set",
				message: "prism hooks: set core.hooksPath to .githooks; made pre-commit executable",
			});
			assert.equal(git("config", "--local", "--get", "core.hooksPath"), ".githooks");
			assert.equal(isRunnableShim(shimPath), true);
			assert.equal(readGitHooksState(root).active["pre-commit"], true);
		});
	}
);

test(
	"the installer repairs a non-executable shim when the value is already set, and then reports already",
	{ skip: process.platform === "win32" && "Windows has no executable bit" },
	() => {
		withFixture({}, ({ root, git }) => {
			git("config", "--local", "core.hooksPath", ".githooks");
			const shimPath = path.join(root, ".githooks", "pre-commit");
			fs.chmodSync(shimPath, 0o644);

			assert.deepEqual(installGitHooks(root), {
				action: "set",
				message: "prism hooks: made pre-commit executable",
			});
			assert.equal(isRunnableShim(shimPath), true);
			assert.equal(installGitHooks(root).action, "already");
		});
	}
);

test(
	"a dry run names the shim it would make executable and leaves its mode alone",
	{ skip: process.platform === "win32" && "Windows has no executable bit" },
	() => {
		withFixture({}, ({ root, git }) => {
			const shimPath = path.join(root, ".githooks", "pre-commit");
			fs.chmodSync(shimPath, 0o644);

			assert.deepEqual(installGitHooks(root, { dryRun: true }), {
				action: "set",
				message:
					"would prism hooks: set core.hooksPath to .githooks; made pre-commit executable",
			});
			assert.equal(isRunnableShim(shimPath), false);
			assert.equal(git("config", "--local", "--get", "core.hooksPath"), "");
		});
	}
);

test("isRunnableShim ignores the mode on Windows and still requires the marker", () => {
	withFixture({}, ({ root }) => {
		const shimPath = path.join(root, ".githooks", "pre-commit");
		fs.chmodSync(shimPath, 0o644);

		assert.equal(isRunnableShim(shimPath, "win32"), true);

		fs.writeFileSync(shimPath, "#!/bin/sh\necho mine\n");
		assert.equal(isRunnableShim(shimPath, "win32"), false);
	});
});

test("a hook in .git/hooks with every scope unset is left alone and named", () => {
	withFixture({}, ({ root, git }) => {
		fs.writeFileSync(path.join(root, ".git", "hooks", "pre-commit"), "#!/bin/sh\nexit 0\n");

		const result = installGitHooks(root);

		assert.deepEqual(result, {
			action: "left-alone",
			message:
				"prism hooks: .git/hooks holds pre-commit, which git stops running once core.hooksPath is set. Git reads one hooks directory, so PRISM's hooks are not active. Compose them with yours by hand. Nothing was changed.",
		});
		assert.equal(git("config", "--local", "--get", "core.hooksPath"), "");
	});
});

test("only .sample files in .git/hooks do not block the install", () => {
	withFixture({}, ({ root, git }) => {
		const hooksDir = path.join(root, ".git", "hooks");
		fs.mkdirSync(hooksDir, { recursive: true });
		fs.writeFileSync(path.join(hooksDir, "pre-commit.sample"), "#!/bin/sh\n");

		assert.equal(installGitHooks(root).action, "set");
		assert.equal(git("config", "--local", "--get", "core.hooksPath"), ".githooks");
	});
});

test("a hook in .git/hooks does not matter once core.hooksPath is already ours", () => {
	withFixture({}, ({ root, git }) => {
		git("config", "--local", "core.hooksPath", ".githooks");
		fs.writeFileSync(path.join(root, ".git", "hooks", "pre-commit"), "#!/bin/sh\nexit 0\n");

		assert.equal(installGitHooks(root).action, "already");
	});
});

test("a hook in the main checkout's .git/hooks blocks the install from a linked worktree", () => {
	withFixture({}, ({ root, git }) => {
		git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "--allow-empty", "-m", "init");
		const linked = path.join(path.dirname(root), "linked");
		git("worktree", "add", "-q", linked, "-b", "linked");
		fs.mkdirSync(path.join(linked, ".githooks"));
		fs.writeFileSync(path.join(linked, ".githooks", "pre-commit"), SHIM_WITH_MARKER, {
			mode: 0o755,
		});
		fs.writeFileSync(path.join(root, ".git", "hooks", "post-checkout"), "#!/bin/sh\nexit 0\n");

		const result = installGitHooks(linked);

		assert.equal(result.action, "left-alone");
		assert.match(result.message, /holds post-checkout, which git stops running/);
	});
});

test("runSessionStartInstall leaves hooks in .git/hooks alone and prints nothing", () => {
	withFixture({}, ({ root, git }) => {
		fs.writeFileSync(path.join(root, ".git", "hooks", "pre-push"), "#!/bin/sh\nexit 0\n");

		assert.equal(runSessionStartInstall(JSON.stringify({ source: "startup", cwd: root })), null);
		assert.equal(git("config", "--local", "--get", "core.hooksPath"), "");
	});
});

test("shimsDelivered previews the install for a dry run whose shims are not on disk yet", () => {
	withFixture({ shim: null }, ({ root, git }) => {
		assert.deepEqual(installGitHooks(root, { dryRun: true, shimsDelivered: true }), {
			action: "set",
			message: "would prism hooks: set core.hooksPath to .githooks",
		});
		assert.equal(git("config", "--local", "--get", "core.hooksPath"), "");
	});
});

test("removeGitHooksPath unsets only a local value of exactly .githooks", () => {
	withFixture({}, ({ root, git }) => {
		git("config", "--local", "core.hooksPath", ".husky");
		assert.equal(removeGitHooksPath(root), null);
		assert.equal(git("config", "--local", "--get", "core.hooksPath"), ".husky");

		git("config", "--local", "core.hooksPath", ".githooks");
		assert.equal(
			removeGitHooksPath(root, { dryRun: true }),
			"would prism hooks: unset core.hooksPath, since .githooks/ was removed"
		);
		assert.equal(git("config", "--local", "--get", "core.hooksPath"), ".githooks");

		assert.equal(
			removeGitHooksPath(root),
			"prism hooks: unset core.hooksPath, since .githooks/ was removed"
		);
		assert.equal(git("config", "--local", "--get", "core.hooksPath"), "");
	});
});

test("removeGitHooksPath keeps the value while another worktree still has a PRISM shim", () => {
	withFixture({}, ({ root, git }) => {
		git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "--allow-empty", "-m", "init");
		const linked = path.join(path.dirname(root), "linked");
		git("worktree", "add", "-q", linked, "-b", "linked");
		const linkedShim = path.join(linked, ".githooks", "pre-commit");
		fs.mkdirSync(path.dirname(linkedShim));
		git("config", "--local", "core.hooksPath", ".githooks");
		fs.rmSync(path.join(root, ".githooks"), { recursive: true });

		fs.writeFileSync(linkedShim, "#!/bin/sh\necho mine\n", { mode: 0o755 });
		assert.equal(
			removeGitHooksPath(root, { dryRun: true }),
			"would prism hooks: unset core.hooksPath, since .githooks/ was removed",
			"a sibling's own unmarked hook does not count as PRISM's"
		);

		fs.writeFileSync(linkedShim, SHIM_WITH_MARKER, { mode: 0o755 });
		assert.equal(removeGitHooksPath(root), null);
		assert.equal(git("config", "--local", "--get", "core.hooksPath"), ".githooks");

		fs.rmSync(path.join(linked, ".githooks"), { recursive: true });
		assert.equal(
			removeGitHooksPath(root),
			"prism hooks: unset core.hooksPath, since .githooks/ was removed"
		);
		assert.equal(git("config", "--local", "--get", "core.hooksPath"), "");
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

/**
 * The setup-script line the docs and onboarding offer. It must exit 0 when the
 * runtime is absent, as it is in a Cursor-only consumer, because a non-zero
 * exit there fails every `pnpm install` through `prepare`.
 */
const GUARDED_SETUP_LINE = `node -e "import('./.claude/hooks/git-hooks/install.mjs').then((m) => m.runInstallCli(), () => {})"`;

test("the guarded setup-script line exits 0 and does nothing when install.mjs is absent", () => {
	withFixture({}, ({ root, git }) => {
		const output = execSync(GUARDED_SETUP_LINE, { cwd: root, encoding: "utf8", env: process.env });

		assert.equal(output, "");
		assert.equal(git("config", "--local", "--get", "core.hooksPath"), "");
	});
});

test("the guarded setup-script line installs when install.mjs is present", () => {
	withFixture({}, ({ root, git }) => {
		const installScript = path.join(
			path.dirname(fileURLToPath(import.meta.url)),
			"hooks",
			"git-hooks",
			"install.mjs"
		);
		fs.mkdirSync(path.join(root, ".claude", "hooks", "git-hooks"), { recursive: true });
		fs.copyFileSync(installScript, path.join(root, ".claude", "hooks", "git-hooks", "install.mjs"));

		const output = execSync(GUARDED_SETUP_LINE, { cwd: root, encoding: "utf8", env: process.env });

		assert.equal(output, "prism hooks: set core.hooksPath to .githooks\n");
		assert.equal(git("config", "--local", "--get", "core.hooksPath"), ".githooks");
	});
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
