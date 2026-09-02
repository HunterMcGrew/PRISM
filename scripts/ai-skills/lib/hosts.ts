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
