/**
 * Suite for the approval guard: the execution arm's deny shapes and the shell
 * shapes it must let through, the frontmatter arm for each host's edit tools,
 * the chat approval prompt arm and its token, and the token arm that keeps the
 * token out of an agent's hands.
 */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	realpathSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";

type Tool = "claude" | "codex";
type Payload = Record<string, unknown>;
type ChatTokenFile = {
	prompted_at: string;
	session: string;
	path: string | null;
	hashes: Record<string, string>;
};

const HOOK = fileURLToPath(
	new URL("./hooks/approve-guard.mjs", import.meta.url)
);
const EVENTS: Record<Tool, string> = {
	claude: "PreToolUse",
	codex: "PreToolUse",
};
const INTENT = ".prism/plans/acme-1/intent.md";
const TEMP_ROOTS: string[] = [];
const HOST_MARKERS = [
	"CLAUDECODE",
	"CLAUDE_CODE_SESSION_ID",
	"CODEX_THREAD_ID",
	"CODEX_SESSION_ID",
	"CODEX_CI",
	"PRISM_HOOK_DISABLE",
	"PRISM_HOOK_DENY_DISABLE",
];

const DRAFT =
	"---\ntitle: Fast search\nticket: ACME-1\nstage: intent\nstatus: draft\nsize: standard\n---\n\n## Problem\n\nSlow.\n";
const APPROVED =
	"---\ntitle: Fast search\nticket: ACME-1\nstage: intent\nstatus: approved\napproved_by: Ada\napproved_at: 2026-10-01\nsize: standard\n---\n\n## Problem\n\nSlow.\n";

after(() => {
	for (const root of TEMP_ROOTS) rmSync(root, { recursive: true, force: true });
});

// A global git config on the developer's machine must not change what the
// fixture repos or the guard's own git calls do.
const EMPTY_GIT_CONFIG = path.join(
	mkdtempSync(path.join(os.tmpdir(), "approve-guard-gitcfg-")),
	"gitconfig"
);
TEMP_ROOTS.push(path.dirname(EMPTY_GIT_CONFIG));
writeFileSync(EMPTY_GIT_CONFIG, "");
process.env.GIT_CONFIG_NOSYSTEM = "1";
process.env.GIT_CONFIG_GLOBAL = EMPTY_GIT_CONFIG;

/** The process environment with every host marker removed, so the host running the suite never leaks in. */
function cleanEnv(overrides: Record<string, string> = {}): NodeJS.ProcessEnv {
	const env = { ...process.env };
	for (const marker of HOST_MARKERS) delete env[marker];

	return { ...env, ...overrides };
}

function makeRepo(intentText: string | null = DRAFT): string {
	const root = mkdtempSync(path.join(os.tmpdir(), "approve-guard-"));
	TEMP_ROOTS.push(root);
	if (intentText !== null) place(root, INTENT, intentText);

	return root;
}

function place(root: string, relative: string, text: string): string {
	const file = path.join(root, relative);
	mkdirSync(path.dirname(file), { recursive: true });
	writeFileSync(file, text);

	return file;
}

function runHook(
	tool: string,
	payload: unknown,
	{
		env = {},
		raw = null,
	}: { env?: Record<string, string>; raw?: string | null } = {}
) {
	const child = spawnSync(
		process.execPath,
		[HOOK, `--tool=${tool}`, `--event=${EVENTS[tool as Tool] ?? "PreToolUse"}`],
		{
			input: raw ?? JSON.stringify(payload),
			env: cleanEnv(env),
			encoding: "utf8",
		}
	);
	assert.equal(child.status, 0, child.stderr);

	return child;
}

function denyText(stdout: string): string | null {
	if (!stdout) return null;

	const body = JSON.parse(stdout);
	assert.equal(body.hookSpecificOutput.hookEventName, "PreToolUse");
	assert.equal(body.hookSpecificOutput.permissionDecision, "deny");

	return body.hookSpecificOutput.permissionDecisionReason;
}

const shell: Record<Tool, (command: string | string[], cwd: string) => Payload> = {
	claude: (command, cwd) => ({
		tool_name: "Bash",
		tool_input: { command },
		cwd,
	}),
	codex: (command, cwd) => ({
		tool_name: "Bash",
		tool_input: { command },
		cwd,
	}),
};

const APPROVE_PATH = path.resolve(path.dirname(HOOK), "plan/approve.mjs");
// The spelling a session types: the guard's command pattern takes forward
// slashes only, so a Windows path reads the way a PowerShell call is rewritten.
const APPROVE_COMMAND_PATH = APPROVE_PATH.split(path.sep).join("/");

/** Links `link` to `target`, or reports false where Windows refuses a symlink without privilege. */
function tryLink(target: string, link: string): boolean {
	try {
		symlinkSync(target, link);

		return true;
	} catch (error) {
		if (
			process.platform === "win32" &&
			(error as { code?: string }).code === "EPERM"
		)
			return false;

		throw error;
	}
}

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The script path a deny names for a session in `cwd`: relative to the repo's top level, in forward slashes. */
function approveCommandPath(cwd: string): string {
	return path
		.relative(realpathSync(cwd), realpathSync(APPROVE_PATH))
		.split(path.sep)
		.join("/");
}

function cwdOf(payload: Payload): string {
	assert.equal(typeof payload.cwd, "string");

	return payload.cwd as string;
}

function assertExecDenied(tool: string, payload: Payload): void {
	const text = denyText(runHook(tool, payload).stdout);
	assert.match(
		text ?? "",
		new RegExp(
			`Approval is a human step\\. Ask the person to run \`node ${escapeRegExp(approveCommandPath(cwdOf(payload)))} <artifact>\` in their own terminal`
		)
	);
}

function assertFrontmatterDenied(tool: string, payload: Payload): void {
	const text = denyText(runHook(tool, payload).stdout);
	assert.match(
		text ?? "",
		new RegExp(
			`change only through \`node ${escapeRegExp(approveCommandPath(cwdOf(payload)))} <artifact>\`\\. Edit the body`
		)
	);
}

function assertPasses(tool: string, payload: Payload): void {
	const child = runHook(tool, payload);
	assert.equal(child.stdout, "");
}

// --- Execution arm, leg 1: the deny fires ---

const A = "node scripts/ai-skills/hooks/plan/approve.mjs .prism/plans/acme-1/intent.md";
const B = "node scripts/ai-skills/hooks/plan/approve.mjs x";
const TOOLS: Tool[] = ["claude", "codex"];

