/**
 * Drift guard for the conductor's runtime phase-completeness check — the
 * two-tier hard-required / content-gated split in step-05-route.md's
 * close-time completeness check, and its report line in step-10-report.md.
 * Run via `pnpm prism:test`.
 *
 * This is the phase-completeness twin of `phase-chain-parity.test.ts` — same
 * defect class (an in-repo doc drifting from the invariant it documents),
 * different structure. It cannot see a runtime segment or a real `phaseLog`,
 * the same honest limit as the other parity tests: it asserts the two-tier
 * split stays internally consistent in prose, not that Sol enforces it
 * correctly at run time.
 */
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import { extractSection } from "./lib/markdown-section";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "../..");

const STEP_05_PATH = path.join(
	repoRoot,
	".prism",
	"skills",
	"prism-conductor",
	"step-05-route.md"
);
const STEP_10_PATH = path.join(
	repoRoot,
	".prism",
	"skills",
	"prism-conductor",
	"step-10-report.md"
);

const HARD_REQUIRED = ["implement", "self-review", "pr-review"];
const CONTENT_GATED = ["ac-verify", "qa", "docs"];

interface CompletenessBranches {
	hardRequired: string;
	contentGated: string;
}

/**
 * Slices the close-time completeness-check paragraph into its two routing
 * branches, anchored on the bolded lead-ins the doc uses for each tier.
 */
function splitCompletenessBranches(section: string): CompletenessBranches {
	const hardStart = section.indexOf("**Hard-required**");
	const contentStart = section.indexOf("**Content-gated**");
	if (hardStart === -1 || contentStart === -1 || contentStart < hardStart) {
		throw new Error(
			"step-05-route.md § Deterministic ratification is missing the **Hard-required** / **Content-gated** completeness-check branches"
		);
	}
	const paragraphEnd = section.indexOf("\n\n", contentStart);
	return {
		hardRequired: section.slice(hardStart, contentStart),
		contentGated: section.slice(
			contentStart,
			paragraphEnd === -1 ? undefined : paragraphEnd
		),
	};
}

async function readCompletenessBranches(): Promise<CompletenessBranches> {
	const raw = await fs.readFile(STEP_05_PATH, "utf8");
	const section = extractSection(raw, "### Deterministic ratification");
	return splitCompletenessBranches(section);
}

test("step-05-route.md: hard-required phases route to park/re-dispatch, not surface", async () => {
	const { hardRequired } = await readCompletenessBranches();

	for (const phase of HARD_REQUIRED) {
		assert.ok(
			hardRequired.includes(`\`${phase}\``),
			`step-05-route.md: hard-required branch is missing '${phase}'`
		);
	}
	assert.ok(
		/park|re-dispatch/i.test(hardRequired),
		"step-05-route.md: hard-required branch does not describe park/re-dispatch routing"
	);
});

test("step-05-route.md: content-gated phases route to surface, not park", async () => {
	const { contentGated } = await readCompletenessBranches();

	for (const phase of CONTENT_GATED) {
		assert.ok(
			contentGated.includes(`\`${phase}\``),
			`step-05-route.md: content-gated branch is missing '${phase}'`
		);
	}
	assert.ok(
		/surface/i.test(contentGated),
		"step-05-route.md: content-gated branch does not describe surfacing to the report"
	);
	assert.ok(
		/never park/i.test(contentGated),
		"step-05-route.md: content-gated branch does not say it never parks the lane"
	);
});

test("step-05-route.md: ac-verify and qa are content-gated, not hard-required — the exact pairing the 2026-07-21 wave-1 run dropped", async () => {
	const { hardRequired, contentGated } = await readCompletenessBranches();

	for (const phase of ["ac-verify", "qa"]) {
		assert.ok(
			contentGated.includes(`\`${phase}\``),
			`step-05-route.md: '${phase}' must appear in the content-gated branch`
		);
		assert.ok(
			!hardRequired.includes(`\`${phase}\``),
			`step-05-route.md: '${phase}' must not appear in the hard-required branch`
		);
	}
});

test("step-10-report.md: reports a phase-coverage-gap line for silently-absent content-gated phases", async () => {
	const raw = await fs.readFile(STEP_10_PATH, "utf8");
	assert.ok(
		raw.includes("Phase-coverage"),
		"step-10-report.md: missing the phase-coverage-gap report line"
	);
});
