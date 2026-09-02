/**
 * Coverage for `prism doctor` (issue #375): the config-schema check and the
 * git-repo check reuse L376's `validateConsumerConfigAgainstSchema` and
 * `assertInsideGitRepo`, so this file focuses on the behavior specific to
 * `doctor` — findings accumulate instead of throwing, the sync-manifest report
 * (healthy / missing / diverged), and the npm version check degrading
 * gracefully instead of depending on live network.
 *
 * Fixture shape mirrors `update.test.ts`'s `withTempRepoRoots`: a temp PRISM
 * source root carrying a copy of the real `config.schema.json` and
 * `package.json`, and a temp consumer root that is git-initialized by default
 * (tests exercising the git-repo finding skip `gitInit`).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import test from "node:test";
import assert from "node:assert/strict";

import {
	formatDoctorReport,
	resolvePrismSourceOrFinding,
	runDoctor,
	type NpmVersionFetcher,
} from "./doctor";
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
	project: "AcmeApp",
	ticketPrefix: "ACME",
	ticketSystem: { kind: "github-issues" },
};

/** `checkHostOutput` reads this via `loadPathDefinitions` to resolve each host's skills, agents, and content roots. */
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

/** A fetcher stub that always reports the lookup as unavailable — no test hits the network. */
const NEVER_FETCH: NpmVersionFetcher = async () => null;

async function writeFile(root: string, relativePath: string, content: string): Promise<void> {
	const absolutePath = path.join(root, relativePath);
	await fs.mkdir(path.dirname(absolutePath), { recursive: true });
	await fs.writeFile(absolutePath, content, "utf8");
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

/**
 * Seeds a temp PRISM source root with the real `config.schema.json` (so
 * schema validation checks real rules) and a minimal `package.json` (so the
 * installed-version read has something to parse). Consumer root is
 * git-initialized by default — tests exercising the non-git finding pass
 * `{ gitInit: false }`.
 */
async function withTempRoots(
	body: (roots: { prismSourceRoot: string; consumerRepoRoot: string }) => Promise<void>,
	options: { gitInit?: boolean } = {}
): Promise<void> {
	const { gitInit: shouldGitInit = true } = options;
	const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "prism-doctor-"));
	const prismSourceRoot = path.join(tempRoot, "prism");
	const consumerRepoRoot = path.join(tempRoot, "consumer");
	await fs.mkdir(prismSourceRoot, { recursive: true });
	await fs.mkdir(consumerRepoRoot, { recursive: true });

	const realSchemaPath = path.join(process.cwd(), ".ai-skills", "config.schema.json");
	await fs.mkdir(path.join(prismSourceRoot, ".ai-skills"), { recursive: true });
	await fs.copyFile(realSchemaPath, path.join(prismSourceRoot, ".ai-skills", "config.schema.json"));
	await writeFile(
		prismSourceRoot,
		"package.json",
		`${JSON.stringify({ name: "@huntermcgrew/prism", version: "9.9.9" }, null, "\t")}\n`
	);
	// `checkSeedDelivery` loads this; empty `renames` here since no default
	// fixture uses a renamed seed file — tests exercising the rename write
	// their own `renames` table over this.
	await writeFile(
		prismSourceRoot,
		".ai-skills/definitions/seed-curation.json",
		`${JSON.stringify({ excluded: [], curated: [], seedOnly: [], renames: {} }, null, "\t")}\n`
	);

	await writeFile(
		consumerRepoRoot,
		".ai-skills/config.json",
		`${JSON.stringify(CONSUMER_CONFIG_JSON, null, "\t")}\n`
	);

	if (shouldGitInit) {
		gitInit(consumerRepoRoot);
	}

	try {
		await body({ prismSourceRoot, consumerRepoRoot });
	} finally {
		await fs.rm(tempRoot, { force: true, recursive: true });
	}
}

// --- healthy repo ---

test("runDoctor reports healthy for a valid config, a git repo, and no manifest yet", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		assert.equal(report.healthy, true);
		assert.deepEqual(
			report.findings.filter((f) => f.severity === "error"),
			[]
		);
		// No manifest yet is an "info" finding, not an error — a fresh repo that
		// hasn't run `prism adopt` is still a healthy target for it.
		assert.ok(
			report.findings.some((f) => f.check === "sync-manifest" && f.severity === "info"),
			"expected an info finding for the absent manifest"
		);
	});
});

test("runDoctor reports healthy with no findings at all when the manifest is fully in sync", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		const consumerContentRoot = path.join(consumerRepoRoot, ".prism");
		const ruleContent = "---\nload: always\n---\n\n# A\n";
		await writeFile(consumerContentRoot, "rules/a.md", ruleContent);
		await writeConsumerManifest(consumerContentRoot, { "rules/a.md": ruleContent });

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		assert.equal(report.healthy, true);
		assert.equal(
			report.findings.some((f) => f.check === "rule-load"),
			false,
			"a declared load: draws no rule-load finding"
		);
		assert.equal(report.syncState.manifest?.prismOwnedCount, 1);
		assert.equal(report.syncState.manifest?.divergedFiles.length, 0);
		assert.equal(report.syncState.manifest?.missingFiles.length, 0);
	});
});

