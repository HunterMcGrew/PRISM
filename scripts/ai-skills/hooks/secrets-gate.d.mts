import type { HookPayload } from "./harnesses.d.mts";

export function matchesSecretPath(
	candidate: unknown,
	options?: { backslashSeparates?: boolean; folders?: boolean }
): boolean;

export function denyReason(cwd: string): string;

export function judge(tool: string, payload: HookPayload): string | null;
