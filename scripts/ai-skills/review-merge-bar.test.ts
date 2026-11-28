/**
 * Suite for `review/merge-bar.mjs`: the merge bar holds only for a bare
 * `clean` record line whose sha is the head or an ancestor of it, with every
 * later commit exempt. Each case builds a throwaway git repo and runs the
 * script as the session does.
 */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"hooks",
	"review",
	"merge-bar.mjs"
);

const PLAN_DIR = path.join(".prism", "plans", "x");

interface Repo {
	root: string;
	git: (...args: string[]) => string;
	commit: (subject: string, files: Record<string, string>) => string;
	writePlan: (reviewLines: string[]) => string;
}

function withRepo(run: (repo: Repo) => void): void {
	const root = mkdtempSync(path.join(os.tmpdir(), "merge-bar-"));

	const git = (...args: string[]) =>
		execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], {
			cwd: root,
			encoding: "utf8",
		}).trim();

	const commit = (subject: string, files: Record<string, string>) => {
		for (const [file, content] of Object.entries(files)) {
			mkdirSync(path.join(root, path.dirname(file)), { recursive: true });
			writeFileSync(path.join(root, file), content);
		}
		git("add", "--all");
		git("commit", "-q", "--allow-empty", "-m", subject);

		return git("rev-parse", "HEAD");
	};

	const writePlan = (reviewLines: string[]) => {
		const planPath = path.join(root, PLAN_DIR, "plan.md");
		mkdirSync(path.dirname(planPath), { recursive: true });
		writeFileSync(
			planPath,
			["---", "status: approved", "---", "", "## Review", "", ...reviewLines, ""].join("\n")
		);

		return planPath;
	};

	try {
		git("init", "-q", "-b", "main");
		run({ root, git, commit, writePlan });
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
}

function runBar(args: string[], cwd?: string) {
	const result = spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: "utf8" });

	return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

const short = (sha: string) => sha.slice(0, 8);

test("passes a bare clean line recorded at the head", () => {
	withRepo(({ commit, writePlan }) => {
		const head = commit("T1: Add a", { "src/a.ts": "a\n" });
		const plan = writePlan([`- review round 1 at ${short(head)}: clean`]);

		const result = runBar([plan]);

		assert.equal(result.status, 0, result.stdout + result.stderr);
		assert.equal(result.stdout, "");
	});
});

test("fails a plan with no review record line", () => {
	withRepo(({ commit, writePlan }) => {
		commit("T1: Add a", { "src/a.ts": "a\n" });
		const plan = writePlan(["Some prose, no record line."]);

		const result = runBar([plan]);

		assert.equal(result.status, 1);
		assert.match(result.stdout, /no review record line/);
	});
});

test("fails a clean line that carries a decision", () => {
	withRepo(({ commit, writePlan }) => {
		const head = commit("T1: Add a", { "src/a.ts": "a\n" });
		const plan = writePlan([`- review round 2 at ${short(head)}: clean, 1 decision`]);

		const result = runBar([plan]);

		assert.equal(result.status, 1);
		assert.match(result.stdout, /clean, 1 decision/);
		assert.equal(result.stdout.trim().split("\n").length, 1);
	});
});

test("reads only the last record line", () => {
	withRepo(({ commit, writePlan }) => {
		const head = commit("T1: Add a", { "src/a.ts": "a\n" });
		const plan = writePlan([
			`- review round 1 at ${short(head)}: clean`,
			`- review round 2 at ${short(head)}: 0 critical, 1 major, 0 minor, 0 nit`,
		]);

		const result = runBar([plan]);

		assert.equal(result.status, 1);
		assert.match(result.stdout, /1 major/);
	});
});

test("fails a sha that is not reachable from the head", () => {
	withRepo(({ git, commit, writePlan }) => {
		commit("T1: Add a", { "src/a.ts": "a\n" });
		git("checkout", "-q", "-b", "side");
		const side = commit("T2: Add b", { "src/b.ts": "b\n" });
		git("checkout", "-q", "main");
		const plan = writePlan([`- review round 1 at ${short(side)}: clean`]);

		const result = runBar([plan]);

		assert.equal(result.status, 1);
		assert.match(result.stdout, new RegExp(`${short(side)}.*not reachable`));
		assert.match(result.stdout, /another review round/);
	});
});

test("fails a sha that names no commit in the repo", () => {
	withRepo(({ commit, writePlan }) => {
		commit("T1: Add a", { "src/a.ts": "a\n" });
		const plan = writePlan(["- review round 1 at deadbeef: clean"]);

		const result = runBar([plan]);

		assert.equal(result.status, 1);
		assert.match(result.stdout, /deadbeef/);
	});
});

test("fails and names a later commit that changes files outside the plan folder", () => {
	withRepo(({ commit, writePlan }) => {
		const reviewed = commit("T1: Add a", { "src/a.ts": "a\n" });
		const later = commit("T1 fix: Change a", { "src/a.ts": "a2\n" });
		const plan = writePlan([`- review round 1 at ${short(reviewed)}: clean`]);

		const result = runBar([plan]);

		assert.equal(result.status, 1);
		assert.match(result.stdout, new RegExp(short(later)));
		assert.match(result.stdout, /T1 fix: Change a/);
	});
});

test("prints one reason per failure", () => {
	withRepo(({ commit, writePlan }) => {
		const reviewed = commit("T1: Add a", { "src/a.ts": "a\n" });
		commit("T2: Add b", { "src/b.ts": "b\n" });
		commit("T3: Add c", { "src/c.ts": "c\n" });
		const plan = writePlan([`- review round 1 at ${short(reviewed)}: 0 critical, 1 major, 0 minor, 0 nit`]);

		const result = runBar([plan]);

		assert.equal(result.status, 1);
		assert.equal(result.stdout.trim().split("\n").length, 3);
	});
});