// --- bad config field ---

test("runDoctor names the offending config field without throwing", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		await writeFile(
			consumerRepoRoot,
			".ai-skills/config.json",
			`${JSON.stringify({ ...CONSUMER_CONFIG_JSON, ticketPrefix: "lowercase" }, null, "\t")}\n`
		);

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		assert.equal(report.healthy, false);
		const configFinding = report.findings.find((f) => f.check === "config");
		assert.ok(configFinding, "expected a config finding");
		assert.equal(configFinding?.severity, "error");
		assert.ok(
			configFinding?.message.includes("/ticketPrefix"),
			`expected the offending field named, got: ${configFinding?.message}`
		);

		// Other checks still ran — the bad config didn't stop the git-repo check.
		assert.equal(
			report.findings.some((f) => f.check === "git-repo"),
			false,
			"the git-repo check should still pass since the consumer root is a real git repo"
		);
	});
});

// --- resolve-before-check ordering (issue #375 Briar Major) ---

test("resolvePrismSourceOrFinding reports a missing required config key as a finding instead of throwing, with no --prism-source flag", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		// Missing "ticketPrefix" entirely — loadConfig throws synchronously on
		// this before any of runDoctor's own try/catch checks would run.
		const { ticketPrefix: _omitted, ...configMissingKey } = CONSUMER_CONFIG_JSON;
		await writeFile(
			consumerRepoRoot,
			".ai-skills/config.json",
			`${JSON.stringify(configMissingKey, null, "\t")}\n`
		);

		// No --prism-source flag — forces resolvePrismSource down the
		// loadConfig(consumerRepoRoot) path that throws.
		const argv: string[] = [];

		const { prismSourceRoot: resolvedRoot, finding } = resolvePrismSourceOrFinding(
			argv,
			consumerRepoRoot
		);

		assert.ok(finding, "expected a finding instead of a throw");
		assert.equal(finding?.check, "config");
		assert.equal(finding?.severity, "error");
		assert.ok(
			finding?.message.includes("ticketPrefix"),
			`expected the missing field named, got: ${finding?.message}`
		);
		// Falls back to a real source root so the other checks still have a
		// schema/package.json to read against.
		assert.notEqual(resolvedRoot, "");

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot: resolvedRoot,
			npmVersionFetcher: NEVER_FETCH,
			additionalFindings: [finding as NonNullable<typeof finding>],
		});

		assert.equal(report.healthy, false);
		assert.ok(
			report.findings.some((f) => f.check === "config" && f.message.includes("ticketPrefix")),
			"expected the resolution finding to carry through into the full report"
		);
		// The other checks still ran despite the config resolution failure —
		// this is the crux of the fix: one bad-config throw no longer prevents
		// git-repo, sync-manifest, and version checks from executing.
		assert.equal(
			report.findings.some((f) => f.check === "git-repo"),
			false,
			"the git-repo check should still have run and passed (consumer root is a real git repo)"
		);
		assert.ok(
			report.findings.some((f) => f.check === "sync-manifest"),
			"the sync-manifest check should still have run"
		);
		void prismSourceRoot; // unused fixture root — resolvePrismSourceOrFinding derives its own fallback
	});
});

test("resolvePrismSourceOrFinding reports invalid JSON as a finding instead of throwing", async () => {
	await withTempRoots(async ({ consumerRepoRoot }) => {
		await writeFile(consumerRepoRoot, ".ai-skills/config.json", "{ not valid json");

		const { finding } = resolvePrismSourceOrFinding([], consumerRepoRoot);

		assert.ok(finding, "expected a finding instead of a throw");
		assert.equal(finding?.check, "config");
		assert.equal(finding?.severity, "error");
		assert.ok(finding?.message.includes("Invalid JSON"));
	});
});

// --- missing manifest ---

test("runDoctor treats a missing sync manifest as an info finding, not a crash", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		// No manifest written — the default state of withTempRoots.
		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		assert.equal(report.syncState.manifest, null);
		const manifestFinding = report.findings.find((f) => f.check === "sync-manifest");
		assert.ok(manifestFinding);
		assert.equal(manifestFinding?.severity, "info");
	});
});

test("runDoctor reports diverged files with their .bak siblings and missing files as an error", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		const consumerContentRoot = path.join(consumerRepoRoot, ".prism");
		await writeFile(consumerContentRoot, "rules/diverged.md", "# hand-edited\n");
		await writeFile(consumerContentRoot, "rules/diverged.md.bak", "# original\n");
		// "rules/missing.md" is recorded in the manifest but never written to disk.
		await writeConsumerManifest(consumerContentRoot, {
			"rules/diverged.md": "# original\n",
			"rules/missing.md": "# gone\n",
		});

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		assert.equal(report.healthy, false);
		assert.equal(report.syncState.manifest?.missingFiles.length, 1);
		assert.equal(report.syncState.manifest?.missingFiles[0], "rules/missing.md");
		assert.equal(report.syncState.manifest?.divergedFiles.length, 1);
		assert.equal(report.syncState.manifest?.divergedFiles[0]?.relativePath, "rules/diverged.md");
		assert.deepEqual(
			report.syncState.manifest?.divergedFiles[0]?.backups.map((p) => path.basename(p)),
			["diverged.md.bak"]
		);

		const errorFinding = report.findings.find((f) => f.check === "sync-manifest" && f.severity === "error");
		assert.ok(errorFinding, "expected an error finding for the missing file");
		assert.ok(errorFinding?.message.includes("rules/missing.md"));
	});
});

