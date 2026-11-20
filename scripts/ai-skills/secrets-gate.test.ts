/**
 * Pins the secrets gate: a read, search, or shell command that reaches a secret
 * file is denied, the one `env-keys.mjs` remedy passes, and every error fails
 * open. Each case spawns the entry point the way a registration does, except
 * the cases that call `judge` in process.
 */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
	copyFileSync,
	mkdirSync,
	mkdtempSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import {
	denyReason,
	judge,
	matchesSecretPath,
} from "./hooks/secrets-gate.mjs";

const RUNTIME_PATH = fileURLToPath(new URL("./hooks/", import.meta.url));
// Forward slashes on every platform, because `tokenize` reads a `\` in a
// command string as an escape.
const RUNTIME = RUNTIME_PATH.split(path.sep).join("/").replace(/\/$/, "");
const HOOK = path.join(RUNTIME_PATH, "secrets-gate.mjs");
const REPO_ROOT = path.resolve(RUNTIME_PATH, "../../..");
const TEMP_ROOTS: string[] = [];
const KILL_SWITCHES = ["PRISM_HOOK_DISABLE", "PRISM_HOOK_DENY_DISABLE"];

after(() => {
	for (const root of TEMP_ROOTS) rmSync(root, { recursive: true, force: true });
});

function makeDir(files: Record<string, string> = {}): string {
	const root = mkdtempSync(path.join(os.tmpdir(), "secrets-gate-"));
	TEMP_ROOTS.push(root);
	for (const [relative, text] of Object.entries(files)) place(root, relative, text);

	return root;
}

function makeRepo(files: Record<string, string> = {}): string {
	const root = makeDir(files);
	execFileSync("git", ["init", "-q"], { cwd: root });

	return root;
}

function place(root: string, relative: string, text: string): void {
	const file = path.join(root, relative);
	mkdirSync(path.dirname(file), { recursive: true });
	writeFileSync(file, text);
}

type Result = { status: number | null; stdout: string; stderr: string };

function runHook(
	tool: string,
	payload: unknown,
	{ env = {}, raw = null }: { env?: Record<string, string>; raw?: string | null } = {}
): Result {
	const base = { ...process.env };
	for (const name of KILL_SWITCHES) delete base[name];

	const child = spawnSync(
		process.execPath,
		[HOOK, `--tool=${tool}`, "--event=PreToolUse"],
		{
			input: raw ?? JSON.stringify(payload),
			env: { ...base, ...env },
			encoding: "utf8",
		}
	);

	return { status: child.status, stdout: child.stdout, stderr: child.stderr };
}

function claudeBash(command: string, cwd: string = REPO_ROOT): Result {
	return runHook("claude", {
		hook_event_name: "PreToolUse",
		session_id: "s1",
		cwd,
		tool_name: "Bash",
		tool_input: { command },
	});
}

function claudeRead(
	filePath: string,
	{ cwd = REPO_ROOT, env = {} }: { cwd?: string; env?: Record<string, string> } = {}
): Result {
	return runHook(
		"claude",
		{
			hook_event_name: "PreToolUse",
			session_id: "s1",
			cwd,
			tool_name: "Read",
			tool_input: { file_path: filePath },
		},
		{ env }
	);
}

function claudeGrep(input: Record<string, string>, cwd: string): Result {
	return runHook("claude", {
		hook_event_name: "PreToolUse",
		session_id: "s1",
		cwd,
		tool_name: "Grep",
		tool_input: { pattern: "KEY", ...input },
	});
}

const DENY_TEXT =
	/^Secret files stay unread\. Run node \S*env-keys\.mjs <file> for key names, or read \.env\.example\.$/;

function assertDenied(result: Result): void {
	assert.equal(result.status, 0, result.stderr);
	const body = JSON.parse(result.stdout);
	assert.equal(body.hookSpecificOutput.hookEventName, "PreToolUse");
	assert.equal(body.hookSpecificOutput.permissionDecision, "deny");
	assert.match(body.hookSpecificOutput.permissionDecisionReason, DENY_TEXT);
}

function assertPassed(result: Result): void {
	assert.equal(result.status, 0, result.stderr);
	assert.equal(result.stdout, "");
}

// --- The three legs ---

