/**
 * Coverage for the `.prism/custom` overlay platform-copy pass (Phase 4).
 *
 * The overlay reuses the base content-copy pipeline with a `custom/` subpath, so
 * these tests drive `syncAllPlatformContentCopies` with `targetSubpath = "custom"`
 * and assert the three platform dialects, the per-subdir marker, token
 * substitution, and that overlay cleanup stays scoped to its own tree — a base
 * pass never deletes overlay files and an overlay pass never deletes base files.
 */
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import test from "node:test";
import assert from "node:assert/strict";

import { syncAllPlatformContentCopies } from "./build";
import {
	codexRuleDialect,
	cursorRuleDialect,
	type RuleDialect,
	verbatimRuleDialect,
} from "./rule-dialect";
import { MANAGED_MARKER } from "./utils";

const OVERLAY_SUBPATH = "custom";

interface OverlayRoots {
	baseContentRoot: string;
	overlayContentRoot: string;
	claudeDir: string;
	cursorDir: string;
	codexDir: string;
}

function platformDirs(roots: OverlayRoots): { dir: string; dialect: RuleDialect }[] {
	return [
		{ dir: roots.claudeDir, dialect: verbatimRuleDialect },
		{ dir: roots.codexDir, dialect: codexRuleDialect },
		{ dir: roots.cursorDir, dialect: cursorRuleDialect },
	];
}

async function withOverlayRoots(
	body: (roots: OverlayRoots) => Promise<void>
): Promise<void> {
	const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "prism-overlay-"));
	const roots: OverlayRoots = {
		baseContentRoot: path.join(tempRoot, "prism"),
		overlayContentRoot: path.join(tempRoot, "prism", "custom"),
		claudeDir: path.join(tempRoot, ".claude"),
		cursorDir: path.join(tempRoot, ".cursor"),
		codexDir: path.join(tempRoot, ".codex"),
	};
	await fs.mkdir(roots.overlayContentRoot, { recursive: true });
	try {
		await body(roots);
	} finally {
		await fs.rm(tempRoot, { force: true, recursive: true });
	}
}

async function writeOverlayRule(
	roots: OverlayRoots,
	filename: string,
	content: string
): Promise<void> {
	const rulesDir = path.join(roots.overlayContentRoot, "rules");
	await fs.mkdir(rulesDir, { recursive: true });
	await fs.writeFile(path.join(rulesDir, filename), content, "utf8");
}

async function runOverlayPass(
	roots: OverlayRoots,
	tokenMap: Map<string, string> = new Map()
): Promise<void> {
	await syncAllPlatformContentCopies(
		roots.overlayContentRoot,
		platformDirs(roots),
		false,
		[],
		tokenMap,
		OVERLAY_SUBPATH
	);
}

async function exists(target: string): Promise<boolean> {
	try {
		await fs.access(target);

		return true;
	} catch {
		return false;
	}
}

test("overlay rule copies verbatim into .claude/rules/custom", async () => {
	await withOverlayRoots(async (roots) => {
		await writeOverlayRule(roots, "team.md", "# Team rule\n\nFollow the team convention.\n");

		await runOverlayPass(roots);

		const copied = await fs.readFile(
			path.join(roots.claudeDir, "rules", "custom", "team.md"),
			"utf8"
		);
		assert.equal(copied, "# Team rule\n\nFollow the team convention.\n");
	});
});

test("overlay rule copies verbatim into .codex/rules/custom", async () => {
	await withOverlayRoots(async (roots) => {
		await writeOverlayRule(roots, "team.md", "# Team rule\n\nNo paths frontmatter here.\n");

		await runOverlayPass(roots);

		const copied = await fs.readFile(
			path.join(roots.codexDir, "rules", "custom", "team.md"),
			"utf8"
		);
		assert.equal(copied, "# Team rule\n\nNo paths frontmatter here.\n");
	});
});

test("overlay rule is dialect-translated into .cursor/rules/custom/*.mdc", async () => {
	await withOverlayRoots(async (roots) => {
		await writeOverlayRule(
			roots,
			"scoped.md",
			'---\npaths:\n  - "**/*.tsx"\n---\n\n# Scoped overlay rule\n'
		);

		await runOverlayPass(roots);

		const mdcPath = path.join(roots.cursorDir, "rules", "custom", "scoped.mdc");
		const mdc = await fs.readFile(mdcPath, "utf8");
		assert.match(mdc, /globs:/);
		assert.doesNotMatch(mdc, /paths:/);

		const verbatimMd = path.join(roots.cursorDir, "rules", "custom", "scoped.md");
		assert.equal(await exists(verbatimMd), false, "no verbatim .md alongside the .mdc");
	});
});

test("overlay marker lands at the custom/ subdir root, not the area root", async () => {
	await withOverlayRoots(async (roots) => {
		await writeOverlayRule(roots, "team.md", "# Team rule\n");

		await runOverlayPass(roots);

		const overlayMarker = path.join(
			roots.claudeDir,
			"rules",
			"custom",
			MANAGED_MARKER
		);
		assert.equal(await exists(overlayMarker), true, "marker at custom/ subdir root");

		const baseMarker = path.join(roots.claudeDir, "rules", MANAGED_MARKER);
		assert.equal(
			await exists(baseMarker),
			false,
			"overlay pass writes no marker at the base area root"
		);
	});
});

