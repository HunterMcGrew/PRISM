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

import { analyzeBundles } from "./hooks/plan/bundles.mjs";

const BUNDLES_CLI = fileURLToPath(
	new URL("./hooks/plan/bundles.mjs", import.meta.url)
);
const GLOBAL_CONFIG_DIR = mkdtempSync(path.join(os.tmpdir(), "plan-bundles-gitcfg-"));
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
const MANIFEST = {
	"frontend/**": ["docs/frontend.md", "docs/source.md"],
	"scripts/**": "docs/source.md",
	".prism/rules/*.md": "docs/spec-editing.md",
	umbrellas: [".prism/rules/*.md"],
};
const tempDirs: string[] = [GLOBAL_CONFIG_DIR];

interface Report {
	edges: { from: string; to: string; file: string; imports: string }[];
	notScanned: { file: string; id: string }[];
	groups: { docs: string[]; tasks: string[] }[];
}

after(() => {
	for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

/**
 * Builds a committed temp repo holding the manifest, the given files, and a
 * plan whose `## Tasks` body is `tasks`, then runs the CLI against it.
 */
function runBundles({
	tasks,
	files = {},
	subjectsAfterBase = [],
	frontmatter = "",
	passBase = true,
	config = null,
	json = true,
	manifest = true,
}: {
	tasks: string;
	files?: Record<string, string>;
	subjectsAfterBase?: string[];
	frontmatter?: string;
	passBase?: boolean;
	config?: object | null;
	json?: boolean;
	manifest?: boolean;
}) {
	const repo = mkdtempSync(path.join(os.tmpdir(), "plan-bundles-"));
	tempDirs.push(repo);
	const contents = {
		...(manifest
			? { ".prism/architect/manifest.json": JSON.stringify(MANIFEST) }
			: {}),
		"plan.md": `${frontmatter}## Tasks\n\n${tasks}\n## History\n`,
		...(config ? { ".ai-skills/config.json": JSON.stringify(config) } : {}),
		...files,
	};

	for (const [file, text] of Object.entries(contents)) {
		mkdirSync(path.dirname(path.join(repo, file)), { recursive: true });
		writeFileSync(path.join(repo, file), text);
	}

	const git = (...args: string[]) =>
		execFileSync("git", args, { cwd: repo, env: GIT_ENV, encoding: "utf8" });

	git("init", "-q");
	git("add", ".");
	git("commit", "-q", "-m", "ACME-1: Base");
	const base = git("rev-parse", "HEAD").trim();

	// Without --base the CLI reads from origin/main, so the temp repo needs one.
	git("update-ref", "refs/remotes/origin/main", base);

	for (const subject of subjectsAfterBase) {
		git("commit", "-q", "--allow-empty", "-m", subject);
	}

	const baseArgs = passBase ? ["--base", base] : [];
	const result = spawnSync(
		process.execPath,
		[
			BUNDLES_CLI,
			path.join(repo, "plan.md"),
			...baseArgs,
			...(json ? ["--json"] : []),
		],
		{ env: GIT_ENV, encoding: "utf8" }
	);

	return {
		status: result.status,
		stdout: result.stdout,
		stderr: result.stderr,
		report:
			result.status === 0 && json
				? (JSON.parse(result.stdout) as Report)
				: null,
	};
}

function task(id: string, files: string[], dependsOn: string[] = []) {
	return {
		id,
		summary: id,
		files,
		proof: null,
		proofFailsOnMain: false,
		dependsOn,
		behaviorChange: null,
		amended: [],
		newDependency: null,
	};
}

describe("analyzeBundles duplicates", () => {
	test("returns each duplicate claim as a file with the two task IDs", () => {
		const result = analyzeBundles({
			tasks: [task("T1", ["src/a.ts"]), task("T2", ["src/a.ts"])],
			done: new Set(),
			repoRoot: os.tmpdir(),
			manifest: {},
		});

		assert.deepEqual(result.duplicates, [{ file: "src/a.ts", ids: ["T1", "T2"] }]);
		assert.deepEqual(result.groups, []);
	});
});

describe("analyzeBundles aliases", () => {
	for (const [spelling, target] of [
		["with a trailing slash", "src/"],
		["with a leading ./ and trailing slash", "./src/"],
		["with no trailing slash", "src"],
		["with a leading ./ and no trailing slash", "./src"],
	]) {
		test(`reads an alias value ${spelling}`, () => {
			const repo = mkdtempSync(path.join(os.tmpdir(), "plan-bundles-spelling-"));
			tempDirs.push(repo);
			mkdirSync(path.join(repo, "src"), { recursive: true });
			writeFileSync(path.join(repo, "a.ts"), 'import "@/util";\n');
			writeFileSync(path.join(repo, "src", "util.ts"), "");

			const result = analyzeBundles({
				tasks: [task("T1", ["a.ts"]), task("T2", ["src/util.ts"])],
				done: new Set(),
				repoRoot: repo,
				manifest: {},
				aliases: { "@/": target! },
			});

			assert.deepEqual(result.edges, [
				{ from: "T1", to: "T2", file: "a.ts", imports: "src/util.ts" },
			]);
		});
	}

	test("swaps the longest matching alias key", () => {
		const repo = mkdtempSync(path.join(os.tmpdir(), "plan-bundles-alias-"));
		tempDirs.push(repo);
		mkdirSync(path.join(repo, "short", "deep"), { recursive: true });
		writeFileSync(path.join(repo, "a.ts"), 'import "@/deep/x";\n');
		writeFileSync(path.join(repo, "short", "deep", "x.ts"), "");

		const result = analyzeBundles({
			tasks: [task("T1", ["a.ts"]), task("T2", ["short/deep/x.ts"])],
			done: new Set(),
			repoRoot: repo,
			manifest: {},
			aliases: { "@/": "short/", "@/deep/": "wrong/" },
		});

		assert.deepEqual(result.edges, []);

		const swapped = analyzeBundles({
			tasks: [task("T1", ["a.ts"]), task("T2", ["wrong/x.ts"])],
			done: new Set(),
			repoRoot: repo,
			manifest: {},
			aliases: { "@/": "short/", "@/deep/": "wrong/" },
		});

		assert.deepEqual(swapped.edges, [
			{ from: "T1", to: "T2", file: "a.ts", imports: "wrong/x.ts" },
		]);
	});
});

describe("bundles.mjs", () => {
	describe("a config file that does not parse", () => {
		const tasks = "### T1: a\n- files: scripts/a.mjs\n";

		test("exits 2 naming the config file when it has a trailing comma", () => {
			const result = runBundles({
				tasks,
				files: { ".ai-skills/config.json": '{"ticketPrefix": "ACME",}' },
			});

			assert.equal(result.status, 2);
			assert.match(
				result.stderr,
				/^bundles\.mjs: \.ai-skills\/config\.json exists but is not a readable JSON object\.\n$/
			);
		});

		test("exits 0 on the same config without the trailing comma", () => {
			const result = runBundles({
				tasks,
				files: { ".ai-skills/config.json": '{"ticketPrefix": "ACME"}' },
			});

			assert.equal(result.status, 0, result.stderr);
		});
	});

	test("exits 1 on a file two tasks claim, naming the file and both IDs", () => {
		const result = runBundles({
			tasks:
				"### T1: a\n- files: scripts/a.mjs\n\n### T2: b\n- files: scripts/b.mjs, scripts/a.mjs\n",
		});

		assert.equal(result.status, 1);
		assert.match(
			result.stderr,
			/Duplicate claim: scripts\/a\.mjs is listed by T1 and T2/
		);
	});

	test("ignores a file claimed by a done task", () => {
		const result = runBundles({
			tasks:
				"### T1: a\n- files: scripts/a.mjs\n\n### T2: b\n- files: scripts/a.mjs\n",
			subjectsAfterBase: ["T1: Ship a"],
		});

		assert.equal(result.status, 0, result.stderr);
		assert.deepEqual(
			result.report!.groups.map((group) => group.tasks),
			[["T2"]]
		);
	});

	test("lets open tasks share a file when one waits on the other, directly or through another task", () => {
		const result = runBundles({
			tasks: [
				"### T1: a\n- files: scripts/a.mjs\n",
				"### T2: b\n- files: scripts/b.mjs\n- depends on: T1\n",
				"### T3: c\n- files: scripts/a.mjs, scripts/b.mjs\n- depends on: T2\n",
			].join("\n"),
		});

		assert.equal(result.status, 0, result.stderr);
		assert.deepEqual(
			result.report!.groups.map((group) => group.tasks),
			[["T1"]]
		);
	});

	test("makes the importer depend on the task owning an imported file, and holds it back", () => {
		const result = runBundles({
			tasks:
				"### T1: a\n- files: scripts/a.mjs\n\n### T2: b\n- files: scripts/b.mjs, scripts/c.mjs\n",
			files: {
				"scripts/a.mjs": "export const A = 1;\n",
				"scripts/b.mjs":
					'import { A } from "./a";\nimport fs from "node:fs";\n',
			},
		});

		assert.equal(result.status, 0, result.stderr);
		assert.deepEqual(result.report!.edges, [
			{ from: "T2", to: "T1", file: "scripts/b.mjs", imports: "scripts/a.mjs" },
		]);
		assert.deepEqual(result.report!.notScanned, [
			{ file: "scripts/c.mjs", id: "T2" },
		]);
		assert.deepEqual(
			result.report!.groups.map((group) => group.tasks),
			[["T1"]]
		);
	});

	test("adds no edge a task already declares", () => {
		const result = runBundles({
			tasks:
				"### T1: a\n- files: scripts/a.mjs\n\n### T2: b\n- files: scripts/b.mjs\n- depends on: T1\n",
			files: {
				"scripts/a.mjs": "export const A = 1;\n",
				"scripts/b.mjs": 'import { A } from "./a.mjs";\n',
			},
		});

		assert.equal(result.status, 0, result.stderr);
		assert.deepEqual(result.report!.edges, []);
	});

	test("resolves an aliased import, including an index file", () => {
		const result = runBundles({
			config: { importAliases: { "@frontend/": "frontend/" } },
			tasks:
				"### T1: a\n- files: frontend/lib/util/index.ts\n\n### T2: b\n- files: frontend/components/Card.tsx\n",
			files: {
				"frontend/lib/util/index.ts": "export const UTIL = 1;\n",
				"frontend/components/Card.tsx":
					'import { UTIL } from "@frontend/lib/util";\n',
			},
		});

		assert.equal(result.status, 0, result.stderr);
		assert.deepEqual(result.report!.edges, [
			{
				from: "T2",
				to: "T1",
				file: "frontend/components/Card.tsx",
				imports: "frontend/lib/util/index.ts",
			},
		]);
	});

	test("lets two tasks claim one file once the second declares the dependency", () => {
		const result = runBundles({
			tasks:
				"### T1: a\n- files: src/a.ts\n\n### T2: b\n- files: src/a.ts\n- depends on: T1\n",
		});

		assert.equal(result.status, 0, result.stderr);
		assert.deepEqual(
			result.report!.groups.map((group) => group.tasks),
			[["T1"]]
		);
	});

	test("exits 1 naming the file when two tasks list the same file with no dependency", () => {
		const result = runBundles({
			tasks:
				"### T1: a\n- files: src/a.ts\n\n### T2: b\n- files: src/a.ts\n",
		});

		assert.equal(result.status, 1);
		assert.match(
			result.stderr,
			/Duplicate claim: src\/a\.ts is listed by T1 and T2/
		);
	});

	test("a bare package import adds no edge", () => {
		const result = runBundles({
			config: { importAliases: { "@frontend/": "frontend/" } },
			tasks:
				"### T1: a\n- files: scripts/a.mjs\n\n### T2: b\n- files: scripts/b.mjs\n",
			files: {
				"scripts/a.mjs": "export const A = 1;\n",
				"scripts/b.mjs":
					'import fs from "node:fs";\nimport react from "react";\nimport { x } from "@other/x";\n',
			},
		});

		assert.equal(result.status, 0, result.stderr);
		assert.deepEqual(result.report!.edges, []);
	});

	test("an alias that is not configured adds no edge", () => {
		const result = runBundles({
			tasks:
				"### T1: a\n- files: frontend/lib/util/index.ts\n\n### T2: b\n- files: frontend/components/Card.tsx\n",
			files: {
				"frontend/lib/util/index.ts": "export const UTIL = 1;\n",
				"frontend/components/Card.tsx":
					'import { UTIL } from "@frontend/lib/util";\n',
			},
		});

		assert.equal(result.status, 0, result.stderr);
		assert.deepEqual(result.report!.edges, []);
	});

	test("a task whose file no route covers shows docs: none", () => {
		const result = runBundles({
			tasks: "### T1: a\n- files: other/a.txt\n",
		});

		assert.equal(result.status, 0, result.stderr);
		assert.deepEqual(result.report!.groups, [{ docs: [], tasks: ["T1"] }]);
	});

	test("the text report prints docs: none for a group no route covers", () => {
		const result = runBundles({
			tasks: "### T1: a\n- files: other/a.txt\n",
			json: false,
		});

		assert.equal(result.status, 0, result.stderr);
		assert.match(result.stdout, /^Groups:\n {2}1\. T1\n {5}docs: none\n$/m);
	});

	test("exits 1 naming the manifest when none sits above the plan", () => {
		const result = runBundles({
			tasks: "### T1: a\n- files: other/a.txt\n",
			manifest: false,
		});

		assert.equal(result.status, 1);
		assert.match(
			result.stderr,
			/bundles\.mjs: no \.prism\/architect\/manifest\.json above the plan/
		);
	});

	test("the umbrellas key is never treated as a route", () => {
		const result = runBundles({ tasks: "### T1: a\n- files: umbrellas\n" });

		assert.equal(result.status, 0, result.stderr);
		assert.deepEqual(result.report!.groups, [{ docs: [], tasks: ["T1"] }]);
	});

	test("exits 1 on a dependency cycle, naming it", () => {
		const result = runBundles({
			tasks:
				"### T1: a\n- files: scripts/a.mjs\n- depends on: T2\n\n### T2: b\n- files: scripts/b.mjs\n- depends on: T1\n",
		});

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Dependency cycle: T1 -> T2 -> T1/);
	});

	test("groups unblocked tasks by the docs their files route to", () => {
		const result = runBundles({
			tasks: [
				"### T1: a\n- files: frontend/a.ts\n",
				"### T2: b\n- files: scripts/b.mjs\n",
				"### T3: c\n- files: frontend/c.tsx\n",
				"### T4: d\n- files: .prism/rules/d.md, scripts/d.mjs\n",
			].join("\n"),
		});

		assert.equal(result.status, 0, result.stderr);
		assert.deepEqual(result.report!.groups, [
			{ docs: ["docs/frontend.md", "docs/source.md"], tasks: ["T1", "T3"] },
			{ docs: ["docs/source.md"], tasks: ["T2"] },
			{ docs: ["docs/source.md", "docs/spec-editing.md"], tasks: ["T4"] },
		]);
	});

	test("unblocks a task whose dependency is done and leaves done tasks out", () => {
		const result = runBundles({
			tasks:
				"### T1: a\n- files: scripts/a.mjs\n\n### T2: b\n- files: scripts/b.mjs\n- depends on: T1\n",
			subjectsAfterBase: ["T1: Ship a"],
		});

		assert.equal(result.status, 0, result.stderr);
		assert.deepEqual(
			result.report!.groups.map((group) => group.tasks),
			[["T2"]]
		);
	});

	test("exits 1 when open tasks sharing a file are ordered only through a done task", () => {
		const result = runBundles({
			tasks: [
				"### T1: a\n- files: scripts/a.mjs\n",
				"### T2: b\n- files: scripts/b.mjs\n- depends on: T1\n",
				"### T3: c\n- files: scripts/a.mjs\n- depends on: T2\n",
			].join("\n"),
			subjectsAfterBase: ["T2: Ship b"],
		});

		assert.equal(result.status, 1);
		assert.match(
			result.stderr,
			/Duplicate claim: scripts\/a\.mjs is listed by T1 and T3/
		);
	});

	test("reads import edges from open tasks only, so a done task's imports add no edge", () => {
		const result = runBundles({
			tasks: [
				"### T1: a\n- files: scripts/c.mjs\n",
				"### T2: b\n- files: scripts/a.mjs\n- depends on: T1\n",
			].join("\n"),
			files: {
				"scripts/c.mjs": 'import { a } from "./a.mjs";\n',
				"scripts/a.mjs": "export const a = 1;\n",
			},
			subjectsAfterBase: ["T1: Ship c"],
		});

		assert.equal(result.status, 0, result.stderr);
		assert.deepEqual(result.report!.edges, []);
		assert.deepEqual(
			result.report!.groups.map((group) => group.tasks),
			[["T2"]]
		);
	});

	test("exits 1 on a depends on ID that names no task", () => {
		const result = runBundles({
			tasks: "### T1: a\n- files: scripts/a.mjs\n- depends on: T99\n",
		});

		assert.equal(result.status, 1);
		assert.match(result.stderr, /T1: depends on T99, which names no task/);
	});

	test("groups a draft plan's tasks when --base is absent, as the plan stage runs it", () => {
		const result = runBundles({
			frontmatter: "---\ntitle: P\nstatus: draft\n---\n\n",
			tasks: "### T1: a\n- files: scripts/a.mjs\n",
			passBase: false,
		});

		assert.equal(result.status, 0, result.stderr);
		assert.deepEqual(
			result.report!.groups.map((group) => group.tasks),
			[["T1"]]
		);
	});

	test("exits 1 with --base when plan.md's status is not approved", () => {
		const result = runBundles({
			frontmatter: "---\ntitle: P\nstatus: draft\n---\n\n",
			tasks: "### T1: a\n- files: scripts/a.mjs\n",
		});

		assert.equal(result.status, 1);
		assert.match(
			result.stderr,
			/plan\.md is not approved — approve it before building/
		);
	});

	test("groups the tasks of an approved plan", () => {
		const result = runBundles({
			frontmatter:
				"---\ntitle: P\nstatus: approved\napproved_by: auto\napproved_at: 2026-11-01\n---\n\n",
			tasks: "### T1: a\n- files: scripts/a.mjs\n",
		});

		assert.equal(result.status, 0, result.stderr);
		assert.deepEqual(
			result.report!.groups.map((group) => group.tasks),
			[["T1"]]
		);
	});

	test("runs when invoked through a symlink", (t) => {
		const dir = mkdtempSync(path.join(os.tmpdir(), "plan-bundles-link-"));
		tempDirs.push(dir);
		const link = path.join(dir, "bundles.mjs");
		try {
			symlinkSync(BUNDLES_CLI, link);
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

	test("exits 1 on an unparseable task block", () => {
		const result = runBundles({ tasks: "### Task one\n- files: a.ts\n" });

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Unparseable task heading/);
	});
});
