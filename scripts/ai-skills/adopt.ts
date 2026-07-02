#!/usr/bin/env tsx
/**
 * Consumer-side `pnpm prism:adopt`.
 *
 * First-contact install entry for a repo that has never had PRISM. Seeds
 * `.prism/` from the install surface (`templates/install/.prism/`), writing
 * only paths the consumer does not already have, then delegates to `runUpdate`
 * to apply PRISM-owned files and write the steady-state baseline manifest via
 * `rewriteConsumerManifest`. After one `prism:adopt` run the repo uses
 * `pnpm prism:update` for all future syncs.
 *
 * Source resolution mirrors `prism:update`: `--prism-source <path>` CLI arg →
 * `prismSource` in the consumer's config → error. The flow refuses to run when
 * a `.sync-manifest.json` already exists — that is `prism:update`, not
 * `prism:adopt`.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	assertInsideGitRepo,
	resolveConsumerRoot,
	parseConsumerFlag,
	parseDryRunFlag,
} from "./lib/consumer-root";
import { validateConsumerConfigAgainstSchema } from "./lib/config-schema-validate";
import { loadSyncManifest } from "./sync-manifest";
import {
	formatVersionDeltaLine,
	resolvePrismSource,
	resolveSelfPrismSource,
	runUpdate,
	type UpdateSummary,
} from "./update";
import { ensureConsumerPathDefinitions, ensureDirectory, pathExists } from "./utils";

export interface SeedSummary {
	written: string[];
	skipped: string[];
}

export interface AdoptSummary {
	pathsProvisioned: "written" | "ok";
	seed: SeedSummary;
	update: UpdateSummary;
}

/**
 * Recursively copies every file under `installSeedRoot` into `consumerContentRoot`,
 * skipping any path that already exists in the consumer. Never overwrites an
 * existing consumer file — mirrors the `consumerHash === null → written` posture
 * from `applyIncomingFile` in `update.ts`.
 *
 * Returns a summary listing which paths were written and which were skipped so
 * the caller can surface the result to the user.
 *
 * `dryRun` still walks the full seed tree and classifies every path as
 * written or skipped, but never touches the consumer filesystem — the same
 * "compute the outcome, then guard the write" split `update.ts` uses.
 */
export async function seedConsumerContentRoot(
	installSeedRoot: string,
	consumerContentRoot: string,
	dryRun = false
): Promise<SeedSummary> {
	const written: string[] = [];
	const skipped: string[] = [];

	await walkAndSeed(installSeedRoot, installSeedRoot, consumerContentRoot, written, skipped, dryRun);

	return { written, skipped };
}

async function walkAndSeed(
	seedRoot: string,
	currentDir: string,
	consumerContentRoot: string,
	written: string[],
	skipped: string[],
	dryRun: boolean
): Promise<void> {
	const entries = await fs.readdir(currentDir, { withFileTypes: true });

	for (const entry of entries) {
		const seedAbsolute = path.join(currentDir, entry.name);
		const relativePath = path.relative(seedRoot, seedAbsolute).split(path.sep).join("/");
		const consumerAbsolute = path.join(consumerContentRoot, relativePath);

		if (entry.isDirectory()) {
			await walkAndSeed(seedRoot, seedAbsolute, consumerContentRoot, written, skipped, dryRun);
		} else if (entry.isFile()) {
			if (await pathExists(consumerAbsolute)) {
				skipped.push(relativePath);
			} else {
				if (!dryRun) {
					await ensureDirectory(path.dirname(consumerAbsolute));
					await fs.copyFile(seedAbsolute, consumerAbsolute);
				}
				written.push(relativePath);
			}
		}
	}
}

/**
 * Guards against calling `prism:adopt` on a repo that already has a PRISM
 * baseline. If a `.sync-manifest.json` is present, the repo is already in
 * steady-state and the consumer should use `pnpm prism:update`.
 */
export async function assertConsumerIsEstablished(
	consumerContentRoot: string
): Promise<void> {
	const manifest = await loadSyncManifest(consumerContentRoot);

	if (manifest !== null) {
		throw new Error(
			"prism:adopt: this repo already has a PRISM baseline — run pnpm prism:update for steady-state."
		);
	}
}

/**
 * Orchestrates the first-contact install: seeds `.prism/` from the install
 * surface, then runs the PRISM-owned file sync (which writes the baseline
 * manifest as a byproduct via `rewriteConsumerManifest`). After this one run
 * the consumer uses `pnpm prism:update` for all future syncs.
 *
 * Refuses when a `.sync-manifest.json` already exists — that is `prism:update`
 * territory, not `prism:adopt`. The guard lives here (not only in `main()`) so
 * any caller of `runAdopt` gets the safety invariant, not just the CLI path.
 *
 * The git-repo check and config schema validation run before any write —
 * including the seed pass, which happens before `runUpdate` is even called.
 * `runUpdate` re-validates both on its own path too (so a direct `runUpdate`
 * caller is protected), but adopt's seed writes land first in this function's
 * own sequence, so adopt needs its own upfront guard rather than relying on
 * `runUpdate` to catch it later.
 *
 * `dryRun` threads through every write in the sequence — path-definitions
 * provisioning, the seed pass, and the delegated `runUpdate` — so the whole
 * `runAdopt` orchestration can be previewed with nothing written.
 */
