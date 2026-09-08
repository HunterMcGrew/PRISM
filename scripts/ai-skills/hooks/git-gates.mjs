#!/usr/bin/env node
// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
/**
 * Two `PreToolUse` gates on the shell tool, opted in per consumer through
 * `.ai-skills/config.json#hooks` (ADR-0076).
 *
 * - **Commit cleanup pass** (`hooks.commitCleanupPass`): the first `git
 *   commit` on each HEAD is denied with a pointer to
 *   `.prism/references/cleanup-pass.md`; the retry of the same command goes
 *   through. State is saved before the deny, so a crash between the deny and
 *   the retry fails open rather than looping.
 * - **Push verification** (`hooks.pushVerification`): `commands.lint` and
 *   `commands.format` run before every `git push`, and a non-zero exit denies
 *   the push with the output tail. A command that times out or cannot start
 *   allows the push and says so — a silent allow would make a broken lint
 *   command indistinguishable from a passing one.
 *
 * The contract every path keeps: exit 0, at most one deny per invocation, and
 * nothing written when the config has no `hooks` block. A `git commit && git
 * push` one-liner surfaces the commit hold first; the retry evaluates the
 * push.
 *
 * The gate recognizes a `git commit` / `git push` segment in the command text
 * — the same technique `hook.mjs` uses to judge `git` subcommands for the
 * write gate — because no harness exposes a pre-commit event of its own.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { MAX_EMISSION_BYTES, pruneStaleRouteState } from "./architect-route.mjs";
import { resolveListedToolKind } from "./harnesses.mjs";
import {
	isForeignPayload,
	parseEventFlag,
	readStdin,
	resolveHarnessFromArgv,
} from "./hook.mjs";
import { splitShellSegments, unquote } from "./lib/shell.mjs";

const STATE_FILE_PREFIX = "git-gates-state.";

const DEFAULT_PUSH_VERIFICATION_TIMEOUT_MS = 120000;

const PUSH_VERIFICATION_SLOTS = ["lint", "format"];

const COMMIT_DENY_REASON = [
	"Cleanup pass before this commit (once per HEAD — the retry of this same command goes through).",
	"Re-read the diff with the three lenses, fix what is in the local frame, log the rest under ## Cleanup Items:",
	"cat .prism/references/cleanup-pass.md",
	"git diff --cached",
].join("\n");

/**
 * How a shell reports that the command it was handed does not exist. Under
 * `shell: true` a missing binary never surfaces as `ENOENT` on `result.error`
 * — the shell starts fine and reports the miss itself: every POSIX shell as
 * exit `127`, `cmd.exe` as exit `1` with this message on stderr. The
 * fail-open path recognizes both, so a lint command that is not installed
 * announces itself rather than holding every push until the config changes.
 */
const POSIX_COMMAND_NOT_FOUND_STATUS = 127;
const CMD_EXE_COMMAND_NOT_FOUND = /is not recognized as an internal or external command/;

/**
 * One recognized segment: which gate it reaches, and every `-C <dir>` the
 * invocation carried, in order, unresolved — git applies each relative to
 * the one before, so the caller resolves the chain against the command's
 * own working directory.
 *
 * @typedef {Object} GitGateSegment
 * @property {"commit" | "push"} subcommand
 * @property {string[]} directories
 */

/**
 * The `git` subcommand one command segment runs, or `null` when the segment
 * is not a `git` invocation.
 *
 * Leading `NAME=value` assignments and a leading `env` are skipped, so
 * `MSYS_NO_PATHCONV=1 git commit` reads as a commit. The head token must be
 * `git` or a path ending in `git`. Between the head and the subcommand, `-C
 * <dir>`, `-c <k=v>`, `--git-dir`, and `--work-tree` consume their value and
 * every other `-`-prefixed token is skipped; the first bare token is the
 * subcommand. `-C` values are kept because they move the repo the commit
 * lands in; `--git-dir` and `--work-tree` also do, and are an accepted gap —
 * a commit spelled that way is keyed on the working directory's HEAD.
 *
 * @param {string[]} tokens
 * @returns {{subcommand: string, args: string[], directories: string[]} | null}
 */
