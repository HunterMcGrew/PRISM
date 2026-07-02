#!/usr/bin/env -S npx tsx
/**
 * `prism eject` — cleanly removes a PRISM install from a consumer repo.
 *
 * Deletes every PRISM-owned `.prism/` file (per `classifyPath`), every
 * projected `prism-*` skill/agent whose `.ai-skill-generated` marker (or, for
 * flat agent adapters and the generated Codex config file, generated header
 * line) confirms PRISM authored it, and finally the sync manifest itself —
 * while preserving consumer-owned content, unknown paths, and every diverged
 * file's `.bak` snapshot. Existing for an evaluation-minded team that wants a
 * clean way to back out without PRISM reading as lock-in.
 *
 * The command is a thin composition of primitives `prism:update` and
 * `prism:build` already ship and test: `applyDeletedFile`/`backupConsumerFile`
 * (delete-with-`.bak`, from `update.ts`), the `.ai-skill-generated` marker gate
 * (`removeDeletedManagedSkills`, from `utils.ts`), the generated-header gate for
 * flat agent adapters and the Codex config file
 * (`removeDeletedManagedAgentFiles`, from `generate-skills.ts`), and the
 * `--dry-run` compute-then-guard split L376 established for `prism:update`.
 * Deletion and backup logic is never reimplemented here.
 *
 * Two exported entry points, matching `doctor.ts`'s shape:
 * - `runEject` — the testable core. Takes resolved roots and confirmation
 *   flags, returns an `EjectReport`. No process.exit, no console output.
 * - `runEjectCli` — the CLI wrapper. Resolves roots from argv, parses
 *   `--yes` / `--dry-run`, calls `runEject`, prints the report, sets exit code.
 *
 * `--yes` is required to actually delete anything — without it, `prism eject`
 * is dry-run-by-default. `--dry-run` is an explicit preview synonym and wins
 * even when `--yes` is also passed. A single `previewOnly` boolean gates every
 * `fs` mutation in this file, mirroring `applyFilePass`'s `dryRun` param.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	AGENTS_MD_BLOCK_BEGIN,
	AGENTS_MD_BLOCK_END,
	AGENTS_MD_SEEDED_MARKER,
} from "./agents-md-block";
import {
	GENERATED_MARKDOWN_HEADER_LINE,
	removeDeletedManagedAgentFiles,
} from "./generate-skills";
import {
	assertInsideGitRepo,
	parseConfirmFlag,
	parseConsumerFlag,
	parseDryRunFlag,
	resolveConsumerRoot,
} from "./lib/consumer-root";
import { classifyPath } from "./ownership";
import {
	loadSyncManifest,
	SYNC_MANIFEST_FILENAME,
	type SyncManifest,
} from "./sync-manifest";
import {
	applyDeletedFile,
	resolveConsumerSkillTargetRoots,
	resolveSelfPrismSource,
} from "./update";
import {
	GENERATED_HEADER_LINE,
	loadPathDefinitions,
	MANAGED_MARKER,
	type PathDefinitions,
	pathExists,
	readFileIfExists,
	removeDeletedManagedSkills,
} from "./utils";

/** Prefix that marks a skill/agent-adapter name as a PRISM-projected candidate for removal. */
const PRISM_SKILL_PREFIX = "prism-";

/** The subset of `FileAction` that `applyDeletedFile`'s delete-path branches can produce. */
const DELETE_PATH_ACTIONS = new Set(["no-op", "removed", "removed-with-backup"]);

/**
 * Narrows `applyDeletedFile`'s return action to the delete-path subset eject
 * cares about. `applyDeletedFile` is typed against the broader `FileAction`
 * union shared with the update-path branches (`written`, `overwritten`,
 * `backed-up`), but its own delete-only code path never produces those —
 * this guard makes that invariant explicit instead of widening
 * `EjectFileOutcome`'s action union to match.
 */
function isDeletePathAction(
	action: string
): action is "no-op" | "removed" | "removed-with-backup" {
	return DELETE_PATH_ACTIONS.has(action);
}

export interface EjectFileOutcome {
	relativePath: string;
	action: "removed" | "removed-with-backup" | "preserved" | "no-op";
	backupPath?: string;
	ownership: "prism" | "consumer" | "unknown";
}

export interface EjectSkillOutcome {
	path: string;
	action: "removed" | "skipped-no-marker" | "skipped-not-prism";
}

export interface EjectReport {
	fileOutcomes: EjectFileOutcome[];
	skillOutcomes: EjectSkillOutcome[];
	manifestRemoved: boolean;
	emptyDirsRemoved: string[];
	preservedNotices: string[];
	confirmed: boolean;
	dryRun: boolean;
}

