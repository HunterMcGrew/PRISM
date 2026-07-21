/**
 * Regression suite for the two build-time output guards.
 *
 * `runLiteralGuard` is the PRISM-build-only de-thriving canary — it flags
 * Thrive-flavored literals that should have been tokenized at the canonical
 * source. `runLeftoverTokenGuard` flags unresolved `${TOKEN}` literals and is
 * safe on both PRISM and consumer output. The two are asymmetric on purpose:
 * a consumer legitimately contains "Thrive" but never an unresolved token, so
 * the consumer flow runs only the leftover-token guard (plan prism-242
 * Decision "Two guards, not one"). Each test seeds a throwaway platform-output
 * root and asserts which guard fires.
 */
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import test from "node:test";
import assert from "node:assert/strict";

import {
	runConsumerSeedLiteralGuard,
	runLeftoverTokenGuard,
	runLiteralGuard,
} from "./literal-guard";

async function withTempRoot(
	body: (repoRoot: string, platformRoot: string) => Promise<void>
): Promise<void> {
	const repoRoot = await fs.mkdtemp(
		path.join(os.tmpdir(), "prism-literal-guard-")
	);
	const platformRoot = path.join(repoRoot, ".claude", "skills");
	await fs.mkdir(platformRoot, { recursive: true });
	try {
		await body(repoRoot, platformRoot);
	} finally {
		await fs.rm(repoRoot, { force: true, recursive: true });
	}
}

async function writeOutput(
	platformRoot: string,
	relativePath: string,
	content: string
): Promise<void> {
	const absolutePath = path.join(platformRoot, relativePath);
	await fs.mkdir(path.dirname(absolutePath), { recursive: true });
	await fs.writeFile(absolutePath, content, "utf8");
}

test("literal guard flags a Thrive-flavored literal", async () => {
	await withTempRoot(async (repoRoot, platformRoot) => {
		await writeOutput(platformRoot, "prism-x/SKILL.md", "See the Thrive docs.\n");

		const violations = await runLiteralGuard(repoRoot, [platformRoot]);

		assert.equal(violations.length, 1);
		assert.equal(violations[0].match, "Thrive");
		assert.equal(violations[0].line, 1);
	});
});

test("literal guard ignores a leftover token", async () => {
	await withTempRoot(async (repoRoot, platformRoot) => {
		await writeOutput(platformRoot, "prism-x/SKILL.md", "Run ${PROJECT} build.\n");

		const violations = await runLiteralGuard(repoRoot, [platformRoot]);

		assert.equal(violations.length, 0);
	});
});

test("leftover-token guard flags an unresolved token", async () => {
	await withTempRoot(async (repoRoot, platformRoot) => {
		await writeOutput(
			platformRoot,
			"prism-x/SKILL.md",
			"Ticket prefix is ${TICKET_PREFIX}.\n"
		);

		const violations = await runLeftoverTokenGuard(repoRoot, [platformRoot]);

		assert.equal(violations.length, 1);
		assert.equal(violations[0].match, "${TICKET_PREFIX}");
		assert.equal(violations[0].line, 1);
	});
});

test("leftover-token guard ignores a Thrive literal", async () => {
	await withTempRoot(async (repoRoot, platformRoot) => {
		await writeOutput(platformRoot, "prism-x/SKILL.md", "See the Thrive docs.\n");

		const violations = await runLeftoverTokenGuard(repoRoot, [platformRoot]);

		assert.equal(violations.length, 0);
	});
});

test("leftover-token guard passes on a fully substituted output", async () => {
	await withTempRoot(async (repoRoot, platformRoot) => {
		await writeOutput(
			platformRoot,
			"prism-x/SKILL.md",
			"Run Acme build for ACME-123.\n"
		);

		const violations = await runLeftoverTokenGuard(repoRoot, [platformRoot]);

		assert.equal(violations.length, 0);
	});
});

