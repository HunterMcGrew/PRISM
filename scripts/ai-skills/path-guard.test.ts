/**
 * Regression suite for the build-time path guard. Catches:
 *   - missed violations (a `.claude/rules/` reference in a copied area should fail)
 *   - false positives in fenced code blocks (allowed by design)
 *   - violations in non-copied areas (plans/) wrongly flagged
 *   - allowlisted files wrongly flagged
 */
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import test from "node:test";
import assert from "node:assert/strict";

import { runPathGuard } from "./path-guard";

async function withTempContentRoot(
	build: (contentRoot: string) => Promise<void>,
	check: (contentRoot: string) => Promise<void>
): Promise<void> {
	const tempRoot = await fs.mkdtemp(
		path.join(os.tmpdir(), "prism-path-guard-")
	);
	try {
		await build(tempRoot);
		await check(tempRoot);
	} finally {
		await fs.rm(tempRoot, { force: true, recursive: true });
	}
}

test("flags .claude/<area>/ references in copied content", async () => {
	await withTempContentRoot(
		async (root) => {
			await fs.mkdir(path.join(root, "rules"), { recursive: true });
			await fs.writeFile(
				path.join(root, "rules", "sample.md"),
				"# Sample\n\nSee `.claude/rules/other.md` for details.\n",
				"utf8"
			);
		},
		async (root) => {
			const violations = await runPathGuard(root);
			assert.equal(violations.length, 1);
			assert.equal(violations[0].relativePath, "rules/sample.md");
			assert.equal(violations[0].line, 3);
		}
	);
});

test("flags .codex/<area>/ and .cursor/<area>/ references", async () => {
	await withTempContentRoot(
		async (root) => {
			await fs.mkdir(path.join(root, "architect"), { recursive: true });
			await fs.writeFile(
				path.join(root, "architect", "doc.md"),
				"Reads from `.codex/architect/manifest.json` or `.cursor/architect/manifest.json`.\n",
				"utf8"
			);
		},
		async (root) => {
			const violations = await runPathGuard(root);
			assert.equal(violations.length, 1, "single line, two patterns");
		}
	);
});

test("allows references inside fenced code blocks", async () => {
	await withTempContentRoot(
		async (root) => {
			await fs.mkdir(path.join(root, "spec", "adrs"), { recursive: true });
			await fs.writeFile(
				path.join(root, "spec", "adrs", "fenced.md"),
				"# ADR\n\nNow at `.prism/rules/foo.md`.\n\n```\n.claude/rules/foo.md\n.codex/architect/doc.md\n```\n\nNothing else outside the fence.\n",
				"utf8"
			);
		},
		async (root) => {
			const violations = await runPathGuard(root);
			assert.equal(violations.length, 0);
		}
	);
});

test("ignores violations in non-copied areas (plans/)", async () => {
	await withTempContentRoot(
		async (root) => {
			await fs.mkdir(path.join(root, "plans"), { recursive: true });
			await fs.writeFile(
				path.join(root, "plans", "some-ticket.md"),
				"AC: verify `.codex/rules/<rule>.md` reflects edits.\n",
				"utf8"
			);
		},
		async (root) => {
			const violations = await runPathGuard(root);
			assert.equal(violations.length, 0);
		}
	);
});

test("respects the file allowlist (ADR-0031)", async () => {
	await withTempContentRoot(
		async (root) => {
			await fs.mkdir(path.join(root, "spec", "adrs"), { recursive: true });
			await fs.writeFile(
				path.join(root, "spec", "adrs", "0031-bifurcated-install-layout.md"),
				"## Context\n\nBefore the bifurcation, `.claude/rules/` was canonical.\n",
				"utf8"
			);
		},
		async (root) => {
			const violations = await runPathGuard(root);
			assert.equal(violations.length, 0);
		}
	);
});

test("respects the file allowlist (architect/install-layout.md)", async () => {
	await withTempContentRoot(
		async (root) => {
			await fs.mkdir(path.join(root, "architect"), { recursive: true });
			await fs.writeFile(
				path.join(root, "architect", "install-layout.md"),
				"# Install Layout\n\nExample: `.prism/rules/foo.md` copies to `.claude/rules/foo.md`, `.codex/rules/foo.md`, `.cursor/rules/foo.md`.\n",
				"utf8"
			);
		},
		async (root) => {
			const violations = await runPathGuard(root);
			assert.equal(violations.length, 0);
		}
	);
});

test("flags references in the loose SPEC.md file", async () => {
	await withTempContentRoot(
		async (root) => {
			await fs.writeFile(
				path.join(root, "SPEC.md"),
				"Tier 2 lives at `.claude/rules/`.\n",
				"utf8"
			);
		},
		async (root) => {
			const violations = await runPathGuard(root);
			assert.equal(violations.length, 1);
			assert.equal(violations[0].relativePath, "SPEC.md");
		}
	);
});

test("returns empty when contentRoot does not exist", async () => {
	const violations = await runPathGuard(
		path.join(os.tmpdir(), "prism-path-guard-missing-" + Date.now())
	);
	assert.equal(violations.length, 0);
});
