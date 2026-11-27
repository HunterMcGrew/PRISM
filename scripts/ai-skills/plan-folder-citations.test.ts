import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { parseTasks } from "./hooks/plan/tasks.mjs";
import {
	collectPlanFolderViolations,
	collectTaskProseViolations,
	findPlanFolders,
	runPlanFolderCheck,
	TASK_FIELD_KEYS,
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

test("no plan folder in the repo holds a citation or an over-long task, and no allowlist entry is stale", async () => {
	const { violations, staleAllowlist, staleTaskProseAllowlist } =
		await runPlanFolderCheck(repoRoot);
	const lines = violations.map((v) => `  ${v.file}:${v.line} [${v.kind}]`);

	assert.equal(
		violations.length,
		0,
		`Found ${violations.length} citation(s) in plan folders:\n${lines.join("\n")}`
	);
	assert.deepEqual(staleAllowlist, []);
	assert.deepEqual(staleTaskProseAllowlist, []);
});

test("every key the task-prose lint treats as a field is a field the task parser accepts", () => {
	const sampleValues: Record<string, string> = {
		"depends on": "none",
		amended: "a.ts: reason",
	};

	for (const key of TASK_FIELD_KEYS) {
		const value = sampleValues[key] ?? "a.ts";
		const plan = `## Tasks\n\n### T1: Example\n\n- ${key}: ${value}\n`;

		assert.doesNotThrow(() => parseTasks(plan), `"${key}" is not a task field`);
	}
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
				assert.deepEqual(await runPlanFolderCheck(root, [], []), {
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
					staleTaskProseAllowlist: [],
				});
			});
		}
	);

	await t.test("a flat plan with a section sign is not scanned", async () => {
		await withTree(
			{ ".prism/plans/acme-9.md": "Per § Steps.\n" },
			async (root) => {
				assert.deepEqual(await runPlanFolderCheck(root, [], []), {
					violations: [],
					staleAllowlist: [],
					staleTaskProseAllowlist: [],
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
					assert.deepEqual(await runPlanFolderCheck(root, [], []), {
						violations: [
							{
								file: ".prism/plans/acme-5/notes.md/inner.md",
								line: 1,
								kind: "section-citation",
							},
						],
						staleAllowlist: [],
					staleTaskProseAllowlist: [],
					});
				}
			);
		}
	);

	await t.test("a repo with no plans directory has no violations", async () => {
		await withTree({ "README.md": "§\n" }, async (root) => {
			assert.deepEqual(await runPlanFolderCheck(root, [], []), {
				violations: [],
				staleAllowlist: [],
					staleTaskProseAllowlist: [],
			});
		});
	});
});

