/**
 * Coverage for consumer-target resolution — the seam that lets `prism:adopt` /
 * `prism:update` target the enclosing consumer repo when run from inside a
 * vendored PRISM, while leaving the #245 cwd-default path untouched.
 *
 * The git-topology cases build real git repos in temp dirs so the resolver's
 * `git rev-parse` probes run against actual repositories rather than mocks. Temp
 * paths are resolved through `fs.realpathSync` because `git rev-parse
 * --show-toplevel` returns the canonical (symlink-resolved) path — on macOS
 * `os.tmpdir()` is a `/var → /private/var` symlink, so a raw `path.resolve`
 * comparison would spuriously fail.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import { realpathSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import {
	parseConsumerFlag,
	resolveConsumerRoot,
	resolveEnclosingConsumerRoot,
} from "./lib/consumer-root";

/** Initializes a git repo at `dir` with deterministic, side-effect-free config. */
function gitInit(dir: string): void {
	execFileSync("git", ["init", "-q"], { cwd: dir, stdio: "ignore" });
	execFileSync("git", ["config", "user.email", "test@prism.local"], {
		cwd: dir,
		stdio: "ignore",
	});
	execFileSync("git", ["config", "user.name", "PRISM Test"], {
		cwd: dir,
		stdio: "ignore",
	});
}

/** Stages and commits everything under `dir` so the repo has a HEAD. */
function gitCommitAll(dir: string): void {
	execFileSync("git", ["add", "-A"], { cwd: dir, stdio: "ignore" });
	execFileSync("git", ["commit", "-q", "-m", "init"], {
		cwd: dir,
		stdio: "ignore",
	});
}

async function makeTempRoot(label: string): Promise<string> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), `prism-consumer-${label}-`));

	// realpathSync.native canonicalizes Windows 8.3 short names (RUNNER~1 ->
	// runneradmin) to match the long form git rev-parse --show-toplevel returns
	// on windows-latest CI runners; it still resolves symlinks like the JS impl,
	// so the macOS /var -> /private/var case above continues to work.
	return realpathSync.native(dir);
}

// --- precedence: explicit flag and cwd-default (no git) ---

test("resolveConsumerRoot lets an explicit --consumer flag win over vendored detection", () => {
	const cwd = "/some/prism/root";

	const resolved = resolveConsumerRoot({
		explicitConsumer: "../somewhere",
		cwd,
		selfPrismRoot: cwd,
	});

	assert.equal(resolved, path.resolve(cwd, "../somewhere"));
});

test("resolveConsumerRoot returns cwd when not run from inside PRISM, never shelling out to git", () => {
	const cwd = "/a/consumer/repo";
	const selfPrismRoot = "/elsewhere/PRISM";

	const resolved = resolveConsumerRoot({
		explicitConsumer: null,
		cwd,
		selfPrismRoot,
	});

	assert.equal(resolved, path.resolve(cwd));
});

// --- git topologies ---

test("resolveEnclosingConsumerRoot resolves plain-subdirectory vendoring (repo/PRISM)", async () => {
	const consumer = await makeTempRoot("plain");
	try {
		gitInit(consumer);
		const prismRoot = path.join(consumer, "PRISM");
		await fs.mkdir(prismRoot, { recursive: true });

		assert.equal(resolveEnclosingConsumerRoot(prismRoot), consumer);

		const resolved = resolveConsumerRoot({
			explicitConsumer: null,
			cwd: prismRoot,
			selfPrismRoot: prismRoot,
		});
		assert.equal(resolved, consumer);
	} finally {
		await fs.rm(consumer, { force: true, recursive: true });
	}
});

test("resolveEnclosingConsumerRoot resolves deeper plain nesting (repo/tools/PRISM) to the repo root", async () => {
	const consumer = await makeTempRoot("deep");
	try {
		gitInit(consumer);
		const prismRoot = path.join(consumer, "tools", "PRISM");
		await fs.mkdir(prismRoot, { recursive: true });

		// Depth-independence: git's walk-up lands on the repo root, not the
		// intermediate tools/ dir.
		assert.equal(resolveEnclosingConsumerRoot(prismRoot), consumer);

		const resolved = resolveConsumerRoot({
			explicitConsumer: null,
			cwd: prismRoot,
			selfPrismRoot: prismRoot,
		});
		assert.equal(resolved, consumer);
	} finally {
		await fs.rm(consumer, { force: true, recursive: true });
	}
});