function resolveGitInvocation(tokens) {
	let index = 0;
	while (
		index < tokens.length &&
		(/^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[index]) || tokens[index] === "env")
	) {
		index++;
	}

	const head = unquote(tokens[index] ?? "");
	if (head !== "git" && !/[/\\]git$/.test(head)) {
		return null;
	}

	/** @type {string[]} */
	const directories = [];
	index++;
	while (index < tokens.length) {
		const token = tokens[index];
		if (!token.startsWith("-")) {
			return { subcommand: token, args: tokens.slice(index + 1), directories };
		}

		if (token === "-C" && index + 1 < tokens.length) {
			directories.push(unquote(tokens[index + 1]));
		}

		const takesValue =
			token === "-C" || token === "-c" || token === "--git-dir" || token === "--work-tree";
		index += takesValue ? 2 : 1;
	}

	return null;
}

/**
 * The `commit` and `push` segments a shell command runs, in order, one entry
 * per matching segment, each carrying the `-C` directories it was given.
 *
 * `commit` counts with any flags — an `--amend` rewrites content the cleanup
 * pass should see. `push` counts with any flags except `--delete`/`-d`, where
 * there is nothing to verify. Every other subcommand, and any command whose
 * head is not `git`, yields nothing: `gh pr create`, `git merge`, and
 * `echo "git commit"` are all silent.
 *
 * The HEREDOC commit form from `git-conventions.md` § Formatting — `git commit
 * -m "$(cat <<'EOF' … EOF)"` — is one double-quoted token to the splitter, so
 * the head and subcommand read is unaffected. An unquoted heredoc body is
 * skipped by the splitter. One gap is accepted: a `"` inside such a body
 * closes the splitter's quote early and the remainder tokenizes as commands.
 * Only a body line beginning with `git push` could trip a spurious check, and
 * a spurious push check blocks nothing unless lint actually fails.
 *
 * @param {string | undefined} command
 * @returns {GitGateSegment[]}
 */
export function detectGitSegments(command) {
	if (typeof command !== "string" || command.trim().length === 0) {
		return [];
	}

	/** @type {GitGateSegment[]} */
	const segments = [];
	for (const tokens of splitShellSegments(command)) {
		const invocation = resolveGitInvocation(tokens);
		if (invocation === null) {
			continue;
		}

		if (invocation.subcommand === "commit") {
			segments.push({ subcommand: "commit", directories: invocation.directories });
		} else if (
			invocation.subcommand === "push" &&
			!invocation.args.some((arg) => arg === "--delete" || arg === "-d")
		) {
			segments.push({ subcommand: "push", directories: invocation.directories });
		}
	}

	return segments;
}

/**
 * Walks upward from `startDir` to the first directory containing
 * `.ai-skills/config.json`, or `null` when the walk reaches `stopDir` (or
 * the filesystem root) without finding one. `stopDir` is inclusive: it is
 * checked, and the walk ends there.
 *
 * Deliberately not `findRepoRoot` from `architect-route.mjs`: that keys on
 * `.prism/architect/manifest.json`, a different feature's file, and a consumer
 * with a config but no manifest would have the gates silently off.
 *
 * @param {string} startDir
 * @param {string | null} [stopDir]
 * @returns {Promise<string | null>}
 */
export async function findConfigRoot(startDir, stopDir = null) {
	let dir = path.resolve(startDir);

	while (true) {
		try {
			await fs.access(path.join(dir, ".ai-skills", "config.json"));
			return dir;
		} catch {
			// Not here — keep walking up.
		}

		if (stopDir !== null && path.relative(stopDir, dir) === "") {
			return null;
		}

		const parent = path.dirname(dir);
		if (parent === dir) {
			return null;
		}
		dir = parent;
	}
}

/**
 * The working-tree root of the git repo `dir` sits in, or `null` when `dir`
 * is not inside one.
 *
 * @param {string} dir
 * @returns {string | null}
 */
function resolveGitToplevel(dir) {
	const result = spawnSync("git", ["rev-parse", "--show-toplevel"], {
		cwd: dir,
		encoding: "utf8",
		timeout: 5000,
		windowsHide: true,
	});
	if (result.error || result.status !== 0) {
		return null;
	}

	const toplevel = result.stdout.trim();
	return toplevel.length > 0 ? path.resolve(toplevel) : null;
}

/**
 * The directory a segment's `git` runs in: the command's own working
 * directory with each `-C` applied in order, the way git applies them.
 *
 * @param {string} cwd
 * @param {GitGateSegment} segment
 * @returns {string}
 */
function resolveSegmentDir(cwd, segment) {
	return segment.directories.reduce((dir, next) => path.resolve(dir, next), cwd);
}

