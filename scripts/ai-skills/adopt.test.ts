/**
 * Coverage for `pnpm prism:adopt`'s seed and orchestration logic.
 *
 * Each test seeds a throwaway PRISM source layout (`.prism/` + `templates/install/.prism/`)
 * and a consumer root, runs the relevant function, and asserts the consumer file
 * state plus the returned summary. Branches covered: seed writes-absent /
 * seed skips-present / runAdopt produces .sync-manifest.json / byte-identical
 * consumer file is a no-op not a .bak / diverged consumer file preserved as .bak /
 * manifest-exists refusal / --dry-run leaves the filesystem untouched / config
 * schema validation names the offending field / git-repo check fails fast.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import test from "node:test";
import assert from "node:assert/strict";

import {
	assertConsumerIsEstablished,
	runAdopt,
	seedConsumerContentRoot,
} from "./adopt";
import {
	AGENTS_MD_BLOCK_BEGIN,
	AGENTS_MD_BLOCK_END,
	AGENTS_MD_SEEDED_MARKER,
} from "./agents-md-block";
import {
	ensureConsumerPathDefinitions,
	hashContent,
	listRelativeDirectoryEntries,
} from "./utils";
import { SYNC_MANIFEST_FILENAME, type SyncManifest } from "./sync-manifest";

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

/**
 * Sets up a temporary directory tree with isolated prism and consumer roots.
 * Provides `prismSourceRoot` (the PRISM repo root, containing both `.prism/`
 * and `templates/install/.prism/`) and `consumerRepoRoot`.
 *
 * `consumerRepoRoot` is git-initialized so `assertInsideGitRepo` (issue #376)
 * passes for every test that doesn't specifically exercise the git-repo
 * refusal path. `prismSourceRoot` gets a copy of the real `config.schema.json`
 * so `validateConsumerConfigAgainstSchema` validates against the actual schema
 * shape, not a hand-maintained test double that could drift from it.
 */
async function withTempRoots(
	body: (roots: {
		prismSourceRoot: string;
		prismContentRoot: string;
		installSeedRoot: string;
		consumerRepoRoot: string;
		consumerContentRoot: string;
	}) => Promise<void>
): Promise<void> {
	const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "prism-adopt-"));
	const prismSourceRoot = path.join(tempRoot, "prism");
	const prismContentRoot = path.join(prismSourceRoot, ".prism");
	const installSeedRoot = path.join(prismSourceRoot, "templates", "install", ".prism");
	const consumerRepoRoot = path.join(tempRoot, "consumer");
	const consumerContentRoot = path.join(consumerRepoRoot, ".prism");

	await fs.mkdir(prismContentRoot, { recursive: true });
	await fs.mkdir(installSeedRoot, { recursive: true });
	await fs.mkdir(consumerContentRoot, { recursive: true });
	gitInit(consumerRepoRoot);

	const realSchemaPath = path.join(
		process.cwd(),
		".ai-skills",
		"config.schema.json"
	);
	await fs.mkdir(path.join(prismSourceRoot, ".ai-skills"), { recursive: true });
	await fs.copyFile(
		realSchemaPath,
		path.join(prismSourceRoot, ".ai-skills", "config.schema.json")
	);

	try {
		await body({
			prismSourceRoot,
			prismContentRoot,
			installSeedRoot,
			consumerRepoRoot,
			consumerContentRoot,
		});
	} finally {
		await fs.rm(tempRoot, { force: true, recursive: true });
	}
}

async function writeFile(
	root: string,
	relativePath: string,
	content: string
): Promise<void> {
	const absolutePath = path.join(root, relativePath);
	await fs.mkdir(path.dirname(absolutePath), { recursive: true });
	await fs.writeFile(absolutePath, content, "utf8");
}

async function readFile(root: string, relativePath: string): Promise<string> {
	return fs.readFile(path.join(root, relativePath), "utf8");
}

async function fileExists(root: string, relativePath: string): Promise<boolean> {
	try {
		await fs.access(path.join(root, relativePath));
		return true;
	} catch {
		return false;
	}
}

async function writeConsumerManifest(
	consumerContentRoot: string,
	files: Record<string, string>
): Promise<void> {
	const manifest: SyncManifest = {
		prismVersion: "1.0.0",
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
		platformContentCopies: {
			claude: ".claude",
			codex: ".codex",
			cursor: ".cursor",
		},
	},
};

const CONSUMER_CONFIG_JSON = {
	org: "Acme",
	project: "Acme",
	ticketPrefix: "ACME",
	ticketSystem: { kind: "github-issues" },
};

// A paths.json whose generated block omits platformContentCopies — the structurally
// incomplete shape that crashes buildPlatformDirs when it dereferences `.claude`.
const STALE_CONSUMER_PATHS_JSON = {
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
	},
};

/**
 * Gives the temp roots the minimum needed for `runUpdate`'s platform refresh to
 * traverse: a consumer `config.json` + `paths.json`, and a PRISM source skill
 * (one persona) plus the matching `roles.json` entry. The persona body carries a
 * `${PROJECT}` token so the leftover-token guard has real substitution to verify.
 */
