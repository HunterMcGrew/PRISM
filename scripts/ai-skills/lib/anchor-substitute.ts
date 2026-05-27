/**
 * Atlas's stub-anchor substitution (PR-2.4, plan task 1-4).
 *
 * Canonical persona sources (`.ai-skills/skills/<id>/shared.md` and platform
 * variants) carry HTML-comment anchor pairs the editorial cleanup leaves in
 * place so per-team content can land without contaminating canonical prose
 * (ADR-0032). An anchor pair takes the form:
 *
 *     <!-- atlas:<name> -->
 *     ...optional default content the canonical source ships with...
 *     <!-- atlas:end -->
 *
 * `<name>` matches `/^[a-z0-9-]+$/`. The opening marker names the anchor; the
 * closing marker is the un-named `atlas:end` sentinel. The pair is invisible
 * in rendered markdown — the comments don't render — so the canonical sources
 * stay readable when an author opens them.
 *
 * The module exposes three layers:
 *
 * - `findAnchors` is pure — it walks `content` and returns one descriptor per
 *   pair. Throws on three structural errors: an open marker with no matching
 *   close, an open marker that appears before the prior anchor closed, or two
 *   open markers sharing the same name in one file. The errors are wrapped in
 *   `AnchorParseError` so callers can distinguish parse failures from
 *   filesystem failures.
 * - `substituteAnchors` reads the file, runs `findAnchors`, applies the
 *   replacement map, and writes the new content atomically. Idempotent —
 *   running twice with the same input produces byte-identical output.
 *   Unknown replacement keys warn but don't throw. Orphan anchors (no
 *   matching replacement key) preserve their existing default content.
 * - `substituteAnchorsAcrossSkills` globs the canonical-source surface
 *   (`shared.md`, `claude.md`, `codex.md`, `cursor.md` under
 *   `.ai-skills/skills/*`) and runs `substituteAnchors` per file. Returns a
 *   map keyed by absolute file path so the caller can audit which files were
 *   touched.
 *
 * The atomic-write seam mirrors `writeOnboardingConfig`: tmp file in the same
 * directory followed by a rename. A process interrupted mid-write leaves
 * either the prior file or the new one — never a half-written file.
 */
import fs from "node:fs/promises";
import path from "node:path";

const ANCHOR_NAME_PATTERN = /^[a-z0-9-]+$/;
/**
 * Markers must be on their own line — line-start (optionally indented) and
 * line-end. This excludes inline prose references like `<!-- atlas:<name> -->`
 * inside backticks, which would otherwise false-positive when persona sources
 * discuss the convention (`prism-onboarding/shared.md` does exactly that).
 */
const OPEN_MARKER_PATTERN = /(?:^|\n)[ \t]*<!--\s*atlas:([a-z0-9-]+)\s*-->[ \t]*(?=\r?\n|$)/g;
const CLOSE_MARKER_PATTERN = /(?:^|\n)[ \t]*<!--\s*atlas:end\s*-->[ \t]*(?=\r?\n|$)/g;
const CLOSE_MARKER_TEXT = "<!-- atlas:end -->";

/**
 * Thrown by `findAnchors` when the content violates the anchor schema. The
 * `code` field discriminates which violation fired — tests assert on it.
 */
export class AnchorParseError extends Error {
	constructor(
		public readonly code:
			| "invalid-name"
			| "nested-open"
			| "missing-close"
			| "duplicate-name",
		message: string
	) {
		super(message);
		this.name = "AnchorParseError";
	}
}

/**
 * One anchor pair within `content`. `start` and `end` are byte offsets of
 * the open and close markers (inclusive of the marker text). `range` covers
 * the inner span — the bytes between the markers, which is what
 * substitution replaces.
 */
export interface Anchor {
	name: string;
	start: number;
	end: number;
	range: { start: number; end: number };
}

export interface AnchorResult {
	path: string;
	written: boolean;
	anchorsReplaced: string[];
}

/**
 * Pure scanner. Returns one descriptor per anchor pair, in document order.
 * Throws `AnchorParseError` on schema violations (invalid name, nested
 * open marker, missing close marker, duplicate name within the file).
 */
