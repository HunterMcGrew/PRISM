import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
	containsSubstitution,
	readFedStdin,
	resolveContainerDir,
	resolveDir,
	SHELL_STRING_FLAG,
	SHELLS,
	walkSegments,
} from "./hooks/lib/segments.mjs";
import type { Segment } from "./hooks/lib/segments.mjs";

type WalkResult = ReturnType<typeof walkSegments>;

const REPO = "/repo";

/** The segments of `command` walked from the repo root. */
function walk(command: string, options: { maxDepth?: number } = {}) {
	return walkSegments(command, { cwd: REPO, ...options });
}

/** The first segment whose argv starts with `name`. */
function find(result: WalkResult, name: string): Segment | undefined {
	return result.segments.find((segment) => segment.argv[0] === name);
}

// --- Segments and redirects ---

test("control operators split segments and redirects stay with their command", () => {
	const result = walk("cat < in.txt > out.txt 2>&1 && echo done");
	assert.deepEqual(
		result.segments.map((segment) => segment.argv),
		[["cat"], ["echo", "done"]]
	);
	assert.deepEqual(result.segments[0]!.redirects, [
		{ op: "<", target: "in.txt" },
		{ op: ">", target: "out.txt" },
		{ op: ">&", target: "1" },
	]);
	assert.deepEqual(result.segments[0]!.words, [
		"cat",
		"in.txt",
		"out.txt",
		"2",
		"1",
	]);
});

test("a heredoc body and a here-string become stdin text", () => {
	const result = walk("cat <<'EOF'\nline\nEOF\ngrep x <<< 'some text'");
	assert.deepEqual(find(result, "cat")!.stdinTexts, ["line"]);
	assert.deepEqual(find(result, "grep")!.stdinTexts, ["some text"]);
});

test("a segment after a pipe links to the one feeding it", () => {
	const result = walk("cat a | grep b; echo c");
	assert.equal(find(result, "grep")!.pipedFrom, find(result, "cat"));
	assert.equal(find(result, "echo")!.pipedFrom, null);
});

test("an unreadable command reports its text and yields no segments", () => {
	const result = walk("echo 'open");
	assert.deepEqual(result.segments, []);
	assert.deepEqual(result.unreadable, ["echo 'open"]);
});

// --- Nested shells (R3) ---

test("a docker exec'd bash -lc string is walked with the container's cwd", () => {
	const result = walk(
		"docker exec app-1 bash -lc 'cd /workspace && echo x > .prism/rules/a.md'"
	);
	const echo = find(result, "echo")!;
	assert.deepEqual(echo.redirects, [
		{ op: ">", target: ".prism/rules/a.md" },
	]);
	assert.equal(echo.cwd, "/workspace");
	assert.equal(echo.container, "app-1");
	assert.equal(echo.via, "shell-string");
	assert.equal(echo.depth, 1);

	const outer = result.segments[0]!;
	assert.deepEqual(outer.argv.slice(0, 2), ["bash", "-lc"]);
	assert.deepEqual(outer.wrappers, ["docker exec"]);
	assert.equal(outer.container, "app-1");
});

test("docker exec -w sets the container cwd and its options are skipped", () => {
	const result = walk(
		"docker exec -it -e A=1 --workdir=/workspace c node -e x"
	);
	const node = find(result, "node")!;
	assert.deepEqual(node.argv, ["node", "-e", "x"]);
	assert.equal(node.cwd, "/workspace");
	assert.equal(node.container, "c");
});

test("a docker command other than exec is not a wrapper", () => {
	const result = walk("docker ps -a");
	assert.deepEqual(result.segments[0]!.argv, ["docker", "ps", "-a"]);
	assert.deepEqual(result.segments[0]!.wrappers, []);
});

test("a heredoc fed to a shell is walked as commands", () => {
	const result = walk("bash <<'EOF'\ncat .prism/rules/a.md\nEOF");
	const cat = find(result, "cat")!;
	assert.deepEqual(cat.argv, ["cat", ".prism/rules/a.md"]);
	assert.equal(cat.via, "shell-stdin");
});

