/**
 * Coverage for the ship-surface closure check.
 *
 * Every case runs against a fixture tree rather than the real repo, so a
 * legitimate change to PRISM's own curation never turns these red. The two
 * failure directions and the clean control are the point: a closure check
 * that only proves the clean case passes cannot tell a trimmed seed from a
 * broken one.
 *
 * `trackedDanglingRefs` is passed empty everywhere — the real tracked set is a
 * pending-fix list, and a test that inherited it would assert the tracking
 * rather than the check.
 */
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import test from "node:test";
import assert from "node:assert/strict";

import { computeShipClosure, formatShipClosureReport, resolveDefaultRoots } from "./ship-closure";

const NO_TRACKED_REFS: ReadonlySet<string> = new Set();

async function writeFixtureFile(root: string, relativePath: string, content: string): Promise<void> {
	const absolutePath = path.join(root, relativePath);
	await fs.mkdir(path.dirname(absolutePath), { recursive: true });
	await fs.writeFile(absolutePath, content, "utf8");
}

/**
 * Builds a temp repo whose ship surface is a single rule file, then hands the
 * root to `body`. `files` is written verbatim, repo-root-relative.
 */
async function withFixtureRepo(
	files: Record<string, string>,
	body: (repoRoot: string) => Promise<void>
): Promise<void> {
	const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "prism-ship-closure-"));

	try {
		for (const [relativePath, content] of Object.entries(files)) {
			await writeFixtureFile(repoRoot, relativePath, content);
		}

		await body(repoRoot);
	} finally {
		await fs.rm(repoRoot, { force: true, recursive: true });
	}
}

const ROOTS = [".prism/rules"];

test("a shipped file referencing an excluded file is reported", async () => {
	await withFixtureRepo(
		{
			".prism/rules/entry.md": "See [the note](.prism/references/note.md).\n",
			".prism/references/note.md": "# Note\n",
		},
		async (repoRoot) => {
			const report = await computeShipClosure({
				repoRoot,
				roots: ROOTS,
				curation: { excluded: ["references/note.md"] },
				trackedDanglingRefs: NO_TRACKED_REFS,
			});

			assert.deepEqual(report.shippedButExcluded, ["references/note.md"]);
			assert.deepEqual(report.shippableOutsideClosure, []);
		}
	);
});

test("a shippable file nothing on the ship surface reaches is reported", async () => {
	await withFixtureRepo(
		{
			".prism/rules/entry.md": "# Entry\n",
			".prism/references/stranded.md": "# Stranded\n",
		},
		async (repoRoot) => {
			const report = await computeShipClosure({
				repoRoot,
				roots: ROOTS,
				curation: { excluded: [] },
				trackedDanglingRefs: NO_TRACKED_REFS,
			});

			assert.deepEqual(report.shippableOutsideClosure, ["references/stranded.md"]);
			assert.deepEqual(report.shippedButExcluded, []);
		}
	);
});

test("a seed whose shippable set is exactly the closure reports nothing", async () => {
	await withFixtureRepo(
		{
			".prism/rules/entry.md": "See [the note](.prism/references/note.md).\n",
			".prism/references/note.md": "Onward to [more](.prism/references/more.md).\n",
			".prism/references/more.md": "# More\n",
			".prism/references/stranded.md": "# Stranded\n",
		},
		async (repoRoot) => {
			const report = await computeShipClosure({
				repoRoot,
				roots: ROOTS,
				curation: { excluded: ["references/stranded.md"] },
				trackedDanglingRefs: NO_TRACKED_REFS,
			});

			assert.deepEqual(report.shippedButExcluded, []);
			assert.deepEqual(report.shippableOutsideClosure, []);
			assert.deepEqual(report.staleTrackedRefs, []);
			assert.match(formatShipClosureReport(report), /closure holds/);
		}
	);
});

