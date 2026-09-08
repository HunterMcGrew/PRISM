# Output Guards

The two guards that run after skill generation to catch output that token
substitution did not fully resolve: what each one scans, which surfaces it runs
on, why the asymmetry between them is deliberate, and the allowlist they share.

This is build-internal, maintainer-facing content. It describes PRISM's own
build pipeline, not anything a consumer of PRISM configures or runs, which is
why it is excluded from the install seed. Consumer-facing install and update
behavior lives in [`install-layout.md`](./install-layout.md).

---

Two guards run after skill generation to catch output that was not fully resolved by token substitution. They share the same scanning engine (`scanPlatformRoots` in `scripts/ai-skills/literal-guard.ts`) but differ in scope — one is PRISM-build-only, the other runs everywhere.

## Leftover-token guard (`runLeftoverTokenGuard`)

Scans the rendered skill outputs for any unresolved token literal — an uppercase, underscore-separated name in the `${...}` form that the substitution layer should have replaced with a consumer value. The pattern matches the same token shape defined in `lib/tokens.ts`.

This guard runs in both contexts:

- **PRISM's own build** — after rendering the dogfood skill outputs.
- **Consumer `prism:update` and `prism:adopt`** — after rendering the consumer's roster, over the consumer's skill output roots.

An unresolved token is always a build bug. If a skill body carries a token name the consumer's config doesn't define, the substitution layer throws before the guard even runs (it's fail-fast by design — ADR-0030). If somehow an unresolved token slips past, the guard provides a second line of defense and fails the update.

## Thrive-literal guard (`runLiteralGuard`)

Scans the rendered skill outputs for Thrive-flavored literals: `Thrive`, `tractru`, `TracTru/thrive`, `THR-NNNN`, and `thrive.<key>`. This is a de-thriving canary — it catches platform output that drifted back to the originating Thrive install by containing a hardcoded reference that should have been tokenized at the canonical source.

**This guard runs on PRISM's own build only, never on consumer output.** A consumer legitimately contains "Thrive"-flavored words — for example, a consumer whose project is named "Thrive" will have that name rendered into every skill body by token substitution, which is correct. Running the Thrive-literal guard on consumer output would produce false positives on every such consumer.

## Why two guards instead of one

The asymmetry is load-bearing: the problem each guard catches is only a problem in the context where it runs.

- An unresolved token literal is a bug on any output surface — PRISM or consumer — so the leftover-token guard runs everywhere.
- A `Thrive` literal in platform output is a bug only in PRISM's output (it signals a de-thriving gap); in consumer output it is the correct substituted value for a Thrive-named project, so it is expected and the guard would fire incorrectly.

The decision record is ADR-0062.

## Allowlist

Both guards honor the same allowlist at `.ai-skills/definitions/literal-allowlist.json`. Entries are path-prefix matches relative to the repo root — any file whose path starts with an allowlisted prefix is exempt. The allowlist covers platform copies of canonical files that legitimately carry frozen Thrive citations (originating-incident ADRs, lessons) without triggering a false positive on every build.
