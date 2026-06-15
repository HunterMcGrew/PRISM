#!/usr/bin/env tsx
/**
 * Consumer-side `pnpm prism:update`.
 *
 * Pulls PRISM's latest canonical content into an already-onboarded consumer
 * repo. PRISM-owned files (decided by `classifyPath`) are overwritten when the
 * consumer never diverged from the last-known PRISM base, and preserved as
 * `<file>.bak` when they did — consumer edits are never silently lost.
 * Consumer-owned and unknown paths are left untouched. After the file pass the
 * consumer's `.sync-manifest.json` is rewritten to the new base hashes and the
 * platform dirs (`.claude`/`.codex`/`.cursor`) are refreshed.
 *
 * Source resolution order: `--prism-source <path>` CLI arg → `prismSource` in
 * the consumer's `.ai-skills/config.json` → error with guidance. The flow
 * refuses to run when the source resolves to the consumer itself — that is
 * `prism:build`, not `prism:update`.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { syncAllPlatformContentCopies } from "./build";
import { deriveTokenMap, loadConfig } from "./lib/tokens";
import { classifyPath } from "./ownership";
import {
	codexRuleDialect,
	cursorRuleDialect,
	type RuleDialect,
	verbatimRuleDialect,
} from "./rule-dialect";
import {
	generateSyncManifest,
	listPrismOwnedRelativePaths,
	loadSyncManifest,
	SYNC_MANIFEST_FILENAME,
	type SyncManifest,
} from "./sync-manifest";
import { hashFile, pathExists } from "./utils";

/** What happened to a single file during the update pass. */
export type FileAction =
	| "written"
	| "no-op"
	| "overwritten"
	| "backed-up"
	| "removed"
	| "removed-with-backup";

export interface FileOutcome {
	relativePath: string;
	action: FileAction;
	backupPath?: string;
}

export interface UpdateSummary {
	outcomes: FileOutcome[];
	backups: string[];
}

export interface RunUpdateOptions {
	prismContentRoot: string;
	consumerContentRoot: string;
}

/**
 * Hashes a file, returning `null` when it does not exist. Lets the per-file
 * branching treat "absent" and "present with hash X" uniformly.
 */
async function hashFileIfExists(filePath: string): Promise<string | null> {
	if (!(await pathExists(filePath))) {
		return null;
	}

	return hashFile(filePath);
}

/**
 * Copies a consumer file to `<file>.bak` before it is overwritten or removed,
 * preserving a diverged edit. Returns the `.bak` path for the run summary.
 */
async function backupConsumerFile(absolutePath: string): Promise<string> {
	const backupPath = `${absolutePath}.bak`;
	await fs.copyFile(absolutePath, backupPath);

	return backupPath;
}

async function writeIncoming(
	incomingAbsolute: string,
	consumerAbsolute: string
): Promise<void> {
	await fs.mkdir(path.dirname(consumerAbsolute), { recursive: true });
	await fs.copyFile(incomingAbsolute, consumerAbsolute);
}

/**
 * Applies the per-file decision for one PRISM-owned path that exists in the
 * PRISM source.
 *
 * Branch order matters: the `no-op` equality check runs before the divergence
 * `.bak` branch. That ordering is the no-manifest decision point Winston
 * flagged — when the consumer has no manifest (a pre-manifest install),
 * `recordedHash` is `null`, so without the leading equality check every file
 * would look "diverged" and get a needless `.bak`. Comparing the consumer bytes
 * against the incoming bytes first means an already-current file is a no-op
 * regardless of whether a manifest exists. This is a documented decision point,
 * not a license to skip `.bak` — a genuinely diverged file (consumer bytes that
 * differ from incoming) is still backed up.
 */
