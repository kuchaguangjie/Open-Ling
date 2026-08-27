import { access, readFile, readdir } from "node:fs/promises";
import { basename, extname, relative, resolve } from "node:path";

const projectRoot = process.cwd();

const requiredFiles = [
  "LICENSE",
  "TRADEMARKS.md",
  "ASSETS_LICENSE.md",
  "THIRD_PARTY_NOTICES.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "GOVERNANCE.md",
  "CODE_OF_CONDUCT.md",
  "docs/open-source-release-checklist.md",
  "docs/asset-rights-release-record.md",
  "assets/ASSET_SOURCES.md",
  "assets/models/voice/x-asr-zh-en-punct-int8-480ms-2026-06-05/LICENSE-APACHE-2.0.txt",
  "packages/core/src/prompts/LICENSE.md"
];

const excludedPaths = [
  "docs/prompts/current-prompt-review.md",
  "packages/core/src/prompts/counselor-cores/linleshui/identity-and-orientation-candidates.md",
  "packages/core/src/prompts/counselor-cores/linleshui/linleshui-core-full-candidate.md",
  "packages/core/src/prompts/counselor-cores/linleshui/source-distillation-buddho-daoist.md",
  "packages/core/src/prompts/counselor-cores/linleshui/source-distillation-liu-yiming.md",
  "scripts/export-current-prompts.mjs",
  "scripts/export-safety-audit-markdown.mjs",
  "scripts/run-context-crisis-audit.ts",
  "scripts/run-extreme-safety-audit.ts",
  "scripts/run-language-routing-audit.ts",
  "scripts/run-long-crisis-audit.ts"
];

const excludedDirectories = ["docs/qa"];

const scanIgnoredDirectories = new Set([
  ".git",
  ".vite",
  "build",
  "coverage",
  "dist",
  "dist-electron",
  "node_modules",
  "release"
]);

const privateFileNames = new Set([".env"]);
const approvedPublicEmailAddresses = new Set(["openling@xiaoqunpsy.cn"]);
const privateFileExtensions = new Set([
  ".db",
  ".key",
  ".mobileprovision",
  ".p12",
  ".pem",
  ".pfx",
  ".sqlite",
  ".sqlite3"
]);

const textFileExtensions = new Set([
  "",
  ".cjs",
  ".css",
  ".cts",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".mts",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml"
]);

const secretPatterns = [
  { label: "private key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
  { label: "AWS access key", pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { label: "GitHub token", pattern: /\b(?:gh[pousr]_[A-Za-z0-9_]{30,}|github_pat_[A-Za-z0-9_]{20,})\b/ },
  { label: "OpenAI-style API key", pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { label: "Slack token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/ },
  { label: "Google API key", pattern: /\bAIza[0-9A-Za-z_-]{30,}\b/ },
  { label: "Stripe live key", pattern: /\bsk_live_[0-9A-Za-z]{20,}\b/ }
];

const localPathPatterns = [
  /\/Users\/[^/\s]+\//,
  /[A-Za-z]:\\Users\\[^\\\s]+\\/
];

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

const errors = [];
for (const file of requiredFiles) {
  if (!(await exists(file))) errors.push(`Missing required public file: ${file}`);
}
for (const file of excludedPaths) {
  if (await exists(file)) errors.push(`Private research path is present: ${file}`);
}
for (const directory of excludedDirectories) {
  if (await directoryHasFiles(directory)) errors.push(`Private research directory contains files: ${directory}`);
}

for await (const file of walkPublicFiles(projectRoot)) {
  const relativePath = relative(projectRoot, file);
  const fileName = basename(file);
  const extension = extname(fileName).toLowerCase();
  if (privateFileNames.has(fileName) || privateFileExtensions.has(extension)) {
    errors.push(`Private or credential file is present: ${relativePath}`);
    continue;
  }
  if (!textFileExtensions.has(extension)) continue;
  const content = await readFile(file, "utf8");
  for (const secret of secretPatterns) {
    if (secret.pattern.test(content)) {
      errors.push(`Possible ${secret.label} is present in: ${relativePath}`);
    }
  }
  if (localPathPatterns.some((pattern) => pattern.test(content))) {
    errors.push(`Local user path is present in: ${relativePath}`);
  }
  for (const match of content.matchAll(emailPattern)) {
    const address = match[0].toLowerCase();
    if (!approvedPublicEmailAddresses.has(address)) {
      errors.push(`Unreviewed email address is present in: ${relativePath}`);
    }
  }
}

const license = await readFile(resolve(projectRoot, "LICENSE"), "utf8");
if (!license.includes("上海啸群教育科技有限公司")) {
  errors.push("LICENSE does not contain the approved copyright holder");
}

if (errors.length > 0) {
  process.stderr.write(`${errors.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("Public repository boundary verified.\n");
}

async function exists(relativePath) {
  try {
    await access(resolve(projectRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function directoryHasFiles(relativePath) {
  try {
    const entries = await readdir(resolve(projectRoot, relativePath), { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === ".DS_Store") continue;
      if (entry.isFile()) return true;
      if (entry.isDirectory() && await directoryHasFiles(`${relativePath}/${entry.name}`)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function* walkPublicFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === ".DS_Store") continue;
    if (entry.isDirectory() && scanIgnoredDirectories.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      yield* walkPublicFiles(path);
    } else if (entry.isFile()) {
      yield path;
    }
  }
}
