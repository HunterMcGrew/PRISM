/**
 * End-to-end contract for PRISM's git hook shims: real `git commit` and `git
 * push` run through `.githooks/pre-commit` and `.githooks/pre-push`, which
 * resolve their `.mjs` modules from the repository toplevel. These run on the
 * Windows CI leg too, where git runs the shims with Git for Windows' own `sh`.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const prismRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Prints stdin with trailing spaces stripped. */
const STUB_FORMATTER = `
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => process.stdout.write(input.replace(/[ \\t]+$/gm, "")));
`;

/** Exits 1 when any file it is given contains \`LINT_ERROR\`. */
const STUB_LINTER = `
import fs from "node:fs";
process.exit(process.argv.slice(2).some((file) => fs.readFileSync(file, "utf8").includes("LINT_ERROR")) ? 1 : 0);
`;

const GIT_HOOKS_CONFIG = {
	gitHooks: {
		preCommit: {
			command: "node fmt.mjs {path}",
			globs: ["**/*.txt"],
			fix: "fmt --write {files}",
		},
		prePush: { command: "node lint.mjs {files}", globs: ["**/*.txt"] },
	},
};

interface Fixture {
	root: string;
	remote: string;
	/** Runs git in the work tree and returns the spawn result; hooks run for real. */
	git(...args: string[]): { status: number | null; stdout: string; stderr: string };
	write(relativePath: string, content: string): void;
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

/**
 * A repo holding the shims, PRISM's hook modules under `.claude/hooks/` (the
 * consumer layout), the stub tools, and a bare remote with `main` published.
 * `core.hooksPath` is set after the seed commit and push so the setup itself
 * runs no hook.
 */
function withFixture(
	options: { config?: Record<string, unknown>; installRuntime?: boolean },
	body: (fixture: Fixture) => void
): void {
	const { config = GIT_HOOKS_CONFIG, installRuntime = true } = options;
	const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "prism-hook-shim-")));
	try {
		const root = path.join(base, "work");
		const remote = path.join(base, "remote.git");
		const emptyGlobalConfig = path.join(base, "gitconfig");
		fs.mkdirSync(root);
		fs.writeFileSync(emptyGlobalConfig, "");
		const env = cleanEnv(emptyGlobalConfig);
		const git = (...args: string[]) => {
			const result = spawnSync(
				"git",
				["-c", "user.name=t", "-c", "user.email=t@t", "-c", "core.quotePath=false", ...args],
				{ cwd: root, env, encoding: "utf8" }
			);

			return { status: result.status, stdout: result.stdout, stderr: result.stderr };
		};
		const write = (relativePath: string, content: string) => {
			const target = path.join(root, relativePath);
			fs.mkdirSync(path.dirname(target), { recursive: true });
			fs.writeFileSync(target, content);
		};

		git("init", "-q", "-b", "main");
		spawnSync("git", ["init", "-q", "--bare", remote], { env });
		git("remote", "add", "origin", remote);

		for (const shim of ["pre-commit", "pre-push"]) {
			const target = path.join(root, ".githooks", shim);
			fs.mkdirSync(path.dirname(target), { recursive: true });
			fs.copyFileSync(path.join(prismRoot, ".githooks", shim), target);
			fs.chmodSync(target, 0o755);
		}

		if (installRuntime) {
			const sourceDir = path.join(prismRoot, "scripts", "ai-skills", "hooks");
			const runtimeFiles = [
				"git-hooks/pre-commit.mjs",
				"git-hooks/pre-push.mjs",
				"lib/command.mjs",
			];
			for (const relative of runtimeFiles) {
				const target = path.join(root, ".claude", "hooks", relative);
				fs.mkdirSync(path.dirname(target), { recursive: true });
				fs.copyFileSync(path.join(sourceDir, relative), target);
			}
		}

		write("fmt.mjs", STUB_FORMATTER);
		write("lint.mjs", STUB_LINTER);
		write(".ai-skills/config.json", JSON.stringify(config));
		git("add", "-A");
		git("commit", "-q", "-m", "seed");
		git("push", "-q", "origin", "main");
		git("config", "--local", "core.hooksPath", ".githooks");

		body({ root, remote, git, write });
	} finally {
		fs.rmSync(base, { force: true, recursive: true, maxRetries: 10, retryDelay: 200 });
	}
}

