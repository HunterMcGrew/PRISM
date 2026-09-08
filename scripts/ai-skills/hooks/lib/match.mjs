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
 *     segment. Every other regex metacharacter is escaped to a literal,
 *     `?` included — the route language is the two star forms and nothing
 *     else.
 *
 * `?` is escaped rather than translated to a single-character class, and the
 * distinction is the difference between a scoped gate and an open one. Left
 * unescaped it survives into the compiled regex as a quantifier: `a?**`
 * compiles to `/^a?.*$/`, which matches every path in the repo, and
 * `checkRouteIsAnchored` clears it because it strips only `*` and reads the
 * `?` as the required literal. A first segment of `?*` followed by a slash
 * and a double star is worse — it compiles to a regex `RegExp` rejects
 * outright, which the hook swallows as a fail-open and the two development
 * gates hit as an uncaught crash. Escaping closes both:
 * a literal `?` is a real anchor character, so the anchor test's reading of
 * it becomes true rather than accidental.
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
		.replace(/[.?+^${}()|[\]\\]/g, "\\$&")
		.replace(/\*/g, "[^/]*")
		.split(doubleStarToken)
		.join(".*");
	const regex = new RegExp(`^${regexBody}$`);
	return (filePath) => regex.test(filePath);
}
