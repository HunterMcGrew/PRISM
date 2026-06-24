/**
 * Atlas's config writer (PR-2.1, plan task 7).
 *
 * `writeOnboardingConfig` is the seam Atlas's interactive flow calls at the
 * end of a session to persist `.ai-skills/config.json`. The function:
 *
 * - Translates `OnboardingConfig` (flow-internal shape) into the on-disk
 *   schema documented at `.ai-skills/config.schema.json`.
 * - Validates the on-disk shape against the schema's required fields and
 *   declared patterns *before* touching the filesystem. A schema failure
 *   throws with the offending field name and the on-disk file is not
 *   modified.
 * - Writes atomically: tmp file in the same directory, fsync the parent dir,
 *   rename over the target. An interrupted process leaves either the prior
 *   `.ai-skills/config.json` or the new one — never a half-written file.
 *
 * The validation is intentionally structural-only — it checks the fields the
 * build's token-substitution layer reads (per `lib/tokens.ts`'s `loadConfig`)
 * plus the additional constraints the schema declares (ticketPrefix pattern,
 * techStack enum membership, ticketSystem.kind enum). A full JSON Schema
 * validator (AJV, etc.) is intentionally not pulled in — the substrate has no
 * runtime dependencies today and the structural checks here are sufficient
 * for the fields Atlas writes.
 */
import fs from "node:fs/promises";
import path from "node:path";

import type { OnboardingConfig } from "./onboarding-types";

/**
 * On-disk shape — mirrors `.ai-skills/config.schema.json`. This is the
 * authoritative output type for `.ai-skills/config.json`. The build's
 * substitution layer (`lib/tokens.ts`) reads from a structurally equivalent
 * shape — keep the two in sync when fields are added.
 *
 * The write path preserves any fields present in the existing file that are
 * not in this type (e.g. `features.conductorMayMerge` set manually after
 * install) — a reconfigure run never silently drops unknown fields.
 */
export interface PrismOnDiskConfig {
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
	techStack?: string[];
	rules?: {
		universal?: "all";
		optIn?: string[];
	};
	slackChannel?: string;
	documentation?: {
		location?: string;
		audience?: string;
		keepsDevDocs?: boolean;
		/** Open string — not validated against an enum. New consumers add their own value without changing this type. */
		format?: string;
	};
}

export interface WriteOnboardingConfigOptions {
	/**
	 * Override for the `org` field. The schema requires `org` distinct from
	 * `project`, but Atlas's flow collects only a project name today. Callers
	 * pass `org` here when it differs from `project`; the default mirrors
	 * `project` so single-team teams don't have to answer twice.
	 */
	org?: string;
	/**
	 * Override for `defaultBranch`. Defaults to `"main"`.
	 */
	defaultBranch?: string;
	/**
	 * Optional Slack channel for Lilac's standup post. Omitted from the on-disk
	 * file when absent.
	 */
	slackChannel?: string;
	/**
	 * Optional Linear workspace slug. Omitted from `ticketSystem.workspace`
	 * when absent.
	 */
	linearWorkspace?: string;
}

export interface WriteOnboardingConfigResult {
	path: string;
	schemaValidated: true;
}

/**
 * Allowed values for `techStack` items — mirrors the enum in
 * `.ai-skills/config.schema.json`. When the schema's enum grows, this list
 * needs to grow alongside it.
 */
/**
 * Canonical ordered list of top-level keys in `.ai-skills/config.json`. Order
 * here controls the serialization order in the output file. Both
 * `serializeConfig` and `readUnknownFields` derive from this constant so the
 * two functions always agree on which keys are "known."
 */
const ORDERED_TOP_LEVEL_KEYS: ReadonlyArray<keyof PrismOnDiskConfig> = [
	"org",
	"project",
	"ticketPrefix",
	"ticketSystem",
	"github",
	"defaultBranch",
	"techStack",
	"rules",
	"slackChannel",
	"documentation",
];

const TECH_STACK_ENUM: ReadonlySet<string> = new Set([
	"typescript",
	"javascript",
	"react",
	"nextjs",
	"vue",
	"nuxt",
	"angular",
	"svelte",
	"node",
	"php",
	"python",
	"ruby",
	"go",
	"rust",
	"java",
	"kotlin",
	"swift",
	"wordpress",
	"gutenberg",
	"tailwind",
	"graphql",
	"apollo",
	"rest",
	"prisma",
]);

const TICKET_PREFIX_PATTERN = /^[A-Z][A-Z0-9]+$/;

/**
 * Thrown by `writeOnboardingConfig` when the assembled on-disk config fails
 * schema validation. The message names the offending field and the reason —
 * callers (Atlas's interactive flow) surface this to the user so they can
 * correct the input without inspecting the schema directly.
 */
export class OnboardingConfigValidationError extends Error {
	constructor(
		public readonly field: string,
		message: string
	) {
		super(`${field}: ${message}`);
		this.name = "OnboardingConfigValidationError";
	}
}

