import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
	collectPlanFolderViolations,
	findPlanFolders,
	runPlanFolderCheck,
} from "./plan-folder-citations";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "../..");

function kindsOf(content: string): string[] {
	return collectPlanFolderViolations(content, "plan.md").map((v) => v.kind);
}

async function withTree(
	files: Record<string, string>,
	run: (root: string) => Promise<void>
): Promise<void> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), "plan-folder-"));

	try {
		for (const [relative, content] of Object.entries(files)) {
			const target = path.join(root, relative);

			await fs.mkdir(path.dirname(target), { recursive: true });
			await fs.writeFile(target, content);
		}

		await run(root);
	} finally {
		await fs.rm(root, { recursive: true, force: true });
	}
}

test("no plan folder in the repo holds a citation, and no allowlist entry is stale", async () => {
	const { violations, staleAllowlist } = await runPlanFolderCheck(repoRoot);
	const lines = violations.map((v) => `  ${v.file}:${v.line} [${v.kind}]`);

	assert.equal(
		violations.length,
		0,
		`Found ${violations.length} citation(s) in plan folders:\n${lines.join("\n")}`
	);
	assert.deepEqual(staleAllowlist, []);
});

test("collecting violations from one file", async (t) => {
	await t.test("a bare section sign is a section citation", () => {
		assert.deepEqual(kindsOf("See `.prism/rules/x.md` § `Steps`."), [
			"section-citation",
		]);
	});

	await t.test("a see Decision: use is a decision citation", () => {
		assert.deepEqual(kindsOf("1. Do it, see Decision: `Keep it small`."), [
			"decision-citation",
		]);
	});

	await t.test("the marker matches whatever its case", () => {
		assert.deepEqual(kindsOf("See Decision: `Keep it small`."), [
			"decision-citation",
		]);
		assert.deepEqual(kindsOf("SEE DECISION: Keep it small."), [
			"decision-citation",
		]);
	});

	await t.test("a line holding both reports both", () => {
		assert.deepEqual(kindsOf("§ Steps, and see Decision: `X`."), [
			"section-citation",
			"decision-citation",
		]);
	});

	await t.test("markers named as tokens in code spans pass", () => {
		assert.deepEqual(
			kindsOf("The `§` sign and the `see Decision:` marker."),
			[]
		);
	});

	await t.test("a section sign inside a longer code span passes", () => {
		assert.deepEqual(kindsOf("Write `a § b` for that."), []);
	});

	await t.test("a double-backtick span is removed before single spans", () => {
		assert.deepEqual(kindsOf("Write `` § `x `` for that."), []);
	});

	await t.test("a lone backtick does not hide a marker after it", () => {
		assert.deepEqual(kindsOf("A stray ` then § Steps."), ["section-citation"]);
	});

	await t.test("a section sign in a fenced block passes", () => {
		assert.deepEqual(
			kindsOf(["```md", "§ Steps", "```", "Fine."].join("\n")),
			[]
		);
	});

	await t.test("text after a closed fence is read again", () => {
		const violations = collectPlanFolderViolations(
			["```", "§ inside", "```", "§ outside"].join("\n"),
			"plan.md"
		);

		assert.deepEqual(violations, [
			{ file: "plan.md", line: 4, kind: "section-citation" },
		]);
	});

	await t.test("paths and ticket IDs pass", () => {
		assert.deepEqual(
			kindsOf("Edit `scripts/plan/tasks.mjs` and `.prism/rules/x.md`, per ACME-648."),
			[]
		);
	});
});

