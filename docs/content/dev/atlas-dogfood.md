# Atlas Dogfood

How PRISM dogfooded Atlas against itself, what we learned, and how to repeat the exercise on a fresh codebase.

## What we did

Ran Atlas's orchestration entry point against a synthetic fixture matching PRISM's actual shape: a `package.json` with `react` + `next` + `typescript`, and the `.prism/` skeleton. Captured what the generators and anchor-substitution would write.

The "real" interactive Atlas session against PRISM's own repo was simulated programmatically rather than walked through conversationally — the smoke-test harness at [`scripts/ai-skills/atlas-dogfood.test.ts`](../../scripts/ai-skills/atlas-dogfood.test.ts) carries the deterministic version that runs in CI.

## What we learned

- The cross-skills anchor substitution was emitting unknown-key warnings per file. Each file only has a subset of the anchor set, so the warning fired on every canonical source for every key not present. Aggregated the warning to fire once per truly-unused key at the end of the cross-skills run. Fixed in PR-2.5.
- The smoke-test harness completes in well under the 10-second target — typical run is ~50ms for the full orchestration on a minimal fixture.

## How to repeat

To run Atlas's dogfood orchestration against a fresh fixture:

1. Create a temp directory with a minimal `package.json` declaring your stack.
2. Optionally seed `.prism/rules/` to test skip-if-exists.
3. Import `detectStack` from `scripts/ai-skills/lib/stack-detect.ts` and `runRuleGenerators` from `scripts/ai-skills/lib/onboarding-run.ts`.
4. Build an `OnboardingConfig` with your fixture's values.
5. Call `runRuleGenerators(config, fixtureDir)` and inspect the returned summary.

See the smoke test for the complete pattern.

## How this generalizes

Future PRISM personas should consider their own dogfood story. The pattern:

1. Build a fixture matching the persona's expected input shape.
2. Run the persona's orchestration entry point against the fixture.
3. Assert the expected artifacts appear with expected content.
4. Mock conversational prompts with fixed answer maps for determinism.
5. Keep the test under 10 seconds and free of network calls.

The smoke test is the regression catch — if Atlas's behavior drifts in a way that would break a real onboarding, the smoke test fails first.
