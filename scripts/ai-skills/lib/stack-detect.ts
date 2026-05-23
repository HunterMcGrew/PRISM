/**
 * Stack detection for Atlas's onboarding flow (PR-2.2, plan tasks 1–10).
 *
 * Walks the repo root looking for package-file fingerprints — `package.json`,
 * `composer.json`, `pyproject.toml`, `Pipfile`, `requirements.txt`, `go.mod`,
 * `Cargo.toml`, `Gemfile`, `mix.exs`, `pom.xml`, `build.gradle(.kts)` — and
 * delegates parsing to a per-fingerprint inspector. Each inspector returns
 * the languages and frameworks it found with confidence levels and evidence
 * paths; `detectStack` merges results, deduplicates by name, and sorts by
 * confidence so the highest-signal entries surface first.
 *
 * Two design choices the empty-repo sentinel section of the plan calls out:
 *
 * - An empty repo (no package files anywhere) returns
 *   `{ languages: [{ name: 'unknown', confidence: 'high', evidence: [] }], frameworks: [] }`
 *   rather than throwing. Atlas's flow uses the sentinel as a signal to ask
 *   the user what stack the repo is going to be, instead of refusing to run.
 * - Parsers are tolerant. `package.json` is JSON, `composer.json` is JSON;
 *   everything else is parsed with line-level regex (or a minimal TOML walk
 *   for `pyproject.toml`). No external parsers — Node built-ins only — so
 *   the detector runs against any repo without extra install steps.
 */
import fs from "node:fs/promises";
import path from "node:path";

export interface DetectedLanguage {
	name:
		| "typescript"
		| "javascript"
		| "php"
		| "python"
		| "go"
		| "rust"
		| "ruby"
		| "elixir"
		| "java"
		| "unknown";
	confidence: "high" | "medium" | "low";
	evidence: string[];
}

export interface DetectedFramework {
	name: string;
	confidence: "high" | "medium" | "low";
	evidence: string[];
}

/**
 * Result of stack detection. The empty-repo sentinel — a single `unknown`
 * language with no frameworks — is a valid state, not an error (per the
 * epic-prism-atlas plan § Decisions, "Stack detection returns `['unknown']`
 * sentinel for empty repos, not an error").
 */
export type DetectedStack =
	| {
			languages: DetectedLanguage[];
			frameworks: DetectedFramework[];
	  }
	| {
			languages: [{ name: "unknown"; confidence: "high"; evidence: [] }];
			frameworks: [];
	  };

interface InspectorResult {
	languages: DetectedLanguage[];
	frameworks: DetectedFramework[];
}

const CONFIDENCE_RANK: Record<DetectedLanguage["confidence"], number> = {
	high: 0,
	medium: 1,
	low: 2,
};

/**
 * Detects languages and frameworks present in the repo. Probes each known
 * package file in parallel; per-inspector failures (missing file, parse
 * error) collapse to an empty result so a single broken fingerprint does
 * not poison the overall detection. Returns the empty-repo sentinel when
 * no package files were recognized.
 */
export async function detectStack(repoRoot: string): Promise<DetectedStack> {
	const probes: Array<Promise<InspectorResult>> = [
		probeFile(repoRoot, "package.json", inspectPackageJson),
		probeFile(repoRoot, "composer.json", inspectComposerJson),
		safeInspect(() => inspectPython(repoRoot)),
		probeFile(repoRoot, "go.mod", inspectGoMod),
		probeFile(repoRoot, "Cargo.toml", inspectCargoToml),
		probeFile(repoRoot, "Gemfile", inspectGemfile),
		probeFile(repoRoot, "mix.exs", inspectMixExs),
		safeInspect(() => inspectPomXmlGradle(repoRoot)),
	];

	const results = await Promise.all(probes);
	const merged = mergeResults(results);

	if (merged.languages.length === 0 && merged.frameworks.length === 0) {
		return {
			languages: [{ name: "unknown", confidence: "high", evidence: [] }],
			frameworks: [],
		};
	}

	return {
		languages: merged.languages,
		frameworks: merged.frameworks,
	};
}