async function applyIncomingFile(
	relativePath: string,
	prismContentRoot: string,
	consumerContentRoot: string,
	recordedHash: string | null
): Promise<FileOutcome> {
	const incomingAbsolute = path.join(prismContentRoot, relativePath);
	const consumerAbsolute = path.join(consumerContentRoot, relativePath);

	const incomingHash = await hashFile(incomingAbsolute);
	const consumerHash = await hashFileIfExists(consumerAbsolute);

	if (consumerHash === null) {
		await writeIncoming(incomingAbsolute, consumerAbsolute);

		return { relativePath, action: "written" };
	}

	if (consumerHash === incomingHash) {
		return { relativePath, action: "no-op" };
	}

	if (recordedHash !== null && consumerHash === recordedHash) {
		await writeIncoming(incomingAbsolute, consumerAbsolute);

		return { relativePath, action: "overwritten" };
	}

	const backupPath = await backupConsumerFile(consumerAbsolute);
	await writeIncoming(incomingAbsolute, consumerAbsolute);

	return { relativePath, action: "backed-up", backupPath };
}

/**
 * Removes a consumer file that PRISM no longer ships, backing it up first when
 * the consumer diverged from the recorded base. A consumer copy that still
 * matches its recorded hash is a clean delete with no `.bak`.
 */
async function applyDeletedFile(
	relativePath: string,
	consumerContentRoot: string,
	recordedHash: string
): Promise<FileOutcome> {
	const consumerAbsolute = path.join(consumerContentRoot, relativePath);
	const consumerHash = await hashFileIfExists(consumerAbsolute);

	if (consumerHash === null) {
		return { relativePath, action: "no-op" };
	}

	if (consumerHash === recordedHash) {
		await fs.rm(consumerAbsolute);

		return { relativePath, action: "removed" };
	}

	const backupPath = await backupConsumerFile(consumerAbsolute);
	await fs.rm(consumerAbsolute);

	return { relativePath, action: "removed-with-backup", backupPath };
}

/**
 * Runs the per-file update pass, then rewrites the consumer manifest to the new
 * PRISM base hashes (carrying `prismVersion`/`sourceCommit` from the PRISM
 * source manifest when present). Pure with respect to platform dirs — the
 * caller refreshes those separately.
 */
export async function runUpdate(
	options: RunUpdateOptions
): Promise<UpdateSummary> {
	const { prismContentRoot, consumerContentRoot } = options;

	const incomingRelativePaths =
		await listPrismOwnedRelativePaths(prismContentRoot);
	const incomingSet = new Set(incomingRelativePaths);

	const consumerManifest = await loadSyncManifest(consumerContentRoot);
	const recordedHashes = new Map<string, string>();
	if (consumerManifest) {
		for (const [relativePath, entry] of Object.entries(
			consumerManifest.files
		)) {
			recordedHashes.set(relativePath, entry.contentHash);
		}
	}

	const outcomes: FileOutcome[] = [];

	for (const relativePath of incomingRelativePaths) {
		if (classifyPath(relativePath) !== "prism") {
			continue;
		}

		outcomes.push(
			await applyIncomingFile(
				relativePath,
				prismContentRoot,
				consumerContentRoot,
				recordedHashes.get(relativePath) ?? null
			)
		);
	}

	for (const [relativePath, recordedHash] of recordedHashes) {
		if (incomingSet.has(relativePath)) {
			continue;
		}

		if (classifyPath(relativePath) !== "prism") {
			continue;
		}

		outcomes.push(
			await applyDeletedFile(relativePath, consumerContentRoot, recordedHash)
		);
	}

	await rewriteConsumerManifest(
		prismContentRoot,
		consumerContentRoot,
		consumerManifest
	);

	const backups = outcomes
		.filter((outcome) => outcome.backupPath !== undefined)
		.map((outcome) => outcome.backupPath as string);

	return { outcomes, backups };
}

/**
 * Rewrites `.prism/.sync-manifest.json` in the consumer repo to the PRISM
 * source's current base hashes. Version/commit metadata is carried from the
 * PRISM source manifest when it ships one, falling back to a freshly generated
 * manifest's values otherwise.
 */
async function rewriteConsumerManifest(
	prismContentRoot: string,
	consumerContentRoot: string,
	previousConsumerManifest: SyncManifest | null
): Promise<void> {
	const sourceManifest = await loadSyncManifest(prismContentRoot);

	const generated = await generateSyncManifest(prismContentRoot, {
		prismVersion:
			sourceManifest?.prismVersion ??
			previousConsumerManifest?.prismVersion ??
			"0.0.0",
		sourceCommit: sourceManifest?.sourceCommit ?? "unknown",
		generatedAt: new Date().toISOString(),
	});

	const manifestPath = path.join(consumerContentRoot, SYNC_MANIFEST_FILENAME);
	const serialized = `${JSON.stringify(generated, null, "\t")}\n`;
	await fs.writeFile(manifestPath, serialized, "utf8");
}

