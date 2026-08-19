/**
 * Regression suite for the multi-host hook entry point. Covers the
 * `PostToolUse` announce arm's contract — announce-once emission, the
 * `PRISM_HOOK_DISABLE` kill switch, the foreign-payload guard, the early
 * exits on a missing file path or session id, and how each harness
 * classifies a tool name.
 *
 * The cold-start leg proves the zero-dependency delivery claim against
 * packaged `npm pack` output rather than the source tree: a leg run under
 * `tsx` with `node_modules` present could not tell the two apart. It carries
 * its own negative control, which breaks real delivered state and asserts
 * the leg's own checks reject it.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";
import assert from "node:assert/strict";

import {
	resolveHarnessFromArgv,
	runPostCompactArm,
	runPostToolUseArm,
} from "./hooks/hook.mjs";
import { HARNESSES, resolveToolKind } from "./hooks/harnesses.mjs";

const execFileAsync = promisify(execFile);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "..", "..");

async function withTempRepo<T>(
	build: (repoRoot: string) => Promise<T>
): Promise<T> {
	const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "prism-hook-gate-"));
	try {
		return await build(tempRoot);
	} finally {
		await fs.rm(tempRoot, { force: true, recursive: true });
	}
}

async function seedManifestAndDoc(
	repoRoot: string,
	manifest: Record<string, string | string[]>,
	docRelativePath: string,
	docBody: string
): Promise<void> {
	const architectDir = path.join(repoRoot, ".prism", "architect");
	await fs.mkdir(architectDir, { recursive: true });
	await fs.writeFile(
		path.join(architectDir, "manifest.json"),
		JSON.stringify(manifest, null, "\t"),
		"utf8"
	);
	const docPath = path.join(architectDir, docRelativePath);
	await fs.mkdir(path.dirname(docPath), { recursive: true });
	await fs.writeFile(docPath, docBody, "utf8");
}

// --- Adapter-level payload handling ---

test("runPostToolUseArm: PRISM_HOOK_DISABLE=1 returns null even with a matching doc", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifestAndDoc(
			repoRoot,
			{ "scripts/ai-skills/**": "_toolkit/spec-editing.md" },
			"_toolkit/spec-editing.md",
			"Spec editing constraints go here."
		);
		const stdin = JSON.stringify({
			session_id: "session-1",
			cwd: repoRoot,
			tool_name: "Read",
			tool_input: { file_path: path.join(repoRoot, "scripts", "ai-skills", "build.ts") },
		});

		process.env.PRISM_HOOK_DISABLE = "1";
		try {
			const result = await runPostToolUseArm("claude", HARNESSES.claude, stdin);
			assert.equal(result, null);
		} finally {
			delete process.env.PRISM_HOOK_DISABLE;
		}
	});
});

test("runPostToolUseArm: a matching doc produces Claude Code's hookSpecificOutput shape", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifestAndDoc(
			repoRoot,
			{ "scripts/ai-skills/**": "_toolkit/spec-editing.md" },
			"_toolkit/spec-editing.md",
			"Spec editing constraints go here."
		);
		const stdin = JSON.stringify({
			session_id: "session-1",
			cwd: repoRoot,
			tool_name: "Read",
			tool_input: { file_path: path.join(repoRoot, "scripts", "ai-skills", "build.ts") },
		});

		const result = await runPostToolUseArm("claude", HARNESSES.claude, stdin);
		assert.ok(result, "expected a non-null result for a matching doc");
		const parsed = JSON.parse(result as string);

		assert.equal(parsed.hookSpecificOutput.hookEventName, "PostToolUse");
		assert.match(
			parsed.hookSpecificOutput.additionalContext,
			/_toolkit\/spec-editing\.md/
		);
		assert.doesNotMatch(
			parsed.hookSpecificOutput.additionalContext,
			/Spec editing constraints go here\./,
			"the arm forwards an announcement naming the doc's path, never its body"
		);
	});
});

test("runPostToolUseArm: no manifest match returns null", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifestAndDoc(
			repoRoot,
			{ "scripts/ai-skills/**": "_toolkit/spec-editing.md" },
			"_toolkit/spec-editing.md",
			"Spec editing constraints go here."
		);
		const stdin = JSON.stringify({
			session_id: "session-1",
			cwd: repoRoot,
			tool_name: "Read",
			tool_input: { file_path: path.join(repoRoot, "README.md") },
		});

		const result = await runPostToolUseArm("claude", HARNESSES.claude, stdin);
		assert.equal(result, null);
	});
});

test("runPostToolUseArm: missing file_path returns null — no session id ever denies, and neither does a missing path", async () => {
	const stdin = JSON.stringify({ session_id: "session-1", cwd: "/repo" });
	const result = await runPostToolUseArm("claude", HARNESSES.claude, stdin);
	assert.equal(result, null);
});

test("runPostToolUseArm: missing session_id returns null", async () => {
	const stdin = JSON.stringify({
		cwd: "/repo",
		tool_input: { file_path: "/repo/README.md" },
	});
	const result = await runPostToolUseArm("claude", HARNESSES.claude, stdin);
	assert.equal(result, null);
});

test("runPostToolUseArm: malformed stdin JSON is caught and returns null rather than throwing", async () => {
	const result = await runPostToolUseArm("claude", HARNESSES.claude, "{not valid json");
	assert.equal(result, null);
});

// --- Announce-once ---

test("runPostToolUseArm: a doc is announced once per session, then stays silent on repeat reads of the matched path", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifestAndDoc(
			repoRoot,
			{ "scripts/ai-skills/**": "_toolkit/spec-editing.md" },
			"_toolkit/spec-editing.md",
			"Spec editing constraints go here."
		);
		const stdin = JSON.stringify({
			session_id: "session-1",
			cwd: repoRoot,
			tool_name: "Read",
			tool_input: { file_path: path.join(repoRoot, "scripts", "ai-skills", "build.ts") },
		});

		const first = await runPostToolUseArm("claude", HARNESSES.claude, stdin);
		const second = await runPostToolUseArm("claude", HARNESSES.claude, stdin);

		assert.ok(first, "first read announces");
		assert.equal(second, null, "the doc was already announced this session — no repeat");
	});
});

// --- Foreign-payload guard ---

test("runPostToolUseArm: a claude-registered payload carrying a Cursor event name is dropped as foreign", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifestAndDoc(
			repoRoot,
			{ "scripts/ai-skills/**": "_toolkit/spec-editing.md" },
			"_toolkit/spec-editing.md",
			"Spec editing constraints go here."
		);
		const stdin = JSON.stringify({
			session_id: "session-1",
			cwd: repoRoot,
			hook_event_name: "postToolUse",
			tool_name: "Read",
			tool_input: { file_path: path.join(repoRoot, "scripts", "ai-skills", "build.ts") },
		});

		const result = await runPostToolUseArm("claude", HARNESSES.claude, stdin);
		assert.equal(
			result,
			null,
			"a camelCase Cursor event name arriving on the claude row is Cursor's third-party-config re-run — dropped rather than double-counted"
		);
	});
});

test("runPostToolUseArm: the same camelCase event name on the cursor row is not foreign", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifestAndDoc(
			repoRoot,
			{ "scripts/ai-skills/**": "_toolkit/spec-editing.md" },
			"_toolkit/spec-editing.md",
			"Spec editing constraints go here."
		);
		const stdin = JSON.stringify({
			conversation_id: "session-1",
			cwd: repoRoot,
			hook_event_name: "postToolUse",
			tool_name: "Read",
			tool_input: { file_path: path.join(repoRoot, "scripts", "ai-skills", "build.ts") },
		});

		const result = await runPostToolUseArm("cursor", HARNESSES.cursor, stdin);
		assert.ok(result, "cursor's own registration is never foreign to itself");
	});
});

// --- PostCompact reset ---

test("runPostCompactArm: with a session id, deletes that session's state file so docs re-announce", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifestAndDoc(
			repoRoot,
			{ "scripts/ai-skills/**": "_toolkit/spec-editing.md" },
			"_toolkit/spec-editing.md",
			"Spec editing constraints go here."
		);
		const readStdin = JSON.stringify({
			session_id: "session-1",
			cwd: repoRoot,
			tool_name: "Read",
			tool_input: { file_path: path.join(repoRoot, "scripts", "ai-skills", "build.ts") },
		});
		await runPostToolUseArm("claude", HARNESSES.claude, readStdin);

		const statePath = path.join(repoRoot, ".prism", "architect-route-state.session-1.json");
		await assert.doesNotReject(fs.access(statePath), "state file exists after the first announce");

		await runPostCompactArm(JSON.stringify({ session_id: "session-1", cwd: repoRoot }));
		await assert.rejects(fs.access(statePath), "PostCompact deletes the session's state file");

		const second = await runPostToolUseArm("claude", HARNESSES.claude, readStdin);
		assert.ok(second, "the doc re-announces after the compaction reset");
	});
});

test("runPostCompactArm: with no session id, is a no-op that does not throw", async () => {
	await assert.doesNotReject(runPostCompactArm(JSON.stringify({ cwd: "/repo" })));
});

// --- Harness resolution ---

test("resolveHarnessFromArgv: a well-formed --tool= flag resolves to its harness", () => {
	const resolved = resolveHarnessFromArgv(["--tool=claude"]);
	assert.equal(resolved?.tool, "claude");
	assert.equal(resolved?.spec, HARNESSES.claude);
});

test("resolveHarnessFromArgv: an unknown or absent tool returns null", () => {
	assert.equal(
		resolveHarnessFromArgv(["--tool=notreal"]),
		null,
		"a --tool= value with no matching HARNESSES row resolves to null"
	);
	assert.equal(
		resolveHarnessFromArgv([]),
		null,
		"no --tool= flag at all resolves to null"
	);
});

// --- Cold-start integration leg ---

/**
 * Every property an adopted consumer must hold for hook delivery to work:
 * the `.prism/` content landed, the runtime is present and executable, both
 * registrations reached the consumer's settings, both state-file globs reached
 * its `.gitignore`, and the delivered entry point runs under plain `node`.
 *
 * A named function rather than a block of inline assertions so the leg's
 * negative control can break real delivered state and re-run these exact
 * checks. A control that re-implements the assertions proves only that its
 * copy fails.
 */
