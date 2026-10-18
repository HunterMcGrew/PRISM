# Token Substitution

Which build passes substitute team tokens into shipped content, and the rule that keeps an optional token from crashing a consumer's install. This is build-internal, maintainer-facing content, excluded from the install seed. The consumer-facing install flow is [`consumer-sync-flow.md`](./consumer-sync-flow.md).

---

## Which passes substitute tokens

Content reaches a platform directory through three copy paths, and two of them substitute tokens. Knowing which is which matters because a token literal that resolves on one path is copied verbatim by another.

- **Platform-copy pass: substitutes.** `copyContentToPlatformDir` in `scripts/ai-skills/build.ts` walks every `COPIED_CONTENT_AREAS` area (`rules`, `architect`, `spec`, `templates`, `references`) plus the loose `SPEC.md`. It writes each file through `copyContentFileWithSubstitution`, which runs `substituteTokens` before writing to `.claude/`, `.codex/`, and `.cursor/`. PRISM's own build runs it with PRISM's config. A consumer's `prism update` runs the same pass through `refreshPlatformDirs` in `scripts/ai-skills/update.ts`, with the consumer's own token map. So a token literal under `.prism/references/**` or `.prism/templates/**` resolves at copy time. The `PROJECT` token in `.prism/templates/standup-summary.md` is one, and the platform copies of that file carry the resolved value, not the token.
- **Skill-body render: substitutes.** `buildSkillMarkdown` in `scripts/ai-skills/generate-skills.ts` assembles `shared.md` with the platform file and passes the result through `applyAnchorsThenTokens`, which substitutes anchors and then tokens.
- **Skill-payload copy: does not substitute.** `syncOptionalSkillPayloads` in `generate-skills.ts` copies a skill's optional `assets/`, `references/`, `scripts/`, and `agents/openai.yaml` from `.ai-skills/skills/<id>/` with `fs.copyFile` and `fs.cp`. It never calls `substituteTokens`. No skill under `.ai-skills/skills/` ships any of these payloads today, so the pass copies nothing. A token literal placed in a payload would reach the consumer verbatim.

A class-level guard that checks "does every token literal have a default" scans what gets substituted. A payload is never substituted, so a shell variable in a payload script is not a build token, and a guard that scanned payloads would report it falsely.

## Optional tokens must default in `deriveTokenMap`

A token that any substituted content references must be present in the map `deriveTokenMap` (`scripts/ai-skills/lib/tokens.ts`) produces, even when the underlying config field is optional and absent. That covers skill bodies and every copied content area. `substituteTokens` throws on the first unmapped reference, so an optional token left unmapped crashes `prism adopt` and `prism update` for any consumer whose config omits that field.

The pattern is to default the optional token to an empty string rather than gate its `set` on field presence:

```ts
tokenMap.set("SLACK_CHANNEL", config.slackChannel ?? "");
```

The empty string is a first-class "not configured" state, not an error — downstream skill logic routes on it (Lilac treats an empty `${SLACK_CHANNEL}` as "no channel configured" and falls through to a pasteable block instead of auto-posting). A conditional `if (typeof config.slackChannel === "string")` set is the bug shape: it leaves the token unmapped when the field is absent, and a cold `init`→`adopt` (which never writes optional fields) crashes.

The class-level backstop is `scripts/ai-skills/optional-token-coverage.test.ts`: it builds the token map from a minimal cold-`init` config (every optional field skipped), runs `substituteTokens` over every shipped skill body, and asserts no throw. A new optional token added to skill content without a default in `deriveTokenMap` fails this test deterministically. The test scans skill bodies only. A token used in a copied content area such as `.prism/references/**` follows the same default rule, but this test does not read those files.
