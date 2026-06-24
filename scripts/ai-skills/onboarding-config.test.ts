/**
 * Tests for Atlas's config writer (PR-2.1, plan task 8).
 *
 * Covers the four contract guarantees `writeOnboardingConfig` makes:
 * - Valid input writes successfully and produces the documented result.
 * - Invalid input (missing required field, malformed ticketPrefix, unknown
 *   techStack value) throws `OnboardingConfigValidationError` *before* the
 *   filesystem is touched.
 * - Atomic write — when the underlying `rename` fails after the tmp file
 *   lands, the prior `.ai-skills/config.json` is left untouched.
 * - Idempotent — writing the same config twice produces byte-identical
 *   output. The schema-validated build's substitution layer depends on this
 *   property; a non-idempotent writer would dirty `git status` on every
 *   `pnpm prism:build` even when nothing changed.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import {
	OnboardingConfigValidationError,
	toOnDiskConfig,
	validateOnDiskConfig,
	writeOnboardingConfig,
	type PrismOnDiskConfig,
} from "./lib/onboarding-config";
import type { OnboardingConfig } from "./lib/onboarding-types";

const SAMPLE_CONFIG: OnboardingConfig = {
	project: "PRISM",
	ticketPrefix: "PRISM",
	githubOwner: "HunterMcGrew",
	githubRepo: "agent-crew",
	linearTeam: "PRISM",
	productDomain: "multi-team AI agent toolkit",
	techStack: {
		languages: [
			{ name: "typescript", confidence: "high", evidence: ["package.json"] },
		],
		frameworks: [
			{ name: "react", confidence: "high", evidence: ["package.json"] },
			{ name: "nextjs", confidence: "high", evidence: ["package.json"] },
		],
	},
	existingStandards: [],
};

async function withTempRepo<T>(
	build: (repoRoot: string) => Promise<T>
): Promise<T> {
	const tempRoot = await fs.mkdtemp(
		path.join(os.tmpdir(), "prism-onboarding-config-")
	);
	try {
		return await build(tempRoot);
	} finally {
		await fs.rm(tempRoot, { force: true, recursive: true });
	}
}

test("writeOnboardingConfig writes a schema-valid config", async () => {
	await withTempRepo(async (root) => {
		const result = await writeOnboardingConfig(root, SAMPLE_CONFIG);

		assert.equal(result.schemaValidated, true);
		assert.equal(result.path, path.join(root, ".ai-skills", "config.json"));

		const written = await fs.readFile(result.path, "utf8");
		const parsed = JSON.parse(written) as PrismOnDiskConfig;

		assert.equal(parsed.project, "PRISM");
		assert.equal(parsed.ticketPrefix, "PRISM");
		assert.equal(parsed.ticketSystem.kind, "linear");
		assert.equal(parsed.ticketSystem.teamKey, "PRISM");
		assert.deepEqual(parsed.github, {
			owner: "HunterMcGrew",
			repo: "agent-crew",
		});
		assert.deepEqual(parsed.techStack, ["nextjs", "react", "typescript"]);
		assert.equal(parsed.defaultBranch, "main");
	});
});

test("writeOnboardingConfig throws with the field name when required input is missing", async () => {
	await withTempRepo(async (root) => {
		const invalid = { ...SAMPLE_CONFIG, project: "" };

		await assert.rejects(
			() => writeOnboardingConfig(root, invalid),
			(error: unknown) =>
				error instanceof OnboardingConfigValidationError &&
				error.field === "project" &&
				error.message.includes("project"),
			"empty project throws with the field name"
		);

		const configPath = path.join(root, ".ai-skills", "config.json");
		await assert.rejects(
			() => fs.access(configPath),
			"validation failure leaves no on-disk config"
		);
	});
});

test("writeOnboardingConfig throws when ticketPrefix violates the pattern", async () => {
	await withTempRepo(async (root) => {
		const invalid = { ...SAMPLE_CONFIG, ticketPrefix: "prism" };

		await assert.rejects(
			() => writeOnboardingConfig(root, invalid),
			(error: unknown) =>
				error instanceof OnboardingConfigValidationError &&
				error.field === "ticketPrefix",
			"lowercase ticketPrefix throws"
		);
	});
});

test("validateOnDiskConfig throws on unknown techStack values", () => {
	const onDisk: PrismOnDiskConfig = {
		org: "ACME",
		project: "Widget",
		ticketPrefix: "WGT",
		ticketSystem: { kind: "linear" },
		techStack: ["typescript", "nonsense-language"],
	};

	assert.throws(
		() => validateOnDiskConfig(onDisk),
		(error: unknown) =>
			error instanceof OnboardingConfigValidationError &&
			error.field === "techStack" &&
			error.message.includes("nonsense-language")
	);
});

test("toOnDiskConfig flattens techStack and skips the unknown sentinel", () => {
	const config: OnboardingConfig = {
		...SAMPLE_CONFIG,
		techStack: {
			languages: [
				{ name: "unknown", confidence: "high", evidence: [] },
			] as unknown as OnboardingConfig["techStack"]["languages"],
			frameworks: [],
		},
	};

	const onDisk = toOnDiskConfig(config);
	assert.deepEqual(onDisk.techStack, []);
});

test("writeOnboardingConfig is idempotent — same input produces byte-identical output", async () => {
	await withTempRepo(async (root) => {
		const firstResult = await writeOnboardingConfig(root, SAMPLE_CONFIG);
		const firstBytes = await fs.readFile(firstResult.path, "utf8");

		const secondResult = await writeOnboardingConfig(root, SAMPLE_CONFIG);
		const secondBytes = await fs.readFile(secondResult.path, "utf8");

		assert.equal(secondBytes, firstBytes);
	});
});

test("writeOnboardingConfig is atomic — a failed rename leaves the prior config untouched", async () => {
	await withTempRepo(async (root) => {
		await writeOnboardingConfig(root, SAMPLE_CONFIG);

		const configPath = path.join(root, ".ai-skills", "config.json");
		const tmpPath = path.join(root, ".ai-skills", "config.json.tmp");
		const priorBytes = await fs.readFile(configPath, "utf8");

		const originalRename = fs.rename;
		(fs as unknown as { rename: typeof fs.rename }).rename = async () => {
			throw new Error("simulated rename failure");
		};

		try {
			const altered: OnboardingConfig = {
				...SAMPLE_CONFIG,
				productDomain: "the new domain that should not land",
			};

			await assert.rejects(
				() => writeOnboardingConfig(root, altered),
				/simulated rename failure/
			);
		} finally {
			(fs as unknown as { rename: typeof fs.rename }).rename = originalRename;
		}

		const afterBytes = await fs.readFile(configPath, "utf8");
		assert.equal(
			afterBytes,
			priorBytes,
			"rename failure must not corrupt the prior config"
		);

		await assert.rejects(
			() => fs.access(tmpPath),
			"tmp file is cleaned up after a failed rename"
		);
	});
});

test("writeOnboardingConfig honors options.org and options.slackChannel", async () => {
	await withTempRepo(async (root) => {
		const result = await writeOnboardingConfig(root, SAMPLE_CONFIG, {
			org: "TracTru",
			slackChannel: "#prism-dev",
			linearWorkspace: "tractru",
		});

		const parsed = JSON.parse(
			await fs.readFile(result.path, "utf8")
		) as PrismOnDiskConfig;

		assert.equal(parsed.org, "TracTru");
		assert.equal(parsed.slackChannel, "#prism-dev");
		assert.equal(parsed.ticketSystem.workspace, "tractru");
	});
});

test("writeOnboardingConfig writes the documentation block when provided", async () => {
	await withTempRepo(async (root) => {
		const configWithDocs: OnboardingConfig = {
			...SAMPLE_CONFIG,
			documentation: {
				location: "docs/",
				audience: "developer-user",
				keepsDevDocs: true,
				format: "nextra-blocks",
			},
		};

		const result = await writeOnboardingConfig(root, configWithDocs);
		const parsed = JSON.parse(
			await fs.readFile(result.path, "utf8")
		) as PrismOnDiskConfig;

		assert.deepEqual(parsed.documentation, {
			location: "docs/",
			audience: "developer-user",
			keepsDevDocs: true,
			format: "nextra-blocks",
		});
	});
});

test("writeOnboardingConfig omits the documentation block when not provided", async () => {
	await withTempRepo(async (root) => {
		const result = await writeOnboardingConfig(root, SAMPLE_CONFIG);
		const parsed = JSON.parse(
			await fs.readFile(result.path, "utf8")
		) as PrismOnDiskConfig;

		assert.equal(parsed.documentation, undefined);
	});
});

test("writeOnboardingConfig writes a github-issues config when linearTeam is empty", async () => {
	await withTempRepo(async (root) => {
		const githubIssuesConfig: OnboardingConfig = {
			...SAMPLE_CONFIG,
			linearTeam: "",
		};

		const result = await writeOnboardingConfig(root, githubIssuesConfig);

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

test("toOnDiskConfig preserves the open-string format field verbatim", () => {
	const config: OnboardingConfig = {
		...SAMPLE_CONFIG,
		documentation: {
			location: "site/content/",
			audience: "mixed",
			keepsDevDocs: false,
			format: "my-custom-format",
		},
	};

	const onDisk = toOnDiskConfig(config);
	assert.equal(onDisk.documentation?.format, "my-custom-format");
});

test("writeOnboardingConfig preserves unknown fields from the existing config on reconfigure", async () => {
	await withTempRepo(async (root) => {
		await writeOnboardingConfig(root, SAMPLE_CONFIG);

		const configPath = path.join(root, ".ai-skills", "config.json");
		const initial = JSON.parse(await fs.readFile(configPath, "utf8")) as Record<string, unknown>;

		initial["features"] = { conductorMayMerge: true };
		await fs.writeFile(configPath, JSON.stringify(initial, null, "\t") + "\n", "utf8");

		await writeOnboardingConfig(root, SAMPLE_CONFIG);

		const after = JSON.parse(await fs.readFile(configPath, "utf8")) as Record<string, unknown>;
		const features = after["features"] as { conductorMayMerge?: boolean } | undefined;
		assert.equal(features?.conductorMayMerge, true, "features.conductorMayMerge must survive a reconfigure");

		assert.equal(after["project"], "PRISM", "known fields are still present after reconfigure");
	});
});

test("writeOnboardingConfig does not emit unknown fields when prior config is absent", async () => {
	await withTempRepo(async (root) => {
		const result = await writeOnboardingConfig(root, SAMPLE_CONFIG);
		const parsed = JSON.parse(await fs.readFile(result.path, "utf8")) as Record<string, unknown>;

		assert.equal("features" in parsed, false, "no unknown fields appear on a fresh write");
	});
});

test("writeOnboardingConfig emits unknown fields in sorted order after known fields", async () => {
	await withTempRepo(async (root) => {
		await writeOnboardingConfig(root, SAMPLE_CONFIG);

		const configPath = path.join(root, ".ai-skills", "config.json");
		const initial = JSON.parse(await fs.readFile(configPath, "utf8")) as Record<string, unknown>;

		initial["zzz"] = "last";
		initial["aaa"] = "first";
		await fs.writeFile(configPath, JSON.stringify(initial, null, "\t") + "\n", "utf8");

		await writeOnboardingConfig(root, SAMPLE_CONFIG);

		const raw = await fs.readFile(configPath, "utf8");
		const aaaPos = raw.indexOf('"aaa"');
		const zzzPos = raw.indexOf('"zzz"');
		assert.ok(aaaPos < zzzPos, "unknown fields appear in sorted key order");

		const documentationPos = raw.indexOf('"documentation"');
		assert.ok(documentationPos < aaaPos || documentationPos === -1, "unknown fields appear after all known fields");
	});
});

test("documentation block round-trips: same input produces byte-identical output", async () => {
	await withTempRepo(async (root) => {
		const configWithDocs: OnboardingConfig = {
			...SAMPLE_CONFIG,
			documentation: {
				location: "docs/",
				audience: "end-user",
				keepsDevDocs: false,
				format: "flat-markdown-guides",
			},
		};

		const first = await writeOnboardingConfig(root, configWithDocs);
		const firstBytes = await fs.readFile(first.path, "utf8");

		const second = await writeOnboardingConfig(root, configWithDocs);
		const secondBytes = await fs.readFile(second.path, "utf8");

		assert.equal(secondBytes, firstBytes);
	});
});
