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
	loadRouteState,
	matchDocsForPath,
	saveRouteState,
} from "./hooks/architect-route.mjs";
import {
	GIT_INSPECTION_SUBCOMMANDS,
	parseShellReadTargets,
	parseUnprovenShellPaths,
	SHELL_INSPECTION_COMMANDS,
	resolveHarnessFromArgv,
	runPostCompactArm,
	runPostToolUseArm,
	runPreToolUseArm,
} from "./hooks/hook.mjs";
import {
	HARNESSES,
	resolveListedToolKind,
	resolveToolKind,
} from "./hooks/harnesses.mjs";

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

test("runPostToolUseArm: a payload with no session id announces nothing", async () => {
	// Against a repo whose manifest does route the named path — pointed at a
	// root with no manifest, the load failure returns null on its own and the
	// session-id guard is never what the assertion rests on.
	await withTempRepo(async (repoRoot) => {
		await seedCreditRepo(repoRoot);
		const routedPath = path.join(repoRoot, "scripts", "ai-skills", "build.ts");

		assert.ok(
			await runPostToolUseArm(
				"claude",
				HARNESSES.claude,
				JSON.stringify({
					session_id: "session-1",
					cwd: repoRoot,
					tool_name: "Read",
					tool_input: { file_path: routedPath },
				})
			),
			"the same payload with a session id does announce"
		);

		assert.equal(
			await runPostToolUseArm(
				"claude",
				HARNESSES.claude,
				JSON.stringify({
					cwd: repoRoot,
					tool_name: "Read",
					tool_input: { file_path: routedPath },
				})
			),
			null,
			"with no scope to record against, there is nothing to announce once"
		);

		// Claude's own "nothing to report" is `null`, which is also what the
		// outer catch returns — so on Claude alone the guard cannot be told
		// apart from the TypeError a null scope id would throw downstream.
		// Cursor's empty envelope is a distinct value, and only the guard
		// produces it.
		assert.equal(
			await runPostToolUseArm(
				"cursor",
				HARNESSES.cursor,
				JSON.stringify({
					cwd: repoRoot,
					tool_name: "Read",
					tool_input: { file_path: routedPath },
				})
			),
			"{}",
			"the missing scope id returns the harness's own no-op, not a caught failure"
		);
	});
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

test("runPostToolUseArm: a subagent's read announces on its own budget, not the parent's", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifestAndDoc(
			repoRoot,
			{ "scripts/ai-skills/**": "_toolkit/spec-editing.md" },
			"_toolkit/spec-editing.md",
			"Spec editing constraints go here."
		);
		const filePath = path.join(repoRoot, "scripts", "ai-skills", "build.ts");
		const parentStdin = JSON.stringify({
			session_id: "session-1",
			cwd: repoRoot,
			tool_name: "Read",
			tool_input: { file_path: filePath },
		});
		const childStdin = JSON.stringify({
			session_id: "session-1",
			agent_id: "agent-1",
			cwd: repoRoot,
			tool_name: "Read",
			tool_input: { file_path: filePath },
		});

		const parent = await runPostToolUseArm("claude", HARNESSES.claude, parentStdin);
		const child = await runPostToolUseArm("claude", HARNESSES.claude, childStdin);

		assert.ok(parent, "the parent's read announces");
		assert.ok(
			child,
			"a subagent shares the parent's session_id but never sees the parent's nag, so it is announced to on its own"
		);
	});
});

test("runPostToolUseArm: a subagent's read of an architect doc does not credit the parent's gate", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifestAndDoc(
			repoRoot,
			{ "scripts/ai-skills/**": "_toolkit/spec-editing.md" },
			"_toolkit/spec-editing.md",
			"Spec editing constraints go here."
		);
		const childReadsDoc = JSON.stringify({
			session_id: "session-1",
			agent_id: "agent-1",
			cwd: repoRoot,
			tool_name: "Read",
			tool_input: {
				file_path: path.join(repoRoot, ".prism", "architect", "_toolkit", "spec-editing.md"),
			},
		});
		await runPostToolUseArm("claude", HARNESSES.claude, childReadsDoc);

		const parentState = await loadRouteState(repoRoot, "session-1");
		assert.deepEqual(
			parentState.read,
			[],
			"the parent never read the doc, so its gate stays unanswered"
		);

		const childState = await loadRouteState(repoRoot, "session-1.agent-1");
		assert.deepEqual(childState.read, ["_toolkit/spec-editing.md"], "the child's own read is credited");
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

test("runPostCompactArm: deletes the subagent state files a session spawned, not only its own", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifestAndDoc(
			repoRoot,
			{ "scripts/ai-skills/**": "_toolkit/spec-editing.md" },
			"_toolkit/spec-editing.md",
			"Spec editing constraints go here."
		);
		const childStdin = JSON.stringify({
			session_id: "session-1",
			agent_id: "agent-1",
			cwd: repoRoot,
			tool_name: "Read",
			tool_input: { file_path: path.join(repoRoot, "scripts", "ai-skills", "build.ts") },
		});
		await runPostToolUseArm("claude", HARNESSES.claude, childStdin);

		const childStatePath = path.join(
			repoRoot,
			".prism",
			"architect-route-state.session-1.agent-1.json"
		);
		await assert.doesNotReject(fs.access(childStatePath), "the subagent has its own state file");

		await runPostCompactArm(JSON.stringify({ session_id: "session-1", cwd: repoRoot }));
		await assert.rejects(
			fs.access(childStatePath),
			"a child file left behind would keep suppressing announcements past the reset"
		);
	});
});

test("runPostCompactArm: leaves a sibling session whose id merely starts with the compacted one", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifestAndDoc(
			repoRoot,
			{ "scripts/ai-skills/**": "_toolkit/spec-editing.md" },
			"_toolkit/spec-editing.md",
			"Spec editing constraints go here."
		);
		const siblingStdin = JSON.stringify({
			session_id: "session-12",
			cwd: repoRoot,
			tool_name: "Read",
			tool_input: { file_path: path.join(repoRoot, "scripts", "ai-skills", "build.ts") },
		});
		await runPostToolUseArm("claude", HARNESSES.claude, siblingStdin);

		await runPostCompactArm(JSON.stringify({ session_id: "session-1", cwd: repoRoot }));

		const second = await runPostToolUseArm("claude", HARNESSES.claude, siblingStdin);
		assert.equal(
			second,
			null,
			"session-12 never compacted, so its already-delivered announcement stays suppressed"
		);
	});
});

test("runPostCompactArm: with no session id, leaves existing state files in place", async () => {
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

		await assert.doesNotReject(runPostCompactArm(JSON.stringify({ cwd: repoRoot })));

		await assert.doesNotReject(
			fs.access(statePath),
			"a compaction naming no session identifies nothing to reset, so it clears nothing"
		);
		const second = await runPostToolUseArm("claude", HARNESSES.claude, readStdin);
		assert.equal(
			second,
			null,
			"the surviving state keeps the already-delivered announcement suppressed"
		);
	});
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

	// The gate reaches a real host only through this registration, so its
	// matcher is asserted rather than just its presence: an entry that fires
	// on the wrong tool names delivers a hook that never sees a write.
	const preToolUse = settings.hooks.PreToolUse?.[0];
	assert.ok(preToolUse, "PreToolUse registration delivered");
	for (const toolName of ["Write", "Edit", "Bash"]) {
		assert.match(
			toolName,
			new RegExp(preToolUse.matcher),
			`the PreToolUse matcher selects ${toolName}`
		);
	}
	assert.ok(
		preToolUse.hooks[0].command.includes("--event=PreToolUse"),
		"the PreToolUse registration dispatches the deny arm, not the announce arm"
	);

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

