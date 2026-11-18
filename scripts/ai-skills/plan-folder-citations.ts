import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isDirectCliEntry } from "./lib/cli-entry";

/**
 * Fails any section-sign citation or `see Decision:` citation inside a plan folder.
 *
 * Plans are never deleted, but the files in a plan folder move and get
 * renamed as the plan moves through its chain, so a plan names files by path
 * and other plans by ticket ID, and nothing points into a heading that may
 * vanish. Only plan folders are read: legacy flat plans predate the rule and
 * are never migrated. A folder counts as a plan folder when it holds a chain
 * file, which keeps `audits/`, `qa/`, and `retros/` out.
 *
 * Inline code spans are removed before matching, so prose that names a marker
 * as a token stays legal. A backtick lookbehind would not do: it misreads a
 * marker in the middle of a code span as a use.
 *
 * A file named in `PLAN_CITATION_ALLOWLIST` may keep its citations, and the
 * check reports an entry as stale once its file is clean or gone, so the
 * allowlist can only shrink.
 */

export type PlanFolderViolationKind = "section-citation" | "decision-citation";

export interface PlanFolderViolation {
	file: string;
	line: number;
	kind: PlanFolderViolationKind;
}

export interface PlanFolderCheckResult {
	violations: PlanFolderViolation[];
	staleAllowlist: string[];
}

const PLAN_ROOTS = [".prism/plans", ".prism/archived/plans"];

const CHAIN_FILES = ["intent.md", "design.md", "spec.md", "plan.md"];

/**
 * Files that predate the rule and still carry citations, as
 * `<plan folder>/<path inside the folder>`. The entry holds whether the folder
 * sits under the live plans root or the archived one.
 */
export const PLAN_CITATION_ALLOWLIST = ["prism-499/plan.md"];

const FENCE_REGEX = /^\s*```/;

const DOUBLE_BACKTICK_SPAN_REGEX = /``.*?``/g;

const SINGLE_BACKTICK_SPAN_REGEX = /`[^`]*`/g;

const DECISION_MARKER_REGEX = /see Decision:/i;

export async function runPlanFolderCheck(
	repoRoot: string,
	allowlist: readonly string[] = PLAN_CITATION_ALLOWLIST
): Promise<PlanFolderCheckResult> {
	const found: { allowlistKey: string; violation: PlanFolderViolation }[] = [];

	for (const folder of await findPlanFolders(repoRoot)) {
		const folderName = path.posix.basename(folder);

		for (const inner of await listMarkdownFiles(path.join(repoRoot, folder))) {
			const content = await fs.readFile(path.join(repoRoot, folder, inner), "utf8");

			for (const violation of collectPlanFolderViolations(
				content,
				`${folder}/${inner}`
			)) {
				found.push({ allowlistKey: `${folderName}/${inner}`, violation });
			}
		}
	}

	return {
		violations: found
			.filter((entry) => !allowlist.includes(entry.allowlistKey))
			.map((entry) => entry.violation),
		staleAllowlist: allowlist.filter(
			(entry) => !found.some((candidate) => candidate.allowlistKey === entry)
		),
	};
}

/**
 * Lists plan folders as repo-relative POSIX paths, sorted.
 */
export async function findPlanFolders(repoRoot: string): Promise<string[]> {
	const folders: string[] = [];

	for (const root of PLAN_ROOTS) {
		let entries;

		try {
			entries = await fs.readdir(path.join(repoRoot, root), {
				withFileTypes: true,
			});
		} catch {
			continue;
		}

		for (const entry of entries) {
			if (!entry.isDirectory()) {
				continue;
			}

			const folder = `${root}/${entry.name}`;

			if (await holdsChainFile(path.join(repoRoot, folder))) {
				folders.push(folder);
			}
		}
	}

	return folders.sort();
}

/**
 * Exported for unit testing.
 */
export function collectPlanFolderViolations(
	content: string,
	file: string
): PlanFolderViolation[] {
	const violations: PlanFolderViolation[] = [];
	const lines = content.split(/\r?\n/);
	let inFence = false;

	for (const [index, line] of lines.entries()) {
		if (FENCE_REGEX.test(line)) {
			inFence = !inFence;
			continue;
		}

		if (inFence) {
			continue;
		}

		const prose = line
			.replace(DOUBLE_BACKTICK_SPAN_REGEX, "")
			.replace(SINGLE_BACKTICK_SPAN_REGEX, "");

		if (prose.includes("§")) {
			violations.push({ file, line: index + 1, kind: "section-citation" });
		}

		if (DECISION_MARKER_REGEX.test(prose)) {
			violations.push({ file, line: index + 1, kind: "decision-citation" });
		}
	}

	return violations;
}

async function holdsChainFile(folder: string): Promise<boolean> {
	for (const name of CHAIN_FILES) {
		try {
			if ((await fs.stat(path.join(folder, name))).isFile()) {
				return true;
			}
		} catch {
			continue;
		}
	}

	return false;
}

/**
 * Lists the folder's markdown files as sorted POSIX paths inside it. Uses the
 * string form of `readdir`, because `Dirent.parentPath` needs a newer Node
 * than this package's engines floor. That form cannot tell a file from a
 * directory, so each match is statted: a directory named `*.md` would make
 * the later `readFile` fail with EISDIR.
 */
async function listMarkdownFiles(folder: string): Promise<string[]> {
	const entries = await fs.readdir(folder, { recursive: true });
	const files: string[] = [];

	for (const entry of entries) {
		if (
			path.extname(entry) === ".md" &&
			(await fs.stat(path.join(folder, entry))).isFile()
		) {
			files.push(entry.split(path.sep).join("/"));
		}
	}

	return files.sort();
}

async function main(): Promise<void> {
	const repoRoot = path.resolve(
		path.dirname(fileURLToPath(import.meta.url)),
		"../.."
	);
	const { violations, staleAllowlist } = await runPlanFolderCheck(repoRoot);

	for (const violation of violations) {
		console.error(`${violation.file}:${violation.line} ${violation.kind}`);
	}

	for (const entry of staleAllowlist) {
		console.error(
			`plan-folder-citations: ${entry} is clean or gone; remove it from the allowlist`
		);
	}

	if (violations.length > 0 || staleAllowlist.length > 0) {
		process.exit(1);
	}
}

if (isDirectCliEntry("plan-folder-citations")) {
	main().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	});
}
