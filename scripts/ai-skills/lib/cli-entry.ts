import path from "node:path";

/**
 * True when the current process was launched with `entryName` as its direct
 * entry script — the standalone dev path, e.g. `tsx adopt.ts` (basename
 * `adopt`). False when this module has been folded into the `dist/cli.js`
 * esbuild bundle.
 *
 * Replaces the `fileURLToPath(import.meta.url) === path.resolve(process.argv[1])`
 * guard, which mis-fires under esbuild's ESM bundle: bundling collapses every
 * folded-in module's `import.meta.url` to the single output file's URL, so that
 * equality held for adopt/doctor/eject/update at once and ran every
 * subcommand's `main()` on any `prism` invocation. Comparing the entry
 * script's basename survives bundling — the bundle's entry basename is `cli`
 * (or the global-link symlink name), never a subcommand, so no subcommand
 * module treats itself as the entry and `cli.ts`'s `process.argv[2]` switch is
 * the sole dispatcher.
 */
export function isDirectCliEntry(entryName: string): boolean {
	const entryScript = process.argv[1];
	if (entryScript === undefined) {
		return false;
	}

	const base = path.basename(entryScript);
	const withoutExtension = base.slice(0, base.length - path.extname(base).length);

	return withoutExtension === entryName;
}