// --- seed-delivery (renamed seed files never inverted before the fix) ---

test("runDoctor stays healthy for a fresh, never-adopted repo even with a real (non-empty) renames table", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		// A production-shaped renames table, not the default empty-`{}` fixture —
		// every other test in this file inherits the empty table, so only this
		// one exercises checkSeedDelivery against a table with real entries.
		await writeFile(
			prismSourceRoot,
			".ai-skills/definitions/seed-curation.json",
			`${JSON.stringify(
				{
					excluded: [],
					curated: [],
					seedOnly: [],
					renames: {
						"architect/manifest.json": "architect/manifest.stub.json",
						"SPEC.md": "SPEC.md.tmpl",
					},
				},
				null,
				"\t"
			)}\n`
		);
		// No sync manifest, no renamed files — this consumer has never run
		// `prism adopt`, so there is nothing for `checkSeedDelivery` to report yet.

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		assert.equal(report.healthy, true, "a fresh repo that hasn't adopted yet is still a healthy adopt target");
		assert.equal(
			report.findings.some((f) => f.check === "seed-delivery"),
			false,
			"seed-delivery should not run before a sync manifest exists"
		);
	});
});

test("runDoctor flags a missing manifest.json with an mv remedy when the stale manifest.stub.json copy is still on disk", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		const consumerContentRoot = path.join(consumerRepoRoot, ".prism");
		await writeFile(
			prismSourceRoot,
			".ai-skills/definitions/seed-curation.json",
			`${JSON.stringify(
				{
					excluded: [],
					curated: [],
					seedOnly: [],
					renames: { "architect/manifest.json": "architect/manifest.stub.json" },
				},
				null,
				"\t"
			)}\n`
		);
		// Simulates a repo that adopted before the fix — the seed's own name
		// landed on disk, and the consumer-facing manifest.json never did.
		await writeFile(consumerContentRoot, "architect/manifest.stub.json", "{}\n");
		await writeConsumerManifest(consumerContentRoot, {});

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		assert.equal(report.healthy, false);
		const finding = report.findings.find(
			(f) => f.check === "seed-delivery" && f.message.includes("manifest.json")
		);
		assert.ok(finding, "expected a seed-delivery finding for the missing manifest.json");
		assert.equal(finding?.severity, "error");
		assert.ok(
			finding?.message.includes("mv .prism/architect/manifest.stub.json .prism/architect/manifest.json"),
			`expected an mv remedy, got: ${finding?.message}`
		);
	});
});

test("runDoctor reports no seed-delivery finding once manifest.json is present", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		const consumerContentRoot = path.join(consumerRepoRoot, ".prism");
		await writeFile(
			prismSourceRoot,
			".ai-skills/definitions/seed-curation.json",
			`${JSON.stringify(
				{
					excluded: [],
					curated: [],
					seedOnly: [],
					renames: { "architect/manifest.json": "architect/manifest.stub.json" },
				},
				null,
				"\t"
			)}\n`
		);
		await writeFile(consumerContentRoot, "architect/manifest.json", "{}\n");
		await writeConsumerManifest(consumerContentRoot, {});

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		assert.equal(
			report.findings.some((f) => f.check === "seed-delivery"),
			false
		);
	});
});

test("runDoctor points at the install seed when an adopted consumer has neither the canonical file nor a stale seed-named copy", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		const consumerContentRoot = path.join(consumerRepoRoot, ".prism");
		await writeFile(
			prismSourceRoot,
			".ai-skills/definitions/seed-curation.json",
			`${JSON.stringify(
				{
					excluded: [],
					curated: [],
					seedOnly: [],
					renames: { "architect/manifest.json": "architect/manifest.stub.json" },
				},
				null,
				"\t"
			)}\n`
		);
		// Adopted (sync manifest present) but the .prism/ tree is corrupted —
		// neither the canonical file nor the stale seed-named copy exists.
		await writeConsumerManifest(consumerContentRoot, {});

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		assert.equal(report.healthy, false);
		const finding = report.findings.find(
			(f) => f.check === "seed-delivery" && f.message.includes("manifest.json")
		);
		assert.ok(finding, "expected a seed-delivery finding for the missing manifest.json");
		assert.equal(finding?.severity, "error");
		assert.ok(
			finding?.message.includes(
				path.join(prismSourceRoot, "templates", "install", ".prism", "architect", "manifest.stub.json")
			) && finding?.message.includes("as .prism/architect/manifest.json"),
			`expected a copy-from-seed remedy, got: ${finding?.message}`
		);
		assert.ok(
			finding?.message.includes("npx @huntermcgrew/prism update"),
			`expected the npx remedy command, got: ${finding?.message}`
		);
	});
});

