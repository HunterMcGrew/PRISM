/**
 * Coverage for `prism eject` (issue #377): the delete-with-backup and
 * marker-gate logic are reused, tested code paths from `update.ts` and
 * `generate-skills.ts` — this file focuses on eject's own composition: the
 * manifest-driven delete set, the diverged-`.bak` guarantee, consumer-content
 * preservation, marker-safety on projected skills, and the `--yes` /
 * `--dry-run` preview posture.
 *
 * Fixture shape mirrors `update.test.ts` and `doctor.test.ts`: a temp
 * consumer repo with `.prism/`, a `.sync-manifest.json`, and (for the
 * skill-removal tests) skill/agent target roots under `.claude` / `.agents` /
 * `.codex` / `.cursor`, matching `generate-skills.test.ts`'s target-root
 * shape.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import test from "node:test";
import assert from "node:assert/strict";

import {
	AGENTS_MD_BLOCK_BEGIN,
	AGENTS_MD_BLOCK_END,
	AGENTS_MD_SEEDED_MARKER,
	renderSeededAgentsMd,
} from "./agents-md-block";
import { formatEjectReport, runEject, type EjectReport } from "./eject";
import { GENERATED_MARKDOWN_HEADER_LINE } from "./generate-skills";
import {
	SYNC_MANIFEST_FILENAME,
	type SyncManifest,
} from "./sync-manifest";
import { GENERATED_HEADER_LINE, hashContent, MANAGED_MARKER, type PathDefinitions } from "./utils";

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

const PATH_DEFINITIONS: PathDefinitions = {
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

async function withTempConsumerRoot(
	body: (roots: { consumerRepoRoot: string; consumerContentRoot: string }) => Promise<void>,
	options: { gitInit?: boolean } = {}
): Promise<void> {
	const { gitInit: shouldGitInit = true } = options;
	const consumerRepoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "prism-eject-"));
	const consumerContentRoot = path.join(consumerRepoRoot, ".prism");
	await fs.mkdir(consumerContentRoot, { recursive: true });

	if (shouldGitInit) {
		gitInit(consumerRepoRoot);
	}

	try {
		await body({ consumerRepoRoot, consumerContentRoot });
	} finally {
		await fs.rm(consumerRepoRoot, { force: true, recursive: true });
	}
}

async function writeFile(root: string, relativePath: string, content: string): Promise<void> {
	const absolutePath = path.join(root, relativePath);
	await fs.mkdir(path.dirname(absolutePath), { recursive: true });
	await fs.writeFile(absolutePath, content, "utf8");
}

async function fileExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
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

/** Writes a marker-confirmed `prism-*` skill directory under one platform skill root. */
async function writeMarkedSkillDir(consumerRepoRoot: string, root: string, skillId: string): Promise<void> {
	await writeFile(consumerRepoRoot, path.join(root, skillId, "SKILL.md"), `# ${skillId}\n`);
	await writeFile(consumerRepoRoot, path.join(root, skillId, MANAGED_MARKER), "Managed by scripts/ai-skills/build.ts\n");
}

function snapshotFileOutcome(report: EjectReport, relativePath: string) {
	const outcome = report.fileOutcomes.find((o) => o.relativePath === relativePath);
	assert.ok(outcome, `expected a file outcome for ${relativePath}`);
	return outcome;
}

// --- full eject (clean install) ---

