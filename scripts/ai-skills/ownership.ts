/**
 * Path-based ownership classification for `pnpm prism:update`.
 *
 * The update flow needs a path-decidable answer to "is PRISM allowed to
 * overwrite this file, or does it belong to the consumer?" Physical namespace
 * separation (`_toolkit/` subdirs for PRISM-owned docs, flat dirs reserved for
 * consumer product content) makes that answer a glob match rather than a guess.
 * This module is the single canonical source for the owned/consumer glob sets;
 * `sync-manifest.ts` and the update flow both import them from here.
 */
import { compileMatcher } from "./verify-manifest-coverage";

/**
 * Globs (relative to `.prism/`) for the files PRISM owns and the update flow is
 * allowed to overwrite.
 *
 * Skill ownership convention: PRISM owns the `prism-*` skill IDs and the update
 * flow regenerates only those. Consumer-authored skills use the org token from
 * `.ai-skills/config.json` (e.g. `acme-<role>`) or a `custom-<role>` prefix and
 * are consumer-owned — the sync never regenerates them. The skill source dirs
 * live outside `.prism/`, so they are not in these globs; the convention is the
 * contract the skill-regeneration step keys off.
 */
export const PRISM_OWNED_GLOBS = [
  "architect/_toolkit/**",
  "spec/adrs/_toolkit/**",
  "rules/**",
  "templates/**",
  "references/**",
  "spec/**",
  "SPEC.md",
] as const;

/**
 * Globs (relative to `.prism/`) for consumer-owned files the update flow never
 * touches.
 *
 * These carve consumer paths back out of the broader owned globs: flat
 * `spec/adrs/*.md` and `architect/*.md` sit under the owned `spec/**` and the
 * `architect/` tree, so without an explicit consumer claim the classifier would
 * over-claim consumer product docs. Consumer claims win over PRISM claims in
 * `classifyPath`, which is what keeps the carve-out correct.
 */
export const CONSUMER_OWNED_GLOBS = [
  "architect/*.md",
  "spec/adrs/*.md",
  "architect/manifest.json",
  "custom/**",
  "plans/**",
  "lessons.md",
] as const;

const ownedMatchers = PRISM_OWNED_GLOBS.map((glob) => compileMatcher(glob));
const consumerMatchers = CONSUMER_OWNED_GLOBS.map((glob) =>
  compileMatcher(glob),
);

/**
 * Classifies a `.prism/`-relative path as `prism`, `consumer`, or `unknown`.
 *
 * Consumer claims are checked first so the flat-dir carve-outs win over the
 * broader owned globs (e.g. `architect/foo.md` is consumer even though it sits
 * inside the `architect/` tree). A path matching neither set is `unknown` —
 * the update flow leaves unknown paths untouched, since PRISM can only safely
 * overwrite what it provably owns.
 */
export function classifyPath(
  relativePath: string,
): "prism" | "consumer" | "unknown" {
  if (consumerMatchers.some((matches) => matches(relativePath))) {
    return "consumer";
  }

  if (ownedMatchers.some((matches) => matches(relativePath))) {
    return "prism";
  }

  return "unknown";
}