test("runDoctor degrades to a warning instead of throwing when seed-curation.json is missing", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		const consumerContentRoot = path.join(consumerRepoRoot, ".prism");
		await fs.rm(path.join(prismSourceRoot, ".ai-skills/definitions/seed-curation.json"));
		await writeConsumerManifest(consumerContentRoot, {});

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		const finding = report.findings.find((f) => f.check === "seed-delivery");
		assert.ok(finding, "expected a seed-delivery finding for the missing seed-curation.json");
		assert.equal(finding?.severity, "warning");
		assert.ok(
			finding?.message.includes("Could not check renamed seed files"),
			`expected the degrade-to-warning message, got: ${finding?.message}`
		);
	});
});

// --- rule-load declarations (PRISM-417) ---

test("runDoctor warns on a consumer rule missing load: with the file name and remedy, but stays healthy", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		const consumerContentRoot = path.join(consumerRepoRoot, ".prism");
		await writeFile(consumerContentRoot, "rules/undeclared.md", "# Undeclared\n\nNo load: key.\n");

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		assert.equal(report.healthy, true, "a missing load: is a warning, not an error");
		const finding = report.findings.find((f) => f.check === "rule-load");
		assert.ok(finding, "expected a rule-load finding");
		assert.equal(finding?.severity, "warning");
		assert.match(finding?.message ?? "", /undeclared\.md/);
		assert.match(finding?.message ?? "", /load:/);
	});
});

test("runDoctor warns on a consumer rule missing load: but carrying paths:, preserving path-scoped classification", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		const consumerContentRoot = path.join(consumerRepoRoot, ".prism");
		await writeFile(
			consumerContentRoot,
			"rules/undeclared-paths.md",
			'---\npaths:\n  - "**/*.tsx"\n---\n\n# Undeclared Paths Rule\n'
		);

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		assert.equal(report.healthy, true, "a missing load: is a warning, not an error");
		const finding = report.findings.find((f) => f.check === "rule-load");
		assert.ok(finding, "expected a rule-load finding");
		assert.match(finding?.message ?? "", /undeclared-paths\.md/);
		assert.match(
			finding?.message ?? "",
			/load: paths/,
			"the paths: scoping is preserved, not widened to always-on"
		);
	});
});

test("runDoctor reports no rule-load finding for a rule that declares load:", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		const consumerContentRoot = path.join(consumerRepoRoot, ".prism");
		await writeFile(
			consumerContentRoot,
			"rules/declared.md",
			"---\nload: paths\npaths:\n  - \"**/*.ts\"\n---\n\n# Declared\n"
		);

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		assert.equal(
			report.findings.some((f) => f.check === "rule-load"),
			false
		);
	});
});

test("runDoctor warns on an overlay rule missing load:, labeled custom/ so it isn't confused with a base rule", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		const consumerContentRoot = path.join(consumerRepoRoot, ".prism");
		await writeFile(
			consumerContentRoot,
			"custom/rules/team.md",
			"# Team overlay rule\n\nNo load: key.\n"
		);

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		assert.equal(report.healthy, true, "a missing load: is a warning, not an error");
		const finding = report.findings.find((f) => f.check === "rule-load");
		assert.ok(finding, "expected a rule-load finding for the overlay rule");
		assert.match(finding?.message ?? "", /custom\/team\.md/);
	});
});

test("runDoctor reports no rule-load findings when .prism/rules/ does not exist yet", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		assert.equal(
			report.findings.some((f) => f.check === "rule-load"),
			false
		);
	});
});

// --- non-git dir ---

test("runDoctor reports a non-git target as a finding without throwing", async () => {
	await withTempRoots(
		async ({ prismSourceRoot, consumerRepoRoot }) => {
			const report = await runDoctor({
				consumerRepoRoot,
				prismSourceRoot,
				npmVersionFetcher: NEVER_FETCH,
			});

			assert.equal(report.healthy, false);
			const gitFinding = report.findings.find((f) => f.check === "git-repo");
			assert.ok(gitFinding, "expected a git-repo finding");
			assert.equal(gitFinding?.severity, "error");
			assert.ok(gitFinding?.message.includes("not inside a git repository"));
		},
		{ gitInit: false }
	);
});

// --- npm version check ---

test("runDoctor reports the version check as unavailable when the fetcher returns null", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		assert.equal(report.version.installed, "9.9.9");
		assert.equal(report.version.latest, null);
		assert.equal(report.version.outOfDate, false);
		assert.ok(
			report.findings.some((f) => f.check === "version" && f.severity === "info"),
			"expected an info finding when the npm lookup is unavailable"
		);
		// An unavailable version check must never make the run unhealthy on its own.
		assert.equal(report.healthy, true);
	});
});

test("runDoctor reports an out-of-date warning when the fetcher returns a newer version", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		const fetchNewer: NpmVersionFetcher = async () => "99.0.0";

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: fetchNewer,
		});

		assert.equal(report.version.installed, "9.9.9");
		assert.equal(report.version.latest, "99.0.0");
		assert.equal(report.version.outOfDate, true);
		const versionFinding = report.findings.find((f) => f.check === "version");
		assert.equal(versionFinding?.severity, "warning");
		// A version drift is informational, not a health failure — it must not flip
		// `healthy` to false on its own.
		assert.equal(report.healthy, true);
	});
});

