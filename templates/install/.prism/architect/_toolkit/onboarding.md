# Onboarding

The architect-level record of how Atlas onboards a consuming team into PRISM. This doc captures the lasting decisions from the Phase 2 epic so future contributors don't have to reconstruct them from the plan file.

See the `prism-onboarding` skill (Atlas) for the workflow.

## Atlas is a dedicated persona

Atlas is its own skill, not a Winston sub-mode. Winston is reactive (he evaluates an approach the user brings him); onboarding is proactive (Atlas drives the conversation and asks the user questions). The cadence and invocation surface are fundamentally different.

Atlas joins Zoe as a cadence-driven persona — distinct from Zoe in cadence and surface (Atlas writes durable config; Zoe writes audit reports), but sharing the proactive shape that ticket-flow personas don't have.

## Security guidance is Atlas-generated per stack

Stack-specific security concerns (Django CSRF middleware, WordPress nonce verification, Rust `unsafe` discipline) don't compose into a single universal rule without becoming either too generic to act on or too long to load on every chat. PRISM ships no universal `security.md` — Atlas generates `.prism/rules/security.md` per detected stack during onboarding, with the applicability declaration each generated rule carries. Multi-language repos get composite sections from a single generator run.

See [`rule-generation.md`](./rule-generation.md) for the generator matrix.

## Stub-anchor pattern uses HTML comments

Canonical persona sources need to stay readable as markdown. A templating language (Mustache, Handlebars, etc.) would introduce another syntax for contributors to learn and another build-time dependency. PRISM uses `<!-- atlas:<name> -->` open / `<!-- atlas:end -->` close markers — invisible in markdown previews, parseable with simple string operations, and namespaced so they can't accidentally match unrelated content.

See [`anchor-substitution.md`](./anchor-substitution.md) for the schema and idempotency contract.

## Skip-if-exists is Atlas's update posture

Teams hand-edit generated rules to encode patterns Atlas can't infer. Overwriting silently destroys that work. Every Atlas generator follows skip-if-exists: when a target file already exists, the generator returns `{ written: false, reason: 'exists — preserve team hand-edits; pass --force to regenerate' }`. The `--force` flag is the explicit escape hatch when the team wants the refresh — opt-in, not opt-out.

## Unknown-stack sentinel for empty repos

An empty repo is a valid input — someone might run Atlas before adding any code. `detectStack` returns `{ languages: [{ name: 'unknown', confidence: 'high', evidence: [] }], frameworks: [] }` for empty or unrecognized repos rather than throwing. Atlas's flow checks for the unknown sentinel and asks the user "I didn't find any package files — what stack will this repo use?" The flow continues normally with user-supplied stack.

## PRISM-first dogfood

Atlas's first dogfood target was PRISM itself, not a consumer team. The dogfood pattern is already load-bearing across many of PRISM's design decisions (the install runs against itself, the rules apply to PRISM's own development, the personas are tested in PRISM's own ticket flow) — PRISM-first Atlas dogfood is the natural extension. Real-consumer dogfood remains valuable as a follow-up validation after the PRISM-first dogfood lands clean.

The smoke-test harness at `scripts/ai-skills/atlas-dogfood.test.ts` carries the regression catch for both PRISM-self and future consumer-team onboardings.

## Workflow order

Atlas runs each step in fixed order so reconfigure and resume behave predictably:

1. Read existing config (`.ai-skills/config.json`) if present — drives reconfigure vs. first-install mode selection.
2. Detect stack (`detectStack`) before any user prompts.
3. Ask the user the questions detection can't answer (project name, ticket prefix, GitHub org/repo, ticket-system workspace, product domain).
4. Write config (`writeOnboardingConfig`).
5. Run rule generators in declaration order (`code-standards` → `security` → `framework-guidelines`).
6. Run anchor substitution across canonical persona sources (`substituteAnchorsAcrossSkills`).
7. Emit closing summary listing every file's `written` / `skipped` status.

Step completion is tracked in `.ai-skills/registry/onboarding-state.json` for resume-from-interruption.
