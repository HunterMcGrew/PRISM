// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
/**
 * Compiles a manifest key into a matcher. Three shapes are supported,
 * matching the patterns in use across the current manifest:
 *   - Exact path (no wildcards, no trailing slash): `.prism/SPEC.md`
 *   - Directory prefix (trailing slash, no wildcards):
 *     `.claude/skills/prism-qa-test-plan/`
 *   - Glob: `**` matches across path segments; `*` matches within a single
 *     segment. Other regex metacharacters are escaped.
 *
 * This is the one implementation of the matcher — `verify-manifest-coverage.ts`
 * imports it from here rather than carrying its own copy, and the hook
 * runtime (`architect-route.mjs`) imports the same function, so the routing
 * rule a consumer's manifest depends on is defined exactly once.
 *
 * @param {string} pattern
 * @returns {(filePath: string) => boolean}
 */
export function compileMatcher(pattern) {
	if (!pattern.includes("*") && !pattern.endsWith("/")) {
		return (filePath) => filePath === pattern;
	}

	if (pattern.endsWith("/") && !pattern.includes("*")) {
		const prefix = pattern;
		const exact = pattern.slice(0, -1);
		return (filePath) => filePath === exact || filePath.startsWith(prefix);
	}

	const doubleStarToken =
		String.fromCharCode(0) + "DOUBLE_STAR" + String.fromCharCode(0);
	const regexBody = pattern
		.replace(/\*\*/g, doubleStarToken)
		.replace(/[.+^${}()|[\]\\]/g, "\\$&")
		.replace(/\*/g, "[^/]*")
		.split(doubleStarToken)
		.join(".*");
	const regex = new RegExp(`^${regexBody}$`);
	return (filePath) => regex.test(filePath);
}
