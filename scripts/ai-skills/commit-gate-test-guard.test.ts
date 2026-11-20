/**
 * Pins the commit gate's weakened-tests check: a commit never removes a line
 * from a test file that predates the branch unless a named task lists the file
 * and carries `behavior change:`. Also pins `resolveTestGlobs`, which reads the
 * `testGlobs` config key. Each case builds a throwaway repo whose branch names a
 * plan folder.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { loadContext } from "./hooks/commit-gate/checks.mjs";
import { readCommit, repoRelativePaths } from "./hooks/commit-gate/parse.mjs";
import {
	resolveTestGlobs,
	TEST_GUARD_CHECK,
} from "./hooks/commit-gate/test-guard.mjs";
import { buildWouldBeIndex } from "./hooks/commit-gate/tree.mjs";
import { compileMatcher } from "./hooks/lib/match.mjs";

const RUNTIME_PATH = fileURLToPath(new URL("./hooks/", import.meta.url));
// Forward slashes on every platform, because `tokenize` reads a `\` in a
// command string as an escape.
const RUNTIME = RUNTIME_PATH.split(path.sep).join("/").replace(/\/$/, "");
const PLAN_DIR = ".prism/plans/prism-9";
const PLAN = `${PLAN_DIR}/plan.md`;
const SPEC = `${PLAN_DIR}/spec.md`;
const APPROVAL = "status: approved\napproved_by: Test\napproved_at: 2026-11-02";
const TEST_FILE = "src/a.test.mjs";
const RENAMED_TEST_FILE = "src/b.test.mjs";
const NO_EOL_FILE = "src/c.test.mjs";
const STORY_FILE = "frontend/components/Card.test.tsx";
const FLAT_COMMIT =
	"git add src/a.test.mjs && git commit -m 'PRISM-8: Fix a' -- src/a.test.mjs";
const TEST_TEXT = `describe("a", () => {
	test("one", () => {
		assert.ok(true);
	});
});
`;
const TASKS = `### T1: Build a
- files: src/a.mjs, src/a.test.mjs, frontend/components/Card.test.tsx
- depends on: none

### T2: Change a's tests
- files: src/a.test.mjs
- behavior change: the second assertion no longer holds
- depends on: none
`;
const DEFAULT_GLOBS = [
	"*.test.*",
	"**/*.test.*",
	"*.spec.*",
	"**/*.spec.*",
	"__tests__/**",
	"**/__tests__/**",
	"test/**",
	"**/test/**",
	"tests/**",
	"**/tests/**",
];
// Keeps each fixture repo off the caller's git config and identity.
const GIT_ENV = {
	...process.env,
	GIT_CONFIG_GLOBAL: "/dev/null",
	GIT_CONFIG_NOSYSTEM: "1",
	GIT_AUTHOR_NAME: "Test",
	GIT_AUTHOR_EMAIL: "test@example.com",
	GIT_COMMITTER_NAME: "Test",
	GIT_COMMITTER_EMAIL: "test@example.com",
};
const TEMP_DIRS: string[] = [];

after(() => {
	for (const dir of TEMP_DIRS) rmSync(dir, { recursive: true, force: true });
});

// --- Fixtures ---

function git(cwd: string, ...args: string[]): string {
	return execFileSync("git", args, {
		cwd,
		env: GIT_ENV,
		encoding: "utf8",
	}).trim();
}

function write(repo: string, file: string, text: string): void {
	mkdirSync(path.dirname(path.join(repo, file)), { recursive: true });
	writeFileSync(path.join(repo, file), text);
}

function read(repo: string, file: string): string {
	return readFileSync(path.join(repo, file), "utf8");
}

function intentText(): string {
	return `---\ntitle: Test\nticket: PRISM-9\nstage: intent\nsize: standard\n${APPROVAL}\n---\n\n## Goal\n\nTest.\n`;
}

function planText(tasks = TASKS): string {
	return `---\ntitle: Test\nticket: PRISM-9\nstage: plan\n${APPROVAL}\n---\n\n## Tasks\n\n${tasks}\n## Review\n\n## History\n`;
}