test("secrets gate leg 1: a Read of .env is denied and the deny names the env-keys form", () => {
	const result = claudeRead(path.join(REPO_ROOT, ".env"));
	assertDenied(result);

	const reason = JSON.parse(result.stdout).hookSpecificOutput
		.permissionDecisionReason;
	assert.equal(reason, denyReason(REPO_ROOT));
	assert.match(reason, /env-keys\.mjs <file>/);
	assert.equal(
		reason,
		"Secret files stay unread. Run node scripts/ai-skills/hooks/env-keys.mjs <file> for key names, or read .env.example."
	);
});

test("secrets gate leg 2: with only .env.example on disk, a Read of it passes", () => {
	const root = makeRepo({ ".env.example": "API_KEY=\n" });
	const read = (name: string) =>
		judge("claude", {
			tool_name: "Read",
			cwd: root,
			tool_input: { file_path: path.join(root, name) },
		});

	assert.equal(read(".env.example"), null);
	assert.equal(read(".env"), denyReason(realpathOf(root)));
});

test("secrets gate leg 3: the remedy run through the spawned gate passes and prints key names only", () => {
	const root = makeRepo({ ".env": "API_KEY=sk-test-123\n" });
	assertPassed(claudeBash(`node ${RUNTIME}/env-keys.mjs .env`, root));

	const output = execFileSync(
		process.execPath,
		[`${RUNTIME}/env-keys.mjs`, ".env"],
		{ cwd: root, encoding: "utf8" }
	);
	assert.equal(output, "API_KEY\n");
	assert.equal(output.includes("sk-test-123"), false);
});

function realpathOf(dir: string): string {
	return execFileSync("git", ["rev-parse", "--show-toplevel"], {
		cwd: dir,
		encoding: "utf8",
	}).trim();
}

// --- Secret path shapes ---

test("matchesSecretPath matches every secret shape in any folder", () => {
	for (const secret of [
		".env",
		".env.local",
		".env.production",
		"frontend/.env.local",
		"/abs/app/.env",
		"../.env",
		"docker/secrets",
		"docker/secrets/db",
		"config/secrets/api.txt",
		"secrets/",
		"certs/server.pem",
		"deploy.key",
		".private.key",
		"C:\\app\\.env",
	])
		assert.equal(matchesSecretPath(secret), true, secret);
});

test("matchesSecretPath leaves the example file and look-alikes alone", () => {
	for (const ordinary of [
		".env.example",
		"frontend/.env.example",
		"env-keys.mjs",
		".envrc",
		"environment.ts",
		"secrets",
		"my-secrets/x",
		".key",
		".pem",
		"keys.json",
		"https://example.com/docs/secrets/page",
		"",
	])
		assert.equal(matchesSecretPath(ordinary), false, ordinary);
});

// --- Read arm ---

test("a Read of .env is denied", () => {
	assertDenied(claudeRead(path.join(REPO_ROOT, ".env")));
});

test("a Read of a nested .env.local and a key file is denied", () => {
	assertDenied(claudeRead(path.join(REPO_ROOT, "frontend/.env.local")));
	assertDenied(claudeRead("/etc/ssl/private/server.key"));
});

test("a Read of .env.example passes", () => {
	assertPassed(claudeRead(path.join(REPO_ROOT, ".env.example")));
});

test("a Read of an ordinary file passes", () => {
	assertPassed(claudeRead(path.join(REPO_ROOT, "package.json")));
});

// --- Shell arm ---

test("a Bash grep KEY .env is denied", () => {
	assertDenied(claudeBash("grep KEY .env"));
});

test("each named shell read of a secret path is denied", () => {
	const cwd = makeDir();
	for (const command of [
		"cat .en*",
		"bash -lc 'cat docker/secrets/db'",
		"cp .env /tmp/x",
		"< .env.production cat",
		'cat "$(pwd)/.env"',
		"cat $(echo .env.local)",
		"bash <<'EOF'\ncat .env\nEOF",
		"cat .e{n,x}v",
		"docker exec app-admin-1 bash -lc 'cd /workspace && cat .env'",
		"docker run --env-file=.env image",
		"eval 'cat .env'",
		'sh -c "head -n 3 certs/server.pem"',
		"cat ./docker/secrets/db",
	])
		assertDenied(claudeBash(command, cwd));
});

