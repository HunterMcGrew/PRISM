// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
/**
 * Groups a plan's unblocked tasks into parallel-safe bundles that share one
 * set of architect docs.
 *
 * Usage: bundles.mjs <plan.md> [--base <ref>] [--json]
 * Without `--base`, done tasks are read as `tasks.mjs` describes.
 *
 * Exits 1 when two open tasks claim one file and neither depends on the other,
 * or when the tasks' dependencies form a cycle, because either one makes a
 * parallel dispatch unsafe. A done task claims nothing, so a plan amended
 * after a build can add tasks that touch files earlier tasks already shipped.
 * Two open tasks may share a file when one waits on the other, directly or
 * through other open tasks, because they never run side by side. A chain that
 * passes through a done task doesn't count, since the done task no longer
 * holds the later one back. With `--base`, which only the build passes, it
 * also exits 1 when the plan's frontmatter carries a `status` other than
 * `approved`, so no wave after the first starts from an unapproved plan. The
 * plan and challenge stages run it on the draft without `--base`, and a flat
 * plan with no status line is unaffected. Import edges between existing files
 * are added as dependencies, so a task never runs beside the task that owns a
 * file it imports.
 *
 * Tasks group by the architect docs the manifest routes their files to. A
 * specifier is an import edge when it is relative, or when it starts with a
 * key of `importAliases` in `.ai-skills/config.json`; any other specifier is
 * a package and adds nothing.
 */
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { findRepoRoot, matchDocsForPath } from "../architect-route.mjs";
import { asRecord, readRepoConfig } from "../lib/command.mjs";
import { approvalLines } from "./frontmatter.mjs";
import { loadPlanState, parseCliArgs } from "./tasks.mjs";

/**
 * @typedef {import("./tasks.mjs").Task} Task
 * @typedef {Record<string, string | string[]>} Manifest
 * @typedef {{ file: string, ids: [string, string] }} Duplicate
 * @typedef {{ from: string, to: string, file: string, imports: string }} Edge
 * @typedef {{ docs: string[], tasks: string[] }} Group
 * @typedef {{
 *   duplicates: Duplicate[],
 *   edges: Edge[],
 *   notScanned: { file: string, id: string }[],
 *   cycle: string[] | null,
 *   groups: Group[],
 * }} BundleResult
 */

const RESOLVE_EXTENSIONS = [".ts", ".tsx", ".mjs", ".js"];
const MANIFEST_RELATIVE = ".prism/architect/manifest.json";

/**
 * Computes duplicate claims, added import edges, unscanned files, any cycle,
 * and the bundles of unblocked tasks.
 *
 * `cycle` and `duplicates` are reported rather than thrown, so the CLI can
 * name every problem it found. `groups` is empty whenever either is present,
 * because neither leaves a dependency graph worth bundling.
 *
 * @param {{
 *   tasks: Task[],
 *   done: Set<string>,
 *   repoRoot: string,
 *   manifest: Manifest,
 *   aliases?: Record<string, string>,
 * }} input
 * @returns {BundleResult}
 */
