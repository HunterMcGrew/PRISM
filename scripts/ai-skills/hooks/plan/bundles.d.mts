import type { Task } from "./tasks.mjs";

export type Manifest = Record<string, string | string[]>;

export interface BundleResult {
	duplicates: { file: string; ids: [string, string] }[];
	edges: { from: string; to: string; file: string; imports: string }[];
	notScanned: { file: string; id: string }[];
	cycle: string[] | null;
	groups: { docs: string[]; tasks: string[] }[];
}

export function analyzeBundles(input: {
	tasks: Task[];
	done: Set<string>;
	repoRoot: string;
	manifest: Manifest;
	aliases?: Record<string, string>;
}): BundleResult;

export function extractImportSpecifiers(text: string): string[];
