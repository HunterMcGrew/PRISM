import type { StopPaths } from "./stop-paths.mjs";

export interface AutoApproveResult {
	code: number;
	message: string;
}

export interface ChallengeRound {
	number: number;
	line: string;
	kind: string;
}

export const ROUND_LINE: RegExp;

export function readChallengeRounds(text: string): ChallengeRound[];

export function autoApprove(input: {
	folder: string;
	check?: boolean;
	today: string;
	stopPaths?: StopPaths;
}): AutoApproveResult;
