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

import { loadSyncManifest } from "./sync-manifest";
import { resolvePrismSource, runUpdate, type UpdateSummary } from "./update";
import { ensureDirectory, pathExists } from "./utils";

export interface SeedSummary {
	written: string[];
	skipped: string[];
}

export interface AdoptSummary {
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
 */
export async function seedConsumerContentRoot(
	installSeedRoot: string,
	consumerContentRoot: string
): Promise<SeedSummary> {
	const written: string[] = [];
	const skipped: string[] = [];

	await walkAndSeed(installSeedRoot, installSeedRoot, consumerContentRoot, written, skipped);

	return { written, skipped };
}

async function walkAndSeed(
	seedRoot: string,
	currentDir: string,
	consumerContentRoot: string,
	written: string[],
	skipped: string[]
): Promise<void> {
	const entries = await fs.readdir(currentDir, { withFileTypes: true });

	for (const entry of entries) {
		const seedAbsolute = path.join(currentDir, entry.name);
		const relativePath = path.relative(seedRoot, seedAbsolute).split(path.sep).join("/");
		const consumerAbsolute = path.join(consumerContentRoot, relativePath);

		if (entry.isDirectory()) {
			await walkAndSeed(seedRoot, seedAbsolute, consumerContentRoot, written, skipped);
		} else if (entry.isFile()) {
			if (await pathExists(consumerAbsolute)) {
				skipped.push(relativePath);
			} else {
				await ensureDirectory(path.dirname(consumerAbsolute));
				await fs.copyFile(seedAbsolute, consumerAbsolute);
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
 */
export async function runAdopt(options: {
	prismSourceRoot: string;
	consumerRepoRoot: string;
}): Promise<AdoptSummary> {
	const { prismSourceRoot, consumerRepoRoot } = options;

	const installSeedRoot = path.join(prismSourceRoot, "templates", "install", ".prism");
	const consumerContentRoot = path.join(consumerRepoRoot, ".prism");
	const prismContentRoot = path.join(prismSourceRoot, ".prism");

	await assertConsumerIsEstablished(consumerContentRoot);

	const seed = await seedConsumerContentRoot(installSeedRoot, consumerContentRoot);
	const update = await runUpdate({ prismContentRoot, consumerContentRoot });

	return { seed, update };
}

async function main(): Promise<void> {
	const consumerRepoRoot = process.cwd();
	const prismRepoRoot = resolvePrismSource(process.argv.slice(2), consumerRepoRoot);

	if (prismRepoRoot === null) {
		throw new Error(
			"prism:adopt needs a PRISM source. Pass --prism-source <path-to-prism-repo>, " +
				'or add a "prismSource" field to .ai-skills/config.json pointing at your ' +
				"local PRISM checkout."
		);
	}

	// The manifest-exists guard lives in runAdopt so every caller is protected,
	// not just this CLI path. main() relies on runAdopt's guard.
	const summary = await runAdopt({ prismSourceRoot: prismRepoRoot, consumerRepoRoot });

	reportSummary(summary);
}

function reportSummary(summary: AdoptSummary): void {
	const { seed, update } = summary;

	if (seed.written.length > 0) {
		console.log(`prism:adopt seeded ${seed.written.length} file(s) from install surface.`);
	}

	if (seed.skipped.length > 0) {
		console.log(
			`prism:adopt skipped ${seed.skipped.length} existing file(s) during seed.`
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
	console.log(`prism:adopt sync complete — ${parts || "no changes"}.`);

	if (update.backups.length > 0) {
		console.log(
			`Preserved ${update.backups.length} diverged file(s) as .bak:`
		);
		for (const backup of update.backups) {
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
