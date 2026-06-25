/**
 * Regression suite for the prose cross-reference lint.
 *
 * Exercises `scanLines` and the exported pure helpers directly against temp
 * trees rather than calling `runCrossRefLint` — because `runCrossRefLint`
 * walks fixed scan roots, tests that need a controlled filesystem use the
 * exported pure functions instead.
 *
 * Gate test (PR #156-class catch): a doc with a repo-root-absolute backtick
 * ref `.prism/architect/skills-ecosystem.md` (pre-move path) when only
 * `.prism/architect/_toolkit/skills-ecosystem.md` exists must produce one
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
	isLazyOrHistoricalTarget,
	resolveRef,
	refResolves,
	resolveGitignored,
	scanLines,
	scanFileForAdrRefs,
	runInstallAdrGate,
	isInstallAdrAllowlisted,
	INSTALL_ADR_MACHINERY_ALLOWLIST,
	scanFileForRelativeLinks,
	runInstallRelativeLinkGate,
	isInstallRelativeLinkAllowlisted,
	INSTALL_RELATIVE_LINK_PRE_L10_ALLOWLIST,
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

test("scanLines: PR #156-class catch — stale repo-root-absolute pre-move ref yields one violation", async () => {
	await withTempTree(
		async (root) => {
			// Only the _toolkit/ path exists in the temp tree — pre-move path does not
			await fs.mkdir(
				path.join(root, ".prism", "architect", "_toolkit"),
				{ recursive: true }
			);
			await fs.writeFile(
				path.join(root, ".prism", "architect", "_toolkit", "skills-ecosystem.md"),
				"# Skills Ecosystem\n"
			);
			await fs.mkdir(path.join(root, ".prism", "rules"), { recursive: true });
			await fs.writeFile(
				path.join(root, ".prism", "rules", "sample.md"),
				"Read `.prism/architect/skills-ecosystem.md` for the roster.\n"
			);
		},
		async (root) => {
			const refFile = path.join(root, ".prism", "rules", "sample.md");
			const lines = (await fs.readFile(refFile, "utf8")).split(/\r?\n/);
			const violations = await scanLines(
				lines,
				".prism/rules/sample.md",
				refFile,
				root
			);
			assert.equal(violations.length, 1, "stale pre-move repo-root-absolute ref must be flagged");
			assert.equal(violations[0].ref, ".prism/architect/skills-ecosystem.md");
			assert.equal(violations[0].line, 1);
		}
	);
});

test("scanLines: PR #156-class catch — corrected repo-root-absolute ref passes clean", async () => {
	await withTempTree(
		async (root) => {
			await fs.mkdir(
				path.join(root, ".prism", "architect", "_toolkit"),
				{ recursive: true }
			);
			await fs.writeFile(
				path.join(root, ".prism", "architect", "_toolkit", "skills-ecosystem.md"),
				"# Skills Ecosystem\n"
			);
			await fs.mkdir(path.join(root, ".prism", "rules"), { recursive: true });
			await fs.writeFile(
				path.join(root, ".prism", "rules", "sample.md"),
				"Read `.prism/architect/_toolkit/skills-ecosystem.md` for the roster.\n"
			);
		},
		async (root) => {
			const refFile = path.join(root, ".prism", "rules", "sample.md");
			const lines = (await fs.readFile(refFile, "utf8")).split(/\r?\n/);
			const violations = await scanLines(
				lines,
				".prism/rules/sample.md",
				refFile,
				root
			);
			assert.equal(violations.length, 0, "corrected repo-root-absolute ref must pass clean");
		}
	);
});

// ---------------------------------------------------------------------------
// scanLines — relative and non-verifiable-surface refs are skipped (REQ-10)
// ---------------------------------------------------------------------------

test("scanLines: relative link is not resolved or flagged", async () => {
	await withTempTree(
		async (root) => {
			// The target does NOT exist — if resolved it would be a violation
			await fs.mkdir(path.join(root, ".prism", "rules"), { recursive: true });
			await fs.writeFile(
				path.join(root, ".prism", "rules", "doc.md"),
				"See [the skill](../skills/prism-architect/SKILL.md).\n"
			);
		},
		async (root) => {
			const refFile = path.join(root, ".prism", "rules", "doc.md");
			const lines = (await fs.readFile(refFile, "utf8")).split(/\r?\n/);
			const violations = await scanLines(
				lines,
				".prism/rules/doc.md",
				refFile,
				root
			);
			assert.equal(
				violations.length,
				0,
				"relative link must not be resolved or flagged"
			);
		}
	);
});

test("scanLines: .claude/ ref is not resolved or flagged", async () => {
	await withTempTree(
		async (root) => {
			await fs.mkdir(path.join(root, ".prism", "rules"), { recursive: true });
			await fs.writeFile(
				path.join(root, ".prism", "rules", "doc.md"),
				"See [the skill](.claude/skills/prism-architect/SKILL.md).\n"
			);
		},
		async (root) => {
			const refFile = path.join(root, ".prism", "rules", "doc.md");
			const lines = (await fs.readFile(refFile, "utf8")).split(/\r?\n/);
			const violations = await scanLines(
				lines,
				".prism/rules/doc.md",
				refFile,
				root
			);
			assert.equal(
				violations.length,
				0,
				".claude/ ref must not be resolved or flagged"
			);
		}
	);
});

test("scanLines: docs/ ref is not resolved or flagged", async () => {
	await withTempTree(
		async (root) => {
			await fs.mkdir(path.join(root, ".prism", "rules"), { recursive: true });
			await fs.writeFile(
				path.join(root, ".prism", "rules", "doc.md"),
				"See [docs](docs/content/dev/architecture/plugin-management.md).\n"
			);
		},
		async (root) => {
			const refFile = path.join(root, ".prism", "rules", "doc.md");
			const lines = (await fs.readFile(refFile, "utf8")).split(/\r?\n/);
			const violations = await scanLines(
				lines,
				".prism/rules/doc.md",
				refFile,
				root
			);
			assert.equal(violations.length, 0, "docs/ ref must not be resolved or flagged");
		}
	);
});

test("scanLines: .github/ ref is not resolved or flagged", async () => {
	await withTempTree(
		async (root) => {
			await fs.mkdir(path.join(root, ".prism", "rules"), { recursive: true });
			await fs.writeFile(
				path.join(root, ".prism", "rules", "doc.md"),
				"See [template](.github/pull_request_template.md).\n"
			);
		},
		async (root) => {
			const refFile = path.join(root, ".prism", "rules", "doc.md");
			const lines = (await fs.readFile(refFile, "utf8")).split(/\r?\n/);
			const violations = await scanLines(
				lines,
				".prism/rules/doc.md",
				refFile,
				root
			);
			assert.equal(violations.length, 0, ".github/ ref must not be resolved or flagged");
		}
	);
});

// ---------------------------------------------------------------------------
// scanLines — lazy-artifact and historical targets skipped (REQ-11)
// ---------------------------------------------------------------------------

test("isLazyOrHistoricalTarget: state json files match", () => {
	assert.equal(isLazyOrHistoricalTarget(".prism/sasha-state.json"), true);
	assert.equal(isLazyOrHistoricalTarget(".prism/ren-state.json"), true);
	assert.equal(isLazyOrHistoricalTarget(".prism/theo-state.json.tmp"), true);
});

test("isLazyOrHistoricalTarget: ai-skills registry matches", () => {
	assert.equal(
		isLazyOrHistoricalTarget(".ai-skills/registry/onboarding-state.json"),
		true
	);
});

test("isLazyOrHistoricalTarget: lessons-archive matches", () => {
	assert.equal(
		isLazyOrHistoricalTarget(".prism/archived/lessons-archive.md"),
		true
	);
});

test("isLazyOrHistoricalTarget: prism/plans/ matches", () => {
	assert.equal(
		isLazyOrHistoricalTarget(".prism/plans/old-plan.md"),
		true
	);
});

test("isLazyOrHistoricalTarget: normal prism paths do not match", () => {
	assert.equal(
		isLazyOrHistoricalTarget(".prism/rules/code-standards.md"),
		false
	);
	assert.equal(
		isLazyOrHistoricalTarget(".prism/architect/_toolkit/install-layout.md"),
		false
	);
});

test("scanLines: lazy-artifact state json ref is not flagged", async () => {
	await withTempTree(
		async (root) => {
			await fs.mkdir(path.join(root, ".prism", "rules"), { recursive: true });
			await fs.writeFile(
				path.join(root, ".prism", "rules", "doc.md"),
				"See `.prism/sasha-state.json` for state.\n"
			);
		},
		async (root) => {
			const refFile = path.join(root, ".prism", "rules", "doc.md");
			const lines = (await fs.readFile(refFile, "utf8")).split(/\r?\n/);
			const violations = await scanLines(
				lines,
				".prism/rules/doc.md",
				refFile,
				root
			);
			assert.equal(violations.length, 0, "lazy state-json ref must not be flagged");
		}
	);
});

test("scanLines: plans/ historical ref is not flagged", async () => {
	await withTempTree(
		async (root) => {
			await fs.mkdir(path.join(root, ".prism", "rules"), { recursive: true });
			await fs.writeFile(
				path.join(root, ".prism", "rules", "doc.md"),
				"See `.prism/plans/old-plan.md` for context.\n"
			);
		},
		async (root) => {
			const refFile = path.join(root, ".prism", "rules", "doc.md");
			const lines = (await fs.readFile(refFile, "utf8")).split(/\r?\n/);
			const violations = await scanLines(
				lines,
				".prism/rules/doc.md",
				refFile,
				root
			);
			assert.equal(violations.length, 0, "plans/ historical ref must not be flagged");
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

test("scanLines: repo-root-absolute ref to .md resolves when only .md.tmpl exists", async () => {
	await withTempTree(
		async (root) => {
			// Only the .tmpl twin exists under templates/ — not the .md
			await fs.mkdir(
				path.join(root, "templates", "install", ".prism", "spec", "adrs"),
				{ recursive: true }
			);
			await fs.writeFile(
				path.join(root, "templates", "install", ".prism", "spec", "adrs", "0003.md.tmpl"),
				"# ADR\n"
			);
			await fs.mkdir(path.join(root, ".prism", "rules"), { recursive: true });
			await fs.writeFile(
				path.join(root, ".prism", "rules", "doc.md"),
				"See `templates/install/.prism/spec/adrs/0003.md`.\n"
			);
		},
		async (root) => {
			const refFile = path.join(root, ".prism", "rules", "doc.md");
			const lines = (await fs.readFile(refFile, "utf8")).split(/\r?\n/);
			const violations = await scanLines(
				lines,
				".prism/rules/doc.md",
				refFile,
				root
			);
			assert.equal(
				violations.length,
				0,
				"repo-root-absolute ref to .md resolves when .tmpl twin exists"
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
			// .prism/rules/security.md is missing — would be a violation without allowlist
			await fs.mkdir(path.join(root, ".prism", "rules"), { recursive: true });
			await fs.writeFile(
				path.join(root, ".prism", "rules", "doc.md"),
				"See `.prism/rules/security.md` for generated security rules.\n"
			);
		},
		async (root) => {
			const refFile = path.join(root, ".prism", "rules", "doc.md");
			const lines = (await fs.readFile(refFile, "utf8")).split(/\r?\n/);
			const customAllowlist = new Set([
				".prism/rules/doc.md::.prism/rules/security.md",
			]);
			const violations = await scanLines(
				lines,
				".prism/rules/doc.md",
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

// ---------------------------------------------------------------------------
// resolveGitignored — helper contract
// ---------------------------------------------------------------------------

test("resolveGitignored: returns empty Set for empty candidate list without throwing", async () => {
	// A git repo is not required for the empty-input fast path
	const result = await resolveGitignored([], "/tmp");
	assert.ok(result instanceof Set);
	assert.equal(result.size, 0);
});

test("resolveGitignored: returns empty Set when zero candidates match gitignore", async () => {
	await withTempTree(
		async (root) => {
			// Initialize a git repo with a .gitignore that does not match our candidate
			await fs.writeFile(path.join(root, ".gitignore"), "unrelated.json\n");
			const { execFileSync } = await import("node:child_process");
			execFileSync("git", ["init"], { cwd: root });
		},
		async (root) => {
			const result = await resolveGitignored(
				[".prism/rules/code-standards.md"],
				root
			);
			assert.equal(result.size, 0, "non-ignored path must not appear in the Set");
		}
	);
});

test("resolveGitignored: returns ignored paths and excludes non-ignored ones", async () => {
	await withTempTree(
		async (root) => {
			await fs.writeFile(path.join(root, ".gitignore"), ".prism/.sync-manifest.json\n");
			const { execFileSync } = await import("node:child_process");
			execFileSync("git", ["init"], { cwd: root });
		},
		async (root) => {
			const result = await resolveGitignored(
				[".prism/.sync-manifest.json", ".prism/rules/code-standards.md"],
				root
			);
			assert.ok(
				result.has(".prism/.sync-manifest.json"),
				"ignored path must be in the returned Set"
			);
			assert.ok(
				!result.has(".prism/rules/code-standards.md"),
				"non-ignored path must not be in the returned Set"
			);
		}
	);
});

test("resolveGitignored: returns empty Set without throwing when git is unavailable (fail-open)", async () => {
	// A temp dir with no git init — git check-ignore exits 128 (not a git repo).
	// The fail-open branch must return an empty Set rather than throwing.
	await withTempTree(
		async (_root) => {
			// Intentionally no git init — the directory is not a git repo
		},
		async (root) => {
			const result = await resolveGitignored(
				[".prism/.sync-manifest.json"],
				root
			);
			assert.ok(result instanceof Set, "result must be a Set");
			assert.equal(
				result.size,
				0,
				"fail-open branch must return an empty Set without throwing"
			);
		}
	);
});

// ---------------------------------------------------------------------------
// scanLines — gitignore gate
// ---------------------------------------------------------------------------

test("scanLines: gitignored absent ref yields zero violations", async () => {
	// Core regression test: a gitignored path that does not exist on disk must
	// not be flagged when the caller passes it in gitignoredSet.
	await withTempTree(
		async (root) => {
			await fs.mkdir(path.join(root, ".prism", "rules"), { recursive: true });
			await fs.writeFile(
				path.join(root, ".prism", "rules", "doc.md"),
				"See `.prism/.sync-manifest.json` for the sync state.\n"
			);
			// .prism/.sync-manifest.json intentionally NOT created on disk
		},
		async (root) => {
			const refFile = path.join(root, ".prism", "rules", "doc.md");
			const lines = (await fs.readFile(refFile, "utf8")).split(/\r?\n/);
			const gitignoredSet = new Set([".prism/.sync-manifest.json"]);
			const violations = await scanLines(
				lines,
				".prism/rules/doc.md",
				refFile,
				root,
				new Set(),
				gitignoredSet
			);
			assert.equal(
				violations.length,
				0,
				"gitignored absent ref must not be flagged"
			);
		}
	);
});

test("scanLines: non-ignored absent ref still yields one violation", async () => {
	// Proves the gitignore gate does not blanket-suppress real dangling refs.
	await withTempTree(
		async (root) => {
			await fs.mkdir(path.join(root, ".prism", "rules"), { recursive: true });
			await fs.writeFile(
				path.join(root, ".prism", "rules", "doc.md"),
				"See `.prism/rules/ghost.md` for details.\n"
			);
			// .prism/rules/ghost.md intentionally NOT created on disk
		},
		async (root) => {
			const refFile = path.join(root, ".prism", "rules", "doc.md");
			const lines = (await fs.readFile(refFile, "utf8")).split(/\r?\n/);
			// Empty gitignoredSet — ghost.md is not gitignored
			const violations = await scanLines(
				lines,
				".prism/rules/doc.md",
				refFile,
				root,
				new Set(),
				new Set()
			);
			assert.equal(
				violations.length,
				1,
				"non-ignored absent ref must still be flagged"
			);
			assert.equal(violations[0].ref, ".prism/rules/ghost.md");
		}
	);
});

// ---------------------------------------------------------------------------
// resolveGitignored — git glob matching flows through
// ---------------------------------------------------------------------------

test("resolveGitignored: glob pattern in .gitignore matches candidate", async () => {
	await withTempTree(
		async (root) => {
			await fs.writeFile(path.join(root, ".gitignore"), "foo.*.json\n");
			const { execFileSync } = await import("node:child_process");
			execFileSync("git", ["init"], { cwd: root });
		},
		async (root) => {
			const result = await resolveGitignored(["foo.1.json"], root);
			assert.ok(
				result.has("foo.1.json"),
				"glob-matched gitignored path must be in the returned Set"
			);
		}
	);
});

// ---------------------------------------------------------------------------
// scanFileForAdrRefs — ADR gate unit tests
// ---------------------------------------------------------------------------

test("scanFileForAdrRefs: detects bare ADR-NNNN reference", () => {
	const lines = ["See ADR-0018 for context."];
	const violations = scanFileForAdrRefs(lines, "templates/install/.prism/rules/doc.md");
	assert.equal(violations.length, 1);
	assert.equal(violations[0].match, "ADR-0018");
	assert.equal(violations[0].line, 1);
});

test("scanFileForAdrRefs: detects ADR reference inside a markdown hyperlink", () => {
	const lines = ["Read [ADR-0047](../spec/adrs/_toolkit/0047-plans-are-preserved-at-close.md)."];
	const violations = scanFileForAdrRefs(lines, "templates/install/.prism/rules/doc.md");
	assert.equal(violations.length, 1);
	assert.equal(violations[0].match, "ADR-0047");
});

test("scanFileForAdrRefs: detects multiple ADR references on one line", () => {
	const lines = ["ADR-0015 and ADR-0016 govern this rule."];
	const violations = scanFileForAdrRefs(lines, "templates/install/.prism/rules/doc.md");
	assert.equal(violations.length, 2);
	assert.equal(violations[0].match, "ADR-0015");
	assert.equal(violations[1].match, "ADR-0016");
});

test("scanFileForAdrRefs: does NOT flag placeholder form ADR-NNNN (letters, not digits)", () => {
	const lines = ["File an ADR per ADR-NNNN naming."];
	const violations = scanFileForAdrRefs(lines, "templates/install/.prism/spec/adrs/_toolkit/TEMPLATE.md");
	assert.equal(violations.length, 0, "ADR-NNNN placeholder must not be flagged");
});

test("scanFileForAdrRefs: skips fenced code block content", () => {
	const lines = [
		"Normal prose.",
		"```",
		"See ADR-0018 inside fence.",
		"```",
		"End.",
	];
	const violations = scanFileForAdrRefs(lines, "templates/install/.prism/rules/doc.md");
	assert.equal(violations.length, 0, "ADR ref inside fenced code block must not be flagged");
});

test("scanFileForAdrRefs: detects ADR reference outside fence, not inside", () => {
	const lines = [
		"ADR-0001 in prose.",
		"```",
		"ADR-0002 in fence.",
		"```",
		"ADR-0003 in prose again.",
	];
	const violations = scanFileForAdrRefs(lines, "templates/install/.prism/rules/doc.md");
	assert.equal(violations.length, 2, "only prose ADR refs must be flagged");
	assert.equal(violations[0].match, "ADR-0001");
	assert.equal(violations[1].match, "ADR-0003");
});

test("scanFileForAdrRefs: returns empty array when no ADR refs present", () => {
	const lines = ["This doc has no ADR citations.", "Just plain prose."];
	const violations = scanFileForAdrRefs(lines, "templates/install/.prism/rules/doc.md");
	assert.equal(violations.length, 0);
});

// ---------------------------------------------------------------------------
// isInstallAdrAllowlisted — allowlist predicate
// ---------------------------------------------------------------------------

test("isInstallAdrAllowlisted: machinery files are allowlisted", () => {
	for (const path_ of INSTALL_ADR_MACHINERY_ALLOWLIST) {
		assert.equal(
			isInstallAdrAllowlisted(path_),
			true,
			`${path_} must be allowlisted as machinery`
		);
	}
});

test("isInstallAdrAllowlisted: non-machinery rule file is not allowlisted", () => {
	// Use a made-up path not in the machinery allowlist
	assert.equal(
		isInstallAdrAllowlisted("templates/install/.prism/rules/a-brand-new-rule.md"),
		false
	);
});

test("isInstallAdrAllowlisted: install rule files are not in the machinery allowlist", () => {
	// Rule files are not machinery — only TEMPLATE.md and triple-gated-adr-criterion.md qualify
	assert.equal(
		isInstallAdrAllowlisted("templates/install/.prism/rules/branch-plan.md"),
		false
	);
});

// ---------------------------------------------------------------------------
// runInstallAdrGate — integration: planted ADR link fails; allowlisted file passes
// ---------------------------------------------------------------------------

test("runInstallAdrGate: planted ADR reference under templates/install/ fails the gate", async () => {
	await withTempTree(
		async (root) => {
			// Create a minimal install surface with a rule that mentions ADR-0018
			await fs.mkdir(
				path.join(root, "templates", "install", ".prism", "rules"),
				{ recursive: true }
			);
			await fs.writeFile(
				path.join(root, "templates", "install", ".prism", "rules", "planted.md"),
				"See ADR-0018 for the rationale behind this rule.\n"
			);
		},
		async (root) => {
			// Empty allowlist so nothing is exempted
			const violations = await runInstallAdrGate(root, new Set());
			assert.equal(
				violations.length,
				1,
				"planted ADR ref under templates/install/ must fail the gate"
			);
			assert.equal(violations[0].match, "ADR-0018");
			assert.equal(
				violations[0].relativePath,
				"templates/install/.prism/rules/planted.md"
			);
		}
	);
});

test("runInstallAdrGate: allowlisted file with ADR reference passes the gate", async () => {
	await withTempTree(
		async (root) => {
			// Place the file at the machinery allowlist path
			const machineryPath = path.join(
				root,
				"templates",
				"install",
				".prism",
				"spec",
				"adrs",
				"_toolkit"
			);
			await fs.mkdir(machineryPath, { recursive: true });
			await fs.writeFile(
				path.join(machineryPath, "README.md"),
				"| ADR-0001 | Plan is source of truth | accepted |\n"
			);
		},
		async (root) => {
			// Only the machinery allowlist — no pre-L5 allowlist entries
			const violations = await runInstallAdrGate(
				root,
				new Set(["templates/install/.prism/spec/adrs/_toolkit/README.md"])
			);
			assert.equal(
				violations.length,
				0,
				"allowlisted machinery file must pass the gate even with ADR refs"
			);
		}
	);
});

test("runInstallAdrGate: returns empty array when templates/install/ does not exist", async () => {
	await withTempTree(
		async (_root) => {
			// No templates/install directory
		},
		async (root) => {
			const violations = await runInstallAdrGate(root, new Set());
			assert.equal(violations.length, 0, "missing install root must return empty violations");
		}
	);
});

test("runInstallAdrGate: clean install surface with no ADR refs passes the gate", async () => {
	await withTempTree(
		async (root) => {
			await fs.mkdir(
				path.join(root, "templates", "install", ".prism", "rules"),
				{ recursive: true }
			);
			await fs.writeFile(
				path.join(root, "templates", "install", ".prism", "rules", "clean.md"),
				"# Clean Rule\n\nThis rule has no ADR citations.\n"
			);
		},
		async (root) => {
			const violations = await runInstallAdrGate(root, new Set());
			assert.equal(violations.length, 0, "clean install surface must pass the gate");
		}
	);
});

test("runInstallAdrGate: file in allowlistOverride with ADR ref passes the gate", async () => {
	await withTempTree(
		async (root) => {
			// Plant a file that carries an ADR reference — simulates a rules file that
			// cites ADRs and is explicitly exempted via the allowlistOverride parameter.
			await fs.mkdir(
				path.join(root, "templates", "install", ".prism", "rules"),
				{ recursive: true }
			);
			await fs.writeFile(
				path.join(root, "templates", "install", ".prism", "rules", "branch-plan.md"),
				"See ADR-0001 for the plan-is-source-of-truth decision.\n"
			);
		},
		async (root) => {
			// Pass the path in the allowlist override — gate must pass despite the ADR ref
			const allowlistedPath = "templates/install/.prism/rules/branch-plan.md";
			const violations = await runInstallAdrGate(root, new Set([allowlistedPath]));
			assert.equal(
				violations.length,
				0,
				"file in allowlistOverride must pass the gate even with an ADR reference"
			);
		}
	);
});

// ---------------------------------------------------------------------------
// scanFileForRelativeLinks — relative-link gate unit tests
// ---------------------------------------------------------------------------

test("scanFileForRelativeLinks: valid relative link that resolves passes clean", async () => {
	await withTempTree(
		async (root) => {
			await fs.mkdir(path.join(root, ".prism", "rules"), { recursive: true });
			await fs.writeFile(
				path.join(root, ".prism", "rules", "target.md"),
				"# Target\n"
			);
			await fs.writeFile(
				path.join(root, ".prism", "rules", "source.md"),
				"See [the target](./target.md) for details.\n"
			);
		},
		async (root) => {
			const sourceAbs = path.join(root, ".prism", "rules", "source.md");
			const lines = (await fs.readFile(sourceAbs, "utf8")).split(/\r?\n/);
			const violations = await scanFileForRelativeLinks(
				lines,
				".prism/rules/source.md",
				sourceAbs,
				root,
				() => false
			);
			assert.equal(violations.length, 0, "valid relative link must pass clean");
		}
	);
});

test("scanFileForRelativeLinks: dangling relative link fails the gate", async () => {
	await withTempTree(
		async (root) => {
			await fs.mkdir(path.join(root, ".prism", "rules"), { recursive: true });
			// source.md exists but its target does NOT
			await fs.writeFile(
				path.join(root, ".prism", "rules", "source.md"),
				"See [the ghost](./ghost.md) for details.\n"
			);
		},
		async (root) => {
			const sourceAbs = path.join(root, ".prism", "rules", "source.md");
			const lines = (await fs.readFile(sourceAbs, "utf8")).split(/\r?\n/);
			const violations = await scanFileForRelativeLinks(
				lines,
				".prism/rules/source.md",
				sourceAbs,
				root,
				() => false
			);
			assert.equal(violations.length, 1, "dangling relative link must be flagged");
			assert.equal(violations[0].ref, "./ghost.md");
			assert.equal(violations[0].line, 1);
		}
	);
});

test("scanFileForRelativeLinks: relative link with parent traversal resolves correctly", async () => {
	await withTempTree(
		async (root) => {
			await fs.mkdir(path.join(root, ".prism", "rules"), { recursive: true });
			await fs.mkdir(path.join(root, ".prism", "references"), { recursive: true });
			await fs.writeFile(
				path.join(root, ".prism", "rules", "target.md"),
				"# Target\n"
			);
			await fs.writeFile(
				path.join(root, ".prism", "references", "source.md"),
				"See [rules](../rules/target.md) for details.\n"
			);
		},
		async (root) => {
			const sourceAbs = path.join(root, ".prism", "references", "source.md");
			const lines = (await fs.readFile(sourceAbs, "utf8")).split(/\r?\n/);
			const violations = await scanFileForRelativeLinks(
				lines,
				".prism/references/source.md",
				sourceAbs,
				root,
				() => false
			);
			assert.equal(
				violations.length,
				0,
				"valid ../ relative link must resolve and pass clean"
			);
		}
	);
});

test("scanFileForRelativeLinks: anchor-only ref yields zero violations", async () => {
	await withTempTree(
		async (root) => {
			await fs.mkdir(path.join(root, ".prism", "rules"), { recursive: true });
			await fs.writeFile(
				path.join(root, ".prism", "rules", "source.md"),
				"See [§ section](#section-heading) for more.\n"
			);
		},
		async (root) => {
			const sourceAbs = path.join(root, ".prism", "rules", "source.md");
			const lines = (await fs.readFile(sourceAbs, "utf8")).split(/\r?\n/);
			const violations = await scanFileForRelativeLinks(
				lines,
				".prism/rules/source.md",
				sourceAbs,
				root,
				() => false
			);
			assert.equal(violations.length, 0, "anchor-only ref must not be flagged");
		}
	);
});

test("scanFileForRelativeLinks: relative link with anchor resolves the file path", async () => {
	await withTempTree(
		async (root) => {
			await fs.mkdir(path.join(root, ".prism", "rules"), { recursive: true });
			await fs.writeFile(
				path.join(root, ".prism", "rules", "target.md"),
				"# Target\n\n## Section\n"
			);
			await fs.writeFile(
				path.join(root, ".prism", "rules", "source.md"),
				"See [§ section](./target.md#section) for more.\n"
			);
		},
		async (root) => {
			const sourceAbs = path.join(root, ".prism", "rules", "source.md");
			const lines = (await fs.readFile(sourceAbs, "utf8")).split(/\r?\n/);
			const violations = await scanFileForRelativeLinks(
				lines,
				".prism/rules/source.md",
				sourceAbs,
				root,
				() => false
			);
			assert.equal(
				violations.length,
				0,
				"relative link with anchor must strip anchor and check the file"
			);
		}
	);
});

test("scanFileForRelativeLinks: dangling relative link with anchor fails the gate", async () => {
	await withTempTree(
		async (root) => {
			await fs.mkdir(path.join(root, ".prism", "rules"), { recursive: true });
			await fs.writeFile(
				path.join(root, ".prism", "rules", "source.md"),
				"See [§ missing](./ghost.md#section) for more.\n"
			);
		},
		async (root) => {
			const sourceAbs = path.join(root, ".prism", "rules", "source.md");
			const lines = (await fs.readFile(sourceAbs, "utf8")).split(/\r?\n/);
			const violations = await scanFileForRelativeLinks(
				lines,
				".prism/rules/source.md",
				sourceAbs,
				root,
				() => false
			);
			assert.equal(
				violations.length,
				1,
				"dangling relative link with anchor must be flagged"
			);
			assert.equal(violations[0].ref, "./ghost.md#section");
		}
	);
});

test("scanFileForRelativeLinks: relative link inside fenced code block is not flagged", async () => {
	await withTempTree(
		async (root) => {
			await fs.mkdir(path.join(root, ".prism", "rules"), { recursive: true });
			await fs.writeFile(
				path.join(root, ".prism", "rules", "source.md"),
				"```\nSee [the ghost](./ghost.md).\n```\n"
			);
		},
		async (root) => {
			const sourceAbs = path.join(root, ".prism", "rules", "source.md");
			const lines = (await fs.readFile(sourceAbs, "utf8")).split(/\r?\n/);
			const violations = await scanFileForRelativeLinks(
				lines,
				".prism/rules/source.md",
				sourceAbs,
				root,
				() => false
			);
			assert.equal(
				violations.length,
				0,
				"relative link inside fenced code block must not be flagged"
			);
		}
	);
});

test("scanFileForRelativeLinks: token path yields zero violations", async () => {
	await withTempTree(
		async (root) => {
			await fs.mkdir(path.join(root, ".prism", "rules"), { recursive: true });
			await fs.writeFile(
				path.join(root, ".prism", "rules", "source.md"),
				"See [ADR](./spec/adrs/${SLUG}.md) for details.\n"
			);
		},
		async (root) => {
			const sourceAbs = path.join(root, ".prism", "rules", "source.md");
			const lines = (await fs.readFile(sourceAbs, "utf8")).split(/\r?\n/);
			const violations = await scanFileForRelativeLinks(
				lines,
				".prism/rules/source.md",
				sourceAbs,
				root,
				() => false
			);
			assert.equal(
				violations.length,
				0,
				"token path must not be flagged"
			);
		}
	);
});

test("scanFileForRelativeLinks: directory ref (trailing slash) yields zero violations", async () => {
	await withTempTree(
		async (root) => {
			await fs.mkdir(path.join(root, ".prism", "rules"), { recursive: true });
			await fs.writeFile(
				path.join(root, ".prism", "rules", "source.md"),
				"See [the adrs](./spec/adrs/) for details.\n"
			);
		},
		async (root) => {
			const sourceAbs = path.join(root, ".prism", "rules", "source.md");
			const lines = (await fs.readFile(sourceAbs, "utf8")).split(/\r?\n/);
			const violations = await scanFileForRelativeLinks(
				lines,
				".prism/rules/source.md",
				sourceAbs,
				root,
				() => false
			);
			assert.equal(
				violations.length,
				0,
				"directory ref must not be flagged"
			);
		}
	);
});

test("scanFileForRelativeLinks: allowlisted pair is exempt from the gate", async () => {
	await withTempTree(
		async (root) => {
			await fs.mkdir(path.join(root, ".prism", "rules"), { recursive: true });
			// ghost.md does NOT exist
			await fs.writeFile(
				path.join(root, ".prism", "rules", "source.md"),
				"See [the ghost](./ghost.md) for details.\n"
			);
		},
		async (root) => {
			const sourceAbs = path.join(root, ".prism", "rules", "source.md");
			const lines = (await fs.readFile(sourceAbs, "utf8")).split(/\r?\n/);
			const violations = await scanFileForRelativeLinks(
				lines,
				".prism/rules/source.md",
				sourceAbs,
				root,
				// allowlist override: exempt this exact (file, ref) pair
				(rel, ref) => rel === ".prism/rules/source.md" && ref === "./ghost.md"
			);
			assert.equal(
				violations.length,
				0,
				"allowlisted (file, ref) pair must pass the gate"
			);
		}
	);
});

// ---------------------------------------------------------------------------
// isInstallRelativeLinkAllowlisted — allowlist predicate
// ---------------------------------------------------------------------------

test("isInstallRelativeLinkAllowlisted: pre-L10 entry is recognized as allowlisted", () => {
	const [firstEntry] = INSTALL_RELATIVE_LINK_PRE_L10_ALLOWLIST;
	assert.ok(firstEntry, "pre-L10 allowlist must have at least one entry");
	const [relPath, rawRef] = firstEntry.split("::");
	assert.equal(
		isInstallRelativeLinkAllowlisted(relPath, rawRef),
		true,
		"pre-L10 allowlist entry must be recognized as allowlisted"
	);
});

test("isInstallRelativeLinkAllowlisted: non-allowlisted pair returns false", () => {
	assert.equal(
		isInstallRelativeLinkAllowlisted(
			"templates/install/.prism/rules/branch-plan.md",
			"./some-ghost.md"
		),
		false
	);
});
test("isInstallRelativeLinkAllowlisted: rawRef with anchor fragment matches allowlist entry", () => {
	// Fragment-stripping branch: `rawRef#heading` must match the same allowlist
	// entry as bare `rawRef`, because the key is built from the path-part only.
	const [firstEntry] = INSTALL_RELATIVE_LINK_PRE_L10_ALLOWLIST;
	assert.ok(firstEntry, "pre-L10 allowlist must have at least one entry");
	const [relPath, rawRef] = firstEntry.split("::");
	assert.equal(
		isInstallRelativeLinkAllowlisted(relPath, `${rawRef}#heading`),
		true,
		"rawRef with anchor fragment must still match the allowlist entry"
	);
});

// ---------------------------------------------------------------------------
// runInstallRelativeLinkGate — integration tests
// ---------------------------------------------------------------------------

test("runInstallRelativeLinkGate: planted dangling relative link fails the gate", async () => {
	await withTempTree(
		async (root) => {
			await fs.mkdir(
				path.join(root, "templates", "install", ".prism", "rules"),
				{ recursive: true }
			);
			// ghost.md is NOT created — this is the dangling target
			await fs.writeFile(
				path.join(root, "templates", "install", ".prism", "rules", "planted.md"),
				"See [the ghost](./ghost.md) for details.\n"
			);
		},
		async (root) => {
			// Empty allowlist override — nothing is exempted
			const violations = await runInstallRelativeLinkGate(root, () => false);
			assert.equal(
				violations.length,
				1,
				"planted dangling relative link must fail the gate"
			);
			assert.equal(violations[0].ref, "./ghost.md");
			assert.equal(
				violations[0].relativePath,
				"templates/install/.prism/rules/planted.md"
			);
		}
	);
});

test("runInstallRelativeLinkGate: valid relative link passes the gate", async () => {
	await withTempTree(
		async (root) => {
			const rulesDir = path.join(root, "templates", "install", ".prism", "rules");
			await fs.mkdir(rulesDir, { recursive: true });
			await fs.writeFile(
				path.join(rulesDir, "target.md"),
				"# Target\n"
			);
			await fs.writeFile(
				path.join(rulesDir, "source.md"),
				"See [the target](./target.md) for details.\n"
			);
		},
		async (root) => {
			const violations = await runInstallRelativeLinkGate(root, () => false);
			assert.equal(violations.length, 0, "valid relative link must pass the gate");
		}
	);
});

test("runInstallRelativeLinkGate: anchor-only section ref is not flagged", async () => {
	await withTempTree(
		async (root) => {
			const rulesDir = path.join(root, "templates", "install", ".prism", "rules");
			await fs.mkdir(rulesDir, { recursive: true });
			await fs.writeFile(
				path.join(rulesDir, "source.md"),
				"Jump to [§ section](#heading) within the same file.\n"
			);
		},
		async (root) => {
			const violations = await runInstallRelativeLinkGate(root, () => false);
			assert.equal(
				violations.length,
				0,
				"anchor-only ref must not be flagged by the relative-link gate"
			);
		}
	);
});

test("runInstallRelativeLinkGate: allowlisted dangling link passes the gate", async () => {
	await withTempTree(
		async (root) => {
			const rulesDir = path.join(root, "templates", "install", ".prism", "rules");
			await fs.mkdir(rulesDir, { recursive: true });
			// ghost.md is NOT created — normally would be a violation
			await fs.writeFile(
				path.join(rulesDir, "source.md"),
				"See [the ghost](./ghost.md) for details.\n"
			);
		},
		async (root) => {
			// Override: exempt this specific (file, ref) pair
			const violations = await runInstallRelativeLinkGate(
				root,
				(rel, ref) =>
					rel === "templates/install/.prism/rules/source.md" &&
					ref === "./ghost.md"
			);
			assert.equal(
				violations.length,
				0,
				"allowlisted dangling link must pass the gate"
			);
		}
	);
});

test("runInstallRelativeLinkGate: returns empty array when templates/install/ does not exist", async () => {
	await withTempTree(
		async (_root) => {
			// No templates/install directory
		},
		async (root) => {
			const violations = await runInstallRelativeLinkGate(root, () => false);
			assert.equal(
				violations.length,
				0,
				"missing install root must return empty violations"
			);
		}
	);
});
