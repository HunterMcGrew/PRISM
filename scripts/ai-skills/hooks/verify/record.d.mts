export interface VerifyReport {
	verdict: "done" | "blocked";
	base: string;
	head: string;
	blocked: { check: string; why: string }[];
	rows: { check: string; result: string; evidence: string }[];
	failures: { check: string; file: string; line?: number }[];
}

export class ReportShapeError extends Error {}

export function validateVerifyReport(value: unknown): VerifyReport;

export function composeVerificationSection(report: VerifyReport): string[];

export function replaceVerificationSection(
	planText: string,
	sectionLines: string[]
): string;