test("the allowlist", async (t) => {
	await t.test("an allowlisted file with a violation passes", async () => {
		await withTree(
			{ ".prism/plans/acme-1/plan.md": "Per § Steps.\n" },
			async (root) => {
				assert.deepEqual(await runPlanFolderCheck(root, ["acme-1/plan.md"], []), {
					violations: [],
					staleAllowlist: [],
					staleTaskProseAllowlist: [],
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
				const { violations } = await runPlanFolderCheck(
					root,
					["acme-1/plan.md"],
					[]
				);

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
				assert.deepEqual(await runPlanFolderCheck(root, ["acme-1/plan.md"], []), {
					violations: [],
					staleAllowlist: ["acme-1/plan.md"],
					staleTaskProseAllowlist: [],
				});
			}
		);
	});

	await t.test("an allowlisted file that is missing is reported stale", async () => {
		await withTree(
			{ ".prism/plans/acme-2/plan.md": "# Plan\n\nClean.\n" },
			async (root) => {
				assert.deepEqual(await runPlanFolderCheck(root, ["acme-1/plan.md"], []), {
					violations: [],
					staleAllowlist: ["acme-1/plan.md"],
					staleTaskProseAllowlist: [],
				});
			}
		);
	});

	await t.test("an allowlisted path in an archived folder still matches", async () => {
		await withTree(
			{ ".prism/archived/plans/acme-1/plan.md": "Per § Steps.\n" },
			async (root) => {
				assert.deepEqual(await runPlanFolderCheck(root, ["acme-1/plan.md"], []), {
					violations: [],
					staleAllowlist: [],
					staleTaskProseAllowlist: [],
				});
			}
		);
	});

	await t.test("an entry can name a file in a nested folder", async () => {
		await withTree(
			{ ".prism/plans/acme-1/plan.md": "# Plan\n", ".prism/plans/acme-1/notes/extra.md": "Per § Steps.\n" },
			async (root) => {
				assert.deepEqual(
					await runPlanFolderCheck(root, ["acme-1/notes/extra.md"], []),
					{ violations: [], staleAllowlist: [], staleTaskProseAllowlist: [] }
				);
			}
		);
	});
});

const FIELDS = [
	"- files: src/a.ts",
	"- proof: pnpm test",
	"- depends on: none",
];

function planWithTask(below: string[], fields: string[] = FIELDS): string {
	return ["# Plan", "", "## Tasks", "", "### T1: Do it", "", ...fields, "", ...below, ""].join(
		"\n"
	);
}

function taskProseLines(content: string): number[] {
	return collectTaskProseViolations(content, "plan.md").map((v) => v.line);
}

test("counting prose lines under a task", async (t) => {
	await t.test("three prose lines fail on the task's heading line", () => {
		assert.deepEqual(
			collectTaskProseViolations(planWithTask(["One.", "Two.", "Three."]), "plan.md"),
			[{ file: "plan.md", line: 5, kind: "task-prose" }]
		);
	});

	await t.test("two prose lines pass", () => {
		assert.deepEqual(taskProseLines(planWithTask(["One.", "Two."])), []);
	});

	await t.test("a task with only its field list passes", () => {
		assert.deepEqual(taskProseLines(planWithTask([])), []);
	});

	await t.test("blank lines inside the field list are allowed", () => {
		const fields = ["- files: src/a.ts", "", "- proof: pnpm test", "", "- depends on: none"];

		assert.deepEqual(taskProseLines(planWithTask(["One.", "Two."], fields)), []);
	});

	await t.test("every field key the parser knows stays in the field list", () => {
		const fields = [
			"- files: src/a.ts",
			"- proof: pnpm test",
			"- proof fails on main: yes",
			"- depends on: none",
			"- behavior change: the old case flips",
			"- amended: src/b.ts — why",
			"- amended: src/c.ts — why",
			"- new dependency: none",
		];

		assert.deepEqual(taskProseLines(planWithTask(["One.", "Two."], fields)), []);
	});

	await t.test("a bullet after the field list counts as prose", () => {
		assert.deepEqual(taskProseLines(planWithTask(["One.", "- files: again", "Three."])), [5]);
	});

	await t.test("fenced code under a task counts as prose", () => {
		assert.deepEqual(taskProseLines(planWithTask(["```ts", "x();", "```"])), [5]);
	});

	await t.test("a commented example task passes", () => {
		const content = [
			"## Tasks",
			"",
			"<!--",
			"### T1: Example",
			"",
			"- files: src/a.ts",
			"",
			"One.",
			"Two.",
			"Three.",
			"-->",
			"",
		].join("\n");

		assert.deepEqual(taskProseLines(content), []);
	});

	await t.test("a line count after a removed comment stays true", () => {
		const content = [
			"<!-- one",
			"two -->",
			"## Tasks",
			"### T1: Do it",
			"- files: src/a.ts",
			"One.",
			"Two.",
			"Three.",
		].join("\n");

		assert.deepEqual(taskProseLines(content), [4]);
	});

	await t.test("a task ends at the next task heading", () => {
		const content = [
			"## Tasks",
			"### T1: First",
			"- files: src/a.ts",
			"One.",
			"Two.",
			"### T2: Second",
			"- files: src/b.ts",
			"One.",
			"Two.",
			"Three.",
		].join("\n");

		assert.deepEqual(taskProseLines(content), [6]);
	});

	await t.test("prose under the Tasks heading before any task is not counted", () => {
		const content = ["## Tasks", "One.", "Two.", "Three.", "### T1: Do it", "- files: src/a.ts"].join(
			"\n"
		);

		assert.deepEqual(taskProseLines(content), []);
	});

	await t.test("the next level-two heading ends the last task", () => {
		const content = [
			"## Tasks",
			"### T1: Do it",
			"- files: src/a.ts",
			"",
			"## Decisions",
			"",
			"- One.",
			"- Two.",
			"- Three.",
		].join("\n");

		assert.deepEqual(taskProseLines(content), []);
	});

	await t.test("a task heading outside the Tasks section is not counted", () => {
		const content = ["## Notes", "### T1: Do it", "One.", "Two.", "Three."].join("\n");

		assert.deepEqual(taskProseLines(content), []);
	});
});

test("checking task prose across plan folders", async (t) => {
	const longPlan = planWithTask(["One.", "Two.", "Three."]);

	await t.test("an over-long task in a plan folder's plan.md fails", async () => {
		await withTree({ ".prism/plans/acme-1/plan.md": longPlan }, async (root) => {
			assert.deepEqual(await runPlanFolderCheck(root, [], []), {
				violations: [
					{ file: ".prism/plans/acme-1/plan.md", line: 5, kind: "task-prose" },
				],
				staleAllowlist: [],
				staleTaskProseAllowlist: [],
			});
		});
	});

	await t.test("an archived plan folder is checked too", async () => {
		await withTree(
			{ ".prism/archived/plans/acme-1/plan.md": longPlan },
			async (root) => {
				const { violations } = await runPlanFolderCheck(root, [], []);

				assert.deepEqual(
					violations.map((v) => v.kind),
					["task-prose"]
				);
			}
		);
	});

	await t.test("an over-long task outside plan.md is not checked", async () => {
		await withTree(
			{
				".prism/plans/acme-1/spec.md": longPlan,
				".prism/plans/acme-1/notes/plan.md": longPlan,
				".prism/plans/acme-9.md": longPlan,
			},
			async (root) => {
				const { violations } = await runPlanFolderCheck(root, [], []);

				assert.deepEqual(violations, []);
			}
		);
	});

	await t.test("an allowlisted plan with long tasks passes", async () => {
		await withTree({ ".prism/plans/acme-1/plan.md": longPlan }, async (root) => {
			assert.deepEqual(await runPlanFolderCheck(root, [], ["acme-1/plan.md"]), {
				violations: [],
				staleAllowlist: [],
				staleTaskProseAllowlist: [],
			});
		});
	});

	await t.test("an allowlisted plan with no long task is reported stale", async () => {
		await withTree(
			{ ".prism/plans/acme-1/plan.md": planWithTask(["One."]) },
			async (root) => {
				assert.deepEqual(await runPlanFolderCheck(root, [], ["acme-1/plan.md"]), {
					violations: [],
					staleAllowlist: [],
					staleTaskProseAllowlist: ["acme-1/plan.md"],
				});
			}
		);
	});

	await t.test("an allowlisted plan that is missing is reported stale", async () => {
		await withTree({ ".prism/plans/acme-2/plan.md": "# Plan\n" }, async (root) => {
			assert.deepEqual(await runPlanFolderCheck(root, [], ["acme-1/plan.md"]), {
				violations: [],
				staleAllowlist: [],
				staleTaskProseAllowlist: ["acme-1/plan.md"],
			});
		});
	});

	await t.test("the citation allowlist does not hide task prose, nor the reverse", async () => {
		await withTree(
			{ ".prism/plans/acme-1/plan.md": `Per § Steps.\n\n${longPlan}` },
			async (root) => {
				const citationOnly = await runPlanFolderCheck(root, ["acme-1/plan.md"], []);
				const proseOnly = await runPlanFolderCheck(root, [], ["acme-1/plan.md"]);

				assert.deepEqual(
					citationOnly.violations.map((v) => v.kind),
					["task-prose"]
				);
				assert.deepEqual(
					proseOnly.violations.map((v) => v.kind),
					["section-citation"]
				);
			}
		);
	});
});