// Shapes bash runs approve.mjs through, checked in every tool. Each comment
// names what the shapes under it get past.
const PROBES: string[] = [
	// A redirect right after a control operator, or a redirect target that
	// reads like a read-only command word.
	`true;>cat ${B}`,
	`true|>cat ${B}`,
	`(>cat ${B})`,
	`true\n>cat ${B}`,
	`true&&>git ${B}`,
	`&>git ${B}`,
	`>|git ${B}`,
	`<<<git ${B}`,
	`<<EOF ${B}\ngit\nEOF`,
	`2>git ${B}`,
	`${B} >/dev/null 2>&1`,
	// An arithmetic `<<` inside `(( ))`, which opens no heredoc.
	`(( cat = 1 <<2 ))\n${B}\n2`,
	`((cat<<2))\n${B}\n2`,
	// A carriage return, which bash reads as part of a word.
	`echo x\r# ; ${B}`,
	`X=1\rgit ${B}`,
	// Tabs and vertical tabs.
	"git\tlog;\tnode\tscripts/ai-skills/hooks/plan/approve.mjs\tx",
	"X=1\vgit scripts/ai-skills/hooks/plan/approve.mjs x",
	// ANSI-C and locale quoting.
	"node $'scripts/ai-skills/hooks/plan/appr\\x6fve.mjs' x",
	"node $'scripts/ai-skills/hooks/plan/appr\\157ve.mjs' x",
	"node $'scripts/ai-skills/hooks/plan/appr\\u006fve.mjs' x",
	"bash -c \"node $'scripts/ai-skills/hooks/plan/appr\\x6fve.mjs' x\"",
	'node $"scripts/ai-skills/hooks/plan/approve.mjs" x',
	// Groups and compound commands feeding a pipe.
	"{ cat scripts/ai-skills/hooks/plan/approve.mjs; } | node --input-type=module",
	"(cat scripts/ai-skills/hooks/plan/approve.mjs) | node --input-type=module",
	"if true; then cat scripts/ai-skills/hooks/plan/approve.mjs; fi | node --input-type=module",
	// Wrappers.
	`coproc ${B}`,
	`builtin command ${B}`,
	`exec ${B}`,
	// A pipe into a runner.
	"echo scripts/ai-skills/hooks/plan/approve.mjs | xargs node",
	"printf '%s\\n' scripts/ai-skills/hooks/plan/approve.mjs | xargs -I{} node {} x",
	"cat scripts/ai-skills/hooks/plan/approve.mjs | node --input-type=module",
	// Here-strings.
	"node --input-type=module <<< 'import \"./scripts/ai-skills/hooks/plan/approve.mjs\"'",
	"bash <<< $'node scripts/ai-skills/hooks/plan/appr\\x6fve.mjs x'",
	// Process and command substitution whose output is an argument.
	`bash <(echo ${B})`,
	`source <(echo ${B})`,
	`. <(printf '${B}')`,
	"node $(echo scripts/ai-skills/hooks/plan/approve.mjs) x",
	// A read-only name made to run something else.
	"shopt -s expand_aliases\nalias git=node\ngit scripts/ai-skills/hooks/plan/approve.mjs x",
	'git() { node "$@"; }; git scripts/ai-skills/hooks/plan/approve.mjs x',
	'function cat { node "$@"; }; cat scripts/ai-skills/hooks/plan/approve.mjs x',
	'git() { node "$@"; }; echo "$(git scripts/ai-skills/hooks/plan/approve.mjs x)"',
	'hash -p "$(command -v node)" git; git scripts/ai-skills/hooks/plan/approve.mjs x',
	"PATH=./shim:$PATH git scripts/ai-skills/hooks/plan/approve.mjs x",
	"BASH_CMDS[git]=$(command -v node); git scripts/ai-skills/hooks/plan/approve.mjs x",
	"GIT_EDITOR='node scripts/ai-skills/hooks/plan/approve.mjs' git commit --allow-empty -q",
	// Line continuations.
	"no\\\nde scripts/ai-skills/hooks/plan/approve.mjs x",
	'node "scripts/ai-skills/hooks/plan/appr\\\nove.mjs" x',
	`g\\\nit log -1 >/dev/null; ${B}`,
	// Empty command words.
	`$EMPTY ${B}`,
	`"" ; ${B}`,
	// Brace expansion.
	"node scripts/ai-skills/hooks/plan/appr{o,}ve.mjs x",
	"node scripts/ai-skills/hooks/plan/a{p,}prove.mjs x",
	"node scripts/ai-skills/hooks/plan/appr{o..o}ve.mjs x",
	// A copy made by a read-only command.
	"cat scripts/ai-skills/hooks/plan/approve.mjs > a.mjs && node a.mjs x",
	"cat scripts/ai-skills/hooks/plan/approve.mjs | tee a.mjs >/dev/null; node a.mjs x",
	"cat < scripts/ai-skills/hooks/plan/approve.mjs > a.mjs; node a.mjs x",
	// A quoted operator, which stays a word.
	'bash -c \'node "$2"\' ";" git scripts/ai-skills/hooks/plan/approve.mjs',
	// A `#` that doesn't start a comment.
	`echo a#b; ${B}`,
	`echo x;# c\n${B}`,
	`stat x\\ #; ${B}`,
	// `apply_patch` as a command word, defined or not.
	'apply_patch() { node "$@"; }; apply_patch scripts/ai-skills/hooks/plan/approve.mjs x',
	"apply_patch scripts/ai-skills/hooks/plan/approve.mjs x",
	`apply_patch() { bash; }; apply_patch <<'EOF'\n*** Begin Patch; ${B}\nEOF`,
];