test("exempts a later retro: commit whatever it changes", () => {
	withRepo(({ commit, writePlan }) => {
		const reviewed = commit("T1: Add a", { "src/a.ts": "a\n" });
		commit("retro: Promote the decisions", {
			".prism/rules/x.md": "rule\n",
			".prism/retros/x.md": "report\n",
		});
		const plan = writePlan([`- review round 1 at ${short(reviewed)}: clean`]);

		const result = runBar([plan]);

		assert.equal(result.status, 0, result.stdout + result.stderr);
	});
});

test("exempts a later commit that changes only files under the plan folder", () => {
	withRepo(({ commit, writePlan }) => {
		const reviewed = commit("T1: Add a", { "src/a.ts": "a\n" });
		commit("plan: Record the review", { ".prism/plans/x/plan.md": "plan\n" });
		const plan = writePlan([`- review round 1 at ${short(reviewed)}: clean`]);

		const result = runBar([plan]);

		assert.equal(result.status, 0, result.stdout + result.stderr);
	});
});

test("exempts a later commit that changes no files", () => {
	withRepo(({ commit, writePlan }) => {
		const reviewed = commit("T1: Add a", { "src/a.ts": "a\n" });
		commit("T2: Record nothing", {});
		const plan = writePlan([`- review round 1 at ${short(reviewed)}: clean`]);

		const result = runBar([plan]);

		assert.equal(result.status, 0, result.stdout + result.stderr);
	});
});

test("does not exempt a commit touching a sibling folder that shares the plan folder's prefix", () => {
	withRepo(({ commit, writePlan }) => {
		const reviewed = commit("T1: Add a", { "src/a.ts": "a\n" });
		commit("plan: Touch the sibling", { ".prism/plans/x-other/plan.md": "plan\n" });
		const plan = writePlan([`- review round 1 at ${short(reviewed)}: clean`]);

		const result = runBar([plan]);

		assert.equal(result.status, 1);
	});
});

test("fails a merge commit after the reviewed sha even when it changes only plan files", () => {
	withRepo(({ git, commit, writePlan }) => {
		const reviewed = commit("T1: Add a", { "src/a.ts": "a\n" });
		git("checkout", "-q", "-b", "side");
		commit("plan: Side note", { ".prism/plans/x/notes.md": "n\n" });
		git("checkout", "-q", "main");
		commit("plan: Main note", { ".prism/plans/x/other.md": "o\n" });
		git("merge", "-q", "--no-ff", "--no-edit", "side");
		const merge = git("rev-parse", "HEAD");
		const plan = writePlan([`- review round 1 at ${short(reviewed)}: clean`]);

		const result = runBar([plan]);

		assert.equal(result.status, 1);
		assert.match(result.stdout, new RegExp(`merge commit ${short(merge)}`));
		assert.match(result.stdout, /another review round/);
	});
});

test("checks against --head instead of HEAD", () => {
	withRepo(({ commit, writePlan }) => {
		const reviewed = commit("T1: Add a", { "src/a.ts": "a\n" });
		commit("T2: Add b", { "src/b.ts": "b\n" });
		const plan = writePlan([`- review round 1 at ${short(reviewed)}: clean`]);

		assert.equal(runBar([plan]).status, 1);
		assert.equal(runBar([plan, "--head", reviewed]).status, 0);
	});
});

test("exits 2 for an unknown --head", () => {
	withRepo(({ commit, writePlan }) => {
		const head = commit("T1: Add a", { "src/a.ts": "a\n" });
		const plan = writePlan([`- review round 1 at ${short(head)}: clean`]);

		const result = runBar([plan, "--head", "no-such-ref"]);

		assert.equal(result.status, 2);
		assert.match(result.stderr, /no-such-ref/);
	});
});

test("exits 2 when git cannot list a later commit's files", () => {
	withRepo(({ root, git, commit, writePlan }) => {
		const reviewed = commit("T1: Add a", { "src/a.ts": "a\n" });
		const later = commit("T2: Add b", { "src/b.ts": "b\n" });
		const tree = git("rev-parse", `${later}^{tree}`);
		rmSync(path.join(root, ".git", "objects", tree.slice(0, 2), tree.slice(2)));
		const plan = writePlan([`- review round 1 at ${short(reviewed)}: clean`]);

		const result = runBar([plan]);

		assert.equal(result.status, 2, result.stdout + result.stderr);
		assert.match(result.stderr, new RegExp(short(later)));
	});
});

test("exits 2 for an unreadable plan", () => {
	withRepo(({ root, commit }) => {
		commit("T1: Add a", { "src/a.ts": "a\n" });

		const result = runBar([path.join(root, PLAN_DIR, "missing.md")]);

		assert.equal(result.status, 2);
	});
});

test("exits 2 for a plan outside any repo", () => {
	const dir = mkdtempSync(path.join(os.tmpdir(), "merge-bar-norepo-"));

	try {
		const plan = path.join(dir, "plan.md");
		writeFileSync(plan, "## Review\n\n- review round 1 at abc12345: clean\n");

		const result = runBar([plan], dir);

		assert.equal(result.status, 2);
		assert.match(result.stderr, /repo/);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test("exits 2 with no plan argument", () => {
	assert.equal(runBar([]).status, 2);
});
