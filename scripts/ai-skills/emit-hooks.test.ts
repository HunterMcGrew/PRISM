/**
 * Regression suite for assertHookEmitDoesNotWeaken — the build-side backstop that refuses
 * to emit a gates.json or guard which re-opens the canonical/runtime back door (issue #305).
 *
 * Covers both throw classes and the pass class: a gates.json carrying a wholesale
 * enforcement-tree grant (either spelling) throws, invalid gates JSON throws, and a guard
 * source missing the canonical-protection marker throws; the real post-fix canonical
 * gates.json passes.
 *
 * Also covers settings.json twin emission: asserts that after a build, the runtime
 * .claude/settings.json and the install seed templates/install/.claude/settings.json
 * byte-match the canonical .ai-skills/hooks/settings.json.
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

test("throws when _shared.may_write contains a wholesale enforcement-tree grant", () => {
	const weakened = JSON.stringify({
		_shared: { may_write: [".ai-skills/hooks/**"] },
	});
	assert.throws(
		() => assertHookEmitDoesNotWeaken(weakened, realCanonicalGuard),
		/#305/
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

test("settings.json runtime twin byte-matches the canonical source", () => {
	const canonical = fs.readFileSync(
		path.join(REPO_ROOT, ".ai-skills", "hooks", "settings.json"),
		"utf8"
	);
	const runtime = fs.readFileSync(
		path.join(REPO_ROOT, ".claude", "settings.json"),
		"utf8"
	);
	assert.equal(
		runtime,
		canonical,
		".claude/settings.json must byte-match .ai-skills/hooks/settings.json"
	);
});

test("settings.json install-seed twin byte-matches the canonical source", () => {
	const canonical = fs.readFileSync(
		path.join(REPO_ROOT, ".ai-skills", "hooks", "settings.json"),
		"utf8"
	);
	const seed = fs.readFileSync(
		path.join(REPO_ROOT, "templates", "install", ".claude", "settings.json"),
		"utf8"
	);
	assert.equal(
		seed,
		canonical,
		"templates/install/.claude/settings.json must byte-match .ai-skills/hooks/settings.json"
	);
});

// --- risk-4: SKILL_ID_TO_PERSONA ↔ gates.json drift guard ---
//
// resolve-persona.mjs hardcodes SKILL_ID_TO_PERSONA — a second source of truth for
// which skill IDs map to which persona keys. gates.json is the canonical gate registry.
// If a gates.json persona key has no entry in the map (or vice-versa for non-exempt skills),
// the runtime resolver silently falls through to null and the gate never fires. This test
// catches that drift at build time so future additions to either surface fail the build
// rather than silently break enforcement.
//
// Skills exempt from the "must have a gates.json entry" check.
//
// Two categories are exempt:
//   1. Utility skills (no persona state machine, no evidence gates by design):
//        prism-handoff, prism-review-loop, prism-skill-forge
//   2. Phase 5 rollout in-progress (gate entries will be added in subsequent Phase 5 PRs):
//        all non-Class-A personas not yet gated in PR1
//
// When a Phase 5 PR adds a persona's gates.json entry, remove its skill ID from this list.
// When all persona entries have landed, only the three utility skills should remain.
const EXEMPT_SKILLS = new Set([
	// --- Utility skills (no gates.json entry by design) ---
	"prism-handoff",
	"prism-review-loop",
	// --- Phase 5 rollout in-progress (not yet gated in PR1) ---
	"prism-code-review-self",  // briar — Class B
	"prism-code-review-pr",    // eric — Class B
	"prism-architect",         // winston — Class B
	"prism-debugger",          // sasha — Class B
	"prism-documentation",     // eli — Class B
	"prism-design",            // pixel — Class B
	"prism-ticket-start",      // nora — Class B
	"prism-user-stories",      // mira — Class B
	"prism-qa-test-plan",      // reese — Class B
	"prism-doc-walker",        // theo — Class C
	"prism-surface-audit",     // zoe — Class C
	"prism-retro",             // iris — Class C
	"prism-refactor-scout",    // ren — Class C
	"prism-standup-summary",   // lilac — Class C
	"prism-prd",               // parker — Class C
	"prism-conductor",         // sol — Class C
	"prism-founder",           // vera — Class C
	"prism-market-research",   // kora — Class C
	"prism-finance",           // ellis — Class C
	"prism-marketing",         // charlie — Class C
	"prism-sales",             // quinn — Class C
	"prism-data",              // tess — Class C
	"prism-customer-success",  // remy — Class C
	"prism-recruiting",        // penny — Class C
	"prism-legal",             // lex — Class C
]);

// Extract SKILL_ID_TO_PERSONA from the canonical resolve-persona.mjs source by parsing
// the hardcoded object literal. We read the source text and eval the object in a controlled
// way rather than importing the .mjs module (which requires Node ESM resolution in a CJS
// test context). The shape is stable — a single const assignment of a plain object literal.
function extractSkillIdToPersona(resolvePersonaSource: string): Map<string, string> {
	const match = resolvePersonaSource.match(
		/const SKILL_ID_TO_PERSONA\s*=\s*\{([^}]+)\}/s
	);
	if (!match) {
		throw new Error(
			"risk-4: cannot locate SKILL_ID_TO_PERSONA in resolve-persona.mjs — " +
			"the constant was renamed or moved; update this test."
		);
	}
	const body = match[1];
	const map = new Map<string, string>();
	// Each line: '  'skill-id': 'persona-key',' — parse entry pairs
	for (const line of body.split("\n")) {
		const entry = line.match(/'([^']+)'\s*:\s*'([^']+)'/);
		if (entry) {
			map.set(entry[1], entry[2]);
		}
	}
	return map;
}

test("risk-4: every gates.json persona key resolves in SKILL_ID_TO_PERSONA", () => {
	const gatesRaw = fs.readFileSync(
		path.join(REPO_ROOT, ".ai-skills", "hooks", "gates.json"),
		"utf8"
	);
	const resolvePersonaSource = fs.readFileSync(
		path.join(REPO_ROOT, ".ai-skills", "hooks", "lib", "resolve-persona.mjs"),
		"utf8"
	);

	const gates = JSON.parse(gatesRaw) as Record<string, unknown>;
	const skillIdToPersona = extractSkillIdToPersona(resolvePersonaSource);
	const personaValues = new Set(skillIdToPersona.values());

	// _shared is a reserved non-persona top-level key — skip it in the persona-key check.
	const gatesPersonaKeys = Object.keys(gates).filter((key) => key !== "_shared");
	const missing = gatesPersonaKeys.filter((key) => !personaValues.has(key));

	assert.deepEqual(
		missing,
		[],
		`risk-4: gates.json persona keys with no entry in SKILL_ID_TO_PERSONA: [${missing.join(", ")}]. ` +
		`Add a skill-id → '${missing[0]}' mapping to resolve-persona.mjs SKILL_ID_TO_PERSONA.`
	);
});

test("risk-4: every non-exempt SKILL_ID_TO_PERSONA value resolves in gates.json", () => {
	const gatesRaw = fs.readFileSync(
		path.join(REPO_ROOT, ".ai-skills", "hooks", "gates.json"),
		"utf8"
	);
	const resolvePersonaSource = fs.readFileSync(
		path.join(REPO_ROOT, ".ai-skills", "hooks", "lib", "resolve-persona.mjs"),
		"utf8"
	);

	const gates = JSON.parse(gatesRaw) as Record<string, unknown>;
	const skillIdToPersona = extractSkillIdToPersona(resolvePersonaSource);

	// Non-exempt skills whose persona values must appear in gates.json
	const nonExemptPersonaValues = [...skillIdToPersona.entries()]
		.filter(([skillId]) => !EXEMPT_SKILLS.has(skillId))
		.map(([, personaValue]) => personaValue);

	// Deduplicate (multiple skill IDs can map to the same persona)
	const unique = [...new Set(nonExemptPersonaValues)];
	const missing = unique.filter((key) => !(key in gates));

	// Phase 5 PR1 gates only clove/sage/atlas — this assertion is intentionally
	// a build-time check that fires only when SKILL_ID_TO_PERSONA has values not yet
	// covered by gates.json. During the Phase 5 rollout the rest of the roster is added
	// progressively; this test ensures no entry in the map silently lacks a gate.
	//
	// If this test fails: add the missing persona(s) to gates.json before landing.
	// If a new skill is added to SKILL_ID_TO_PERSONA before its Phase 5 PR: add it to
	// EXEMPT_SKILLS above temporarily, with a comment naming the Phase 5 PR that adds it.
	assert.deepEqual(
		missing,
		[],
		`risk-4: non-exempt SKILL_ID_TO_PERSONA values with no entry in gates.json: [${missing.join(", ")}]. ` +
		`Add gates.json entries for these personas, or add their skill IDs to EXEMPT_SKILLS in this test.`
	);
});