async function scaffoldConsumerAndSkills(roots: {
	prismSourceRoot: string;
	consumerRepoRoot: string;
}): Promise<void> {
	await writeFile(
		roots.consumerRepoRoot,
		".ai-skills/config.json",
		`${JSON.stringify(CONSUMER_CONFIG_JSON, null, "\t")}\n`
	);
	await writeFile(
		roots.consumerRepoRoot,
		".ai-skills/definitions/paths.json",
		`${JSON.stringify(CONSUMER_PATHS_JSON, null, "\t")}\n`
	);
	await writeFile(
		roots.prismSourceRoot,
		".ai-skills/skills/prism-sample/frontmatter.yml",
		"name: prism-sample\ndescription: Sample persona for tests.\n"
	);
	await writeFile(
		roots.prismSourceRoot,
		".ai-skills/skills/prism-sample/shared.md",
		"You are the sample persona for ${PROJECT}.\n"
	);
	await writeFile(
		roots.prismSourceRoot,
		".ai-skills/definitions/roles.json",
		`${JSON.stringify({ skills: [{ id: "prism-sample", persona: "Sample" }] }, null, "\t")}\n`
	);
	// The provisioner copies from prismSourceRoot/.ai-skills/definitions/paths.json
	// — write the package's copy so ensureConsumerPathDefinitions has a source to
	// provision from in both mode-A and mode-B tests.
	await writeFile(
		roots.prismSourceRoot,
		".ai-skills/definitions/paths.json",
		`${JSON.stringify(CONSUMER_PATHS_JSON, null, "\t")}\n`
	);
}

// --- seed tests ---

test("seed writes an absent file into the consumer content root", async () => {
	await withTempRoots(
		async ({ installSeedRoot, consumerContentRoot }) => {
			await writeFile(installSeedRoot, "rules/new-rule.md", "# New rule\n");

			const summary = await seedConsumerContentRoot(installSeedRoot, consumerContentRoot);

			assert.equal(
				await readFile(consumerContentRoot, "rules/new-rule.md"),
				"# New rule\n"
			);
			assert.deepEqual(summary.written, ["rules/new-rule.md"]);
			assert.deepEqual(summary.skipped, []);
		}
	);
});

test("seed writes a nested multi-segment path with a forward-slash-normalized summary key", async () => {
	await withTempRoots(
		async ({ installSeedRoot, consumerContentRoot }) => {
			// walkAndSeed builds its relativePath via
			// `path.relative(seedRoot, seedAbsolute).split(path.sep).join("/")` —
			// pins that a deeply nested seed path still lands at the correct
			// consumer location and reports a forward-slash key in the summary
			// on Windows, where `path.relative` returns backslash segments.
			await writeFile(
				installSeedRoot,
				"architect/_toolkit/nested/deep/doc.md",
				"# nested seed\n"
			);

			const summary = await seedConsumerContentRoot(installSeedRoot, consumerContentRoot);

			assert.equal(
				await readFile(consumerContentRoot, "architect/_toolkit/nested/deep/doc.md"),
				"# nested seed\n"
			);
			assert.deepEqual(summary.written, ["architect/_toolkit/nested/deep/doc.md"]);
			assert.ok(!summary.written[0].includes("\\"));
		}
	);
});

test("seed skips a path already present in the consumer", async () => {
	await withTempRoots(
		async ({ installSeedRoot, consumerContentRoot }) => {
			await writeFile(installSeedRoot, "rules/existing.md", "# Seed version\n");
			await writeFile(consumerContentRoot, "rules/existing.md", "# Consumer version\n");

			const summary = await seedConsumerContentRoot(installSeedRoot, consumerContentRoot);

			assert.equal(
				await readFile(consumerContentRoot, "rules/existing.md"),
				"# Consumer version\n",
				"consumer file must not be overwritten"
			);
			assert.deepEqual(summary.written, []);
			assert.deepEqual(summary.skipped, ["rules/existing.md"]);
		}
	);
});

test("seed writes absent files and skips present ones in the same pass", async () => {
	await withTempRoots(
		async ({ installSeedRoot, consumerContentRoot }) => {
			await writeFile(installSeedRoot, "rules/new.md", "# New\n");
			await writeFile(installSeedRoot, "rules/existing.md", "# Seed\n");
			await writeFile(consumerContentRoot, "rules/existing.md", "# Consumer\n");

			const summary = await seedConsumerContentRoot(installSeedRoot, consumerContentRoot);

			assert.equal(await readFile(consumerContentRoot, "rules/new.md"), "# New\n");
			assert.equal(
				await readFile(consumerContentRoot, "rules/existing.md"),
				"# Consumer\n"
			);
			assert.ok(summary.written.includes("rules/new.md"));
			assert.ok(summary.skipped.includes("rules/existing.md"));
		}
	);
});

// --- runAdopt orchestration tests ---