test("runEject removes every PRISM-owned file, marked skill, and the manifest on a clean install", async () => {
	await withTempConsumerRoot(async ({ consumerRepoRoot, consumerContentRoot }) => {
		await writeFile(consumerContentRoot, "rules/a.md", "# A\n");
		await writeFile(consumerContentRoot, "templates/b.md", "# B\n");
		await writeConsumerManifest(consumerContentRoot, {
			"rules/a.md": "# A\n",
			"templates/b.md": "# B\n",
		});

		await writeMarkedSkillDir(consumerRepoRoot, ".claude/skills", "prism-sample");
		await writeFile(
			consumerRepoRoot,
			".codex/agents/prism-sample.toml",
			`${GENERATED_HEADER_LINE}\n[agent]\n`
		);

		const report = await runEject({
			consumerRepoRoot,
			consumerContentRoot,
			pathDefinitions: PATH_DEFINITIONS,
			confirmed: true,
			dryRun: false,
		});

		assert.equal(snapshotFileOutcome(report, "rules/a.md").action, "removed");
		assert.equal(snapshotFileOutcome(report, "templates/b.md").action, "removed");
		assert.equal(await fileExists(path.join(consumerContentRoot, "rules/a.md")), false);
		assert.equal(await fileExists(path.join(consumerContentRoot, "templates/b.md")), false);

		assert.equal(
			await fileExists(path.join(consumerRepoRoot, ".claude/skills/prism-sample")),
			false
		);
		assert.equal(
			await fileExists(path.join(consumerRepoRoot, ".codex/agents/prism-sample.toml")),
			false
		);

		assert.equal(report.manifestRemoved, true);
		assert.equal(
			await fileExists(path.join(consumerContentRoot, SYNC_MANIFEST_FILENAME)),
			false
		);
	});
});

// --- diverged files preserve .bak ---

test("runEject backs up a diverged PRISM-owned file before removing it, and never clobbers an existing .bak", async () => {
	await withTempConsumerRoot(async ({ consumerRepoRoot, consumerContentRoot }) => {
		await writeFile(consumerContentRoot, "rules/diverged.md", "# hand-edited\n");
		await writeFile(consumerContentRoot, "rules/diverged.md.bak", "# prior backup\n");
		await writeConsumerManifest(consumerContentRoot, {
			"rules/diverged.md": "# original base\n",
		});

		const report = await runEject({
			consumerRepoRoot,
			consumerContentRoot,
			pathDefinitions: PATH_DEFINITIONS,
			confirmed: true,
			dryRun: false,
		});

		const outcome = snapshotFileOutcome(report, "rules/diverged.md");
		assert.equal(outcome.action, "removed-with-backup");
		assert.ok(outcome.backupPath, "expected a backupPath on the outcome");

		// The pre-existing .bak was not clobbered — the new backup landed at .bak.1.
		assert.equal(path.basename(outcome.backupPath as string), "diverged.md.bak.1");
		assert.equal(
			await fs.readFile(path.join(consumerContentRoot, "rules/diverged.md.bak"), "utf8"),
			"# prior backup\n"
		);
		assert.equal(
			await fs.readFile(outcome.backupPath as string, "utf8"),
			"# hand-edited\n"
		);
		assert.equal(await fileExists(path.join(consumerContentRoot, "rules/diverged.md")), false);
	});
});

// --- consumer-owned content preserved ---

test("runEject preserves consumer-owned content and reports it", async () => {
	await withTempConsumerRoot(async ({ consumerRepoRoot, consumerContentRoot }) => {
		await writeFile(consumerContentRoot, "plans/foo.md", "# plan\n");
		await writeFile(consumerContentRoot, "lessons.md", "# lessons\n");
		await writeFile(consumerContentRoot, "custom/bar.md", "# custom\n");
		await writeFile(consumerContentRoot, "architect/baz.md", "# baz\n");
		await writeConsumerManifest(consumerContentRoot, {
			"plans/foo.md": "# plan\n",
			"lessons.md": "# lessons\n",
			"custom/bar.md": "# custom\n",
			"architect/baz.md": "# baz\n",
		});

		const report = await runEject({
			consumerRepoRoot,
			consumerContentRoot,
			pathDefinitions: PATH_DEFINITIONS,
			confirmed: true,
			dryRun: false,
		});

		for (const relativePath of ["plans/foo.md", "lessons.md", "custom/bar.md", "architect/baz.md"]) {
			assert.equal(snapshotFileOutcome(report, relativePath).action, "preserved");
			assert.equal(await fileExists(path.join(consumerContentRoot, relativePath)), true);
		}

		assert.ok(
			report.preservedNotices.some((n) => n.includes("consumer-owned content")),
			"expected a preservedNotices entry naming consumer-owned content"
		);
	});
});

