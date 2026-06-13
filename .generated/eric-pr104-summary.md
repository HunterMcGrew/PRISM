## Eric's Review — PR #104 (Sol Conductor — Foundation)

Oh, this is a fun one. A goal-driven orchestration persona plus a genuinely novel build-system extension, and the rest is canonical skill source / generated mirrors. I read the build code with fresh eyes, then checked the diff against the epic plan's Decisions and AC. Reviewed in-branch; PR stays draft.

Really nice work overall — the build extension is the only new code in the foundation and it's clean, well-typed, and well-tested (especially after the self-review pass added the utility-skip coverage).

### Standards findings

Clean. Specific things I liked and verified:

- **`removeDeletedManagedAgentFiles` generalization** (`scripts/ai-skills/build.ts`) — taking `extension` + `headerLine` params and switching `entry.name.replace(/\.toml$/, "")` to `entry.name.slice(0, -extension.length)` is the right call. The `slice` is gated by the preceding `endsWith(extension)` so it can't underflow, and it reads cleaner than the regex it replaced. The inline comment explaining why the header match moved from `startsWith` to `includes` (TOML leads with the header; the Markdown agent def carries it after YAML frontmatter) is exactly the "what + why" our comment rule asks for.
- **`startsWith`→`includes` safety** — confirmed safe. Every `.claude/agents/*.md` is build-generated and carries the marker after the frontmatter, and there are no hand-authored files in that dir, so `includes` can't false-positive. `.toml` cleanup behavior is unchanged (`includes` is a strict superset of `startsWith` when the header leads at position 0).
- **`buildClaudeAgentMarkdown`** — `JSON.stringify` for the YAML `description` scalar is robustly correct (JSON strings are valid YAML double-quoted scalars, and it escapes the embedded `"Sol"` quotes for free). The `\s+`→` ` collapse is necessary because the canonical description is a folded multi-line `>` scalar. `CLAUDE_AGENT_MODEL_DEFAULTS` earns its place — two consumers (the emitter + the test).
- **Opt-in gate + double-substitution symmetry** — `claudeAgentsRootHasManagedContent` mirrors the codex gate exactly, and both emitters source `description` from the raw canonical frontmatter and substitute it exactly once. No double-substitution of the body (it's pre-substituted upstream in `buildSkillMarkdown`).
- **Literal-allowlist** — the new `.claude/agents/prism-code-dev.md` entry is load-bearing (it's the only persona whose emitted agent def actually carries a surviving literal, `THR-1881`). The architect/qa-test-plan entries are harmless and faithfully mirror the existing codex-agents precedent.

Test coverage: `claude-agent-def.test.ts` covers the builder (frontmatter, model defaults, body, description collapse) and now the emitter's utility-skip contract via a roles.json integration assertion. Good coverage on the new code.

### Spec findings

One Minor — a documentation sweep the reconciliation missed.

- **Minor — stale `type: "persona"` references in the plan contradict the reconciliation Decision and the shipped code.** `.prism/plans/epic-prism-conductor.md` corrects the roles.json schema to `{ id, persona }` (no `type` field) in task 1 and in the "Group 1 reconciliation" Decision — and the shipped `roles.json` correctly uses `{ id, persona }`. But two older spots still say `type: "persona"`:
  - The first `## Decisions` entry's implementation-guidance sub-bullet (`` `type: "persona"` in roles.json ``)
  - The non-behavioral AC item (`` `type: "persona"` registered in `.ai-skills/definitions/roles.json` ``)

  These predate this PR and weren't swept when the reconciliation landed, so they aren't in this PR's diff (which is why this is a summary note, not an inline comment). The code is right; the durable plan record contradicts itself. Per `code-standards.md` § Removal and rename completeness, a corrected concept should be swept tree-wide. Suggested fix: update both to `{ id, persona }` (no `type` field), matching the reconciliation Decision.

### Cross-cutting observations

- **AC "per-runtime agent definitions (`.claude/agents/`, `.codex/agents/`, `.cursor/agents/`)" is an epic-spanning AC, correctly left open.** Group 1 ships Claude-only by design (the reconciliation Decision defers `.cursor/agents/`; `.codex/agents/` already existed). The AC checkbox is unchecked, so this isn't a miss — just flagging that this AC closes across the epic, not in Group 1.
- **Pre-existing Windows-only `atlas-dogfood` test failure** — confirmed failing identically on clean `origin/main` (forward-slash path assertion vs Windows backslash output). Out of scope for this PR; not introduced here. Worth a separate follow-up to make the assertion path-separator-agnostic.
- **Pre-existing stale literal-allowlist entries** — `prism-architect` / `prism-qa-test-plan` are allowlisted across all mirror surfaces citing `THR-1636`/`THR-1630`, but those incident citations are no longer in the skill bodies. This PR faithfully extends the stale pattern (it didn't create it). Follow-up candidate to sweep the allowlist.

### PR Readiness

Foundation is solid and the code is ready. One Minor doc-sweep on the plan (the stale `type: "persona"` references) — fix it or reply on this thread if you'd rather batch it into the epic-close sweep, then re-run me and I'll mark it ready for human review. PR stays draft until then.

Labels: `effort:quick`, `review:has-minors`