const EXEC_DENIES: [Tool, string][] = [
	["claude", "node scripts/ai-skills/hooks/plan/approve.mjs .prism/plans/acme-1/intent.md"],
	["claude", "./scripts/ai-skills/hooks/plan/approve.mjs x"],
	[
		"claude",
		"docker exec app-1 bash -lc 'cd /workspace && node scripts/ai-skills/hooks/plan/approve.mjs x'",
	],
	["claude", "env FOO=1 node scripts/ai-skills/hooks/plan/approve.mjs x"],
	["claude", "script -q /dev/null node scripts/ai-skills/hooks/plan/approve.mjs x"],
	["claude", "FOO=1 node scripts/ai-skills/hooks/plan/approve.mjs x"],
	["claude", 'script -q -c "node scripts/ai-skills/hooks/plan/approve.mjs x" /dev/null'],
	["claude", "bash --norc -c 'node scripts/ai-skills/hooks/plan/approve.mjs x'"],
	["claude", 'echo "$(node scripts/ai-skills/hooks/plan/approve.mjs x)"'],
	["claude", "echo `node scripts/ai-skills/hooks/plan/approve.mjs x`"],
	["claude", 'echo "`node scripts/ai-skills/hooks/plan/approve.mjs x`"'],
	["claude", 'eval "node scripts/ai-skills/hooks/plan/approve.mjs x"'],
	["claude", "git status; /usr/bin/env node /repo/scripts/ai-skills/hooks/plan/APPROVE.MJS x"],
	["codex", "node scripts/ai-skills/hooks/plan/approve.mjs x"],
	// Reserved words, grouping, and redirections ahead of the runner.
	["claude", `if true; then ${A}; fi`],
	["claude", `{ ${A}; }`],
	["claude", `! ${A}`],
	["claude", `(${A})`],
	["claude", `for i in 1; do ${A}; done`],
	["claude", `while true; do ${A}; break; done`],
	["claude", `${A} &`],
	["claude", `>/dev/null ${A}`],
	["claude", `2>&1 ${A}`],
	["claude", `node < scripts/ai-skills/hooks/plan/approve.mjs`],
	[
		"claude",
		`if true; then env -u CLAUDECODE script -q /dev/null ${A}; fi < <(sleep 1; printf y; sleep 1)`,
	],
	[
		"claude",
		`{ CLAUDECODE= script -q /dev/null ${A}; } < <(sleep 1; printf y; sleep 2)`,
	],
	[
		"claude",
		`for i in 1; do printf y | CLAUDECODE= script -q /dev/null ${A}; done`,
	],
	// Wrapper commands.
	["claude", `time ${A}`],
	["claude", `nice ${A}`],
	["claude", `nohup ${A}`],
	["claude", `command ${A}`],
	["claude", `sudo ${A}`],
	["claude", `timeout 5 ${A}`],
	["claude", `exec -a foo ${A}`],
	["claude", `env -u CLAUDECODE ${A}`],
	["claude", `CLAUDECODE= ${A}`],
	["claude", `pnpm exec ${A}`],
	["claude", `npx ${A}`],
	["claude", `npm exec -- ${A}`],
	["claude", "tsx scripts/ai-skills/hooks/plan/approve.mjs x"],
	["claude", "xargs -a /dev/null node scripts/ai-skills/hooks/plan/approve.mjs x"],
	["claude", "find scripts/ai-skills/hooks/plan -name approve.mjs -exec node {} x \\;"],
	["claude", `docker exec -t app-1 ${A}`],
	["claude", `docker exec -it app-1 ${A}`],
	["claude", `docker exec -w /workspace app-1 ${A}`],
	["claude", `printf y | script -q /dev/null ${A}`],
	[
		"claude",
		"printf y | docker exec -i app-1 script -qc 'node scripts/ai-skills/hooks/plan/approve.mjs x' /dev/null",
	],
	["claude", `expect -c "spawn ${A}; send y; interact"`],
	["claude", `tmux new -d "${A}"`],
	// Shells and interpreters given the command as an argument.
	["claude", `bash -lc "${A}"`],
	["claude", `bash --login -c "${A}"`],
	["claude", `bash -o pipefail -c "${A}"`],
	["claude", `bash -O extglob -c "${A}"`],
	["claude", `sh -c 'sh -c "${A}"'`],
	["claude", `bash <<'EOF'\n${A}\nEOF`],
	["claude", `bash <<< "${A}"`],
	[
		"claude",
		`python3 -c 'import pty; pty.spawn(["node","scripts/ai-skills/hooks/plan/approve.mjs","x"])'`,
	],
	["claude", `perl -e 'exec "node", "scripts/ai-skills/hooks/plan/approve.mjs"'`],
	["claude", "node --import ./scripts/ai-skills/hooks/plan/approve.mjs -e 1"],
	["claude", "node --import=./scripts/ai-skills/hooks/plan/approve.mjs -e 1"],
	["claude", `node -e 'import("./scripts/ai-skills/hooks/plan/approve.mjs")'`],
	// Spellings of the script name.
	["claude", "node scripts/ai-skills/hooks/plan/APPROVE.mjs x"],
	["claude", 'node scripts/ai-skills/hooks/plan/appr""ove.mjs x'],
	["claude", "node scripts/ai-skills/hooks/plan/appr\\ove.mjs x"],
	["claude", "node scripts/ai-skills/hooks/plan/approve.m*s x"],
	["claude", "node scripts/ai-skills/hooks/plan/approve.mj? x"],
	["claude", "node scripts/ai-skills/hooks/plan/{approve,x}.mjs x"],
	["claude", "node scripts/ai-skills/hooks/plan/approve.mjs/. x"],
	["claude", "node ./scripts/ai-skills/hooks/plan/../plan/approve.mjs x"],
	["claude", "node scripts/ai-skills/hooks/plan/approve.mjs\\\nx"],
	["claude", "cp scripts/ai-skills/hooks/plan/approve.mjs /tmp/a.mjs && node /tmp/a.mjs x"],
	["claude", "f=scripts/ai-skills/hooks/plan/approve.mjs; node $f x"],
	["claude", "node `echo scripts/ai-skills/hooks/plan/approve.mjs` x"],
	// Comments and unreadable commands.
	["claude", `${A} # it's mine`],
	["claude", `${A}; echo "`],
	// Substitutions inside a read-only command still run.
	["claude", `git commit -m "$(${A})"`],
	["claude", `echo "\`${A}\`"`],
	["claude", `cat <<EOF\n\`${A}\`\nEOF`],
	["codex", `if true; then ${A}; fi`],
	// A pipe filter that names the script, writes a file, or runs a program.
	["claude", "sort scripts/ai-skills/hooks/plan/approve.mjs"],
	["claude", "cat scripts/ai-skills/hooks/plan/approve.mjs | sort -o a.mjs"],
	["claude", "cat scripts/ai-skills/hooks/plan/approve.mjs | sort -uo a.mjs"],
	["claude", "cat scripts/ai-skills/hooks/plan/approve.mjs | sort --output=a.mjs"],
	["claude", "cat scripts/ai-skills/hooks/plan/approve.mjs | sort --out a.mjs"],
	["claude", "cat scripts/ai-skills/hooks/plan/approve.mjs | sort --compress-program=node"],
	["claude", "echo 'node scripts/ai-skills/hooks/plan/approve.mjs x' | sort -S 1K --co=sh"],
	["claude", "cat scripts/ai-skills/hooks/plan/approve.mjs | uniq {-,scripts/ai-skills/hooks/plan/a.mjs}"],
	["claude", "o=-o; cat scripts/ai-skills/hooks/plan/approve.mjs | sort -s -k1000 $o a.mjs"],
	["claude", "cat scripts/ai-skills/hooks/plan/approve.mjs | sort -s -k1000 {-o,a.mjs}"],
	["claude", "cat scripts/ai-skills/hooks/plan/approve.mjs | uniq - a.mjs"],
	["claude", "cat scripts/ai-skills/hooks/plan/approve.mjs | uniq -f 1 - a.mjs"],
	["claude", "cat scripts/ai-skills/hooks/plan/approve.mjs | uniq -- - a.mjs"],
	["claude", "cat scripts/ai-skills/hooks/plan/approve.mjs | jq -R . > a.json"],
	["claude", "rg -l approve.mjs | sort | xargs node"],
	["claude", "cat scripts/ai-skills/hooks/plan/approve.mjs | cut -c1- > a.mjs"],
	["claude", "cut -c1- scripts/ai-skills/hooks/plan/approve.mjs > a.mjs"],
	...TOOLS.flatMap((tool) =>
		PROBES.map((command): [Tool, string] => [tool, command])
	),
];

for (const [tool, command] of EXEC_DENIES) {
	test(`execution arm denies ${tool}: ${command}`, () => {
		assertExecDenied(tool, shell[tool](command, makeRepo()));
	});
}

test("execution arm denies a PowerShell call with a backslash path", () => {
	assertExecDenied("claude", {
		tool_name: "PowerShell",
		tool_input: { command: "node scripts\\plan\\approve.mjs x" },
		cwd: makeRepo(),
	});
});

test("execution arm denies a Codex argv-array command", () => {
	assertExecDenied("codex", {
		tool_name: "Bash",
		tool_input: { command: ["bash", "-lc", "node scripts/ai-skills/hooks/plan/approve.mjs x"] },
		cwd: makeRepo(),
	});
});

// --- Execution arm, leg 2: the human's run leaves seeded state the agent's follow-ups pass through ---

