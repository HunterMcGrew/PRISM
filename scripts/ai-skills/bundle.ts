/**
 * Compiles scripts/ai-skills/cli.ts to dist/cli.js as a single self-contained
 * ESM bundle for npm distribution.
 *
 * esbuild config notes:
 * - `format: "esm"` + `platform: "node"` preserves `import.meta.url` as the
 *   runtime module URL — critical for `findPrismPackageRoot` in update.ts to
 *   resolve the correct package root when running from `node_modules`.
 * - `bundle: true` with no external overrides: Node built-ins (fs, path, etc.)
 *   are excluded automatically when `platform` is "node".
 * - `.prism/` content is NOT bundled — it is read at runtime as plain files,
 *   not imported, so it is never seen by the bundler.
 * - The source file carries a `#!/usr/bin/env -S npx tsx` shebang for local
 *   dev. esbuild preserves it as the leading comment in the bundle output, so
 *   we strip it post-build and prepend `#!/usr/bin/env node` — the correct
 *   shebang for the compiled bin.
 */
import { build } from "esbuild";
import { chmodSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../.."
);

const outfile = path.join(repoRoot, "dist/cli.js");

await build({
	entryPoints: [path.join(repoRoot, "scripts/ai-skills/cli.ts")],
	outfile,
	format: "esm",
	platform: "node",
	target: "node20",
	bundle: true,
});

// Strip any leading shebang line emitted from the source file and prepend the
// correct Node shebang. The source cli.ts carries `#!/usr/bin/env -S npx tsx`
// for local dev; the compiled bin needs `#!/usr/bin/env node`.
const content = readFileSync(outfile, "utf8");
const stripped = content.startsWith("#!")
	? content.slice(content.indexOf("\n") + 1)
	: content;
writeFileSync(outfile, `#!/usr/bin/env node\n${stripped}`, "utf8");

chmodSync(outfile, 0o755);

console.log("dist/cli.js built.");