/**
 * A repo whose base commit holds a test file, a second test file, and a source
 * file, a config naming the `PRISM` ticket prefix, and a PRISM-9 plan folder
 * unless `kind` says otherwise. `kind` "intent" leaves the folder's plan.md
 * unwritten, "epic" swaps the folder for one holding a spec.md only, "flat"
 * gives the branch a flat plan for PRISM-8, and "none" gives it no plan. The
 * base is `origin/<defaultBranch>`.
 */
function createRepo({
	kind = "full",
	defaultBranch = "main",
	testGlobs,
}: { kind?: string; defaultBranch?: string; testGlobs?: unknown } = {}): string {
	const repo = mkdtempSync(path.join(os.tmpdir(), "commit-gate-test-guard-"));
	TEMP_DIRS.push(repo);
	git(repo, "init", "-q");
	write(repo, "src/a.mjs", "export const a = 1;\n");
	write(repo, TEST_FILE, TEST_TEXT);
	write(
		repo,
		STORY_FILE,
		"export const Default = {};\nexport const Empty = {};\n"
	);
	write(
		repo,
		".ai-skills/config.json",
		`${JSON.stringify({ ticketPrefix: "PRISM", defaultBranch, testGlobs })}\n`
	);
	if (kind === "epic") {
		write(repo, SPEC, "---\nticket: PRISM-9\n---\n");
	} else if (kind === "flat") {
		write(repo, ".prism/plans/prism-8.md", "# PRISM-8\n\n- [ ] Fix a\n");
	} else if (kind !== "none") {
		write(repo, `${PLAN_DIR}/intent.md`, intentText());
	}
	if (kind === "full") write(repo, PLAN, planText());
	git(repo, "add", ".");
	git(repo, "commit", "-q", "-m", "PRISM-9: Base");
	git(repo, "update-ref", `refs/remotes/origin/${defaultBranch}`, "HEAD");
	git(
		repo,
		"checkout",
		"-q",
		"-b",
		kind === "flat" || kind === "none" ? "u/prism-8-x" : "u/prism-9-x"
	);

	return repo;
}

function removeLine(repo: string, file: string, line: string): void {
	const text = read(repo, file);
	assert.ok(text.includes(`${line}\n`), `${file} lacks ${line}`);
	write(repo, file, text.replace(`${line}\n`, ""));
}

/** The `node <runtime>/plan/commit.mjs` command that commits `files` under `subject`. */
function commitMjs(subject: string, ...files: string[]): string {
	return `node ${RUNTIME}/plan/commit.mjs "${subject}" ${files.join(" ")}`;
}

function runCheck(repo: string, command: string) {
	const commit = readCommit(command, repo);
	assert.ok(commit, `no commit read from ${command}`);

	const index = buildWouldBeIndex(repo, repoRelativePaths(commit, repo), {
		literal: commit.form === "commit.mjs",
	});
	try {
		return TEST_GUARD_CHECK.run(loadContext({ repoRoot: repo, commit, index }));
	} finally {
		index.cleanup();
	}
}

function assertDeny(
	result: { reason: string; remedy: string } | null,
	pattern: RegExp
): asserts result is { reason: string; remedy: string } {
	assert.ok(result, "expected the weakened-tests check to deny");
	assert.match(result.reason, pattern);
	assert.ok(!result.remedy.includes("\n"), "a remedy is one line");
}

// --- The check ---

test("TEST_GUARD_CHECK is named weakened tests and carries no number", () => {
	assert.equal(TEST_GUARD_CHECK.name, "weakened tests");
	assert.equal(Object.hasOwn(TEST_GUARD_CHECK, "id"), false);
});

// --- The weakened-tests check ---

test("denies a removed test line on a task with no behavior change", () => {
	const repo = createRepo();
	removeLine(repo, TEST_FILE, "\t\tassert.ok(true);");

	assertDeny(
		runCheck(repo, commitMjs("T1: Build a", TEST_FILE)),
		/src\/a\.test\.mjs loses 1 line/
	);
});