const EXEC_PASSES: string[] = [
	'git add .prism/plans/acme-1/intent.md && git commit -m "plan: approve intent" -- .prism/plans/acme-1/intent.md',
	"git add scripts/ai-skills/hooks/plan/approve.mjs",
	"grep -n approve.mjs README.md",
	'echo "node scripts/ai-skills/hooks/plan/approve.mjs x"',
	"node scripts/ai-skills/hooks/plan/auto-approve.mjs .prism/plans/acme-1",
	"docker exec app-1 bash -lc 'cd /workspace && node scripts/ai-skills/hooks/plan/auto-approve.mjs .prism/plans/acme-1 --check'",
	"node --test scripts/ai-skills/hooks/plan/approve.test.mjs",
	"node --test scripts/ai-skills/hooks/plan/*.test.mjs",
	"pnpm test:plan",
	"rg approve.mjs",
	"cat scripts/ai-skills/hooks/plan/approve.mjs",
	"sed -n 1,20p scripts/ai-skills/hooks/plan/approve.mjs",
	"git log --oneline -- scripts/ai-skills/hooks/plan/approve.mjs",
	"env | grep approve.mjs",
	'echo "don\'t" && ls',
	"if git diff --quiet -- scripts/ai-skills/hooks/plan/approve.mjs; then echo same; fi",
	">/dev/null git log -- scripts/ai-skills/hooks/plan/approve.mjs",
	"git status # it's about approve.mjs",
	`git commit -m "$(cat <<'EOF'\nACME-648: Document approval\n\nPeople run \`${A}\` themselves.\nEOF\n)"`,
	`git commit -F - <<'EOF'\nACME-648: Document approval\n\nPeople run \`${A}\` themselves.\nEOF`,
	`gh pr create --title x --body "$(cat <<'EOF'\nAsk the person to run \`${A}\`.\nEOF\n)"`,
	`gh pr create --body 'Run \`${A}\` to approve'`,
	`gh pr create --body "Run \\\`${A}\\\` to approve"`,
	`git commit -m "Docs: run \\\`${A}\\\` yourself"`,
	// Read-only commands that name the script beside a redirect, a pipe, or a
	// later command, and a PR body written to a file.
	"git log -1 &>/dev/null -- scripts/ai-skills/hooks/plan/approve.mjs",
	"git diff -- scripts/ai-skills/hooks/plan/approve.mjs | head -20",
	"git add scripts/ai-skills/hooks/plan/approve.mjs && pnpm test:plan",
	`cat > pr-body.md <<'EOF'\nRun \`${B}\` yourself.\nEOF`,
	"git log -- scripts/ai-skills/hooks/plan/approve.mjs 2>&1 | tail -5",
	"if git diff --quiet -- scripts/ai-skills/hooks/plan/approve.mjs; then pnpm test:plan; fi",
	"diff <(git show HEAD:scripts/ai-skills/hooks/plan/approve.mjs) scripts/ai-skills/hooks/plan/approve.mjs",
	"grep -c approve.mjs README.md > /dev/null",
	`printf '%s\\n' 'Run ${B}' | gh pr comment 1 --body-file -`,
	"echo $'\\tnote: approve.mjs is human-only'",
	'git commit -q -m "Fix foo() in the approve.mjs docs"',
	// A name search piped into a filter, and file tests.
	"rg -l approve.mjs | sort",
	'grep -rn "approve.mjs" .prism | cut -d: -f1 | sort -u',
	"rg -c approve.mjs --hidden | sort -t: -k2 -n | tail",
	"git log --format=%s -- scripts/ai-skills/hooks/plan/approve.mjs | uniq -c",
	"git log --format=%s -- scripts/ai-skills/hooks/plan/approve.mjs | uniq -f 1 -c",
	"git diff --stat -- scripts/ai-skills/hooks/plan/approve.mjs | tr -s ' '",
	"rg -n approve.mjs .prism | awk -F: '{print $1}' | sort | uniq -c",
	"rg approve.mjs | nl | column -t | tac",
	"rg --json approve.mjs | jq -r .type | sort | uniq -c",
	"rg -l approve.mjs | sort > /dev/null",
	"git grep -l approve.mjs | wc -l",
	"test -f scripts/ai-skills/hooks/plan/approve.mjs && echo yes",
	"[ -f scripts/ai-skills/hooks/plan/approve.mjs ] && echo present",
];

for (const command of EXEC_PASSES) {
	for (const tool of TOOLS) {
		test(`execution arm passes after approval in ${tool}: ${command}`, () => {
			assertPasses(tool, shell[tool](command, makeRepo(APPROVED)));
		});
	}
}

// Shapes that run approve.mjs and pass, each one a known miss in the hook's
// header. A fix that closes one moves it to PROBES.
const KNOWN_MISSES: string[] = [
	"node scripts/ai-skills/hooks/plan/appr?ve.mjs x",
	"p=scripts/ai-skills/hooks/plan/appr; node ${p}ove.mjs x",
	"cat > w.mjs <<'EOF'\nimport \"./scripts/ai-skills/hooks/plan/approve.mjs\";\nEOF\nnode w.mjs",
	"git -c alias.x='!node scripts/ai-skills/hooks/plan/approve.mjs x' x",
	// A `)` inside quotes, a comment, or a case pattern within `$( … )`.
	`echo "$(echo ')'; ${B})"`,
	`echo "$(case x in x) ${B};; esac)"`,
	`echo "$(# )\n${B})"`,
	`git log -1 --format="$(echo ')' >/dev/null; ${B})" >/dev/null`,
	// A heredoc delimiter spelled `$'…'`.
	`cat <<$'EOF'\nhi\nEOF\n${B}`,
	// Shadowing the shadow check doesn't read.
	"BASH_CMDS=([git]=$(command -v node)); git scripts/ai-skills/hooks/plan/approve.mjs x",
	"BASH_CMDS+=([cat]=$(command -v node)); cat scripts/ai-skills/hooks/plan/approve.mjs x",
	"declare -n p=PATH; p=./shim:$p; git scripts/ai-skills/hooks/plan/approve.mjs x",
	'builtin hash -p "$(command -v node)" git; git scripts/ai-skills/hooks/plan/approve.mjs x',
	'command hash -p "$(command -v node)" git; git scripts/ai-skills/hooks/plan/approve.mjs x',
	"eval 'git() { node \"$@\"; }'; git scripts/ai-skills/hooks/plan/approve.mjs x",
	'eval "function cat { node \\"\\$@\\"; }"; cat scripts/ai-skills/hooks/plan/approve.mjs x',
	"builtin source <(echo 'git() { node \"$@\"; }'); git scripts/ai-skills/hooks/plan/approve.mjs x",
	// A copy to a file through a group redirect or a descriptor above 2.
	"{ cat scripts/ai-skills/hooks/plan/approve.mjs; } > scripts/ai-skills/hooks/plan/a.mjs; node scripts/ai-skills/hooks/plan/a.mjs x",
	"(cat scripts/ai-skills/hooks/plan/approve.mjs) > scripts/ai-skills/hooks/plan/a.mjs; node scripts/ai-skills/hooks/plan/a.mjs x",
	"if true; then cat scripts/ai-skills/hooks/plan/approve.mjs; fi > scripts/ai-skills/hooks/plan/a.mjs; node scripts/ai-skills/hooks/plan/a.mjs x",
	"exec 3>scripts/ai-skills/hooks/plan/a.mjs; cat scripts/ai-skills/hooks/plan/approve.mjs >&3; node scripts/ai-skills/hooks/plan/a.mjs x",
	// A token file name or prompt event name built at run time.
	"n=prism-chat-approval; echo '{}' > .git/$n.json",
	"e=UserPrompt; echo '{}' | node scripts/ai-skills/hooks/approve-guard.mjs --tool=claude --event=${e}Submit",
];

for (const command of KNOWN_MISSES) {
	test(`execution arm passes a known miss: ${command}`, () => {
		assertPasses("claude", shell.claude(command, makeRepo()));
	});
}

// Ordinary commands the guard denies on purpose, each one an accepted false
// deny in the hook's header.
const ACCEPTED_FALSE_DENIES: string[] = [
	"find scripts -name 'approve*.mjs'",
	"git grep -l approve.mjs | xargs wc -l",
	"tee pr-body.md >/dev/null <<'EOF'\nRun node scripts/ai-skills/hooks/plan/approve.mjs x\nEOF",
	'graphify explain "approve.mjs"',
	"docker exec app-1 bash -lc 'cd /workspace && grep -n stamp scripts/ai-skills/hooks/plan/approve.mjs'",
	"npx prettier --check scripts/ai-skills/hooks/plan/approve.mjs",
	"git log -- scripts/ai-skills/hooks/plan/approve.mjs > log.txt",
];

for (const command of ACCEPTED_FALSE_DENIES) {
	test(`execution arm denies an accepted false deny: ${command}`, () => {
		assertExecDenied("claude", shell.claude(command, makeRepo()));
	});
}

