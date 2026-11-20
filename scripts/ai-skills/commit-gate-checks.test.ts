/**
 * Pins the commit gate's context reader and its stops and config checks: that a
 * commit's subject never denies, the stop paths a named task has to list, and
 * the config errors that deny instead of skipping a check. Each case builds a
 * throwaway repo whose branch names a plan folder.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
	chmodSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	utimesSync,
	writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import {
	CONFIG_CHECK,
	loadContext,
	STOPS_CHECK,
} from "./hooks/commit-gate/checks.mjs";
import type { Context } from "./hooks/commit-gate/checks.mjs";
import { readCommit, repoRelativePaths } from "./hooks/commit-gate/parse.mjs";
import {
	NO_TASK_REASON,
	NO_TASK_REMEDY,
} from "./hooks/commit-gate/test-guard.mjs";
import { buildWouldBeIndex } from "./hooks/commit-gate/tree.mjs";

const RUNTIME_PATH = fileURLToPath(new URL("./hooks/", import.meta.url));
// Forward slashes on every platform, because `tokenize` reads a `\` in a
// command string as an escape.
const RUNTIME = RUNTIME_PATH.split(path.sep).join("/").replace(/\/$/, "");
const PLAN_DIR = ".prism/plans/prism-9";
const PLAN = `${PLAN_DIR}/plan.md`;
const SPEC = `${PLAN_DIR}/spec.md`;
const CONFIG = ".ai-skills/config.json";
const APPROVAL = "status: approved\napproved_by: Test\napproved_at: 2026-11-02";
const TASKS = `### T1: Build a
- files: src/a.mjs, src/a.test.mjs
- depends on: none

### T2: Add a dependency
- files: src/b.mjs, package.json
- depends on: none

### T3: Build c
- files: src/c.mjs
- depends on: none

### T4: Build d
- files: src/d.mjs
- depends on: none

### T5: Rename old
- files: src/old.mjs, src/new.mjs
- depends on: none

### T6: Touch a contract
- files: frontend/lib/contracts/thing.ts
- depends on: none
`;
const BASE_FILES = [
	"src/a.mjs",
	"src/a.test.mjs",
	"src/b.mjs",
	"src/c.mjs",
	"src/d.mjs",
	"src/old.mjs",
	"package.json",
	"frontend/lib/contracts/thing.ts",
	".prism/lessons.md",
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

function planText(): string {
	return `---\ntitle: Test\nticket: PRISM-9\nstage: plan\n${APPROVAL}\n---\n\n## Tasks\n\n${TASKS}\n## Review\n\n## History\n`;
}

/**
 * A repo whose base commit holds every fixture file, a config naming the
 * `PRISM` ticket prefix, and, unless `kind` says otherwise, a PRISM-9 plan
 * folder. `kind` "intent" leaves the folder's plan.md unwritten, "epic" swaps
 * the folder for one holding a spec.md only, and "flat" replaces it with a flat
 * plan for PRISM-8. The base is `origin/main`, and the branch checked out names
 * the ticket.
 */
function createRepo({
	kind = "full",
	config = { ticketPrefix: "PRISM" } as Record<string, unknown> | null,
} = {}): string {
	const repo = mkdtempSync(path.join(os.tmpdir(), "commit-gate-checks-"));
	TEMP_DIRS.push(repo);
	git(repo, "init", "-q");
	for (const file of BASE_FILES) write(repo, file, `${file}\n`);
	if (config) write(repo, CONFIG, `${JSON.stringify(config)}\n`);
	if (kind === "flat") {
		write(repo, ".prism/plans/prism-8.md", "# PRISM-8\n\n## Goal\n\nFlat.\n");
	} else if (kind === "epic") {
		write(repo, SPEC, "---\nticket: PRISM-9\n---\n\n## Children\n");
	} else {
		write(repo, `${PLAN_DIR}/intent.md`, intentText());
		if (kind === "full") write(repo, PLAN, planText());
	}
	git(repo, "add", ".");
	git(repo, "commit", "-q", "-m", "PRISM-9: Base");
	git(repo, "update-ref", "refs/remotes/origin/main", "HEAD");
	git(repo, "checkout", "-q", "-b", kind === "flat" ? "u/prism-8-x" : "u/prism-9-x");

	return repo;
}

