import type { HookPayload } from "./harnesses.d.mts";

export const RECONCILE_SCRIPT: string;

export function runGate(
	payload: HookPayload,
	options: {
		tool: string;
		exec: (
			file: string,
			args: string[],
			options: Record<string, unknown>,
			callback: (error: Error | null, stdout: string, stderr: string) => void
		) => unknown;
		now?: () => Date;
	}
): Promise<{ decision: "pass" } | { decision: "block"; reason: string }>;
