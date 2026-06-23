/**
 * Coverage for the `prism init` core (non-interactive path).
 *
 * Tests target `runInit` directly — no readline, no process.argv. The CLI
 * wrapper (`runInitCli`) and the adopt-guard integration are covered in
 * adopt.test.ts and cli.test.ts.
 *
 * Three contracts tested:
 * - A Linear answer set writes a config with kind "linear" and the team key.
 * - A github-issues answer set writes kind "github-issues" with no team key.
 * - Calling runInit when config.json already exists throws the guard error.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { runInit, type InitAnswers } from "./init";
import type { PrismOnDiskConfig } from "./lib/onboarding-config";

/**
 * Creates a temp directory seeded with a minimal package.json so detectStack
 * finds a real stack (typescript via tsconfig.json presence in the parent
 * repo is enough; a bare package.json without typescript dep gives javascript).
 * Cleaned up in `finally` regardless of test outcome.
 */
async function withTempConsumerRepo<T>(
	build: (repoRoot: string) => Promise<T>
): Promise<T> {
	const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "prism-init-"));
	try {
		await fs.writeFile(
			path.join(tempRoot, "package.json"),
			JSON.stringify({ name: "test-consumer", version: "0.1.0" }, null, "\t") + "\n",
			"utf8"
		);
		return await build(tempRoot);
	} finally {
		await fs.rm(tempRoot, { force: true, recursive: true });
	}
}

const LINEAR_ANSWERS: InitAnswers = {
	project: "ACME",
	ticketPrefix: "ACME",
	ticketSystemKind: "linear",
	linearTeam: "ACME",
	githubOwner: "acmecorp",
	githubRepo: "acme-app",
};

const GITHUB_ISSUES_ANSWERS: InitAnswers = {
	project: "ACME",
	ticketPrefix: "ACME",
	ticketSystemKind: "github-issues",
	githubOwner: "acmecorp",
	githubRepo: "acme-app",
};

test("runInit writes a Linear config when ticketSystemKind is linear", async () => {
	await withTempConsumerRepo(async (root) => {
		const result = await runInit({ consumerRepoRoot: root, answers: LINEAR_ANSWERS });

		assert.equal(result.schemaValidated, true);

		const written = await fs.readFile(result.path, "utf8");
		const parsed = JSON.parse(written) as PrismOnDiskConfig;

		assert.equal(parsed.ticketSystem.kind, "linear");
		assert.equal(parsed.ticketSystem.teamKey, "ACME");
		assert.equal(parsed.project, "ACME");
		assert.equal(parsed.ticketPrefix, "ACME");
		assert.deepEqual(parsed.github, { owner: "acmecorp", repo: "acme-app" });
	});
});

test("runInit writes a github-issues config when ticketSystemKind is github-issues", async () => {
	await withTempConsumerRepo(async (root) => {
		const result = await runInit({ consumerRepoRoot: root, answers: GITHUB_ISSUES_ANSWERS });

		const written = await fs.readFile(result.path, "utf8");
		const parsed = JSON.parse(written) as PrismOnDiskConfig;

		assert.equal(parsed.ticketSystem.kind, "github-issues");
		assert.equal(
			"teamKey" in parsed.ticketSystem,
			false,
			"github-issues config must not include teamKey"
		);
		assert.equal(
			"workspace" in parsed.ticketSystem,
			false,
			"github-issues config must not include workspace"
		);
	});
});

test("runInit throws the guard error when config.json already exists", async () => {
	await withTempConsumerRepo(async (root) => {
		const aiSkillsDir = path.join(root, ".ai-skills");
		await fs.mkdir(aiSkillsDir, { recursive: true });
		await fs.writeFile(
			path.join(aiSkillsDir, "config.json"),
			JSON.stringify({ existing: true }, null, "\t") + "\n",
			"utf8"
		);

		await assert.rejects(
			() => runInit({ consumerRepoRoot: root, answers: LINEAR_ANSWERS }),
			(err: unknown) => {
				assert.ok(err instanceof Error);
				assert.ok(
					err.message.includes("already exists"),
					`expected "already exists" in message, got: ${err.message}`
				);
				assert.ok(
					err.message.includes("edit it directly or remove it to re-init"),
					`expected removal guidance in message, got: ${err.message}`
				);
				return true;
			}
		);
	});
});
