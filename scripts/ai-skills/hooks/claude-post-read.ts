#!/usr/bin/env tsx
/**
 * Claude Code adapter for the architect-context read hook (plan
 * `context-delivery-mechanism.md` task 2). Registered as a `PostToolUse`
 * hook matched on `Read` in `.claude/settings.json`.
 *
 * Reads the hook's stdin JSON, extracts the read path (`tool_input.file_path`)
 * and session id (`session_id`), calls the host-agnostic resolver in
 * `architect-route.ts`, and — when it returns a body — writes Claude Code's
 * injection shape to stdout: `{"hookSpecificOutput": {"hookEventName":
 * "PostToolUse", "additionalContext": "..."}}`. When the resolver returns
 * `null`, or when anything about the hook invocation fails, this process
 * writes nothing and exits 0 — a `Read` hook must never block or fail the
 * read it observed.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import { findRepoRoot, resolveArchitectDoc } from "./architect-route";

interface ClaudePostToolUseInput {
	session_id?: string;
	cwd?: string;
	tool_name?: string;
	tool_input?: {
		file_path?: string;
	};
}

/**
 * Computes the adapter's result for one already-read stdin payload — the
 * JSON string to write to stdout, or `null` when nothing should be written
 * (kill switch active, missing `file_path`/`session_id`, no manifest match,
 * or a caught failure, logged to stderr as a side effect).
 *
 * Deliberately does no process-level I/O beyond that stderr log: no
 * `process.stdout.write`, no `process.exitCode`. `main()` below is the only
 * caller that touches either, which is what makes this function safe to
 * call directly from a test — no global mutable process state to restore
 * around the call, and nothing here can flip `process.exitCode` back to 0
 * over a genuine failure elsewhere in the same test process.
 */
export async function runAdapter(rawStdin: string): Promise<string | null> {
	if (process.env.PRISM_HOOK_DISABLE === "1") {
		return null;
	}

	try {
		const input = JSON.parse(rawStdin) as ClaudePostToolUseInput;
		const filePath = input.tool_input?.file_path;
		const sessionId = input.session_id;
		const cwd = input.cwd ?? process.cwd();
		const repoRoot = (await findRepoRoot(cwd)) ?? cwd;

		if (!filePath || !sessionId) {
			return null;
		}

		const body = await resolveArchitectDoc(repoRoot, filePath, sessionId);
		if (body === null) {
			return null;
		}

		return JSON.stringify({
			hookSpecificOutput: {
				hookEventName: "PostToolUse",
				additionalContext: body,
			},
		});
	} catch (error) {
		process.stderr.write(
			`architect-route hook failed: ${error instanceof Error ? error.message : String(error)}\n`
		);
		return null;
	}
}

/**
 * The kill switch checked before stdin is even parsed — the first statement
 * in this module's entry path. `PRISM_HOOK_DISABLE=1` makes the hook stay
 * registered and fire, but produce no output and exit 0, so the A/B harness's
 * control arm (task 9) can disable the hook's behavior without editing
 * `.claude/settings.json` or the manifest — varying exactly one thing.
 *
 * Every path sets `process.exitCode` rather than calling `process.exit()`
 * directly and returns — `process.exit()` does not guarantee pending
 * asynchronous `stdout` writes are flushed before the process tears down,
 * and this adapter's payload can run to tens of KB. Setting `exitCode` and
 * returning lets Node drain the write queue before exiting on its own.
 */
async function main(): Promise<void> {
	if (process.env.PRISM_HOOK_DISABLE === "1") {
		process.exitCode = 0;
		return;
	}

	let rawStdin = "";
	try {
		rawStdin = await readStdin();
	} catch {
		process.exitCode = 0;
		return;
	}

	const output = await runAdapter(rawStdin);
	if (output !== null) {
		process.stdout.write(output);
	}
	process.exitCode = 0;
}

function readStdin(): Promise<string> {
	return new Promise((resolve, reject) => {
		let data = "";
		process.stdin.setEncoding("utf8");
		process.stdin.on("data", (chunk) => {
			data += chunk;
		});
		process.stdin.on("end", () => resolve(data));
		process.stdin.on("error", reject);
	});
}

/**
 * Only runs `main()` — which blocks on stdin — when this file is the process
 * entry point. Without this guard, `claude-post-read.test.ts` importing
 * `runAdapter` from this module also runs `main()` at import time, which
 * waits on a `process.stdin` that never ends in a test process — hanging
 * the whole suite rather than failing a single test.
 */
const isEntryPoint =
	process.argv[1] !== undefined &&
	fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isEntryPoint) {
	main();
}
