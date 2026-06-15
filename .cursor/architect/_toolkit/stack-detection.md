# Stack Detection

The agent-facing reference for Atlas's stack detection subsystem. Lives at `scripts/ai-skills/lib/stack-detect.ts`. Invoked from Atlas's interactive onboarding flow before the first user question — surface what the codebase tells us before asking what we can't infer.

See [ADR-0040](../spec/adrs/_toolkit/0040-atlas-as-onboarding-persona.md) for the persona-level rationale.

## Public surface

```ts
detectStack(repoRoot: string): Promise<DetectedStack>
```

Returns the full detection result. Pure read-only — no writes, no network calls, no side effects beyond `fs` reads. Safe to call multiple times.

`DetectedStack` is a discriminated shape: either `{ languages: DetectedLanguage[], frameworks: DetectedFramework[] }` with at least one detected language, or the empty-repo sentinel `{ languages: [{ name: 'unknown', confidence: 'high', evidence: [] }], frameworks: [] }`. The sentinel is a normal state, not an error — Atlas treats unknown as "ask the user to declare the intended stack."

## Inspector matrix

Each inspector reads one package-file class and returns the languages and frameworks it found. `detectStack` globs for the fingerprints in parallel, calls the matching inspector for each hit, and merges results.

| Fingerprint | Inspector | Language | Frameworks detected |
| --- | --- | --- | --- |
| `package.json` (+ optional `tsconfig.json` sibling) | `inspectPackageJson` | `typescript` or `javascript` | `react`, `next`, `vue`, `nuxt`, `svelte`, `@sveltejs/kit`, `express`, `fastify`, `@nestjs/core` |
| `composer.json` | `inspectComposerJson` | `php` | `wordpress` (johnpbloch/wordpress-core or roots/wordpress), `laravel`, `symfony` |
| `pyproject.toml` → `Pipfile` → `requirements.txt` (priority order) | `inspectPython` | `python` | `django`, `flask`, `fastapi` |
| `go.mod` | `inspectGoMod` | `go` | none in v1 (extension point: gin/echo/fiber/chi) |
| `Cargo.toml` | `inspectCargoToml` | `rust` | `actix-web`, `axum`, `rocket`, `warp` |
| `Gemfile` | `inspectGemfile` | `ruby` | `rails`, `sinatra` |
| `mix.exs` | `inspectMixExs` | `elixir` | `phoenix` |
| `pom.xml` or `build.gradle`/`build.gradle.kts` | `inspectPomXmlGradle` | `java` | `spring` (presence of `spring-boot-starter` or `org.springframework.boot`) |

## Confidence levels

Every detected language and framework carries a `confidence: 'high' | 'medium' | 'low'` value:

- **high** — the package file explicitly names the framework as a direct dependency (e.g. `react` in `package.json` dependencies; `johnpbloch/wordpress-core` in composer.json).
- **medium** — reserved for future inspectors where the framework signal is indirect or partial (no manifest dependency, only a sibling-file or naming-convention signal). Not currently emitted at v1; all v1 detections return `high`.
- **low** — currently unused at v1; reserved for inspectors that infer from file conventions only (no manifest signal).

`detectStack` sorts results by confidence descending before returning.

## Empty-repo sentinel

`["unknown"]` is the explicit signal for repos with no detectable package files. Treat this as a normal state — Atlas asks the user "what stack are you building?" rather than guessing or erroring out. The sentinel evidence array is empty by design.

## Adding a new inspector

When a new package-file class needs detection support:

1. Add the file fingerprint to the parallel glob set in `detectStack`.
2. Implement the inspector — accept the path (or repoRoot for multi-file inspectors), return `{ languages: DetectedLanguage[], frameworks: DetectedFramework[] }`.
3. Use a tolerant parser appropriate to the file format — JSON.parse for `*.json`, regex-per-line for plain-text manifests, minimal walk for TOML/YAML. No external parser dependencies — built-in Node `fs` and `path` only.
4. Register the inspector in `detectStack`'s dispatch logic (match the existing pattern for the other inspectors).
5. Add a fixture under `scripts/ai-skills/__fixtures__/stack-detect/<name>/` containing the package file with the framework signal.
6. Add a test in `scripts/ai-skills/stack-detect.test.ts` asserting detected language + framework + confidence + evidence path.
7. Document the inspector in the matrix above and bump this doc's "last verified" date if you keep one.

The fixture-driven test pattern keeps the suite tolerant to the parser quirks each format imposes — the test asserts the output shape, not the implementation detail.
