/**
 * Suite for the plan stop paths: the default dependency list, how a repo's
 * config replaces a list, and the case-insensitive, directory-holding match.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
	DEFAULT_DEPENDENCY_FILES,
	matchStopPath,
	resolveStopPaths,
	type StopPaths,
} from "./hooks/plan/stop-paths.mjs";

const STOP_PATHS: StopPaths = {
	dependency: DEFAULT_DEPENDENCY_FILES,
	contract: ["src/contracts/**", "api/schema/**"],
};

const MATCHES: [string, "dependency" | "contract", string][] = [
	["package.json", "dependency", "package.json"],
	["web/package.json", "dependency", "**/package.json"],
	["pnpm-lock.yaml", "dependency", "pnpm-lock.yaml"],
	["services/api/composer.json", "dependency", "**/composer.json"],
	["services/api/composer.lock", "dependency", "**/composer.lock"],
	["src/contracts/IResolver.ts", "contract", "src/contracts/**"],
	["api/schema/types.graphql", "contract", "api/schema/**"],
];

for (const [file, kind, glob] of MATCHES) {
	test(`${file} is a ${kind} stop path`, () => {
		assert.deepEqual(matchStopPath(file, STOP_PATHS), { kind, glob });
	});
}

test("a leading ./ still matches", () => {
	assert.deepEqual(matchStopPath("./pnpm-lock.yaml", STOP_PATHS), {
		kind: "dependency",
		glob: "pnpm-lock.yaml",
	});
});

for (const [file, kind, glob] of [
	["PACKAGE.JSON", "dependency", "package.json"],
	["PNPM-LOCK.yaml", "dependency", "pnpm-lock.yaml"],
	["Src/Contracts/x.ts", "contract", "src/contracts/**"],
	["web/../package.json", "dependency", "package.json"],
	["src//contracts/x.ts", "contract", "src/contracts/**"],
	["src/contracts", "contract", "src/contracts/**"],
	["src", "contract", "src/contracts/**"],
	["src/contracts/", "contract", "src/contracts/**"],
] as const) {
	test(`${file} matches ${glob} after case folding, normalizing, or as a parent directory`, () => {
		assert.deepEqual(matchStopPath(file, STOP_PATHS), { kind, glob });
	});
}

for (const file of [
	"src/contracts-utils/a.ts",
	"src/components/x.tsx",
	"src/lib/format.ts",
	"api/handlers/hello.ts",
	"package.json.bak",
]) {
	test(`${file} is not a stop path`, () => {
		assert.equal(matchStopPath(file, STOP_PATHS), null);
	});
}

test("a directory holds a stop path that has no wildcard", () => {
	const stopPaths: StopPaths = { dependency: ["src/package.json"], contract: [] };
	assert.deepEqual(matchStopPath("src", stopPaths), {
		kind: "dependency",
		glob: "src/package.json",
	});
});

test("a double-star pattern alone does not match a file at the repo root", () => {
	const nestedOnly: StopPaths = { dependency: ["**/package.json"], contract: [] };
	assert.equal(matchStopPath("package.json", nestedOnly), null);
	assert.deepEqual(matchStopPath("web/package.json", nestedOnly), {
		kind: "dependency",
		glob: "**/package.json",
	});
	assert.deepEqual(matchStopPath("package.json", STOP_PATHS), {
		kind: "dependency",
		glob: "package.json",
	});
});

test("a globstar between two segments also matches zero directories", () => {
	const stopPaths: StopPaths = {
		dependency: [],
		contract: ["api/**/schema.graphql", "a/**/b/**/c"],
	};
	for (const file of [
		"api/schema.graphql",
		"api/v1/schema.graphql",
		"api/v1/v2/schema.graphql",
	]) {
		assert.deepEqual(
			matchStopPath(file, stopPaths),
			{ kind: "contract", glob: "api/**/schema.graphql" },
			file
		);
	}
	for (const file of ["a/b/c", "a/b/x/c", "a/x/b/c", "a/x/b/y/c"]) {
		assert.deepEqual(
			matchStopPath(file, stopPaths),
			{ kind: "contract", glob: "a/**/b/**/c" },
			file
		);
	}
	assert.equal(matchStopPath("api/schema.graphqlx", stopPaths), null);
	assert.equal(matchStopPath("apix/schema.graphql", stopPaths), null);
});

test("a brace pattern, an unknown key, and a non-string entry are config errors", () => {
	assert.throws(
		() => resolveStopPaths({ stopPaths: { contract: ["src/**/*.{ts,tsx}"] } }),
		/stopPaths\.contract pattern "src\/\*\*\/\*\.\{ts,tsx\}" uses "\{"/
	);
	assert.throws(
		() => resolveStopPaths({ stopPaths: { contracts: ["src/x/**"] } } as never),
		/unknown key "contracts"/
	);
	assert.throws(
		() => resolveStopPaths({ stopPaths: { dependency: ["a.lock", 3] } }),
		/stopPaths\.dependency holds 3, which is not a string pattern/
	);
	assert.throws(
		() => resolveStopPaths({ stopPaths: { contract: [null] } }),
		/stopPaths\.contract holds null/
	);
});

test("an empty contract list matches nothing under src/contracts/", () => {
	const stopPaths = resolveStopPaths(null);
	assert.deepEqual(stopPaths.contract, []);
	assert.equal(matchStopPath("src/contracts/x.ts", stopPaths), null);
});

test("a configured dependency list replaces the default", () => {
	const stopPaths = resolveStopPaths({ stopPaths: { dependency: ["deps.lock"] } });
	assert.deepEqual(stopPaths.dependency, ["deps.lock"]);
	assert.equal(matchStopPath("package.json", stopPaths), null);
	assert.deepEqual(matchStopPath("deps.lock", stopPaths), {
		kind: "dependency",
		glob: "deps.lock",
	});
});

test("an unset or malformed list falls back to its default", () => {
	assert.deepEqual(resolveStopPaths(undefined).dependency, DEFAULT_DEPENDENCY_FILES);
	assert.deepEqual(
		resolveStopPaths({ stopPaths: { dependency: "package.json", contract: 3 } }),
		{ dependency: DEFAULT_DEPENDENCY_FILES, contract: [] }
	);
});
