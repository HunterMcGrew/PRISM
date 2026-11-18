/**
 * Contract for the `gitHooks` block of `.ai-skills/config.schema.json`.
 *
 * Configs go through `validateConsumerConfigAgainstSchema`, the same path
 * `prism update` uses. That validator walks `type`, `items`, `properties`,
 * `enum`, and `pattern` but does not enforce `additionalProperties` or
 * `minItems`, so those two keywords are pinned here on the schema document
 * itself: editors enforce them even where the validator does not.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { validateConsumerConfigAgainstSchema } from "./lib/config-schema-validate";

const prismRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function readPrismConfig(): Record<string, unknown> {
	return JSON.parse(
		fs.readFileSync(path.join(prismRoot, ".ai-skills", "config.json"), "utf8")
	);
}

function validate(config: Record<string, unknown>): void {
	const consumerRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prism-git-hooks-config-"));
	try {
		fs.mkdirSync(path.join(consumerRoot, ".ai-skills"));
		fs.writeFileSync(
			path.join(consumerRoot, ".ai-skills", "config.json"),
			JSON.stringify(config),
			"utf8"
		);
		validateConsumerConfigAgainstSchema(consumerRoot, prismRoot);
	} finally {
		fs.rmSync(consumerRoot, { force: true, recursive: true });
	}
}

const FULL_GIT_HOOKS = {
	preCommit: {
		command: "pnpm exec prettier --stdin-filepath {path}",
		globs: ["**/*.ts"],
		fix: "pnpm exec prettier --write {files}",
	},
	prePush: { command: "pnpm exec eslint {files}", globs: ["**/*.ts"] },
};

test("a config with both gitHooks blocks passes", () => {
	validate({ ...readPrismConfig(), gitHooks: FULL_GIT_HOOKS });
});

test("PRISM's own config, which has no gitHooks block, still passes", () => {
	validate(readPrismConfig());
});

test("a config with a non-array globs value fails", () => {
	assert.throws(
		() =>
			validate({
				...readPrismConfig(),
				gitHooks: { prePush: { command: "eslint", globs: "**/*.ts" } },
			}),
		/gitHooks\/prePush\/globs/
	);
});

test("a config with a non-string command fails", () => {
	assert.throws(
		() => validate({ ...readPrismConfig(), gitHooks: { preCommit: { command: 7 } } }),
		/gitHooks\/preCommit\/command/
	);
});

test("the schema closes gitHooks and both of its blocks to unknown keys", () => {
	const schema = JSON.parse(
		fs.readFileSync(path.join(prismRoot, ".ai-skills", "config.schema.json"), "utf8")
	);
	const gitHooks = schema.properties.gitHooks;

	assert.equal(gitHooks.additionalProperties, false);
	assert.equal(gitHooks.properties.preCommit.additionalProperties, false);
	assert.equal(gitHooks.properties.prePush.additionalProperties, false);
});

test("the schema requires at least one glob in each block", () => {
	const schema = JSON.parse(
		fs.readFileSync(path.join(prismRoot, ".ai-skills", "config.schema.json"), "utf8")
	);
	const { preCommit, prePush } = schema.properties.gitHooks.properties;

	assert.equal(preCommit.properties.globs.minItems, 1);
	assert.equal(prePush.properties.globs.minItems, 1);
});

test("the hooks.pushVerification description names the dedupe with the git hooks", () => {
	const schema = JSON.parse(
		fs.readFileSync(path.join(prismRoot, ".ai-skills", "config.schema.json"), "utf8")
	);

	assert.match(
		schema.properties.hooks.properties.pushVerification.description,
		/gitHooks\.prePush\.command[\s\S]*gitHooks\.preCommit\.command/
	);
});
