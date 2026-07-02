# Nora — Duplicate Finder Mode

> Mode `prism-ticket-start` runs to assess whether a ticket or free-text description overlaps with existing tickets enough to warrant linking, closing, or merging. Mutations pass through the skill body's shared-state write confirmation gate.

When invoked with "find duplicates", "is this a duplicate", "check for similar tickets", or similar — assess whether a ticket (by ID) or a free-text description overlaps with existing tickets enough to warrant linking, closing, or merging.

1. **Detect input shape:**
   - If `$ARGUMENTS` contains a ticket identifier matching the team's prefix pattern, treat it as **"check duplicates of this ticket"** — fetch the ticket via `get_issue` and use its title, labels, and description as the candidate.
   - If `$ARGUMENTS` contains free-text (a sentence or paragraph), treat it as **"check duplicates against existing"** — use the text as the candidate.
   - If both forms are ambiguous or empty, ask: "Are you checking duplicates of an existing ticket (give me the ID) or against a new description (paste it)?"

2. **Fetch the candidate pool** — call `list_issues` filtered to the team from `skills-ecosystem.md § Project Context`, excluding tickets in terminal statuses ("Done", "Canceled", "Duplicate"). Cap the pool at the 200 most recently updated tickets — older tickets are unlikely matches and the scoring cost compounds.

3. **Similarity scoring** — for each candidate, compute a combined score from three signals:
   - **Title cosine similarity** — tokenize both titles (lowercase, strip punctuation, split on whitespace), build term-frequency vectors, compute cosine similarity. Weight: **50%**.
   - **Label overlap** — Jaccard index of the two label sets (intersection over union). Weight: **30%**.
   - **Description fuzzy match** — character-level n-gram overlap (trigrams) between the two descriptions, normalized to 0–1. Weight: **20%**.

   Combined score = `0.5 × title_cosine + 0.3 × label_jaccard + 0.2 × description_trigram`. Range 0–1.

   These weights are domain-specific to ticket data — titles carry the most signal because they're the shortest and most curated; labels carry meaningful taxonomic overlap; descriptions are the noisiest signal but still discriminate near-misses.

4. **Propose-then-confirm pattern** — present the top 3 candidates with similarity scores and a per-candidate reasoning bullet. **Await user confirmation before any ticket mutation.** Never auto-link, auto-close, or auto-merge.

5. **Output format** — ranked list:

   ```
   ### Top 3 candidates

   1. **PRISM-#### — <title>** — score 0.87
      - Title overlap: "mega menu mobile" appears in both
      - Labels: shared `bug`, `frontend` (2/3 overlap)
      - Status: In Progress, assigned to <name>
      - **Propose:** link as duplicate / close as duplicate of / no action

   2. **PRISM-#### — <title>** — score 0.71
      - Title overlap: partial — "menu rendering"
      - Labels: shared `frontend` only
      - Status: Todo, unassigned
      - **Propose:** link as duplicate / close as duplicate of / no action

   3. **PRISM-#### — <title>** — score 0.54
      - Title overlap: minimal
      - Labels: no overlap
      - Status: Backlog
      - **Propose:** link as duplicate / no action
   ```

6. **Action gate** — after presenting candidates, ask: "Want me to act on any of these? Tell me which candidate and which action (link, close, no action)." Only then call `save_issue` to apply the chosen mutation, and only after passing through the shared-state write confirmation gate in the skill body.

7. **Low-confidence threshold** — if the top score is below 0.40, lead with: "No strong matches — top score is X.XX which is below the usefulness threshold. The three closest tickets are listed for awareness, but I don't think any of them are duplicates." This prevents Duplicate Finder from manufacturing false positives on novel work.
