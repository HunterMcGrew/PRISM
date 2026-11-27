export interface ReviewPass {
	pass?: string;
	token: string;
}

export interface ReviewFinding {
	severity: string;
	file: string;
	line?: number;
	kind?: string;
	summary?: string;
}

export interface ReviewReport {
	round: number;
	sha: string;
	part?: { k: number; m: number };
	passes: ReviewPass[];
	findings: ReviewFinding[];
}

export class ReportShapeError extends Error {}

export function validateReport(value: unknown): ReviewReport;

export function computeVerdict(report: ReviewReport): string;

export function appendReviewLine(text: string, line: string): string;
