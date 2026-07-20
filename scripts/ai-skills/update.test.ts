/**
 * Per-file branch coverage for `pnpm prism:update`'s `applyFilePass` engine.
 *
 * Each test seeds a throwaway PRISM source `.prism/` and a consumer `.prism/`
 * (optionally with a recorded `.sync-manifest.json`), runs `applyFilePass`, and
 * asserts the consumer file state plus the returned outcome. Branches covered:
 * new / no-op / clean-overwrite / diverged→.bak / no-manifest byte-compare
 * fallback (no .bak when already current) / consumer-owned untouched /
 * unknown-classified untouched / deleted-in-PRISM removed / deleted-in-PRISM
 * already-absent no-op / manifest rewritten / --dry-run leaves the filesystem
 * untouched / config schema validation names the offending field / git-repo
 * check fails fast (issue #376, `runUpdate` integration tests only —
 * `applyFilePass` itself carries no guard and its tests are unaffected).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import test from "node:test";
import assert from "node:assert/strict";

import { AGENTS_MD_BLOCK_BEGIN, AGENTS_MD_BLOCK_END } from "./agents-md-block";
import {
	applyFilePass,
	assertSourceIsPlausible,
	resolvePrismContentRoot,
	runUpdate,
} from "./update";
import { hashContent } from "./utils";
import {
	SYNC_MANIFEST_FILENAME,
	type SyncManifest,
} from "./sync-manifest";

/** Initializes a git repo at `dir` with deterministic, side-effect-free config. */
function gitInit(dir: string): void {
	execFileSync("git", ["init", "-q"], { cwd: dir, stdio: "ignore" });
	execFileSync("git", ["config", "user.email", "test@prism.local"], {
		cwd: dir,
		stdio: "ignore",
	});
	execFileSync("git", ["config", "user.name", "PRISM Test"], {
		cwd: dir,
		stdio: "ignore",
	});
}

const CONSUMER_PATHS_JSON = {
	canonical: {
		skillsRoot: ".ai-skills/skills",
		contentRoot: ".prism",
		templatesContentRoot: "templates/install/.prism",
	},
	generated: {
		claudeSkillsRoot: ".claude/skills",
		claudeAgentsRoot: ".claude/agents",
		codexSkillsRoot: ".agents/skills",
		codexAgentsRoot: ".codex/agents",
		codexConfigFile: ".codex/codex-config.toml",
		cursorSkillsRoot: ".cursor/skills",
		platformContentCopies: { claude: ".claude", codex: ".codex", cursor: ".cursor" },
	},
};

const CONSUMER_CONFIG_JSON = {
	org: "Acme",
	project: "AcmeApp",
	ticketPrefix: "ACME",
	ticketSystem: { kind: "github-issues" },
};

async function withTempRoots(
	body: (roots: {
		prismContentRoot: string;
		consumerContentRoot: string;
	}) => Promise<void>
): Promise<void> {
	const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "prism-update-"));
	const prismContentRoot = path.join(tempRoot, "prism", ".prism");
	const consumerContentRoot = path.join(tempRoot, "consumer", ".prism");
	await fs.mkdir(prismContentRoot, { recursive: true });
	await fs.mkdir(consumerContentRoot, { recursive: true });
	try {
		await body({ prismContentRoot, consumerContentRoot });
	} finally {
		await fs.rm(tempRoot, { force: true, recursive: true });
	}
}

async function writeFile(
	contentRoot: string,
	relativePath: string,
	content: string
): Promise<void> {
	const absolutePath = path.join(contentRoot, relativePath);
	await fs.mkdir(path.dirname(absolutePath), { recursive: true });
	await fs.writeFile(absolutePath, content, "utf8");
}

async function readFile(
	contentRoot: string,
	relativePath: string
): Promise<string> {
	return fs.readFile(path.join(contentRoot, relativePath), "utf8");
}

async function fileExists(
	contentRoot: string,
	relativePath: string
): Promise<boolean> {
	try {
		await fs.access(path.join(contentRoot, relativePath));

		return true;
	} catch {
		return false;
	}
}

async function writeConsumerManifest(
	consumerContentRoot: string,
	files: Record<string, string>,
	prismVersion = "1.0.0"
): Promise<void> {
	const manifest: SyncManifest = {
		prismVersion,
		sourceCommit: "abc123",
		generatedAt: "2026-01-01T00:00:00.000Z",
		files: Object.fromEntries(
			Object.entries(files).map(([relativePath, content]) => [
				relativePath,
				{ contentHash: hashContent(content) },
			])
		),
	};
	await writeFile(
		consumerContentRoot,
		SYNC_MANIFEST_FILENAME,
		`${JSON.stringify(manifest, null, "\t")}\n`
	);
}

/**
 * Writes a PRISM source manifest recording only `prismVersion` — enough for
 * `computeVersionDelta`'s `sourceManifest?.prismVersion` read, without
 * needing every source file hashed into `files`.
 */
async function writeSourceManifestVersion(
	prismContentRoot: string,
	prismVersion: string
): Promise<void> {
	const manifest: SyncManifest = {
		prismVersion,
		sourceCommit: "source-commit",
		generatedAt: "2026-01-01T00:00:00.000Z",
		files: {},
	};
	await writeFile(
		prismContentRoot,
		SYNC_MANIFEST_FILENAME,
		`${JSON.stringify(manifest, null, "\t")}\n`
	);
}

function outcomeFor(
	summary: Awaited<ReturnType<typeof applyFilePass>>,
	relativePath: string
) {
	const outcome = summary.outcomes.find(
		(entry) => entry.relativePath === relativePath
	);
	assert.ok(outcome, `expected an outcome for ${relativePath}`);

	return outcome;
}

test("writes a PRISM-owned file the consumer does not have", async () => {
	await withTempRoots(async ({ prismContentRoot, consumerContentRoot }) => {
		await writeFile(prismContentRoot, "rules/new-rule.md", "# New rule\n");

		const summary = await applyFilePass(prismContentRoot, consumerContentRoot);

		assert.equal(
			await readFile(consumerContentRoot, "rules/new-rule.md"),
			"# New rule\n"
		);
		assert.equal(outcomeFor(summary, "rules/new-rule.md").action, "written");
		assert.equal(summary.backups.length, 0);
	});
});

