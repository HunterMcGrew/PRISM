export interface Task {
	id: string;
	summary: string;
	files: string[];
	proof: string | null;
	proofFailsOnMain: boolean;
	dependsOn: string[];
	behaviorChange: string | null;
	amended: { path: string; why: string }[];
	newDependency: string | null;
}

export function parseTasks(text: string): Task[];

export function parseSubject(
	subject: string,
	ticketPrefix?: string | null
):
	| { kind: "task" | "fix"; ids: string[] }
	| { kind: "plan" | "retro" | "ticket" }
	| null;

export function doneTasks(
	subjects: string[],
	ticketPrefix?: string | null
): Set<string>;

export function parseCliArgs(
	argv: string[]
): { planPath: string; base: string | null; json: boolean } | null;

export function loadPlanState(
	planPath: string,
	base: string | null
): { tasks: Task[]; done: Set<string> };

export class PlanConfigError extends Error {}

export function readPlanConfig(repoRoot: string): Record<string, unknown> | null;