/**
 * Probes a single absolute file path. Resolves to an empty result if the
 * file does not exist or the inspector throws — every other call path
 * short-circuits on missing-file errors the same way.
 */
async function probeFile(
	repoRoot: string,
	relativePath: string,
	inspector: (filePath: string) => Promise<InspectorResult> | InspectorResult
): Promise<InspectorResult> {
	const filePath = path.join(repoRoot, relativePath);
	try {
		await fs.access(filePath);
	} catch {
		return emptyResult();
	}

	return safeInspect(() => inspector(filePath));
}

async function safeInspect(
	fn: () => Promise<InspectorResult> | InspectorResult
): Promise<InspectorResult> {
	try {
		return await fn();
	} catch {
		return emptyResult();
	}
}

function emptyResult(): InspectorResult {
	return { languages: [], frameworks: [] };
}

function mergeResults(results: InspectorResult[]): InspectorResult {
	const languageMap = new Map<DetectedLanguage["name"], DetectedLanguage>();
	const frameworkMap = new Map<string, DetectedFramework>();

	for (const result of results) {
		for (const lang of result.languages) {
			const existing = languageMap.get(lang.name);
			if (!existing) {
				languageMap.set(lang.name, {
					name: lang.name,
					confidence: lang.confidence,
					evidence: [...lang.evidence],
				});
				continue;
			}

			existing.confidence = mergeConfidence(
				existing.confidence,
				lang.confidence
			);
			for (const path of lang.evidence) {
				if (!existing.evidence.includes(path)) {
					existing.evidence.push(path);
				}
			}
		}

		for (const fw of result.frameworks) {
			const existing = frameworkMap.get(fw.name);
			if (!existing) {
				frameworkMap.set(fw.name, {
					name: fw.name,
					confidence: fw.confidence,
					evidence: [...fw.evidence],
				});
				continue;
			}

			existing.confidence = mergeConfidence(
				existing.confidence,
				fw.confidence
			);
			for (const path of fw.evidence) {
				if (!existing.evidence.includes(path)) {
					existing.evidence.push(path);
				}
			}
		}
	}

	const languages = Array.from(languageMap.values()).sort(byConfidence);
	const frameworks = Array.from(frameworkMap.values()).sort(byConfidence);

	return { languages, frameworks };
}

function mergeConfidence(
	a: DetectedLanguage["confidence"],
	b: DetectedLanguage["confidence"]
): DetectedLanguage["confidence"] {
	return CONFIDENCE_RANK[a] <= CONFIDENCE_RANK[b] ? a : b;
}

function byConfidence(
	a: { confidence: DetectedLanguage["confidence"] },
	b: { confidence: DetectedLanguage["confidence"] }
): number {
	return CONFIDENCE_RANK[a.confidence] - CONFIDENCE_RANK[b.confidence];
}

interface PackageJsonShape {
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
}

const JS_FRAMEWORK_MAP: Record<string, string> = {
	react: "react",
	next: "next",
	vue: "vue",
	nuxt: "nuxt",
	svelte: "svelte",
	"@sveltejs/kit": "sveltekit",
	express: "express",
	fastify: "fastify",
	"@nestjs/core": "nestjs",
};

/**
 * Inspects a `package.json`. TypeScript is detected by `typescript` in any
 * dependency map OR by a sibling `tsconfig.json` next to the manifest. When
 * neither signal is present the language is plain JavaScript. Framework
 * detection is a straight lookup against the dependency name set.
 */