test("runAdopt produces a .sync-manifest.json after the first pass", async () => {
	await withTempRoots(
		async ({
			prismSourceRoot,
			installSeedRoot,
			consumerRepoRoot,
			consumerContentRoot,
		}) => {
			// Seed the PRISM install surface with a PRISM-owned file so runUpdate has
			// something to apply and rewriteConsumerManifest can record it. runUpdate
			// now sources canonical content from the install seed, not the raw
			// dogfooding .prism/ tree — see resolvePrismContentRoot.
			await writeFile(installSeedRoot, "rules/some-rule.md", "# Rule\n");
			await scaffoldConsumerAndSkills({ prismSourceRoot, consumerRepoRoot });

			const summary = await runAdopt({ prismSourceRoot, consumerRepoRoot });

			assert.ok(
				await fileExists(consumerContentRoot, SYNC_MANIFEST_FILENAME),
				"baseline manifest must exist after runAdopt"
			);

			const raw = await readFile(consumerContentRoot, SYNC_MANIFEST_FILENAME);
			const manifest = JSON.parse(raw) as SyncManifest;
			assert.ok(
				manifest.files["rules/some-rule.md"],
				"manifest records the PRISM-owned file written during adopt"
			);

			assert.ok(Array.isArray(summary.seed.written));
			assert.ok(Array.isArray(summary.update.outcomes));
		}
	);
});

test("runAdopt projects the persona roster into the consumer", async () => {
	await withTempRoots(
		async ({ prismSourceRoot, installSeedRoot, consumerRepoRoot }) => {
			await writeFile(installSeedRoot, "rules/some-rule.md", "# Rule\n");
			await scaffoldConsumerAndSkills({ prismSourceRoot, consumerRepoRoot });

			await runAdopt({ prismSourceRoot, consumerRepoRoot });

			const skillBody = await readFile(
				consumerRepoRoot,
				".claude/skills/prism-sample/SKILL.md"
			);
			assert.match(
				skillBody,
				/the sample persona for Acme/,
				"roster renders with the consumer's PROJECT token substituted"
			);
			assert.ok(
				await fileExists(
					consumerRepoRoot,
					".claude/skills/prism-sample/.ai-skill-generated"
				),
				"managed marker written so steady-state cleanup is marker-keyed"
			);
			assert.ok(
				await fileExists(consumerRepoRoot, ".codex/agents/prism-sample.toml"),
				"codex agent adapter projected on adopt"
			);
			assert.equal(
				/\$\{[A-Z][A-Z0-9_]*\}/.test(skillBody),
				false,
				"no leftover token survives in the projected roster"
			);
		}
	);
});

test("no-manifest byte-identical consumer file is a no-op, not a .bak", async () => {
	await withTempRoots(
		async ({
			prismSourceRoot,
			installSeedRoot,
			consumerRepoRoot,
			consumerContentRoot,
		}) => {
			// Consumer already has the file at the exact same bytes as PRISM ships.
			await writeFile(installSeedRoot, "rules/current.md", "# identical\n");
			await writeFile(consumerContentRoot, "rules/current.md", "# identical\n");
			await scaffoldConsumerAndSkills({ prismSourceRoot, consumerRepoRoot });

			const summary = await runAdopt({ prismSourceRoot, consumerRepoRoot });

			const outcome = summary.update.outcomes.find(
				(o) => o.relativePath === "rules/current.md"
			);
			assert.ok(outcome, "expected an outcome for rules/current.md");
			assert.equal(outcome.action, "no-op");
			assert.equal(summary.update.backups.length, 0);
			assert.equal(
				await fileExists(consumerContentRoot, "rules/current.md.bak"),
				false,
				"no .bak for a byte-identical file"
			);
		}
	);
});

test("diverged consumer file is preserved as .bak during runAdopt", async () => {
	await withTempRoots(
		async ({
			prismSourceRoot,
			installSeedRoot,
			consumerRepoRoot,
			consumerContentRoot,
		}) => {
			// PRISM ships an updated version; consumer has a hand-edited copy.
			// No manifest exists (first-contact scenario).
			await writeFile(installSeedRoot, "rules/rule.md", "# PRISM version\n");
			await writeFile(consumerContentRoot, "rules/rule.md", "# Hand-edited\n");
			await scaffoldConsumerAndSkills({ prismSourceRoot, consumerRepoRoot });

			const summary = await runAdopt({ prismSourceRoot, consumerRepoRoot });

			assert.equal(
				await readFile(consumerContentRoot, "rules/rule.md"),
				"# PRISM version\n",
				"consumer file updated to PRISM version"
			);
			assert.equal(
				await readFile(consumerContentRoot, "rules/rule.md.bak"),
				"# Hand-edited\n",
				"diverged consumer edit preserved as .bak"
			);

			const outcome = summary.update.outcomes.find(
				(o) => o.relativePath === "rules/rule.md"
			);
			assert.ok(outcome, "expected an outcome for rules/rule.md");
			assert.equal(outcome.action, "backed-up");
			assert.equal(summary.update.backups.length, 1);
		}
	);
});

// --- manifest-exists refusal test ---

test("assertConsumerIsEstablished throws when a .sync-manifest.json already exists", async () => {
	await withTempRoots(async ({ consumerContentRoot }) => {
		await writeConsumerManifest(consumerContentRoot, {});

		await assert.rejects(
			() => assertConsumerIsEstablished(consumerContentRoot),
			(err: unknown) => {
				assert.ok(err instanceof Error);
				assert.ok(
					err.message.includes("already has a PRISM baseline"),
					`expected refusal message, got: ${err.message}`
				);
				assert.ok(
					err.message.includes("pnpm prism:update"),
					`expected update guidance in message, got: ${err.message}`
				);
				return true;
			}
		);
	});
});

test("assertConsumerIsEstablished passes when no .sync-manifest.json exists", async () => {
	await withTempRoots(async ({ consumerContentRoot }) => {
		await assert.doesNotReject(() =>
			assertConsumerIsEstablished(consumerContentRoot)
		);
	});
});

