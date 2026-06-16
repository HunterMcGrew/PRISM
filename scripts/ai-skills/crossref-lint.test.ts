/**
 * Regression suite for the prose cross-reference lint.
 *
 * Exercises `scanLines` and the exported pure helpers directly against temp
 * trees rather than calling `runCrossRefLint` — because `runCrossRefLint`
 * walks fixed scan roots, tests that need a controlled filesystem use the
 * exported pure functions instead.
 *
 * Gate test (PR #156-class catch): a doc referencing a pre-move path
 * `../architect/skills-ecosystem.md` when only
 * `../architect/_toolkit/skills-ecosystem.md` exists must produce one
 * violation; the corrected ref must pass clean.
 */
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import test from "node:test";
import assert from "node:assert/strict";

import {
	extractRefs,
	looksLikeRepoPath,
	isExternalOrToken,
	resolveRef,
	refResolves,
	scanLines,
} from "./crossref-lint";

// ---------------------------------------------------------------------------
// Test helper
// ---------------------------------------------------------------------------

/**
 * Creates a temporary directory, calls `build` to populate it, then calls
 * `check` with the temp root for assertions. Cleans up afterward.
 */
async function withTempTree(
	build: (tempRoot: string) => Promise<void>,
	check: (tempRoot: string) => Promise<void>
): Promise<void> {
	const tempRoot = await fs.mkdtemp(
		path.join(os.tmpdir(), "prism-crossref-lint-")
	);
	try {
		await build(tempRoot);
		await check(tempRoot);
	} finally {
		await fs.rm(tempRoot, { force: true, recursive: true });
	}
}

// ---------------------------------------------------------------------------
// extractRefs
// ---------------------------------------------------------------------------

test("extractRefs: extracts markdown link targets", () => {
	const refs = extractRefs("See [the roster](../architect/skills-ecosystem.md).");
	assert.deepEqual(refs, ["../architect/skills-ecosystem.md"]);
});

test("extractRefs: extracts multiple markdown links on one line", () => {
	const refs = extractRefs(
		"See [rules](.prism/rules/foo.md) and [spec](.prism/spec/bar.md)."
	);
	assert.deepEqual(refs, [".prism/rules/foo.md", ".prism/spec/bar.md"]);
});

test("extractRefs: extracts inline-code repo paths", () => {
	const refs = extractRefs("Read `.prism/rules/missing.md` for details.");
	assert.deepEqual(refs, [".prism/rules/missing.md"]);
});

test("extractRefs: does not extract non-path inline-code spans", () => {
	// No slash → looksLikeRepoPath returns false
	const refs = extractRefs("Use `const` or `let` to declare.");
	assert.deepEqual(refs, []);
});

// ---------------------------------------------------------------------------
// looksLikeRepoPath
// ---------------------------------------------------------------------------

test("looksLikeRepoPath: accepts relative paths starting with ./", () => {
	assert.equal(looksLikeRepoPath("./spec/adrs/0003.md"), true);
});

test("looksLikeRepoPath: accepts relative paths starting with ../", () => {
	assert.equal(looksLikeRepoPath("../architect/doc.md"), true);
});

test("looksLikeRepoPath: accepts known root-segment paths", () => {
	assert.equal(looksLikeRepoPath(".prism/rules/foo.md"), true);
	assert.equal(looksLikeRepoPath("templates/install/.prism/SPEC.md.tmpl"), true);
	assert.equal(looksLikeRepoPath("scripts/ai-skills/build.ts"), true);
});

test("looksLikeRepoPath: accepts paths ending in carrier extensions", () => {
	assert.equal(looksLikeRepoPath("some/path/file.md"), true);
	assert.equal(looksLikeRepoPath("some/path/file.tmpl"), true);
	assert.equal(looksLikeRepoPath("some/path/file.json"), true);
});