export function analyzeBundles({
	tasks,
	done,
	repoRoot,
	manifest,
	aliases = {},
}) {
	const openTasks = tasks.filter((task) => !done.has(task.id));
	/** @type {Map<string, string[]>} */
	const claimants = new Map();

	for (const task of openTasks) {
		for (const file of task.files) {
			let ids = claimants.get(file);

			if (!ids) {
				ids = [];
				claimants.set(file, ids);
			}

			if (!ids.includes(task.id)) ids.push(task.id);
		}
	}

	const reach = collectDependencyReach(tasks, done);
	/** @type {(from: string, to: string) => boolean} */
	const waitsOn = (from, to) => reach.get(from)?.has(to) ?? false;
	/** @type {Map<string, string>} */
	const owners = new Map();
	/** @type {Duplicate[]} */
	const duplicates = [];

	for (const [file, ids] of claimants) {
		owners.set(file, /** @type {string} */ (ids[0]));

		for (let i = 0; i < ids.length; i += 1) {
			for (let j = i + 1; j < ids.length; j += 1) {
				const first = /** @type {string} */ (ids[i]);
				const second = /** @type {string} */ (ids[j]);

				if (!waitsOn(first, second) && !waitsOn(second, first))
					duplicates.push({ file, ids: [first, second] });
			}
		}
	}

	if (duplicates.length > 0) {
		return { duplicates, edges: [], notScanned: [], cycle: null, groups: [] };
	}

	/** @type {Map<string, Set<string>>} */
	const dependencies = new Map(
		tasks.map((task) => [task.id, new Set(task.dependsOn)])
	);
	/** @type {Edge[]} */
	const edges = [];
	/** @type {{ file: string, id: string }[]} */
	const notScanned = [];

	for (const task of openTasks) {
		const taskDependencies = /** @type {Set<string>} */ (
			dependencies.get(task.id)
		);

		for (const file of task.files) {
			const absolute = path.join(repoRoot, file);

			if (!existsSync(absolute)) {
				notScanned.push({ file, id: task.id });
				continue;
			}

			const specifiers = extractImportSpecifiers(
				readFileSync(absolute, "utf8")
			);

			for (const specifier of specifiers) {
				const target = resolveSpecifier(
					specifier,
					file,
					repoRoot,
					owners,
					aliases
				);
				const owner = target && owners.get(target);

				if (!target || !owner || owner === task.id) continue;

				if (taskDependencies.has(owner)) continue;

				taskDependencies.add(owner);
				edges.push({ from: task.id, to: owner, file, imports: target });
			}
		}
	}

	const cycle = findCycle(dependencies);

	if (cycle) return { duplicates, edges, notScanned, cycle, groups: [] };

	return {
		duplicates,
		edges,
		notScanned,
		cycle,
		groups: groupUnblocked(tasks, done, dependencies, manifest),
	};
}

/**
 * Extracts module specifiers from file text, bounded to the four import
 * forms rather than a scan of the raw text: `import ... from "X"`,
 * `import "X"`, `require("X")`, and dynamic `import("X")`. A specifier inside
 * a comment can slip through, which adds a dependency edge at worst and never
 * drops a real one.
 *
 * Each `from` form gets its own bound, because the two wrap differently. A
 * single-line declaration is bounded by end-of-line; a wrapped one is bounded by
 * the closing brace of its binding list. A single pattern that crossed newlines
 * would be lazy, so an unterminated declaration would run on to a later
 * statement's `from` and carry `lastIndex` past the real import in between,
 * dropping its specifier. A brace-bounded pattern can't leave its own
 * declaration.
 *
 * The wrapped pattern admits an optional default binding before the brace, so
 * `import React, {\n...\n} from "react"` matches.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function extractImportSpecifiers(text) {
	if (typeof text !== "string" || !text) return [];

	/** @type {Set<string>} */
	const specifiers = new Set();
	const patterns = [
		/(?:import|export)\b[^;\n]*?\bfrom\s*["']([^"']+)["']/g,
		/(?:import|export)\s+(?:type\s+)?(?:[A-Za-z_$][\w$]*\s*,\s*)?\{[^{}]*\}\s*from\s*["']([^"']+)["']/g,
		/\bimport\s*["']([^"']+)["']/g,
		/\b(?:require|import)\s*\(\s*["']([^"']+)["']\s*\)/g,
	];

	for (const pattern of patterns) {
		let match;
		while ((match = pattern.exec(text)) !== null) {
			specifiers.add(/** @type {string} */ (match[1]));
		}
	}

	return [...specifiers];
}

/**
 * Maps each task ID to every open task it waits on, directly or through other
 * open tasks. A chain stops at a done task, as `groupUnblocked`'s check does.
 *
 * @param {Task[]} tasks
 * @param {Set<string>} done
 * @returns {Map<string, Set<string>>}
 */
