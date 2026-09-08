import type { HarnessSpec } from "./harnesses.d.mts";

export interface GitGateSegment {
	subcommand: "commit" | "push";
	/** Every `-C <dir>` the invocation carried, in order, unresolved. */
	directories: string[];
}

export function detectGitSegments(command: string | undefined): GitGateSegment[];

export function findConfigRoot(startDir: string): Promise<string | null>;

export function runGitGatesArm(
	tool: string,
	spec: HarnessSpec,
	rawStdin: string,
	env?: NodeJS.ProcessEnv
): Promise<string | null>;