test("a heredoc piped from cat into a shell is walked as commands", () => {
	const result = walk("cat <<'EOF' | sh\nnode -e x\nEOF");
	const node = find(result, "node")!;
	assert.deepEqual(node.argv, ["node", "-e", "x"]);
	assert.equal(node.via, "shell-stdin");
});

test("a shell running a script file walks nothing inside it", () => {
	const result = walk("bash scripts/x.sh");
	assert.equal(result.segments.length, 1);
});

test("eval's words are walked as a command", () => {
	const result = walk('eval "git commit -m x"');
	assert.deepEqual(find(result, "git")!.argv, ["git", "commit", "-m", "x"]);
	assert.equal(find(result, "git")!.via, "eval");
});

test("a command substitution is walked as its own command", () => {
	const result = walk("echo $(cd sub && cat x)");
	const cat = find(result, "cat")!;
	assert.equal(cat.via, "substitution");
	assert.equal(cat.cwd, path.join(REPO, "sub"));
	assert.equal(find(result, "echo")!.cwd, REPO);
	assert.deepEqual(find(result, "echo")!.substitutions, ["cd sub && cat x"]);
});

test("an unreadable nested string is reported and the outer walk goes on", () => {
	const result = walk(`bash -c "echo 'open"; echo after`);
	assert.deepEqual(result.unreadable, ["echo 'open"]);
	assert.deepEqual(find(result, "echo")!.argv, ["echo", "after"]);
});

test("a shell string is walked wherever the shell word sits in argv", () => {
	const commands = [
		"sudo sh -c 'cat .env'",
		"sudo -u www bash -lc 'cat .env'",
		"xargs -I{} sh -c 'cat .env'",
		"find . -name x -exec sh -c 'cat .env' \\;",
		"pnpm exec sh -c 'cat .env'",
		"docker run --rm img bash -c 'cat .env'",
		"devcontainer exec --workspace-folder . /bin/bash -c 'cat .env'",
	];
	for (const command of commands) {
		const cat = find(walk(command), "cat");
		assert.deepEqual(cat?.argv, ["cat", ".env"], command);
		assert.equal(cat.via, "shell-string", command);
	}
});

test("a shell string is the first operand after the shell's options", () => {
	const commands = [
		"bash -c -e 'cat .env'",
		"bash -c -- 'cat .env'",
		"bash -c - 'cat .env'",
		"bash -lc -x +e 'cat .env'",
		"bash -c -o pipefail 'cat .env'",
		"bash -c +o errexit -O extglob +O nullglob 'cat .env'",
		"sudo bash -c -e 'cat .env'",
	];
	for (const command of commands) {
		const cat = find(walk(command), "cat");
		assert.deepEqual(cat?.argv, ["cat", ".env"], command);
		assert.equal(cat.via, "shell-string", command);
	}
});

test("each o or O in a shell's option cluster takes the next word as its value", () => {
	const commands = [
		"bash -co pipefail 'cat .env'",
		"bash -oc pipefail 'cat .env'",
		"bash -cO extglob 'cat .env'",
		"bash -c -eo pipefail 'cat .env'",
		"bash -c +oo errexit nounset 'cat .env'",
		"bash --rcfile x -c 'cat .env'",
		"bash --init-file x -c 'cat .env'",
	];
	for (const command of commands) {
		const cat = find(walk(command), "cat");
		assert.deepEqual(cat?.argv, ["cat", ".env"], command);
		assert.equal(cat.via, "shell-string", command);
	}
});

test("a shell string reached past argv[0] runs in an unknown directory", () => {
	assert.equal(find(walk("sudo sh -c 'cat x'"), "cat")!.cwd, null);
	assert.equal(find(walk("bash -c 'cat x'"), "cat")!.cwd, REPO);
	assert.equal(
		find(walk("sudo sh -c 'cd /abs && cat x'"), "cat")!.cwd,
		path.normalize("/abs")
	);
});

test("a heredoc feeds a shell only when the shell is the command itself", () => {
	const result = walk("cat <<'EOF' | grep bash\nnode -e x\nEOF");
	assert.equal(find(result, "node"), undefined);
});