test("runDoctor reports no version finding when installed matches latest", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		const fetchSame: NpmVersionFetcher = async () => "9.9.9";

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: fetchSame,
		});

		assert.equal(report.version.outOfDate, false);
		assert.equal(
			report.findings.some((f) => f.check === "version"),
			false
		);
	});
});

test("runDoctor reports no out-of-date warning when the installed version is ahead of latest", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		const fetchOlder: NpmVersionFetcher = async () => "8.0.0";

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: fetchOlder,
		});

		assert.equal(report.version.outOfDate, false);
		assert.equal(
			report.findings.some((f) => f.check === "version"),
			false
		);
	});
});

test("runDoctor orders version fields numerically, not as text", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		await writeFile(
			prismSourceRoot,
			"package.json",
			`${JSON.stringify({ name: "@huntermcgrew/prism", version: "0.10.0" }, null, "\t")}\n`
		);
		const fetchNineSeries: NpmVersionFetcher = async () => "0.9.0";

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: fetchNineSeries,
		});

		assert.equal(report.version.installed, "0.10.0");
		assert.equal(report.version.outOfDate, false);
		assert.equal(
			report.findings.some((f) => f.check === "version"),
			false
		);
	});
});

// --- architect route integrity ---

/** Writes an architect tree: a routing manifest plus the docs listed in `docs`. */
async function writeArchitectFixture(
	consumerRepoRoot: string,
	manifest: Record<string, string | string[]>,
	docs: string[]
): Promise<void> {
	const contentRoot = path.join(consumerRepoRoot, ".prism");
	await writeFile(
		contentRoot,
		"architect/manifest.json",
		`${JSON.stringify(manifest, null, "\t")}\n`
	);

	for (const doc of docs) {
		await writeFile(contentRoot, `architect/${doc}`, `# ${doc}\n`);
	}
}

function architectMessages(findings: Array<{ check: string; message: string }>): string[] {
	return findings.filter((f) => f.check === "architect-route").map((f) => f.message);
}

test("runDoctor reports an architect doc on disk that no manifest route names", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		await writeArchitectFixture(
			consumerRepoRoot,
			{ ".prism/rules/**": "_toolkit/routed.md" },
			["_toolkit/routed.md", "_toolkit/orphan.md"]
		);

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		const messages = architectMessages(report.findings);
		assert.equal(messages.length, 1);
		assert.match(messages[0], /_toolkit\/orphan\.md/);
		assert.doesNotMatch(messages[0], /_toolkit\/routed\.md/);
	});
});

test("runDoctor reports no architect finding when every doc on disk is routed", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		await writeArchitectFixture(
			consumerRepoRoot,
			{ ".prism/rules/**": ["_toolkit/routed.md", "guides/writing.md"] },
			["_toolkit/routed.md", "guides/writing.md"]
		);

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		assert.deepEqual(architectMessages(report.findings), []);
	});
});

test("runDoctor reports a consumer manifest route anchored to nothing", async () => {
	// The catch-all rejection in `pnpm prism:check` is a development gate and
	// never runs in a consumer's repo, where `manifest.json` is the
	// consumer's own file. Without this check a consumer or Atlas can author
	// `**` and every edit in their tree denies unconditionally.
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		await writeArchitectFixture(
			consumerRepoRoot,
			{ "**": "_toolkit/routed.md" },
			["_toolkit/routed.md"]
		);

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		const catchAll = report.findings.filter(
			(f) => f.check === "architect-route" && f.severity === "error"
		);
		assert.equal(catchAll.length, 1);
		assert.match(catchAll[0].message, /matches every path/);
		assert.equal(report.healthy, false);
	});
});

test("runDoctor reports a consumer manifest route written as a brace glob", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		await writeArchitectFixture(
			consumerRepoRoot,
			{ "src/**/*.{ts,tsx}": "_toolkit/routed.md" },
			["_toolkit/routed.md"]
		);

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		const braces = report.findings.filter(
			(f) => f.check === "architect-route" && f.severity === "error"
		);
		assert.equal(braces.length, 1);
		assert.match(braces[0].message, /brace glob/);
		assert.equal(report.healthy, false);
	});
});

test("runDoctor reports a manifest route naming a doc that is not on disk", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		await writeArchitectFixture(
			consumerRepoRoot,
			{ ".prism/rules/**": ["_toolkit/routed.md", "_toolkit/gone.md"] },
			["_toolkit/routed.md"]
		);

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		const messages = architectMessages(report.findings);
		assert.equal(messages.length, 1);
		assert.match(messages[0], /not on disk/);
		assert.match(messages[0], /_toolkit\/gone\.md/);
	});
});

test("runDoctor skips non-Markdown files in the architect tree, so a routing table is not an orphan", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		await writeArchitectFixture(consumerRepoRoot, { ".prism/rules/**": "_toolkit/routed.md" }, [
			"_toolkit/routed.md",
		]);
		await writeFile(
			path.join(consumerRepoRoot, ".prism"),
			"architect/_toolkit/manifest.base.json",
			"{}\n"
		);

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		assert.deepEqual(architectMessages(report.findings), []);
	});
});

