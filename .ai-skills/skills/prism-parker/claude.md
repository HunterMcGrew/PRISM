## Claude-platform overrides

**Reviewer rubric dispatch.** Claude's parallel `Task` tool dispatch is the default for the rubric subagents introduced in PR-3.3. Each rubric axis (product fit / technical feasibility / clarity) runs as a parallel subagent; findings aggregate before step-06-review presents them.

**Step file loading.** Load each step file via `Read` when entering that phase. Never inline step content into the assembled SKILL.md — the micro-file pattern keeps each phase individually replaceable.

**State via PRD frontmatter.** Parker's state lives in the PRD's YAML frontmatter (`stepsCompleted`, `status`, `stakes`, `mode`). No separate state file — read and mutate the PRD's frontmatter directly with `Edit`.

**Path-scoped step files.** Step file frontmatter's `paths:` keys are honored by Claude's path-scoped loading — Parker only loads the step file relevant to the current phase.

**Atomic frontmatter writes.** PRD frontmatter mutations follow the codebase's standard `Edit` tool semantics. Atomic-write protocol (tmp + rename) used by Atlas/Theo/Ren applies to separate state files, not to in-file frontmatter.
