#!/usr/bin/env tsx
/**
 * Consumer-side `pnpm prism:update`.
 *
 * Pulls PRISM's latest canonical content into an already-onboarded consumer
 * repo. PRISM-owned files (decided by `classifyPath`) are overwritten when the
 * consumer never diverged from the last-known PRISM base, and preserved as a
 * `.bak` snapshot when they did — consumer edits are never silently lost, and a
 * repeat divergence never clobbers an earlier snapshot (see `backupConsumerFile`).
 * Consumer-owned and unknown paths are left untouched. After the file pass the
 * consumer's `.sync-manifest.json` is rewritten to the new base hashes and the
 * platform dirs are refreshed, reading their locations from the consumer's own
 * `paths.json` so they stay in lockstep with `prism:build`.
 *
 * Source resolution order: `--prism-source <path>` CLI arg → `prismSource` in
 * the consumer's `.ai-skills/config.json` → error with guidance. The flow
 * refuses to run when the source resolves to the consumer itself — that is
 * `prism:build`, not `prism:update`.
 */
import fs from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { syncAllPlatformContentCopies } from "./build";
import {
	buildRoleMap,
	generatePlatformSkills,
	type RolesDefinitions,
} from "./generate-skills";
import {
	assertInsideGitRepo,
	resolveConsumerRoot,
	parseConsumerFlag,
	parseDryRunFlag,
} from "./lib/consumer-root";
import { validateConsumerConfigAgainstSchema } from "./lib/config-schema-validate";
import { deriveTokenMap, loadConfig } from "./lib/tokens";
import { runLeftoverTokenGuard } from "./literal-guard";
import { classifyPath } from "./ownership";
import {
	generateSyncManifest,
	listPrismOwnedRelativePaths,
	loadSyncManifest,
	SYNC_MANIFEST_FILENAME,
	type SyncManifest,
} from "./sync-manifest";
import {
	buildPlatformDirs,
	hashFile,
	loadPathDefinitions,
	type PathDefinitions,
	pathExists,
	readFileIfExists,
} from "./utils";

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
	prismRepoRoot: string;
	consumerRepoRoot: string;
	prismContentRoot: string;
	consumerContentRoot: string;
	/**
	 * When true, runs the full classification pass and returns the summary a
	 * real run would produce, without writing, overwriting, or removing any
	 * file. Defaults to `false` — a real run.
	 */
	dryRun?: boolean;
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
 * Resolves which `.bak` path a diverged file would land at, without writing
 * it. Shared by the real backup and the dry-run preview so both agree on the
 * same "next free `.bak`, `.bak.1`, `.bak.2`, …" name — see `backupConsumerFile`
 * for why a repeat divergence must never clobber an earlier snapshot.
 */
async function resolveBackupPath(absolutePath: string, sourceHash: string): Promise<string> {
	let candidate = `${absolutePath}.bak`;
	let suffix = 0;
	while (await pathExists(candidate)) {
		if ((await hashFile(candidate)) === sourceHash) {
			return candidate;
		}

		suffix += 1;
		candidate = `${absolutePath}.bak.${suffix}`;
	}

	return candidate;
}

/**
 * Copies a consumer file to a backup before it is overwritten or removed,
 * preserving a diverged edit. Returns the backup path for the run summary.
 *
 * Never silently destroys a prior backup. `<file>.bak` is the preferred target,
 * but a repeat divergence would clobber a snapshot from an earlier run, so when
 * `<file>.bak` already exists the copy is skipped if its bytes are identical
 * (the snapshot is already preserved) and otherwise written to the next free
 * `<file>.bak.1`, `<file>.bak.2`, … name. Each diverged edit keeps its own
 * durable archive.
 *
 * `dryRun` resolves and returns the same path without touching disk — the
 * caller is previewing what `--dry-run` would do, not doing it.
 */
async function backupConsumerFile(absolutePath: string, dryRun: boolean): Promise<string> {
	const sourceHash = await hashFile(absolutePath);
	const candidate = await resolveBackupPath(absolutePath, sourceHash);

	if (dryRun || (await pathExists(candidate))) {
		return candidate;
	}

	await fs.copyFile(absolutePath, candidate);

	return candidate;
}

