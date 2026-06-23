#!/usr/bin/env node

// scripts/ai-skills/adopt.ts
import fs11 from "node:fs/promises";
import path13 from "node:path";
import { fileURLToPath as fileURLToPath4 } from "node:url";

// scripts/ai-skills/lib/consumer-root.ts
import { execFileSync } from "node:child_process";
import path from "node:path";
function gitCapture(args, cwd) {
  try {
    const out = execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    const trimmed = out.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}
function resolveEnclosingConsumerRoot(prismRoot) {
  const topLevel = gitCapture(["rev-parse", "--show-toplevel"], prismRoot);
  if (topLevel !== null && path.resolve(topLevel) !== path.resolve(prismRoot)) {
    return path.resolve(topLevel);
  }
  const superproject = gitCapture(
    ["rev-parse", "--show-superproject-working-tree"],
    prismRoot
  );
  if (superproject !== null) {
    return path.resolve(superproject);
  }
  const parent = path.dirname(path.resolve(prismRoot));
  if (parent === path.resolve(prismRoot)) {
    return null;
  }
  const parentTopLevel = gitCapture(["rev-parse", "--show-toplevel"], parent);
  if (parentTopLevel !== null && path.resolve(parentTopLevel) !== path.resolve(prismRoot)) {
    return path.resolve(parentTopLevel);
  }
  return null;
}
function resolveConsumerRoot(options) {
  const { explicitConsumer, cwd, selfPrismRoot } = options;
  if (explicitConsumer !== null) {
    return path.resolve(cwd, explicitConsumer);
  }
  const runningFromInsidePrism = path.resolve(cwd) === path.resolve(selfPrismRoot);
  if (!runningFromInsidePrism) {
    return path.resolve(cwd);
  }
  const enclosing = resolveEnclosingConsumerRoot(selfPrismRoot);
  if (enclosing === null) {
    throw new Error(
      "prism: running from inside the PRISM checkout, but PRISM is not nested inside another git repository \u2014 there is no consumer repo to target. Run from your consumer repo, vendor PRISM inside it, or pass --consumer <path-to-consumer-repo>."
    );
  }
  if (path.resolve(enclosing) === path.resolve(selfPrismRoot)) {
    throw new Error(
      "prism: enclosing-repo detection resolved back to the PRISM checkout itself \u2014 refusing to adopt PRISM into PRISM. Pass --consumer <path> to target the consumer repo explicitly."
    );
  }
  return path.resolve(enclosing);
}
function parseConsumerFlag(argv) {
  const flagIndex = argv.indexOf("--consumer");
  if (flagIndex !== -1) {
    const value = argv[flagIndex + 1];
    if (!value) {
      throw new Error(
        "--consumer was given an empty value; pass a directory path (e.g. --consumer /path/to/repo)"
      );
    }
    return value;
  }
  const inlineFlag = argv.find((arg) => arg.startsWith("--consumer="));
  if (inlineFlag) {
    const value = inlineFlag.slice("--consumer=".length);
    if (!value) {
      throw new Error(
        "--consumer was given an empty value; pass a directory path (e.g. --consumer /path/to/repo)"
      );
    }
    return value;
  }
  return null;
}

// scripts/ai-skills/sync-manifest.ts
import fs9 from "node:fs/promises";
import path11 from "node:path";

// scripts/ai-skills/build.ts
import { execFile } from "node:child_process";
import fs7 from "node:fs/promises";
import path9 from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

// scripts/ai-skills/agents-md-block.ts
import fs2 from "node:fs/promises";
import path3 from "node:path";

// scripts/ai-skills/lib/tokens.ts
import fs from "node:fs";
import path2 from "node:path";
var REQUIRED_TOP_LEVEL_KEYS = [
  "org",
  "project",
  "ticketPrefix",
  "ticketSystem"
];
function loadConfig(repoRoot3) {
  const configPath = path2.join(repoRoot3, ".ai-skills", "config.json");
  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Missing .ai-skills/config.json at ${configPath}. The build needs it to derive the token map.`
    );
  }
  const raw = fs.readFileSync(configPath, "utf8");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Invalid JSON in ${configPath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Config at ${configPath} must be a JSON object.`);
  }
  const config = parsed;
  for (const key of REQUIRED_TOP_LEVEL_KEYS) {
    if (!(key in config)) {
      throw new Error(`${configPath} /${key}: required field is missing.`);
    }
  }
  for (const key of ["org", "project", "ticketPrefix"]) {
    const value = config[key];
    if (typeof value !== "string" || value.length === 0) {
      throw new Error(
        `${configPath} /${key}: must be a non-empty string (got ${describeType(value)}).`
      );
    }
  }
  const ticketSystem = config.ticketSystem;
  if (ticketSystem === null || typeof ticketSystem !== "object" || Array.isArray(ticketSystem)) {
    throw new Error(
      `${configPath} /ticketSystem: must be an object (got ${describeType(ticketSystem)}).`
    );
  }
  const ticketSystemObject = ticketSystem;
  if (ticketSystemObject.kind !== "linear" && ticketSystemObject.kind !== "github-issues") {
    throw new Error(
      `${configPath} /ticketSystem/kind: must be "linear" or "github-issues" (got ${JSON.stringify(ticketSystemObject.kind)}).`
    );
  }
  return parsed;
}
function deriveTokenMap(config) {
  const tokenMap = /* @__PURE__ */ new Map();
  tokenMap.set("ORG", config.org);
  tokenMap.set("PROJECT", config.project);
  tokenMap.set("PROJECT_LOWERCASE", config.project.toLowerCase());
  tokenMap.set("TICKET_PREFIX", config.ticketPrefix);
  tokenMap.set("TICKET_PREFIX_LOWERCASE", config.ticketPrefix.toLowerCase());
  if (typeof config.ticketSystem.workspace === "string") {
    tokenMap.set("LINEAR_WORKSPACE", config.ticketSystem.workspace);
  }
  if (typeof config.ticketSystem.teamKey === "string") {
    tokenMap.set("LINEAR_TEAM_KEY", config.ticketSystem.teamKey);
  }
  tokenMap.set("TICKET_TRACKER", deriveTicketTracker(config));
  if (typeof config.github?.owner === "string") {
    tokenMap.set("GITHUB_OWNER", config.github.owner);
    tokenMap.set("GITHUB_OWNER_LOWERCASE", config.github.owner.toLowerCase());
  }
  if (typeof config.github?.repo === "string") {
    tokenMap.set("GITHUB_REPO", config.github.repo);
  }
  tokenMap.set("DEFAULT_BRANCH", config.defaultBranch ?? "main");
  if (typeof config.slackChannel === "string") {
    tokenMap.set("SLACK_CHANNEL", config.slackChannel);
  }
  return tokenMap;
}
var TOKEN_LITERAL_PATTERN = /\$\{([A-Z][A-Z0-9_]*)\}/g;
function substituteTokens(content, tokenMap) {
  return content.replace(TOKEN_LITERAL_PATTERN, (match, tokenName, offset) => {
    if (!tokenMap.has(tokenName)) {
      throw new Error(
        `Unknown token \${${tokenName}} in content near: ${contextSnippet(content, offset)}`
      );
    }
    return tokenMap.get(tokenName) ?? match;
  });
}
function deriveTicketTracker(config) {
  if (config.ticketSystem.kind === "github-issues") {
    return "**Ticket tracker:** GitHub issues";
  }
  const teamKey = config.ticketSystem.teamKey ?? config.ticketPrefix;
  return `**Linear team:** ${teamKey} (prefix: ${config.ticketPrefix}-####)`;
}
function contextSnippet(content, offset) {
  const start = Math.max(0, offset - 40);
  const end = Math.min(content.length, offset + 40);
  const snippet = content.slice(start, end).replace(/\s+/g, " ").trim();
  return `"${snippet}"`;
}
function describeType(value) {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  return typeof value;
}

// scripts/ai-skills/agents-md-block.ts
var AGENTS_MD_BLOCK_BEGIN = "<!-- BEGIN GENERATED TIER-1 RULE BODIES \u2014 managed by scripts/ai-skills/build.ts; do not edit -->";
var AGENTS_MD_BLOCK_END = "<!-- END GENERATED TIER-1 RULE BODIES -->";
var CODEX_INLINE_EXCLUDE = /* @__PURE__ */ new Set([]);
function splitFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: null, body: content };
  }
  return { frontmatter: match[1], body: match[2] };
}
async function collectTier1RuleBodies(rulesDir, tokenMap) {
  const entries = await fs2.readdir(rulesDir);
  const mdFiles = entries.filter((e) => e.endsWith(".md")).sort();
  const results = [];
  for (const name of mdFiles) {
    if (CODEX_INLINE_EXCLUDE.has(name)) {
      continue;
    }
    const content = await fs2.readFile(path3.join(rulesDir, name), "utf8");
    const { frontmatter } = splitFrontmatter(content);
    if (frontmatter !== null && /^paths:/m.test(frontmatter)) {
      continue;
    }
    const body = tokenMap ? substituteTokens(content.trim(), tokenMap) : content.trim();
    results.push({ name, body });
  }
  return results;
}
function renderTier1Block(rules) {
  const rendered = rules.map((r) => `<!-- source: .prism/rules/${r.name} -->

${r.body}`).join("\n\n---\n\n");
  return `${AGENTS_MD_BLOCK_BEGIN}

${rendered}

${AGENTS_MD_BLOCK_END}`;
}
function replaceTier1Block(agentsMd, block) {
  const beginEscaped = AGENTS_MD_BLOCK_BEGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const endEscaped = AGENTS_MD_BLOCK_END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const existingBlock = new RegExp(`${beginEscaped}[\\s\\S]*?${endEscaped}`);
  if (existingBlock.test(agentsMd)) {
    return agentsMd.replace(existingBlock, block);
  }
  const tableAnchor = /([ \t]*\| 12 \| Pre-compaction checkpoint[\s\S]*?\n)([ \t]*\n)([ \t]*---)/;
  if (tableAnchor.test(agentsMd)) {
    return agentsMd.replace(tableAnchor, `$1$2${block}

$3`);
  }
  return `${agentsMd}

${block}
`;
}

// scripts/ai-skills/literal-guard.ts
import fs4 from "node:fs/promises";
import path6 from "node:path";

// scripts/ai-skills/utils.ts
import { createHash } from "node:crypto";
import fs3 from "node:fs/promises";
import path5 from "node:path";