// --- Install-seed route integrity ---

/**
 * Every route in every manifest the install seed carries names a doc that
 * either exists on the seed or is deliberately withheld from it, resolved the
 * way `filterDocsOnDisk` resolves it — `path.join` against `.prism/architect/`,
 * so a `../`-prefixed value is normalized rather than treated as a literal
 * segment, and a `_toolkit/`-prefixed value in the nested base manifest still
 * resolves from the architect root rather than from its own directory.
 *
 * The seed is what `runAdopt` copies into a consumer's `.prism/`, with the
 * stub renamed to `manifest.json` on the way. A route pointing at a path the
 * seed does not carry is silent rather than loud: the resolver logs to stderr
 * and drops the doc, so the route filters to nothing and no reader ever learns
 * the doc was supposed to load. That silence is what this asserts against.
 *
 * Absent-and-deliberate is a distinct outcome from absent-and-accidental, so
 * it is asserted rather than skipped. A doc `seed-curation.json` lists as
 * `excluded` is maintainer-facing content the seed is meant to withhold, and
 * `filterDocsOnDisk` dropping its route is the designed behavior. A doc that
 * is absent for any other reason is a dead route — a typo, a rename that
 * missed a manifest, or a file that never shipped.
 */
test("every install-seed route names a doc the seed carries or deliberately withholds", async () => {
	const seedArchitectDir = path.join(
		repoRoot,
		"templates",
		"install",
		".prism",
		"architect"
	);
	const curation = JSON.parse(
		await fs.readFile(
			path.join(
				repoRoot,
				".ai-skills",
				"definitions",
				"seed-curation.json"
			),
			"utf8"
		)
	) as { excluded?: string[] };
	const excluded = new Set(curation.excluded ?? []);

	const manifestPaths = ["manifest.stub.json", "_toolkit/manifest.base.json"];
	let routeCount = 0;

	for (const manifestPath of manifestPaths) {
		const manifest = JSON.parse(
			await fs.readFile(
				path.join(seedArchitectDir, ...manifestPath.split("/")),
				"utf8"
			)
		) as Record<string, string | string[]>;

		for (const [pattern, docOrDocs] of Object.entries(manifest)) {
			for (const doc of Array.isArray(docOrDocs) ? docOrDocs : [docOrDocs]) {
				routeCount += 1;
				const onDisk = await fs
					.access(path.join(seedArchitectDir, doc))
					.then(() => true)
					.catch(() => false);
				if (onDisk) {
					continue;
				}

				assert.ok(
					excluded.has(path.posix.join("architect", doc)),
					`${manifestPath} route "${pattern}" names "${doc}", which the install seed does not carry and seed-curation.json does not list as excluded`
				);
			}
		}
	}

	assert.ok(routeCount > 0, "the install seed carries at least one route");
});

// --- Credit channel: shell read forms, Grep, and full-read-only credit ---

const CREDIT_DOC = "_toolkit/spec-editing.md";

/**
 * The session's `read` array — the only array a write-time deny gate clears
 * against, which is why these cases assert against it rather than against
 * whether an announcement was emitted.
 */
async function readCreditedDocs(
	repoRoot: string,
	scopeId: string
): Promise<string[]> {
	const state = await loadRouteState(repoRoot, scopeId);
	return state.read;
}

/** Seeds one routed doc and returns its absolute path. */
async function seedCreditRepo(repoRoot: string): Promise<string> {
	await seedManifestAndDoc(
		repoRoot,
		{ "scripts/ai-skills/**": CREDIT_DOC },
		CREDIT_DOC,
		"Spec editing constraints go here."
	);
	return path.join(repoRoot, ".prism", "architect", CREDIT_DOC);
}

test("parseShellReadTargets: each shell read form yields its path, and only bare cat credits", () => {
	assert.deepEqual(parseShellReadTargets("cat docs/one.md"), [
		{ filePath: "docs/one.md", credit: true },
	]);
	// A count or script operand rides along as a target that no manifest
	// route can match, which is cheaper than teaching the parser each
	// command's operand grammar.
	assert.deepEqual(parseShellReadTargets("head -n 20 docs/one.md"), [
		{ filePath: "20", credit: false },
		{ filePath: "docs/one.md", credit: false },
	]);
	assert.deepEqual(parseShellReadTargets("tail -50 docs/one.md"), [
		{ filePath: "docs/one.md", credit: false },
	]);
	assert.deepEqual(parseShellReadTargets("sed -n '1,20p' docs/one.md"), [
		{ filePath: "1,20p", credit: false },
		{ filePath: "docs/one.md", credit: false },
	]);
	assert.deepEqual(parseShellReadTargets("less docs/one.md"), [
		{ filePath: "docs/one.md", credit: false },
	]);
	assert.deepEqual(parseShellReadTargets("more docs/one.md"), [
		{ filePath: "docs/one.md", credit: false },
	]);
});

test("parseShellReadTargets: a flagged cat announces but does not credit", () => {
	assert.deepEqual(parseShellReadTargets("cat -n docs/one.md"), [
		{ filePath: "docs/one.md", credit: false },
	]);
});

test("parseShellReadTargets: the documented gaps yield no targets rather than a guess", () => {
	assert.deepEqual(parseShellReadTargets("cat docs/one.md | grep alpha"), []);
	assert.deepEqual(parseShellReadTargets("cat $(ls docs)"), []);
	assert.deepEqual(parseShellReadTargets("cat docs/one.md > copy.md"), []);
	assert.deepEqual(parseShellReadTargets("git status"), []);
	assert.deepEqual(parseShellReadTargets(undefined), []);
});

test("parseShellReadTargets: a line break separates commands rather than voiding them", () => {
	const credited = [{ filePath: "docs/one.md", credit: true }];

	assert.deepEqual(
		parseShellReadTargets("cat docs/one.md\ngrep alpha docs/two.md"),
		credited,
		"the grep segment names no read command, and its presence does not cost the cat"
	);
	assert.deepEqual(
		parseShellReadTargets("cat docs/one.md\r\ngrep alpha docs/two.md"),
		credited
	);
	assert.deepEqual(parseShellReadTargets("cat docs/one.md # a note"), []);
});

test("parseShellReadTargets: the deny message's own multi-doc remedy credits every doc it names", () => {
	// The gate renders one `cat` per line. Pasted into a single call, every
	// line has to credit — otherwise the gate re-denies its own remedy.
	const docs = [
		".prism/architect/_toolkit/spec-editing.md",
		".prism/architect/guides/writing-an-adr.md",
	];

	assert.deepEqual(
		parseShellReadTargets(docs.map((doc) => `cat ${doc}`).join("\n")),
		docs.map((filePath) => ({ filePath, credit: true }))
	);
});

