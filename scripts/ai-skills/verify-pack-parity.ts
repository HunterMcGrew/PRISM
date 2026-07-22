#!/usr/bin/env tsx
/**
 * Packaging-parity gate: asserts every path the CLI reads from the PRISM
 * package at runtime is present in the published tarball. Closes the class of
 * bug where a file is git-tracked and read at runtime but omitted from the
 * `files` allowlist (config.schema.json shipped broken in 0.7.1 this way).
 *
 * v1: a hand-maintained list of runtime-read paths, checked against
 * `npm pack --dry-run --json`. Unit tests can't catch this class — they read
 * the source tree, not the tarball. Keep RUNTIME_READ_PATHS in sync when a new
 * runtime read of a packaged file is added.
 */
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface RuntimeReadPath {
	path: string;
	reader: string;
	kind: "file" | "prefix";
}

/** Each entry is a path (file) or path prefix (directory) the CLI reads from
 * the package root at runtime. Comment names the runtime reader. */
const RUNTIME_READ_PATHS: RuntimeReadPath[] = [
	{ path: "dist/cli.js", reader: "package.json bin \"prism\" — the published entry point", kind: "file" },
	{ path: ".ai-skills/config.schema.json", reader: "config-schema-validate.ts loadConfigSchema", kind: "file" },
	{ path: ".ai-skills/definitions/paths.json", reader: "utils.ts ensureConsumerPathDefinitions / resolveRunPathDefinitions", kind: "file" },
	{ path: ".ai-skills/definitions/roles.json", reader: "update.ts refreshPlatformSkills", kind: "file" },
	{ path: "templates/install/.prism", reader: "adopt/update consumer content root (resolvePrismContentRoot)", kind: "prefix" },
	{ path: ".ai-skills/skills", reader: "update.ts refreshPlatformSkills sourceSkillsRoot", kind: "prefix" },
];

/**
 * Pure set-difference: which `requiredPaths` are absent from `packedPaths`.
 * Extracted from `main()` so the parity logic is unit-testable without
 * shelling out to `npm pack` — see plan bug-adopt-missing-schema task 14.
 */
export function findMissingRuntimeReadPaths(
	packedPaths: string[],
	requiredPaths: RuntimeReadPath[]
): RuntimeReadPath[] {
	const packed = new Set(packedPaths);

	return requiredPaths.filter((req) =>
		req.kind === "file"
			? !packed.has(req.path)
			: !packedPaths.some((p) => p === req.path || p.startsWith(`${req.path}/`))
	);
}

async function main(): Promise<void> {
	// Windows resolves `npm` to `npm.cmd`, which execFile cannot spawn directly
	// (no shell involved) — shell: true routes through cmd.exe there while
	// staying a plain execFile on macOS/Linux. Args are a static literal array,
	// not user input, so shell interpolation has no injection surface here.
	const { stdout } = await execFileAsync("npm", ["pack", "--dry-run", "--json"], { shell: true });
	// npm runs `prepare` and `prepack` before packing, and their stdout (e.g.
	// "dist/cli.js built.") lands ahead of npm's own JSON on the same stream —
	// `--ignore-scripts` does not suppress this for `npm pack` on npm 10. The
	// JSON array is always the trailing well-formed block, so slice from its
	// opening bracket rather than parsing the raw capture.
	const parsed = JSON.parse(stdout.slice(stdout.indexOf("["))) as { files: { path: string }[] }[];
	const packedList = [...new Set(parsed.flatMap((entry) => entry.files.map((f) => f.path)))];

	const missing = findMissingRuntimeReadPaths(packedList, RUNTIME_READ_PATHS);

	if (missing.length > 0) {
		for (const req of missing) {
			console.error(
				`verify-pack-parity: runtime-read ${req.kind} "${req.path}" is missing from the tarball (read by ${req.reader}). Add it to package.json "files".`
			);
		}
		console.error(
			`verify-pack-parity: ${missing.length} runtime-read path(s) not published — see above.`
		);
		process.exit(1);
	}

	console.log(`verify-pack-parity: all ${RUNTIME_READ_PATHS.length} runtime-read path(s) present in the tarball.`);
}

const isMain =
	process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
	main().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	});
}