test("resolveEnclosingConsumerRoot resolves a nested standalone clone via the parent walk", async () => {
	const consumer = await makeTempRoot("nested-clone");
	try {
		gitInit(consumer);
		const prismRoot = path.join(consumer, "PRISM");
		await fs.mkdir(prismRoot, { recursive: true });
		// PRISM is its own repo nested inside the consumer repo — show-toplevel from
		// prismRoot returns prismRoot, so resolution must step to the parent.
		gitInit(prismRoot);

		assert.equal(resolveEnclosingConsumerRoot(prismRoot), consumer);

		const resolved = resolveConsumerRoot({
			explicitConsumer: null,
			cwd: prismRoot,
			selfPrismRoot: prismRoot,
		});
		assert.equal(resolved, consumer);
	} finally {
		await fs.rm(consumer, { force: true, recursive: true });
	}
});

test("resolveEnclosingConsumerRoot returns null for a standalone PRISM with no enclosing repo", async () => {
	const prismRoot = await makeTempRoot("standalone");
	try {
		gitInit(prismRoot);

		assert.equal(resolveEnclosingConsumerRoot(prismRoot), null);

		assert.throws(
			() =>
				resolveConsumerRoot({
					explicitConsumer: null,
					cwd: prismRoot,
					selfPrismRoot: prismRoot,
				}),
			(err: unknown) => {
				assert.ok(err instanceof Error);
				assert.ok(
					err.message.includes("not nested inside another git repository"),
					`expected the no-enclosing-repo message, got: ${err.message}`
				);

				return true;
			}
		);
	} finally {
		await fs.rm(prismRoot, { force: true, recursive: true });
	}
});

test("resolveEnclosingConsumerRoot resolves a git submodule to the superproject root", async () => {
	const consumer = await makeTempRoot("submodule");
	try {
		gitInit(consumer);
		// A submodule needs a real source repo to add. `protocol.file.allow=always`
		// is required because modern git blocks file:// submodule transport by
		// default; the flag is scoped to this command only.
		const prismSource = await makeTempRoot("submodule-src");
		try {
			gitInit(prismSource);
			await fs.writeFile(path.join(prismSource, "README.md"), "# PRISM\n", "utf8");
			gitCommitAll(prismSource);

			let submoduleAdded = true;
			try {
				execFileSync(
					"git",
					[
						"-c",
						"protocol.file.allow=always",
						"submodule",
						"add",
						prismSource,
						"PRISM",
					],
					{ cwd: consumer, stdio: "ignore" }
				);
			} catch {
				// Submodule fixture setup can be environment-dependent in CI. The
				// submodule runtime path is verified by a recorded manual probe (see
				// plan prism-246 Decisions); a flaky fixture must not block the suite.
				submoduleAdded = false;
			}

			if (submoduleAdded) {
				const prismRoot = path.join(consumer, "PRISM");

				assert.equal(resolveEnclosingConsumerRoot(prismRoot), consumer);

				const resolved = resolveConsumerRoot({
					explicitConsumer: null,
					cwd: prismRoot,
					selfPrismRoot: prismRoot,
				});
				assert.equal(resolved, consumer);
			}
		} finally {
			await fs.rm(prismSource, { force: true, recursive: true });
		}
	} finally {
		await fs.rm(consumer, { force: true, recursive: true });
	}
});

// --- parseConsumerFlag ---

test("parseConsumerFlag reads both the space-separated and =-joined forms", () => {
	assert.equal(parseConsumerFlag(["--consumer", "/a/b"]), "/a/b");
	assert.equal(parseConsumerFlag(["--consumer=/a/b"]), "/a/b");
	assert.equal(parseConsumerFlag(["--other", "x"]), null);
	assert.equal(parseConsumerFlag([]), null);
});

test("parseConsumerFlag throws when --consumer is present but its value is empty", () => {
	const expectedPattern = /--consumer was given an empty value/;
	// --consumer "" (space-separated empty) — flag is present, value is an empty
	// string; silently falling through to detection would target a different repo
	// than the user intended.
	assert.throws(
		() => parseConsumerFlag(["--consumer", ""]),
		(err: unknown) => {
			assert.ok(err instanceof Error);
			assert.ok(
				expectedPattern.test(err.message),
				`expected empty-value error, got: ${err.message}`
			);
			return true;
		}
	);
	// --consumer= (inline empty) — same rule applies to the =-joined form.
	assert.throws(
		() => parseConsumerFlag(["--consumer="]),
		(err: unknown) => {
			assert.ok(err instanceof Error);
			assert.ok(
				expectedPattern.test(err.message),
				`expected empty-value error, got: ${err.message}`
			);
			return true;
		}
	);
});

test("parseConsumerFlag returns null when --consumer flag is absent entirely", () => {
	// Flag absent → fall through to vendored detection / cwd; never an error.
	assert.equal(parseConsumerFlag(["--other", "x"]), null);
	assert.equal(parseConsumerFlag([]), null);
});
