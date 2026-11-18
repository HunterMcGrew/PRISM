/**
 * Contract for the `hookRuntimeDir` config key and the `HOOK_RUNTIME_DIR`
 * token. Skill and rule text spells chain-script paths with the token, so a
 * consumer's text points at `.claude/hooks` and PRISM's own text points at the
 * source tree that holds the runtime.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { validateConsumerConfigAgainstSchema } from "./lib/config-schema-validate";
import { deriveTokenMap, type PrismConfig } from "./lib/tokens";

const prismRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const BASE_CONFIG: PrismConfig = {
	org: "ACME",
	project: "WIDGET",
	ticketPrefix: "WGT",
	ticketSystem: { kind: "github-issues" },
	defaultBranch: "main",
};

function readPrismConfig(): Record<string, unknown> {
	return JSON.parse(
		fs.readFileSync(path.join(prismRoot, ".ai-skills", "config.json"), "utf8")
	);
}

function validate(config: Record<string, unknown>): void {
	const consumerRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prism-hook-dir-"));
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

test("a config with no hookRuntimeDir maps HOOK_RUNTIME_DIR to .claude/hooks", () => {
	assert.equal(deriveTokenMap(BASE_CONFIG).get("HOOK_RUNTIME_DIR"), ".claude/hooks");
});

test("a configured hookRuntimeDir maps through unchanged", () => {
	const tokenMap = deriveTokenMap({
		...BASE_CONFIG,
		hookRuntimeDir: "scripts/ai-skills/hooks",
	});

	assert.equal(tokenMap.get("HOOK_RUNTIME_DIR"), "scripts/ai-skills/hooks");
});

test("a numeric hookRuntimeDir fails schema validation", () => {
	assert.throws(
		() => validate({ ...readPrismConfig(), hookRuntimeDir: 3 }),
		/hookRuntimeDir/
	);
});

test("PRISM's own config validates and points the token at the source tree", () => {
	const config = readPrismConfig();

	assert.equal(config.hookRuntimeDir, "scripts/ai-skills/hooks");
	validate(config);
});