test("docker compose exec and run strip to the command in the service", () => {
	const exec = walk("docker compose exec admin sh -c 'cat .env'");
	assert.deepEqual(exec.segments[0]!.argv, ["sh", "-c", "cat .env"]);
	assert.deepEqual(exec.segments[0]!.wrappers, ["docker compose exec"]);
	assert.equal(exec.segments[0]!.container, "admin");
	assert.equal(find(exec, "cat")!.container, "admin");

	const options = walk(
		"docker compose -f a.yml --project-name p exec -T -w /workspace admin cat .env"
	).segments[0]!;
	assert.deepEqual(options.argv, ["cat", ".env"]);
	assert.equal(options.cwd, "/workspace");
	assert.equal(options.container, "admin");

	const run = walk("docker compose run --rm -e A=1 --name n admin node -e x")
		.segments[0]!;
	assert.deepEqual(run.argv, ["node", "-e", "x"]);
	assert.deepEqual(run.wrappers, ["docker compose run"]);
	assert.equal(run.container, "admin");
	assert.equal(run.cwd, null);
});

test("docker container exec strips like docker exec", () => {
	const segment = walk("docker container exec -it -w /w c node -e x")
		.segments[0]!;
	assert.deepEqual(segment.argv, ["node", "-e", "x"]);
	assert.deepEqual(segment.wrappers, ["docker container exec"]);
	assert.equal(segment.container, "c");
	assert.equal(segment.cwd, "/w");
});

test("a docker compose command other than exec or run is not a wrapper", () => {
	for (const command of ["docker compose ps", "docker compose up -d admin"]) {
		const segment = walk(command).segments[0]!;
		assert.deepEqual(segment.wrappers, [], command);
		assert.equal(segment.argv[0], "docker", command);
	}
});

test("nesting deeper than maxDepth stops walking", () => {
	const result = walk("bash -c \"bash -c 'git status'\"", { maxDepth: 1 });
	assert.equal(find(result, "git"), undefined);
	assert.equal(result.segments.length, 2);
});

// --- Wrappers and reserved words (R6, R15) ---

test("timeout, nice, nohup, command, exec, and time strip to the real command", () => {
	const cases: [string, string[]][] = [
		["timeout 60 node -e x", ["timeout"]],
		["timeout -s KILL --kill-after=5 60 node -e x", ["timeout"]],
		["nice -n 5 node -e x", ["nice"]],
		["nice -5 node -e x", ["nice"]],
		["nohup node -e x", ["nohup"]],
		["command -p node -e x", ["command"]],
		["exec -a name node -e x", ["exec"]],
		["time -p node -e x", []],
		["nohup nice timeout 9 node -e x", ["nohup", "nice", "timeout"]],
	];
	for (const [command, wrappers] of cases) {
		const segment = walk(command).segments[0]!;
		assert.deepEqual(segment.argv, ["node", "-e", "x"], command);
		assert.deepEqual(segment.wrappers, wrappers, command);
	}
});

test("command -v names a program rather than running it, so it stays", () => {
	assert.deepEqual(walk("command -v node").segments[0]!.argv, [
		"command",
		"-v",
		"node",
	]);
});

test("env strips its options and assignments and records the assignments", () => {
	const segment = walk("A=1 env -i -u X B=2 node -e x").segments[0]!;
	assert.deepEqual(segment.argv, ["node", "-e", "x"]);
	assert.deepEqual(segment.assignments, ["A=1", "B=2"]);
	assert.deepEqual(segment.wrappers, ["env"]);
});

test("env -C runs the command in that directory", () => {
	const segment = walk("env -C sub git commit").segments[0]!;
	assert.deepEqual(segment.argv, ["git", "commit"]);
	assert.equal(segment.cwd, path.join(REPO, "sub"));
});

test("reserved words and braces drop out of command position", () => {
	const cases: [string, string[]][] = [
		["if git commit -m x; then echo ok; fi", ["git", "commit", "-m", "x"]],
		["while true; do git commit; done", ["git", "commit"]],
		["for f in a b; do git commit; done", ["git", "commit"]],
		["{ git commit; }", ["git", "commit"]],
		["! git commit", ["git", "commit"]],
		["until false; do git commit; done", ["git", "commit"]],
	];
	for (const [command, argv] of cases) {
		const result = walk(command);
		assert.deepEqual(find(result, "git")?.argv, argv, command);
	}
});