test("finding and checking plan folders", async (t) => {
	const tree = {
		".prism/plans/acme-1/intent.md": "# Intent\n\nPer § Steps.\n",
		".prism/plans/acme-1/notes/extra.md": "see Decision: `X`\n",
		".prism/plans/acme-1/data.txt": "§ not markdown\n",
		".prism/plans/acme-2/plan.md": "# Plan\n\nClean.\n",
		".prism/plans/audits/report.md": "Per § Steps.\n",
		".prism/plans/acme-9.md": "Per § Steps.\n",
		".prism/archived/plans/acme-3/spec.md": "\nPer § Steps.\n",
		".prism/archived/plans/acme-4/notes.md": "Per § Steps.\n",
	};

	await t.test("a folder counts only when it holds a chain file", async () => {
		await withTree(tree, async (root) => {
			assert.deepEqual(await findPlanFolders(root), [
				".prism/archived/plans/acme-3",
				".prism/plans/acme-1",
				".prism/plans/acme-2",
			]);
		});
	});

	await t.test(
		"every markdown file in a plan folder is checked, nested ones included",
		async () => {
			await withTree(tree, async (root) => {
				assert.deepEqual(await runPlanFolderCheck(root, []), {
					violations: [
						{
							file: ".prism/archived/plans/acme-3/spec.md",
							line: 2,
							kind: "section-citation",
						},
						{
							file: ".prism/plans/acme-1/intent.md",
							line: 3,
							kind: "section-citation",
						},
						{
							file: ".prism/plans/acme-1/notes/extra.md",
							line: 1,
							kind: "decision-citation",
						},
					],
					staleAllowlist: [],
				});
			});
		}
	);

	await t.test("a flat plan with a section sign is not scanned", async () => {
		await withTree(
			{ ".prism/plans/acme-9.md": "Per § Steps.\n" },
			async (root) => {
				assert.deepEqual(await runPlanFolderCheck(root, []), {
					violations: [],
					staleAllowlist: [],
				});
			}
		);
	});

	await t.test("a chain-file name on a directory does not count", async () => {
		await withTree(
			{ ".prism/plans/odd/plan.md/inner.md": "Per § Steps.\n" },
			async (root) => {
				assert.deepEqual(await findPlanFolders(root), []);
			}
		);
	});

	await t.test(
		"a directory named like a markdown file is skipped, and its contents are still checked",
		async () => {
			await withTree(
				{
					".prism/plans/acme-5/plan.md": "# Plan\n\nClean.\n",
					".prism/plans/acme-5/notes.md/inner.md": "Per § Steps.\n",
				},
				async (root) => {
					assert.deepEqual(await runPlanFolderCheck(root, []), {
						violations: [
							{
								file: ".prism/plans/acme-5/notes.md/inner.md",
								line: 1,
								kind: "section-citation",
							},
						],
						staleAllowlist: [],
					});
				}
			);
		}
	);

	await t.test("a repo with no plans directory has no violations", async () => {
		await withTree({ "README.md": "§\n" }, async (root) => {
			assert.deepEqual(await runPlanFolderCheck(root, []), {
				violations: [],
				staleAllowlist: [],
			});
		});
	});
});

test("the allowlist", async (t) => {
	await t.test("an allowlisted file with a violation passes", async () => {
		await withTree(
			{ ".prism/plans/acme-1/plan.md": "Per § Steps.\n" },
			async (root) => {
				assert.deepEqual(await runPlanFolderCheck(root, ["acme-1/plan.md"]), {
					violations: [],
					staleAllowlist: [],
				});
			}
		);
	});

	await t.test("a violation in a file the allowlist does not name still fails", async () => {
		await withTree(
			{
				".prism/plans/acme-1/plan.md": "Per § Steps.\n",
				".prism/plans/acme-1/spec.md": "Per § Steps.\n",
			},
			async (root) => {
				const { violations } = await runPlanFolderCheck(root, [
					"acme-1/plan.md",
				]);

				assert.deepEqual(
					violations.map((v) => v.file),
					[".prism/plans/acme-1/spec.md"]
				);
			}
		);
	});

	await t.test("an allowlisted file with no violation is reported stale", async () => {
		await withTree(
			{ ".prism/plans/acme-1/plan.md": "# Plan\n\nClean.\n" },
			async (root) => {
				assert.deepEqual(await runPlanFolderCheck(root, ["acme-1/plan.md"]), {
					violations: [],
					staleAllowlist: ["acme-1/plan.md"],
				});
			}
		);
	});

	await t.test("an allowlisted file that is missing is reported stale", async () => {
		await withTree(
			{ ".prism/plans/acme-2/plan.md": "# Plan\n\nClean.\n" },
			async (root) => {
				assert.deepEqual(await runPlanFolderCheck(root, ["acme-1/plan.md"]), {
					violations: [],
					staleAllowlist: ["acme-1/plan.md"],
				});
			}
		);
	});

	await t.test("an allowlisted path in an archived folder still matches", async () => {
		await withTree(
			{ ".prism/archived/plans/acme-1/plan.md": "Per § Steps.\n" },
			async (root) => {
				assert.deepEqual(await runPlanFolderCheck(root, ["acme-1/plan.md"]), {
					violations: [],
					staleAllowlist: [],
				});
			}
		);
	});

	await t.test("an entry can name a file in a nested folder", async () => {
		await withTree(
			{ ".prism/plans/acme-1/plan.md": "# Plan\n", ".prism/plans/acme-1/notes/extra.md": "Per § Steps.\n" },
			async (root) => {
				assert.deepEqual(
					await runPlanFolderCheck(root, ["acme-1/notes/extra.md"]),
					{ violations: [], staleAllowlist: [] }
				);
			}
		);
	});
});