function change(repo: string, ...files: string[]): void {
	for (const file of files) write(repo, file, `${read(repo, file)}changed\n`);
}

function commitDirect(repo: string, subject: string, ...files: string[]): void {
	git(repo, "add", "--", ...files);
	git(repo, "commit", "-q", "-m", subject, "--", ...files);
}

/** The `node <runtime>/plan/commit.mjs` command that commits `files` under `subject`. */
function commitMjs(subject: string, ...files: string[]): string {
	return `node ${RUNTIME}/plan/commit.mjs "${subject}" ${files.join(" ")}`;
}

/** Commits a parseable package.json on the branch, so an edit to it can change one field. */
function seedPackageJson(repo: string): void {
	const pkg = {
		name: "test",
		scripts: { build: "tsc" },
		dependencies: { "left-pad": "1.3.0" },
		devDependencies: { prettier: "3.0.0" },
	};
	write(repo, "package.json", `${JSON.stringify(pkg, null, "\t")}\n`);
	commitDirect(repo, "T1: Seed package.json", "package.json");
}

function writePackageJson(
	repo: string,
	edit: (pkg: Record<string, Record<string, string>>) => void
): void {
	const pkg = JSON.parse(read(repo, "package.json"));
	edit(pkg);
	write(repo, "package.json", `${JSON.stringify(pkg, null, "\t")}\n`);
}

function insertAfter(
	repo: string,
	file: string,
	anchor: string,
	line: string
): void {
	const text = read(repo, file);
	assert.ok(text.includes(anchor), `${file} lacks ${anchor}`);
	write(repo, file, text.replace(anchor, `${anchor}\n${line}`));
}

// --- Gate runners ---

function withContext<T>(
	repo: string,
	command: string,
	fn: (ctx: Context) => T
): T {
	const commit = readCommit(command, repo);
	assert.ok(commit, `no commit read from ${command}`);

	const index = buildWouldBeIndex(repo, repoRelativePaths(commit, repo), {
		literal: commit.form === "commit.mjs",
	});
	try {
		return fn(loadContext({ repoRoot: repo, commit, index }));
	} finally {
		index.cleanup();
	}
}

interface Denial {
	name: string;
	reason: string;
	remedy: string;
}

/** The first failing check, in the order the gate runs them, or null. */
function runGate(repo: string, command: string): Denial | null {
	return withContext(repo, command, (ctx) => {
		for (const check of [CONFIG_CHECK, STOPS_CHECK]) {
			const result = check.run(ctx);
			if (result) return { name: check.name, ...result };
		}

		return null;
	});
}

function runCheck(
	repo: string,
	command: string,
	check: typeof STOPS_CHECK
) {
	return withContext(repo, command, (ctx) => check.run(ctx));
}

function assertDeny(
	result: Denial | { reason: string; remedy: string } | null,
	name: string,
	pattern: RegExp
): void {
	assert.ok(result, `expected the ${name} check to deny`);
	if ("name" in result) assert.equal(result.name, name);
	assert.match(result.reason, pattern);
	assert.ok(!result.remedy.includes("\n"), "a remedy is one line");
}

// --- Checks ---

test("the checks are named rather than numbered", () => {
	assert.equal(STOPS_CHECK.name, "stops");
	assert.equal(CONFIG_CHECK.name, "config");
	for (const check of [STOPS_CHECK, CONFIG_CHECK])
		assert.equal(Object.hasOwn(check, "id"), false);
});

// --- loadContext ---

test("loadContext reads the folder plan and the would-be paths", () => {
	const repo = createRepo();
	change(repo, "src/a.mjs", "src/c.mjs");
	git(repo, "add", "src/c.mjs");

	withContext(repo, commitMjs("T1: Build a", "src/a.mjs"), (ctx) => {
		assert.equal(ctx.planFolder, path.join(repo, PLAN_DIR));
		assert.deepEqual(
			ctx.tasks?.map((task) => task.id),
			["T1", "T2", "T3", "T4", "T5", "T6"]
		);
		assert.deepEqual(ctx.paths, ["src/a.mjs"]);
		assert.equal(ctx.configError, null);
	});
});

