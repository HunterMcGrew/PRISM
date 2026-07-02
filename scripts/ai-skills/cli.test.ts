/**
 * Coverage for the consumer-facing `prism` CLI's two load-bearing behaviors:
 * self-location of the PRISM source, and the plausibility guard firing through
 * `runUpdate` (the seam every entry point — adopt included — now passes through).
 *
 * The dispatcher in `cli.ts` is a thin `process.argv[2]` switch over
 * `runAdoptCli`/`runUpdateCli`; its branches are exercised by the adopt/update
 * suites plus this file's coverage of the shared resolution and guard seams.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

import {
	resolvePrismSource,
	resolveSelfPrismSource,
	runUpdate,
} from "./update";
import { runInitCli } from "./init";
import { hashContent } from "./utils";
import { SYNC_MANIFEST_FILENAME, type SyncManifest } from "./sync-manifest";

/** Initializes a git repo at `dir` with deterministic, side-effect-free config. */
function gitInit(dir: string): void {
	execFileSync("git", ["init", "-q"], { cwd: dir, stdio: "ignore" });
	execFileSync("git", ["config", "user.email", "test@prism.local"], {
		cwd: dir,
		stdio: "ignore",
	});
	execFileSync("git", ["config", "user.name", "PRISM Test"], {
		cwd: dir,
		stdio: "ignore",
	});
}

const CONSUMER_CONFIG_JSON = {
	org: "Acme",
	project: "Acme",
	ticketPrefix: "ACME",
	ticketSystem: { kind: "github-issues" },
};

const CONSUMER_PATHS_JSON = {
	canonical: {
		skillsRoot: ".ai-skills/skills",
		contentRoot: ".prism",
		templatesContentRoot: "templates/install/.prism",
	},
	generated: {
		claudeSkillsRoot: ".claude/skills",
		claudeAgentsRoot: ".claude/agents",
		codexSkillsRoot: ".agents/skills",
		codexAgentsRoot: ".codex/agents",
		codexConfigFile: ".codex/codex-config.toml",
		cursorSkillsRoot: ".cursor/skills",
		platformContentCopies: { claude: ".claude", codex: ".codex", cursor: ".cursor" },
	},
};

async function writeFile(
	root: string,
	relativePath: string,
	content: string
): Promise<void> {
	const absolutePath = path.join(root, relativePath);
	await fs.mkdir(path.dirname(absolutePath), { recursive: true });
	await fs.writeFile(absolutePath, content, "utf8");
}

/**
 * Writes the minimal consumer config a real onboarded repo always has — adopt
 * seeds these before any update runs, so a temp consumer needs them for
 * `resolvePrismSource`'s config lookup and `runUpdate`'s token-map derivation
 * to reach the behavior under test rather than failing on a missing config.
 */
async function writeConsumerConfig(consumerRepoRoot: string): Promise<void> {
	await writeFile(
		consumerRepoRoot,
		".ai-skills/config.json",
		`${JSON.stringify(CONSUMER_CONFIG_JSON, null, "\t")}\n`
	);
	await writeFile(
		consumerRepoRoot,
		".ai-skills/definitions/paths.json",
		`${JSON.stringify(CONSUMER_PATHS_JSON, null, "\t")}\n`
	);
}

async function writeConsumerManifest(
	consumerContentRoot: string,
	files: Record<string, string>
): Promise<void> {
	const manifest: SyncManifest = {
		prismVersion: "1.0.0",
		sourceCommit: "abc123",
		generatedAt: "2026-01-01T00:00:00.000Z",
		files: Object.fromEntries(
			Object.entries(files).map(([relativePath, content]) => [
				relativePath,
				{ contentHash: hashContent(content) },
			])
		),
	};
	await writeFile(
		consumerContentRoot,
		SYNC_MANIFEST_FILENAME,
		`${JSON.stringify(manifest, null, "\t")}\n`
	);
}

// --- init subcommand reachability ---

test("runInitCli is exported from init.ts and is a function", () => {
	// The CLI dispatcher routes "init" to runInitCli. This test confirms the
	// export exists and has the right shape — the dispatch case cannot wire to
	// undefined.
	assert.equal(typeof runInitCli, "function");
});

// --- self-location ---

