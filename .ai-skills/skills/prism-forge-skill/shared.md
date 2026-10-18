Scaffolds a new PRISM skill, or migrates an existing platform skill back into canonical source. It writes only `.ai-skills/skills/<id>/` and the matching entry in `.ai-skills/definitions/roles.json`, then lets `pnpm prism:build` regenerate every platform copy. It never hand-edits a generated file, because the pipeline is the single source and a hand-written copy drifts the next time the pipeline changes. Pick the mode from `$ARGUMENTS`, or ask: **create** or **migrate**. Task: $ARGUMENTS

## Both modes

- **ID namespace.** `prism-*` belongs to PRISM, and an update regenerates only those IDs (`PRISM_OWNED_GLOBS` in `scripts/ai-skills/ownership.ts`). A consumer's skill takes the org token from `.ai-skills/config.json` (`<org>-<role>`, lowercased) or `custom-<role>` when there is none, so an update never touches it. Only a skill contributed back to PRISM itself ships a `prism-*` ID, and that ID is a verb such as `prism-self-review`.
- **Authoring.** The body passes the four tests and follows the layout in the writing-a-skill guide, which the manifest routes on `.ai-skills/skills/**`. A line that fails a test is cut, never moved into a reference or step file, because the loaded-lines check counts those too.
- **Description shape.** Sentence 1 says what the skill does. An optional sentence 2 states a boundary that steers routing away from work the skill does not do. A `Triggers:` line lists the old persona name in quotes, plus distinctive phrases. The cap is 1,000 characters, and a multi-line value uses a folded `>` scalar because a plain continuation silently truncates to its first line. `.prism/rules/skill-authoring.md` § Description field shape is the reference.
- **Build limits.** The generated body caps at 500 lines (`MAX_SKILL_BODY_LINES`), and the description caps at 1,000 characters, asserted by `discovery-metadata.test.ts` so Codex discovery can expose the skill.
- **Finish with the build.** Run `pnpm prism:build`, which also runs `prism:test`, then `pnpm prism:check-types`. A red build means the source is wrong. Test one hypothesis per error, fix the source, and never edit the generated output. After three failed hypotheses, stop and tell the user the failing hypothesis, the exact build error, and the suspect file.

## Create

1. **Persona or utility.** A persona is a role users address by name. It has a `persona` key in `roles.json` and generates a Codex agent adapter at `.codex/agents/<id>.toml`. A utility is an action any session can run. It declares `"type": "utility"` and generates no adapter, since `build.ts` writes one only when `roleDefinition.type !== "utility"`. If the new skill's job overlaps an existing skill's (same trigger phrases, same artifact), read that skill and ask the user whether to extend it instead of adding another.
2. **Collect** the ID, written so a user who has never met the name can find it by what it does. For a persona, also collect the name and three to eight trigger keywords. For a utility, collect function keywords only.
3. **Write** `frontmatter.yml` (`name`, the description, and `argument-hint` when the skill takes arguments) and `shared.md`. Add `claude.md`, `codex.md`, or `cursor.md` only when a platform needs content the others do not, because a header-only placeholder breaks `.prism/rules/lazy-artifacts.md`.
4. **Register** `{ "id", "persona", "routing": "named-only" }` for a persona or `{ "id", "type": "utility", "routing": "named-only" }` for a utility. `buildRoleMap` throws on a utility that carries a `persona`. Flip a skill to `"auto"` only in the change that adds its row to `.prism/rules/skill-routing.md`, because `routing-coverage.test.ts` requires the two to land together.
5. **Verify** that a utility produced no `.codex/agents/<id>.toml` and that a persona produced one.

## Migrate

Run `pnpm prism:migrate-skill <source>` first. It handles an unambiguous single copy. Fall back to the steps below when it flags ambiguity: an unclear persona or utility, platform copies that diverged, or substituted token values.

1. **Pick the source.** Prefer `.agents/skills/<id>/SKILL.md`, the least platform-specific, then the `.claude` or `.cursor` copy. Use `.codex/agents/<id>.toml` only when no skill markdown exists, because unwrapping the TOML loses more.
2. **Extract.** Split the `---` frontmatter into `frontmatter.yml` and the body into `shared.md`, as `splitFrontmatter` in `scripts/ai-skills/bootstrap-from-claude.ts` does. From a TOML, drop the generated header, the `name` and `description` keys, the `developer_instructions` fence, and the `You are <Name>.` opener, and keep the persona name for `roles.json`.
3. **Strip generated artifacts.** Remove the `# AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.` header and the `.ai-skill-generated` marker. Turn a resolved team value back into its token only where it clearly maps to one, and flag every other literal for the user.
4. **Recover platform differences** into `claude.md`, `codex.md`, or `cursor.md` only when the copies diverge. When they match, everything goes in `shared.md`.
5. **Persona or utility.** A source that opens `You are <Name>` or routes on a name is a persona, and one that opens with a procedure is a utility. If the source is too incomplete to tell, ask the user to declare the type rather than guess.
6. **Normalize, register, build.** Rename the ID into the consumer namespace unless the skill goes to PRISM, and fix cross-skill references with `rewriteSkillIdReferences` from `bootstrap-from-claude.ts`. Add the `roles.json` entry and build. Confirm the regenerated copies match the source you started from, apart from re-tokenized values. If they differ, diff against the original, since the delta shows what extraction missed or over-included.

Migrating a hand-authored Cursor `.mdc` rule needs the reverse of `cursorRuleDialect` in `scripts/ai-skills/rule-dialect.ts` and is not covered here. Flag it as follow-up work per `.prism/rules/followup-scope.md`.
