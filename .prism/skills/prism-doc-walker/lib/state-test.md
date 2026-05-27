# Theo state file — scenario tests

Agent-readable test scenarios for `.prism/theo-state.json` behavior. Not executable; structured so an agent can walk each scenario and verify Theo's protocol implementation against the expected outcome.

## 1. Fresh start (no state file)

**Setup:** No `.prism/theo-state.json` exists.

**Expected:** Step-01-init reads → null. Theo prompts for target directory. After user supplies the path, Theo writes initial state with `currentPhase: "exploring"`, empty `stepsCompleted`, empty `visitedPaths`, empty `candidates`, and current `lastUpdated`. Atomic write — file appears via rename, not partial write.

## 2. Resume from `exploring` phase

**Setup:** State file present with `currentPhase: "exploring"`, populated `visitedPaths`, empty `candidates`.

**Expected:** Step-01-init reads state, sees `currentPhase: "exploring"`, presents resume offer. User picks resume. Theo jumps to step-02-scan with `visitedPaths` preserved (does not re-walk already-visited paths unless the user explicitly asks).

## 3. Resume from `presenting` phase

**Setup:** State file present with `currentPhase: "presenting"`, `candidates` array containing at least one `status: "pending"` entry.

**Expected:** Step-01-init reads state, sees `currentPhase: "presenting"`, presents resume offer. User picks resume. Theo jumps to step-03-present with the first pending candidate. `candidates` array intact.

## 4. Resume from `grilling` phase

**Setup:** State file present with `currentPhase: "grilling"`, one candidate with `status: "drafting"`.

**Expected:** Step-01-init reads state, sees `currentPhase: "grilling"`, presents resume offer. User picks resume. Theo jumps to step-06-review with the current candidate. The draft is regenerated in working memory from the candidate's `loadBearingReason`, `files`, and `suggestedShape` — drafts don't persist across sessions; regeneration is deterministic given the candidate fields.

## 5. Interrupted state write (tmp file + canonical file both present)

**Setup:** Both `.prism/theo-state.json` and `.prism/theo-state.json.tmp` exist on disk.

**Expected:** Theo reads the canonical file (it has the last-known-good state). The tmp file is ignored and gets overwritten on the next write. No data loss — this is the most common interruption pattern.

## 6. Interrupted state write (tmp file present, canonical file absent)

**Setup:** Only `.prism/theo-state.json.tmp` exists; canonical file was never created or was deleted.

**Expected:** Treat as fresh start. Theo warns the user that prior state may have been corrupted and archives the tmp file to `.prism/theo-state.<timestamp>.broken.json` for forensic inspection. After archive, fresh-start flow proceeds normally.

## 7. Parse failure on existing state file

**Setup:** `.prism/theo-state.json` exists but contains malformed JSON (truncated file, invalid escape, missing closing brace).

**Expected:** Theo surfaces the parse error with the offending line/column when available. Offers fresh-start fallback. On user confirmation, archives the broken file to `.prism/theo-state.<timestamp>.broken.json` and proceeds with fresh start.

## 8. Schema version mismatch

**Setup:** State file's `version` field is newer than the running step's expected schema version (e.g., file says `version: 2`, step expects `version: 1`).

**Expected:** Theo refuses to mutate. Surfaces the version mismatch to the user. Recommends upgrading the Theo install before resuming, or starting fresh to write a new state file at the running version.
