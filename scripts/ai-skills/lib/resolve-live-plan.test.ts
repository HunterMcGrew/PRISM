/**
 * Regression suite for the shared live-plan resolver.
 *
 * Exercises every fallback tier — direct `<id>.md`, `epic-<id>.md`, the
 * `## Ticket` field scan, and the unfiled-plan-by-slug tier for branches with
 * no ticket-id-shaped token — plus `extractTicketId`'s branch-name parsing,
 * against temp trees built per test, following the
 * `spec-scope-lint.test.ts` pattern of testing exported pure functions
 * against a controlled filesystem.
 */
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import test from "node:test";
import assert from "node:assert/strict";

import {
	extractTicketId,
	resolveLivePlan,
	findUnfiledPlanCandidatesBySlug,
} from "./resolve-live-plan";

// ---------------------------------------------------------------------------
// Test helper
// ---------------------------------------------------------------------------

async function withTempTree(
	build: (tempRoot: string) => Promise<void>,
	check: (tempRoot: string) => Promise<void>
): Promise<void> {
	const tempRoot = await fs.mkdtemp(
		path.join(os.tmpdir(), "prism-resolve-live-plan-")
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

// ---------------------------------------------------------------------------
// extractTicketId
// ---------------------------------------------------------------------------

test("extractTicketId: extracts the ticket id from a <username>/<ticket-id>-<slug> branch", () => {
	assert.equal(
		extractTicketId("huntermcgrew/prism-1234-fix-thing"),
		"prism-1234"
	);
});

test("extractTicketId: a hyphenated username ahead of the ticket id does not shadow it", () => {
	assert.equal(extractTicketId("dev-2/prism-1234-fix-thing"), "prism-1234");
	assert.equal(extractTicketId("user-99/thr-42-fix-thing"), "thr-42");
});

test("extractTicketId: null for a branch with no ticket-id-shaped token", () => {
	assert.equal(extractTicketId("huntermcgrew/draft-cleanup"), null);
});

test("extractTicketId: works without a username prefix", () => {
	assert.equal(extractTicketId("prism-1234-fix-thing"), "prism-1234");
});

// ---------------------------------------------------------------------------
// resolveLivePlan — direct tier
// ---------------------------------------------------------------------------

test("resolveLivePlan: resolves the direct <id>.md tier", async () => {
	const branchName = "someone/prism-1001-fix-thing";

	await withTempTree(
		async (tempRoot) => {
			await writeFile(
				tempRoot,
				".prism/plans/prism-1001.md",
				"# Plan: prism-1001\n"
			);
		},
		async (tempRoot) => {
			assert.equal(
				await resolveLivePlan(branchName, tempRoot),
				".prism/plans/prism-1001.md"
			);
		}
	);
});

// ---------------------------------------------------------------------------
// resolveLivePlan — epic-<id>.md fallback tier
// ---------------------------------------------------------------------------

test("resolveLivePlan: falls back to the epic-<id>.md tier when the direct plan is absent", async () => {
	const branchName = "someone/prism-1002-fix-thing";

	await withTempTree(
		async (tempRoot) => {
			await writeFile(
				tempRoot,
				".prism/plans/epic-prism-1002.md",
				"# Plan: epic-prism-1002\n"
			);
		},
		async (tempRoot) => {
			assert.equal(
				await resolveLivePlan(branchName, tempRoot),
				".prism/plans/epic-prism-1002.md"
			);
		}
	);
});

// ---------------------------------------------------------------------------
// resolveLivePlan — ## Ticket field-scan fallback tier
// ---------------------------------------------------------------------------

test("resolveLivePlan: falls back to scanning ## Ticket fields when neither named tier exists", async () => {
	const branchName = "someone/prism-1003-fix-thing";

	await withTempTree(
		async (tempRoot) => {
			await writeFile(
				tempRoot,
				".prism/plans/some-other-name.md",
				["# Plan: some-other-name", "", "## Ticket", "", "PRISM-1003", ""].join(
					"\n"
				)
			);
		},
		async (tempRoot) => {
			assert.equal(
				await resolveLivePlan(branchName, tempRoot),
				".prism/plans/some-other-name.md"
			);
		}
	);
});

test("resolveLivePlan: the ## Ticket field-scan tier never reads .prism/archived/", async () => {
	const branchName = "someone/prism-1004-fix-thing";

	await withTempTree(
		async (tempRoot) => {
			await writeFile(
				tempRoot,
				".prism/archived/plans/some-archived-plan.md",
				["# Plan: some-archived-plan", "", "## Ticket", "", "PRISM-1004", ""].join(
					"\n"
				)
			);
		},
		async (tempRoot) => {
			assert.equal(await resolveLivePlan(branchName, tempRoot), null);
		}
	);
});

test("resolveLivePlan: the ## Ticket field-scan tier does not match a shorter ticket id as a prefix of a longer one", async () => {
	const branchName = "someone/prism-100-fix-thing";

	await withTempTree(
		async (tempRoot) => {
			await writeFile(
				tempRoot,
				".prism/plans/some-other-name.md",
				["# Plan: some-other-name", "", "## Ticket", "", "PRISM-1005", ""].join(
					"\n"
				)
			);
		},
		async (tempRoot) => {
			assert.equal(await resolveLivePlan(branchName, tempRoot), null);
		}
	);
});

test("resolveLivePlan: the ## Ticket field-scan tier resolves the correct plan when a prefix-related ticket id also exists", async () => {
	const branchName = "someone/prism-1005-fix-thing";

	await withTempTree(
		async (tempRoot) => {
			await writeFile(
				tempRoot,
				".prism/plans/plan-a.md",
				["# Plan: plan-a", "", "## Ticket", "", "PRISM-100", ""].join("\n")
			);
			await writeFile(
				tempRoot,
				".prism/plans/plan-b.md",
				["# Plan: plan-b", "", "## Ticket", "", "PRISM-1005", ""].join("\n")
			);
		},
		async (tempRoot) => {
			assert.equal(
				await resolveLivePlan(branchName, tempRoot),
				".prism/plans/plan-b.md"
			);
		}
	);
});

// ---------------------------------------------------------------------------
// resolveLivePlan — no ticket id, no plan
// ---------------------------------------------------------------------------

test("resolveLivePlan: null when the branch carries no ticket-id-shaped token", async () => {
	await withTempTree(
		async () => {},
		async (tempRoot) => {
			assert.equal(
				await resolveLivePlan("someone/draft-cleanup", tempRoot),
				null
			);
		}
	);
});

test("resolveLivePlan: null when a ticket id is present but no tier resolves a plan", async () => {
	await withTempTree(
		async () => {},
		async (tempRoot) => {
			assert.equal(
				await resolveLivePlan("someone/prism-1005-fix-thing", tempRoot),
				null
			);
		}
	);
});

// ---------------------------------------------------------------------------
// resolveLivePlan — unfiled-plan-by-slug fallback tier
// ---------------------------------------------------------------------------

test("resolveLivePlan: resolves a plan-first branch by matching an unfiled plan's filename slug", async () => {
	const branchName = "huntermcgrew/prism-review-loop-self-audit";

	await withTempTree(
		async (tempRoot) => {
			await writeFile(
				tempRoot,
				".prism/plans/review-loop-self-audit.md",
				[
					"# Plan: review-loop-self-audit",
					"",
					"## Ticket",
					"",
					"None yet — Nora files from this plan.",
					"",
				].join("\n")
			);
		},
		async (tempRoot) => {
			assert.equal(
				await resolveLivePlan(branchName, tempRoot),
				".prism/plans/review-loop-self-audit.md"
			);
		}
	);
});

test("resolveLivePlan: the unfiled-plan-by-slug tier skips a plan whose ## Ticket field is already filed", async () => {
	const branchName = "huntermcgrew/prism-review-loop-self-audit";

	await withTempTree(
		async (tempRoot) => {
			await writeFile(
				tempRoot,
				".prism/plans/review-loop-self-audit.md",
				["# Plan: review-loop-self-audit", "", "## Ticket", "", "PRISM-2001", ""].join(
					"\n"
				)
			);
		},
		async (tempRoot) => {
			assert.equal(await resolveLivePlan(branchName, tempRoot), null);
		}
	);
});

test("resolveLivePlan: the unfiled-plan-by-slug tier returns null when two unfiled plans both match", async () => {
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
			assert.equal(await resolveLivePlan(branchName, tempRoot), null);
		}
	);
});

