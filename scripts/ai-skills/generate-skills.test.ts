/**
 * Coverage for the root-agnostic `generatePlatformSkills`.
 *
 * Each test seeds a throwaway skill source (one or more `prism-*` skill dirs
 * plus a roleMap) and renders into a throwaway set of target roots with a
 * foreign token map, then asserts on the rendered output. Branches covered:
 * foreign-config render into a separate output root / token substitution /
 * no leftover `${}` survives / managed marker written on every platform /
 * update→check idempotency / dropped persona orphan-cleaned / a consumer's
 * marker-less `prism-*` dir survives cleanup untouched (the marker-keyed
 * safety guarantee). A final test renders the real PRISM source in check mode
 * against the committed `.claude/skills` output to prove the extracted
 * function still matches PRISM's own build byte-for-byte.
 */
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import test from "node:test";
import assert from "node:assert/strict";

import {
	buildRoleMap,
	generatePlatformSkills,
	type GeneratePlatformSkillsOptions,
} from "./generate-skills";
import { deriveTokenMap, type PrismConfig } from "./lib/tokens";
import { runLeftoverTokenGuard } from "./literal-guard";
import { loadPathDefinitions, MANAGED_MARKER, pathExists } from "./utils";

const FOREIGN_CONFIG: PrismConfig = {
	org: "Acme",
	project: "AcmeApp",
	ticketPrefix: "ACME",
	ticketSystem: { kind: "github-issues" },
};

async function withTempRoots(
	body: (roots: {
		repoRoot: string;
		sourceSkillsRoot: string;
		targetRoots: GeneratePlatformSkillsOptions["targetRoots"];
		codexConfigPath: string;
	}) => Promise<void>
): Promise<void> {
	const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "prism-gen-skills-"));
	const sourceSkillsRoot = path.join(repoRoot, "source");
	const out = path.join(repoRoot, "out");
	const targetRoots = {
		claude: path.join(out, ".claude", "skills"),
		claudeAgents: path.join(out, ".claude", "agents"),
		codex: path.join(out, ".agents", "skills"),
		codexAgents: path.join(out, ".codex", "agents"),
		cursor: path.join(out, ".cursor", "skills"),
	};
	const codexConfigPath = path.join(out, ".codex", "codex-config.toml");
	await fs.mkdir(sourceSkillsRoot, { recursive: true });
	try {
		await body({ repoRoot, sourceSkillsRoot, targetRoots, codexConfigPath });
	} finally {
		await fs.rm(repoRoot, { force: true, recursive: true });
	}
}

async function writeSkillSource(
	sourceSkillsRoot: string,
	skillId: string,
	sharedBody: string
): Promise<void> {
	const skillRoot = path.join(sourceSkillsRoot, skillId);
	await fs.mkdir(skillRoot, { recursive: true });
	await fs.writeFile(
		path.join(skillRoot, "frontmatter.yml"),
		`name: ${skillId}\ndescription: ${skillId} test persona.\n`,
		"utf8"
	);
	await fs.writeFile(path.join(skillRoot, "shared.md"), sharedBody, "utf8");
}

const ALL_OPTED_IN = {
	claude: true,
	codex: true,
	cursor: true,
	codexAgents: true,
	claudeAgents: true,
	codexConfig: true,
};

function optionsFor(
	roots: {
		sourceSkillsRoot: string;
		targetRoots: GeneratePlatformSkillsOptions["targetRoots"];
		codexConfigPath: string;
	},
	roleIds: { id: string; persona: string }[],
	checkMode: boolean,
	changedPaths: string[]
): GeneratePlatformSkillsOptions {
	return {
		sourceSkillsRoot: roots.sourceSkillsRoot,
		targetRoots: roots.targetRoots,
		codexConfigPath: roots.codexConfigPath,
		roleMap: buildRoleMap({ skills: roleIds }),
		tokenMap: deriveTokenMap(FOREIGN_CONFIG),
		optedIn: ALL_OPTED_IN,
		checkMode,
		changedPaths,
	};
}

