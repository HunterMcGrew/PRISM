/**
 * Contract for the pre-commit hook module: it judges the staged copy of each
 * matching file with the configured stdin-to-stdout formatter, refuses on a
 * difference or a parse error, skips with a notice when it cannot run, and
 * never writes to the index or the working tree.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runPreCommit } from "./hooks/git-hooks/pre-commit.mjs";

/** Prints stdin with trailing spaces stripped; exits 2 on a line `PARSE_ERROR`. */
const STUB_FORMATTER = `
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
	if (input.split("\\n").includes("PARSE_ERROR")) {
		process.stderr.write("parse error\\n");
		process.exit(2);
	}
	process.stdout.write(input.replace(/[ \\t]+$/gm, ""));
});
`;

const DEFAULT_PRE_COMMIT = {
	command: "node fmt.mjs {path}",
	globs: ["**/*.txt"],
	fix: "fmt --write {files}",
};

interface Fixture {
	root: string;
	env: NodeJS.ProcessEnv;
	git(...args: string[]): string;
}

/** A process env with every GIT_* variable removed, so an outer git hook cannot leak into a fixture. */
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
	config: Record<string, unknown> | null,
	body: (fixture: Fixture) => void
): void {
	const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "prism-pre-commit-")));
	try {
		const emptyGlobalConfig = path.join(root, "..", `${path.basename(root)}.gitconfig`);
		fs.writeFileSync(emptyGlobalConfig, "");
		const env = cleanEnv(emptyGlobalConfig);
		const git = (...args: string[]): string =>
			execFileSync(
				"git",
				["-c", "user.name=t", "-c", "user.email=t@t", "-c", "core.quotePath=false", ...args],
				{ cwd: root, env, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
			);

		git("init", "-q");
		fs.writeFileSync(path.join(root, "fmt.mjs"), STUB_FORMATTER);
		if (config !== null) {
			fs.mkdirSync(path.join(root, ".ai-skills"));
			fs.writeFileSync(path.join(root, ".ai-skills", "config.json"), JSON.stringify(config));
		}
		git("add", "-A");
		git("commit", "-q", "-m", "init");

		body({ root, env, git });
		fs.rmSync(emptyGlobalConfig, { force: true });
	} finally {
		fs.rmSync(root, { force: true, recursive: true, maxRetries: 10, retryDelay: 200 });
	}
}

function writeFile(root: string, relativePath: string, content: string): void {
	const target = path.join(root, relativePath);
	fs.mkdirSync(path.dirname(target), { recursive: true });
	fs.writeFileSync(target, content);
}

test("a staged unformatted file is refused with the fix command, and nothing is written", () => {
	withFixture({ gitHooks: { preCommit: DEFAULT_PRE_COMMIT } }, ({ root, env, git }) => {
		writeFile(root, "a.txt", "dirty  \n");
		git("add", "a.txt");
		const stagedBefore = git("diff", "--cached");
		const indexBefore = git("ls-files", "-s");

		const result = runPreCommit({ toplevel: root, env });

		assert.equal(result.exitCode, 1);
		assert.match(result.stderr, /pre-commit: these files are not formatted:\n {2}a\.txt\n/);
		assert.match(result.stderr, /Format them, then stage the result:\n {2}fmt --write .a\.txt./);
		assert.equal(git("diff", "--cached"), stagedBefore);
		assert.equal(git("ls-files", "-s"), indexBefore);
		assert.equal(fs.readFileSync(path.join(root, "a.txt"), "utf8"), "dirty  \n");
	});
});

test("a clean staged file passes with no output", () => {
	withFixture({ gitHooks: { preCommit: DEFAULT_PRE_COMMIT } }, ({ root, env, git }) => {
		writeFile(root, "a.txt", "clean\n");
		git("add", "a.txt");

		assert.deepEqual(runPreCommit({ toplevel: root, env }), {
			exitCode: 0,
			stdout: "",
			stderr: "",
		});
	});
});

test("a partially staged file is judged on its staged copy, not the working copy", () => {
	withFixture({ gitHooks: { preCommit: DEFAULT_PRE_COMMIT } }, ({ root, env, git }) => {
		writeFile(root, "a.txt", "clean\n");
		git("add", "a.txt");
		writeFile(root, "a.txt", "dirty  \n");

		assert.equal(runPreCommit({ toplevel: root, env }).exitCode, 0);
	});
});

test("a non-ASCII name is reported unquoted", () => {
	withFixture({ gitHooks: { preCommit: DEFAULT_PRE_COMMIT } }, ({ root, env, git }) => {
		writeFile(root, "café.txt", "dirty  \n");
		git("add", "café.txt");

		const result = runPreCommit({ toplevel: root, env });

		assert.equal(result.exitCode, 1);
		assert.match(result.stderr, /^ {2}café\.txt$/m);
	});
});

