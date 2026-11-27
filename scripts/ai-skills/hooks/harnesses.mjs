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
 * @property {{file_path?: string, path?: string, command?: string, offset?: number, limit?: number, new_string?: string, content?: string, contents?: string, subagent_type?: string, prompt?: string}} [tool_input]
 * @property {string} [hook_event_name]
 * @property {string} [agent_type]
 * @property {string} [prompt]
 */

/**
 * Per-harness wire contract. Nothing below the `HARNESSES` table reads a
 * harness-specific field name, so a fourth host needs only one more row here,
 * not a change anywhere else in `hooks/`.
 *
 * `emitDeny` returns `null` on a host whose deny envelope is neither
 * documented nor observed. A documented envelope ships without a live probe
 * (the Codex row below), which relaxes the live-probe bar ADR-0074 set rather
 * than meeting it (ADR-0077). Shipping early is safe in one direction only:
 * an unrecognized envelope fails open, so it cannot block anything, but a
 * recognized deny firing on the wrong path is not covered until a probe. A
 * deny is the one output shape that changes what the user's tool does, so a
 * genuinely guessed envelope either fails silently or blocks a write with a
 * message the host never renders. Returning `null` makes "the gate does not
 * reach Cursor" a property of the code rather than a sentence in a doc
 * (ADR-0072).
 *
 * @typedef {Object} HarnessSpec
 * @property {Record<string, "read"|"write"|"search"|"shell"|"dispatch">} toolKinds
 * @property {(payload: HookPayload) => string | null} scopeId
 * @property {(payload: HookPayload) => string[]} filePaths
 * @property {(payload: HookPayload, filePath: string) => string} editContent
 *   The text a write would put into `filePath`, or `""` when the payload
 *   carries none. Only the umbrella speed bump reads it, to find headings a
 *   write adds.
 * @property {(text: string) => unknown} emitNag
 * @property {() => unknown} emitNone
 * @property {(reason: string) => unknown} emitDeny
 * @property {(reason: string) => unknown} emitAllow
 * @property {(payload: HookPayload) => {type?: string, prompt?: string} | null} subagentDispatch
 *   The subagent type and brief a payload dispatches, or `null` for any
 *   other call.
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

/**
 * The proposed text of an `Edit` (`new_string`) or a `Write` (`content`).
 * `contents` is a guess at Cursor's spelling. Every row tries it, because a
 * field a host never sends costs nothing. A wrong guess yields `""`, which
 * finds no heading and lets the edit pass, the same direction every other
 * failure here takes.
 *
 * @param {HookPayload} payload
 * @returns {string}
 */
function editTextFromToolInput(payload) {
	const input = payload.tool_input ?? {};
	const text = input.new_string ?? input.content ?? input.contents;
	return typeof text === "string" ? text : "";
}

/**
 * The lines a Codex `apply_patch` adds to one file, with their `+` stripped.
 * Each `*** Add File:`, `*** Update File:`, or `*** Delete File:` header
 * starts a new file's section, and only the first two open one for this
 * file. Any other `***` line, such as `*** Move to:` or `*** End of File`,
 * stays inside the current section rather than closing it. Reading per
 * section is what keeps a heading added to one file in a multi-file patch
 * from being charged to every other file the patch touches. Removed and
 * context lines are left out, so deleting a heading never reads as adding
 * one.
 *
 * @param {string | undefined} command
 * @param {string} filePath
 * @returns {string}
 */
