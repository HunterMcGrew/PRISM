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
	/**
	 * `<doc>\n<heading>` keys the umbrella speed bump has already stopped
	 * once. Optional on write so a caller seeding read state alone still
	 * typechecks; `loadRouteState` always returns it.
	 */
	umbrellaAcks?: string[];
}

export type Manifest = Record<string, string | string[]>;

export const MAX_EMISSION_BYTES: number;

export const ARCHITECT_DIR_PREFIX: string;

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
	scopeId: string
): Promise<ArchitectRouteState>;

export function saveRouteState(
	repoRoot: string,
	scopeId: string,
	state: ArchitectRouteState
): Promise<void>;

export function pruneStaleRouteState(
	repoRoot: string,
	filePrefix?: string
): Promise<void>;

export function resolveUnreadDocs(
	repoRoot: string,
	filePath: string,
	scopeId: string
): Promise<string[]>;

export function filterRoutedPaths(
	repoRoot: string,
	filePaths: string[]
): Promise<string[]>;

export function extractNewHeadings(
	editText: string,
	currentText: string
): string[];

export function formatUmbrellaReason(
	relativePath: string,
	headings: string[],
	routes: string[],
	currentText: string
): string;

export function resolveUmbrellaSpeedBump(
	repoRoot: string,
	scopeId: string,
	edits: { filePath: string; editText: string }[]
): Promise<string | null>;

export function resolveArchitectNag(
	repoRoot: string,
	filePath: string,
	scopeId: string,
	options?: { credit?: boolean }
): Promise<string | null>;
