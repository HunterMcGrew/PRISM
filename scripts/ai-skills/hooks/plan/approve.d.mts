import type { ChatTokenRead } from "./chat-approval.mjs";

export interface ApproveOptions {
	path: string;
	isTTY: boolean;
	env: Record<string, string | undefined>;
	readKey: (prompt: string) => Promise<string>;
	userName: string | null | undefined;
	today: string;
	write: (file: string, text: string) => void;
	takeToken?: () => ChatTokenRead;
	sessionId?: string | null;
}

export function approve(
	options: ApproveOptions
): Promise<{ code: number; message: string }>;
