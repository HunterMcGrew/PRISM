/**
 * Contract for delivering the plan-chain scripts and the shell parser through
 * `runUpdate`: each module reaches `.claude/hooks/` carrying the runtime
 * marker, a second update leaves them alone, they run in the consumer layout,
 * and a Cursor-only consumer gets all of them with no registration.
 *
 * The fixture follows `update.test.ts`'s `runUpdate` shape, copied here so
 * that file stays unchanged by this feature.
 */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { HOOK_RUNTIME_MARKER, runUpdate } from "./update";

const prismRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

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

const PLAN_RUNTIME_FILES = [
	".claude/hooks/lib/tokenize.mjs",
	".claude/hooks/lib/segments.mjs",
	".claude/hooks/plan/frontmatter.mjs",
	".claude/hooks/plan/lookup.mjs",
	".claude/hooks/plan/tasks.mjs",
	".claude/hooks/plan/bundles.mjs",
	".claude/hooks/plan/commit.mjs",
	".claude/hooks/plan/auto-approve.mjs",
	".claude/hooks/plan/stop-paths.mjs",
	".claude/hooks/plan/approve.mjs",
	".claude/hooks/plan/chat-approval.mjs",
	".claude/hooks/plan/watch-ci.mjs",
	".claude/hooks/review/reconcile.mjs",
	".claude/hooks/verify/check-report.mjs",
	".claude/hooks/secrets-gate.mjs",
	".claude/hooks/env-keys.mjs",
	".claude/hooks/commit-gate.mjs",
	".claude/hooks/commit-gate/parse.mjs",
	".claude/hooks/commit-gate/checks.mjs",
	".claude/hooks/commit-gate/test-guard.mjs",
	".claude/hooks/commit-gate/tree.mjs",
	".claude/hooks/approve-guard.mjs",
];

const FIXTURE_PLAN = [
	"---",
	"title: Fixture plan",
	"ticket: ACME-1",
	"stage: plan",
	"status: approved",
	"---",
	"",
	"## Tasks",
	"",
	"### T1: Change the thing",
	"",
	"- files: src/thing.ts",
	"- proof: node --test thing.test.mjs",
	"- depends on: none",
	"",
].join("\n");

interface Roots {
	prismRepoRoot: string;
	consumerRepoRoot: string;
}

async function writeAt(root: string, relativePath: string, content: string): Promise<void> {
	const target = path.join(root, relativePath);
	await fs.mkdir(path.dirname(target), { recursive: true });
	await fs.writeFile(target, content, "utf8");
}

async function readAt(root: string, relativePath: string): Promise<string> {
	return fs.readFile(path.join(root, relativePath), "utf8");
}

async function existsAt(root: string, relativePath: string): Promise<boolean> {
	try {
		await fs.access(path.join(root, relativePath));

		return true;
	} catch {
		return false;
	}
}

/**
 * A PRISM source tree holding the real hook runtime, beside a git-initialized
 * consumer with one commit. `runUpdate` reads `process.env` for git config,
 * so isolation is applied there for the duration of the body.
 */
async function withRoots(body: (roots: Roots) => Promise<void>): Promise<void> {
	const tempRoot = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "prism-plan-runtime-")));
	const savedEnv = { ...process.env };
	const originalWarn = console.warn;
	const originalLog = console.log;
	try {
		for (const key of Object.keys(process.env)) {
			if (key.startsWith("GIT_")) {
				delete process.env[key];
			}
		}
		await fs.writeFile(path.join(tempRoot, "gitconfig"), "");
		process.env.GIT_CONFIG_NOSYSTEM = "1";
		process.env.GIT_CONFIG_GLOBAL = path.join(tempRoot, "gitconfig");

		const prismRepoRoot = path.join(tempRoot, "prism");
		const consumerRepoRoot = path.join(tempRoot, "consumer");
		await fs.mkdir(path.join(prismRepoRoot, ".prism"), { recursive: true });
		await fs.mkdir(path.join(consumerRepoRoot, ".prism"), { recursive: true });

		await fs.cp(
			path.join(prismRoot, "scripts", "ai-skills", "hooks"),
			path.join(prismRepoRoot, "scripts", "ai-skills", "hooks"),
			{ recursive: true }
		);
		await fs.cp(path.join(prismRoot, ".githooks"), path.join(prismRepoRoot, ".githooks"), {
			recursive: true,
		});
		await fs.cp(
			path.join(prismRoot, "templates", "install", ".claude", "settings.json"),
			path.join(prismRepoRoot, "templates", "install", ".claude", "settings.json")
		);
		await fs.cp(
			path.join(prismRoot, "templates", "install", ".codex", "hooks.json"),
			path.join(prismRepoRoot, "templates", "install", ".codex", "hooks.json")
		);
		await fs.cp(
			path.join(prismRoot, ".ai-skills", "config.schema.json"),
			path.join(prismRepoRoot, ".ai-skills", "config.schema.json")
		);
		await writeAt(
			prismRepoRoot,
			".ai-skills/definitions/seed-curation.json",
			JSON.stringify({ excluded: [], curated: [], seedOnly: [], renames: {} })
		);
		await writeAt(
			prismRepoRoot,
			".ai-skills/definitions/roles.json",
			JSON.stringify({ skills: [{ id: "prism-sample", persona: "Sample", routing: "auto" }] })
		);
		await writeAt(
			prismRepoRoot,
			".ai-skills/skills/prism-sample/frontmatter.yml",
			"name: prism-sample\ndescription: Sample persona for tests.\n"
		);
		await writeAt(prismRepoRoot, ".ai-skills/skills/prism-sample/shared.md", "You build things.\n");
		await writeAt(prismRepoRoot, ".prism/rules/shipped.md", "# Shipped rule\n");

		await writeAt(consumerRepoRoot, ".ai-skills/config.json", JSON.stringify(CONSUMER_CONFIG_JSON));
		await writeAt(
			consumerRepoRoot,
			".ai-skills/definitions/paths.json",
			JSON.stringify(CONSUMER_PATHS_JSON)
		);
		await writeAt(consumerRepoRoot, "plan.md", FIXTURE_PLAN);
		execFileSync("git", ["init", "-q"], { cwd: consumerRepoRoot });
		execFileSync("git", ["add", "plan.md"], { cwd: consumerRepoRoot });
		execFileSync(
			"git",
			["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-q", "-m", "ACME-1: Base"],
			{ cwd: consumerRepoRoot }
		);

		console.log = () => {};
		console.warn = () => {};
		await body({ prismRepoRoot, consumerRepoRoot });
	} finally {
		console.log = originalLog;
		console.warn = originalWarn;
		for (const key of Object.keys(process.env)) {
			delete process.env[key];
		}
		Object.assign(process.env, savedEnv);
		await fs.rm(tempRoot, { force: true, recursive: true, maxRetries: 10, retryDelay: 200 });
	}
}

