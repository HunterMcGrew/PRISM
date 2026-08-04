/**
 * Read-triggered architect-context routing (plan `context-delivery-mechanism.md`
 * task 1, ADR-0071).
 *
 * Architect-context routing keys on the working diff — `prism-architect`
 * startup step 4 matches the diff against `.prism/architect/manifest.json`.
 * A prompt-driven task carries an unrelated diff (or none at all), so the
 * target path's own architect doc never loads through that route. `Read` is
 * a strict precondition for `Edit` in every host that gates on it, so a hook
 * firing after `Read` lands the governing doc before any edit is possible —
 * nearer the work than a session-start copy, and current because it re-reads
 * the doc from disk on every call rather than replaying a cached one.
 *
 * `resolveArchitectDoc` is host-agnostic: it takes a file path and a session
 * id and returns a nag naming the unread matched docs by path, or `null`
 * when nothing matches or every matched doc has already been read this
 * session. It never injects a doc's body — naming is not delivering, so a
 * doc keeps being named until a real `Read` of its own path is observed,
 * which is what actually credits it as delivered. Each platform adapter
 * (`claude-post-read.ts` today; Cursor and Codex in a follow-up PR) owns only
 * the stdin/stdout shape for its host and calls this resolver for the actual
 * decision, so the routing logic is written and tested once.
 */
import fs from "node:fs/promises";
import path from "node:path";

import { compileMatcher } from "../verify-manifest-coverage";

export interface ArchitectRouteState {
	/**
	 * Doc paths (relative to `.prism/architect/`) whose own path has been
	 * read this session — the observed-effect signal that a doc actually
	 * reached the model, as opposed to merely being named in a nag.
	 */
	read: string[];
}

type Manifest = Record<string, string | string[]>;

const ARCHITECT_DIR_PREFIX = ".prism/architect/";

const NAG_PREFIX = "Architect context for this path is unread: ";
const NAG_SUFFIX = " (under .prism/architect/).";

/**
 * Hard ceiling on the total emitted nag payload, in bytes. Claude Code's
 * `additionalContext` channel truncates past 10,000 characters and replaces
 * the overflow with a file preview the model never opens (ADR-0071). A nag
 * naming a handful of doc paths sits far under that today — the measured
 * worst case across this repo's own manifest is under 400 bytes — but
 * nothing in the join bounds the sum, so this is insurance against a future
 * manifest fan-out rather than what keeps today's nag safe.
 */
export const MAX_EMISSION_BYTES = 8000;

/**
 * Returns the doc identifier (relative to `.prism/architect/`, matching the
 * value shape `manifest.json` routes use) when `relativePath` is a read of a
 * file under that directory, or `null` otherwise.
 */
function extractArchitectDocPath(relativePath: string): string | null {
	if (!relativePath.startsWith(ARCHITECT_DIR_PREFIX)) {
		return null;
	}

	const docPath = relativePath.slice(ARCHITECT_DIR_PREFIX.length);
	return docPath.length > 0 ? docPath : null;
}

/**
 * Formats the nag payload naming every doc in `unreadDocs` by path, holding
 * the joined text under `MAX_EMISSION_BYTES`. When the full list doesn't
 * fit, names as many docs as fit and appends a `(+N more matched)` count for
 * the rest — a truncated list that says so is honest about what was
 * dropped; a silently clipped one reads as complete.
 */
function formatNag(unreadDocs: string[]): string {
	const full = `${NAG_PREFIX}${unreadDocs.join(", ")}${NAG_SUFFIX}`;
	if (Buffer.byteLength(full, "utf8") <= MAX_EMISSION_BYTES) {
		return full;
	}

	let included = 0;
	for (let count = 1; count <= unreadDocs.length; count++) {
		const remaining = unreadDocs.length - count;
		const tail = remaining > 0 ? ` (+${remaining} more matched)` : "";
		const candidate = `${NAG_PREFIX}${unreadDocs.slice(0, count).join(", ")}${NAG_SUFFIX}${tail}`;
		if (Buffer.byteLength(candidate, "utf8") > MAX_EMISSION_BYTES) {
			break;
		}
		included = count;
	}
	included = Math.max(included, 1);

	const remaining = unreadDocs.length - included;
	const tail = remaining > 0 ? ` (+${remaining} more matched)` : "";
	return `${NAG_PREFIX}${unreadDocs.slice(0, included).join(", ")}${NAG_SUFFIX}${tail}`;
}

