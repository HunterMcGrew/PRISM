/**
 * Regression suite for the git gates (ADR-0076): the `commit`/`push` segment
 * detector, the once-per-HEAD commit hold, the push gate's deny and fail-open
 * paths, every inert path that must write nothing, the spawned entry point's
 * argv dispatch, and the shared shell splitter's branches that only these
 * gates reach.
 */
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

import { MAX_EMISSION_BYTES } from "./hooks/architect-route.mjs";
import {
	detectGitSegments,
	findConfigRoot,
	runGitGatesArm,
} from "./hooks/git-gates.mjs";
import { HARNESSES } from "./hooks/harnesses.mjs";
import { splitShellSegments } from "./hooks/lib/shell.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const claude = HARNESSES.claude;

/** An env with no kill switch set, so a developer's own shell env cannot silence the arm under test. */
const CLEAN_ENV: NodeJS.ProcessEnv = {};

async function withTempRepo<T>(build: (repoRoot: string) => Promise<T>): Promise<T> {
	const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "prism-git-gates-"));
	try {
		return await build(tempRoot);
	} finally {
		// A lint child the push gate killed on timeout can still hold the
		// directory open for a moment on Windows, so the removal retries.
		await fs.rm(tempRoot, { force: true, recursive: true, maxRetries: 10, retryDelay: 200 });
	}
}

/** A path spelled the way a shell command spells one: `/` separators on every platform. */
function toShellPath(filePath: string): string {
	return filePath.split(path.sep).join("/");
}

