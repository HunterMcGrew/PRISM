import type { HarnessSpec } from "./harnesses.d.mts";

export function runPostToolUseArm(
	tool: string,
	spec: HarnessSpec,
	rawStdin: string
): Promise<string | null>;

export function runPostCompactArm(rawStdin: string): Promise<void>;

export function resolveHarnessFromArgv(
	argv: string[]
): { tool: string; spec: HarnessSpec } | null;