test("runAdopt throws when .ai-skills/config.json is absent — points at prism init", async () => {
	await withTempRoots(
		async ({ prismSourceRoot, prismContentRoot, consumerRepoRoot }) => {
			await writeFile(prismContentRoot, "rules/some-rule.md", "# Rule\n");
			// Intentionally do NOT write .ai-skills/config.json — simulates a cold consumer
			// that has not run prism init yet.

			await assert.rejects(
				() => runAdopt({ prismSourceRoot, consumerRepoRoot }),
				(err: unknown) => {
					assert.ok(err instanceof Error);
					assert.ok(
						err.message.includes("npx @huntermcgrew/prism init"),
						`expected init guidance in message, got: ${err.message}`
					);
					return true;
				}
			);
		}
	);
});

test("runAdopt throws when a .sync-manifest.json already exists", async () => {
	await withTempRoots(
		async ({ prismSourceRoot, prismContentRoot, consumerRepoRoot, consumerContentRoot }) => {
			// Seed a PRISM source file so runUpdate has something to operate on,
			// then pre-seed a manifest to simulate a repo already in steady-state.
			// A repo in steady-state always has a config.json, so write one so the
			// config-guard passes and the manifest-guard is what fires.
			await writeFile(prismContentRoot, "rules/some-rule.md", "# Rule\n");
			await writeFile(
				consumerRepoRoot,
				".ai-skills/config.json",
				`${JSON.stringify(CONSUMER_CONFIG_JSON, null, "\t")}\n`
			);
			await writeConsumerManifest(consumerContentRoot, {});

			await assert.rejects(
				() => runAdopt({ prismSourceRoot, consumerRepoRoot }),
				(err: unknown) => {
					assert.ok(err instanceof Error);
					assert.ok(
						err.message.includes("already has a PRISM baseline"),
						`expected refusal message, got: ${err.message}`
					);
					assert.ok(
						err.message.includes("pnpm prism:update"),
						`expected update guidance in message, got: ${err.message}`
					);
					return true;
				}
			);
		}
	);
});

// --- paths.json provisioning tests (regression: cold-adopt crash #252) ---

test("runAdopt provisions an absent paths.json and completes (Mode A)", async () => {
	await withTempRoots(
		async ({ prismSourceRoot, installSeedRoot, consumerRepoRoot, consumerContentRoot }) => {
			await writeFile(installSeedRoot, "rules/some-rule.md", "# Rule\n");
			await scaffoldConsumerAndSkills({ prismSourceRoot, consumerRepoRoot });
			// Mode A: remove the consumer paths.json that scaffolding wrote, simulating
			// a cold consumer that ran prism init (config only) but has no paths.json.
			await fs.rm(path.join(consumerRepoRoot, ".ai-skills/definitions/paths.json"));

			const summary = await runAdopt({ prismSourceRoot, consumerRepoRoot });

			assert.equal(summary.pathsProvisioned, "written");
			assert.ok(
				await fileExists(consumerRepoRoot, ".ai-skills/definitions/paths.json"),
				"paths.json provisioned"
			);
			const provisioned = JSON.parse(
				await readFile(consumerRepoRoot, ".ai-skills/definitions/paths.json")
			);
			assert.equal(
				typeof provisioned.generated?.platformContentCopies?.claude,
				"string",
				"provisioned paths.json is structurally complete (has generated.platformContentCopies.claude)"
			);
			assert.equal(
				typeof provisioned.generated?.platformContentCopies?.codex,
				"string",
				"provisioned paths.json is structurally complete (has generated.platformContentCopies.codex)"
			);
			assert.equal(
				typeof provisioned.generated?.platformContentCopies?.cursor,
				"string",
				"provisioned paths.json is structurally complete (has generated.platformContentCopies.cursor)"
			);
			assert.ok(
				await fileExists(consumerContentRoot, SYNC_MANIFEST_FILENAME),
				"adopt completed and wrote the baseline manifest"
			);
		}
	);
});

test("runAdopt repairs an incomplete paths.json and completes (Mode B)", async () => {
	await withTempRoots(
		async ({ prismSourceRoot, installSeedRoot, consumerRepoRoot, consumerContentRoot }) => {
			await writeFile(installSeedRoot, "rules/some-rule.md", "# Rule\n");
			await scaffoldConsumerAndSkills({ prismSourceRoot, consumerRepoRoot });
			// Mode B: overwrite with the structurally incomplete shape — generated block
			// present but missing platformContentCopies, which crashes the platform refresh.
			await writeFile(
				consumerRepoRoot,
				".ai-skills/definitions/paths.json",
				`${JSON.stringify(STALE_CONSUMER_PATHS_JSON, null, "\t")}\n`
			);

			const summary = await runAdopt({ prismSourceRoot, consumerRepoRoot });

			assert.equal(summary.pathsProvisioned, "written");
			const repaired = JSON.parse(
				await readFile(consumerRepoRoot, ".ai-skills/definitions/paths.json")
			);
			assert.equal(
				typeof repaired.generated?.platformContentCopies?.claude,
				"string",
				"repaired paths.json is structurally complete (has generated.platformContentCopies.claude)"
			);
			assert.equal(
				typeof repaired.generated?.platformContentCopies?.codex,
				"string",
				"repaired paths.json is structurally complete (has generated.platformContentCopies.codex)"
			);
			assert.equal(
				typeof repaired.generated?.platformContentCopies?.cursor,
				"string",
				"repaired paths.json is structurally complete (has generated.platformContentCopies.cursor)"
			);
			assert.ok(
				await fileExists(consumerContentRoot, SYNC_MANIFEST_FILENAME),
				"adopt completed without the reading 'claude' crash"
			);
		}
	);
});

