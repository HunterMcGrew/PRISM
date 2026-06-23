#!/usr/bin/env -S npx tsx
/**
 * `prism init` — writes `.ai-skills/config.json` for a cold consumer so that
 * `prism adopt` can run without hitting a missing-config error. This is the
 * first command a consumer runs; Atlas handles the richer interactive
 * onboarding that populates per-team rules and stack docs afterward.
 *
 * Two exported entry points:
 * - `runInit` — the testable core that accepts a resolved consumer root and
 *   pre-assembled answers. No I/O; no readline.
 * - `runInitCli` — the CLI wrapper that parses flags, prompts for any missing
 *   required values when stdin is a TTY, and delegates to `runInit`.
 */
import readline from "node:readline/promises";
import process from "node:process";
import fs from "node:fs/promises";
import path from "node:path";

import { detectStack } from "./lib/stack-detect";
import {
	writeOnboardingConfig,
	type WriteOnboardingConfigResult,
} from "./lib/onboarding-config";
import type { OnboardingConfig } from "./lib/onboarding-types";
import { resolveConsumerRoot, parseConsumerFlag } from "./lib/consumer-root";
import { resolveSelfPrismSource } from "./update";

/**
 * Answers assembled from CLI flags and/or interactive prompts before
 * `runInit` is called. All required fields are guaranteed non-empty by the
 * time this reaches `runInit`; optional fields may be absent.
 */
export interface InitAnswers {
	project: string;
	org?: string;
	ticketPrefix: string;
	ticketSystemKind: "linear" | "github-issues";
	linearTeam?: string;
	linearWorkspace?: string;
	githubOwner: string;
	githubRepo: string;
	defaultBranch?: string;
}

/**
 * Bootstraps `.ai-skills/config.json` for a cold consumer repo. Refuses when
 * a config already exists — callers should edit it directly or remove it to
 * re-init. Calls the existing `detectStack` and `writeOnboardingConfig`
 * helpers rather than reimplementing stack detection or config writing.
 *
 * Returns the path of the written config file.
 */
export async function runInit(options: {
	consumerRepoRoot: string;
	answers: InitAnswers;
}): Promise<WriteOnboardingConfigResult> {
	const { consumerRepoRoot, answers } = options;

	const configPath = path.join(consumerRepoRoot, ".ai-skills", "config.json");

	let configExists: boolean;
	try {
		await fs.access(configPath);
		configExists = true;
	} catch {
		configExists = false;
	}

	if (configExists) {
		throw new Error(
			"prism init: .ai-skills/config.json already exists — edit it directly or remove it to re-init."
		);
	}

	const detectedStack = await detectStack(consumerRepoRoot);

	const config: OnboardingConfig = {
		project: answers.project,
		ticketPrefix: answers.ticketPrefix,
		githubOwner: answers.githubOwner,
		githubRepo: answers.githubRepo,
		// An empty string signals github-issues to toOnDiskConfig; a non-empty
		// string causes toOnDiskConfig to emit a linear config with the team key.
		linearTeam: answers.linearTeam ?? "",
		productDomain: "",
		existingStandards: [],
		techStack: detectedStack,
	};

	return writeOnboardingConfig(consumerRepoRoot, config, {
		org: answers.org,
		defaultBranch: answers.defaultBranch,
		linearWorkspace: answers.linearWorkspace,
	});
}

/**
 * Parses a named flag value from argv. Handles both `--flag value` and
 * `--flag=value` forms. Returns `null` when the flag is absent; throws when
 * the flag is present but its value is missing or empty.
 */
function parseFlag(argv: string[], flag: string): string | null {
	const flagIndex = argv.indexOf(`--${flag}`);
	if (flagIndex !== -1) {
		const value = argv[flagIndex + 1];
		if (!value || value.startsWith("--")) {
			throw new Error(
				`prism init: --${flag} requires a value`
			);
		}

		return value;
	}

	const inlinePrefix = `--${flag}=`;
	const inlineArg = argv.find((arg) => arg.startsWith(inlinePrefix));
	if (inlineArg) {
		const value = inlineArg.slice(inlinePrefix.length);
		if (!value) {
			throw new Error(`prism init: --${flag} requires a value`);
		}

		return value;
	}

	return null;
}

/**
 * Resolves a required field: returns the flag value when present; prompts via
 * readline when stdin is a TTY; throws naming the flag when non-interactive
 * and the value is missing.
 */
