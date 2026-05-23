## Codex-platform overrides

**Reviewer rubric dispatch.** Codex executes rubric subagents sequentially — no parallel `Task` tool dispatch. The rubric runs each axis in fixed order: product fit → technical feasibility → clarity. Findings accumulate as the sequence progresses; step-06-review presents the combined findings.

**Step file loading.** Same as Claude — load each step file when entering its phase. Use Codex's native Read equivalent.

**State via PRD frontmatter.** Same as Claude — state lives in PRD frontmatter, not a separate state file.