test("runDoctor treats a doc routed only by the toolkit base table as reached, not an orphan", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		await writeArchitectFixture(consumerRepoRoot, { ".prism/rules/**": "_toolkit/routed.md" }, [
			"_toolkit/routed.md",
			"_toolkit/base-only.md",
		]);
		await writeFile(
			path.join(consumerRepoRoot, ".prism"),
			"architect/_toolkit/manifest.base.json",
			`${JSON.stringify({ ".prism/templates/**": "_toolkit/base-only.md" })}\n`
		);

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		assert.deepEqual(
			architectMessages(report.findings),
			[],
			"the base table's route counts as routed"
		);
	});
});

test("runDoctor reports a base-table route naming a doc that is not on disk", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		await writeArchitectFixture(consumerRepoRoot, { ".prism/rules/**": "_toolkit/routed.md" }, [
			"_toolkit/routed.md",
		]);
		await writeFile(
			path.join(consumerRepoRoot, ".prism"),
			"architect/_toolkit/manifest.base.json",
			`${JSON.stringify({ ".prism/templates/**": "_toolkit/base-gone.md" })}\n`
		);

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		const messages = architectMessages(report.findings);
		assert.equal(messages.length, 1);
		assert.match(messages[0], /not on disk/);
		assert.match(messages[0], /_toolkit\/base-gone\.md/);
	});
});

// --- hook registration ---

function hookFindings(findings: Array<{ check: string; message: string }>): string[] {
	return findings.filter((f) => f.check === "hook-registration").map((f) => f.message);
}

const SETTINGS_WITH_HOOK = {
	hooks: {
		PostToolUse: [
			{
				matcher: "Read",
				hooks: [
					{
						type: "command",
						command: 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/hook.mjs" --tool=claude',
					},
				],
			},
		],
	},
};

test("runDoctor reports a hook runtime on disk that settings.json never registers", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		await writeFile(consumerRepoRoot, ".claude/hooks/hook.mjs", "// runtime\n");
		await writeFile(consumerRepoRoot, ".claude/settings.json", `${JSON.stringify({}, null, "\t")}\n`);

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		const messages = hookFindings(report.findings);
		assert.equal(messages.length, 1);
		assert.match(messages[0], /registers no hook command/);
	});
});

test("runDoctor reports a hook registration pointing at a file that is not on disk", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		await writeFile(
			consumerRepoRoot,
			".claude/settings.json",
			`${JSON.stringify(SETTINGS_WITH_HOOK, null, "\t")}\n`
		);

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		const messages = hookFindings(report.findings);
		assert.equal(messages.length, 1);
		assert.match(messages[0], /which is not on disk/);
	});
});

test("runDoctor keeps Windows path separators in a dead hook registration it reports", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		const windowsSettings = {
			hooks: {
				PostToolUse: [
					{
						matcher: "Read",
						hooks: [
							{
								type: "command",
								command: 'node "$CLAUDE_PROJECT_DIR\\.claude\\hooks\\hook.mjs" --tool=claude',
							},
						],
					},
				],
			},
		};

		await writeFile(
			consumerRepoRoot,
			".claude/settings.json",
			`${JSON.stringify(windowsSettings, null, "\t")}\n`
		);

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		const messages = hookFindings(report.findings);
		assert.equal(messages.length, 1);
		assert.match(messages[0], /\.claude/);
		assert.doesNotMatch(messages[0], /claudehooks/);
		assert.doesNotMatch(
			messages[0],
			/\\\\/,
			"the path is reported as the consumer typed it, not with the JSON escapes still in"
		);
	});
});

test("runDoctor reports a settings.json that is not valid JSON", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		await writeFile(consumerRepoRoot, ".claude/hooks/hook.mjs", "// runtime\n");
		await writeFile(consumerRepoRoot, ".claude/settings.json", "{ not json\n");

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		const messages = hookFindings(report.findings);
		assert.equal(messages.length, 1);
		assert.match(messages[0], /not valid JSON/);
	});
});

test("runDoctor reports hook reach, not a problem, when the runtime and its registration agree", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		await writeFile(consumerRepoRoot, ".claude/hooks/hook.mjs", "// runtime\n");
		await writeFile(
			consumerRepoRoot,
			".claude/settings.json",
			`${JSON.stringify(SETTINGS_WITH_HOOK, null, "\t")}\n`
		);

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		const messages = hookFindings(report.findings);
		assert.equal(messages.length, 1);
		assert.match(messages[0], /Claude Code only/);
		assert.equal(report.findings.find((f) => f.check === "hook-registration")?.severity, "info");
	});
});

test("runDoctor omits the hook reach line when the runtime is present but unregistered", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		await writeFile(consumerRepoRoot, ".claude/hooks/hook.mjs", "// runtime\n");
		await writeFile(consumerRepoRoot, ".claude/settings.json", `${JSON.stringify({}, null, "\t")}\n`);

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		const hookFindingsList = report.findings.filter((f) => f.check === "hook-registration");
		assert.equal(hookFindingsList.length, 1);
		assert.equal(hookFindingsList[0].severity, "warning");
		assert.equal(hookFindingsList.filter((f) => f.severity === "info").length, 0);
	});
});