// --- --yes safety / dry-run parity ---

test("runEject with confirmed: false leaves the filesystem byte-identical but computes the same report shape", async () => {
	await withTempConsumerRoot(async ({ consumerRepoRoot, consumerContentRoot }) => {
		await writeFile(consumerContentRoot, "rules/a.md", "# A\n");
		await writeConsumerManifest(consumerContentRoot, { "rules/a.md": "# A\n" });
		await writeMarkedSkillDir(consumerRepoRoot, ".claude/skills", "prism-sample");

		const previewReport = await runEject({
			consumerRepoRoot,
			consumerContentRoot,
			pathDefinitions: PATH_DEFINITIONS,
			confirmed: false,
			dryRun: false,
		});

		assert.equal(await fileExists(path.join(consumerContentRoot, "rules/a.md")), true);
		assert.equal(
			await fileExists(path.join(consumerRepoRoot, ".claude/skills/prism-sample")),
			true
		);
		assert.equal(
			await fileExists(path.join(consumerContentRoot, SYNC_MANIFEST_FILENAME)),
			true
		);

		const realReport = await runEject({
			consumerRepoRoot,
			consumerContentRoot,
			pathDefinitions: PATH_DEFINITIONS,
			confirmed: true,
			dryRun: false,
		});

		assert.equal(snapshotFileOutcome(previewReport, "rules/a.md").action, "removed");
		assert.equal(snapshotFileOutcome(realReport, "rules/a.md").action, "removed");
		assert.deepEqual(
			previewReport.fileOutcomes.map((o) => ({ relativePath: o.relativePath, action: o.action })),
			realReport.fileOutcomes.map((o) => ({ relativePath: o.relativePath, action: o.action }))
		);
	});
});

test("runEject with dryRun: true leaves the filesystem untouched even when confirmed: true", async () => {
	await withTempConsumerRoot(async ({ consumerRepoRoot, consumerContentRoot }) => {
		await writeFile(consumerContentRoot, "rules/a.md", "# A\n");
		await writeConsumerManifest(consumerContentRoot, { "rules/a.md": "# A\n" });

		const report = await runEject({
			consumerRepoRoot,
			consumerContentRoot,
			pathDefinitions: PATH_DEFINITIONS,
			confirmed: true,
			dryRun: true,
		});

		assert.equal(snapshotFileOutcome(report, "rules/a.md").action, "removed");
		assert.equal(await fileExists(path.join(consumerContentRoot, "rules/a.md")), true);
		assert.equal(
			await fileExists(path.join(consumerContentRoot, SYNC_MANIFEST_FILENAME)),
			true
		);
	});
});

// --- marker safety ---

test("runEject never deletes a prism-prefixed skill without the managed marker, or a marked non-prism skill", async () => {
	await withTempConsumerRoot(async ({ consumerRepoRoot, consumerContentRoot }) => {
		await writeConsumerManifest(consumerContentRoot, {});

		// Hand-authored prism-* skill: no marker file.
		await writeFile(
			consumerRepoRoot,
			".claude/skills/prism-handauthored/SKILL.md",
			"# hand-authored\n"
		);

		// A marked skill that is not prism-* (org/custom-owned) — must survive too.
		await writeFile(
			consumerRepoRoot,
			".claude/skills/custom-foo/SKILL.md",
			"# custom\n"
		);
		await writeFile(
			consumerRepoRoot,
			".claude/skills/custom-foo/" + MANAGED_MARKER,
			"Managed by scripts/ai-skills/build.ts\n"
		);

		const report = await runEject({
			consumerRepoRoot,
			consumerContentRoot,
			pathDefinitions: PATH_DEFINITIONS,
			confirmed: true,
			dryRun: false,
		});

		assert.equal(
			await fileExists(path.join(consumerRepoRoot, ".claude/skills/prism-handauthored")),
			true
		);
		assert.equal(
			await fileExists(path.join(consumerRepoRoot, ".claude/skills/custom-foo")),
			true
		);

		const handAuthored = report.skillOutcomes.find((o) =>
			o.path.includes("prism-handauthored")
		);
		assert.equal(handAuthored?.action, "skipped-no-marker");

		const customFoo = report.skillOutcomes.find((o) => o.path.includes("custom-foo"));
		assert.equal(customFoo?.action, "skipped-not-prism");
	});
});

