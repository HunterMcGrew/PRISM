/**
 * Regression suite for the spec-content-scope lint.
 *
 * Exercises `evaluateSpecScopeLint` against temp trees built per test, rather
 * than the fixed repo tree — each test controls its own plan file, changed
 * path, and frontmatter, following the `crossref-lint.test.ts` pattern of
 * testing exported pure functions against a controlled filesystem.
 *
 * The three fixtures below are the acceptance bar for AC-6: a lint that
 * passes one half and fails the other is UNMET.
 */
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

import {
	evaluateSpecScopeLint,
	isMirrorPath,
	isCuratedSeedTwin,
	isAlwaysOnSpecContent,
	isUnrelatedToTicket,
	deriveExitCode,
	resolveBranchNameFromEnv,
	readDefaultBranch,
	resolveMergeBaseRef,
	describeNoLivePlan,
} from "./spec-scope-lint";

// ---------------------------------------------------------------------------
// Test helper
// ---------------------------------------------------------------------------

async function withTempTree(
	build: (tempRoot: string) => Promise<void>,
	check: (tempRoot: string) => Promise<void>
): Promise<void> {
	const tempRoot = await fs.mkdtemp(
		path.join(os.tmpdir(), "prism-spec-scope-lint-")
	);
	try {
		await build(tempRoot);
		await check(tempRoot);
	} finally {
		await fs.rm(tempRoot, { force: true, recursive: true });
	}
}

async function writeFile(
	tempRoot: string,
	relativePath: string,
	content: string
): Promise<void> {
	const absPath = path.join(tempRoot, relativePath);
	await fs.mkdir(path.dirname(absPath), { recursive: true });
	await fs.writeFile(absPath, content, "utf8");
}

const ALWAYS_ON_RULE = `---
load: always
---

# Some rule

Body text.
`;

// ---------------------------------------------------------------------------
// isMirrorPath
// ---------------------------------------------------------------------------

test("isMirrorPath: recognizes every mirror root", () => {
	assert.equal(isMirrorPath(".claude/rules/foo.md"), true);
	assert.equal(isMirrorPath(".codex/rules/foo.md"), true);
	assert.equal(isMirrorPath(".cursor/rules/foo.mdc"), true);
	assert.equal(isMirrorPath("templates/install/.prism/rules/foo.md"), true);
});

test("isMirrorPath: false for canonical paths", () => {
	assert.equal(isMirrorPath(".prism/rules/foo.md"), false);
	assert.equal(isMirrorPath(".ai-skills/skills/prism-clove/shared.md"), false);
});

// ---------------------------------------------------------------------------
// isCuratedSeedTwin
// ---------------------------------------------------------------------------

const SEED_CURATION_WITH_REVIEW_DOCS_IMPACT = JSON.stringify({
	excluded: [],
	curated: ["references/review-docs-impact.md"],
	seedOnly: [],
	renames: {},
});

test("isCuratedSeedTwin: true for a templates/install path listed in seed-curation.json's curated array", async () => {
	await withTempTree(
		async (tempRoot) => {
			await writeFile(
				tempRoot,
				".ai-skills/definitions/seed-curation.json",
				SEED_CURATION_WITH_REVIEW_DOCS_IMPACT
			);
		},
		async (tempRoot) => {
			assert.equal(
				await isCuratedSeedTwin(
					tempRoot,
					"templates/install/.prism/references/review-docs-impact.md"
				),
				true
			);
		}
	);
});

test("isCuratedSeedTwin: false for a templates/install path absent from the curated array", async () => {
	await withTempTree(
		async (tempRoot) => {
			await writeFile(
				tempRoot,
				".ai-skills/definitions/seed-curation.json",
				SEED_CURATION_WITH_REVIEW_DOCS_IMPACT
			);
		},
		async (tempRoot) => {
			assert.equal(
				await isCuratedSeedTwin(
					tempRoot,
					"templates/install/.prism/rules/response-shape.md"
				),
				false
			);
		}
	);
});

test("isCuratedSeedTwin: false for a canonical path (no templates/install prefix)", async () => {
	await withTempTree(
		async (tempRoot) => {
			await writeFile(
				tempRoot,
				".ai-skills/definitions/seed-curation.json",
				SEED_CURATION_WITH_REVIEW_DOCS_IMPACT
			);
		},
		async (tempRoot) => {
			assert.equal(
				await isCuratedSeedTwin(tempRoot, ".prism/references/review-docs-impact.md"),
				false
			);
		}
	);
});

