/**
 * Resolves which repo a consumer-side adopt/update run targets.
 *
 * Default behavior is cwd — the standalone/global-link workflow from #245 is
 * unchanged. The vendored case is the new path: when adopt/update runs from
 * inside a PRISM checkout (cwd resolves under the PRISM root), targeting PRISM
 * itself is nonsensical, so resolution retargets to the git repository that
 * encloses PRISM. An explicit `--consumer <dir>` flag overrides both.
 *
 * Enclosing-repo detection leans entirely on `git rev-parse`, never on manual
 * `.git` parsing:
 *   - PRISM vendored as a plain subdirectory (no own `.git`) — the common case —
 *     `git -C <prismRoot> rev-parse --show-toplevel` already returns the
 *     enclosing consumer root, because PRISM is not its own repo. Works at any
 *     nesting depth (`repo/PRISM`, `repo/tools/PRISM`).
 *   - PRISM as a git submodule — `.git` is a gitdir file; `git rev-parse
 *     --show-superproject-working-tree` returns the superproject (consumer) root.
 *   - PRISM as a nested standalone clone (own `.git`, not a submodule) —
 *     `show-toplevel` returns PRISM's own root and `show-superproject` is empty;
 *     resolution re-runs `show-toplevel` from PRISM's parent directory to find
 *     the enclosing repo.
 *   - PRISM not enclosed by any other git repo — all probes resolve to PRISM
 *     itself or fail; resolution throws rather than silently adopting `/` or home.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";

/** Runs a git command in `cwd`, returning trimmed stdout or null on any failure. */
function gitCapture(args: string[], cwd: string): string | null {
	try {
		const out = execFileSync("git", args, {
			cwd,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		});
		const trimmed = out.trim();

		return trimmed.length > 0 ? trimmed : null;
	} catch {
		return null;
	}
}

/**
 * Finds the git repository that encloses the PRISM checkout, or null when PRISM
 * is not nested inside another repo. See the file header for the three git
 * probes and why each is needed.
 */
export function resolveEnclosingConsumerRoot(prismRoot: string): string | null {
	const topLevel = gitCapture(["rev-parse", "--show-toplevel"], prismRoot);

	// Plain-subdirectory case: PRISM has no own .git, so show-toplevel already
	// points at the enclosing consumer repo. Resolved.
	if (topLevel !== null && path.resolve(topLevel) !== path.resolve(prismRoot)) {
		return path.resolve(topLevel);
	}

	// PRISM has its own repo identity (topLevel === prismRoot). Submodule first:
	// the superproject working tree is the consumer.
	const superproject = gitCapture(
		["rev-parse", "--show-superproject-working-tree"],
		prismRoot
	);
	if (superproject !== null) {
		return path.resolve(superproject);
	}

	// Nested standalone clone: step out of PRISM and ask git again from the parent.
	const parent = path.dirname(path.resolve(prismRoot));
	if (parent === path.resolve(prismRoot)) {
		return null;
	}

	const parentTopLevel = gitCapture(["rev-parse", "--show-toplevel"], parent);
	if (
		parentTopLevel !== null &&
		path.resolve(parentTopLevel) !== path.resolve(prismRoot)
	) {
		return path.resolve(parentTopLevel);
	}

	return null;
}

/**
 * Resolves the consumer root for an adopt/update run.
 *
 * Precedence: explicit `--consumer <dir>` > vendored-parent detection (cwd is
 * inside PRISM) > cwd. The vendored branch only fires when cwd resolves to the
 * PRISM root itself — running adopt/update from a separate consumer cwd keeps
 * the #245 behavior untouched.
 */