// scripts/ai-skills/rule-dialect.ts
import path4 from "node:path";
var RULES_AREA = "rules";
var verbatimRuleDialect = {
  transformContent: (_area, content) => content,
  mapTargetRelativePath: (_area, relativePath) => relativePath,
  mapSourceRelativePath: (_area, relativePath) => relativePath
};
function splitFrontmatter2(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: null, body: content };
  }
  return { frontmatter: match[1], body: match[2] };
}
function rewritePathsToGlobs(frontmatter) {
  return frontmatter.replace(/^paths:/m, "globs:");
}
function buildCursorFrontmatter(frontmatter) {
  if (frontmatter === null) {
    return "---\nalwaysApply: true\n---";
  }
  if (/^paths:/m.test(frontmatter)) {
    return `---
${rewritePathsToGlobs(frontmatter)}
---`;
  }
  return `---
${frontmatter}
---`;
}
var cursorRuleDialect = {
  transformContent: (area, content) => {
    if (area !== RULES_AREA) {
      return content;
    }
    const { frontmatter, body } = splitFrontmatter2(content);
    const cursorFrontmatter = buildCursorFrontmatter(frontmatter);
    const trimmedBody = body.replace(/^\r?\n/, "");
    return `${cursorFrontmatter}

${trimmedBody}`;
  },
  mapTargetRelativePath: (area, relativePath) => {
    if (area !== RULES_AREA || !relativePath.endsWith(".md")) {
      return relativePath;
    }
    return `${relativePath.slice(0, -path4.extname(relativePath).length)}.mdc`;
  },
  mapSourceRelativePath: (area, relativePath) => {
    if (area !== RULES_AREA || !relativePath.endsWith(".mdc")) {
      return relativePath;
    }
    return `${relativePath.slice(0, -path4.extname(relativePath).length)}.md`;
  }
};
var codexRuleDialect = {
  transformContent: (area, content) => {
    if (area !== RULES_AREA) {
      return content;
    }
    const { frontmatter, body } = splitFrontmatter2(content);
    if (frontmatter === null || !/^paths:/m.test(frontmatter)) {
      return content;
    }
    return body.replace(/^\r?\n/, "");
  },
  mapTargetRelativePath: (_area, relativePath) => relativePath,
  mapSourceRelativePath: (_area, relativePath) => relativePath
};

// scripts/ai-skills/utils.ts
var MANAGED_MARKER = ".ai-skill-generated";
var MAX_FRONTMATTER_DESCRIPTION_LENGTH = 1e3;
var GENERATED_HEADER_LINE = "# AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.";
async function readFileIfExists(filePath) {
  try {
    return await fs3.readFile(filePath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}
async function pathExists(filePath) {
  try {
    await fs3.access(filePath);
    return true;
  } catch {
    return false;
  }
}
async function listDirectories(rootPath) {
  const entries = await fs3.readdir(rootPath, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith(".")).map((entry) => entry.name).sort((a, b) => a.localeCompare(b));
}
async function listRelativeDirectoryEntries(rootPath, currentPath = rootPath) {
  const entries = await fs3.readdir(currentPath, { withFileTypes: true });
  const relativeEntries = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }
    const entryPath = path5.join(currentPath, entry.name);
    const relativePath = path5.relative(rootPath, entryPath);
    if (entry.isDirectory()) {
      relativeEntries.push({ kind: "directory", relativePath });
      relativeEntries.push(
        ...await listRelativeDirectoryEntries(rootPath, entryPath)
      );
      continue;
    }
    if (entry.isFile()) {
      relativeEntries.push({ kind: "file", relativePath });
    }
  }
  return relativeEntries.sort(
    (a, b) => a.relativePath.localeCompare(b.relativePath)
  );
}
async function filesAreEqual(sourcePath, targetPath) {
  const sourceContent = await fs3.readFile(sourcePath);
  const targetContent = await fs3.readFile(targetPath);
  return sourceContent.equals(targetContent);
}
async function ensureDirectory(filePath) {
  await fs3.mkdir(filePath, { recursive: true });
}
async function normalizeFrontmatter(frontmatterPath) {
  const rawFrontmatter = await fs3.readFile(frontmatterPath, "utf8");
  const trimmed = rawFrontmatter.trim();
  if (trimmed.startsWith("---")) {
    const match = trimmed.match(/^---\r?\n([\s\S]*?)\r?\n---\s*$/);
    if (!match) {
      throw new Error(`Invalid frontmatter at ${frontmatterPath}`);
    }
    return match[1].trim();
  }
  return trimmed;
}
function stripSurroundingQuotes(value) {
  if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  return value;
}
function escapeToml(value) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("\n", "\\n").replaceAll("\r", "\\r");
}
function escapeTomlMultiline(value) {
  return value.replaceAll("\\", "\\\\").replaceAll('"""', '\\"\\"\\"');
}
function parseFrontmatter(frontmatterText) {
  const entries = /* @__PURE__ */ new Map();
  const lines = frontmatterText.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) {
      continue;
    }
    const key = match[1];
    const rawValue = match[2].trim();
    if (rawValue === ">") {
      const foldedLines = [];
      while (index + 1 < lines.length && /^\s{2,}/.test(lines[index + 1])) {
        index += 1;
        foldedLines.push(lines[index].trim());
      }
      entries.set(key, foldedLines.join(" ").trim());
      continue;
    }
    entries.set(key, stripSurroundingQuotes(rawValue));
  }
  return entries;
}
async function writeFileIfChanged(filePath, content, checkMode2, changedPaths2) {
  const previousContent = await readFileIfExists(filePath);
  if (previousContent === content) {
    return;
  }
  changedPaths2.push(filePath);
  if (checkMode2) {
    return;
  }
  await ensureDirectory(path5.dirname(filePath));
  await fs3.writeFile(filePath, content, "utf8");
}
async function removeDeletedManagedSkills(outputRoot, validSkillIds, checkMode2, changedPaths2) {
  if (!await pathExists(outputRoot)) {
    return;
  }
  const entries = await fs3.readdir(outputRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) {
      continue;
    }
    if (validSkillIds.has(entry.name)) {
      continue;
    }
    const skillPath = path5.join(outputRoot, entry.name);
    const markerPath = path5.join(skillPath, MANAGED_MARKER);
    if (!await pathExists(markerPath)) {
      continue;
    }
    changedPaths2.push(skillPath);
    if (checkMode2) {
      continue;
    }
    await fs3.rm(skillPath, { force: true, recursive: true });
  }
}
function hashContent(content) {
  const digest = createHash("sha256").update(content).digest("hex");
  return `sha256:${digest}`;
}
async function hashFile(filePath) {
  const content = await fs3.readFile(filePath);
  return hashContent(content);
}
async function loadPathDefinitions(repoRoot3) {
  const pathDefinitionsPath = path5.join(
    repoRoot3,
    ".ai-skills",
    "definitions",
    "paths.json"
  );
  if (!await pathExists(pathDefinitionsPath)) {
    throw new Error(`Missing path definitions: ${pathDefinitionsPath}`);
  }
  try {
    return JSON.parse(
      await fs3.readFile(pathDefinitionsPath, "utf8")
    );
  } catch (error) {
    throw new Error(
      `Invalid path definitions JSON at ${pathDefinitionsPath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
function buildPlatformDirs(repoRoot3, pathDefinitions) {
  const platformCopies = pathDefinitions.generated.platformContentCopies;
  return [
    {
      dir: path5.join(repoRoot3, platformCopies.claude),
      dialect: verbatimRuleDialect
    },
    {
      dir: path5.join(repoRoot3, platformCopies.codex),
      dialect: codexRuleDialect
    },
    {
      dir: path5.join(repoRoot3, platformCopies.cursor),
      dialect: cursorRuleDialect
    }
  ];
}

// scripts/ai-skills/literal-guard.ts
var LITERAL_GUARD_PATTERN = /(Thrive|tractru|TracTru\/thrive|THR-[0-9A-Z#*\\]+|thrive\.[a-zA-Z]+)/;
var LEFTOVER_TOKEN_PATTERN = /\$\{[A-Z][A-Z0-9_]*\}/;
async function listFilesRecursively(rootPath, currentPath = rootPath) {
  const out = [];
  const entries = await fs4.readdir(currentPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".managed-by-build") {
      continue;
    }
    if (entry.name === "worktrees" && currentPath === rootPath) {
      continue;
    }
    const entryPath = path6.join(currentPath, entry.name);
    if (entry.isDirectory()) {
      out.push(...await listFilesRecursively(rootPath, entryPath));
      continue;
    }
    if (entry.isFile()) {
      out.push({
        relativePath: path6.relative(rootPath, entryPath)
      });
    }
  }
  return out;
}
async function loadAllowlist(repoRoot3) {
  const allowlistPath = path6.join(
    repoRoot3,
    ".ai-skills",
    "definitions",
    "literal-allowlist.json"
  );
  if (!await pathExists(allowlistPath)) {
    return [];
  }
  const raw = await fs4.readFile(allowlistPath, "utf8");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Invalid JSON in ${allowlistPath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed) || !Array.isArray(parsed.files)) {
    throw new Error(
      `${allowlistPath}: expected { "files": [...] } shape.`
    );
  }
  const allowlistFile = parsed;
  return allowlistFile.files.map((entry) => entry.path);
}
function isAllowlistedPath(relativePath, allowlist) {
  const normalized = relativePath.split(path6.sep).join("/");
  for (const prefix of allowlist) {
    if (normalized === prefix || normalized.startsWith(`${prefix}/`)) {
      return true;
    }
  }
  return false;
}
function scanLines(lines, relativePath, pattern) {
  const violations = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = pattern.exec(line);
    if (match) {
      violations.push({
        relativePath,
        line: index + 1,
        match: match[0]
      });
    }
  }
  return violations;
}
async function scanPlatformRoots(repoRoot3, platformRoots, pattern) {
  const allowlist = await loadAllowlist(repoRoot3);
  const violations = [];
  for (const platformRoot of platformRoots) {
    if (!await pathExists(platformRoot)) {
      continue;
    }
    const entries = await listFilesRecursively(platformRoot);
    for (const entry of entries) {
      const relativeFromRepoRoot = path6.relative(repoRoot3, path6.join(platformRoot, entry.relativePath)).split(path6.sep).join("/");
      if (isAllowlistedPath(relativeFromRepoRoot, allowlist)) {
        continue;
      }
      const filePath = path6.join(platformRoot, entry.relativePath);
      const lines = (await fs4.readFile(filePath, "utf8")).split(/\r?\n/);
      violations.push(...scanLines(lines, relativeFromRepoRoot, pattern));
    }
  }
  return violations;
}
async function runLiteralGuard(repoRoot3, platformRoots) {
  return scanPlatformRoots(repoRoot3, platformRoots, LITERAL_GUARD_PATTERN);
}
async function runLeftoverTokenGuard(repoRoot3, platformRoots) {
  return scanPlatformRoots(repoRoot3, platformRoots, LEFTOVER_TOKEN_PATTERN);
}

// scripts/ai-skills/path-guard.ts
import fs5 from "node:fs/promises";
import path7 from "node:path";
var PATH_GUARD_COPIED_AREAS = [
  "rules",
  "architect",
  "spec",
  "templates",
  "references"
];
var PATH_GUARD_LOOSE_FILES = ["SPEC.md"];
var PATH_GUARD_FILE_ALLOWLIST = /* @__PURE__ */ new Set([
  // ADR documenting the bifurcation; the Context section discusses the old
  // layout in prose so the decision reads against its own history.
  "spec/adrs/_toolkit/0031-bifurcated-install-layout.md",
  // Architect doc explaining the layout. Walks through the canonical-vs-copy
  // distinction with concrete platform-dir paths in the example block — that
  // is the doc's job, not a violation.
  "architect/_toolkit/install-layout.md"
]);
var PATH_GUARD_PATTERN = /(\.claude|\.codex|\.cursor)\/(rules|architect|spec|templates|references|plans)\//;
async function listMarkdownFiles(rootPath, currentPath = rootPath) {
  const out = [];
  const entries = await fs5.readdir(currentPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }
    const entryPath = path7.join(currentPath, entry.name);
    if (entry.isDirectory()) {
      out.push(...await listMarkdownFiles(rootPath, entryPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".md")) {
      out.push({
        kind: "file",
        relativePath: path7.relative(rootPath, entryPath)
      });
    }
  }
  return out;
}
function scanLines2(lines, relativePath) {
  const violations = [];
  let inFence = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\s{0,3}```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      continue;
    }
    if (PATH_GUARD_PATTERN.test(line)) {
      violations.push({
        relativePath,
        line: index + 1,
        text: line.trim()
      });
    }
  }
  return violations;
}
async function runPathGuard(contentRoot) {
  if (!await pathExists(contentRoot)) {
    return [];
  }
  const violations = [];
  for (const area of PATH_GUARD_COPIED_AREAS) {
    const areaPath = path7.join(contentRoot, area);
    if (!await pathExists(areaPath)) {
      continue;
    }
    const entries = await listMarkdownFiles(areaPath);
    for (const entry of entries) {
      const relativeFromContentRoot = path7.join(area, entry.relativePath).split(path7.sep).join("/");
      if (PATH_GUARD_FILE_ALLOWLIST.has(relativeFromContentRoot)) {
        continue;
      }
      const filePath = path7.join(areaPath, entry.relativePath);
      const lines = (await fs5.readFile(filePath, "utf8")).split(/\r?\n/);
      violations.push(...scanLines2(lines, relativeFromContentRoot));
    }
  }
  for (const looseFile of PATH_GUARD_LOOSE_FILES) {
    const filePath = path7.join(contentRoot, looseFile);
    if (!await pathExists(filePath)) {
      continue;
    }
    if (PATH_GUARD_FILE_ALLOWLIST.has(looseFile)) {
      continue;
    }
    const lines = (await fs5.readFile(filePath, "utf8")).split(/\r?\n/);
    violations.push(...scanLines2(lines, looseFile));
  }
  return violations;
}