test("runAdopt leaves a complete consumer paths.json untouched (no clobber)", async () => {
	await withTempRoots(
		async ({ prismSourceRoot, installSeedRoot, consumerRepoRoot }) => {
			await writeFile(installSeedRoot, "rules/some-rule.md", "# Rule\n");
			await scaffoldConsumerAndSkills({ prismSourceRoot, consumerRepoRoot });
			// A complete consumer file with a customized (but structurally valid) value.
			const customized = {
				...CONSUMER_PATHS_JSON,
				generated: {
					...CONSUMER_PATHS_JSON.generated,
					claudeSkillsRoot: ".claude/custom-skills",
				},
			};
			await writeFile(
				consumerRepoRoot,
				".ai-skills/definitions/paths.json",
				`${JSON.stringify(customized, null, "\t")}\n`
			);

			const summary = await runAdopt({ prismSourceRoot, consumerRepoRoot });

			assert.equal(summary.pathsProvisioned, "ok");
			const after = JSON.parse(
				await readFile(consumerRepoRoot, ".ai-skills/definitions/paths.json")
			);
			assert.equal(
				after.generated.claudeSkillsRoot,
				".claude/custom-skills",
				"customized complete paths.json must not be clobbered"
			);
		}
	);
});

// --- --dry-run tests (issue #376) ---

test("runAdopt --dry-run writes nothing but returns the full summary", async () => {
	await withTempRoots(
		async ({
			prismSourceRoot,
			installSeedRoot,
			consumerRepoRoot,
			consumerContentRoot,
		}) => {
			// Phase A (seed) and phase B (runUpdate) now source from the same
			// install seed, so a single absent file is reported by both: phase A's
			// dry-run preview (seed.written) and phase B's dry-run preview
			// (update.outcomes "written") — neither actually persists.
			await writeFile(installSeedRoot, "rules/some-rule.md", "# Rule\n");
			await scaffoldConsumerAndSkills({ prismSourceRoot, consumerRepoRoot });

			const summary = await runAdopt({ prismSourceRoot, consumerRepoRoot, dryRun: true });

			assert.deepEqual(summary.seed.written, ["rules/some-rule.md"]);
			assert.equal(
				await fileExists(consumerContentRoot, "rules/some-rule.md"),
				false,
				"dry-run must not write the seed file"
			);

			const outcome = summary.update.outcomes.find(
				(o) => o.relativePath === "rules/some-rule.md"
			);
			assert.ok(outcome, "dry-run still computes the file-pass outcome");
			assert.equal(outcome.action, "written");
			assert.equal(
				await fileExists(consumerContentRoot, "rules/some-rule.md"),
				false,
				"dry-run must not write the PRISM-owned file"
			);
			assert.equal(
				await fileExists(consumerContentRoot, SYNC_MANIFEST_FILENAME),
				false,
				"dry-run must not write the sync manifest"
			);
			assert.equal(
				await fileExists(consumerRepoRoot, ".claude/skills/prism-sample/SKILL.md"),
				false,
				"dry-run must not project the persona roster"
			);
		}
	);
});

test("runAdopt --dry-run reports a diverged file as backed-up without writing a .bak", async () => {
	await withTempRoots(
		async ({
			prismSourceRoot,
			installSeedRoot,
			consumerRepoRoot,
			consumerContentRoot,
		}) => {
			await writeFile(installSeedRoot, "rules/rule.md", "# PRISM version\n");
			await writeFile(consumerContentRoot, "rules/rule.md", "# Hand-edited\n");
			await scaffoldConsumerAndSkills({ prismSourceRoot, consumerRepoRoot });

			const summary = await runAdopt({ prismSourceRoot, consumerRepoRoot, dryRun: true });

			const outcome = summary.update.outcomes.find(
				(o) => o.relativePath === "rules/rule.md"
			);
			assert.ok(outcome);
			assert.equal(outcome.action, "backed-up");
			assert.equal(
				await readFile(consumerContentRoot, "rules/rule.md"),
				"# Hand-edited\n",
				"dry-run must not touch the consumer's existing file"
			);
			assert.equal(
				await fileExists(consumerContentRoot, "rules/rule.md.bak"),
				false,
				"dry-run must not write a .bak"
			);
		}
	);
});

test("ensureConsumerPathDefinitions --dry-run reports 'written' without provisioning an absent paths.json", async () => {
	await withTempRoots(
		async ({ prismSourceRoot, consumerRepoRoot }) => {
			await scaffoldConsumerAndSkills({ prismSourceRoot, consumerRepoRoot });
			await fs.rm(path.join(consumerRepoRoot, ".ai-skills/definitions/paths.json"));

			const outcome = await ensureConsumerPathDefinitions(
				prismSourceRoot,
				consumerRepoRoot,
				true
			);

			assert.equal(outcome, "written", "dry-run reports the outcome a real run would have");
			assert.equal(
				await fileExists(consumerRepoRoot, ".ai-skills/definitions/paths.json"),
				false,
				"dry-run must not provision paths.json"
			);
		}
	);
});

