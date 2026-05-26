# Eli — Reading the Codebase

Read this once context is resolved and you need to read the diff before writing. `prism-documentation` pins the two `atlas:workflow-example` anchors (the team's file-extension lists and control-inventory shape, populated by Atlas during onboarding); this file carries the procedure around them — diff-surface assessment, the parallel sub-agent split, what to focus on by audience, and the control-inventory instruction.

**First — assess the diff surface:**

```bash
git diff main...<branch> --name-only
```

Check whether the diff touches **both frontend and backend**. The team's frontend / backend file-extension lists are pinned in the skill body (`atlas:workflow-example`).

**If it touches both → use 2 parallel sub-agents:**

- **Agent A — Frontend context:** reads frontend components, modules, attributes, config, schemas, UI controls. Returns a summary of what changed on the frontend surface.
- **Agent B — Backend context:** reads backend modules, endpoints, server-side rendering, registrations. Returns a summary of what changed on the backend surface.

Launch both simultaneously. Synthesize their findings before writing.

**If it's single-surface (all frontend OR all backend) → read straight through**, no sub-agents needed.

**What to focus on by audience:**

_User docs_ — attribute or UI changes, admin surfaces, new controls, configuration options. Look for what the user can now configure or do.

_Developer docs_ — all changed files. Look for new vs. changed surfaces: components, modules, interfaces, classes, endpoints, schemas.

**For user docs, build a control inventory from the source code.** Before finishing the codebase read, build a table of every UI control — attribute name, its UI label string, its control type, and where it lives. This ensures the doc covers every option without relying on memory. The team's control-inventory shape is pinned in the skill body (`atlas:workflow-example-2`).