function collectDependencyReach(tasks, done) {
	const direct = new Map(tasks.map((task) => [task.id, task.dependsOn]));
	/** @type {Map<string, Set<string>>} */
	const reach = new Map();

	for (const task of tasks) {
		/** @type {Set<string>} */
		const seen = new Set();
		const pending = [...task.dependsOn];

		while (pending.length > 0) {
			const id = /** @type {string} */ (pending.pop());

			if (seen.has(id) || done.has(id)) continue;

			seen.add(id);
			pending.push(...(direct.get(id) ?? []));
		}

		reach.set(task.id, seen);
	}

	return reach;
}

/**
 * Turns an import specifier into the repo-relative path it names, or null. A
 * relative specifier resolves from the importer, and an aliased one swaps its
 * longest matching `aliases` key for that key's value. A claimed candidate
 * counts as well as one on disk, because a claimed file may not be written yet.
 *
 * @param {string} specifier
 * @param {string} importer
 * @param {string} repoRoot
 * @param {Map<string, string>} owners
 * @param {Record<string, string>} aliases
 * @returns {string | null}
 */
function resolveSpecifier(specifier, importer, repoRoot, owners, aliases) {
	let base;

	if (specifier.startsWith(".")) {
		base = path.posix.join(path.posix.dirname(importer), specifier);
	} else {
		const prefix = Object.keys(aliases)
			.filter((key) => key !== "" && specifier.startsWith(key))
			.sort((a, b) => b.length - a.length)[0];

		if (prefix === undefined) return null;

		// join drops a leading ./ and supplies the slash a value without a trailing one lacks.
		base = path.posix.join(aliases[prefix], specifier.slice(prefix.length));
	}

	const candidates = [
		base,
		...RESOLVE_EXTENSIONS.map((extension) => `${base}${extension}`),
		...RESOLVE_EXTENSIONS.map((extension) => `${base}/index${extension}`),
	];

	return (
		candidates.find(
			(candidate) =>
				owners.has(candidate) ||
				statSync(path.join(repoRoot, candidate), {
					throwIfNoEntry: false,
				})?.isFile()
		) ?? null
	);
}

/**
 * @param {Map<string, Set<string>>} dependencies
 * @returns {string[] | null}
 */
function findCycle(dependencies) {
	/** @type {Map<string, "visiting" | "done">} */
	const state = new Map();
	/** @type {string[]} */
	const stack = [];

	/**
	 * @param {string} id
	 * @returns {string[] | null}
	 */
	const visit = (id) => {
		state.set(id, "visiting");
		stack.push(id);

		for (const next of dependencies.get(id) ?? []) {
			if (state.get(next) === "visiting") {
				return [...stack.slice(stack.indexOf(next)), next];
			}

			if (!state.has(next) && dependencies.has(next)) {
				const found = visit(next);

				if (found) return found;
			}
		}

		stack.pop();
		state.set(id, "done");

		return null;
	};

	for (const id of dependencies.keys()) {
		if (state.has(id)) continue;

		const found = visit(id);

		if (found) return found;
	}

	return null;
}

/**
 * @param {Task[]} tasks
 * @param {Set<string>} done
 * @param {Map<string, Set<string>>} dependencies
 * @param {Manifest} manifest
 * @returns {Group[]}
 */
function groupUnblocked(tasks, done, dependencies, manifest) {
	/** @type {Map<string, Group>} */
	const groups = new Map();

	for (const task of tasks) {
		if (done.has(task.id)) continue;

		const blocked = [...(dependencies.get(task.id) ?? [])].some(
			(id) => !done.has(id)
		);

		if (blocked) continue;

		/** @type {Set<string>} */
		const docs = new Set();

		for (const file of task.files) {
			for (const doc of matchDocsForPath(manifest, file)) docs.add(doc);
		}

		const sortedDocs = [...docs].sort();
		const key = sortedDocs.join("\n");
		let group = groups.get(key);

		if (!group) {
			group = { docs: sortedDocs, tasks: [] };
			groups.set(key, group);
		}

		group.tasks.push(task.id);
	}

	return [...groups.values()];
}