test("loadContext finds no plan folder on a flat-plan branch", () => {
	const repo = createRepo({ kind: "flat" });
	change(repo, "src/a.mjs");

	withContext(repo, "git commit -m 'PRISM-8: x' -- src/a.mjs", (ctx) => {
		assert.equal(ctx.planFolder, null);
		assert.equal(ctx.tasks, null);
		assert.equal(ctx.subject?.kind, "ticket");
	});
});

test(
	"loadContext skips the plan checks and says so on stderr when the plan folder can't be read",
	{ skip: process.platform === "win32" || process.getuid?.() === 0 },
	(t) => {
		const repo = createRepo();
		change(repo, "src/a.mjs");
		const written: string[] = [];
		t.mock.method(process.stderr, "write", (chunk: string | Uint8Array) => {
			written.push(String(chunk));
			return true;
		});
		const folder = path.join(repo, PLAN_DIR);
		chmodSync(folder, 0o000);
		try {
			withContext(repo, "git commit -m 'T1: x' -- src/a.mjs", (ctx) => {
				assert.equal(ctx.planFolder, null);
			});
		} finally {
			chmodSync(folder, 0o755);
		}

		assert.match(written.join(""), /plan lookup failed.*EACCES/);
	}
);

test("loadContext finds no plan folder when the config names no ticket prefix", () => {
	const repo = createRepo({ config: null });
	change(repo, "src/a.mjs");

	withContext(repo, "git commit -m 'x' -- src/a.mjs", (ctx) => {
		assert.equal(ctx.planFolder, null);
		assert.equal(ctx.configError, null);
	});
});

test("loadContext leaves a sibling's staged file outside the named paths out of the would-be tree", () => {
	const repo = createRepo();
	change(repo, "src/c.mjs");
	git(repo, "add", "src/c.mjs");
	change(repo, "src/a.mjs");

	withContext(repo, commitMjs("T1: Build a", "src/a.mjs"), (ctx) => {
		assert.deepEqual(ctx.paths, ["src/a.mjs"]);
		assert.equal(
			git(repo, "show", `${ctx.index.treeHash}:src/c.mjs`),
			"src/c.mjs"
		);
	});
	assert.equal(runGate(repo, commitMjs("T1: Build a", "src/a.mjs")), null);
});

test("loadContext reads a git mv rename committed by naming both paths", () => {
	const repo = createRepo();
	git(repo, "mv", "src/old.mjs", "src/new.mjs");
	const command = commitMjs("T5: Rename old", "src/old.mjs", "src/new.mjs");

	withContext(repo, command, (ctx) => {
		assert.deepEqual([...ctx.paths].sort(), ["src/new.mjs", "src/old.mjs"]);
	});
	assert.equal(runGate(repo, command), null);
});

test("loadContext reads git add p && git commit -- p as a legal named-path commit", () => {
	const repo = createRepo();
	change(repo, "src/a.mjs");

	assert.equal(
		runGate(
			repo,
			"git add src/a.mjs && git commit -m 'T1: Build a' -- src/a.mjs"
		),
		null
	);
});

test("loadContext reads a . pathspec as the files it reaches", () => {
	const repo = createRepo();
	change(repo, "src/a.mjs", "src/c.mjs");

	withContext(repo, 'git commit -m "T1: Build a" .', (ctx) => {
		assert.deepEqual([...ctx.paths].sort(), ["src/a.mjs", "src/c.mjs"]);
	});
});

test("loadContext parses the subject once and resolves the named tasks", () => {
	const repo = createRepo();
	change(repo, "src/a.mjs", "src/c.mjs");

	withContext(
		repo,
		commitMjs("T1,T3: Build", "src/a.mjs", "src/c.mjs"),
		(ctx) => {
			assert.deepEqual(ctx.subject, { kind: "task", ids: ["T1", "T3"] });
			assert.deepEqual(
				ctx.namedTasks.map((task) => task.id),
				["T1", "T3"]
			);
		}
	);
	withContext(repo, commitMjs("plan: Log", PLAN), (ctx) => {
		assert.deepEqual(ctx.subject, { kind: "plan" });
		assert.deepEqual(ctx.namedTasks, []);
	});
	withContext(repo, commitMjs("T9: Build", "src/a.mjs"), (ctx) => {
		assert.deepEqual(ctx.namedTasks, []);
	});
});

