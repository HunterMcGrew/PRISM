export interface ArchitectRouteState {
	/**
	 * Doc paths (relative to `.prism/architect/`) whose own path has been
	 * read this session — the observed-effect signal that a doc actually
	 * reached the model, as opposed to merely being named in an announcement.
	 * The only array a write-time deny gate clears against.
	 */
	read: string[];
	/**
	 * Doc paths named in an announcement this session, regardless of whether
	 * they were ever actually read. Suppresses repeat emission — each doc is
	 * named at most once per session.
	 */
	announced: string[];
}

export type Manifest = Record<string, string | string[]>;

export const MAX_EMISSION_BYTES: number;

export function formatNag(unreadDocs: string[]): {
	text: string;
	includedDocs: string[];
};

export function toRepoRelativePath(
	repoRoot: string,
	filePath: string
): string | null;

export function findRepoRoot(startDir: string): Promise<string | null>;

export function matchDocsForPath(
	manifest: Manifest,
	relativePath: string
): string[];

export function loadRouteState(
	repoRoot: string,
	sessionId: string
): Promise<ArchitectRouteState>;

export function saveRouteState(
	repoRoot: string,
	sessionId: string,
	state: ArchitectRouteState
): Promise<void>;

export function resolveArchitectNag(
	repoRoot: string,
	filePath: string,
	sessionId: string
): Promise<string | null>;
