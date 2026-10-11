# Token Substitution

Which build passes substitute team tokens into shipped content, and the rule that keeps an optional token from crashing a consumer's install. This is build-internal, maintainer-facing content, excluded from the install seed. The consumer-facing install flow is [`consumer-sync-flow.md`](./consumer-sync-flow.md).

---

## Two substitution passes, two surfaces

Content reaches a consumer through two distinct passes, and only one of them substitutes tokens. Confusing the two is how a token reference that is safe in one surface crashes in the other — so the distinction is load-bearing.

- **Build-time platform-copy pass** — `copyContentFileWithSubstitution` in `scripts/ai-skills/build.ts` reads each canonical `.prism/<area>/` file, runs `substituteTokens` over it, and writes the result into the platform dirs (`.claude/`, `.codex/`, `.cursor/`). `references` is one of `COPIED_CONTENT_AREAS`, so `.prism/references/**` **is** token-substituted on this pass — against the PRISM maintainer's own dogfood config. A token literal in a reference file resolves here.
- **Adopt-time skill-payload pass** — `syncOptionalSkillPayloads` in `scripts/ai-skills/generate-skills.ts` copies each skill's optional payloads (`assets/`, `references/`, `scripts/`, `agents/openai.yaml`) into the consumer's platform skill dirs via `fs.copyFile` / `fs.cp` with **no** `substituteTokens` call. A token literal in a skill-payload reference is copied verbatim and resolved at the persona's runtime (e.g. Lilac reading the `SLACK_CHANNEL` token out of `phases.md`), never by the build.

The skill body itself is the other adopt-time surface that **does** substitute: `buildSkillMarkdown` assembles the skill and passes it through `applyAnchorsThenTokens`, which substitutes anchors and then tokens. So at adopt-time, skill bodies are substituted and skill payloads are not.

The practical consequence: any class-level guard that checks "does every token literal in shipped content have a default" must scan exactly the substitution surface — skill bodies (`shared.md` + platform `claude.md`/`codex.md`/`cursor.md`), not skill `references/` payloads. Scanning payloads would false-positive on runtime shell variables that are never build tokens.

## Optional tokens must default in `deriveTokenMap`

A token that any shipped skill body references must be present in the map `deriveTokenMap` (`scripts/ai-skills/lib/tokens.ts`) produces — even when the underlying config field is optional and absent. `substituteTokens` throws on the first unmapped reference, so an optional token left unmapped crashes the adopt-time skill-body pass for any consumer whose config omits that field.

The pattern is to default the optional token to an empty string rather than gate its `set` on field presence:

```ts
tokenMap.set("SLACK_CHANNEL", config.slackChannel ?? "");
```

The empty string is a first-class "not configured" state, not an error — downstream skill logic routes on it (Lilac treats an empty `#prism-dev` as "no channel configured" and falls through to a pasteable block instead of auto-posting). A conditional `if (typeof config.slackChannel === "string")` set is the bug shape: it leaves the token unmapped when the field is absent, and a cold `init`→`adopt` (which never writes optional fields) crashes.

The class-level backstop is `scripts/ai-skills/optional-token-coverage.test.ts`: it builds the token map from a minimal cold-`init` config (every optional field skipped), runs `substituteTokens` over every shipped skill body, and asserts no throw. A new optional token added to skill content without a default in `deriveTokenMap` fails this test deterministically. This is the gate that the three consecutive cold-start token bugs lacked.