test("a for list is not a command, and its words still count", () => {
	const segment = walk("for f in .env x; do cat $f; done").segments[0]!;
	assert.deepEqual(segment.argv, []);
	assert.deepEqual(segment.words, ["for", "f", "in", ".env", "x"]);
});

test("a closing keyword keeps its redirects", () => {
	const result = walk("while read l; do echo $l; done < list.txt");
	const done = result.segments.at(-1)!;
	assert.deepEqual(done.argv, []);
	assert.deepEqual(done.redirects, [{ op: "<", target: "list.txt" }]);
});

// --- Working directory scope (R11) ---

test("a cd moves the directory for the segments after it", () => {
	const result = walk("cd sub && git commit");
	assert.equal(find(result, "git")!.cwd, path.join(REPO, "sub"));
});

test("a cd inside a subshell stays inside it", () => {
	const result = walk("(cd sub && cat x); git commit");
	assert.equal(find(result, "cat")!.cwd, path.join(REPO, "sub"));
	assert.equal(find(result, "git")!.cwd, REPO);
});

test("a cd inside a bash -c string stays inside it", () => {
	const result = walk("bash -c 'cd sub'; git commit");
	assert.equal(find(result, "git")!.cwd, REPO);
});

test("a cd inside braces moves the directory, as bash does", () => {
	const result = walk("{ cd sub; }; git commit");
	assert.equal(find(result, "git")!.cwd, path.join(REPO, "sub"));
});

test("a cd in a pipeline or in the background stays in its subshell", () => {
	assert.equal(find(walk("cd sub | true; git x"), "git")!.cwd, REPO);
	assert.equal(find(walk("cd sub & git x"), "git")!.cwd, REPO);
});

test("pushd and popd move and restore the directory", () => {
	const result = walk("pushd sub; cat a; popd; cat b");
	const cats = result.segments.filter((segment) => segment.argv[0] === "cat");
	assert.deepEqual(
		cats.map((segment) => segment.cwd),
		[path.join(REPO, "sub"), REPO]
	);
});

test("cd reads ~ as home and an unresolvable path as null", () => {
	assert.equal(
		find(walk("cd ~/x && git a"), "git")!.cwd,
		path.join(os.homedir(), "x")
	);
	assert.equal(find(walk("cd && git a"), "git")!.cwd, os.homedir());
	assert.equal(find(walk("cd $HOME/x && git a"), "git")!.cwd, null);
	assert.equal(find(walk("cd - && git a"), "git")!.cwd, null);
	assert.equal(
		find(walk("cd $X && cd /abs && git a"), "git")!.cwd,
		path.normalize("/abs")
	);
});

test("a cd, env -C, or -w word holding a command substitution reads as null", () => {
	const cases = [
		'cd "$(git rev-parse --show-toplevel)" && git a',
		"cd `git rev-parse --show-toplevel` && git a",
		"cd $(pwd)/sub && git a",
		'pushd "$(pwd)" && git a',
		'env -C "$(pwd)" git a',
		'docker exec -w "$(pwd)" c git a',
		'docker compose exec -w "$(pwd)" admin git a',
	];
	for (const command of cases) {
		const last = walk(command).segments.at(-1)!;
		assert.deepEqual(last.argv, ["git", "a"], command);
		assert.equal(last.cwd, null, command);
	}
});

test("a substitution elsewhere in the command leaves a literal cd resolved", () => {
	const result = walk("echo $(date) && cd sub && git a");
	assert.equal(find(result, "git")!.cwd, path.join(REPO, "sub"));
});

test("containsSubstitution finds a flattened substitution inside a word", () => {
	const { segments } = walk('git -C "$(pwd)/x" commit');
	const git = find({ segments, unreadable: [] }, "git")!;
	assert.equal(containsSubstitution(git.argv[2]!, git.substitutions), true);
	assert.equal(containsSubstitution("commit", git.substitutions), false);
	assert.equal(containsSubstitution("a  b", ["  "]), false);
});

