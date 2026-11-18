export interface HookResult {
	exitCode: number;
	stdout: string;
	stderr: string;
}

export function runPrePush(options: {
	toplevel: string;
	remote: string;
	stdinText: string;
	env?: NodeJS.ProcessEnv;
	platform?: NodeJS.Platform;
}): HookResult;