test("a glob that could match a secret name denies with nothing on disk", () => {
	const cwd = makeDir();
	assertDenied(claudeBash("cat .env*", cwd));
	assertDenied(claudeBash("head certs/*.k?y", cwd));
});

test("a bare glob denies only when it expands to a secret file", () => {
	const cwd = makeDir({ "src/a.ts": "x" });
	assertPassed(claudeBash("cat src/*", cwd));

	place(cwd, "src/deploy.key", "x");
	assertDenied(claudeBash("cat src/*", cwd));
});

test("a glob expands against the cwd a cd sets earlier in the command", () => {
	const cwd = makeDir({ "certs/server.cert": "x" });
	assertPassed(claudeBash("cd certs && cat *", cwd));

	place(cwd, "certs/server.pem", "x");
	assertDenied(claudeBash("cd certs && cat *", cwd));
});

test("ordinary commands that mention a secret name in text pass", () => {
	for (const command of [
		'git commit -m "Ignore .env files in docker"',
		"cat README.md",
		"cat .env.example",
		"echo 'never read docker/secrets'",
		"rg -n secrets .github/workflows",
		"cat <<'EOF' > notes.md\nThe .env file stays local.\nEOF",
		"ls -la",
	])
		assertPassed(claudeBash(command));
});

test("a quoted path holding a blank denies when the secret file exists", () => {
	const cwd = makeDir({ "my dir/.env": "KEY=1\n" });
	assertDenied(claudeBash('cat "my dir/.env"', cwd));
	assertPassed(claudeBash('git commit -m "Rotate deploy.key"', cwd));
});

test("a command the tokenizer can't read passes, since bash won't run it either", () => {
	assertPassed(claudeBash("cat .env 'unclosed"));
});

test("Codex Bash is denied with the PreToolUse envelope", () => {
	const result = runHook("codex", {
		hook_event_name: "PreToolUse",
		session_id: "s1",
		cwd: REPO_ROOT,
		tool_name: "Bash",
		tool_input: { command: "cat .env" },
	});
	assertDenied(result);
});

// --- Grep arm ---

test("a path-less Grep passes when every secret file is gitignored", () => {
	const root = makeRepo({
		".gitignore": ".env\n.env.local\n*.pem\n",
		".env": "KEY=1\n",
		".env.local": "KEY=2\n",
		"server.pem": "x",
		".env.example": "KEY=\n",
		"src/app.ts": "x",
	});
	assertPassed(claudeGrep({}, root));
});

test("an untracked x.key under the search root makes a path-less Grep deny", () => {
	const root = makeRepo({ ".gitignore": ".env\n", ".env": "KEY=1\n" });
	assertPassed(claudeGrep({}, root));

	place(root, "x.key", "secret");
	assertDenied(claudeGrep({}, root));
});

test("a Grep scoped to a folder without secret files passes", () => {
	const root = makeRepo({ "x.key": "secret", "src/app.ts": "x" });
	assertPassed(claudeGrep({ path: path.join(root, "src") }, root));
});

test("a Grep whose path or glob names a secret is denied", () => {
	const root = makeRepo({ "src/app.ts": "x" });
	assertDenied(claudeGrep({ path: path.join(root, ".env") }, root));
	assertDenied(claudeGrep({ path: "docker/secrets" }, root));
	assertDenied(claudeGrep({ glob: ".env*" }, root));
	assertDenied(claudeGrep({ glob: "**/*.{ts,pem}" }, root));
	assertPassed(claudeGrep({ glob: "*.{ts,tsx}" }, root));
});

test("a Grep outside any git repo passes", () => {
	assertPassed(claudeGrep({}, makeDir({ "a.txt": "x" })));
});

test("the claude arm declines a Cursor-shaped payload", () => {
	const result = runHook("claude", {
		hook_event_name: "preToolUse",
		cwd: REPO_ROOT,
		tool_name: "Read",
		tool_input: { file_path: path.join(REPO_ROOT, ".env") },
	});
	assertPassed(result);
});

// --- Harness command shapes ---

