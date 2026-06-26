# Report Contract Schema

The typed structure every persona emits as its final act before stopping. The gate (`run-gates.mjs`, Phase 1) shape-checks this contract, verifies verdict-to-route coherence, and refuses to let the model stop until the report is present, structurally valid, and internally coherent. This document is the single source of truth for the contract's shape; the gate implementation and the personas' DoD sections cite it rather than re-enumerate it.

Why this contract exists: without a required structured return, a persona's completion signal is prose the model claims it produced. The contract moves that claim from the trust layer to the runtime layer — the gate reads a machine-parseable artifact, not a narrative. See [ADR-0067](../../spec/adrs/_toolkit/0067-runtime-ratifies-verdicts.md) for the inversion principle this contract implements, and [`enforcement-floor.md`](../../architect/_toolkit/enforcement-floor.md) for the gate-strength taxonomy that determines which fields are checked per persona class.

---

## JSON schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "PRISM persona report contract",
  "description": "Structured return emitted by every persona before stopping. Shape-checked by run-gates.mjs at the Stop/SubagentStop boundary.",
  "type": "object",
  "required": ["reasoning", "persona", "checklist", "verdict", "verdict_reason", "next_route"],
  "additionalProperties": false,
  "properties": {
    "reasoning": {
      "type": "string",
      "minLength": 1,
      "description": "The persona's concise account of what it did and why the verdict is warranted. Not a plan summary — the reasoning that justifies the specific verdict being claimed."
    },
    "persona": {
      "type": "string",
      "minLength": 1,
      "description": "The gates.json key identifying which persona is reporting (e.g. clove, briar, winston). Used by run-gates.mjs to look up the correct gate set and ownership matrix."
    },
    "checklist": {
      "type": "object",
      "description": "Per-item completion status for the persona's DoD checklist. Keys are short slugs matching the gate IDs in gates.json (e.g. types, tests, lint). Values are booleans — true when the persona claims the item is satisfied. The gate verifies claimed-true items against evidence; a claimed-true item that the gate cannot ratify triggers a verdict override.",
      "additionalProperties": {
        "type": "boolean"
      }
    },
    "verdict": {
      "type": "string",
      "description": "The persona's proposed completion status. The gate ratifies or overrides it — see ADR-0067 the inversion principle. The enum is authoritative in report-back.md; this field cites it.",
      "enum": ["done", "needs-fix", "blocked", "needs-replan", "needs-stronger-model", "needs-human"]
    },
    "verdict_reason": {
      "type": "string",
      "minLength": 1,
      "description": "One sentence explaining why the persona chose this verdict. Required for every verdict — done reasons explain what passed; non-done reasons name the specific blocker, finding, or gap."
    },
    "next_route": {
      "type": "string",
      "minLength": 1,
      "description": "Required. The persona the work hands off to next, or human when the next step is a human action. Must be coherent with the verdict — see the Verdict-to-route coherence section below. The gate rejects a stop where this field is absent or incoherent."
    },
    "payload": {
      "type": "object",
      "description": "Optional. Supplementary structured data the next route needs that is not captured in the plan's durable content sections. The plan (Review Issues, Debugged Issues, Decisions) is the primary content bus — payload carries only ephemeral routing context the next persona needs immediately. Keep small; the gate does not validate payload contents beyond checking it is an object when present.",
      "additionalProperties": true
    }
  }
}
```

---

## Verdict enum

The `verdict` field's valid values are enumerated in [`report-back.md`](../../skills/prism-conductor/lib/report-back.md) § Primary verdict — that file owns the enum; this contract cites it. The six values, for reference:

| Value | When the persona uses it |
| ----- | ------------------------ |
| `done` | The persona completed its job; all gates ratified. |
| `needs-fix` | A review rung found fixable issues recorded in `## Review Issues`. |
| `blocked` | Can't proceed — a dependency, environment failure, or missing input. |
| `needs-replan` | The plan is the problem — vague tasks, a wrong decision, a gap. |
| `needs-stronger-model` | The dispatch stalled on capability, not the plan (gate-injected on strike cap). |
| `needs-human` | A gate or open question needs a human decision. |

