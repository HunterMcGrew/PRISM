/**
 * Reads the `renames` table from `.ai-skills/definitions/seed-curation.json`
 * — the one place that maps a canonical path (`architect/manifest.json`) to
 * its install-seed name (`architect/manifest.stub.json`).
 *
 * `prism:build` already consumes this table on the canonical→seed direction
 * when it writes `templates/install/.prism/`. Nothing inverted it on the
 * install direction, so `prism adopt`/`prism update` copied the seed name
 * verbatim and consumers never received `manifest.json` or `SPEC.md` — see
 * plan Decision "Invert renames at install time, one table". Both
 * `adopt.ts` and `update.ts` load the same table here and invert it with
 * `invertRenames` rather than hardcoding a second copy of the two entries,
 * so the seed and install directions can never drift apart.
 */
import fs from "node:fs/promises";
import path from "node:path";

interface SeedCurationRenamesFile {
	renames?: Record<string, string>;
}

/**
 * Loads the canonical→seed `renames` map from the PRISM source's
 * `seed-curation.json`. Throws when the file is missing or malformed rather
 * than degrading to an empty map — a missing table silently reproduces the
 * exact delivery bug this module exists to fix, so callers that need the
 * renames applied (`adopt`, `update`) should surface the failure loudly, the
 * same way `prism:build`'s own curation loader does. Callers with a
 * best-effort posture (`doctor`) catch this at the call site instead.
 */
export async function loadSeedCurationRenames(
	prismSourceRoot: string
): Promise<Record<string, string>> {
	const curationPath = path.join(
		prismSourceRoot,
		".ai-skills",
		"definitions",
		"seed-curation.json"
	);

	let raw: string;
	try {
		raw = await fs.readFile(curationPath, "utf8");
	} catch {
		throw new Error(
			`Missing seed-curation.json at ${curationPath} — cannot resolve the install-seed rename table.`
		);
	}

	let parsed: SeedCurationRenamesFile;
	try {
		parsed = JSON.parse(raw) as SeedCurationRenamesFile;
	} catch (error) {
		throw new Error(
			`Invalid seed-curation.json JSON at ${curationPath}: ${error instanceof Error ? error.message : String(error)}`
		);
	}

	return parsed.renames ?? {};
}

/**
 * Inverts a canonical→seed renames map into seed→canonical — the direction
 * `adopt`/`update` need when copying seed files back onto a consumer's
 * `.prism/`. A rename table is a bijection by construction (each seed name
 * is unique), so the inversion never collides.
 */
export function invertRenames(renames: Record<string, string>): Record<string, string> {
	const inverted: Record<string, string> = {};

	for (const [canonicalPath, seedPath] of Object.entries(renames)) {
		inverted[seedPath] = canonicalPath;
	}

	return inverted;
}