export async function runAdopt(options: {
	prismSourceRoot: string;
	consumerRepoRoot: string;
	dryRun?: boolean;
}): Promise<AdoptSummary> {
	const { prismSourceRoot, consumerRepoRoot, dryRun = false } = options;

	const installSeedRoot = path.join(prismSourceRoot, "templates", "install", ".prism");
	const consumerContentRoot = path.join(consumerRepoRoot, ".prism");
	const prismContentRoot = path.join(prismSourceRoot, ".prism");

	const configPath = path.join(consumerRepoRoot, ".ai-skills", "config.json");
	let configExists: boolean;
	try {
		await fs.access(configPath);
		configExists = true;
	} catch {
		configExists = false;
	}

	if (!configExists) {
		throw new Error(
			"prism adopt: no .ai-skills/config.json found. Run 'npx @huntermcgrew/prism init' first to create it, then re-run adopt."
		);
	}

	assertInsideGitRepo(consumerRepoRoot);
	validateConsumerConfigAgainstSchema(consumerRepoRoot, prismSourceRoot);

	await assertConsumerIsEstablished(consumerContentRoot);

	const pathsProvisioned = await ensureConsumerPathDefinitions(
		prismSourceRoot,
		consumerRepoRoot,
		dryRun
	);

	const seed = await seedConsumerContentRoot(installSeedRoot, consumerContentRoot, dryRun);
	const update = await runUpdate({
		prismRepoRoot: prismSourceRoot,
		consumerRepoRoot,
		prismContentRoot,
		consumerContentRoot,
		dryRun,
	});

	return { pathsProvisioned, seed, update };
}

export async function runAdoptCli(): Promise<void> {
	const argv = process.argv.slice(2);
	const consumerRepoRoot = resolveConsumerRoot({
		explicitConsumer: parseConsumerFlag(argv),
		cwd: process.cwd(),
		selfPrismRoot: resolveSelfPrismSource(),
	});
	const prismRepoRoot = resolvePrismSource(argv, consumerRepoRoot);

	if (prismRepoRoot === null) {
		throw new Error(
			"prism:adopt needs a PRISM source. Pass --prism-source <path-to-prism-repo>, " +
				'or add a "prismSource" field to .ai-skills/config.json pointing at your ' +
				"local PRISM checkout."
		);
	}

	const dryRun = parseDryRunFlag(argv);

	// The manifest-exists guard lives in runAdopt so every caller is protected,
	// not just this CLI path. runAdoptCli relies on runAdopt's guard.
	const summary = await runAdopt({ prismSourceRoot: prismRepoRoot, consumerRepoRoot, dryRun });

	reportSummary(summary, dryRun);
}

function reportSummary(summary: AdoptSummary, dryRun = false): void {
	const { pathsProvisioned, seed, update } = summary;
	const prefix = dryRun ? "prism:adopt (dry run)" : "prism:adopt";

	if (pathsProvisioned === "written") {
		console.log(
			dryRun
				? `${prefix} would provision .ai-skills/definitions/paths.json (absent or incomplete).`
				: `${prefix} provisioned .ai-skills/definitions/paths.json (was absent or incomplete).`
		);
	}

	if (seed.written.length > 0) {
		console.log(
			dryRun
				? `${prefix} would seed ${seed.written.length} file(s) from install surface.`
				: `${prefix} seeded ${seed.written.length} file(s) from install surface.`
		);
	}

	if (seed.skipped.length > 0) {
		console.log(
			`${prefix} skipped ${seed.skipped.length} existing file(s) during seed.`
		);
	}

	const counts = update.outcomes.reduce<Record<string, number>>(
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
			? `${prefix} sync would apply ${parts || "no changes"}.`
			: `${prefix} sync complete — ${parts || "no changes"}.`
	);

	const deltaLine = formatVersionDeltaLine(update.versionDelta);
	if (deltaLine !== null) {
		console.log(deltaLine);
	}

	if (update.backups.length > 0) {
		console.log(
			dryRun
				? `Would preserve ${update.backups.length} diverged file(s) as .bak:`
				: `Preserved ${update.backups.length} diverged file(s) as .bak:`
		);
		for (const backup of update.backups) {
			console.log(`  ${backup}`);
		}
	}
}

const isMain =
	process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
	runAdoptCli().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	});
}