Do not re-enumerate or extend this set here. If the set changes, `report-back.md` changes first; this table updates to stay consistent.

---

## `next_route` — derivation and validation

`next_route` is **required** and **validated** by the gate against two rules: (1) the value must be in the persona's allowed-routes set, and (2) the value must be coherent with the verdict.

### Derivation: where per-persona routes come from

A persona's allowed `next_route` values derive from its skill file's `## Next persona` section. That section names the default route and any conditional routes. The gate's allowlist for a persona is the union of all named routes in that section. Phase 5 populates the `gates.json` `allowed_routes[]` array per persona from this source — that array is what the gate reads at runtime.

**Worked example — Clove (`prism-code-dev`):**

Clove's `## Next persona` section (`.claude/skills/prism-code-dev/SKILL.md` § Next persona) names:

- Default route: `briar` (self-review before PR)
- Conditional route after Briar clean: `human` (the human merges — "ship" resolves to `human`)
- Conditional route after Briar finds issues: back to `clove`

Clove's allowed `next_route` values: `["briar", "human", "clove", "winston"]`.

The `winston` entry covers the case where Clove emits `needs-replan` — every persona that can emit `needs-replan` implicitly has `winston` in its allowed set. `human` covers `blocked` and `needs-human`. The Phase 5 implementer does not need to hand-derive these; the coherence check enforces the verdict-implied routes automatically.

### Verdict-to-route coherence

The gate enforces that `next_route` is consistent with `verdict`. An incoherent combination — a persona claiming `done` but routing to `human` when no human action is the natural next step, or claiming `needs-replan` but routing to `briar` — misleads the human reader as much as it would misroute Sol. The gate rejects the stop and re-injects a correction prompt.

| Verdict | Required `next_route` shape |
| ------- | --------------------------- |
| `done` | The persona's normal next persona (e.g. `briar` for Clove, `clove` for Winston after planning, `human` for Eric). Not `human` unless the persona's natural next step genuinely is a human action. |
| `needs-fix` | The implementer persona for this lane (e.g. `clove` when Briar or Eric finds fixable issues). |
| `needs-replan` | `winston` — replan routes to the architect, or `human` when the question needs stakeholder input. |
| `blocked` | `human` — a blocked lane parks for human resolution. |
| `needs-stronger-model` | The gate injects this verdict and sets `next_route` to the same persona key (e.g. `clove` for Clove) on the 3-strike cap, signaling Sol to retry the same persona at a stronger model. The persona cannot emit this verdict directly — `isCoherent` returns `false` and the gate overrides any attempt. |
| `needs-human` | `human` — an open question or explicit escalation always lands with a human. |

The coherence rule is a consistency check, not a closed lookup table. A `done` that routes to `winston` fails it; a `needs-human` that routes to `briar` fails it. The gate's implementation runs `isCoherent(verdict, next_route) -> boolean` and rejects the stop on `false`.

---

## Reference validator

The gate (`run-gates.mjs`, Phase 1) calls `validateShape(report)` before any evidence check. This is the reference implementation in prose and as a JavaScript snippet.

### Prose spec

`validateShape` does four things in order:

1. **Presence check** — the file `.prism/evidence/<runKey>/report.json` exists. If absent, exit with "report.json not found — emit your report before stopping."
2. **JSON parse** — the file parses as valid JSON. If not, exit with the parse error.
3. **Schema check** — every required field (`reasoning`, `persona`, `checklist`, `verdict`, `verdict_reason`, `next_route`) is present and the `verdict` value is in the enum. If any required field is missing or `verdict` is not a known value, exit with a precise field-level error.
4. **Coherence check** — `next_route` is consistent with `verdict` per the table above. If not, exit with a message naming both the offending values and citing this document's coherence section.

