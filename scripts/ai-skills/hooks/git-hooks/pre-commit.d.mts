export interface HookResult {
	exitCode: number;
	stdout: string;
	stderr: string;
}

export function runPreCommit(options: {
	toplevel: string;
	all?: boolean;
	env?: NodeJS.ProcessEnv;
	platform?: NodeJS.Platform;
}): HookResult;