test("loadContext gives no named tasks on a flat-plan branch", () => {
	const repo = createRepo({ kind: "flat" });
	change(repo, "src/a.mjs");

	withContext(repo, "git commit -m x -- src/a.mjs", (ctx) => {
		assert.equal(ctx.subject, null);
		assert.deepEqual(ctx.namedTasks, []);
	});
});

test("loadContext leaves the shared index untouched", () => {
	const repo = createRepo();
	change(repo, "src/a.mjs");
	// A newer mtime with unchanged content is what a refreshing git call writes back.
	const later = new Date(Date.now() + 60_000);
	utimesSync(path.join(repo, "src/c.mjs"), later, later);
	const sharedIndex = path.join(repo, ".git", "index");
	const before = readFileSync(sharedIndex);

	assert.equal(runGate(repo, commitMjs("T1: Build a", "src/a.mjs")), null);

	assert.deepEqual(readFileSync(sharedIndex), before);
});

// --- Subjects ---

test("any subject passes on a folder-plan branch, a plan: commit naming code included", () => {
	const repo = createRepo();
	change(repo, "src/a.mjs");

	for (const subject of [
		"PRISM-9: Build a",
		"committing plan",
		"plan: Draft",
		"retro: Promote",
		"anything goes",
		"",
	]) {
		assert.equal(
			runGate(repo, commitMjs(subject, "src/a.mjs")),
			null,
			subject
		);
	}
	assert.equal(runGate(repo, "git commit -m 'T1: Build a' -- src/a.mjs"), null);
});

test("a commit whose subject names no task gets no task's allowance", () => {
	const repo = createRepo({
		config: {
			ticketPrefix: "PRISM",
			stopPaths: { contract: ["frontend/lib/contracts/**"] },
		},
	});
	change(repo, "frontend/lib/contracts/thing.ts");

	for (const subject of ["committing plan", "PRISM-9: Touch a contract"]) {
		assertDeny(
			runGate(repo, commitMjs(subject, "frontend/lib/contracts/thing.ts")),
			"stops",
			/contract path/
		);
	}
});

test("a contract deny on a commit that names no task asks for a task subject, and on one that names a task asks to commit under its owner", () => {
	const repo = createRepo({
		config: {
			ticketPrefix: "PRISM",
			stopPaths: { contract: ["frontend/lib/contracts/**"] },
		},
	});
	change(repo, "frontend/lib/contracts/thing.ts");

	const unnamed = runGate(
		repo,
		commitMjs("committing plan", "frontend/lib/contracts/thing.ts")
	);
	assert.ok(unnamed);
	assert.ok(unnamed.reason.includes(NO_TASK_REASON), unnamed.reason);
	assert.equal(unnamed.remedy, NO_TASK_REMEDY);

	const named = runGate(
		repo,
		commitMjs("T1: Build a", "frontend/lib/contracts/thing.ts")
	);
	assert.ok(named);
	assert.ok(!named.reason.includes(NO_TASK_REASON), named.reason);
	assert.match(named.remedy, /under the task that lists it/);
});

test("a flat-plan branch gets no plan checks, whatever the subject", () => {
	const repo = createRepo({ kind: "flat" });
	change(repo, "src/a.mjs");

	for (const subject of ["PRISM-8: Build a", "anything goes"]) {
		assert.equal(
			runGate(repo, `git commit -m '${subject}' -- src/a.mjs`),
			null,
			subject
		);
	}
});

// --- A plan folder with no plan.md yet ---

test("a plan folder with no plan.md reads as a plan folder with no tasks", () => {
	const repo = createRepo({ kind: "intent" });
	const intent = `${PLAN_DIR}/intent.md`;
	change(repo, intent);

	withContext(repo, commitMjs("plan: Write the intent", intent), (ctx) => {
		assert.equal(ctx.planFolder, path.join(repo, PLAN_DIR));
		assert.equal(ctx.tasks, null);
	});
	assert.equal(
		runGate(repo, commitMjs("committing plan", intent)),
		null
	);
});

test("a folder holding only a spec.md reads as a plan folder with no tasks", () => {
	const repo = createRepo({ kind: "epic" });
	change(repo, SPEC);

	withContext(repo, commitMjs("plan: Write the spec", SPEC), (ctx) => {
		assert.equal(ctx.planFolder, path.join(repo, PLAN_DIR));
		assert.equal(ctx.tasks, null);
	});
	assert.equal(runGate(repo, commitMjs("plan: Write the spec", SPEC)), null);
});

