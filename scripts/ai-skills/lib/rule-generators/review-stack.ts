/**
 * Stack-check generator for the review passes.
 *
 * Writes `.prism/review/stack/<pass>.md` files that point `REVIEW.md`'s
 * passes at the per-team rules the other generators produced, so a review
 * checks the diff against the team's own conventions without the rulebook
 * restating them. It runs after the other generators and reads their output
 * from disk. Files are skip-if-exists like every generator, because
 * `.prism/review/stack/` belongs to the team and `prism update` never writes
 * it.
 */
import fs from "node:fs/promises";
import path from "node:path";

import type { OnboardingConfig } from "../onboarding-types";
import {
	REASONS,
	type GenerateOptions,
	type GeneratedRuleResult,
	type RuleGenerator,
} from "./types";

const LANGUAGE_RULE_FILE = /^code-standards-.+\.md$/;
const FRAMEWORK_RULE_FILE = /^.+-guidelines\.md$/;

interface StackCheckFile {
	fileName: string;
	passTitle: string;
	bullets: string[];
}

/**
 * Generates the stack-check files whose gate holds: the architecture file when
 * a per-team rule file exists, the security file when `.prism/rules/security.md`
 * exists, and the correctness file when a language is detected and
 * `.ai-skills/config.json` sets a type-check or test command.
 */
export const generate: RuleGenerator = async function generate(
	config: OnboardingConfig,
	repoRoot: string,
	options: GenerateOptions = {}
): Promise<GeneratedRuleResult[]> {
	const files = [
		await buildArchitectureFile(repoRoot),
		await buildSecurityFile(repoRoot),
		await buildCorrectnessFile(config, repoRoot),
	];
	const results: GeneratedRuleResult[] = [];

	for (const file of files) {
		if (file === null) {
			continue;
		}

		const targetPath = path.join(repoRoot, ".prism", "review", "stack", file.fileName);
		results.push(await writeStackFile(targetPath, file, options));
	}

	return results;
};

async function buildArchitectureFile(repoRoot: string): Promise<StackCheckFile | null> {
	const ruleFiles = await listRuleFiles(repoRoot);
	const teamRules = ruleFiles
		.filter((name) => LANGUAGE_RULE_FILE.test(name) || FRAMEWORK_RULE_FILE.test(name))
		.sort();

	if (teamRules.length === 0) {
		return null;
	}

	return {
		fileName: "architecture.md",
		passTitle: "Architecture and standards",
		bullets: teamRules.map(
			(name) =>
				`Check the diff against \`.prism/rules/${name}\`. A departure from it is a standards violation.`
		),
	};
}

async function buildSecurityFile(repoRoot: string): Promise<StackCheckFile | null> {
	const ruleFiles = await listRuleFiles(repoRoot);

	if (!ruleFiles.includes("security.md")) {
		return null;
	}

	return {
		fileName: "security.md",
		passTitle: "Security",
		bullets: ["Check the diff against `.prism/rules/security.md`."],
	};
}

async function buildCorrectnessFile(
	config: OnboardingConfig,
	repoRoot: string
): Promise<StackCheckFile | null> {
	const commands = await readEvidenceCommands(repoRoot);

	if (commands.length === 0) {
		return null;
	}

	const languages = [
		...new Set(
			config.techStack.languages
				.map((language) => language.name)
				.filter((name) => name !== "unknown")
		),
	];

	if (languages.length === 0) {
		return null;
	}

	const evidence = commands.map((command) => `\`${command}\``).join(" or ");

	return {
		fileName: "correctness.md",
		passTitle: "Correctness",
		bullets: languages.map(
			(language) => `${language}: a correctness finding cites the result of ${evidence}.`
		),
	};
}

/**
 * Reads the type-check and test commands from `.ai-skills/config.json`. A
 * missing or unreadable config yields none, because onboarding may run these
 * generators before it writes the config.
 */
async function readEvidenceCommands(repoRoot: string): Promise<string[]> {
	let parsed: unknown;

	try {
		const raw = await fs.readFile(path.join(repoRoot, ".ai-skills", "config.json"), "utf8");
		parsed = JSON.parse(raw);
	} catch {
		return [];
	}

	const commands = (parsed as { commands?: Record<string, unknown> } | null)?.commands;

	if (typeof commands !== "object" || commands === null) {
		return [];
	}

	return [commands.typecheck, commands.test].filter(
		(value): value is string => typeof value === "string" && value.trim() !== ""
	);
}

async function listRuleFiles(repoRoot: string): Promise<string[]> {
	try {
		return await fs.readdir(path.join(repoRoot, ".prism", "rules"));
	} catch {
		return [];
	}
}

async function writeStackFile(
	targetPath: string,
	file: StackCheckFile,
	options: GenerateOptions
): Promise<GeneratedRuleResult> {
	const exists = await pathExists(targetPath);

	if (exists && !options.force) {
		return { path: targetPath, written: false, reason: REASONS.exists };
	}

	await fs.mkdir(path.dirname(targetPath), { recursive: true });
	await fs.writeFile(targetPath, renderStackFile(file), "utf8");

	return {
		path: targetPath,
		written: true,
		reason: exists ? REASONS.forced : REASONS.created,
	};
}

function renderStackFile(file: StackCheckFile): string {
	const intro = `Onboarding wrote this file and your team owns it. The ${file.passTitle} pass in \`REVIEW.md\` runs these checks too, and \`prism update\` never touches it.`;
	const bullets = file.bullets.map((bullet) => `- ${bullet}`).join("\n");

	return `# Stack checks: ${file.passTitle}\n\n${intro}\n\n${bullets}\n`;
}

async function pathExists(targetPath: string): Promise<boolean> {
	try {
		await fs.access(targetPath);
		return true;
	} catch {
		return false;
	}
}