test("findUnfiledPlanCandidatesBySlug: returns both candidates on the same collision resolveLivePlan collapses to null", async () => {
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
			assert.deepEqual(
				await findUnfiledPlanCandidatesBySlug(branchName, tempRoot),
				[
					".prism/plans/review-loop-self-audit.md",
					".prism/plans/review-loop-self.md",
				]
			);
		}
	);
});

test("findUnfiledPlanCandidatesBySlug: empty when no plan matches", async () => {
	await withTempTree(
		async () => {},
		async (tempRoot) => {
			assert.deepEqual(
				await findUnfiledPlanCandidatesBySlug("someone/no-ticket-branch", tempRoot),
				[]
			);
		}
	);
});

test("resolveLivePlan: the unfiled-plan-by-slug tier requires at least two hyphenated tokens in the slug", async () => {
	const branchName = "huntermcgrew/prism-audit";

	await withTempTree(
		async (tempRoot) => {
			await writeFile(
				tempRoot,
				".prism/plans/audit.md",
				["# Plan: audit", "", "## Ticket", "", "None yet.", ""].join("\n")
			);
		},
		async (tempRoot) => {
			assert.equal(await resolveLivePlan(branchName, tempRoot), null);
		}
	);
});

test("resolveLivePlan: the unfiled-plan-by-slug tier matches slug tokens in any order", async () => {
	const branchName = "huntermcgrew/thrive-port-opus5-rule-amendments";

	await withTempTree(
		async (tempRoot) => {
			await writeFile(
				tempRoot,
				".prism/plans/opus5-port.md",
				["# Plan: opus5-port", "", "## Ticket", "", "Unfiled — no tracker ticket.", ""].join(
					"\n"
				)
			);
		},
		async (tempRoot) => {
			assert.equal(
				await resolveLivePlan(branchName, tempRoot),
				".prism/plans/opus5-port.md"
			);
		}
	);
});