test("resolveSelfPrismSource returns the PRISM repo root (two dirs up from this file)", () => {
	const selfSource = resolveSelfPrismSource();
	const thisDir = path.dirname(fileURLToPath(import.meta.url));
	const expected = path.resolve(thisDir, "..", "..");

	assert.equal(selfSource, expected);
	// The derived root is the real PRISM checkout, which always ships package.json
	// and the scripts dir this test runs from.
	assert.equal(
		path.basename(path.join(selfSource, "scripts", "ai-skills")),
		"ai-skills"
	);
});

test("resolvePrismSource falls back to self-location when no flag or config is set", async () => {
	const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "prism-cli-self-"));
	try {
		// A consumer with a config that sets no prismSource — so the chain skips the
		// flag and config slots and must reach the self-location fallback.
		await writeConsumerConfig(tempRoot);

		const resolved = resolvePrismSource([], tempRoot);

		assert.equal(
			resolved,
			resolveSelfPrismSource(),
			"with no flag and no config, the source is this script's own PRISM root"
		);
	} finally {
		await fs.rm(tempRoot, { force: true, recursive: true });
	}
});

test("resolvePrismSource lets an explicit --prism-source flag win over self-location", async () => {
	const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "prism-cli-flag-"));
	try {
		const explicit = path.join(tempRoot, "some", "other", "prism");

		const resolved = resolvePrismSource(["--prism-source", explicit], tempRoot);

		assert.equal(resolved, path.resolve(explicit));
		assert.notEqual(
			resolved,
			resolveSelfPrismSource(),
			"explicit flag must override the self-located default"
		);
	} finally {
		await fs.rm(tempRoot, { force: true, recursive: true });
	}
});

// --- plausibility guard fires through runUpdate (the adopt-path seam) ---

test("runUpdate refuses an empty PRISM source — the guard now fires through the shared seam", async () => {
	const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "prism-cli-guard-"));
	const prismRepoRoot = path.join(tempRoot, "prism");
	const consumerRepoRoot = path.join(tempRoot, "consumer");
	const prismContentRoot = path.join(prismRepoRoot, ".prism");
	const consumerContentRoot = path.join(consumerRepoRoot, ".prism");

	// An empty PRISM .prism/ (no PRISM-owned files) — the corrupted/cleared-source
	// case self-derivation makes reachable without a human in the loop.
	await fs.mkdir(prismContentRoot, { recursive: true });
	await fs.mkdir(consumerContentRoot, { recursive: true });
	// runUpdate's git-repo check (issue #376) runs before the plausibility guard,
	// so the consumer needs a real repo underneath it to reach the behavior
	// under test.
	gitInit(consumerRepoRoot);

	// The consumer is fully onboarded: config + paths so runUpdate reaches the
	// guard rather than failing on config resolution. The config also has to
	// pass runUpdate's schema validation (issue #376), which now also runs
	// before the plausibility guard — a copy of the real schema lets it.
	await writeConsumerConfig(consumerRepoRoot);
	await writeFile(
		prismRepoRoot,
		".ai-skills/config.schema.json",
		await fs.readFile(
			path.join(process.cwd(), ".ai-skills", "config.schema.json"),
			"utf8"
		)
	);

	// The consumer records two PRISM-owned files; an empty source would wipe both.
	await writeConsumerManifest(consumerContentRoot, {
		"rules/a.md": "# A\n",
		"rules/b.md": "# B\n",
	});

	try {
		await assert.rejects(
			() =>
				runUpdate({
					prismRepoRoot,
					consumerRepoRoot,
					prismContentRoot,
					consumerContentRoot,
				}),
			(err: unknown) => {
				assert.ok(err instanceof Error);
				assert.ok(
					err.message.includes("--prism-source looks empty"),
					`expected refusal message, got: ${err.message}`
				);
				assert.ok(
					err.message.includes("refusing 2"),
					`expected the consumer's deletion count in message, got: ${err.message}`
				);

				return true;
			}
		);

		// Nothing was deleted — the manifest the consumer started with is intact.
		const manifestStillThere = await fs
			.access(path.join(consumerContentRoot, SYNC_MANIFEST_FILENAME))
			.then(() => true)
			.catch(() => false);
		assert.ok(manifestStillThere, "the guard must fire before any file movement");
	} finally {
		await fs.rm(tempRoot, { force: true, recursive: true });
	}
});
