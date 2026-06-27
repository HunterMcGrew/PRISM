# Atlas — Interactive Question Flow

One question per turn. Atlas saves state after each answer via `markStepComplete(state, '<step-name>')` so an interrupted session resumes cleanly.

---

## Question order

In `init-bootstrapped` mode, questions 1–5 are pre-seeded from the existing `config.json` and skipped when the on-disk value is present and non-empty; the flow resumes at question 6. See `modes.md` § init-bootstrapped.

1. **Project display name** — "What's the display name for this project? This shows up in PR descriptions, changelog headers, and the standup channel." Validates non-empty.
2. **Ticket prefix** — "What's your ticket prefix? Branches, commits, and PR titles use it (e.g. `PRISM-NNNN`). Must be uppercase letters and digits, starting with a letter." Validates against `/^[A-Z][A-Z0-9]+$/`.
3. **GitHub org/repo** — "What's the GitHub org and repo for this project? Eric, Sage, Reese, and Lilac all read from it." Validates both non-empty; the org is case-preserved.
4. **Ticket-system kind and workspace** — "Which ticket system do you use — Linear or GitHub Issues?" Then ask for the workspace slug (Linear) or the GitHub org/repo (GitHub Issues).
5. **Linear team key** — "What's the team key in Linear? It often matches your ticket prefix." Defaults to the ticket prefix from step 2 if the user accepts.
6. **Product domain** — "In one or two sentences, what does this product do? This populates a domain-context anchor in your persona sources." Freeform; Atlas trims and stores verbatim.
7. **Existing engineering standards** — "Do you already have engineering standards (style guides, ESLint configs, Cursor/ChatGPT rules)? Paste paths or 'none'." When paths supplied, Atlas reads each and routes per the rule-placement test in `.prism/SPEC.md`.
8. **Asset-path survey** *(first-contact mode only)* — see § Asset-path survey below. Fires immediately after existing-standards in `first-contact` mode; skipped in all other modes.
9. **Discovery sweep** *(first-contact mode only)* — see § Discovery-sweep below. Fires after the asset-path survey; skipped in all other modes.
10. **Slack channel (optional)** — "What Slack channel should Lilac post standup summaries to? Skip if you're not using Lilac yet." Optional; omitted from `slackChannel` when blank.
11. **Documentation setup** — see § Documentation question set below. Saved together under step `documentation-setup` when all four answers are accepted.

---

## Documentation question set

Atlas runs `detectDocLayout(<repo-root>)` before asking and proposes detected values as pre-filled defaults. Each sub-question is one turn within the single `documentation-setup` state step.

**11a. Location** — "Where do your user-facing docs live? (path relative to the repo root, e.g. `docs/`)" Pre-fill with detected `location` when found. Not validated for existence — onboarding may run before the directory is created.

**11b. Audience** — "Who reads these docs — developers using your tool, end users, or both? Common answers: `developer-user`, `end-user`, `mixed`." Pre-fill with `developer-user` when the detected stack is TypeScript/JavaScript and no `end-user`-shaped doc tool was found.

**11c. Keeps dev docs** — "Do you maintain separate internal/technical docs alongside the user-facing docs? (yes / no) This controls whether Eli runs the paired-doc workflow for newly written code." Boolean; stored as `keepsDevDocs`. No pre-fill — Atlas always asks explicitly.

**11d. Format** — "What format do these docs use? (e.g. `nextra-blocks`, `flat-markdown-guides`, `docusaurus-mdx` — or describe your own)" Pre-fill with `inferDocFormat(detectedLayout.tool)` when a tool was detected. Open string; any value the user types is valid.

When `detectDocLayout` returns non-empty evidence, Atlas frames each sub-question as "Does this look right?" rather than asking cold. When evidence is empty, Atlas asks plainly without a pre-fill.

**Skip path:** if the user answers "skip" or "none" to question 11a, Atlas omits the entire `documentation` block from the config write. Eli operates without it (falling back to its own heuristics) until the team configures it.

---

## Asset-path survey question set

*(first-contact mode only — immediately after existing-standards)*

Atlas asks one asset class per turn and presents auto-detected paths as a pre-filled default. All five answers save together under step `asset-path-survey`. The confirmed paths are stored on the onboarding state for the discovery sweep to consume.

**8a. Skills** — "I detected skills at `<detected paths>` (or: `No skill directories found at the standard locations`). Are those the right paths, or do your skills live somewhere else? (confirm / path / none)" Standard probes: `.claude/skills/`, `.cursor/skills/`, `.agents/skills/`.

**8b. Architect docs** — "I found architect docs at `<detected paths>` (or: `None found`). Confirm, or supply the correct path." Standard probe: `.prism/architect/*.md` excluding `_toolkit/`.

**8c. ADRs** — "I found ADRs at `<detected paths>` (or: `None found`). Confirm, or supply the correct path." Standard probe: `.prism/spec/adrs/*.md` excluding `_toolkit/`.

**8d. Rules** — "I found consumer rules at `<detected paths>` (or: `None found`). Confirm, or supply the correct path." Standard probe: `.prism/rules/*.md` files not in the PRISM install surface.

**8e. Docs** — "I detected a docs layout at `<detected path>` (or: `None found`). Confirm, or supply the correct path." Reuses the `DetectedDocLayout` result from Batch-1 probe 5 rather than re-running detection.

---

## Discovery-sweep question set

*(first-contact mode only — after asset-path survey)*

Atlas scans the **union** of auto-detected locations and user-supplied paths confirmed in the asset-path survey. For each asset class Atlas lists what it found and asks, per item, whether to adopt or leave. All answers save together under step `discovery-sweep`.

**Skills** — scan the union of platform skill directories and user-supplied skill paths. For each discovered skill, ask: adopt via `pnpm prism:migrate-skill <path>`, or leave untouched.

**Architect docs** — scan the union of `.prism/architect/*.md` (excluding `_toolkit/`) and user-supplied paths. Default is confirm consumer-owned — flat `.prism/architect/*.md` files are already `consumer` per `classifyPath`. Offer migration into `_toolkit/` only on explicit user request.

**ADRs** — scan the union of `.prism/spec/adrs/*.md` (excluding `_toolkit/`) and user-supplied paths. Same default and design as architect docs.

**Rules** — scan the union of `.prism/rules/*.md` not shipped by PRISM and user-supplied rule paths. For each, offer: route via the rule-placement test from `.prism/SPEC.md` (into `.prism/rules/`, `.prism/architect/`, or as an ADR), or leave under `.prism/custom/rules/`.

**Docs** — scan the union of the `DetectedDocLayout` result and the user-supplied docs path. Construct = record the established docs layout into the `documentation` config block via the documentation question set (question 11). No file moves; docs are recorded, not relocated.

---

## Confirmation before write

Once every question is answered, Atlas surfaces the full assembled config as a readable summary and asks "Write this config?" The user can accept, change a field (loop back to that question only), or abort. Atlas does not write `.ai-skills/config.json` without explicit user acceptance.