test("runDoctor reports the prose fallback, not a problem, on a repo whose hosts exclude Claude Code", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		await writeFile(
			consumerRepoRoot,
			".ai-skills/config.json",
			`${JSON.stringify({ ...CONSUMER_CONFIG_JSON, hosts: ["codex"] }, null, "\t")}\n`
		);

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		const messages = hookFindings(report.findings);
		assert.equal(messages.length, 1);
		assert.match(messages[0], /not delivered on this repo's hosts/);
		assert.match(messages[0], /codex/);
		assert.equal(report.findings.find((f) => f.check === "hook-registration")?.severity, "info");
	});
});

test("runDoctor warns when hosts exclude Claude Code but PRISM's runtime is still on disk", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		await writeFile(
			consumerRepoRoot,
			".ai-skills/config.json",
			`${JSON.stringify({ ...CONSUMER_CONFIG_JSON, hosts: ["codex"] }, null, "\t")}\n`
		);
		await writeFile(
			consumerRepoRoot,
			".claude/hooks/hook.mjs",
			"// @prism-hook-runtime\nexport const label = \"delivered\";\n"
		);

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		const messages = hookFindings(report.findings);
		assert.equal(messages.length, 1);
		assert.match(messages[0], /run npx @huntermcgrew\/prism update/);
		assert.equal(report.findings.find((f) => f.check === "hook-registration")?.severity, "warning");
	});
});

test("runDoctor warns when hosts exclude Claude Code but PRISM's registration is still in settings", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		await writeFile(
			consumerRepoRoot,
			".ai-skills/config.json",
			`${JSON.stringify({ ...CONSUMER_CONFIG_JSON, hosts: ["codex"] }, null, "\t")}\n`
		);
		await writeFile(
			consumerRepoRoot,
			".claude/settings.json",
			`${JSON.stringify(SETTINGS_WITH_HOOK, null, "\t")}\n`
		);

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		const hookFindingsList = report.findings.filter((f) => f.check === "hook-registration");
		assert.equal(hookFindingsList.length, 1);
		assert.equal(hookFindingsList[0].severity, "warning");
		assert.match(hookFindingsList[0].message, /registration in \.claude\/settings\.json is/);
	});
});

test("runDoctor ignores a consumer's own hook entry when deciding whether PRISM's registration is stale", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		await writeFile(
			consumerRepoRoot,
			".ai-skills/config.json",
			`${JSON.stringify({ ...CONSUMER_CONFIG_JSON, hosts: ["codex"] }, null, "\t")}\n`
		);
		const consumerOwnSettings = {
			hooks: {
				PostToolUse: [
					{
						matcher: "Write",
						hooks: [{ type: "command", command: "./scripts/consumer-audit.sh" }],
					},
				],
			},
		};
		await writeFile(
			consumerRepoRoot,
			".claude/settings.json",
			`${JSON.stringify(consumerOwnSettings, null, "\t")}\n`
		);

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		const hookFindingsList = report.findings.filter((f) => f.check === "hook-registration");
		assert.equal(
			hookFindingsList.filter((f) => f.severity === "warning").length,
			0,
			"a consumer's own hook entry is not PRISM's, so it does not read as a stale delivery"
		);
	});
});

test("runDoctor warns on a dead registration even when hosts excludes Claude Code", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		await writeFile(
			consumerRepoRoot,
			".ai-skills/config.json",
			`${JSON.stringify({ ...CONSUMER_CONFIG_JSON, hosts: ["codex"] }, null, "\t")}\n`
		);
		// A hand-edited command that mentions the runtime path but no longer
		// matches PRISM_HOOK_COMMAND_PATTERN — update.ts's removal branch does
		// not claim it, so it survives dropping claude from hosts while the
		// runtime file it points at is gone.
		const handEditedRegistration = {
			hooks: {
				PostToolUse: [
					{
						matcher: "Read",
						hooks: [
							{
								type: "command",
								command: "bash -c 'my-lint && node .claude/hooks/hook.mjs --tool=claude'",
							},
						],
					},
				],
			},
		};
		await writeFile(
			consumerRepoRoot,
			".claude/settings.json",
			`${JSON.stringify(handEditedRegistration, null, "\t")}\n`
		);

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		const hookFindingsList = report.findings.filter((f) => f.check === "hook-registration");
		const deadRegistration = hookFindingsList.find((f) => /which is not on disk/.test(f.message));
		assert.ok(
			deadRegistration,
			"a registration pointing at a missing file is wrong on every host mix, not only when claude is in hosts"
		);
		assert.equal(deadRegistration!.severity, "warning");
	});
});

