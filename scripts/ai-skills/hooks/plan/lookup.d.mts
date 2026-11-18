export interface PlanMatch {
	kind: "folder" | "flat" | "epic-folder" | "epic-flat";
	dir: string | null;
	file: string;
}

export const CHAIN_FILES: string[];

export function resolvePlan(repoRoot: string, ticketId: string): PlanMatch | null;

export function findArchivedPlan(
	repoRoot: string,
	ticketId: string
): PlanMatch | null;