function update(roots: Roots) {
	return runUpdate({
		prismRepoRoot: roots.prismRepoRoot,
		consumerRepoRoot: roots.consumerRepoRoot,
		prismContentRoot: path.join(roots.prismRepoRoot, ".prism"),
		consumerContentRoot: path.join(roots.consumerRepoRoot, ".prism"),
		dryRun: false,
	});
}

test("a fresh update delivers every plan-chain module with the runtime marker", async () => {
	await withRoots(async (roots) => {
		await update(roots);

		for (const file of PLAN_RUNTIME_FILES) {
			assert.ok(
				(await readAt(roots.consumerRepoRoot, file)).includes(HOOK_RUNTIME_MARKER),
				`${file} delivered with the marker`
			);
		}
	});
});

test(
	"an update leaves the delivered commit gate executable",
	{ skip: process.platform === "win32" && "Windows has no executable bit" },
	async () => {
		await withRoots(async (roots) => {
			await update(roots);

			const { mode } = await fs.stat(
				path.join(roots.consumerRepoRoot, ".claude/hooks/commit-gate.mjs")
			);
			assert.equal(mode & 0o111, 0o111);
		});
	}
);

test("the declaration sidecars stay behind", async () => {
	await withRoots(async (roots) => {
		await update(roots);

		for (const file of PLAN_RUNTIME_FILES) {
			assert.equal(
				await existsAt(roots.consumerRepoRoot, file.replace(/\.mjs$/, ".d.mts")),
				false,
				`${file} has no sidecar in the consumer`
			);
		}
	});
});

test("a second update rewrites none of the plan-chain modules", async () => {
	await withRoots(async (roots) => {
		await update(roots);
		const summary = await update(roots);

		const outcomes = summary.outcomes.filter((outcome) => PLAN_RUNTIME_FILES.includes(outcome.relativePath));
		assert.equal(outcomes.length, PLAN_RUNTIME_FILES.length);
		assert.ok(outcomes.every((outcome) => outcome.action === "no-op"));
	});
});

test("the delivered tasks script runs in the consumer layout", async () => {
	await withRoots(async (roots) => {
		await update(roots);

		const result = spawnSync(
			process.execPath,
			[".claude/hooks/plan/tasks.mjs", "plan.md", "--base", "HEAD"],
			{ cwd: roots.consumerRepoRoot, encoding: "utf8" }
		);

		assert.equal(result.status, 0, result.stderr);
		assert.match(result.stdout, /T1/);
	});
});

test("the delivered reconcile script lists classes in the consumer layout with no log", async () => {
	await withRoots(async (roots) => {
		await update(roots);

		const result = spawnSync(
			process.execPath,
			[".claude/hooks/review/reconcile.mjs", "--classes"],
			{ cwd: roots.consumerRepoRoot, encoding: "utf8" }
		);

		assert.equal(result.status, 0, result.stderr);
		assert.equal(result.stdout.trim(), "No open class has 3 or more rows.");
	});
});

test("an update adds the misses-log union line once, whatever hosts holds", async () => {
	await withRoots(async (roots) => {
		await writeAt(
			roots.consumerRepoRoot,
			".ai-skills/config.json",
			JSON.stringify({ ...CONSUMER_CONFIG_JSON, hosts: ["cursor"] })
		);

		await update(roots);
		const first = await readAt(roots.consumerRepoRoot, ".gitattributes");
		await update(roots);

		assert.equal(first, ".prism/metrics/review-misses.jsonl merge=union\n");
		assert.equal(await readAt(roots.consumerRepoRoot, ".gitattributes"), first);
	});
});

test("hosts: [cursor] delivers every plan-chain module and writes no registration", async () => {
	await withRoots(async (roots) => {
		await writeAt(
			roots.consumerRepoRoot,
			".ai-skills/config.json",
			JSON.stringify({ ...CONSUMER_CONFIG_JSON, hosts: ["cursor"] })
		);

		await update(roots);

		for (const file of PLAN_RUNTIME_FILES) {
			assert.equal(await existsAt(roots.consumerRepoRoot, file), true, `${file} delivered`);
		}
		for (const registration of [".claude/settings.json", ".codex/hooks.json"]) {
			assert.equal(
				await existsAt(roots.consumerRepoRoot, registration),
				false,
				`${registration} not written`
			);
		}

		const result = spawnSync(
			process.execPath,
			[".claude/hooks/plan/tasks.mjs", "plan.md", "--base", "HEAD"],
			{ cwd: roots.consumerRepoRoot, encoding: "utf8" }
		);

		assert.equal(result.status, 0, result.stderr);
	});
});