export function extractPatchAddedText(command, filePath) {
	if (typeof command !== "string") {
		return "";
	}

	const added = [];
	let inSection = false;
	for (const rawLine of command.split("\n")) {
		const line = rawLine.replace(/\r$/, "");
		const header = /^\*\*\* (Add File|Update File|Delete File): (.+)$/.exec(line.trim());
		if (header !== null) {
			inSection = header[1] !== "Delete File" && header[2].trim() === filePath;
			continue;
		}
		if (line.startsWith("***")) {
			continue;
		}
		if (inSection && line.startsWith("+")) {
			added.push(line.slice(1));
		}
	}

	return added.join("\n");
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
			// Claude Code dispatches a subagent as `Agent`, and older builds as
			// `Task`. No registration of `hook.mjs` matches either tool, so the
			// write gate never sees them.
			Agent: "dispatch",
			Task: "dispatch",
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
		editContent: editTextFromToolInput,
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
		// An explicit allow carrying a reason — the git gates' fail-open path
		// uses it so a lint that timed out is announced rather than silently
		// waved through (a silent allow is indistinguishable from a pass).
		emitAllow: (reason) => ({
			hookSpecificOutput: {
				hookEventName: "PreToolUse",
				permissionDecision: "allow",
				permissionDecisionReason: reason,
			},
		}),
		subagentDispatch: (payload) =>
			resolveListedToolKind(HARNESSES.claude, payload.tool_name) === "dispatch"
				? {
						type: payload.tool_input?.subagent_type,
						prompt: payload.tool_input?.prompt,
					}
				: null,
	},
	cursor: {
		// StrReplace (Cursor's edit tool) is deliberately unlisted here — the
		// "write" default in `resolveToolKind` is what covers it, and listing
		// it adds a name that has to stay correct for no behavioral gain.
		toolKinds: { Read: "read", Shell: "shell", Grep: "search" },
		scopeId: (payload) => payload.conversation_id ?? null,
		filePaths: filePathFromToolInput,
		editContent: editTextFromToolInput,
		emitNag: (text) => ({ additional_context: text }),
		emitNone: () => ({}),
		// Nothing delivers a Cursor hook registration, and no probe has
		// observed Cursor's deny envelope — so there is nothing to answer and
		// no verified shape to answer in.
		emitDeny: () => null,
		// Same reasoning as `emitDeny` — no observed envelope to answer in.
		emitAllow: () => null,
		subagentDispatch: () => null,
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
		editContent: (payload, filePath) =>
			payload.tool_name === "apply_patch"
				? extractPatchAddedText(payload.tool_input?.command, filePath)
				: editTextFromToolInput(payload),
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
		// Same documented envelope as `emitDeny`, in the allow direction — the
		// git gates' fail-open path uses it so a lint that timed out is
		// announced rather than silently waved through. An envelope Codex does
		// not recognize just drops the reason text; the push proceeds either
		// way because this is the allow branch, not the deny branch.
		emitAllow: (reason) => ({
			hookSpecificOutput: {
				hookEventName: "PreToolUse",
				permissionDecision: "allow",
				permissionDecisionReason: reason,
			},
		}),
		// The `SubagentStart` field names below come from
		// OpenAI's Codex hook documentation as the reference implementation read
		// it. They are documentation-read, not live-probed.
		subagentDispatch: (payload) =>
			payload.hook_event_name === "SubagentStart"
				? { type: payload.agent_type, prompt: payload.prompt }
				: null,
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

/**
 * The tool names each host sends for a shell call. `toolKinds` leaves
 * `PowerShell` out on purpose, so the write gate's shell arm keeps its
 * current reach, and this list is what lets a gate read a PowerShell call.
 *
 * @type {Record<string, string[]>}
 */
const SHELL_TOOLS = {
	claude: ["Bash", "PowerShell"],
	codex: ["Bash"],
};

/**
 * Quotes each argv word in single quotes, so the shared tokenizer reads the
 * words back unchanged.
 *
 * @param {unknown[]} argv
 * @returns {string}
 */
function quoteArgv(argv) {
	return argv
		.map((word) => `'${String(word).replaceAll("'", `'\\''`)}'`)
		.join(" ");
}

/**
 * Reads a shell call out of a hook payload as `{ command, cwd }`, or returns
 * `null` when the payload is not a shell call or carries no command.
 *
 * `command` is one string the shared tokenizer reads. A Codex argv array is
 * quoted word by word, and a Claude `PowerShell` command has its backslashes
 * turned into slashes, because PowerShell escapes with a backtick and its
 * backslashes are path separators. `cwd` is the payload's `cwd`, or `null`
 * when it is missing or empty.
 *
 * @param {string} tool the `--tool` value, a key of `HARNESSES`
 * @param {HookPayload | null | undefined} payload
 * @returns {{ command: string, cwd: string | null } | null}
 */
export function readShellCall(tool, payload) {
	if (!payload || !Object.hasOwn(SHELL_TOOLS, tool)) {
		return null;
	}

	const toolName = payload.tool_name;
	if (!SHELL_TOOLS[tool]?.includes(toolName ?? "")) {
		return null;
	}

	// Codex sends an argv array on some builds, which `HookPayload` does not
	// type because every other reader wants a string.
	/** @type {unknown} */
	const rawCommand = payload.tool_input?.command;
	const joined = Array.isArray(rawCommand) ? quoteArgv(rawCommand) : rawCommand;
	if (typeof joined !== "string") {
		return null;
	}

	const command =
		toolName === "PowerShell" ? joined.replaceAll("\\", "/") : joined;

	return {
		command,
		cwd: typeof payload.cwd === "string" && payload.cwd ? payload.cwd : null,
	};
}

/**
 * Writes a string as is and JSON-encodes anything else.
 *
 * A reader that stops early raises `EPIPE` as a stream event rather than a
 * throw, so the no-op listener is what keeps a hook's fail-open guarantee
 * real. Callers never `process.exit()` after this, because exit does not wait
 * for a pending stdout write to flush.
 *
 * @param {unknown} body
 */
export function writeStdout(body) {
	process.stdout.on("error", () => {});
	process.stdout.write(typeof body === "string" ? body : JSON.stringify(body));
}