export interface RunEjectOptions {
	consumerRepoRoot: string;
	consumerContentRoot: string;
	pathDefinitions: PathDefinitions;
	confirmed: boolean;
	dryRun: boolean;
}

/**
 * Runs the PRISM-owned file-removal pass over every path recorded in the
 * manifest. Consumer-owned and unknown paths are never touched — they are
 * recorded as `preserved` so the completeness report accounts for every
 * recorded path, but no `fs` call ever targets them.
 *
 * Reuses `applyDeletedFile`'s exact semantics: a clean consumer copy (bytes
 * match the recorded hash) is a plain `removed`; a diverged copy is backed up
 * to `.bak` first (never clobbering an existing `.bak` sibling) and then
 * removed as `removed-with-backup`; an already-absent file is a `no-op`.
 */
async function runFileRemovalPass(
	manifest: SyncManifest,
	consumerContentRoot: string,
	previewOnly: boolean
): Promise<{ fileOutcomes: EjectFileOutcome[]; preservedNotices: string[] }> {
	const fileOutcomes: EjectFileOutcome[] = [];
	const preservedNotices: string[] = [];
	let consumerContentNoticeAdded = false;

	for (const [relativePath, entry] of Object.entries(manifest.files)) {
		const ownership = classifyPath(relativePath);

		if (ownership !== "prism") {
			fileOutcomes.push({ relativePath, action: "preserved", ownership });

			if (ownership === "consumer" && !consumerContentNoticeAdded) {
				consumerContentNoticeAdded = true;
				preservedNotices.push(
					"Preserved consumer-owned content: plans/, lessons.md, custom/, flat architect docs, flat spec/adrs docs."
				);
			}

			continue;
		}

		const outcome = await applyDeletedFile(
			relativePath,
			consumerContentRoot,
			entry.contentHash,
			previewOnly
		);

		if (!isDeletePathAction(outcome.action)) {
			throw new Error(
				`eject: applyDeletedFile returned unexpected action "${outcome.action}" for ${relativePath} — expected a delete-path outcome.`
			);
		}

		fileOutcomes.push({ relativePath, action: outcome.action, backupPath: outcome.backupPath, ownership });
	}

	return { fileOutcomes, preservedNotices };
}

/**
 * Runs the projected-skill/agent removal pass across every platform skill and
 * agent root, plus the generated Codex config file. Two gates must both pass
 * before a candidate is removed:
 *
 * 1. **Prefix** — only `prism-`-prefixed names are candidates at all. A
 *    consumer's own `custom-*` or org-token skill is never even considered.
 * 2. **Marker** — the candidate must carry PRISM's authored-by-us signal: the
 *    `.ai-skill-generated` marker file for skill directories
 *    (`removeDeletedManagedSkills`), or the generated header line for flat
 *    agent adapter files and the Codex config file
 *    (`removeDeletedManagedAgentFiles`, `collectCodexConfigOutcome`). A
 *    `prism-`-prefixed dir or file without that signal is a consumer's
 *    hand-authored work and is never deleted.
 *
 * Reuses `removeDeletedManagedSkills`/`removeDeletedManagedAgentFiles` with an
 * empty valid-set so every marker-confirmed `prism-*` entry is treated as an
 * orphan — that is exactly eject's intent. The prefix filter is applied first
 * by pre-scanning each root and only including `prism-*` entries in the
 * tracked outcome list; the reused functions still walk the whole directory,
 * but they only ever delete a marker-confirmed entry, so a non-`prism-*`
 * marked skill (if one ever existed) stays untouched by construction. The
 * Codex config file is a single file (not `prism-*`-prefixed — it has no
 * per-consumer name to gate on) so it is checked directly against
 * `GENERATED_HEADER_LINE` rather than through the prefix+marker pre-scan.
 */
async function runSkillRemovalPass(
	consumerRepoRoot: string,
	pathDefinitions: PathDefinitions,
	previewOnly: boolean
): Promise<EjectSkillOutcome[]> {
	const { targetRoots, codexConfigPath } = resolveConsumerSkillTargetRoots(
		consumerRepoRoot,
		pathDefinitions
	);

	const outcomes: EjectSkillOutcome[] = [];

	await collectSkillDirOutcomes(targetRoots.claude, previewOnly, outcomes);
	await collectSkillDirOutcomes(targetRoots.codex, previewOnly, outcomes);
	await collectSkillDirOutcomes(targetRoots.cursor, previewOnly, outcomes);
	await collectAgentFileOutcomes(
		targetRoots.codexAgents,
		".toml",
		GENERATED_HEADER_LINE,
		previewOnly,
		outcomes
	);
	await collectAgentFileOutcomes(
		targetRoots.claudeAgents,
		".md",
		GENERATED_MARKDOWN_HEADER_LINE,
		previewOnly,
		outcomes
	);
	await collectCodexConfigOutcome(codexConfigPath, previewOnly, outcomes);

	return outcomes;
}