test("a removal on a commit that names no task says so and asks for a task subject, not a behavior change line", () => {
	const repo = createRepo();
	removeLine(repo, TEST_FILE, "\t\tassert.ok(true);");

	for (const command of [
		commitMjs("plan: Trim a", TEST_FILE),
		commitMjs("T99: A task the plan lacks", TEST_FILE),
		`git commit -F msg.txt -- ${TEST_FILE}`,
	]) {
		const denied = runCheck(repo, command);
		assertDeny(
			denied,
			/src\/a\.test\.mjs loses 1 line, and the commit's subject names no task the plan holds/
		);
		assert.match(denied.remedy, /"T<n>: <summary>"/);
		assert.match(denied.remedy, /-m or a heredoc/);
		assert.doesNotMatch(denied.remedy, /behavior change/);
	}
});

test("passes the same removal on a task that lists the file with behavior change", () => {
	const repo = createRepo();
	removeLine(repo, TEST_FILE, "\t\tassert.ok(true);");

	assert.equal(
		runCheck(repo, commitMjs("T2: Change a's tests", TEST_FILE)),
		null
	);
});

test("passes once the remedy's behavior change line is added under the task", () => {
	const repo = createRepo();
	removeLine(repo, TEST_FILE, "\t\tassert.ok(true);");
	const command = commitMjs("T1: Build a", TEST_FILE);
	const denied = runCheck(repo, command);
	assertDeny(denied, /loses 1 line/);
	assert.match(denied.remedy, /- behavior change:/);

	write(
		repo,
		PLAN,
		read(repo, PLAN).replace(
			"frontend/components/Card.test.tsx\n",
			"frontend/components/Card.test.tsx\n- behavior change: the assertion moved to a helper\n"
		)
	);

	assert.equal(runCheck(repo, command), null);
});

test("passes once the remedy's restore puts the removed line back", () => {
	const repo = createRepo();
	removeLine(repo, TEST_FILE, "\t\tassert.ok(true);");
	const command = commitMjs("T1: Build a", TEST_FILE);
	assertDeny(runCheck(repo, command), /loses 1 line/);

	write(repo, TEST_FILE, TEST_TEXT);

	assert.equal(runCheck(repo, command), null);
});

test("denies a behavior change on a task that doesn't list the file", () => {
	const repo = createRepo();
	removeLine(repo, STORY_FILE, "export const Empty = {};");

	assertDeny(
		runCheck(repo, commitMjs("T1,T2: Build a", STORY_FILE)),
		/Card\.test\.tsx loses 1 line/
	);
});

test("passes a test added before a closing });", () => {
	const repo = createRepo();
	write(
		repo,
		TEST_FILE,
		TEST_TEXT.replace(
			/\}\);\n$/,
			'\ttest("two", () => {\n\t\tassert.ok(true);\n\t});\n});\n'
		)
	);

	assert.equal(runCheck(repo, commitMjs("T1: Build a", TEST_FILE)), null);
});

test("denies a deleted test file", () => {
	const repo = createRepo();
	unlinkSync(path.join(repo, TEST_FILE));

	assertDeny(
		runCheck(repo, commitMjs("T1: Build a", TEST_FILE)),
		/src\/a\.test\.mjs loses 5 lines/
	);
});

test("passes removed lines in a non-test file", () => {
	const repo = createRepo();
	write(repo, "src/a.mjs", "");

	assert.equal(runCheck(repo, commitMjs("T1: Build a", "src/a.mjs")), null);
});

test("passes a test file that is new on this commit", () => {
	const repo = createRepo();
	write(repo, "src/b.test.mjs", "test('b', () => {});\n");

	assert.equal(
		runCheck(repo, commitMjs("T1: Build a", "src/b.test.mjs")),
		null
	);
});

test("ignores a staged removal in a file the commit doesn't name", () => {
	const repo = createRepo();
	removeLine(repo, TEST_FILE, "\t\tassert.ok(true);");
	git(repo, "add", TEST_FILE);
	write(repo, "src/a.mjs", "export const a = 2;\n");

	assert.equal(runCheck(repo, commitMjs("T1: Build a", "src/a.mjs")), null);
});