async function assertAdoptedConsumerState(consumerRoot: string): Promise<void> {
	await fs.access(path.join(consumerRoot, ".prism", "architect", "manifest.json"));
	await fs.access(path.join(consumerRoot, ".prism", "SPEC.md"));

	const hookPath = path.join(consumerRoot, ".claude", "hooks", "hook.mjs");
	await fs.access(hookPath);
	const hookStat = await fs.stat(hookPath);
	assert.equal(
		hookStat.mode & 0o111,
		0o111,
		"the delivered hook entry point is executable"
	);

	const settings = JSON.parse(
		await fs.readFile(path.join(consumerRoot, ".claude", "settings.json"), "utf8")
	);
	assert.ok(settings.hooks.PostToolUse, "PostToolUse registration delivered");
	assert.ok(settings.hooks.PostCompact, "PostCompact registration delivered");

	// Both globs asserted as whole lines. A `match` on the first pattern alone
	// also matches the `.tmp` line as a substring, so neither line would be
	// distinctly proven.
	const gitignoreLines = (
		await fs.readFile(path.join(consumerRoot, ".gitignore"), "utf8")
	)
		.split("\n")
		.map((line) => line.trim());
	for (const expected of [
		".prism/architect-route-state.*.json",
		".prism/architect-route-state.*.json.tmp",
	]) {
		assert.equal(
			gitignoreLines.filter((line) => line === expected).length,
			1,
			`${expected} is present exactly once in the consumer's .gitignore`
		);
	}

	const hookInvocation = spawnSync("node", [hookPath, "--tool=claude"], {
		input: JSON.stringify({
			session_id: "cold-start-session",
			cwd: consumerRoot,
			tool_name: "Read",
			tool_input: { file_path: path.join(consumerRoot, "README.md") },
		}),
		encoding: "utf8",
	});
	assert.equal(
		hookInvocation.status,
		0,
		`the delivered hook exited non-zero under plain node: ${hookInvocation.stderr}`
	);
}