// ---------------------------------------------------------------------------
// isAlwaysOnSpecContent (Condition A)
// ---------------------------------------------------------------------------

test("isAlwaysOnSpecContent: true for .ai-skills/skills/** regardless of frontmatter", async () => {
	await withTempTree(
		async (tempRoot) => {
			await writeFile(
				tempRoot,
				".ai-skills/skills/prism-clove/shared.md",
				"No frontmatter here.\n"
			);
		},
		async (tempRoot) => {
			const result = await isAlwaysOnSpecContent(
				tempRoot,
				".ai-skills/skills/prism-clove/shared.md"
			);
			assert.equal(result, true);
		}
	);
});

test("isAlwaysOnSpecContent: true for .prism/lessons.md", async () => {
	await withTempTree(
		async (tempRoot) => {
			await writeFile(tempRoot, ".prism/lessons.md", "- a lesson\n");
		},
		async (tempRoot) => {
			assert.equal(
				await isAlwaysOnSpecContent(tempRoot, ".prism/lessons.md"),
				true
			);
		}
	);
});

test("isAlwaysOnSpecContent: true for .prism/references/review-*.md", async () => {
	await withTempTree(
		async (tempRoot) => {
			await writeFile(
				tempRoot,
				".prism/references/review-frameworks.md",
				"Body.\n"
			);
		},
		async (tempRoot) => {
			assert.equal(
				await isAlwaysOnSpecContent(
					tempRoot,
					".prism/references/review-frameworks.md"
				),
				true
			);
		}
	);
});

test("isAlwaysOnSpecContent: true when frontmatter declares load: always", async () => {
	await withTempTree(
		async (tempRoot) => {
			await writeFile(tempRoot, ".prism/rules/some-rule.md", ALWAYS_ON_RULE);
		},
		async (tempRoot) => {
			assert.equal(
				await isAlwaysOnSpecContent(tempRoot, ".prism/rules/some-rule.md"),
				true
			);
		}
	);
});

test("isAlwaysOnSpecContent: false when frontmatter declares a non-always load value", async () => {
	await withTempTree(
		async (tempRoot) => {
			await writeFile(
				tempRoot,
				".prism/rules/some-rule.md",
				"---\nload: paths\n---\n\n# Some rule\n"
			);
		},
		async (tempRoot) => {
			assert.equal(
				await isAlwaysOnSpecContent(tempRoot, ".prism/rules/some-rule.md"),
				false
			);
		}
	);
});

test("isAlwaysOnSpecContent: false for a deleted path (nothing to read)", async () => {
	await withTempTree(
		async () => {},
		async (tempRoot) => {
			assert.equal(
				await isAlwaysOnSpecContent(tempRoot, ".prism/rules/gone.md"),
				false
			);
		}
	);
});

// ---------------------------------------------------------------------------
// isUnrelatedToTicket (Condition B)
// ---------------------------------------------------------------------------

test("isUnrelatedToTicket: false when the basename appears in the plan text", () => {
	const planText = "## Goal\n\nUpdate `some-rule.md` for the new behavior.\n";
	assert.equal(isUnrelatedToTicket(".prism/rules/some-rule.md", planText), false);
});

test("isUnrelatedToTicket: true when the basename appears nowhere in the plan text", () => {
	const planText = "## Goal\n\nUpdate the widget renderer.\n";
	assert.equal(isUnrelatedToTicket(".prism/rules/some-rule.md", planText), true);
});

test("isUnrelatedToTicket: for .ai-skills/skills/** paths, a shared basename mentioned for a different skill does not clear the file", () => {
	const planText =
		"## Implementation Tasks\n\n1. Edit `.ai-skills/skills/prism-review-loop/shared.md`.\n";
	assert.equal(
		isUnrelatedToTicket(
			".ai-skills/skills/prism-review-loop/shared.md",
			planText
		),
		false
	);
	assert.equal(
		isUnrelatedToTicket(".ai-skills/skills/prism-architect/shared.md", planText),
		true
	);
});

