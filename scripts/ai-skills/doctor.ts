#!/usr/bin/env -S npx tsx
/**
 * `prism doctor` — reports install health for a consumer repo in one pass.
 *
 * A bad `.ai-skills/config.json` field, a target that isn't a git repo, or a
 * `.prism/` tree that's drifted from its recorded sync manifest currently
 * surfaces late and far from the cause — the first visible symptom is often an
 * opaque leftover-token build failure pointing at rendered platform output.
 * `doctor` runs the same checks `adopt`/`update` run before writing, plus a
 * sync-state and version report, and prints every finding in one pass instead
 * of failing fast on the first problem.
 *
 * Two exported entry points, matching the `init.ts` / `update.ts` shape:
 * - `runDoctor` — the testable core. Takes a resolved consumer root and PRISM
 *   source root, returns a `DoctorReport`. No process.exit, no console output.
 * - `runDoctorCli` — the CLI wrapper. Resolves roots from argv, calls
 *   `runDoctor`, prints the report, and sets the process exit code.
 *
 * Unlike `adopt`/`update`, `doctor` never writes to disk and never throws on a
 * bad finding — throwing would stop at the first problem, defeating the point
 * of a single command that reports everything wrong at once. Each check is
 * independently wrapped so one failure doesn't prevent the others from running.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateConsumerConfigAgainstSchema } from "./lib/config-schema-validate";
import { assertInsideGitRepo, parseConsumerFlag, resolveConsumerRoot } from "./lib/consumer-root";
import { classifyPath } from "./ownership";
import { resolvePrismSource, resolveSelfPrismSource } from "./update";
import { loadSyncManifest, SYNC_MANIFEST_FILENAME, type SyncManifest } from "./sync-manifest";
import { hashFile, pathExists, readFileIfExists } from "./utils";

const NPM_REGISTRY_URL = "https://registry.npmjs.org/@huntermcgrew/prism";
const NPM_FETCH_TIMEOUT_MS = 3000;

/** A single named health finding. `check` identifies which section produced it. */
export interface DoctorFinding {
	check: "config" | "git-repo" | "sync-manifest" | "version";
	severity: "error" | "warning" | "info";
	message: string;
}

export interface SyncStateReport {
	/** `null` when no `.sync-manifest.json` exists — a pre-adopt or pre-manifest install. */
	manifest: {
		prismOwnedCount: number;
		consumerOwnedCount: number;
		divergedFiles: Array<{ relativePath: string; backups: string[] }>;
		missingFiles: string[];
	} | null;
}

export interface VersionReport {
	installed: string;
	/** `null` when the npm lookup could not complete — network, timeout, 404, or unpublished. */
	latest: string | null;
	/** True when both versions are known and differ. */
	outOfDate: boolean;
}

export interface DoctorReport {
	findings: DoctorFinding[];
	syncState: SyncStateReport;
	version: VersionReport;
	/** True when `findings` contains no `error`-severity entry. */
	healthy: boolean;
}

/**
 * Validates `.ai-skills/config.json` against `config.schema.json`, reusing
 * L376's schema validator. Catches rather than lets the error propagate — a
 * single bad field should be one finding among several, not a thrown
 * exception that stops every other check from running.
 */
async function checkConfigSchema(
	consumerRepoRoot: string,
	prismSourceRoot: string
): Promise<DoctorFinding[]> {
	try {
		validateConsumerConfigAgainstSchema(consumerRepoRoot, prismSourceRoot);

		return [];
	} catch (error) {
		return [
			{
				check: "config",
				severity: "error",
				message: error instanceof Error ? error.message : String(error),
			},
		];
	}
}

/**
 * Confirms the target is inside a git repository, reusing L376's guard.
 * Catches rather than lets the error propagate, for the same reason as
 * `checkConfigSchema`.
 */
function checkGitRepo(consumerRepoRoot: string): DoctorFinding[] {
	try {
		assertInsideGitRepo(consumerRepoRoot);

		return [];
	} catch (error) {
		return [
			{
				check: "git-repo",
				severity: "error",
				message: error instanceof Error ? error.message : String(error),
			},
		];
	}
}

/**
 * Resolves every `.bak` / `.bak.N` sibling that already exists next to
 * `absolutePath`, matching the naming scheme `update.ts`'s `resolveBackupPath`
 * writes to (`<file>.bak`, then `<file>.bak.1`, `<file>.bak.2`, …).
 */
