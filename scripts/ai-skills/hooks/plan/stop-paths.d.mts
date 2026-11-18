export interface StopPaths {
	dependency: string[];
	contract: string[];
}

export const DEFAULT_DEPENDENCY_FILES: string[];

export function resolveStopPaths(
	config:
		| { stopPaths?: { dependency?: unknown; contract?: unknown } }
		| null
		| undefined
): StopPaths;

export function matchStopPath(
	file: string,
	stopPaths: StopPaths
): { kind: "dependency" | "contract"; glob: string } | null;
