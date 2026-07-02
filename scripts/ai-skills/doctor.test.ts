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

import { formatDoctorReport, runDoctor, type NpmVersionFetcher } from "./doctor";
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
		await writeFile(consumerContentRoot, "rules/a.md", "# A\n");
		await writeConsumerManifest(consumerContentRoot, { "rules/a.md": "# A\n" });

		const report = await runDoctor({
			consumerRepoRoot,
			prismSourceRoot,
			npmVersionFetcher: NEVER_FETCH,
		});

		assert.equal(report.healthy, true);
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
