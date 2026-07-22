/**
 * Extracts the lines between a top-level `## heading` and the next top-level
 * `## ` heading (or end of file). Shared by the parity/coverage test suites,
 * whose source docs all nest headings one level deep past `## `, so the
 * boundary is unambiguous.
 */
export function extractSection(markdown: string, heading: string): string {
	const lines = markdown.split("\n");
	const startIndex = lines.findIndex((line) => line.trim() === heading);
	if (startIndex === -1) {
		throw new Error(`Section '${heading}' not found`);
	}
	const rest = lines.slice(startIndex + 1);
	const endOffset = rest.findIndex((line) => line.startsWith("## "));
	const sectionLines = endOffset === -1 ? rest : rest.slice(0, endOffset);
	return sectionLines.join("\n");
}