/**
 * Removes the generated `.codex/codex-config.toml` if present, mirroring the
 * generated-header-line safety check `collectAgentFileOutcomes` applies to
 * flat agent adapters — the file has no directory to hold a
 * `.ai-skill-generated` marker, so its first line
 * (`GENERATED_HEADER_LINE`) is the only PRISM-authored signal. A
 * `codex-config.toml` that exists but doesn't carry the header is a
 * consumer's own file and is left untouched.
 */
async function collectCodexConfigOutcome(
	codexConfigPath: string,
	previewOnly: boolean,
	outcomes: EjectSkillOutcome[]
): Promise<void> {
	const content = await readFileIfExists(codexConfigPath);
	if (content === null) {
		return;
	}

	if (!content.includes(GENERATED_HEADER_LINE)) {
		outcomes.push({ path: codexConfigPath, action: "skipped-no-marker" });
		return;
	}

	outcomes.push({ path: codexConfigPath, action: "removed" });
	if (!previewOnly) {
		await fs.rm(codexConfigPath);
	}
}

/**
 * Scans one skill-directory root (Claude/Codex/Cursor `prism-*` skill dirs),
 * records a `skipped-not-prism` / `skipped-no-marker` / `removed` outcome for
 * every entry, then delegates the actual deletion to
 * `removeDeletedManagedSkills`. Every non-`prism-*` entry name is passed back
 * in as a "valid" (keep) skill ID — `removeDeletedManagedSkills` only orphans
 * entries absent from that set, so this is the prefix filter applied ahead of
 * the marker gate: a marked skill that isn't `prism-*` is protected by construction, not by
 * convention.
 */
async function collectSkillDirOutcomes(
	outputRoot: string,
	previewOnly: boolean,
	outcomes: EjectSkillOutcome[]
): Promise<void> {
	if (!(await pathExists(outputRoot))) {
		return;
	}

	const entries = await fs.readdir(outputRoot, { withFileTypes: true });
	const keepIds = new Set<string>();

	for (const entry of entries) {
		if (!entry.isDirectory() || entry.name.startsWith(".")) {
			continue;
		}

		const entryPath = path.join(outputRoot, entry.name);

		if (!entry.name.startsWith(PRISM_SKILL_PREFIX)) {
			keepIds.add(entry.name);
			outcomes.push({ path: entryPath, action: "skipped-not-prism" });
			continue;
		}

		const markerPath = path.join(entryPath, MANAGED_MARKER);
		if (!(await pathExists(markerPath))) {
			keepIds.add(entry.name);
			outcomes.push({ path: entryPath, action: "skipped-no-marker" });
			continue;
		}

		outcomes.push({ path: entryPath, action: "removed" });
	}

	const changedPaths: string[] = [];
	await removeDeletedManagedSkills(outputRoot, keepIds, previewOnly, changedPaths);
}

/**
 * Scans one flat agent-adapter root (Codex `.toml` / Claude `.md`), records an
 * outcome per `prism-*`-prefixed file, then delegates deletion to
 * `removeDeletedManagedAgentFiles`. Every non-`prism-*` file's skill ID is
 * passed back in as "valid" (keep) — same prefix-filter-ahead-of-the-marker-gate
 * shape as `collectSkillDirOutcomes`, so a non-`prism-*` file is protected by
 * construction even if it somehow carried the generated header line. A
 * `prism-*.toml` / `prism-*.md` is removed only when it also carries the
 * header — the sibling-marker convention `removeDeletedManagedAgentFiles`
 * already enforces for flat files that have no directory to hold a marker.
 */
async function collectAgentFileOutcomes(
	outputRoot: string,
	extension: string,
	headerLine: string,
	previewOnly: boolean,
	outcomes: EjectSkillOutcome[]
): Promise<void> {
	if (!(await pathExists(outputRoot))) {
		return;
	}

	const entries = await fs.readdir(outputRoot, { withFileTypes: true });
	const keepIds = new Set<string>();

	for (const entry of entries) {
		if (!entry.isFile() || !entry.name.endsWith(extension) || entry.name.startsWith(".")) {
			continue;
		}

		const skillId = entry.name.slice(0, -extension.length);

		if (!entry.name.startsWith(PRISM_SKILL_PREFIX)) {
			keepIds.add(skillId);
			continue;
		}

		const entryPath = path.join(outputRoot, entry.name);
		const content = (await readFileIfExists(entryPath)) ?? "";

		if (!content.includes(headerLine)) {
			keepIds.add(skillId);
			outcomes.push({ path: entryPath, action: "skipped-no-marker" });
			continue;
		}

		outcomes.push({ path: entryPath, action: "removed" });
	}

	const changedPaths: string[] = [];
	await removeDeletedManagedAgentFiles(outputRoot, keepIds, extension, headerLine, previewOnly, changedPaths);
}

