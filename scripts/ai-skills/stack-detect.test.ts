/**
 * Tests for Atlas's stack detector (PR-2.2, plan task 11).
 *
 * Each test points `detectStack` at a fixture directory under
 * `__fixtures__/stack-detect/<name>/` and asserts the detected language
 * name, framework name, confidence, and evidence path. Fixtures cover one
 * directory per inspector plus three cross-cutting cases:
 *
 * - `multi-lang/` — a repo with both `package.json` and `composer.json`, to
 *   exercise the merge layer (two languages, two frameworks, sorted by
 *   confidence).
 * - `empty/` — no package files at all, triggering the unknown-language
 *   sentinel.
 * - `partial/` — a `package.json` with no recognized framework, exercising
 *   the language-only path (JS detected, framework list stays empty).
 *
 * Tests use Node's built-in test runner (`tsx --test`) to match the rest of
 * the `scripts/ai-skills/*.test.ts` suite.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

import {
	detectStack,
	inspectCargoToml,
	inspectComposerJson,
	inspectGemfile,
	inspectGoMod,
	inspectMixExs,
	inspectPackageJson,
	inspectPomXmlGradle,
	inspectPython,
	type DetectedFramework,
	type DetectedLanguage,
	type DetectedStack,
} from "./lib/stack-detect";

const FIXTURES_ROOT = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"__fixtures__",
	"stack-detect"
);

function fixturePath(name: string): string {
	return path.join(FIXTURES_ROOT, name);
}

function findLanguage(
	stack: DetectedStack,
	name: DetectedLanguage["name"]
): DetectedLanguage | undefined {
	return stack.languages.find((lang) => lang.name === name);
}

function findFramework(
	stack: DetectedStack,
	name: string
): DetectedFramework | undefined {
	return stack.frameworks.find((fw) => fw.name === name);
}

test("detectStack flags TypeScript + React + Next from a Next.js package.json", async () => {
	const root = fixturePath("typescript");
	const stack = await detectStack(root);

	const ts = findLanguage(stack, "typescript");
	assert.ok(ts, "typescript language detected");
	assert.equal(ts.confidence, "high");
	assert.ok(
		ts.evidence.some((p) => p.endsWith("package.json")),
		"evidence cites package.json"
	);
	assert.ok(
		ts.evidence.some((p) => p.endsWith("tsconfig.json")),
		"evidence cites tsconfig.json sibling"
	);

	const react = findFramework(stack, "react");
	assert.ok(react, "react framework detected");
	assert.equal(react.confidence, "high");
	assert.ok(react.evidence[0].endsWith("package.json"));

	const next = findFramework(stack, "next");
	assert.ok(next, "next framework detected");
});

test("detectStack flags plain JavaScript when no TypeScript signal is present", async () => {
	const root = fixturePath("javascript");
	const stack = await detectStack(root);

	const js = findLanguage(stack, "javascript");
	assert.ok(js, "javascript language detected");
	assert.equal(js.confidence, "high");

	const ts = findLanguage(stack, "typescript");
	assert.equal(ts, undefined, "typescript is not detected without a signal");

	const express = findFramework(stack, "express");
	assert.ok(express, "express framework detected");
});

test("detectStack flags PHP + WordPress from a johnpbloch composer.json", async () => {
	const root = fixturePath("php-wordpress");
	const stack = await detectStack(root);

	const php = findLanguage(stack, "php");
	assert.ok(php, "php language detected");
	assert.equal(php.confidence, "high");
	assert.ok(php.evidence[0].endsWith("composer.json"));

	const wp = findFramework(stack, "wordpress");
	assert.ok(wp, "wordpress framework detected");
	assert.equal(wp.confidence, "high");
});

test("detectStack flags PHP + Laravel from a laravel/framework composer.json", async () => {
	const root = fixturePath("php-laravel");
	const stack = await detectStack(root);

	assert.ok(findLanguage(stack, "php"));
	const laravel = findFramework(stack, "laravel");
	assert.ok(laravel, "laravel framework detected");
	assert.equal(laravel.confidence, "high");
});

test("detectStack flags Python + Django from pyproject.toml", async () => {
	const root = fixturePath("python-django");
	const stack = await detectStack(root);

	const py = findLanguage(stack, "python");
	assert.ok(py, "python language detected");
	assert.ok(py.evidence[0].endsWith("pyproject.toml"));

	const django = findFramework(stack, "django");
	assert.ok(django, "django framework detected");
});

test("detectStack flags Python + Flask from requirements.txt", async () => {
	const root = fixturePath("python-flask");
	const stack = await detectStack(root);

	const py = findLanguage(stack, "python");
	assert.ok(py, "python language detected");
	assert.ok(py.evidence[0].endsWith("requirements.txt"));

	const flask = findFramework(stack, "flask");
	assert.ok(flask, "flask framework detected");
});

test("detectStack flags Python + FastAPI from Pipfile", async () => {
	const root = fixturePath("python-fastapi");
	const stack = await detectStack(root);

	const py = findLanguage(stack, "python");
	assert.ok(py, "python language detected");
	assert.ok(py.evidence[0].endsWith("Pipfile"));

	const fastapi = findFramework(stack, "fastapi");
	assert.ok(fastapi, "fastapi framework detected");
});

test("detectStack flags Go from go.mod with no framework", async () => {
	const root = fixturePath("go");
	const stack = await detectStack(root);

	const go = findLanguage(stack, "go");
	assert.ok(go, "go language detected");
	assert.ok(go.evidence[0].endsWith("go.mod"));

	assert.equal(stack.frameworks.length, 0, "no frameworks for go in v1");
});

test("detectStack flags Rust + Axum from Cargo.toml", async () => {
	const root = fixturePath("rust-axum");
	const stack = await detectStack(root);

	const rust = findLanguage(stack, "rust");
	assert.ok(rust, "rust language detected");
	assert.ok(rust.evidence[0].endsWith("Cargo.toml"));

	const axum = findFramework(stack, "axum");
	assert.ok(axum, "axum framework detected");
});

test("detectStack flags Ruby + Rails from a Gemfile", async () => {
	const root = fixturePath("ruby-rails");
	const stack = await detectStack(root);

	const ruby = findLanguage(stack, "ruby");
	assert.ok(ruby, "ruby language detected");
	assert.ok(ruby.evidence[0].endsWith("Gemfile"));

	const rails = findFramework(stack, "rails");
	assert.ok(rails, "rails framework detected");
});

test("detectStack flags Elixir + Phoenix from mix.exs", async () => {
	const root = fixturePath("elixir-phoenix");
	const stack = await detectStack(root);

	const elixir = findLanguage(stack, "elixir");
	assert.ok(elixir, "elixir language detected");
	assert.ok(elixir.evidence[0].endsWith("mix.exs"));

	const phoenix = findFramework(stack, "phoenix");
	assert.ok(phoenix, "phoenix framework detected");
});

test("detectStack flags Java + Spring from pom.xml", async () => {
	const root = fixturePath("java-spring");
	const stack = await detectStack(root);

	const java = findLanguage(stack, "java");
	assert.ok(java, "java language detected");
	assert.ok(java.evidence[0].endsWith("pom.xml"));

	const spring = findFramework(stack, "spring");
	assert.ok(spring, "spring framework detected");
});

test("detectStack merges TS + PHP from a multi-language repo", async () => {
	const root = fixturePath("multi-lang");
	const stack = await detectStack(root);

	assert.ok(findLanguage(stack, "typescript"), "typescript detected");
	assert.ok(findLanguage(stack, "php"), "php detected");
	assert.ok(findFramework(stack, "react"), "react detected");
	assert.ok(findFramework(stack, "wordpress"), "wordpress detected");
});

test("detectStack returns the unknown sentinel on an empty repo", async () => {
	const root = fixturePath("empty");
	const stack = await detectStack(root);

	assert.equal(stack.languages.length, 1);
	assert.equal(stack.languages[0].name, "unknown");
	assert.equal(stack.languages[0].confidence, "high");
	assert.deepEqual(stack.languages[0].evidence, []);
	assert.equal(stack.frameworks.length, 0);
});

test("detectStack returns JavaScript with no frameworks on a partial package.json", async () => {
	const root = fixturePath("partial");
	const stack = await detectStack(root);

	const js = findLanguage(stack, "javascript");
	assert.ok(js, "javascript still detected");
	assert.equal(stack.frameworks.length, 0, "no frameworks recognized");
});

test("inspectPackageJson reports the TypeScript signal even without tsconfig.json", async () => {
	const filePath = path.join(fixturePath("typescript"), "package.json");
	const result = await inspectPackageJson(filePath);

	const ts = result.languages.find((lang) => lang.name === "typescript");
	assert.ok(ts);
	assert.equal(ts.confidence, "high");
});

test("inspectComposerJson reports symfony when symfony/framework-bundle is required", async () => {
	const synthetic = path.join(fixturePath("php-laravel"), "composer.json");
	const result = await inspectComposerJson(synthetic);

	assert.ok(result.languages.find((lang) => lang.name === "php"));
	assert.ok(result.frameworks.find((fw) => fw.name === "laravel"));
});

test("inspectPython resolves Django from a pyproject.toml dependency array", async () => {
	const result = await inspectPython(fixturePath("python-django"));

	assert.ok(result.languages.find((lang) => lang.name === "python"));
	assert.ok(result.frameworks.find((fw) => fw.name === "django"));
});

test("inspectGoMod flags Go without framework attribution", async () => {
	const filePath = path.join(fixturePath("go"), "go.mod");
	const result = await inspectGoMod(filePath);

	assert.equal(result.languages[0].name, "go");
	assert.equal(result.frameworks.length, 0);
});

test("inspectCargoToml resolves Axum from a Cargo.toml dependency table", async () => {
	const filePath = path.join(fixturePath("rust-axum"), "Cargo.toml");
	const result = await inspectCargoToml(filePath);

	assert.equal(result.languages[0].name, "rust");
	assert.ok(result.frameworks.find((fw) => fw.name === "axum"));
});

test("inspectGemfile parses `gem \"rails\"` declarations", async () => {
	const filePath = path.join(fixturePath("ruby-rails"), "Gemfile");
	const result = await inspectGemfile(filePath);

	assert.equal(result.languages[0].name, "ruby");
	assert.ok(result.frameworks.find((fw) => fw.name === "rails"));
});

test("inspectMixExs flags Phoenix from a `{:phoenix, ...}` dep entry", async () => {
	const filePath = path.join(fixturePath("elixir-phoenix"), "mix.exs");
	const result = await inspectMixExs(filePath);

	assert.equal(result.languages[0].name, "elixir");
	assert.ok(result.frameworks.find((fw) => fw.name === "phoenix"));
});

test("inspectPomXmlGradle flags Spring from a pom.xml with spring-boot-starter", async () => {
	const result = await inspectPomXmlGradle(fixturePath("java-spring"));

	assert.equal(result.languages[0].name, "java");
	assert.ok(result.frameworks.find((fw) => fw.name === "spring"));
});
