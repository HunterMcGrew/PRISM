import type { HookPayload } from "./harnesses.d.mts";

export function matchesSecretPath(
	candidate: unknown,
	options?: { backslashSeparates?: boolean }
): boolean;

export function denyReason(toplevel: string | null): string;

export function judge(tool: string, payload: HookPayload): string | null;