async function resolveRequired(
	rl: readline.Interface | null,
	flagValue: string | null,
	flagName: string,
	prompt: string
): Promise<string> {
	if (typeof flagValue === "string" && flagValue.length > 0) {
		return flagValue;
	}

	if (rl !== null) {
		const answer = (await rl.question(prompt)).trim();
		if (answer.length === 0) {
			throw new Error(`prism init: ${prompt.trim()} is required`);
		}

		return answer;
	}

	throw new Error(`prism init: --${flagName} is required in non-interactive mode`);
}

export async function runInitCli(): Promise<void> {
	const argv = process.argv.slice(2);
	const consumerRepoRoot = resolveConsumerRoot({
		explicitConsumer: parseConsumerFlag(argv),
		cwd: process.cwd(),
		selfPrismRoot: resolveSelfPrismSource(),
	});

	const flagProject = parseFlag(argv, "project");
	const flagOrg = parseFlag(argv, "org");
	const flagTicketPrefix = parseFlag(argv, "ticket-prefix");
	const flagTicketSystem = parseFlag(argv, "ticket-system") as
		| "linear"
		| "github-issues"
		| null;
	const flagLinearTeam = parseFlag(argv, "linear-team");
	const flagLinearWorkspace = parseFlag(argv, "linear-workspace");
	const flagGithubOwner = parseFlag(argv, "github-owner");
	const flagGithubRepo = parseFlag(argv, "github-repo");
	const flagDefaultBranch = parseFlag(argv, "default-branch");

	if (
		flagTicketSystem !== null &&
		flagTicketSystem !== "linear" &&
		flagTicketSystem !== "github-issues"
	) {
		throw new Error(
			`prism init: --ticket-system must be "linear" or "github-issues" (got ${JSON.stringify(flagTicketSystem)})`
		);
	}

	const isInteractive = process.stdin.isTTY === true;
	const rl = isInteractive
		? readline.createInterface({ input: process.stdin, output: process.stdout })
		: null;

	try {
		const project = await resolveRequired(
			rl,
			flagProject,
			"project",
			"Project name (e.g. ACME): "
		);

		const ticketPrefix = await resolveRequired(
			rl,
			flagTicketPrefix,
			"ticket-prefix",
			"Ticket prefix, uppercase (e.g. ACME): "
		);

		let ticketSystemKind: "linear" | "github-issues";
		if (flagTicketSystem !== null) {
			ticketSystemKind = flagTicketSystem;
		} else if (rl !== null) {
			const answer = (
				await rl.question('Ticket system — "linear" or "github-issues" [github-issues]: ')
			).trim();
			const normalized = answer.length === 0 ? "github-issues" : answer;
			if (normalized !== "linear" && normalized !== "github-issues") {
				throw new Error(
					`prism init: ticket system must be "linear" or "github-issues" (got ${JSON.stringify(normalized)})`
				);
			}

			ticketSystemKind = normalized;
		} else {
			throw new Error(
				'prism init: --ticket-system is required in non-interactive mode (pass "linear" or "github-issues")'
			);
		}

		let linearTeam: string | undefined;
		let linearWorkspace: string | undefined;
		if (ticketSystemKind === "linear") {
			linearTeam = await resolveRequired(
				rl,
				flagLinearTeam,
				"linear-team",
				"Linear team key (e.g. ACME): "
			);
			linearWorkspace =
				flagLinearWorkspace ??
				(rl !== null
					? ((await rl.question("Linear workspace slug (optional, press Enter to skip): ")).trim() ||
						undefined)
					: undefined);
		}

		const githubOwner = await resolveRequired(
			rl,
			flagGithubOwner,
			"github-owner",
			"GitHub owner (user or org, e.g. acmecorp): "
		);

		const githubRepo = await resolveRequired(
			rl,
			flagGithubRepo,
			"github-repo",
			"GitHub repo name (e.g. my-app): "
		);

		const answers: InitAnswers = {
			project,
			org: flagOrg ?? undefined,
			ticketPrefix,
			ticketSystemKind,
			linearTeam,
			linearWorkspace,
			githubOwner,
			githubRepo,
			defaultBranch: flagDefaultBranch ?? undefined,
		};

		const result = await runInit({ consumerRepoRoot, answers });
		console.log(`prism init: wrote ${result.path}`);
	} finally {
		rl?.close();
	}
}
