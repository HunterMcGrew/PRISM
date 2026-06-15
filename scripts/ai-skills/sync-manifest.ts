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
import { hashFile, readFileIfExists } from "./utils";
import { compileMatcher } from "./verify-manifest-coverage";

export const SYNC_MANIFEST_FILENAME = ".sync-manifest.json";

/**
 * Globs (relative to `.prism/`) for the files PRISM owns and the update flow is
 * allowed to overwrite. Mirrors the Phase 5 `PRISM_OWNED_GLOBS` set; ownership
 * classification proper lives in `ownership.ts` (Phase 5), which the manifest
 * generator will adopt once it ships.
 */
export const PRISM_OWNED_GLOBS = [
	"architect/_toolkit/**",
	"spec/adrs/_toolkit/**",
	"rules/**",
	"templates/**",
	"references/**",
	"spec/**",
	"SPEC.md",
] as const;

/**
 * Globs (relative to `.prism/`) for consumer-owned files the update flow never
 * touches. These carve consumer paths back out of the broader owned globs —
 * `spec/adrs/*.md` (flat consumer ADRs) sits under the owned `spec/**`, so
 * without this exclusion the manifest would over-claim it. Mirrors the Phase 5
 * `CONSUMER_OWNED_GLOBS` set.
 */
export const CONSUMER_OWNED_GLOBS = [
	"architect/*.md",
	"spec/adrs/*.md",
	"architect/manifest.json",
	"custom/**",
	"plans/**",
	"lessons.md",
] as const;

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

const ownedMatchers = PRISM_OWNED_GLOBS.map((glob) => compileMatcher(glob));
const consumerMatchers = CONSUMER_OWNED_GLOBS.map((glob) =>
	compileMatcher(glob)
);

/**
 * A path is PRISM-owned when it matches an owned glob and no consumer glob. The
 * consumer check carves flat `spec/adrs/*.md` and `architect/*.md` back out of
 * the broader owned globs (`spec/**`), so consumer product docs never enter the
 * manifest.
 */
function isPrismOwned(relativePath: string): boolean {
	if (consumerMatchers.some((matches) => matches(relativePath))) {
		return false;
	}

	return ownedMatchers.some((matches) => matches(relativePath));
}

/**
 * Returns the `.prism/`-relative paths of every PRISM-owned file under the
 * content root, sorted. Paths are normalized to forward slashes so manifest
 * keys are stable across platforms and match the POSIX-style globs.
 */
export async function listPrismOwnedRelativePaths(
	prismContentRoot: string
): Promise<string[]> {
	const entries = await listRelativeDirectoryEntries(prismContentRoot);

	return entries
		.filter((entry) => entry.kind === "file")
		.map((entry) => entry.relativePath.split(path.sep).join("/"))
		.filter((relativePath) => isPrismOwned(relativePath))
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
