/**
 * Regression coverage for the bundle-safe CLI entry-detection helper.
 *
 * `cli-bundle.test.ts` only exercises `isDirectCliEntry`'s false branch — its
 * compiled bundle's entry basename is always `cli`. This file locks the true
 * branch and the basename extension-stripping edge directly, since the
 * helper reads `process.argv[1]` as a global rather than taking it as a
 * parameter. Each test sets `process.argv[1]` and `afterEach` restores it.
 */
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";

import { isDirectCliEntry } from "./lib/cli-entry";

const originalArgv1 = process.argv[1];

afterEach(() => {
	process.argv[1] = originalArgv1;
});

test("returns true for the standalone dev entry path (tsx adopt.ts)", () => {
	process.argv[1] = "/repo/scripts/ai-skills/adopt.ts";
	assert.equal(isDirectCliEntry("adopt"), true);
});

test("strips the .ts extension from a hyphenated basename", () => {
	process.argv[1] = "/repo/scripts/ai-skills/verify-manifest-coverage.ts";
	assert.equal(isDirectCliEntry("verify-manifest-coverage"), true);
});

test("strips only the final extension from a genuine multi-dot basename", () => {
	process.argv[1] = "/repo/scripts/ai-skills/foo.config.ts";
	assert.equal(isDirectCliEntry("foo.config"), true);
});

test("returns false for every subcommand name when argv[1] is the bundle entry", () => {
	process.argv[1] = "/repo/dist/cli.js";
	assert.equal(isDirectCliEntry("adopt"), false);
	assert.equal(isDirectCliEntry("doctor"), false);
	assert.equal(isDirectCliEntry("eject"), false);
	assert.equal(isDirectCliEntry("update"), false);
});

test("returns false for every subcommand name when argv[1] is the no-extension global-link symlink", () => {
	process.argv[1] = "/usr/local/bin/prism";
	assert.equal(isDirectCliEntry("adopt"), false);
	assert.equal(isDirectCliEntry("doctor"), false);
	assert.equal(isDirectCliEntry("eject"), false);
	assert.equal(isDirectCliEntry("update"), false);
});

test("returns false when argv[1] is undefined", () => {
	process.argv.length = 1;
	assert.equal(isDirectCliEntry("adopt"), false);
});
