import type { HarnessSpec } from "./harnesses.d.mts";

export type GitGateSegment = "commit" | "push";

export function detectGitSegments(command: string | undefined): GitGateSegment[];

export function findConfigRoot(startDir: string): Promise<string | null>;

export function runGitGatesArm(
	tool: string,
	spec: HarnessSpec,
	rawStdin: string,
	env?: NodeJS.ProcessEnv
): Promise<string | null>;
