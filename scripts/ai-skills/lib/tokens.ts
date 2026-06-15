/**
 * Token substitution layer for the PRISM build (ADR-0030).
 *
 * The build reads `.ai-skills/config.json`, derives a token map from it, and
 * replaces `${TOKEN}` literals in canonical content as it assembles platform
 * outputs. Canonical files on disk stay in `${TOKEN}` form — substitution is
 * in-memory only, applied at the assembly/write seam in `build.ts`.
 *
 * Source-of-truth list for the token map lives in `docs/parameterization.md`
 * § All tokens. Keep that table in sync with `deriveTokenMap` output below.
 */
import fs from "node:fs";
import path from "node:path";

export interface PrismConfig {
	org: string;
	project: string;
	ticketPrefix: string;
	ticketSystem: {
		kind: "linear" | "github-issues";
		workspace?: string;
		projectId?: string;
		teamKey?: string;
	};
	github?: {
		owner?: string;
		repo?: string;
	};
	defaultBranch?: string;
	prismSource?: string;
	techStack?: string[];
	rules?: {
		universal?: "all";
		optIn?: string[];
	};
	slackChannel?: string;
}

const REQUIRED_TOP_LEVEL_KEYS: ReadonlyArray<keyof PrismConfig> = [
	"org",
	"project",
	"ticketPrefix",
	"ticketSystem",
];

/**
 * Reads `.ai-skills/config.json` from the given repo root, parses it, and
 * validates against the documented shape. Throws with the file path and a
 * JSON-Pointer-style location when a required field is missing or malformed.
 *
 * The validation is structural-only — it checks the fields the substitution
 * layer reads. Schema-level validation (enum membership for techStack, regex
 * for ticketPrefix) is deferred to the JSON Schema and the consumer's editor;
 * the build's job is to fail loudly when a token can't be derived.
 */
export function loadConfig(repoRoot: string): PrismConfig {
	const configPath = path.join(repoRoot, ".ai-skills", "config.json");

	if (!fs.existsSync(configPath)) {
		throw new Error(
			`Missing .ai-skills/config.json at ${configPath}. The build needs it to derive the token map.`
		);
	}

	const raw = fs.readFileSync(configPath, "utf8");
	let parsed: unknown;

	try {
		parsed = JSON.parse(raw);
	} catch (error) {
		throw new Error(
			`Invalid JSON in ${configPath}: ${error instanceof Error ? error.message : String(error)}`
		);
	}

	if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
		throw new Error(`Config at ${configPath} must be a JSON object.`);
	}

	const config = parsed as Record<string, unknown>;

	for (const key of REQUIRED_TOP_LEVEL_KEYS) {
		if (!(key in config)) {
			throw new Error(`${configPath} /${key}: required field is missing.`);
		}
	}

	for (const key of ["org", "project", "ticketPrefix"] as const) {
		const value = config[key];
		if (typeof value !== "string" || value.length === 0) {
			throw new Error(
				`${configPath} /${key}: must be a non-empty string (got ${describeType(value)}).`
			);
		}
	}

	const ticketSystem = config.ticketSystem;
	if (
		ticketSystem === null ||
		typeof ticketSystem !== "object" ||
		Array.isArray(ticketSystem)
	) {
		throw new Error(
			`${configPath} /ticketSystem: must be an object (got ${describeType(ticketSystem)}).`
		);
	}

	const ticketSystemObject = ticketSystem as Record<string, unknown>;
	if (
		ticketSystemObject.kind !== "linear" &&
		ticketSystemObject.kind !== "github-issues"
	) {
		throw new Error(
			`${configPath} /ticketSystem/kind: must be "linear" or "github-issues" (got ${JSON.stringify(ticketSystemObject.kind)}).`
		);
	}

	return parsed as PrismConfig;
}

/**
 * Builds the substitution map from a parsed config. Raw keys come straight
 * from config fields; derived keys (lowercase forms) are computed from the
 * raw values so the order of insertion into the map doesn't matter.
 *
 * Tokens with no source in the config (e.g. optional `github.owner` on a
 * config that doesn't carry github info) are omitted from the map. A canonical
 * source that references a missing token will surface as an unknown-token
 * error at `substituteTokens` time, which is the right failure mode — the
 * build should fail when content depends on a config field that wasn't set.
 */