// scripts/ai-skills/generate-skills.ts
import fs6 from "node:fs/promises";
import path8 from "node:path";
var CLAUDE_AGENT_MODEL_DEFAULTS = /* @__PURE__ */ new Map([
  ["prism-conductor", "opus"],
  ["prism-architect", "opus"]
]);
var DEFAULT_CLAUDE_AGENT_MODEL = "sonnet";
var GENERATED_MARKDOWN_HEADER_LINE = "<!-- AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY. -->";
var optionalSkillPayloads = [
  { kind: "directory", relativePath: "assets" },
  { kind: "directory", relativePath: "references" },
  { kind: "directory", relativePath: "scripts" },
  { kind: "file", relativePath: path8.join("agents", "openai.yaml") }
];
function buildSkillMarkdown({
  frontmatter,
  platformBody,
  platformName,
  sharedBody,
  skillId,
  tokenMap
}) {
  const header = [
    "<!-- AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY. -->",
    `<!-- Source: .ai-skills/skills/${skillId} -->`,
    `<!-- Target: ${platformName} | Regenerate with: pnpm prism:build -->`
  ].join("\n");
  const contentSections = [sharedBody.trim(), platformBody.trim()].filter(Boolean).join("\n\n");
  const assembled = `---
${frontmatter}
---

${header}

${contentSections}
`;
  return substituteTokens(assembled, tokenMap);
}
function buildCodexAgentToml({
  codexSkillMarkdown,
  description,
  roleDefinition,
  skillId,
  tokenMap
}) {
  const header = [
    GENERATED_HEADER_LINE,
    `# Source: .ai-skills/skills/${skillId}`,
    "# Target: codex-agent | Regenerate with: pnpm prism:build",
    ""
  ].join("\n");
  const substitutedDescription = substituteTokens(description, tokenMap);
  const substitutedPersona = roleDefinition.persona ? substituteTokens(roleDefinition.persona, tokenMap) : void 0;
  const developerInstructions = [
    ...substitutedPersona ? [`You are ${substitutedPersona}.`] : [],
    `Canonical skill source: .ai-skills/skills/${skillId}`,
    "Follow this generated skill definition:",
    "",
    codexSkillMarkdown.trim()
  ].join("\n");
  return [
    header,
    `name = "${escapeToml(skillId)}"`,
    `description = "${escapeToml(substitutedDescription)}"`,
    'developer_instructions = """',
    escapeTomlMultiline(developerInstructions),
    '"""',
    ""
  ].join("\n");
}
function buildClaudeAgentMarkdown({
  claudeSkillMarkdown,
  description,
  skillId,
  tokenMap
}) {
  const header = [
    GENERATED_MARKDOWN_HEADER_LINE,
    `<!-- Source: .ai-skills/skills/${skillId} -->`,
    "<!-- Target: claude-agent | Regenerate with: pnpm prism:build -->"
  ].join("\n");
  const substitutedDescription = substituteTokens(description, tokenMap).replace(
    /\s+/g,
    " "
  );
  const model = CLAUDE_AGENT_MODEL_DEFAULTS.get(skillId) ?? DEFAULT_CLAUDE_AGENT_MODEL;
  const frontmatter = [
    "---",
    `name: ${skillId}`,
    `description: ${JSON.stringify(substitutedDescription)}`,
    `model: ${model}`,
    "---"
  ].join("\n");
  return `${frontmatter}

${header}

${claudeSkillMarkdown.trim()}
`;
}
async function loadSkillSource(skillId, sourceSkillsRoot) {
  const skillRoot = path8.join(sourceSkillsRoot, skillId);
  const frontmatterPath = path8.join(skillRoot, "frontmatter.yml");
  const sharedPath = path8.join(skillRoot, "shared.md");
  const claudePath = path8.join(skillRoot, "claude.md");
  const codexPath = path8.join(skillRoot, "codex.md");
  const cursorPath = path8.join(skillRoot, "cursor.md");
  if (!await pathExists(frontmatterPath)) {
    throw new Error(`Missing required file: ${frontmatterPath}`);
  }
  if (!await pathExists(sharedPath)) {
    throw new Error(`Missing required file: ${sharedPath}`);
  }
  const frontmatter = await normalizeFrontmatter(frontmatterPath);
  const frontmatterMap = parseFrontmatter(frontmatter);
  const description = frontmatterMap.get("description");
  if (typeof description === "string" && description.length > MAX_FRONTMATTER_DESCRIPTION_LENGTH) {
    throw new Error(
      `Description for skill '${skillId}' is ${description.length} characters. Keep frontmatter descriptions under ${MAX_FRONTMATTER_DESCRIPTION_LENGTH} characters so Codex skill discovery can expose the skill.`
    );
  }
  const sharedBody = (await fs6.readFile(sharedPath, "utf8")).trim();
  const claudeBody = (await readFileIfExists(claudePath) ?? "").trim();
  const codexBody = (await readFileIfExists(codexPath) ?? "").trim();
  const cursorBody = (await readFileIfExists(cursorPath) ?? "").trim();
  return {
    claudeBody,
    codexBody,
    cursorBody,
    frontmatter,
    frontmatterMap,
    sharedBody
  };
}
async function directoriesAreEqual(sourcePath, targetPath) {
  const sourceEntries = await listRelativeDirectoryEntries(sourcePath);
  const targetEntries = await listRelativeDirectoryEntries(targetPath);
  if (sourceEntries.length !== targetEntries.length) {
    return false;
  }
  for (let index = 0; index < sourceEntries.length; index += 1) {
    const sourceEntry = sourceEntries[index];
    const targetEntry = targetEntries[index];
    if (sourceEntry.kind !== targetEntry.kind || sourceEntry.relativePath !== targetEntry.relativePath) {
      return false;
    }
    if (sourceEntry.kind === "file" && !await filesAreEqual(
      path8.join(sourcePath, sourceEntry.relativePath),
      path8.join(targetPath, sourceEntry.relativePath)
    )) {
      return false;
    }
  }
  return true;
}
async function payloadIsDifferent(sourcePath, targetPath, payloadKind) {
  if (!await pathExists(targetPath)) {
    return true;
  }
  if (payloadKind === "file") {
    return !await filesAreEqual(sourcePath, targetPath);
  }
  return !await directoriesAreEqual(sourcePath, targetPath);
}
async function syncOptionalSkillPayloads(sourceSkillRoot, targetSkillRoot, checkModeArg, changedPathsArg) {
  for (const payload of optionalSkillPayloads) {
    const sourcePath = path8.join(sourceSkillRoot, payload.relativePath);
    const targetPath = path8.join(targetSkillRoot, payload.relativePath);
    const sourceExists = await pathExists(sourcePath);
    const targetExists = await pathExists(targetPath);
    if (!sourceExists && !targetExists) {
      continue;
    }
    if (!sourceExists) {
      changedPathsArg.push(targetPath);
      if (!checkModeArg) {
        await fs6.rm(targetPath, {
          force: true,
          recursive: payload.kind === "directory"
        });
      }
      continue;
    }
    if (!await payloadIsDifferent(sourcePath, targetPath, payload.kind)) {
      continue;
    }
    changedPathsArg.push(targetPath);
    if (checkModeArg) {
      continue;
    }
    await fs6.rm(targetPath, {
      force: true,
      recursive: payload.kind === "directory"
    });
    await ensureDirectory(path8.dirname(targetPath));
    if (payload.kind === "file") {
      await fs6.copyFile(sourcePath, targetPath);
      continue;
    }
    await fs6.cp(sourcePath, targetPath, { force: true, recursive: true });
  }
}
async function removeDeletedManagedAgentFiles(outputRoot, validSkillIds, extension, headerLine, checkModeArg, changedPathsArg) {
  if (!await pathExists(outputRoot)) {
    return;
  }
  const entries = await fs6.readdir(outputRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(extension) || entry.name.startsWith(".")) {
      continue;
    }
    const skillId = entry.name.slice(0, -extension.length);
    if (validSkillIds.has(skillId)) {
      continue;
    }
    const filePath = path8.join(outputRoot, entry.name);
    const fileContent = await readFileIfExists(filePath) ?? "";
    if (!fileContent.includes(headerLine)) {
      continue;
    }
    changedPathsArg.push(filePath);
    if (checkModeArg) {
      continue;
    }
    await fs6.rm(filePath, { force: true });
  }
}
function buildRoleMap(roleDefinitions) {
  const roleMap = /* @__PURE__ */ new Map();
  for (const role of roleDefinitions.skills ?? []) {
    if (role.type !== void 0 && role.type !== "persona" && role.type !== "utility") {
      throw new Error(
        `Role '${role.id}' in .ai-skills/definitions/roles.json has unrecognized type '${role.type}' \u2014 use "persona", "utility", or omit type.`
      );
    }
    if (!role.id || role.type !== "utility" && !role.persona) {
      throw new Error(
        'Each role in .ai-skills/definitions/roles.json must include id, plus persona unless type is "utility".'
      );
    }
    if (role.type === "utility" && role.persona) {
      throw new Error(
        `Utility role '${role.id}' must not carry a persona \u2014 a persona on a utility entry is contradictory and would sit inert in the registry.`
      );
    }
    roleMap.set(role.id, role);
  }
  return roleMap;
}
async function generatePlatformSkills(options) {
  const {
    sourceSkillsRoot,
    targetRoots,
    codexConfigPath,
    roleMap,
    tokenMap,
    optedIn,
    checkMode: checkMode2,
    changedPaths: changedPaths2
  } = options;
  const skillIds = await listDirectories(sourceSkillsRoot);
  const knownSkillIds = new Set(skillIds);
  for (const skillId of skillIds) {
    const skillSource = await loadSkillSource(skillId, sourceSkillsRoot);
    const roleDefinition = roleMap.get(skillId);
    if (!roleDefinition) {
      throw new Error(
        `Missing role definition for skill '${skillId}' in .ai-skills/definitions/roles.json`
      );
    }
    const claudeMarkdown = buildSkillMarkdown({
      frontmatter: skillSource.frontmatter,
      platformBody: skillSource.claudeBody,
      platformName: "claude",
      sharedBody: skillSource.sharedBody,
      skillId,
      tokenMap
    });
    const codexMarkdown = buildSkillMarkdown({
      frontmatter: skillSource.frontmatter,
      platformBody: skillSource.codexBody,
      platformName: "codex",
      sharedBody: skillSource.sharedBody,
      skillId,
      tokenMap
    });
    const cursorMarkdown = buildSkillMarkdown({
      frontmatter: skillSource.frontmatter,
      platformBody: skillSource.cursorBody,
      platformName: "cursor",
      sharedBody: skillSource.sharedBody,
      skillId,
      tokenMap
    });
    const claudeSkillRoot = path8.join(targetRoots.claude, skillId);
    const codexSkillRoot = path8.join(targetRoots.codex, skillId);
    const cursorSkillRoot = path8.join(targetRoots.cursor, skillId);
    if (optedIn.claude) {
      await writeFileIfChanged(
        path8.join(claudeSkillRoot, "SKILL.md"),
        claudeMarkdown,
        checkMode2,
        changedPaths2
      );
      await writeFileIfChanged(
        path8.join(claudeSkillRoot, MANAGED_MARKER),
        "Managed by scripts/ai-skills/build.ts\n",
        checkMode2,
        changedPaths2
      );
    }
    if (optedIn.codex) {
      await writeFileIfChanged(
        path8.join(codexSkillRoot, "SKILL.md"),
        codexMarkdown,
        checkMode2,
        changedPaths2
      );
      await writeFileIfChanged(
        path8.join(codexSkillRoot, MANAGED_MARKER),
        "Managed by scripts/ai-skills/build.ts\n",
        checkMode2,
        changedPaths2
      );
      await syncOptionalSkillPayloads(
        path8.join(sourceSkillsRoot, skillId),
        codexSkillRoot,
        checkMode2,
        changedPaths2
      );
    }
    if (optedIn.cursor) {
      await writeFileIfChanged(
        path8.join(cursorSkillRoot, "SKILL.md"),
        cursorMarkdown,
        checkMode2,
        changedPaths2
      );
      await writeFileIfChanged(
        path8.join(cursorSkillRoot, MANAGED_MARKER),
        "Managed by scripts/ai-skills/build.ts\n",
        checkMode2,
        changedPaths2
      );
      await syncOptionalSkillPayloads(
        path8.join(sourceSkillsRoot, skillId),
        cursorSkillRoot,
        checkMode2,
        changedPaths2
      );
    }
    if (optedIn.codexAgents && roleDefinition.type !== "utility") {
      const description = skillSource.frontmatterMap.get("description") ?? `Generated codex agent adapter for ${skillId}.`;
      const codexAgentToml = buildCodexAgentToml({
        codexSkillMarkdown: codexMarkdown,
        description,
        roleDefinition,
        skillId,
        tokenMap
      });
      await writeFileIfChanged(
        path8.join(targetRoots.codexAgents, `${skillId}.toml`),
        codexAgentToml,
        checkMode2,
        changedPaths2
      );
    }
    if (optedIn.claudeAgents && roleDefinition.type !== "utility") {
      const description = skillSource.frontmatterMap.get("description") ?? `Generated claude agent definition for ${skillId}.`;
      const claudeAgentMarkdown = buildClaudeAgentMarkdown({
        claudeSkillMarkdown: claudeMarkdown,
        description,
        skillId,
        tokenMap
      });
      await writeFileIfChanged(
        path8.join(targetRoots.claudeAgents, `${skillId}.md`),
        claudeAgentMarkdown,
        checkMode2,
        changedPaths2
      );
    }
  }
  if (optedIn.codexConfig) {
    const codexConfig = [
      GENERATED_HEADER_LINE,
      "# Source: .ai-skills/definitions/roles.json",
      "# Target: codex-config | Regenerate with: pnpm prism:build",
      "",
      "[agents]",
      "max_threads = 6",
      "max_depth = 1",
      ""
    ].join("\n");
    await writeFileIfChanged(
      codexConfigPath,
      codexConfig,
      checkMode2,
      changedPaths2
    );
  }
  await removeDeletedManagedSkills(
    targetRoots.claude,
    knownSkillIds,
    checkMode2,
    changedPaths2
  );
  await removeDeletedManagedSkills(
    targetRoots.codex,
    knownSkillIds,
    checkMode2,
    changedPaths2
  );
  await removeDeletedManagedSkills(
    targetRoots.cursor,
    knownSkillIds,
    checkMode2,
    changedPaths2
  );
  const agentSkillIds = new Set(
    [...knownSkillIds].filter((id) => roleMap.get(id)?.type !== "utility")
  );
  await removeDeletedManagedAgentFiles(
    targetRoots.codexAgents,
    agentSkillIds,
    ".toml",
    GENERATED_HEADER_LINE,
    checkMode2,
    changedPaths2
  );
  await removeDeletedManagedAgentFiles(
    targetRoots.claudeAgents,
    agentSkillIds,
    ".md",
    GENERATED_MARKDOWN_HEADER_LINE,
    checkMode2,
    changedPaths2
  );
  return { knownSkillIds };
}

