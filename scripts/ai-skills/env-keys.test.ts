/**
 * Pins the secrets gate's remedy: `env-keys.mjs` prints the key names of a
 * dotenv file, never a value, and refuses a file that is not a dotenv file.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
	chmodSync,
	mkdtempSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { listEnvKeys } from "./hooks/env-keys.mjs";

const SCRIPT = fileURLToPath(new URL("./hooks/env-keys.mjs", import.meta.url));
const TEMP_ROOTS: string[] = [];

after(() => {
	for (const root of TEMP_ROOTS) rmSync(root, { recursive: true, force: true });
});

function writeNamed(name: string, text: string): string {
	const root = mkdtempSync(path.join(os.tmpdir(), "env-keys-"));
	TEMP_ROOTS.push(root);
	const file = path.join(root, name);
	writeFileSync(file, text);

	return file;
}

function writeEnv(text: string): string {
	return writeNamed(".env", text);
}

function runScript(...args: string[]) {
	return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });
}

const SEEDED = [
	"# a comment line, SKIPPED=1",
	"",
	"PLAIN=plain-value-1",
	"export EXPORTED=exported-value-2",
	"  SPACED = spaced-value-3",
	"SINGLE='single-value-4'",
	'DOUBLE="double-value-5"',
	"EQUALS=a=b=equals-value-6",
	'MULTI="first-line-7',
	"X=Y",
	'still-inside \\" escaped-8',
	'last-line-9"',
	"AFTER_MULTI=after-value-10",
	"SINGLE_MULTI='open-11",
	"Z=W",
	"close-12'",
	"EMPTY=",
	"not a dotenv line",
	"LAST=no-newline-13",
].join("\n");

const VALUES = [
	"plain-value-1",
	"exported-value-2",
	"spaced-value-3",
	"single-value-4",
	"double-value-5",
	"equals-value-6",
	"first-line-7",
	"escaped-8",
	"last-line-9",
	"after-value-10",
	"open-11",
	"close-12",
	"no-newline-13",
];

test("prints each key name in file order, and nothing else", () => {
	const result = runScript(writeEnv(SEEDED));
	assert.equal(result.status, 0, result.stderr);
	assert.deepEqual(result.stdout.split("\n").filter(Boolean), [
		"PLAIN",
		"EXPORTED",
		"SPACED",
		"SINGLE",
		"DOUBLE",
		"EQUALS",
		"MULTI",
		"AFTER_MULTI",
		"SINGLE_MULTI",
		"EMPTY",
		"LAST",
	]);
});

test("a key the file sets twice prints twice, in file order", () => {
	const result = runScript(writeEnv("A=1\nB=2\nA=3\n"));
	assert.equal(result.status, 0, result.stderr);
	assert.equal(result.stdout, "A\nB\nA\n");
	assert.deepEqual(listEnvKeys("A=1\nB=2\nA=3\n"), ["A", "B", "A"]);
});

test("no value and no line inside a multi-line quoted value reaches stdout", () => {
	const { stdout } = runScript(writeEnv(SEEDED));
	for (const value of VALUES) assert.ok(!stdout.includes(value), value);

	const lines = stdout.split("\n");
	assert.ok(!lines.includes("X"), "a key-shaped line inside a quoted value");
	assert.ok(!lines.includes("Z"), "a key-shaped line inside a quoted value");
	assert.ok(!stdout.includes("SKIPPED"), "a commented-out key");
});

test("a CRLF file prints bare names", () => {
	const { stdout } = runScript(writeEnv("ONE=1\r\nTWO=2\r\n"));
	assert.equal(stdout, "ONE\nTWO\n");
});

test("a missing file exits 2 with the cannot-read line on stderr", () => {
	const missing = path.join(os.tmpdir(), "env-keys-missing", ".env");
	const result = runScript(missing);
	assert.equal(result.status, 2);
	assert.equal(result.stdout, "");
	assert.equal(result.stderr, `env-keys: cannot read ${missing}\n`);
});

test("a missing argument exits 2 with nothing on stdout", () => {
	const result = runScript();
	assert.equal(result.status, 2);
	assert.equal(result.stdout, "");
	assert.match(result.stderr, /^env-keys: cannot read /);
});

test("a directory is unreadable as a dotenv file", () => {
	const dir = path.dirname(writeEnv("A=1"));
	const result = runScript(dir);
	assert.equal(result.status, 2);
	assert.equal(result.stderr, `env-keys: cannot read ${dir}\n`);
});

test("a PEM key file is refused with nothing on stdout", () => {
	const pem = [
		"",
		"-----BEGIN PRIVATE KEY-----",
		"MIIEvQIBADANBgkqhkiG9w0BAQEFAASC",
		"AbCdEf0123456789==",
		"-----END PRIVATE KEY-----",
		"",
	].join("\n");
	const file = writeEnv(pem);
	const result = runScript(file);
	assert.equal(result.status, 1);
	assert.equal(result.stdout, "");
	assert.equal(
		result.stderr,
		`env-keys: ${file} is a PEM block, not a dotenv file\n`
	);
});

test("a backtick-quoted multi-line value prints nothing inside it", () => {
	const { stdout } = runScript(writeEnv("TICK=`open\nY=Z\nclose`\nNEXT=1\n"));
	assert.equal(stdout, "TICK\nNEXT\n");
});

test("an escaped single quote doesn't close a single-quoted value", () => {
	const { stdout } = runScript(writeEnv("ESC='it\\'s\nQ=R\nend'\nNEXT=1\n"));
	assert.equal(stdout, "ESC\nNEXT\n");
});

test("an unquoted base64 continuation line is refused, not printed as a key name", () => {
	const text = [
		"PRIVATE_KEY=MIIEvQIBADANBgkqhkiG9w0BAQEFAASC",
		"AbCdEf0123456789secretKeyMaterial==",
		"NEXT=1",
		"",
	].join("\n");
	const file = writeEnv(text);
	const result = runScript(file);
	assert.equal(result.status, 1);
	assert.equal(result.stdout, "");
	assert.equal(
		result.stderr,
		`env-keys: ${file} holds a base64 key line, not a dotenv file\n`
	);
	assert.equal(listEnvKeys(text), null);
});

test("a long key name or an empty value alone is not mistaken for base64", () => {
	const result = runScript(
		writeEnv("A_LONG_KEY_NAME_WITH_UNDERSCORES=\nSHORT==\nEMPTY=\n")
	);
	assert.equal(result.status, 0, result.stderr);
	assert.equal(result.stdout, "A_LONG_KEY_NAME_WITH_UNDERSCORES\nSHORT\nEMPTY\n");
});

test("a PEM block inside a quoted multi-line value prints the key names", () => {
	const env = [
		"FIRST=1",
		'CERT="',
		"-----BEGIN CERTIFICATE-----",
		"MIIBszCCAVmgAwIBAgIU==",
		'-----END CERTIFICATE-----"',
		"NEXT=2",
	].join("\n");
	const result = runScript(writeEnv(env));
	assert.equal(result.status, 0, result.stderr);
	assert.equal(result.stdout, "FIRST\nCERT\nNEXT\n");
});

test("a PEM block after Bag Attributes lines is refused with nothing on stdout", () => {
	const pem = [
		"Bag Attributes",
		"    localKeyID: 01 00 00 00",
		"    friendlyName=deploy",
		"subject=/CN=deploy.example.com",
		"-----BEGIN PRIVATE KEY-----",
		"MIIEvQIBADANBgkqhkiG9w0BAQEFAASC",
		"AbCdEf0123456789==",
		"-----END PRIVATE KEY-----",
	].join("\n");
	const file = writeEnv(pem);
	const result = runScript(file);
	assert.equal(result.status, 1);
	assert.equal(result.stdout, "");
	assert.equal(
		result.stderr,
		`env-keys: ${file} is a PEM block, not a dotenv file\n`
	);
});

test("a file not named like a dotenv file is refused with nothing on stdout", () => {
	for (const name of ["deploy.key", "server.pem", "db", "token.txt"]) {
		const file = writeNamed(name, "dGhpc2lzYXNlY3JldA==\n");
		const result = runScript(file);
		assert.equal(result.status, 1, name);
		assert.equal(result.stdout, "", name);
		assert.equal(
			result.stderr,
			`env-keys: ${file} is not named like a dotenv file\n`
		);
	}
});

test("dotenv names in each common form are read", () => {
	for (const name of [".env", ".env.local", ".ENV", "app.env"])
		assert.equal(runScript(writeNamed(name, "A=1\n")).stdout, "A\n", name);
});

test("a byte order mark on the first line is read past", () => {
	assert.equal(
		runScript(writeEnv("﻿FIRST=1\nNEXT=2\n")).stdout,
		"FIRST\nNEXT\n"
	);

	const pem = "﻿-----BEGIN PRIVATE KEY-----\nAbCdEf0123456789==\n";
	const result = runScript(writeEnv(pem));
	assert.equal(result.status, 1);
	assert.equal(result.stdout, "");
});

test("a dotenv-named link to a file not named like one is refused", (t) => {
	const target = writeNamed("token.txt", "dGhpc2lzYXNlY3JldA==\n");
	const link = path.join(path.dirname(target), "link.env");
	try {
		symlinkSync(target, link);
	} catch {
		t.skip("symlinks are not available on this host");
		return;
	}

	const result = runScript(link);
	assert.equal(result.status, 1);
	assert.equal(result.stdout, "");
	assert.equal(
		result.stderr,
		`env-keys: ${link} is not named like a dotenv file\n`
	);
});

test("listEnvKeys returns the key names, and null for a PEM file", () => {
	assert.deepEqual(listEnvKeys("A=1\nB='x\nC=2\ny'\nD=3\n"), ["A", "B", "D"]);
	assert.equal(listEnvKeys("A=1\n-----BEGIN PRIVATE KEY-----\n"), null);
});

test("a file not named like a dotenv file is refused before it is read", (t) => {
	if (process.platform === "win32" || process.getuid?.() === 0) {
		t.skip("a mode of 0 doesn't stop this user reading the file");
		return;
	}

	const file = writeNamed("server.key", "KEY=1\n");
	chmodSync(file, 0o000);
	const result = runScript(file);
	assert.equal(result.status, 1);
	assert.equal(result.stdout, "");
	assert.match(result.stderr, /not named like a dotenv file/);
});