test("parseShellReadTargets: a pipe or a conditional refuses the whole command", () => {
	// A pipe sends the output somewhere other than the transcript, and a
	// conditional may never run its second command. The refusal covers the
	// whole command rather than the offending clause — `cat docs/one.md` before
	// an `&&` did run, and its credit is given up on purpose, because a
	// construct the safe-character class does not model can change what the
	// rest of the command means.
	for (const command of [
		"cat docs/one.md | head -5",
		"cat docs/one.md > /dev/null",
		"cat docs/one.md && cat docs/two.md",
		"cat docs/one.md || cat docs/two.md",
		"cat docs/one.md &",
		"cat docs/one.md&&cat docs/two.md",
	]) {
		assert.deepEqual(
			parseShellReadTargets(command),
			[],
			`${JSON.stringify(command)} does not deliver the whole document to the model`
		);
	}
});

test("parseShellReadTargets: a heredoc credits nothing, whatever its body says", () => {
	// The body is text being written, not documents being read. Judged as
	// commands, a PR body drafted through `tee` credits every doc its own prose
	// names and opens the write gate on documents nobody opened.
	for (const command of [
		"tee /tmp/pr-body.md <<'EOF'\ncat docs/one.md\nEOF",
		"cat > /tmp/pr-body.md <<-EOF\n\tcat docs/one.md\n\tEOF",
		"cat docs/one.md <<< inline",
	]) {
		assert.deepEqual(
			parseShellReadTargets(command),
			[],
			`${JSON.stringify(command)} carries a redirect, so no part of it credits`
		);
	}
});

test("parseShellReadTargets: every sequential spelling credits both documents", () => {
	const credited = [
		{ filePath: "docs/one.md", credit: true },
		{ filePath: "docs/two.md", credit: true },
	];

	for (const separator of [";", " ;", "; ", " ; ", "\n", " \n", "\r\n"]) {
		assert.deepEqual(
			parseShellReadTargets(`cat docs/one.md${separator}cat docs/two.md`),
			credited,
			`a ${JSON.stringify(separator)} separator runs both commands into the same transcript`
		);
	}

	assert.deepEqual(
		parseShellReadTargets("cat 'docs/one;two.md'"),
		[{ filePath: "docs/one;two.md", credit: true }],
		"a quoted separator is part of the path, not a cut"
	);
});

test("runPostToolUseArm: every shell read form announces the routed doc", async () => {
	for (const form of ["cat", "head -n 20", "tail -20", "sed -n '1,20p'", "less", "more"]) {
		await withTempRepo(async (repoRoot) => {
			await seedCreditRepo(repoRoot);
			const target = path.join(repoRoot, "scripts", "ai-skills", "build.ts");
			const stdin = JSON.stringify({
				session_id: "session-1",
				cwd: repoRoot,
				tool_name: "Bash",
				tool_input: { command: `${form} ${target}` },
			});

			const result = await runPostToolUseArm("claude", HARNESSES.claude, stdin);
			assert.match(
				String(result),
				/spec-editing\.md/,
				`\`${form}\` on a routed path announces its doc`
			);
		});
	}
});

test("runPostToolUseArm: a Read with no range credits the doc it read", async () => {
	await withTempRepo(async (repoRoot) => {
		const docPath = await seedCreditRepo(repoRoot);
		const stdin = JSON.stringify({
			session_id: "session-1",
			cwd: repoRoot,
			tool_name: "Read",
			tool_input: { file_path: docPath },
		});

		await runPostToolUseArm("claude", HARNESSES.claude, stdin);
		assert.deepEqual(await readCreditedDocs(repoRoot, "session-1"), [CREDIT_DOC]);
	});
});

test("runPostToolUseArm: a Read carrying offset or limit credits nothing", async () => {
	for (const range of [{ limit: 1 }, { offset: 40 }, { offset: 40, limit: 20 }]) {
		await withTempRepo(async (repoRoot) => {
			const docPath = await seedCreditRepo(repoRoot);
			const stdin = JSON.stringify({
				session_id: "session-1",
				cwd: repoRoot,
				tool_name: "Read",
				tool_input: { file_path: docPath, ...range },
			});

			await runPostToolUseArm("claude", HARNESSES.claude, stdin);
			assert.deepEqual(
				await readCreditedDocs(repoRoot, "session-1"),
				[],
				`a Read of ${JSON.stringify(range)} delivered a slice, not the doc`
			);
		});
	}
});

test("runPostToolUseArm: cat credits the doc it read", async () => {
	await withTempRepo(async (repoRoot) => {
		const docPath = await seedCreditRepo(repoRoot);
		const stdin = JSON.stringify({
			session_id: "session-1",
			cwd: repoRoot,
			tool_name: "Bash",
			tool_input: { command: `cat ${docPath}` },
		});

		await runPostToolUseArm("claude", HARNESSES.claude, stdin);
		assert.deepEqual(await readCreditedDocs(repoRoot, "session-1"), [CREDIT_DOC]);
	});
});

test("runPostToolUseArm: a cat inside a heredoc body credits nothing", async () => {
	// End to end, because the parser-level case cannot show the consequence:
	// crediting a body line marks the doc read, and the write gate then opens
	// on a document nobody opened.
	await withTempRepo(async (repoRoot) => {
		const docPath = await seedCreditRepo(repoRoot);
		const stdin = JSON.stringify({
			session_id: "session-1",
			cwd: repoRoot,
			tool_name: "Bash",
			tool_input: {
				command: `tee /tmp/pr-body.md <<'EOF'\ncat ${docPath}\nEOF`,
			},
		});

		await runPostToolUseArm("claude", HARNESSES.claude, stdin);
		assert.deepEqual(await readCreditedDocs(repoRoot, "session-1"), []);
	});
});

test("runPostToolUseArm: a relative cat resolves against the payload cwd, not the repo root", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedCreditRepo(repoRoot);
		const relativeDoc = path.join(".prism", "architect", CREDIT_DOC);

		const fromRoot = JSON.stringify({
			session_id: "session-root",
			cwd: repoRoot,
			tool_name: "Bash",
			tool_input: { command: `cat ${relativeDoc}` },
		});
		await runPostToolUseArm("claude", HARNESSES.claude, fromRoot);
		assert.deepEqual(await readCreditedDocs(repoRoot, "session-root"), [
			CREDIT_DOC,
		]);

		// The same command issued from a subdirectory fails in the shell, so
		// crediting it would hand the write gate a doc nobody read.
		const subdirectory = path.join(repoRoot, "scripts");
		await fs.mkdir(subdirectory, { recursive: true });
		const fromSubdirectory = JSON.stringify({
			session_id: "session-subdir",
			cwd: subdirectory,
			tool_name: "Bash",
			tool_input: { command: `cat ${relativeDoc}` },
		});
		await runPostToolUseArm("claude", HARNESSES.claude, fromSubdirectory);
		assert.deepEqual(await readCreditedDocs(repoRoot, "session-subdir"), []);
	});
});

