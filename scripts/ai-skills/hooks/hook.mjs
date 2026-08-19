#!/usr/bin/env node
/**
 * Multi-host entry point for the architect-context read hook (plan
 * `opus5-port.md` task A4, generalizing the single Claude Code adapter this
 * file replaces into a `--tool=` dispatch over `HARNESSES`).
 *
 * Reads the hook's stdin JSON, looks up the harness named by the `--tool=`
 * argv flag, extracts the read path and session id through that harness's
 * own accessors, calls the host-agnostic resolver in `architect-route.mjs`,
 * and writes that harness's own envelope shape to stdout when it returns an
 * announcement. An unrecognized `--tool` value, a payload missing its file
 * path or session id, a payload that belongs to a different host's
 * registration (see `isForeignPayload`), or any caught failure all write
 * nothing and exit 0 — a `PostToolUse` hook must never block or fail the
 * tool call it observed.
 *
 * This PR ships the announce arm only (`PostToolUse`). The `PreToolUse`
 * deny arm lands in PR 2D, once the credit channel (PR 2B) and the writing
 * guides (PR 2C) make its remedy performable.
 *
 * Every safety check lives in this script, never in a host's registration
 * matcher — a matcher-less harness would otherwise silently inherit nothing.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import { findRepoRoot, resolveArchitectNag } from "./architect-route.mjs";
import { HARNESSES } from "./harnesses.mjs";

/**
 * Cursor's own hook-config event keys — camelCase, unlike Claude Code and
 * Codex's PascalCase. Cursor also executes `.claude/settings.json`'s hooks
 * behind a per-user "include third-party configs" setting, so without this
 * guard every Cursor tool call would run this hook twice: once through
 * `.cursor/hooks.json`'s own registration and once through Claude's,
 * crediting into two different state files.
 *
 * @type {Set<string>}
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
 *
 * @param {string} tool
 * @param {import("./harnesses.mjs").HookPayload} payload
 * @returns {boolean}
 */