test("a Codex argv array is judged word by word", () => {
	for (const command of [
		["cat", ".env"],
		["bash", "-lc", "cat docker/secrets/db"],
	])
		assertDenied(
			runHook("codex", {
				hook_event_name: "PreToolUse",
				session_id: "s1",
				cwd: REPO_ROOT,
				tool_name: "Bash",
				tool_input: { command },
			})
		);
});

test("a PowerShell backslash path to a secret is denied", () => {
	const powershell = (command: string) =>
		runHook("claude", {
			hook_event_name: "PreToolUse",
			session_id: "s1",
			cwd: REPO_ROOT,
			tool_name: "PowerShell",
			tool_input: { command },
		});
	assertDenied(powershell("Get-Content .\\.env"));
	assertDenied(powershell("Get-Content docker\\secrets\\db"));
	assertPassed(powershell("Get-Content .\\README.md"));
});

// --- Words that only look like paths ---

test("a word resolved from the cwd a cd sets is judged as a path", () => {
	assertDenied(claudeBash("cd secrets && cat db"));
	assertPassed(claudeBash("cd scripts/ai-skills/hooks && cat env-keys.mjs"));
});

test("ordinary words that only look like secret names pass", () => {
	const cwd = makeDir({ "notes.txt": "x" });
	for (const command of [
		"rg -n event.key src",
		"jq .spec.key data.json",
		"rg '\\.env' src",
		"grep -c '.*' notes.txt",
		"find . -name '.env*'",
		"curl -s https://example.com/docs/secrets/page",
	])
		assertPassed(claudeBash(command, cwd));
});

test("a bare key or pem word denies when the file exists or the glob is unquoted", () => {
	const cwd = makeDir();
	assertPassed(claudeBash("cat deploy.key", cwd));
	assertDenied(claudeBash("cat *.key", cwd));

	place(cwd, "deploy.key", "secret");
	assertDenied(claudeBash("cat deploy.key", cwd));
});

test("a glob word that can't compile skips itself, not the command", () => {
	assertDenied(claudeBash("cat [z-a] .env", makeDir()));
});

test("the path after a revision colon is judged", () => {
	assertDenied(claudeBash("git show HEAD:.env"));
	assertDenied(claudeBash("git show main:.env.production"));
	assertPassed(claudeBash("git show HEAD:README.md"));
});

test("a shell string after the shell's own options is judged", () => {
	for (const command of [
		"bash -c -e 'cat .env'",
		"bash -c -- 'cat .env'",
		"bash -c -o pipefail 'cat .env'",
	])
		assertDenied(claudeBash(command));
});

// --- Grep under an ignored root ---

test("a Grep rooted in a gitignored folder holding a secret file is denied", () => {
	const root = makeRepo({
		".gitignore": "vendor/\n",
		"vendor/lib/a.ts": "x",
		"vendor/lib/x.key": "secret",
	});
	assertDenied(claudeGrep({ path: path.join(root, "vendor") }, root));
	assertDenied(claudeGrep({ path: path.join(root, "vendor/lib") }, root));
});

test("a Grep rooted in a gitignored folder with no secret file passes", () => {
	const root = makeRepo({ ".gitignore": "build/\n", "build/a.js": "x" });
	assertPassed(claudeGrep({ path: path.join(root, "build") }, root));
});

// --- Shell strings under a runner ---

test("a shell string run under a runner or container wrapper is walked", () => {
	const cwd = makeDir();
	for (const command of [
		"docker compose exec admin sh -c 'cat .env'",
		"docker compose -f docker-compose.yml run --rm admin bash -lc 'cat .env'",
		"docker container exec app-admin-1 sh -c 'cat .env'",
		"docker run --rm image sh -c 'cat docker/secrets/db'",
		"pnpm exec sh -c 'cat .env.local'",
		"sudo sh -c 'cat certs/server.pem'",
		"echo x | xargs sh -c 'cat .env'",
		"find . -maxdepth 0 -exec sh -c 'cat .env' \\;",
		"devcontainer exec --workspace-folder . bash -lc 'cat .env'",
		"sudo dash -c 'cat .env.production'",
	])
		assertDenied(claudeBash(command, cwd));

	assertPassed(claudeBash("docker compose exec admin sh -c 'pnpm test'", cwd));
	assertPassed(claudeBash("sudo sh -c 'cat README.md'", cwd));
});

