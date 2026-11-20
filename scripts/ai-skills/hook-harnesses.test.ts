import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
	HARNESSES,
	readShellCall,
	resolveListedToolKind,
	writeStdout,
} from "./hooks/harnesses.mjs";
import { tokenize } from "./hooks/lib/tokenize.mjs";

const claude = HARNESSES.claude;
const codex = HARNESSES.codex;
const cursor = HARNESSES.cursor;

test("an Agent and a Task call read as a Claude dispatch", () => {
	for (const tool_name of ["Agent", "Task"]) {
		const payload = {
			tool_name,
			tool_input: { subagent_type: "prism-spec", prompt: "build T1" },
		};

		assert.equal(resolveListedToolKind(claude, tool_name), "dispatch");
		assert.deepEqual(claude.subagentDispatch(payload), {
			type: "prism-spec",
			prompt: "build T1",
		});
	}
});

test("an Edit call is not a Claude dispatch", () => {
	const payload = { tool_name: "Edit", tool_input: { file_path: "a.md" } };

	assert.equal(claude.subagentDispatch(payload), null);
});

test("a Codex SubagentStart reads as a dispatch and a PreToolUse reads null", () => {
	assert.deepEqual(
		codex.subagentDispatch({
			hook_event_name: "SubagentStart",
			agent_type: "prism-verify",
			prompt: "run the checks",
		}),
		{ type: "prism-verify", prompt: "run the checks" }
	);
	assert.equal(
		codex.subagentDispatch({
			hook_event_name: "PreToolUse",
			tool_name: "Bash",
			tool_input: { command: "ls" },
		}),
		null
	);
});

test("Cursor reads no dispatch", () => {
	assert.equal(
		cursor.subagentDispatch({ tool_name: "Agent", tool_input: {} }),
		null
	);
});

test("subagentStop reads the agent type, last message, and active flag", () => {
	const payload = {
		hook_event_name: "SubagentStop",
		agent_type: "prism-pr-review",
		last_assistant_message: "done\nprism-pr: 12",
		stop_hook_active: true,
	};
	const expected = {
		agentType: "prism-pr-review",
		message: "done\nprism-pr: 12",
		active: true,
	};

	assert.deepEqual(claude.subagentStop(payload), expected);
	assert.deepEqual(codex.subagentStop(payload), expected);
	assert.equal(cursor.subagentStop(payload), null);
});

test("emitBlockStop gives the block shape on Claude and Codex and null on Cursor", () => {
	assert.deepEqual(claude.emitBlockStop("reconcile is unclean"), {
		decision: "block",
		reason: "reconcile is unclean",
	});
	assert.deepEqual(codex.emitBlockStop("reconcile is unclean"), {
		decision: "block",
		reason: "reconcile is unclean",
	});
	assert.equal(cursor.emitBlockStop("reconcile is unclean"), null);
});

test("readShellCall reads a Claude Bash call", () => {
	assert.deepEqual(
		readShellCall("claude", {
			tool_name: "Bash",
			cwd: "/repo",
			tool_input: { command: "git status" },
		}),
		{ command: "git status", cwd: "/repo" }
	);
});

test("readShellCall reads a PowerShell path with its backslashes as slashes", () => {
	const call = readShellCall("claude", {
		tool_name: "PowerShell",
		cwd: "C:\\repo",
		tool_input: { command: "Get-Content C:\\a\\b" },
	});

	assert.equal(call?.command, "Get-Content C:/a/b");
	assert.equal(call?.cwd, "C:\\repo");
});

test("readShellCall quotes a Codex argv array so tokenize reads the words back", () => {
	const call = readShellCall("codex", {
		tool_name: "Bash",
		cwd: "/repo",
		tool_input: { command: ["git", "commit", "-m", "a b"] as unknown as string },
	});

	assert.ok(call);
	assert.deepEqual(tokenize(call.command).tokens, [
		"git",
		"commit",
		"-m",
		"a b",
	]);
});

test("readShellCall returns null for a Read call, a missing command, and an unknown host", () => {
	assert.equal(
		readShellCall("claude", {
			tool_name: "Read",
			tool_input: { file_path: "/repo/a.md" },
		}),
		null
	);
	assert.equal(
		readShellCall("claude", { tool_name: "Bash", tool_input: {} }),
		null
	);
	assert.equal(
		readShellCall("nowhere", {
			tool_name: "Bash",
			tool_input: { command: "ls" },
		}),
		null
	);
});

test("readShellCall reads a null cwd when the payload carries none", () => {
	assert.deepEqual(
		readShellCall("claude", {
			tool_name: "Bash",
			tool_input: { command: "ls" },
		}),
		{ command: "ls", cwd: null }
	);
});

test("writeStdout writes a string as is and an object as JSON", () => {
	const chunks: string[] = [];
	const original = process.stdout.write.bind(process.stdout);

	process.stdout.write = ((chunk: string) => {
		chunks.push(String(chunk));
		return true;
	}) as typeof process.stdout.write;

	try {
		writeStdout("plain");
		writeStdout({ a: 1 });
	} finally {
		process.stdout.write = original;
	}

	assert.deepEqual(chunks, ["plain", '{"a":1}']);
});

test("writeStdout leaves a hook alive when the host has already closed stdout", async () => {
	const harnesses = fileURLToPath(new URL("./hooks/harnesses.mjs", import.meta.url));
	// The write waits until the parent has closed its end of the pipe, and is
	// large enough that it cannot finish before the close is noticed.
	const script = `
		import { writeStdout } from ${JSON.stringify(`file://${harnesses}`)};
		setTimeout(() => writeStdout("x".repeat(4 * 1024 * 1024)), 300);
	`;

	const child = spawn(process.execPath, ["--input-type=module", "-e", script], {
		stdio: ["ignore", "pipe", "pipe"],
	});
	child.stdout.destroy();
	let stderr = "";
	child.stderr.on("data", (chunk) => {
		stderr += chunk;
	});
	const code = await new Promise((resolve) => child.on("close", resolve));

	assert.equal(code, 0, stderr);
	assert.doesNotMatch(stderr, /EPIPE/);
});
