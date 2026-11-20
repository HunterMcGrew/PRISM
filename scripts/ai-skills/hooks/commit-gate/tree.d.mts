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

export function runGit(
	cwd: string,
	args: string[],
	options?: {
		env?: Record<string, string>;
		trim?: boolean;
		fallback?: unknown;
	}
): string;
