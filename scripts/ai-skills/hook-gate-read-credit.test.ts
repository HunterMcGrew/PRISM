/**
 * The write gate's read-credit contract under three conditions the main gate
 * suite does not reach: a tool batch that runs its hook processes at once, a
 * command that changes directory before it reads or writes, and text a
 * command reads on stdin through a heredoc.
 *
 * It imports nothing the gate added for these cases, so it also runs against
 * an older `hooks/` tree and shows which rows that tree fails.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

import { loadRouteState } from "./hooks/architect-route.mjs";
import { runPostToolUseArm, runPreToolUseArm } from "./hooks/hook.mjs";
import { HARNESSES } from "./hooks/harnesses.mjs";

const entryPoint = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"hooks",
	"hook.mjs"
);

const GATE_DOC = "_toolkit/spec-editing.md";

async function withGateRepo<T>(build: (repoRoot: string) => Promise<T>): Promise<T> {
	const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "prism-read-credit-"));
	try {
		const architectDir = path.join(repoRoot, ".prism", "architect");
		await fs.mkdir(path.join(architectDir, "_toolkit"), { recursive: true });
		await fs.mkdir(path.join(repoRoot, "src"), { recursive: true });
		await fs.writeFile(
			path.join(architectDir, "manifest.json"),
			JSON.stringify({ "src/**": GATE_DOC })
		);
		await fs.writeFile(path.join(architectDir, GATE_DOC), "Spec editing constraints.\n");
		return await build(repoRoot);
	} finally {
		await fs.rm(repoRoot, { force: true, recursive: true });
	}
}

function shellPayload(repoRoot: string, command: string, cwd = repoRoot): string {
	return JSON.stringify({
		session_id: "session-1",
		cwd,
		tool_name: "Bash",
		tool_input: { command },
	});
}

async function runGate(repoRoot: string, command: string, cwd = repoRoot): Promise<string | null> {
	const result = await runPreToolUseArm(
		"claude",
		HARNESSES.claude,
		shellPayload(repoRoot, command, cwd)
	);
	return result === null
		? null
		: JSON.parse(result).hookSpecificOutput.permissionDecisionReason;
}

async function runRead(repoRoot: string, command: string, cwd = repoRoot): Promise<string[]> {
	await runPostToolUseArm("claude", HARNESSES.claude, shellPayload(repoRoot, command, cwd));
	return (await loadRouteState(repoRoot, "session-1")).read;
}

function spawnPostToolUse(stdin: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const child = spawn(process.execPath, [entryPoint, "--tool=claude"]);
		child.on("error", reject);
		child.on("close", () => resolve());
		child.stdin.end(stdin);
	});
}

// --- Concurrent reads ---

test("reads a tool batch runs at once are all credited", async () => {
	await withGateRepo(async (repoRoot) => {
		const docs = Array.from({ length: 8 }, (_, index) => `_toolkit/doc-${index}.md`);
		for (const doc of docs) {
			await fs.writeFile(path.join(repoRoot, ".prism", "architect", doc), `${doc}\n`);
		}

		await Promise.all(
			docs.map((doc) => spawnPostToolUse(shellPayload(repoRoot, `cat .prism/architect/${doc}`)))
		);

		const { read } = await loadRouteState(repoRoot, "session-1");
		assert.deepEqual([...read].sort(), [...docs].sort());
	});
});

// --- A literal cd ---

test("a cat behind a cd credits the doc it reads from the new directory", async () => {
	await withGateRepo(async (repoRoot) => {
		const read = await runRead(
			repoRoot,
			`cd ${repoRoot.split(path.sep).join("/")} && cat .prism/architect/${GATE_DOC}`,
			path.join(repoRoot, "src")
		);
		assert.deepEqual(read, [GATE_DOC]);
	});
});

test("a cat behind a cd resolves its operand inside the cd target, not the starting directory", async () => {
	await withGateRepo(async (repoRoot) => {
		assert.deepEqual(await runRead(repoRoot, `cd src && cat .prism/architect/${GATE_DOC}`), []);
		assert.deepEqual(await runRead(repoRoot, `cd src; cat .prism/architect/${GATE_DOC}`), []);
	});
});

test("a cd whose target the hook cannot know credits nothing after it", async () => {
	await withGateRepo(async (repoRoot) => {
		for (const command of [
			`cd - && cat .prism/architect/${GATE_DOC}`,
			`cd && cat .prism/architect/${GATE_DOC}`,
			`cd ~/repo && cat .prism/architect/${GATE_DOC}`,
		]) {
			assert.deepEqual(await runRead(repoRoot, command), [], command);
		}
	});
});

test("a write reached through a cd is denied like the same write spelled from the root", async () => {
	await withGateRepo(async (repoRoot) => {
		assert.match((await runGate(repoRoot, "tee src/index.ts")) ?? "", /src\/index\.ts/);

		for (const command of ["cd src && tee index.ts", "cd src; rm index.ts", "cd src/ && cd . && tee index.ts"]) {
			assert.match((await runGate(repoRoot, command)) ?? "", /src\/index\.ts/, command);
		}
	});
});

test("a read-only command run from inside a routed directory is not gated on its own command words", async () => {
	await withGateRepo(async (repoRoot) => {
		const routedCwd = path.join(repoRoot, "src");
		assert.equal(await runGate(repoRoot, "cat index.ts", routedCwd), null);
		assert.equal(await runGate(repoRoot, "grep -rn foo .", routedCwd), null);
		assert.match(
			(await runGate(repoRoot, "tee index.ts", routedCwd)) ?? "",
			/spec-editing\.md/,
			"a write from the same directory still gates"
		);
	});
});

test("a read behind a cd stays exempt from the gate", async () => {
	await withGateRepo(async (repoRoot) => {
		assert.equal(await runGate(repoRoot, "cd src && cat index.ts"), null);
		assert.equal(await runGate(repoRoot, "cd src && grep -n foo index.ts"), null);
	});
});

// --- Heredoc text on stdin ---

test("comment text a gh call reads on stdin is not read as paths", async () => {
	await withGateRepo(async (repoRoot) => {
		const command =
			"gh api -X PATCH repos/o/r/issues/comments/6989296224 --input - <<'EOF'\n" +
			'{"body": "Moved the check out of src/index.ts and into src"}\n' +
			"EOF";
		assert.equal(await runGate(repoRoot, command), null);

		const viaCat = "cat > /tmp/body.md <<'EOF'\nTouches src/index.ts.\nEOF";
		assert.equal(await runGate(repoRoot, viaCat), null);
	});
});

test("heredoc text something runs, or pipes on to something that runs it, is still read as paths", async () => {
	await withGateRepo(async (repoRoot) => {
		for (const command of [
			"bash <<'EOF'\nrm src/index.ts\nEOF",
			"cat <<'EOF' | sh\nrm src/index.ts\nEOF",
			"cat <<EOF\n$(rm src/index.ts)\nEOF",
			"<<'EOF' cat\nsrc/index.ts\nEOF",
		]) {
			assert.match((await runGate(repoRoot, command)) ?? "", /src\/index\.ts/, command);
		}
	});
});

test("a path on a data reader's own command line still gates", async () => {
	await withGateRepo(async (repoRoot) => {
		for (const command of [
			"tee src/index.ts <<'EOF'\nhello\nEOF",
			"cat > src/index.ts <<'EOF'\nhello\nEOF",
		]) {
			assert.match((await runGate(repoRoot, command)) ?? "", /src\/index\.ts/, command);
		}
	});
});

// --- What counts ---

test("the deny says a redirected or piped read does not count", async () => {
	await withGateRepo(async (repoRoot) => {
		const reason = (await runGate(repoRoot, "cat src/index.ts > /dev/null")) ?? "";
		assert.match(reason, /redirected or piped `cat`/);
		assert.match(reason, /Read tool with no offset or limit/);
	});
});
