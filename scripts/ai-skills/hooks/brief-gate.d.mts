import type { HookPayload } from "./harnesses.d.mts";

export const GATED_ROLES: Set<string>;

export const MAX_LINES: number;

export const OVERRIDE_PATTERNS: RegExp[];

export function denyReason(type: string, causes: string[]): string;

export function runGate(
	payload: HookPayload,
	options: { tool: string }
): Promise<
	| { decision: "pass" }
	| {
			decision: "deny";
			reason: string;
			type: string;
			lines: number;
			repoRoot: string;
	  }
>;