test("runEject removes a marker-confirmed prism-* Claude agent .md adapter and skips one without the header", async () => {
	await withTempConsumerRoot(async ({ consumerRepoRoot, consumerContentRoot }) => {
		await writeConsumerManifest(consumerContentRoot, {});

		await writeFile(
			consumerRepoRoot,
			".claude/agents/prism-sample.md",
			`---\nname: prism-sample\n---\n\n${GENERATED_MARKDOWN_HEADER_LINE}\n\nBody.\n`
		);
		await writeFile(
			consumerRepoRoot,
			".claude/agents/prism-handauthored.md",
			"# hand-authored, no generated header\n"
		);

		const report = await runEject({
			consumerRepoRoot,
			consumerContentRoot,
			pathDefinitions: PATH_DEFINITIONS,
			confirmed: true,
			dryRun: false,
		});

		assert.equal(
			await fileExists(path.join(consumerRepoRoot, ".claude/agents/prism-sample.md")),
			false
		);
		assert.equal(
			await fileExists(path.join(consumerRepoRoot, ".claude/agents/prism-handauthored.md")),
			true
		);

		const handAuthored = report.skillOutcomes.find((o) =>
			o.path.includes("prism-handauthored")
		);
		assert.equal(handAuthored?.action, "skipped-no-marker");
	});
});

// --- codex-config.toml removal ---

test("runEject removes a generated .codex/codex-config.toml and reports it", async () => {
	await withTempConsumerRoot(async ({ consumerRepoRoot, consumerContentRoot }) => {
		await writeConsumerManifest(consumerContentRoot, {});
		await writeFile(
			consumerRepoRoot,
			".codex/codex-config.toml",
			`${GENERATED_HEADER_LINE}\n[agents]\nmax_threads = 6\n`
		);

		const report = await runEject({
			consumerRepoRoot,
			consumerContentRoot,
			pathDefinitions: PATH_DEFINITIONS,
			confirmed: true,
			dryRun: false,
		});

		assert.equal(
			await fileExists(path.join(consumerRepoRoot, ".codex/codex-config.toml")),
			false
		);

		const outcome = report.skillOutcomes.find((o) => o.path.includes("codex-config.toml"));
		assert.equal(outcome?.action, "removed");
	});
});

test("runEject previews but does not remove .codex/codex-config.toml under dry-run or without --yes", async () => {
	await withTempConsumerRoot(async ({ consumerRepoRoot, consumerContentRoot }) => {
		await writeConsumerManifest(consumerContentRoot, {});
		await writeFile(
			consumerRepoRoot,
			".codex/codex-config.toml",
			`${GENERATED_HEADER_LINE}\n[agents]\nmax_threads = 6\n`
		);

		const previewReport = await runEject({
			consumerRepoRoot,
			consumerContentRoot,
			pathDefinitions: PATH_DEFINITIONS,
			confirmed: false,
			dryRun: false,
		});
		assert.equal(
			await fileExists(path.join(consumerRepoRoot, ".codex/codex-config.toml")),
			true
		);
		assert.equal(
			previewReport.skillOutcomes.find((o) => o.path.includes("codex-config.toml"))?.action,
			"removed"
		);

		const dryRunReport = await runEject({
			consumerRepoRoot,
			consumerContentRoot,
			pathDefinitions: PATH_DEFINITIONS,
			confirmed: true,
			dryRun: true,
		});
		assert.equal(
			await fileExists(path.join(consumerRepoRoot, ".codex/codex-config.toml")),
			true
		);
		assert.equal(
			dryRunReport.skillOutcomes.find((o) => o.path.includes("codex-config.toml"))?.action,
			"removed"
		);
	});
});

