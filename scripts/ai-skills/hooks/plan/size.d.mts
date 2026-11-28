import type { StopPaths } from "./stop-paths.mjs";

export interface ChangedFile {
	path: string;
	status: string;
	added: number | null;
}

export interface SizeOptions {
	testGlobs: string[];
	stopPaths: StopPaths;
	docsRoot: string | null;
}

export interface SizeResult {
	size: "small" | "standard";
	reasons: string[];
}

export function resolveSizeOptions(
	config: Record<string, unknown> | null | undefined
): SizeOptions;

export function classifyDiff(files: ChangedFile[], options: SizeOptions): SizeResult;

export function readChangedFiles(
	repoRoot: string,
	mergeBase: string,
	tree?: string
): ChangedFile[];

export function measureSize(
	cwd: string,
	base: string,
	tree?: string
): ({ code: 0 | 1 } & SizeResult) | { code: 2; message: string };