test("looksLikeRepoPath: rejects paths without a slash", () => {
	assert.equal(looksLikeRepoPath("README"), false);
	assert.equal(looksLikeRepoPath("AGENTS.md"), false);
});

test("looksLikeRepoPath: rejects prose with slash but no carrier extension or root", () => {
	assert.equal(looksLikeRepoPath("server/client boundary"), false);
	assert.equal(looksLikeRepoPath("and/or"), false);
});

// ---------------------------------------------------------------------------
// isExternalOrToken
// ---------------------------------------------------------------------------

test("isExternalOrToken: rejects https URLs", () => {
	assert.equal(isExternalOrToken("https://example.com/x"), true);
});

test("isExternalOrToken: rejects http URLs", () => {
	assert.equal(isExternalOrToken("http://example.com"), true);
});

test("isExternalOrToken: rejects mailto links", () => {
	assert.equal(isExternalOrToken("mailto:a@b.c"), true);
});

test("isExternalOrToken: rejects protocol-relative URLs", () => {
	assert.equal(isExternalOrToken("//cdn.example.com/file.js"), true);
});

test("isExternalOrToken: rejects template token paths", () => {
	assert.equal(isExternalOrToken("./spec/adrs/${SLUG}.md"), true);
});

test("isExternalOrToken: accepts normal repo-relative paths", () => {
	assert.equal(isExternalOrToken("../architect/doc.md"), false);
	assert.equal(isExternalOrToken(".prism/rules/foo.md"), false);
});

// ---------------------------------------------------------------------------
// resolveRef
// ---------------------------------------------------------------------------

test("resolveRef: resolves relative refs against the referencing file's dir", () => {
	const repoRootPath = "/repo";
	const refFile = "/repo/.prism/architect/doc.md";
	const resolved = resolveRef(refFile, repoRootPath, "../rules/foo.md");
	assert.equal(resolved, "/repo/.prism/rules/foo.md");
});

test("resolveRef: resolves repo-root-absolute refs (.prism/ prefix) against repo root", () => {
	const repoRootPath = "/repo";
	const refFile = "/repo/templates/install/.prism/architect/doc.md.tmpl";
	const resolved = resolveRef(refFile, repoRootPath, ".prism/rules/foo.md");
	assert.equal(resolved, "/repo/.prism/rules/foo.md");
});

test("resolveRef: strips anchor fragment before resolving", () => {
	const repoRootPath = "/repo";
	const refFile = "/repo/.prism/rules/foo.md";
	const resolved = resolveRef(refFile, repoRootPath, "../spec/bar.md#section");
	assert.equal(resolved, "/repo/.prism/spec/bar.md");
});

test("resolveRef: returns empty string for pure-anchor ref", () => {
	const repoRootPath = "/repo";
	const refFile = "/repo/.prism/rules/foo.md";
	const resolved = resolveRef(refFile, repoRootPath, "#section");
	assert.equal(resolved, "");
});

// ---------------------------------------------------------------------------
// refResolves
// ---------------------------------------------------------------------------

test("refResolves: true for a path that exists", async () => {
	await withTempTree(
		async (root) => {
			await fs.mkdir(path.join(root, "rules"), { recursive: true });
			await fs.writeFile(path.join(root, "rules", "present.md"), "# Present\n");
		},
		async (root) => {
			const result = await refResolves(path.join(root, "rules", "present.md"));
			assert.equal(result, true);
		}
	);
});

test("refResolves: false for a path that does not exist", async () => {
	await withTempTree(
		async (_root) => {
			// nothing to build
		},
		async (root) => {
			const result = await refResolves(path.join(root, "rules", "missing.md"));
			assert.equal(result, false);
		}
	);
});