test("runPostToolUseArm: a payload naming its path at tool_input.path announces without crediting", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedCreditRepo(repoRoot);
		const stdin = JSON.stringify({
			session_id: "session-1",
			cwd: repoRoot,
			tool_name: "Glob",
			tool_input: {
				pattern: "**/*.md",
				path: path.join(repoRoot, "scripts", "ai-skills", "build.ts"),
			},
		});

		// The announcement is what proves the `path` fallback resolved the
		// payload at all. Asserting only that nothing was credited passes just
		// as well when the path is never found.
		const result = await runPostToolUseArm("claude", HARNESSES.claude, stdin);
		assert.ok(result, "a tool naming its target at `path` still reaches routing");
		assert.match(
			JSON.parse(result).hookSpecificOutput.additionalContext,
			/_toolkit/,
			"the routed doc is named"
		);
		assert.deepEqual(
			await readCreditedDocs(repoRoot, "session-1"),
			[],
			"the write default announces a routed path without crediting it"
		);
	});
});

test("runPostToolUseArm: head over the doc credits nothing", async () => {
	await withTempRepo(async (repoRoot) => {
		const docPath = await seedCreditRepo(repoRoot);
		const stdin = JSON.stringify({
			session_id: "session-1",
			cwd: repoRoot,
			tool_name: "Bash",
			tool_input: { command: `head -20 ${docPath}` },
		});

		await runPostToolUseArm("claude", HARNESSES.claude, stdin);
		assert.deepEqual(await readCreditedDocs(repoRoot, "session-1"), []);
	});
});

test("runPostToolUseArm: a Grep naming a routed doc credits nothing", async () => {
	await withTempRepo(async (repoRoot) => {
		const docPath = await seedCreditRepo(repoRoot);
		const stdin = JSON.stringify({
			session_id: "session-1",
			cwd: repoRoot,
			tool_name: "Grep",
			tool_input: { pattern: "constraints", path: docPath },
		});

		await runPostToolUseArm("claude", HARNESSES.claude, stdin);
		assert.deepEqual(
			await readCreditedDocs(repoRoot, "session-1"),
			[],
			"search results quote a doc without delivering it"
		);
	});
});

// --- The write gate: PreToolUse deny, remedy, and reroute ---

const GATE_DOC = "_toolkit/spec-editing.md";

/** Seeds one routed doc and returns the routed write target plus the doc's own path. */
async function seedGateRepo(
	repoRoot: string
): Promise<{ target: string; docPath: string }> {
	await seedManifestAndDoc(
		repoRoot,
		{ "src/**": GATE_DOC },
		GATE_DOC,
		"Spec editing constraints go here."
	);
	return {
		target: path.join(repoRoot, "src", "index.ts"),
		docPath: path.join(repoRoot, ".prism", "architect", GATE_DOC),
	};
}

function writePayload(
	repoRoot: string,
	filePath: string,
	overrides: Record<string, unknown> = {}
): string {
	return JSON.stringify({
		session_id: "session-1",
		cwd: repoRoot,
		tool_name: "Write",
		tool_input: { file_path: filePath },
		...overrides,
	});
}

/** The deny envelope's reason text, or `null` when the call was allowed. */
function denyReason(result: string | null): string | null {
	if (result === null) {
		return null;
	}
	const parsed = JSON.parse(result);
	assert.equal(parsed.hookSpecificOutput.hookEventName, "PreToolUse");
	assert.equal(parsed.hookSpecificOutput.permissionDecision, "deny");
	return parsed.hookSpecificOutput.permissionDecisionReason;
}

// Leg 1 — the deny fires, and names both the doc and the command that clears it.
test("runPreToolUseArm: a write to a routed path with unread docs is denied, naming the doc and the cat remedy", async () => {
	await withTempRepo(async (repoRoot) => {
		const { target } = await seedGateRepo(repoRoot);

		const reason = denyReason(
			await runPreToolUseArm("claude", HARNESSES.claude, writePayload(repoRoot, target))
		);

		// The whole message, not a substring of it. The instruction between
		// the path and the remedy is what tells the model the read has to be
		// a full one and that the same call should be retried after — a
		// substring match leaves that sentence free to be rewritten away.
		assert.equal(
			reason,
			"You're editing `src/index.ts`. Read its governing docs in full first, then retry:\n" +
				`cat .prism/architect/${GATE_DOC}`,
			"a message naming a doc without naming how to read it is the unsatisfiable-gate shape"
		);
	});
});

// Leg 2 — seeded state clears it.
test("runPreToolUseArm: the same write is allowed once the doc is in the read array", async () => {
	await withTempRepo(async (repoRoot) => {
		const { target } = await seedGateRepo(repoRoot);
		await saveRouteState(repoRoot, "session-1", { read: [GATE_DOC], announced: [] });

		const result = await runPreToolUseArm(
			"claude",
			HARNESSES.claude,
			writePayload(repoRoot, target)
		);
		assert.equal(result, null, "every matched doc is read, so nothing gates the write");
	});
});

/**
 * Leg 3 — a remedy performed through the shipped `PostToolUse` arm clears a
 * real deny. Seeding is leg 2's job: a suite that only seeds cannot detect a
 * remedy that does not work, which is how thrive shipped an unsatisfiable gate
 * that passed 70 of 70.
 *
 * A named function rather than inline assertions so the positive control below
 * can break the deny and re-run these exact checks. A control that
 * re-implements the assertions proves only that its copy fails.
 */
async function assertRemedyClearsTheGate(
	remedy: (docPath: string) => Record<string, unknown>
): Promise<void> {
	await withTempRepo(async (repoRoot) => {
		const { target, docPath } = await seedGateRepo(repoRoot);

		const denied = await runPreToolUseArm(
			"claude",
			HARNESSES.claude,
			writePayload(repoRoot, target)
		);
		assert.ok(denied, "the write is denied before the remedy");

		await runPostToolUseArm(
			"claude",
			HARNESSES.claude,
			JSON.stringify({
				session_id: "session-1",
				cwd: repoRoot,
				...remedy(docPath),
			})
		);

		const afterRemedy = await runPreToolUseArm(
			"claude",
			HARNESSES.claude,
			writePayload(repoRoot, target)
		);
		assert.equal(afterRemedy, null, "the performed remedy cleared the gate");
	});
}

test("runPreToolUseArm: a full Read of the named doc clears the deny end to end", async () => {
	await assertRemedyClearsTheGate((docPath) => ({
		tool_name: "Read",
		tool_input: { file_path: docPath },
	}));
});

test("runPreToolUseArm: a cat of the named doc clears the deny end to end", async () => {
	// This repo's own output style reads files with `cat`, so a gate only the
	// `Read` path can clear is a gate its own agents cannot satisfy.
	await assertRemedyClearsTheGate((docPath) => ({
		tool_name: "Bash",
		tool_input: { command: `cat ${docPath}` },
	}));
});