function git(root: string, ...args: string[]): string {
	return execFileSync(
		"git",
		["-c", "user.name=t", "-c", "user.email=t@t", ...args],
		{ cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
	).trim();
}

/**
 * A git repo with one commit and a config carrying the given `hooks` and
 * `commands` blocks. `initialCommit: false` leaves the repo unborn.
 */
async function seedGitRepo(
	root: string,
	hooks: Record<string, unknown> | undefined,
	commands: Record<string, string> = {},
	options: { initialCommit?: boolean } = {}
): Promise<void> {
	git(root, "init", "-q");
	if (options.initialCommit !== false) {
		git(root, "commit", "-q", "--allow-empty", "-m", "init");
	}

	const config: Record<string, unknown> = { commands };
	if (hooks !== undefined) {
		config.hooks = hooks;
	}
	await fs.mkdir(path.join(root, ".ai-skills"), { recursive: true });
	await fs.writeFile(
		path.join(root, ".ai-skills", "config.json"),
		`${JSON.stringify(config, null, "\t")}\n`,
		"utf8"
	);
}

function shellPayload(
	root: string,
	command: string,
	overrides: Record<string, unknown> = {}
): string {
	return JSON.stringify({
		session_id: "s1",
		cwd: root,
		tool_name: "Bash",
		tool_input: { command },
		...overrides,
	});
}

/** The deny envelope's reason text, or `null` when the call was allowed silently. */
function denyReason(result: string | null): string | null {
	if (result === null) {
		return null;
	}
	const parsed = JSON.parse(result);
	assert.equal(parsed.hookSpecificOutput.hookEventName, "PreToolUse");
	assert.equal(parsed.hookSpecificOutput.permissionDecision, "deny");
	return parsed.hookSpecificOutput.permissionDecisionReason;
}

/** The allow envelope's reason text — asserts the envelope is an explicit allow, not a deny or a silence. */
function allowReason(result: string | null): string {
	assert.ok(result !== null, "an explicit allow envelope is written, not silence");
	const parsed = JSON.parse(result);
	assert.equal(parsed.hookSpecificOutput.hookEventName, "PreToolUse");
	assert.equal(parsed.hookSpecificOutput.permissionDecision, "allow");
	return parsed.hookSpecificOutput.permissionDecisionReason;
}

/** Runs `body` with `process.stderr.write` captured, returning what was written. */
async function captureStderr(body: () => Promise<void>): Promise<string> {
	const original = process.stderr.write;
	let captured = "";
	process.stderr.write = ((chunk: string | Uint8Array) => {
		captured += String(chunk);
		return true;
	}) as typeof process.stderr.write;
	try {
		await body();
	} finally {
		process.stderr.write = original;
	}
	return captured;
}

const HEREDOC_COMMIT = `git commit -m "$(cat <<'EOF'
PRISM-1: Subject

git push
EOF
)"`;

// --- detectGitSegments ---

test("detectGitSegments: recognizes commit and push in every spelling the shipping flow uses, and nothing else", () => {
	const rows: Array<[string, string[]]> = [
		['git commit -m "x"', ["commit"]],
		["git commit --amend --no-edit", ["commit"]],
		[HEREDOC_COMMIT, ["commit"]],
		["MSYS_NO_PATHCONV=1 git commit -m x", ["commit"]],
		["git -C sub commit -m x", ["commit"]],
		["git add -A && git commit -m x && git push -q", ["commit", "push"]],
		["git push -u origin HEAD:refs/heads/x", ["push"]],
		["git push --delete origin x", []],
		["gh pr create --draft", []],
		["git merge origin/main", []],
		["git log --oneline", []],
		['echo "git commit"', []],
		["tee f <<'E'\ngit push\nE", []],
	];

	for (const [command, expected] of rows) {
		assert.deepEqual(
			detectGitSegments(command).map((segment) => segment.subcommand),
			expected,
			command
		);
	}
});

test("detectGitSegments: carries every -C directory a segment was given, in order", () => {
	assert.deepEqual(detectGitSegments("git -C sub -C deeper commit -m x"), [
		{ subcommand: "commit", directories: ["sub", "deeper"] },
	]);
	assert.deepEqual(detectGitSegments('git -C "a dir" push'), [
		{ subcommand: "push", directories: ["a dir"] },
	]);
});

test("detectGitSegments: a non-string or empty command yields nothing", () => {
	assert.deepEqual(detectGitSegments(undefined), []);
	assert.deepEqual(detectGitSegments("   "), []);
});

// --- commit gate ---

test("commit gate: holds the first commit on a HEAD once, then lets the retry and an amend through", async () => {
	await withTempRepo(async (root) => {
		await seedGitRepo(root, { commitCleanupPass: true });
		const commit = shellPayload(root, 'git commit -m "x"');

		const first = denyReason(await runGitGatesArm("claude", claude, commit, CLEAN_ENV));
		assert.ok(first, "the first commit on this HEAD is held");
		assert.match(first, /cat \.prism\/references\/cleanup-pass\.md/);
		assert.match(first, /git diff --cached/);

		const statePath = path.join(root, ".prism", "git-gates-state.s1.json");
		const state = JSON.parse(await fs.readFile(statePath, "utf8"));
		assert.deepEqual(
			state.cleanupPassSeen,
			[git(root, "rev-parse", "HEAD")],
			"the state file lists the HEAD sha the hold fired on"
		);

		assert.equal(
			await runGitGatesArm("claude", claude, commit, CLEAN_ENV),
			null,
			"the retry of the same command goes through"
		);
		assert.equal(
			await runGitGatesArm(
				"claude",
				claude,
				shellPayload(root, "git commit --amend --no-edit"),
				CLEAN_ENV
			),
			null,
			"an amend on a seen HEAD is not held again"
		);

		git(root, "commit", "-q", "--allow-empty", "-m", "next");
		assert.ok(
			denyReason(await runGitGatesArm("claude", claude, commit, CLEAN_ENV)),
			"a new HEAD is held once more"
		);
	});
});

test("commit gate: a repo with no commits is gated once under the unborn key", async () => {
	await withTempRepo(async (root) => {
		await seedGitRepo(root, { commitCleanupPass: true }, {}, { initialCommit: false });
		const commit = shellPayload(root, "git commit -m first");

		assert.ok(denyReason(await runGitGatesArm("claude", claude, commit, CLEAN_ENV)));
		const state = JSON.parse(
			await fs.readFile(path.join(root, ".prism", "git-gates-state.s1.json"), "utf8")
		);
		assert.deepEqual(state.cleanupPassSeen, ["unborn"]);
		assert.equal(await runGitGatesArm("claude", claude, commit, CLEAN_ENV), null);
	});
});

test("commit gate: a -C commit into a separate nested repo is keyed on that repo's HEAD, not the config root's", async () => {
	await withTempRepo(async (root) => {
		await seedGitRepo(root, { commitCleanupPass: true });
		const nested = path.join(root, "sub");
		await fs.mkdir(nested, { recursive: true });
		git(nested, "init", "-q");
		git(nested, "commit", "-q", "--allow-empty", "-m", "nested init");
		const nestedCommit = shellPayload(root, "git -C sub commit -m x");
		const rootCommit = shellPayload(root, "git commit -m x");

		assert.ok(denyReason(await runGitGatesArm("claude", claude, nestedCommit, CLEAN_ENV)));
		assert.equal(await runGitGatesArm("claude", claude, nestedCommit, CLEAN_ENV), null);
		assert.ok(
			denyReason(await runGitGatesArm("claude", claude, rootCommit, CLEAN_ENV)),
			"the root repo's own HEAD is still unseen"
		);

		git(nested, "commit", "-q", "--allow-empty", "-m", "nested next");
		assert.ok(
			denyReason(await runGitGatesArm("claude", claude, nestedCommit, CLEAN_ENV)),
			"a new HEAD in the nested repo is held again"
		);
	});
});

test("commit gate: a commit-and-push one-liner surfaces the commit hold first", async () => {
	await withTempRepo(async (root) => {
		await seedGitRepo(
			root,
			{ commitCleanupPass: true, pushVerification: true },
			{ lint: 'node -e "process.exit(3)"' }
		);
		const both = shellPayload(root, "git commit -m x && git push -q");

		assert.match(
			denyReason(await runGitGatesArm("claude", claude, both, CLEAN_ENV)) ?? "",
			/Cleanup pass/,
			"the commit hold is reported, not the push failure"
		);
		assert.match(
			denyReason(await runGitGatesArm("claude", claude, both, CLEAN_ENV)) ?? "",
			/exited 3/,
			"the retry evaluates the push"
		);
	});
});

// --- push gate ---

test("push gate: a failing lint denies with the exit status and the output tail", async () => {
	await withTempRepo(async (root) => {
		await seedGitRepo(
			root,
			{ pushVerification: true },
			{ lint: "node -e \"console.log('boom'); process.exit(3)\"" }
		);

		const reason = denyReason(
			await runGitGatesArm("claude", claude, shellPayload(root, "git push -q"), CLEAN_ENV)
		);
		assert.ok(reason);
		assert.match(reason, /exited 3/);
		assert.match(reason, /boom/);
	});
});

test("push gate: passing commands allow silently, an unset slot is skipped, and no commands at all is inert", async () => {
	await withTempRepo(async (root) => {
		await seedGitRepo(root, { pushVerification: true }, { lint: "node -e \"console.log('ok')\"" });
		const push = shellPayload(root, "git push");
		assert.equal(await runGitGatesArm("claude", claude, push, CLEAN_ENV), null);

		await seedGitRepo(root, { pushVerification: true }, { lint: "node -e 0", format: "" });
		assert.equal(await runGitGatesArm("claude", claude, push, CLEAN_ENV), null);

		await seedGitRepo(root, { pushVerification: true }, {});
		assert.equal(await runGitGatesArm("claude", claude, push, CLEAN_ENV), null);
	});
});

test("push gate: format runs after lint, so a failing format is what denies once lint passes", async () => {
	await withTempRepo(async (root) => {
		await seedGitRepo(
			root,
			{ pushVerification: true },
			{ lint: "node -e 0", format: 'node -e "process.exit(5)"' }
		);

		assert.match(
			denyReason(
				await runGitGatesArm("claude", claude, shellPayload(root, "git push"), CLEAN_ENV)
			) ?? "",
			/exited 5/
		);
	});
});

test("push gate: a command over its budget allows with an announced timeout on stdout and stderr", async () => {
	await withTempRepo(async (root) => {
		await seedGitRepo(
			root,
			{ pushVerification: true, pushVerificationTimeoutMs: 100 },
			{ lint: 'node -e "setTimeout(()=>{},5000)"' }
		);

		let result: string | null = null;
		const stderr = await captureStderr(async () => {
			result = await runGitGatesArm("claude", claude, shellPayload(root, "git push"), CLEAN_ENV);
		});
		assert.match(allowReason(result), /timed out/);
		assert.match(stderr, /timed out/);
	});
});

test("push gate: a command that does not exist allows with an announcement rather than holding every push", async () => {
	await withTempRepo(async (root) => {
		await seedGitRepo(root, { pushVerification: true }, { lint: "definitely-not-a-binary-xyz" });

		let result: string | null = null;
		await captureStderr(async () => {
			result = await runGitGatesArm("claude", claude, shellPayload(root, "git push"), CLEAN_ENV);
		});
		assert.match(allowReason(result), /could not start/);
	});
});

test("push gate: the output tail is bounded by MAX_EMISSION_BYTES", async () => {
	await withTempRepo(async (root) => {
		await seedGitRepo(
			root,
			{ pushVerification: true },
			{ lint: 'node -e "process.stdout.write(\'x\'.repeat(20000)+\'\\n\'); process.exit(2)"' }
		);

		const reason = denyReason(
			await runGitGatesArm("claude", claude, shellPayload(root, "git push"), CLEAN_ENV)
		);
		assert.ok(reason);
		assert.match(reason, /exited 2/);
		const [prefix] = reason.split("--- last lines of output ---");
		assert.ok(
			Buffer.byteLength(reason, "utf8") <= MAX_EMISSION_BYTES + Buffer.byteLength(prefix, "utf8") + 64,
			`reason is ${Buffer.byteLength(reason, "utf8")} bytes`
		);
	});
});

// --- inert paths ---

test("inert paths: no config, no hooks block, both flags off, a foreign tool, and a non-shell tool all write nothing", async () => {
	await withTempRepo(async (root) => {
		git(root, "init", "-q");
		git(root, "commit", "-q", "--allow-empty", "-m", "init");
		const commit = shellPayload(root, "git commit -m x");
		assert.equal(await runGitGatesArm("claude", claude, commit, CLEAN_ENV), null, "no config");

		await seedGitRepo(root, undefined);
		assert.equal(await runGitGatesArm("claude", claude, commit, CLEAN_ENV), null, "no hooks block");

		await seedGitRepo(root, { commitCleanupPass: false, pushVerification: false });
		assert.equal(await runGitGatesArm("claude", claude, commit, CLEAN_ENV), null, "both off");

		await seedGitRepo(root, { commitCleanupPass: true });
		assert.equal(
			await runGitGatesArm("cursor", HARNESSES.cursor, commit, CLEAN_ENV),
			null,
			"a cursor payload naming Bash is not a listed shell tool on that harness"
		);
		assert.equal(
			await runGitGatesArm("claude", claude, shellPayload(root, "git commit -m x", { tool_name: "Write" }), CLEAN_ENV),
			null,
			"a non-shell tool"
		);
		assert.equal(
			await runGitGatesArm("claude", claude, shellPayload(root, "git commit -m x", { session_id: undefined }), CLEAN_ENV),
			null,
			"no scope id"
		);
	});
});

test("inert paths: either kill switch silences the gate", async () => {
	await withTempRepo(async (root) => {
		await seedGitRepo(root, { commitCleanupPass: true });
		const commit = shellPayload(root, "git commit -m x");

		assert.equal(await runGitGatesArm("claude", claude, commit, { PRISM_HOOK_DISABLE: "1" }), null);
		assert.equal(await runGitGatesArm("claude", claude, commit, { PRISM_HOOK_DENY_DISABLE: "1" }), null);
		assert.ok(
			denyReason(await runGitGatesArm("claude", claude, commit, CLEAN_ENV)),
			"the same payload is held once the switches are off — the switch was what silenced it"
		);
	});
});

test("inert paths: a config that is not JSON writes nothing and says so once on stderr", async () => {
	await withTempRepo(async (root) => {
		await seedGitRepo(root, { commitCleanupPass: true });
		await fs.writeFile(path.join(root, ".ai-skills", "config.json"), "{ not json\n", "utf8");

		let result: string | null = "unset";
		const stderr = await captureStderr(async () => {
			result = await runGitGatesArm("claude", claude, shellPayload(root, "git commit -m x"), CLEAN_ENV);
		});
		assert.equal(result, null);
		assert.equal(stderr.trim().split("\n").length, 1);
		assert.match(stderr, /not valid JSON — gates off/);
	});
});

test("findConfigRoot: walks up from a subdirectory to the directory holding .ai-skills/config.json", async () => {
	await withTempRepo(async (root) => {
		await seedGitRepo(root, { commitCleanupPass: true });
		const nested = path.join(root, "packages", "app");
		await fs.mkdir(nested, { recursive: true });

		assert.equal(await findConfigRoot(nested), root);
		assert.equal(await findConfigRoot(path.join(os.tmpdir(), "prism-no-config-here")), null);
	});
});

// --- spawned entry point ---

test("the spawned entry point dispatches only on --event=PreToolUse", async () => {
	await withTempRepo(async (root) => {
		await seedGitRepo(root, { commitCleanupPass: true });
		const entryPoint = path.join(scriptDirectory, "hooks", "git-gates.mjs");
		const input = shellPayload(toShellPath(root), 'git commit -m "x"');
		const env = { ...process.env, PRISM_HOOK_DISABLE: "", PRISM_HOOK_DENY_DISABLE: "" };

		const denied = spawnSync("node", [entryPoint, "--tool=claude", "--event=PreToolUse"], {
			input,
			encoding: "utf8",
			env,
		});
		assert.equal(denied.status, 0, denied.stderr);
		assert.match(denyReason(denied.stdout) ?? "", /Cleanup pass/);

		const announceOnly = spawnSync("node", [entryPoint, "--tool=claude"], {
			input,
			encoding: "utf8",
			env,
		});
		assert.equal(announceOnly.status, 0, announceOnly.stderr);
		assert.equal(announceOnly.stdout, "", "without the event flag nothing is written");
	});
});

// --- lib/shell.mjs ---

test("splitShellSegments: cuts on every separator, skips heredoc bodies, and keeps a continuation in one segment", () => {
	assert.deepEqual(splitShellSegments("a && b"), [["a"], ["b"]]);
	assert.deepEqual(splitShellSegments("a | b"), [["a"], ["b"]]);
	assert.deepEqual(splitShellSegments("a; b"), [["a"], ["b"]]);
	assert.deepEqual(
		splitShellSegments("tee f <<'E'\nline one\nE\necho after"),
		[["tee", "f"], ["echo", "after"]],
		"a quoted delimiter's body is skipped whole"
	);
	assert.deepEqual(
		splitShellSegments("cat <<-E\n\tbody\n\tE\necho x"),
		[["cat"], ["echo", "x"]],
		"a <<- body with a tab-indented delimiter is skipped"
	);
	assert.equal(
		splitShellSegments("git commit \\\n-m x").length,
		1,
		"a backslash-newline continuation does not cut the segment"
	);
});