/**
 * @param {BundleResult} result
 * @returns {string}
 */
function formatReport(result) {
	const lines = ["Added edges:"];

	for (const edge of result.edges) {
		lines.push(
			`  ${edge.from} depends on ${edge.to} (${edge.file} imports ${edge.imports})`
		);
	}

	if (result.edges.length === 0) lines.push("  none");

	if (result.notScanned.length > 0) {
		lines.push("Not scanned (not on disk yet):");

		for (const entry of result.notScanned) {
			lines.push(`  ${entry.file} (${entry.id})`);
		}
	}

	lines.push("Groups:");

	result.groups.forEach((group, index) => {
		lines.push(`  ${index + 1}. ${group.tasks.join(", ")}`);
		lines.push(`     docs: ${group.docs.join(", ") || "none"}`);
	});

	if (result.groups.length === 0) lines.push("  none");

	return `${lines.join("\n")}\n`;
}

/**
 * The `importAliases` entries of the repo's config whose value is a string.
 *
 * @param {string} repoRoot
 * @returns {Record<string, string>}
 */
function readAliases(repoRoot) {
	const configured = asRecord(readRepoConfig(repoRoot)?.["importAliases"]);

	/** @type {Record<string, string>} */
	const aliases = {};

	for (const [prefix, target] of Object.entries(configured)) {
		if (typeof target === "string") aliases[prefix] = target;
	}

	return aliases;
}

/**
 * Reads the manifest that `findRepoRoot` located the repo root by, so it is
 * always on disk here.
 *
 * @param {string} repoRoot
 * @returns {Manifest}
 */
function readManifest(repoRoot) {
	return JSON.parse(
		readFileSync(path.join(repoRoot, MANIFEST_RELATIVE), "utf8")
	);
}

/** @param {string[]} argv */
async function runCli(argv) {
	const args = parseCliArgs(argv);

	if (!args) {
		process.stderr.write(
			"Usage: bundles.mjs <plan.md> [--base <ref>] [--json]\n"
		);
		process.exitCode = 2;
		return;
	}

	/** @type {BundleResult} */
	let result;

	try {
		const { status } = approvalLines(readFileSync(args.planPath, "utf8"));

		if (args.base !== null && status !== null && status !== "approved") {
			process.stderr.write(
				"bundles.mjs: plan.md is not approved — approve it before building\n"
			);
			process.exitCode = 1;
			return;
		}

		const repoRoot = await findRepoRoot(
			path.dirname(path.resolve(args.planPath))
		);

		if (!repoRoot) throw new Error(`no ${MANIFEST_RELATIVE} above the plan`);

		const { tasks, done } = loadPlanState(args.planPath, args.base);

		result = analyzeBundles({
			tasks,
			done,
			repoRoot,
			manifest: readManifest(repoRoot),
			aliases: readAliases(repoRoot),
		});
	} catch (error) {
		process.stderr.write(
			`bundles.mjs: ${(error instanceof Error ? error.message : String(error)).trim()}\n`
		);
		process.exitCode = 1;
		return;
	}

	for (const duplicate of result.duplicates) {
		process.stderr.write(
			`Duplicate claim: ${duplicate.file} is listed by ${duplicate.ids.join(" and ")}\n`
		);
	}

	if (result.cycle) {
		process.stderr.write(`Dependency cycle: ${result.cycle.join(" -> ")}\n`);
	}

	if (result.duplicates.length > 0 || result.cycle) {
		process.exitCode = 1;
		return;
	}

	process.stdout.write(
		args.json
			? `${JSON.stringify(
					{
						edges: result.edges,
						notScanned: result.notScanned,
						groups: result.groups,
					},
					null,
					2
				)}\n`
			: formatReport(result)
	);
}

const isEntryModule =
	process.argv[1] !== undefined &&
	realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntryModule) await runCli(process.argv.slice(2));