test("on a plan folder with no plan.md yet, denies a removal, since no task can carry behavior change", () => {
	const repo = createRepo({ kind: "intent" });
	removeLine(repo, TEST_FILE, "\t\tassert.ok(true);");

	const result = runCheck(repo, commitMjs("T1: Fix a", TEST_FILE));
	assertDeny(result, /loses 1 line/);
	assert.match(result.remedy, /under the task that lists/);
});

test("on a branch with no plan, skips the check", () => {
	const repo = createRepo({ kind: "none" });
	removeLine(repo, TEST_FILE, "\t\tassert.ok(true);");

	assert.equal(runCheck(repo, FLAT_COMMIT), null);
});

test("on a flat-plan branch, skips the check even with no behavior change line", () => {
	const repo = createRepo({ kind: "flat" });
	removeLine(repo, TEST_FILE, "\t\tassert.ok(true);");

	assert.equal(runCheck(repo, FLAT_COMMIT), null);
});

test("on a branch whose only plan is archived, skips the check", () => {
	const repo = createRepo({ kind: "none" });
	write(repo, ".prism/archived/plans/prism-8/plan.md", planText());
	removeLine(repo, TEST_FILE, "\t\tassert.ok(true);");

	assert.equal(runCheck(repo, FLAT_COMMIT), null);
});

test("passes a pure rename of a test file", () => {
	const repo = createRepo();
	git(repo, "mv", TEST_FILE, RENAMED_TEST_FILE);

	assert.equal(
		runCheck(repo, commitMjs("T1: Build a", TEST_FILE, RENAMED_TEST_FILE)),
		null
	);
});

test("denies a rename that also drops a test line, naming the file it came from", () => {
	const repo = createRepo();
	git(repo, "mv", TEST_FILE, RENAMED_TEST_FILE);
	removeLine(repo, RENAMED_TEST_FILE, "\t\tassert.ok(true);");

	assertDeny(
		runCheck(repo, commitMjs("T1: Build a", TEST_FILE, RENAMED_TEST_FILE)),
		/src\/a\.test\.mjs \(now src\/b\.test\.mjs\) loses 1 line/
	);
});

test("passes a renamed test file's removal when a named task lists only its new path with behavior change", () => {
	const repo = createRepo();
	write(
		repo,
		PLAN,
		read(repo, PLAN).replace(
			"- files: src/a.test.mjs\n",
			`- files: ${RENAMED_TEST_FILE}\n`
		)
	);
	git(repo, "mv", TEST_FILE, RENAMED_TEST_FILE);
	removeLine(repo, RENAMED_TEST_FILE, "\t\tassert.ok(true);");

	assert.equal(
		runCheck(
			repo,
			commitMjs("T2: Change a's tests", TEST_FILE, RENAMED_TEST_FILE)
		),
		null
	);
});

test("passes an append to a test file that had no final newline", () => {
	const repo = createRepo();
	write(repo, NO_EOL_FILE, 'test("c", () => {});');
	git(repo, "add", NO_EOL_FILE);
	git(repo, "commit", "-q", "-m", "T1: Add c");
	git(repo, "update-ref", "refs/remotes/origin/main", "HEAD");
	write(repo, NO_EOL_FILE, 'test("c", () => {});\ntest("d", () => {});\n');

	assert.equal(runCheck(repo, commitMjs("T1: Build a", NO_EOL_FILE)), null);
});

test("passes dropping a test file's final newline", () => {
	const repo = createRepo();
	write(repo, TEST_FILE, TEST_TEXT.replace(/\n$/, ""));

	assert.equal(runCheck(repo, commitMjs("T1: Build a", TEST_FILE)), null);
});

test("denies a changed last line in a test file that had no final newline", () => {
	const repo = createRepo();
	write(repo, NO_EOL_FILE, 'test("c", () => {});');
	git(repo, "add", NO_EOL_FILE);
	git(repo, "commit", "-q", "-m", "T1: Add c");
	git(repo, "update-ref", "refs/remotes/origin/main", "HEAD");
	write(repo, NO_EOL_FILE, 'test("e", () => {});\n');

	assertDeny(
		runCheck(repo, commitMjs("T1: Build a", NO_EOL_FILE)),
		/src\/c\.test\.mjs loses 1 line/
	);
});

