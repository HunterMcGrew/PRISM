#!/usr/bin/env tsx
/**
 * Cross-platform test discovery for `prism:test`.
 *
 * The npm script previously invoked `tsx --test scripts/ai-skills/*.test.ts`,
 * relying on the shell to expand the glob. That works on bash (ubuntu CI, local
 * Git Bash) but not on the windows-latest runner, where pnpm invokes scripts via
 * cmd.exe — cmd.exe does not expand globs, so `tsx` received the literal
 * unmatched pattern and exited 1 before running any test. Node's own `--test`
 * runner only globs natively on Node >=21; CI pins Node 20, so quoting the glob
 * would not have helped either.
 *
 * This wrapper discovers the test files with `node:fs` and runs them by spawning
 * `process.execPath` (the absolute Node binary) with tsx's CLI entrypoint and an
 * explicit file list. No shell and no glob are involved on any platform — the
 * argv array is passed straight to Node, so paths containing spaces and the
 * lack of cmd.exe glob expansion are both non-issues. The same set runs on
 * ubuntu CI, windows-latest CI, and local machines.
 */
import { readdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const testFiles = readdirSync(scriptDirectory)
	.filter((entry) => entry.endsWith(".test.ts"))
	.sort()
	.map((entry) => path.join(scriptDirectory, entry));

if (testFiles.length === 0) {
	console.error(`No *.test.ts files found in ${scriptDirectory}`);
	process.exit(1);
}

const tsxCli = require.resolve("tsx/cli");

const result = spawnSync(process.execPath, [tsxCli, "--test", ...testFiles], {
	stdio: "inherit",
});

if (result.error) {
	console.error(result.error.message);
	process.exit(1);
}

process.exit(result.status ?? 1);