/**
 * Prunes now-empty directories under `.prism/` bottom-up, after the file and
 * skill passes have run. A directory that still holds preserved consumer
 * content (e.g. `plans/`, `custom/`) is never removed — only directories with
 * zero files and zero non-empty subdirectories qualify.
 */
async function pruneEmptyDirs(consumerContentRoot: string, previewOnly: boolean): Promise<string[]> {
	if (!(await pathExists(consumerContentRoot))) {
		return [];
	}

	const removed: string[] = [];

	async function isEmpty(dir: string): Promise<boolean> {
		const entries = await fs.readdir(dir, { withFileTypes: true });
		return entries.length === 0;
	}

	async function walk(dir: string): Promise<void> {
		const entries = await fs.readdir(dir, { withFileTypes: true });

		for (const entry of entries) {
			if (!entry.isDirectory()) {
				continue;
			}

			const childPath = path.join(dir, entry.name);
			await walk(childPath);

			if (await isEmpty(childPath)) {
				removed.push(childPath);
				if (!previewOnly) {
					await fs.rmdir(childPath);
				}
			}
		}
	}

	await walk(consumerContentRoot);

	return removed;
}

/**
 * Removes a PRISM-seeded root `AGENTS.md` — one carrying
 * `AGENTS_MD_SEEDED_MARKER`, written by `prism adopt --seed-agents-md`. A root
 * `AGENTS.md` without the marker is consumer-authored (or had the marker line
 * deleted on purpose) and is never removed. Returns the notice describing what
 * happened, or null when there is no seeded file to act on.
 */
async function removeSeededAgentsMd(
	consumerRepoRoot: string,
	previewOnly: boolean
): Promise<{ removed: boolean; notice: string } | null> {
	const agentsMdPath = path.join(consumerRepoRoot, "AGENTS.md");
	const content = await readFileIfExists(agentsMdPath);

	if (content === null || !content.includes(AGENTS_MD_SEEDED_MARKER)) {
		return null;
	}

	if (!previewOnly) {
		await fs.rm(agentsMdPath);
	}

	return {
		removed: true,
		notice: previewOnly
			? "Would remove PRISM-seeded AGENTS.md (carries the prism:seeded-agents-md marker)."
			: "Removed PRISM-seeded AGENTS.md (carried the prism:seeded-agents-md marker).",
	};
}

/**
 * Reports PRISM's contribution to AGENTS.md (the injected Tier-1 block, if
 * present) and notes a present CLAUDE.md, without modifying either file.
 */
async function collectRootFileNotices(consumerRepoRoot: string): Promise<string[]> {
	const notices: string[] = [];

	const agentsMdPath = path.join(consumerRepoRoot, "AGENTS.md");
	const agentsMd = await readFileIfExists(agentsMdPath);
	if (agentsMd !== null && agentsMd.includes(AGENTS_MD_BLOCK_BEGIN)) {
		notices.push(
			`AGENTS.md contains a PRISM-generated block — delete everything between "${AGENTS_MD_BLOCK_BEGIN}" and "${AGENTS_MD_BLOCK_END}" to remove it by hand.`
		);
	}

	const claudeMdPath = path.join(consumerRepoRoot, "CLAUDE.md");
	if (await pathExists(claudeMdPath)) {
		notices.push(
			"CLAUDE.md is present but was not created by PRISM — review manually before deleting."
		);
	}

	return notices;
}

/**
 * Runs the full eject pass: guards, then the file-removal, skill-removal,
 * empty-dir-prune, and manifest-removal steps in that order. `previewOnly =
 * !confirmed || dryRun` gates every `fs` mutation across every step — a
 * preview run computes the identical report a real run would produce but
 * writes nothing.
 */