test("resolveLivePlan: the unfiled-plan-by-slug tier matches slug tokens separated by an unrelated token", async () => {
	const branchName = "huntermcgrew/opus5-lint-port-fix";

	await withTempTree(
		async (tempRoot) => {
			await writeFile(
				tempRoot,
				".prism/plans/opus5-port.md",
				["# Plan: opus5-port", "", "## Ticket", "", "Unfiled — no tracker ticket.", ""].join(
					"\n"
				)
			);
		},
		async (tempRoot) => {
			assert.equal(
				await resolveLivePlan(branchName, tempRoot),
				".prism/plans/opus5-port.md"
			);
		}
	);
});

test("resolveLivePlan: the unfiled-plan-by-slug tier does not match a slug token inside a longer branch token", async () => {
	const branchName = "huntermcgrew/catalog-porting-notes";

	await withTempTree(
		async (tempRoot) => {
			await writeFile(
				tempRoot,
				".prism/plans/log-port.md",
				["# Plan: log-port", "", "## Ticket", "", "Unfiled — no tracker ticket.", ""].join(
					"\n"
				)
			);
		},
		async (tempRoot) => {
			assert.equal(await resolveLivePlan(branchName, tempRoot), null);
		}
	);
});

test("resolveLivePlan: the unfiled-plan-by-slug tier never reads .prism/archived/", async () => {
	const branchName = "huntermcgrew/prism-review-loop-self-audit";

	await withTempTree(
		async (tempRoot) => {
			await writeFile(
				tempRoot,
				".prism/archived/plans/review-loop-self-audit.md",
				["# Plan: review-loop-self-audit", "", "## Ticket", "", "None yet.", ""].join(
					"\n"
				)
			);
		},
		async (tempRoot) => {
			assert.equal(await resolveLivePlan(branchName, tempRoot), null);
		}
	);
});

// ---------------------------------------------------------------------------
// resolveLivePlan — hyphenated-username collision
// ---------------------------------------------------------------------------

test("resolveLivePlan: a hyphenated username ahead of the ticket id resolves the real ticket's plan", async () => {
	const branchName = "dev-2/prism-1006-fix-thing";

	await withTempTree(
		async (tempRoot) => {
			await writeFile(
				tempRoot,
				".prism/plans/prism-1006.md",
				"# Plan: prism-1006\n"
			);
		},
		async (tempRoot) => {
			assert.equal(
				await resolveLivePlan(branchName, tempRoot),
				".prism/plans/prism-1006.md"
			);
		}
	);
});