test("isUnrelatedToTicket: for .ai-skills/skills/** paths, naming one file in the skill directory clears every sibling file in that directory", () => {
	const planText =
		"## Implementation Tasks\n\n1. Edit `.ai-skills/skills/prism-conductor/shared.md` and its platform half.\n";
	assert.equal(
		isUnrelatedToTicket(".ai-skills/skills/prism-conductor/shared.md", planText),
		false
	);
	assert.equal(
		isUnrelatedToTicket(".ai-skills/skills/prism-conductor/claude.md", planText),
		false
	);
	assert.equal(
		isUnrelatedToTicket(
			".ai-skills/skills/prism-conductor/lib/report-back.md",
			planText
		),
		false
	);
});

test("isUnrelatedToTicket: a discriminator mentioned only inside a Ledger section (## Review Issues) does not clear the file", () => {
	const planText = [
		"## Implementation Tasks",
		"",
		"1. Fix the widget renderer.",
		"",
		"## Review Issues",
		"",
		"### Some prior finding",
		"",
		"- **Fixed in:** touched `.ai-skills/skills/prism-architect/shared.md` as part of the fix.",
		"",
	].join("\n");
	assert.equal(
		isUnrelatedToTicket(".ai-skills/skills/prism-architect/shared.md", planText),
		true
	);
});

test("isUnrelatedToTicket: a discriminator mentioned only inside ## History or ## Sessions does not clear the file", () => {
	const planText = [
		"## Implementation Tasks",
		"",
		"1. Fix the widget renderer.",
		"",
		"## History",
		"",
		"- 2026-07-25 [branch]: Touched `.prism/rules/some-rule.md` while fixing a prior review comment.",
		"",
		"## Sessions",
		"",
		"- 2026-07-25 [branch] open: mentions `.prism/rules/some-rule.md` in passing.",
		"",
	].join("\n");
	assert.equal(isUnrelatedToTicket(".prism/rules/some-rule.md", planText), true);
});

test("isUnrelatedToTicket: a discriminator named in ## Decisions (outside any Ledger section) still clears the file", () => {
	const planText = [
		"## Decisions",
		"",
		"- `.prism/rules/some-rule.md` intentionally updated to reflect the new predicate.",
		"",
	].join("\n");
	assert.equal(isUnrelatedToTicket(".prism/rules/some-rule.md", planText), false);
});

// ---------------------------------------------------------------------------
// deriveExitCode
// ---------------------------------------------------------------------------

test("deriveExitCode: 0 for no violations, 1 for any violations", () => {
	assert.equal(deriveExitCode([]), 0);
	assert.equal(
		deriveExitCode([{ path: ".prism/rules/x.md", planPath: ".prism/plans/x.md" }]),
		1
	);
});

// ---------------------------------------------------------------------------
// evaluateSpecScopeLint — the three required fixtures (AC-6)
// ---------------------------------------------------------------------------

test("fold-in fixture: a second surface of an artifact the plan already names passes clean", async () => {
	const branchName = "someone/prism-9001-fold-in";

	await withTempTree(
		async (tempRoot) => {
			await writeFile(
				tempRoot,
				".prism/plans/prism-9001.md",
				[
					"# Plan: prism-9001",
					"",
					"## Goal",
					"",
					"Roll `response-shape.md` out to a second surface.",
					"",
					"## Implementation Tasks",
					"",
					"1. Update `response-shape.md` at both surfaces.",
					"",
				].join("\n")
			);
			// The mirror path is excluded from evaluation entirely — the
			// canonical `.prism/rules/response-shape.md` (also named in the
			// plan above) carries the real verdict.
			await writeFile(
				tempRoot,
				"templates/install/.prism/rules/response-shape.md",
				ALWAYS_ON_RULE
			);
		},
		async (tempRoot) => {
			const result = await evaluateSpecScopeLint(
				tempRoot,
				["templates/install/.prism/rules/response-shape.md"],
				branchName
			);
			assert.equal(deriveExitCode(result.violations), 0);
			assert.deepEqual(result.violations, []);
		}
	);
});

