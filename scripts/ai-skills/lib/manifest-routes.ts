/**
 * The structural rules a manifest route has to satisfy before the write-time
 * deny gate can be pointed at it.
 *
 * Here rather than in `verify-manifest-coverage.ts` because that script is a
 * development gate that never ships. `.prism/architect/manifest.json` is a
 * consumer-owned file, so a consumer or Atlas can author a catch-all route in
 * a tree `pnpm prism:check` never runs against — and an unanchored route
 * makes the deny unconditional on every path in their repo. `prism doctor`
 * ships, and imports these from here so both surfaces answer the question the
 * same way.
 */

/** A manifest maps a route pattern to the doc or docs that govern it. */
export type Manifest = Record<string, string | string[]>;

/**
 * Reports whether a route pattern is anchored to a real location: its first
 * path segment must carry at least one literal character rather than being
 * built entirely from wildcards.
 *
 * This is the property "the route constrains something," stated directly. The
 * obvious alternative — probing the compiled matcher with the empty string —
 * looks computable but tests something narrower. A double-star and a single
 * star both accept the empty string and are caught by a probe. Three further
 * spellings are not: a double-star followed by a slash and a single star, a
 * single star followed by a slash and a double star, and two double-stars
 * joined by a slash. Each compiles to a regex that requires a separator, so
 * each rejects the empty string while still matching every nested path in the
 * repo. Enumerating those spellings in a probe set closes only the ones
 * someone thought to write down; requiring a leading literal segment closes
 * the whole family, because a first segment made only of wildcards is exactly
 * what lets a pattern span the entire tree.
 *
 * A catch-all route matches every read in the repo, which would make the
 * write-time deny gate unconditional rather than scoped.
 */
export function checkRouteIsAnchored(pattern: string): boolean {
	const firstSegment = pattern.split("/")[0];

	return firstSegment.replaceAll("*", "").length > 0;
}

/**
 * Returns one failure message per manifest route that is not anchored to a
 * leading literal segment — see `checkRouteIsAnchored`. Empty array means
 * every route constrains something.
 */
export function findCatchAllKeys(manifest: Record<string, unknown>): string[] {
	return Object.keys(manifest)
		.filter((key) => !checkRouteIsAnchored(key))
		.map(
			(key) =>
				`manifest route "${key}" opens with a wildcard-only path segment, so it constrains nothing and matches every path — narrow it to a real prefix.`
		);
}

/**
 * Returns one failure message per manifest key containing a brace glob
 * (`{ts,tsx}`). `compileMatcher` escapes `{` and `}` into a regex literal
 * class rather than expanding brace alternation, so a route written this way
 * compiles to a regex that matches only a filename containing literal brace
 * characters — silently matching nothing real. Empty array means every key
 * is safe to compile.
 */
export function findBraceGlobKeys(manifest: Record<string, unknown>): string[] {
	return Object.keys(manifest)
		.filter((key) => key.includes("{") || key.includes("}"))
		.map(
			(key) =>
				`manifest route "${key}" uses a brace glob; compileMatcher escapes braces as literals rather than expanding them, so this route would silently match nothing. Write one route per extension instead.`
		);
}