test("runEject preserves a .codex/codex-config.toml that lacks the generated header line", async () => {
	await withTempConsumerRoot(async ({ consumerRepoRoot, consumerContentRoot }) => {
		await writeConsumerManifest(consumerContentRoot, {});
		await writeFile(
			consumerRepoRoot,
			".codex/codex-config.toml",
			"[agents]\nmax_threads = 2\n"
		);

		const report = await runEject({
			consumerRepoRoot,
			consumerContentRoot,
			pathDefinitions: PATH_DEFINITIONS,
			confirmed: true,
			dryRun: false,
		});

		assert.equal(
			await fileExists(path.join(consumerRepoRoot, ".codex/codex-config.toml")),
			true
		);
		assert.equal(
			report.skillOutcomes.find((o) => o.path.includes("codex-config.toml"))?.action,
			"skipped-no-marker"
		);
	});
});

// --- no manifest ---

test("runEject against a repo with no sync manifest deletes nothing and reports nothing to eject", async () => {
	await withTempConsumerRoot(async ({ consumerRepoRoot, consumerContentRoot }) => {
		await writeFile(consumerContentRoot, "rules/a.md", "# A\n");

		const report = await runEject({
			consumerRepoRoot,
			consumerContentRoot,
			pathDefinitions: PATH_DEFINITIONS,
			confirmed: true,
			dryRun: false,
		});

		assert.equal(report.fileOutcomes.length, 0);
		assert.equal(report.manifestRemoved, false);
		assert.ok(report.preservedNotices.some((n) => n.includes("nothing to eject")));
		assert.equal(await fileExists(path.join(consumerContentRoot, "rules/a.md")), true);
	});
});

// --- AGENTS.md / CLAUDE.md reporting ---

test("runEject leaves AGENTS.md and CLAUDE.md in place and names PRISM's contribution", async () => {
	await withTempConsumerRoot(async ({ consumerRepoRoot, consumerContentRoot }) => {
		await writeConsumerManifest(consumerContentRoot, {});
		await writeFile(
			consumerRepoRoot,
			"AGENTS.md",
			`# AGENTS\n\n${AGENTS_MD_BLOCK_BEGIN}\n\nGenerated content.\n\n${AGENTS_MD_BLOCK_END}\n`
		);
		await writeFile(consumerRepoRoot, "CLAUDE.md", "# CLAUDE.md\nSee AGENTS.md.\n");

		const report = await runEject({
			consumerRepoRoot,
			consumerContentRoot,
			pathDefinitions: PATH_DEFINITIONS,
			confirmed: true,
			dryRun: false,
		});

		assert.equal(await fileExists(path.join(consumerRepoRoot, "AGENTS.md")), true);
		assert.equal(await fileExists(path.join(consumerRepoRoot, "CLAUDE.md")), true);
		assert.ok(report.preservedNotices.some((n) => n.includes("AGENTS.md") && n.includes(AGENTS_MD_BLOCK_BEGIN)));
		assert.ok(
			report.preservedNotices.some(
				(n) => n === "CLAUDE.md is present but was not created by PRISM — review manually before deleting."
			)
		);
	});
});