// --- Execution arm, leg 3: the deny's remedy, handing the command to the person, passes ---

test("execution arm passes the remedy of printing the command for the person", () => {
	const command =
		"printf 'Run: node scripts/ai-skills/hooks/plan/approve.mjs %s\\n' .prism/plans/acme-1/intent.md";
	for (const tool of TOOLS)
		assertPasses(tool, shell[tool](command, makeRepo()));
});

// --- Frontmatter arm, leg 1: the deny fires ---

const claudeEdit = (
	cwd: string,
	oldString: string,
	newString: string,
	extra: Payload = {}
): Payload => ({
	tool_name: "Edit",
	tool_input: {
		file_path: path.join(cwd, INTENT),
		old_string: oldString,
		new_string: newString,
		...extra,
	},
	cwd,
});
const claudeWrite = (
	cwd: string,
	content: string,
	relative: string = INTENT
): Payload => ({
	tool_name: "Write",
	tool_input: { file_path: path.join(cwd, relative), content },
	cwd,
});
const claudeMultiEdit = (
	cwd: string,
	edits: { old_string: string; new_string: string }[]
): Payload => ({
	tool_name: "MultiEdit",
	tool_input: { file_path: path.join(cwd, INTENT), edits },
	cwd,
});
const codexPatch = (cwd: string, patch: string): Payload => ({
	tool_name: "apply_patch",
	tool_input: { command: patch },
	cwd,
});

const FRONTMATTER_DENIES: [Tool, string, (cwd: string) => Payload][] = [
	[
		"claude",
		"an Edit turning draft into approved",
		(cwd) => claudeEdit(cwd, "status: draft", "status: approved"),
	],
	[
		"claude",
		"a Write adding approved_by",
		(cwd) =>
			claudeWrite(cwd, DRAFT.replace("size:", "approved_by: Ada\nsize:")),
	],
	[
		"claude",
		"a MultiEdit whose second edit adds approved_at",
		(cwd) =>
			claudeMultiEdit(cwd, [
				{ old_string: "Slow.", new_string: "Very slow." },
				{
					old_string: "size: standard",
					new_string: "size: standard\napproved_at: 2026-11-01",
				},
			]),
	],
	[
		"codex",
		"an apply_patch adding approved_by",
		(cwd) =>
			codexPatch(
				cwd,
				`*** Begin Patch\n*** Update File: ${INTENT}\n@@\n status: draft\n+approved_by: x\n size: standard\n*** End Patch\n`
			),
	],
	[
		"claude",
		"a Write creating a new chain file as approved",
		(cwd) => claudeWrite(cwd, APPROVED, ".prism/plans/acme-2/intent.md"),
	],
	[
		"claude",
		"an Edit with replace_all approving every status line",
		(cwd) => claudeEdit(cwd, "draft", "approved", { replace_all: true }),
	],
	[
		"claude",
		"an Edit adding a second status line",
		(cwd) =>
			claudeEdit(cwd, "size: standard", "size: standard\nstatus: approved"),
	],
	[
		"claude",
		"an Edit adding a near-miss Status line",
		(cwd) => claudeEdit(cwd, "status: draft", "Status : approved"),
	],
	[
		"claude",
		"an Edit to the same file named in upper case",
		(cwd) => ({
			...claudeEdit(cwd, "status: draft", "status: approved"),
			tool_input: {
				file_path: path.join(cwd, ".prism/plans/acme-1/INTENT.md"),
				old_string: "status: draft",
				new_string: "status: approved",
			},
		}),
	],
	[
		"claude",
		"an Edit through a relative path",
		(cwd) => ({
			tool_name: "Edit",
			tool_input: {
				file_path: INTENT,
				old_string: "status: draft",
				new_string: "status: approved",
			},
			cwd,
		}),
	],
	[
		"codex",
		"an apply_patch adding a chain file as approved",
		(cwd) =>
			codexPatch(
				cwd,
				`*** Begin Patch\n*** Add File: .prism/plans/acme-2/plan.md\n+---\n+status: approved\n+---\n*** End Patch\n`
			),
	],
	[
		"codex",
		"an apply_patch moving a file onto a chain path",
		(cwd) =>
			codexPatch(
				cwd,
				`*** Begin Patch\n*** Update File: notes.md\n*** Move to: .prism/plans/acme-2/intent.md\n@@\n-a\n+b\n*** End Patch\n`
			),
	],
	[
		"claude",
		"an Edit adding a capitalized Status line beside the draft one",
		(cwd) =>
			claudeEdit(cwd, "size: standard", "size: standard\nStatus: approved"),
	],
	[
		"claude",
		"an Edit whose old_string isn't found but swaps approval lines",
		(cwd) => claudeEdit(cwd, "status: draft  ", "status: approved"),
	],
	[
		"codex",
		"an apply_patch moving the frontmatter fence",
		(cwd) =>
			codexPatch(
				cwd,
				`*** Begin Patch\n*** Update File: ${INTENT}\n@@\n-status: draft\n-size: standard\n----\n+size: standard\n@@\n+status: draft\n*** End Patch`
			),
	],
	[
		"codex",
		"an apply_patch through its shell as a heredoc",
		(cwd) =>
			shell.codex(
				`apply_patch <<'EOF'\n*** Begin Patch\n*** Update File: ${INTENT}\n@@\n-status: draft\n+status: approved\n*** End Patch\nEOF`,
				cwd
			),
	],
	[
		"codex",
		"an apply_patch through its shell as an argv array",
		(cwd) => ({
			tool_name: "Bash",
			tool_input: {
				command: [
					"apply_patch",
					`*** Begin Patch\n*** Update File: ${INTENT}\n@@\n-status: draft\n+status: approved\n*** End Patch\n`,
				],
			},
			cwd,
		}),
	],
];

for (const [tool, label, build] of FRONTMATTER_DENIES) {
	test(`frontmatter arm denies ${label}`, () => {
		assertFrontmatterDenied(tool, build(makeRepo()));
	});
}

test("frontmatter arm denies an Edit through a symlinked directory", (t) => {
	const cwd = makeRepo();
	const link = path.join(cwd, "plan-link");
	if (!tryLink(path.join(cwd, ".prism/plans/acme-1"), link))
		return t.skip("symlinks need privilege on this Windows host");

	assertFrontmatterDenied("claude", {
		tool_name: "Edit",
		tool_input: {
			file_path: path.join(link, "intent.md"),
			old_string: "status: draft",
			new_string: "status: approved",
		},
		cwd,
	});
});

test("frontmatter arm denies an Edit to an archived chain file", () => {
	const cwd = makeRepo(null);
	const relative = ".prism/archived/plans/acme-1/plan.md";
	place(cwd, relative, DRAFT);
	assertFrontmatterDenied("claude", {
		tool_name: "Edit",
		tool_input: {
			file_path: path.join(cwd, relative),
			old_string: "status: draft",
			new_string: "status: approved",
		},
		cwd,
	});
});

test("frontmatter arm denies an Edit through an upper-case directory path", () => {
	const cwd = makeRepo(null);
	const relative = ".PRISM/PLANS/ACME-1/PLAN.MD";
	place(cwd, relative, DRAFT);
	assertFrontmatterDenied("claude", {
		tool_name: "Edit",
		tool_input: {
			file_path: path.join(cwd, relative),
			old_string: "status: draft",
			new_string: "status: approved",
		},
		cwd,
	});
});