test("references are followed transitively, not one hop deep", async () => {
	await withFixtureRepo(
		{
			".prism/rules/entry.md": "See [one](.prism/references/one.md).\n",
			".prism/references/one.md": "See [two](.prism/references/two.md).\n",
			".prism/references/two.md": "See [three](.prism/references/three.md).\n",
			".prism/references/three.md": "# Three\n",
		},
		async (repoRoot) => {
			const report = await computeShipClosure({
				repoRoot,
				roots: ROOTS,
				curation: { excluded: [] },
				trackedDanglingRefs: NO_TRACKED_REFS,
			});

			assert.deepEqual(report.shippableOutsideClosure, []);
		}
	);
});

test("an excluded file's own references stay off the ship surface", async () => {
	await withFixtureRepo(
		{
			".prism/rules/entry.md": "See [the note](.prism/references/note.md).\n",
			".prism/references/note.md": "See [downstream](.prism/references/downstream.md).\n",
			".prism/references/downstream.md": "# Downstream\n",
		},
		async (repoRoot) => {
			const report = await computeShipClosure({
				repoRoot,
				roots: ROOTS,
				curation: { excluded: ["references/note.md", "references/downstream.md"] },
				trackedDanglingRefs: NO_TRACKED_REFS,
			});

			assert.deepEqual(
				report.shippedButExcluded,
				["references/note.md"],
				"only the reference the ship surface itself makes is a violation"
			);
		}
	);
});

test("a startup read written with the <repo-root>/ prefix keeps its target on the ship surface", async () => {
	await withFixtureRepo(
		{
			".prism/rules/entry.md": "Read `<repo-root>/.prism/references/plan-lookup.md` and execute it.\n",
			".prism/references/plan-lookup.md": "# Plan lookup\n",
		},
		async (repoRoot) => {
			const report = await computeShipClosure({
				repoRoot,
				roots: ROOTS,
				curation: { excluded: [] },
				trackedDanglingRefs: NO_TRACKED_REFS,
			});

			assert.deepEqual(report.shippableOutsideClosure, []);
		}
	);
});

test("a curated file is scanned as its seed twin, not as its canonical source", async () => {
	await withFixtureRepo(
		{
			".prism/rules/entry.md": "See [internal](.prism/references/internal.md).\n",
			"templates/install/.prism/rules/entry.md": "# Entry\n",
			".prism/references/internal.md": "# Internal\n",
		},
		async (repoRoot) => {
			const report = await computeShipClosure({
				repoRoot,
				roots: ROOTS,
				curation: { excluded: ["references/internal.md"], curated: ["rules/entry.md"] },
				trackedDanglingRefs: NO_TRACKED_REFS,
			});

			assert.deepEqual(
				report.shippedButExcluded,
				[],
				"the twin consumers receive carries no link to the excluded file"
			);
		}
	);
});

test("a tracked dangling reference the closure no longer reaches is reported as stale", async () => {
	await withFixtureRepo(
		{
			".prism/rules/entry.md": "# Entry\n",
			".prism/references/note.md": "# Note\n",
		},
		async (repoRoot) => {
			const report = await computeShipClosure({
				repoRoot,
				roots: ROOTS,
				curation: { excluded: ["references/note.md"] },
				trackedDanglingRefs: new Set(["references/note.md"]),
			});

			assert.deepEqual(report.staleTrackedRefs, ["references/note.md"]);
			assert.match(formatShipClosureReport(report), /no longer reached/);
		}
	);
});

test("a tracked dangling reference the closure still reaches is suppressed, not reported in either direction", async () => {
	await withFixtureRepo(
		{
			".prism/rules/entry.md": "See [the note](.prism/references/note.md).\n",
			".prism/references/note.md": "# Note\n",
		},
		async (repoRoot) => {
			const report = await computeShipClosure({
				repoRoot,
				roots: ROOTS,
				curation: { excluded: ["references/note.md"] },
				trackedDanglingRefs: new Set(["references/note.md"]),
			});

			assert.deepEqual(report.shippedButExcluded, []);
			assert.deepEqual(report.staleTrackedRefs, []);
			assert.match(formatShipClosureReport(report), /closure holds/);
		}
	);
});

