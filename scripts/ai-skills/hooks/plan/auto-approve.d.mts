import type { StopPaths } from "./stop-paths.mjs";

export interface AutoApproveResult {
	code: number;
	message: string;
}

export function autoApprove(input: {
	folder: string;
	check?: boolean;
	today: string;
	stopPaths?: StopPaths;
}): AutoApproveResult;