// Both edits keep the same approval lines and move the fence above `status`,
// so only a normalized match sees the frontmatter lose its status line.
test("frontmatter arm matches a straight-quote old_string against a curly-quote file", () => {
	const cwd = makeRepo(DRAFT.replace("title: Fast search", "title: “Fast”"));
	assertFrontmatterDenied(
		"claude",
		claudeEdit(
			cwd,
			'title: "Fast"\nticket: ACME-1\nstage: intent\nstatus: draft\nsize: standard\n---',
			'title: "Fast"\nticket: ACME-1\nstage: intent\n---\nstatus: draft\nsize: standard'
		)
	);
});

test("frontmatter arm matches an LF old_string against a CRLF file", () => {
	const cwd = makeRepo(DRAFT.replace(/\n/g, "\r\n"));
	assertFrontmatterDenied(
		"claude",
		claudeEdit(
			cwd,
			"stage: intent\nstatus: draft\nsize: standard\n---",
			"stage: intent\n---\nstatus: draft\nsize: standard"
		)
	);
});

test("frontmatter arm passes an Edit whose old_string isn't found and holds no approval lines", () => {
	assertPasses("claude", claudeEdit(makeRepo(), "Not there.", "Still not."));
});

test("frontmatter arm denies a Codex Edit that turns an approved file back to draft", () => {
	const cwd = makeRepo(APPROVED);
	assertFrontmatterDenied("codex", {
		...claudeEdit(cwd, "status: approved", "status: draft"),
	});
});

test("frontmatter arm denies a Codex apply_patch that changes status in an approved file", () => {
	const cwd = makeRepo(APPROVED);
	assertFrontmatterDenied(
		"codex",
		codexPatch(
			cwd,
			`*** Begin Patch\n*** Update File: ${INTENT}\n@@\n-status: approved\n+status: draft\n*** End Patch\n`
		)
	);
});

test("frontmatter arm passes a Codex body-only Edit to an approved file", () => {
	assertPasses("codex", claudeEdit(makeRepo(APPROVED), "Slow.", "Very slow."));
});

test("frontmatter arm passes a Codex shell apply_patch that edits only the body", () => {
	const patch = `*** Begin Patch\n*** Update File: ${INTENT}\n@@\n ## Problem\n \n-Slow.\n+Very slow.\n*** End Patch`;
	assertPasses(
		"codex",
		shell.codex(`apply_patch <<'EOF'\n${patch}\nEOF`, makeRepo(APPROVED))
	);
});

test("a Codex shell apply_patch editing approve.mjs itself is not an execution", () => {
	const patch =
		"*** Begin Patch\n*** Update File: scripts/ai-skills/hooks/plan/approve.mjs\n@@\n-const a = 1;\n+const a = 2;\n*** End Patch";
	assertPasses(
		"codex",
		shell.codex(`apply_patch <<'EOF'\n${patch}\nEOF`, makeRepo())
	);
});

// --- Frontmatter arm, leg 2: a file approved on disk accepts edits that keep its approval lines ---

test("frontmatter arm passes a body-only Edit to an approved file", () => {
	assertPasses("claude", claudeEdit(makeRepo(APPROVED), "Slow.", "Very slow."));
});

test("frontmatter arm passes a full-file Write that keeps the approval lines identical", () => {
	assertPasses(
		"claude",
		claudeWrite(makeRepo(APPROVED), APPROVED.replace("Slow.", "Very slow."))
	);
});

// --- Frontmatter arm, leg 3: the remedy, editing only the body, passes ---

test("frontmatter arm passes the denied Edit re-sent with only its body change", () => {
	const cwd = makeRepo();
	assertFrontmatterDenied(
		"claude",
		claudeEdit(
			cwd,
			"status: draft\nsize: standard\n---\n\n## Problem\n\nSlow.",
			"status: approved\nsize: standard\n---\n\n## Problem\n\nVery slow."
		)
	);
	assertPasses("claude", claudeEdit(cwd, "Slow.", "Very slow."));
});

test("frontmatter arm passes a body-only apply_patch", () => {
	const patch = `*** Begin Patch\n*** Update File: ${INTENT}\n@@\n ## Problem\n \n-Slow.\n+Very slow.\n*** End Patch\n`;
	assertPasses("codex", codexPatch(makeRepo(APPROVED), patch));
});

test("frontmatter arm passes a new chain file written as a draft", () => {
	const cwd = makeRepo(null);
	assertPasses("claude", claudeWrite(cwd, DRAFT));
	assertPasses(
		"codex",
		codexPatch(
			cwd,
			`*** Begin Patch\n*** Add File: ${INTENT}\n+---\n+status: draft\n+---\n*** End Patch\n`
		)
	);
});

// --- Scope and fail-open ---

test("the claude arm declines a payload carrying Cursor's camelCase event name", () => {
	const payload = {
		...shell.claude("node scripts/ai-skills/hooks/plan/approve.mjs x", makeRepo()),
		hook_event_name: "preToolUse",
	};
	assertPasses("claude", payload);
});

test("PRISM_HOOK_DISABLE and PRISM_HOOK_DENY_DISABLE do not turn the execution arm off", () => {
	const child = runHook(
		"claude",
		shell.claude(`node ${APPROVE_COMMAND_PATH} x`, makeRepo()),
		{ env: { PRISM_HOOK_DISABLE: "1", PRISM_HOOK_DENY_DISABLE: "1" } }
	);

	assert.match(denyText(child.stdout) ?? "", /Approval is a human step/);
});

test("malformed JSON exits 0 with no stdout", () => {
	const child = runHook("claude", null, { raw: "{not json" });
	assert.equal(child.stdout, "");
	assert.notEqual(child.stderr, "");
});

test("an unknown --tool exits 0 with no stdout", () => {
	const child = runHook(
		"vim",
		shell.claude("node scripts/ai-skills/hooks/plan/approve.mjs x", makeRepo())
	);
	assert.equal(child.stdout, "");
	assert.match(child.stderr, /unknown or missing --tool "vim"/);
});

test("a command the tokenizer can't read is denied when it holds approve", () => {
	const child = runHook(
		"claude",
		shell.claude("node scripts/ai-skills/hooks/plan/approve.mjs 'x", makeRepo())
	);
	assert.match(denyText(child.stdout) ?? "", /Approval is a human step/);
	assert.match(child.stderr, /unbalanced single quote, denying/);
});

test("a command the tokenizer can't read passes when it doesn't hold approve", () => {
	const child = runHook("claude", shell.claude("echo it's", makeRepo()));
	assert.equal(child.stdout, "");
	assert.match(child.stderr, /unbalanced single quote, allowing/);
});

test("a non-chain path under an epic folder passes", () => {
	const cwd = makeRepo();
	assertPasses(
		"claude",
		claudeWrite(cwd, APPROVED, ".prism/plans/epic-acme-0000/acme-0001.md")
	);
	assertPasses(
		"claude",
		claudeWrite(cwd, APPROVED, ".prism/plans/acme-1.md")
	);
});

// --- Chat approval ---

const TOKEN = ".git/prism-chat-approval.json";
const CHAT_COMMAND = `node ${APPROVE_COMMAND_PATH} ${INTENT}`;
const PROMPT_EVENTS: Record<Tool, string> = {
	claude: "UserPromptSubmit",
	codex: "UserPromptSubmit",
};
const prompt: Record<
	Tool,
	(text: string, cwd: string, session?: string) => Payload
> = {
	claude: (text, cwd, session = "s1") => ({
		hook_event_name: "UserPromptSubmit",
		prompt: text,
		session_id: session,
		cwd,
	}),
	codex: (text, cwd, session = "s1") => ({
		hook_event_name: "UserPromptSubmit",
		prompt: text,
		session_id: session,
		turn_id: "t1",
		cwd,
	}),
};
const cursorPrompt = (text: string, cwd: string): Payload => ({
	hook_event_name: "beforeSubmitPrompt",
	prompt: text,
	conversation_id: "s1",
	workspace_roots: [cwd],
});
const sessionShell: Record<
	Tool,
	(command: string | string[], cwd: string) => Payload
