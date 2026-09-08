/**
 * Anchor substitution — populates per-team content into the generic stub
 * anchors canonical persona sources ship with.
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
 * The module exposes two layers:
 *
 * - `findAnchors` is pure — it walks `content` and returns one descriptor per
 *   pair. Throws on three structural errors: an open marker with no matching
 *   close, an open marker that appears before the prior anchor closed, or two
 *   open markers sharing the same name in one file. The errors are wrapped in
 *   `AnchorParseError` so callers can distinguish parse failures from
 *   filesystem failures.
 * - `substituteAnchorsInContent` is the pure in-memory substitution pass —
 *   `generatePlatformSkills` calls it once per rendered body, immediately
 *   before token substitution (ADR-0075). `substituteAnchors` wraps it with
 *   an atomic read/write seam for the rare caller that needs anchors
 *   substituted directly on disk.
 *
 * `substituteAnchors`'s atomic-write seam mirrors `writeOnboardingConfig`:
 * tmp file in the same directory followed by a rename. A process interrupted
 * mid-write leaves either the prior file or the new one — never a
 * half-written file.
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
	 * Suppresses the "unknown replacement key" warning. A replacement map
	 * fanned out across several canonical sources legitimately carries a key
	 * that's absent from this particular file but present in another — set
	 * this when the caller aggregates that check itself instead of relying
	 * on the per-file warning.
	 */
	suppressUnknownKeyWarning?: boolean;
}

export interface SubstituteAnchorsInContentOptions {
	/** See `SubstituteAnchorsOptions.suppressUnknownKeyWarning`. */
	suppressUnknownKeyWarning?: boolean;
	/** Label used in the unknown-key warning message — a file path when the caller has one, or omitted for an in-memory-only caller. */
	sourceLabel?: string;
}

/**
 * Pure in-memory half of anchor substitution: applies `replacements` to each
 * known anchor in `content` and returns the result. No filesystem access —
 * `substituteAnchors` wraps this with the read/atomic-write seam, and the
 * render pass (`generatePlatformSkills`) calls this directly since rendered
 * output isn't written back to the canonical source.
 */
export function substituteAnchorsInContent(
	content: string,
	replacements: Record<string, string>,
	options: SubstituteAnchorsInContentOptions = {}
): { content: string; anchorsReplaced: string[] } {
	const anchors = findAnchors(content);
	const anchorNames = new Set(anchors.map((a) => a.name));

	if (!options.suppressUnknownKeyWarning) {
		for (const key of Object.keys(replacements)) {
			if (!anchorNames.has(key)) {
				console.warn(
					`anchor-substitute: unknown replacement key ${JSON.stringify(key)}${
						options.sourceLabel ? ` (not present in ${options.sourceLabel})` : ""
					}`
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

	return { content: nextContent, anchorsReplaced };
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
 *   across many files itself.
 * - Orphan anchors (in the file but not in `replacements`) preserve their
 *   existing default content untouched.
 */
export async function substituteAnchors(
	filePath: string,
	content: string,
	replacements: Record<string, string>,
	options: SubstituteAnchorsOptions = {}
): Promise<{ written: boolean; anchorsReplaced: string[] }> {
	const { content: nextContent, anchorsReplaced } = substituteAnchorsInContent(
		content,
		replacements,
		{
			suppressUnknownKeyWarning: options.suppressUnknownKeyWarning,
			sourceLabel: filePath,
		}
	);

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