async function findBackupSiblings(absolutePath: string): Promise<string[]> {
	const siblings: string[] = [];

	const base = `${absolutePath}.bak`;
	if (await pathExists(base)) {
		siblings.push(base);
	}

	let suffix = 1;
	while (await pathExists(`${base}.${suffix}`)) {
		siblings.push(`${base}.${suffix}`);
		suffix += 1;
	}

	return siblings;
}

/**
 * Reports sync state from `.prism/.sync-manifest.json`: how many recorded
 * files are PRISM-owned vs consumer-owned per `classifyPath`, which
 * PRISM-owned files have diverged from their recorded hash (paired with any
 * `.bak` siblings already on disk), and which recorded PRISM-owned files are
 * missing entirely.
 *
 * Returns `manifest: null` when no manifest exists — a pre-adopt repo, or one
 * that predates the manifest — which `runDoctor` turns into an informational
 * finding rather than an error, since a fresh `prism adopt` target legitimately
 * has none yet.
 */
async function checkSyncManifest(consumerContentRoot: string): Promise<{
	findings: DoctorFinding[];
	syncState: SyncStateReport;
}> {
	const manifest: SyncManifest | null = await loadSyncManifest(consumerContentRoot);

	if (manifest === null) {
		return {
			findings: [
				{
					check: "sync-manifest",
					severity: "info",
					message: `No ${SYNC_MANIFEST_FILENAME} found — this repo has not run \`prism adopt\` yet, or predates the sync manifest.`,
				},
			],
			syncState: { manifest: null },
		};
	}

	let prismOwnedCount = 0;
	let consumerOwnedCount = 0;
	const divergedFiles: Array<{ relativePath: string; backups: string[] }> = [];
	const missingFiles: string[] = [];

	for (const [relativePath, entry] of Object.entries(manifest.files)) {
		const ownership = classifyPath(relativePath);
		if (ownership === "consumer") {
			consumerOwnedCount += 1;
			continue;
		}
		if (ownership !== "prism") {
			continue;
		}

		prismOwnedCount += 1;

		const absolutePath = path.join(consumerContentRoot, relativePath);
		if (!(await pathExists(absolutePath))) {
			missingFiles.push(relativePath);
			continue;
		}

		const currentHash = await hashFile(absolutePath);
		if (currentHash !== entry.contentHash) {
			divergedFiles.push({
				relativePath,
				backups: await findBackupSiblings(absolutePath),
			});
		}
	}

	const findings: DoctorFinding[] = [];
	if (missingFiles.length > 0) {
		findings.push({
			check: "sync-manifest",
			severity: "error",
			message: `${missingFiles.length} PRISM-owned file(s) recorded in the manifest are missing on disk: ${missingFiles.join(", ")}`,
		});
	}
	if (divergedFiles.length > 0) {
		findings.push({
			check: "sync-manifest",
			severity: "warning",
			message: `${divergedFiles.length} PRISM-owned file(s) have diverged from the recorded PRISM base: ${divergedFiles.map((f) => f.relativePath).join(", ")}`,
		});
	}

	return {
		findings,
		syncState: {
			manifest: { prismOwnedCount, consumerOwnedCount, divergedFiles, missingFiles },
		},
	};
}

/** Fetcher shape `checkVersion` depends on — lets tests inject a stub instead of hitting the network. */
export type NpmVersionFetcher = (url: string, timeoutMs: number) => Promise<string | null>;

/**
 * Fetches the npm registry's `dist-tags.latest` for `@huntermcgrew/prism`,
 * returning `null` on any failure — network error, timeout, 404 (package not
 * yet published), or malformed JSON. `doctor` never fails the whole run over
 * an unreachable registry; the version check degrades to "unavailable".
 */
export async function fetchLatestNpmVersion(
	url: string = NPM_REGISTRY_URL,
	timeoutMs: number = NPM_FETCH_TIMEOUT_MS
): Promise<string | null> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(url, { signal: controller.signal });
		if (!response.ok) {
			return null;
		}

		const body = (await response.json()) as { "dist-tags"?: { latest?: string } };

		return body["dist-tags"]?.latest ?? null;
	} catch {
		return null;
	} finally {
		clearTimeout(timeout);
	}
}

/**
 * Reads the installed PRISM version from `prismSourceRoot`'s own
 * `package.json`, then compares it against npm's `latest` dist-tag via
 * `fetcher` (defaults to `fetchLatestNpmVersion`, overridable so tests never
 * depend on live network).
 */