test("runEject removes a PRISM-seeded AGENTS.md and names it in the report", async () => {
	await withTempConsumerRoot(async ({ consumerRepoRoot, consumerContentRoot }) => {
		await writeConsumerManifest(consumerContentRoot, {});
		await writeFile(consumerRepoRoot, "AGENTS.md", renderSeededAgentsMd());

		const report = await runEject({
			consumerRepoRoot,
			consumerContentRoot,
			pathDefinitions: PATH_DEFINITIONS,
			confirmed: true,
			dryRun: false,
		});

		assert.equal(
			await fileExists(path.join(consumerRepoRoot, "AGENTS.md")),
			false,
			"seeded AGENTS.md is removed"
		);
		assert.ok(
			report.preservedNotices.some(
				(n) => n === "Removed PRISM-seeded AGENTS.md (carried the prism:seeded-agents-md marker)."
			)
		);
	});
});

test("runEject preserves an AGENTS.md whose seeded marker was deleted (disown-to-keep)", async () => {
	await withTempConsumerRoot(async ({ consumerRepoRoot, consumerContentRoot }) => {
		await writeConsumerManifest(consumerContentRoot, {});
		const disowned = renderSeededAgentsMd().replace(`${AGENTS_MD_SEEDED_MARKER}\n\n`, "");
		assert.ok(
			!disowned.includes(AGENTS_MD_SEEDED_MARKER),
			"test fixture must not carry the marker after disowning"
		);
		await writeFile(consumerRepoRoot, "AGENTS.md", disowned);

		const report = await runEject({
			consumerRepoRoot,
			consumerContentRoot,
			pathDefinitions: PATH_DEFINITIONS,
			confirmed: true,
			dryRun: false,
		});

		assert.equal(
			await fileExists(path.join(consumerRepoRoot, "AGENTS.md")),
			true,
			"marker-deleted AGENTS.md is preserved, not removed"
		);
		assert.ok(
			report.preservedNotices.some(
				(n) => n.includes("AGENTS.md") && n.includes(AGENTS_MD_BLOCK_BEGIN)
			)
		);
	});
});

test("runEject preview leaves a PRISM-seeded AGENTS.md in place and reports it would be removed", async () => {
	await withTempConsumerRoot(async ({ consumerRepoRoot, consumerContentRoot }) => {
		await writeConsumerManifest(consumerContentRoot, {});
		await writeFile(consumerRepoRoot, "AGENTS.md", renderSeededAgentsMd());

		const report = await runEject({
			consumerRepoRoot,
			consumerContentRoot,
			pathDefinitions: PATH_DEFINITIONS,
			confirmed: false,
			dryRun: false,
		});

		assert.equal(
			await fileExists(path.join(consumerRepoRoot, "AGENTS.md")),
			true,
			"preview must not remove the seeded file"
		);
		assert.ok(
			report.preservedNotices.some(
				(n) => n === "Would remove PRISM-seeded AGENTS.md (carries the prism:seeded-agents-md marker)."
			)
		);
	});
});

// --- empty dir cleanup ---

test("runEject prunes now-empty directories but keeps directories still holding preserved content", async () => {
	await withTempConsumerRoot(async ({ consumerRepoRoot, consumerContentRoot }) => {
		await writeFile(consumerContentRoot, "rules/a.md", "# A\n");
		await writeFile(consumerContentRoot, "plans/foo.md", "# plan\n");
		await writeConsumerManifest(consumerContentRoot, {
			"rules/a.md": "# A\n",
			"plans/foo.md": "# plan\n",
		});

		const report = await runEject({
			consumerRepoRoot,
			consumerContentRoot,
			pathDefinitions: PATH_DEFINITIONS,
			confirmed: true,
			dryRun: false,
		});

		assert.equal(await fileExists(path.join(consumerContentRoot, "rules")), false);
		assert.equal(await fileExists(path.join(consumerContentRoot, "plans")), true);
		assert.equal(
			report.emptyDirsRemoved.includes(path.join(consumerContentRoot, "rules")),
			true
		);
	});
});