// --- The stops check ---

test("the stops check denies a dependency file whose task carries no new dependency line", () => {
	const repo = createRepo();
	change(repo, "package.json");

	assertDeny(
		runGate(repo, commitMjs("T2: Add a dependency", "package.json")),
		"stops",
		/package\.json is a dependency file/
	);
});

test("the dependency deny on a commit that names no task asks for a task subject, and on one that names a task asks for the plan line", () => {
	const repo = createRepo();
	change(repo, "package.json");

	const unnamed = runGate(
		repo,
		commitMjs("plan: Add a dependency", "package.json")
	);
	assertDeny(
		unnamed,
		"stops",
		/package\.json is a dependency file .*, and the commit's subject names no task the plan holds/
	);
	assert.match(unnamed?.remedy ?? "", /"T<n>: <summary>"/);
	assert.match(unnamed?.remedy ?? "", /-m or a heredoc/);
	assert.doesNotMatch(unnamed?.remedy ?? "", /new dependency:/);

	const named = runGate(repo, commitMjs("T2: Add a dependency", "package.json"));
	assert.match(named?.remedy ?? "", /- new dependency:/);
});

test("the stops check passes when seeded tasks carry a new dependency line", () => {
	const repo = createRepo();
	change(repo, "package.json");

	withContext(repo, commitMjs("T2: Add a dependency", "package.json"), (ctx) => {
		const namedTasks = ctx.namedTasks.map((task) => ({
			...task,
			newDependency: "left-pad, for padding",
		}));
		assert.equal(STOPS_CHECK.run({ ...ctx, namedTasks }), null);
	});
});

test("the stops check passes once plan.md records the new dependency", () => {
	const repo = createRepo();
	insertAfter(
		repo,
		PLAN,
		"- files: src/b.mjs, package.json",
		"- new dependency: left-pad, for padding"
	);
	commitDirect(repo, "plan: Record the dependency", PLAN);
	change(repo, "package.json");

	assert.equal(
		runGate(repo, commitMjs("T2: Add a dependency", "package.json")),
		null
	);
});

test("the stops check passes a package.json edit that changes only its scripts", () => {
	const repo = createRepo();
	seedPackageJson(repo);
	writePackageJson(repo, (pkg) => {
		pkg.scripts!.test = "node --test";
	});

	assert.equal(
		runGate(repo, commitMjs("T2: Add a dependency", "package.json")),
		null
	);
});

test("the stops check denies a dependency entry change whose task carries no new dependency line", () => {
	for (const field of [
		"dependencies",
		"devDependencies",
		"peerDependencies",
		"optionalDependencies",
	]) {
		const repo = createRepo();
		seedPackageJson(repo);
		writePackageJson(repo, (pkg) => {
			pkg[field] = { ...pkg[field], "is-even": "1.0.0" };
		});

		assertDeny(
			runGate(repo, commitMjs("T2: Add a dependency", "package.json")),
			"stops",
			/package\.json is a dependency file/
		);
	}
});

test("the stops check reads a composer.json require change as a dependency change", () => {
	const repo = createRepo();
	write(repo, "composer.json", '{"name":"a/b","require":{"php":"^8.1"}}\n');
	commitDirect(repo, "T1: Seed composer.json", "composer.json");
	write(
		repo,
		"composer.json",
		'{"name":"a/b","require":{"php":"^8.1","x/y":"1.0"}}\n'
	);

	assertDeny(
		runGate(repo, commitMjs("T1: Build a", "composer.json")),
		"stops",
		/composer\.json is a dependency file/
	);
});

test("the stops check counts any change to a lockfile", () => {
	const repo = createRepo();
	write(repo, "pnpm-lock.yaml", "lockfileVersion: 9\n");
	commitDirect(repo, "T1: Seed lockfile", "pnpm-lock.yaml");
	change(repo, "pnpm-lock.yaml");

	assertDeny(
		runGate(repo, commitMjs("T1: Build a", "pnpm-lock.yaml")),
		"stops",
		/pnpm-lock\.yaml is a dependency file/
	);
});