If all four pass, `validateShape` returns the parsed report object for the evidence-gate checks that follow.

### JS reference snippet

```js
// Reference shape for run-gates.mjs validateShape (Phase 1).
// Actual implementation in .claude/hooks/run-gates.mjs; file paths resolved
// from the hook payload's runKey, allowedRoutes from gates.json.

import { readFileSync } from 'node:fs';

const VALID_VERDICTS = new Set([
  'done', 'needs-fix', 'blocked', 'needs-replan', 'needs-stronger-model', 'needs-human'
]);

// Universal verdict-to-route constraints (hold for every persona).
// 'done' and 'needs-fix' vary by persona; validate those against gates.json allowed_routes[].
const VERDICT_ROUTE_CONSTRAINTS = {
  'needs-replan':         { allowed: ['winston', 'human'] },
  'blocked':              { allowed: ['human'] },
  'needs-stronger-model': { gateInjected: true }, // persona must not emit directly
  'needs-human':          { allowed: ['human'] },
};

function isCoherent(verdict, nextRoute, allowedRoutes) {
  const constraint = VERDICT_ROUTE_CONSTRAINTS[verdict];
  if (constraint?.gateInjected) return false;
  if (constraint?.allowed) return constraint.allowed.includes(nextRoute);
  // 'done' and 'needs-fix': validate against the persona's allowed_routes from gates.json
  return allowedRoutes.includes(nextRoute);
}

export function validateShape(reportPath, allowedRoutes) {
  let raw;
  try {
    raw = readFileSync(reportPath, 'utf8');
  } catch {
    return { ok: false, error: 'report.json not found — emit your report before stopping.' };
  }

  let report;
  try {
    report = JSON.parse(raw);
  } catch (e) {
    return { ok: false, error: `report.json is not valid JSON: ${e.message}` };
  }

  const required = ['reasoning', 'persona', 'checklist', 'verdict', 'verdict_reason', 'next_route'];
  for (const field of required) {
    if (report[field] === undefined || report[field] === null) {
      return { ok: false, error: `Missing required field: ${field}` };
    }
  }

  if (!VALID_VERDICTS.has(report.verdict)) {
    return {
      ok: false,
      error: `Unknown verdict '${report.verdict}' — must be one of: ${[...VALID_VERDICTS].join(', ')}`
    };
  }

  if (!isCoherent(report.verdict, report.next_route, allowedRoutes)) {
    return {
      ok: false,
      error: `next_route '${report.next_route}' is incoherent with verdict '${report.verdict}' — see report-contract.md the Verdict-to-route coherence section.`
    };
  }

  return { ok: true, report };
}
```

---

## Where the report file lives

Every persona writes `report.json` to `.prism/evidence/<runKey>/report.json`, where `runKey` is `agent_id ?? session_id` (keyed by agent to prevent fleet-lane collision — see ADR-0067 in-flight state keying and the Decisions in `.prism/plans/epic-prism-enforcement-layer.md`). The gate reads this path; it must exist before the persona attempts to stop.

---

## Cross-references

- [ADR-0067](../../spec/adrs/_toolkit/0067-runtime-ratifies-verdicts.md) — the inversion principle; why the gate ratifies rather than the model self-reports
- [`enforcement-floor.md`](../../architect/_toolkit/enforcement-floor.md) — which fields the gate checks per persona class (Class A: all evidence gates; Class B: shape + coherence; Class C: shape only)
- [`report-back.md`](../../skills/prism-conductor/lib/report-back.md) — the authoritative verdict enum and Sol's deterministic routing table; this contract's `verdict` field is defined there
- `gates.json` — the per-persona gate data including `allowed_routes[]` that the coherence check reads at runtime; schema at `.prism/references/enforcement/gates.json` (this branch), populated data at `.claude/hooks/gates.json` (Phase 1+)
- `.claude/hooks/run-gates.mjs` (Phase 1) — the gate implementation that calls `validateShape` and runs evidence checks against this schema
