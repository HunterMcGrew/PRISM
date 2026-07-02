/**
 * Validates a parsed `.ai-skills/config.json` against `config.schema.json`
 * before `prism:update` touches any file.
 *
 * `lib/tokens.ts`'s `loadConfig` already fails fast on the fields the
 * substitution layer reads (required top-level keys, `ticketSystem.kind`
 * membership) — but its own JSDoc says schema-level checks like the
 * `ticketPrefix` pattern and `techStack` enum membership are "deferred to the
 * JSON Schema and the consumer's editor." In practice nothing enforces those
 * at sync time: a hand-edited bad config (an unrecognized `techStack` entry,
 * a `ticketPrefix` that doesn't match the branch-naming pattern) passes
 * `loadConfig` and only surfaces later as a leftover-token build failure
 * pointing at rendered platform output — nowhere near the config field that
 * actually caused it.
 *
 * This walks the small subset of JSON Schema draft-07 that
 * `config.schema.json` actually uses (`required`, `type`, `enum`, `pattern`,
 * `properties`, `items`, `uniqueItems`) rather than pulling in a full
 * validator library — mirrors the no-new-runtime-dependency decision already
 * made in `lib/onboarding-config.ts`'s `validateOnDiskConfig`. Unlike that
 * function's hand-maintained enum mirror, this reads the enum/pattern values
 * directly from the schema file, so the two can't drift apart.
 */
import fs from "node:fs";
import path from "node:path";

/** Structural subset of JSON Schema draft-07 this validator understands. */
interface JsonSchemaNode {
	type?: string | string[];
	required?: string[];
	properties?: Record<string, JsonSchemaNode>;
	items?: JsonSchemaNode;
	enum?: unknown[];
	pattern?: string;
	uniqueItems?: boolean;
	additionalProperties?: JsonSchemaNode | boolean;
}

/**
 * Thrown when a config value fails validation. `pointer` is a JSON-Pointer-
 * style path (e.g. `/ticketSystem/kind`) naming the offending field, matching
 * the error shape `lib/tokens.ts`'s `loadConfig` already uses so callers get a
 * consistent "which field, what's wrong" message regardless of which
 * validator caught it.
 */
export class ConfigSchemaValidationError extends Error {
	constructor(
		public readonly pointer: string,
		reason: string
	) {
		super(`${pointer}: ${reason}`);
		this.name = "ConfigSchemaValidationError";
	}
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

function matchesType(value: unknown, type: string): boolean {
	switch (type) {
		case "object":
			return typeof value === "object" && value !== null && !Array.isArray(value);
		case "array":
			return Array.isArray(value);
		case "string":
			return typeof value === "string";
		case "boolean":
			return typeof value === "boolean";
		case "number":
		case "integer":
			return typeof value === "number";
		default:
			return true;
	}
}

/**
 * Recursively validates `value` against `schema`, throwing on the first
 * violation. `pointer` accumulates the JSON-Pointer path as the walk
 * descends, so a nested failure (e.g. `ticketSystem.kind`) reports the full
 * path rather than just the leaf key.
 */
function validateNode(value: unknown, schema: JsonSchemaNode, pointer: string): void {
	if (value === undefined) {
		return;
	}

	const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
	if (types.length > 0 && !types.some((t) => matchesType(value, t))) {
		throw new ConfigSchemaValidationError(
			pointer,
			`must be of type ${types.join(" or ")} (got ${describeType(value)})`
		);
	}

	if (schema.enum && !schema.enum.some((allowed) => allowed === value)) {
		throw new ConfigSchemaValidationError(
			pointer,
			`must be one of ${JSON.stringify(schema.enum)} (got ${JSON.stringify(value)})`
		);
	}

	if (schema.pattern && typeof value === "string") {
		const regex = new RegExp(schema.pattern);
		if (!regex.test(value)) {
			throw new ConfigSchemaValidationError(
				pointer,
				`must match pattern ${schema.pattern} (got ${JSON.stringify(value)})`
			);
		}
	}

	if (Array.isArray(value) && schema.items) {
		value.forEach((item, index) => {
			validateNode(item, schema.items as JsonSchemaNode, `${pointer}/${index}`);
		});

		if (schema.uniqueItems) {
			const seen = new Set<string>();
			for (const item of value) {
				const key = JSON.stringify(item);
				if (seen.has(key)) {
					throw new ConfigSchemaValidationError(
						pointer,
						`must not contain duplicate values (${JSON.stringify(item)} appears more than once)`
					);
				}
				seen.add(key);
			}
		}
	}

	if (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value) &&
		schema.properties
	) {
		const objectValue = value as Record<string, unknown>;

		for (const requiredKey of schema.required ?? []) {
			if (!(requiredKey in objectValue)) {
				throw new ConfigSchemaValidationError(
					`${pointer}/${requiredKey}`,
					"required field is missing"
				);
			}
		}

		for (const [key, propertySchema] of Object.entries(schema.properties)) {
			validateNode(objectValue[key], propertySchema, `${pointer}/${key}`);
		}
	}
}

/**
 * Loads and parses `config.schema.json` from PRISM's `.ai-skills/` dir.
 * `prismSourceRoot` is the PRISM checkout root — the schema always ships from
 * PRISM's own source, never the consumer's, so a consumer with a stale or
 * hand-edited schema copy can't validate against the wrong rules.
 */
function loadConfigSchema(prismSourceRoot: string): JsonSchemaNode {
	const schemaPath = path.join(prismSourceRoot, ".ai-skills", "config.schema.json");

	if (!fs.existsSync(schemaPath)) {
		throw new Error(`Missing config schema at ${schemaPath}.`);
	}

	const raw = fs.readFileSync(schemaPath, "utf8");

	try {
		return JSON.parse(raw) as JsonSchemaNode;
	} catch (error) {
		throw new Error(
			`Invalid JSON in ${schemaPath}: ${error instanceof Error ? error.message : String(error)}`
		);
	}
}

/**
 * Reads and validates the consumer's `.ai-skills/config.json` against
 * `config.schema.json` (resolved from `prismSourceRoot`), throwing a
 * `ConfigSchemaValidationError` naming the first offending field on failure.
 *
 * Intended to run before any `.prism/` file write in `runUpdate` /
 * `runAdopt` — a config that fails this check should never reach the point
 * where a leftover-token build failure is the first visible symptom.
 */
export function validateConsumerConfigAgainstSchema(
	consumerRepoRoot: string,
	prismSourceRoot: string
): void {
	const configPath = path.join(consumerRepoRoot, ".ai-skills", "config.json");

	if (!fs.existsSync(configPath)) {
		throw new Error(`Missing .ai-skills/config.json at ${configPath}.`);
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

	const schema = loadConfigSchema(prismSourceRoot);

	validateNode(parsed, schema, "");
}
