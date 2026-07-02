/**
 * Regression suite for the path-based ownership classifier. Pins the verdicts
 * the update flow depends on: `_toolkit/` subdirs and loose `SPEC.md` are PRISM,
 * flat product docs and the overlay/plans dirs are consumer, and a path that
 * matches neither set is unknown so the update flow leaves it untouched.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  classifyPath,
  PRISM_OWNED_GLOBS,
  CONSUMER_OWNED_GLOBS,
} from "./ownership";

test("toolkit architect docs are PRISM-owned", () => {
  assert.equal(classifyPath("architect/_toolkit/install-layout.md"), "prism");
});

test("toolkit ADRs are PRISM-owned", () => {
  assert.equal(classifyPath("spec/adrs/_toolkit/0001-x.md"), "prism");
});

test("loose SPEC.md is PRISM-owned", () => {
  assert.equal(classifyPath("SPEC.md"), "prism");
});

test("rules, templates, and references trees are PRISM-owned", () => {
  assert.equal(classifyPath("rules/branch-plan.md"), "prism");
  assert.equal(classifyPath("templates/pr-description.md"), "prism");
  assert.equal(classifyPath("references/plan-mode.md"), "prism");
});

test("flat architect docs are consumer-owned", () => {
  assert.equal(classifyPath("architect/product-overview.md"), "consumer");
});

test("flat ADRs are consumer-owned", () => {
  assert.equal(classifyPath("spec/adrs/0900-consumer.md"), "consumer");
});

test("the live manifest is consumer-owned", () => {
  assert.equal(classifyPath("architect/manifest.json"), "consumer");
});

test("the custom overlay tree is consumer-owned", () => {
  assert.equal(classifyPath("custom/rules/team.md"), "consumer");
});

test("the plans tree is consumer-owned", () => {
  assert.equal(classifyPath("plans/prism-1.md"), "consumer");
});

test("lessons.md is consumer-owned", () => {
  assert.equal(classifyPath("lessons.md"), "consumer");
});

test("consumer claims win over the broader owned globs", () => {
  // `spec/adrs/0900-consumer.md` and `architect/foo.md` both sit under owned
  // trees (`spec/**`, the architect dir); the consumer carve-out must win.
  assert.equal(classifyPath("spec/adrs/0900-consumer.md"), "consumer");
  assert.equal(classifyPath("architect/foo.md"), "consumer");
});

test("a path matching neither set is unknown", () => {
  assert.equal(classifyPath("design/mocks/login.md"), "unknown");
  assert.equal(classifyPath("audits/2026-06-15-audit.md"), "unknown");
});

test("classifyPath matches manifest-form forward-slash keys regardless of host OS", () => {
  // classifyPath is always called with the manifest's stored key form
  // (forward-slash, per sync-manifest.ts's own normalization), never a raw
  // OS path — this pins that a nested multi-segment key classifies
  // identically whether the test process itself runs on Windows or POSIX,
  // since the glob matcher operates on the string, not `path.sep`.
  assert.equal(
    classifyPath("architect/_toolkit/nested/deep/doc.md"),
    "prism"
  );
  assert.equal(classifyPath("rules/nested/deeply/rule.md"), "prism");
  assert.equal(classifyPath("custom/rules/nested/team.md"), "consumer");
});

test("classifyPath treats a raw backslash-joined path as unclassified", () => {
  // A defensive pin, not a supported input: classifyPath's globs are
  // authored against forward-slash paths, so a caller that accidentally
  // passes a raw Windows-native path (backslashes, un-normalized) fails to
  // match either glob set and falls through to "unknown" rather than
  // silently misclassifying — the update flow's safe default for a path it
  // can't provably classify.
  assert.equal(classifyPath("architect\\_toolkit\\doc.md"), "unknown");
});

test("the glob sets are non-empty", () => {
  assert.ok(PRISM_OWNED_GLOBS.length > 0);
  assert.ok(CONSUMER_OWNED_GLOBS.length > 0);
});