function isForeignPayload(tool, payload) {
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
 *
 * @param {import("./harnesses.mjs").HarnessSpec} spec
 * @returns {string | null}
 */
function emitNoneOutput(spec) {
	const none = spec.emitNone();
	return none === null ? null : JSON.stringify(none);
}

/**
 * Computes one harness's `PostToolUse` result for an already-read stdin
 * payload — the JSON string to write to stdout, or `null` when nothing
 * should be written (kill switch active, a foreign payload, a missing file
 * path or session id, no manifest match, or a caught failure, logged to
 * stderr as a side effect).
 *
 * Deliberately does no process-level I/O beyond that stderr log: no
 * `process.stdout.write`, no `process.exitCode`. `main()` below is the only
 * caller that touches either, which is what makes this function safe to
 * call directly from a test — no global mutable process state to restore
 * around the call.
 *
 * @param {string} tool
 * @param {import("./harnesses.mjs").HarnessSpec} spec
 * @param {string} rawStdin
 * @returns {Promise<string | null>}
 */
export async function runPostToolUseArm(tool, spec, rawStdin) {
	if (process.env.PRISM_HOOK_DISABLE === "1") {
		return null;
	}

	try {
		const payload = JSON.parse(rawStdin);

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

		const nag = await resolveArchitectNag(repoRoot, filePath, sessionId);
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

/**
 * `PostCompact` arm — deletes the session's state file so docs re-announce
 * and re-gate after compaction. Compaction can drop the conversation
 * history that made a doc "read"; leaving the state intact would silence
 * that doc permanently. Fires on `PostCompact`, not `PreCompact` — before
 * the drop, the tail of the pre-compaction conversation can still re-credit
 * what is about to be deleted, so acting before the drop would erase state
 * a moment before the conversation re-populates it.
 *
 * With no session id in the payload: a no-op, one stderr line, exit 0.
 * There is deliberately no age sweep here — `pruneStaleRouteState` in
 * `architect-route.mjs` is the one owner of orphan-state hygiene, and a
 * second age constant in a second file would be a second source of truth
 * for the same concern.
 *
 * @param {string} rawStdin
 * @returns {Promise<void>}
 */
export async function runPostCompactArm(rawStdin) {
	if (process.env.PRISM_HOOK_DISABLE === "1") {
		return;
	}

	try {
		const payload = JSON.parse(rawStdin);
		const sessionId = payload.session_id ?? payload.conversation_id ?? null;
		if (!sessionId) {
			process.stderr.write("architect-route: PostCompact with no session id — no-op\n");
			return;
		}

		const cwd = payload.cwd ?? process.cwd();
		const repoRoot = (await findRepoRoot(cwd)) ?? cwd;

		const fs = await import("node:fs/promises");
		const safeSessionId = sessionId.replace(/[^a-zA-Z0-9._-]/g, "_");
		const statePath = path.join(
			repoRoot,
			".prism",
			`architect-route-state.${safeSessionId}.json`
		);
		await fs.rm(statePath, { force: true });
	} catch (error) {
		process.stderr.write(
			`architect-route PostCompact reset failed: ${error instanceof Error ? error.message : String(error)}\n`
		);
	}
}

/** Parses the `--tool=<name>` argv flag naming which `HARNESSES` row this process runs as.
 * @param {string[]} argv
 * @returns {string | undefined}
 */
function parseToolFlag(argv) {
	for (const arg of argv) {
		const match = /^--tool=(.+)$/.exec(arg);
		if (match) {
			return match[1];
		}
	}
	return undefined;
}

/**
 * Resolves argv's `--tool=<name>` flag to a `HARNESSES` row, or `null` when
 * the flag is absent or names a row that doesn't exist — the fail-open case
 * `main()` below exits 0 on without calling either arm at all. Separated
 * out from `main()` so this resolution is directly testable without
 * spawning a process or feeding it real stdin.
 *
 * @param {string[]} argv
 * @returns {{tool: string, spec: import("./harnesses.mjs").HarnessSpec} | null}
 */
export function resolveHarnessFromArgv(argv) {
	const tool = parseToolFlag(argv);
	const spec = tool ? HARNESSES[tool] : undefined;
	return tool && spec ? { tool, spec } : null;
}

/**
 * The kill switch checked before stdin is even parsed — the first statement
 * in this module's entry path. `PRISM_HOOK_DISABLE=1` makes the hook stay
 * registered and fire, but produce no output and exit 0.
 *
 * Every path sets `process.exitCode` rather than calling `process.exit()`
 * directly and returns — `process.exit()` does not guarantee pending
 * asynchronous `stdout` writes are flushed before the process tears down.
 * Setting `exitCode` and returning lets Node drain the write queue before
 * exiting on its own.
 */
async function main() {
	if (process.env.PRISM_HOOK_DISABLE === "1") {
		process.exitCode = 0;
		return;
	}

	const resolved = resolveHarnessFromArgv(process.argv.slice(2));
	if (resolved === null) {
		process.exitCode = 0;
		return;
	}
	const { tool, spec } = resolved;

	let rawStdin = "";
	try {
		rawStdin = await readStdin();
	} catch {
		process.exitCode = 0;
		return;
	}

	const eventName = parseEventFlag(process.argv.slice(2));
	if (eventName === "PostCompact") {
		await runPostCompactArm(rawStdin);
		process.exitCode = 0;
		return;
	}

	const output = await runPostToolUseArm(tool, spec, rawStdin);
	if (output !== null) {
		process.stdout.write(output);
	}
	process.exitCode = 0;
}

/** Parses an optional `--event=<name>` argv flag distinguishing `PostCompact` from `PostToolUse`.
 * @param {string[]} argv
 * @returns {string | undefined}
 */
function parseEventFlag(argv) {
	for (const arg of argv) {
		const match = /^--event=(.+)$/.exec(arg);
		if (match) {
			return match[1];
		}
	}
	return undefined;
}

function readStdin() {
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
 * entry point. Without this guard, `hook-gate.test.ts` importing
 * `runPostToolUseArm`/`runPostCompactArm` from this module also runs
 * `main()` at import time, which waits on a `process.stdin` that never ends
 * in a test process — hanging the whole suite rather than failing a single
 * test.
 */
const isEntryPoint =
	process.argv[1] !== undefined &&
	fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isEntryPoint) {
	main();
}