test("no-ops when the consumer file already matches incoming", async () => {
	await withTempRoots(async ({ prismContentRoot, consumerContentRoot }) => {
		await writeFile(prismContentRoot, "rules/same.md", "# Same\n");
		await writeFile(consumerContentRoot, "rules/same.md", "# Same\n");

		const summary = await applyFilePass(prismContentRoot, consumerContentRoot);

		assert.equal(outcomeFor(summary, "rules/same.md").action, "no-op");
		assert.equal(summary.backups.length, 0);
	});
});

test("overwrites freely when the consumer matches its recorded base", async () => {
	await withTempRoots(async ({ prismContentRoot, consumerContentRoot }) => {
		await writeFile(prismContentRoot, "rules/clean.md", "# v2\n");
		await writeFile(consumerContentRoot, "rules/clean.md", "# v1\n");
		await writeConsumerManifest(consumerContentRoot, {
			"rules/clean.md": "# v1\n",
		});

		const summary = await applyFilePass(prismContentRoot, consumerContentRoot);

		assert.equal(
			await readFile(consumerContentRoot, "rules/clean.md"),
			"# v2\n"
		);
		assert.equal(outcomeFor(summary, "rules/clean.md").action, "overwritten");
		assert.equal(summary.backups.length, 0);
		assert.equal(await fileExists(consumerContentRoot, "rules/clean.md.bak"), false);
	});
});

test("backs up a diverged file before overwriting it", async () => {
	await withTempRoots(async ({ prismContentRoot, consumerContentRoot }) => {
		await writeFile(prismContentRoot, "rules/diverged.md", "# incoming\n");
		await writeFile(consumerContentRoot, "rules/diverged.md", "# hand-edited\n");
		await writeConsumerManifest(consumerContentRoot, {
			"rules/diverged.md": "# original base\n",
		});

		const summary = await applyFilePass(prismContentRoot, consumerContentRoot);

		assert.equal(
			await readFile(consumerContentRoot, "rules/diverged.md"),
			"# incoming\n"
		);
		assert.equal(
			await readFile(consumerContentRoot, "rules/diverged.md.bak"),
			"# hand-edited\n"
		);
		assert.equal(outcomeFor(summary, "rules/diverged.md").action, "backed-up");
		assert.equal(summary.backups.length, 1);
	});
});

test("backs up a diverged file at a nested path with Windows-correct separators", async () => {
	await withTempRoots(async ({ prismContentRoot, consumerContentRoot }) => {
		// `resolveBackupPath`/`backupConsumerFile` operate on the absolute path
		// `path.join` already produced (native separators), not the manifest's
		// forward-slash key — this pins that a multi-segment nested relative
		// path still resolves to the correct `.bak` sibling on Windows, where
		// `path.dirname`/`path.join` on an intermediate directory could
		// otherwise mis-split on the wrong separator.
		const relativePath = "rules/nested/deeply/diverged.md";
		await writeFile(prismContentRoot, relativePath, "# incoming\n");
		await writeFile(consumerContentRoot, relativePath, "# hand-edited\n");
		await writeConsumerManifest(consumerContentRoot, {
			[relativePath]: "# original base\n",
		});

		const summary = await applyFilePass(prismContentRoot, consumerContentRoot);

		assert.equal(await readFile(consumerContentRoot, relativePath), "# incoming\n");
		assert.equal(
			await readFile(consumerContentRoot, `${relativePath}.bak`),
			"# hand-edited\n"
		);
		assert.equal(outcomeFor(summary, relativePath).action, "backed-up");

		const outcome = outcomeFor(summary, relativePath);
		assert.equal(
			outcome.backupPath,
			path.join(consumerContentRoot, `${relativePath}.bak`)
		);
	});
});

test("no-manifest fallback: a diverged file is backed up", async () => {
	await withTempRoots(async ({ prismContentRoot, consumerContentRoot }) => {
		await writeFile(prismContentRoot, "rules/r.md", "# incoming\n");
		await writeFile(consumerContentRoot, "rules/r.md", "# hand-edited\n");

		const summary = await applyFilePass(prismContentRoot, consumerContentRoot);

		assert.equal(outcomeFor(summary, "rules/r.md").action, "backed-up");
		assert.equal(
			await readFile(consumerContentRoot, "rules/r.md.bak"),
			"# hand-edited\n"
		);
	});
});

test("no-manifest fallback: an already-current file is a no-op, not a .bak", async () => {
	await withTempRoots(async ({ prismContentRoot, consumerContentRoot }) => {
		await writeFile(prismContentRoot, "rules/current.md", "# identical\n");
		await writeFile(consumerContentRoot, "rules/current.md", "# identical\n");

		const summary = await applyFilePass(prismContentRoot, consumerContentRoot);

		assert.equal(outcomeFor(summary, "rules/current.md").action, "no-op");
		assert.equal(summary.backups.length, 0);
		assert.equal(
			await fileExists(consumerContentRoot, "rules/current.md.bak"),
			false
		);
	});
});

test("leaves a consumer-owned flat architect doc untouched", async () => {
	await withTempRoots(async ({ prismContentRoot, consumerContentRoot }) => {
		await writeFile(prismContentRoot, "architect/foo.md", "# PRISM version\n");
		await writeFile(consumerContentRoot, "architect/foo.md", "# Consumer product doc\n");

		const summary = await applyFilePass(prismContentRoot, consumerContentRoot);

		assert.equal(
			await readFile(consumerContentRoot, "architect/foo.md"),
			"# Consumer product doc\n"
		);
		assert.equal(
			summary.outcomes.some((o) => o.relativePath === "architect/foo.md"),
			false,
			"consumer-owned path produces no outcome"
		);
	});
});

