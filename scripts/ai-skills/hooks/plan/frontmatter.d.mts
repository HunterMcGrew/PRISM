export type ApprovalKey = "status" | "approved_by" | "approved_at";

export const CHAIN_FILE: RegExp;

export function readFrontmatter(
	text: string
): { fields: Record<string, string>; start: number; end: number } | null;

export function matchApprovalLine(
	line: string
): { key: ApprovalKey; value: string } | null;

export function approvalLines(text: string): Record<ApprovalKey, string | null>;

export function replaceFrontmatterLine(
	text: string,
	key: string,
	replacement: string
): string;

export function stampApproval(
	text: string,
	approver: string,
	today: string,
	via?: string | null
): string;

export function formatLocalDate(date: Date): string;

export function sectionBody(text: string, heading: string): string | null;