test("the stops check denies a contract path the named task doesn't list, and passes its owner", () => {
	const repo = createRepo({ config: { ticketPrefix: "PRISM", stopPaths: { contract: ["frontend/lib/contracts/**"] } } });
	change(repo, "frontend/lib/contracts/thing.ts");

	assertDeny(
		runCheck(
			repo,
			commitMjs("T1: Build a", "frontend/lib/contracts/thing.ts"),
			STOPS_CHECK
		),
		"stops",
		/contract path/
	);
	assert.equal(
		runGate(
			repo,
			commitMjs("T6: Touch a contract", "frontend/lib/contracts/thing.ts")
		),
		null
	);
});

test("the stops check denies --no-verify and -c core.hooksPath=x", () => {
	const repo = createRepo();
	change(repo, "src/a.mjs");

	for (const [command, pattern] of [
		["git commit --no-verify -m 'T1: x' -- src/a.mjs", /--no-verify/],
		["git -c core.hooksPath=x commit -m 'T1: x' -- src/a.mjs", /core\.hooksPath/],
	] as const) {
		assertDeny(runGate(repo, command), "stops", pattern);
	}
});

test("the stops check passes a seeded commit with no denies, and the same commit without the flag", () => {
	const repo = createRepo();
	change(repo, "src/a.mjs");
	const command = "git commit --no-verify -m 'T1: x' -- src/a.mjs";

	withContext(repo, command, (ctx) => {
		const seeded: Context = { ...ctx, commit: { ...ctx.commit, denies: [] } };
		assert.equal(STOPS_CHECK.run(seeded), null);
	});
	assert.equal(runGate(repo, "git commit -m 'T1: x' -- src/a.mjs"), null);
});

test("the stops check judges flag denies from the commit alone, with no config read", () => {
	const commit = readCommit("git commit -a -m x", "/repo");
	assert.ok(commit);

	assertDeny(STOPS_CHECK.run({ commit }), "stops", /commits every tracked change/);
});

test("the stops check carries a remedy for every deny the parser reads", () => {
	for (const id of [
		"all",
		"include",
		"expanded-paths",
		"magic-pathspec",
		"multiple-commits",
		"no-paths",
		"no-verify",
		"hooks-path",
		"kill-switch",
	]) {
		const result = STOPS_CHECK.run({
			commit: {
				form: "git",
				subject: null,
				paths: [],
				cwd: "/repo",
				denies: [{ id, flag: "--flag" }],
			},
		});

		assert.ok(result, id);
		assert.ok(result.remedy.length > 0, id);
	}
});

test("the stops check denies a bare git commit -m x on a flat-plan branch", () => {
	const repo = createRepo({ kind: "flat" });
	change(repo, "src/a.mjs");
	git(repo, "add", "src/a.mjs");

	assertDeny(runGate(repo, "git commit -m x"), "stops", /names no paths/);
});

test("on a flat-plan branch a named-path commit passes and the plan checks skip", () => {
	const repo = createRepo({ kind: "flat" });
	change(repo, "src/a.mjs", "package.json");

	assert.equal(
		runGate(
			repo,
			"git add src/a.mjs && git commit -m 'PRISM-8: x' -- src/a.mjs"
		),
		null
	);
	assert.equal(
		runGate(repo, "git commit -m 'PRISM-8: Bump' -- package.json"),
		null
	);
});

test("the stops check denies -i, a second commit, and a shell-expanded path", () => {
	const repo = createRepo();
	change(repo, "src/a.mjs", "src/c.mjs");
	// git reads `$A` as a literal file, while the shell would expand it.
	write(repo, "$A", "literal\n");

	for (const [command, pattern] of [
		["git commit -i -m 'T1: x' -- src/a.mjs", /`-i`/],
		[
			"git commit -m 'T1: x' -- src/a.mjs; git commit -m 'T3: y' -- src/c.mjs",
			/more than one commit/,
		],
		['git commit -m "T1: x" -- "$A"', /\$A/],
	] as const) {
		assertDeny(runCheck(repo, command, STOPS_CHECK), "stops", pattern);
	}
});

test("the stops check passes the same commit written as one command with literal paths", () => {
	const repo = createRepo();
	change(repo, "src/a.mjs");

	assert.equal(runGate(repo, "git commit -m 'T1: x' -- src/a.mjs"), null);
});

// --- Config errors ---