test("leaves the .prism/custom overlay source untouched", async () => {
	await withTempRoots(async ({ prismContentRoot, consumerContentRoot }) => {
		await writeFile(consumerContentRoot, "custom/rules/team.md", "# Team overlay\n");

		const summary = await applyFilePass(prismContentRoot, consumerContentRoot);

		assert.equal(
			await readFile(consumerContentRoot, "custom/rules/team.md"),
			"# Team overlay\n",
			"overlay source is never written by the canonical sync pass"
		);
		assert.equal(
			summary.outcomes.some((o) => o.relativePath.startsWith("custom/")),
			false,
			"no custom/ path produces an outcome"
		);
	});
});

test("leaves a deep-nested unknown-classified architect path untouched", async () => {
	await withTempRoots(async ({ prismContentRoot, consumerContentRoot }) => {
		await writeFile(prismContentRoot, "architect/subdir/deep.md", "# incoming\n");
		await writeFile(consumerContentRoot, "architect/subdir/deep.md", "# consumer\n");

		const summary = await applyFilePass(prismContentRoot, consumerContentRoot);

		assert.equal(
			await readFile(consumerContentRoot, "architect/subdir/deep.md"),
			"# consumer\n",
			"unknown-classified path is left untouched"
		);
		assert.equal(
			summary.outcomes.some(
				(o) => o.relativePath === "architect/subdir/deep.md"
			),
			false,
			"unknown-classified path produces no outcome"
		);
	});
});

test("removes a file present in the consumer manifest but absent from PRISM", async () => {
	await withTempRoots(async ({ prismContentRoot, consumerContentRoot }) => {
		await writeFile(consumerContentRoot, "rules/gone.md", "# recorded base\n");
		await writeConsumerManifest(consumerContentRoot, {
			"rules/gone.md": "# recorded base\n",
		});

		const summary = await applyFilePass(prismContentRoot, consumerContentRoot);

		assert.equal(await fileExists(consumerContentRoot, "rules/gone.md"), false);
		assert.equal(outcomeFor(summary, "rules/gone.md").action, "removed");
		assert.equal(summary.backups.length, 0);
	});
});

test("backs up a diverged file before removing it", async () => {
	await withTempRoots(async ({ prismContentRoot, consumerContentRoot }) => {
		await writeFile(consumerContentRoot, "rules/gone.md", "# hand-edited\n");
		await writeConsumerManifest(consumerContentRoot, {
			"rules/gone.md": "# recorded base\n",
		});

		const summary = await applyFilePass(prismContentRoot, consumerContentRoot);

		assert.equal(await fileExists(consumerContentRoot, "rules/gone.md"), false);
		assert.equal(
			await readFile(consumerContentRoot, "rules/gone.md.bak"),
			"# hand-edited\n"
		);
		assert.equal(
			outcomeFor(summary, "rules/gone.md").action,
			"removed-with-backup"
		);
		assert.equal(summary.backups.length, 1);
	});
});

test("no-ops a manifest-recorded deletion the consumer already removed", async () => {
	await withTempRoots(async ({ prismContentRoot, consumerContentRoot }) => {
		await writeConsumerManifest(consumerContentRoot, {
			"rules/gone.md": "# recorded base\n",
		});

		const summary = await applyFilePass(prismContentRoot, consumerContentRoot);

		assert.equal(await fileExists(consumerContentRoot, "rules/gone.md"), false);
		assert.equal(outcomeFor(summary, "rules/gone.md").action, "no-op");
		assert.equal(
			await fileExists(consumerContentRoot, "rules/gone.md.bak"),
			false
		);
		assert.equal(summary.backups.length, 0);
	});
});

test("rewrites the consumer manifest to the new PRISM base hashes after the run", async () => {
	await withTempRoots(async ({ prismContentRoot, consumerContentRoot }) => {
		await writeFile(prismContentRoot, "rules/a.md", "# A v2\n");
		await writeFile(prismContentRoot, "SPEC.md", "# Spec\n");
		await writeFile(consumerContentRoot, "rules/a.md", "# A v1\n");
		await writeConsumerManifest(consumerContentRoot, {
			"rules/a.md": "# A v1\n",
		});

		await applyFilePass(prismContentRoot, consumerContentRoot);

		const raw = await readFile(consumerContentRoot, SYNC_MANIFEST_FILENAME);
		const manifest = JSON.parse(raw) as SyncManifest;

		assert.equal(
			manifest.files["rules/a.md"].contentHash,
			hashContent("# A v2\n"),
			"manifest records the new incoming hash, not the old base"
		);
		assert.ok(
			manifest.files["SPEC.md"],
			"newly written file is recorded in the manifest"
		);
	});
});

test("applyFilePass reports a version delta when the consumer's prior manifest is older", async () => {
	await withTempRoots(async ({ prismContentRoot, consumerContentRoot }) => {
		await writeFile(prismContentRoot, "rules/a.md", "# A\n");
		await writeSourceManifestVersion(prismContentRoot, "0.7.0");
		await writeFile(consumerContentRoot, "rules/a.md", "# A\n");
		await writeConsumerManifest(consumerContentRoot, { "rules/a.md": "# A\n" }, "0.6.0");

		const summary = await applyFilePass(prismContentRoot, consumerContentRoot);

		assert.deepEqual(summary.versionDelta, {
			previous: "0.6.0",
			current: "0.7.0",
			changed: true,
		});
	});
});

test("applyFilePass reports no delta on first-adopt (no prior manifest)", async () => {
	await withTempRoots(async ({ prismContentRoot, consumerContentRoot }) => {
		await writeFile(prismContentRoot, "rules/a.md", "# A\n");
		await writeSourceManifestVersion(prismContentRoot, "0.7.0");

		const summary = await applyFilePass(prismContentRoot, consumerContentRoot);

		assert.deepEqual(summary.versionDelta, {
			previous: null,
			current: "0.7.0",
			changed: false,
		});
	});
});

