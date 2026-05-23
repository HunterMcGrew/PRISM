# Rule Generation

How Atlas turns a `DetectedStack` into the per-team rules that ship in `.prism/rules/`. The agent-facing summary lives at [`.prism/architect/rule-generation.md`](../../../../.prism/architect/rule-generation.md); this doc walks the same surface with longer narrative and concrete examples of generated output.

## Why generators

PRISM ships a static universal rule set in `.prism/rules/` — code standards, accessibility, code comments, branch plan, git conventions. Those rules apply to every team regardless of stack. The per-team layer is everything stack-specific: TypeScript discipline, React component patterns, WordPress capability checks, Rails strong-parameters discipline. None of that ships statically because the right content depends on what the team actually uses.

A team running a Rails monolith does not want to load TypeScript guidelines; a team running Next.js does not want to load WordPress hook discipline. The generator surface emits only what the stack detection found, so the team's `.prism/rules/` directory after onboarding mirrors the team's actual code rather than a kitchen-sink of every supported language.

The decision to generate at onboarding time instead of routing dynamically lives in [ADR-0029](../../../../.prism/spec/adrs/0029-rules-self-declare-applicability.md). The short version: rules in `.prism/rules/` are auto-loaded as Tier 2 context per the PRISM SPEC, and each rule self-declares when it applies. Generators emit, the agent picks up — no manifest, no discovery layer, no skill-to-rule coupling.

## The three generators

### code-standards

Emits one file per detected language. The slug matches the language name (`code-standards-typescript.md`, `code-standards-php.md`, etc.). The body is hand-authored for each language in `LANGUAGE_TEMPLATES` inside `code-standards.ts` — sections cover types, naming, error handling, tests, and any language-specific concern that pays for the entry.

A TypeScript-only repo gets one file. A multi-language repo (say, TypeScript frontend + PHP/WordPress backend) gets `code-standards-typescript.md` and `code-standards-php.md` — each file opens with an applicability declaration scoping the rule to its own language so an agent editing a `.tsx` file doesn't apply PHP rules and vice versa.

The `unknown` sentinel language from stack detection skips the code-standards generator entirely. Atlas surfaces unknown stacks to the user during the survey rather than emitting code-standards files the team can't act on.

### security

Emits a single composed file at `.prism/rules/security.md`. The shape is fixed: a universal section that always appears, followed by per-stack sections that gate on the detected languages and frameworks.

The universal section covers secrets, dependency hygiene, input validation at the boundary, and logging discipline — concerns that apply regardless of stack. The per-stack sections appear conditionally:

- **TypeScript / JavaScript** appears when JS or TS is detected — covers XSS via DOM injection, prototype pollution discipline, and `dangerouslySetInnerHTML` rules.
- **PHP** appears when PHP is detected — covers output escaping, parameterized SQL, and file-operation discipline. When `wordpress` is also detected, a WordPress-specific sub-section adds nonce verification, capability checks, and `$wpdb->prepare` discipline.
- **Django** appears when the django framework is detected — CSRF middleware, template auto-escape, ORM parameter binding, and settings hygiene.
- **Go** appears when Go is detected — `html/template` over `text/template`, parameterized SQL, `crypto/rand` for security-sensitive randomness.
- **Rust** appears when Rust is detected — `unsafe` review bar, `unwrap()` in production paths, `serde` deserialization validation.
- **Rails** appears when the rails framework is detected — `strong_parameters`, CSRF protection, `html_safe` discipline, ActiveRecord query parameterization.

Composing into one file (rather than emitting `security-typescript.md`, `security-php.md`, etc.) keeps security cross-references discoverable. A reviewer looking for "what should I check on this PR" finds the universal section and every per-stack section that applies in one place.

### framework-guidelines

Emits one file per detected framework that has a template. The slug matches the framework name (`react-guidelines.md`, `next-guidelines.md`, `wordpress-guidelines.md`, etc.). Content covers patterns specific to the framework's idioms — server vs client component discipline for Next.js, hook rules for React, capability checks for WordPress, ActiveRecord patterns for Rails.

Frameworks the detector can surface but the generator does not have a template for (Phoenix, Express, Fastify, NestJS, Spring, Actix-web, Axum, Rocket, Warp, Sinatra, Laravel, Symfony, Flask, FastAPI) are silently skipped. The detector and the generator are decoupled — adding a template extends the supported set without touching the detector.

## Skip-if-exists is the default

Every generator checks for the target file before writing. When the file exists, the generator returns `{ written: false, reason: 'exists — preserve team hand-edits; pass --force to regenerate' }` and leaves the file untouched. The reason string is stable across runs so the closing summary and the test suite can both assert against the same literal.

The reason this matters: a team's first onboarding session emits the default rule content. From that moment forward, that file is the team's surface. They edit it. They add team-specific anti-patterns. They prune sections that don't fit. A second onboarding run — reconfigure mode after a stack change, or a dogfood re-test — must not silently destroy that work.

The `--force` escape hatch exists for the rare case where the user genuinely wants to regenerate. Atlas's reconfigure mode prompts before passing `force: true` to `runRuleGenerators`. The propagation is uniform — there is no per-generator force override, because the reconfigure flow wants all-or-nothing semantics.

## Generated output, end to end

A run against a fixture repo with `package.json` declaring `react` and `next`, plus `composer.json` declaring `johnpbloch/wordpress-core`, would emit:

```
.prism/rules/
  code-standards-typescript.md
  code-standards-php.md
  security.md            # universal + JS/TS + PHP/WordPress sections
  react-guidelines.md
  next-guidelines.md
  wordpress-guidelines.md
```

Every file opens with a heading line, an applicability declaration immediately below it, and the rule body. The summary surface (`RuleGenerationSummary` from `onboarding-run.ts`) carries six entries — six `written: true` results — that Atlas's closing summary lists with their reasons.

A second invocation of `runRuleGenerators` against the same repo returns six `written: false` entries, each with `reason: 'exists — preserve team hand-edits; pass --force to regenerate'`. The team's hand-edits survive.

## See also

- [`.prism/architect/rule-generation.md`](../../../../.prism/architect/rule-generation.md) — agent-facing reference. Same matrix and contract; shorter.
- [`.prism/architect/stack-detection.md`](../../../../.prism/architect/stack-detection.md) — the detector that produces the `DetectedStack` these generators consume.
- [`docs/content/dev/architecture/stack-detection.md`](./stack-detection.md) — paired dev doc for the detector.
- [ADR-0029](../../../../.prism/spec/adrs/0029-rules-self-declare-applicability.md) — the applicability-declaration convention every generated rule follows.
- [ADR-0040](../../../../.prism/spec/adrs/0040-atlas-as-onboarding-persona.md) — the persona-level rationale for Atlas as a whole.