// --- Search filter globs ---

test("a quoted search filter glob that could select a secret is denied", () => {
	const cwd = makeDir({ "src/a.ts": "x" });
	for (const command of [
		"rg X -g '.env*'",
		"rg X -g'.env*'",
		'rg X -g ".env.*" src',
		"rg X --glob='*.key'",
		"rg X --glob '**/*.pem'",
		"rg X --iglob '*.KEY'",
		"rg X --iglob='.ENV*'",
		"grep -r --include='*.key' KEY .",
		"grep -r --include '*.pem' X .",
		"rg X -g '*.{ts,key}'",
	])
		assertDenied(claudeBash(command, cwd));
});

test("a search filter glob that selects no secret, or excludes one, passes", () => {
	const cwd = makeDir({ "src/a.ts": "x" });
	for (const command of [
		"rg X -g '*.ts'",
		"rg X --glob='!.env*'",
		"rg X --iglob '*.md'",
		"grep -r --include='*.ts' X .",
		"grep -r --exclude='*.key' X src",
	])
		assertPassed(claudeBash(command, cwd));
});

test("a read on a line before an unreadable line is denied, since bash runs it", () => {
	assertDenied(claudeBash("cat .env\necho it's done"));
	assertDenied(claudeBash('bash -c "cat .env\necho it\'s done"'));
});

test("matchesSecretPath ignores case, as a case-insensitive disk does", () => {
	for (const secret of [".ENV", ".Env.Local", "certs/SERVER.PEM", "Secrets/db"])
		assert.equal(matchesSecretPath(secret), true, secret);
	assert.equal(matchesSecretPath(".ENV.EXAMPLE"), false);
	assertDenied(claudeBash("cat .ENV"));
});

test("a command that prints only a secret file's metadata passes", () => {
	const cwd = makeRepo({ ".gitignore": ".env\n", ".env": "KEY=1\n" });
	for (const command of [
		"test -f .env",
		"[ -f .env ]",
		"[[ -f .env ]]",
		"ls -la .env",
		"ls -R secrets/",
		"stat .env",
		"git check-ignore -v .env",
		"test -f .env && echo present",
	])
		assertPassed(claudeBash(command, cwd));
});

test("a metadata command that reads names or stdin from a secret file is denied", () => {
	const cwd = makeRepo({ ".env": "KEY=1\n" });
	for (const command of [
		"cat .env",
		"test -f .env && cat .env",
		"file -f .env",
		"wc --files0-from=.env",
		"git check-ignore --stdin < .env",
		'[ -n "$(cat .env)" ]',
	])
		assertDenied(claudeBash(command, cwd));
});

test("file and wc are judged on every word, since a flag can make either print a file", () => {
	const cwd = makeRepo({ ".env": "KEY=1\n" });
	for (const command of [
		"file .env",
		"wc -l .env",
		"file -m .env x",
		"file --files=.env",
		"wc --files0=.env",
	])
		assertDenied(claudeBash(command, cwd));
});

test("a metadata program shadowed by a function in the command is judged", () => {
	const cwd = makeRepo({ ".env": "KEY=1\n" });
	for (const command of [
		'stat() { cat "$@"; }; stat .env',
		'stat ( ) { cat "$@"; }; stat .env',
		'function stat { cat "$@"; }; stat .env',
		'[() { cat "$@"; }; [ .env',
		"eval 'st''at() { cat \"$@\"; }'; stat .env",
		"bash -c 'ls() { cat \"$@\"; }; ls .env'",
	])
		assertDenied(claudeBash(command, cwd));
	assertDenied(claudeBash('show() { echo "$@"; }; stat .env', cwd));
});

test("a metadata program named by a path, or found through a changed PATH or hash, is judged", () => {
	const cwd = makeRepo({ ".env": "KEY=1\n" });
	for (const command of [
		"./stat .env",
		"/tmp/stat .env",
		"PATH=.:$PATH stat .env",
		"export PATH=.; stat .env",
		"hash -p /bin/cat stat; stat .env",
	])
		assertDenied(claudeBash(command, cwd));
});