test("back-out fixture: an always-on rule unrelated to the plan fires", async () => {
	const branchName = "someone/prism-9002-unrelated-feature";

	await withTempTree(
		async (tempRoot) => {
			await writeFile(
				tempRoot,
				".prism/plans/prism-9002.md",
				[
					"# Plan: prism-9002",
					"",
					"## Goal",
					"",
					"Fix the widget renderer's overflow bug.",
					"",
					"## Decisions",
					"",
					"- Nothing relevant here.",
					"",
				].join("\n")
			);
			await writeFile(
				tempRoot,
				".prism/rules/some-unrelated-rule.md",
				ALWAYS_ON_RULE
			);
		},
		async (tempRoot) => {
			const result = await evaluateSpecScopeLint(
				tempRoot,
				[".prism/rules/some-unrelated-rule.md"],
				branchName
			);
			assert.equal(deriveExitCode(result.violations), 1);
			assert.deepEqual(result.violations, [
				{
					path: ".prism/rules/some-unrelated-rule.md",
					planPath: ".prism/plans/prism-9002.md",
				},
			]);
		}
	);
});

test("escape-hatch fixture: a ## Decisions entry naming the path suppresses the error", async () => {
	const branchName = "someone/prism-9003-unrelated-feature";

	await withTempTree(
		async (tempRoot) => {
			await writeFile(
				tempRoot,
				".prism/plans/prism-9003.md",
				[
					"# Plan: prism-9003",
					"",
					"## Goal",
					"",
					"Fix the widget renderer's overflow bug.",
					"",
					"## Decisions",
					"",
					"- Also touching `.prism/rules/some-unrelated-rule.md` here because the",
					"  overflow fix and this rule share a helper — see the change together.",
					"",
				].join("\n")
			);
			await writeFile(
				tempRoot,
				".prism/rules/some-unrelated-rule.md",
				ALWAYS_ON_RULE
			);
		},
		async (tempRoot) => {
			const result = await evaluateSpecScopeLint(
				tempRoot,
				[".prism/rules/some-unrelated-rule.md"],
				branchName
			);
			assert.equal(deriveExitCode(result.violations), 0);
			assert.deepEqual(result.violations, []);
		}
	);
});

test("skill-body basename collision: naming one skill's shared.md in the plan does not clear another skill's shared.md", async () => {
	const branchName = "someone/prism-9010-unrelated-feature";

	await withTempTree(
		async (tempRoot) => {
			await writeFile(
				tempRoot,
				".prism/plans/prism-9010.md",
				[
					"# Plan: prism-9010",
					"",
					"## Goal",
					"",
					"Update the review-loop skill's shared.md body.",
					"",
					"## Implementation Tasks",
					"",
					"1. Edit `.ai-skills/skills/prism-review-loop/shared.md`.",
					"",
				].join("\n")
			);
			await writeFile(
				tempRoot,
				".ai-skills/skills/prism-review-loop/shared.md",
				"Body.\n"
			);
			await writeFile(
				tempRoot,
				".ai-skills/skills/prism-architect/shared.md",
				"Body.\n"
			);
		},
		async (tempRoot) => {
			const result = await evaluateSpecScopeLint(
				tempRoot,
				[
					".ai-skills/skills/prism-review-loop/shared.md",
					".ai-skills/skills/prism-architect/shared.md",
				],
				branchName
			);
			assert.equal(deriveExitCode(result.violations), 1);
			assert.deepEqual(result.violations, [
				{
					path: ".ai-skills/skills/prism-architect/shared.md",
					planPath: ".prism/plans/prism-9010.md",
				},
			]);
		}
	);
});

test("same-skill sibling-file fixture: a plan naming one file in a skill directory clears every sibling file in that directory (fold-in)", async () => {
	const branchName = "someone/prism-9011-unrelated-feature";

	await withTempTree(
		async (tempRoot) => {
			await writeFile(
				tempRoot,
				".prism/plans/prism-9011.md",
				[
					"# Plan: prism-9011",
					"",
					"## Goal",
					"",
					"Update the conductor skill's shared.md body.",
					"",
					"## Implementation Tasks",
					"",
					"1. Edit `.ai-skills/skills/prism-conductor/shared.md` and its platform half.",
					"",
				].join("\n")
			);
			await writeFile(
				tempRoot,
				".ai-skills/skills/prism-conductor/shared.md",
				"Body.\n"
			);
			await writeFile(
				tempRoot,
				".ai-skills/skills/prism-conductor/claude.md",
				"Body.\n"
			);
		},
		async (tempRoot) => {
			const result = await evaluateSpecScopeLint(
				tempRoot,
				[
					".ai-skills/skills/prism-conductor/shared.md",
					".ai-skills/skills/prism-conductor/claude.md",
				],
				branchName
			);
			assert.equal(deriveExitCode(result.violations), 0);
			assert.deepEqual(result.violations, []);
		}
	);
});

