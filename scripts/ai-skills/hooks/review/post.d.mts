export interface GhResult {
	status: number | null;
	stdout: string;
	stderr: string;
}

export type GhRunner = (args: string[]) => GhResult;

export interface PostResult {
	status: 0 | 1 | 2;
	message: string;
}

export function postComment(input: {
	pr: string;
	file: string;
	line: string;
	bodyFile: string;
	gh?: GhRunner;
	cwd: string;
}): PostResult;