test("passes adding a test above the last line of a file that had no final newline", () => {
	const repo = createRepo();
	write(repo, NO_EOL_FILE, 'test("c", () => {});\ntest("last", () => {});');
	git(repo, "add", NO_EOL_FILE);
	git(repo, "commit", "-q", "-m", "T1: Add c");
	git(repo, "update-ref", "refs/remotes/origin/main", "HEAD");
	write(
		repo,
		NO_EOL_FILE,
		'test("c", () => {});\ntest("added", () => {});\ntest("last", () => {});\n'
	);

	assert.equal(runCheck(repo, commitMjs("T1: Build a", NO_EOL_FILE)), null);
});

test("passes adding a test above the last line when the edit drops the final newline", () => {
	const repo = createRepo();
	write(repo, NO_EOL_FILE, 'test("c", () => {});\ntest("last", () => {});\n');
	git(repo, "add", NO_EOL_FILE);
	git(repo, "commit", "-q", "-m", "T1: Add c");
	git(repo, "update-ref", "refs/remotes/origin/main", "HEAD");
	write(
		repo,
		NO_EOL_FILE,
		'test("c", () => {});\ntest("added", () => {});\ntest("last", () => {});'
	);

	assert.equal(runCheck(repo, commitMjs("T1: Build a", NO_EOL_FILE)), null);
});

test("passes dropping a branch-added line and the final newline together, past the unchanged last line", () => {
	const repo = createRepo();
	write(repo, NO_EOL_FILE, 'test("c", () => {});\ntest("last", () => {});\n');
	git(repo, "add", NO_EOL_FILE);
	git(repo, "commit", "-q", "-m", "T1: Add c");
	git(repo, "update-ref", "refs/remotes/origin/main", "HEAD");
	write(
		repo,
		NO_EOL_FILE,
		'test("c", () => {});\ntest("last", () => {});\ntest("more", () => {});\n'
	);
	git(repo, "add", NO_EOL_FILE);
	git(repo, "commit", "-q", "-m", "T1: Add more");
	write(repo, NO_EOL_FILE, 'test("c", () => {});\ntest("last", () => {});');

	assert.equal(runCheck(repo, commitMjs("T1 fix: Build a", NO_EOL_FILE)), null);
});

test("denies a removed line next to a last line that only gained its final newline", () => {
	const repo = createRepo();
	write(repo, NO_EOL_FILE, 'test("c", () => {});\ntest("gone", () => {});\ntest("last", () => {});');
	git(repo, "add", NO_EOL_FILE);
	git(repo, "commit", "-q", "-m", "T1: Add c");
	git(repo, "update-ref", "refs/remotes/origin/main", "HEAD");
	write(repo, NO_EOL_FILE, 'test("c", () => {});\ntest("last", () => {});\n');

	assertDeny(
		runCheck(repo, commitMjs("T1: Build a", NO_EOL_FILE)),
		/src\/c\.test\.mjs loses 1 line/
	);
});

test("denies moving a no-newline file's assertion out of its test body", () => {
	const repo = createRepo();
	write(repo, NO_EOL_FILE, 'test("one", () => {\n\tsetup();\n\tassert.ok(check());\n})');
	git(repo, "add", NO_EOL_FILE);
	git(repo, "commit", "-q", "-m", "T1: Add c");
	git(repo, "update-ref", "refs/remotes/origin/main", "HEAD");
	write(repo, NO_EOL_FILE, 'test("one", () => {\n\tsetup();\n})\n\tassert.ok(check());');

	assertDeny(
		runCheck(repo, commitMjs("T1: Build a", NO_EOL_FILE)),
		/src\/c\.test\.mjs loses/
	);
});

