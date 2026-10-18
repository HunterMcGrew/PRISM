/**
 * Measures how many lines a skill run reads: its body plus every file the
 * body tells it to read.
 *
 * The cap this feeds counts what a run loads, not what the body file holds.
 * A line moved from `shared.md` into a reference the body cites is still a
 * line the run reads, so measuring the body alone would let a skill pass by
 * relocating content instead of cutting it.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/** The source files concatenated into a skill's Claude body. */
const BODY_FILES = ["shared.md", "claude.md"];

/** Where a cited file has to live to count as loaded by the skill. */
const LOADED_AREAS = [".prism/references/", ".prism/skills/"];

const RULES_AREA = ".prism/rules/";

/** One skill's measurement. `files` lists every counted file, repo-relative. */
export type SkillLoad = {
	id: string;
	bodyLines: number;
	files: string[];
	totalLines: number;
};

/** Counts newline-terminated lines, plus a final unterminated one. */
export function countLines(text: string): number {
	if (text.length === 0) {
		return 0;
	}

	const newlines = text.split("\n").length - 1;
	return text.endsWith("\n") ? newlines : newlines + 1;
}

/**
 * Returns the repo-relative `.md` paths a file cites by markdown link or by
 * backticked path. A relative link resolves from the citing file. A link that
 * climbs out to a platform copy (`../../../.prism/...` from a generated skill)
 * is re-anchored at the repo root, so source and generated spellings agree.
 * A bare name that resolves nowhere is tried under `stepDir`, because a skill
 * body names its own step files (`step-01-init.md`) without their directory.
 */
export function listCitedFiles(
	repoRoot: string,
	citingFile: string,
	stepDir?: string
): string[] {
	const text = readFileSync(path.join(repoRoot, citingFile), "utf8");
	const citingDir = path.dirname(path.join(repoRoot, citingFile));
	const candidates = [
		...[...text.matchAll(/\]\(([^)#\s]+\.md)/g)].map((match) => match[1]),
		...[...text.matchAll(/`([^`\s]+\.md)`/g)].map((match) => match[1]),
	];
	const cited = new Set<string>();

	for (const candidate of candidates) {
		let absolute = candidate.startsWith(".prism/")
			? path.join(repoRoot, candidate)
			: path.resolve(citingDir, candidate);
		const prismIndex = absolute.split(path.sep).join("/").indexOf("/.prism/");
		if (prismIndex >= 0) {
			absolute = path.join(repoRoot, absolute.split(path.sep).join("/").slice(prismIndex + 1));
		}

		if (!existsSync(absolute) && stepDir !== undefined && !candidate.includes("/")) {
			absolute = path.join(repoRoot, stepDir, candidate);
		}

		const relative = path.relative(repoRoot, absolute).split(path.sep).join("/");
		// A link's own text often repeats its target's bare name, which resolves
		// back to the citing file.
		if (relative !== citingFile && existsSync(absolute) && statSync(absolute).isFile()) {
			cited.add(relative);
		}
	}

	return [...cited];
}

/** True for a rule whose frontmatter says it loads only when a skill cites it. */
function checkIsSkillLoadedRule(repoRoot: string, relativePath: string): boolean {
	const text = readFileSync(path.join(repoRoot, relativePath), "utf8");
	const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1] ?? "";
	return /^load:\s*skill\s*$/m.test(frontmatter);
}

/** True when a cited file counts toward the skill's load. */
function checkCountsTowardLoad(repoRoot: string, relativePath: string): boolean {
	if (LOADED_AREAS.some((area) => relativePath.startsWith(area))) {
		return true;
	}

	return relativePath.startsWith(RULES_AREA) && checkIsSkillLoadedRule(repoRoot, relativePath);
}

/**
 * Measures one skill: its body, plus the transitive closure of the reference,
 * step, and `load: skill` rule files the body cites.
 *
 * The closure is followed rather than the body's direct citations alone,
 * because a skill that cites one step file which cites the next would
 * otherwise count only the first. Always-on and path-loaded rules are left
 * out: they load whatever skill runs, so they are measured once as always-on
 * content rather than charged to every skill.
 */
export function measureSkillLoad(repoRoot: string, skillId: string): SkillLoad {
	const skillDir = `.ai-skills/skills/${skillId}`;
	const bodyFiles = BODY_FILES.map((file) => `${skillDir}/${file}`).filter((file) =>
		existsSync(path.join(repoRoot, file))
	);
	const bodyLines = bodyFiles.reduce(
		(sum, file) => sum + countLines(readFileSync(path.join(repoRoot, file), "utf8")),
		0
	);

	const counted = new Set<string>();
	const queue = [...bodyFiles];
	while (queue.length > 0) {
		const next = queue.shift() as string;
		for (const cited of listCitedFiles(repoRoot, next, `.prism/skills/${skillId}`)) {
			if (!counted.has(cited) && checkCountsTowardLoad(repoRoot, cited)) {
				counted.add(cited);
				queue.push(cited);
			}
		}
	}

	const files = [...counted].sort();
	const citedLines = files.reduce(
		(sum, file) => sum + countLines(readFileSync(path.join(repoRoot, file), "utf8")),
		0
	);

	return { id: skillId, bodyLines, files, totalLines: bodyLines + citedLines };
}
