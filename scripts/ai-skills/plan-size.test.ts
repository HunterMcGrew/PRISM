/**
 * Suite for the size script: the small limits, the product-code classes, the
 * area rule, `--tree`, and the exit codes.
 */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

import { classifyDiff, resolveSizeOptions } from "./hooks/plan/size.mjs";

const SIZE_SCRIPT = fileURLToPath(new URL("./hooks/plan/size.mjs", import.meta.url));
const GLOBAL_CONFIG_DIR = mkdtempSync(path.join(os.tmpdir(), "plan-size-gitcfg-"));
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

function git(cwd: string, ...args: string[]): string {
	return execFileSync("git", args, { cwd, env: GIT_ENV, encoding: "utf8" });
}

function lines(count: number, label = "line"): string {
	return Array.from({ length: count }, (_, i) => `${label} ${i}\n`).join("");
}

function write(repo: string, file: string, content: string | Buffer): void {
	const target = path.join(repo, file);
	mkdirSync(path.dirname(target), { recursive: true });
	writeFileSync(target, content);
}

/**
 * A repo whose `main` holds `src/app/main.ts` (200 lines), `src/lib/old.ts`,
 * `package.json`, and a config, with `feature` checked out at the same commit.
 */
function createRepo(config: object | string = { documentation: { location: "docs/" } }): string {
	const repo = mkdtempSync(path.join(os.tmpdir(), "plan-size-"));
	tempDirs.push(repo);
	git(repo, "init", "-q", "-b", "main");
	write(repo, "src/app/main.ts", lines(200, "base"));
	write(repo, "src/lib/old.ts", lines(10, "old"));
	write(repo, "package.json", "{}\n");
	write(
		repo,
		".ai-skills/config.json",
		typeof config === "string" ? config : `${JSON.stringify(config)}\n`
	);
	git(repo, "add", "-A");
	git(repo, "commit", "-q", "-m", "ACME-1: Base");
	git(repo, "checkout", "-q", "-b", "feature");

	return repo;
}

function runSize(repo: string, args: string[]) {
	return spawnSync(process.execPath, [SIZE_SCRIPT, ...args], {
		cwd: repo,
		env: GIT_ENV,
		encoding: "utf8",
	});
}

