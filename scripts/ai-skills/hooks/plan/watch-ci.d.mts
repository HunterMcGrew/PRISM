export interface GhResult {
	status: number | null;
	stdout: string;
	stderr: string;
}

export type GhRunner = (args: string[]) => GhResult;

export interface CiResult {
	state: "pass" | "fail" | "pending";
	head: string;
	failed: { name: string; link: string }[];
}

export function watchCi(input: {
	pr: string;
	gh: GhRunner;
	sleep: (ms: number) => Promise<void>;
	now: () => number;
	required?: string | null;
	intervalMs?: number;
	timeoutMs?: number;
}): Promise<CiResult>;

export function resolveRequiredCheck(input: {
	argv: string[];
	toplevel: string;
}): string | null;