// --- config schema validation tests (issue #376) ---

test("runAdopt refuses a config.json with a ticketPrefix that fails the schema pattern", async () => {
	await withTempRoots(
		async ({ prismSourceRoot, prismContentRoot, consumerRepoRoot, consumerContentRoot }) => {
			await writeFile(prismContentRoot, "rules/some-rule.md", "# Rule\n");
			await scaffoldConsumerAndSkills({ prismSourceRoot, consumerRepoRoot });
			await writeFile(
				consumerRepoRoot,
				".ai-skills/config.json",
				`${JSON.stringify({ ...CONSUMER_CONFIG_JSON, ticketPrefix: "not-valid" }, null, "\t")}\n`
			);

			await assert.rejects(
				() => runAdopt({ prismSourceRoot, consumerRepoRoot }),
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
				await fileExists(consumerContentRoot, "rules/some-rule.md"),
				false,
				"a schema-invalid config must fail before any file is written"
			);
		}
	);
});

test("runAdopt refuses a config.json with an unrecognized techStack entry", async () => {
	await withTempRoots(
		async ({ prismSourceRoot, prismContentRoot, consumerRepoRoot, consumerContentRoot }) => {
			await writeFile(prismContentRoot, "rules/some-rule.md", "# Rule\n");
			await scaffoldConsumerAndSkills({ prismSourceRoot, consumerRepoRoot });
			await writeFile(
				consumerRepoRoot,
				".ai-skills/config.json",
				`${JSON.stringify({ ...CONSUMER_CONFIG_JSON, techStack: ["not-a-real-stack"] }, null, "\t")}\n`
			);

			await assert.rejects(
				() => runAdopt({ prismSourceRoot, consumerRepoRoot }),
				(err: unknown) => {
					assert.ok(err instanceof Error);
					assert.ok(
						err.message.includes("techStack"),
						`expected the offending field named in the message, got: ${err.message}`
					);
					return true;
				}
			);
			assert.equal(
				await fileExists(consumerContentRoot, "rules/some-rule.md"),
				false,
				"a schema-invalid config must fail before any file is written"
			);
		}
	);
});

// --- root-file coexistence notices (issue #374) ---

test("runAdopt reports the absent-AGENTS.md notice and no CLAUDE.md notice when neither file exists", async () => {
	await withTempRoots(
		async ({ prismSourceRoot, installSeedRoot, consumerRepoRoot, consumerContentRoot }) => {
			await writeFile(installSeedRoot, "rules/some-rule.md", "# Rule\n");
			await scaffoldConsumerAndSkills({ prismSourceRoot, consumerRepoRoot });

			const summary = await runAdopt({ prismSourceRoot, consumerRepoRoot });

			assert.equal(summary.rootFileNotices.length, 1);
			assert.ok(
				summary.rootFileNotices[0].includes("no AGENTS.md found at repo root"),
				`expected the absent-AGENTS.md notice, got: ${summary.rootFileNotices.join(" | ")}`
			);
			assert.ok(
				summary.rootFileNotices[0].includes("docs/adopting-into-existing-repos.md"),
				"absent-AGENTS.md notice points at the coexistence doc"
			);
			assert.ok(
				!summary.rootFileNotices.some((n) => n.includes("CLAUDE.md")),
				"no CLAUDE.md notice fires when CLAUDE.md is absent"
			);
			assert.equal(
				await fileExists(consumerContentRoot, SYNC_MANIFEST_FILENAME),
				true,
				"adopt still completes successfully alongside the notice"
			);
		}
	);
});

test("runAdopt reports the present-AGENTS.md notice and no CLAUDE.md notice when both files exist", async () => {
	await withTempRoots(
		async ({ prismSourceRoot, installSeedRoot, consumerRepoRoot, consumerContentRoot }) => {
			await writeFile(installSeedRoot, "rules/some-rule.md", "# Rule\n");
			await scaffoldConsumerAndSkills({ prismSourceRoot, consumerRepoRoot });
			await writeFile(consumerRepoRoot, "AGENTS.md", "# AGENTS\n");
			await writeFile(consumerRepoRoot, "CLAUDE.md", "# CLAUDE.md\n");

			const summary = await runAdopt({ prismSourceRoot, consumerRepoRoot });

			assert.equal(summary.rootFileNotices.length, 1);
			assert.ok(
				summary.rootFileNotices[0].includes("existing AGENTS.md left untouched"),
				`expected the present-AGENTS.md notice, got: ${summary.rootFileNotices.join(" | ")}`
			);
			assert.ok(
				summary.rootFileNotices[0].includes("pnpm prism:build"),
				"present-AGENTS.md notice points at the build-time injection step"
			);
			assert.ok(
				!summary.rootFileNotices.some((n) => n.includes("CLAUDE.md")),
				"no CLAUDE.md notice fires when CLAUDE.md is present"
			);
			assert.equal(
				await fileExists(consumerContentRoot, SYNC_MANIFEST_FILENAME),
				true,
				"adopt still completes successfully alongside the notice"
			);
		}
	);
});

// --- --seed-agents-md tests (issue #393) ---

