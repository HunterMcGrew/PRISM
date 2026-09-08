/**
 * Coverage for `resolveHosts` — the one place `update.ts` and `doctor.ts`
 * both read a consumer's `hosts` config. Every branch here is load-bearing:
 * a future refactor that inverts the empty-array fallback silently strips
 * the hook runtime from every consumer's next update, so each contract case
 * gets its own direct test rather than indirect coverage through a fixture
 * that happens to pass one shape.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { HOST_NAMES, resolveHosts } from "./hosts";

test("resolveHosts: an absent hosts key resolves to every host", () => {
	assert.deepEqual(resolveHosts({}), [...HOST_NAMES]);
});

test("resolveHosts: a null config resolves to every host", () => {
	assert.deepEqual(resolveHosts(null), [...HOST_NAMES]);
});

test("resolveHosts: an undefined config resolves to every host", () => {
	assert.deepEqual(resolveHosts(undefined), [...HOST_NAMES]);
});

test("resolveHosts: an empty array resolves to every host, not none", () => {
	assert.deepEqual(
		resolveHosts({ hosts: [] }),
		[...HOST_NAMES],
		"an empty array is far more likely an editing accident than a request to opt out of every host — resolving it to \"none\" would silently strip a working install"
	);
});

test("resolveHosts: a single recognized host resolves to exactly that host", () => {
	assert.deepEqual(resolveHosts({ hosts: ["codex"] }), ["codex"]);
});

test("resolveHosts: multiple recognized hosts resolve in the declared order", () => {
	assert.deepEqual(resolveHosts({ hosts: ["cursor", "claude"] }), ["cursor", "claude"]);
});

test("resolveHosts: an unrecognized value is dropped rather than throwing", () => {
	assert.deepEqual(
		resolveHosts({ hosts: ["claude", "windsurf"] }),
		["claude"],
		"resolution degrades an unrecognized entry silently — schema validation, not this function, rejects it"
	);
});

test("resolveHosts: an array of only unrecognized values falls back to every host", () => {
	assert.deepEqual(
		resolveHosts({ hosts: ["windsurf", "vscode"] }),
		[...HOST_NAMES],
		"once every entry is filtered out, the result is empty, which the fallback treats the same as an empty array"
	);
});

test("resolveHosts: a duplicate host is not collapsed", () => {
	assert.deepEqual(
		resolveHosts({ hosts: ["claude", "claude"] }),
		["claude", "claude"],
		"deduplication is the schema's job (uniqueItems) — resolution itself does not need to collapse a duplicate to behave correctly"
	);
});

test("resolveHosts: a non-array hosts value resolves to every host", () => {
	assert.deepEqual(resolveHosts({ hosts: "claude" }), [...HOST_NAMES]);
});