export function findAnchors(content: string): Anchor[] {
	const anchors: Anchor[] = [];
	const seenNames = new Set<string>();

	OPEN_MARKER_PATTERN.lastIndex = 0;
	let cursor = 0;

	while (true) {
		OPEN_MARKER_PATTERN.lastIndex = cursor;
		const openMatch = OPEN_MARKER_PATTERN.exec(content);
		if (openMatch === null) {
			break;
		}

		const name = openMatch[1];

		// `end` is the reserved close-marker keyword — finding it via the
		// open-marker pattern is structurally invalid (close before open).
		if (name === "end") {
			throw new AnchorParseError(
				"missing-close",
				`encountered ${CLOSE_MARKER_TEXT} with no matching open marker before it`
			);
		}

		if (!ANCHOR_NAME_PATTERN.test(name)) {
			throw new AnchorParseError(
				"invalid-name",
				`anchor name ${JSON.stringify(name)} does not match /^[a-z0-9-]+$/`
			);
		}

		if (seenNames.has(name)) {
			throw new AnchorParseError(
				"duplicate-name",
				`anchor name ${JSON.stringify(name)} appears more than once in the same file`
			);
		}

		// Pattern includes a leading `\n` when matched mid-document; the
		// marker text itself starts at the first non-whitespace position
		// inside the match.
		const matchText = openMatch[0];
		const matchStart = openMatch.index;
		const leadingOffset = matchText.indexOf("<!--");
		const openStart = matchStart + leadingOffset;
		const openEnd = matchStart + matchText.length;

		const closeRange = findCloseMarker(content, openEnd);
		if (closeRange === null) {
			throw new AnchorParseError(
				"missing-close",
				`anchor ${JSON.stringify(name)} has no matching ${CLOSE_MARKER_TEXT}`
			);
		}

		const nextOpenMatch = findNextOpenMarker(content, openEnd, closeRange.markerStart);
		if (nextOpenMatch !== null) {
			throw new AnchorParseError(
				"nested-open",
				`anchor ${JSON.stringify(name)} contains a nested open marker ${JSON.stringify(nextOpenMatch.name)} before its close`
			);
		}

		anchors.push({
			name,
			start: openStart,
			end: closeRange.markerEnd,
			range: { start: openEnd, end: closeRange.markerStart },
		});
		seenNames.add(name);

		cursor = closeRange.markerEnd;
	}

	return anchors;
}

/**
 * Finds the next own-line close marker after `from`. Returns null when none
 * exists. `markerStart` is the offset of the leading `<` of the marker text;
 * `markerEnd` is the offset just after the closing `>`.
 */
function findCloseMarker(
	content: string,
	from: number
): { markerStart: number; markerEnd: number } | null {
	CLOSE_MARKER_PATTERN.lastIndex = from;
	const match = CLOSE_MARKER_PATTERN.exec(content);
	if (match === null) {
		return null;
	}
	const matchText = match[0];
	const leadingOffset = matchText.indexOf("<!--");
	return {
		markerStart: match.index + leadingOffset,
		markerEnd: match.index + matchText.length,
	};
}

export interface SubstituteAnchorsOptions {
	/**
	 * Suppresses the per-file "unknown replacement key" warning. The cross-
	 * skills caller (`substituteAnchorsAcrossSkills`) sets this because in
	 * cross-skills mode the same replacement map is fanned out to every
	 * canonical source — a key that's absent from one file but present in
	 * another is normal, not a misconfiguration. The aggregate caller emits
	 * a single warning per key that ended up unused across every file.
	 */
	suppressUnknownKeyWarning?: boolean;
}

/**
 * Reads `filePath`, applies `replacements` to each known anchor, and writes
 * the result atomically. Returns whether bytes changed and which anchor
 * names were replaced.
 *
 * Behavior:
 * - Idempotent — when the post-substitution bytes equal the on-disk bytes,
 *   no write occurs and `written` is false.
 * - Atomic — tmp file in the same directory, rename over the target. A
 *   failed rename leaves the original file intact.
 * - Unknown replacement keys (in `replacements` but not in the file) emit a
 *   `console.warn` and don't throw. Suppress with
 *   `suppressUnknownKeyWarning: true` when the caller aggregates the check
 *   across many files (`substituteAnchorsAcrossSkills`).
 * - Orphan anchors (in the file but not in `replacements`) preserve their
 *   existing default content untouched.
 */
