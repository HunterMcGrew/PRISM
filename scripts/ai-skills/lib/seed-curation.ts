/**
 * Reads the `renames` table from `.ai-skills/definitions/seed-curation.json`
 * — the one place that maps a canonical path (`architect/manifest.json`) to
 * its install-seed name (`architect/manifest.stub.json`).
 *
 * `prism:build` consumes this table on the canonical→seed direction when it
 * writes `templates/install/.prism/`. Both `adopt.ts` and `update.ts` load
 * the same table here and invert it with `invertRenames` rather than
 * hardcoding a second copy of the two entries — one table, read by both
 * directions.
 *
 * A `renames` entry is exempt from content comparison on its own. `prism:build`
 * skips it on the write path and checks only that the renamed seed file exists
 * on the drift path, so a renamed twin behaves like a `curated` one: its
 * content is the author's to keep in sync. That is the right default for
 * `architect/manifest.json` → `architect/manifest.stub.json`, whose seed copy
 * is a stub and is meant to differ, and the wrong one for a pair like
 * `SPEC.md` → `SPEC.md.tmpl` that is meant to track its canonical source.
 *
 * Listing the canonical path in `mirrored` as well is what turns the gate on
 * per entry: `prism:build` then writes the twin under its renamed name and
 * `prism:check` fails when the two diverge. Adding a rename is the moment to
 * decide which of the two the new pair is.
 */
import fs from "node:fs/promises";
import path from "node:path";

interface SeedCurationRenamesFile {
	renames?: Record<string, string>;
}

/**
 * Asserts `renames` is a plain object mapping strings to strings, and
 * returns it narrowed to that type. A shape mismatch here (a non-object
 * value, or a value whose entries aren't strings) would otherwise surface
 * far from its cause — a `TypeError` deep inside `walkAndSeed` — so it's
 * caught at load time instead.
 */
function validateRenamesShape(
	renames: unknown,
	curationPath: string
): Record<string, string> {
	if (renames === undefined) {
		return {};
	}

	if (typeof renames !== "object" || renames === null || Array.isArray(renames)) {
		throw new Error(
			`Invalid seed-curation.json at ${curationPath}: "renames" must be an object mapping canonical paths to seed paths.`
		);
	}

	for (const [canonicalPath, seedPath] of Object.entries(renames)) {
		if (typeof seedPath !== "string") {
			throw new Error(
				`Invalid seed-curation.json at ${curationPath}: renames["${canonicalPath}"] must be a string, got ${typeof seedPath}.`
			);
		}
	}

	return renames as Record<string, string>;
}

/**
 * Loads the canonical→seed `renames` map from the PRISM source's
 * `seed-curation.json`. Throws when the file is missing, isn't valid JSON,
 * or its `renames` value isn't a string-to-string map, rather than
 * degrading to an empty map — a missing or malformed table silently
 * reproduces the exact delivery bug this module exists to fix, so callers
 * that need the renames applied (`adopt`, `update`) should surface the
 * failure loudly, the same way `prism:build`'s own curation loader does.
 * Callers with a best-effort posture (`doctor`) catch this at the call site
 * instead.
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

	return validateRenamesShape(parsed.renames, curationPath);
}

/**
 * Inverts a canonical→seed renames map into seed→canonical — the direction
 * `adopt`/`update` need when copying seed files back onto a consumer's
 * `.prism/`. Throws if two canonical paths share a seed name, since the
 * later entry would otherwise silently overwrite the earlier one in the
 * inverted map and the dropped canonical path would never be delivered.
 */
export function invertRenames(renames: Record<string, string>): Record<string, string> {
	const inverted: Record<string, string> = {};

	for (const [canonicalPath, seedPath] of Object.entries(renames)) {
		if (seedPath in inverted) {
			throw new Error(
				`seed-curation.json renames is not one-to-one: "${seedPath}" is the seed name for both "${inverted[seedPath]}" and "${canonicalPath}".`
			);
		}
		inverted[seedPath] = canonicalPath;
	}

	return inverted;
}
