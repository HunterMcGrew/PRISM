export interface WouldBeIndex {
	indexFile: string;
	treeHash: string;
	cleanup: () => void;
}

export function buildWouldBeIndex(
	repoRoot: string,
	paths: string[],
	options?: { literal?: boolean }
): WouldBeIndex;

interface RunGitOptions {
	env?: Record<string, string>;
	trim?: boolean;
}

/** With a `fallback` option, a failed call returns it in place of throwing. */
export function runGit<T>(
	cwd: string,
	args: string[],
	options: RunGitOptions & { fallback: T }
): string | T;
export function runGit(
	cwd: string,
	args: string[],
	options?: RunGitOptions
): string;