/**
 * Converts a hook-supplied file path (absolute on every host observed so far)
 * to a manifest-matchable path relative to the repo root, using forward
 * slashes regardless of platform. Returns `null` for a path outside the repo
 * — nothing in `manifest.json` can match it, and treating it as a miss here
 * keeps that judgment call in one place instead of leaking into every caller.
 */
export function toRepoRelativePath(
	repoRoot: string,
	filePath: string
): string | null {
	const absoluteFilePath = path.isAbsolute(filePath)
		? filePath
		: path.resolve(repoRoot, filePath);
	const relative = path.relative(repoRoot, absoluteFilePath);

	if (relative.startsWith("..") || path.isAbsolute(relative)) {
		return null;
	}

	return relative.split(path.sep).join("/");
}

/**
 * Walks upward from `startDir` looking for `.prism/architect/manifest.json`,
 * returning the first directory that contains it, or `null` if the walk
 * reaches the filesystem root without finding one.
 *
 * A hook's `cwd` is the session's working directory, not necessarily the
 * repo root. Without this walk, a session started in a subdirectory makes
 * `loadManifest` throw `ENOENT` for the whole session — indistinguishable,
 * from the transcript, from a path that genuinely has no manifest route.
 * Resolving the real root first means a missing manifest afterward tells the
 * truth: there really is no manifest to route against.
 */
export async function findRepoRoot(startDir: string): Promise<string | null> {
	let dir = path.resolve(startDir);

	while (true) {
		const candidate = path.join(dir, ".prism", "architect", "manifest.json");
		try {
			await fs.access(candidate);
			return dir;
		} catch {
			// Not here — keep walking up.
		}

		const parent = path.dirname(dir);
		if (parent === dir) {
			return null;
		}
		dir = parent;
	}
}

/**
 * Reads and parses `.prism/architect/manifest.json` from the given repo root.
 */
async function loadManifest(repoRoot: string): Promise<Manifest> {
	const manifestPath = path.join(
		repoRoot,
		".prism",
		"architect",
		"manifest.json"
	);
	const raw = await fs.readFile(manifestPath, "utf8");
	return JSON.parse(raw) as Manifest;
}

/**
 * Returns every doc the manifest routes `relativePath` to, in first-match
 * order with duplicates removed. Reuses `compileMatcher` from
 * `verify-manifest-coverage.ts` rather than re-deriving the three matcher
 * shapes (exact, directory-prefix, glob) a second time.
 */
export function matchDocsForPath(
	manifest: Manifest,
	relativePath: string
): string[] {
	const docs: string[] = [];
	const seen = new Set<string>();

	for (const [pattern, docOrDocs] of Object.entries(manifest)) {
		if (!compileMatcher(pattern)(relativePath)) {
			continue;
		}

		const entryDocs = Array.isArray(docOrDocs) ? docOrDocs : [docOrDocs];
		for (const doc of entryDocs) {
			if (!seen.has(doc)) {
				seen.add(doc);
				docs.push(doc);
			}
		}
	}

	return docs;
}

function buildStateFilePath(repoRoot: string, sessionId: string): string {
	const safeSessionId = sessionId.replace(/[^a-zA-Z0-9._-]/g, "_");
	return path.join(repoRoot, ".prism", `architect-route-state.${safeSessionId}.json`);
}

/**
 * Loads the per-session read-tracking state. Returns `{ read: [] }` when no
 * state file exists yet — per `lazy-artifacts.md`, this file is created on
 * first write, never seeded — and also when an existing file cannot be read
 * or parsed (missing, truncated, hand-edited into invalid JSON, or written
 * under the pre-rename `injected` schema). This state is a cache, not a
 * record: treating unrecognized state the same as absent costs nothing and
 * the worst outcome is one doc getting re-nagged, versus re-throwing and
 * bricking the hook for the rest of the session with no repair path.
 */
export async function loadRouteState(
	repoRoot: string,
	sessionId: string
): Promise<ArchitectRouteState> {
	try {
		const raw = await fs.readFile(buildStateFilePath(repoRoot, sessionId), "utf8");
		const parsed = JSON.parse(raw) as Partial<ArchitectRouteState>;
		return { read: Array.isArray(parsed.read) ? parsed.read : [] };
	} catch {
		return { read: [] };
	}
}