describe("size.mjs", () => {
	test("prints small and exits 0 for 90 added product lines in one area", () => {
		const repo = createRepo();
		write(repo, "src/app/main.ts", lines(200, "base") + lines(90, "new"));

		const result = runSize(repo, ["main"]);

		assert.equal(result.status, 0, result.stderr);
		assert.equal(result.stdout, "small\n");
	});

	test("prints standard with a lines reason and exits 1 for 120 added product lines", () => {
		const repo = createRepo();
		write(repo, "src/app/main.ts", lines(200, "base") + lines(120, "new"));

		const result = runSize(repo, ["main"]);

		assert.equal(result.status, 1, result.stderr);
		assert.equal(result.stdout, "standard\nlines: 120 added product lines, limit 100\n");
	});

	test("counts no deleted line, so 90 added and 150 deleted product lines stay small", () => {
		const repo = createRepo();
		write(repo, "src/app/main.ts", lines(50, "base") + lines(90, "new"));

		const result = runSize(repo, ["main"]);

		assert.equal(result.status, 0, result.stderr);
		assert.equal(result.stdout, "small\n");
	});

	test("counts a deleted product file toward no limit", () => {
		const repo = createRepo();
		git(repo, "rm", "-q", "src/lib/old.ts");
		write(repo, "src/app/main.ts", lines(200, "base") + lines(10, "new"));

		const result = runSize(repo, ["main"]);

		assert.equal(result.status, 0, result.stderr);
		assert.equal(result.stdout, "small\n");
	});

	test("prints a stop path reason for an edit to package.json", () => {
		const repo = createRepo();
		write(repo, "package.json", '{ "name": "x" }\n');

		const result = runSize(repo, ["main"]);

		assert.equal(result.status, 1, result.stderr);
		assert.equal(result.stdout, "standard\nstop path: package.json\n");
	});

	test("prints a new files reason for two new product files, untracked included", () => {
		const repo = createRepo();
		write(repo, "src/app/one.ts", lines(5));
		write(repo, "src/app/two.ts", lines(5));

		const result = runSize(repo, ["main"]);

		assert.equal(result.status, 1, result.stderr);
		assert.equal(result.stdout, "standard\nnew files: 2 new product files, limit 1\n");
	});

	test("prints an areas reason for product files in two areas", () => {
		const repo = createRepo();
		write(repo, "src/app/main.ts", lines(200, "base") + lines(5, "new"));
		write(repo, "src/lib/old.ts", lines(10, "old") + lines(5, "new"));

		const result = runSize(repo, ["main"]);

		assert.equal(result.status, 1, result.stderr);
		assert.equal(result.stdout, "standard\nareas: product files in 2 areas (src/app, src/lib)\n");
	});

	test("cuts the area at two segments, so a deeper folder shares its area", () => {
		const repo = createRepo();
		write(repo, "src/app/main.ts", lines(200, "base") + lines(5, "new"));
		write(repo, "src/app/deep/er/x.ts", lines(5));

		const result = runSize(repo, ["main"]);

		assert.equal(result.status, 0, result.stderr);
		assert.equal(result.stdout, "small\n");
	});

	test("prints a lines reason for a binary product file", () => {
		const repo = createRepo();
		write(repo, "src/app/logo.bin", Buffer.from([0, 1, 2, 0, 3]));

		const result = runSize(repo, ["main"]);

		assert.equal(result.status, 1, result.stderr);
		assert.equal(
			result.stdout,
			"standard\nlines: src/app/logo.bin is binary, so its added lines are unknown\n"
		);
	});

	test("counts tests, docs, plans, lockfiles, config, and other .prism paths toward no limit", () => {
		const repo = createRepo({
			documentation: { location: "docs/" },
			stopPaths: { dependency: [] },
		});
		write(repo, "src/app/main.test.ts", lines(300));
		write(repo, "docs/guide.txt", lines(300));
		write(repo, "notes/readme.md", lines(300));
		write(repo, ".prism/plans/acme-2/plan.md", lines(300));
		write(repo, "yarn.lock", lines(300));
		write(repo, "tools/settings.yml", lines(300));
		write(repo, "tools/settings.toml", lines(300));
		write(repo, ".prism/metrics/review-misses.jsonl", lines(300));

		const result = runSize(repo, ["main"]);

		assert.equal(result.status, 0, result.stderr);
		assert.equal(result.stdout, "small\n");
	});

	test("reads a rename as a moved file, not a new one", () => {
		const repo = createRepo();
		git(repo, "mv", "src/lib/old.ts", "src/app/renamed.ts");
		write(repo, "src/app/one.ts", lines(5));

		const result = runSize(repo, ["main"]);

		assert.equal(result.status, 0, result.stderr);
		assert.equal(result.stdout, "small\n");
	});

	test("measures the --tree treeish in place of the working tree", () => {
		const repo = createRepo();
		write(repo, "src/app/main.ts", lines(200, "base") + lines(120, "new"));
		git(repo, "add", "src/app/main.ts");
		const tree = git(repo, "write-tree").trim();
		git(repo, "reset", "-q", "--hard");

		assert.equal(runSize(repo, ["main"]).stdout, "small\n");

		const result = runSize(repo, ["main", "--tree", tree]);

		assert.equal(result.status, 1, result.stderr);
		assert.equal(result.stdout, "standard\nlines: 120 added product lines, limit 100\n");
	});

	test("exits 2 on an unknown base", () => {
		const repo = createRepo();

		const result = runSize(repo, ["no-such-branch"]);

		assert.equal(result.status, 2);
		assert.match(result.stderr, /no-such-branch/);
	});

	test("exits 2 on a config that does not parse", () => {
		const repo = createRepo("{ not json");

		const result = runSize(repo, ["main"]);

		assert.equal(result.status, 2);
		assert.match(result.stderr, /config\.json/);
	});

	test("exits 2 on a usage error", () => {
		const repo = createRepo();

		assert.equal(runSize(repo, []).status, 2);
		assert.equal(runSize(repo, ["main", "--tree"]).status, 2);
	});
});

describe("classifyDiff", () => {
	const options = (docsLocation?: string) =>
		resolveSizeOptions(
			docsLocation === undefined ? {} : { documentation: { location: docsLocation } }
		);

	test("reads a file under the docs root as a doc, whatever its slashes", () => {
		for (const location of ["docs/", "docs", "./docs/"]) {
			const result = classifyDiff(
				[{ path: "docs/a/b.txt", status: "A", added: 500 }],
				options(location)
			);

			assert.deepEqual(result, { size: "small", reasons: [] }, location);
		}
	});

	test("with no docs root, still reads a .md file as a doc and a docs/ text file as product", () => {
		assert.deepEqual(
			classifyDiff([{ path: "docs/a.md", status: "A", added: 500 }], options()),
			{ size: "small", reasons: [] }
		);
		assert.deepEqual(
			classifyDiff([{ path: "docs/a.txt", status: "M", added: 500 }], options()),
			{ size: "standard", reasons: ["lines: 500 added product lines, limit 100"] }
		);
	});

	test("gives a file at the repo root the area '.'", () => {
		const result = classifyDiff(
			[
				{ path: "main.ts", status: "M", added: 1 },
				{ path: "src/x.ts", status: "M", added: 1 },
			],
			options()
		);

		assert.deepEqual(result.reasons, ["areas: product files in 2 areas (., src)"]);
	});

	test("counts a stop path under .prism before the .prism record rule", () => {
		const result = classifyDiff(
			[{ path: ".prism/contracts/api.ts", status: "M", added: 1 }],
			resolveSizeOptions({ stopPaths: { contract: [".prism/contracts/**"] } })
		);

		assert.deepEqual(result.reasons, ["stop path: .prism/contracts/api.ts"]);
	});
});