test("runAdopt seeds a minimal AGENTS.md when absent and the opt-in flag is given", async () => {
	await withTempRoots(
		async ({ prismSourceRoot, installSeedRoot, consumerRepoRoot, consumerContentRoot }) => {
			await writeFile(installSeedRoot, "rules/some-rule.md", "# Rule\n");
			await scaffoldConsumerAndSkills({ prismSourceRoot, consumerRepoRoot });

			const summary = await runAdopt({
				prismSourceRoot,
				consumerRepoRoot,
				seedAgentsMd: true,
			});

			assert.equal(summary.agentsMdSeeded, true);
			assert.ok(
				await fileExists(consumerRepoRoot, "AGENTS.md"),
				"AGENTS.md written when seedAgentsMd is true and the file is absent"
			);
			const seeded = await readFile(consumerRepoRoot, "AGENTS.md");
			assert.ok(
				seeded.includes(AGENTS_MD_SEEDED_MARKER),
				"seeded file carries the provenance marker"
			);
			assert.ok(seeded.includes(AGENTS_MD_BLOCK_BEGIN), "seeded file carries the begin marker");
			assert.ok(seeded.includes(AGENTS_MD_BLOCK_END), "seeded file carries the end marker");
			assert.equal(
				await fileExists(consumerContentRoot, SYNC_MANIFEST_FILENAME),
				true,
				"adopt still completes successfully alongside the seed"
			);
		}
	);
});

test("runAdopt does not seed AGENTS.md when absent and the opt-in flag is omitted", async () => {
	await withTempRoots(
		async ({ prismSourceRoot, installSeedRoot, consumerRepoRoot }) => {
			await writeFile(installSeedRoot, "rules/some-rule.md", "# Rule\n");
			await scaffoldConsumerAndSkills({ prismSourceRoot, consumerRepoRoot });

			const summary = await runAdopt({ prismSourceRoot, consumerRepoRoot });

			assert.equal(summary.agentsMdSeeded, false);
			assert.equal(
				await fileExists(consumerRepoRoot, "AGENTS.md"),
				false,
				"AGENTS.md is not created without the opt-in flag"
			);
			assert.ok(
				summary.rootFileNotices.some((n) => n.includes("no AGENTS.md found at repo root")),
				"the absent-AGENTS.md warning still prints without the opt-in flag"
			);
		}
	);
});

test("runAdopt never overwrites an existing AGENTS.md even with the opt-in flag given", async () => {
	await withTempRoots(
		async ({ prismSourceRoot, installSeedRoot, consumerRepoRoot }) => {
			await writeFile(installSeedRoot, "rules/some-rule.md", "# Rule\n");
			await scaffoldConsumerAndSkills({ prismSourceRoot, consumerRepoRoot });
			const consumerAuthored = "# My AGENTS.md\nCustom consumer content.\n";
			await writeFile(consumerRepoRoot, "AGENTS.md", consumerAuthored);

			const summary = await runAdopt({
				prismSourceRoot,
				consumerRepoRoot,
				seedAgentsMd: true,
			});

			assert.equal(summary.agentsMdSeeded, false);
			assert.equal(
				await readFile(consumerRepoRoot, "AGENTS.md"),
				consumerAuthored,
				"existing AGENTS.md is left byte-for-byte unchanged"
			);
		}
	);
});

test("runAdopt --dry-run computes the seed outcome but writes nothing", async () => {
	await withTempRoots(
		async ({ prismSourceRoot, installSeedRoot, consumerRepoRoot }) => {
			await writeFile(installSeedRoot, "rules/some-rule.md", "# Rule\n");
			await scaffoldConsumerAndSkills({ prismSourceRoot, consumerRepoRoot });

			const summary = await runAdopt({
				prismSourceRoot,
				consumerRepoRoot,
				seedAgentsMd: true,
				dryRun: true,
			});

			assert.equal(
				summary.agentsMdSeeded,
				true,
				"dry-run still reports the outcome a real run would produce"
			);
			assert.equal(
				await fileExists(consumerRepoRoot, "AGENTS.md"),
				false,
				"dry-run must not write AGENTS.md"
			);
		}
	);
});

// --- content sources from the install seed, not the raw dogfooding tree (bug #2) ---

test("runAdopt sources canonical content from the install seed, not the raw dogfooding tree", async () => {
	await withTempRoots(
		async ({
			prismSourceRoot,
			prismContentRoot,
			installSeedRoot,
			consumerRepoRoot,
			consumerContentRoot,
		}) => {
			// The raw dogfooding tree carries PRISM-internal literals; the seed is the
			// genericized version consumers must receive. Both source the same
			// relative path so a regression back to the raw tree would surface here.
			await writeFile(
				prismContentRoot,
				"rules/dogfooding-check.md",
				"# Raw rule citing THR-1881 and PRISM-1234\n"
			);
			await writeFile(
				installSeedRoot,
				"rules/dogfooding-check.md",
				"# Genericized rule\n"
			);
			await scaffoldConsumerAndSkills({ prismSourceRoot, consumerRepoRoot });

			await runAdopt({ prismSourceRoot, consumerRepoRoot });

			assert.equal(
				await readFile(consumerContentRoot, "rules/dogfooding-check.md"),
				"# Genericized rule\n",
				"consumer receives the seed content, not the raw dogfooding content"
			);
			assert.equal(
				await fileExists(consumerContentRoot, "rules/dogfooding-check.md.bak"),
				false,
				"a fresh adopt produces no .bak — phase A and phase B source the same seed"
			);

			const entries = await listRelativeDirectoryEntries(consumerContentRoot);
			for (const entry of entries) {
				if (entry.kind !== "file") {
					continue;
				}
				const content = await readFile(consumerContentRoot, entry.relativePath);
				assert.doesNotMatch(
					content,
					/(THR-[0-9]+|PRISM-[0-9]+)/,
					`no dogfooding literal expected in ${entry.relativePath}`
				);
			}
		}
	);
});