// scripts/ai-skills/build.ts
var scriptDirectory = path9.dirname(fileURLToPath(import.meta.url));
var repoRoot = process.env.PRISM_REPO_ROOT ? path9.resolve(process.env.PRISM_REPO_ROOT) : path9.resolve(scriptDirectory, "../..");
var checkMode = process.argv.includes("--check");
var changedPaths = [];
async function loadJsonFile(relativePath, fileLabel) {
  const absolutePath = path9.join(repoRoot, relativePath);
  if (!await pathExists(absolutePath)) {
    throw new Error(`Missing ${fileLabel}: ${absolutePath}`);
  }
  try {
    return JSON.parse(await fs7.readFile(absolutePath, "utf8"));
  } catch (error) {
    throw new Error(
      `Invalid ${fileLabel} JSON at ${absolutePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
var COPIED_CONTENT_AREAS = [
  "rules",
  "architect",
  "spec",
  "templates",
  "references"
];
var COPIED_LOOSE_FILES = ["SPEC.md"];
async function copyContentToPlatformDir(contentRoot, platformDir, checkModeArg, changedPathsArg, tokenMap, dialect = verbatimRuleDialect, targetSubpath = "") {
  for (const area of COPIED_CONTENT_AREAS) {
    const sourceArea = path9.join(contentRoot, area);
    const targetArea = path9.join(platformDir, area, targetSubpath);
    if (!await pathExists(sourceArea)) {
      continue;
    }
    const entries = await listRelativeDirectoryEntries(sourceArea);
    for (const entry of entries) {
      if (entry.kind !== "file") {
        continue;
      }
      const sourcePath = path9.join(sourceArea, entry.relativePath);
      const targetRelativePath = dialect.mapTargetRelativePath(
        area,
        entry.relativePath
      );
      const targetPath = path9.join(targetArea, targetRelativePath);
      await copyContentFileWithSubstitution(
        sourcePath,
        targetPath,
        checkModeArg,
        changedPathsArg,
        tokenMap,
        (content) => dialect.transformContent(area, content)
      );
    }
    await writeFileIfChanged(
      path9.join(targetArea, MANAGED_MARKER),
      "Managed by scripts/ai-skills/build.ts\n",
      checkModeArg,
      changedPathsArg
    );
  }
  if (targetSubpath !== "") {
    return;
  }
  for (const looseFile of COPIED_LOOSE_FILES) {
    const sourcePath = path9.join(contentRoot, looseFile);
    const targetPath = path9.join(platformDir, looseFile);
    if (!await pathExists(sourcePath)) {
      continue;
    }
    await copyContentFileWithSubstitution(
      sourcePath,
      targetPath,
      checkModeArg,
      changedPathsArg,
      tokenMap
    );
  }
}
async function copyContentFileWithSubstitution(sourcePath, targetPath, checkModeArg, changedPathsArg, tokenMap, transformContent = (content) => content) {
  const sourceContent = await fs7.readFile(sourcePath, "utf8");
  const substituted = transformContent(substituteTokens(sourceContent, tokenMap));
  await writeFileIfChanged(
    targetPath,
    substituted,
    checkModeArg,
    changedPathsArg
  );
}
async function syncPlatformContentCopy(contentRoot, platformDir, checkModeArg, changedPathsArg, tokenMap, dialect = verbatimRuleDialect, targetSubpath = "") {
  if (checkModeArg && !await platformHasManagedContent(platformDir, targetSubpath)) {
    return;
  }
  await copyContentToPlatformDir(
    contentRoot,
    platformDir,
    checkModeArg,
    changedPathsArg,
    tokenMap,
    dialect,
    targetSubpath
  );
  await removeDeletedManagedContent(
    contentRoot,
    platformDir,
    checkModeArg,
    changedPathsArg,
    dialect,
    targetSubpath
  );
}
async function syncAllPlatformContentCopies(contentRoot, platformDirs, checkModeArg, changedPathsArg, tokenMap, targetSubpath = "") {
  for (const { dir, dialect } of platformDirs) {
    await syncPlatformContentCopy(
      contentRoot,
      dir,
      checkModeArg,
      changedPathsArg,
      tokenMap,
      dialect,
      targetSubpath
    );
  }
}
async function platformHasManagedContent(platformDir, targetSubpath = "") {
  for (const area of COPIED_CONTENT_AREAS) {
    if (await pathExists(path9.join(platformDir, area, targetSubpath, MANAGED_MARKER))) {
      return true;
    }
  }
  return false;
}
async function skillsRootHasManagedContent(skillsRoot) {
  if (!await pathExists(skillsRoot)) {
    return false;
  }
  const entries = await fs7.readdir(skillsRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) {
      continue;
    }
    if (await pathExists(path9.join(skillsRoot, entry.name, MANAGED_MARKER))) {
      return true;
    }
  }
  return false;
}
async function codexAgentsRootHasManagedContent(agentsRoot) {
  if (!await pathExists(agentsRoot)) {
    return false;
  }
  const entries = await fs7.readdir(agentsRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".toml") || entry.name.startsWith(".")) {
      continue;
    }
    const content = await readFileIfExists(path9.join(agentsRoot, entry.name)) ?? "";
    if (content.startsWith(GENERATED_HEADER_LINE)) {
      return true;
    }
  }
  return false;
}
async function claudeAgentsRootHasManagedContent(agentsRoot) {
  if (!await pathExists(agentsRoot)) {
    return false;
  }
  const entries = await fs7.readdir(agentsRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md") || entry.name.startsWith(".")) {
      continue;
    }
    const content = await readFileIfExists(path9.join(agentsRoot, entry.name)) ?? "";
    if (content.includes(GENERATED_MARKDOWN_HEADER_LINE)) {
      return true;
    }
  }
  return false;
}
async function removeDeletedManagedContent(contentRoot, platformDir, checkModeArg, changedPathsArg, dialect = verbatimRuleDialect, targetSubpath = "") {
  for (const area of COPIED_CONTENT_AREAS) {
    const targetArea = path9.join(platformDir, area, targetSubpath);
    const sourceArea = path9.join(contentRoot, area);
    const markerPath = path9.join(targetArea, MANAGED_MARKER);
    if (!await pathExists(targetArea) || !await pathExists(markerPath)) {
      continue;
    }
    const entries = await listRelativeDirectoryEntries(targetArea);
    for (const entry of entries) {
      if (entry.kind !== "file") {
        continue;
      }
      if (entry.relativePath === MANAGED_MARKER) {
        continue;
      }
      if (targetSubpath === "" && entry.relativePath.startsWith(`custom${path9.sep}`)) {
        continue;
      }
      const sourceRelativePath = dialect.mapSourceRelativePath(
        area,
        entry.relativePath
      );
      const sourcePath = path9.join(sourceArea, sourceRelativePath);
      const sourceExists = await pathExists(sourcePath);
      const sourceMapsBack = dialect.mapTargetRelativePath(area, sourceRelativePath) === entry.relativePath;
      if (sourceExists && sourceMapsBack) {
        continue;
      }
      const targetPath = path9.join(targetArea, entry.relativePath);
      changedPathsArg.push(targetPath);
      if (checkModeArg) {
        continue;
      }
      await fs7.rm(targetPath, { force: true });
    }
    if (!await pathExists(sourceArea)) {
      const overlayMarkerPath = path9.join(
        targetArea,
        "custom",
        MANAGED_MARKER
      );
      if (targetSubpath === "" && await pathExists(overlayMarkerPath)) {
        continue;
      }
      changedPathsArg.push(targetArea);
      if (!checkModeArg) {
        await fs7.rm(targetArea, { force: true, recursive: true });
      }
    }
  }
}
async function syncAgentsMdTier1Block(repoRootArg, checkModeArg, changedPathsArg, tokenMap) {
  const agentsPath = path9.join(repoRootArg, "AGENTS.md");
  if (!await pathExists(agentsPath)) {
    return;
  }
  const current = await fs7.readFile(agentsPath, "utf8");
  const rules = await collectTier1RuleBodies(
    path9.join(repoRootArg, ".prism", "rules"),
    tokenMap
  );
  const block = renderTier1Block(rules);
  const next = replaceTier1Block(current, block);
  if (next === current) {
    return;
  }
  changedPathsArg.push(agentsPath);
  if (!checkModeArg) {
    await fs7.writeFile(agentsPath, next, "utf8");
  }
}
async function checkSeedDrift(contentRoot, seedRoot, curation, changedPathsArg) {
  if (!await pathExists(seedRoot)) {
    return;
  }
  const excludedSet = new Set(curation.excluded);
  const curatedSet = new Set(curation.curated);
  const seedOnlySet = new Set(curation.seedOnly);
  const renames = curation.renames;
  const renameValues = new Set(Object.values(renames));
  for (const area of COPIED_CONTENT_AREAS) {
    const sourceArea = path9.join(contentRoot, area);
    if (!await pathExists(sourceArea)) {
      continue;
    }
    const entries = await listRelativeDirectoryEntries(sourceArea);
    for (const entry of entries) {
      if (entry.kind !== "file") {
        continue;
      }
      const relPath = path9.posix.join(area, entry.relativePath.replace(/\\/g, "/"));
      if (excludedSet.has(relPath)) {
        const seedPath2 = path9.join(seedRoot, relPath);
        if (await pathExists(seedPath2)) {
          changedPathsArg.push(`seed contains excluded file: ${relPath}`);
        }
        continue;
      }
      if (relPath in renames) {
        const renamedRelPath = renames[relPath];
        const renamedSeedPath = path9.join(seedRoot, renamedRelPath);
        if (!await pathExists(renamedSeedPath)) {
          changedPathsArg.push(`seed drift: ${relPath} (expected renamed as ${renamedRelPath})`);
        }
        continue;
      }
      if (curatedSet.has(relPath)) {
        const seedPath2 = path9.join(seedRoot, relPath);
        if (!await pathExists(seedPath2)) {
          changedPathsArg.push(`seed drift: ${relPath} (curated file missing from seed)`);
        }
        continue;
      }
      const seedPath = path9.join(seedRoot, relPath);
      if (!await pathExists(seedPath)) {
        changedPathsArg.push(`seed drift: ${relPath}`);
        continue;
      }
      if (!await filesAreEqual(path9.join(sourceArea, entry.relativePath), seedPath)) {
        changedPathsArg.push(`seed drift: ${relPath}`);
      }
    }
  }
  for (const looseFile of COPIED_LOOSE_FILES) {
    const relPath = looseFile;
    if (excludedSet.has(relPath) || seedOnlySet.has(relPath) || curatedSet.has(relPath)) {
      continue;
    }
    if (relPath in renames) {
      const renamedRelPath = renames[relPath];
      const renamedSeedPath = path9.join(seedRoot, renamedRelPath);
      if (!await pathExists(renamedSeedPath)) {
        changedPathsArg.push(`seed drift: ${relPath} (expected renamed as ${renamedRelPath})`);
      }
      continue;
    }
    const sourcePath = path9.join(contentRoot, looseFile);
    const seedPath = path9.join(seedRoot, looseFile);
    if (!await pathExists(sourcePath)) {
      continue;
    }
    if (!await pathExists(seedPath)) {
      changedPathsArg.push(`seed drift: ${relPath}`);
      continue;
    }
    if (!await filesAreEqual(sourcePath, seedPath)) {
      changedPathsArg.push(`seed drift: ${relPath}`);
    }
  }
  for (const area of COPIED_CONTENT_AREAS) {
    const seedArea = path9.join(seedRoot, area);
    if (!await pathExists(seedArea)) {
      continue;
    }
    const seedEntries = await listRelativeDirectoryEntries(seedArea);
    for (const seedEntry of seedEntries) {
      if (seedEntry.kind !== "file") {
        continue;
      }
      const relPath = path9.posix.join(area, seedEntry.relativePath.replace(/\\/g, "/"));
      if (curatedSet.has(relPath) || seedOnlySet.has(relPath) || renameValues.has(relPath)) {
        continue;
      }
      const canonicalPath = path9.join(contentRoot, relPath);
      if (!await pathExists(canonicalPath)) {
        changedPathsArg.push(`seed orphan: ${relPath}`);
      }
    }
  }
}
async function writeSeedMirror(contentRoot, seedRoot, curation, checkModeArg, changedPathsArg, unclassifiedMirrored) {
  const excludedSet = new Set(curation.excluded);
  const curatedSet = new Set(curation.curated);
  const renames = curation.renames;
  for (const area of COPIED_CONTENT_AREAS) {
    const sourceArea = path9.join(contentRoot, area);
    if (!await pathExists(sourceArea)) {
      continue;
    }
    const entries = await listRelativeDirectoryEntries(sourceArea);
    for (const entry of entries) {
      if (entry.kind !== "file") {
        continue;
      }
      const relPath = path9.posix.join(area, entry.relativePath.replace(/\\/g, "/"));
      if (excludedSet.has(relPath)) {
        continue;
      }
      if (relPath in renames) {
        continue;
      }
      if (curatedSet.has(relPath)) {
        continue;
      }
      const seedFilePath = path9.join(seedRoot, relPath);
      const seedFileIsNew = !await pathExists(seedFilePath);
      const raw = await fs7.readFile(path9.join(sourceArea, entry.relativePath), "utf8");
      await writeFileIfChanged(seedFilePath, raw, checkModeArg, changedPathsArg);
      if (seedFileIsNew) {
        unclassifiedMirrored.push(relPath);
      }
    }
  }
  for (const looseFile of COPIED_LOOSE_FILES) {
    const relPath = looseFile;
    const seedOnlySet = new Set(curation.seedOnly);
    if (excludedSet.has(relPath) || seedOnlySet.has(relPath) || curatedSet.has(relPath)) {
      continue;
    }
    if (relPath in renames) {
      continue;
    }
    const sourcePath = path9.join(contentRoot, looseFile);
    if (!await pathExists(sourcePath)) {
      continue;
    }
    const seedFilePath = path9.join(seedRoot, looseFile);
    const seedFileIsNew = !await pathExists(seedFilePath);
    const raw = await fs7.readFile(sourcePath, "utf8");
    await writeFileIfChanged(seedFilePath, raw, checkModeArg, changedPathsArg);
    if (seedFileIsNew) {
      unclassifiedMirrored.push(relPath);
    }
  }
}
var execFileAsync = promisify(execFile);
async function resolvePrismVersion(repoRootArg) {
  const packageJsonPath = path9.join(repoRootArg, "package.json");
  const raw = await readFileIfExists(packageJsonPath);
  if (raw === null) {
    return "0.0.0";
  }
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed.version === "string" ? parsed.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}
async function resolveSourceCommit(repoRootArg) {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], {
      cwd: repoRootArg
    });
    return stdout.trim() || "unknown";
  } catch {
    return "unknown";
  }
}
async function main() {
  const pathDefinitions = await loadPathDefinitions(repoRoot);
  const roleDefinitions = await loadJsonFile(
    ".ai-skills/definitions/roles.json",
    "roles definitions"
  );
  const seedCuration = await loadJsonFile(
    ".ai-skills/definitions/seed-curation.json",
    "seed curation manifest"
  );
  const config = loadConfig(repoRoot);
  const tokenMap = deriveTokenMap(config);
  const sourceSkillsRoot = path9.join(
    repoRoot,
    pathDefinitions.canonical.skillsRoot
  );
  if (!await pathExists(sourceSkillsRoot)) {
    throw new Error(
      `Missing canonical skill source directory: ${sourceSkillsRoot}`
    );
  }
  const targetRoots = {
    claude: path9.join(repoRoot, pathDefinitions.generated.claudeSkillsRoot),
    claudeAgents: path9.join(
      repoRoot,
      pathDefinitions.generated.claudeAgentsRoot
    ),
    codex: path9.join(repoRoot, pathDefinitions.generated.codexSkillsRoot),
    codexAgents: path9.join(repoRoot, pathDefinitions.generated.codexAgentsRoot),
    cursor: path9.join(repoRoot, pathDefinitions.generated.cursorSkillsRoot)
  };
  const codexConfigPath = path9.join(
    repoRoot,
    pathDefinitions.generated.codexConfigFile
  );
  const optedIn = {
    claude: !checkMode || await skillsRootHasManagedContent(targetRoots.claude),
    // `.agents/` is gitignored (the per-user Codex skills root), so a branch
    // checkout leaves prior-branch content in place. In check mode that stale
    // content would make skillsRootHasManagedContent return true, causing
    // drift against the freshly-generated output — a false positive. Build
    // mode still writes `.agents/` normally.
    codex: !checkMode,
    cursor: !checkMode || await skillsRootHasManagedContent(targetRoots.cursor),
    codexAgents: !checkMode || await codexAgentsRootHasManagedContent(targetRoots.codexAgents),
    claudeAgents: !checkMode || await claudeAgentsRootHasManagedContent(targetRoots.claudeAgents),
    // `.codex/codex-config.toml` is gitignored (per-user), so a branch
    // checkout leaves prior-branch content on disk. Skipping the pathExists
    // check in check mode prevents stale presence from being treated as drift.
    codexConfig: !checkMode
  };
  if (!checkMode) {
    for (const targetRoot of Object.values(targetRoots)) {
      await ensureDirectory(targetRoot);
    }
  }
  const roleMap = buildRoleMap(roleDefinitions);
  await generatePlatformSkills({
    sourceSkillsRoot,
    targetRoots,
    codexConfigPath,
    roleMap,
    tokenMap,
    optedIn,
    checkMode,
    changedPaths
  });
  const contentRoot = path9.join(repoRoot, pathDefinitions.canonical.contentRoot);
  const templatesContentRoot = path9.join(
    repoRoot,
    pathDefinitions.canonical.templatesContentRoot
  );
  const guardedRoots = [
    {
      absolutePath: contentRoot,
      relativeLabel: pathDefinitions.canonical.contentRoot
    },
    {
      absolutePath: templatesContentRoot,
      relativeLabel: pathDefinitions.canonical.templatesContentRoot
    }
  ];
  let totalViolations = 0;
  for (const guardedRoot of guardedRoots) {
    if (!await pathExists(guardedRoot.absolutePath)) {
      continue;
    }
    const violations = await runPathGuard(guardedRoot.absolutePath);
    if (violations.length === 0) {
      continue;
    }
    for (const violation of violations) {
      console.error(
        `path-guard: ${guardedRoot.relativeLabel}/${violation.relativePath}:${violation.line}: ${violation.text}`
      );
    }
    console.error(
      `path-guard: ${violations.length} violation(s) found in ${guardedRoot.relativeLabel}/. Canonical content must reference .prism/<area>/ paths, not platform-dir build copies.`
    );
    totalViolations += violations.length;
  }
  if (totalViolations > 0) {
    process.exit(1);
  }
  if (await pathExists(contentRoot)) {
    const platformDirs = buildPlatformDirs(repoRoot, pathDefinitions);
    await syncAllPlatformContentCopies(
      contentRoot,
      platformDirs,
      checkMode,
      changedPaths,
      tokenMap
    );
    if (!checkMode) {
      const syncManifest = await generateSyncManifest(contentRoot, {
        prismVersion: await resolvePrismVersion(repoRoot),
        sourceCommit: await resolveSourceCommit(repoRoot),
        generatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      await writeSyncManifest(contentRoot, syncManifest, false, changedPaths);
    }
  }
  const unclassifiedMirrored = [];
  if (!checkMode && await pathExists(contentRoot)) {
    await writeSeedMirror(
      contentRoot,
      templatesContentRoot,
      seedCuration,
      checkMode,
      changedPaths,
      unclassifiedMirrored
    );
  }
  await syncAgentsMdTier1Block(repoRoot, checkMode, changedPaths, tokenMap);
  const literalGuardRoots = [
    targetRoots.claude,
    targetRoots.claudeAgents,
    targetRoots.codex,
    targetRoots.cursor,
    targetRoots.codexAgents,
    path9.join(repoRoot, pathDefinitions.generated.platformContentCopies.claude),
    path9.join(repoRoot, pathDefinitions.generated.platformContentCopies.codex),
    path9.join(repoRoot, pathDefinitions.generated.platformContentCopies.cursor)
  ];
  const literalViolations = await runLiteralGuard(repoRoot, literalGuardRoots);
  if (literalViolations.length > 0) {
    for (const violation of literalViolations) {
      console.error(
        `literal-guard: ${violation.relativePath}:${violation.line}: ${violation.match}`
      );
    }
    console.error(
      `literal-guard: ${literalViolations.length} non-allowlisted Thrive-flavored literal(s) found in platform outputs. Tokenize the canonical source or add the file to .ai-skills/definitions/literal-allowlist.json.`
    );
    process.exit(1);
  }
  const leftoverTokenViolations = await runLeftoverTokenGuard(
    repoRoot,
    literalGuardRoots
  );
  if (leftoverTokenViolations.length > 0) {
    for (const violation of leftoverTokenViolations) {
      console.error(
        `leftover-token-guard: ${violation.relativePath}:${violation.line}: ${violation.match}`
      );
    }
    console.error(
      `leftover-token-guard: ${leftoverTokenViolations.length} unresolved \${TOKEN} literal(s) found in platform outputs. Add the token to the build's token map or fix the canonical source.`
    );
    process.exit(1);
  }
  if (checkMode) {
    await checkSeedDrift(contentRoot, templatesContentRoot, seedCuration, changedPaths);
    if (changedPaths.length > 0) {
      console.error("prism:check failed. These files are out of sync:");
      for (const changedPath of changedPaths) {
        const displayPath = path9.isAbsolute(changedPath) ? path9.relative(repoRoot, changedPath) : changedPath;
        console.error(` - ${displayPath}`);
      }
      process.exit(1);
    }
    console.log("prism:check passed. Generated outputs are in sync.");
    return;
  }
  if (unclassifiedMirrored.length > 0) {
    console.warn(
      `prism:build auto-mirrored ${unclassifiedMirrored.length} unclassified file(s) to the install seed as non-curated:`
    );
    for (const relPath of unclassifiedMirrored) {
      console.warn(` - ${relPath}`);
    }
    console.warn(
      "If any of these should be curated (consumer-facing simplified) or excluded (dogfood-only), add them to .ai-skills/definitions/seed-curation.json and rebuild."
    );
  }
  if (changedPaths.length === 0) {
    console.log("prism:build completed. No changes needed.");
    return;
  }
  console.log(`prism:build completed. Updated ${changedPaths.length} file(s):`);
  for (const changedPath of changedPaths) {
    console.log(` - ${path9.relative(repoRoot, changedPath)}`);
  }
}
var invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === path9.resolve(process.argv[1]);
if (invokedDirectly) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

