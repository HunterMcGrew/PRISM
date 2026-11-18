import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
	mkdirSync,
	mkdtempSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

import {
	doneTasks,
	parseSubject,
	parseTasks,
	type Task,
} from "./hooks/plan/tasks.mjs";

const TASKS_CLI = fileURLToPath(
	new URL("./hooks/plan/tasks.mjs", import.meta.url)
);
const GLOBAL_CONFIG_DIR = mkdtempSync(path.join(os.tmpdir(), "plan-tasks-gitcfg-"));
const EMPTY_GLOBAL_CONFIG = path.join(GLOBAL_CONFIG_DIR, "gitconfig");
writeFileSync(EMPTY_GLOBAL_CONFIG, "");
const GIT_ENV = {
	...process.env,
	GIT_CONFIG_GLOBAL: EMPTY_GLOBAL_CONFIG,
	GIT_CONFIG_NOSYSTEM: "1",
	GIT_AUTHOR_NAME: "Test",
	GIT_AUTHOR_EMAIL: "test@example.com",
	GIT_COMMITTER_NAME: "Test",
	GIT_COMMITTER_EMAIL: "test@example.com",
};
const tempDirs: string[] = [GLOBAL_CONFIG_DIR];

after(() => {
	for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

const PLAN = `---
stage: plan
---

## Tasks

<!--
### T1: <summary>
- files: example.ts
-->

### T1: Parse the subjects
- files: scripts/ai-skills/hooks/plan/tasks.mjs, scripts/ai-skills/plan-tasks.test.ts
- proof: node --test scripts/ai-skills/plan-tasks.test.ts
- proof fails on main: yes
- depends on: none

### T2: Bundle the tasks
- files: scripts/ai-skills/hooks/plan/bundles.mjs
- proof: node --test scripts/ai-skills/plan-bundles.test.ts
- depends on: T1
- behavior change: the old bundle test now expects two groups
- amended: scripts/ai-skills/hooks/plan/bundles.mjs: the import edge needs a resolver
- new dependency: none

## Challenge

### T9: not a task, outside the section
`;

function git(cwd: string, ...args: string[]): string {
	return execFileSync("git", args, { cwd, env: GIT_ENV, encoding: "utf8" });
}

describe("parseTasks", () => {
	test("reads each task and its fields, skipping commented examples and later sections", () => {
		const tasks = parseTasks(PLAN);

		assert.deepEqual(
			tasks.map((task) => task.id),
			["T1", "T2"]
		);
		assert.deepEqual(tasks[0], {
			id: "T1",
			summary: "Parse the subjects",
			files: ["scripts/ai-skills/hooks/plan/tasks.mjs", "scripts/ai-skills/plan-tasks.test.ts"],
			proof: "node --test scripts/ai-skills/plan-tasks.test.ts",
			proofFailsOnMain: true,
			dependsOn: [],
			behaviorChange: null,
			amended: [],
			newDependency: null,
		});
		assert.deepEqual(tasks[1]!.dependsOn, ["T1"]);
		assert.equal(tasks[1]!.proofFailsOnMain, false);
		assert.equal(
			tasks[1]!.behaviorChange,
			"the old bundle test now expects two groups"
		);
		assert.deepEqual(tasks[1]!.amended, [
			{
				path: "scripts/ai-skills/hooks/plan/bundles.mjs",
				why: "the import edge needs a resolver",
			},
		]);
		assert.equal(tasks[1]!.newDependency, "none");
	});

	test("parses a depends on list", () => {
		const [, , task] = parseTasks(
			"## Tasks\n\n### T1: a\n\n### T2: b\n\n### T3: x\n- files: a.ts\n- depends on: T1, T2\n"
		) as [Task, Task, Task];

		assert.deepEqual(task.dependsOn, ["T1", "T2"]);
	});

	test("throws on a duplicate task ID", () => {
		assert.throws(
			() => parseTasks("## Tasks\n\n### T1: a\n\n### T1: b\n"),
			/Duplicate task ID T1/
		);
	});

	test("throws on a task heading that doesn't fit the shape", () => {
		assert.throws(
			() => parseTasks("## Tasks\n\n### T1 missing colon\n"),
			/Unparseable task heading/
		);
	});

	test("throws on a depends on entry that isn't a task ID", () => {
		assert.throws(
			() => parseTasks("## Tasks\n\n### T2: a\n- depends on: task one\n"),
			/T2: unparseable depends on entry "task one"/
		);
	});

	test("throws on an amended line without a reason", () => {
		assert.throws(
			() => parseTasks("## Tasks\n\n### T2: a\n- amended: a.ts\n"),
			/T2: amended must read/
		);
	});

	test("strips backticks, quotes, and a leading ./ from files entries", () => {
		const [task] = parseTasks(
			"## Tasks\n\n### T1: x\n- files: `package.json`, \"./frontend/a.ts\", 'b.ts'\n"
		) as [Task];

		assert.deepEqual(task.files, ["package.json", "frontend/a.ts", "b.ts"]);
	});

	for (const entry of [
		"frontend/a b.ts",
		"frontend/**",
		"frontend/a?.ts",
		"frontend/{a,b}.ts",
	]) {
		test(`throws on the files entry ${JSON.stringify(entry)}`, () => {
			assert.throws(
				() => parseTasks(`## Tasks\n\n### T1: x\n- files: ${entry}\n`),
				/T1: files entry .* must be one path with no spaces or glob characters/
			);
		});
	}

	for (const entry of ["src\\contracts\\x.ts", "..\\x.ts", "src/a\\b.ts"]) {
		test(`throws on the backslash files entry ${JSON.stringify(entry)}`, () => {
			assert.throws(
				() => parseTasks(`## Tasks\n\n### T1: x\n- files: ${entry}\n`),
				/T1: files entry .* uses a backslash; write the path with forward slashes/
			);
		});
	}

	test("accepts a Next.js dynamic segment path with square brackets", () => {
		const [task] = parseTasks(
			"## Tasks\n\n### T1: x\n- files: frontend/app/[...slug]/page.tsx\n"
		) as [Task];

		assert.deepEqual(task.files, ["frontend/app/[...slug]/page.tsx"]);
	});

	test("throws on a files entry ending in a slash", () => {
		assert.throws(
			() => parseTasks("## Tasks\n\n### T1: x\n- files: tools/newpkg/\n"),
			/T1: files entry "tools\/newpkg\/" names a directory; list the files, not the directory/
		);
	});

	test("throws on a files entry naming the repo root", () => {
		assert.throws(
			() => parseTasks("## Tasks\n\n### T1: x\n- files: .\n"),
			/T1: files entry "\." names the repo root, not a file/
		);
	});

	for (const key of ["files", "depends on"]) {
		test(`throws on a repeated ${key} field in one task`, () => {
			const value = key === "files" ? "a.ts" : "none";

			assert.throws(
				() =>
					parseTasks(
						`## Tasks\n\n### T1: x\n- ${key}: ${value}\n- ${key}: ${value}\n`
					),
				new RegExp(`T1: repeated field "${key}"`)
			);
		});
	}

	test("allows a repeated amended field", () => {
		const [task] = parseTasks(
			"## Tasks\n\n### T1: x\n- files: a.ts\n- amended: a.ts: one\n- amended: b.ts: two\n"
		) as [Task];

		assert.equal(task.amended.length, 2);
	});

	test("throws on a miscased field key anywhere in a task", () => {
		assert.throws(
			() =>
				parseTasks(
					"## Tasks\n\n### T1: x\n- files: a.ts\n\nProse.\n\n- Files: package.json\n"
				),
			/T1: unknown field "Files"/
		);
	});

	test("throws on an unknown field key in the field list", () => {
		assert.throws(
			() => parseTasks("## Tasks\n\n### T1: x\n- files: a.ts\n- file: b.ts\n"),
			/T1: unknown field "file"/
		);
	});

	test("allows any bullet in the prose below the field list", () => {
		const [task] = parseTasks(
			"## Tasks\n\n### T1: x\n- files: a.ts\n\nThe change:\n\n- Edge case: empty input\n"
		) as [Task];

		assert.deepEqual(task.files, ["a.ts"]);
	});

	test("throws on a depends on ID that names no task", () => {
		assert.throws(
			() =>
				parseTasks("## Tasks\n\n### T1: x\n- files: a.ts\n- depends on: T2\n"),
			/T1: depends on T2, which names no task/
		);
	});

	test("returns no tasks when the plan has no Tasks section", () => {
		assert.deepEqual(parseTasks("## History\n\n### T1: a\n"), []);
	});
});

describe("parseSubject", () => {
	test("expands an inclusive range", () => {
		assert.deepEqual(parseSubject("T3-T5: Add the parser"), {
			kind: "task",
			ids: ["T3", "T4", "T5"],
		});
	});

	test("reads a list subject and a single-task subject", () => {
		assert.deepEqual(parseSubject("T11,T15,T22: Rename the skills"), {
			kind: "task",
			ids: ["T11", "T15", "T22"],
		});
		assert.deepEqual(parseSubject("T3: Add the parser"), {
			kind: "task",
			ids: ["T3"],
		});
	});

	test("reads a fix subject", () => {
		assert.deepEqual(parseSubject("T3 fix: Handle an empty plan"), {
			kind: "fix",
			ids: ["T3"],
		});
	});

	test("reads plan, retro, and ticket subjects", () => {
		assert.deepEqual(parseSubject("plan: Record the challenge"), {
			kind: "plan",
		});
		assert.deepEqual(parseSubject("retro: Grade the epic"), { kind: "retro" });

		for (const subject of [
			"ACME-44: Fix the purge",
			"ACME-648: Add the parser",
			"acme-2167: Gate the writes",
		]) {
			assert.deepEqual(parseSubject(subject, "ACME"), { kind: "ticket" });
		}
	});

	test("reads no ticket subject when no prefix is configured", () => {
		assert.equal(parseSubject("ACME-1: x"), null);
	});

	test("escapes a regex character in the configured prefix", () => {
		assert.deepEqual(parseSubject("A.B-1: x", "A.B"), { kind: "ticket" });
		assert.equal(parseSubject("AxB-1: x", "A.B"), null);
	});

	test("returns null for subjects outside the grammar", () => {
		for (const subject of [
			"",
			"T3 Add the parser",
			"T3:",
			"t3: lowercase",
			"T5-T3: high before low",
			"T3, T4: space in the list",
			"T3,: trailing comma",
			"T3 fixup: wrong verb",
			"ACMEX-1: unknown prefix",
			"chore: tidy",
			"Update stuff",
		]) {
			assert.equal(parseSubject(subject, "ACME"), null, subject);
		}
	});
});

describe("doneTasks", () => {
	test("counts task subjects and ignores fix subjects", () => {
		const done = doneTasks(["T1: a", "T3 fix: b", "plan: c", "T4-T5: d"]);

		assert.deepEqual([...done].sort(), ["T1", "T4", "T5"]);
	});
});

describe("tasks.mjs CLI", () => {
	test("reports done and open tasks from the commit log after the base", () => {
		const repo = mkdtempSync(path.join(os.tmpdir(), "plan-tasks-"));
		tempDirs.push(repo);
		git(repo, "init", "-q");
		writeFileSync(path.join(repo, "plan.md"), PLAN);
		git(repo, "add", "plan.md");
		git(repo, "commit", "-q", "-m", "ACME-1: Base");
		const base = git(repo, "rev-parse", "HEAD").trim();

		for (const subject of ["T1: Parse", "T2 fix: Patch", "plan: Note"]) {
			git(repo, "commit", "-q", "--allow-empty", "-m", subject);
		}

		const result = spawnSync(
			process.execPath,
			[TASKS_CLI, path.join(repo, "plan.md"), "--base", base, "--json"],
			{ env: GIT_ENV, encoding: "utf8" }
		);

		assert.equal(result.status, 0, result.stderr);
		assert.deepEqual(JSON.parse(result.stdout), [
			{ id: "T1", summary: "Parse the subjects", status: "done" },
			{ id: "T2", summary: "Bundle the tasks", status: "open" },
		]);
	});

	describe("without --base", () => {
		const runDefault = (repo: string) => {
			const result = spawnSync(
				process.execPath,
				[TASKS_CLI, path.join(repo, "child/plan.md"), "--json"],
				{ env: GIT_ENV, encoding: "utf8" }
			);
			assert.equal(result.status, 0, result.stderr);

			return Object.fromEntries(
				(JSON.parse(result.stdout) as { id: string; status: string }[]).map(
					(row) => [row.id, row.status]
				)
			);
		};
		const stackedRepo = (): string => {
			const repo = mkdtempSync(path.join(os.tmpdir(), "plan-tasks-"));
			tempDirs.push(repo);
			git(repo, "init", "-q");
			git(repo, "commit", "-q", "--allow-empty", "-m", "ACME-1: Base");
			git(repo, "update-ref", "refs/remotes/origin/main", "HEAD");
			git(repo, "commit", "-q", "--allow-empty", "-m", "T1: parent work");
			git(repo, "commit", "-q", "--allow-empty", "-m", "T2-T4: parent work");
			mkdirSync(path.join(repo, "child"));
			writeFileSync(path.join(repo, "child/intent.md"), "intent\n");
			writeFileSync(path.join(repo, "child/plan.md"), PLAN);

			return repo;
		};

		test("a stacked branch counts only commits since its intent, first parent only", () => {
			const repo = stackedRepo();
			git(repo, "add", "child");
			git(repo, "commit", "-q", "-m", "plan: child draft");
			const parent = git(repo, "rev-parse", "HEAD~1").trim();
			git(repo, "commit", "-q", "--allow-empty", "-m", "T2 fix: child work");
			git(repo, "checkout", "-q", "-b", "parent", parent);
			git(repo, "commit", "-q", "--allow-empty", "-m", "T1: later parent work");
			git(repo, "checkout", "-q", "-");
			git(repo, "merge", "-q", "--no-edit", "parent");

			assert.deepEqual(runDefault(repo), { T1: "open", T2: "open" });
		});

		test("counts the stacked branch's own task commits", () => {
			const repo = stackedRepo();
			git(repo, "add", "child");
			git(repo, "commit", "-q", "-m", "plan: child draft");
			git(repo, "commit", "-q", "--allow-empty", "-m", "T2: child work");

			assert.deepEqual(runDefault(repo), { T1: "open", T2: "done" });
		});

		test("an intent not committed yet leaves every task open", () => {
			assert.deepEqual(runDefault(stackedRepo()), { T1: "open", T2: "open" });
		});
	});

	describe("default branch from config", () => {
		const planDefault = (repo: string): Record<string, string> => {
			const result = spawnSync(
				process.execPath,
				[TASKS_CLI, path.join(repo, "plan.md"), "--json"],
				{ env: GIT_ENV, encoding: "utf8" }
			);
			assert.equal(result.status, 0, result.stderr);

			return Object.fromEntries(
				(JSON.parse(result.stdout) as { id: string; status: string }[]).map(
					(row) => [row.id, row.status]
				)
			);
		};
		const repoWithTwoRemoteRefs = (config: object | null): string => {
			const repo = mkdtempSync(path.join(os.tmpdir(), "plan-tasks-"));
			tempDirs.push(repo);
			git(repo, "init", "-q");
			git(repo, "commit", "-q", "--allow-empty", "-m", "ACME-1: Base");
			git(repo, "update-ref", "refs/remotes/origin/main", "HEAD");
			git(repo, "commit", "-q", "--allow-empty", "-m", "T1: first");
			git(repo, "update-ref", "refs/remotes/origin/trunk", "HEAD");
			git(repo, "commit", "-q", "--allow-empty", "-m", "T2: second");
			writeFileSync(path.join(repo, "plan.md"), PLAN);
			if (config) {
				mkdirSync(path.join(repo, ".ai-skills"));
				writeFileSync(
					path.join(repo, ".ai-skills", "config.json"),
					JSON.stringify(config)
				);
			}

			return repo;
		};

		test("reads the done set from origin/<defaultBranch>", () => {
			const repo = repoWithTwoRemoteRefs({
				defaultBranch: "trunk",
				ticketPrefix: "ACME",
			});

			assert.deepEqual(planDefault(repo), { T1: "open", T2: "done" });
		});

		test("reads from origin/main when there is no config", () => {
			assert.deepEqual(planDefault(repoWithTwoRemoteRefs(null)), {
				T1: "done",
				T2: "done",
			});
		});
	});

	describe("a config file that does not parse", () => {
		const runWithConfig = (configText: string) => {
			const repo = mkdtempSync(path.join(os.tmpdir(), "plan-tasks-"));
			tempDirs.push(repo);
			git(repo, "init", "-q");
			mkdirSync(path.join(repo, ".ai-skills"));
			writeFileSync(path.join(repo, ".ai-skills", "config.json"), configText);
			writeFileSync(path.join(repo, "plan.md"), PLAN);
			git(repo, "add", ".");
			git(repo, "commit", "-q", "-m", "ACME-1: Base");

			return spawnSync(
				process.execPath,
				[TASKS_CLI, path.join(repo, "plan.md"), "--base", "HEAD"],
				{ env: GIT_ENV, encoding: "utf8" }
			);
		};

		test("exits 2 naming the config file when it has a trailing comma", () => {
			const result = runWithConfig('{"ticketPrefix": "ACME",}');

			assert.equal(result.status, 2);
			assert.match(result.stderr, /\.ai-skills\/config\.json/);
		});

		test("exits 0 on the same config without the trailing comma", () => {
			const result = runWithConfig('{"ticketPrefix": "ACME"}');

			assert.equal(result.status, 0, result.stderr);
		});
	});

	test("exits 1 naming the file when the plan is missing", () => {
		const result = spawnSync(
			process.execPath,
			[TASKS_CLI, path.join(os.tmpdir(), "no-such-plan-dir", "plan.md")],
			{ encoding: "utf8" }
		);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /no-such-plan-dir/);
	});

	test("exits 2 on a --base value that starts with a dash", () => {
		const result = spawnSync(
			process.execPath,
			[TASKS_CLI, "plan.md", "--base", "--output=/tmp/x"],
			{ encoding: "utf8" }
		);

		assert.equal(result.status, 2);
		assert.match(result.stderr, /Usage/);
	});

	test("runs when invoked through a symlink", (t) => {
		const dir = mkdtempSync(path.join(os.tmpdir(), "plan-tasks-link-"));
		tempDirs.push(dir);
		const link = path.join(dir, "tasks.mjs");
		try {
			symlinkSync(TASKS_CLI, link);
		} catch (error) {
			if (process.platform === "win32" && (error as NodeJS.ErrnoException).code === "EPERM") {
				t.skip("creating a symlink needs a privilege this Windows runner lacks");
				return;
			}
			throw error;
		}

		const result = spawnSync(process.execPath, [link], { encoding: "utf8" });

		assert.equal(result.status, 2);
		assert.match(result.stderr, /Usage/);
	});

	test("exits 2 without a plan path", () => {
		const result = spawnSync(process.execPath, [TASKS_CLI], {
			encoding: "utf8",
		});

		assert.equal(result.status, 2);
		assert.match(result.stderr, /Usage/);
	});
});