export function resolveConsumerRoot(options: {
	explicitConsumer: string | null;
	cwd: string;
	selfPrismRoot: string;
}): string {
	const { explicitConsumer, cwd, selfPrismRoot } = options;

	if (explicitConsumer !== null) {
		return path.resolve(cwd, explicitConsumer);
	}

	// When running as an installed npm package, selfPrismRoot is inside
	// node_modules/ — the cwd is the consumer repo by definition. Short-circuit
	// to cwd directly, skipping the vendored-enclosing-repo detection that only
	// applies to PRISM-inside-consumer-repo workflows.
	if (selfPrismRoot.includes(path.sep + "node_modules" + path.sep)) {
		return path.resolve(cwd);
	}

	const runningFromInsidePrism =
		path.resolve(cwd) === path.resolve(selfPrismRoot);
	if (!runningFromInsidePrism) {
		return path.resolve(cwd);
	}

	const enclosing = resolveEnclosingConsumerRoot(selfPrismRoot);
	if (enclosing === null) {
		throw new Error(
			"prism: running from inside the PRISM checkout, but PRISM is not nested " +
				"inside another git repository — there is no consumer repo to target. " +
				"Run from your consumer repo, vendor PRISM inside it, or pass " +
				"--consumer <path-to-consumer-repo>."
		);
	}

	if (path.resolve(enclosing) === path.resolve(selfPrismRoot)) {
		throw new Error(
			"prism: enclosing-repo detection resolved back to the PRISM checkout " +
				"itself — refusing to adopt PRISM into PRISM. Pass --consumer <path> " +
				"to target the consumer repo explicitly."
		);
	}

	return path.resolve(enclosing);
}

/**
 * Guards against running adopt/update against a directory that isn't inside a
 * git repository. Uses the same `git rev-parse` probe style as the rest of
 * this file (`--is-inside-work-tree` returns `"true"` on stdout when `dir` is
 * inside a work tree, and a non-zero exit — caught by `gitCapture` — anywhere
 * else, including when `git` itself isn't installed).
 *
 * Without this guard, a bad `--consumer` path or a stray invocation outside
 * any repo still runs the full write pass: PRISM-owned files land on disk
 * with no version control underneath them, so a bad sync can't be reviewed or
 * reverted via `git diff` / `git checkout`. Failing fast here, before any
 * file is touched, keeps that safety net in place.
 */
export function assertInsideGitRepo(dir: string): void {
	const result = gitCapture(["rev-parse", "--is-inside-work-tree"], dir);

	if (result !== "true") {
		throw new Error(
			`prism: ${dir} is not inside a git repository. PRISM writes files that ` +
				"should be reviewable and revertable via git — run this from inside a " +
				"git repo, or pass --consumer <path-to-a-git-repo>."
		);
	}
}

/** Parses the `--consumer <dir>` / `--consumer=<dir>` flag from argv, or null. */
export function parseConsumerFlag(argv: string[]): string | null {
	const flagIndex = argv.indexOf("--consumer");
	if (flagIndex !== -1) {
		const value = argv[flagIndex + 1];
		if (!value) {
			// Flag present but value is empty or missing — explicit intent to override,
			// but no path given. A silent fallback would target a different repo than
			// the user intended, which is worse than the error.
			throw new Error(
				"--consumer was given an empty value; pass a directory path (e.g. --consumer /path/to/repo)"
			);
		}

		return value;
	}

	const inlineFlag = argv.find((arg) => arg.startsWith("--consumer="));
	if (inlineFlag) {
		const value = inlineFlag.slice("--consumer=".length);
		if (!value) {
			// Same rule for the --consumer= form — present but empty is an error.
			throw new Error(
				"--consumer was given an empty value; pass a directory path (e.g. --consumer /path/to/repo)"
			);
		}

		return value;
	}

	return null;
}

/**
 * Parses the `--dry-run` flag from argv. A boolean-valued flag, unlike
 * `--consumer` / `--prism-source` — presence means `true`, absence means
 * `false`. Shared by `adopt.ts`'s and `update.ts`'s CLI entry points so both
 * commands recognize the flag the same way.
 */
export function parseDryRunFlag(argv: string[]): boolean {
	return argv.includes("--dry-run");
}

/**
 * Parses the `--yes` flag from argv. Same boolean-flag shape as
 * `parseDryRunFlag` — presence means `true`, absence means `false`. Used by
 * `eject.ts` to require explicit confirmation before any deletion — without
 * it, `prism eject` is dry-run-by-default.
 */
export function parseConfirmFlag(argv: string[]): boolean {
	return argv.includes("--yes");
}