test("a config that does not parse denies with the config check, so no check is skipped", () => {
	const repo = createRepo();
	change(repo, "src/a.mjs");
	write(repo, CONFIG, "{ not json");

	const result = runGate(repo, commitMjs("T1: Build a", "src/a.mjs"));
	assertDeny(result, "config", /\.ai-skills\/config\.json/);
	assert.match(result?.remedy ?? "", /Fix \.ai-skills\/config\.json, then commit again\./);
});

test("a stopPaths or testGlobs config error denies with the config check", () => {
	for (const [config, pattern] of [
		[{ ticketPrefix: "PRISM", stopPaths: { dependancy: [] } }, /stopPaths/],
		[{ ticketPrefix: "PRISM", stopPaths: { contract: "x" } }, /stopPaths/],
		[{ ticketPrefix: "PRISM", testGlobs: "x" }, /testGlobs/],
		[{ ticketPrefix: "PRISM", testGlobs: ["{a,b}.ts"] }, /testGlobs/],
	] as const) {
		const repo = createRepo({ config });
		change(repo, "src/a.mjs");

		assertDeny(
			runGate(repo, commitMjs("T1: Build a", "src/a.mjs")),
			"config",
			pattern
		);
	}
});

test("a config error does not stop the flag denies, which read no config", () => {
	const repo = createRepo();
	write(repo, CONFIG, "{ not json");
	const commit = readCommit("git commit -a -m x", repo);
	assert.ok(commit);

	assertDeny(STOPS_CHECK.run({ commit }), "stops", /commits every tracked change/);
});

test("a repo with no config passes the config check", () => {
	const repo = createRepo({ config: null });
	change(repo, "src/a.mjs");

	assert.equal(runGate(repo, commitMjs("T1: Build a", "src/a.mjs")), null);
});

// --- Review fixes ---

test("the stops check passes a contract path a named task amends onto its list", () => {
	const repo = createRepo({
		config: {
			ticketPrefix: "PRISM",
			stopPaths: { contract: ["frontend/lib/contracts/**"] },
		},
	});
	insertAfter(
		repo,
		PLAN,
		"- files: src/c.mjs",
		"- amended: frontend/lib/contracts/thing.ts: the contract moved with c"
	);
	commitDirect(repo, "plan: Amend T3", PLAN);
	change(repo, "frontend/lib/contracts/thing.ts");

	assert.equal(
		runGate(repo, commitMjs("T3: Build c", "frontend/lib/contracts/thing.ts")),
		null
	);
});

test("an archived plan folder gives its branch no plan folder", () => {
	const repo = createRepo();
	mkdirSync(path.join(repo, ".prism/archived/plans"), { recursive: true });
	git(repo, "mv", PLAN_DIR, ".prism/archived/plans/prism-9");
	git(repo, "commit", "-q", "-m", "plan: Archive");
	change(repo, "src/a.mjs");

	withContext(repo, "git commit -m 'PRISM-9: Build a' -- src/a.mjs", (ctx) => {
		assert.equal(ctx.planFolder, null);
	});
});

test("the stops check reads a composer.json require-dev change as a dependency change", () => {
	const repo = createRepo();
	write(repo, "composer.json", '{"name":"a/b","require-dev":{"php":"^8.1"}}\n');
	commitDirect(repo, "T1: Seed composer.json", "composer.json");
	write(
		repo,
		"composer.json",
		'{"name":"a/b","require-dev":{"php":"^8.1","x/y":"1.0"}}\n'
	);

	assertDeny(
		runGate(repo, commitMjs("T1: Build a", "composer.json")),
		"stops",
		/composer\.json is a dependency file/
	);
});

test("the stops check passes a manifest whose dependencies were only re-sorted", () => {
	const repo = createRepo();
	const manifest = "package.json";
	write(
		repo,
		manifest,
		'{"name":"t","dependencies":{"a":"1.0.0","b":"1.0.0"}}\n'
	);
	commitDirect(repo, "T1: Seed manifest", manifest);
	write(
		repo,
		manifest,
		'{"name":"t","dependencies":{"b":"1.0.0","a":"1.0.0"},"scripts":{"x":"y"}}\n'
	);

	assert.equal(
		runGate(repo, commitMjs("T2: Add a dependency", manifest)),
		null
	);
});
