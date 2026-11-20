/**
 * Pins that an update removes the shell splitter the hook runtime stopped
 * shipping.
 *
 * `lib/shell.mjs` was delivered to every consumer before the gates moved onto
 * `lib/segments.mjs`, so a consumer's marked copy has to leave on their next
 * `prism update`, with its bytes kept as a `.bak`.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { HOOK_RUNTIME_MARKER, refreshHookRuntime } from "./update";

test("refreshHookRuntime backs up and removes a marked lib/shell.mjs the runtime no longer ships", async () => {
	const tempRoot = await fs.mkdtemp(
		path.join(os.tmpdir(), "prism-prune-shell-")
	);
	try {
		const prismRepoRoot = path.join(tempRoot, "prism");
		const consumerRepoRoot = path.join(tempRoot, "consumer");
		const consumerLibDir = path.join(consumerRepoRoot, ".claude", "hooks", "lib");
		const oldSplitter = `// ${HOOK_RUNTIME_MARKER}\nexport const splitShellSegments = () => [];\n`;

		// An empty source hooks dir is enough: nothing is delivered, so only the
		// prune pass can touch the consumer's old copy.
		await fs.mkdir(path.join(prismRepoRoot, "scripts", "ai-skills", "hooks"), {
			recursive: true,
		});
		await fs.mkdir(consumerLibDir, { recursive: true });
		await fs.writeFile(path.join(consumerLibDir, "shell.mjs"), oldSplitter);

		await refreshHookRuntime(prismRepoRoot, consumerRepoRoot, false, []);

		await assert.rejects(
			fs.access(path.join(consumerLibDir, "shell.mjs")),
			"the old splitter is gone from the consumer"
		);
		assert.equal(
			await fs.readFile(path.join(consumerLibDir, "shell.mjs.bak"), "utf8"),
			oldSplitter,
			"the consumer can recover the removed bytes from the .bak"
		);
	} finally {
		await fs.rm(tempRoot, { force: true, recursive: true });
	}
});