export async function runEject(options: RunEjectOptions): Promise<EjectReport> {
	const { consumerRepoRoot, consumerContentRoot, pathDefinitions, confirmed, dryRun } = options;

	assertInsideGitRepo(consumerRepoRoot);

	const manifest = await loadSyncManifest(consumerContentRoot);
	if (manifest === null) {
		return {
			fileOutcomes: [],
			skillOutcomes: [],
			manifestRemoved: false,
			emptyDirsRemoved: [],
			preservedNotices: [`No ${SYNC_MANIFEST_FILENAME} found — nothing to eject.`],
			confirmed,
			dryRun,
		};
	}

	const previewOnly = !confirmed || dryRun;

	const { fileOutcomes, preservedNotices } = await runFileRemovalPass(
		manifest,
		consumerContentRoot,
		previewOnly
	);

	const skillOutcomes = await runSkillRemovalPass(consumerRepoRoot, pathDefinitions, previewOnly);

	const emptyDirsRemoved = await pruneEmptyDirs(consumerContentRoot, previewOnly);

	const manifestPath = path.join(consumerContentRoot, SYNC_MANIFEST_FILENAME);
	const manifestRemoved = await pathExists(manifestPath);
	if (manifestRemoved && !previewOnly) {
		await fs.rm(manifestPath);
	}

	const seededAgentsMdResult = await removeSeededAgentsMd(consumerRepoRoot, previewOnly);
	const rootFileNotices = await collectRootFileNotices(consumerRepoRoot);

	if (seededAgentsMdResult !== null) {
		rootFileNotices.unshift(seededAgentsMdResult.notice);
	}

	return {
		fileOutcomes,
		skillOutcomes,
		manifestRemoved,
		emptyDirsRemoved,
		preservedNotices: [...preservedNotices, ...rootFileNotices],
		confirmed,
		dryRun,
	};
}

/** Renders an `EjectReport` as human-readable lines, in the order `runEjectCli` prints them. */
export function formatEjectReport(report: EjectReport): string {
	const lines: string[] = [];

	const previewOnly = !report.confirmed || report.dryRun;
	const headerMode = report.dryRun ? "dry run" : !report.confirmed ? "preview — no --yes" : null;
	lines.push(headerMode !== null ? `prism eject (${headerMode})` : "prism eject");

	const removed = report.fileOutcomes.filter((o) => o.action === "removed");
	const removedWithBackup = report.fileOutcomes.filter((o) => o.action === "removed-with-backup");
	const preserved = report.fileOutcomes.filter((o) => o.action === "preserved");
	const skillsRemoved = report.skillOutcomes.filter((o) => o.action === "removed");
	const skillsSkipped = report.skillOutcomes.filter((o) => o.action !== "removed");

	lines.push(`${removed.length} PRISM-owned file(s) removed.`);
	lines.push(`${removedWithBackup.length} PRISM-owned file(s) removed-with-backup.`);
	if (removedWithBackup.length > 0) {
		for (const outcome of removedWithBackup) {
			lines.push(`  ${outcome.backupPath}`);
		}
	}
	lines.push(`${preserved.length} consumer-owned/unknown file(s) preserved.`);
	lines.push(`${skillsRemoved.length} skill(s)/agent(s) removed.`);
	lines.push(`${skillsSkipped.length} skill(s)/agent(s) skipped.`);
	for (const outcome of skillsSkipped) {
		lines.push(`  ${outcome.path} (${outcome.action})`);
	}
	lines.push(`${report.emptyDirsRemoved.length} empty director(y/ies) removed.`);
	lines.push(`Manifest removed: ${report.manifestRemoved ? "yes" : "no"}.`);

	if (report.preservedNotices.length > 0) {
		lines.push("");
		for (const notice of report.preservedNotices) {
			lines.push(notice);
		}
	}

	lines.push("");
	lines.push(
		previewOnly
			? "Re-run with --yes to perform the eject."
			: `prism eject complete — PRISM removed. Preserved ${preserved.length} consumer file(s) and ${removedWithBackup.length} .bak snapshot(s).`
	);

	return lines.join("\n");
}

export async function runEjectCli(): Promise<void> {
	const argv = process.argv.slice(2);
	const consumerRepoRoot = resolveConsumerRoot({
		explicitConsumer: parseConsumerFlag(argv),
		cwd: process.cwd(),
		selfPrismRoot: resolveSelfPrismSource(),
	});
	const consumerContentRoot = path.join(consumerRepoRoot, ".prism");

	const confirmed = parseConfirmFlag(argv);
	const dryRun = parseDryRunFlag(argv);

	const pathDefinitions = await loadPathDefinitions(consumerRepoRoot);

	const report = await runEject({
		consumerRepoRoot,
		consumerContentRoot,
		pathDefinitions,
		confirmed,
		dryRun,
	});

	console.log(formatEjectReport(report));
}

const isMain =
	process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
	runEjectCli().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	});
}