test("passes a removal in a test file a named task amends with behavior change", () => {
	const repo = createRepo();
	const amending = `### T3: Move a's assertion
- files: src/a.mjs
- amended: ${TEST_FILE}: the assertion moved into a.mjs
- behavior change: the assertion moved into a.mjs
- depends on: none
`;
	write(repo, PLAN, planText(`${TASKS}\n${amending}`));
	git(repo, "commit", "-q", "-m", "plan: Add T3", "--", PLAN);
	removeLine(repo, TEST_FILE, "\t\tassert.ok(true);");

	assert.equal(
		runCheck(repo, commitMjs("T3: Move a's assertion", TEST_FILE, PLAN)),
		null
	);
});

// --- Measured against the default branch ---

test("passes a rewrite of a line this branch added to a test the default branch has", () => {
	const repo = createRepo();
	write(
		repo,
		TEST_FILE,
		TEST_TEXT.replace(/\}\);\n$/, '\ttest("two", () => {});\n});\n')
	);
	git(repo, "add", TEST_FILE);
	git(repo, "commit", "-q", "-m", "T1: Add two");
	removeLine(repo, TEST_FILE, '\ttest("two", () => {});');

	assert.equal(
		runCheck(repo, commitMjs("T1 fix: Rework two", TEST_FILE)),
		null
	);
});

test("passes an edit to a test file this branch created", () => {
	const repo = createRepo();
	write(repo, RENAMED_TEST_FILE, "test('b', () => {});\n");
	git(repo, "add", RENAMED_TEST_FILE);
	git(repo, "commit", "-q", "-m", "T1: Add b");
	write(repo, RENAMED_TEST_FILE, "test('b2', () => {});\n");

	assert.equal(
		runCheck(repo, commitMjs("T1 fix: Rework b", RENAMED_TEST_FILE)),
		null
	);
});

test("still denies a default-branch line after a branch commit touched the file", () => {
	const repo = createRepo();
	write(repo, TEST_FILE, `${TEST_TEXT}// branch note\n`);
	git(repo, "add", TEST_FILE);
	git(repo, "commit", "-q", "-m", "T1: Note");
	removeLine(repo, TEST_FILE, "\t\tassert.ok(true);");

	assertDeny(
		runCheck(repo, commitMjs("T1 fix: Trim a", TEST_FILE)),
		/src\/a\.test\.mjs loses 1 line/
	);
});

test("passes a commit that only adds a test after an earlier commit's permitted removal", () => {
	const repo = createRepo();
	removeLine(repo, TEST_FILE, "\t\tassert.ok(true);");
	assert.equal(
		runCheck(repo, commitMjs("T2: Change a's tests", TEST_FILE)),
		null
	);
	git(repo, "add", TEST_FILE);
	git(repo, "commit", "-q", "-m", "T2: Change a's tests");
	write(repo, TEST_FILE, `${read(repo, TEST_FILE)}test("new", () => {});\n`);

	assert.equal(runCheck(repo, commitMjs("T1: Build a", TEST_FILE)), null);
});

test("passes removing a branch line whose text matches a default-branch line an earlier commit removed", () => {
	const repo = createRepo();
	write(
		repo,
		TEST_FILE,
		TEST_TEXT.replace(
			/\}\);\n$/,
			'\ttest("two", () => {\n\t\tassert.ok(true);\n\t});\n});\n'
		)
	);
	git(repo, "add", TEST_FILE);
	git(repo, "commit", "-q", "-m", "T1: Add two");
	removeLine(repo, TEST_FILE, "\t\tassert.ok(true);");
	git(repo, "add", TEST_FILE);
	git(repo, "commit", "-q", "-m", "T2: Change a's tests");
	removeLine(repo, TEST_FILE, "\t\tassert.ok(true);");

	assert.equal(
		runCheck(repo, commitMjs("T1 fix: Rework two", TEST_FILE)),
		null
	);
});

test("measures against origin/<defaultBranch> from the config", () => {
	const repo = createRepo({ defaultBranch: "trunk" });
	write(
		repo,
		TEST_FILE,
		TEST_TEXT.replace(/\}\);\n$/, '\ttest("two", () => {});\n});\n')
	);
	git(repo, "add", TEST_FILE);
	git(repo, "commit", "-q", "-m", "T1: Add two");
	removeLine(repo, TEST_FILE, '\ttest("two", () => {});');

	assert.equal(
		runCheck(repo, commitMjs("T1 fix: Rework two", TEST_FILE)),
		null
	);
});

