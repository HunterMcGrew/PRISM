/**
 * Regression suite for the eve agent-directory emitter. Catches:
 *   - the identity/workflow split (instructions.md is identity, not workflow)
 *   - the routing description riding into the generated SKILL.md frontmatter
 *   - reference-scaffolding stripping (no `.prism/references/` load links survive)
 *   - the emitted tree byte-matching the preserved Lilac reference fixture
 *   - orphan eve persona dirs are swept when a persona leaves EVE_AUTONOMOUS_PERSONAS
 *
 * The fixture at `__fixtures__/eve-lilac-reference/` is the runtime-validated
 * hand-authored reference, regenerated to the token-substituted form an actual
 * build produces. A zero-diff against it is the emitter's correctness proof —
 * the on-host stand-in for running Lilac on eve under Node 24 (a manual Docker
 * milestone the host CI cannot reach).
 */
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import {
  buildEveAgentFiles,
  buildEveSandboxFile,
  EVE_AUTONOMOUS_PERSONAS,
  extractDescriptionBlock,
  loadEveAgentConfig,
} from "./build";
import { deriveTokenMap, loadConfig } from "./lib/tokens";
import {
  listRelativeDirectoryEntries,
  type RelativeDirectoryEntry,
} from "./build";
import {
  MANAGED_MARKER,
  normalizeFrontmatter,
  parseFrontmatter,
  removeDeletedManagedSkills,
} from "./utils";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "../..");
const skillId = "prism-standup-summary";
const skillSourceRoot = path.join(repoRoot, ".ai-skills", "skills", skillId);
const fixtureRoot = path.join(
  scriptDirectory,
  "__fixtures__",
  "eve-lilac-reference",
);
const generatedRoot = path.join(repoRoot, ".eve", "agents", skillId);

async function buildLilacEveFiles(): Promise<Map<string, string>> {
  const frontmatter = await normalizeFrontmatter(
    path.join(skillSourceRoot, "frontmatter.yml"),
  );
  const sharedBody = (
    await fs.readFile(path.join(skillSourceRoot, "shared.md"), "utf8")
  ).trim();
  const eveConfigMap = parseFrontmatter(
    (await fs.readFile(path.join(skillSourceRoot, "eve.yml"), "utf8")).trim(),
  );

  return buildEveAgentFiles({
    descriptionBlock: extractDescriptionBlock(frontmatter, skillId),
    eveConfig: loadEveAgentConfig(eveConfigMap, skillId),
    sharedBody,
    skillId,
    tokenMap: deriveTokenMap(loadConfig(repoRoot)),
  });
}

test("instructions.md carries Lilac's identity, not the standup workflow", async () => {
  const files = await buildLilacEveFiles();
  const instructions = files.get("instructions.md");
  assert.ok(instructions, "emitter must produce instructions.md");

  assert.match(
    instructions,
    /^You are \*\*Lilac\*\*/,
    "instructions.md leads with the identity frame",
  );
  assert.ok(
    instructions.includes("## Personality") &&
      instructions.includes("## How Lilac Thinks"),
    "instructions.md carries the identity sections",
  );
  assert.ok(
    !instructions.includes("## Workflow") &&
      !instructions.includes("## Definition of Done"),
    "instructions.md does not carry the procedural workflow",
  );
});

test("the eve SKILL.md frontmatter carries a non-empty routing description", async () => {
  const files = await buildLilacEveFiles();
  const skillMarkdown = files.get(`skills/${skillId}/SKILL.md`);
  assert.ok(skillMarkdown, "emitter must produce the skill SKILL.md");

  const frontmatterMatch = skillMarkdown.match(/^---\n([\s\S]*?)\n---/);
  assert.ok(frontmatterMatch, "SKILL.md opens with YAML frontmatter");

  const description = parseFrontmatter(frontmatterMatch[1]).get("description");
  assert.ok(
    typeof description === "string" && description.trim().length > 0,
    "the routing description is present and non-empty",
  );

  assert.ok(
    skillMarkdown.includes("## Workflow"),
    "SKILL.md carries the procedural workflow",
  );
});

test("the emitter strips chat-harness reference-loading scaffolding", async () => {
  const files = await buildLilacEveFiles();
  const skillMarkdown = files.get(`skills/${skillId}/SKILL.md`);
  assert.ok(skillMarkdown);

  assert.ok(
    !skillMarkdown.includes(".prism/references/"),
    "no `.prism/references/` load links survive in the eve skill body",
  );
});

test("no emitted eve file carries a generated-header comment", async () => {
  const files = await buildLilacEveFiles();

  for (const [relativePath, content] of files) {
    assert.ok(
      !content.startsWith("<!-- AUTO-GENERATED"),
      `${relativePath} must not lead with a generated-header comment — it would break eve's frontmatter routing`,
    );
  }
});

