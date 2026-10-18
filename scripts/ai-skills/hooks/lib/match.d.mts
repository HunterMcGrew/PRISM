export function compileMatcher(pattern: string): (filePath: string) => boolean;

export const UMBRELLAS_KEY: "umbrellas";

export function listManifestRoutes(
	manifest: Record<string, unknown>
): [string, string | string[]][];

export function listManifestUmbrellas(manifest: Record<string, unknown>): string[];
