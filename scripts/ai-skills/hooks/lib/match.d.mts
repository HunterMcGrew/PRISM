export function compileMatcher(pattern: string): (filePath: string) => boolean;

export const UMBRELLAS_KEY: "umbrellas";

export function manifestRoutes(
	manifest: Record<string, unknown>
): [string, string | string[]][];

export function manifestUmbrellas(manifest: Record<string, unknown>): string[];
