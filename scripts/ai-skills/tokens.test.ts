/**
 * Regression suite for the token substitution layer (ADR-0030).
 *
 * Covers happy-path substitution, unknown-token failures, malformed-literal
 * pass-through, and derived-token cascades. The malformed-literal cases lock
 * the pass-through behavior down so future contributors can't quietly change
 * the parser to be more permissive without also updating these tests.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import {
	deriveTokenMap,
	loadConfig,
	type PrismConfig,
	substituteTokens,
} from "./lib/tokens";

const SAMPLE_CONFIG: PrismConfig = {
	org: "TracTru",
	project: "PRISM",
	ticketPrefix: "PRISM",
	ticketSystem: {
		kind: "linear",
		workspace: "tractru",
		teamKey: "PRISM",
	},
	github: {
		owner: "HunterMcGrew",
		repo: "agent-crew",
	},
	defaultBranch: "main",
};

test("substitutes raw and derived tokens in happy-path content", () => {
	const tokenMap = deriveTokenMap(SAMPLE_CONFIG);
	const input = "Welcome to ${PROJECT} (${TICKET_PREFIX}-NNNN format)";
	const output = substituteTokens(input, tokenMap);

	assert.equal(output, "Welcome to PRISM (PRISM-NNNN format)");
});

test("derives PROJECT_LOWERCASE and TICKET_PREFIX_LOWERCASE from raw values", () => {
	const tokenMap = deriveTokenMap(SAMPLE_CONFIG);

	assert.equal(tokenMap.get("PROJECT"), "PRISM");
	assert.equal(tokenMap.get("PROJECT_LOWERCASE"), "prism");
	assert.equal(tokenMap.get("TICKET_PREFIX"), "PRISM");
	assert.equal(tokenMap.get("TICKET_PREFIX_LOWERCASE"), "prism");
});

test("derives GITHUB_OWNER_LOWERCASE alongside the raw GITHUB_OWNER", () => {
	const tokenMap = deriveTokenMap(SAMPLE_CONFIG);

	assert.equal(tokenMap.get("GITHUB_OWNER"), "HunterMcGrew");
	assert.equal(tokenMap.get("GITHUB_OWNER_LOWERCASE"), "huntermcgrew");
});

test("renders the Linear-team tracker line for a linear ticketSystem", () => {
	const tokenMap = deriveTokenMap(SAMPLE_CONFIG);

	assert.equal(
		tokenMap.get("TICKET_TRACKER"),
		"**Linear team:** PRISM (prefix: PRISM-####)"
	);
});

test("renders the GitHub-issues tracker line and omits Linear tokens for github-issues", () => {
	const githubIssuesConfig: PrismConfig = {
		org: "ACME",
		project: "Widget",
		ticketPrefix: "WGT",
		ticketSystem: { kind: "github-issues" },
		github: { owner: "acme", repo: "widget" },
	};
	const tokenMap = deriveTokenMap(githubIssuesConfig);

	assert.equal(tokenMap.get("TICKET_TRACKER"), "**Ticket tracker:** GitHub issues");
	assert.equal(tokenMap.has("LINEAR_WORKSPACE"), false);
	assert.equal(tokenMap.has("LINEAR_TEAM_KEY"), false);
});

test("substitutes the github-issues tracker line into Project Context content", () => {
	const githubIssuesConfig: PrismConfig = {
		org: "ACME",
		project: "Widget",
		ticketPrefix: "WGT",
		ticketSystem: { kind: "github-issues" },
	};
	const tokenMap = deriveTokenMap(githubIssuesConfig);
	const input = "- ${TICKET_TRACKER}";

	assert.equal(substituteTokens(input, tokenMap), "- **Ticket tracker:** GitHub issues");
});

test("throws with the literal token name when a referenced token is missing", () => {
	const tokenMap = deriveTokenMap(SAMPLE_CONFIG);
	const input = "Hello ${UNKNOWN_TOKEN} world.";

	assert.throws(
		() => substituteTokens(input, tokenMap),
		(error: Error) =>
			error.message.includes("${UNKNOWN_TOKEN}") &&
			error.message.includes("Hello"),
		"missing token name and context snippet are both reported"
	);
});

test("passes malformed token literals through unchanged", () => {
	const tokenMap = deriveTokenMap(SAMPLE_CONFIG);

	const unterminated = "before ${ after";
	assert.equal(substituteTokens(unterminated, tokenMap), unterminated);

	const whitespacePadded = "before ${ KEY } after";
	assert.equal(substituteTokens(whitespacePadded, tokenMap), whitespacePadded);

	const noClosingBrace = "before ${KEY after";
	assert.equal(substituteTokens(noClosingBrace, tokenMap), noClosingBrace);
});

test("derived-token cascades resolve regardless of map iteration order", () => {
	const tokenMap = deriveTokenMap(SAMPLE_CONFIG);
	const reversed = new Map<string, string>(
		Array.from(tokenMap.entries()).reverse()
	);

	const input = "${PROJECT_LOWERCASE} repo at ${GITHUB_OWNER}/${GITHUB_REPO}";

	assert.equal(
		substituteTokens(input, tokenMap),
		"prism repo at HunterMcGrew/agent-crew"
	);
	assert.equal(
		substituteTokens(input, reversed),
		"prism repo at HunterMcGrew/agent-crew"
	);
});

test("omits optional tokens from the map when the config field is absent", () => {
	const minimalConfig: PrismConfig = {
		org: "ACME",
		project: "WIDGET",
		ticketPrefix: "WGT",
		ticketSystem: { kind: "linear" },
	};
	const tokenMap = deriveTokenMap(minimalConfig);

	assert.equal(tokenMap.has("LINEAR_WORKSPACE"), false);
	assert.equal(tokenMap.has("GITHUB_OWNER"), false);
	assert.equal(tokenMap.has("GITHUB_REPO"), false);
	assert.equal(tokenMap.has("SLACK_CHANNEL"), false);
	assert.equal(tokenMap.get("DEFAULT_BRANCH"), "main");
});

async function withTempRepo(
	build: (repoRoot: string) => Promise<void>,
	check: (repoRoot: string) => Promise<void>
): Promise<void> {
	const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "prism-tokens-"));
	try {
		await fs.mkdir(path.join(tempRoot, ".ai-skills"), { recursive: true });
		await build(tempRoot);
		await check(tempRoot);
	} finally {
		await fs.rm(tempRoot, { force: true, recursive: true });
	}
}

test("loadConfig reads and validates the on-disk config", async () => {
	await withTempRepo(
		async (root) => {
			await fs.writeFile(
				path.join(root, ".ai-skills", "config.json"),
				JSON.stringify({
					org: "ACME",
					project: "Widget",
					ticketPrefix: "WGT",
					ticketSystem: { kind: "linear" },
				}),
				"utf8"
			);
		},
		async (root) => {
			const config = loadConfig(root);
			assert.equal(config.org, "ACME");
			assert.equal(config.ticketSystem.kind, "linear");
		}
	);
});

test("loadConfig throws with the file path when config.json is missing", async () => {
	await withTempRepo(
		async () => {
			// Intentionally do not write a config.json.
		},
		async (root) => {
			assert.throws(
				() => loadConfig(root),
				(error: Error) =>
					error.message.includes("Missing .ai-skills/config.json") &&
					error.message.includes(root),
				"error names the missing file and its expected location"
			);
		}
	);
});

test("loadConfig throws with the offending field when a required key is missing", async () => {
	await withTempRepo(
		async (root) => {
			await fs.writeFile(
				path.join(root, ".ai-skills", "config.json"),
				JSON.stringify({ org: "ACME", project: "Widget" }),
				"utf8"
			);
		},
		async (root) => {
			assert.throws(
				() => loadConfig(root),
				(error: Error) =>
					error.message.includes("/ticketPrefix") ||
					error.message.includes("/ticketSystem"),
				"error names a missing required field via JSON-Pointer-style path"
			);
		}
	);
});

test("loadConfig accepts a github-issues ticketSystem.kind", async () => {
	await withTempRepo(
		async (root) => {
			await fs.writeFile(
				path.join(root, ".ai-skills", "config.json"),
				JSON.stringify({
					org: "ACME",
					project: "Widget",
					ticketPrefix: "WGT",
					ticketSystem: { kind: "github-issues" },
				}),
				"utf8"
			);
		},
		async (root) => {
			const config = loadConfig(root);
			assert.equal(config.ticketSystem.kind, "github-issues");
		}
	);
});

test("loadConfig rejects an unsupported ticketSystem.kind", async () => {
	await withTempRepo(
		async (root) => {
			await fs.writeFile(
				path.join(root, ".ai-skills", "config.json"),
				JSON.stringify({
					org: "ACME",
					project: "Widget",
					ticketPrefix: "WGT",
					ticketSystem: { kind: "jira" },
				}),
				"utf8"
			);
		},
		async (root) => {
			assert.throws(
				() => loadConfig(root),
				(error: Error) =>
					error.message.includes("ticketSystem/kind") &&
					error.message.includes("linear") &&
					error.message.includes("github-issues"),
				"error names the offending field and both supported values"
			);
		}
	);
});
