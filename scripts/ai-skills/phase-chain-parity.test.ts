/**
 * Drift guard for the conductor's build-segment lane phase chain. Run via
 * `pnpm prism:test`.
 *
 * This is the phase-chain twin of `verdict-enum-parity.test.ts` — same
 * defect class (run-time reconstruction of a canonical structure), different
 * structure. The `## Canonical lane phase chain` block in `step-04-dispatch.md`
 * is the only place the six build-segment phases are enumerated; this suite
 * asserts it stays a contiguous, same-order subsequence of the full
 * `currentPhase` lifecycle enum in `lib/goal-state.md`, that `phaseLog`'s
 * phase enum matches the chain exactly, that `ac-verify` and `qa` both map
 * to Reese (the pairing the 2026-07-21 wave-1 run's dropped-`qa` defect
 * violated), and that no file re-enumerates the chain as a bare
 * arrow-literal instead of citing the block.
 */
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import { extractSection } from "./lib/markdown-section";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "../..");

const EXPECTED_PHASES = ["implement", "ac-verify", "self-review", "pr-review", "qa", "docs"];
const ARROW_LITERAL = EXPECTED_PHASES.join(" → ");

const STEP_04_PATH = path.join(
	repoRoot,
	".prism",
	"skills",
	"prism-conductor",
	"step-04-dispatch.md"
);
const STEP_01_PATH = path.join(
	repoRoot,
	".prism",
	"skills",
	"prism-conductor",
	"step-01-init.md"
);
const GOAL_STATE_PATH = path.join(
	repoRoot,
	".prism",
	"skills",
	"prism-conductor",
	"lib",
	"goal-state.md"
);

interface PhaseLine {
	phase: string;
	persona: string;
}

/** Parses the `<phase>  → <Persona>  <description>` lines out of the fenced phase-chain block. */
function extractPhaseChainBlock(sectionText: string): PhaseLine[] {
	const fenceMatch = sectionText.match(/```([\s\S]*?)```/);
	if (!fenceMatch) {
		throw new Error("No fenced code block found in § Canonical lane phase chain");
	}
	const lines = fenceMatch[1].split("\n").filter((line) => line.trim().length > 0);
	return lines.map((line) => {
		const match = line.match(/^(\S+)\s*→\s*(\S+)/);
		if (!match) {
			throw new Error(`Phase-chain line does not match '<phase> → <Persona>' shape: "${line}"`);
		}
		return { phase: match[1], persona: match[2] };
	});
}

test("step-04-dispatch.md: Canonical lane phase chain block lists the six build phases in order", async () => {
	const raw = await fs.readFile(STEP_04_PATH, "utf8");
	const section = extractSection(raw, "## Canonical lane phase chain");
	const phases = extractPhaseChainBlock(section).map((line) => line.phase);
	assert.deepEqual(
		phases,
		EXPECTED_PHASES,
		`§ Canonical lane phase chain order/values diverged from the expected chain. Found: [${phases.join(", ")}]`
	);
});

test("step-04-dispatch.md: phase chain is a contiguous, same-order subsequence of goal-state's currentPhase enum", async () => {
	const [dispatchRaw, goalStateRaw] = await Promise.all([
		fs.readFile(STEP_04_PATH, "utf8"),
		fs.readFile(GOAL_STATE_PATH, "utf8"),
	]);
	const section = extractSection(dispatchRaw, "## Canonical lane phase chain");
	const phases = extractPhaseChainBlock(section).map((line) => line.phase);

	const currentPhaseMatch = goalStateRaw.match(/"currentPhase":\s*"([^"]+)"/);
	if (!currentPhaseMatch) {
		throw new Error("No `currentPhase` schema field found in lib/goal-state.md");
	}
	const enumValues = currentPhaseMatch[1].split("|").map((v) => v.trim());

	const missing = phases.filter((phase) => !enumValues.includes(phase));
	assert.equal(
		missing.length,
		0,
		`Phase(s) in § Canonical lane phase chain missing from goal-state's currentPhase enum: [${missing.join(", ")}]`
	);

	const startIndex = enumValues.indexOf(phases[0]);
	const actualSlice = enumValues.slice(startIndex, startIndex + phases.length);
	assert.deepEqual(
		actualSlice,
		phases,
		`§ Canonical lane phase chain is not a contiguous, same-order subsequence of currentPhase. Expected [${phases.join(", ")}], found [${actualSlice.join(", ")}] starting at index ${startIndex}`
	);
});

test("lib/goal-state.md: phaseLog's phase enum matches the canonical lane phase chain exactly", async () => {
	const [dispatchRaw, goalStateRaw] = await Promise.all([
		fs.readFile(STEP_04_PATH, "utf8"),
		fs.readFile(GOAL_STATE_PATH, "utf8"),
	]);
	const section = extractSection(dispatchRaw, "## Canonical lane phase chain");
	const phases = extractPhaseChainBlock(section).map((line) => line.phase);

	const phaseLogMatch = goalStateRaw.match(/"phaseLog":[\s\S]*?"phase":\s*"([^"]+)"/);
	if (!phaseLogMatch) {
		throw new Error("No `phaseLog` schema field found in lib/goal-state.md");
	}
	const phaseLogEnum = phaseLogMatch[1].split("|").map((v) => v.trim());

	assert.deepEqual(
		phaseLogEnum,
		phases,
		`phaseLog's phase enum diverged from § Canonical lane phase chain. Expected [${phases.join(", ")}], found [${phaseLogEnum.join(", ")}]`
	);
});

test("step-04-dispatch.md: every phase names a dispatching persona, and ac-verify + qa both map to Reese", async () => {
	const raw = await fs.readFile(STEP_04_PATH, "utf8");
	const section = extractSection(raw, "## Canonical lane phase chain");
	const lines = extractPhaseChainBlock(section);

	const missingPersona = lines.filter((line) => line.persona.trim().length === 0);
	assert.equal(
		missingPersona.length,
		0,
		`Phase(s) with no dispatching persona named: [${missingPersona.map((l) => l.phase).join(", ")}]`
	);

	const acVerify = lines.find((line) => line.phase === "ac-verify");
	const qa = lines.find((line) => line.phase === "qa");
	assert.ok(acVerify && qa, "Both ac-verify and qa must be present in the phase chain block");
	assert.equal(
		acVerify!.persona,
		"Reese",
		`ac-verify must map to Reese, found '${acVerify!.persona}'`
	);
	assert.equal(qa!.persona, "Reese", `qa must map to Reese, found '${qa!.persona}'`);
});

test("step-04-dispatch.md and step-01-init.md: chain is cited, never re-enumerated as an arrow literal", async () => {
	const [dispatchRaw, initRaw] = await Promise.all([
		fs.readFile(STEP_04_PATH, "utf8"),
		fs.readFile(STEP_01_PATH, "utf8"),
	]);

	const dispatchOccurrences = dispatchRaw.split(ARROW_LITERAL).length - 1;
	const initOccurrences = initRaw.split(ARROW_LITERAL).length - 1;

	assert.equal(
		dispatchOccurrences,
		0,
		`step-04-dispatch.md re-enumerates the phase chain as the arrow literal instead of citing § Canonical lane phase chain (${dispatchOccurrences} occurrence(s))`
	);
	assert.equal(
		initOccurrences,
		0,
		`step-01-init.md re-enumerates the phase chain as the arrow literal instead of citing step-04-dispatch.md § Canonical lane phase chain (${initOccurrences} occurrence(s))`
	);
});
