---
name: prism-forge-skill
description: >
  Scaffolds a new PRISM skill from scratch, or migrates an existing platform
  skill into canonical source. Create mode writes frontmatter.yml, shared.md,
  and the roles.json entry. Migrate mode decomposes a generated .claude,
  .cursor, or .agents SKILL.md, or a .codex agent .toml, back into source. Both
  end with pnpm prism:build. Triggers: create skill, scaffold skill, new skill,
  add persona, migrate skill, decompose skill, import skill.
argument-hint: "[create | migrate] [skill id or source path]"
---

<!-- AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY. -->
<!-- Source: .ai-skills/skills/prism-forge-skill -->
<!-- Target: claude | Regenerate with: pnpm prism:build -->

Scaffolds a new PRISM skill, or migrates an existing platform skill back into canonical source. Pick the mode from `$ARGUMENTS`, or ask: **create** or **migrate**. Task: $ARGUMENTS

## Install context

Probe for `<repo-root>/scripts/ai-skills/`. Present means toolkit context (a PRISM clone). Absent means consumer context, where PRISM runs only through `npx @huntermcgrew/prism` and the repo holds no `.ai-skills/skills/`, no `roles.json`, and no build. The probe changes the steps and nothing else. The Create and Migrate sections below are toolkit context, and a consumer follows the first row and the shared rules:

| Step | Toolkit | Consumer |
| --- | --- | --- |
| Where a skill lives | Canonical source in `.ai-skills/skills/<id>/` plus a `roles.json` entry, which `pnpm prism:build` regenerates into every platform copy. Never hand-edit a generated file, since it drifts the next build | A `SKILL.md` written by hand into the skill dir of each host in `hosts` (`.claude/skills/<id>/`, `.agents/skills/<id>/`, `.cursor/skills/<id>/`), under the consumer's own prefix |
| Verify | `pnpm prism:build`, then `pnpm prism:check-types` | None. `npx @huntermcgrew/prism doctor` reports install health and does not check a skill |
| Migrate | `pnpm prism:migrate-skill <source>`, then the Migrate steps | Does not apply. A skill already in a platform dir is consumer-owned and `prism update` never touches it, so leave it there |

## Both contexts

- **ID namespace.** `prism-*` belongs to PRISM, along with the bare ID `tdd` (`checkIsPrismSkillId` in `scripts/ai-skills/ownership.ts`), and an update regenerates only those IDs. A consumer's skill takes the org token from `.ai-skills/config.json` (`<org>-<role>`, lowercased) or `custom-<role>` when there is none. Only a skill contributed back to PRISM itself ships a `prism-*` ID, and that ID is a verb such as `prism-self-review`.
- **Authoring.** The body passes the four tests and follows the layout in `.prism/architect/guides/writing-a-skill.md`. A line that fails a test is cut, never moved into a reference or step file, because the loaded-lines check counts those too.
- **Description shape.** Sentence 1 says what the skill does. An optional sentence 2 states a boundary that steers routing away from work the skill does not do. A `Triggers:` line lists distinctive phrases and, when the skill renames or replaces a persona, the old persona name in quotes so a request by that name still routes. The cap is 1,000 characters so Codex discovery can expose the skill, and a multi-line value uses a folded `>` scalar because a plain continuation silently truncates to its first line. The generated body caps at 500 lines (`MAX_SKILL_BODY_LINES`).

## Create (toolkit)

1. **Persona or utility.** A persona is a role users address by name. It has a `persona` key in `roles.json` and generates a Codex agent adapter at `.codex/agents/<id>.toml` and a Claude agent definition at `.claude/agents/<id>.md`. A utility is an action any session can run. It declares `"type": "utility"` and generates neither, since `generate-skills.ts` writes them only when `roleDefinition.type !== "utility"`. If the new skill's job overlaps an existing skill's (same trigger phrases, same artifact), read that skill and ask the user whether to extend it instead of adding another.
2. **Collect and write.** Collect the ID, written so a user who has never met the name can find it by what it does, plus the persona name and three to eight trigger keywords for a persona or function keywords only for a utility. Write `frontmatter.yml` (`name`, the description, and `argument-hint` when the skill takes arguments) and `shared.md`. Add `claude.md`, `codex.md`, or `cursor.md` only when a platform needs content the others do not, because a header-only placeholder breaks `.prism/rules/lazy-artifacts.md`.
3. **Register** `{ "id", "persona", "routing": "named-only" }` for a persona or `{ "id", "type": "utility", "routing": "named-only" }` for a utility. `buildRoleMap` throws on a utility that carries a `persona`. Flip a skill to `"auto"` only in the change that adds its row to `.prism/rules/skill-routing.md`, because `routing-coverage.test.ts` requires the two to land together.
4. **Build and verify.** A red build means the source is wrong. Test one hypothesis per error, fix the source, and never edit the generated output. After three failed hypotheses, stop and tell the user the failing hypothesis, the exact build error, and the suspect file. Then confirm a utility produced no `.codex/agents/<id>.toml` or `.claude/agents/<id>.md` and a persona produced both.

## Migrate (toolkit)

Run `pnpm prism:migrate-skill <source>` first. It handles an unambiguous single copy. Fall back to the steps below when it flags ambiguity: an unclear persona or utility, platform copies that diverged, or substituted token values.

1. **Pick the source.** Prefer `.agents/skills/<id>/SKILL.md`, the least platform-specific, then the `.claude` or `.cursor` copy. Use `.codex/agents/<id>.toml` only when no skill markdown exists, because unwrapping the TOML loses more.
2. **Extract.** Split the `---` frontmatter into `frontmatter.yml` and the body into `shared.md`, as `splitFrontmatter` in `scripts/ai-skills/bootstrap-from-claude.ts` does. The helpers in that file are module-private, so write equivalent logic inline or in a migration script and do not import them. From a TOML, drop the generated header, the `name` and `description` keys, the `developer_instructions` fence, and the `You are <Name>.` opener, and keep the persona name for `roles.json`.
3. **Strip generated artifacts, recover differences.** Remove the `# AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.` header and the `.ai-skill-generated` marker. Turn a resolved team value back into its token only where it clearly maps to one, and flag every other literal for the user. Put platform differences into `claude.md`, `codex.md`, or `cursor.md` only when the copies diverge, and otherwise everything goes in `shared.md`.
4. **Persona or utility.** A source that opens `You are <Name>` or routes on a name is a persona, and one that opens with a procedure is a utility. If the source is too incomplete to tell, ask the user to declare the type rather than guess.
5. **Normalize, register, build.** Rename the ID into the consumer namespace unless the skill goes to PRISM, and fix cross-skill references the way `rewriteSkillIdReferences` does. Never overwrite canonical source that already exists unless the user asks to force it, as `writeIfMissingOrForce` does, so a re-run is safe. Add the `roles.json` entry and build. Confirm the regenerated copies match the source you started from, apart from re-tokenized values. If they differ, diff against the original, since the delta shows what extraction missed or over-included.

Migrating a hand-authored Cursor `.mdc` rule needs the reverse of `cursorRuleDialect` in `scripts/ai-skills/rule-dialect.ts` and is not covered here. Flag it as follow-up work per `.prism/rules/followup-scope.md`.