test("Ledger-only-mention fixture: a discriminator recorded only in a fix-in note under ## Review Issues still fires", async () => {
	const branchName = "someone/prism-9012-unrelated-feature";

	await withTempTree(
		async (tempRoot) => {
			await writeFile(
				tempRoot,
				".prism/plans/prism-9012.md",
				[
					"# Plan: prism-9012",
					"",
					"## Goal",
					"",
					"Fix the widget renderer's overflow bug.",
					"",
					"## Review Issues",
					"",
					"### A prior finding",
					"",
					"- **Fixed in:** also touched `.ai-skills/skills/prism-architect/shared.md` while fixing this.",
					"",
				].join("\n")
			);
			await writeFile(
				tempRoot,
				".ai-skills/skills/prism-architect/shared.md",
				"Body.\n"
			);
		},
		async (tempRoot) => {
			const result = await evaluateSpecScopeLint(
				tempRoot,
				[".ai-skills/skills/prism-architect/shared.md"],
				branchName
			);
			assert.equal(deriveExitCode(result.violations), 1);
			assert.deepEqual(result.violations, [
				{
					path: ".ai-skills/skills/prism-architect/shared.md",
					planPath: ".prism/plans/prism-9012.md",
				},
			]);
		}
	);
});

// ---------------------------------------------------------------------------
// Curated seed twin regression — an edit to a curated templates/install
// twin alone, with no canonical file touched in the same diff, fires.
// ---------------------------------------------------------------------------

test("curated-twin fixture: editing a curated install-seed twin alone, unrelated to the plan, fires", async () => {
	const branchName = "someone/prism-9004-unrelated-feature";

	await withTempTree(
		async (tempRoot) => {
			await writeFile(
				tempRoot,
				".ai-skills/definitions/seed-curation.json",
				SEED_CURATION_WITH_REVIEW_DOCS_IMPACT
			);
			await writeFile(
				tempRoot,
				".prism/plans/prism-9004.md",
				[
					"# Plan: prism-9004",
					"",
					"## Goal",
					"",
					"Fix the widget renderer's overflow bug.",
					"",
				].join("\n")
			);
			// No frontmatter — this file matches Condition A only via the
			// `review-*.md` path pattern, which must be checked against its
			// canonical-equivalent path, not its templates/install location.
			await writeFile(
				tempRoot,
				"templates/install/.prism/references/review-docs-impact.md",
				"# Docs Impact Check\n\nBody text.\n"
			);
		},
		async (tempRoot) => {
			const result = await evaluateSpecScopeLint(
				tempRoot,
				["templates/install/.prism/references/review-docs-impact.md"],
				branchName
			);
			assert.equal(deriveExitCode(result.violations), 1);
			assert.deepEqual(result.violations, [
				{
					path: "templates/install/.prism/references/review-docs-impact.md",
					planPath: ".prism/plans/prism-9004.md",
				},
			]);
		}
	);
});

test("curated-twin fixture: a non-curated templates/install twin still inherits the mirror skip", async () => {
	const branchName = "someone/prism-9005-unrelated-feature";

	await withTempTree(
		async (tempRoot) => {
			await writeFile(
				tempRoot,
				".ai-skills/definitions/seed-curation.json",
				SEED_CURATION_WITH_REVIEW_DOCS_IMPACT
			);
			await writeFile(
				tempRoot,
				".prism/plans/prism-9005.md",
				["# Plan: prism-9005", "", "## Goal", "", "Fix the overflow bug.", ""].join(
					"\n"
				)
			);
			await writeFile(
				tempRoot,
				"templates/install/.prism/rules/response-shape.md",
				ALWAYS_ON_RULE
			);
		},
		async (tempRoot) => {
			const result = await evaluateSpecScopeLint(
				tempRoot,
				["templates/install/.prism/rules/response-shape.md"],
				branchName
			);
			assert.equal(deriveExitCode(result.violations), 0);
			assert.deepEqual(result.violations, []);
		}
	);
});

