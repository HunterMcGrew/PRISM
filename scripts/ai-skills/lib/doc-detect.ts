/**
 * Established-repo doc-layout detector for Atlas's documentation question set.
 *
 * For repos that already have docs, Atlas should propose the existing layout
 * as the default answer rather than asking cold. This module walks the repo
 * root looking for doc-tool config files and a `docs/` directory, then
 * returns a `DetectedDocLayout` Atlas can surface as a pre-filled suggestion.
 *
 * Detection is best-effort. When nothing is found (`evidence` is empty),
 * Atlas asks the question without a pre-filled default. The detector never
 * throws — any probe failure collapses to an absent result.
 */
import fs from "node:fs/promises";
import path from "node:path";

import type { DetectedDocLayout } from "./onboarding-types";

/**
 * Config-file fingerprints keyed by the doc tool they identify. The detector
 * probes each entry sequentially in declaration order, returning on the first
 * hit — so declaration order is the precedence order. Multiple hits are
 * possible (e.g. a Nextra project with a `docs/` directory) but only one
 * `tool` label is returned. Do not parallelize the probe loop: parallel
 * execution removes the first-match precedence guarantee.
 */
const DOC_TOOL_FINGERPRINTS: ReadonlyArray<{
	files: string[];
	tool: NonNullable<DetectedDocLayout["tool"]>;
}> = [
	{
		files: ["nextra.config.js", "nextra.config.ts", "nextra.config.mjs"],
		tool: "nextra",
	},
	{
		files: ["docusaurus.config.js", "docusaurus.config.ts", "docusaurus.config.mjs"],
		tool: "docusaurus",
	},
	{
		files: ["mkdocs.yml", "mkdocs.yaml"],
		tool: "mkdocs",
	},
	{
		files: ["vitepress.config.js", "vitepress.config.ts", ".vitepress/config.js", ".vitepress/config.ts"],
		tool: "vitepress",
	},
];

/**
 * Candidate doc-directory names to check for when no tool config is found.
 * Plain-markdown projects often live here without a site-generator config.
 */
const DOC_DIR_CANDIDATES = ["docs", "documentation", "doc", "site/content"];

/**
 * Detects the existing documentation layout in the repo. Runs the two
 * sub-detectors — tool detection and location detection — concurrently via
 * `Promise.all`. Tool detection itself probes fingerprints sequentially in
 * declaration order (see `DOC_TOOL_FINGERPRINTS`). Returns an empty-evidence
 * result when the repo has no recognizable doc layout — Atlas treats that as
 * "ask cold."
 */
export async function detectDocLayout(repoRoot: string): Promise<DetectedDocLayout> {
	const [toolResult, locationResult] = await Promise.all([
		detectDocTool(repoRoot),
		detectDocLocation(repoRoot),
	]);

	const evidence: string[] = [
		...toolResult.evidence,
		...locationResult.evidence,
	];

	return {
		tool: toolResult.tool,
		location: locationResult.location,
		evidence,
	};
}

interface ToolProbeResult {
	tool?: DetectedDocLayout["tool"];
	evidence: string[];
}

async function detectDocTool(repoRoot: string): Promise<ToolProbeResult> {
	for (const { files, tool } of DOC_TOOL_FINGERPRINTS) {
		for (const relPath of files) {
			const abs = path.join(repoRoot, relPath);
			const exists = await fileExists(abs);

			if (exists) {
				return { tool, evidence: [abs] };
			}
		}
	}

	return { evidence: [] };
}

interface LocationProbeResult {
	location?: string;
	evidence: string[];
}

async function detectDocLocation(repoRoot: string): Promise<LocationProbeResult> {
	for (const candidate of DOC_DIR_CANDIDATES) {
		const abs = path.join(repoRoot, candidate);
		const stat = await fs.stat(abs).catch(() => null);

		if (stat?.isDirectory()) {
			return {
				location: `${candidate}/`,
				evidence: [abs],
			};
		}
	}

	return { evidence: [] };
}

async function fileExists(abs: string): Promise<boolean> {
	try {
		await fs.access(abs);

		return true;
	} catch {
		return false;
	}
}

/**
 * Derives an initial `format` suggestion from the detected doc tool. The
 * format value is an open string — this is a hint Atlas surfaces to the user,
 * not a hard-coded enum. The user can correct or replace it.
 */
export function inferDocFormat(tool: DetectedDocLayout["tool"] | undefined): string | undefined {
	switch (tool) {
		case "nextra":
			return "nextra-blocks";
		case "docusaurus":
			return "docusaurus-mdx";
		case "mkdocs":
			return "mkdocs-markdown";
		case "vitepress":
			return "vitepress-markdown";
		case "plain-markdown":
			return "flat-markdown-guides";
		default:
			return undefined;
	}
}
