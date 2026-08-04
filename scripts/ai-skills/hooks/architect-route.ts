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
 * id and returns the body to inject, or `null` when nothing matches or the
 * match has already been injected this session. Each platform adapter
 * (`claude-post-read.ts` today; Cursor and Codex in a follow-up PR) owns only
 * the stdin/stdout shape for its host and calls this resolver for the actual
 * decision, so the routing logic is written and tested once.
 */
import fs from "node:fs/promises";
import path from "node:path";

import { compileMatcher } from "../verify-manifest-coverage";

export interface ArchitectRouteState {
	/** Doc paths (relative to `.prism/architect/`) already injected this session. */
	injected: string[];
}

type Manifest = Record<string, string | string[]>;

/**
 * Per-doc injection ceiling in bytes. Without this, a single `.prism/**`
 * route can inject two full architect docs (measured at ~92 KB / ~23k tokens
 * for one real `Read` against this repo's own manifest) and the per-session
 * total across every reachable doc runs to ~180 KB — a fifth of the
 * 200k–300k-token session the mechanism exists to serve. 4000 bytes (~1k
 * tokens) keeps an injection pointer-sized: enough for the doc's own
 * `## Purpose` framing to land beside the work, with the full body one
 * `Read` away at the path the truncation note names.
 */
export const MAX_DOC_INJECTION_BYTES = 4000;

/**
 * Slices `text` to at most `maxBytes` UTF-8 bytes without splitting a
 * multi-byte character — backs up over any trailing continuation bytes
 * (`10xxxxxx`) so the result is always valid UTF-8.
 */
function truncateToByteLimit(text: string, maxBytes: number): string {
	const buffer = Buffer.from(text, "utf8");
	if (buffer.length <= maxBytes) {
		return text;
	}

	let end = maxBytes;
	while (end > 0 && (buffer[end] & 0xc0) === 0x80) {
		end--;
	}

	return buffer.subarray(0, end).toString("utf8");
}

/**
 * Formats one doc's injection section, capping the body at
 * `MAX_DOC_INJECTION_BYTES` and naming the on-disk path so the reader can
 * fetch the rest with a normal `Read` when the truncated section isn't
 * enough.
 */
function formatInjectionSection(doc: string, body: string): string {
	const trimmed = body.trim();
	const totalBytes = Buffer.byteLength(trimmed, "utf8");

	if (totalBytes <= MAX_DOC_INJECTION_BYTES) {
		return `### Architect context: ${doc}\n\n${trimmed}`;
	}

	const truncated = truncateToByteLimit(trimmed, MAX_DOC_INJECTION_BYTES);
	return `### Architect context: ${doc} (truncated — ${totalBytes} bytes total; read \`.prism/architect/${doc}\` for the rest)\n\n${truncated}…`;
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
 * Loads the per-session injection-tracking state. Returns `{ injected: [] }`
 * when no state file exists yet — per `lazy-artifacts.md`, this file is
 * created on first injection, never seeded — and also when an existing file
 * cannot be read or parsed (missing, truncated, or hand-edited into invalid
 * JSON). This state is a cache, not a record: treating unparseable state the
 * same as absent costs nothing and the worst outcome is one duplicate
 * injection, versus re-throwing and bricking the hook for the rest of the
 * session with no repair path.
 */
export async function loadRouteState(
	repoRoot: string,
	sessionId: string
): Promise<ArchitectRouteState> {
	try {
		const raw = await fs.readFile(buildStateFilePath(repoRoot, sessionId), "utf8");
		return JSON.parse(raw) as ArchitectRouteState;
	} catch {
		return { injected: [] };
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
 * Persists the per-session injection-tracking state atomically — a tmp file
 * in the same directory followed by `rename`, so a hook process killed
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
 * Resolves the architect-doc body (or bodies) to inject for a file read, or
 * `null` when there is nothing left to inject — either no manifest route
 * matches the path, or every matching doc was already injected this session.
 *
 * Reads the doc from disk at call time (not from any cache), so an edited
 * doc injects its current content. When a path routes to more than one doc
 * (a manifest entry can name an array), every not-yet-injected doc is
 * concatenated into a single payload and all are marked injected together —
 * the ceiling is one injection per architect doc per session, not per call.
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

	const manifest = await loadManifest(repoRoot);
	const matchedDocs = matchDocsForPath(manifest, relativePath);
	if (matchedDocs.length === 0) {
		return null;
	}

	// Two `Read` calls in the same tool-call batch spawn concurrent hook
	// processes with no lock between this read and the `saveRouteState` below —
	// if both read state before either writes, the later write can drop the
	// earlier one's addition and the same doc re-injects later in the session.
	// The failure mode is a harmless duplicate injection, not data loss or a
	// crash, so this is accepted as a known best-effort ceiling rather than
	// serialized.
	const state = await loadRouteState(repoRoot, sessionId);
	const injectedSet = new Set(state.injected);
	const pendingDocs = matchedDocs.filter((doc) => !injectedSet.has(doc));
	if (pendingDocs.length === 0) {
		return null;
	}

	const bodies: string[] = [];
	for (const doc of pendingDocs) {
		const docPath = path.join(repoRoot, ".prism", "architect", doc);
		const body = await fs.readFile(docPath, "utf8");
		bodies.push(formatInjectionSection(doc, body));
	}

	await saveRouteState(repoRoot, sessionId, {
		injected: [...state.injected, ...pendingDocs],
	});

	return bodies.join("\n\n---\n\n");
}