test("nested files under two different globs are both caught", () => {
	withFixture(
		{
			gitHooks: {
				preCommit: { ...DEFAULT_PRE_COMMIT, globs: ["src/**/*.txt", "docs/**/*.txt"] },
			},
		},
		({ root, env, git }) => {
			writeFile(root, "src/deep/one.txt", "dirty  \n");
			writeFile(root, "docs/two.txt", "dirty  \n");
			git("add", "-A");

			const result = runPreCommit({ toplevel: root, env });

			assert.equal(result.exitCode, 1);
			assert.match(result.stderr, /^ {2}src\/deep\/one\.txt$/m);
			assert.match(result.stderr, /^ {2}docs\/two\.txt$/m);
		}
	);
});

test("a file outside the globs is not checked", () => {
	withFixture({ gitHooks: { preCommit: DEFAULT_PRE_COMMIT } }, ({ root, env, git }) => {
		writeFile(root, "notes.md", "dirty  \n");
		git("add", "notes.md");

		assert.equal(runPreCommit({ toplevel: root, env }).exitCode, 0);
	});
});

test("a parse error refuses with 'could not format'", () => {
	withFixture({ gitHooks: { preCommit: DEFAULT_PRE_COMMIT } }, ({ root, env, git }) => {
		writeFile(root, "broken.txt", "PARSE_ERROR\n");
		git("add", "broken.txt");

		const result = runPreCommit({ toplevel: root, env });

		assert.equal(result.exitCode, 1);
		assert.match(result.stderr, /pre-commit: could not format broken\.txt:\nparse error/);
	});
});

test("a refusal without a fix command still tells the person to stage the result", () => {
	withFixture(
		{ gitHooks: { preCommit: { command: "node fmt.mjs {path}", globs: ["**/*.txt"] } } },
		({ root, env, git }) => {
			writeFile(root, "a.txt", "dirty  \n");
			git("add", "a.txt");

			assert.match(
				runPreCommit({ toplevel: root, env }).stderr,
				/Format them with your formatter, then stage the result\.\n$/
			);
		}
	);
});

test("a config with no gitHooks block skips with the notice", () => {
	withFixture({ commands: {} }, ({ root, env, git }) => {
		writeFile(root, "a.txt", "dirty  \n");
		git("add", "a.txt");

		assert.deepEqual(runPreCommit({ toplevel: root, env }), {
			exitCode: 0,
			stdout: "",
			stderr: "pre-commit: skipped (no gitHooks.preCommit in .ai-skills/config.json)\n",
		});
	});
});

test("a repo with no config file skips with the notice", () => {
	withFixture(null, ({ root, env }) => {
		assert.match(runPreCommit({ toplevel: root, env }).stderr, /skipped \(no gitHooks\.preCommit/);
	});
});

test("a missing formatter binary skips with the not-found notice", () => {
	const command = "prism-no-such-formatter-xyz {path}";
	withFixture(
		{ gitHooks: { preCommit: { command, globs: ["**/*.txt"] } } },
		({ root, env, git }) => {
			writeFile(root, "a.txt", "dirty  \n");
			git("add", "a.txt");

			assert.deepEqual(runPreCommit({ toplevel: root, env }), {
				exitCode: 0,
				stdout: "",
				stderr: `pre-commit: skipped (\`${command}\` not found)\n`,
			});
		}
	);
});

test("--all refuses a committed unformatted file and passes a clean tree", () => {
	withFixture({ gitHooks: { preCommit: DEFAULT_PRE_COMMIT } }, ({ root, env, git }) => {
		writeFile(root, "a.txt", "dirty  \n");
		git("add", "a.txt");
		git("commit", "-q", "-m", "add a");

		const refused = runPreCommit({ toplevel: root, all: true, env });
		assert.equal(refused.exitCode, 1);
		assert.match(refused.stderr, /^ {2}a\.txt$/m);
		assert.match(refused.stderr, /Format them:\n {2}fmt --write .a\.txt.\n$/);
		assert.doesNotMatch(refused.stderr, /stage the result/);

		writeFile(root, "a.txt", "clean\n");
		assert.equal(runPreCommit({ toplevel: root, all: true, env }).exitCode, 0);
	});
});

test("GIT_INDEX_FILE selects the index the staged copy is read from", () => {
	withFixture({ gitHooks: { preCommit: DEFAULT_PRE_COMMIT } }, ({ root, env, git }) => {
		writeFile(root, "a.txt", "dirty  \n");
		git("add", "a.txt");

		const cleanBlob = execFileSync("git", ["hash-object", "-w", "--stdin"], {
			cwd: root,
			env,
			input: "clean\n",
			encoding: "utf8",
		}).trim();
		const temporaryIndex = path.join(root, ".git", "temporary-index");
		const temporaryEnv = { ...env, GIT_INDEX_FILE: temporaryIndex };
		execFileSync(
			"git",
			["update-index", "--add", "--cacheinfo", `100644,${cleanBlob},a.txt`],
			{ cwd: root, env: temporaryEnv }
		);

		assert.equal(runPreCommit({ toplevel: root, env: temporaryEnv }).exitCode, 0);
		assert.equal(
			runPreCommit({ toplevel: root, env }).exitCode,
			1,
			"the default index still holds the dirty copy"
		);
	});
});
