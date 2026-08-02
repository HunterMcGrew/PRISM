# Stage-1 smoke — diagnostic, not experiment data

These rows are the stage-1 smoke matrix (6 runs, one per prompt per arm), not a scored experiment run.

They were graded before the interpretability gates (headroom gate, positive-control precondition) existed, so none of the falsifier's current preconditions apply to them.

What they established is the finding at the head of `context-delivery-mechanism.md`'s PR 4: both control-arm cells scored full marks with the hook disabled, because a `load: always` rule delivers the hook's own payload to both arms.

The `injected_docs` column is `-` on every row because of the `json_array_field` line-wise-grep bug (fixed in PR 4 task 16b) — do not read these rows as evidence the hook never fired.