test("a heredoc that never gets a body doesn't hide the command after it", () => {
	assertDenied(claudeBash("cat <<EOF; cat .env"));
	assertDenied(claudeBash("bash -c 'cat <<EOF; cat .env'"));
});

test("a bare key word in capitals passes when no such file exists", () => {
	assertPassed(claudeBash("rg -n EVENT.KEY src", makeDir()));
});

test("the metadata pass holds only when every segment is a metadata program or prints its arguments", () => {
	const cwd = makeRepo({ ".gitignore": ".env\n", ".env": "KEY=1\n" });
	for (const command of [
		"BASH_CMDS[stat]=/bin/cat; stat .env",
		"BASH_CMDS[ls]=/bin/cat; ls -R .env",
		"BASH_CMDS[git]=/bin/cat; git check-ignore --stdin .env",
		"commands[stat]=/bin/cat; stat .env",
		"functions[stat]='cat $@'; stat .env",
		"${h}sh -p; stat .env",
		"X=1; stat .env",
		"LC_ALL=C stat .env",
		"printf -v PATH %s .; stat .env",
		"source ./x; stat .env",
		". ./x; stat .env",
		"ls -la .env | cat",
		'stat() { echo "$(<"$1")"; }; stat .env',
	])
		assertDenied(claudeBash(command, cwd));
	for (const command of [
		"stat .env",
		"ls -la .env",
		"test -f .env && printf '%s\\n' present || true",
		"[ -f .env ] || false",
		"if [ -f .env ]; then echo present; fi",
	])
		assertPassed(claudeBash(command, cwd));
});

test("an arithmetic shift doesn't open a heredoc that hides the next line", () => {
	assertDenied(claudeBash("(( x = 1 << 2 ))\ncat .env"));
});

test("the metadata pass drops when a word can assign through expansion or arithmetic", () => {
	const cwd = makeRepo({ ".gitignore": ".env\n", ".env": "KEY=1\n" });
	for (const command of [
		"echo ${BASH_CMDS[stat]:=/bin/cat}; stat .env",
		"[[ 1 -eq PATH=0 ]]; stat .env",
	])
		assertDenied(claudeBash(command, cwd));
	for (const command of ["[[ -e .env ]]", "stat .env"])
		assertPassed(claudeBash(command, cwd));
});

test("the metadata pass drops for the sibling arithmetic forms that can assign", () => {
	const cwd = makeRepo({ ".gitignore": ".env\n", ".env": "KEY=1\n" });
	for (const command of [
		"echo $[PATH=0]; stat .env",
		"[[ -v a[PATH=0] ]]; stat .env",
		'[ -v "a[PATH=0]" ]; stat .env',
		'test -v "a[PATH=0]"; stat .env',
		'printf "%d" PATH=0; stat .env',
	])
		assertDenied(claudeBash(command, cwd));
	for (const command of [
		"[[ -v HOME ]]; stat .env",
		"printf '%s\\n' present; stat .env",
		"printf 'a=%s\\n' 1; stat .env",
	])
		assertPassed(claudeBash(command, cwd));
});

// --- The env-keys remedy ---

test("the remedy node <runtime>/env-keys.mjs <file> passes the gate", () => {
	assertPassed(claudeBash(`node ${RUNTIME}/env-keys.mjs .env`));
	assertPassed(claudeBash(`node ${RUNTIME}/env-keys.mjs frontend/.env.local`));
	assertPassed(claudeBash("node scripts/ai-skills/hooks/env-keys.mjs .env"));
	assertPassed(claudeBash("node ./scripts/ai-skills/hooks/env-keys.mjs .env"));
});

test("env-keys.mjs with a pipe, redirect, separator, assignment, wrapper, or extra word is denied", () => {
	for (const command of [
		`node ${RUNTIME}/env-keys.mjs .env | cat`,
		`node ${RUNTIME}/env-keys.mjs .env > keys.txt`,
		`node ${RUNTIME}/env-keys.mjs .env; cat .env`,
		`node ${RUNTIME}/env-keys.mjs .env .env.local`,
		`FOO=1 node ${RUNTIME}/env-keys.mjs .env`,
		`env node ${RUNTIME}/env-keys.mjs .env`,
		`bash -c 'node ${RUNTIME}/env-keys.mjs .env'; cat .env`,
		`${RUNTIME}/env-keys.mjs .env`,
		"node other/env-keys.mjs .env",
	])
		assertDenied(claudeBash(command));
});