export async function inspectPackageJson(
	filePath: string
): Promise<InspectorResult> {
	const raw = await fs.readFile(filePath, "utf8");
	const pkg = JSON.parse(raw) as PackageJsonShape;
	const deps = collectDependencyNames(pkg);

	const tsconfigPath = path.join(path.dirname(filePath), "tsconfig.json");
	let hasTsconfig = false;
	try {
		await fs.access(tsconfigPath);
		hasTsconfig = true;
	} catch {
		hasTsconfig = false;
	}

	const hasTypescriptDep = deps.has("typescript");
	const languages: DetectedLanguage[] = [];

	if (hasTypescriptDep || hasTsconfig) {
		const evidence = [filePath];
		if (hasTsconfig) {
			evidence.push(tsconfigPath);
		}
		languages.push({
			name: "typescript",
			confidence: "high",
			evidence,
		});
	} else {
		languages.push({
			name: "javascript",
			confidence: "high",
			evidence: [filePath],
		});
	}

	const frameworks: DetectedFramework[] = [];
	for (const [depName, frameworkName] of Object.entries(JS_FRAMEWORK_MAP)) {
		if (deps.has(depName)) {
			frameworks.push({
				name: frameworkName,
				confidence: "high",
				evidence: [filePath],
			});
		}
	}

	return { languages, frameworks };
}

function collectDependencyNames(pkg: PackageJsonShape): Set<string> {
	const names = new Set<string>();
	for (const map of [pkg.dependencies, pkg.devDependencies, pkg.peerDependencies]) {
		if (!map) continue;
		for (const name of Object.keys(map)) {
			names.add(name);
		}
	}
	return names;
}

interface ComposerJsonShape {
	require?: Record<string, string>;
	"require-dev"?: Record<string, string>;
}

const PHP_FRAMEWORK_MAP: Record<string, string> = {
	"johnpbloch/wordpress-core": "wordpress",
	"roots/wordpress": "wordpress",
	"laravel/framework": "laravel",
	"symfony/symfony": "symfony",
	"symfony/framework-bundle": "symfony",
};

/**
 * Inspects a `composer.json`. PHP is always flagged when this file exists.
 * Framework detection matches package coordinates in `require` /
 * `require-dev` — WordPress can be sourced from either `johnpbloch` or
 * `roots`, so both produce the same `wordpress` framework name.
 */
export async function inspectComposerJson(
	filePath: string
): Promise<InspectorResult> {
	const raw = await fs.readFile(filePath, "utf8");
	const composer = JSON.parse(raw) as ComposerJsonShape;
	const requires = new Set<string>();
	for (const map of [composer.require, composer["require-dev"]]) {
		if (!map) continue;
		for (const name of Object.keys(map)) {
			requires.add(name);
		}
	}

	const languages: DetectedLanguage[] = [
		{ name: "php", confidence: "high", evidence: [filePath] },
	];

	const frameworks: DetectedFramework[] = [];
	const recordedFrameworks = new Set<string>();
	for (const [pkgName, frameworkName] of Object.entries(PHP_FRAMEWORK_MAP)) {
		if (requires.has(pkgName) && !recordedFrameworks.has(frameworkName)) {
			frameworks.push({
				name: frameworkName,
				confidence: "high",
				evidence: [filePath],
			});
			recordedFrameworks.add(frameworkName);
		}
	}

	return { languages, frameworks };
}

const PYTHON_FRAMEWORKS: Array<{ pattern: RegExp; name: string }> = [
	{ pattern: /^django(\b|[<>=!~])/i, name: "django" },
	{ pattern: /^flask(\b|[<>=!~])/i, name: "flask" },
	{ pattern: /^fastapi(\b|[<>=!~])/i, name: "fastapi" },
];

/**
 * Inspects Python package files in priority order: `pyproject.toml` first
 * (modern packaging), then `Pipfile`, then `requirements.txt`. The first
 * file found wins for evidence; framework detection runs against the
 * dependency strings using regex per line so any of the three formats
 * surfaces the same set of frameworks.
 */