/**
 * Refreshes the consumer's platform dirs after `.prism/` is updated, using a
 * token map derived from the consumer's own `config.json`.
 */
async function refreshPlatformDirs(
	consumerRepoRoot: string,
	consumerContentRoot: string
): Promise<void> {
	const tokenMap = deriveTokenMap(loadConfig(consumerRepoRoot));
	const platformDirs: { dir: string; dialect: RuleDialect }[] = [
		{ dir: path.join(consumerRepoRoot, ".claude"), dialect: verbatimRuleDialect },
		{ dir: path.join(consumerRepoRoot, ".codex"), dialect: codexRuleDialect },
		{ dir: path.join(consumerRepoRoot, ".cursor"), dialect: cursorRuleDialect },
	];

	await syncAllPlatformContentCopies(
		consumerContentRoot,
		platformDirs,
		false,
		[],
		tokenMap
	);
}

/**
 * Resolves the PRISM source path from the `--prism-source` CLI arg, falling
 * back to the `prismSource` field in the consumer's config. Returns `null` when
 * neither is set so the caller can emit the guidance message.
 */
function resolvePrismSource(
	argv: string[],
	consumerRepoRoot: string
): string | null {
	const flagIndex = argv.indexOf("--prism-source");
	if (flagIndex !== -1 && argv[flagIndex + 1]) {
		return path.resolve(argv[flagIndex + 1]);
	}

	const inlineFlag = argv.find((arg) => arg.startsWith("--prism-source="));
	if (inlineFlag) {
		return path.resolve(inlineFlag.slice("--prism-source=".length));
	}

	const configured = loadConfig(consumerRepoRoot).prismSource;
	if (typeof configured === "string" && configured.length > 0) {
		return path.resolve(consumerRepoRoot, configured);
	}

	return null;
}

async function main(): Promise<void> {
	const consumerRepoRoot = process.cwd();
	const prismRepoRoot = resolvePrismSource(process.argv.slice(2), consumerRepoRoot);

	if (prismRepoRoot === null) {
		throw new Error(
			"prism:update needs a PRISM source. Pass --prism-source <path-to-prism-repo>, " +
				'or add a "prismSource" field to .ai-skills/config.json pointing at your ' +
				"local PRISM checkout."
		);
	}

	if (path.resolve(prismRepoRoot) === path.resolve(consumerRepoRoot)) {
		throw new Error(
			"prism:update refuses to run when the source is the consumer itself. " +
				"That is prism:build — run `pnpm prism:build` instead."
		);
	}

	const prismContentRoot = path.join(prismRepoRoot, ".prism");
	const consumerContentRoot = path.join(consumerRepoRoot, ".prism");

	if (!(await pathExists(prismContentRoot))) {
		throw new Error(
			`PRISM source has no .prism/ directory at ${prismContentRoot}.`
		);
	}

	const summary = await runUpdate({ prismContentRoot, consumerContentRoot });
	await refreshPlatformDirs(consumerRepoRoot, consumerContentRoot);

	reportSummary(summary);
}

function reportSummary(summary: UpdateSummary): void {
	const counts = summary.outcomes.reduce<Record<string, number>>(
		(acc, outcome) => {
			acc[outcome.action] = (acc[outcome.action] ?? 0) + 1;

			return acc;
		},
		{}
	);

	const parts = Object.entries(counts)
		.map(([action, count]) => `${count} ${action}`)
		.join(", ");
	console.log(`prism:update complete — ${parts || "no changes"}.`);

	if (summary.backups.length > 0) {
		console.log(
			`Preserved ${summary.backups.length} diverged file(s) as .bak:`
		);
		for (const backup of summary.backups) {
			console.log(`  ${backup}`);
		}
	}
}

const isMain =
	process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
	main().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	});
}