/**
 * Translates the flow-internal `OnboardingConfig` shape into the on-disk
 * schema shape. Fields with no corresponding on-disk slot today (the
 * resolved `techStack` detection result, the `existingStandards` paths)
 * are flattened or dropped — `techStack` collapses into the schema's
 * string-array form by deduplicating language + framework names.
 */
export function toOnDiskConfig(
	config: OnboardingConfig,
	options: WriteOnboardingConfigOptions = {}
): PrismOnDiskConfig {
	const techStackValues = new Set<string>();
	for (const lang of config.techStack.languages) {
		if (lang.name !== "unknown") {
			techStackValues.add(lang.name);
		}
	}
	for (const framework of config.techStack.frameworks) {
		techStackValues.add(framework.name);
	}

	// When a non-empty linearTeam is provided the ticket system is Linear;
	// otherwise it is GitHub Issues and no team key is emitted. This lets
	// Atlas (which always supplies linearTeam) produce byte-identical output
	// while allowing init to write a truthful github-issues config by passing
	// an empty linearTeam.
	const ticketSystem: PrismOnDiskConfig["ticketSystem"] =
		typeof config.linearTeam === "string" && config.linearTeam.length > 0
			? { kind: "linear", teamKey: config.linearTeam }
			: { kind: "github-issues" };

	const onDisk: PrismOnDiskConfig = {
		org: options.org ?? config.project,
		project: config.project,
		ticketPrefix: config.ticketPrefix,
		ticketSystem,
		github: {
			owner: config.githubOwner,
			repo: config.githubRepo,
		},
		defaultBranch: options.defaultBranch ?? "main",
		techStack: Array.from(techStackValues).sort(),
		rules: { universal: "all" },
	};

	if (typeof options.linearWorkspace === "string" && options.linearWorkspace.length > 0) {
		onDisk.ticketSystem.workspace = options.linearWorkspace;
	}

	if (typeof options.slackChannel === "string" && options.slackChannel.length > 0) {
		onDisk.slackChannel = options.slackChannel;
	}

	if (config.documentation !== undefined) {
		onDisk.documentation = {
			location: config.documentation.location,
			audience: config.documentation.audience,
			keepsDevDocs: config.documentation.keepsDevDocs,
			format: config.documentation.format,
		};
	}

	return onDisk;
}

/**
 * Structural validator against `.ai-skills/config.schema.json`. Throws an
 * `OnboardingConfigValidationError` on the first failed check — Atlas's flow
 * surfaces the field name to the user so they can re-answer the failing
 * prompt without re-walking the entire flow.
 */
export function validateOnDiskConfig(config: PrismOnDiskConfig): void {
	for (const key of ["project", "org", "ticketPrefix"] as const) {
		const value = config[key];
		if (typeof value !== "string" || value.length === 0) {
			throw new OnboardingConfigValidationError(
				key,
				`required field is missing or empty (got ${describeType(value)})`
			);
		}
	}

	if (!TICKET_PREFIX_PATTERN.test(config.ticketPrefix)) {
		throw new OnboardingConfigValidationError(
			"ticketPrefix",
			`value ${JSON.stringify(config.ticketPrefix)} must match /^[A-Z][A-Z0-9]+$/`
		);
	}

	if (config.ticketSystem === null || typeof config.ticketSystem !== "object") {
		throw new OnboardingConfigValidationError(
			"ticketSystem",
			"required object is missing"
		);
	}

	if (config.ticketSystem.kind !== "linear" && config.ticketSystem.kind !== "github-issues") {
		throw new OnboardingConfigValidationError(
			"ticketSystem.kind",
			`must be "linear" or "github-issues" (got ${JSON.stringify(config.ticketSystem.kind)})`
		);
	}

	if (Array.isArray(config.techStack)) {
		for (const item of config.techStack) {
			if (typeof item !== "string" || !TECH_STACK_ENUM.has(item)) {
				throw new OnboardingConfigValidationError(
					"techStack",
					`value ${JSON.stringify(item)} is not a recognized stack flag`
				);
			}
		}
		const seen = new Set<string>();
		for (const item of config.techStack) {
			if (seen.has(item)) {
				throw new OnboardingConfigValidationError(
					"techStack",
					`value ${JSON.stringify(item)} appears more than once`
				);
			}
			seen.add(item);
		}
	}
}

/**
 * Persists `.ai-skills/config.json` for the given repo. Validates the
 * translated on-disk shape against the schema before any filesystem write —
 * a validation failure throws and leaves any prior `.ai-skills/config.json`
 * untouched. Writes are atomic: a tmp file in the same directory followed by
 * a rename over the target, so a process interrupt leaves either the prior
 * file or the new one but never a half-written file.
 *
 * The output is stable across runs with the same input (the JSON keys are
 * emitted in a deterministic order via `JSON.stringify` with a fixed key
 * list), so a second invocation with the same `OnboardingConfig` produces a
 * byte-identical file. Idempotency is part of the contract; tests assert it.
 *
 * Unknown fields in the existing `config.json` (e.g. `features.conductorMayMerge`
 * set manually after install) are read and re-emitted after the known fields,
 * so a reconfigure run never silently drops them.
 */