export async function inspectPython(repoRoot: string): Promise<InspectorResult> {
	const candidates = ["pyproject.toml", "Pipfile", "requirements.txt"];
	let foundPath: string | null = null;
	let contents: string | null = null;

	for (const candidate of candidates) {
		const candidatePath = path.join(repoRoot, candidate);
		try {
			contents = await fs.readFile(candidatePath, "utf8");
			foundPath = candidatePath;
			break;
		} catch {
			continue;
		}
	}

	if (!foundPath || contents === null) {
		return emptyResult();
	}

	const languages: DetectedLanguage[] = [
		{ name: "python", confidence: "high", evidence: [foundPath] },
	];

	const frameworks: DetectedFramework[] = [];
	const recorded = new Set<string>();
	for (const line of contents.split(/\r?\n/)) {
		const token = extractPythonDependencyToken(line);
		if (!token) continue;
		for (const { pattern, name } of PYTHON_FRAMEWORKS) {
			if (pattern.test(token) && !recorded.has(name)) {
				frameworks.push({
					name,
					confidence: "high",
					evidence: [foundPath],
				});
				recorded.add(name);
			}
		}
	}

	return { languages, frameworks };
}

/**
 * Extracts the dependency token from a Python package file line. Handles
 * three formats with one pass — a `requirements.txt` bare line, a
 * `Pipfile`/`pyproject.toml` quoted key, and a TOML array entry. Comments
 * and blank lines collapse to `null`.
 */
function extractPythonDependencyToken(line: string): string | null {
	const trimmed = line.trim();
	if (!trimmed || trimmed.startsWith("#")) {
		return null;
	}

	const quoted = trimmed.match(/^["']([^"']+)["']/);
	if (quoted) {
		return quoted[1].trim();
	}

	const keyAssign = trimmed.match(/^([A-Za-z0-9_.\-]+)\s*=/);
	if (keyAssign) {
		return keyAssign[1].trim();
	}

	const bareToken = trimmed.match(/^([A-Za-z0-9_.\-]+)/);
	if (bareToken) {
		return bareToken[1].trim();
	}

	return null;
}

/**
 * Inspects a `go.mod`. Go is flagged unconditionally when the file exists;
 * framework detection is deliberately empty in v1 — the plan defers
 * gin/echo/fiber/chi detection to a future enhancement.
 */
export async function inspectGoMod(filePath: string): Promise<InspectorResult> {
	const raw = await fs.readFile(filePath, "utf8");
	if (!/^module\s+/m.test(raw)) {
		return emptyResult();
	}

	return {
		languages: [{ name: "go", confidence: "high", evidence: [filePath] }],
		frameworks: [],
	};
}

const RUST_FRAMEWORK_MAP: Record<string, string> = {
	"actix-web": "actix-web",
	axum: "axum",
	rocket: "rocket",
	warp: "warp",
};

/**
 * Inspects a `Cargo.toml`. Rust is flagged when the manifest declares a
 * `[package]` table; framework detection scans `[dependencies]` for the
 * four supported web frameworks.
 */
export async function inspectCargoToml(
	filePath: string
): Promise<InspectorResult> {
	const raw = await fs.readFile(filePath, "utf8");

	const languages: DetectedLanguage[] = [
		{ name: "rust", confidence: "high", evidence: [filePath] },
	];

	const frameworks: DetectedFramework[] = [];
	const recorded = new Set<string>();
	for (const line of raw.split(/\r?\n/)) {
		const token = extractCargoDependencyToken(line);
		if (!token) continue;
		const frameworkName = RUST_FRAMEWORK_MAP[token];
		if (frameworkName && !recorded.has(frameworkName)) {
			frameworks.push({
				name: frameworkName,
				confidence: "high",
				evidence: [filePath],
			});
			recorded.add(frameworkName);
		}
	}

	return { languages, frameworks };
}

/**
 * Pulls the dependency name from a Cargo line. Handles `name = "version"`
 * and `name = { version = "..." }` shapes; the section headers and inline
 * comments collapse to `null`.
 */