/**
 * The parsed consumer config, or `null` when it cannot be read or is not
 * JSON. A parse failure announces itself on stderr because a config the
 * consumer just edited by hand is the likeliest cause, and a gate that goes
 * quiet on a typo is one the consumer will not know to fix.
 *
 * @param {string} configRoot
 * @returns {Promise<Record<string, unknown> | null>}
 */
async function loadConsumerConfig(configRoot) {
	let raw;
	try {
		raw = await fs.readFile(path.join(configRoot, ".ai-skills", "config.json"), "utf8");
	} catch {
		return null;
	}

	try {
		const parsed = JSON.parse(raw);
		return typeof parsed === "object" && parsed !== null ? parsed : null;
	} catch {
		process.stderr.write("git-gates: .ai-skills/config.json is not valid JSON — gates off\n");
		return null;
	}
}

/**
 * @param {string} configRoot
 * @param {string} scopeId
 * @returns {string}
 */
function buildStateFilePath(configRoot, scopeId) {
	const safeScopeId = scopeId.replace(/[^a-zA-Z0-9._-]/g, "_");
	return path.join(configRoot, ".prism", `${STATE_FILE_PREFIX}${safeScopeId}.json`);
}

/**
 * The per-scope cleanup-pass state, or an empty one when the file is absent,
 * unreadable, or not the shape this version writes. The file is a cache: an
 * unrecognized one costs one repeated hold rather than a bricked gate.
 *
 * @param {string} statePath
 * @returns {Promise<{cleanupPassSeen: string[]}>}
 */
async function loadGateState(statePath) {
	try {
		const parsed = JSON.parse(await fs.readFile(statePath, "utf8"));
		return {
			cleanupPassSeen: Array.isArray(parsed.cleanupPassSeen) ? parsed.cleanupPassSeen : [],
		};
	} catch {
		return { cleanupPassSeen: [] };
	}
}

/**
 * Persists the gate state atomically — a tmp file in the same directory
 * followed by `rename`, the pattern `saveRouteState` uses, so a hook process
 * killed mid-write leaves either the prior state or the new one.
 *
 * @param {string} statePath
 * @param {{cleanupPassSeen: string[]}} state
 * @returns {Promise<void>}
 */
async function saveGateState(statePath, state) {
	await fs.mkdir(path.dirname(statePath), { recursive: true });

	const tmpPath = `${statePath}.tmp`;
	await fs.writeFile(tmpPath, `${JSON.stringify(state, null, "\t")}\n`, "utf8");

	try {
		await fs.rename(tmpPath, statePath);
	} catch (error) {
		await fs.rm(tmpPath, { force: true });
		throw error;
	}
}

/**
 * The HEAD sha of the repo a commit lands in, or `"unborn"` when there is
 * none — a repo with no commits yet is still gated once on its first commit.
 *
 * Resolved from the commit's own directory rather than the config root: a
 * `git -C <dir> commit` into a separate nested repo would otherwise be keyed
 * on the config root's unchanging HEAD and skip the hold for the rest of the
 * session after the first one.
 *
 * @param {string} commitDir
 * @returns {string}
 */
function resolveHeadKey(commitDir) {
	const head = spawnSync("git", ["rev-parse", "HEAD"], {
		cwd: commitDir,
		encoding: "utf8",
		timeout: 5000,
		windowsHide: true,
	});
	if (head.error || head.status !== 0) {
		return "unborn";
	}

	const sha = head.stdout.trim();
	return sha.length > 0 ? sha : "unborn";
}

/**
 * Serializes one harness envelope, or `null` on a host whose envelope is not
 * known — the same fail-open `hook.mjs` applies to `emitDeny`.
 *
 * @param {unknown} envelope
 * @returns {string | null}
 */
function serializeEnvelope(envelope) {
	return envelope === null || envelope === undefined ? null : JSON.stringify(envelope);
}

/**
 * The commit gate: one deny per HEAD per scope. Save-before-deny is what makes
 * the retry go through — if the save itself fails (a read-only `.prism/`), the
 * commit is allowed with a stderr line rather than held forever.
 *
 * @param {import("./harnesses.mjs").HarnessSpec} spec
 * @param {string} configRoot
 * @param {string} scopeId
 * @param {string} commitDir the directory the commit runs in, after any `-C`
 * @returns {Promise<string | null>}
 */
