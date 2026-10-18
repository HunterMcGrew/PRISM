---
name: prism-onboard
description: >
  Onboards a repo to PRISM: detects the team's stack, asks what detection
  cannot answer, writes `.ai-skills/config.json`, generates per-team rules, and
  regenerates the outputs so stub anchors fill. Runs once per install or stack
  change and resumes after an interruption. Triggers: "Atlas", onboard this
  repo, set up PRISM, first-time setup, configure for my team.
argument-hint: "[onboard | reconfigure | resume]"
category: onboarding
---

<!-- AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY. -->
<!-- Source: .ai-skills/skills/prism-onboard -->
<!-- Target: cursor | Regenerate with: pnpm prism:build -->

Onboards a repo to PRISM: detects the stack, asks only what detection cannot answer, writes `.ai-skills/config.json`, generates per-team rules into `.prism/rules/`, and regenerates the outputs so the stub anchors fill. Run it by explicit request, once per install and again on a stack change. Task: $ARGUMENTS

## Sequence

A consumer runs `prism init` (a skeletal config), then `prism adopt` (seeds `.prism/` and renders the skills), then this skill. It collects what `init` does not write, generates the rules, and finishes the config.

## Install context

Probe for `<repo-root>/scripts/ai-skills/`. Present means toolkit context (a PRISM clone). Absent means consumer context, where PRISM runs only through `npx @huntermcgrew/prism`. The probe changes the commands and nothing else:

| Step | Toolkit | Consumer |
| --- | --- | --- |
| Detect | `detectStack`, `detectDocLayout` (`scripts/ai-skills/lib/`) | `npx @huntermcgrew/prism detect`, JSON on stdout |
| Validate | inside `writeOnboardingConfig`, then `pnpm prism:check` | inside `prism update`, or `npx @huntermcgrew/prism doctor` |
| Regenerate | `pnpm prism:build` | `npx @huntermcgrew/prism update` |
| Seed-and-sync | `pnpm prism:adopt` | `npx @huntermcgrew/prism adopt` |

## Mode

Read `.ai-skills/config.json`, `.ai-skills/registry/onboarding-state.json`, and the asset signals in parallel, then take the first match:

1. **Resume.** The state file has incomplete steps, so continue at `nextIncompleteStep`. This comes first so a half-finished run is not read as a reconfigure.
2. **init-bootstrapped.** Config exists and the state file does not, since only `init` writes a config without state. Seed `project`, `ticketPrefix`, `ticketSystem`, `github`, and `slackChannel` from it and show them so the user can correct one. Re-detect `techStack` and never seed it. Ask only what `init` leaves empty: product domain, existing standards, documentation, and retro evidence. It does not suppress first-contact: when asset signals are present, run the asset survey and discovery sweep as well, since `adopt` has already written the sync manifest that mode 4 keys on.
3. **reconfigure.** Config and state both exist. Show each field and re-prompt only the ones the user names. The write preserves fields it does not know, such as `features.mainSessionMayMerge`, so never echo or reset them.
4. **first-contact.** `AGENTS.md`, skills under `.claude/`, `.cursor/`, or `.agents/`, or non-toolkit architect docs, ADRs, or rules exist, and `.prism/.sync-manifest.json` does not. It is first-install plus the asset survey, discovery sweep, and adopt step below.
5. **first-install.** The full guided flow. `dogfood-self` is the same flow without the survey stop, for the smoke-test harness.

## Survey, then ask

Open with what you found: the mode, the stack, the doc layout, the asset signals, and the questions still open. Then stop and ask the user to confirm the detection or correct it, because a misdetection flows into rule generation. `["unknown"]` is a valid result for an empty repo, so ask which stack they intend. Raise conflicting signals (TypeScript in `package.json`, no `.ts` files) in the survey and let the user resolve them.

Ask one question per turn, and call `markStepComplete` and `saveState` (step names in `ONBOARDING_STEPS`) before the next one. Two questions at once break resume. The order:

1. Project name, ticket prefix (`/^[A-Z][A-Z0-9]+$/`), GitHub org and repo, then ticket system (`linear` or `github-issues`, with workspace and team key for Linear).
2. Product domain, one or two sentences, which fills `atlas:domain-context`.
3. Existing engineering standards, as paths or "none". Route each by the placement test in the writing-a-rule guide: a rule, an architect doc, or an ADR.
4. First-contact, or init-bootstrapped with asset signals: the asset-path survey, then the discovery sweep.
5. Slack channel, optional.
6. Documentation: location, audience (`developer-user`, `end-user`, or `mixed`), `keepsDevDocs` (always asked, never pre-filled), and format. Pre-fill from the detected layout. "skip" or "none" on location omits the block.
7. Retro evidence for `prism-retro` (`retroEvidence`): CI system, PR platform, test command, and done gates. Pre-fill from `.github/workflows/`, the git remote, and `commands.test`. `OnboardingConfig` and `writeOnboardingConfig` have no `retroEvidence` field, so merge the block into `.ai-skills/config.json` yourself after the write, and later writes preserve it as an unknown field. `ONBOARDING_STEPS` has no step for it either, so mark `documentation-setup` complete only after both sets.

The asset-path survey confirms the detected path for each class, one class per turn, pre-filled from the standard probes: skills in `.claude/skills/`, `.cursor/skills/`, or `.agents/skills/`, architect docs in `.prism/architect/*.md` and ADRs in `.prism/spec/adrs/*.md` (both excluding `_toolkit/`), rules in `.prism/rules/*.md` that PRISM does not ship, and the detected docs layout. The discovery sweep then decides adopt or leave for each asset found. Skills adopt through `prism-skill-forge` in migrate mode. Architect docs and ADRs stay consumer-owned and move into `_toolkit/` only on request. Rules route by the writing-a-rule placement test or stay under `.prism/custom/rules/`. Docs are recorded in the `documentation` block and never moved.

## Confirm, generate, write

1. **Confirm.** Show the whole assembled config and each rule about to be written with its `load:` value. Language rules are generated with `load: paths` and framework guidelines and `security.md` with `load: always`. The user may change any of them, and the generators take no `load` input, so edit the frontmatter of the file after generating it. Write nothing without an explicit yes.
2. **Rules.** `runRuleGenerators` (`scripts/ai-skills/lib/onboarding-run.ts`) writes language rules, `security.md`, and framework guidelines. It skips a file that exists, with the reason "exists — preserve team hand-edits; pass --force to regenerate", because that file encodes team intent. Regenerate only on an explicit `--force`. `runRuleGenerators` has no try/catch, so if it throws, run the entries of the exported `RULE_GENERATORS` one at a time, report the failing generator's files as skipped with the error message, and continue with the others.
3. **Offer** the acceptance-criteria format (checklist or Gherkin) once, never on reconfigure, and rewrite `acceptance-criteria.md` to Gherkin if the team opts in. When the stack has UI files (`.tsx`, `.jsx`, `.vue`, `.svelte`, `.html`), add a one-line applicability declaration to `accessibility.md` and `design-governance.md` unless it is there.
4. **Write** with `writeOnboardingConfig`, which validates against `.ai-skills/config.schema.json` and writes atomically. A failure names the field and leaves the file untouched, so ask for a valid value.
5. **Regenerate** per the install-context table. Anchors fill during this step from the written config, so there is no anchor step, and `<!-- atlas:* -->` anchors stay in the skill sources. If regeneration fails, test one hypothesis per error and never report done over a broken build. For first-contact, run the seed-and-sync step before regenerating.

## Close

`initialState` seeds every step as pending, so mark each one complete when it finishes or when it is seeded, skipped, or not applicable (the Linear steps on a `github-issues` repo, the survey and sweep outside the modes that run them, a blank Slack channel, every field `init` wrote). Otherwise the next run resumes. That includes `stack-detection`, `rule-generation`, `anchor-substitution` (with regeneration, since no separate anchor step runs), `config-write`, and `build-verify`. Done means the config validated, `nextIncompleteStep` returns `null`, regeneration is green, and a second run with the same answers writes identical files. End with a summary of the mode, the detected stack, every file written and every file skipped with its reason, the anchors populated, the discovery decisions whenever the sweep ran, and for first-contact the adopt summary. Every file touched appears in it. Then suggest `prism-plan` for a change or `prism-start-ticket` for a ticket, and invoke neither.

<!-- Optional Cursor-only additions. Keep this file empty when not needed. -->
