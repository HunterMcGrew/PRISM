export interface ChatApprovalToken {
	prompted_at: string;
	session: string;
	path: string | null;
	hashes: Record<string, string>;
}

export type ChatTokenState = "missing" | "invalid" | "fresh";

export interface ChatTokenRead {
	state: ChatTokenState;
	token: ChatApprovalToken | null;
}

export const TOKEN_FILE: string;

export function parseApprovePrompt(prompt: unknown): { path: string | null } | null;

export function findTokenPath(cwd: string): string | null;

export function hashFile(file: string): string | null;

export function hashChainFiles(cwd: string): Record<string, string>;

export function readChatToken(file: string): ChatTokenRead;

export function takeChatToken(file: string): ChatTokenRead;