test("env-keys.mjs with a substitution in its file word is denied", () => {
	for (const command of [
		`node ${RUNTIME}/env-keys.mjs "$(cat .env)"`,
		`node ${RUNTIME}/env-keys.mjs \`cat .env\``,
		`node ${RUNTIME}/env-keys.mjs <(cat .env)`,
	])
		assertDenied(claudeBash(command));
});

test("a copy of env-keys.mjs outside the runtime is denied", () => {
	const dir = makeDir();
	copyFileSync(path.join(RUNTIME_PATH, "env-keys.mjs"), path.join(dir, "env-keys.mjs"));
	assertDenied(claudeBash("node ./env-keys.mjs .env", dir));
	assertDenied(claudeBash(`node ${dir.split(path.sep).join("/")}/env-keys.mjs .env`));
});

// --- Config and switches ---

test("secretPaths adds a pattern and keeps every built-in", () => {
	const root = makeRepo({
		".ai-skills/config.json": JSON.stringify({ secretPaths: ["config/creds/**"] }),
	});
	assertDenied(claudeRead(path.join(root, "config/creds/a.json"), { cwd: root }));
	assertDenied(claudeRead(path.join(root, "Config/Creds/A.json"), { cwd: root }));
	assertDenied(claudeRead(path.join(root, ".env"), { cwd: root }));
	assertDenied(claudeBash("cat config/creds/a.json", root));
	assertPassed(claudeRead(path.join(root, "config/other/a.json"), { cwd: root }));
	assertPassed(claudeRead(path.join(root, ".env.example"), { cwd: root }));
});

test("a secretPaths that is not a list keeps the built-ins and writes one stderr line", () => {
	const line =
		"secrets-gate: secretPaths in .ai-skills/config.json is not a list of strings; using the built-in patterns.\n";
	for (const config of [
		'{"secretPaths":"config/creds/**"}',
		'{"secretPaths":["config/creds/**",1]}',
		'{"secretPaths":{"a":"b"}}',
		"{not json",
	]) {
		const root = makeRepo({ ".ai-skills/config.json": config });
		const denied = claudeRead(path.join(root, ".env"), { cwd: root });
		assert.equal(JSON.parse(denied.stdout).hookSpecificOutput.permissionDecision, "deny");
		assert.equal(denied.stderr, line, config);

		const passed = claudeRead(path.join(root, "config/creds/a.json"), { cwd: root });
		assert.equal(passed.stdout, "", config);
	}
});

test("a config with no secretPaths key adds nothing and writes nothing to stderr", () => {
	const root = makeRepo({ ".ai-skills/config.json": '{"hosts":["claude"]}' });
	const result = claudeRead(path.join(root, "config/creds/a.json"), { cwd: root });
	assertPassed(result);
	assert.equal(result.stderr, "");
});

test("either kill switch leaves the deny in place", () => {
	for (const name of KILL_SWITCHES)
		assertDenied(
			claudeRead(path.join(REPO_ROOT, ".env"), { env: { [name]: "1" } })
		);
});

test("a crash fails open: malformed JSON on stdin writes nothing to stdout and one stderr line", () => {
	const result = runHook("claude", null, { raw: "{not json" });
	assert.equal(result.status, 0);
	assert.equal(result.stdout, "");
	assert.match(result.stderr, /^secrets-gate: [^\n]*\n$/);
});

test("an unknown --tool fails open with one stderr line", () => {
	const result = runHook("vim", { tool_name: "Read" });
	assert.equal(result.status, 0);
	assert.equal(result.stdout, "");
	assert.match(result.stderr, /^secrets-gate: unknown or missing --tool "vim"[^\n]*\n$/);
});

test("a Cursor payload writes nothing, since no Cursor deny envelope is known", () => {
	const result = runHook("cursor", {
		hook_event_name: "preToolUse",
		conversation_id: "c1",
		cwd: REPO_ROOT,
		tool_name: "Read",
		tool_input: { file_path: path.join(REPO_ROOT, ".env") },
	});
	assertPassed(result);
});
