export interface CommitResult {
	exitCode: number;
	stdout: string;
	stderr: string;
}

export function runPlanCommit(input: {
	cwd: string;
	subject: string;
	paths: string[];
	env?: NodeJS.ProcessEnv;
}): CommitResult;
