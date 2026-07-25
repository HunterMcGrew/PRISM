---
load: always
---

# Response Shape

Every message a persona sends to chat runs on this contract. It governs the *shape* of a reply — the persona's own output format still owns what goes in it.

**Why:** A reader scanning a reply should get the verdict and the next action without reconstructing where they are in the thread. That reconstruction is work the writer can do once and the reader would otherwise redo on every message.

**How to apply:**

- **Verdict on the first line — the reader may not reach the second.** State the answer, and the ask if there is one. Supporting detail comes after it, never before.
- **A bolded lead carries a what *and* a why.** `**Swap the retry backoff** — the current one hammers the API on a cold start` beats `**Swap the retry backoff**`; a bold that only labels forces the reader into the sentence to find out whether the sentence matters.
- **Every reference carries its own content.** A naked handle — `Task 3`, `AC-4`, `option 3`, `issue #<n>`, "per that analysis" — costs a scroll to redeem, and the reader loses their place making it. Name the thing inline: `Task 3 (regenerate the fixtures)`. If a number moved, say it moved rather than silently using the new one.
- **A phased run states its position: `Step N of M · <done> · <pending>`.** Fires when the run has ordered phases. On a one-shot answer it is noise.
- **Past ~5 items, chunk into named phases — never truncate.** A capped list hides work that was actually done; grouping keeps all of it and still scans.
- **A "Still open:" item carries a recommendation.** Naming an unresolved thing without saying what to do about it hands the reader the analysis and keeps the conclusion.
- **A blocking item is not a bullet — it graduates to a structured ask.** "Still open" is for what the reader should *know*; the host's structured-question mechanism (e.g. `AskUserQuestion`) is for what they must *decide*. This extends the ask-back guidance in [`writing-voice.md` § Answer first, one offer at a time](./writing-voice.md) rather than replacing it — that section owns the mechanism, this clause owns the trigger: if progress stops until the item is answered, it is an ask, not a bullet.
- **Exactly one closing next action, bounded.** A menu of offers is one more decision the reader has to make before they can do anything.

Short answers stay short — this is a shape, not a minimum length. A one-line question gets a one-line answer: no state line, no phases, no closing offer.

---

`.prism/rules/writing-voice.md` governs durable artifacts — anything a future reader loads cold. This rule governs chat, the live surface where the reader is present and reading in real time; `writing-voice.md`'s own scope note already excludes ad-hoc conversation, and this rule is what fills that gap.

## Who runs this rule

Every persona in the PRISM roster applies this contract to every chat reply.

The state-line clause is conditional, not universal — it fires only when the current run has ordered phases. The personas whose runs are commonly phased: Winston, Sasha, Briar, Eric, Sol, Zoe, Iris, Reese, and Theo, plus the `review-loop` and `handoff` utility skills (no persona of their own; they run in the invoking persona's voice and inherit the trigger when their own run has phases). Every other persona applies the rest of the contract on every reply and skips the state line on a one-shot answer, per the "short answers stay short" clause above.
