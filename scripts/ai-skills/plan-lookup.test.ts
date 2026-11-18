/**
 * Suite for the plan lookup: name tiers, the ticket-field scan, the latest-stage
 * file of a plan folder, and the separate archive search.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";

import { findArchivedPlan, resolvePlan } from "./hooks/plan/lookup.mjs";

const LIVE = ".prism/plans";
const ARCHIVE = ".prism/archived/plans";

let repoRoot: string;

beforeEach(() => {
	repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "plan-lookup-"));
});

afterEach(() => {
	fs.rmSync(repoRoot, { recursive: true, force: true });
});

function writeFile(relativePath: string, text = ""): void {
	const filePath = path.join(repoRoot, ...relativePath.split("/"));

	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, text);
}

function folder(kind: "folder" | "epic-folder", name: string, file: string, root = LIVE) {
	return { kind, dir: `${root}/${name}`, file: `${root}/${name}/${file}` };
}

function flat(kind: "flat" | "epic-flat", name: string, root = LIVE) {
	return { kind, dir: null, file: `${root}/${name}` };
}

describe("resolvePlan by name", () => {
	test("finds a folder plan", () => {
		writeFile(`${LIVE}/acme-1/intent.md`);

		assert.deepEqual(
			resolvePlan(repoRoot, "acme-1"),
			folder("folder", "acme-1", "intent.md")
		);
	});

	for (const chainFile of ["design.md", "spec.md", "plan.md"]) {
		test(`counts a folder holding only ${chainFile} as a plan folder`, () => {
			writeFile(`${LIVE}/acme-1/${chainFile}`);

			assert.deepEqual(
				resolvePlan(repoRoot, "acme-1"),
				folder("folder", "acme-1", chainFile)
			);
		});
	}

	test("finds a flat plan", () => {
		writeFile(`${LIVE}/acme-2.md`);

		assert.deepEqual(resolvePlan(repoRoot, "acme-2"), flat("flat", "acme-2.md"));
	});

	test("prefers the folder over a flat plan with the same ID", () => {
		writeFile(`${LIVE}/acme-1/plan.md`);
		writeFile(`${LIVE}/acme-1.md`);

		assert.deepEqual(
			resolvePlan(repoRoot, "acme-1"),
			folder("folder", "acme-1", "plan.md")
		);
	});

	test("skips a same-named file where the folder would be", () => {
		writeFile(`${LIVE}/acme-30`);
		writeFile(`${LIVE}/acme-30.md`);

		assert.deepEqual(resolvePlan(repoRoot, "acme-30"), flat("flat", "acme-30.md"));
	});

	test("skips a same-named folder with no chain file and falls through to the flat plan", () => {
		writeFile(`${LIVE}/acme-9/notes.md`);
		writeFile(`${LIVE}/acme-9.md`);

		assert.deepEqual(resolvePlan(repoRoot, "acme-9"), flat("flat", "acme-9.md"));
	});

	test("finds an epic folder", () => {
		writeFile(`${LIVE}/epic-acme-3/spec.md`);

		assert.deepEqual(
			resolvePlan(repoRoot, "acme-3"),
			folder("epic-folder", "epic-acme-3", "spec.md")
		);
	});

	test("finds a flat epic plan", () => {
		writeFile(`${LIVE}/epic-acme-4.md`);

		assert.deepEqual(
			resolvePlan(repoRoot, "acme-4"),
			flat("epic-flat", "epic-acme-4.md")
		);
	});

	test("prefers a flat plan over an epic folder for the same ID", () => {
		writeFile(`${LIVE}/acme-5.md`);
		writeFile(`${LIVE}/epic-acme-5/intent.md`);

		assert.deepEqual(resolvePlan(repoRoot, "acme-5"), flat("flat", "acme-5.md"));
	});

	test("matches the ticket ID in any case", () => {
		writeFile(`${LIVE}/acme-6/intent.md`);

		assert.deepEqual(
			resolvePlan(repoRoot, "ACME-6"),
			folder("folder", "acme-6", "intent.md")
		);
	});
});

describe("resolvePlan folders", () => {
	test("a folder holding only intent.md resolves ahead of a flat plan", () => {
		writeFile(`${LIVE}/acme-1/intent.md`);
		writeFile(`${LIVE}/acme-1.md`);

		assert.equal(resolvePlan(repoRoot, "acme-1")?.file, `${LIVE}/acme-1/intent.md`);
	});

	test("a folder with intent.md and spec.md resolves to spec.md", () => {
		writeFile(`${LIVE}/acme-1/intent.md`);
		writeFile(`${LIVE}/acme-1/spec.md`);

		assert.equal(resolvePlan(repoRoot, "acme-1")?.file, `${LIVE}/acme-1/spec.md`);
	});

	test("a folder resolves to the latest stage it holds", () => {
		for (const name of ["intent.md", "design.md", "spec.md", "plan.md"]) {
			writeFile(`${LIVE}/acme-1/${name}`);
		}

		assert.equal(resolvePlan(repoRoot, "acme-1")?.file, `${LIVE}/acme-1/plan.md`);
	});

	test("an epic folder with intent.md and spec.md gives kind epic-folder and spec.md", () => {
		writeFile(`${LIVE}/epic-acme-2/intent.md`);
		writeFile(`${LIVE}/epic-acme-2/spec.md`);

		assert.deepEqual(
			resolvePlan(repoRoot, "acme-2"),
			folder("epic-folder", "epic-acme-2", "spec.md")
		);
	});

	test("a folder holding only notes.md does not resolve", () => {
		writeFile(`${LIVE}/acme-1/notes.md`);

		assert.equal(resolvePlan(repoRoot, "acme-1"), null);
	});
});

describe("resolvePlan by ticket field", () => {
	test("finds a folder by the ticket line in its intent frontmatter", () => {
		writeFile(`${LIVE}/some-slug/intent.md`, "---\ntitle: Work\nticket: ACME-7\n---\n");

		assert.deepEqual(
			resolvePlan(repoRoot, "acme-7"),
			folder("folder", "some-slug", "intent.md")
		);
	});

	test("finds a folder by the ticket line of a CRLF intent", () => {
		writeFile(
			`${LIVE}/some-slug/intent.md`,
			"---\r\ntitle: Work\r\nticket: ACME-7\r\n---\r\n"
		);

		assert.equal(resolvePlan(repoRoot, "acme-7")?.dir, `${LIVE}/some-slug`);
	});

	test("finds a folder by the ticket line in its plan.md frontmatter", () => {
		writeFile(`${LIVE}/some-slug/plan.md`, "---\nticket: ACME-7\n---\n");

		assert.deepEqual(
			resolvePlan(repoRoot, "acme-7"),
			folder("folder", "some-slug", "plan.md")
		);
	});

	test("reports a ticket-field match in an epic-named folder as an epic folder", () => {
		writeFile(`${LIVE}/epic-launch/intent.md`, "---\nticket: ACME-8\n---\n");

		assert.deepEqual(
			resolvePlan(repoRoot, "acme-8"),
			folder("epic-folder", "epic-launch", "intent.md")
		);
	});

	test("ignores a ticket line outside the frontmatter", () => {
		writeFile(`${LIVE}/some-slug/intent.md`, "---\ntitle: Work\n---\n\nticket: ACME-7\n");

		assert.equal(resolvePlan(repoRoot, "acme-7"), null);
	});

	test("does not match a ticket URL that carries no ticket ID", () => {
		writeFile(
			`${LIVE}/some-slug/intent.md`,
			"---\nticket: https://example.test/issues/1\n---\n"
		);

		assert.equal(resolvePlan(repoRoot, "acme-1"), null);
	});

	test("finds a flat plan by its ## Ticket section", () => {
		writeFile(
			`${LIVE}/chore-cleanup.md`,
			"# Plan\n\n## Ticket\n\nhttps://tracker.example.test/issue/ACME-10\n"
		);

		assert.deepEqual(
			resolvePlan(repoRoot, "acme-10"),
			flat("flat", "chore-cleanup.md")
		);
	});

	test("reports a ## Ticket match in an epic-named flat file as a flat epic plan", () => {
		writeFile(`${LIVE}/epic-launch.md`, "## Ticket\n\nACME-11\n");

		assert.deepEqual(
			resolvePlan(repoRoot, "acme-11"),
			flat("epic-flat", "epic-launch.md")
		);
	});

	test("ignores the ticket ID outside the ## Ticket section", () => {
		writeFile(
			`${LIVE}/chore-cleanup.md`,
			"## Ticket\n\nACME-12\n\n## Goal\n\nFollows up ACME-13.\n"
		);

		assert.equal(resolvePlan(repoRoot, "acme-13"), null);
	});

	test("does not match an ID that only prefixes a longer one", () => {
		writeFile(`${LIVE}/chore-cleanup.md`, "## Ticket\n\nACME-140\n");
		writeFile(`${LIVE}/some-slug/intent.md`, "---\nticket: ACME-140\n---\n");

		assert.equal(resolvePlan(repoRoot, "acme-14"), null);
	});

	test("acme-7 does not match acme-70 in either scan form", () => {
		writeFile(`${LIVE}/flat-one.md`, "## Ticket\n\nACME-70\n");
		writeFile(`${LIVE}/folder-one/plan.md`, "---\nticket: ACME-70\n---\n");

		assert.equal(resolvePlan(repoRoot, "acme-7"), null);
		assert.notEqual(resolvePlan(repoRoot, "acme-70"), null);
	});

	test("prefers a name match over a ticket-field match", () => {
		writeFile(`${LIVE}/acme-15.md`);
		writeFile(`${LIVE}/aaa-slug/intent.md`, "---\nticket: ACME-15\n---\n");

		assert.deepEqual(resolvePlan(repoRoot, "acme-15"), flat("flat", "acme-15.md"));
	});
});

describe("the archive", () => {
	test("resolvePlan never returns a path under the archive", () => {
		writeFile(`${ARCHIVE}/acme-20/plan.md`);
		writeFile(`${ARCHIVE}/old-name.md`, "## Ticket\n\nACME-21\n");

		assert.equal(resolvePlan(repoRoot, "acme-20"), null);
		assert.equal(resolvePlan(repoRoot, "acme-21"), null);
	});

	test("findArchivedPlan finds an archived folder", () => {
		writeFile(`${ARCHIVE}/acme-20/plan.md`);

		assert.deepEqual(
			findArchivedPlan(repoRoot, "acme-20"),
			folder("folder", "acme-20", "plan.md", ARCHIVE)
		);
	});

	test("findArchivedPlan finds an archived flat plan, by name and by ticket field", () => {
		writeFile(`${ARCHIVE}/acme-22.md`);
		writeFile(`${ARCHIVE}/old-name.md`, "## Ticket\n\nACME-21\n");

		assert.deepEqual(
			findArchivedPlan(repoRoot, "acme-22"),
			flat("flat", "acme-22.md", ARCHIVE)
		);
		assert.deepEqual(
			findArchivedPlan(repoRoot, "acme-21"),
			flat("flat", "old-name.md", ARCHIVE)
		);
	});

	test("findArchivedPlan never returns a live plan", () => {
		writeFile(`${LIVE}/acme-23.md`);

		assert.equal(findArchivedPlan(repoRoot, "acme-23"), null);
	});

	test("findArchivedPlan rejects a value that is not a ticket ID", () => {
		assert.throws(() => findArchivedPlan(repoRoot, "../x-1"), TypeError);
	});
});

describe("resolvePlan misses", () => {
	test("never resolves a non-plan folder such as audits/", () => {
		writeFile(`${LIVE}/audits/acme-9.md`, "## Ticket\n\nACME-9\n");
		writeFile(`${LIVE}/audits/notes.md`, "---\nticket: ACME-9\n---\n");

		assert.equal(resolvePlan(repoRoot, "acme-9"), null);
	});

	test("returns null when no plan matches", () => {
		writeFile(`${LIVE}/acme-1.md`);

		assert.equal(resolvePlan(repoRoot, "acme-99"), null);
	});

	test("returns null when the plans directory is missing", () => {
		assert.equal(resolvePlan(repoRoot, "acme-1"), null);
	});

	test("returns null when .prism/plans is a file", () => {
		writeFile(LIVE, "not a directory");

		assert.equal(resolvePlan(repoRoot, "acme-1"), null);
	});

	test(
		"throws when the plans directory can't be read, rather than reporting no plan",
		{
			skip:
				(process.platform === "win32" && "chmod does not restrict reads on Windows") ||
				(process.getuid?.() === 0 && "root reads any directory"),
		},
		() => {
			const plansDir = path.join(repoRoot, ...LIVE.split("/"));
			fs.mkdirSync(plansDir, { recursive: true });
			fs.chmodSync(plansDir, 0o000);

			try {
				assert.throws(() => resolvePlan(repoRoot, "acme-1"), /EACCES/);
			} finally {
				fs.chmodSync(plansDir, 0o755);
			}
		}
	);

	test("throws on a value that is not a ticket ID", () => {
		assert.throws(() => resolvePlan(repoRoot, "../x-1"), TypeError);
		assert.throws(() => resolvePlan(repoRoot, "epic-acme-1"), TypeError);
	});
});