> = {
	claude: (command, cwd) => ({
		...shell.claude(command, cwd),
		session_id: "s1",
	}),
	codex: (command, cwd) => ({ ...shell.codex(command, cwd), session_id: "s1" }),
};

function makeGitRepo(intentText: string | null = DRAFT): string {
	const root = makeRepo(intentText);
	execFileSync("git", ["init", "-q"], { cwd: root });

	return root;
}

function runPromptHook(tool: Tool, payload: Payload) {
	const child = spawnSync(
		process.execPath,
		[HOOK, `--tool=${tool}`, `--event=${PROMPT_EVENTS[tool]}`],
		{ input: JSON.stringify(payload), env: cleanEnv(), encoding: "utf8" }
	);
	assert.equal(child.status, 0, child.stderr);

	return child;
}

function readToken(root: string): ChatTokenFile | null {
	const file = path.join(root, TOKEN);

	return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
}

function requireToken(root: string): ChatTokenFile {
	const token = readToken(root);
	assert.ok(token, "the prompt arm wrote a token");

	return token;
}

function placeToken(root: string, fields: Partial<ChatTokenFile> = {}): void {
	place(
		root,
		TOKEN,
		JSON.stringify({
			prompted_at: new Date().toISOString(),
			session: "s1",
			path: null,
			hashes: {},
			...fields,
		})
	);
}

for (const tool of TOOLS) {
	test(`prompt arm in ${tool} writes a token for a prompt opening with approve`, () => {
		const root = makeGitRepo();
		const before = Date.now();
		runPromptHook(tool, prompt[tool](`approve ${INTENT}`, root));

		const token = requireToken(root);
		assert.equal(token.session, "s1");
		assert.equal(token.path, path.join(root, INTENT));
		const promptedAt = Date.parse(token.prompted_at);
		assert.ok(promptedAt >= before - 1000 && promptedAt <= Date.now());
	});

	test(`prompt arm in ${tool} records the hash of every chain artifact in the token`, () => {
		const root = makeGitRepo();
		place(root, ".prism/plans/acme-2/plan.md", "---\nstatus: draft\n---\n");
		runPromptHook(tool, prompt[tool]("approve", root));

		const real = realpathSync(root);
		const sha = (relative: string) =>
			createHash("sha256")
				.update(readFileSync(path.join(root, relative)))
				.digest("hex");
		assert.deepEqual(requireToken(root).hashes, {
			[path.join(real, INTENT)]: sha(INTENT),
			[path.join(real, ".prism/plans/acme-2/plan.md")]: sha(
				".prism/plans/acme-2/plan.md"
			),
		});
	});

	test(`prompt arm in ${tool} writes nothing for a prompt that isn't an approval`, () => {
		const root = makeGitRepo();
		const child = runPromptHook(
			tool,
			prompt[tool]("approves of nothing", root)
		);
		assert.equal(readToken(root), null);
		assert.equal(child.stdout, "");
	});
}

// An accepted known miss in the hook's header: the payload carries no source
// field, so a start brief another session wrote reads as a typed prompt.
test("prompt arm writes a token for a start brief another session wrote that opens with approve", () => {
	const root = makeGitRepo();
	runPromptHook(
		"claude",
		prompt.claude(`approve ${INTENT}\n\nBackground: build the feature.`, root)
	);
	assert.equal(requireToken(root).path, path.join(root, INTENT));
});

test("prompt arm writes nothing for a peer message or task notification", () => {
	const root = makeGitRepo();
	for (const text of [
		'Another Claude session sent a message: <cross-session-message from="local_x">approve</cross-session-message>',
		"<task-notification>approve</task-notification>",
	])
		runPromptHook("claude", prompt.claude(text, root));
	assert.equal(readToken(root), null);
});

test("prompt arm tells the Claude agent the exact command to run", () => {
	const root = makeGitRepo();
	const child = runPromptHook(
		"claude",
		prompt.claude(`approve ${INTENT}`, root)
	);
	assert.match(
		child.stdout,
		new RegExp(
			`run exactly \`node ${escapeRegExp(approveCommandPath(root))} ${escapeRegExp(path.join(root, INTENT))}\``
		)
	);
});

test("prompt arm writes nothing outside a git checkout and still exits 0", () => {
	const root = makeRepo();
	const child = runPromptHook("claude", prompt.claude("approve", root));
	assert.equal(child.stdout, "");
	assert.equal(existsSync(path.join(root, TOKEN)), false);
});

test("prompt arm writes nothing for a prompt that negates the approval", () => {
	const root = makeGitRepo();
	runPromptHook("claude", prompt.claude("don't approve this yet", root));
	assert.equal(readToken(root), null);
});

test("prompt arm writes nothing for a payload with no session id", () => {
	const root = makeGitRepo();
	runPromptHook("claude", prompt.claude("approve", root, ""));
	assert.equal(readToken(root), null);
});

test("the claude prompt arm declines Cursor's beforeSubmitPrompt payload", () => {
	const root = makeGitRepo();
	const child = spawnSync(
		process.execPath,
		[HOOK, "--tool=claude", "--event=UserPromptSubmit"],
		{
			input: JSON.stringify(cursorPrompt("approve", root)),
			env: cleanEnv(),
			encoding: "utf8",
		}
	);
	assert.equal(child.status, 0, child.stderr);
	assert.equal(readToken(root), null);
});

test("a tool-call event never writes a token, even with an approve prompt in the payload", () => {
	const root = makeGitRepo();
	for (const tool of TOOLS)
		runHook(tool, {
			...sessionShell[tool]("ls", root),
			...prompt[tool]("approve", root),
			hook_event_name: EVENTS[tool],
		});
	assert.equal(readToken(root), null);
});

// --- Chat approval: the execution arm lets the bare command through on a fresh token ---

for (const tool of TOOLS) {
	test(`execution arm passes the chat command in ${tool} on a fresh token from the same session`, () => {
		const root = makeGitRepo();
		placeToken(root);
		assertPasses(tool, sessionShell[tool](CHAT_COMMAND, root));
	});

	test(`execution arm passes the chat command in ${tool} on a token its own prompt arm wrote`, () => {
		const root = makeGitRepo();
		runPromptHook(tool, prompt[tool]("approve", root));
		assertPasses(tool, sessionShell[tool](CHAT_COMMAND, root));
	});
}

test("execution arm passes the chat command on a token written an hour ago", () => {
	const root = makeGitRepo();
	placeToken(root, {
		prompted_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
	});
	assertPasses("claude", sessionShell.claude(CHAT_COMMAND, root));
});

test("execution arm passes a relative chat command that resolves to the real approve.mjs", (t) => {
	const root = makeGitRepo();
	mkdirSync(path.join(root, "scripts/ai-skills/hooks/plan"), { recursive: true });
	if (
		!tryLink(
			APPROVE_PATH,
			path.join(root, "scripts/ai-skills/hooks/plan/approve.mjs")
		)
	)
		return t.skip("symlinks need privilege on this Windows host");

	placeToken(root);
	assertPasses(
		"claude",
		sessionShell.claude(`node scripts/ai-skills/hooks/plan/approve.mjs ${INTENT}`, root)
	);
});