// --- testGlobs ---

test("reads a test file by the testGlobs a config sets, in place of the defaults", () => {
	const repo = createRepo({ testGlobs: ["src/*.check.mjs"] });
	removeLine(repo, TEST_FILE, "\t\tassert.ok(true);");

	assert.equal(runCheck(repo, commitMjs("T1: Build a", TEST_FILE)), null);

	write(repo, "src/x.check.mjs", "a\nb\n");
	git(repo, "add", "src/x.check.mjs");
	git(repo, "commit", "-q", "-m", "T1: Add x");
	git(repo, "update-ref", "refs/remotes/origin/main", "HEAD");
	write(repo, "src/x.check.mjs", "a\n");

	assertDeny(
		runCheck(repo, commitMjs("T1: Build a", "src/x.check.mjs")),
		/src\/x\.check\.mjs loses 1 line/
	);
});

test("reads a test file at the repo root and under test/ by the default globs", () => {
	const repo = createRepo();
	for (const file of ["root.test.ts", "test/helper.ts", "pkg/__tests__/x.ts"]) {
		write(repo, file, "a\nb\n");
	}
	git(repo, "add", ".");
	git(repo, "commit", "-q", "-m", "T1: Add tests");
	git(repo, "update-ref", "refs/remotes/origin/main", "HEAD");

	for (const file of ["root.test.ts", "test/helper.ts", "pkg/__tests__/x.ts"]) {
		write(repo, file, "a\n");
		assertDeny(
			runCheck(repo, commitMjs("T1: Build a", file)),
			new RegExp(`${file.replace(/[./]/g, "\\$&")} loses 1 line`)
		);
		write(repo, file, "a\nb\n");
	}
});

// --- resolveTestGlobs ---

test("resolveTestGlobs returns the default for an absent key", () => {
	assert.deepEqual(resolveTestGlobs({}), DEFAULT_GLOBS);
	assert.deepEqual(resolveTestGlobs(null), DEFAULT_GLOBS);
	assert.deepEqual(resolveTestGlobs(undefined), DEFAULT_GLOBS);
});

test("resolveTestGlobs returns a set list in place of the default", () => {
	assert.deepEqual(resolveTestGlobs({ testGlobs: ["src/**/*.test.ts"] }), [
		"src/**/*.test.ts",
	]);
	assert.deepEqual(resolveTestGlobs({ testGlobs: [] }), []);
});

test("the config schema's testGlobs example matches a test file at the top of src/ and one below it", () => {
	const schema = JSON.parse(
		readFileSync(
			fileURLToPath(new URL("../../.ai-skills/config.schema.json", import.meta.url)),
			"utf8"
		)
	);
	const [example] = schema.properties.testGlobs.examples;
	const matchers = example.map(compileMatcher);

	for (const file of ["src/a.test.ts", "src/x/a.test.ts"]) {
		assert.ok(
			matchers.some((matches: (file: string) => boolean) => matches(file)),
			file
		);
	}
});

test("resolveTestGlobs throws naming testGlobs on a value that is not a list of strings or holds a brace", () => {
	for (const testGlobs of ["x", [1], ["{a,b}.ts"], null, {}]) {
		assert.throws(
			() => resolveTestGlobs({ testGlobs }),
			/testGlobs/,
			JSON.stringify(testGlobs)
		);
	}
});

// --- Config that shapes git's own output ---

test("denies a removed default-branch line under each git config that changes diff output", () => {
	for (const [key, value] of [
		["color.ui", "always"],
		["diff.external", "echo"],
	] as const) {
		const repo = createRepo();
		git(repo, "config", key, value);
		removeLine(repo, TEST_FILE, "\t\tassert.ok(true);");

		assertDeny(
			runCheck(repo, commitMjs("T1: Build a", TEST_FILE)),
			/src\/a\.test\.mjs loses 1 line/
		);
	}
});