test("renders a foreign-config roster into a separate output root", async () => {
	await withTempRoots(async (roots) => {
		await writeSkillSource(
			roots.sourceSkillsRoot,
			"prism-sample",
			"You build ${PROJECT} for ${TICKET_PREFIX}.\n"
		);

		const changedPaths: string[] = [];
		const { knownSkillIds } = await generatePlatformSkills(
			optionsFor(
				roots,
				[{ id: "prism-sample", persona: "Sample" }],
				false,
				changedPaths
			)
		);

		assert.ok(knownSkillIds.has("prism-sample"));

		const skillBody = await fs.readFile(
			path.join(roots.targetRoots.claude, "prism-sample", "SKILL.md"),
			"utf8"
		);
		assert.match(skillBody, /You build AcmeApp for ACME\./);
		assert.ok(
			await pathExists(
				path.join(roots.targetRoots.claude, "prism-sample", MANAGED_MARKER)
			),
			"managed marker written into the claude skill dir"
		);
		assert.ok(
			await pathExists(
				path.join(roots.targetRoots.codex, "prism-sample", MANAGED_MARKER)
			),
			"managed marker written into the codex skill dir"
		);
		assert.ok(
			await pathExists(
				path.join(roots.targetRoots.cursor, "prism-sample", MANAGED_MARKER)
			),
			"managed marker written into the cursor skill dir"
		);
		assert.ok(
			await pathExists(
				path.join(roots.targetRoots.codexAgents, "prism-sample.toml")
			),
			"codex agent adapter written"
		);
		assert.ok(
			await pathExists(
				path.join(roots.targetRoots.claudeAgents, "prism-sample.md")
			),
			"claude agent definition written"
		);
		assert.ok(await pathExists(roots.codexConfigPath), "codex config written");
	});
});

test("no ${} token survives in the rendered output", async () => {
	await withTempRoots(async (roots) => {
		await writeSkillSource(
			roots.sourceSkillsRoot,
			"prism-sample",
			"Project ${PROJECT}, prefix ${TICKET_PREFIX}, tracker ${TICKET_TRACKER}.\n"
		);

		await generatePlatformSkills(
			optionsFor(roots, [{ id: "prism-sample", persona: "Sample" }], false, [])
		);

		const violations = await runLeftoverTokenGuard(roots.repoRoot, [
			roots.targetRoots.claude,
			roots.targetRoots.claudeAgents,
			roots.targetRoots.codex,
			roots.targetRoots.codexAgents,
			roots.targetRoots.cursor,
		]);

		assert.equal(violations.length, 0);
	});
});

test("a second run in check mode reports no changes (idempotent)", async () => {
	await withTempRoots(async (roots) => {
		await writeSkillSource(
			roots.sourceSkillsRoot,
			"prism-sample",
			"You build ${PROJECT}.\n"
		);

		await generatePlatformSkills(
			optionsFor(roots, [{ id: "prism-sample", persona: "Sample" }], false, [])
		);

		const checkChangedPaths: string[] = [];
		await generatePlatformSkills(
			optionsFor(
				roots,
				[{ id: "prism-sample", persona: "Sample" }],
				true,
				checkChangedPaths
			)
		);

		assert.equal(
			checkChangedPaths.length,
			0,
			`expected no drift on a re-render, got: ${checkChangedPaths.join(", ")}`
		);
	});
});

test("a dropped persona is orphan-cleaned on the next render", async () => {
	await withTempRoots(async (roots) => {
		await writeSkillSource(
			roots.sourceSkillsRoot,
			"prism-keep",
			"Keep ${PROJECT}.\n"
		);
		await writeSkillSource(
			roots.sourceSkillsRoot,
			"prism-drop",
			"Drop ${PROJECT}.\n"
		);

		await generatePlatformSkills(
			optionsFor(
				roots,
				[
					{ id: "prism-keep", persona: "Keep" },
					{ id: "prism-drop", persona: "Drop" },
				],
				false,
				[]
			)
		);
		assert.ok(
			await pathExists(path.join(roots.targetRoots.claude, "prism-drop")),
			"dropped persona present after the first render"
		);

		// Remove the dropped persona from the source and re-render with only the
		// surviving role. Its generated dir carries the managed marker, so cleanup
		// removes it.
		await fs.rm(path.join(roots.sourceSkillsRoot, "prism-drop"), {
			force: true,
			recursive: true,
		});
		await generatePlatformSkills(
			optionsFor(roots, [{ id: "prism-keep", persona: "Keep" }], false, [])
		);

		assert.equal(
			await pathExists(path.join(roots.targetRoots.claude, "prism-drop")),
			false,
			"dropped persona removed from claude skills"
		);
		assert.equal(
			await pathExists(path.join(roots.targetRoots.codexAgents, "prism-drop.toml")),
			false,
			"dropped persona's codex agent adapter removed"
		);
		assert.equal(
			await pathExists(path.join(roots.targetRoots.claudeAgents, "prism-drop.md")),
			false,
			"dropped persona's claude agent definition removed"
		);
		assert.ok(
			await pathExists(path.join(roots.targetRoots.claude, "prism-keep")),
			"surviving persona untouched"
		);
	});
});

