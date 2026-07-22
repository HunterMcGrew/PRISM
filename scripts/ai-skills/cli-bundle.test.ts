/**
 * Regression coverage for the compiled `dist/cli.js` bundle's dispatch
 * behavior.
 *
 * Unit tests import source modules, where every file's `import.meta.url` is
 * its own distinct URL — they structurally cannot reproduce esbuild's bundle
 * collapse (every folded-in module's `import.meta.url` resolving to the one
 * output file). The bug this guards against only exists in the compiled
 * artifact, so this test builds a real bundle and spawns it as a subprocess,
 * mirroring `verify-pack-parity.ts`'s rationale for exercising the actual
 * shipped output rather than the source tree.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { buildBundle } from "./bundle";

/**
 * Output markers that only appear when a subcommand's own `main()` has
 * actually run, not when `cli.ts`'s usage banner merely lists the
 * subcommand's name — `USAGE` names every subcommand (including `prism
 * eject`), so a bare `prism eject` marker would false-positive against the
 * banner itself. Each alternative is drawn from a subcommand's own report
 * body rather than its name.
 */
const NO_SUBCOMMAND_OUTPUT =
	/prism:adopt|prism adopt:|Sync state:|Version:|PRISM-owned file\(s\) removed/;

let bundlePath: string;
let tempDir: string;

before(async () => {
	// `os.tmpdir()` returns a non-canonical path on macOS (`/var/...`, a symlink
	// to `/private/var/...`), while `fileURLToPath(import.meta.url)` resolves to
	// the canonical form. A bundle built under the non-canonical path would make
	// every guard's `import.meta.url` vs. `argv[1]` comparison mismatch for a
	// reason unrelated to the fix under test, silently defeating this test's
	// ability to catch a regression. Resolving the base dir first keeps the
	// bundle's path canonical end to end.
	const canonicalTmpRoot = await fs.realpath(os.tmpdir());
	tempDir = await fs.mkdtemp(path.join(canonicalTmpRoot, "prism-cli-bundle-"));
	bundlePath = path.join(tempDir, "cli.js");
	await buildBundle(bundlePath);
});

after(async () => {
	await fs.rm(tempDir, { recursive: true, force: true });
});

test("--help prints only the usage banner, no subcommand main() fires", () => {
	const result = spawnSync(process.execPath, [bundlePath, "--help"], {
		encoding: "utf8",
	});

	assert.equal(
		result.status,
		0,
		`expected exit 0, got ${result.status}; stderr: ${result.stderr}`
	);
	assert.equal(result.stderr, "");
	assert.match(result.stdout, /prism — PRISM consumer CLI/);
	assert.doesNotMatch(result.stdout, NO_SUBCOMMAND_OUTPUT);
});

test("bare invocation prints only the usage banner, no subcommand main() fires", () => {
	const result = spawnSync(process.execPath, [bundlePath], {
		encoding: "utf8",
	});

	assert.equal(
		result.status,
		0,
		`expected exit 0, got ${result.status}; stderr: ${result.stderr}`
	);
	assert.equal(result.stderr, "");
	assert.match(result.stdout, /Usage:/);
	assert.doesNotMatch(result.stdout, NO_SUBCOMMAND_OUTPUT);
});

test("an unknown subcommand errors cleanly through cli.ts's own dispatch only", () => {
	const result = spawnSync(
		process.execPath,
		[bundlePath, "definitely-not-a-command"],
		{ encoding: "utf8" }
	);

	assert.equal(
		result.status,
		1,
		`expected exit 1, got ${result.status}; stderr: ${result.stderr}`
	);
	assert.match(result.stderr, /unknown subcommand "definitely-not-a-command"/);
	assert.doesNotMatch(result.stdout, /prism:adopt|Sync state:|Version:/);
});