// scripts/ai-skills/verify-manifest-coverage.ts
import fs8 from "node:fs/promises";
import path10 from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";
var scriptDirectory2 = path10.dirname(fileURLToPath2(import.meta.url));
var repoRoot2 = process.env.PRISM_REPO_ROOT ? path10.resolve(process.env.PRISM_REPO_ROOT) : path10.resolve(scriptDirectory2, "../..");
var SKILLS_ECOSYSTEM_DOC = "_toolkit/skills-ecosystem.md";
var PERSONA_SCOPES = [
  {
    name: "nora",
    files: [
      ".claude/skills/prism-ticket-start/SKILL.md",
      ".prism/plans/chore-manifest-hygiene-dev-doc.md"
    ]
  },
  {
    name: "zoe",
    files: [
      ".claude/skills/prism-surface-audit/SKILL.md",
      ".prism/lessons.md",
      ".prism/spec/adrs/_toolkit/0035-rule-loading-tiers.md"
    ]
  },
  {
    name: "winston",
    files: [".claude/skills/prism-architect/SKILL.md"]
  },
  {
    name: "eric",
    files: [".claude/skills/prism-code-review-pr/SKILL.md"]
  },
  {
    name: "sage",
    files: [".claude/skills/prism-changelog/SKILL.md"]
  },
  {
    name: "fallthrough",
    files: ["package.json"]
  }
];
var EXPECTED_POSITIVES = /* @__PURE__ */ new Set([
  "nora",
  "zoe",
  "winston",
  "eric",
  "sage"
]);
function compileMatcher(pattern) {
  if (!pattern.includes("*") && !pattern.endsWith("/")) {
    return (filePath) => filePath === pattern;
  }
  if (pattern.endsWith("/") && !pattern.includes("*")) {
    const prefix = pattern;
    const exact = pattern.slice(0, -1);
    return (filePath) => filePath === exact || filePath.startsWith(prefix);
  }
  const doubleStarToken = String.fromCharCode(0) + "DOUBLE_STAR" + String.fromCharCode(0);
  const regexBody = pattern.replace(/\*\*/g, doubleStarToken).replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*").split(doubleStarToken).join(".*");
  const regex = new RegExp(`^${regexBody}$`);
  return (filePath) => regex.test(filePath);
}
function loadedDocsForScope(manifest, scope) {
  const docs = /* @__PURE__ */ new Set();
  const compiledEntries = Object.entries(manifest).map(
    ([pattern, docOrDocs]) => ({
      matcher: compileMatcher(pattern),
      docs: Array.isArray(docOrDocs) ? docOrDocs : [docOrDocs]
    })
  );
  for (const file of scope) {
    for (const { matcher, docs: entryDocs } of compiledEntries) {
      if (matcher(file)) {
        for (const doc of entryDocs) {
          docs.add(doc);
        }
      }
    }
  }
  return Array.from(docs).sort();
}
function findMissingCoverage(result) {
  const failures = [];
  for (const persona of EXPECTED_POSITIVES) {
    if (!result[persona]?.includes(SKILLS_ECOSYSTEM_DOC)) {
      failures.push(
        `${persona} expected to load ${SKILLS_ECOSYSTEM_DOC} but it is missing from its loaded docs.`
      );
    }
  }
  return failures;
}
async function main2() {
  const manifestPath = path10.join(
    repoRoot2,
    ".prism",
    "architect",
    "manifest.json"
  );
  const raw = await fs8.readFile(manifestPath, "utf8");
  const manifest = JSON.parse(raw);
  const result = {};
  for (const persona of PERSONA_SCOPES) {
    result[persona.name] = loadedDocsForScope(manifest, persona.files);
  }
  console.log(JSON.stringify(result, null, 2));
  const failures = findMissingCoverage(result);
  if (failures.length > 0) {
    console.error("\nverify-manifest-coverage failed:");
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    process.exit(1);
  }
}
var invokedDirectly2 = process.argv[1] && fileURLToPath2(import.meta.url) === path10.resolve(process.argv[1]);
if (invokedDirectly2) {
  main2().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

// scripts/ai-skills/ownership.ts
var PRISM_OWNED_GLOBS = [
  "architect/_toolkit/**",
  "spec/adrs/_toolkit/**",
  "rules/**",
  "templates/**",
  "references/**",
  "spec/**",
  "SPEC.md"
];
var CONSUMER_OWNED_GLOBS = [
  "architect/*.md",
  "spec/adrs/*.md",
  "architect/manifest.json",
  "custom/**",
  "plans/**",
  "lessons.md"
];
var ownedMatchers = PRISM_OWNED_GLOBS.map((glob) => compileMatcher(glob));
var consumerMatchers = CONSUMER_OWNED_GLOBS.map(
  (glob) => compileMatcher(glob)
);
function classifyPath(relativePath) {
  if (consumerMatchers.some((matches) => matches(relativePath))) {
    return "consumer";
  }
  if (ownedMatchers.some((matches) => matches(relativePath))) {
    return "prism";
  }
  return "unknown";
}

// scripts/ai-skills/sync-manifest.ts
var SYNC_MANIFEST_FILENAME = ".sync-manifest.json";
async function listPrismOwnedRelativePaths(prismContentRoot) {
  const entries = await listRelativeDirectoryEntries(prismContentRoot);
  return entries.filter((entry) => entry.kind === "file").map((entry) => entry.relativePath.split(path11.sep).join("/")).filter((relativePath) => classifyPath(relativePath) === "prism").sort((a, b) => a.localeCompare(b));
}
async function generateSyncManifest(prismContentRoot, options) {
  const relativePaths = await listPrismOwnedRelativePaths(prismContentRoot);
  const files = {};
  for (const relativePath of relativePaths) {
    const absolutePath = path11.join(prismContentRoot, relativePath);
    files[relativePath] = { contentHash: await hashFile(absolutePath) };
  }
  return {
    prismVersion: options.prismVersion,
    sourceCommit: options.sourceCommit,
    generatedAt: options.generatedAt,
    files
  };
}
async function loadSyncManifest(consumerContentRoot) {
  const manifestPath = path11.join(consumerContentRoot, SYNC_MANIFEST_FILENAME);
  const raw = await readFileIfExists(manifestPath);
  if (raw === null) {
    return null;
  }
  return JSON.parse(raw);
}
async function writeSyncManifest(prismContentRoot, manifest, checkMode2, changedPaths2) {
  const manifestPath = path11.join(prismContentRoot, SYNC_MANIFEST_FILENAME);
  const serialized = `${JSON.stringify(manifest, null, "	")}
`;
  const previous = await readFileIfExists(manifestPath);
  if (previous === serialized) {
    return;
  }
  changedPaths2.push(manifestPath);
  if (checkMode2) {
    return;
  }
  await fs9.writeFile(manifestPath, serialized, "utf8");
}

// scripts/ai-skills/update.ts
import fs10 from "node:fs/promises";
import { readFileSync } from "node:fs";
import path12 from "node:path";
import { fileURLToPath as fileURLToPath3 } from "node:url";
async function hashFileIfExists(filePath) {
  if (!await pathExists(filePath)) {
    return null;
  }
  return hashFile(filePath);
}
async function backupConsumerFile(absolutePath) {
  const sourceHash = await hashFile(absolutePath);
  let candidate = `${absolutePath}.bak`;
  let suffix = 0;
  while (await pathExists(candidate)) {
    if (await hashFile(candidate) === sourceHash) {
      return candidate;
    }
    suffix += 1;
    candidate = `${absolutePath}.bak.${suffix}`;
  }
  await fs10.copyFile(absolutePath, candidate);
  return candidate;
}
async function writeIncoming(incomingAbsolute, consumerAbsolute) {
  await fs10.mkdir(path12.dirname(consumerAbsolute), { recursive: true });
  await fs10.copyFile(incomingAbsolute, consumerAbsolute);
}
async function applyIncomingFile(relativePath, prismContentRoot, consumerContentRoot, recordedHash) {
  const incomingAbsolute = path12.join(prismContentRoot, relativePath);
  const consumerAbsolute = path12.join(consumerContentRoot, relativePath);
  const incomingHash = await hashFile(incomingAbsolute);
  const consumerHash = await hashFileIfExists(consumerAbsolute);
  if (consumerHash === null) {
    await writeIncoming(incomingAbsolute, consumerAbsolute);
    return { relativePath, action: "written" };
  }
  if (consumerHash === incomingHash) {
    return { relativePath, action: "no-op" };
  }
  if (recordedHash !== null && consumerHash === recordedHash) {
    await writeIncoming(incomingAbsolute, consumerAbsolute);
    return { relativePath, action: "overwritten" };
  }
  const backupPath = await backupConsumerFile(consumerAbsolute);
  await writeIncoming(incomingAbsolute, consumerAbsolute);
  return { relativePath, action: "backed-up", backupPath };
}
async function applyDeletedFile(relativePath, consumerContentRoot, recordedHash) {
  const consumerAbsolute = path12.join(consumerContentRoot, relativePath);
  const consumerHash = await hashFileIfExists(consumerAbsolute);
  if (consumerHash === null) {
    return { relativePath, action: "no-op" };
  }
  if (consumerHash === recordedHash) {
    await fs10.rm(consumerAbsolute);
    return { relativePath, action: "removed" };
  }
  const backupPath = await backupConsumerFile(consumerAbsolute);
  await fs10.rm(consumerAbsolute);
  return { relativePath, action: "removed-with-backup", backupPath };
}
async function applyFilePass(prismContentRoot, consumerContentRoot, preloadedManifest) {
  const incomingRelativePaths = await listPrismOwnedRelativePaths(prismContentRoot);
  const incomingSet = new Set(incomingRelativePaths);
  const consumerManifest = preloadedManifest !== void 0 ? preloadedManifest : await loadSyncManifest(consumerContentRoot);
  const recordedHashes = /* @__PURE__ */ new Map();
  if (consumerManifest) {
    for (const [relativePath, entry] of Object.entries(
      consumerManifest.files
    )) {
      recordedHashes.set(relativePath, entry.contentHash);
    }
  }
  const outcomes = [];
  for (const relativePath of incomingRelativePaths) {
    if (classifyPath(relativePath) !== "prism") {
      continue;
    }
    outcomes.push(
      await applyIncomingFile(
        relativePath,
        prismContentRoot,
        consumerContentRoot,
        recordedHashes.get(relativePath) ?? null
      )
    );
  }
  for (const [relativePath, recordedHash] of recordedHashes) {
    if (incomingSet.has(relativePath)) {
      continue;
    }
    if (classifyPath(relativePath) !== "prism") {
      continue;
    }
    outcomes.push(
      await applyDeletedFile(relativePath, consumerContentRoot, recordedHash)
    );
  }
  await rewriteConsumerManifest(
    prismContentRoot,
    consumerContentRoot,
    consumerManifest
  );
  const backups = outcomes.filter((outcome) => outcome.backupPath !== void 0).map((outcome) => outcome.backupPath);
  return { outcomes, backups };
}
async function runUpdate(options) {
  const {
    prismRepoRoot,
    consumerRepoRoot,
    prismContentRoot,
    consumerContentRoot
  } = options;
  const tokenMap = deriveTokenMap(loadConfig(consumerRepoRoot));
  const consumerPathDefinitions = await loadPathDefinitions(consumerRepoRoot);
  const platformDirs = buildPlatformDirs(
    consumerRepoRoot,
    consumerPathDefinitions
  );
  const overlayContentRoot = path12.join(consumerContentRoot, OVERLAY_SUBPATH);
  const consumerManifest = await loadSyncManifest(consumerContentRoot);
  const pendingDeletionCount = consumerManifest ? Object.keys(consumerManifest.files).filter(
    (p) => classifyPath(p) === "prism"
  ).length : 0;
  await assertSourceIsPlausible(prismContentRoot, pendingDeletionCount);
  const summary = await applyFilePass(
    prismContentRoot,
    consumerContentRoot,
    consumerManifest
  );
  await refreshPlatformDirs(
    consumerContentRoot,
    overlayContentRoot,
    platformDirs,
    tokenMap
  );
  await refreshPlatformSkills(
    prismRepoRoot,
    consumerRepoRoot,
    consumerPathDefinitions,
    tokenMap
  );
  return summary;
}
async function rewriteConsumerManifest(prismContentRoot, consumerContentRoot, previousConsumerManifest) {
  const sourceManifest = await loadSyncManifest(prismContentRoot);
  const generated = await generateSyncManifest(prismContentRoot, {
    prismVersion: sourceManifest?.prismVersion ?? previousConsumerManifest?.prismVersion ?? "0.0.0",
    sourceCommit: sourceManifest?.sourceCommit ?? "unknown",
    generatedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  const manifestPath = path12.join(consumerContentRoot, SYNC_MANIFEST_FILENAME);
  const serialized = `${JSON.stringify(generated, null, "	")}
`;
  await fs10.writeFile(manifestPath, serialized, "utf8");
}
function resolveConsumerSkillTargetRoots(consumerRepoRoot, pathDefinitions) {
  const { generated } = pathDefinitions;
  return {
    targetRoots: {
      claude: path12.join(consumerRepoRoot, generated.claudeSkillsRoot),
      claudeAgents: path12.join(consumerRepoRoot, generated.claudeAgentsRoot),
      codex: path12.join(consumerRepoRoot, generated.codexSkillsRoot),
      codexAgents: path12.join(consumerRepoRoot, generated.codexAgentsRoot),
      cursor: path12.join(consumerRepoRoot, generated.cursorSkillsRoot)
    },
    codexConfigPath: path12.join(consumerRepoRoot, generated.codexConfigFile)
  };
}
async function refreshPlatformSkills(prismRepoRoot, consumerRepoRoot, consumerPathDefinitions, tokenMap) {
  const sourceSkillsRoot = path12.join(prismRepoRoot, ".ai-skills", "skills");
  if (!await pathExists(sourceSkillsRoot)) {
    throw new Error(
      `PRISM source has no skill directory at ${sourceSkillsRoot}.`
    );
  }
  const rolesPath = path12.join(
    prismRepoRoot,
    ".ai-skills",
    "definitions",
    "roles.json"
  );
  const rolesRaw = await readFileIfExists(rolesPath);
  if (rolesRaw === null) {
    throw new Error(`PRISM source has no roles definition at ${rolesPath}.`);
  }
  let roleDefinitions;
  try {
    roleDefinitions = JSON.parse(rolesRaw);
  } catch (error) {
    throw new Error(
      `Invalid roles definitions JSON at ${rolesPath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  const roleMap = buildRoleMap(roleDefinitions);
  const { targetRoots, codexConfigPath } = resolveConsumerSkillTargetRoots(
    consumerRepoRoot,
    consumerPathDefinitions
  );
  const changedPaths2 = [];
  await generatePlatformSkills({
    sourceSkillsRoot,
    targetRoots,
    codexConfigPath,
    roleMap,
    tokenMap,
    optedIn: {
      claude: true,
      codex: true,
      cursor: true,
      codexAgents: true,
      claudeAgents: true,
      codexConfig: true
    },
    checkMode: false,
    changedPaths: changedPaths2
  });
  const leftoverTokenViolations = await runLeftoverTokenGuard(consumerRepoRoot, [
    targetRoots.claude,
    targetRoots.claudeAgents,
    targetRoots.codex,
    targetRoots.codexAgents,
    targetRoots.cursor
  ]);
  if (leftoverTokenViolations.length > 0) {
    const detail = leftoverTokenViolations.map((v) => `  ${v.relativePath}:${v.line}: ${v.match}`).join("\n");
    throw new Error(
      `prism:update: ${leftoverTokenViolations.length} unresolved \${TOKEN} literal(s) in rendered persona skills:
${detail}`
    );
  }
}
var OVERLAY_SUBPATH = "custom";
async function refreshPlatformDirs(consumerContentRoot, overlayContentRoot, platformDirs, tokenMap) {
  await syncAllPlatformContentCopies(
    consumerContentRoot,
    platformDirs,
    false,
    [],
    tokenMap
  );
  if (await pathExists(overlayContentRoot)) {
    await syncAllPlatformContentCopies(
      overlayContentRoot,
      platformDirs,
      false,
      [],
      tokenMap,
      OVERLAY_SUBPATH
    );
  }
}
function findPrismPackageRoot(startFile) {
  const EXPECTED_NAME = "@huntermcgrew/prism";
  let dir = path12.dirname(startFile);
  while (true) {
    const pkgPath = path12.join(dir, "package.json");
    try {
      const raw = readFileSync(pkgPath, "utf8");
      const pkg = JSON.parse(raw);
      if (pkg.name === EXPECTED_NAME) {
        return dir;
      }
    } catch {
    }
    const parent = path12.dirname(dir);
    if (parent === dir) {
      throw new Error(
        `findPrismPackageRoot: reached filesystem root without finding a package.json named "${EXPECTED_NAME}" \u2014 started from ${startFile}`
      );
    }
    dir = parent;
  }
}
function resolveSelfPrismSource() {
  const thisFile = fileURLToPath3(import.meta.url);
  return findPrismPackageRoot(thisFile);
}
function resolvePrismSource(argv, consumerRepoRoot) {
  const flagIndex = argv.indexOf("--prism-source");
  if (flagIndex !== -1 && argv[flagIndex + 1]) {
    return path12.resolve(argv[flagIndex + 1]);
  }
  const inlineFlag = argv.find((arg) => arg.startsWith("--prism-source="));
  if (inlineFlag) {
    return path12.resolve(inlineFlag.slice("--prism-source=".length));
  }
  const configured = loadConfig(consumerRepoRoot).prismSource;
  if (typeof configured === "string" && configured.length > 0) {
    return path12.resolve(consumerRepoRoot, configured);
  }
  return resolveSelfPrismSource();
}
async function assertSourceIsPlausible(prismContentRoot, pendingDeletionCount) {
  const ownedPaths = await listPrismOwnedRelativePaths(prismContentRoot);
  if (ownedPaths.length === 0) {
    throw new Error(
      `prism:update: --prism-source looks empty (${prismContentRoot}) \u2014 refusing ${pendingDeletionCount} deletion(s)`
    );
  }
}
async function runUpdateCli() {
  const argv = process.argv.slice(2);
  const consumerRepoRoot = resolveConsumerRoot({
    explicitConsumer: parseConsumerFlag(argv),
    cwd: process.cwd(),
    selfPrismRoot: resolveSelfPrismSource()
  });
  const prismRepoRoot = resolvePrismSource(argv, consumerRepoRoot);
  if (prismRepoRoot === null) {
    throw new Error(
      'prism:update needs a PRISM source. Pass --prism-source <path-to-prism-repo>, or add a "prismSource" field to .ai-skills/config.json pointing at your local PRISM checkout.'
    );
  }
  if (path12.resolve(prismRepoRoot) === path12.resolve(consumerRepoRoot)) {
    throw new Error(
      "prism:update refuses to run when the source is the consumer itself. That is prism:build \u2014 run `pnpm prism:build` instead."
    );
  }
  const prismContentRoot = path12.join(prismRepoRoot, ".prism");
  const consumerContentRoot = path12.join(consumerRepoRoot, ".prism");
  if (!await pathExists(prismContentRoot)) {
    throw new Error(
      `PRISM source has no .prism/ directory at ${prismContentRoot}.`
    );
  }
  const summary = await runUpdate({
    prismRepoRoot,
    consumerRepoRoot,
    prismContentRoot,
    consumerContentRoot
  });
  reportSummary(summary);
}
function reportSummary(summary) {
  const counts = summary.outcomes.reduce(
    (acc, outcome) => {
      acc[outcome.action] = (acc[outcome.action] ?? 0) + 1;
      return acc;
    },
    {}
  );
  const parts = Object.entries(counts).map(([action, count]) => `${count} ${action}`).join(", ");
  console.log(`prism:update complete \u2014 ${parts || "no changes"}.`);
  if (summary.backups.length > 0) {
    console.log(
      `Preserved ${summary.backups.length} diverged file(s) as .bak:`
    );
    for (const backup of summary.backups) {
      console.log(`  ${backup}`);
    }
  }
}
var isMain = process.argv[1] && fileURLToPath3(import.meta.url) === path12.resolve(process.argv[1]);
if (isMain) {
  runUpdateCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

// scripts/ai-skills/adopt.ts
async function seedConsumerContentRoot(installSeedRoot, consumerContentRoot) {
  const written = [];
  const skipped = [];
  await walkAndSeed(installSeedRoot, installSeedRoot, consumerContentRoot, written, skipped);
  return { written, skipped };
}
async function walkAndSeed(seedRoot, currentDir, consumerContentRoot, written, skipped) {
  const entries = await fs11.readdir(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const seedAbsolute = path13.join(currentDir, entry.name);
    const relativePath = path13.relative(seedRoot, seedAbsolute).split(path13.sep).join("/");
    const consumerAbsolute = path13.join(consumerContentRoot, relativePath);
    if (entry.isDirectory()) {
      await walkAndSeed(seedRoot, seedAbsolute, consumerContentRoot, written, skipped);
    } else if (entry.isFile()) {
      if (await pathExists(consumerAbsolute)) {
        skipped.push(relativePath);
      } else {
        await ensureDirectory(path13.dirname(consumerAbsolute));
        await fs11.copyFile(seedAbsolute, consumerAbsolute);
        written.push(relativePath);
      }
    }
  }
}
async function assertConsumerIsEstablished(consumerContentRoot) {
  const manifest = await loadSyncManifest(consumerContentRoot);
  if (manifest !== null) {
    throw new Error(
      "prism:adopt: this repo already has a PRISM baseline \u2014 run pnpm prism:update for steady-state."
    );
  }
}
async function runAdopt(options) {
  const { prismSourceRoot, consumerRepoRoot } = options;
  const installSeedRoot = path13.join(prismSourceRoot, "templates", "install", ".prism");
  const consumerContentRoot = path13.join(consumerRepoRoot, ".prism");
  const prismContentRoot = path13.join(prismSourceRoot, ".prism");
  await assertConsumerIsEstablished(consumerContentRoot);
  const seed = await seedConsumerContentRoot(installSeedRoot, consumerContentRoot);
  const update = await runUpdate({
    prismRepoRoot: prismSourceRoot,
    consumerRepoRoot,
    prismContentRoot,
    consumerContentRoot
  });
  return { seed, update };
}
async function runAdoptCli() {
  const argv = process.argv.slice(2);
  const consumerRepoRoot = resolveConsumerRoot({
    explicitConsumer: parseConsumerFlag(argv),
    cwd: process.cwd(),
    selfPrismRoot: resolveSelfPrismSource()
  });
  const prismRepoRoot = resolvePrismSource(argv, consumerRepoRoot);
  if (prismRepoRoot === null) {
    throw new Error(
      'prism:adopt needs a PRISM source. Pass --prism-source <path-to-prism-repo>, or add a "prismSource" field to .ai-skills/config.json pointing at your local PRISM checkout.'
    );
  }
  const summary = await runAdopt({ prismSourceRoot: prismRepoRoot, consumerRepoRoot });
  reportSummary2(summary);
}
function reportSummary2(summary) {
  const { seed, update } = summary;
  if (seed.written.length > 0) {
    console.log(`prism:adopt seeded ${seed.written.length} file(s) from install surface.`);
  }
  if (seed.skipped.length > 0) {
    console.log(
      `prism:adopt skipped ${seed.skipped.length} existing file(s) during seed.`
    );
  }
  const counts = update.outcomes.reduce(
    (acc, outcome) => {
      acc[outcome.action] = (acc[outcome.action] ?? 0) + 1;
      return acc;
    },
    {}
  );
  const parts = Object.entries(counts).map(([action, count]) => `${count} ${action}`).join(", ");
  console.log(`prism:adopt sync complete \u2014 ${parts || "no changes"}.`);
  if (update.backups.length > 0) {
    console.log(
      `Preserved ${update.backups.length} diverged file(s) as .bak:`
    );
    for (const backup of update.backups) {
      console.log(`  ${backup}`);
    }
  }
}
var isMain2 = process.argv[1] && fileURLToPath4(import.meta.url) === path13.resolve(process.argv[1]);
if (isMain2) {
  runAdoptCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

// scripts/ai-skills/cli.ts
var USAGE = `prism \u2014 PRISM consumer CLI

Usage:
  prism adopt    Seed .prism/ and project the persona roster into this repo (first run)
  prism update   Pull PRISM's latest canonical content into this repo (steady-state)

Run from your consumer repo root. PRISM source is auto-derived from the linked
PRISM checkout; pass --prism-source <path> to override.

Pass --consumer <path> to target a specific consumer repo (defaults to the
current repo, or \u2014 when run from inside a vendored PRISM \u2014 the repo that
contains PRISM).`;
async function main3() {
  const subcommand = process.argv[2];
  switch (subcommand) {
    case "adopt":
      await runAdoptCli();
      break;
    case "update":
      await runUpdateCli();
      break;
    case "--help":
    case "-h":
    case void 0:
      console.log(USAGE);
      break;
    default:
      console.error(`prism: unknown subcommand "${subcommand}"
`);
      console.error(USAGE);
      process.exit(1);
  }
}
main3().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