export async function substituteAnchors(
	filePath: string,
	content: string,
	replacements: Record<string, string>,
	options: SubstituteAnchorsOptions = {}
): Promise<{ written: boolean; anchorsReplaced: string[] }> {
	const anchors = findAnchors(content);
	const anchorNames = new Set(anchors.map((a) => a.name));

	if (!options.suppressUnknownKeyWarning) {
		for (const key of Object.keys(replacements)) {
			if (!anchorNames.has(key)) {
				console.warn(
					`anchor-substitute: unknown replacement key ${JSON.stringify(key)} (not present in ${filePath})`
				);
			}
		}
	}

	const anchorsReplaced: string[] = [];
	let nextContent = "";
	let cursor = 0;

	for (const anchor of anchors) {
		if (!Object.prototype.hasOwnProperty.call(replacements, anchor.name)) {
			continue;
		}

		const replacement = replacements[anchor.name];
		const newInner = renderInner(replacement);

		nextContent += content.slice(cursor, anchor.range.start);
		nextContent += newInner;
		cursor = anchor.range.end;
		anchorsReplaced.push(anchor.name);
	}

	nextContent += content.slice(cursor);

	if (nextContent === content) {
		return { written: false, anchorsReplaced };
	}

	const targetDir = path.dirname(filePath);
	const tmpPath = path.join(targetDir, `${path.basename(filePath)}.tmp`);

	await fs.writeFile(tmpPath, nextContent, "utf8");

	try {
		await fs.rename(tmpPath, filePath);
	} catch (error) {
		await fs.rm(tmpPath, { force: true });
		throw error;
	}

	return { written: true, anchorsReplaced };
}

/**
 * Globs the canonical-source surface and runs `substituteAnchors` per file.
 * Returns one `AnchorResult` per file (whether it was written or not), keyed
 * by absolute file path. Skips files with no anchors silently — the caller
 * does not need to know about unaffected files.
 *
 * Unknown-key warnings are aggregated across all files: a replacement key
 * that's absent from one file but present in another is normal in cross-
 * skills mode, so per-file warnings would be misleading. Only keys absent
 * from every canonical source emit a single warning at the end.
 */
export async function substituteAnchorsAcrossSkills(
	repoRoot: string,
	contentByAnchor: Record<string, string>
): Promise<Map<string, AnchorResult>> {
	const skillsRoot = path.join(repoRoot, ".ai-skills", "skills");

	let skillDirs: string[];
	try {
		const entries = await fs.readdir(skillsRoot, { withFileTypes: true });
		skillDirs = entries
			.filter((entry) => entry.isDirectory())
			.map((entry) => path.join(skillsRoot, entry.name));
	} catch (error) {
		const code = (error as NodeJS.ErrnoException).code;
		if (code === "ENOENT") {
			return new Map();
		}
		throw error;
	}

	const platformFiles = ["shared.md", "claude.md", "codex.md", "cursor.md"];
	const results = new Map<string, AnchorResult>();
	const usedKeys = new Set<string>();

	for (const dir of skillDirs) {
		for (const filename of platformFiles) {
			const filePath = path.join(dir, filename);

			let content: string;
			try {
				content = await fs.readFile(filePath, "utf8");
			} catch (error) {
				const code = (error as NodeJS.ErrnoException).code;
				if (code === "ENOENT") {
					continue;
				}
				throw error;
			}

			if (!content.includes("<!-- atlas:")) {
				continue;
			}

			const result = await substituteAnchors(
				filePath,
				content,
				contentByAnchor,
				{ suppressUnknownKeyWarning: true }
			);
			for (const name of result.anchorsReplaced) {
				usedKeys.add(name);
			}
			results.set(filePath, {
				path: filePath,
				written: result.written,
				anchorsReplaced: result.anchorsReplaced,
			});
		}
	}

	for (const key of Object.keys(contentByAnchor)) {
		if (!usedKeys.has(key)) {
			console.warn(
				`anchor-substitute: replacement key ${JSON.stringify(key)} was not found in any canonical source under ${skillsRoot}`
			);
		}
	}

	return results;
}

/**
 * Renders the inner span for an anchor. Replacement is the verbatim text
 * the caller supplies, wrapped in newlines so the rendered markdown remains
 * well-formed regardless of how the canonical source spaced the markers.
 * Empty replacements collapse to a single newline pair so an empty stub
 * stays an empty stub (no stray blank paragraph).
 */
function renderInner(replacement: string): string {
	if (replacement.length === 0) {
		return "\n";
	}

	const trimmed = replacement.replace(/^\n+/, "").replace(/\n+$/, "");
	return `\n${trimmed}\n`;
}

/**
 * Helper for `findAnchors`. Scans for the next own-line open marker between
 * `start` (exclusive) and `limit` (exclusive). Returns null when none is
 * found. Used to detect nested-open violations within an unterminated
 * anchor.
 */
function findNextOpenMarker(
	content: string,
	start: number,
	limit: number
): { name: string; index: number } | null {
	const localPattern = new RegExp(OPEN_MARKER_PATTERN.source, "g");
	localPattern.lastIndex = start;
	const match = localPattern.exec(content);
	if (match === null || match.index >= limit) {
		return null;
	}
	if (match[1] === "end") {
		return null;
	}
	return { name: match[1], index: match.index };
}