async function runCommitGate(spec, configRoot, scopeId, commitDir) {
	await pruneStaleRouteState(configRoot, STATE_FILE_PREFIX);

	const statePath = buildStateFilePath(configRoot, scopeId);
	const state = await loadGateState(statePath);
	const headKey = resolveHeadKey(commitDir);
	if (state.cleanupPassSeen.includes(headKey)) {
		return null;
	}

	state.cleanupPassSeen.push(headKey);
	try {
		await saveGateState(statePath, state);
	} catch {
		process.stderr.write("git-gates: could not record cleanup-pass state — commit allowed\n");
		return null;
	}

	return serializeEnvelope(spec.emitDeny(COMMIT_DENY_REASON));
}

/**
 * The last `MAX_EMISSION_BYTES` of a command's combined output, cut at a line
 * boundary so the reason never opens mid-line.
 *
 * @param {string} stdout
 * @param {string} stderr
 * @returns {string}
 */
function formatOutputTail(stdout, stderr) {
	const combined = `${stdout ?? ""}${stderr ?? ""}`.trimEnd();
	if (Buffer.byteLength(combined, "utf8") <= MAX_EMISSION_BYTES) {
		return combined;
	}

	const tail = Buffer.from(combined, "utf8")
		.subarray(-MAX_EMISSION_BYTES)
		.toString("utf8");
	const firstLineBreak = tail.indexOf("\n");

	return firstLineBreak === -1 ? tail : tail.slice(firstLineBreak + 1);
}

/**
 * The push gate: `commands.lint` then `commands.format`, sequentially so a
 * deny names exactly one command. `shell: true` because `pnpm` is a `.cmd`
 * shim on Windows and the config value is a shell line, not an argv.
 *
 * @param {import("./harnesses.mjs").HarnessSpec} spec
 * @param {string} configRoot
 * @param {Record<string, unknown>} config
 * @param {Record<string, unknown>} hooks
 * @returns {string | null}
 */
function runPushGate(spec, configRoot, config, hooks) {
	const commands =
		typeof config.commands === "object" && config.commands !== null
			? /** @type {Record<string, unknown>} */ (config.commands)
			: {};
	const configuredTimeout = hooks.pushVerificationTimeoutMs;
	const timeout =
		typeof configuredTimeout === "number" && configuredTimeout > 0
			? configuredTimeout
			: DEFAULT_PUSH_VERIFICATION_TIMEOUT_MS;

	for (const slot of PUSH_VERIFICATION_SLOTS) {
		const command = commands[slot];
		if (typeof command !== "string" || command.trim().length === 0) {
			continue;
		}

		const result = spawnSync(command, {
			shell: true,
			cwd: configRoot,
			encoding: "utf8",
			timeout,
			maxBuffer: 8 * 1024 * 1024,
			windowsHide: true,
		});

		const spawnError = /** @type {NodeJS.ErrnoException | undefined} */ (result.error);
		const notFound =
			result.status === POSIX_COMMAND_NOT_FOUND_STATUS ||
			(result.status !== 0 && CMD_EXE_COMMAND_NOT_FOUND.test(result.stderr ?? ""));
		if (spawnError || notFound) {
			const why =
				spawnError?.code === "ETIMEDOUT"
					? `timed out after ${timeout}ms`
					: `could not start (${spawnError?.code ?? "command not found"})`;
			const line = `git-gates: \`${command}\` ${why} — push allowed, run it yourself`;
			process.stderr.write(`${line}\n`);

			return serializeEnvelope(spec.emitAllow(line));
		}

		if (result.status !== 0) {
			const reason =
				`Push verification failed: \`${command}\` exited ${result.status}. Fix, commit the fix, then retry the push.\n` +
				`--- last lines of output ---\n${formatOutputTail(result.stdout, result.stderr)}`;

			return serializeEnvelope(spec.emitDeny(reason));
		}
	}

	return null;
}

/**
 * The config that governs a segment: found by walking up from the directory
 * the segment's `git` runs in, and no further than that repo's own toplevel.
 * A separate nested repo is therefore governed by its own config or by none
 * — the enclosing repo's gates never reach into it, and its `commands.*`
 * never run there. Returns `null` when no config governs the directory or the
 * config carries no `hooks` block.
 *
 * `cache` is keyed by config root so a `git commit && git push` one-liner
 * reads and, on a parse error, announces the same file once.
 *
 * @param {string} dir
 * @param {Map<string, GateContext | null>} cache
 * @returns {Promise<GateContext | null>}
 */
