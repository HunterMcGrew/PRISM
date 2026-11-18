/**
 * Contract for delivering PRISM's git hooks through `runUpdate`: the runtime
 * modules reach `.claude/hooks/`, the shims reach `.githooks/`, a consumer's
 * own hook files are never touched, and the installer runs in the same pass.
 *
 * The fixture follows `update.test.ts`'s `runUpdate` shape, copied here so
 * that file stays unchanged by this feature.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { runUpdate } from "./update";

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

const GIT_HOOK_RUNTIME_FILES = [
	".claude/hooks/lib/command.mjs",
	".claude/hooks/git-hooks/pre-commit.mjs",
	".claude/hooks/git-hooks/pre-push.mjs",
	".claude/hooks/git-hooks/install.mjs",
];

const SHIMS = [".githooks/pre-commit", ".githooks/pre-push"];

interface Roots {
	prismRepoRoot: string;
	consumerRepoRoot: string;
	git(...args: string[]): string;
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
 * A PRISM source tree holding the real hook runtime, shims, and registration
 * templates beside a git-initialized consumer. `runUpdate` and the installer
 * read `process.env` for git config, so isolation is applied there for the
 * duration of the body.
 */
async function withRoots(body: (roots: Roots) => Promise<void>): Promise<void> {
	const tempRoot = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "prism-git-hooks-delivery-")));
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
		execFileSync("git", ["init", "-q"], { cwd: consumerRepoRoot });

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

		console.log = () => {};
		console.warn = () => {};
		await body({
			prismRepoRoot,
			consumerRepoRoot,
			git: (...args) =>
				execFileSync("git", args, { cwd: consumerRepoRoot, encoding: "utf8" }).trim(),
		});
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

function update(roots: Roots, dryRun = false) {
	return runUpdate({
		prismRepoRoot: roots.prismRepoRoot,
		consumerRepoRoot: roots.consumerRepoRoot,
		prismContentRoot: path.join(roots.prismRepoRoot, ".prism"),
		consumerContentRoot: path.join(roots.consumerRepoRoot, ".prism"),
		dryRun,
	});
}

function hooksPath(roots: Roots): string {
	try {
		return roots.git("config", "--local", "--get", "core.hooksPath");
	} catch {
		return "";
	}
}

test("a fresh update delivers the shims, the runtime modules, and sets core.hooksPath", async () => {
	await withRoots(async (roots) => {
		await update(roots);

		for (const shim of SHIMS) {
			assert.equal(
				await readAt(roots.consumerRepoRoot, shim),
				await readAt(roots.prismRepoRoot, shim)
			);
			if (process.platform !== "win32") {
				const { mode } = await fs.stat(path.join(roots.consumerRepoRoot, shim));
				assert.equal(mode & 0o111, 0o111, `${shim} is executable`);
			}
		}
		for (const runtimeFile of GIT_HOOK_RUNTIME_FILES) {
			assert.ok(await existsAt(roots.consumerRepoRoot, runtimeFile), `${runtimeFile} delivered`);
		}
		assert.equal(hooksPath(roots), ".githooks");
	});
});

test("a second update is a no-op for every git hook file", async () => {
	await withRoots(async (roots) => {
		await update(roots);
		const summary = await update(roots);

		const gitHookOutcomes = summary.outcomes.filter((outcome) =>
			[...SHIMS, ...GIT_HOOK_RUNTIME_FILES].includes(outcome.relativePath)
		);
		assert.equal(gitHookOutcomes.length, SHIMS.length + GIT_HOOK_RUNTIME_FILES.length);
		assert.ok(gitHookOutcomes.every((outcome) => outcome.action === "no-op"));
	});
});

test("an unmarked consumer shim survives byte for byte while the marked one beside it is refreshed", async () => {
	await withRoots(async (roots) => {
		const ownHook = "#!/bin/sh\necho the consumer's own pre-commit\n";
		await writeAt(roots.consumerRepoRoot, ".githooks/pre-commit", ownHook);
		await writeAt(
			roots.consumerRepoRoot,
			".githooks/pre-push",
			"#!/bin/sh\n# @prism-hook-runtime: an older PRISM shim\n"
		);
		const warnings: string[] = [];
		console.warn = (message?: unknown) => {
			warnings.push(String(message));
		};

		await update(roots);

		assert.equal(await readAt(roots.consumerRepoRoot, ".githooks/pre-commit"), ownHook);
		assert.ok(
			warnings.includes("prism:update: .githooks/pre-commit is not PRISM's; left it alone"),
			`warned about the consumer's hook (got ${JSON.stringify(warnings)})`
		);
		assert.equal(
			await readAt(roots.consumerRepoRoot, ".githooks/pre-push"),
			await readAt(roots.prismRepoRoot, ".githooks/pre-push")
		);
		assert.equal(await existsAt(roots.consumerRepoRoot, ".githooks/pre-commit.bak"), false);
	});
});

test("a consumer whose core.hooksPath is .husky keeps it and is told", async () => {
	await withRoots(async (roots) => {
		roots.git("config", "--local", "core.hooksPath", ".husky");
		const warnings: string[] = [];
		console.warn = (message?: unknown) => {
			warnings.push(String(message));
		};

		await update(roots);

		assert.equal(hooksPath(roots), ".husky");
		assert.ok(warnings.some((message) => message.includes("'.husky'")));
	});
});

test("hosts: [cursor] delivers no shims and removes previously delivered marked ones", async () => {
	await withRoots(async (roots) => {
		await update(roots);
		assert.ok(await existsAt(roots.consumerRepoRoot, SHIMS[0]));

		await writeAt(
			roots.consumerRepoRoot,
			".ai-skills/config.json",
			JSON.stringify({ ...CONSUMER_CONFIG_JSON, hosts: ["cursor"] })
		);
		await update(roots);

		for (const shim of SHIMS) {
			assert.equal(await existsAt(roots.consumerRepoRoot, shim), false, `${shim} removed`);
		}
		assert.equal(await existsAt(roots.consumerRepoRoot, ".githooks"), false);
	});
});

test("hosts: [cursor] leaves a consumer's own .githooks file in place", async () => {
	await withRoots(async (roots) => {
		await writeAt(
			roots.consumerRepoRoot,
			".ai-skills/config.json",
			JSON.stringify({ ...CONSUMER_CONFIG_JSON, hosts: ["cursor"] })
		);
		await writeAt(roots.consumerRepoRoot, ".githooks/pre-commit", "#!/bin/sh\necho mine\n");

		await update(roots);

		assert.equal(
			await readAt(roots.consumerRepoRoot, ".githooks/pre-commit"),
			"#!/bin/sh\necho mine\n"
		);
	});
});

test("--dry-run writes nothing and leaves core.hooksPath unset", async () => {
	await withRoots(async (roots) => {
		await update(roots, true);

		for (const written of [...SHIMS, ...GIT_HOOK_RUNTIME_FILES]) {
			assert.equal(await existsAt(roots.consumerRepoRoot, written), false, `${written} not written`);
		}
		assert.equal(hooksPath(roots), "");
	});
});
