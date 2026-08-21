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
	};
	hook_event_name?: string;
}

export interface HarnessSpec {
	toolKinds: Record<string, "read" | "write" | "search" | "shell">;
	scopeId: (payload: HookPayload) => string | null;
	filePaths: (payload: HookPayload) => string[];
	emitNag: (text: string) => unknown;
	emitNone: () => unknown;
	/** `null` on a host whose deny envelope nobody has observed — see `harnesses.mjs`. */
	emitDeny: (reason: string) => unknown;
}

export function extractPatchFilePaths(command: string | undefined): string[];

export const HARNESSES: Record<string, HarnessSpec>;

export function resolveListedToolKind(
	spec: HarnessSpec,
	toolName: string | undefined
): string | null;

export function resolveToolKind(
	spec: HarnessSpec,
	toolName: string | undefined
): string;
