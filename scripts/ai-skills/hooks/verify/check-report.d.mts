export interface Failure {
	check: string;
	file: string;
}

export interface Row {
	check: string;
	result: string;
}

export interface Report {
	verdict: string | null;
	head: string | null;
	blockedLines: string[];
	rows: Row[];
	failures: Failure[];
	badFailureLines: string[];
}

export function checkReport(
	planText: string,
	expectedFailures?: Failure[] | null
): string[];

export function extractVerificationSection(planText: string): string[] | null;

export function parseSection(sectionLines: string[]): Report;