/** State files older than this are pruned on every save — see `pruneStaleRouteState`. */
const STALE_STATE_FILE_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Removes sibling `architect-route-state.*.json` and orphaned
 * `architect-route-state.*.json.tmp` files last modified more than
 * `STALE_STATE_FILE_AGE_MS` ago. One file accumulates per session with
 * nothing to remove them otherwise — the `.gitignore` glob keeps them out of
 * `git status`, so they'd otherwise grow unbounded and invisibly in `.prism/`.
 * A `.tmp` orphan is exactly the file `saveRouteState`'s atomic write leaves
 * behind when a hook process is killed mid-write (before the `rename` to the
 * final path), so it earns the same reap as a stale finished state file. A
 * day is long enough that no session still in progress loses its state;
 * failures here (a file removed between the listing and the unlink, a
 * permissions error) are swallowed — pruning is best-effort housekeeping,
 * never a reason to fail the save it rides along with.
 */
async function pruneStaleRouteState(repoRoot: string): Promise<void> {
	const stateDir = path.join(repoRoot, ".prism");
	const now = Date.now();

	let entries: string[];
	try {
		entries = await fs.readdir(stateDir);
	} catch {
		return;
	}

	for (const entry of entries) {
		if (
			!entry.startsWith("architect-route-state.") ||
			!(entry.endsWith(".json") || entry.endsWith(".json.tmp"))
		) {
			continue;
		}

		const entryPath = path.join(stateDir, entry);
		try {
			const stats = await fs.stat(entryPath);
			if (now - stats.mtimeMs > STALE_STATE_FILE_AGE_MS) {
				await fs.rm(entryPath, { force: true });
			}
		} catch {
			// Best-effort — a file removed between readdir and stat, or a
			// permissions error, is not a reason to fail the caller's save.
		}
	}
}

/**
 * Persists the per-session read-tracking state atomically — a tmp file in
 * the same directory followed by `rename`, so a hook process killed
 * mid-write leaves either the prior state or the new one, never a
 * half-written file the next `Read` would choke on. Also prunes stale
 * sibling state files from past sessions (`pruneStaleRouteState`).
 */
export async function saveRouteState(
	repoRoot: string,
	sessionId: string,
	state: ArchitectRouteState
): Promise<void> {
	const targetPath = buildStateFilePath(repoRoot, sessionId);
	await fs.mkdir(path.dirname(targetPath), { recursive: true });

	const tmpPath = `${targetPath}.tmp`;
	await fs.writeFile(tmpPath, `${JSON.stringify(state, null, "\t")}\n`, "utf8");

	try {
		await fs.rename(tmpPath, targetPath);
	} catch (error) {
		await fs.rm(tmpPath, { force: true });
		throw error;
	}

	await pruneStaleRouteState(repoRoot);
}

/**
 * Resolves what to tell the model about architect context for a file read,
 * or `null` when there is nothing to say — either no manifest route matches
 * the path, or every matching doc has already been read this session.
 *
 * Two things happen on every call, in order:
 *
 * 1. **Credit a read.** If `filePath` is itself a doc under
 *    `.prism/architect/`, that doc is marked read — an observed effect,
 *    not an assumption. A doc counts as delivered only once its own path is
 *    actually read; naming it in a nag is not delivery, so an unread doc
 *    keeps being named until this fires for it.
 * 2. **Nag the unread.** If `filePath` matches one or more manifest routes,
 *    every matched doc not yet marked read is named by path in a single nag
 *    payload — no doc bodies are ever injected. The nag is capped at
 *    `MAX_EMISSION_BYTES`; see `formatNag`.
 */
export async function resolveArchitectDoc(
	repoRoot: string,
	filePath: string,
	sessionId: string
): Promise<string | null> {
	const relativePath = toRepoRelativePath(repoRoot, filePath);
	if (relativePath === null) {
		return null;
	}

	const state = await loadRouteState(repoRoot, sessionId);
	const readSet = new Set(state.read);

	// Two `Read` calls in the same tool-call batch spawn concurrent hook
	// processes with no lock between this read and the `saveRouteState` below —
	// if both read state before either writes, the later write can drop the
	// earlier one's addition and the same doc gets re-nagged after it was
	// already read. The failure mode is a harmless extra nag line, not data
	// loss or a crash, so this is accepted as a known best-effort signal
	// rather than serialized.
	const docJustRead = extractArchitectDocPath(relativePath);
	if (docJustRead !== null && !readSet.has(docJustRead)) {
		readSet.add(docJustRead);
		await saveRouteState(repoRoot, sessionId, { read: [...readSet] });
	}

	const manifest = await loadManifest(repoRoot);
	const matchedDocs = matchDocsForPath(manifest, relativePath);
	const unreadDocs = matchedDocs.filter((doc) => !readSet.has(doc));
	if (unreadDocs.length === 0) {
		return null;
	}

	return formatNag(unreadDocs);
}