test("runPreToolUseArm: positive control — with the deny broken, leg 3 fails", async () => {
	process.env.PRISM_HOOK_DENY_DISABLE = "1";
	try {
		await assert.rejects(
			assertRemedyClearsTheGate((docPath) => ({
				tool_name: "Read",
				tool_input: { file_path: docPath },
			})),
			"a leg that still passes with the deny disabled is not testing the deny"
		);
	} finally {
		delete process.env.PRISM_HOOK_DENY_DISABLE;
	}
});

test("runPreToolUseArm: a two-doc deny is cleared by its own remedy pasted as one call", async () => {
	// Twelve of this repo's own routes name two or more docs. The message
	// renders one `cat` per line, and a model that pastes those lines into a
	// single Bash call has to earn credit for all of them — otherwise the gate
	// re-denies the exact remedy it just printed.
	const secondDoc = "guides/writing-an-adr.md";

	await withTempRepo(async (repoRoot) => {
		const { target } = await seedGateRepo(repoRoot);
		await seedManifestAndDoc(
			repoRoot,
			{ "src/**": [GATE_DOC, secondDoc] },
			secondDoc,
			"ADR authoring constraints go here."
		);

		const reason = denyReason(
			await runPreToolUseArm("claude", HARNESSES.claude, writePayload(repoRoot, target))
		);
		assert.ok(reason, "the two-doc write is denied before the remedy");

		const remedyLines = reason.split("\n").slice(1);
		assert.deepEqual(
			remedyLines,
			[`cat .prism/architect/${GATE_DOC}`, `cat .prism/architect/${secondDoc}`],
			"the message names one cat per unread doc"
		);

		await runPostToolUseArm(
			"claude",
			HARNESSES.claude,
			JSON.stringify({
				session_id: "session-1",
				cwd: repoRoot,
				tool_name: "Bash",
				tool_input: { command: remedyLines.join("\n") },
			})
		);

		assert.equal(
			await runPreToolUseArm("claude", HARNESSES.claude, writePayload(repoRoot, target)),
			null,
			"the rendered remedy, run the way it is written, clears the gate"
		);
	});
});

test("runPreToolUseArm: a shell write named on a later line of a multi-line command is not rerouted", async () => {
	// The write detector once read a whole multi-line command as one command,
	// so a leading `sed -i` claimed every later line's tokens and the reroute
	// named a path the command only reads.
	await withTempRepo(async (repoRoot) => {
		const { target, docPath } = await seedGateRepo(repoRoot);
		const command = `sed -i s/a/b/ ${path.join(repoRoot, "elsewhere.ts")}\ncat ${docPath}`;

		assert.equal(
			await runPreToolUseArm(
				"claude",
				HARNESSES.claude,
				writePayload(repoRoot, target, {
					tool_name: "Bash",
					tool_input: { command },
				})
			),
			null,
			"the cat on the second line is a read, and the sed on the first writes elsewhere"
		);
	});
});

test("the spawned entry point routes --event=PreToolUse to the deny arm", async () => {
	// Every other gate case calls the arm in process, which cannot see the
	// argv dispatch the registration relies on. Without this, a `main()` that
	// sent every event to the announce arm would keep the suite green while
	// the shipped gate never fired.
	await withTempRepo(async (temporaryRoot) => {
		const { target } = await seedGateRepo(temporaryRoot);
		const entryPoint = path.join(scriptDirectory, "hooks", "hook.mjs");

		const denied = spawnSync(
			"node",
			[entryPoint, "--tool=claude", "--event=PreToolUse"],
			{ input: writePayload(temporaryRoot, target), encoding: "utf8" }
		);
		assert.equal(denied.status, 0, denied.stderr);
		assert.match(
			denyReason(denied.stdout) ?? "",
			/Read its governing docs in full first/,
			"the spawned PreToolUse dispatch produces a deny envelope on stdout"
		);

		const announced = spawnSync("node", [entryPoint, "--tool=claude"], {
			input: writePayload(temporaryRoot, target),
			encoding: "utf8",
		});
		assert.equal(announced.status, 0, announced.stderr);
		assert.doesNotMatch(
			announced.stdout,
			/permissionDecision/,
			"the same payload without the event flag reaches the announce arm instead"
		);
	});
});

test("runPreToolUseArm: a route naming a doc that is absent from disk never denies", async () => {
	// The fifth deny condition. A route can name a doc that was renamed or
	// deleted, and denying on it would demand a `cat` of a file that does not
	// exist — a gate nothing can clear.
	await withTempRepo(async (temporaryRoot) => {
		await seedManifestAndDoc(
			temporaryRoot,
			{ "src/**": "_toolkit/deleted-doc.md" },
			GATE_DOC,
			"An unrelated doc that the route does not name."
		);

		assert.equal(
			await runPreToolUseArm(
				"claude",
				HARNESSES.claude,
				writePayload(temporaryRoot, path.join(temporaryRoot, "src", "index.ts"))
			),
			null,
			"the write proceeds rather than demanding a read of a missing file"
		);
	});
});

// --- The subagent leg (D2's verify points here) ---

test("runPreToolUseArm: a subagent's deny consults its own state, not its parent's", async () => {
	await withTempRepo(async (repoRoot) => {
		const { target } = await seedGateRepo(repoRoot);
		const childPayload = writePayload(repoRoot, target, { agent_id: "agent-1" });

		// Direction 1: the parent read the doc; the child did not.
		await saveRouteState(repoRoot, "session-1", { read: [GATE_DOC], announced: [] });
		assert.ok(
			await runPreToolUseArm("claude", HARNESSES.claude, childPayload),
			"a doc the parent read does not satisfy the child's gate"
		);

		// Direction 2: the child's own state clears it. Required alongside the
		// first — direction 1 alone also passes if the deny never finds any
		// state file at all.
		await saveRouteState(repoRoot, "session-1.agent-1", {
			read: [GATE_DOC],
			announced: [],
		});
		assert.equal(
			await runPreToolUseArm("claude", HARNESSES.claude, childPayload),
			null,
			"the child's own read clears the child's gate"
		);
	});
});

// --- Coverage set ---

test("runPreToolUseArm: an unrouted path is never denied, on any verb", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedGateRepo(repoRoot);
		const unrouted = path.join(repoRoot, "README.md");

		for (const toolInput of [
			{ tool_name: "Write", tool_input: { file_path: unrouted } },
			{ tool_name: "Edit", tool_input: { file_path: unrouted } },
			{ tool_name: "Bash", tool_input: { command: `echo hi > ${unrouted}` } },
		]) {
			const stdin = JSON.stringify({
				session_id: "session-1",
				cwd: repoRoot,
				...toolInput,
			});
			assert.equal(
				await runPreToolUseArm("claude", HARNESSES.claude, stdin),
				null,
				`${toolInput.tool_name} on an unrouted path must not be denied`
			);
		}
	});
});

test("runPreToolUseArm: a read-kind tool is never denied, even on a routed path", async () => {
	await withTempRepo(async (repoRoot) => {
		const { target } = await seedGateRepo(repoRoot);

		for (const toolName of ["Read", "Grep"]) {
			assert.equal(
				await runPreToolUseArm(
					"claude",
					HARNESSES.claude,
					writePayload(repoRoot, target, { tool_name: toolName })
				),
				null,
				`${toolName} is not a write and must never be denied`
			);
		}
	});
});

