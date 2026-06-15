/**
 * Builds and reads `.prism/.sync-manifest.json` — the record of which
 * PRISM-owned files shipped in a given version and the content hash of each.
 *
 * The consumer-side `pnpm prism:update` flow (Phase 3) reads this manifest to
 * decide, per file, whether the consumer's copy is a clean PRISM base (safe to
 * overwrite) or a diverged edit (preserve as `.bak`). The manifest is
 * dot-prefixed so the existing recursive walkers — `listRelativeFilePaths`
 * (utils.ts) and `listRelativeDirectoryEntries` (build.ts), both of which skip
 * dot-entries — never copy it into platform dirs or treat it as content.
 */
import fs from "node:fs/promises";
import path from "node:path";

import { listRelativeDirectoryEntries } from "./build";
import { classifyPath } from "./ownership";
import { hashFile, readFileIfExists } from "./utils";

export const SYNC_MANIFEST_FILENAME = ".sync-manifest.json";

export interface SyncManifestFileEntry {
	contentHash: string;
}

export interface SyncManifest {
	prismVersion: string;
	sourceCommit: string;
	generatedAt: string;
	files: Record<string, SyncManifestFileEntry>;
}

export interface GenerateSyncManifestOptions {
	prismVersion: string;
	sourceCommit: string;
	generatedAt: string;
}

/**
 * Returns the `.prism/`-relative paths of every PRISM-owned file under the
 * content root, sorted. Paths are normalized to forward slashes so manifest
 * keys are stable across platforms and match the POSIX-style globs. Ownership
 * is decided by `classifyPath`, so the manifest contains exactly the files the
 * update flow may overwrite — consumer-owned and unknown paths are excluded.
 */
export async function listPrismOwnedRelativePaths(
	prismContentRoot: string
): Promise<string[]> {
	const entries = await listRelativeDirectoryEntries(prismContentRoot);

	return entries
		.filter((entry) => entry.kind === "file")
		.map((entry) => entry.relativePath.split(path.sep).join("/"))
		.filter((relativePath) => classifyPath(relativePath) === "prism")
		.sort((a, b) => a.localeCompare(b));
}

/**
 * Walks the PRISM-owned globs under `prismContentRoot`, hashes each file's
 * canonical pre-substitution bytes, and returns the manifest object.
 *
 * Hashes raw bytes per ADR-0030: the canonical source ships token literals;
 * substitution is an install-time concern, so the manifest records the shipped
 * source form, not any consumer's substituted form. The per-file object is
 * retained (rather than a bare hash string) for forward-compat fields such as
 * `renamedFrom`.
 */
export async function generateSyncManifest(
	prismContentRoot: string,
	options: GenerateSyncManifestOptions
): Promise<SyncManifest> {
	const relativePaths = await listPrismOwnedRelativePaths(prismContentRoot);
	const files: Record<string, SyncManifestFileEntry> = {};

	for (const relativePath of relativePaths) {
		const absolutePath = path.join(prismContentRoot, relativePath);
		files[relativePath] = { contentHash: await hashFile(absolutePath) };
	}

	return {
		prismVersion: options.prismVersion,
		sourceCommit: options.sourceCommit,
		generatedAt: options.generatedAt,
		files,
	};
}

/**
 * Reads `.prism/.sync-manifest.json` from the given content root. Returns
 * `null` when the file is absent so the update flow can fall back gracefully on
 * an older install that predates the manifest.
 */
export async function loadSyncManifest(
	consumerContentRoot: string
): Promise<SyncManifest | null> {
	const manifestPath = path.join(consumerContentRoot, SYNC_MANIFEST_FILENAME);
	const raw = await readFileIfExists(manifestPath);
	if (raw === null) {
		return null;
	}

	return JSON.parse(raw) as SyncManifest;
}

/**
 * Serializes a manifest and writes it to `.prism/.sync-manifest.json` under the
 * content root, honoring the build's check-mode / changedPaths contract.
 */
export async function writeSyncManifest(
	prismContentRoot: string,
	manifest: SyncManifest,
	checkMode: boolean,
	changedPaths: string[]
): Promise<void> {
	const manifestPath = path.join(prismContentRoot, SYNC_MANIFEST_FILENAME);
	const serialized = `${JSON.stringify(manifest, null, "\t")}\n`;
	const previous = await readFileIfExists(manifestPath);
	if (previous === serialized) {
		return;
	}

	changedPaths.push(manifestPath);
	if (checkMode) {
		return;
	}

	await fs.writeFile(manifestPath, serialized, "utf8");
}