test("PowerShell Set-Location moves the directory", () => {
	const result = walk("Set-Location sub; git commit");
	assert.equal(find(result, "git")!.cwd, path.join(REPO, "sub"));
});

test("resolveDir needs a base for a relative path", () => {
	assert.equal(resolveDir("sub", null), null);
	assert.equal(resolveDir("/abs/../x", null), path.normalize("/x"));
	assert.equal(resolveDir("sub/..", "/a"), path.normalize("/a"));
});

// --- Functions and case arms (R122) ---

test("a function body is walked and its cd stays inside the body", () => {
	const cases = [
		"f() { cd sub; git x; }; git commit",
		"function f { cd sub; git x; }; git commit",
		"function f() { cd sub; git x; }; git commit",
		"f()\n{\ncd sub\ngit x\n}\ngit commit",
	];
	for (const command of cases) {
		const result = walk(command);
		assert.equal(find(result, "cd")?.argv[1], "sub", command);
		assert.equal(
			result.segments.find((segment) => segment.argv[1] === "x")?.cwd,
			path.join(REPO, "sub"),
			command
		);
		assert.equal(
			result.segments.find((segment) => segment.argv[1] === "commit")!.cwd,
			REPO,
			command
		);
	}
});

test("braces nested in a function body close at the body's own brace", () => {
	const result = walk("f() { { cd a; }; cd b; git x; }; git commit");
	assert.equal(
		result.segments.find((segment) => segment.argv[1] === "x")!.cwd,
		path.join(REPO, "a", "b")
	);
	assert.equal(
		result.segments.find((segment) => segment.argv[1] === "commit")!.cwd,
		REPO
	);
});

test("a case arm's command is walked", () => {
	const result = walk("case $x in a) git commit -m y;; esac");
	assert.deepEqual(find(result, "git")?.argv, ["git", "commit", "-m", "y"]);
});

// --- Shared shell readers (R110) ---

test("SHELLS and SHELL_STRING_FLAG name the shells and their -c flag", () => {
	assert.deepEqual([...SHELLS].sort(), ["bash", "dash", "ksh", "sh", "zsh"]);
	for (const flag of ["-c", "-lc", "-ec", "-cx"])
		assert.equal(SHELL_STRING_FLAG.test(flag), true, flag);
	for (const flag of ["-l", "--command", "c", "-x"])
		assert.equal(SHELL_STRING_FLAG.test(flag), false, flag);
});

test("readFedStdin returns a segment's own stdin text before a cat feed", () => {
	const own = walk("cat <<'A' | sh <<'B'\nfrom-cat\nA\nown\nB");
	assert.deepEqual(readFedStdin(find(own, "sh")!), ["own"]);

	const piped = walk("cat <<'EOF' | node\nfrom-cat\nEOF");
	assert.deepEqual(readFedStdin(find(piped, "node")!), ["from-cat"]);

	const catFile = walk("cat x <<'EOF' | node\nignored\nEOF");
	assert.deepEqual(readFedStdin(find(catFile, "node")!), []);

	assert.deepEqual(readFedStdin(find(walk("node x"), "node")!), []);
});

// --- Unreadable lines ---

test("the lines before an unreadable line are walked, since bash runs them first", () => {
	const command = "cat .env\necho it's done";
	const result = walk(command);
	assert.deepEqual(
		result.segments.map((segment) => segment.argv),
		[["cat", ".env"]]
	);
	assert.deepEqual(result.unreadable, ["echo it's done"]);
});

test("a heredoc with no body still walks the command after it", () => {
	const result = walk("cat <<EOF; cat .env");
	assert.deepEqual(
		result.segments.map((segment) => segment.argv),
		[["cat"], ["cat", ".env"]]
	);
	assert.deepEqual(result.unreadable, []);
});

