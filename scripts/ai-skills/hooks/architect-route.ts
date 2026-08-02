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

function stateFilePath(repoRoot: string, sessionId: string): string {
	const safeSessionId = sessionId.replace(/[^a-zA-Z0-9._-]/g, "_");
	return path.join(repoRoot, ".prism", `architect-route-state.${safeSessionId}.json`);
}

/**
 * Loads the per-session injection-tracking state. Returns `{ injected: [] }`
 * when no state file exists yet — per `lazy-artifacts.md`, this file is
 * created on first injection, never seeded.
 */
export async function loadRouteState(
	repoRoot: string,
	sessionId: string
): Promise<ArchitectRouteState> {
	try {
		const raw = await fs.readFile(stateFilePath(repoRoot, sessionId), "utf8");
		return JSON.parse(raw) as ArchitectRouteState;
	} catch (error) {
		if (isNodeError(error) && error.code === "ENOENT") {
			return { injected: [] };
		}
		throw error;
	}
}

/**
 * Persists the per-session injection-tracking state atomically — a tmp file
 * in the same directory followed by `rename`, so a hook process killed
 * mid-write leaves either the prior state or the new one, never a
 * half-written file the next `Read` would choke on.
 */
export async function saveRouteState(
	repoRoot: string,
	sessionId: string,
	state: ArchitectRouteState
): Promise<void> {
	const targetPath = stateFilePath(repoRoot, sessionId);
	await fs.mkdir(path.dirname(targetPath), { recursive: true });

	const tmpPath = `${targetPath}.tmp`;
	await fs.writeFile(tmpPath, `${JSON.stringify(state, null, "\t")}\n`, "utf8");

	try {
		await fs.rename(tmpPath, targetPath);
	} catch (error) {
		await fs.rm(tmpPath, { force: true });
		throw error;
	}
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
		bodies.push(`### Architect context: ${doc}\n\n${body.trim()}`);
	}

	await saveRouteState(repoRoot, sessionId, {
		injected: [...state.injected, ...pendingDocs],
	});

	return bodies.join("\n\n---\n\n");
}

interface NodeError extends Error {
	code?: string;
}

function isNodeError(value: unknown): value is NodeError {
	return value instanceof Error && typeof (value as NodeError).code === "string";
}