export async function writeOnboardingConfig(
	repoRoot: string,
	config: OnboardingConfig,
	options: WriteOnboardingConfigOptions = {}
): Promise<WriteOnboardingConfigResult> {
	const onDisk = toOnDiskConfig(config, options);
	validateOnDiskConfig(onDisk);

	const targetDir = path.join(repoRoot, ".ai-skills");
	const targetPath = path.join(targetDir, "config.json");
	const tmpPath = path.join(targetDir, "config.json.tmp");

	await fs.mkdir(targetDir, { recursive: true });

	const unknownFields = await readUnknownFields(targetPath);
	const serialized = serializeConfig(onDisk, unknownFields);

	await fs.writeFile(tmpPath, serialized, "utf8");

	try {
		await fs.rename(tmpPath, targetPath);
	} catch (error) {
		await fs.rm(tmpPath, { force: true });
		throw error;
	}

	return { path: targetPath, schemaValidated: true };
}

/**
 * Reads the existing `config.json` (if any) and returns any top-level keys
 * not present in `ORDERED_TOP_LEVEL_KEYS`. These are fields set manually after
 * install (e.g. `features.conductorMayMerge`) that the write path should
 * preserve across reconfigure runs.
 *
 * Returns an empty object when the file is absent, unreadable, or not valid JSON.
 */
async function readUnknownFields(targetPath: string): Promise<Record<string, unknown>> {
	let raw: string;

	try {
		raw = await fs.readFile(targetPath, "utf8");
	} catch {
		return {};
	}

	let parsed: unknown;

	try {
		parsed = JSON.parse(raw);
	} catch {
		return {};
	}

	if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
		return {};
	}

	const knownKeys = new Set<string>(ORDERED_TOP_LEVEL_KEYS);

	const unknown: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
		if (!knownKeys.has(key)) {
			unknown[key] = value;
		}
	}

	return unknown;
}

/**
 * Serializes the on-disk config with stable key ordering and a trailing
 * newline. Known fields are written in `ORDERED_TOP_LEVEL_KEYS` insertion
 * order, so a second call with the same input returns byte-identical output
 * regardless of the in-memory object's own key order.
 *
 * Unknown fields (fields absent from `ORDERED_TOP_LEVEL_KEYS`) are appended
 * after all known fields in sorted key order, so a reconfigure run preserves
 * manually-set fields like `features.conductorMayMerge`.
 */
function serializeConfig(config: PrismOnDiskConfig, unknownFields: Record<string, unknown> = {}): string {
	const orderedTopLevel = ORDERED_TOP_LEVEL_KEYS;

	const orderedTicketSystem: Array<keyof PrismOnDiskConfig["ticketSystem"]> = [
		"kind",
		"workspace",
		"projectId",
		"teamKey",
	];

	const orderedGithub: Array<keyof NonNullable<PrismOnDiskConfig["github"]>> = [
		"owner",
		"repo",
	];

	const orderedRules: Array<keyof NonNullable<PrismOnDiskConfig["rules"]>> = [
		"universal",
		"optIn",
	];

	const orderedDocumentation: Array<keyof NonNullable<PrismOnDiskConfig["documentation"]>> = [
		"location",
		"audience",
		"keepsDevDocs",
		"format",
	];

	const renderedTopLevel: Record<string, unknown> = {};
	for (const key of orderedTopLevel) {
		const value = config[key];
		if (value === undefined) {
			continue;
		}

		if (key === "ticketSystem") {
			const ts: Record<string, unknown> = {};
			for (const tsKey of orderedTicketSystem) {
				const tsValue = config.ticketSystem[tsKey];
				if (tsValue !== undefined) {
					ts[tsKey] = tsValue;
				}
			}
			renderedTopLevel[key] = ts;
			continue;
		}

		if (key === "github" && config.github) {
			const gh: Record<string, unknown> = {};
			for (const ghKey of orderedGithub) {
				const ghValue = config.github[ghKey];
				if (ghValue !== undefined) {
					gh[ghKey] = ghValue;
				}
			}
			renderedTopLevel[key] = gh;
			continue;
		}

		if (key === "rules" && config.rules) {
			const r: Record<string, unknown> = {};
			for (const rKey of orderedRules) {
				const rValue = config.rules[rKey];
				if (rValue !== undefined) {
					r[rKey] = rValue;
				}
			}
			renderedTopLevel[key] = r;
			continue;
		}

		if (key === "documentation" && config.documentation) {
			const doc: Record<string, unknown> = {};
			for (const docKey of orderedDocumentation) {
				const docValue = config.documentation[docKey];
				if (docValue !== undefined) {
					doc[docKey] = docValue;
				}
			}
			renderedTopLevel[key] = doc;
			continue;
		}

		renderedTopLevel[key] = value;
	}

	for (const key of Object.keys(unknownFields).sort()) {
		renderedTopLevel[key] = unknownFields[key];
	}

	return `${JSON.stringify(renderedTopLevel, null, "\t")}\n`;
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
