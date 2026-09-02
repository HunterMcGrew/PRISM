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
	appendHookStateGitignoreLines,
	applyFilePass,
	assertSourceIsPlausible,
	mergeHookSettingsRegistration,
	refreshHookRuntime,
	resolvePrismContentRoot,
	runUpdate,
} from "./update";
import { hashContent, pathExists } from "./utils";
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

	// `runUpdate` loads this to invert the install-direction rename; empty
	// `renames` here since no test fixture uses a renamed seed file.
	await writeFile(
		prismRepoRoot,
		".ai-skills/definitions/seed-curation.json",
		`${JSON.stringify({ excluded: [], curated: [], seedOnly: [], renames: {} }, null, "\t")}\n`
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
		`${JSON.stringify({ skills: [{ id: "prism-sample", persona: "Sample", routing: "auto" }] }, null, "\t")}\n`
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

// --- hosts gating tests (PRISM-477 followup) ---

/** Overrides `CONSUMER_CONFIG_JSON` with a declared `hosts` array for one test run. */
async function writeHostsConfig(
	consumerRepoRoot: string,
	hosts: string[]
): Promise<void> {
	await writeFile(
		consumerRepoRoot,
		".ai-skills/config.json",
		`${JSON.stringify({ ...CONSUMER_CONFIG_JSON, hosts }, null, "\t")}\n`
	);
}

test("runUpdate projects the roster to every host when the config declares none", async () => {
	await withTempRepoRoots(
		async ({ prismRepoRoot, consumerRepoRoot, prismContentRoot, consumerContentRoot }) => {
			await writeFile(prismContentRoot, "rules/shipped.md", "# Shipped rule\n");

			await runUpdate({
				prismRepoRoot,
				consumerRepoRoot,
				prismContentRoot,
				consumerContentRoot,
			});

			for (const skillPath of [
				".claude/skills/prism-sample/SKILL.md",
				".agents/skills/prism-sample/SKILL.md",
				".cursor/skills/prism-sample/SKILL.md",
			]) {
				assert.equal(
					await fileExists(consumerRepoRoot, skillPath),
					true,
					`${skillPath} should exist when the config declares no hosts`
				);
			}
		}
	);
});

test("runUpdate projects the roster only to the hosts the config declares", async () => {
	await withTempRepoRoots(
		async ({ prismRepoRoot, consumerRepoRoot, prismContentRoot, consumerContentRoot }) => {
			await writeHostsConfig(consumerRepoRoot, ["codex"]);
			await writeFile(prismContentRoot, "rules/shipped.md", "# Shipped rule\n");

			await runUpdate({
				prismRepoRoot,
				consumerRepoRoot,
				prismContentRoot,
				consumerContentRoot,
			});

			assert.equal(
				await fileExists(consumerRepoRoot, ".agents/skills/prism-sample/SKILL.md"),
				true,
				"Codex's roster is written"
			);
			assert.equal(
				await fileExists(consumerRepoRoot, ".claude/skills/prism-sample/SKILL.md"),
				false,
				"Claude's roster is not written"
			);
			assert.equal(
				await fileExists(consumerRepoRoot, ".cursor/skills/prism-sample/SKILL.md"),
				false,
				"Cursor's roster is not written"
			);
		}
	);
});

test("runUpdate writes agent definitions and the Codex config only for their own host", async () => {
	await withTempRepoRoots(
		async ({ prismRepoRoot, consumerRepoRoot, prismContentRoot, consumerContentRoot }) => {
			await writeHostsConfig(consumerRepoRoot, ["claude"]);
			await writeFile(prismContentRoot, "rules/shipped.md", "# Shipped rule\n");

			await runUpdate({
				prismRepoRoot,
				consumerRepoRoot,
				prismContentRoot,
				consumerContentRoot,
			});

			assert.equal(
				await fileExists(consumerRepoRoot, ".claude/agents/prism-sample.md"),
				true,
				"Claude's agent definition is written"
			);
			assert.equal(
				await fileExists(consumerRepoRoot, ".codex/agents/prism-sample.toml"),
				false,
				"Codex's agent adapter is not written"
			);
			assert.equal(
				await fileExists(consumerRepoRoot, ".codex/codex-config.toml"),
				false,
				"the Codex config file is not written"
			);
		}
	);
});

test("runUpdate copies platform content only to the hosts the config declares", async () => {
	await withTempRepoRoots(
		async ({ prismRepoRoot, consumerRepoRoot, prismContentRoot, consumerContentRoot }) => {
			await writeHostsConfig(consumerRepoRoot, ["cursor"]);
			await writeFile(prismContentRoot, "rules/shipped.md", "# Shipped rule\n");
			await writeFile(consumerContentRoot, "rules/local.md", "# Local rule\n");

			await runUpdate({
				prismRepoRoot,
				consumerRepoRoot,
				prismContentRoot,
				consumerContentRoot,
			});

			assert.equal(
				await fileExists(consumerRepoRoot, ".cursor/rules/local.mdc"),
				true,
				"Cursor's rule copy is written"
			);
			assert.equal(
				await fileExists(consumerRepoRoot, ".claude/rules"),
				false,
				"Claude's platform content dir is not written"
			);
			assert.equal(
				await fileExists(consumerRepoRoot, ".codex/rules"),
				false,
				"Codex's platform content dir is not written"
			);
		}
	);
});

test("runUpdate scans only the roots it wrote for unresolved token literals", async () => {
	await withTempRepoRoots(
		async ({ prismRepoRoot, consumerRepoRoot, prismContentRoot, consumerContentRoot }) => {
			await writeHostsConfig(consumerRepoRoot, ["codex"]);
			await writeFile(prismContentRoot, "rules/shipped.md", "# Shipped rule\n");
			// A stale Claude skill left over from before `hosts` narrowed to Codex —
			// this run never touches `.claude/skills`, so an unresolved token there
			// must not fail the update.
			await writeFile(
				consumerRepoRoot,
				".claude/skills/stale-skill/SKILL.md",
				"Stale ${LEFTOVER_TOKEN} literal.\n"
			);

			await assert.doesNotReject(
				() =>
					runUpdate({
						prismRepoRoot,
						consumerRepoRoot,
						prismContentRoot,
						consumerContentRoot,
					}),
				"a leftover token in a root this pass did not write must not fail the update"
			);
		}
	);
});

test("runUpdate takes back a dropped host's roster, agent files, and content copies", async () => {
	await withTempRepoRoots(
		async ({ prismRepoRoot, consumerRepoRoot, prismContentRoot, consumerContentRoot }) => {
			await writeFile(prismContentRoot, "rules/shipped.md", "# Shipped rule\n");

			await runUpdate({
				prismRepoRoot,
				consumerRepoRoot,
				prismContentRoot,
				consumerContentRoot,
			});
			// Every host received output on the first pass, matching the schema's
			// absent-`hosts`-means-all default.
			assert.equal(
				await fileExists(consumerRepoRoot, ".claude/skills/prism-sample/SKILL.md"),
				true,
				"Claude's roster exists before the drop"
			);

			await writeHostsConfig(consumerRepoRoot, ["codex"]);
			await runUpdate({
				prismRepoRoot,
				consumerRepoRoot,
				prismContentRoot,
				consumerContentRoot,
			});

			for (const droppedPath of [
				".claude/skills/prism-sample",
				".cursor/skills/prism-sample",
				".claude/agents/prism-sample.md",
				".claude/rules",
				".cursor/rules",
			]) {
				assert.equal(
					await fileExists(consumerRepoRoot, droppedPath),
					false,
					`${droppedPath} is taken back out once codex is the only declared host`
				);
			}
			for (const keptPath of [
				".agents/skills/prism-sample/SKILL.md",
				".codex/rules/shipped.md",
			]) {
				assert.equal(
					await fileExists(consumerRepoRoot, keptPath),
					true,
					`${keptPath} survives the drop — codex is still declared`
				);
			}
		}
	);
});

test("a consumer's own file under a dropped host's directory survives the sweep", async () => {
	await withTempRepoRoots(
		async ({ prismRepoRoot, consumerRepoRoot, prismContentRoot, consumerContentRoot }) => {
			await writeFile(prismContentRoot, "rules/shipped.md", "# Shipped rule\n");

			await runUpdate({
				prismRepoRoot,
				consumerRepoRoot,
				prismContentRoot,
				consumerContentRoot,
			});

			// A hand-authored skill (no managed marker) and a loose note, both under
			// the Claude root that is about to be dropped.
			await writeFile(
				consumerRepoRoot,
				".claude/skills/my-own-skill/SKILL.md",
				"# My own skill\n"
			);
			await writeFile(consumerRepoRoot, ".claude/notes.md", "# Notes\n");

			await writeHostsConfig(consumerRepoRoot, ["codex"]);
			await runUpdate({
				prismRepoRoot,
				consumerRepoRoot,
				prismContentRoot,
				consumerContentRoot,
			});

			assert.equal(
				await fileExists(consumerRepoRoot, ".claude/skills/my-own-skill/SKILL.md"),
				true,
				"the unmarked skill directory survives the sweep"
			);
			assert.equal(
				await fileExists(consumerRepoRoot, ".claude/notes.md"),
				true,
				"the unmarked loose file survives the sweep"
			);
		}
	);
});

test("the Cursor skills sweep removes a marked skill and leaves an unmarked one, the same as Claude's", async () => {
	await withTempRepoRoots(
		async ({ prismRepoRoot, consumerRepoRoot, prismContentRoot, consumerContentRoot }) => {
			await writeFile(prismContentRoot, "rules/shipped.md", "# Shipped rule\n");

			await runUpdate({
				prismRepoRoot,
				consumerRepoRoot,
				prismContentRoot,
				consumerContentRoot,
			});
			assert.equal(
				await fileExists(consumerRepoRoot, ".cursor/skills/prism-sample/SKILL.md"),
				true,
				"Cursor's roster exists before the drop"
			);

			// A hand-authored skill (no managed marker) under the Cursor root that
			// is about to be dropped — Cursor's skill output is git-committed, so a
			// regression here lands in a consumer's history, not just their tree.
			await writeFile(
				consumerRepoRoot,
				".cursor/skills/my-own-skill/SKILL.md",
				"# My own skill\n"
			);

			await writeHostsConfig(consumerRepoRoot, ["codex"]);
			await runUpdate({
				prismRepoRoot,
				consumerRepoRoot,
				prismContentRoot,
				consumerContentRoot,
			});

			assert.equal(
				await fileExists(consumerRepoRoot, ".cursor/skills/prism-sample"),
				false,
				"the marker-bearing Cursor skill is removed once cursor is dropped"
			);
			assert.equal(
				await fileExists(consumerRepoRoot, ".cursor/skills/my-own-skill/SKILL.md"),
				true,
				"the unmarked Cursor skill directory survives the sweep"
			);
		}
	);
});

test("the Codex config is removed only when it still carries PRISM's generated header", async () => {
	await withTempRepoRoots(
		async ({ prismRepoRoot, consumerRepoRoot, prismContentRoot, consumerContentRoot }) => {
			await writeFile(prismContentRoot, "rules/shipped.md", "# Shipped rule\n");

			await runUpdate({
				prismRepoRoot,
				consumerRepoRoot,
				prismContentRoot,
				consumerContentRoot,
			});
			assert.equal(
				await fileExists(consumerRepoRoot, ".codex/codex-config.toml"),
				true,
				"the Codex config exists before the drop"
			);

			await writeHostsConfig(consumerRepoRoot, ["claude"]);
			await runUpdate({
				prismRepoRoot,
				consumerRepoRoot,
				prismContentRoot,
				consumerContentRoot,
			});
			assert.equal(
				await fileExists(consumerRepoRoot, ".codex/codex-config.toml"),
				false,
				"a Codex config still carrying PRISM's header is removed when codex is dropped"
			);
		}
	);

	await withTempRepoRoots(
		async ({ prismRepoRoot, consumerRepoRoot, prismContentRoot, consumerContentRoot }) => {
			await writeFile(prismContentRoot, "rules/shipped.md", "# Shipped rule\n");

			await runUpdate({
				prismRepoRoot,
				consumerRepoRoot,
				prismContentRoot,
				consumerContentRoot,
			});

			// The consumer replaced the generated file's contents entirely.
			await writeFile(
				consumerRepoRoot,
				".codex/codex-config.toml",
				"# hand-written by the consumer\n"
			);

			await writeHostsConfig(consumerRepoRoot, ["claude"]);
			await runUpdate({
				prismRepoRoot,
				consumerRepoRoot,
				prismContentRoot,
				consumerContentRoot,
			});
			assert.equal(
				await readFile(consumerRepoRoot, ".codex/codex-config.toml"),
				"# hand-written by the consumer\n",
				"a Codex config without PRISM's header is left alone when codex is dropped"
			);
		}
	);
});

test("runUpdate --dry-run previews a dropped host's removals without performing them", async () => {
	await withTempRepoRoots(
		async ({ prismRepoRoot, consumerRepoRoot, prismContentRoot, consumerContentRoot }) => {
			await writeFile(prismContentRoot, "rules/shipped.md", "# Shipped rule\n");

			await runUpdate({
				prismRepoRoot,
				consumerRepoRoot,
				prismContentRoot,
				consumerContentRoot,
			});

			await writeHostsConfig(consumerRepoRoot, ["codex"]);
			await runUpdate({
				prismRepoRoot,
				consumerRepoRoot,
				prismContentRoot,
				consumerContentRoot,
				dryRun: true,
			});

			for (const survivingPath of [
				".claude/skills/prism-sample/SKILL.md",
				".claude/agents/prism-sample.md",
				".claude/rules",
			]) {
				assert.equal(
					await fileExists(consumerRepoRoot, survivingPath),
					true,
					`${survivingPath} is still on disk after a dry-run that only previews the drop`
				);
			}
		}
	);
});

test("runUpdate applies a renamed seed file under its consumer name and records it in the manifest that way", async () => {
	await withTempRepoRoots(
		async ({
			prismRepoRoot,
			consumerRepoRoot,
			prismContentRoot,
			consumerContentRoot,
		}) => {
			await writeFile(prismContentRoot, "SPEC.md.tmpl", "# Seed SPEC\n");
			await writeFile(
				prismRepoRoot,
				".ai-skills/definitions/seed-curation.json",
				`${JSON.stringify(
					{ excluded: [], curated: [], seedOnly: [], renames: { "SPEC.md": "SPEC.md.tmpl" } },
					null,
					"\t"
				)}\n`
			);

			await runUpdate({
				prismRepoRoot,
				consumerRepoRoot,
				prismContentRoot,
				consumerContentRoot,
			});

			assert.equal(
				await readFile(consumerContentRoot, "SPEC.md"),
				"# Seed SPEC\n",
				"the seed's SPEC.md.tmpl bytes land at the consumer's SPEC.md"
			);
			assert.equal(
				await fileExists(consumerContentRoot, "SPEC.md.tmpl"),
				false,
				"the seed name is never written to the consumer"
			);

			const raw = await readFile(consumerContentRoot, SYNC_MANIFEST_FILENAME);
			const manifest = JSON.parse(raw) as SyncManifest;
			assert.ok(
				manifest.files["SPEC.md"],
				"the manifest records the renamed file under its consumer name"
			);
			assert.equal(
				"SPEC.md.tmpl" in manifest.files,
				false,
				"the manifest never records the file under its seed name"
			);
		}
	);
});

// --- anchor content renders at update time, and the PRISM source is never mutated ---

test("runUpdate renders the consumer's productDomain into the roster and leaves the PRISM source untouched", async () => {
	await withTempRepoRoots(
		async ({ prismRepoRoot, consumerRepoRoot, prismContentRoot, consumerContentRoot }) => {
			// assertSourceIsPlausible needs at least one PRISM-owned file under
			// .prism/ — unrelated to the anchor content this test exercises.
			await writeFile(prismContentRoot, "rules/shipped.md", "# Shipped rule\n");

			// Override the base fixture's config with a non-empty productDomain, and
			// give the persona source a `domain-context` anchor to substitute into.
			await writeFile(
				consumerRepoRoot,
				".ai-skills/config.json",
				`${JSON.stringify({ ...CONSUMER_CONFIG_JSON, productDomain: "home-service scheduling" }, null, "\t")}\n`
			);
			const sharedPath = ".ai-skills/skills/prism-sample/shared.md";
			await writeFile(
				prismRepoRoot,
				sharedPath,
				[
					"You build ${PROJECT} for ${TICKET_PREFIX}.",
					"",
					"<!-- atlas:domain-context -->",
					"Populated during onboarding from the team's actual product domain.",
					"<!-- atlas:end -->",
					"",
				].join("\n")
			);
			const beforeBytes = await readFile(prismRepoRoot, sharedPath);

			await runUpdate({
				prismRepoRoot,
				consumerRepoRoot,
				prismContentRoot,
				consumerContentRoot,
			});

			const skillBody = await readFile(
				consumerRepoRoot,
				".claude/skills/prism-sample/SKILL.md"
			);
			assert.match(
				skillBody,
				/home-service scheduling/,
				"the rendered persona carries the consumer's product domain"
			);
			assert.doesNotMatch(
				skillBody,
				/Populated during onboarding from the team's actual product domain\./,
				"the generic anchor default is replaced, not left in place"
			);

			// Nothing under the PRISM source's own .ai-skills/skills/ tree changed —
			// anchor substitution runs in memory against the rendered output only.
			const afterBytes = await readFile(prismRepoRoot, sharedPath);
			assert.equal(
				afterBytes,
				beforeBytes,
				"the canonical persona source is byte-identical after the update"
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

test("runUpdate refuses a config.json whose hosts array names an unrecognized host", async () => {
	await withTempRepoRoots(
		async ({ prismRepoRoot, consumerRepoRoot, prismContentRoot, consumerContentRoot }) => {
			await writeFile(prismContentRoot, "rules/rule.md", "# Rule\n");
			await writeFile(
				consumerRepoRoot,
				".ai-skills/config.json",
				`${JSON.stringify({ ...CONSUMER_CONFIG_JSON, hosts: ["claude", "windsurf"] }, null, "\t")}\n`
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
						err.message.includes("/hosts/1"),
						`expected the offending array element named in the message, got: ${err.message}`
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

// --- mergeHookSettingsRegistration: consumer-hook preservation ---

/**
 * PRISM's own hook registration block, mirroring
 * `templates/install/.claude/settings.json` closely enough to exercise the
 * merge without depending on that file's exact content.
 */
const PRISM_HOOK_SETTINGS = {
	hooks: {
		PostToolUse: [
			{
				matcher: "Read|Grep|Bash",
				hooks: [
					{
						type: "command",
						command:
							'node "$CLAUDE_PROJECT_DIR/.claude/hooks/hook.mjs" --tool=claude',
					},
				],
			},
		],
		PostCompact: [
			{
				hooks: [
					{
						type: "command",
						command:
							'node "$CLAUDE_PROJECT_DIR/.claude/hooks/hook.mjs" --tool=claude --event=PostCompact',
					},
				],
			},
		],
	},
};

async function withHookMergeRoots(
	body: (roots: {
		prismRepoRoot: string;
		consumerRepoRoot: string;
	}) => Promise<void>
): Promise<void> {
	const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "prism-hook-merge-"));
	const prismRepoRoot = path.join(tempRoot, "prism");
	const consumerRepoRoot = path.join(tempRoot, "consumer");
	await writeFile(
		prismRepoRoot,
		"templates/install/.claude/settings.json",
		`${JSON.stringify(PRISM_HOOK_SETTINGS, null, "\t")}\n`
	);
	try {
		await body({ prismRepoRoot, consumerRepoRoot });
	} finally {
		await fs.rm(tempRoot, { force: true, recursive: true });
	}
}

async function readConsumerSettings(
	consumerRepoRoot: string
): Promise<{ hooks?: Record<string, unknown[]> }> {
	return JSON.parse(
		await fs.readFile(
			path.join(consumerRepoRoot, ".claude", "settings.json"),
			"utf8"
		)
	) as { hooks?: Record<string, unknown[]> };
}

test("mergeHookSettingsRegistration: a consumer's own hook on an event PRISM also registers survives, and PRISM's is added", async () => {
	await withHookMergeRoots(async ({ prismRepoRoot, consumerRepoRoot }) => {
		const consumerOwnHook = {
			matcher: "Write",
			hooks: [{ type: "command", command: "./scripts/consumer-audit.sh" }],
		};
		await writeFile(
			consumerRepoRoot,
			".claude/settings.json",
			`${JSON.stringify({ hooks: { PostToolUse: [consumerOwnHook] } }, null, "\t")}\n`
		);

		await mergeHookSettingsRegistration(prismRepoRoot, consumerRepoRoot, false);

		const settings = await readConsumerSettings(consumerRepoRoot);
		const postToolUse = settings.hooks?.PostToolUse ?? [];
		assert.deepEqual(
			postToolUse[0],
			consumerOwnHook,
			"the consumer's own PostToolUse entry must survive the merge"
		);
		assert.equal(
			postToolUse.length,
			2,
			"PRISM's PostToolUse entry must be added alongside the consumer's"
		);
		assert.ok(
			JSON.stringify(postToolUse[1]).includes(".claude/hooks/hook.mjs"),
			"the second entry must be PRISM's own registration"
		);
		assert.ok(
			settings.hooks?.PostCompact,
			"PostCompact is added outright since the consumer never registered it"
		);
	});
});

test("mergeHookSettingsRegistration: running twice does not duplicate PRISM's entry or drift the consumer's", async () => {
	await withHookMergeRoots(async ({ prismRepoRoot, consumerRepoRoot }) => {
		const consumerOwnHook = {
			matcher: "Write",
			hooks: [{ type: "command", command: "./scripts/consumer-audit.sh" }],
		};
		await writeFile(
			consumerRepoRoot,
			".claude/settings.json",
			`${JSON.stringify({ hooks: { PostToolUse: [consumerOwnHook] } }, null, "\t")}\n`
		);

		await mergeHookSettingsRegistration(prismRepoRoot, consumerRepoRoot, false);
		const firstPass = await readConsumerSettings(consumerRepoRoot);

		await mergeHookSettingsRegistration(prismRepoRoot, consumerRepoRoot, false);
		const secondPass = await readConsumerSettings(consumerRepoRoot);

		assert.deepEqual(
			secondPass,
			firstPass,
			"a repeat merge must be a no-op byte-for-byte, not just entry-count-stable"
		);
		assert.equal(
			secondPass.hooks?.PostToolUse?.length,
			2,
			"the consumer entry plus exactly one PRISM entry — no duplicate PRISM registration"
		);
	});
});

test("mergeHookSettingsRegistration: a consumer with no prior settings file receives PRISM's registration untouched", async () => {
	await withHookMergeRoots(async ({ prismRepoRoot, consumerRepoRoot }) => {
		await mergeHookSettingsRegistration(prismRepoRoot, consumerRepoRoot, false);

		const settings = await readConsumerSettings(consumerRepoRoot);
		assert.equal(settings.hooks?.PostToolUse?.length, 1);
		assert.equal(settings.hooks?.PostCompact?.length, 1);
	});
});

const HOOK_RUNTIME_RELATIVE_PATHS = [
	"hook.mjs",
	"architect-route.mjs",
	"harnesses.mjs",
	"lib/match.mjs",
];

/** Stand-in for a delivered runtime file — carries the ownership marker `refreshHookRuntime` classifies on. */
function prismRuntimeSource(label: string): string {
	return `// @prism-hook-runtime\nexport const label = "${label}";\n`;
}

/**
 * Seeds a PRISM source tree carrying both halves `refreshHookRuntime` reads —
 * the hook runtime files and the settings block it merges — beside an empty
 * consumer root.
 */
async function withHookRuntimeRoots(
	body: (roots: {
		prismRepoRoot: string;
		consumerRepoRoot: string;
	}) => Promise<void>
): Promise<void> {
	const tempRoot = await fs.mkdtemp(
		path.join(os.tmpdir(), "prism-hook-runtime-")
	);
	const prismRepoRoot = path.join(tempRoot, "prism");
	const consumerRepoRoot = path.join(tempRoot, "consumer");
	// The real consumer root is always an existing git repo — `runUpdate` fails
	// fast otherwise — so the fixture creates it rather than leaving the seam to
	// tolerate a root that cannot occur.
	await fs.mkdir(consumerRepoRoot, { recursive: true });
	await writeFile(
		prismRepoRoot,
		"templates/install/.claude/settings.json",
		`${JSON.stringify(PRISM_HOOK_SETTINGS, null, "\t")}\n`
	);
	for (const relativePath of HOOK_RUNTIME_RELATIVE_PATHS) {
		await writeFile(
			prismRepoRoot,
			`scripts/ai-skills/hooks/${relativePath}`,
			prismRuntimeSource(relativePath)
		);
	}
	await writeFile(
		prismRepoRoot,
		"scripts/ai-skills/hooks/hook.d.mts",
		"export declare const label: string;\n"
	);
	try {
		await body({ prismRepoRoot, consumerRepoRoot });
	} finally {
		await fs.rm(tempRoot, { force: true, recursive: true });
	}
}

test("refreshHookRuntime: a consumer's own file at a runtime path is backed up, never silently overwritten", async () => {
	await withHookRuntimeRoots(async ({ prismRepoRoot, consumerRepoRoot }) => {
		const consumerOwnBody = "// the consumer's own hook, unrelated to PRISM\n";
		await writeFile(consumerRepoRoot, ".claude/hooks/hook.mjs", consumerOwnBody);

		const outcomes = await refreshHookRuntime(
			prismRepoRoot,
			consumerRepoRoot,
			false,
			["claude"]
		);

		assert.equal(
			await readFile(consumerRepoRoot, ".claude/hooks/hook.mjs.bak"),
			consumerOwnBody,
			"the consumer's bytes survive at the .bak path"
		);
		assert.equal(
			await readFile(consumerRepoRoot, ".claude/hooks/hook.mjs"),
			prismRuntimeSource("hook.mjs")
		);

		const hookOutcome = outcomes.find(
			(outcome) => outcome.relativePath === ".claude/hooks/hook.mjs"
		);
		assert.equal(
			hookOutcome?.action,
			"backed-up",
			"the run summary reports the backup rather than writing silently"
		);
		assert.ok(hookOutcome?.backupPath);
	});
});

test("refreshHookRuntime: an earlier PRISM copy is replaced in place with no backup", async () => {
	await withHookRuntimeRoots(async ({ prismRepoRoot, consumerRepoRoot }) => {
		await writeFile(
			consumerRepoRoot,
			".claude/hooks/hook.mjs",
			"// @prism-hook-runtime\nexport const label = \"an older version\";\n"
		);

		const outcomes = await refreshHookRuntime(
			prismRepoRoot,
			consumerRepoRoot,
			false,
			["claude"]
		);

		assert.equal(
			outcomes.find((o) => o.relativePath === ".claude/hooks/hook.mjs")?.action,
			"overwritten",
			"a marked file is PRISM's own at any version, so a version bump is not a divergence"
		);
		assert.equal(
			await pathExists(
				path.join(consumerRepoRoot, ".claude", "hooks", "hook.mjs.bak")
			),
			false,
			"replacing PRISM's own copy leaves no .bak behind"
		);
	});
});

test("refreshHookRuntime: an already-current file is a no-op", async () => {
	await withHookRuntimeRoots(async ({ prismRepoRoot, consumerRepoRoot }) => {
		await refreshHookRuntime(prismRepoRoot, consumerRepoRoot, false, ["claude"]);
		const outcomes = await refreshHookRuntime(
			prismRepoRoot,
			consumerRepoRoot,
			false,
			["claude"]
		);

		assert.deepEqual(
			outcomes.map((outcome) => outcome.action),
			HOOK_RUNTIME_RELATIVE_PATHS.map(() => "no-op"),
			"a repeat run rewrites nothing"
		);
	});
});

test("refreshHookRuntime: dryRun reports the same outcomes without touching the filesystem", async () => {
	await withHookRuntimeRoots(async ({ prismRepoRoot, consumerRepoRoot }) => {
		const consumerOwnBody = "// the consumer's own hook\n";
		await writeFile(consumerRepoRoot, ".claude/hooks/hook.mjs", consumerOwnBody);

		const outcomes = await refreshHookRuntime(
			prismRepoRoot,
			consumerRepoRoot,
			true,
			["claude"]
		);

		assert.equal(
			outcomes.find((o) => o.relativePath === ".claude/hooks/hook.mjs")?.action,
			"backed-up",
			"the preview names what a real run would do"
		);
		assert.equal(
			await readFile(consumerRepoRoot, ".claude/hooks/hook.mjs"),
			consumerOwnBody,
			"the consumer's file is left exactly as it was"
		);
		assert.equal(
			await pathExists(
				path.join(consumerRepoRoot, ".claude", "hooks", "architect-route.mjs")
			),
			false,
			"no runtime file is written"
		);
		assert.equal(
			await pathExists(path.join(consumerRepoRoot, ".gitignore")),
			false,
			"no .gitignore is created"
		);
	});
});

test("refreshHookRuntime: delivers the runtime modules only, not the type sidecars beside them", async () => {
	await withHookRuntimeRoots(async ({ prismRepoRoot, consumerRepoRoot }) => {
		await refreshHookRuntime(prismRepoRoot, consumerRepoRoot, false, ["claude"]);

		for (const relativePath of HOOK_RUNTIME_RELATIVE_PATHS) {
			assert.ok(
				await pathExists(
					path.join(consumerRepoRoot, ".claude", "hooks", ...relativePath.split("/"))
				),
				`${relativePath} is delivered`
			);
		}
		assert.equal(
			await pathExists(
				path.join(consumerRepoRoot, ".claude", "hooks", "hook.d.mts")
			),
			false,
			"declaration sidecars exist for PRISM's own type-check and are inert in a consumer"
		);
	});
});

test("refreshHookRuntime: prunes a marked file it no longer ships, backs it up first, and leaves the consumer's own alongside it", async () => {
	await withHookRuntimeRoots(async ({ prismRepoRoot, consumerRepoRoot }) => {
		const staleContents = prismRuntimeSource("a runtime file from a past version");
		await writeFile(
			consumerRepoRoot,
			".claude/hooks/claude-post-read.mjs",
			staleContents
		);
		const consumerScript = "#!/usr/bin/env node\nconsole.log('mine');\n";
		await writeFile(
			consumerRepoRoot,
			".claude/hooks/consumer-audit.mjs",
			consumerScript
		);

		const outcomes = await refreshHookRuntime(
			prismRepoRoot,
			consumerRepoRoot,
			false,
			["claude"]
		);

		const pruned = outcomes.find(
			(o) => o.relativePath === ".claude/hooks/claude-post-read.mjs"
		);
		assert.equal(pruned?.action, "removed-with-backup");
		assert.equal(
			await pathExists(
				path.join(consumerRepoRoot, ".claude", "hooks", "claude-post-read.mjs")
			),
			false,
			"a renamed runtime file does not stay resident forever"
		);
		assert.ok(pruned?.backupPath, "the outcome names the backup path");
		assert.equal(
			await readFile(consumerRepoRoot, ".claude/hooks/claude-post-read.mjs.bak"),
			staleContents,
			"a marked file carried at a path PRISM no longer ships is recoverable, not silently lost — it may be a consumer's own adaptation"
		);
		assert.equal(
			await readFile(consumerRepoRoot, ".claude/hooks/consumer-audit.mjs"),
			consumerScript,
			"an unmarked file sharing the directory is the consumer's and is never removed"
		);
	});
});

test("refreshHookRuntime: the backup of a pruned file is not itself pruned on the next run", async () => {
	await withHookRuntimeRoots(async ({ prismRepoRoot, consumerRepoRoot }) => {
		const adapted = prismRuntimeSource("a consumer's adaptation of a delivered file");
		await writeFile(
			consumerRepoRoot,
			".claude/hooks/my-adapted-hook.mjs",
			adapted
		);

		const backupNamesPerRun: string[][] = [];
		const prunedPerRun: number[] = [];
		for (let run = 0; run < 4; run += 1) {
			const outcomes = await refreshHookRuntime(
				prismRepoRoot,
				consumerRepoRoot,
				false,
				["claude"]
			);
			prunedPerRun.push(
				outcomes.filter((o) => o.action === "removed-with-backup").length
			);
			const names = await fs.readdir(
				path.join(consumerRepoRoot, ".claude", "hooks")
			);
			backupNamesPerRun.push(
				names.filter((name) => name.startsWith("my-adapted-hook")).sort()
			);
		}

		assert.deepEqual(
			prunedPerRun,
			[1, 0, 0, 0],
			"the adaptation is pruned once; the backup PRISM wrote is never a later run's prune target"
		);
		for (const names of backupNamesPerRun) {
			assert.deepEqual(
				names,
				["my-adapted-hook.mjs.bak"],
				"the backup name is stable across runs — a growing `.bak.bak.bak` chain means prune is re-selecting its own output"
			);
		}
		assert.equal(
			await readFile(consumerRepoRoot, ".claude/hooks/my-adapted-hook.mjs.bak"),
			adapted,
			"the recovery guarantee holds past the first update cycle"
		);
	});
});

test("refreshHookRuntime: a repo that does not run Claude Code receives no runtime, no registration, and no gitignore lines", async () => {
	await withHookRuntimeRoots(async ({ prismRepoRoot, consumerRepoRoot }) => {
		await refreshHookRuntime(prismRepoRoot, consumerRepoRoot, false, ["codex", "cursor"]);

		assert.equal(
			await pathExists(path.join(consumerRepoRoot, ".claude", "hooks", "hook.mjs")),
			false,
			"no runtime file is delivered"
		);
		assert.equal(
			await pathExists(path.join(consumerRepoRoot, ".claude", "settings.json")),
			false,
			"no settings registration is written"
		);
		assert.equal(
			await pathExists(path.join(consumerRepoRoot, ".gitignore")),
			false,
			"no gitignore lines are appended"
		);
	});
});

test("refreshHookRuntime: dropping Claude Code from hosts takes back the delivered runtime and PRISM's registration", async () => {
	await withHookRuntimeRoots(async ({ prismRepoRoot, consumerRepoRoot }) => {
		await refreshHookRuntime(prismRepoRoot, consumerRepoRoot, false, ["claude"]);
		await refreshHookRuntime(prismRepoRoot, consumerRepoRoot, false, ["codex"]);

		for (const relativePath of HOOK_RUNTIME_RELATIVE_PATHS) {
			assert.equal(
				await pathExists(
					path.join(consumerRepoRoot, ".claude", "hooks", ...relativePath.split("/"))
				),
				false,
				`${relativePath} is removed`
			);
		}

		const settings = await readConsumerSettings(consumerRepoRoot);
		assert.ok(
			!JSON.stringify(settings).includes(".claude/hooks/hook.mjs"),
			"PRISM's registration no longer names the runtime path"
		);
	});
});

test("refreshHookRuntime: a consumer's own hook on an event PRISM registered survives the removal", async () => {
	await withHookRuntimeRoots(async ({ prismRepoRoot, consumerRepoRoot }) => {
		const consumerOwnHook = {
			matcher: "Write",
			hooks: [{ type: "command", command: "./scripts/consumer-audit.sh" }],
		};
		await writeFile(
			consumerRepoRoot,
			".claude/settings.json",
			`${JSON.stringify({ hooks: { PostToolUse: [consumerOwnHook] } }, null, "\t")}\n`
		);

		await refreshHookRuntime(prismRepoRoot, consumerRepoRoot, false, ["claude"]);
		await refreshHookRuntime(prismRepoRoot, consumerRepoRoot, false, ["codex"]);

		const settings = await readConsumerSettings(consumerRepoRoot);
		assert.deepEqual(
			settings.hooks?.PostToolUse,
			[consumerOwnHook],
			"the consumer's PostToolUse entry is the only one left"
		);
		assert.ok(
			!settings.hooks || !("PostCompact" in settings.hooks),
			"PostCompact, which only PRISM registered, is dropped entirely rather than left as an empty array"
		);
	});
});

test("refreshHookRuntime: an unmarked file at a runtime path survives the removal", async () => {
	await withHookRuntimeRoots(async ({ prismRepoRoot, consumerRepoRoot }) => {
		const consumerOwnBody = "// the consumer's own hook, unrelated to PRISM\n";
		await writeFile(consumerRepoRoot, ".claude/hooks/hook.mjs", consumerOwnBody);

		await refreshHookRuntime(prismRepoRoot, consumerRepoRoot, false, ["codex"]);

		assert.equal(
			await readFile(consumerRepoRoot, ".claude/hooks/hook.mjs"),
			consumerOwnBody,
			"a file without the ownership marker is never removed"
		);
	});
});

test("refreshHookRuntime: the state-file gitignore lines are left in place when Claude Code is dropped", async () => {
	await withHookRuntimeRoots(async ({ prismRepoRoot, consumerRepoRoot }) => {
		await refreshHookRuntime(prismRepoRoot, consumerRepoRoot, false, ["claude"]);
		await refreshHookRuntime(prismRepoRoot, consumerRepoRoot, false, ["codex"]);

		const gitignore = await readFile(consumerRepoRoot, ".gitignore");
		assert.ok(
			gitignore.includes(".prism/architect-route-state.*.json"),
			"the state-file glob is not removed"
		);
		assert.ok(
			gitignore.includes(".prism/architect-route-state.*.json.tmp"),
			"the tmp-sidecar glob is not removed"
		);
	});
});

test("refreshHookRuntime: dryRun previews a removal without performing it", async () => {
	await withHookRuntimeRoots(async ({ prismRepoRoot, consumerRepoRoot }) => {
		await refreshHookRuntime(prismRepoRoot, consumerRepoRoot, false, ["claude"]);

		const outcomes = await refreshHookRuntime(
			prismRepoRoot,
			consumerRepoRoot,
			true,
			["codex"]
		);

		const removedPaths = outcomes
			.filter((o) => o.action === "removed")
			.map((o) => o.relativePath);
		assert.ok(
			HOOK_RUNTIME_RELATIVE_PATHS.every((relativePath) =>
				removedPaths.includes(`.claude/hooks/${relativePath}`)
			),
			"the preview names every runtime path it would remove"
		);

		for (const relativePath of HOOK_RUNTIME_RELATIVE_PATHS) {
			assert.ok(
				await pathExists(
					path.join(consumerRepoRoot, ".claude", "hooks", ...relativePath.split("/"))
				),
				`${relativePath} is still on disk — dryRun performs nothing`
			);
		}
	});
});

test("mergeHookSettingsRegistration: a consumer command that merely mentions the entry point is not treated as PRISM's", async () => {
	await withHookMergeRoots(async ({ prismRepoRoot, consumerRepoRoot }) => {
		const wrapper = {
			matcher: "Read",
			hooks: [
				{
					type: "command",
					command:
						"bash -c 'my-lint && node .claude/hooks/hook.mjs --tool=claude'",
				},
			],
		};
		const backupTwin = {
			matcher: "Read",
			hooks: [
				{
					type: "command",
					command:
						'node "$CLAUDE_PROJECT_DIR/.claude/hooks/hook.mjs.bak" --tool=claude',
				},
			],
		};
		await writeFile(
			consumerRepoRoot,
			".claude/settings.json",
			`${JSON.stringify({ hooks: { PostToolUse: [wrapper, backupTwin] } }, null, "\t")}\n`
		);

		await mergeHookSettingsRegistration(prismRepoRoot, consumerRepoRoot, false);

		const postToolUse =
			(await readConsumerSettings(consumerRepoRoot)).hooks?.PostToolUse ?? [];
		assert.deepEqual(
			postToolUse.slice(0, 2),
			[wrapper, backupTwin],
			"a wrapper command and a .bak-twin registration are the consumer's, not PRISM's"
		);
		assert.equal(postToolUse.length, 3, "PRISM's own entry is appended alongside");
	});
});

test("appendHookStateGitignoreLines: writes both state-file globs as exact lines", async () => {
	await withHookRuntimeRoots(async ({ consumerRepoRoot }) => {
		await appendHookStateGitignoreLines(consumerRepoRoot, false);

		const lines = (await readFile(consumerRepoRoot, ".gitignore")).split("\n");
		assert.ok(lines.includes(".prism/architect-route-state.*.json"));
		assert.ok(lines.includes(".prism/architect-route-state.*.json.tmp"));
	});
});

test("appendHookStateGitignoreLines: appends after a file with no trailing newline without joining lines", async () => {
	await withHookRuntimeRoots(async ({ consumerRepoRoot }) => {
		await writeFile(consumerRepoRoot, ".gitignore", "node_modules");

		await appendHookStateGitignoreLines(consumerRepoRoot, false);

		const lines = (await readFile(consumerRepoRoot, ".gitignore")).split("\n");
		assert.ok(lines.includes("node_modules"), "the existing entry stays its own line");
		assert.ok(lines.includes(".prism/architect-route-state.*.json"));
	});
});

test("appendHookStateGitignoreLines: running twice leaves exactly one copy of each line", async () => {
	await withHookRuntimeRoots(async ({ consumerRepoRoot }) => {
		await appendHookStateGitignoreLines(consumerRepoRoot, false);
		await appendHookStateGitignoreLines(consumerRepoRoot, false);

		const lines = (await readFile(consumerRepoRoot, ".gitignore")).split("\n");
		for (const expected of [
			".prism/architect-route-state.*.json",
			".prism/architect-route-state.*.json.tmp",
		]) {
			assert.equal(
				lines.filter((line) => line === expected).length,
				1,
				`${expected} appears exactly once after a repeat run`
			);
		}
	});
});