async function writeIncoming(
	incomingAbsolute: string,
	consumerAbsolute: string,
	dryRun: boolean
): Promise<void> {
	if (dryRun) {
		return;
	}

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
	recordedHash: string | null,
	dryRun: boolean
): Promise<FileOutcome> {
	const incomingAbsolute = path.join(prismContentRoot, relativePath);
	const consumerAbsolute = path.join(consumerContentRoot, relativePath);

	const incomingHash = await hashFile(incomingAbsolute);
	const consumerHash = await hashFileIfExists(consumerAbsolute);

	if (consumerHash === null) {
		await writeIncoming(incomingAbsolute, consumerAbsolute, dryRun);

		return { relativePath, action: "written" };
	}

	if (consumerHash === incomingHash) {
		return { relativePath, action: "no-op" };
	}

	if (recordedHash !== null && consumerHash === recordedHash) {
		await writeIncoming(incomingAbsolute, consumerAbsolute, dryRun);

		return { relativePath, action: "overwritten" };
	}

	const backupPath = await backupConsumerFile(consumerAbsolute, dryRun);
	await writeIncoming(incomingAbsolute, consumerAbsolute, dryRun);

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
	recordedHash: string,
	dryRun: boolean
): Promise<FileOutcome> {
	const consumerAbsolute = path.join(consumerContentRoot, relativePath);
	const consumerHash = await hashFileIfExists(consumerAbsolute);

	if (consumerHash === null) {
		return { relativePath, action: "no-op" };
	}

	if (consumerHash === recordedHash) {
		if (!dryRun) {
			await fs.rm(consumerAbsolute);
		}

		return { relativePath, action: "removed" };
	}

	const backupPath = await backupConsumerFile(consumerAbsolute, dryRun);
	if (!dryRun) {
		await fs.rm(consumerAbsolute);
	}

	return { relativePath, action: "removed-with-backup", backupPath };
}

/**
 * Runs the per-file update pass and rewrites the consumer manifest to the new
 * PRISM base hashes (carrying `prismVersion`/`sourceCommit` from the PRISM
 * source manifest when present). Pure with respect to platform dirs — the
 * caller (`runUpdate`) refreshes those afterward.
 *
 * This is the engine `runUpdate` wraps: it owns only `.prism/` file movement
 * and manifest bookkeeping, so it can be unit-tested against a bare `.prism/`
 * fixture without a full consumer config or PRISM skill source.
 *
 * `runUpdate` loads the consumer manifest up front for its plausibility guard
 * and threads it in as `preloadedManifest` so the file isn't read twice per
 * call; callers that don't have it (the unit tests) omit it and the manifest is
 * loaded here.
 *
 * `dryRun` runs the full classification pass — every file still gets the same
 * `written` / `no-op` / `overwritten` / `backed-up` / `removed` /
 * `removed-with-backup` decision — but skips the `fs` calls that would carry
 * it out, including the manifest rewrite. The returned `UpdateSummary` is
 * identical in shape to a real run, so callers print the same report either way.
 */
export async function applyFilePass(
	prismContentRoot: string,
	consumerContentRoot: string,
	preloadedManifest?: SyncManifest | null,
	dryRun = false
): Promise<UpdateSummary> {
	const incomingRelativePaths =
		await listPrismOwnedRelativePaths(prismContentRoot);
	const incomingSet = new Set(incomingRelativePaths);

	const consumerManifest =
		preloadedManifest !== undefined
			? preloadedManifest
			: await loadSyncManifest(consumerContentRoot);
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
				recordedHashes.get(relativePath) ?? null,
				dryRun
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
			await applyDeletedFile(relativePath, consumerContentRoot, recordedHash, dryRun)
		);
	}

	if (!dryRun) {
		await rewriteConsumerManifest(
			prismContentRoot,
			consumerContentRoot,
			consumerManifest
		);
	}

	const backups = outcomes
		.filter((outcome) => outcome.backupPath !== undefined)
		.map((outcome) => outcome.backupPath as string);

	return { outcomes, backups };
}

/**
 * Applies the per-file update pass via `applyFilePass`, then refreshes the
 * consumer's platform dirs — both the content copies and the `prism-*`
 * persona-skill roster.
 *
 * The platform refresh lives here, not in the caller, so every caller of
 * `runUpdate` gets it: `prism:update`'s `runUpdateCli` and `prism:adopt`'s `runAdopt`
 * both reach the same seam. The consumer config and `paths.json` are resolved
 * and validated up front so a bad config fails fast with nothing written,
 * instead of half-applying the file pass and throwing at the very end (see plan
 * prism-242 Decision "Adopt-path seam").
 *
 * Config schema validation and the git-repo check run before any of that
 * resolution — a hand-edited config that violates `config.schema.json`
 * (a bad `ticketPrefix` pattern, an unrecognized `techStack` entry) previously
 * passed `loadConfig`'s narrower structural check and only surfaced later as a
 * leftover-token build failure pointing at rendered platform output, nowhere
 * near the config field that caused it. Both guards name what's wrong and
 * where before touching disk.
 *
 * `dryRun` passes through to `applyFilePass` and to the platform refresh
 * steps' own `checkMode` (they already support a read-only preview for drift
 * detection) — every write in the whole `runUpdate` pipeline is guarded.
 */