// ---------------------------------------------------------------------------
// resolveBranchNameFromEnv — detached-HEAD CI branch detection
// ---------------------------------------------------------------------------

test("resolveBranchNameFromEnv: reads GITHUB_HEAD_REF when set", () => {
	const original = process.env.GITHUB_HEAD_REF;
	process.env.GITHUB_HEAD_REF = "huntermcgrew/prism-1234-fix-thing";
	try {
		assert.equal(
			resolveBranchNameFromEnv(),
			"huntermcgrew/prism-1234-fix-thing"
		);
	} finally {
		if (original === undefined) {
			delete process.env.GITHUB_HEAD_REF;
		} else {
			process.env.GITHUB_HEAD_REF = original;
		}
	}
});

test("resolveBranchNameFromEnv: null when GITHUB_HEAD_REF is unset — the detached-HEAD case main() must fall back from", () => {
	const original = process.env.GITHUB_HEAD_REF;
	delete process.env.GITHUB_HEAD_REF;
	try {
		assert.equal(resolveBranchNameFromEnv(), null);
	} finally {
		if (original !== undefined) {
			process.env.GITHUB_HEAD_REF = original;
		}
	}
});

test("resolveBranchNameFromEnv: null when GITHUB_HEAD_REF is set but empty", () => {
	const original = process.env.GITHUB_HEAD_REF;
	process.env.GITHUB_HEAD_REF = "";
	try {
		assert.equal(resolveBranchNameFromEnv(), null);
	} finally {
		if (original === undefined) {
			delete process.env.GITHUB_HEAD_REF;
		} else {
			process.env.GITHUB_HEAD_REF = original;
		}
	}
});

// ---------------------------------------------------------------------------
// No live plan resolves
// ---------------------------------------------------------------------------

test("evaluateSpecScopeLint: passes clean when no live plan resolves for the branch", async () => {
	await withTempTree(
		async () => {},
		async (tempRoot) => {
			const result = await evaluateSpecScopeLint(
				tempRoot,
				[".prism/rules/some-unrelated-rule.md"],
				"someone/no-ticket-branch"
			);
			assert.equal(result.planPath, null);
			assert.deepEqual(result.violations, []);
		}
	);
});

// ---------------------------------------------------------------------------
// describeNoLivePlan — distinguishes "nothing matched" from "several
// unfiled plans matched," a state resolveLivePlan's own null can't carry.
// ---------------------------------------------------------------------------

test("describeNoLivePlan: reports plain no-match when nothing at all resolves", async () => {
	await withTempTree(
		async () => {},
		async (tempRoot) => {
			assert.equal(
				await describeNoLivePlan("someone/no-ticket-branch", tempRoot),
				"spec-scope-lint: no live plan resolved for this branch — skipping."
			);
		}
	);
});

test("describeNoLivePlan: reports plain no-match when a ticket id is present but no tier resolves a plan", async () => {
	await withTempTree(
		async () => {},
		async (tempRoot) => {
			assert.equal(
				await describeNoLivePlan("someone/prism-1005-fix-thing", tempRoot),
				"spec-scope-lint: no live plan resolved for this branch — skipping."
			);
		}
	);
});

test("describeNoLivePlan: names the colliding candidates when several unfiled plans match the branch slug", async () => {
	const branchName = "huntermcgrew/prism-review-loop-self-audit";

	await withTempTree(
		async (tempRoot) => {
			await writeFile(
				tempRoot,
				".prism/plans/review-loop-self-audit.md",
				["# Plan: review-loop-self-audit", "", "## Ticket", "", "None yet.", ""].join(
					"\n"
				)
			);
			await writeFile(
				tempRoot,
				".prism/plans/review-loop-self.md",
				["# Plan: review-loop-self", "", "## Ticket", "", "TBD", ""].join("\n")
			);
		},
		async (tempRoot) => {
			assert.equal(
				await describeNoLivePlan(branchName, tempRoot),
				"spec-scope-lint: 2 unfiled plans match this branch slug (.prism/plans/review-loop-self-audit.md, .prism/plans/review-loop-self.md) — refusing to guess. Skipping."
			);
		}
	);
});