test("a consumer's marker-less prism-* dir survives orphan cleanup", async () => {
	await withTempRoots(async (roots) => {
		await writeSkillSource(
			roots.sourceSkillsRoot,
			"prism-sample",
			"You build ${PROJECT}.\n"
		);

		// A consumer hand-placed a prism-prefixed skill dir with NO managed marker.
		// Cleanup is marker-keyed, so this must never be deleted even though its
		// name is not in the roster.
		const consumerDir = path.join(roots.targetRoots.claude, "prism-custom");
		await fs.mkdir(consumerDir, { recursive: true });
		await fs.writeFile(
			path.join(consumerDir, "SKILL.md"),
			"# Consumer's own skill\n",
			"utf8"
		);

		await generatePlatformSkills(
			optionsFor(roots, [{ id: "prism-sample", persona: "Sample" }], false, [])
		);

		assert.ok(
			await pathExists(path.join(consumerDir, "SKILL.md")),
			"consumer's marker-less prism-* dir preserved untouched"
		);
	});
});

test("renders PRISM's own source in check mode with no drift", async () => {
	const repoRoot = path.resolve(
		path.dirname(new URL(import.meta.url).pathname),
		"../.."
	);
	const pathDefinitions = await loadPathDefinitions(repoRoot);
	const rolesRaw = await fs.readFile(
		path.join(repoRoot, ".ai-skills", "definitions", "roles.json"),
		"utf8"
	);
	const configRaw = await fs.readFile(
		path.join(repoRoot, ".ai-skills", "config.json"),
		"utf8"
	);

	const changedPaths: string[] = [];
	await generatePlatformSkills({
		sourceSkillsRoot: path.join(
			repoRoot,
			pathDefinitions.canonical.skillsRoot
		),
		targetRoots: {
			claude: path.join(repoRoot, pathDefinitions.generated.claudeSkillsRoot),
			claudeAgents: path.join(
				repoRoot,
				pathDefinitions.generated.claudeAgentsRoot
			),
			codex: path.join(repoRoot, pathDefinitions.generated.codexSkillsRoot),
			codexAgents: path.join(
				repoRoot,
				pathDefinitions.generated.codexAgentsRoot
			),
			cursor: path.join(repoRoot, pathDefinitions.generated.cursorSkillsRoot),
		},
		codexConfigPath: path.join(
			repoRoot,
			pathDefinitions.generated.codexConfigFile
		),
		roleMap: buildRoleMap(JSON.parse(rolesRaw)),
		tokenMap: deriveTokenMap(JSON.parse(configRaw) as PrismConfig),
		// `.agents/skills` (codex) and `.codex/codex-config.toml` (codexConfig) are
		// gitignored per-user roots with no committed baseline to compare against,
		// so check mode opts them out — mirroring build.ts main()'s optedIn. A fresh
		// checkout has neither on disk; asserting zero-drift against output that is
		// intentionally never committed would fail on CI while passing locally only
		// because a prior write-mode build left them in the working tree.
		optedIn: { ...ALL_OPTED_IN, codex: false, codexConfig: false },
		checkMode: true,
		changedPaths,
	});

	assert.equal(
		changedPaths.length,
		0,
		`extracted generatePlatformSkills drifts from committed PRISM output: ${changedPaths.join(", ")}`
	);
});