// The claim this leg proves is POSIX-shaped and cannot hold on Windows:
// `fs.chmod` there toggles only the read-only attribute, so a delivered
// `hook.mjs` reports mode `0o100666` and the executable-bit assertion below
// can never pass. The leg also shells out to `tar` and spends most of a 120s
// budget inside `npm pack` (which runs `prepack: prism:bundle`), which is not
// a budget a Windows runner reliably meets. Both other CI legs run it.
const skipColdStartOnWindows = process.platform === "win32";

test(
	"cold-start: a packaged tarball delivers a working hook into a fresh consumer with no node_modules",
	{ timeout: 120_000, skip: skipColdStartOnWindows },
	async () => {
		const packOutput = await execFileAsync("npm", ["pack", "--json"], {
			cwd: repoRoot,
			shell: process.platform === "win32",
		});
		const packed = JSON.parse(
			packOutput.stdout.slice(packOutput.stdout.indexOf("["))
		) as { filename: string }[];
		const tarballName = packed[0].filename;
		const tarballPath = path.join(repoRoot, tarballName);

		// The cleanup wraps both `withTempRepo` calls, not the inner body: a
		// failure inside either `mkdtemp` would otherwise leave the packed
		// tarball sitting in the repo root.
		try {
			await withTempRepo(async (extractRoot) => {
				await withTempRepo(async (consumerRoot) => {
					await execFileAsync("tar", ["-xzf", tarballPath, "-C", extractRoot]);
					const packageRoot = path.join(extractRoot, "package");

					await execFileAsync("git", ["init", "-q"], { cwd: consumerRoot });
					await fs.mkdir(path.join(consumerRoot, ".ai-skills"), { recursive: true });
					await fs.writeFile(
						path.join(consumerRoot, ".ai-skills", "config.json"),
						JSON.stringify(
							{
								org: "test-org",
								project: "test-project",
								ticketPrefix: "TEST",
								ticketSystem: { kind: "github-issues" },
								github: { owner: "test-owner", repo: "test-repo" },
								defaultBranch: "main",
							},
							null,
							"\t"
						),
						"utf8"
					);

					// Invokes the packaged CLI as a real consumer would — `node
					// dist/cli.js adopt` from the extracted tarball, no node_modules,
					// no tsx. This is the assertion that actually proves the
					// zero-dependency claim, not just that the files exist.
					await execFileAsync(
						"node",
						[
							path.join(packageRoot, "dist", "cli.js"),
							"adopt",
							"--consumer",
							consumerRoot,
							"--prism-source",
							packageRoot,
						],
						{ cwd: consumerRoot }
					);

					await assertAdoptedConsumerState(consumerRoot);

					// The negative control A7 asks for. It breaks real delivered
					// state and confirms the very same checks that just passed
					// now fail — so a future regression that stopped delivering
					// the gitignore lines or the registrations could not slip
					// past this leg. Asserting that `assert.equal(1, 2)` throws
					// would only establish that `node:assert` works, and would
					// still pass with this whole leg deleted.
					const gitignorePath = path.join(consumerRoot, ".gitignore");
					const deliveredGitignore = await fs.readFile(gitignorePath, "utf8");
					await fs.writeFile(
						gitignorePath,
						deliveredGitignore
							.split("\n")
							.filter((line) => !line.includes("architect-route-state"))
							.join("\n"),
						"utf8"
					);
					await assert.rejects(
						assertAdoptedConsumerState(consumerRoot),
						"removing the delivered gitignore lines must fail this leg"
					);
					await fs.writeFile(gitignorePath, deliveredGitignore, "utf8");

					const settingsPath = path.join(consumerRoot, ".claude", "settings.json");
					const deliveredSettings = await fs.readFile(settingsPath, "utf8");
					await fs.writeFile(settingsPath, JSON.stringify({ hooks: {} }), "utf8");
					await assert.rejects(
						assertAdoptedConsumerState(consumerRoot),
						"dropping the delivered registrations must fail this leg"
					);
					await fs.writeFile(settingsPath, deliveredSettings, "utf8");

					await assertAdoptedConsumerState(consumerRoot);
				});
			});
		} finally {
			await fs.rm(tarballPath, { force: true });
		}
	}
);