test("the readable prefix keeps a quoted value that spans lines whole", () => {
	const result = walk("echo 'a\nb'\ncat x\necho it's");
	assert.deepEqual(
		result.segments.map((segment) => segment.argv),
		[
			["echo", "a\nb"],
			["cat", "x"],
		]
	);
});

test("a nested shell string walks the lines before its unreadable one", () => {
	const result = walk(`bash -c "cat a\necho it's"`);
	assert.equal(find(result, "cat")!.via, "shell-string");
});

// --- coproc ---

test("coproc is stripped, with the name it gives a brace group", () => {
	assert.deepEqual(walk("coproc cat .env").segments[0]!.argv, ["cat", ".env"]);
	assert.deepEqual(find(walk("coproc READER { cat x; }"), "cat")!.argv, [
		"cat",
		"x",
	]);
});

// --- Arithmetic ---

test("a command after an arithmetic << is its own segment", () => {
	for (const command of [
		"(( x = 1 << 2 ))\ncat .env",
		"(( x <<= 1 ))\ncat .env",
		"for ((i=0; i<<1; i++)); do :; done\ncat .env",
	]) {
		assert.deepEqual(
			find(walk(command), "cat")?.argv,
			["cat", ".env"],
			command
		);
	}
});

// --- Directory inside a shell string ---

test("a cd inside a -c string moves the directory of the commands after it", () => {
	const root = path.join(os.tmpdir(), "walk-root");
	const result = walkSegments("bash -c 'cd sub && git commit -m x'", {
		cwd: root,
	});
	const commit = find(result, "git")!;
	assert.equal(commit.argv[0], "git");
	assert.equal(commit.via, "shell-string");
	assert.equal(commit.cwd, path.join(root, "sub"));
});

// --- Directory inside a container ---

/** Runs `run` with `process.platform` reading as `platform`. */
function withPlatform<T>(platform: NodeJS.Platform, run: () => T): T {
	const original = Object.getOwnPropertyDescriptor(process, "platform")!;
	Object.defineProperty(process, "platform", { value: platform });
	try {
		return run();
	} finally {
		Object.defineProperty(process, "platform", original);
	}
}

test("a container's directory resolves as a POSIX path on a Windows host", () => {
	withPlatform("win32", () => {
		const workdir = walk("docker exec -w /w c node -e x").segments[0]!;
		assert.equal(workdir.cwd, "/w");

		const nested = find(
			walk("docker exec c bash -lc 'cd /d/app && echo x'"),
			"echo"
		)!;
		assert.equal(nested.cwd, "/d/app");

		const relative = find(
			walk("docker exec -w /app c bash -lc 'cd sub && echo x'"),
			"echo"
		)!;
		assert.equal(relative.cwd, "/app/sub");

		const envChdir = walk("docker exec c env -C /w node -e x").segments[0]!;
		assert.equal(envChdir.cwd, "/w");
	});
});

test("resolveContainerDir resolves POSIX paths and leaves the host's home out", () => {
	assert.equal(resolveContainerDir("/w", null), "/w");
	assert.equal(resolveContainerDir("sub/..", "/a"), "/a");
	assert.equal(resolveContainerDir("sub", null), null);
	assert.equal(resolveContainerDir("~/x", "/a"), null);
	assert.equal(resolveContainerDir("$X", "/a"), null);
});

test("a bare cd inside a container leaves the directory unknown", () => {
	const git = find(walk("docker exec c sh -c 'cd && git a'"), "git")!;
	assert.equal(git.cwd, null);
	assert.equal(find(walk("cd && git a"), "git")!.cwd, os.homedir());
});

// --- Command words that name Object.prototype members ---

test("a command word naming an Object.prototype member is no wrapper and does not throw", () => {
	for (const word of ["toString", "valueOf", "constructor", "hasOwnProperty"]) {
		const segment = walk(`${word} git push`).segments[0]!;
		assert.deepEqual(segment.argv, [word, "git", "push"], word);
		assert.deepEqual(segment.wrappers, [], word);
	}

	const proto = walk("__proto__ x; git push");
	assert.deepEqual(proto.segments[0]!.argv, ["__proto__", "x"]);
	assert.deepEqual(find(proto, "git")!.argv, ["git", "push"]);
});
