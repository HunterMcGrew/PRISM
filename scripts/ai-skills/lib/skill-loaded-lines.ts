/**
 * Measures how many lines a skill run reads: its body plus every file the
 * body tells it to read.
 *
 * The cap this feeds counts what a run loads, not what the body file holds.
 * A line moved from `shared.md` into a reference the body cites is still a
 * line the run reads, so measuring the body alone would let a skill pass by
 * relocating content instead of cutting it.
 *
 * Citation parsing is local rather than shared with `crossref-lint.ts`. That
 * linter resolves only repo-root-absolute references, while a skill body cites
 * by relative link, by link spelled for the generated platform tree, and by
 * bare step-file name, and each of those has to resolve here.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const BODY_FILES = ["shared.md", "claude.md"];

// A cited file in one of these areas is read by the run that cites it.
// Architect docs are left out because the manifest routes them by path
// whatever skill runs, and always-on rules load in every session.
const LOADED_AREAS = [".prism/references/", ".prism/skills/", ".prism/templates/"];

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
 * backticked path. A target resolves, in order:
 *
 * 1. a `.prism/`-prefixed path, from the repo root;
 * 2. a relative path, from the citing file;
 * 3. a relative path that resolves nowhere, under `.prism/` with its leading
 *    `../` segments dropped, because a skill source cites
 *    `../../references/x.md` as spelled for the generated `.claude/skills/<id>/`
 *    tree, where `references/` is a sibling;
 * 4. a bare name that resolves nowhere, under `stepDir`, because a skill body
 *    names its own step files (`step-01-init.md`) without their directory.
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
		...[...text.matchAll(/`([^`\s]+\.md)(?:[\s#][^`]*)?`/g)].map((match) => match[1]),
	];
	const cited = new Set<string>();

	for (const candidate of candidates) {
		const resolved = resolveCandidate(repoRoot, citingDir, candidate, stepDir);
		// A link's own text often repeats its target's bare name, which resolves
		// back to the citing file.
		if (resolved !== null && resolved !== citingFile) {
			cited.add(resolved);
		}
	}

	return [...cited];
}

/**
 * Measures one skill: its body, plus the transitive closure of the reference,
 * step, template, and `load: skill` rule files the body cites.
 *
 * The closure is followed rather than the body's direct citations alone,
 * because a skill that cites one step file which cites the next would
 * otherwise count only the first.
 */
export function measureSkillLoad(repoRoot: string, skillId: string): SkillLoad {
	const skillDir = `.ai-skills/skills/${skillId}`;
	const bodyFiles = BODY_FILES.map((file) => `${skillDir}/${file}`).filter((file) =>
		existsSync(path.join(repoRoot, file))
	);
	const bodyLines = bodyFiles.reduce((sum, file) => sum + countFileLines(repoRoot, file), 0);

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
	const citedLines = files.reduce((sum, file) => sum + countFileLines(repoRoot, file), 0);

	return { id: skillId, bodyLines, files, totalLines: bodyLines + citedLines };
}

/** Resolves one citation per `listCitedFiles`'s order, or `null` when nothing on disk matches. */
function resolveCandidate(
	repoRoot: string,
	citingDir: string,
	candidate: string,
	stepDir: string | undefined
): string | null {
	const attempts = [
		candidate.startsWith(".prism/")
			? path.join(repoRoot, candidate)
			: path.resolve(citingDir, candidate),
	];
	if (candidate.startsWith("../")) {
		attempts.push(path.join(repoRoot, ".prism", candidate.replace(/^(\.\.\/)+/, "")));
	}
	if (stepDir !== undefined && !candidate.includes("/")) {
		attempts.push(path.join(repoRoot, stepDir, candidate));
	}

	const found = attempts.find((attempt) => existsSync(attempt) && statSync(attempt).isFile());
	return found === undefined ? null : path.relative(repoRoot, found).split(path.sep).join("/");
}

function countFileLines(repoRoot: string, relativePath: string): number {
	return countLines(readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

/** True when a cited file counts toward the skill's load. */
function checkCountsTowardLoad(repoRoot: string, relativePath: string): boolean {
	if (LOADED_AREAS.some((area) => relativePath.startsWith(area))) {
		return true;
	}

	return relativePath.startsWith(RULES_AREA) && checkIsSkillLoadedRule(repoRoot, relativePath);
}

/** True for a rule whose frontmatter says it loads only when a skill cites it. */
function checkIsSkillLoadedRule(repoRoot: string, relativePath: string): boolean {
	const text = readFileSync(path.join(repoRoot, relativePath), "utf8");
	const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1] ?? "";
	return /^load:\s*skill\s*$/m.test(frontmatter);
}
