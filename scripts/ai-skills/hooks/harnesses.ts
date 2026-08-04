/**
 * Per-host wire contracts for the architect-context read hook (plan
 * `thr-2171-port`, porting `TracTru/thrive` PR #2262's harness table).
 *
 * Each entry in `HARNESSES` owns everything about how one host spells its
 * hook payload: which field carries the session id, which field carries the
 * file path (or, for Codex's `apply_patch`, how to recover one from the
 * patch blob), and the exact envelope shape that host's hook runtime expects
 * back on stdout. `hook.ts` reads every payload field through these
 * accessors and never inspects a host-specific field name itself — the
 * boundary a test in `hook.test.ts` locks down, because Thrive's own port
 * recorded drawing this boundary "one field short three times running."
 */

/**
 * The union of every field any current or future harness row's stdin
 * payload might carry. A given harness reads only the subset its own
 * accessors need — see the `HARNESSES` rows below.
 */
export interface HookPayload {
	session_id?: string;
	conversation_id?: string;
	cwd?: string;
	tool_name?: string;
	tool_input?: {
		file_path?: string;
		command?: string;
	};
	hook_event_name?: string;
}

/**
 * Per-harness wire contract. Exactly five members — nothing below the
 * `HARNESSES` table reads a harness-specific field name, so a fourth host
 * needs only one more row here, not a change anywhere else in `hooks/`.
 */
export interface HarnessSpec {
	toolKinds: Record<string, "read" | "write" | "search" | "shell">;
	sessionId: (payload: HookPayload) => string | null;
	filePaths: (payload: HookPayload) => string[];
	emitNag: (text: string) => unknown;
	emitNone: () => unknown;
}

/**
 * The accessor claude, cursor, and codex's non-`apply_patch` tools all
 * share: the target path lives at `tool_input.file_path` on every one of
 * them.
 */
function filePathFromToolInput(payload: HookPayload): string[] {
	const filePath = payload.tool_input?.file_path;
	return filePath ? [filePath] : [];
}

/**
 * Extracts file paths named by a Codex `apply_patch` command string, from
 * its three header lines (`*** Add File:`, `*** Update File:`,
 * `*** Delete File:`). Codex carries no separate path field for this tool —
 * the target lives inside the patch text — so this is the only route to a
 * path on it. Returns an empty list rather than throwing on a blob that
 * matches none of the three headers.
 */
export function extractPatchFilePaths(command: string | undefined): string[] {
	if (typeof command !== "string" || command.length === 0) {
		return [];
	}

	const paths: string[] = [];
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

export const HARNESSES: Record<string, HarnessSpec> = {
	claude: {
		toolKinds: { Read: "read", Bash: "shell" },
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
		// Codex's read tool is unmapped until a live probe observes its name
		// (task 9), so every tool that isn't Bash or apply_patch takes the
		// "write" default — over-nagging rather than under-gating.
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
 * The default is deliberate: an unmapped tool over-nags rather than
 * under-gates. A tool this table has never classified might still touch a
 * governed path, so treating the unknown as safe-to-ignore would silently
 * drop the nag exactly when the manifest route matters most.
 */
export function resolveToolKind(
	spec: HarnessSpec,
	toolName: string | undefined
): string {
	return spec.toolKinds[toolName ?? ""] ?? "write";
}
