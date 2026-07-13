/**
 * Coverage for the packaging-parity gate's set-difference logic.
 *
 * `findMissingRuntimeReadPaths` is a pure function extracted from `main()` so
 * this suite can assert the missing/present logic without shelling out to
 * `npm pack` — the gate's own `main()` is exercised indirectly by running
 * `pnpm run prism:verify-pack` (see verification-commands.md), not here.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { findMissingRuntimeReadPaths, type RuntimeReadPath } from "./verify-pack-parity";

const FILE_ENTRY: RuntimeReadPath = {
	path: ".ai-skills/config.schema.json",
	reader: "config-schema-validate.ts loadConfigSchema",
	kind: "file",
};

const PREFIX_ENTRY: RuntimeReadPath = {
	path: "templates/install/.prism",
	reader: "adopt/update consumer content root (resolvePrismContentRoot)",
	kind: "prefix",
};

test("reports a required file missing from the tarball", () => {
	const missing = findMissingRuntimeReadPaths([], [FILE_ENTRY]);

	assert.deepEqual(missing, [FILE_ENTRY]);
});

test("passes when a required file is present in the tarball", () => {
	const missing = findMissingRuntimeReadPaths([FILE_ENTRY.path], [FILE_ENTRY]);

	assert.deepEqual(missing, []);
});

test("reports a required prefix missing when no packed path starts with it", () => {
	const missing = findMissingRuntimeReadPaths(
		["some/other/file.md"],
		[PREFIX_ENTRY]
	);

	assert.deepEqual(missing, [PREFIX_ENTRY]);
});

test("passes when a packed path falls under the required prefix", () => {
	const missing = findMissingRuntimeReadPaths(
		["templates/install/.prism/rules/foo.md"],
		[PREFIX_ENTRY]
	);

	assert.deepEqual(missing, []);
});

test("passes when a packed path exactly matches the required prefix", () => {
	const missing = findMissingRuntimeReadPaths([PREFIX_ENTRY.path], [PREFIX_ENTRY]);

	assert.deepEqual(missing, []);
});

test("reports only the missing entries out of a mixed set", () => {
	const missing = findMissingRuntimeReadPaths(
		[FILE_ENTRY.path],
		[FILE_ENTRY, PREFIX_ENTRY]
	);

	assert.deepEqual(missing, [PREFIX_ENTRY]);
});