function remoteRef(fixture: Fixture, ref: string): string {
	const result = spawnSync("git", ["--git-dir", fixture.remote, "rev-parse", "-q", "--verify", ref], {
		encoding: "utf8",
	});

	return result.status === 0 ? result.stdout.trim() : "";
}

test("a real commit of an unformatted file is refused, then a clean commit succeeds", () => {
	withFixture({}, (fixture) => {
		const headBefore = fixture.git("rev-parse", "HEAD").stdout;
		fixture.write("a.txt", "dirty  \n");
		fixture.git("add", "a.txt");

		const refused = fixture.git("commit", "-q", "-m", "add a");

		assert.notEqual(refused.status, 0);
		assert.match(refused.stderr, /fmt --write .a\.txt./);
		assert.equal(fixture.git("rev-parse", "HEAD").stdout, headBefore);

		fixture.write("a.txt", "clean\n");
		fixture.git("add", "a.txt");

		assert.equal(fixture.git("commit", "-q", "-m", "add a").status, 0);
	});
});

test("a real push carrying a lint error is refused and the remote ref does not move", () => {
	withFixture({}, (fixture) => {
		fixture.git("checkout", "-q", "-b", "feature");
		fixture.write("a.txt", "LINT_ERROR\n");
		fixture.git("add", "a.txt");
		assert.equal(fixture.git("commit", "-q", "-m", "bad").status, 0);

		const refused = fixture.git("push", "-q", "origin", "feature");

		assert.notEqual(refused.status, 0);
		assert.match(refused.stderr, /pre-push: `node lint\.mjs \{files\}` failed/);
		assert.equal(remoteRef(fixture, "refs/heads/feature"), "");

		fixture.write("a.txt", "fine\n");
		fixture.git("add", "a.txt");
		assert.equal(fixture.git("commit", "-q", "-m", "fix").status, 0);

		assert.equal(fixture.git("push", "-q", "origin", "feature").status, 0);
		assert.equal(
			remoteRef(fixture, "refs/heads/feature"),
			fixture.git("rev-parse", "HEAD").stdout.trim()
		);
	});
});

test("with the hook modules absent a commit succeeds with the not-in-this-checkout notice", () => {
	withFixture({ installRuntime: false }, (fixture) => {
		fixture.write("a.txt", "dirty  \n");
		fixture.git("add", "a.txt");

		const result = fixture.git("commit", "-q", "-m", "add a");

		assert.equal(result.status, 0);
		assert.match(result.stderr, /pre-commit: skipped \(PRISM's pre-commit\.mjs is not in this checkout\)/);
	});
});

test("with no gitHooks block a commit succeeds with the skip notice", () => {
	withFixture({ config: { commands: {} } }, (fixture) => {
		fixture.write("a.txt", "dirty  \n");
		fixture.git("add", "a.txt");

		const result = fixture.git("commit", "-q", "-m", "add a");

		assert.equal(result.status, 0);
		assert.match(result.stderr, /pre-commit: skipped \(no gitHooks\.preCommit/);
	});
});

test("the shims carry the ownership marker, LF endings, and mode 100755 in the index", () => {
	for (const shim of ["pre-commit", "pre-push"]) {
		const content = fs.readFileSync(path.join(prismRoot, ".githooks", shim), "utf8");
		assert.match(content, /@prism-hook-runtime/);
		assert.ok(content.startsWith("#!/bin/sh\n"));
		assert.ok(!content.includes("\r"), `${shim} must use LF endings`);

		const staged = spawnSync("git", ["ls-files", "-s", "--", `.githooks/${shim}`], {
			cwd: prismRoot,
			encoding: "utf8",
		});
		assert.match(staged.stdout, /^100755 /, `${shim} must be committed executable`);
	}
});
