import { realpathSync } from "node:fs";

/**
 * Resolves a fixture directory to the form git and the approval scripts report.
 *
 * Plain `realpathSync` keeps a Windows 8.3 short name such as `RUNNER~1`, while
 * `git rev-parse` and the scripts' `realpathSync.native` return the long
 * `runneradmin` form, so an expected path built from the plain call never
 * equals the one the product prints.
 */
export function resolveFixtureRoot(root: string): string {
	return realpathSync.native(root);
}