test("runEject preview and real runs agree on nested empty-dir pruning (issue #397)", async () => {
	await withTempConsumerRoot(async ({ consumerRepoRoot, consumerContentRoot }) => {
		// `rules/nested/a.md` is the only file under `rules/` — once it's removed,
		// `rules/nested` becomes empty, and only then does `rules` itself become
		// empty. A preview run must report both levels exactly as a real run would.
		await writeFile(consumerContentRoot, "rules/nested/a.md", "# A\n");
		await writeConsumerManifest(consumerContentRoot, {
			"rules/nested/a.md": "# A\n",
		});

		const previewReport = await runEject({
			consumerRepoRoot,
			consumerContentRoot,
			pathDefinitions: PATH_DEFINITIONS,
			confirmed: false,
			dryRun: false,
		});

		const nestedPath = path.join(consumerContentRoot, "rules", "nested");
		const rulesPath = path.join(consumerContentRoot, "rules");

		assert.equal(previewReport.emptyDirsRemoved.includes(nestedPath), true);
		assert.equal(previewReport.emptyDirsRemoved.includes(rulesPath), true);
		assert.equal(await fileExists(nestedPath), true, "preview must not touch the filesystem");

		const realReport = await runEject({
			consumerRepoRoot,
			consumerContentRoot,
			pathDefinitions: PATH_DEFINITIONS,
			confirmed: true,
			dryRun: false,
		});

		assert.equal(realReport.emptyDirsRemoved.includes(nestedPath), true);
		assert.equal(realReport.emptyDirsRemoved.includes(rulesPath), true);
		assert.equal(await fileExists(nestedPath), false);
		assert.equal(await fileExists(rulesPath), false);

		assert.deepEqual(
			[...previewReport.emptyDirsRemoved].sort(),
			[...realReport.emptyDirsRemoved].sort(),
			"preview and real emptyDirsRemoved must agree exactly"
		);
	});
});

test("runEject prunes a projected skill root that becomes empty after removing its only prism-* skill", async () => {
	await withTempConsumerRoot(async ({ consumerRepoRoot, consumerContentRoot }) => {
		await writeConsumerManifest(consumerContentRoot, {});
		await writeMarkedSkillDir(consumerRepoRoot, ".claude/skills", "prism-sample");

		const skillRootPath = path.join(consumerRepoRoot, ".claude", "skills");

		const report = await runEject({
			consumerRepoRoot,
			consumerContentRoot,
			pathDefinitions: PATH_DEFINITIONS,
			confirmed: true,
			dryRun: false,
		});

		assert.equal(await fileExists(skillRootPath), false, "empty skill root must be pruned");
		assert.equal(report.emptyDirsRemoved.includes(skillRootPath), true);
	});
});

test("runEject preserves a projected skill root that still holds a consumer-owned skill after removal", async () => {
	await withTempConsumerRoot(async ({ consumerRepoRoot, consumerContentRoot }) => {
		await writeConsumerManifest(consumerContentRoot, {});
		await writeMarkedSkillDir(consumerRepoRoot, ".claude/skills", "prism-sample");
		await writeFile(consumerRepoRoot, ".claude/skills/custom-foo/SKILL.md", "# custom\n");

		const skillRootPath = path.join(consumerRepoRoot, ".claude", "skills");

		const report = await runEject({
			consumerRepoRoot,
			consumerContentRoot,
			pathDefinitions: PATH_DEFINITIONS,
			confirmed: true,
			dryRun: false,
		});

		assert.equal(await fileExists(skillRootPath), true, "root still holds a consumer skill");
		assert.equal(
			await fileExists(path.join(skillRootPath, "custom-foo", "SKILL.md")),
			true,
			"consumer skill contents must be untouched"
		);
		assert.equal(report.emptyDirsRemoved.includes(skillRootPath), false);
	});
});

