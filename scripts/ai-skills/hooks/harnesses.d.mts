export interface HookPayload {
	session_id?: string;
	agent_id?: string;
	conversation_id?: string;
	cwd?: string;
	tool_name?: string;
	tool_input?: {
		file_path?: string;
		path?: string;
		command?: string;
		offset?: number;
		limit?: number;
		new_string?: string;
		content?: string;
		contents?: string;
	};
	hook_event_name?: string;
}

export interface HarnessSpec {
	toolKinds: Record<string, "read" | "write" | "search" | "shell">;
	scopeId: (payload: HookPayload) => string | null;
	filePaths: (payload: HookPayload) => string[];
	/** The text a write would put into `filePath`, or `""` when the payload carries none. */
	editContent: (payload: HookPayload, filePath: string) => string;
	emitNag: (text: string) => unknown;
	emitNone: () => unknown;
	/** `null` on a host whose deny envelope nobody has observed — see `harnesses.mjs`. */
	emitDeny: (reason: string) => unknown;
	/** An allow carrying a reason; `null` on the same hosts `emitDeny` is `null` for. */
	emitAllow: (reason: string) => unknown;
}

export function extractPatchFilePaths(command: string | undefined): string[];

export function extractPatchAddedText(
	command: string | undefined,
	filePath: string
): string;

export const HARNESSES: Record<string, HarnessSpec>;

export function resolveListedToolKind(
	spec: HarnessSpec,
	toolName: string | undefined
): string | null;

export function resolveToolKind(
	spec: HarnessSpec,
	toolName: string | undefined
): string;