test("runPreToolUseArm: an unlisted tool name is never denied, unlike the announce fallback", async () => {
	await withTempRepo(async (repoRoot) => {
		const { target } = await seedGateRepo(repoRoot);

		assert.equal(
			await runPreToolUseArm(
				"claude",
				HARNESSES.claude,
				writePayload(repoRoot, target, { tool_name: "SomeToolNobodyMapped" })
			),
			null,
			"the next read-shaped tool a vendor ships must not be denied through the write default"
		);
	});
});

test("runPreToolUseArm: no session id never denies", async () => {
	await withTempRepo(async (repoRoot) => {
		const { target } = await seedGateRepo(repoRoot);
		const stdin = JSON.stringify({
			cwd: repoRoot,
			tool_name: "Write",
			tool_input: { file_path: target },
		});

		assert.equal(await runPreToolUseArm("claude", HARNESSES.claude, stdin), null);
	});
});

test("runPreToolUseArm: a deny writes no state and no announced entry", async () => {
	await withTempRepo(async (repoRoot) => {
		const { target } = await seedGateRepo(repoRoot);

		// Asserted, not assumed: `loadRouteState` returns these same empty
		// arrays for an absent file, so a run where the deny never fired would
		// satisfy every assertion below.
		assert.ok(
			await runPreToolUseArm("claude", HARNESSES.claude, writePayload(repoRoot, target)),
			"the deny fired, so the state below is what a deny left behind"
		);

		const state = await loadRouteState(repoRoot, "session-1");
		assert.deepEqual(state.read, [], "a deny credits nothing");
		assert.deepEqual(
			state.announced,
			[],
			"appending to announced would silence the very doc the deny is asking for"
		);
	});
});

test("runPreToolUseArm: a doc announced but never read still denies", async () => {
	await withTempRepo(async (repoRoot) => {
		const { target } = await seedGateRepo(repoRoot);
		await saveRouteState(repoRoot, "session-1", { read: [], announced: [GATE_DOC] });

		assert.ok(
			await runPreToolUseArm("claude", HARNESSES.claude, writePayload(repoRoot, target)),
			"naming a doc is not delivering it — only the read array clears a gate"
		);
	});
});

test("runPreToolUseArm: each kill switch makes the gate inert", async () => {
	for (const variable of ["PRISM_HOOK_DISABLE", "PRISM_HOOK_DENY_DISABLE"]) {
		await withTempRepo(async (repoRoot) => {
			const { target } = await seedGateRepo(repoRoot);

			process.env[variable] = "1";
			try {
				assert.equal(
					await runPreToolUseArm(
						"claude",
						HARNESSES.claude,
						writePayload(repoRoot, target)
					),
					null,
					`${variable}=1 leaves the gate registered and inert`
				);
			} finally {
				delete process.env[variable];
			}
		});
	}
});

test("runPreToolUseArm: PRISM_HOOK_DENY_DISABLE leaves the announce arm running", async () => {
	// The two switches differ in exactly this: the narrow one turns off the
	// gate, not the hook. A test asserting only inertness cannot tell them apart.
	await withTempRepo(async (repoRoot) => {
		const { target } = await seedGateRepo(repoRoot);

		process.env.PRISM_HOOK_DENY_DISABLE = "1";
		try {
			const announced = await runPostToolUseArm(
				"claude",
				HARNESSES.claude,
				JSON.stringify({
					session_id: "session-1",
					cwd: repoRoot,
					tool_name: "Read",
					tool_input: { file_path: target },
				})
			);
			assert.ok(announced, "the deny switch must not silence announcements");
		} finally {
			delete process.env.PRISM_HOOK_DENY_DISABLE;
		}
	});
});

test("runPreToolUseArm: a harness with no observed deny envelope writes nothing", async () => {
	await withTempRepo(async (repoRoot) => {
		const { target } = await seedGateRepo(repoRoot);

		// `Shell` rather than an edit tool: it is the only kind Cursor's table
		// actually lists, so it is the only payload that reaches `emitDeny` at
		// all. An unlisted name returns at the kind guard, which would make
		// this pass without the envelope decision ever being consulted.
		const stdin = JSON.stringify({
			conversation_id: "session-1",
			cwd: repoRoot,
			tool_name: "Shell",
			tool_input: { command: `echo hi > ${target}` },
		});

		assert.equal(
			await runPreToolUseArm("cursor", HARNESSES.cursor, stdin),
			null,
			"guessing an unobserved host's deny shape blocks a write with a message nobody renders"
		);

		// The positive control: the same shell write under Claude, whose
		// envelope is observed, does deny — so the null above is Cursor's
		// envelope decision rather than a payload nothing would act on.
		assert.ok(
			await runPreToolUseArm(
				"claude",
				HARNESSES.claude,
				writePayload(repoRoot, target, {
					tool_name: "Bash",
					tool_input: { command: `echo hi > ${target}` },
				})
			),
			"the same write is a real reroute on a harness whose envelope is known"
		);
	});
});

// --- The shell arm: reroute unless the command is provably a read ---

/**
 * The routed path every shell case below names. Long enough that a splice
 * inside it still leaves both halves recognizable in a failure message.
 */
const SHELL_ROUTED_PATH = "src/nested/index.ts";

/**
 * Every command prefix that legitimately precedes a command name, so a shape
 * generated over these covers the head-token position rather than assuming
 * the command sits first.
 */
const COMMAND_PREFIXES = [
	"",
	"sudo ",
	"FOO=bar ",
	"nohup ",
	"time ",
	"command ",
];

/** Spellings of the same path that a token-level parser reads differently. */
const QUOTE_SPLICES: ((target: string) => string)[] = [
	(target) => `"${target}"`,
	(target) => `'${target}`,
	(target) => `"${target.slice(0, 4)}"${target.slice(4)}`,
	(target) => `${target.slice(0, 4)}'${target.slice(4)}'`,
	(target) => `${target.slice(0, 4)}"${target.slice(4)}"`,
];

/**
 * Characters outside the read channel's positive class, each of which should
 * cost a command its proof wherever it appears.
 *
 * Spelled as a string rather than a list so adding one is a single character
 * and forgetting to add a case is impossible — the cross-product below
 * generates a case per character per position.
 */
const CHARACTERS_OUTSIDE_THE_CLASS = "<>|&$`(){}#*?![]%\\";

/**
 * Commands that write, or that no proof covers, each spelled against a
 * caller-supplied path.
 *
 * Generated across the axes that have each independently broken a
 * hand-rolled write parser — redirect spelling, command prefix, grouping,
 * quoting, heredoc form, substitution, comments — plus the interpreter,
 * copy-family, process-substitution, and `exec` classes a parser cannot see
 * into at all. Every entry asserts the same expected outcome, so the list
 * grows by appending a shape rather than by working out what a parser would
 * return for it.
 */