test("applyFilePass reports no delta when the consumer is already current", async () => {
	await withTempRoots(async ({ prismContentRoot, consumerContentRoot }) => {
		await writeFile(prismContentRoot, "rules/a.md", "# A\n");
		await writeSourceManifestVersion(prismContentRoot, "0.7.0");
		await writeFile(consumerContentRoot, "rules/a.md", "# A\n");
		await writeConsumerManifest(consumerContentRoot, { "rules/a.md": "# A\n" }, "0.7.0");

		const summary = await applyFilePass(prismContentRoot, consumerContentRoot);

		assert.deepEqual(summary.versionDelta, {
			previous: "0.7.0",
			current: "0.7.0",
			changed: false,
		});
	});
});

test("assertSourceIsPlausible refuses when the source has no PRISM-owned files", async () => {
	await withTempRoots(async ({ prismContentRoot }) => {
		await assert.rejects(
			() => assertSourceIsPlausible(prismContentRoot, 42),
			(err: unknown) => {
				assert.ok(err instanceof Error);
				assert.ok(
					err.message.includes("--prism-source looks empty"),
					`expected refusal message, got: ${err.message}`
				);
				assert.ok(
					err.message.includes("refusing 42"),
					`expected deletion count in message, got: ${err.message}`
				);

				return true;
			}
		);
	});
});

test("assertSourceIsPlausible passes when the source has at least one PRISM-owned file", async () => {
	await withTempRoots(async ({ prismContentRoot }) => {
		await writeFile(prismContentRoot, "rules/some-rule.md", "# Rule\n");

		await assert.doesNotReject(() =>
			assertSourceIsPlausible(prismContentRoot, 5)
		);
	});
});

// --- runUpdate integration: file pass + content copy + roster projection ---

/**
 * `consumerRepoRoot` is git-initialized so `assertInsideGitRepo` (issue #376)
 * passes for every test that doesn't specifically exercise the git-repo
 * refusal path. `prismRepoRoot` gets a copy of the real `config.schema.json`
 * so `validateConsumerConfigAgainstSchema` validates against the actual
 * schema shape.
 */
async function withTempRepoRoots(
	body: (roots: {
		prismRepoRoot: string;
		consumerRepoRoot: string;
		prismContentRoot: string;
		consumerContentRoot: string;
	}) => Promise<void>
): Promise<void> {
	const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "prism-runupdate-"));
	const prismRepoRoot = path.join(tempRoot, "prism");
	const consumerRepoRoot = path.join(tempRoot, "consumer");
	const prismContentRoot = path.join(prismRepoRoot, ".prism");
	const consumerContentRoot = path.join(consumerRepoRoot, ".prism");
	await fs.mkdir(prismContentRoot, { recursive: true });
	await fs.mkdir(consumerContentRoot, { recursive: true });
	gitInit(consumerRepoRoot);

	const realSchemaPath = path.join(process.cwd(), ".ai-skills", "config.schema.json");
	await fs.mkdir(path.join(prismRepoRoot, ".ai-skills"), { recursive: true });
	await fs.copyFile(
		realSchemaPath,
		path.join(prismRepoRoot, ".ai-skills", "config.schema.json")
	);

	// Consumer config + paths.json so the platform refresh resolves.
	await writeFile(
		consumerRepoRoot,
		".ai-skills/config.json",
		`${JSON.stringify(CONSUMER_CONFIG_JSON, null, "\t")}\n`
	);
	await writeFile(
		consumerRepoRoot,
		".ai-skills/definitions/paths.json",
		`${JSON.stringify(CONSUMER_PATHS_JSON, null, "\t")}\n`
	);

	// PRISM source: one persona skill + the matching roles.json entry.
	await writeFile(
		prismRepoRoot,
		".ai-skills/skills/prism-sample/frontmatter.yml",
		"name: prism-sample\ndescription: Sample persona for tests.\n"
	);
	await writeFile(
		prismRepoRoot,
		".ai-skills/skills/prism-sample/shared.md",
		"You build ${PROJECT} for ${TICKET_PREFIX}.\n"
	);
	await writeFile(
		prismRepoRoot,
		".ai-skills/definitions/roles.json",
		`${JSON.stringify({ skills: [{ id: "prism-sample", persona: "Sample" }] }, null, "\t")}\n`
	);

	// Most callers exercise `runUpdate` mechanics unrelated to `load:` semantics
	// (version metadata, dry-run, dogfooding-source-root, persona-roster copy)
	// with bare-body rule fixtures that predate the `load:` mechanism — without
	// silencing here, `scanConsumerRuleLoad`'s now-unconditional scan (PRISM-417
	// review fix) would print a `missing a valid load:` warning on every one of
	// those runs, burying genuine warnings in noise. Tests that assert on
	// warnings opt back in via `withCapturedWarnings`, which overrides and
	// restores `console.warn` around its own call and composes correctly with
	// this outer silencer regardless of nesting order.
	const originalWarn = console.warn;
	console.warn = () => {};
	try {
		await body({
			prismRepoRoot,
			consumerRepoRoot,
			prismContentRoot,
			consumerContentRoot,
		});
	} finally {
		console.warn = originalWarn;
		await fs.rm(tempRoot, { force: true, recursive: true });
	}
}

test("runUpdate copies content and projects the persona roster", async () => {
	await withTempRepoRoots(
		async ({
			prismRepoRoot,
			consumerRepoRoot,
			prismContentRoot,
			consumerContentRoot,
		}) => {
			// A PRISM-owned rule the file pass copies, plus a consumer .prism/ rule
			// that the content-copy step mirrors into the platform dirs.
			await writeFile(prismContentRoot, "rules/shipped.md", "# Shipped rule\n");
			await writeFile(consumerContentRoot, "rules/local.md", "# Local rule\n");

			await runUpdate({
				prismRepoRoot,
				consumerRepoRoot,
				prismContentRoot,
				consumerContentRoot,
			});

			// File pass applied the PRISM-owned rule.
			assert.equal(
				await readFile(consumerContentRoot, "rules/shipped.md"),
				"# Shipped rule\n",
				"file pass applied the PRISM-owned rule"
			);

			// Content copy mirrored the consumer's .prism/rules into .claude/rules.
			assert.equal(
				await readFile(consumerRepoRoot, ".claude/rules/local.md"),
				"# Local rule\n",
				"content copy ran (output unchanged by the relocation into runUpdate)"
			);

			// Roster projected with the consumer's PROJECT token substituted.
			const skillBody = await readFile(
				consumerRepoRoot,
				".claude/skills/prism-sample/SKILL.md"
			);
			assert.match(skillBody, /You build AcmeApp for ACME\./);
			assert.equal(
				/\$\{[A-Z][A-Z0-9_]*\}/.test(skillBody),
				false,
				"no leftover token survives in the projected roster"
			);
		}
	);
});

