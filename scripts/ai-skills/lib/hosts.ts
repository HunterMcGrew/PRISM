/**
 * The one place `hosts` is resolved from a consumer's config.
 *
 * `update.ts` decides what to deliver and `doctor.ts` decides what to
 * report, and the two have to agree — a doctor that reads the key
 * differently from the installer produces exactly the misleading clean
 * report this change exists to remove. Two callers reading one config
 * field is what earns the shared function; neither reads the raw key.
 *
 * Total and non-throwing on purpose. `doctor` never throws on a bad
 * install (it reports instead), so this degrades an absent, malformed, or
 * unrecognized value to the full host set rather than raising. A genuinely
 * invalid value is caught with a field-level message by
 * `validateConsumerConfigAgainstSchema` before `runUpdate` writes anything;
 * this function's job is resolution, not validation.
 */
export const HOST_NAMES = ["claude", "codex", "cursor"] as const;

export type HostName = (typeof HOST_NAMES)[number];

/**
 * Resolves which hosts a consumer runs. An absent or unusable `hosts`
 * value means all of them, so an install that predates the key behaves
 * exactly as it did before.
 */
export function resolveHosts(config: { hosts?: unknown } | null | undefined): HostName[] {
	const declared = config?.hosts;

	if (!Array.isArray(declared)) {
		return [...HOST_NAMES];
	}

	const recognized = declared.filter((entry): entry is HostName =>
		(HOST_NAMES as readonly string[]).includes(entry as string)
	);

	return recognized.length > 0 ? recognized : [...HOST_NAMES];
}

/**
 * The per-output flags `generatePlatformSkills` branches on, derived from a
 * host set.
 *
 * Three hosts, six outputs — a host owns more than one. Claude Code reads
 * both a skill roster and agent definitions; Codex reads a skill roster, its
 * own agent adapters, and `codex-config.toml`; Cursor reads a skill roster
 * only. Deriving the six from the three in one place is what keeps a caller
 * from gating the roster and forgetting the adapters beside it.
 *
 * This is deliberately not what `build.ts` computes. That object answers a
 * different question — has this platform ever been built in this checkout,
 * so is a diff real drift or an unbuilt platform — and wiring it to a config
 * key would make `prism:check` pass or fail on a value unrelated to drift.
 * See the plan's `## Decisions`.
 */
export interface HostOutputFlags {
	claude: boolean;
	codex: boolean;
	cursor: boolean;
	codexAgents: boolean;
	claudeAgents: boolean;
	codexConfig: boolean;
}

export function deriveOptedIn(hosts: HostName[]): HostOutputFlags {
	const has = (host: HostName): boolean => hosts.includes(host);

	return {
		claude: has("claude"),
		claudeAgents: has("claude"),
		codex: has("codex"),
		codexAgents: has("codex"),
		codexConfig: has("codex"),
		cursor: has("cursor"),
	};
}