function everyUnprovableShape(target: string): string[] {
	const shapes: string[] = [
		`echo hi > ${target}`,
		`echo hi >> ${target}`,
		`echo hi>${target}`,
		`exec > ${target}`,
		`echo hi > >(tee ${target})`,
		`cp a.md ${target}`,
		`mv a.md ${target}`,
		`dd if=a.md of=${target}`,
		`install -m644 a.md ${target}`,
		`rsync a.md ${target}`,
		`truncate -s0 ${target}`,
		`python -c "open('${target}','w')"`,
		`node -e "require('fs').writeFileSync('${target}','')"`,
		`perl -pi -e s/a/b/ ${target}`,
		`awk '{print}' a.md > ${target}`,
		`find . -name x -exec cp {} ${target} ;`,
		`tee ${target} # see the note`,
		`tee ${target} <<<"hi"`,
		`tee ${target} $(echo a; echo b)`,
		`tee ${target} $((1 + 1))`,
		`tee \${OUT:-${target}}`,
		`tee ${target} <<'E'\nbody line\nE`,
		`cat > ${target} <<-E\n\tbody line\n\tE`,
		`tee \\\n${target}`,
		`tee \\\r\n${target}`,
		`(echo hi > ${target})`,
		`{ tee ${target}; }`,
	];

	for (const prefix of COMMAND_PREFIXES) {
		shapes.push(`${prefix}tee ${target}`);
		shapes.push(`${prefix}tee -a ${target}`);
		shapes.push(`${prefix}sed -i s/a/b/ ${target}`);
		shapes.push(`echo hi | ${prefix}tee ${target}`);
	}

	for (const splice of QUOTE_SPLICES) {
		shapes.push(`tee ${splice(target)}`);
	}

	for (const character of CHARACTERS_OUTSIDE_THE_CLASS) {
		shapes.push(`${character}cat ${target}`);
		shapes.push(`cat ${character} ${target}`);
		shapes.push(`cat ${target}${character}`);
	}

	shapes.push(...everyForgedProof(target));

	return shapes;
}

/**
 * Every command the arm claims to prove is a read, derived from the lists
 * rather than restated beside them.
 *
 * Derivation is the point. A hand-written sample named 12 of the inspection
 * commands and 2 of the git subcommands, and every false proof round 4 found
 * sat in the uncovered remainder. Iterating the constants makes coverage
 * complete by construction, so adding a command to a list cannot land without
 * a test row asserting what that addition claims.
 *
 * The suite can only ever check the arm against the list, never the list
 * against reality — see `SHELL_INSPECTION_COMMANDS` for where that judgment
 * is made.
 */
function everyProvableRead(target: string): string[] {
	const shapes: string[] = [];

	for (const name of SHELL_INSPECTION_COMMANDS.keys()) {
		shapes.push(`${name} ${target}`);
	}

	for (const subcommand of GIT_INSPECTION_SUBCOMMANDS) {
		shapes.push(`git ${subcommand} ${target}`);
	}

	// One flagged spelling per family, so the inert-flag lists are exercised
	// rather than only the bare forms above.
	shapes.push(
		`cat "${target}"`,
		`cat -n ${target}`,
		`head -20 ${target}`,
		`tail -n 5 ${target}`,
		`grep -rn foo ${target}`,
		`rg -i foo ${target}`,
		`wc -l ${target}`,
		`ls -la ${target}`,
		`diff -u a.md ${target}`,
		`git log --oneline -5 ${target}`,
		`git diff --stat ${target}`,
		`cat a.md; cat ${target}`,
		`cat a.md\ncat ${target}`,
		`cat ${target}\r\nhead -1 other.md`
	);

	return shapes;
}

/**
 * Commands round 4 drove through the arm, which certified each as a read and
 * then wrote the named path when run against a real filesystem, plus the two
 * shapes that executed an arbitrary program under the same proof.
 *
 * Kept as inputs rather than as prose because each one passed a green suite
 * once. They are appended to `everyUnprovableShape` so they run through both
 * the parser and the end-to-end arm.
 */
function everyForgedProof(target: string): string[] {
	return [
		`sort -o ${target} in.md`,
		`sort --output=${target} in.md`,
		`uniq input.md ${target}`,
		`xxd input.bin ${target}`,
		`git diff --output ${target}`,
		`git log -p --output ${target}`,
		`git show HEAD --output ${target}`,
		`git grep -O ./x.sh foo ${target}`,
		`rg --pre ./x.sh foo ${target}`,
		`sed -n 'w ${target}' input.md`,
		`sed s/a/b/w ${target} input.md`,
		`sed --in ${target}`,
		`sed --i ${target}`,
		`sed -n '1,5p' ${target}`,
		// A listed command carrying a flag its list does not name. The proof
		// is refused without anyone having to know what the flag does, which
		// is the property the per-command flag lists exist to provide.
		`cat --output ${target}`,
		`grep -o0utput foo ${target}`,
		`git -C /tmp diff ${target}`,
	];
}

test("parseUnprovenShellPaths: every shape no proof covers keeps naming its path", () => {
	for (const command of everyUnprovableShape(SHELL_ROUTED_PATH)) {
		assert.ok(
			parseUnprovenShellPaths(command).includes(SHELL_ROUTED_PATH),
			`${JSON.stringify(command)} is not provably a read, so its path stays a candidate`
		);
	}
});

test("parseUnprovenShellPaths: a provable read clears every path it names", () => {
	for (const command of everyProvableRead(SHELL_ROUTED_PATH)) {
		assert.deepEqual(
			parseUnprovenShellPaths(command).filter(
				(candidate) => candidate === SHELL_ROUTED_PATH
			),
			[],
			`${JSON.stringify(command)} reads its operands and writes nothing`
		);
	}
});

/**
 * Every separator inside the read channel's character class, in every spacing
 * a caller can write it. Separators outside the class need no spelling axis —
 * their character alone costs the command its proof, which
 * `CHARACTERS_OUTSIDE_THE_CLASS` covers.
 */
function everyInClassSeparatorSpelling(): string[] {
	const spellings: string[] = [];
	for (const separator of [";", "\n", "\r\n"]) {
		for (const spacing of [
			(value: string) => value,
			(value: string) => ` ${value}`,
			(value: string) => `${value} `,
			(value: string) => ` ${value} `,
		]) {
			spellings.push(spacing(separator));
		}
	}

	return spellings;
}

test("parseUnprovenShellPaths: one unprovable segment costs the whole command its proof", () => {
	// The counterweight to the provable-read case above. A read-only head
	// token vouches for its own operands only, and the proof is
	// all-or-nothing, so a command that is half read and half anything else
	// proves nothing.
	for (const separator of everyInClassSeparatorSpelling()) {
		assert.ok(
			parseUnprovenShellPaths(
				`cat a.md${separator}tee ${SHELL_ROUTED_PATH}`
			).includes(SHELL_ROUTED_PATH),
			`a ${JSON.stringify(separator)} separator does not let the cat vouch for the tee`
		);
	}
});

test("parseUnprovenShellPaths: a read stays proven across every in-class separator spelling", () => {
	// Without this, a splitter that cut nowhere would satisfy the case above
	// by never proving anything at all.
	for (const separator of everyInClassSeparatorSpelling()) {
		assert.deepEqual(
			parseUnprovenShellPaths(
				`cat a.md${separator}cat ${SHELL_ROUTED_PATH}`
			).filter((candidate) => candidate === SHELL_ROUTED_PATH),
			[],
			`a ${JSON.stringify(separator)} separator joins two reads, not a read and a write`
		);
	}
});