test("refResolves: true when .tmpl twin exists for a .md ref", async () => {
	await withTempTree(
		async (root) => {
			await fs.mkdir(path.join(root, "spec", "adrs"), { recursive: true });
			await fs.writeFile(
				path.join(root, "spec", "adrs", "0003.md.tmpl"),
				"# ADR\n"
			);
		},
		async (root) => {
			const result = await refResolves(
				path.join(root, "spec", "adrs", "0003.md")
			);
			assert.equal(result, true);
		}
	);
});

test("refResolves: true when .md form exists for a .tmpl ref", async () => {
	await withTempTree(
		async (root) => {
			await fs.mkdir(path.join(root, "spec", "adrs"), { recursive: true });
			await fs.writeFile(path.join(root, "spec", "adrs", "0003.md"), "# ADR\n");
		},
		async (root) => {
			const result = await refResolves(
				path.join(root, "spec", "adrs", "0003.md.tmpl")
			);
			assert.equal(result, true);
		}
	);
});

// ---------------------------------------------------------------------------
// scanLines — PR #156-class catch (the gate)
// ---------------------------------------------------------------------------

test("scanLines: PR #156-class catch — stale pre-move path yields one violation", async () => {
	await withTempTree(
		async (root) => {
			// Only the _toolkit/ path exists — pre-move path does not
			await fs.mkdir(path.join(root, "architect", "_toolkit"), {
				recursive: true,
			});
			await fs.writeFile(
				path.join(root, "architect", "_toolkit", "skills-ecosystem.md"),
				"# Skills Ecosystem\n"
			);
			await fs.mkdir(path.join(root, "rules"), { recursive: true });
			await fs.writeFile(
				path.join(root, "rules", "sample.md"),
				"See [the roster](../architect/skills-ecosystem.md).\n"
			);
		},
		async (root) => {
			const refFile = path.join(root, "rules", "sample.md");
			const lines = (await fs.readFile(refFile, "utf8")).split(/\r?\n/);
			const violations = await scanLines(
				lines,
				"rules/sample.md",
				refFile,
				root
			);
			assert.equal(violations.length, 1, "stale pre-move ref must be flagged");
			assert.equal(violations[0].ref, "../architect/skills-ecosystem.md");
			assert.equal(violations[0].line, 1);
		}
	);
});

test("scanLines: PR #156-class catch — corrected ref passes clean", async () => {
	await withTempTree(
		async (root) => {
			await fs.mkdir(path.join(root, "architect", "_toolkit"), {
				recursive: true,
			});
			await fs.writeFile(
				path.join(root, "architect", "_toolkit", "skills-ecosystem.md"),
				"# Skills Ecosystem\n"
			);
			await fs.mkdir(path.join(root, "rules"), { recursive: true });
			await fs.writeFile(
				path.join(root, "rules", "sample.md"),
				"See [the roster](../architect/_toolkit/skills-ecosystem.md).\n"
			);
		},
		async (root) => {
			const refFile = path.join(root, "rules", "sample.md");
			const lines = (await fs.readFile(refFile, "utf8")).split(/\r?\n/);
			const violations = await scanLines(
				lines,
				"rules/sample.md",
				refFile,
				root
			);
			assert.equal(violations.length, 0, "corrected ref must pass clean");
		}
	);
});

// ---------------------------------------------------------------------------
// scanLines — fenced code blocks skipped
// ---------------------------------------------------------------------------

test("scanLines: stale ref inside a fenced code block yields zero violations", async () => {
	await withTempTree(
		async (root) => {
			// No files created — the ref must not be checked
			await fs.mkdir(path.join(root, "rules"), { recursive: true });
			await fs.writeFile(
				path.join(root, "rules", "doc.md"),
				"# Doc\n\n```\nSee [old](../architect/skills-ecosystem.md).\n```\n"
			);
		},
		async (root) => {
			const refFile = path.join(root, "rules", "doc.md");
			const lines = (await fs.readFile(refFile, "utf8")).split(/\r?\n/);
			const violations = await scanLines(
				lines,
				"rules/doc.md",
				refFile,
				root
			);
			assert.equal(
				violations.length,
				0,
				"fenced example must not be flagged"
			);
		}
	);
});

