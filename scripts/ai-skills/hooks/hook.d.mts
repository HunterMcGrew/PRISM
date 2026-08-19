import type { HarnessSpec, HookPayload } from "./harnesses.d.mts";

export interface RouteTarget {
	filePath: string;
	credit: boolean;
}

export function parseShellReadTargets(
	command: string | undefined
): RouteTarget[];

export function resolveTargets(
	spec: HarnessSpec,
	payload: HookPayload
): RouteTarget[];

export function runPostToolUseArm(
	tool: string,
	spec: HarnessSpec,
	rawStdin: string
): Promise<string | null>;

export function runPostCompactArm(rawStdin: string): Promise<void>;

export function resolveHarnessFromArgv(
	argv: string[]
): { tool: string; spec: HarnessSpec } | null;
