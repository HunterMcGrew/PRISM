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
import { resolveArchitectDoc } from "./architect-route";

interface ClaudePostToolUseInput {
	session_id?: string;
	cwd?: string;
	tool_name?: string;
	tool_input?: {
		file_path?: string;
	};
}

/**
 * The kill switch checked before stdin is even parsed — the first statement
 * in this module's entry path. `PRISM_HOOK_DISABLE=1` makes the hook stay
 * registered and fire, but produce no output and exit 0, so the A/B harness's
 * control arm (task 9) can disable the hook's behavior without editing
 * `.claude/settings.json` or the manifest — varying exactly one thing.
 */
async function main(): Promise<void> {
	if (process.env.PRISM_HOOK_DISABLE === "1") {
		process.exit(0);
	}

	let rawStdin = "";
	try {
		rawStdin = await readStdin();
	} catch {
		process.exit(0);
		return;
	}

	try {
		const input = JSON.parse(rawStdin) as ClaudePostToolUseInput;
		const filePath = input.tool_input?.file_path;
		const sessionId = input.session_id;
		const repoRoot = input.cwd ?? process.cwd();

		if (!filePath || !sessionId) {
			process.exit(0);
			return;
		}

		const body = await resolveArchitectDoc(repoRoot, filePath, sessionId);
		if (body === null) {
			process.exit(0);
			return;
		}

		process.stdout.write(
			JSON.stringify({
				hookSpecificOutput: {
					hookEventName: "PostToolUse",
					additionalContext: body,
				},
			})
		);
		process.exit(0);
	} catch (error) {
		process.stderr.write(
			`architect-route hook failed: ${error instanceof Error ? error.message : String(error)}\n`
		);
		process.exit(0);
	}
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

main();