test("a relative sibling link is followed, so the sibling it names is not dead weight", async () => {
	await withFixtureRepo(
		{
			".prism/rules/entry.md": "See [the sibling](./sibling.md).\n",
			".prism/rules/sibling.md": "# Sibling\n",
			".prism/rules/unlinked.md": "# Unlinked\n",
		},
		async (repoRoot) => {
			const report = await computeShipClosure({
				repoRoot,
				roots: [".prism/rules/entry.md"],
				curation: { excluded: [] },
				trackedDanglingRefs: NO_TRACKED_REFS,
			});

			assert.deepEqual(
				report.shippableOutsideClosure,
				["rules/unlinked.md"],
				"the sibling is reached through the relative link; only the unlinked file is dead weight"
			);
			assert.deepEqual(report.shippedButExcluded, []);
		}
	);
});

/**
 * A fixture pair of shipped routing tables: the consumer stub and the
 * toolkit's base table, each routing one distinct architect doc.
 */
const STUB_MANIFEST_PATH = "templates/install/.prism/architect/manifest.stub.json";
const BASE_MANIFEST_PATH = ".prism/architect/_toolkit/manifest.base.json";

test("both shipped routing tables seed the closure, so neither routed doc is dead weight", async () => {
	await withFixtureRepo(
		{
			[STUB_MANIFEST_PATH]: JSON.stringify({ "src/**": "stub-routed.md" }),
			[BASE_MANIFEST_PATH]: JSON.stringify({ "lib/**": "base-routed.md" }),
			".prism/architect/stub-routed.md": "# Stub routed\n",
			".prism/architect/base-routed.md": "# Base routed\n",
		},
		async (repoRoot) => {
			const report = await computeShipClosure({
				repoRoot,
				curation: { excluded: [] },
				trackedDanglingRefs: NO_TRACKED_REFS,
			});

			assert.deepEqual(report.shippableOutsideClosure, []);
			assert.deepEqual(report.shippedButExcluded, []);
		}
	);
});

test("a routing table left out of the roots strands the doc it routes to", async () => {
	await withFixtureRepo(
		{
			[STUB_MANIFEST_PATH]: JSON.stringify({ "src/**": "stub-routed.md" }),
			".prism/architect/stub-routed.md": "# Stub routed\n",
			".prism/architect/base-routed.md": "# Base routed\n",
		},
		async (repoRoot) => {
			const report = await computeShipClosure({
				repoRoot,
				curation: { excluded: [] },
				trackedDanglingRefs: NO_TRACKED_REFS,
			});

			assert.deepEqual(
				report.shippableOutsideClosure,
				["architect/base-routed.md"],
				"the base table is absent, so nothing reaches the doc it would have routed"
			);
		}
	);
});

test("a manifest key is a match pattern, not a closure root", async () => {
	await withFixtureRepo(
		{
			[STUB_MANIFEST_PATH]: JSON.stringify({ "docs/": "routed.md" }),
			".prism/architect/routed.md": "# Routed\n",
			"docs/site.md": "See [the note](.prism/references/note.md).\n",
			".prism/references/note.md": "# Note\n",
		},
		async (repoRoot) => {
			const roots = await resolveDefaultRoots(repoRoot);
			assert.ok(
				!roots.includes("docs/"),
				"a key names the paths that trigger a doc load, not content an install contains"
			);

			const report = await computeShipClosure({
				repoRoot,
				curation: { excluded: ["references/note.md"] },
				trackedDanglingRefs: NO_TRACKED_REFS,
			});

			assert.deepEqual(
				report.shippedButExcluded,
				[],
				"the documentation site is not shipped, so its links are not ship-surface references"
			);
		}
	);
});

test("every prism-* skill directory on disk is a root, and nothing else under skills is", async () => {
	await withFixtureRepo(
		{
			".ai-skills/skills/prism-code-dev/SKILL.md": "# Clove\n",
			".ai-skills/skills/other-tool/SKILL.md": "# Not a persona\n",
		},
		async (repoRoot) => {
			const roots = await resolveDefaultRoots(repoRoot);

			assert.ok(roots.includes(".ai-skills/skills/prism-code-dev"));
			assert.ok(!roots.includes(".ai-skills/skills/other-tool"));
		}
	);
});