async function readTree(
  root: string,
): Promise<{ entries: RelativeDirectoryEntry[]; root: string }> {
  return { entries: await listRelativeDirectoryEntries(root), root };
}

async function assertTreeByteMatch(
  generatedDir: string,
  fixtureDir: string,
): Promise<void> {
  let generated: { entries: RelativeDirectoryEntry[]; root: string };
  try {
    generated = await readTree(generatedDir);
  } catch {
    assert.fail(
      `Generated eve tree not found at ${generatedDir} — run 'pnpm prism:build' before running this test suite.`,
    );
  }

  const fixture = await readTree(fixtureDir);

  const generatedPaths = generated.entries.map((entry) => entry.relativePath);
  const fixturePaths = fixture.entries.map((entry) => entry.relativePath);
  assert.deepEqual(
    generatedPaths,
    fixturePaths,
    "generated tree and fixture have the same file set",
  );

  for (const entry of generated.entries) {
    if (entry.kind !== "file") {
      continue;
    }
    const generatedBytes = await fs.readFile(
      path.join(generated.root, entry.relativePath),
    );
    const fixtureBytes = await fs.readFile(
      path.join(fixture.root, entry.relativePath),
    );
    assert.ok(
      generatedBytes.equals(fixtureBytes),
      `${entry.relativePath} byte-matches the fixture`,
    );
  }
}

test("the generated eve tree byte-matches the Lilac reference fixture", async () => {
  await assertTreeByteMatch(generatedRoot, fixtureRoot);
});

test("the generated Sage eve tree byte-matches the Sage reference fixture", async () => {
  const sageSkillId = "prism-changelog";
  await assertTreeByteMatch(
    path.join(repoRoot, ".eve", "agents", sageSkillId),
    path.join(scriptDirectory, "__fixtures__", "eve-sage-reference"),
  );
});

const tokenMap = deriveTokenMap(loadConfig(repoRoot));

function sandboxConfigMap(
  overrides: Record<string, string> = {},
): Map<string, string> {
  return new Map(
    Object.entries({
      model: "claude-sonnet-4.6",
      scheduleName: "changelog",
      scheduleCron: "0 9 * * 1",
      scheduleBody: "Run the changelog.",
      instructionsSections: "[Personality]",
      skillSections: "[Definition of Done]",
      sandbox: "true",
      sandboxBackend: "docker",
      repoCheckout: "true",
      writeBackGate: "always",
      writeBackPaths: "[.claude/changelogs]",
      ...overrides,
    }),
  );
}

test("buildEveSandboxFile returns no entry when the persona declares no sandbox", () => {
  const config = loadEveAgentConfig(
    new Map([
      ["model", "claude-sonnet-4.6"],
      ["scheduleName", "standup"],
      ["scheduleCron", "0 13 * * 1-5"],
      ["scheduleBody", "Compose the standup."],
      ["slackConnectUid", "slack/prism-standup"],
      ["instructionsSections", "[Personality]"],
      ["skillSections", "[Definition of Done]"],
    ]),
    "prism-standup-summary",
  );

  assert.strictEqual(
    buildEveSandboxFile(config, tokenMap),
    null,
    "a non-sandbox persona emits no sandbox/sandbox.ts (Lilac's regression guard)",
  );
});

test("buildEveSandboxFile generates defineSandbox with backend, clone bootstrap, and onSession reset", () => {
  const config = loadEveAgentConfig(sandboxConfigMap(), "prism-changelog");
  const entry = buildEveSandboxFile(config, tokenMap);

  assert.ok(entry, "a repo-state persona emits a sandbox file");
  const [relativePath, content] = entry;

  assert.strictEqual(
    relativePath,
    "sandbox/sandbox.ts",
    "the sandbox file lands at sandbox/sandbox.ts",
  );
  assert.match(content, /defineSandbox\(\{/, "calls defineSandbox");
  assert.match(
    content,
    /import \{ docker \} from "eve\/sandbox\/docker";/,
    "imports the chosen backend from its nested path",
  );
  assert.match(content, /backend: docker\(\)/, "wires the backend");
  assert.match(
    content,
    /revalidationKey: \(\) => "changelog-repo-bootstrap-v1"/,
    "sets a stable revalidationKey so the template image is reused",
  );
  assert.match(
    content,
    /async bootstrap\(\{ use \}\)/,
    "bootstrap hook clones the baseline",
  );
  assert.match(
    content,
    /git clone https:\/\/github\.com\/HunterMcGrew\/PRISM\.git \./,
    "bootstrap clones the token-substituted repo URL into /workspace",
  );
  assert.match(
    content,
    /async onSession\(\{ use \}\)/,
    "onSession hook refreshes per session",
  );
  assert.match(
    content,
    /git fetch origin && git reset --hard origin\/main/,
    "onSession resets to the token-substituted default branch",
  );
  assert.ok(
    !content.includes("${"),
    "no raw build-token placeholder survives into the generated sandbox.ts",
  );
});

test("loadEveAgentConfig throws when sandbox is true and the backend is justbash or absent", () => {
  const cases: { label: string; map: Map<string, string> }[] = [
    {
      label: "justbash",
      map: sandboxConfigMap({ sandboxBackend: "justbash" }),
    },
    { label: "absent", map: sandboxConfigMap() },
  ];
  // Remove the backend key entirely for the "absent" case — overrides can only
  // set keys, not delete the default.
  cases[1].map.delete("sandboxBackend");

  for (const { label, map } of cases) {
    assert.throws(
      () => loadEveAgentConfig(map, "prism-changelog"),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(
          error.message,
          /must run on 'docker' or 'microsandbox'/,
          "error names the backend constraint",
        );
        return true;
      },
      `rejects sandboxBackend '${label}' for a repo-state persona`,
    );
  }
});

test("loadEveAgentConfig throws when writeBackGate is anything but always", () => {
  assert.throws(
    () =>
      loadEveAgentConfig(
        sandboxConfigMap({ writeBackGate: "never" }),
        "prism-changelog",
      ),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(
        error.message,
        /only 'always' is valid in wave 2/,
        "error names the writeBackGate constraint",
      );
      return true;
    },
    "rejects a writeBackGate other than 'always'",
  );
});