test("runDoctor treats an unreadable config as declaring every host", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		await fs.rm(path.join(consumerRepoRoot, ".ai-skills", "config.json"), { force: true });
		await writeFile(consumerRepoRoot, ".claude/hooks/hook.mjs", "// runtime\n");
		await writeFile(
			consumerRepoRoot,
			".claude/settings.json",
			`${JSON.stringify(SETTINGS_WITH_HOOK, null, "\t")}\n`
		);

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		const hookFindingsList = report.findings.filter((f) => f.check === "hook-registration");
		const reach = hookFindingsList.find((f) => f.severity === "info");
		assert.ok(reach, "the reach info fires — an unreadable config resolves to every host");
		assert.match(reach!.message, /Claude Code only/);
		assert.equal(
			hookFindingsList.filter((f) => f.severity === "warning").length,
			0,
			"the stale-delivery warning does not fire when the config could not be read"
		);
	});
});

test("formatDoctorReport still prints No issues found. alongside an info-only finding", async () => {
	const report = {
		findings: [
			{
				check: "hook-registration" as const,
				severity: "info" as const,
				message: "The hook runtime is installed and registered.",
			},
		],
		syncState: { manifest: null },
		version: { installed: "1.0.0", latest: null, outOfDate: false },
		healthy: true,
	};

	const rendered = formatDoctorReport(report);
	assert.match(rendered, /No issues found\./);
	assert.match(rendered, /\[INFO\] hook-registration:/);
});

test("runDoctor stays silent when a repo has neither a hook runtime nor a registration — the check reports each half against the other, so their joint absence is outside what it can see", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		await writeFile(
			consumerRepoRoot,
			".ai-skills/config.json",
			`${JSON.stringify({ ...CONSUMER_CONFIG_JSON, hosts: ["claude"] }, null, "\t")}\n`
		);

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		assert.deepEqual(hookFindings(report.findings), []);
	});
});

// --- host-output check ---

test("runDoctor warns when a host the config excludes still has PRISM's output on disk", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		await writeFile(
			consumerRepoRoot,
			".ai-skills/config.json",
			`${JSON.stringify({ ...CONSUMER_CONFIG_JSON, hosts: ["codex"] }, null, "\t")}\n`
		);
		await writeFile(
			consumerRepoRoot,
			".ai-skills/definitions/paths.json",
			`${JSON.stringify(CONSUMER_PATHS_JSON, null, "\t")}\n`
		);
		await writeFile(
			consumerRepoRoot,
			".claude/skills/prism-sample/SKILL.md",
			"# Sample\n"
		);
		await writeFile(
			consumerRepoRoot,
			".claude/skills/prism-sample/.ai-skill-generated",
			""
		);

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		const hostOutputFindings = report.findings.filter((f) => f.check === "host-output");
		assert.equal(hostOutputFindings.length, 1);
		assert.equal(hostOutputFindings[0].severity, "warning");
		assert.match(hostOutputFindings[0].message, /"claude"/);
	});
});

test("runDoctor reports no host-output finding when the tree matches the declared hosts", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		await writeFile(
			consumerRepoRoot,
			".ai-skills/config.json",
			`${JSON.stringify({ ...CONSUMER_CONFIG_JSON, hosts: ["codex"] }, null, "\t")}\n`
		);
		await writeFile(
			consumerRepoRoot,
			".ai-skills/definitions/paths.json",
			`${JSON.stringify(CONSUMER_PATHS_JSON, null, "\t")}\n`
		);
		// No output under .claude/ or .cursor/ — only the declared host, codex,
		// has anything on disk.
		await writeFile(
			consumerRepoRoot,
			".agents/skills/prism-sample/SKILL.md",
			"# Sample\n"
		);
		await writeFile(
			consumerRepoRoot,
			".agents/skills/prism-sample/.ai-skill-generated",
			""
		);

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		assert.deepEqual(
			report.findings.filter((f) => f.check === "host-output"),
			[]
		);
	});
});

test("runDoctor reports no host-output finding when the config declares no hosts", async () => {
	await withTempRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		await writeFile(
			consumerRepoRoot,
			".ai-skills/definitions/paths.json",
			`${JSON.stringify(CONSUMER_PATHS_JSON, null, "\t")}\n`
		);
		// Output under every host's root — legitimate when hosts is absent, since
		// the resolver's default is every host.
		for (const skillsRoot of [".claude/skills", ".agents/skills", ".cursor/skills"]) {
			await writeFile(consumerRepoRoot, `${skillsRoot}/prism-sample/SKILL.md`, "# Sample\n");
			await writeFile(consumerRepoRoot, `${skillsRoot}/prism-sample/.ai-skill-generated`, "");
		}

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		assert.deepEqual(
			report.findings.filter((f) => f.check === "host-output"),
			[]
		);
	});
});

// --- report formatting ---

test("formatDoctorReport renders findings and a trailing health line", async () => {
	await withTempRoots(
		async ({ prismSourceRoot, consumerRepoRoot }) => {
			const report = await runDoctor({
				consumerRepoRoot,
				prismSourceRoot,
				npmVersionFetcher: NEVER_FETCH,
			});

			const text = formatDoctorReport(report);
			assert.ok(text.includes("[ERROR] git-repo:"));
			assert.ok(text.includes("prism doctor: unhealthy"));
		},
		{ gitInit: false }
	);
});
