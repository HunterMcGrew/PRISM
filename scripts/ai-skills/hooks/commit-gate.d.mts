import type { HookPayload } from "./harnesses.d.mts";

export function runGate(
	payload: HookPayload,
	options: { tool: string; cwd?: string }
): { decision: "pass" } | { decision: "deny"; reason: string };
