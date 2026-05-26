# Docs Impact Check

Briar-owned (self-review — [prism-code-review-self](../skills/prism-code-review-self/SKILL.md)). Lives in the shared `review-` namespace because Eric may adopt the same check later; until then only Briar triggers it.

After completing the review analysis, check whether the diff touches areas that have corresponding documentation in `docs/`:

1. **Code → docs staleness:** scan changed files for blocks, components, or features that have a matching `docs/user/` or `docs/dev/` file. Use the naming convention from [`documentation.md`](../architect/documentation.md) (e.g. `frontend/blocks/{name}/` → `docs/user/blocks/{name}.md`).

2. **Agent spec → human docs staleness:** scan changed files for `.prism/rules/` or `.prism/architect/` files that have a corresponding `docs/dev/` file. Check the cross-reference map in [`documentation.md`](../architect/documentation.md).

3. **If a match exists and the change is substantive** (not just formatting), add a **Docs Impact** section to the review output:

   > "This change modifies [X]. The docs at [path] may need updating. Consider bringing in Eli."

4. **If no docs match**, skip silently — do not mention docs impact.