export async function runUpdate(
	options: RunUpdateOptions
): Promise<UpdateSummary> {
	const {
		prismRepoRoot,
		consumerRepoRoot,
		prismContentRoot,
		consumerContentRoot,
		dryRun = false,
	} = options;

	assertInsideGitRepo(consumerRepoRoot);
	validateConsumerConfigAgainstSchema(consumerRepoRoot, prismRepoRoot);

	// Resolve and validate everything the platform refresh needs before the file
	// pass mutates .prism/. A bad consumer config or paths.json then fails fast
	// with nothing written.
	const tokenMap = deriveTokenMap(loadConfig(consumerRepoRoot));
	const consumerPathDefinitions = await loadPathDefinitions(consumerRepoRoot);
	const platformDirs = buildPlatformDirs(
		consumerRepoRoot,
		consumerPathDefinitions
	);
	const overlayContentRoot = path.join(consumerContentRoot, OVERLAY_SUBPATH);

	// Guard against a source that looks empty or mispointed before any file is
	// touched. Lives here, not in main(), so every caller — prism:update,
	// prism:adopt, and the prism CLI — passes through it. The deletion count is
	// the consumer's recorded PRISM-owned file count, which is what an empty
	// source would wipe.
	const consumerManifest = await loadSyncManifest(consumerContentRoot);
	const pendingDeletionCount = consumerManifest
		? Object.keys(consumerManifest.files).filter(
				(p) => classifyPath(p) === "prism"
			).length
		: 0;

	await assertSourceIsPlausible(prismContentRoot, pendingDeletionCount);

	const summary = await applyFilePass(
		prismContentRoot,
		consumerContentRoot,
		consumerManifest,
		dryRun
	);

	await refreshPlatformDirs(
		consumerContentRoot,
		overlayContentRoot,
		platformDirs,
		tokenMap,
		dryRun
	);

	await refreshPlatformSkills(
		prismRepoRoot,
		consumerRepoRoot,
		consumerPathDefinitions,
		tokenMap,
		dryRun
	);

	return summary;
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
 * Resolves the consumer's persona-skill output roots from its own `paths.json`.
 *
 * Reads the same `generated.*` fields `prism:build` uses, so a consumer that
 * customized those paths gets `prism:update` writing the roster to the same
 * place `prism:build` would. Mirrors `buildPlatformDirs`, which covers the
 * content-copy dirs; this covers the per-skill / per-agent target roots and the
 * Codex config file that `generatePlatformSkills` writes.
 */
function resolveConsumerSkillTargetRoots(
	consumerRepoRoot: string,
	pathDefinitions: PathDefinitions
): {
	targetRoots: {
		claude: string;
		claudeAgents: string;
		codex: string;
		codexAgents: string;
		cursor: string;
	};
	codexConfigPath: string;
} {
	const { generated } = pathDefinitions;

	return {
		targetRoots: {
			claude: path.join(consumerRepoRoot, generated.claudeSkillsRoot),
			claudeAgents: path.join(consumerRepoRoot, generated.claudeAgentsRoot),
			codex: path.join(consumerRepoRoot, generated.codexSkillsRoot),
			codexAgents: path.join(consumerRepoRoot, generated.codexAgentsRoot),
			cursor: path.join(consumerRepoRoot, generated.cursorSkillsRoot),
		},
		codexConfigPath: path.join(consumerRepoRoot, generated.codexConfigFile),
	};
}

/**
 * Renders the `prism-*` persona-skill roster into the consumer's platform skill
 * dirs, using the PRISM source's skill bodies and `roles.json` but the
 * consumer's own token map and output paths, then runs the leftover-token guard
 * over the rendered output.
 *
 * The roster source is the PRISM checkout, not the consumer — the consumer
 * renders whatever personas PRISM ships. `checkMode` mirrors the caller's
 * `dryRun` — `false` for a real `runUpdate` write, `true` when previewing via
 * `--dry-run`, and the same flag `prism:build`'s own drift check uses. The
 * Thrive-literal guard is deliberately not run here — a consumer's output
 * legitimately contains "Thrive"-flavored words, so only the leftover-token
 * guard applies (see plan prism-242 Decision "Two guards, not one").
 */
async function refreshPlatformSkills(
	prismRepoRoot: string,
	consumerRepoRoot: string,
	consumerPathDefinitions: PathDefinitions,
	tokenMap: Map<string, string>,
	dryRun: boolean
): Promise<void> {
	const sourceSkillsRoot = path.join(prismRepoRoot, ".ai-skills", "skills");
	if (!(await pathExists(sourceSkillsRoot))) {
		throw new Error(
			`PRISM source has no skill directory at ${sourceSkillsRoot}.`
		);
	}

	const rolesPath = path.join(
		prismRepoRoot,
		".ai-skills",
		"definitions",
		"roles.json"
	);
	const rolesRaw = await readFileIfExists(rolesPath);
	if (rolesRaw === null) {
		throw new Error(`PRISM source has no roles definition at ${rolesPath}.`);
	}

	let roleDefinitions: RolesDefinitions;
	try {
		roleDefinitions = JSON.parse(rolesRaw) as RolesDefinitions;
	} catch (error) {
		throw new Error(
			`Invalid roles definitions JSON at ${rolesPath}: ${error instanceof Error ? error.message : String(error)}`
		);
	}

	const roleMap = buildRoleMap(roleDefinitions);
	const { targetRoots, codexConfigPath } = resolveConsumerSkillTargetRoots(
		consumerRepoRoot,
		consumerPathDefinitions
	);

	const changedPaths: string[] = [];
	await generatePlatformSkills({
		sourceSkillsRoot,
		targetRoots,
		codexConfigPath,
		roleMap,
		tokenMap,
		optedIn: {
			claude: true,
			codex: true,
			cursor: true,
			codexAgents: true,
			claudeAgents: true,
			codexConfig: true,
		},
		checkMode: dryRun,
		changedPaths,
	});

	if (dryRun) {
		// A dry-run preview leaves the rendered roster on disk unchanged (stale or
		// absent), so scanning it for leftover tokens would report false positives
		// or miss real ones. The leftover-token guard only makes sense against
		// output this pass actually wrote.
		return;
	}

	const leftoverTokenViolations = await runLeftoverTokenGuard(consumerRepoRoot, [
		targetRoots.claude,
		targetRoots.claudeAgents,
		targetRoots.codex,
		targetRoots.codexAgents,
		targetRoots.cursor,
	]);
	if (leftoverTokenViolations.length > 0) {
		const detail = leftoverTokenViolations
			.map((v) => `  ${v.relativePath}:${v.line}: ${v.match}`)
			.join("\n");
		throw new Error(
			`prism:update: ${leftoverTokenViolations.length} unresolved \${TOKEN} literal(s) in rendered persona skills:\n${detail}`
		);
	}
}

/** Subdir name for the `.prism/custom` overlay's source and platform output. */
const OVERLAY_SUBPATH = "custom";

/**
 * Refreshes the consumer's platform dirs after `.prism/` is updated. The token
 * map and platform dirs are resolved and validated in `runUpdate` before any
 * `.prism/` mutation, so this step never fails on a bad config after the file
 * pass has already written.
 *
 * Two passes per platform: the base `.prism/` content, then the consumer's
 * `.prism/custom` overlay. The overlay reuses the same content-copy + dialect
 * pipeline (token substitution, Cursor `.mdc` translation, Codex `paths:`
 * stripping) but emits into a `custom/` subdir per area — `.claude/rules/custom`,
 * `.cursor/rules/custom`, `.codex/rules/custom`. The subdir makes base-vs-overlay
 * collision structurally impossible, and each pass carries its own
 * `.ai-skill-generated` marker so orphan cleanup stays scoped to its own tree.
 * The overlay pass is skipped when the consumer ships no `.prism/custom`.
 *
 * `dryRun` passes straight through as `syncAllPlatformContentCopies`'s own
 * `checkModeArg` — that function already supports a read-only preview mode
 * for `prism:build`'s drift check, so no new write-guarding is needed here.
 */
async function refreshPlatformDirs(
	consumerContentRoot: string,
	overlayContentRoot: string,
	platformDirs: ReturnType<typeof buildPlatformDirs>,
	tokenMap: Map<string, string>,
	dryRun: boolean
): Promise<void> {
	await syncAllPlatformContentCopies(
		consumerContentRoot,
		platformDirs,
		dryRun,
		[],
		tokenMap
	);

	if (await pathExists(overlayContentRoot)) {
		await syncAllPlatformContentCopies(
			overlayContentRoot,
			platformDirs,
			dryRun,
			[],
			tokenMap,
			OVERLAY_SUBPATH
		);
	}
}

/**
 * Walks up the directory tree from `startFile` until it finds a directory
 * whose `package.json` has `"name": "@huntermcgrew/prism"`, then returns that
 * directory as the PRISM package root.
 *
 * Walking to the named package.json makes root resolution correct from any
 * depth: the dev path (`tsx scripts/ai-skills/update.ts`) walks up two levels
 * and finds the root; the compiled path (`node dist/cli.js`) walks up one
 * level and finds the same root. Hardcoding a depth like `../..` would break
 * for the compiled bin, where the running file sits at depth 1 instead of
 * depth 2.
 *
 * Throws when no ancestor directory contains a matching `package.json`,
 * which prevents silent wrong-root resolution.
 */
export function findPrismPackageRoot(startFile: string): string {
	const EXPECTED_NAME = "@huntermcgrew/prism";
	let dir = path.dirname(startFile);

	while (true) {
		const pkgPath = path.join(dir, "package.json");
		try {
			const raw = readFileSync(pkgPath, "utf8");
			const pkg = JSON.parse(raw) as { name?: string };
			if (pkg.name === EXPECTED_NAME) {
				return dir;
			}
		} catch {
			// package.json absent or unreadable at this level — keep walking up
		}

		const parent = path.dirname(dir);
		if (parent === dir) {
			throw new Error(
				`findPrismPackageRoot: reached filesystem root without finding a ` +
					`package.json named "${EXPECTED_NAME}" — started from ${startFile}`
			);
		}

		dir = parent;
	}
}

/**
 * Derives the PRISM package root from this module's own location. Used as the
 * last fallback in `resolvePrismSource` so a consumer running the bundled
 * `prism` CLI gets a source without passing `--prism-source`.
 *
 * Delegates to `findPrismPackageRoot` rather than hardcoding a depth, so the
 * resolution is correct both from the dev path (`scripts/ai-skills/update.ts`,
 * depth 2) and the compiled path (`dist/cli.js`, depth 1).
 */
export function resolveSelfPrismSource(): string {
	const thisFile = fileURLToPath(import.meta.url);
	return findPrismPackageRoot(thisFile);
}

/**
 * Resolves the PRISM source path, in priority order: the `--prism-source` CLI
 * arg, then the `prismSource` field in the consumer's config, then this
 * script's own location (`resolveSelfPrismSource`). The self-location fallback
 * is what lets the bundled `prism` CLI run with no path argument; explicit
 * signals still win over it.
 *
 * The `string | null` return is kept for defense-in-depth: `resolveSelfPrismSource`
 * always returns a path, so `null` is effectively unreachable today, but a future
 * caller invoking this without a script-relative source could still hit it, and
 * both `runUpdateCli` and `runAdoptCli` guard on it.
 */
export function resolvePrismSource(
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

	return resolveSelfPrismSource();
}

/**
 * Guards against applying updates from a source that looks empty or mispointed.
 *
 * A valid PRISM source always contains PRISM-owned files under its `.prism/`
 * dir. Zero owned files means the path is wrong, the tree was accidentally
 * cleared, or the source was never built. Proceeding would treat every file in
 * the consumer's recorded manifest as "deleted by PRISM" and remove them all.
 */
export async function assertSourceIsPlausible(
	prismContentRoot: string,
	pendingDeletionCount: number
): Promise<void> {
	const ownedPaths = await listPrismOwnedRelativePaths(prismContentRoot);

	if (ownedPaths.length === 0) {
		throw new Error(
			`prism:update: --prism-source looks empty (${prismContentRoot}) — refusing ${pendingDeletionCount} deletion(s)`
		);
	}
}

export async function runUpdateCli(): Promise<void> {
	const argv = process.argv.slice(2);
	const consumerRepoRoot = resolveConsumerRoot({
		explicitConsumer: parseConsumerFlag(argv),
		cwd: process.cwd(),
		selfPrismRoot: resolveSelfPrismSource(),
	});
	const prismRepoRoot = resolvePrismSource(argv, consumerRepoRoot);

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

	const dryRun = parseDryRunFlag(argv);

	const summary = await runUpdate({
		prismRepoRoot,
		consumerRepoRoot,
		prismContentRoot,
		consumerContentRoot,
		dryRun,
	});

	reportSummary(summary, dryRun);
}

function reportSummary(summary: UpdateSummary, dryRun = false): void {
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
	console.log(
		dryRun
			? `prism:update (dry run) — would apply ${parts || "no changes"}.`
			: `prism:update complete — ${parts || "no changes"}.`
	);

	if (summary.backups.length > 0) {
		console.log(
			dryRun
				? `Would preserve ${summary.backups.length} diverged file(s) as .bak:`
				: `Preserved ${summary.backups.length} diverged file(s) as .bak:`
		);
		for (const backup of summary.backups) {
			console.log(`  ${backup}`);
		}
	}
}

const isMain =
	process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
	runUpdateCli().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	});
}
