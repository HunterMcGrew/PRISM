# Rule Generation

The agent-facing reference for Atlas's per-team rule generators. Lives at `scripts/ai-skills/lib/rule-generators/` with the orchestrator at `scripts/ai-skills/lib/onboarding-run.ts`. Invoked from Atlas's interactive onboarding flow after stack detection and user prompts complete — the generators read `OnboardingConfig` (which carries the `DetectedStack` from PR-2.2) and emit one or more files into `.prism/rules/`.

See [ADR-0029](../spec/adrs/_toolkit/0029-rules-self-declare-applicability.md) for the applicability-declaration convention every generated rule follows. See [ADR-0040](../spec/adrs/_toolkit/0040-atlas-as-onboarding-persona.md) for the persona-level rationale.

## Public surface

```ts
runRuleGenerators(
  config: OnboardingConfig,
  repoRoot: string,
  options?: GenerateOptions
): Promise<RuleGenerationSummary>
```

The orchestrator invokes the three generators in a fixed declaration order and returns a flat summary the closing-summary renderer consumes directly. Individual generators are also exported (`generate` from each `rule-generators/<name>.ts` file) so tests can target one generator in isolation.

Every generator returns `Array<{ path: string; written: boolean; reason: string }>`. The orchestrator carries each entry into the summary with the generator name attached, so the closing summary can attribute every file back to the generator that produced it.

## Generator matrix

The generators run in this fixed order. Each row describes the gate that decides whether the generator emits a file at all, and what gets emitted when the gate fires.

| Generator | Gate | Emitted files |
| --- | --- | --- |
| `code-standards` | One file per detected language other than the `unknown` sentinel | `.prism/rules/code-standards-<lang>.md` for typescript, javascript, php, python, go, rust, ruby, elixir, java |
| `security` | Always emits the file with the universal section; per-stack sections gate on detected languages and frameworks | `.prism/rules/security.md` — universal + (typescript/javascript) + (php, with WordPress sub-section when wordpress is detected) + (django) + (go) + (rust) + (rails) |
| `framework-guidelines` | One file per detected framework that has a template | `.prism/rules/react-guidelines.md`, `next-guidelines.md`, `vue-guidelines.md`, `wordpress-guidelines.md`, `django-guidelines.md`, `rails-guidelines.md` |

Frameworks Atlas's stack detection can surface but that the framework-guidelines generator does not have a template for (Phoenix, Express, Fastify, NestJS, Spring, Actix-web, Axum, Rocket, Warp, Sinatra, Laravel, Symfony, Flask, FastAPI) are silently skipped. Adding a template extends the supported set without changing the generator contract.

## Skip-if-exists posture

Every generator checks for the target file before writing. When the file already exists, the generator returns `{ written: false, reason: 'exists — preserve team hand-edits; pass --force to regenerate' }` without touching disk. The reason string is stable — tests assert against it and the closing summary surfaces it verbatim.

**Why:** A team's first onboarding session emits the default rule content. From that moment on, the rule file is the team's surface — they hand-edit, they add team-specific anti-patterns, they prune sections that don't fit. A second onboarding run (reconfigure mode, stack change, dogfood re-test) must not silently overwrite that work. Skip-if-exists makes the safe default explicit; `--force` is the documented escape hatch for the rare case where the user genuinely wants the generator's content back.

The `force: true` option propagates through `runRuleGenerators` to every generator uniformly — there is no per-generator force override today, because the reconfigure flow (the only documented caller for force) wants all-or-nothing semantics.

## Applicability declaration

Every generated rule opens with an applicability declaration per ADR-0029. The shape is:

```markdown
# <Subject> <Rule Type>

These rules apply when <writing or reviewing what> in this repository.

<body>
```

Skills do not reference generated rule files by name. The agent loads every `.prism/rules/*.md` as Tier 2 context per `.prism/SPEC.md` and the applicability declaration tells the agent when each rule scopes in. This is the same convention the universal rules (`code-standards.md`, `accessibility.md`, `code-comments.md`) already follow.

The security generator's per-stack sections each open with their own sub-applicability declaration so an agent reading the composed file scopes correctly even when multiple language sections coexist.

## Adding a new generator

When a new rule class needs generator support:

1. Create `scripts/ai-skills/lib/rule-generators/<name>.ts`. Export a `generate` function matching the `RuleGenerator` type from `./types`.
2. Implement the gate — what makes this generator emit a file? Language match, framework match, always-emit, or some combination. The gate logic lives in the generator, not in the orchestrator.
3. Inline the templates. Template content is hand-authored markdown opened by an applicability declaration. Per-language or per-framework variation lives in a `Record<key, Template>` keyed by `DetectedLanguage["name"]` or `DetectedFramework["name"]`.
4. Implement the skip-if-exists check at the same shape as the existing generators — read the target path's existence, return `{ written: false, reason: REASONS.exists }` when found unless `options.force` is set.
5. Register the generator in `RULE_GENERATORS` in `onboarding-run.ts` with a stable name. The name appears in the closing summary so users can trace files back to generators.
6. Add tests in `scripts/ai-skills/rule-generators.test.ts` covering the four contract guarantees: happy path with applicability declaration check, skip-if-exists with byte-identical preservation, multi-input composition, and force-flag override.
7. Document the new generator in the matrix above.

The inline-template pattern keeps each generator self-contained — no separate template files to maintain, no template-loading layer to debug.
