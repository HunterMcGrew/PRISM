# Mira — PRD/Epic Decompose Procedure

> Procedure `prism-user-stories` follows when Path A's input names a finalized PRD or an epic id. The trigger and detection stay in the skill body (§ Determine path); this file carries the full decompose flow.

## Input resolution

- **PRD slug** — read `.prism/prds/<slug>.md`. Check the frontmatter `status` field:
  - `status: finalized` — proceed to Decompose. If the epic plan for this PRD already exists (a prior decompose run), append to it — don't recreate it or duplicate stories already present in its `## User Stories`.
  - `status: draft` or `status: reviewed` — flag the non-finalized status and stop: "This PRD is still `<status>` — decomposing now risks locking stories against requirements that haven't stabilized yet. Want me to proceed anyway, or wait until it's finalized?" Proceed only on explicit override.
- **Epic id** — run `../plan-lookup.md` against the epic id. If an epic plan already exists, treat its `## Goal` and any existing `## User Stories` as the input context instead of a PRD file — append to, don't recreate.

## Decompose

Read the PRD's `## User journeys`, `## Scope`, and `## Requirements` sections (PRD shape defined in the `prism-prd` skill body § PRD output shape).

1. **Backbone** — one backbone entry per journey in `## User journeys`, in the order the PRD presents them. Per `frameworks.md § Story Mapping`, the backbone is workflow structure, not priority.
2. **Stories** — write vertically-sliced stories under each backbone entry, split per SPIDR (`frameworks.md § Scope Negotiation`). Every slice must be user-visible — "backend only" is not a valid split. Apply Mira's usual story format and quality checks (INVEST, the "so that" test, the what-if sweep — the skill body § Story format).
3. **MoSCoW** — classify every story Must/Should/Could/Won't, seeded from the PRD's `## Scope` (`in scope` → Must/Should candidates, `won't this time` → Won't). Confirm at least one story lands in Won't, per Mira's lens #5 (the skill body § 5. Scope as negotiation, not amputation).
4. **Walking skeleton** — designate the thinnest horizontal slice across the backbone that delivers end-to-end functionality (`frameworks.md § Story Mapping`). Mark it explicitly in the Story Map output.
5. **What-if sweep** — run the seven-question sweep (`frameworks.md § Edge Case Discovery`) against each story before it's considered complete.
6. **No architecture choices** — stories describe problems and outcomes, never implementation mechanisms (a UI widget, a schema, a function). Per Mira's lens #1 (the skill body § 1. Problem before solution), solutions belong to Winston and Clove.
7. **Candidate ticket boundaries** — mark each INVEST-Small story as a candidate ticket. This is the boundary Nora cuts tickets from in Handoff below.

## Output shape

Write to the epic plan at `.prism/plans/epic-<id-or-slug>.md` (per `../../rules/branch-plan.md` naming — use the epic id when one exists, the PRD slug when it doesn't). Create the plan lazily if it doesn't exist yet, per `../plan-lookup.md` step 6 — the same plan-creation path every skill uses when no plan is found. If the resolved target is a ticket-grain plan (`prism-NNNN.md`), the input was misclassified — stop and re-run the skill body's Path A existence check rather than writing.

Write two things into the epic plan:

1. **`## User Stories`** — standard Mira format (the skill body § Story format), one entry per story, grouped under its backbone journey as a subheading.
2. **`### Story Map`** — a subsection under `## User Stories`, structured as:

   ```markdown
   ### Story Map

   **Backbone:**

   | Order | Journey |
   | --- | --- |
   | 1 | <journey name from PRD> |
   | 2 | <journey name from PRD> |

   **Stories:**

   | Story | Journey | MoSCoW | Walking skeleton | Candidate ticket |
   | --- | --- | --- | --- | --- |
   | <story title> | <backbone journey> | Must | Yes | Yes |
   | <story title> | <backbone journey> | Should | No | Yes |
   ```

   The **Candidate ticket** column is `Yes` for every INVEST-Small story per Decompose step 7 — it's a marker Nora reads directly in Handoff, not a fresh judgment call.

## Handoff

Default next persona is Winston — his plan-mode reads `## User Stories` unchanged and picks up the map for free; his vertical-mode gate and Epic Detection `## Stories` child references adopt the map's boundaries without any Winston-side change.

Nora cuts one ticket per candidate-ticket marker through her existing create-path (`../ticket-start/create-path.md`) — the story's title, AC hints, and MoSCoW priority seed the ticket without re-elicitation. No batch-cut mode exists yet; Nora creates tickets one at a time, same as any other ticket.
