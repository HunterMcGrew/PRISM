import type { HarnessSpec, HookPayload } from "./harnesses.d.mts";

export interface RouteTarget {
	filePath: string;
	credit: boolean;
}

export function parseShellReadTargets(
	command: string | undefined
): RouteTarget[];

export const SHELL_INSPECTION_COMMANDS: Map<string, Set<string>>;

export const GIT_INSPECTION_SUBCOMMANDS: Set<string>;

export const GIT_TREE_SAFE_SUBCOMMANDS: Set<string>;

export function parseUnprovenShellPaths(command: string | undefined): string[];

export function resolveTargets(
	spec: HarnessSpec,
	payload: HookPayload
): RouteTarget[];

export function formatDenyMessage(
	relativePath: string,
	unreadDocs: string[]
): string;

export function formatShellRerouteMessage(relativePath: string): string;

export function runPreToolUseArm(
	tool: string,
	spec: HarnessSpec,
	rawStdin: string
): Promise<string | null>;

export function runPostToolUseArm(
	tool: string,
	spec: HarnessSpec,
	rawStdin: string
): Promise<string | null>;

export function runPostCompactArm(rawStdin: string): Promise<void>;

export function resolveHarnessFromArgv(
	argv: string[]
): { tool: string; spec: HarnessSpec } | null;
