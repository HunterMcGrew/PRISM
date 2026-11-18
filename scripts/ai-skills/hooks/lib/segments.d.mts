export interface Segment {
	argv: string[];
	words: string[];
	assignments: string[];
	wrappers: string[];
	redirects: { op: string; target: string }[];
	stdinTexts: string[];
	cwd: string | null;
	container: string | null;
	depth: number;
	via: "top" | "shell-string" | "shell-stdin" | "eval" | "substitution";
	pipedFrom: Segment | null;
	substitutions: string[];
}

export const SHELLS: Set<string>;

export const SHELL_STRING_FLAG: RegExp;

export function walkSegments(
	command: string,
	options?: { cwd?: string | null; maxDepth?: number }
): { segments: Segment[]; unreadable: string[] };

export function resolveDir(
	dir: string | null | undefined,
	base: string | null
): string | null;

export function containsSubstitution(word: string, substitutions: string[]): boolean;

export function readFedStdin(segment: Segment): string[];

export function toHostPath(p: string): string;

export function shellOperandAt(argv: string[], i: number): number;