// ---------------------------------------------------------------------------
// scanLines — externals and anchors skipped
// ---------------------------------------------------------------------------

test("scanLines: external https URL yields zero violations", async () => {
	await withTempTree(
		async (root) => {
			await fs.mkdir(path.join(root, "rules"), { recursive: true });
			await fs.writeFile(
				path.join(root, "rules", "doc.md"),
				"[docs](https://example.com/x)\n"
			);
		},
		async (root) => {
			const refFile = path.join(root, "rules", "doc.md");
			const lines = (await fs.readFile(refFile, "utf8")).split(/\r?\n/);
			const violations = await scanLines(
				lines,
				"rules/doc.md",
				refFile,
				root
			);
			assert.equal(violations.length, 0);
		}
	);
});

test("scanLines: mailto link yields zero violations", async () => {
	await withTempTree(
		async (root) => {
			await fs.mkdir(path.join(root, "rules"), { recursive: true });
			await fs.writeFile(
				path.join(root, "rules", "doc.md"),
				"[mail](mailto:a@b.c)\n"
			);
		},
		async (root) => {
			const refFile = path.join(root, "rules", "doc.md");
			const lines = (await fs.readFile(refFile, "utf8")).split(/\r?\n/);
			const violations = await scanLines(
				lines,
				"rules/doc.md",
				refFile,
				root
			);
			assert.equal(violations.length, 0);
		}
	);
});

test("scanLines: anchor-only ref yields zero violations", async () => {
	await withTempTree(
		async (root) => {
			await fs.mkdir(path.join(root, "rules"), { recursive: true });
			await fs.writeFile(
				path.join(root, "rules", "doc.md"),
				"[jump](#section)\n"
			);
		},
		async (root) => {
			const refFile = path.join(root, "rules", "doc.md");
			const lines = (await fs.readFile(refFile, "utf8")).split(/\r?\n/);
			const violations = await scanLines(
				lines,
				"rules/doc.md",
				refFile,
				root
			);
			assert.equal(violations.length, 0);
		}
	);
});

// ---------------------------------------------------------------------------
// scanLines — token literal skipped
// ---------------------------------------------------------------------------

test("scanLines: template token path yields zero violations", async () => {
	await withTempTree(
		async (root) => {
			await fs.mkdir(path.join(root, "rules"), { recursive: true });
			await fs.writeFile(
				path.join(root, "rules", "doc.md"),
				"[adr](./spec/adrs/${SLUG}.md)\n"
			);
		},
		async (root) => {
			const refFile = path.join(root, "rules", "doc.md");
			const lines = (await fs.readFile(refFile, "utf8")).split(/\r?\n/);
			const violations = await scanLines(
				lines,
				"rules/doc.md",
				refFile,
				root
			);
			assert.equal(violations.length, 0);
		}
	);
});

// ---------------------------------------------------------------------------
// scanLines — inline-code repo path resolved
// ---------------------------------------------------------------------------

test("scanLines: missing inline-code repo path yields one violation", async () => {
	await withTempTree(
		async (root) => {
			// .prism/rules/missing.md is NOT created
			await fs.mkdir(path.join(root, "rules"), { recursive: true });
			await fs.writeFile(
				path.join(root, "rules", "doc.md"),
				"Read `.prism/rules/missing.md` for details.\n"
			);
		},
		async (root) => {
			const refFile = path.join(root, "rules", "doc.md");
			const lines = (await fs.readFile(refFile, "utf8")).split(/\r?\n/);
			// Point repoRoot at the temp tree so the .prism/ prefix resolves there
			const violations = await scanLines(
				lines,
				"rules/doc.md",
				refFile,
				root
			);
			assert.equal(violations.length, 1, "missing inline-code ref must be flagged");
			assert.equal(violations[0].ref, ".prism/rules/missing.md");
		}
	);
});

