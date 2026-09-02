# Stakes Calibration

A pattern for tuning a skill's rigor to the stakes of the work in front of it. One skill, three intensity levels — the skill reads a stakes signal from the user (or infers it from context) and calibrates depth accordingly.

**Source:** BMAD's `bmad-prd` skill established the pattern — instead of three separate PRD skills for different scopes, one PRD skill with three calibration modes. PRISM adopts the pattern by name so Phase 3 (Parker) and any future stakes-sensitive skill can cite it rather than reinventing.

## The three levels

| Level | Signal | Calibration |
| --- | --- | --- |
| **quick** | Personal projects, exploratory tickets, learning work | Light PM-thinking, generous `[ASSUMPTION]` tolerance, looser reviewer rubric, fast path preferred |
| **reviewed** | Team-internal tools, dogfood-only features, low-blast-radius work | Standard PM-thinking, scoped `[ASSUMPTION]` tags expected to resolve before merge, default reviewer rubric |
| **strict** | Customer-facing, public release, multi-tenant blast radius | Deep PM-thinking, no unresolved `[ASSUMPTION]` tags, strict reviewer rubric, coaching path preferred over fast path |

The signal is asked explicitly when the skill starts — "How much rigor should this get: quick, reviewed, or strict?" — and the user's answer becomes the calibration setting for the rest of the run. Calibration is not implicit; making it a named question forces the conversation and prevents skills from defaulting to "strict rigor on quick work" (over-engineering) or "quick rigor on strict work" (shipping with gaps).

## What each level changes

The one-line description a consumer shows next to each option. Quote these verbatim in a prompt rather than paraphrasing — a paraphrase is where the two prompts drift apart.

| Level | What it changes |
| --- | --- |
| `quick` | No reviewer rubric, no decision log, no ticket handoff — open questions may stay open. |
| `reviewed` | Reviewer rubric runs; decision log optional; open questions expected to resolve before merge. |
| `strict` | Reviewer rubric runs and escalates; decision log required; every open question resolved before finalize. |

## The same words as an autonomy ceiling

Sol reuses these level names for `autonomyPolicy` — the human-set ceiling on which gates a persona may clear for itself. Same vocabulary, a different axis, so the lines differ:

| Level | What it changes |
| --- | --- |
| `quick` | Personas clear their own gates; they escalate only on genuine risk. |
| `reviewed` | Personas self-clear the clearly-simple cases and escalate on judgment — the balanced default. |
| `strict` | Every gate stays human. |

## Reading older artifacts

Artifacts written before the rename carry the old words. Read `hobby` as `quick`, `internal` as `reviewed`, and `launch` as `strict`. Closed plans, finalized PRDs, and accepted ADRs keep their original wording — they are records of what was decided then, and rewriting them would make the record lie about itself.

## What calibrates

For any skill adopting the pattern, three dimensions calibrate to the stakes level:

- **Depth of PM-thinking sections** — how many of the standard sections (problem statement, user segments, success metrics, scope boundaries, etc.) the skill drives to completion vs. flags as `[ASSUMPTION]` for later resolution.
- **Reviewer-rubric strictness** — what the skill flags as a blocker vs. a non-blocking note. Quick tolerates ambiguity that reviewed flags as risk; strict tolerates none of it.
- **Assumption-tagging tolerance** — how many `[ASSUMPTION]` tags the skill leaves unresolved at finalize. Quick may finalize with several; strict finalizes with zero.

Skills should document their own calibration table — which sections, which rubric items, which assumption thresholds correspond to which level — rather than handwaving "more rigor at strict."

## Who cites this pattern

- **Parker** (Phase 3, PRD persona) — primary consumer. Greenfield mode asks the stakes question early; the rest of the flow calibrates against the answer.
- **Mira** (existing, user-story persona) — a stakes signal at the user-story grain may compose cleanly with Parker's signal when the PRD decomposes into stories. Composition shape decided when Phase 3 lands; for now, Mira does not implement the pattern.
- Any future skill that produces planning artifacts at variable stakes (release plans, migration plans, infrastructure proposals) should evaluate whether the pattern applies.

## Why a reference doc rather than inlining

Phase 3 (Parker) needs the pattern, and at least one other future skill (Mira-level stakes signal, possibly more) plausibly needs it. Inlining the calibration table into Parker's spec and then re-deriving it for the next consumer guarantees drift. The reference doc owns the pattern shape; each consumer documents only its own calibration dimensions.

This phase (1.5e) does not modify any existing skill to adopt the pattern — Parker doesn't exist yet, and adding calibration to Mira without Parker's anchor would be premature. The reference doc lands now so Phase 3 has somewhere to cite from on day one.
