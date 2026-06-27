/**
 * Regression suite for assertHookEmitDoesNotWeaken — the build-side backstop that refuses
 * to emit a gates.json or guard which re-opens the canonical/runtime back door (issue #305).
 *
 * Covers both throw classes and the pass class: a gates.json carrying a wholesale
 * enforcement-tree grant (either spelling) throws, invalid gates JSON throws, and a guard
 * source missing the canonical-protection marker throws; the real post-fix canonical
 * gates.json passes.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assertHookEmitDoesNotWeaken } from "./build";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const realCanonicalGuard = fs.readFileSync(
	path.join(REPO_ROOT, ".ai-skills", "hooks", "ownership-guard.mjs"),
	"utf8"
);

test("throws when clove may_write re-includes the wholesale .ai-skills/hooks/** grant", () => {
	const weakened = JSON.stringify({
		clove: { ownership: { may_write: ["src/**", ".ai-skills/hooks/**"] } },
	});
	assert.throws(
		() => assertHookEmitDoesNotWeaken(weakened, realCanonicalGuard),
		/#305.*\.ai-skills\/hooks\/\*\*/s
	);
});

test("throws when clove may_write re-includes the wholesale .claude/hooks/** grant", () => {
	const weakened = JSON.stringify({
		clove: { ownership: { may_write: ["src/**", ".claude/hooks/**"] } },
	});
	assert.throws(
		() => assertHookEmitDoesNotWeaken(weakened, realCanonicalGuard),
		/#305.*\.claude\/hooks\/\*\*/s
	);
});

test("does not throw on the real post-fix canonical gates.json", () => {
	const realGates = fs.readFileSync(
		path.join(REPO_ROOT, ".ai-skills", "hooks", "gates.json"),
		"utf8"
	);
	assert.doesNotThrow(() =>
		assertHookEmitDoesNotWeaken(realGates, realCanonicalGuard)
	);
});

test("throws when the guard source is missing the canonical-protection marker", () => {
	const safeGates = JSON.stringify({
		clove: { ownership: { may_write: ["src/**", ".ai-skills/hooks/__smoke__/**"] } },
	});
	const guardWithoutMarker = "// a guard that dropped the canonical protection\n";
	assert.throws(
		() => assertHookEmitDoesNotWeaken(safeGates, guardWithoutMarker),
		/#305.*PROTECTED_CANONICAL_HOOKS_PREFIX/s
	);
});

test("throws when canonical gates.json is not valid JSON", () => {
	assert.throws(
		() => assertHookEmitDoesNotWeaken("{ not json", realCanonicalGuard),
		/#305.*not valid JSON/s
	);
});