test("overlay token substitution applies — overlay rules can use team tokens", async () => {
	await withOverlayRoots(async (roots) => {
		await writeOverlayRule(roots, "org.md", "# ${ORG_NAME} rule\n");

		await runOverlayPass(roots, new Map([["ORG_NAME", "Acme"]]));

		const copied = await fs.readFile(
			path.join(roots.claudeDir, "rules", "custom", "org.md"),
			"utf8"
		);
		assert.equal(copied, "# Acme rule\n");
	});
});

test("overlay cleanup removes an orphaned overlay copy without touching base files", async () => {
	await withOverlayRoots(async (roots) => {
		// Seed a base copy directly so we can prove the overlay cleanup leaves it
		// alone. The base file has no canonical source in the overlay tree, so a
		// cross-scoped cleanup would wrongly treat it as an orphan.
		const baseRulesDir = path.join(roots.claudeDir, "rules");
		await fs.mkdir(baseRulesDir, { recursive: true });
		await fs.writeFile(path.join(baseRulesDir, "base.md"), "# Base rule\n", "utf8");
		await fs.writeFile(
			path.join(baseRulesDir, MANAGED_MARKER),
			"Managed by scripts/ai-skills/build.ts\n",
			"utf8"
		);

		await writeOverlayRule(roots, "team.md", "# Team rule\n");
		await writeOverlayRule(roots, "stale.md", "# Stale overlay rule\n");
		await runOverlayPass(roots);

		// Remove one overlay source, then re-run: only that overlay copy should go.
		await fs.rm(path.join(roots.overlayContentRoot, "rules", "stale.md"));
		await runOverlayPass(roots);

		const overlayCustomDir = path.join(roots.claudeDir, "rules", "custom");
		assert.equal(
			await exists(path.join(overlayCustomDir, "stale.md")),
			false,
			"orphaned overlay copy removed"
		);
		assert.equal(
			await exists(path.join(overlayCustomDir, "team.md")),
			true,
			"live overlay copy preserved"
		);
		assert.equal(
			await exists(path.join(baseRulesDir, "base.md")),
			true,
			"base file untouched by overlay cleanup"
		);
	});
});

test("base cleanup does not wholesale-remove an area whose overlay subtree is still managed", async () => {
	await withOverlayRoots(async (roots) => {
		// Seed a base rules source and run the base pass so the area dir and its
		// marker exist on the platform side.
		const baseRulesSrc = path.join(roots.baseContentRoot, "rules");
		await fs.mkdir(baseRulesSrc, { recursive: true });
		await fs.writeFile(path.join(baseRulesSrc, "base.md"), "# Base rule\n", "utf8");
		await syncAllPlatformContentCopies(
			roots.baseContentRoot,
			platformDirs(roots),
			false,
			[],
			new Map()
		);

		// Run the overlay pass so the custom/ subdir and its marker are in place.
		await writeOverlayRule(roots, "team.md", "# Team rule\n");
		await runOverlayPass(roots);

		// Remove the base rules source entirely — the area no longer exists in the
		// base content tree, which is the trigger for the wholesale-removal branch.
		await fs.rm(baseRulesSrc, { force: true, recursive: true });

		// Re-run the base pass. Guard 2 detects the overlay marker and skips the
		// wholesale area removal, preserving the custom/ subtree.
		await syncAllPlatformContentCopies(
			roots.baseContentRoot,
			platformDirs(roots),
			false,
			[],
			new Map()
		);

		const overlayCopy = path.join(roots.claudeDir, "rules", "custom", "team.md");
		assert.equal(await exists(overlayCopy), true, "overlay copy survives base wholesale-removal guard");

		const overlayMarker = path.join(roots.claudeDir, "rules", "custom", MANAGED_MARKER);
		assert.equal(await exists(overlayMarker), true, "overlay marker survives base wholesale-removal guard");
	});
});

test("base cleanup leaves the overlay custom/ subtree untouched", async () => {
	await withOverlayRoots(async (roots) => {
		// Base canonical source: one rule. Overlay source: one rule.
		const baseRulesSrc = path.join(roots.baseContentRoot, "rules");
		await fs.mkdir(baseRulesSrc, { recursive: true });
		await fs.writeFile(path.join(baseRulesSrc, "base.md"), "# Base rule\n", "utf8");
		await writeOverlayRule(roots, "team.md", "# Team rule\n");

		// Base pass then overlay pass — the order update.ts uses.
		await syncAllPlatformContentCopies(
			roots.baseContentRoot,
			platformDirs(roots),
			false,
			[],
			new Map()
		);
		await runOverlayPass(roots);

		// Re-run the base pass. Its orphan-cleanup walk reaches the area dir and
		// must skip the overlay's custom/ subtree rather than deleting it.
		await syncAllPlatformContentCopies(
			roots.baseContentRoot,
			platformDirs(roots),
			false,
			[],
			new Map()
		);

		const overlayCopy = path.join(roots.claudeDir, "rules", "custom", "team.md");
		assert.equal(
			await exists(overlayCopy),
			true,
			"base cleanup did not delete the overlay copy"
		);
		const overlayMarker = path.join(
			roots.claudeDir,
			"rules",
			"custom",
			MANAGED_MARKER
		);
		assert.equal(
			await exists(overlayMarker),
			true,
			"base cleanup did not delete the overlay marker"
		);
		const baseCopy = path.join(roots.claudeDir, "rules", "base.md");
		assert.equal(await exists(baseCopy), true, "base copy still present");
	});
});