test("extractDescriptionBlock throws when frontmatter is missing a description", () => {
  const frontmatterWithoutDescription = [
    "name: prism-standup-summary",
    "model: claude-sonnet-4.6",
  ].join("\n");

  assert.throws(
    () =>
      extractDescriptionBlock(
        frontmatterWithoutDescription,
        "prism-standup-summary",
      ),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.strictEqual(
        error.message,
        "frontmatter for 'prism-standup-summary' is missing a description.",
      );
      return true;
    },
    "emitter throws the expected message when description is absent",
  );
});

test("loadEveAgentConfig throws when a required key is missing from eve.yml", () => {
  // A map with only some keys — missing scheduleName and the rest.
  const incompleteConfig = new Map([["model", "claude-sonnet-4.6"]]);

  assert.throws(
    () => loadEveAgentConfig(incompleteConfig, "prism-standup-summary"),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(
        error.message,
        /eve\.yml for 'prism-standup-summary' is missing required key /,
        "error names the skill and the missing key",
      );
      return true;
    },
    "loadEveAgentConfig throws when a required key is absent",
  );
});

test("every EVE_AUTONOMOUS_PERSONAS member has an eve.yml (guard against the missing-eve.yml build throw)", async () => {
  // The build loop throws "Autonomous-slice persona '${skillId}' is missing eve.yml"
  // when a set member has no eve.yml. This test catches that condition before build
  // time: each persona in the set must have an eve.yml on disk.
  const sourceSkillsRoot = path.join(repoRoot, ".ai-skills", "skills");

  for (const personaId of EVE_AUTONOMOUS_PERSONAS) {
    const eveYmlPath = path.join(sourceSkillsRoot, personaId, "eve.yml");
    let exists = false;
    try {
      await fs.access(eveYmlPath);
      exists = true;
    } catch {
      exists = false;
    }
    assert.ok(
      exists,
      `Autonomous-slice persona '${personaId}' is missing eve.yml — every persona in EVE_AUTONOMOUS_PERSONAS needs one`,
    );
  }
});

test("removeDeletedManagedSkills sweeps an orphan eve persona dir", async () => {
  const tmpRoot = await fs.mkdtemp(
    path.join(scriptDirectory, ".tmp-eve-test-"),
  );
  try {
    // Simulate a persona that was once in EVE_AUTONOMOUS_PERSONAS but has since
    // been removed — its dir remains on disk with a managed marker.
    const orphanDir = path.join(tmpRoot, "prism-old-persona");
    await fs.mkdir(orphanDir, { recursive: true });
    await fs.writeFile(
      path.join(orphanDir, MANAGED_MARKER),
      "Managed by scripts/ai-skills/build.ts\n",
    );

    // The valid set does not include "prism-old-persona" — it was removed.
    const validIds = new Set(["prism-standup-summary"]);
    const swept: string[] = [];

    await removeDeletedManagedSkills(tmpRoot, validIds, false, swept);

    assert.ok(
      swept.some((p) => p.includes("prism-old-persona")),
      "the orphan dir path was recorded in changedPaths",
    );

    let orphanExists = true;
    try {
      await fs.access(orphanDir);
    } catch {
      orphanExists = false;
    }
    assert.ok(!orphanExists, "the orphan eve persona dir was removed");
  } finally {
    await fs.rm(tmpRoot, { force: true, recursive: true });
  }
});
