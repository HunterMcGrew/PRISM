export interface ReviewLine {
	kind: "round" | "confirm";
	round: number | null;
	sha: string;
	part: { k: number; m: number } | null;
	verdict: string;
	line: string;
}

export function readReviewLines(text: string): ReviewLine[];
