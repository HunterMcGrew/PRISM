// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
/**
 * Per-host wire contracts for the architect-context read hook (ADR-0071).
 *
 * A zero-dependency `.mjs` module, so the hook delivered into a consumer's
 * `.claude/hooks/` runs under plain `node` with no `tsx` or `node_modules`
 * on hand.
 *
 * Each entry in `HARNESSES` owns everything about how one host spells its
 * hook payload: which field carries the session id, which field carries the
 * file path (or, for Codex's `apply_patch`, how to recover one from the
 * patch blob), and the exact envelope shape that host's hook runtime expects
 * back on stdout. `hook.mjs` reads every payload field through these
 * accessors and never inspects a host-specific field name itself.
 *
 * @typedef {Object} HookPayload
 * @property {string} [session_id]
 * @property {string} [conversation_id]
 * @property {string} [cwd]
 * @property {string} [tool_name]
 * @property {{file_path?: string, path?: string, command?: string, offset?: number, limit?: number}} [tool_input]
 * @property {string} [hook_event_name]
 */

/**
 * Per-harness wire contract. Exactly five members — nothing below the
 * `HARNESSES` table reads a harness-specific field name, so a fourth host
 * needs only one more row here, not a change anywhere else in `hooks/`.
 *
 * @typedef {Object} HarnessSpec
 * @property {Record<string, "read"|"write"|"search"|"shell">} toolKinds
 * @property {(payload: HookPayload) => string | null} sessionId
 * @property {(payload: HookPayload) => string[]} filePaths
 * @property {(text: string) => unknown} emitNag
 * @property {() => unknown} emitNone
 */

/**
 * The accessor claude, cursor, and codex's non-`apply_patch` tools all
 * share: the target path lives at `tool_input.file_path` on every one of
 * them.
 *
 * Search tools are the one exception — a `Grep` names its haystack at
 * `tool_input.path` and carries no `file_path` at all — so that field is
 * the fallback. It is a fallback rather than a separate accessor because no
 * observed tool sends both, and a search over a routed directory is worth
 * announcing even though it never credits (see `hook.mjs`'s target
 * resolution).
 *
 * @param {HookPayload} payload
 * @returns {string[]}
 */
function filePathFromToolInput(payload) {
	const filePath = payload.tool_input?.file_path ?? payload.tool_input?.path;
	return filePath ? [filePath] : [];
}

/**
 * Extracts file paths named by a Codex `apply_patch` command string, from
 * its three header lines (`*** Add File:`, `*** Update File:`,
 * `*** Delete File:`). Codex carries no separate path field for this tool —
 * the target lives inside the patch text — so this is the only route to a
 * path on it. Returns an empty list rather than throwing on a blob that
 * matches none of the three headers.
 *
 * @param {string | undefined} command
 * @returns {string[]}
 */
export function extractPatchFilePaths(command) {
	if (typeof command !== "string" || command.length === 0) {
		return [];
	}

	const paths = [];
	for (const line of command.split("\n")) {
		const match = /^\*\*\* (?:Add File|Update File|Delete File): (.+)$/.exec(
			line.trim()
		);
		if (match) {
			paths.push(match[1].trim());
		}
	}
	return paths;
}

/** @type {Record<string, HarnessSpec>} */
export const HARNESSES = {
	claude: {
		toolKinds: { Read: "read", Bash: "shell", Grep: "search" },
		sessionId: (payload) => payload.session_id ?? null,
		filePaths: filePathFromToolInput,
		emitNag: (text) => ({
			hookSpecificOutput: {
				hookEventName: "PostToolUse",
				additionalContext: text,
			},
		}),
		emitNone: () => null,
	},
	cursor: {
		// StrReplace (Cursor's edit tool) is deliberately unlisted here — the
		// "write" default in `resolveToolKind` is what covers it, and listing
		// it adds a name that has to stay correct for no behavioral gain.
		toolKinds: { Read: "read", Shell: "shell", Grep: "search" },
		sessionId: (payload) => payload.conversation_id ?? null,
		filePaths: filePathFromToolInput,
		emitNag: (text) => ({ additional_context: text }),
		emitNone: () => ({}),
	},
	codex: {
		// Codex's read tool is unmapped until a live probe observes its name,
		// so every tool that isn't Bash or apply_patch takes the "write"
		// default — over-nagging rather than under-gating.
		toolKinds: { Bash: "shell", apply_patch: "write" },
		sessionId: (payload) => payload.session_id ?? null,
		filePaths: (payload) =>
			payload.tool_name === "apply_patch"
				? extractPatchFilePaths(payload.tool_input?.command)
				: filePathFromToolInput(payload),
		emitNag: (text) => ({
			hookSpecificOutput: {
				hookEventName: "PostToolUse",
				additionalContext: text,
			},
		}),
		emitNone: () => null,
	},
};

/**
 * Resolves a harness's own tool name to its generic kind, defaulting to
 * "write" for any name the harness's `toolKinds` map doesn't list.
 *
 * The default is deliberate for announce purposes: an unmapped tool
 * over-nags rather than under-gates. A tool this table has never classified
 * might still touch a governed path, so treating the unknown as
 * safe-to-ignore would silently drop the nag exactly when the manifest
 * route matters most. A write-time deny gate narrows this — it denies only on
 * a `write` resolved from an explicitly listed tool name, never the
 * fallback.
 *
 * @param {HarnessSpec} spec
 * @param {string | undefined} toolName
 * @returns {string}
 */
export function resolveToolKind(spec, toolName) {
	return spec.toolKinds[toolName ?? ""] ?? "write";
}