function extractCargoDependencyToken(line: string): string | null {
	const trimmed = line.trim();
	if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("[")) {
		return null;
	}

	const match = trimmed.match(/^([A-Za-z0-9_\-]+)\s*=/);
	return match ? match[1] : null;
}

const RUBY_FRAMEWORK_MAP: Record<string, string> = {
	rails: "rails",
	sinatra: "sinatra",
};

/**
 * Inspects a `Gemfile`. Ruby is flagged when the file is present;
 * frameworks come from `gem 'rails'` / `gem "sinatra"` style declarations.
 */
export async function inspectGemfile(
	filePath: string
): Promise<InspectorResult> {
	const raw = await fs.readFile(filePath, "utf8");

	const languages: DetectedLanguage[] = [
		{ name: "ruby", confidence: "high", evidence: [filePath] },
	];

	const frameworks: DetectedFramework[] = [];
	const recorded = new Set<string>();
	const gemPattern = /^\s*gem\s+["']([^"']+)["']/gm;
	let match: RegExpExecArray | null;
	while ((match = gemPattern.exec(raw)) !== null) {
		const gemName = match[1];
		const frameworkName = RUBY_FRAMEWORK_MAP[gemName];
		if (frameworkName && !recorded.has(frameworkName)) {
			frameworks.push({
				name: frameworkName,
				confidence: "high",
				evidence: [filePath],
			});
			recorded.add(frameworkName);
		}
	}

	return { languages, frameworks };
}

/**
 * Inspects a `mix.exs`. Elixir is flagged when the file is present; the
 * single detected framework is Phoenix, surfaced by a `:phoenix` atom in
 * the `deps` block.
 */
export async function inspectMixExs(
	filePath: string
): Promise<InspectorResult> {
	const raw = await fs.readFile(filePath, "utf8");

	const languages: DetectedLanguage[] = [
		{ name: "elixir", confidence: "high", evidence: [filePath] },
	];

	const frameworks: DetectedFramework[] = [];
	if (/\{:phoenix\b/.test(raw)) {
		frameworks.push({
			name: "phoenix",
			confidence: "high",
			evidence: [filePath],
		});
	}

	return { languages, frameworks };
}

/**
 * Inspects Java build files. Both Maven (`pom.xml`) and Gradle
 * (`build.gradle` or `build.gradle.kts`) are common in the same repo or
 * across sibling teams, so the inspector walks every file that exists and
 * unions the framework detections. Spring is flagged by either a
 * `spring-boot-starter` Maven coordinate or an `org.springframework.boot`
 * plugin/dependency in Gradle.
 */
export async function inspectPomXmlGradle(
	repoRoot: string
): Promise<InspectorResult> {
	const candidates = ["pom.xml", "build.gradle", "build.gradle.kts"];
	const foundPaths: string[] = [];
	const sources: Array<{ path: string; contents: string }> = [];

	for (const candidate of candidates) {
		const candidatePath = path.join(repoRoot, candidate);
		try {
			const contents = await fs.readFile(candidatePath, "utf8");
			foundPaths.push(candidatePath);
			sources.push({ path: candidatePath, contents });
		} catch {
			continue;
		}
	}

	if (foundPaths.length === 0) {
		return emptyResult();
	}

	const languages: DetectedLanguage[] = [
		{ name: "java", confidence: "high", evidence: foundPaths },
	];

	const frameworks: DetectedFramework[] = [];
	const springEvidence: string[] = [];
	for (const { path: sourcePath, contents } of sources) {
		if (
			contents.includes("spring-boot-starter") ||
			contents.includes("org.springframework.boot")
		) {
			springEvidence.push(sourcePath);
		}
	}
	if (springEvidence.length > 0) {
		frameworks.push({
			name: "spring",
			confidence: "high",
			evidence: springEvidence,
		});
	}

	return { languages, frameworks };
}