test("parseUnprovenShellPaths: an empty or absent command names nothing", () => {
	assert.deepEqual(parseUnprovenShellPaths(undefined), []);
	assert.deepEqual(parseUnprovenShellPaths(""), []);
	assert.deepEqual(parseUnprovenShellPaths("   "), []);
});

test("runPreToolUseArm: a shell command that names a routed path it cannot prove it reads is rerouted", async () => {
	// The end-to-end half of the generator above: the same shapes, driven
	// through the arm, so a candidate list that is right cannot pair with a
	// route lookup or a message that is not.
	await withTempRepo(async (repoRoot) => {
		const { target } = await seedGateRepo(repoRoot);

		for (const command of everyUnprovableShape(target)) {
			const reason = denyReason(
				await runPreToolUseArm(
					"claude",
					HARNESSES.claude,
					writePayload(repoRoot, target, {
						tool_name: "Bash",
						tool_input: { command },
					})
				)
			);

			assert.ok(reason, `${JSON.stringify(command)} reroutes on a routed path`);
			assert.match(
				reason,
				/redo this edit with your file-edit tool/,
				"the reroute judges no prerequisites, so it cannot be made unsatisfiable"
			);
		}
	});
});

test("runPreToolUseArm: the same shapes pass untouched when no route matches the path", async () => {
	// Route existence is the opt-in. Without this, a reroute that fired on
	// every shell command naming any path would pass the case above.
	await withTempRepo(async (repoRoot) => {
		await seedGateRepo(repoRoot);
		const unroutedTarget = path.join(repoRoot, "vendor", "bundle.js");

		for (const command of everyUnprovableShape(unroutedTarget)) {
			assert.equal(
				await runPreToolUseArm(
					"claude",
					HARNESSES.claude,
					writePayload(repoRoot, unroutedTarget, {
						tool_name: "Bash",
						tool_input: { command },
					})
				),
				null,
				`${JSON.stringify(command)} names no routed path`
			);
		}
	});
});

test("runPreToolUseArm: a provable read of a routed path is not rerouted", async () => {
	await withTempRepo(async (repoRoot) => {
		const { target } = await seedGateRepo(repoRoot);

		for (const command of everyProvableRead(target)) {
			assert.equal(
				await runPreToolUseArm(
					"claude",
					HARNESSES.claude,
					writePayload(repoRoot, target, {
						tool_name: "Bash",
						tool_input: { command },
					})
				),
				null,
				`${JSON.stringify(command)} only reads the routed path`
			);
		}
	});
});

test("runPreToolUseArm: a shell reroute fires even when the docs are already read", async () => {
	// The reroute judges no prerequisites by design — it points at a surface
	// the gate can check rather than asking for a condition first.
	await withTempRepo(async (repoRoot) => {
		const { target } = await seedGateRepo(repoRoot);
		await saveRouteState(repoRoot, "session-1", { read: [GATE_DOC], announced: [] });

		assert.ok(
			await runPreToolUseArm(
				"claude",
				HARNESSES.claude,
				writePayload(repoRoot, target, {
					tool_name: "Bash",
					tool_input: { command: `echo hi > ${target}` },
				})
			),
			"a shell write is rerouted on the strength of the route alone"
		);
	});
});

test("runPreToolUseArm: a shell reroute resolves its path against the command's own directory", async () => {
	// A relative operand from a subdirectory names a different file than the
	// same operand from the repo root, and rerouting the repo-root reading of
	// it would name a path the command never touches.
	await withTempRepo(async (repoRoot) => {
		await seedGateRepo(repoRoot);

		assert.ok(
			await runPreToolUseArm(
				"claude",
				HARNESSES.claude,
				writePayload(repoRoot, path.join(repoRoot, "src", "index.ts"), {
					tool_name: "Bash",
					cwd: path.join(repoRoot, "src"),
					tool_input: { command: "tee index.ts" },
				})
			),
			"`tee index.ts` from `src/` writes the routed `src/index.ts`"
		);

		assert.equal(
			await runPreToolUseArm(
				"claude",
				HARNESSES.claude,
				writePayload(repoRoot, path.join(repoRoot, "src", "index.ts"), {
					tool_name: "Bash",
					tool_input: { command: "tee index.ts" },
				})
			),
			null,
			"the same operand from the repo root writes an unrouted `index.ts`"
		);
	});
});

// --- The allow-list pre-filter (D3) ---

test("parseShellReadTargets: each class the allow-list closes yields zero targets", () => {
	for (const command of [
		"cat $DOC",
		"cat ${DOC}",
		"cat docs/one\\ two.md",
		"cat *.md",
		"cat {a,b}.md",
		"cat docs/one.md # a note",
		"cat !!:1",
	]) {
		assert.deepEqual(
			parseShellReadTargets(command),
			[],
			`${JSON.stringify(command)} carries a character outside the safe class`
		);
	}
});

test("parseShellReadTargets: positive control — a plain cat of a routed doc still credits", () => {
	// Without this, a class typo rejecting every command passes every case
	// above and reports a healthy suite over a dead credit channel.
	assert.deepEqual(
		parseShellReadTargets("cat .prism/architect/_toolkit/install-layout.md"),
		[{ filePath: ".prism/architect/_toolkit/install-layout.md", credit: true }]
	);
});

// --- Live manifest routing ---

/**
 * Two cases against this repo's own `.prism/architect/manifest.json`, so a
 * manifest edit that breaks routing fails here rather than in a session.
 * Scoped to routing — that an instruction-layer path routes somewhere and an
 * unroutable path routes nowhere — never to which paths deny, which is a
 * policy question the manifest is allowed to answer differently over time.
 */
test("the live manifest routes an instruction-layer path and leaves an unroutable one alone", async () => {
	const manifest = JSON.parse(
		await fs.readFile(
			path.join(repoRoot, ".prism", "architect", "manifest.json"),
			"utf8"
		)
	) as Record<string, string | string[]>;

	assert.ok(
		matchDocsForPath(manifest, ".prism/rules/code-standards.md").length > 0,
		"an always-on rule is instruction-layer content and must route somewhere"
	);
	assert.deepEqual(
		matchDocsForPath(manifest, "some/unrelated/app/file.ts"),
		[],
		"no route may match an arbitrary application path — that is the catch-all the deny cannot ship with"
	);
});

test("resolveListedToolKind: only a name the table states resolves, so the deny never rides the fallback", () => {
	assert.equal(resolveListedToolKind(HARNESSES.claude, "Write"), "write");
	assert.equal(resolveListedToolKind(HARNESSES.claude, "Edit"), "write");
	assert.equal(resolveListedToolKind(HARNESSES.claude, "SomeToolNobodyMapped"), null);
	assert.equal(resolveListedToolKind(HARNESSES.claude, undefined), null);
	assert.equal(
		resolveToolKind(HARNESSES.claude, "SomeToolNobodyMapped"),
		"write",
		"the announce fallback is unchanged — only the deny narrows"
	);
});