// --- dry-run tolerates a fresh consumer's absent/incomplete paths.json (bug #3) ---

test("runAdopt --dry-run completes on a fresh consumer with no paths.json", async () => {
	await withTempRoots(
		async ({ prismSourceRoot, installSeedRoot, consumerRepoRoot }) => {
			await writeFile(installSeedRoot, "rules/some-rule.md", "# Rule\n");
			await scaffoldConsumerAndSkills({ prismSourceRoot, consumerRepoRoot });
			// Fresh consumer: prism init ran (config.json exists) but paths.json does
			// not — the exact state ensureConsumerPathDefinitions's dry-run write-skip
			// leaves behind (see resolveRunPathDefinitions).
			await fs.rm(path.join(consumerRepoRoot, ".ai-skills/definitions/paths.json"));

			await assert.doesNotReject(() =>
				runAdopt({ prismSourceRoot, consumerRepoRoot, dryRun: true })
			);
		}
	);
});

test("runAdopt --dry-run completes when paths.json omits generated.platformContentCopies", async () => {
	await withTempRoots(
		async ({ prismSourceRoot, installSeedRoot, consumerRepoRoot }) => {
			await writeFile(installSeedRoot, "rules/some-rule.md", "# Rule\n");
			await scaffoldConsumerAndSkills({ prismSourceRoot, consumerRepoRoot });
			await writeFile(
				consumerRepoRoot,
				".ai-skills/definitions/paths.json",
				`${JSON.stringify(STALE_CONSUMER_PATHS_JSON, null, "\t")}\n`
			);

			await assert.doesNotReject(() =>
				runAdopt({ prismSourceRoot, consumerRepoRoot, dryRun: true })
			);
		}
	);
});

test("runAdopt --dry-run treats a malformed PRISM package paths.json as absent, not an unguarded crash", async () => {
	await withTempRoots(
		async ({ prismSourceRoot, installSeedRoot, consumerRepoRoot }) => {
			await writeFile(installSeedRoot, "rules/some-rule.md", "# Rule\n");
			await scaffoldConsumerAndSkills({ prismSourceRoot, consumerRepoRoot });
			// Fresh consumer (no paths.json) plus a corrupt PRISM package copy — the
			// dry-run fallback in resolveRunPathDefinitions must guard this parse the
			// same way it guards the consumer-file parse, falling through to the
			// strict loader's clear error instead of an unguarded JSON.parse throw.
			await fs.rm(path.join(consumerRepoRoot, ".ai-skills/definitions/paths.json"));
			await writeFile(
				prismSourceRoot,
				".ai-skills/definitions/paths.json",
				"{ not valid json"
			);

			await assert.rejects(
				() => runAdopt({ prismSourceRoot, consumerRepoRoot, dryRun: true }),
				(err: unknown) => {
					assert.ok(err instanceof Error);
					assert.ok(
						err.message.includes("Missing path definitions"),
						`expected the strict-loader fallback message, got: ${err.message}`
					);
					return true;
				}
			);
		}
	);
});

// --- git-repo check tests (issue #376) ---

test("runAdopt fails fast when the consumer directory is not inside a git repository", async () => {
	const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "prism-adopt-nogit-"));
	try {
		const prismSourceRoot = path.join(tempRoot, "prism");
		const prismContentRoot = path.join(prismSourceRoot, ".prism");
		const consumerRepoRoot = path.join(tempRoot, "consumer");
		const consumerContentRoot = path.join(consumerRepoRoot, ".prism");

		await fs.mkdir(prismContentRoot, { recursive: true });
		await fs.mkdir(consumerContentRoot, { recursive: true });
		// Deliberately no gitInit(consumerRepoRoot) — this is the case under test.

		const realSchemaPath = path.join(process.cwd(), ".ai-skills", "config.schema.json");
		await fs.mkdir(path.join(prismSourceRoot, ".ai-skills"), { recursive: true });
		await fs.copyFile(
			realSchemaPath,
			path.join(prismSourceRoot, ".ai-skills", "config.schema.json")
		);

		await writeFile(prismContentRoot, "rules/some-rule.md", "# Rule\n");
		await writeFile(
			consumerRepoRoot,
			".ai-skills/config.json",
			`${JSON.stringify(CONSUMER_CONFIG_JSON, null, "\t")}\n`
		);

		await assert.rejects(
			() => runAdopt({ prismSourceRoot, consumerRepoRoot }),
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
			await fileExists(consumerContentRoot, "rules/some-rule.md"),
			false,
			"a non-git target must fail before any file is written"
		);
	} finally {
		await fs.rm(tempRoot, { force: true, recursive: true });
	}
});

