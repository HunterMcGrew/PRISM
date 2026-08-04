#!/usr/bin/env tsx
/**
 * Multi-host adapter for the architect-context read hook (plan
 * `thr-2171-port`, generalizing the single Claude Code adapter this file
 * replaces into a `--tool=` dispatch over `HARNESSES`).
 *
 * Reads the hook's stdin JSON, looks up the harness named by the `--tool=`
 * argv flag, extracts the read path and session id through that harness's
 * own accessors, calls the host-agnostic resolver in `architect-route.ts`,
 * and writes that harness's own envelope shape to stdout when it returns a
 * nag. An unrecognized `--tool` value, a payload missing its file path or
 * session id, a payload that belongs to a different host's registration
 * (see `isForeignPayload`), or any caught failure all write nothing and
 * exit 0 — a `PostToolUse` hook must never block or fail the tool call it
 * observed.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import { findRepoRoot, resolveArchitectNag } from "./architect-route";
import { HARNESSES, type HarnessSpec, type HookPayload } from "./harnesses";

/**
 * Cursor's own hook-config event keys — camelCase, unlike Claude Code and
 * Codex's PascalCase. Thrive's live Cursor probe found that Cursor also
 * executes `.claude/settings.json`'s hooks behind a per-user "include
 * third-party configs" setting, so without the guard below every Cursor
 * tool call would run this hook twice: once through `.cursor/hooks.json`'s
 * own registration and once through Claude's, crediting into two different
 * state files.
 */
const CURSOR_EVENT_NAMES = new Set([
	"preToolUse",
	"postToolUse",
	"sessionStart",
	"sessionEnd",
]);

/**
 * True when a payload fired through the `claude` registration but carries a
 * Cursor event name — the signature of Cursor's third-party-config import
 * re-running this hook through `.claude/settings.json` on top of its own
 * `.cursor/hooks.json` registration. Any other `--tool` value proceeds
 * normally; only the `claude` row can receive a foreign payload this way.
 */
function isForeignPayload(tool: string, payload: HookPayload): boolean {
	return (
		tool === "claude" &&
		typeof payload.hook_event_name === "string" &&
		CURSOR_EVENT_NAMES.has(payload.hook_event_name)
	);
}

/**
 * Resolves a harness's own "nothing to report" output — `null` for Claude
 * and Codex (write nothing), or Cursor's explicit empty envelope, whose
 * runtime is expected to want a response even on a no-op (see
 * `HARNESSES.cursor.emitNone`).
 */
function emitNoneOutput(spec: HarnessSpec): string | null {
	const none = spec.emitNone();
	return none === null ? null : JSON.stringify(none);
}

/**
 * Computes one harness's result for an already-read stdin payload — the
 * JSON string to write to stdout, or `null` when nothing should be written
 * (kill switch active, a foreign payload, a missing file path or session
 * id, no manifest match, or a caught failure, logged to stderr as a side
 * effect).
 *
 * Deliberately does no process-level I/O beyond that stderr log: no
 * `process.stdout.write`, no `process.exitCode`. `main()` below is the only
 * caller that touches either, which is what makes this function safe to
 * call directly from a test — no global mutable process state to restore
 * around the call.
 */
export async function runAdapter(
	tool: string,
	spec: HarnessSpec,
	rawStdin: string
): Promise<string | null> {
	if (process.env.PRISM_HOOK_DISABLE === "1") {
		return null;
	}

	try {
		const payload = JSON.parse(rawStdin) as HookPayload;

		if (isForeignPayload(tool, payload)) {
			return null;
		}

		const sessionId = spec.sessionId(payload);
		const filePath = spec.filePaths(payload)[0];
		if (!sessionId || !filePath) {
			return emitNoneOutput(spec);
		}

		const cwd = payload.cwd ?? process.cwd();
		const repoRoot = (await findRepoRoot(cwd)) ?? cwd;

		const nag = await resolveArchitectNag(repoRoot, filePath, tool, sessionId);
		if (nag === null) {
			return emitNoneOutput(spec);
		}

		return JSON.stringify(spec.emitNag(nag));
	} catch (error) {
		process.stderr.write(
			`architect-route hook failed: ${error instanceof Error ? error.message : String(error)}\n`
		);
		return null;
	}
}

/** Parses the `--tool=<name>` argv flag naming which `HARNESSES` row this process runs as. */
function parseToolFlag(argv: string[]): string | undefined {
	for (const arg of argv) {
		const match = /^--tool=(.+)$/.exec(arg);
		if (match) {
			return match[1];
		}
	}
	return undefined;
}

/**
 * The kill switch checked before stdin is even parsed — the first statement
 * in this module's entry path. `PRISM_HOOK_DISABLE=1` makes the hook stay
 * registered and fire, but produce no output and exit 0, so an A/B harness
 * can disable the hook's behavior without editing a settings file or the
 * manifest — varying exactly one thing.
 *
 * Every path sets `process.exitCode` rather than calling `process.exit()`
 * directly and returns — `process.exit()` does not guarantee pending
 * asynchronous `stdout` writes are flushed before the process tears down.
 * Setting `exitCode` and returning lets Node drain the write queue before
 * exiting on its own.
 */
async function main(): Promise<void> {
	if (process.env.PRISM_HOOK_DISABLE === "1") {
		process.exitCode = 0;
		return;
	}

	const tool = parseToolFlag(process.argv.slice(2));
	const spec = tool ? HARNESSES[tool] : undefined;
	if (!tool || !spec) {
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

	const output = await runAdapter(tool, spec, rawStdin);
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
 * entry point. Without this guard, `hook.test.ts` importing `runAdapter`
 * from this module also runs `main()` at import time, which waits on a
 * `process.stdin` that never ends in a test process — hanging the whole
 * suite rather than failing a single test.
 */
const isEntryPoint =
	process.argv[1] !== undefined &&
	fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isEntryPoint) {
	main();
}