async function resolveGateContext(dir, cache) {
	const configRoot = await findConfigRoot(dir, resolveGitToplevel(dir));
	if (configRoot === null) {
		return null;
	}

	if (cache.has(configRoot)) {
		return cache.get(configRoot) ?? null;
	}

	const config = await loadConsumerConfig(configRoot);
	const context =
		config === null || typeof config.hooks !== "object" || config.hooks === null
			? null
			: {
					configRoot,
					config,
					hooks: /** @type {Record<string, unknown>} */ (config.hooks),
				};
	cache.set(configRoot, context);

	return context;
}

/**
 * @typedef {Object} GateContext
 * @property {string} configRoot
 * @property {Record<string, unknown>} config
 * @property {Record<string, unknown>} hooks
 */

/**
 * Computes one harness's git-gates result for an already-read stdin payload —
 * the JSON string to write to stdout, or `null` when nothing should be written.
 * Every early exit is a `null`: a kill switch, an unparseable payload, a
 * foreign payload, a tool the harness does not list as shell, a missing scope
 * id, a command with no `commit`/`push` segment, no config governing the
 * directory a segment runs in, or a config with no `hooks` block.
 *
 * Does no process-level I/O beyond stderr, so a test can call it directly.
 * `env` is a parameter for the same reason.
 *
 * @param {string} tool
 * @param {import("./harnesses.mjs").HarnessSpec} spec
 * @param {string} rawStdin
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {Promise<string | null>}
 */
export async function runGitGatesArm(tool, spec, rawStdin, env = process.env) {
	if (env.PRISM_HOOK_DISABLE === "1" || env.PRISM_HOOK_DENY_DISABLE === "1") {
		return null;
	}

	try {
		/** @type {import("./harnesses.mjs").HookPayload} */
		let payload;
		try {
			payload = JSON.parse(rawStdin);
		} catch {
			return null;
		}

		if (isForeignPayload(tool, payload)) {
			return null;
		}

		if (resolveListedToolKind(spec, payload.tool_name) !== "shell") {
			return null;
		}

		const scopeId = spec.scopeId(payload);
		if (!scopeId) {
			return null;
		}

		const segments = detectGitSegments(payload.tool_input?.command);
		const commit = segments.find((segment) => segment.subcommand === "commit");
		const push = segments.find((segment) => segment.subcommand === "push");
		if (commit === undefined && push === undefined) {
			return null;
		}

		const cwd = payload.cwd ?? process.cwd();
		/** @type {Map<string, GateContext | null>} */
		const contexts = new Map();

		if (commit !== undefined) {
			const commitDir = resolveSegmentDir(cwd, commit);
			const context = await resolveGateContext(commitDir, contexts);
			if (context !== null && context.hooks.commitCleanupPass === true) {
				const deny = await runCommitGate(spec, context.configRoot, scopeId, commitDir);
				if (deny !== null) {
					return deny;
				}
			}
		}

		if (push !== undefined) {
			const context = await resolveGateContext(resolveSegmentDir(cwd, push), contexts);
			if (context !== null && context.hooks.pushVerification === true) {
				return runPushGate(spec, context.configRoot, context.config, context.hooks);
			}
		}

		return null;
	} catch (error) {
		process.stderr.write(
			`git-gates failed: ${error instanceof Error ? error.message : String(error)}\n`
		);
		return null;
	}
}

/**
 * Entry path. Mirrors `hook.mjs`'s `main`: the kill switch is checked before
 * stdin is parsed, every path sets `process.exitCode` and returns so pending
 * stdout writes drain, and only `--event=PreToolUse` dispatches — any other
 * event exits 0 with nothing written.
 */
async function main() {
	if (process.env.PRISM_HOOK_DISABLE === "1") {
		process.exitCode = 0;
		return;
	}

	const argv = process.argv.slice(2);
	const resolved = resolveHarnessFromArgv(argv);
	if (resolved === null) {
		process.exitCode = 0;
		return;
	}

	let rawStdin = "";
	try {
		rawStdin = await readStdin();
	} catch {
		process.exitCode = 0;
		return;
	}

	if (parseEventFlag(argv) !== "PreToolUse") {
		process.exitCode = 0;
		return;
	}

	const output = await runGitGatesArm(resolved.tool, resolved.spec, rawStdin);
	if (output !== null) {
		process.stdout.write(output);
	}
	process.exitCode = 0;
}

/**
 * Only runs `main()` — which blocks on stdin — when this file is the process
 * entry point, so a test importing `runGitGatesArm` does not hang on a stdin
 * that never ends.
 */
const isEntryPoint =
	process.argv[1] !== undefined &&
	fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isEntryPoint) {
	main().catch(() => {
		process.exitCode = 0;
	});
}