test("execution arm denies the chat command on a fresh token when approve.mjs is a copy", () => {
	const root = makeGitRepo();
	place(root, "scripts/ai-skills/hooks/plan/approve.mjs", readFileSync(APPROVE_PATH, "utf8"));
	placeToken(root);
	assertExecDenied(
		"claude",
		sessionShell.claude(`node scripts/ai-skills/hooks/plan/approve.mjs ${INTENT}`, root)
	);
});

const CHAT_DENIES: [string, (root: string) => void, string][] = [
	["no token", () => {}, CHAT_COMMAND],
	[
		"a token from another session",
		(root) => placeToken(root, { session: "s2" }),
		CHAT_COMMAND,
	],
	[
		"an unreadable token",
		(root) => place(root, TOKEN, "approve"),
		CHAT_COMMAND,
	],
	["a fresh token and a leading cd", placeToken, `cd . && ${CHAT_COMMAND}`],
	[
		"a fresh token and a leading assignment",
		placeToken,
		`CLAUDE_CODE_SESSION_ID=s1 ${CHAT_COMMAND}`,
	],
	[
		"a fresh token and a second command",
		placeToken,
		`${CHAT_COMMAND}; echo done`,
	],
	["a fresh token and a pipe", placeToken, `${CHAT_COMMAND} | cat`],
	["a fresh token and a redirect", placeToken, `${CHAT_COMMAND} > out.txt`],
	[
		"a fresh token and an expansion",
		placeToken,
		`node ${APPROVE_COMMAND_PATH} $(echo ${INTENT})`,
	],
	[
		"a fresh token and a quoted path",
		placeToken,
		`node '${APPROVE_COMMAND_PATH}' ${INTENT}`,
	],
	[
		"a fresh token and a node option",
		placeToken,
		`node --import x ${APPROVE_COMMAND_PATH} ${INTENT}`,
	],
	["a fresh token and an extra argument", placeToken, `${CHAT_COMMAND} y`],
	[
		"a fresh token and a script path that doesn't exist",
		placeToken,
		`node scripts/ai-skills/hooks/plan/approve.mjs ${INTENT}`,
	],
	[
		"a fresh token and the copy written beside it",
		placeToken,
		`cp ${APPROVE_COMMAND_PATH} scripts/ai-skills/hooks/plan/approve.mjs; node scripts/ai-skills/hooks/plan/approve.mjs ${INTENT}`,
	],
];

for (const [label, setup, command] of CHAT_DENIES) {
	test(`execution arm denies the chat command with ${label}`, () => {
		const root = makeGitRepo();
		setup(root);
		assertExecDenied("claude", sessionShell.claude(command, root));
	});
}

test("execution arm denies the chat command when the payload carries no session id", () => {
	const root = makeGitRepo();
	placeToken(root);
	assertExecDenied("claude", shell.claude(CHAT_COMMAND, root));
});

test("execution arm passes a Codex argv-array chat command on a fresh token", () => {
	const root = makeGitRepo();
	placeToken(root);
	assertPasses("codex", {
		...sessionShell.codex(["node", APPROVE_COMMAND_PATH, INTENT], root),
	});
});

test("execution arm denies a Codex argv-array chat command with a fourth word", () => {
	const root = makeGitRepo();
	placeToken(root);
	assertExecDenied(
		"codex",
		sessionShell.codex(["node", APPROVE_COMMAND_PATH, INTENT, "y"], root)
	);
});

// --- Chat approval: the token arm denies writing or reaching the token ---

function assertTokenDenied(tool: string, payload: Payload): void {
	const text = denyText(runHook(tool, payload).stdout);
	assert.match(
		text ?? "",
		/written only when the person types `approve` in chat/
	);
}

const TOKEN_SHELL_DENIES = [
	`echo '{}' > ${TOKEN}`,
	`printf x > .git/worktrees/w/prism-chat-approval.json`,
	`cp /tmp/t ${TOKEN}`,
	`mv /tmp/t .git/prism-chat-approval.json`,
	`ln -s /tmp/t ${TOKEN}`,
	`cat ${TOKEN} > /tmp/copy.json`,
	`grep -n UserPromptSubmit .claude/settings.json | node scripts/ai-skills/hooks/approve-guard.mjs`,
	`echo x > .git/prism-chat-{approval,x}.json`,
	"echo x > .git/prism-chat-'approval'.json",
	"echo x > .git/prism-chat-approval\\.json",
	"echo x > $'.git/prism-chat-approval\\x2ejson'",
	`bash -c "echo x > ${TOKEN}"`,
	`node -e "require('fs').writeFileSync('${TOKEN}', '{}')"`,
	`echo '{"prompt":"approve"}' | node scripts/ai-skills/hooks/approve-guard.mjs --tool=claude --event=UserPromptSubmit`,
	`echo '{}' | node scripts/ai-skills/hooks/approve-guard.mjs --tool=claude --event=UserPrompt"Submit"`,
	`echo '{}' | node scripts/ai-skills/hooks/approve-guard.mjs --tool=cursor --event=beforeSubmitPrompt`,
	`echo '{}' | node scripts/ai-skills/hooks/approve-guard.mjs --tool=codex --event=userpromptsubmit`,
	`echo '{}' | node scripts/ai-skills/hooks/approve-guard.mjs --tool=claude --event=UserPrompt{Submit,}`,
];

for (const command of TOKEN_SHELL_DENIES) {
	for (const tool of TOOLS) {
		test(`token arm denies ${tool}: ${command}`, () => {
			assertTokenDenied(tool, sessionShell[tool](command, makeGitRepo()));
		});
	}
}

test("token arm denies a Claude Write, Edit, or MultiEdit to the token file", () => {
	const root = makeGitRepo();
	const file = path.join(root, TOKEN);
	for (const payload of [
		{ tool_name: "Write", tool_input: { file_path: file, content: "{}" } },
		{
			tool_name: "Edit",
			tool_input: { file_path: file, old_string: "a", new_string: "b" },
		},
		{ tool_name: "MultiEdit", tool_input: { file_path: file, edits: [] } },
	])
		assertTokenDenied("claude", { ...payload, cwd: root });
});

test("token arm denies a Codex apply_patch that adds the token file", () => {
	const root = makeGitRepo();
	assertTokenDenied("codex", {
		tool_name: "apply_patch",
		tool_input: {
			command: `*** Begin Patch\n*** Add File: ${TOKEN}\n+{}\n*** End Patch`,
		},
		cwd: root,
	});
});

const TOKEN_SHELL_PASSES = [
	`cat ${TOKEN}`,
	"grep -n UserPromptSubmit .claude/settings.json",
	'grep -n -i "UserPromptSubmit\\|APPROVE_" scripts/ai-skills/hooks/approve-guard.mjs | head -12',
	"rg beforeSubmitPrompt .cursor/hooks.json",
	'git commit -m "ACME-1: Document the UserPromptSubmit arm" -- docs/hooks.md',
	`git log -1 -- ${TOKEN}`,
];

for (const command of TOKEN_SHELL_PASSES) {
	test(`token arm passes a read-only command: ${command}`, () => {
		assertPasses("claude", sessionShell.claude(command, makeGitRepo()));
	});
}

test("token arm passes a commit message saying submit inside syntax it can't read", () => {
	assertPasses(
		"claude",
		sessionShell.claude(
			"git commit -m \"$(cat <<'EOF'\nThe prompt-submit arm reads the worktree's git dir.\nEOF\n)\"",
			makeGitRepo()
		)
	);
});

test("token arm passes a file edit whose content, not target, names a prompt event", () => {
	const root = makeGitRepo();
	assertPasses("claude", {
		tool_name: "Write",
		tool_input: {
			file_path: path.join(root, ".claude/settings.json"),
			content: '{ "hooks": { "UserPromptSubmit": [] } }',
		},
		cwd: root,
	});
});
