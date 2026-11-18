/**
 * Contract for the `stopPaths` and `importAliases` keys of
 * `.ai-skills/config.schema.json`.
 *
 * Configs go through `validateConsumerConfigAgainstSchema`, the same path
 * `prism update` uses. That validator walks `type`, `items`, `properties`,
 * `enum`, and `pattern` but does not enforce `additionalProperties`, so
 * the two cases that rest on it, an unknown `stopPaths` key and a non-string
 * alias value, are pinned on the schema document itself: editors enforce the
 * keyword even where the validator does not.
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

function readSchema(): { properties: Record<string, Record<string, unknown>> } {
	return JSON.parse(
		fs.readFileSync(path.join(prismRoot, ".ai-skills", "config.schema.json"), "utf8")
	);
}

function validate(config: Record<string, unknown>): void {
	const consumerRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prism-plan-config-"));
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

test("a config with both keys passes", () => {
	validate({
		...readPrismConfig(),
		stopPaths: { dependency: ["package.json"], contract: ["src/contracts/**"] },
		importAliases: { "@/": "src/" },
	});
});

test("PRISM's own config, which sets neither key, still passes", () => {
	const config = readPrismConfig();
	assert.equal("stopPaths" in config, false);
	assert.equal("importAliases" in config, false);
	validate(config);
});

test("a string where stopPaths.dependency wants an array fails", () => {
	assert.throws(
		() =>
			validate({ ...readPrismConfig(), stopPaths: { dependency: "package.json" } }),
		/stopPaths\/dependency/
	);
});

test("a non-string entry in stopPaths.contract fails", () => {
	assert.throws(
		() => validate({ ...readPrismConfig(), stopPaths: { contract: [3] } }),
		/stopPaths\/contract\/0/
	);
});

test("the schema closes stopPaths to unknown keys", () => {
	const { stopPaths } = readSchema().properties;
	assert.equal(stopPaths?.["additionalProperties"], false);
});

test("the schema types every importAliases value as a string", () => {
	const { importAliases } = readSchema().properties;
	assert.deepEqual(importAliases?.["additionalProperties"], { type: "string" });
});

test("a config that sets importAliases to a non-object fails", () => {
	assert.throws(
		() => validate({ ...readPrismConfig(), importAliases: ["@/"] }),
		/importAliases/
	);
});
