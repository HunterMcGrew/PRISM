/**
 * Pins which commits and pushes the git gates see: one the shell runs inside
 * a `bash -c` or `sh -c` string, under `timeout`, in a subshell, or before a
 * CRLF line break is held, and one that runs in a container is not. The test
 * spawns the entry point and imports nothing from the runtime.
 */
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test, { after } from "node:test";
import assert from "node:assert/strict";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const entryPoint = path.join(scriptDirectory, "hooks", "git-gates.mjs");

const fixtureRoots: string[] = [];

after(async () => {
	for (const root of fixtureRoots) {
		await fs.rm(root, { force: true, recursive: true, maxRetries: 10, retryDelay: 200 });
	}
});

/** A git repo holding one commit and an `.ai-skills/config.json` with the given config. */
async function makeFixtureRepo(config: Record<string, unknown>): Promise<string> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), "prism-git-gates-shell-string-"));
	fixtureRoots.push(root);

	const git = (...args: string[]) =>
		execFileSync(
			"git",
			["-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", ...args],
			{ cwd: root, stdio: "ignore" }
		);
	git("init", "-q");
	git("commit", "-q", "--allow-empty", "-m", "init");

	await fs.mkdir(path.join(root, ".ai-skills"), { recursive: true });
	await fs.writeFile(
		path.join(root, ".ai-skills", "config.json"),
		`${JSON.stringify(config, null, "\t")}\n`,
		"utf8"
	);

	return root;
}

/** Runs the entry point on a Bash tool call, with both kill switches removed from the env. */
function runGate(root: string, command: string): string {
	const env = { ...process.env };
	delete env.PRISM_HOOK_DISABLE;
	delete env.PRISM_HOOK_DENY_DISABLE;

	const result = spawnSync(process.execPath, [entryPoint, "--tool=claude", "--event=PreToolUse"], {
		input: JSON.stringify({
			session_id: "s1",
			cwd: root,
			hook_event_name: "PreToolUse",
			tool_name: "Bash",
			tool_input: { command },
		}),
		encoding: "utf8",
		env,
	});
	assert.equal(result.status, 0, result.stderr);

	return result.stdout;
}

test("the commit hold fires on a commit inside bash -c", async () => {
	const root = await makeFixtureRepo({ hooks: { commitCleanupPass: true } });
	const stdout = runGate(root, "bash -c 'git commit -m x'");

	const output = JSON.parse(stdout).hookSpecificOutput;
	assert.equal(output.permissionDecision, "deny");
	assert.match(output.permissionDecisionReason, /cleanup-pass\.md/);
});

test("the push gate reads a push inside sh -c", async () => {
	const root = await makeFixtureRepo({
		hooks: { pushVerification: true },
		commands: { lint: 'node -e "process.exit(3)"' },
	});
	const stdout = runGate(root, 'sh -c "git push -q"');

	const output = JSON.parse(stdout).hookSpecificOutput;
	assert.equal(output.permissionDecision, "deny");
	assert.match(output.permissionDecisionReason, /exited 3/);
});

test("text that only mentions a commit stays silent", async () => {
	const root = await makeFixtureRepo({ hooks: { commitCleanupPass: true } });

	assert.equal(runGate(root, `bash -c 'echo "git commit"'`), "");
});

test("the commit hold fires on a commit under timeout", async () => {
	const root = await makeFixtureRepo({ hooks: { commitCleanupPass: true } });
	const stdout = runGate(root, "timeout 5 git commit -m x");

	assert.equal(JSON.parse(stdout).hookSpecificOutput.permissionDecision, "deny");
});

test("the commit hold fires on a commit inside a subshell", async () => {
	const root = await makeFixtureRepo({ hooks: { commitCleanupPass: true } });
	const stdout = runGate(root, "(git commit -m x)");

	assert.equal(JSON.parse(stdout).hookSpecificOutput.permissionDecision, "deny");
});

test("the commit hold fires on a commit ended by a CRLF line break", async () => {
	const root = await makeFixtureRepo({ hooks: { commitCleanupPass: true } });
	const stdout = runGate(root, "git commit -m x\r\n");

	assert.equal(JSON.parse(stdout).hookSpecificOutput.permissionDecision, "deny");
});

test("a commit run in a container stays silent", async () => {
	const root = await makeFixtureRepo({ hooks: { commitCleanupPass: true } });

	assert.equal(runGate(root, "docker exec app git commit -m x"), "");
});