test("scanLines: present inline-code repo path yields zero violations", async () => {
	await withTempTree(
		async (root) => {
			await fs.mkdir(path.join(root, ".prism", "rules"), { recursive: true });
			await fs.writeFile(
				path.join(root, ".prism", "rules", "present.md"),
				"# Present\n"
			);
			await fs.mkdir(path.join(root, "rules"), { recursive: true });
			await fs.writeFile(
				path.join(root, "rules", "doc.md"),
				"Read `.prism/rules/present.md` for details.\n"
			);
		},
		async (root) => {
			const refFile = path.join(root, "rules", "doc.md");
			const lines = (await fs.readFile(refFile, "utf8")).split(/\r?\n/);
			const violations = await scanLines(
				lines,
				"rules/doc.md",
				refFile,
				root
			);
			assert.equal(violations.length, 0);
		}
	);
});

// ---------------------------------------------------------------------------
// scanLines — non-path slash prose not flagged
// ---------------------------------------------------------------------------

test("scanLines: prose with slash but no carrier ext or root is not flagged", async () => {
	await withTempTree(
		async (root) => {
			await fs.mkdir(path.join(root, "rules"), { recursive: true });
			await fs.writeFile(
				path.join(root, "rules", "doc.md"),
				"This is the server/client boundary and/or the line.\n"
			);
		},
		async (root) => {
			const refFile = path.join(root, "rules", "doc.md");
			const lines = (await fs.readFile(refFile, "utf8")).split(/\r?\n/);
			const violations = await scanLines(
				lines,
				"rules/doc.md",
				refFile,
				root
			);
			assert.equal(violations.length, 0);
		}
	);
});

// ---------------------------------------------------------------------------
// scanLines — .tmpl twin fallback
// ---------------------------------------------------------------------------

test("scanLines: ref to .md resolves when only .md.tmpl exists", async () => {
	await withTempTree(
		async (root) => {
			await fs.mkdir(path.join(root, "spec", "adrs"), { recursive: true });
			// Only the .tmpl twin exists, not the .md
			await fs.writeFile(
				path.join(root, "spec", "adrs", "0003.md.tmpl"),
				"# ADR\n"
			);
			await fs.mkdir(path.join(root, "rules"), { recursive: true });
			await fs.writeFile(
				path.join(root, "rules", "doc.md"),
				"See [ADR-0003](../spec/adrs/0003.md).\n"
			);
		},
		async (root) => {
			const refFile = path.join(root, "rules", "doc.md");
			const lines = (await fs.readFile(refFile, "utf8")).split(/\r?\n/);
			const violations = await scanLines(
				lines,
				"rules/doc.md",
				refFile,
				root
			);
			assert.equal(
				violations.length,
				0,
				"ref to .md resolves when .tmpl twin exists"
			);
		}
	);
});

// ---------------------------------------------------------------------------
// scanLines — allowlist
// ---------------------------------------------------------------------------

test("scanLines: allowlisted (file, ref) pair is not flagged", async () => {
	await withTempTree(
		async (root) => {
			// Missing file — would be a violation without allowlist
			await fs.mkdir(path.join(root, "rules"), { recursive: true });
			await fs.writeFile(
				path.join(root, "rules", "doc.md"),
				"See [old](../architect/skills-ecosystem.md).\n"
			);
		},
		async (root) => {
			const refFile = path.join(root, "rules", "doc.md");
			const lines = (await fs.readFile(refFile, "utf8")).split(/\r?\n/);
			const customAllowlist = new Set([
				"rules/doc.md::../architect/skills-ecosystem.md",
			]);
			const violations = await scanLines(
				lines,
				"rules/doc.md",
				refFile,
				root,
				customAllowlist
			);
			assert.equal(
				violations.length,
				0,
				"allowlisted (file, ref) pair must not be flagged"
			);
		}
	);
});