// --- Tool-kind classification ---

test("resolveToolKind: a listed tool name resolves to the kind its harness maps it to", () => {
	assert.equal(resolveToolKind(HARNESSES.claude, "Read"), "read");
	assert.equal(resolveToolKind(HARNESSES.claude, "Bash"), "shell");
	assert.equal(resolveToolKind(HARNESSES.claude, "Grep"), "search");
	assert.equal(resolveToolKind(HARNESSES.codex, "apply_patch"), "write");
});

test("resolveToolKind: an unlisted or absent tool name falls back to write", () => {
	// The fallback is the behavior a write-time deny gate narrows against —
	// it denies only on a `write` resolved from an explicitly listed name, so
	// what this default returns decides which tools such a gate must ignore.
	assert.equal(resolveToolKind(HARNESSES.cursor, "StrReplace"), "write");
	assert.equal(resolveToolKind(HARNESSES.claude, "SomeToolNobodyMapped"), "write");
	assert.equal(resolveToolKind(HARNESSES.claude, undefined), "write");
});

// --- Standalone process spawn (runs on every platform, including Windows) ---

/**
 * The cold-start leg above is the only place that spawns `hook.mjs` as its
 * own process, and it is skipped on `win32` (see `skipColdStartOnWindows`)
 * because packaging and the executable-bit assertion can't hold there. That
 * leaves "the delivered entry point runs under plain `node`" with zero
 * Windows coverage — everything else calls `runPostToolUseArm` in-process.
 * This spawns `hook.mjs` straight from the source tree, no `npm pack` or
 * `tar` involved, so it carries that one property on every platform.
 */
test("hook.mjs runs as its own process under plain node, from the source tree", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifestAndDoc(
			repoRoot,
			{ "scripts/ai-skills/**": "_toolkit/spec-editing.md" },
			"_toolkit/spec-editing.md",
			"Spec editing constraints go here."
		);
		const hookPath = path.join(scriptDirectory, "hooks", "hook.mjs");

		const result = spawnSync("node", [hookPath, "--tool=claude"], {
			input: JSON.stringify({
				session_id: "standalone-spawn-session",
				cwd: repoRoot,
				tool_name: "Read",
				tool_input: {
					file_path: path.join(repoRoot, "scripts", "ai-skills", "build.ts"),
				},
			}),
			encoding: "utf8",
		});

		assert.equal(
			result.status,
			0,
			`hook.mjs exited non-zero under plain node: ${result.stderr}`
		);
		// Every hook.mjs failure path writes nothing and exits 0, so exit 0
		// alone cannot tell a completed announce arm from a fail-open early
		// return. The announcement itself is what proves the arm ran.
		assert.match(
			result.stdout,
			/_toolkit\/spec-editing\.md/,
			`the spawned hook announced nothing: ${result.stdout || "(empty)"}`
		);
	});
});