/**
 * Captures `console.warn` calls made during `body`, restoring the original
 * afterward regardless of whether `body` throws.
 */
async function withCapturedWarnings<T>(
	body: () => Promise<T>
): Promise<{ result: T; warnings: string[] }> {
	const warnings: string[] = [];
	const originalWarn = console.warn;
	console.warn = (message?: unknown) => {
		warnings.push(String(message));
	};
	try {
		const result = await body();
		return { result, warnings };
	} finally {
		console.warn = originalWarn;
	}
}

// --- consumer AGENTS.md Tier-1 marker-pair refresh (PRISM-417) ---

test("runUpdate refreshes the consumer AGENTS.md Tier-1 block from the consumer's own rules", async () => {
	await withTempRepoRoots(
		async ({ prismRepoRoot, consumerRepoRoot, prismContentRoot, consumerContentRoot }) => {
			await writeFile(
				prismContentRoot,
				"rules/shipped.md",
				"---\nload: always\n---\n\n# Shipped rule\n"
			);
			await writeFile(
				consumerRepoRoot,
				"AGENTS.md",
				[
					"# Agent Behavior Rules",
					"",
					AGENTS_MD_BLOCK_BEGIN,
					"",
					"stale content from a previous fill",
					"",
					AGENTS_MD_BLOCK_END,
					"",
				].join("\n")
			);
			await writeFile(
				consumerContentRoot,
				"rules/always.md",
				"---\nload: always\n---\n\n# Always Rule\n"
			);
			await writeFile(
				consumerContentRoot,
				"rules/paths.md",
				'---\nload: paths\npaths:\n  - "**/*.tsx"\n---\n\n# Paths Rule\n'
			);

			const summary = await runUpdate({
				prismRepoRoot,
				consumerRepoRoot,
				prismContentRoot,
				consumerContentRoot,
			});

			const agentsMd = await readFile(consumerRepoRoot, "AGENTS.md");
			assert.match(agentsMd, /# Always Rule/);
			assert.doesNotMatch(agentsMd, /# Paths Rule/, "load: paths rule excluded from the block");
			assert.doesNotMatch(agentsMd, /stale content from a previous fill/);
			assert.equal(summary.agentsMdRefresh.refreshed, true);
			assert.deepEqual(summary.ruleLoadWarnings, []);
		}
	);
});

test("runUpdate leaves a consumer AGENTS.md with no marker pair untouched", async () => {
	await withTempRepoRoots(
		async ({ prismRepoRoot, consumerRepoRoot, prismContentRoot, consumerContentRoot }) => {
			await writeFile(
				prismContentRoot,
				"rules/shipped.md",
				"---\nload: always\n---\n\n# Shipped rule\n"
			);
			const original = "# Agent Behavior Rules\n\nHand-authored, no PRISM markers.\n";
			await writeFile(consumerRepoRoot, "AGENTS.md", original);
			await writeFile(
				consumerContentRoot,
				"rules/always.md",
				"---\nload: always\n---\n\n# Always Rule\n"
			);

			const summary = await runUpdate({
				prismRepoRoot,
				consumerRepoRoot,
				prismContentRoot,
				consumerContentRoot,
			});

			assert.equal(await readFile(consumerRepoRoot, "AGENTS.md"), original);
			assert.equal(summary.agentsMdRefresh.refreshed, false);
			assert.deepEqual(summary.ruleLoadWarnings, []);
		}
	);
});

test("runUpdate treats a consumer rule missing load: as always-on and warns, never excludes it", async () => {
	await withTempRepoRoots(
		async ({ prismRepoRoot, consumerRepoRoot, prismContentRoot, consumerContentRoot }) => {
			await writeFile(
				prismContentRoot,
				"rules/shipped.md",
				"---\nload: always\n---\n\n# Shipped rule\n"
			);
			await writeFile(
				consumerRepoRoot,
				"AGENTS.md",
				[
					"# Agent Behavior Rules",
					"",
					AGENTS_MD_BLOCK_BEGIN,
					"",
					AGENTS_MD_BLOCK_END,
					"",
				].join("\n")
			);
			await writeFile(
				consumerContentRoot,
				"rules/legacy.md",
				"# Legacy Rule\n\nPredates the load: mechanism.\n"
			);

			const summary = await runUpdate({
				prismRepoRoot,
				consumerRepoRoot,
				prismContentRoot,
				consumerContentRoot,
			});

			const agentsMd = await readFile(consumerRepoRoot, "AGENTS.md");
			assert.match(
				agentsMd,
				/# Legacy Rule/,
				"undeclared rule is included (treated as always), never silently dropped"
			);
			assert.equal(summary.ruleLoadWarnings.length, 1);
			assert.match(summary.ruleLoadWarnings[0], /legacy\.md/);
			assert.match(summary.ruleLoadWarnings[0], /load:/);
		}
	);
});

test("runUpdate --dry-run does not write the consumer AGENTS.md block", async () => {
	await withTempRepoRoots(
		async ({ prismRepoRoot, consumerRepoRoot, prismContentRoot, consumerContentRoot }) => {
			await writeFile(
				prismContentRoot,
				"rules/shipped.md",
				"---\nload: always\n---\n\n# Shipped rule\n"
			);
			const original = [
				"# Agent Behavior Rules",
				"",
				AGENTS_MD_BLOCK_BEGIN,
				"",
				AGENTS_MD_BLOCK_END,
				"",
			].join("\n");
			await writeFile(consumerRepoRoot, "AGENTS.md", original);
			await writeFile(
				consumerContentRoot,
				"rules/always.md",
				"---\nload: always\n---\n\n# Always Rule\n"
			);

			const summary = await runUpdate({
				prismRepoRoot,
				consumerRepoRoot,
				prismContentRoot,
				consumerContentRoot,
				dryRun: true,
			});

			assert.equal(await readFile(consumerRepoRoot, "AGENTS.md"), original);
			assert.equal(summary.agentsMdRefresh.refreshed, true, "dry-run still reports what would change");
		}
	);
});

// --- unconditional warning emission + paths: preservation (PRISM-417 review fixes) ---

test("runUpdate warns on an undeclared consumer rule even when there is no AGENTS.md at all", async () => {
	await withTempRepoRoots(
		async ({ prismRepoRoot, consumerRepoRoot, prismContentRoot, consumerContentRoot }) => {
			await writeFile(
				prismContentRoot,
				"rules/shipped.md",
				"---\nload: always\n---\n\n# Shipped rule\n"
			);
			await writeFile(
				consumerContentRoot,
				"rules/legacy.md",
				"# Legacy Rule\n\nPredates the load: mechanism.\n"
			);

			const { result: summary, warnings } = await withCapturedWarnings(() =>
				runUpdate({
					prismRepoRoot,
					consumerRepoRoot,
					prismContentRoot,
					consumerContentRoot,
				})
			);

			assert.equal(
				await fileExists(consumerRepoRoot, "AGENTS.md"),
				false,
				"no AGENTS.md was created — the consumer seam never seeds one"
			);
			assert.equal(summary.agentsMdRefresh.refreshed, false);
			assert.equal(summary.ruleLoadWarnings.length, 1);
			assert.ok(
				warnings.some((w) => w.includes("legacy.md") && w.includes("load:")),
				`expected a printed warning naming legacy.md, got: ${JSON.stringify(warnings)}`
			);
		}
	);
});

test("runUpdate preserves paths: scoping for an undeclared rule instead of widening it to always-on", async () => {
	await withTempRepoRoots(
		async ({ prismRepoRoot, consumerRepoRoot, prismContentRoot, consumerContentRoot }) => {
			await writeFile(
				prismContentRoot,
				"rules/shipped.md",
				"---\nload: always\n---\n\n# Shipped rule\n"
			);
			await writeFile(
				consumerRepoRoot,
				"AGENTS.md",
				[
					"# Agent Behavior Rules",
					"",
					AGENTS_MD_BLOCK_BEGIN,
					"",
					AGENTS_MD_BLOCK_END,
					"",
				].join("\n")
			);
			await writeFile(
				consumerContentRoot,
				"rules/legacy-paths.md",
				'---\npaths:\n  - "**/*.tsx"\n---\n\n# Legacy Paths Rule\n'
			);

			const summary = await runUpdate({
				prismRepoRoot,
				consumerRepoRoot,
				prismContentRoot,
				consumerContentRoot,
			});

			const agentsMd = await readFile(consumerRepoRoot, "AGENTS.md");
			assert.doesNotMatch(
				agentsMd,
				/# Legacy Paths Rule/,
				"undeclared rule with paths: stays path-scoped — not inlined into the always-on AGENTS.md block"
			);
			assert.equal(summary.ruleLoadWarnings.length, 1);
			assert.match(summary.ruleLoadWarnings[0], /legacy-paths\.md/);
			assert.match(
				summary.ruleLoadWarnings[0],
				/load: paths/,
				"the warning states the preserved paths classification, not a blanket always-on claim"
			);
		}
	);
});

test("runUpdate warns on an undeclared rule in the .prism/custom overlay, labeled custom/ so it isn't confused with a base rule", async () => {
	await withTempRepoRoots(
		async ({ prismRepoRoot, consumerRepoRoot, prismContentRoot, consumerContentRoot }) => {
			await writeFile(
				prismContentRoot,
				"rules/shipped.md",
				"---\nload: always\n---\n\n# Shipped rule\n"
			);
			await writeFile(
				consumerRepoRoot,
				"AGENTS.md",
				[
					"# Agent Behavior Rules",
					"",
					AGENTS_MD_BLOCK_BEGIN,
					"",
					AGENTS_MD_BLOCK_END,
					"",
				].join("\n")
			);
			await writeFile(
				consumerContentRoot,
				"custom/rules/team.md",
				"# Team overlay rule\n\nNo load: key.\n"
			);

			const { result: summary, warnings } = await withCapturedWarnings(() =>
				runUpdate({
					prismRepoRoot,
					consumerRepoRoot,
					prismContentRoot,
					consumerContentRoot,
				})
			);

			assert.equal(
				summary.ruleLoadWarnings.length,
				1,
				"the overlay rule is warned on even though it never feeds the AGENTS.md block"
			);
			assert.match(summary.ruleLoadWarnings[0], /custom\/team\.md/);
			assert.ok(
				warnings.some((w) => w.includes("custom/team.md") && w.includes("load:")),
				`expected a printed warning naming custom/team.md, got: ${JSON.stringify(warnings)}`
			);

			const agentsMd = await readFile(consumerRepoRoot, "AGENTS.md");
			assert.match(
				agentsMd,
				/# Shipped rule/,
				"the base always-on rule still renders into the block"
			);
			assert.doesNotMatch(
				agentsMd,
				/# Team overlay rule/,
				"the overlay rule is classified for the warning but never inlined into AGENTS.md — Tier-1 inlining is a base-rules-only concern"
			);
		}
	);
});

test("runUpdate preserves paths: scoping for an undeclared overlay rule instead of widening it to always-on", async () => {
	await withTempRepoRoots(
		async ({ prismRepoRoot, consumerRepoRoot, prismContentRoot, consumerContentRoot }) => {
			await writeFile(
				prismContentRoot,
				"rules/shipped.md",
				"---\nload: always\n---\n\n# Shipped rule\n"
			);
			await writeFile(
				consumerContentRoot,
				"custom/rules/legacy-paths.md",
				'---\npaths:\n  - "**/*.tsx"\n---\n\n# Legacy Paths Overlay Rule\n'
			);

			const summary = await runUpdate({
				prismRepoRoot,
				consumerRepoRoot,
				prismContentRoot,
				consumerContentRoot,
			});

			assert.equal(summary.ruleLoadWarnings.length, 1);
			assert.match(summary.ruleLoadWarnings[0], /custom\/legacy-paths\.md/);
			assert.match(
				summary.ruleLoadWarnings[0],
				/load: paths/,
				"the warning states the preserved paths classification, not a blanket always-on claim"
			);
		}
	);
});

// --- content sources from the install seed, not the raw dogfooding tree (bug #2) ---

test("resolvePrismContentRoot resolves to the genericized install seed", () => {
	assert.equal(
		resolvePrismContentRoot("/repo"),
		path.join("/repo", "templates", "install", ".prism")
	);
});

test("runUpdate sources canonical content from the install seed, not the raw dogfooding tree", async () => {
	await withTempRepoRoots(
		async ({ prismRepoRoot, consumerRepoRoot, prismContentRoot, consumerContentRoot }) => {
			// Raw dogfooding tree and seed both carry the same relative path with
			// different content — the caller resolves prismContentRoot via
			// resolvePrismContentRoot, mirroring runAdoptCli/runUpdateCli.
			await writeFile(prismContentRoot, "rules/dogfooding-check.md", "# Raw content\n");
			const seedContentRoot = resolvePrismContentRoot(prismRepoRoot);
			await writeFile(seedContentRoot, "rules/dogfooding-check.md", "# Seed content\n");

			await runUpdate({
				prismRepoRoot,
				consumerRepoRoot,
				prismContentRoot: seedContentRoot,
				consumerContentRoot,
			});

			assert.equal(
				await readFile(consumerContentRoot, "rules/dogfooding-check.md"),
				"# Seed content\n",
				"consumer receives the seed content when the caller resolves the seam"
			);
		}
	);
});

test("runUpdate records the resolved package.json version in the consumer manifest, not 0.0.0", async () => {
	await withTempRepoRoots(
		async ({ prismRepoRoot, consumerRepoRoot, prismContentRoot, consumerContentRoot }) => {
			await writeFile(prismContentRoot, "rules/shipped.md", "# Shipped rule\n");
			await writeFile(
				prismRepoRoot,
				"package.json",
				`${JSON.stringify({ name: "@huntermcgrew/prism", version: "0.7.0" }, null, "\t")}\n`
			);

			await runUpdate({
				prismRepoRoot,
				consumerRepoRoot,
				prismContentRoot,
				consumerContentRoot,
			});

			const raw = await readFile(consumerContentRoot, SYNC_MANIFEST_FILENAME);
			const manifest = JSON.parse(raw) as SyncManifest;
			assert.equal(
				manifest.prismVersion,
				"0.7.0",
				"manifest records the version resolved from package.json, not the 0.0.0 fallback"
			);
		}
	);
});

test("applyFilePass called without versionMetadata still produces a valid summary (back-compat)", async () => {
	await withTempRoots(async ({ prismContentRoot, consumerContentRoot }) => {
		await writeFile(prismContentRoot, "rules/a.md", "# A\n");

		const summary = await applyFilePass(prismContentRoot, consumerContentRoot);

		assert.equal(outcomeFor(summary, "rules/a.md").action, "written");
		assert.deepEqual(summary.versionDelta, {
			previous: null,
			current: "0.0.0",
			changed: false,
		});
	});
});

// --- --dry-run tests (issue #376) ---

test("runUpdate --dry-run writes nothing but returns the full summary", async () => {
	await withTempRepoRoots(
		async ({
			prismRepoRoot,
			consumerRepoRoot,
			prismContentRoot,
			consumerContentRoot,
		}) => {
			await writeFile(prismContentRoot, "rules/shipped.md", "# Shipped rule\n");
			await writeFile(consumerContentRoot, "rules/local.md", "# Local rule\n");

			const summary = await runUpdate({
				prismRepoRoot,
				consumerRepoRoot,
				prismContentRoot,
				consumerContentRoot,
				dryRun: true,
			});

			const outcome = outcomeFor(summary, "rules/shipped.md");
			assert.equal(outcome.action, "written");
			assert.equal(
				await fileExists(consumerContentRoot, "rules/shipped.md"),
				false,
				"dry-run must not write the PRISM-owned file"
			);
			assert.equal(
				await fileExists(consumerContentRoot, SYNC_MANIFEST_FILENAME),
				false,
				"dry-run must not write the sync manifest"
			);
			assert.equal(
				await fileExists(consumerRepoRoot, ".claude/rules/local.md"),
				false,
				"dry-run must not run the platform content copy"
			);
			assert.equal(
				await fileExists(consumerRepoRoot, ".claude/skills/prism-sample/SKILL.md"),
				false,
				"dry-run must not project the persona roster"
			);
		}
	);
});

test("runUpdate --dry-run reports a diverged file as backed-up without writing anything", async () => {
	await withTempRepoRoots(
		async ({ prismRepoRoot, consumerRepoRoot, prismContentRoot, consumerContentRoot }) => {
			await writeFile(prismContentRoot, "rules/diverged.md", "# incoming\n");
			await writeFile(consumerContentRoot, "rules/diverged.md", "# hand-edited\n");

			const summary = await runUpdate({
				prismRepoRoot,
				consumerRepoRoot,
				prismContentRoot,
				consumerContentRoot,
				dryRun: true,
			});

			const outcome = outcomeFor(summary, "rules/diverged.md");
			assert.equal(outcome.action, "backed-up");
			assert.equal(
				await readFile(consumerContentRoot, "rules/diverged.md"),
				"# hand-edited\n",
				"dry-run must not overwrite the consumer's diverged file"
			);
			assert.equal(
				await fileExists(consumerContentRoot, "rules/diverged.md.bak"),
				false,
				"dry-run must not write a .bak"
			);
		}
	);
});

test("runUpdate --dry-run reports the same version delta a real run would record", async () => {
	await withTempRepoRoots(
		async ({ prismRepoRoot, consumerRepoRoot, prismContentRoot, consumerContentRoot }) => {
			await writeFile(prismContentRoot, "rules/shipped.md", "# Shipped rule\n");
			// runUpdate resolves prismVersion from the PRISM source's package.json
			// (resolvePrismVersion), not from the (possibly absent) source manifest —
			// see plan Decision "Version metadata from package.json".
			await writeFile(
				prismRepoRoot,
				"package.json",
				`${JSON.stringify({ name: "@huntermcgrew/prism", version: "0.7.0" }, null, "\t")}\n`
			);
			await writeConsumerManifest(consumerContentRoot, {}, "0.6.0");

			const summary = await runUpdate({
				prismRepoRoot,
				consumerRepoRoot,
				prismContentRoot,
				consumerContentRoot,
				dryRun: true,
			});

			assert.deepEqual(summary.versionDelta, {
				previous: "0.6.0",
				current: "0.7.0",
				changed: true,
			});
			const rawManifest = await readFile(consumerContentRoot, SYNC_MANIFEST_FILENAME);
			assert.equal(
				(JSON.parse(rawManifest) as SyncManifest).prismVersion,
				"0.6.0",
				"dry-run must not rewrite the sync manifest even though the delta was computed"
			);
		}
	);
});

// --- config schema validation tests (issue #376) ---

test("runUpdate refuses a config.json with a ticketPrefix that fails the schema pattern", async () => {
	await withTempRepoRoots(
		async ({ prismRepoRoot, consumerRepoRoot, prismContentRoot, consumerContentRoot }) => {
			await writeFile(prismContentRoot, "rules/rule.md", "# Rule\n");
			await writeFile(
				consumerRepoRoot,
				".ai-skills/config.json",
				`${JSON.stringify({ ...CONSUMER_CONFIG_JSON, ticketPrefix: "lowercase" }, null, "\t")}\n`
			);

			await assert.rejects(
				() =>
					runUpdate({
						prismRepoRoot,
						consumerRepoRoot,
						prismContentRoot,
						consumerContentRoot,
					}),
				(err: unknown) => {
					assert.ok(err instanceof Error);
					assert.ok(
						err.message.includes("/ticketPrefix"),
						`expected the offending field named in the message, got: ${err.message}`
					);
					return true;
				}
			);
			assert.equal(
				await fileExists(consumerContentRoot, "rules/rule.md"),
				false,
				"a schema-invalid config must fail before any file is written"
			);
		}
	);
});

test("runUpdate refuses a config.json missing a required field", async () => {
	await withTempRepoRoots(
		async ({ prismRepoRoot, consumerRepoRoot, prismContentRoot, consumerContentRoot }) => {
			await writeFile(prismContentRoot, "rules/rule.md", "# Rule\n");
			const { ticketSystem: _ticketSystem, ...withoutTicketSystem } = CONSUMER_CONFIG_JSON;
			await writeFile(
				consumerRepoRoot,
				".ai-skills/config.json",
				`${JSON.stringify(withoutTicketSystem, null, "\t")}\n`
			);

			await assert.rejects(
				() =>
					runUpdate({
						prismRepoRoot,
						consumerRepoRoot,
						prismContentRoot,
						consumerContentRoot,
					}),
				(err: unknown) => {
					assert.ok(err instanceof Error);
					assert.ok(
						err.message.includes("/ticketSystem"),
						`expected the offending field named in the message, got: ${err.message}`
					);
					return true;
				}
			);
			assert.equal(
				await fileExists(consumerContentRoot, "rules/rule.md"),
				false,
				"a schema-invalid config must fail before any file is written"
			);
		}
	);
});

// --- git-repo check tests (issue #376) ---

test("runUpdate fails fast when the consumer directory is not inside a git repository", async () => {
	const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "prism-update-nogit-"));
	try {
		const prismRepoRoot = path.join(tempRoot, "prism");
		const consumerRepoRoot = path.join(tempRoot, "consumer");
		const prismContentRoot = path.join(prismRepoRoot, ".prism");
		const consumerContentRoot = path.join(consumerRepoRoot, ".prism");
		await fs.mkdir(prismContentRoot, { recursive: true });
		await fs.mkdir(consumerContentRoot, { recursive: true });
		// Deliberately no gitInit(consumerRepoRoot) — this is the case under test.

		const realSchemaPath = path.join(process.cwd(), ".ai-skills", "config.schema.json");
		await fs.mkdir(path.join(prismRepoRoot, ".ai-skills"), { recursive: true });
		await fs.copyFile(
			realSchemaPath,
			path.join(prismRepoRoot, ".ai-skills", "config.schema.json")
		);

		await writeFile(prismContentRoot, "rules/rule.md", "# Rule\n");
		await writeFile(
			consumerRepoRoot,
			".ai-skills/config.json",
			`${JSON.stringify(CONSUMER_CONFIG_JSON, null, "\t")}\n`
		);

		await assert.rejects(
			() =>
				runUpdate({
					prismRepoRoot,
					consumerRepoRoot,
					prismContentRoot,
					consumerContentRoot,
				}),
			(err: unknown) => {
				assert.ok(err instanceof Error);
				assert.ok(
					err.message.includes("not inside a git repository"),
					`expected a git-repo refusal message, got: ${err.message}`
				);
				return true;
			}
		);
		assert.equal(
			await fileExists(consumerContentRoot, "rules/rule.md"),
			false,
			"a non-git target must fail before any file is written"
		);
	} finally {
		await fs.rm(tempRoot, { force: true, recursive: true });
	}
});