test("denies a removed default-branch line when a textconv driver blanks the diff", () => {
	const repo = createRepo();
	git(repo, "config", "diff.blank.textconv", "true");
	write(repo, ".gitattributes", "*.test.mjs diff=blank\n");
	removeLine(repo, TEST_FILE, "\t\tassert.ok(true);");

	assertDeny(
		runCheck(repo, commitMjs("T1: Build a", TEST_FILE)),
		/src\/a\.test\.mjs loses 1 line/
	);
});

test("denies a removed default-branch line that sits within diff.interHunkContext of a removed branch line", () => {
	const repo = createRepo();
	const branchText = TEST_TEXT.replace(
		"\t\tassert.ok(true);\n",
		"\t\tassert.ok(true);\n\t\tbranchA();\n\t\tbranchB();\n"
	);
	write(repo, TEST_FILE, branchText);
	git(repo, "add", TEST_FILE);
	git(repo, "commit", "-q", "-m", "T1: Add branch lines");
	git(repo, "config", "diff.interHunkContext", "3");
	write(
		repo,
		TEST_FILE,
		branchText.replace("\t\tbranchA();\n", "").replace("\t});\n", "")
	);

	assertDeny(
		runCheck(repo, commitMjs("T1 fix: Trim a", TEST_FILE)),
		/src\/a\.test\.mjs loses 1 line/
	);
});

test("denies a removed default-branch line when a -diff attribute marks the file binary", () => {
	const repo = createRepo();
	write(repo, ".git/info/attributes", "*.test.mjs -diff\n");
	removeLine(repo, TEST_FILE, "\t\tassert.ok(true);");

	assertDeny(
		runCheck(repo, commitMjs("T1: Build a", TEST_FILE)),
		/src\/a\.test\.mjs loses 1 line/
	);
});

test("denies a removed default-branch line when a textconv driver blanks blame's view of the file", () => {
	const repo = createRepo();
	write(repo, TEST_FILE, TEST_TEXT.replace("\t\tassert.ok(true);\n", "\t\tassert.ok(true);\n\t\tbranchA();\n"));
	git(repo, "add", TEST_FILE);
	git(repo, "commit", "-q", "-m", "T1: Add a branch line");
	git(repo, "config", "diff.blank.textconv", "true");
	write(repo, ".gitattributes", "*.test.mjs diff=blank\n");
	removeLine(repo, TEST_FILE, "\t\tassert.ok(true);");

	assertDeny(
		runCheck(repo, commitMjs("T1 fix: Trim a", TEST_FILE)),
		/src\/a\.test\.mjs loses 1 line/
	);
});

test("denies a removed line when blame can't run, instead of passing it", () => {
	const repo = createRepo();
	write(repo, "src/other.mjs", "export const other = 1;\n");
	git(repo, "add", "src/other.mjs");
	git(repo, "commit", "-q", "-m", "T1: Add other");
	git(repo, "config", "blame.ignoreRevsFile", path.join(repo, "missing-revs"));
	removeLine(repo, TEST_FILE, "\t\tassert.ok(true);");

	assertDeny(
		runCheck(repo, commitMjs("T1 fix: Trim a", TEST_FILE)),
		/src\/a\.test\.mjs loses 1 line/
	);
});

test("PRISM's own testGlobs cover every test file run-tests.ts discovers", () => {
	const root = path.resolve(RUNTIME_PATH, "../../..");
	const { testGlobs } = JSON.parse(
		readFileSync(path.join(root, ".ai-skills/config.json"), "utf8")
	);
	const matchers = resolveTestGlobs({ testGlobs }).map(compileMatcher);
	const discovered = readdirSync(path.join(root, "scripts/ai-skills"), {
		recursive: true,
	})
		.filter(
			(entry): entry is string =>
				typeof entry === "string" && entry.endsWith(".test.ts")
		)
		.map((entry) => `scripts/ai-skills/${entry.split(path.sep).join("/")}`);

	assert.ok(discovered.some((file) => file.split("/").length > 3));
	const missed = discovered.filter(
		(file) => !matchers.some((matches) => matches(file))
	);
	assert.deepEqual(missed, []);
});
