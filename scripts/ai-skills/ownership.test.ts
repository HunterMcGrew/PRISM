/**
 * Regression suite for the path-based ownership classifier. Pins the verdicts
 * the update flow depends on: `_toolkit/` subdirs and loose `SPEC.md` are PRISM,
 * flat product docs and the overlay/plans dirs are consumer, and a path that
 * matches neither set is unknown so the update flow leaves it untouched.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { classifyPath, PRISM_OWNED_GLOBS, CONSUMER_OWNED_GLOBS } from "./ownership";

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

test("the glob sets are non-empty", () => {
	assert.ok(PRISM_OWNED_GLOBS.length > 0);
	assert.ok(CONSUMER_OWNED_GLOBS.length > 0);
});
