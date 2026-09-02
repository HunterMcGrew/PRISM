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
 * hook payload: which fields identify the agent whose announce-once state
 * this event belongs to, which field carries the
 * file path (or, for Codex's `apply_patch`, how to recover one from the
 * patch blob), and the exact envelope shape that host's hook runtime expects
 * back on stdout. `hook.mjs` reads every payload field through these
 * accessors and never inspects a host-specific field name itself.
 *
 * @typedef {Object} HookPayload
 * @property {string} [session_id]
 * @property {string} [agent_id]
 * @property {string} [conversation_id]
 * @property {string} [cwd]
 * @property {string} [tool_name]
 * @property {{file_path?: string, path?: string, command?: string, offset?: number, limit?: number}} [tool_input]
 * @property {string} [hook_event_name]
 */

/**
 * Per-harness wire contract. Nothing below the `HARNESSES` table reads a
 * harness-specific field name, so a fourth host needs only one more row here,
 * not a change anywhere else in `hooks/`.
 *
 * `emitDeny` returns `null` on a host whose deny envelope nobody has observed.
 * A deny is the one output shape that changes what the user's tool does, so a
 * guessed envelope either fails silently or blocks a write with a message the
 * host never renders. Returning `null` makes "the gate does not reach Cursor"
 * a property of the code rather than a sentence in a doc (ADR-0072).
 *
 * @typedef {Object} HarnessSpec
 * @property {Record<string, "read"|"write"|"search"|"shell">} toolKinds
 * @property {(payload: HookPayload) => string | null} scopeId
 * @property {(payload: HookPayload) => string[]} filePaths
 * @property {(text: string) => unknown} emitNag
 * @property {() => unknown} emitNone
 * @property {(reason: string) => unknown} emitDeny
 */

/**
 * The accessor claude, cursor, and codex's non-`apply_patch` tools all
 * share: the target path lives at `tool_input.file_path` on every one of
 * them.
 *
 * Any tool that names its target at `tool_input.path` instead reaches it
 * through the fallback — a `Grep` names its haystack there and carries no
 * `file_path` at all, and so does `Glob` and anything else of that shape.
 * The fallback is deliberately unconditional rather than scoped to the
 * search kinds: a tool reaching it through the `write` default is announced
 * and never credited either way, so the widest form costs announce traffic
 * over a routed path and nothing else. It is a fallback rather than a
 * separate accessor because no observed tool sends both fields (see
 * `hook.mjs`'s target resolution for which kinds credit).
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
		// `Write` and `Edit` are listed rather than left to the "write" default
		// because the deny arm fires only on an explicitly listed name. The
		// default is right for announce — an unclassified tool over-nags — and
		// wrong for deny: the next read-shaped tool a vendor ships would be
		// classified `write` and blocked, with the remedy unperformable through
		// the very tool doing the blocking. This listing and the
		// `Write|Edit|Bash` matcher in `.claude/settings.json` name the same
		// three tools.
		toolKinds: {
			Read: "read",
			Write: "write",
			Edit: "write",
			Bash: "shell",
			Grep: "search",
		},
		// A subagent's events carry the parent's `session_id` verbatim and add
		// an `agent_id` the parent's events never have, so `session_id` alone
		// pools parent and child into one announce-once budget: the child
		// burns announcements it is never shown (`additionalContext` does not
		// cross the agent boundary) and its reads credit a gate it does not
		// answer to. Appending `agent_id` gives each agent its own state file
		// while keeping the parent's id as the prefix, which is what lets
		// `PostCompact` sweep a session's children along with the session.
		scopeId: (payload) =>
			payload.agent_id
				? `${payload.session_id ?? "unknown"}.${payload.agent_id}`
				: (payload.session_id ?? null),
		filePaths: filePathFromToolInput,
		emitNag: (text) => ({
			hookSpecificOutput: {
				hookEventName: "PostToolUse",
				additionalContext: text,
			},
		}),
		emitNone: () => null,
		// Measured against a live Claude Code host on 2026-08-19: a
		// `permissionDecisionReason` returned from `PreToolUse` reaches the
		// model intact, tagged `"toolDenialKind":"permission-rule"`, and
		// crosses the subagent boundary. See `opus5-port.md` § Decisions
		// (Subagent context does not travel) for the probe record.
		emitDeny: (reason) => ({
			hookSpecificOutput: {
				hookEventName: "PreToolUse",
				permissionDecision: "deny",
				permissionDecisionReason: reason,
			},
		}),
	},
	cursor: {
		// StrReplace (Cursor's edit tool) is deliberately unlisted here — the
		// "write" default in `resolveToolKind` is what covers it, and listing
		// it adds a name that has to stay correct for no behavioral gain.
		toolKinds: { Read: "read", Shell: "shell", Grep: "search" },
		scopeId: (payload) => payload.conversation_id ?? null,
		filePaths: filePathFromToolInput,
		emitNag: (text) => ({ additional_context: text }),
		emitNone: () => ({}),
		// Nothing delivers a Cursor hook registration, and no probe has
		// observed Cursor's deny envelope — so there is nothing to answer and
		// no verified shape to answer in.
		emitDeny: () => null,
	},
	codex: {
		// Codex has no separate read tool — reads run through `Bash` — so
		// `Edit` and `Write` are listed explicitly for the same reason the
		// Claude row lists them: the deny arm fires only on an explicitly
		// listed name, never on the unlisted-name "write" default.
		toolKinds: {
			Bash: "shell",
			apply_patch: "write",
			Edit: "write",
			Write: "write",
		},
		scopeId: (payload) => payload.session_id ?? null,
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
		// The envelope OpenAI documents for Codex `PreToolUse` at
		// https://learn.chatgpt.com/docs/hooks, read 2026-09-02 — identical to
		// Claude's. Documentation-verified, not live-probed: unlike the Claude
		// row above, no measured session has shown the reason reaching the model.
		// Answering ahead of that probe is safe in one direction only — every
		// exit path in `hook.mjs` sets `exitCode = 0` and a deny travels in
		// stdout alone, so an envelope Codex does not recognize fails open,
		// which is what Codex does today.
		emitDeny: (reason) => ({
			hookSpecificOutput: {
				hookEventName: "PreToolUse",
				permissionDecision: "deny",
				permissionDecisionReason: reason,
			},
		}),
	},
};

/**
 * Resolves a harness's own tool name to its generic kind, or `null` when the
 * harness's `toolKinds` map does not list that name.
 *
 * The deny arm keys on this rather than on `resolveToolKind` below: it acts
 * only on a kind the table states, never on one the fallback assumed. Both
 * lookups go through this one function so the deny and the announce can never
 * disagree about what a table says.
 *
 * @param {HarnessSpec} spec
 * @param {string | undefined} toolName
 * @returns {string | null}
 */
export function resolveListedToolKind(spec, toolName) {
	return spec.toolKinds[toolName ?? ""] ?? null;
}

/**
 * Resolves a harness's own tool name to its generic kind, defaulting to
 * "write" for any name the harness's `toolKinds` map doesn't list.
 *
 * The default is deliberate for announce purposes: an unmapped tool
 * over-nags rather than under-gates. A tool this table has never classified
 * might still touch a governed path, so treating the unknown as
 * safe-to-ignore would silently drop the nag exactly when the manifest
 * route matters most. The write-time deny gate narrows this by asking
 * `resolveListedToolKind` instead, so the fallback never denies.
 *
 * @param {HarnessSpec} spec
 * @param {string | undefined} toolName
 * @returns {string}
 */
export function resolveToolKind(spec, toolName) {
	return resolveListedToolKind(spec, toolName) ?? "write";
}