// ---------------------------------------------------------------------------
// readDefaultBranch
// ---------------------------------------------------------------------------

test("readDefaultBranch: falls back to 'main' when .ai-skills/config.json is absent", async () => {
	await withTempTree(
		async () => {},
		async (tempRoot) => {
			assert.equal(await readDefaultBranch(tempRoot), "main");
		}
	);
});

test("readDefaultBranch: reads the configured defaultBranch from .ai-skills/config.json", async () => {
	await withTempTree(
		async (tempRoot) => {
			await writeFile(
				tempRoot,
				".ai-skills/config.json",
				JSON.stringify({ defaultBranch: "trunk" })
			);
		},
		async (tempRoot) => {
			assert.equal(await readDefaultBranch(tempRoot), "trunk");
		}
	);
});

// ---------------------------------------------------------------------------
// resolveMergeBaseRef — merge-base resolution under CI's actual shallow checkout
// ---------------------------------------------------------------------------

/** True when `git` resolves on PATH — the git-backed tests below skip gracefully when it does not. */
let gitAvailable = true;

try {
	execFileSync("git", ["--version"], { stdio: "ignore" });
} catch {
	gitAvailable = false;
}

/**
 * Builds a bare "remote" repo with a `main` branch and a `feature` branch one
 * commit ahead, matching the shape a real PR branch has against its base.
 * Returns the bare remote's path.
 */
function createBareRemoteWithFeatureBranch(tempRoot: string): string {
	const remoteDir = path.join(tempRoot, "remote.git");
	const seedRepo = path.join(tempRoot, "seed");

	execFileSync("git", ["init", "--quiet", "--bare", "-b", "main", remoteDir], {
		stdio: "ignore",
	});
	execFileSync("git", ["clone", "--quiet", remoteDir, seedRepo], {
		stdio: "ignore",
	});
	execFileSync("git", ["config", "user.email", "test@prism.local"], {
		cwd: seedRepo,
		stdio: "ignore",
	});
	execFileSync("git", ["config", "user.name", "PRISM Test"], {
		cwd: seedRepo,
		stdio: "ignore",
	});
	execFileSync("git", ["commit", "--quiet", "--allow-empty", "-m", "seed"], {
		cwd: seedRepo,
		stdio: "ignore",
	});
	execFileSync("git", ["push", "--quiet", "-u", "origin", "main"], {
		cwd: seedRepo,
		stdio: "ignore",
	});
	execFileSync("git", ["checkout", "--quiet", "-b", "feature"], {
		cwd: seedRepo,
		stdio: "ignore",
	});
	execFileSync(
		"git",
		["commit", "--quiet", "--allow-empty", "-m", "feature work"],
		{ cwd: seedRepo, stdio: "ignore" }
	);
	execFileSync("git", ["push", "--quiet", "-u", "origin", "feature"], {
		cwd: seedRepo,
		stdio: "ignore",
	});

	return remoteDir;
}

/**
 * Clones `feature` as `actions/checkout@v4` does by default for `pull_request`
 * events: a single-branch, depth-1 fetch of only the PR's own ref. This is
 * the exact condition that reproduced the finding — `origin/main` and `main`
 * are both unresolvable in the resulting clone.
 */
function shallowCloneFeatureBranch(remoteDir: string, cloneDir: string): void {
	execFileSync(
		"git",
		[
			"clone",
			"--quiet",
			"--depth=1",
			"--branch=feature",
			"--single-branch",
			remoteDir,
			cloneDir,
		],
		{ stdio: "ignore" }
	);
}

test(
	"resolveMergeBaseRef: fetches origin/main on demand under CI's actual shallow, single-branch checkout",
	{ skip: !gitAvailable },
	async () => {
		await withTempTree(
			async () => {},
			async (tempRoot) => {
				const remoteDir = createBareRemoteWithFeatureBranch(tempRoot);
				const cloneDir = path.join(tempRoot, "clone");
				shallowCloneFeatureBranch(remoteDir, cloneDir);

				assert.throws(
					() =>
						execFileSync("git", ["rev-parse", "--verify", "origin/main"], {
							cwd: cloneDir,
							stdio: "ignore",
						}),
					"origin/main must not resolve before the fetch — this is the CI condition being reproduced"
				);

				const mergeBaseRef = await resolveMergeBaseRef(cloneDir, "main");
				assert.equal(mergeBaseRef, "origin/main");

				const mergeBase = execFileSync(
					"git",
					["merge-base", mergeBaseRef, "HEAD"],
					{ cwd: cloneDir }
				)
					.toString()
					.trim();
				assert.ok(
					mergeBase.length > 0,
					"merge-base must resolve to a commit, not silently no-op"
				);
			}
		);
	}
);

