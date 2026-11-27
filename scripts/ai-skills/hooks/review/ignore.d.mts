export interface ReviewIgnoreLists {
	ignore: string[];
	keep: string[];
}

export const DEFAULT_REVIEW_IGNORE: string[];

export const DEFAULT_REVIEW_KEEP: string[];

export function resolveReviewIgnore(
	config: { reviewIgnore?: unknown } | null | undefined
): ReviewIgnoreLists;

export function normalizeReviewPath(file: string, repoRoot: string): string;

export function isNeverReviewed(file: string, lists: ReviewIgnoreLists): boolean;
