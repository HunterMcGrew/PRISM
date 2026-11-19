/**
 * Contract for the `ci.requiredCheck` key of `.ai-skills/config.schema.json`.
 *
 * Configs go through `validateConsumerConfigAgainstSchema`, the same path
 * `prism update` uses. That validator enforces `type` but not
 * `additionalProperties` or `minLength`, so those two are pinned on the
 * schema document itself: editors enforce the keywords even where the
 * validator does not.
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

function readCiNode(): Record<string, unknown> & {
	properties: Record<string, Record<string, unknown>>;
} {
	const schema = JSON.parse(
		fs.readFileSync(path.join(prismRoot, ".ai-skills", "config.schema.json"), "utf8")
	) as { properties: Record<string, never> };
	return schema.properties["ci"] as never;
}

function validate(config: Record<string, unknown>): void {
	const consumerRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prism-ci-config-"));
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

test("a config with ci.requiredCheck validates", () => {
	validate({ ...readPrismConfig(), ci: { requiredCheck: "build" } });
});

test("a non-string ci.requiredCheck is rejected by the validator", () => {
	assert.throws(
		() => validate({ ...readPrismConfig(), ci: { requiredCheck: 3 } }),
		/ci\/requiredCheck/
	);
});

test("the schema closes the ci object to unknown keys", () => {
	assert.equal(readCiNode()["additionalProperties"], false);
});

test("the schema requires ci.requiredCheck to be non-empty", () => {
	assert.equal(readCiNode().properties["requiredCheck"]?.["minLength"], 1);
});

test("PRISM's own config, which sets no ci key, still validates", () => {
	const config = readPrismConfig();
	assert.equal("ci" in config, false);
	validate(config);
});