/**
 * Builds a bare "remote" repo where `main` advances two commits past the
 * point `feature` branched from — mirroring PRs landing on `main` while a
 * PR sits in review. Returns the bare remote's path and the fork-point
 * commit hash (the correct merge-base a depth-1 fetch of `main`'s tip
 * cannot reach).
 */
function createBareRemoteWithAdvancedMain(tempRoot: string): {
	remoteDir: string;
	forkPoint: string;
} {
	const remoteDir = path.join(tempRoot, "remote-advanced.git");
	const seedRepo = path.join(tempRoot, "seed-advanced");

	execFileSync("git", ["init", "--quiet", "--bare", "-b", "main", remoteDir], {
		stdio: "ignore",
	});
	execFileSync("git", ["clone", "--quiet", remoteDir, seedRepo], {
		stdio: "ignore",
	});
	execFileSync("git", ["config", "user.email", "test@prism.local"], {
		cwd: seedRepo,
		stdio: "ignore",
	});
	execFileSync("git", ["config", "user.name", "PRISM Test"], {
		cwd: seedRepo,
		stdio: "ignore",
	});
	execFileSync("git", ["commit", "--quiet", "--allow-empty", "-m", "seed"], {
		cwd: seedRepo,
		stdio: "ignore",
	});
	execFileSync("git", ["push", "--quiet", "-u", "origin", "main"], {
		cwd: seedRepo,
		stdio: "ignore",
	});

	const forkPoint = execFileSync("git", ["rev-parse", "HEAD"], {
		cwd: seedRepo,
	})
		.toString()
		.trim();

	execFileSync("git", ["checkout", "--quiet", "-b", "feature"], {
		cwd: seedRepo,
		stdio: "ignore",
	});
	execFileSync(
		"git",
		["commit", "--quiet", "--allow-empty", "-m", "feature work"],
		{ cwd: seedRepo, stdio: "ignore" }
	);
	execFileSync("git", ["push", "--quiet", "-u", "origin", "feature"], {
		cwd: seedRepo,
		stdio: "ignore",
	});

	execFileSync("git", ["checkout", "--quiet", "main"], {
		cwd: seedRepo,
		stdio: "ignore",
	});
	execFileSync(
		"git",
		["commit", "--quiet", "--allow-empty", "-m", "main advance 1"],
		{ cwd: seedRepo, stdio: "ignore" }
	);
	execFileSync(
		"git",
		["commit", "--quiet", "--allow-empty", "-m", "main advance 2"],
		{ cwd: seedRepo, stdio: "ignore" }
	);
	execFileSync("git", ["push", "--quiet", "origin", "main"], {
		cwd: seedRepo,
		stdio: "ignore",
	});

	return { remoteDir, forkPoint };
}

test(
	"resolveMergeBaseRef: resolves the true fork point once the default branch has advanced past it",
	{ skip: !gitAvailable },
	async () => {
		await withTempTree(
			async () => {},
			async (tempRoot) => {
				const { remoteDir, forkPoint } =
					createBareRemoteWithAdvancedMain(tempRoot);
				const cloneDir = path.join(tempRoot, "clone-advanced");
				shallowCloneFeatureBranch(remoteDir, cloneDir);

				const mergeBaseRef = await resolveMergeBaseRef(cloneDir, "main");
				assert.equal(mergeBaseRef, "origin/main");

				const mergeBase = execFileSync(
					"git",
					["merge-base", mergeBaseRef, "HEAD"],
					{ cwd: cloneDir }
				)
					.toString()
					.trim();
				assert.equal(
					mergeBase,
					forkPoint,
					"merge-base must resolve to the actual fork point, not fail once main has advanced past it"
				);
			}
		);
	}
);