export function deriveTokenMap(config: PrismConfig): Map<string, string> {
	const tokenMap = new Map<string, string>();

	tokenMap.set("ORG", config.org);
	tokenMap.set("PROJECT", config.project);
	tokenMap.set("PROJECT_LOWERCASE", config.project.toLowerCase());
	tokenMap.set("TICKET_PREFIX", config.ticketPrefix);
	tokenMap.set("TICKET_PREFIX_LOWERCASE", config.ticketPrefix.toLowerCase());

	if (typeof config.ticketSystem.workspace === "string") {
		tokenMap.set("LINEAR_WORKSPACE", config.ticketSystem.workspace);
	}

	if (typeof config.ticketSystem.teamKey === "string") {
		tokenMap.set("LINEAR_TEAM_KEY", config.ticketSystem.teamKey);
	}

	tokenMap.set("TICKET_TRACKER", deriveTicketTracker(config));

	if (typeof config.github?.owner === "string") {
		tokenMap.set("GITHUB_OWNER", config.github.owner);
		tokenMap.set("GITHUB_OWNER_LOWERCASE", config.github.owner.toLowerCase());
	}

	if (typeof config.github?.repo === "string") {
		tokenMap.set("GITHUB_REPO", config.github.repo);
	}

	tokenMap.set("DEFAULT_BRANCH", config.defaultBranch ?? "main");

	if (typeof config.slackChannel === "string") {
		tokenMap.set("SLACK_CHANNEL", config.slackChannel);
	}

	return tokenMap;
}

/**
 * Matches a well-formed `${KEY}` literal: an opening `${`, one or more
 * UPPER_SNAKE_CASE characters (letters, digits, underscore), and a closing
 * `}`. Anything malformed (`${`, `${ KEY }`, `${KEY` with no close) falls
 * through unchanged — the substitution layer is deliberately strict so token
 * regressions surface as build failures rather than silently passing through.
 */
const TOKEN_LITERAL_PATTERN = /\$\{([A-Z][A-Z0-9_]*)\}/g;

/**
 * Replaces every `${KEY}` literal in `content` with the matching value from
 * `tokenMap`. Throws on the first unknown token with the token name plus up
 * to 80 chars of surrounding context, so the call site reads as a fail-fast.
 *
 * No escape syntax — the layer is intentionally the simplest thing that
 * works (per ADR-0030). If a canonical source needs to render a literal
 * `${KEY}` without substitution, place it inside a fenced code block that
 * the consuming layer treats as opaque, or rephrase the prose.
 */
export function substituteTokens(
	content: string,
	tokenMap: Map<string, string>
): string {
	return content.replace(TOKEN_LITERAL_PATTERN, (match, tokenName: string, offset: number) => {
		if (!tokenMap.has(tokenName)) {
			throw new Error(
				`Unknown token \${${tokenName}} in content near: ${contextSnippet(content, offset)}`
			);
		}

		return tokenMap.get(tokenName) ?? match;
	});
}

/**
 * Renders the Project Context tracker line for the active ticket system.
 *
 * The line lives at one seam (skills-ecosystem.md § Project Context) but its
 * shape depends on the tracker: a Linear team carries a team key and ticket
 * prefix, while a GitHub-issues repo has neither. Deriving the whole line as a
 * token lets the canonical markdown stay a single `${TICKET_TRACKER}` literal
 * instead of branching, so a github-issues install degrades to "GitHub issues"
 * without emitting a phantom Linear team.
 */
function deriveTicketTracker(config: PrismConfig): string {
	if (config.ticketSystem.kind === "github-issues") {
		return "**Ticket tracker:** GitHub issues";
	}

	const teamKey = config.ticketSystem.teamKey ?? config.ticketPrefix;

	return `**Linear team:** ${teamKey} (prefix: ${config.ticketPrefix}-####)`;
}

function contextSnippet(content: string, offset: number): string {
	const start = Math.max(0, offset - 40);
	const end = Math.min(content.length, offset + 40);
	const snippet = content.slice(start, end).replace(/\s+/g, " ").trim();

	return `"${snippet}"`;
}

function describeType(value: unknown): string {
	if (value === null) {
		return "null";
	}

	if (Array.isArray(value)) {
		return "array";
	}

	return typeof value;
}
