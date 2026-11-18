export interface LiveState {
	branch: string;
	plan: string | null;
	status: string;
}

export function findPlanForBranch(repoRoot: string, branch: string): string | null;

export function buildSummaryTemplate(repoRoot: string, state: LiveState): string;

export function buildPostCompactNote(repoRoot: string, state: LiveState): string;

export function runPreCompactArm(rawStdin: string): Promise<string | null>;

export function runSessionStartArm(rawStdin: string): Promise<string | null>;