test("runEject preview reports a would-be-pruned skill root without touching the filesystem", async () => {
	await withTempConsumerRoot(async ({ consumerRepoRoot, consumerContentRoot }) => {
		await writeConsumerManifest(consumerContentRoot, {});
		await writeMarkedSkillDir(consumerRepoRoot, ".claude/skills", "prism-sample");

		const skillRootPath = path.join(consumerRepoRoot, ".claude", "skills");

		const previewReport = await runEject({
			consumerRepoRoot,
			consumerContentRoot,
			pathDefinitions: PATH_DEFINITIONS,
			confirmed: false,
			dryRun: false,
		});

		assert.equal(previewReport.emptyDirsRemoved.includes(skillRootPath), true);
		assert.equal(await fileExists(skillRootPath), true, "preview must not remove the root");
	});
});

test("runEject counts a duplicated projected skill root once even if two path-definition keys resolve to it", async () => {
	await withTempConsumerRoot(async ({ consumerRepoRoot, consumerContentRoot }) => {
		await writeConsumerManifest(consumerContentRoot, {});
		await writeMarkedSkillDir(consumerRepoRoot, ".claude/skills", "prism-sample");

		const skillRootPath = path.join(consumerRepoRoot, ".claude", "skills");

		// Misconfigured `paths.json` mapping two of the five projected roots to
		// the same directory — not reachable with shipped defaults, but the
		// dedup must hold if a consumer ever does this (issue #397 review follow-up).
		const duplicateRootPathDefinitions: PathDefinitions = {
			...PATH_DEFINITIONS,
			generated: {
				...PATH_DEFINITIONS.generated,
				codexSkillsRoot: PATH_DEFINITIONS.generated.claudeSkillsRoot,
			},
		};

		const report = await runEject({
			consumerRepoRoot,
			consumerContentRoot,
			pathDefinitions: duplicateRootPathDefinitions,
			confirmed: true,
			dryRun: false,
		});

		assert.equal(
			report.emptyDirsRemoved.filter((removedPath) => removedPath === skillRootPath).length,
			1,
			"a duplicated root must only be counted once in emptyDirsRemoved"
		);
	});
});

// --- report formatting ---

test("formatEjectReport prints preview-mode header and the re-run hint when not confirmed", async () => {
	await withTempConsumerRoot(async ({ consumerRepoRoot, consumerContentRoot }) => {
		await writeFile(consumerContentRoot, "rules/a.md", "# A\n");
		await writeConsumerManifest(consumerContentRoot, { "rules/a.md": "# A\n" });

		const report = await runEject({
			consumerRepoRoot,
			consumerContentRoot,
			pathDefinitions: PATH_DEFINITIONS,
			confirmed: false,
			dryRun: false,
		});

		const text = formatEjectReport(report);
		assert.ok(text.includes("preview — no --yes"));
		assert.ok(text.includes("Re-run with --yes to perform the eject."));
	});
});

test("formatEjectReport prints the completion line and lists .bak paths on a real run", async () => {
	await withTempConsumerRoot(async ({ consumerRepoRoot, consumerContentRoot }) => {
		await writeFile(consumerContentRoot, "rules/diverged.md", "# hand-edited\n");
		await writeConsumerManifest(consumerContentRoot, {
			"rules/diverged.md": "# original\n",
		});

		const report = await runEject({
			consumerRepoRoot,
			consumerContentRoot,
			pathDefinitions: PATH_DEFINITIONS,
			confirmed: true,
			dryRun: false,
		});

		const text = formatEjectReport(report);
		assert.ok(text.includes("prism eject complete"));
		assert.ok(text.includes("diverged.md.bak"));
	});
});

// --- non-git dir guard ---

test("runEject refuses to run outside a git repository", async () => {
	await withTempConsumerRoot(
		async ({ consumerRepoRoot, consumerContentRoot }) => {
			await writeConsumerManifest(consumerContentRoot, {});

			await assert.rejects(
				() =>
					runEject({
						consumerRepoRoot,
						consumerContentRoot,
						pathDefinitions: PATH_DEFINITIONS,
						confirmed: true,
						dryRun: false,
					}),
				/not inside a git repository/
			);
		},
		{ gitInit: false }
	);
});