test("seed literal guard flags a PRISM ticket reference", async () => {
	await withTempRoot(async (repoRoot, platformRoot) => {
		await writeOutput(platformRoot, "architect/foo.md", "See PRISM-1234 for context.\n");

		const violations = await runConsumerSeedLiteralGuard(repoRoot, platformRoot);

		assert.equal(violations.length, 1);
		assert.equal(violations[0].match, "PRISM-1234");
	});
});

test("seed literal guard flags a THR ticket reference", async () => {
	await withTempRoot(async (repoRoot, platformRoot) => {
		await writeOutput(platformRoot, "architect/foo.md", "Originating incident: THR-1.\n");

		const violations = await runConsumerSeedLiteralGuard(repoRoot, platformRoot);

		assert.equal(violations.length, 1);
		assert.equal(violations[0].match, "THR-1");
	});
});

test("seed literal guard flags the de-thriving meta-reference", async () => {
	await withTempRoot(async (repoRoot, platformRoot) => {
		await writeOutput(platformRoot, "architect/foo.md", "Part of the de-thriving migration.\n");

		const violations = await runConsumerSeedLiteralGuard(repoRoot, platformRoot);

		assert.equal(violations.length, 1);
		assert.equal(violations[0].match, "de-thriving");
	});
});

test("seed literal guard flags a hardcoded Linear literal", async () => {
	await withTempRoot(async (repoRoot, platformRoot) => {
		await writeOutput(platformRoot, "architect/foo.md", "Synced AC to Linear ticket.\n");

		const violations = await runConsumerSeedLiteralGuard(repoRoot, platformRoot);

		assert.equal(violations.length, 1);
		assert.equal(violations[0].match, "Linear");
	});
});

test("seed literal guard allows legitimate framework references (Sol, Iris, ADR-NNNN)", async () => {
	await withTempRoot(async (repoRoot, platformRoot) => {
		await writeOutput(
			platformRoot,
			"architect/foo.md",
			"Sol dispatches Iris per ADR-0047. Use linear easing for progress indicators only.\n"
		);

		const violations = await runConsumerSeedLiteralGuard(repoRoot, platformRoot);

		assert.equal(violations.length, 0);
	});
});

test("seed literal guard exempts an allowlisted file", async () => {
	await withTempRoot(async (repoRoot, platformRoot) => {
		await writeOutput(platformRoot, "architect/onboarding.md", "See PRISM-256 for context.\n");
		await fs.mkdir(path.join(repoRoot, ".ai-skills", "definitions"), {
			recursive: true,
		});
		await fs.writeFile(
			path.join(repoRoot, ".ai-skills", "definitions", "literal-allowlist.json"),
			JSON.stringify({
				files: [
					{
						path: path
							.relative(repoRoot, path.join(platformRoot, "architect/onboarding.md"))
							.split(path.sep)
							.join("/"),
						reason: "test fixture",
					},
				],
			}),
			"utf8"
		);

		const violations = await runConsumerSeedLiteralGuard(repoRoot, platformRoot);

		assert.equal(violations.length, 0);
	});
});

test("allowlist exempts a file from both guards", async () => {
	await withTempRoot(async (repoRoot, platformRoot) => {
		await writeOutput(
			platformRoot,
			"prism-x/SKILL.md",
			"Thrive and ${PROJECT} both appear here.\n"
		);
		await fs.mkdir(path.join(repoRoot, ".ai-skills", "definitions"), {
			recursive: true,
		});
		await fs.writeFile(
			path.join(repoRoot, ".ai-skills", "definitions", "literal-allowlist.json"),
			JSON.stringify({
				files: [
					{ path: ".claude/skills/prism-x/SKILL.md", reason: "test fixture" },
				],
			}),
			"utf8"
		);

		const literalViolations = await runLiteralGuard(repoRoot, [platformRoot]);
		const tokenViolations = await runLeftoverTokenGuard(repoRoot, [platformRoot]);

		assert.equal(literalViolations.length, 0);
		assert.equal(tokenViolations.length, 0);
	});
});