async function checkVersion(
	prismSourceRoot: string,
	fetcher: NpmVersionFetcher
): Promise<{ findings: DoctorFinding[]; version: VersionReport }> {
	const pkgRaw = await readFileIfExists(path.join(prismSourceRoot, "package.json"));
	const installed =
		pkgRaw !== null ? ((JSON.parse(pkgRaw) as { version?: string }).version ?? "unknown") : "unknown";

	const latest = await fetcher(NPM_REGISTRY_URL, NPM_FETCH_TIMEOUT_MS);
	const outOfDate = latest !== null && latest !== installed;

	const findings: DoctorFinding[] = [];
	if (latest === null) {
		findings.push({
			check: "version",
			severity: "info",
			message: `Installed version ${installed}; latest-on-npm check unavailable (offline, unpublished, or registry unreachable).`,
		});
	} else if (outOfDate) {
		findings.push({
			check: "version",
			severity: "warning",
			message: `Installed version ${installed} is behind the latest published version ${latest}.`,
		});
	}

	return { findings, version: { installed, latest, outOfDate } };
}

export interface RunDoctorOptions {
	consumerRepoRoot: string;
	prismSourceRoot: string;
	/** Overridable for tests — defaults to the real npm registry fetch. */
	npmVersionFetcher?: NpmVersionFetcher;
}

/**
 * Runs every health check and returns a single report. Each check is
 * independent — a config-schema failure does not prevent the git-repo, sync-
 * manifest, or version checks from also running, so a consumer sees every
 * problem in one pass instead of fixing them one at a time across repeated
 * runs.
 */
export async function runDoctor(options: RunDoctorOptions): Promise<DoctorReport> {
	const {
		consumerRepoRoot,
		prismSourceRoot,
		npmVersionFetcher = fetchLatestNpmVersion,
	} = options;
	const consumerContentRoot = path.join(consumerRepoRoot, ".prism");

	const findings: DoctorFinding[] = [];

	findings.push(...(await checkConfigSchema(consumerRepoRoot, prismSourceRoot)));
	findings.push(...checkGitRepo(consumerRepoRoot));

	const syncResult = await checkSyncManifest(consumerContentRoot);
	findings.push(...syncResult.findings);

	const versionResult = await checkVersion(prismSourceRoot, npmVersionFetcher);
	findings.push(...versionResult.findings);

	return {
		findings,
		syncState: syncResult.syncState,
		version: versionResult.version,
		healthy: !findings.some((f) => f.severity === "error"),
	};
}

const SEVERITY_LABEL: Record<DoctorFinding["severity"], string> = {
	error: "ERROR",
	warning: "WARN",
	info: "INFO",
};

/** Renders a `DoctorReport` as human-readable lines, in the order `runDoctorCli` prints them. */
export function formatDoctorReport(report: DoctorReport): string {
	const lines: string[] = [];

	if (report.syncState.manifest !== null) {
		const { prismOwnedCount, consumerOwnedCount } = report.syncState.manifest;
		lines.push(
			`Sync state: ${prismOwnedCount} PRISM-owned file(s), ${consumerOwnedCount} consumer-owned file(s) recorded.`
		);
	}

	lines.push(
		report.version.latest !== null
			? `Version: ${report.version.installed} installed, ${report.version.latest} latest on npm.`
			: `Version: ${report.version.installed} installed, latest-on-npm unavailable.`
	);

	if (report.findings.length === 0) {
		lines.push("No issues found.");
	} else {
		for (const finding of report.findings) {
			lines.push(`[${SEVERITY_LABEL[finding.severity]}] ${finding.check}: ${finding.message}`);
		}
	}

	lines.push(report.healthy ? "prism doctor: healthy." : "prism doctor: unhealthy — see findings above.");

	return lines.join("\n");
}

export async function runDoctorCli(): Promise<void> {
	const argv = process.argv.slice(2);
	const consumerRepoRoot = resolveConsumerRoot({
		explicitConsumer: parseConsumerFlag(argv),
		cwd: process.cwd(),
		selfPrismRoot: resolveSelfPrismSource(),
	});
	const prismSourceRoot = resolvePrismSource(argv, consumerRepoRoot);

	if (prismSourceRoot === null) {
		throw new Error(
			"prism doctor needs a PRISM source. Pass --prism-source <path-to-prism-repo>, " +
				'or add a "prismSource" field to .ai-skills/config.json pointing at your ' +
				"local PRISM checkout."
		);
	}

	const report = await runDoctor({ consumerRepoRoot, prismSourceRoot });

	console.log(formatDoctorReport(report));

	if (!report.healthy) {
		process.exitCode = 1;
	}
}

const isMain =
	process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
	runDoctorCli().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	});
}
