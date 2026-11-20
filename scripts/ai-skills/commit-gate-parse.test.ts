/**
 * Pins the commit gate's command parser: the commit and the push it reads out
 * of a shell command, the forms it denies outright, and the kill-switch reading
 * that runs on every command. A `node <runtime>/plan/commit.mjs` call reads as a
 * commit the way a `git commit` does.
 */
import assert from "node:assert/strict";
import {
	copyFileSync,
	mkdirSync,
	mkdtempSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import {
	readCommit,
	readKillSwitch,
	readPushes,
	repoRelativePaths,
} from "./hooks/commit-gate/parse.mjs";
import type { Commit } from "./hooks/commit-gate/parse.mjs";

const CWD = "/repo";
const RUNTIME_PATH = fileURLToPath(new URL("./hooks/", import.meta.url));
// Forward slashes on every platform, because `tokenize` reads a `\` in a
// command string as an escape.
const RUNTIME = RUNTIME_PATH.split(path.sep).join("/").replace(/\/$/, "");
const TEMP_DIRS: string[] = [];

after(() => {
	for (const dir of TEMP_DIRS) rmSync(dir, { recursive: true, force: true });
});

function tempDir(prefix: string): string {
	const dir = mkdtempSync(path.join(os.tmpdir(), prefix));
	TEMP_DIRS.push(dir);

	return dir;
}

/** The `node <runtime>/plan/commit.mjs` command that commits `paths` under `subject`. */
function commitMjs(subject: string, ...paths: string[]): string {
	return `node ${RUNTIME}/plan/commit.mjs "${subject}" ${paths.join(" ")}`;
}

function read(command: string, cwd: string = CWD): Commit {
	const commit = readCommit(command, cwd);
	assert.ok(commit, `no commit read from: ${command}`);

	return commit;
}

function denyIds(command: string, cwd: string = CWD): string[] {
	return read(command, cwd).denies.map((deny) => deny.id);
}

// --- readPushes ---

test("readPushes reads --no-verify and its unambiguous prefixes, wherever they sit", () => {
	for (const [command, flag] of [
		["git push --no-verify", "--no-verify"],
		["git push origin HEAD --no-verify", "--no-verify"],
		["git push --no-veri", "--no-veri"],
		[`bash -lc 'git push origin HEAD --no-verify'`, "--no-verify"],
		["git status && git push --no-verify", "--no-verify"],
	] as const) {
		assert.deepEqual(
			readPushes(command, CWD)[0]?.denies,
			[{ id: "no-verify", flag }],
			command
		);
	}
});

test("readPushes reads -c core.hooksPath before push", () => {
	assert.deepEqual(
		readPushes("git -c core.hooksPath=x push", CWD)[0]?.denies.map(
			(deny) => deny.id
		),
		["hooks-path"]
	);
});

test("readPushes takes the directory from -C", () => {
	assert.equal(
		readPushes("git -C /other push --no-verify", CWD)[0]?.cwd,
		"/other"
	);
});

test("readPushes returns every bypassing push in command order", () => {
	assert.deepEqual(
		readPushes(
			"git -C /other push --no-verify; git push; git push --no-verify",
			CWD
		).map((push) => push.cwd),
		["/other", CWD]
	);
});

test("readPushes returns no push for a push that keeps its hooks", () => {
	for (const command of [
		"git push",
		"git push -n",
		"git push --dry-run",
		"git push --no-ver",
		"git push -- --no-verify",
		"git commit --no-verify -m x -- a",
	]) {
		assert.deepEqual(readPushes(command, CWD), [], command);
	}
});

// --- readCommit finds the commit ---

test("readCommit returns null for a command with no commit", () => {
	assert.equal(readCommit("git status && ls", CWD), null);
	assert.equal(readCommit("echo 'git commit -m x'", CWD), null);
});

test("readCommit returns null for a command the tokenizer can't read", () => {
	assert.equal(readCommit("git commit -m 'unclosed", CWD), null);
});

test("readCommit reads git commit -- <paths> with its subject", () => {
	const commit = read('git commit -m "T3: Add a" -- src/a.mjs');

	assert.equal(commit.form, "git");
	assert.equal(commit.subject, "T3: Add a");
	assert.deepEqual(commit.paths, ["src/a.mjs"]);
	assert.equal(commit.cwd, CWD);
	assert.deepEqual(commit.denies, []);
});

test("readCommit reads positional pathspecs without a -- separator", () => {
	assert.deepEqual(
		read("git commit -m 'T3: x' src/a.mjs src/b.mjs").paths,
		["src/a.mjs", "src/b.mjs"]
	);
});

test("readCommit reads git add p && git commit -- p as the commit, with no deny", () => {
	const commit = read(
		"git add src/a.mjs && git commit -m 'T3: x' -- src/a.mjs"
	);

	assert.equal(commit.form, "git");
	assert.deepEqual(commit.paths, ["src/a.mjs"]);
	assert.deepEqual(commit.denies, []);
});

test("readCommit reads a commit.mjs call, subject first and paths after", () => {
	const repo = tempDir("commit-gate-parse-");
	const commit = read(commitMjs("T3-T5: Build", "src/a.mjs", "src/b.mjs"), repo);

	assert.equal(commit.form, "commit.mjs");
	assert.equal(commit.subject, "T3-T5: Build");
	assert.deepEqual(commit.paths, ["src/a.mjs", "src/b.mjs"]);
	assert.equal(commit.cwd, repo);
	assert.deepEqual(commit.denies, []);
});

test("readCommit reads commit.mjs behind node options and wrappers", () => {
	for (const command of [
		`node --no-warnings ${RUNTIME}/plan/commit.mjs "T1: x" a`,
		`node -r ./x.cjs ${RUNTIME}/plan/commit.mjs "T1: x" a`,
		`node -- ${RUNTIME}/plan/commit.mjs "T1: x" a`,
		`PRISM_PLAN_COMMIT_RETRIES=3 node ${RUNTIME}/plan/commit.mjs "T1: x" a`,
		`env -u X node ${RUNTIME}/plan/commit.mjs "T1: x" a`,
		`bash -lc 'node ${RUNTIME}/plan/commit.mjs "T1: x" a'`,
	]) {
		const commit = read(command);

		assert.equal(commit.form, "commit.mjs", command);
		assert.equal(commit.subject, "T1: x", command);
		assert.deepEqual(commit.paths, ["a"], command);
		assert.deepEqual(commit.denies, [], command);
	}
});

test("readCommit reads commit.mjs named relative to the directory it runs in", () => {
	for (const command of [
		`cd ${RUNTIME}/plan && node commit.mjs "T1: x" a`,
		`cd ${RUNTIME} && node plan/commit.mjs "T1: x" a`,
		`cd ${RUNTIME}/lib && node ../plan/commit.mjs "T1: x" a`,
	]) {
		const commit = read(command);

		assert.equal(commit.form, "commit.mjs", command);
		assert.deepEqual(commit.paths, ["a"], command);
	}
});

test("readCommit leaves node on any other script unread", () => {
	for (const command of [
		'node other.mjs "T1: x" a',
		`node ${RUNTIME}/plan/other.mjs "T1: x" a`,
		`node ${RUNTIME}/plan/missing/../absent.mjs "T1: x" a`,
		`node -e 'x' ${RUNTIME}/plan/commit.mjs "T1: x" a`,
		`node`,
	]) {
		assert.equal(readCommit(command, CWD), null, command);
	}
});

test("readCommit reads a marked commit.mjs under any plan directory, and not an unmarked or misplaced one", () => {
	const source = path.join(RUNTIME_PATH, "plan", "commit.mjs");
	const marked = tempDir("commit-gate-parse-marked-");
	mkdirSync(path.join(marked, "plan"));
	copyFileSync(source, path.join(marked, "plan", "commit.mjs"));
	const unmarked = tempDir("commit-gate-parse-unmarked-");
	mkdirSync(path.join(unmarked, "plan"));
	writeFileSync(path.join(unmarked, "plan", "commit.mjs"), "// a consumer's own file\n");
	copyFileSync(source, path.join(unmarked, "commit.mjs"));
	const asCommand = (dir: string, ...parts: string[]) =>
		`node ${path.join(dir, ...parts).split(path.sep).join("/")} "T1: x" a`;

	assert.equal(readCommit(asCommand(marked, "plan", "commit.mjs"), CWD)?.form, "commit.mjs");
	assert.equal(readCommit(asCommand(unmarked, "plan", "commit.mjs"), CWD), null);
	assert.equal(readCommit(asCommand(unmarked, "commit.mjs"), CWD), null);
});

test("readCommit reads a symlink to a marked commit.mjs by its real path", () => {
	const dir = tempDir("commit-gate-parse-link-");
	mkdirSync(path.join(dir, "plan"));
	copyFileSync(
		path.join(RUNTIME_PATH, "plan", "commit.mjs"),
		path.join(dir, "plan", "commit.mjs")
	);
	symlinkSync(path.join(dir, "plan", "commit.mjs"), path.join(dir, "run.mjs"));
	const command = `node ${path.join(dir, "run.mjs").split(path.sep).join("/")} "T1: x" a`;

	assert.equal(readCommit(command, CWD)?.form, "commit.mjs");
});

test("readCommit takes the subject from a heredoc message's first line", () => {
	const command = [
		`git commit -m "$(cat <<'EOF'`,
		"T3 fix: Close the gap",
		"",
		"Body text.",
		"EOF",
		`)" -- src/a.mjs`,
	].join("\n");
	const commit = read(command);

	assert.equal(commit.subject, "T3 fix: Close the gap");
	assert.deepEqual(commit.paths, ["src/a.mjs"]);
});

test("readCommit reads --message=, -m<msg>, and -F <file> subjects", () => {
	assert.equal(read("git commit --message='plan: x' -- a").subject, "plan: x");
	assert.equal(read("git commit -mT1:x -- a").subject, "T1:x");

	const dir = tempDir("commit-gate-parse-msg-");
	writeFileSync(path.join(dir, "msg.txt"), "retro: Promote\n\nBody\n");
	assert.equal(read("git commit -F msg.txt -- a", dir).subject, "retro: Promote");
});

test("readCommit gives a null subject when no message is passed", () => {
	assert.equal(read("git commit -- a").subject, null);
});

test("readCommit drops a redirect's fd digit rather than reading it as a path", () => {
	assert.deepEqual(read("git commit -m 'T1: x' -- a 2>&1 | tail -1").paths, [
		"a",
	]);
});

test("readCommit folds cd and -C into the effective cwd", () => {
	assert.equal(read("cd sub && git commit -m x -- a").cwd, "/repo/sub");
	assert.equal(
		read("cd /other && git -C nested -C deeper commit -m x -- a").cwd,
		"/other/nested/deeper"
	);
	assert.equal(read("cd $DIR && git commit -m x -- a").cwd, null);
});

test("readCommit reads the commit inside a bash -lc string", () => {
	const commit = read(`bash -lc "cd sub && git commit -m 'T2: x' -- a"`);

	assert.equal(commit.form, "git");
	assert.equal(commit.cwd, "/repo/sub");
	assert.equal(commit.subject, "T2: x");
});

test("readCommit keeps option values out of the path list", () => {
	assert.deepEqual(
		read("git commit --author 'A <a@b>' -t tpl -m x --cleanup=strip -- a").paths,
		["a"]
	);
});

// --- readCommit denies ---

test("readCommit denies -a, --all, and -a inside a cluster", () => {
	for (const command of [
		"git commit -a -m x",
		"git commit --all -m x",
		"git commit -am x",
	]) {
		assert.deepEqual(denyIds(command), ["all", "no-paths"], command);
	}
});

test("readCommit reads an a inside a cluster's message value as no -a", () => {
	const commit = read("git commit -mabc -- a");

	assert.deepEqual(commit.denies, []);
	assert.equal(commit.subject, "abc");
});

test("readCommit denies a bare git commit -m x as naming no paths", () => {
	assert.deepEqual(denyIds("git commit -m x"), ["no-paths"]);
});

test("readCommit denies a commit.mjs call with a subject and no paths", () => {
	assert.deepEqual(denyIds(`node ${RUNTIME}/plan/commit.mjs 'T1: x'`), [
		"no-paths",
	]);
});

test("readCommit denies --no-verify and -n", () => {
	assert.deepEqual(read("git commit --no-verify -m x -- a").denies, [
		{ id: "no-verify", flag: "--no-verify" },
	]);
	assert.deepEqual(read("git commit -nm x -- a").denies, [
		{ id: "no-verify", flag: "-n" },
	]);
});

test("readCommit denies -c core.hooksPath=…, in any case", () => {
	for (const command of [
		"git -c core.hooksPath=x commit -m y -- a",
		"git -c CORE.HOOKSPATH=/dev/null commit -m y -- a",
		"git --config-env=core.hooksPath=V commit -m y -- a",
	]) {
		assert.deepEqual(denyIds(command), ["hooks-path"], command);
	}
});

test("readCommit passes an unrelated -c config", () => {
	assert.deepEqual(read("git -c user.name=x commit -m y -- a").denies, []);
});

test("readCommit denies --no-verify and -c core.hooksPath=x inside bash -lc", () => {
	assert.deepEqual(
		denyIds(`bash -lc 'git commit --no-verify -m x -- a'`),
		["no-verify"]
	);
	assert.deepEqual(
		denyIds(`bash -lc 'git -c core.hooksPath=x commit -m x -- a'`),
		["hooks-path"]
	);
});

test("readCommit passes a harmless prefix assignment before commit.mjs", () => {
	assert.deepEqual(
		read(
			`PRISM_PLAN_COMMIT_RETRY_DELAY_MS=0 node ${RUNTIME}/plan/commit.mjs 'T1: x' a`
		).denies,
		[]
	);
});

test("readCommit denies -i and --include, alone, in a cluster, and abbreviated", () => {
	for (const command of [
		"git commit -i -m x -- a",
		"git commit -im x -- a",
		"git commit --include -m x -- a",
		"git commit --inc -m x -- a",
	]) {
		assert.deepEqual(denyIds(command), ["include"], command);
	}
});

test("readCommit denies an abbreviated --no-verify", () => {
	for (const flag of ["--no-veri", "--no-verif"]) {
		assert.deepEqual(read(`git commit ${flag} -m x -- a`).denies, [
			{ id: "no-verify", flag },
		]);
	}
});

test("readCommit denies more than one commit in the command", () => {
	for (const command of [
		"git commit -m x -- a; git commit -m y -- b",
		`git commit -m x -- a && ${commitMjs("T1: y", "b")}`,
		`${commitMjs("T1: y", "b")} && git commit -m x -- a`,
		"( git commit -m x -- a ) || git commit -m y -- b",
	]) {
		assert.deepEqual(denyIds(command), ["multiple-commits"], command);
	}
});

test("readCommit denies a path the shell would expand", () => {
	for (const command of [
		'git commit -m x -- "$L/x.test.mjs"',
		"git commit -m x -- ${L}/a",
		"git commit -m x -- $(git diff --name-only)",
		"git commit -m x -- `ls`",
		"git commit -m x -- src/{a,b}.mjs",
		"git commit -m x -- ~/a",
		commitMjs("T1: x", '"$F"'),
	]) {
		assert.deepEqual(denyIds(command), ["expanded-paths"], command);
	}
});

test("readCommit passes a literal path with brackets", () => {
	assert.deepEqual(
		read("git commit -m x -- 'frontend/app/[...slug]/page.tsx'").denies,
		[]
	);
});

test("readCommit passes a heredoc message beside literal paths", () => {
	const command = [
		`git commit -m "$(cat <<'EOF'`,
		"T3 fix: Close the gap",
		"EOF",
		`)" -- src/a.mjs`,
	].join("\n");

	assert.deepEqual(read(command).denies, []);
});

test("readCommit denies a magic pathspec on git commit", () => {
	for (const command of [
		"git commit -m x -- :/src/a.mjs",
		"git commit -m x -- ':(top)src/a.mjs'",
		"git commit -m x ':!src/a.mjs' a",
	]) {
		assert.deepEqual(denyIds(command), ["magic-pathspec"], command);
	}
});

test("readCommit reads a commit.mjs path that starts with a colon as a literal path", () => {
	assert.deepEqual(read(commitMjs("T1: x", "':odd'")).denies, []);
	assert.deepEqual(read(commitMjs("T1: x", "':odd'")).paths, [":odd"]);
});

// --- repoRelativePaths ---

test("repoRelativePaths resolves paths against the effective cwd, relative to the repo", () => {
	const commit = read("cd /repo/src && git commit -m x -- a.mjs ../b.mjs");

	assert.deepEqual(repoRelativePaths(commit, "/repo"), ["src/a.mjs", "b.mjs"]);
});

test("repoRelativePaths maps a . or ./ pathspec to a directory, never an empty path", () => {
	for (const [command, expected] of [
		["git commit -m x .", ["."]],
		["git commit -m x -- ./", ["."]],
		["cd sub && git commit -m x ..", ["."]],
		["cd sub && git commit -m x .", ["sub"]],
	] as const) {
		assert.deepEqual(
			repoRelativePaths(read(command), CWD),
			expected,
			command
		);
	}
});

// --- Through the shared segment walker ---

test("readCommit keeps a cd inside a subshell or a nested shell string where it ran", () => {
	assert.equal(read("( cd sub && true ); git commit -m x -- a").cwd, CWD);
	assert.equal(read("bash -c 'cd sub'; git commit -m x -- a").cwd, CWD);
});

test("readCommit expands ~ in a cd or -C path", () => {
	assert.equal(read("cd ~ && git commit -m x -- a").cwd, os.homedir());
	assert.equal(
		read("git -C ~/x commit -m x -- a").cwd,
		path.join(os.homedir(), "x")
	);
});

test("readCommit reads a commit behind shell grammar and wrappers", () => {
	for (const command of [
		"{ git commit -m x -- a; }",
		"if true; then git commit -m x -- a; fi",
		"! git commit -m x -- a",
		"time git commit -m x -- a",
		"command git commit -m x -- a",
		"nice -n 5 git commit -m x -- a",
		"nohup git commit -m x -- a",
		"timeout 60 git commit -m x -- a",
		"env -u X git commit -m x -- a",
	]) {
		assert.deepEqual(read(command).paths, ["a"], command);
	}
});

test("readCommit finds -a behind a wrapper", () => {
	assert.deepEqual(denyIds("{ git commit -am x; }"), ["all", "no-paths"]);
});

test("readCommit leaves a commit inside docker exec to its known miss", () => {
	assert.equal(readCommit("docker exec c git commit -a -m x", CWD), null);
});

test("readCommit reads a cd or -C path built from a substitution as unresolved", () => {
	for (const command of [
		'cd "$(git rev-parse --show-toplevel)" && git commit -m x -- a',
		'git -C "$(git rev-parse --show-toplevel)" commit -m x -- a',
		"git -C `pwd` commit -m x -- a",
	]) {
		assert.equal(read(command).cwd, null, command);
	}
});

test("readCommit leaves literal paths alone beside an empty substitution", () => {
	assert.deepEqual(
		read('echo "$()" && git commit -m x -- "a  b"').denies,
		[]
	);
});

test("readCommit reads the subject of -F - from a heredoc, a here-string, or a piped cat", () => {
	for (const command of [
		["git commit -F - -- a <<'EOF'", "T1 fix: Close it", "", "Body", "EOF"].join(
			"\n"
		),
		"git commit --file=- -- a <<< 'T1 fix: Close it'",
		["cat <<'EOF' | git commit -F - -- a", "T1 fix: Close it", "EOF"].join("\n"),
	]) {
		assert.equal(read(command).subject, "T1 fix: Close it", command);
	}
});

test("readCommit reads the subject of -F - from a single-argument echo or printf", () => {
	for (const command of [
		"echo 'T2: Close it' | git commit -F - -- a",
		"printf 'T2: Close it\\n\\nBody\\n' | git commit -F - -- a",
	]) {
		assert.equal(read(command).subject, "T2: Close it", command);
	}
});

test("readCommit reads no subject from an echo with options or more than one argument", () => {
	for (const command of [
		"echo -e 'T2: x' | git commit -F - -- a",
		"echo T2: x | git commit -F - -- a",
		"git commit -F /nowhere/msg -- a",
	]) {
		assert.equal(read(command).subject, null, command);
	}
});

test("readCommit reads a shell's -co pipefail string", () => {
	assert.deepEqual(
		read("bash -co pipefail 'git commit --no-verify -m x -- a'").denies,
		[{ id: "no-verify", flag: "--no-verify" }]
	);
});

// --- readKillSwitch ---

test("readKillSwitch reads an inline assignment, an export form, and env", () => {
	for (const [command, flag] of [
		["PRISM_HOOK_DISABLE=1 git commit -m x a", "PRISM_HOOK_DISABLE"],
		["PRISM_HOOK_DENY_DISABLE=1 ls", "PRISM_HOOK_DENY_DISABLE"],
		["export PRISM_HOOK_DENY_DISABLE=1; ls", "PRISM_HOOK_DENY_DISABLE"],
		["env PRISM_HOOK_DISABLE=1 ls", "PRISM_HOOK_DISABLE"],
		["readonly PRISM_HOOK_DISABLE", "PRISM_HOOK_DISABLE"],
		["declare -x PRISM_HOOK_DISABLE=1", "PRISM_HOOK_DISABLE"],
		["typeset PRISM_HOOK_DENY_DISABLE", "PRISM_HOOK_DENY_DISABLE"],
		["ls && export PRISM_HOOK_DISABLE=1", "PRISM_HOOK_DISABLE"],
		[`bash -c 'PRISM_HOOK_DISABLE=1 true'`, "PRISM_HOOK_DISABLE"],
		["echo $(export PRISM_HOOK_DISABLE=1)", "PRISM_HOOK_DISABLE"],
	] as const) {
		assert.deepEqual(
			readKillSwitch(command, CWD),
			{ id: "kill-switch", flag },
			command
		);
	}
});

test("readKillSwitch reads a name it can't tokenize past", () => {
	assert.deepEqual(
		readKillSwitch("PRISM_HOOK_DISABLE=1 git commit -m 'unclosed", CWD),
		{ id: "kill-switch", flag: "PRISM_HOOK_DISABLE" }
	);
});

test("readKillSwitch returns null for a command that only mentions a name", () => {
	for (const command of [
		"echo PRISM_HOOK_DISABLE",
		"git commit -m 'PRISM_HOOK_DISABLE=1' -- a",
		"export PRISM_HOOK_DISABLED_OTHER=1",
		"export PATH_PRISM_HOOK_DISABLE=1",
		"ls",
	]) {
		assert.equal(readKillSwitch(command, CWD), null, command);
	}
});

test("readCommit denies a commit.mjs path holding a glob character the shell would expand", () => {
	for (const command of [
		commitMjs("T1: x", "src/*.ts"),
		commitMjs("T1: x", "src/?.ts"),
		commitMjs("T1: x", "a/[x].test.ts"),
		"node " + RUNTIME + "/plan/commit.mjs 'T1: x' 'src/*.ts'",
	]) {
		assert.deepEqual(denyIds(command), ["expanded-paths"], command);
	}
});

test("readCommit leaves a git commit glob to git's own pathspec", () => {
	assert.deepEqual(read("git commit -m x -- 'src/*.ts'").denies, []);
});

test("readKillSwitch reads an append assignment, printf -v, and read", () => {
	for (const [command, flag] of [
		["PRISM_HOOK_DISABLE+=1 ls", "PRISM_HOOK_DISABLE"],
		["A=1 PRISM_HOOK_DENY_DISABLE+=1 ls", "PRISM_HOOK_DENY_DISABLE"],
		["export PRISM_HOOK_DISABLE+=1", "PRISM_HOOK_DISABLE"],
		["declare -x PRISM_HOOK_DENY_DISABLE+=1", "PRISM_HOOK_DENY_DISABLE"],
		["printf -v PRISM_HOOK_DISABLE 1", "PRISM_HOOK_DISABLE"],
		["printf -vPRISM_HOOK_DENY_DISABLE 1", "PRISM_HOOK_DENY_DISABLE"],
		["read PRISM_HOOK_DISABLE <<< 1", "PRISM_HOOK_DISABLE"],
		["read -r PRISM_HOOK_DENY_DISABLE", "PRISM_HOOK_DENY_DISABLE"],
	] as const) {
		assert.deepEqual(
			readKillSwitch(command, CWD),
			{ id: "kill-switch", flag },
			command
		);
	}
});

test("readKillSwitch passes printf -v and read on another variable", () => {
	for (const command of [
		"printf -v OTHER 1",
		"read OTHER <<< 1",
		"printf '%s' PRISM_HOOK_DISABLE",
		"OTHER+=1 ls",
	]) {
		assert.equal(readKillSwitch(command, CWD), null, command);
	}
});
