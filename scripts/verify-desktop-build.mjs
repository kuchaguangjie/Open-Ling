import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const entryPath = resolve(process.cwd(), "dist/index.html");
if (!existsSync(entryPath)) {
  throw new Error(`Desktop build entry is missing: ${entryPath}`);
}

const html = readFileSync(entryPath, "utf8");
const references = [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
const localReferences = references.filter((reference) => !/^(?:[a-z]+:|#|\/\/)/i.test(reference));
const rootRelativeReferences = localReferences.filter((reference) => reference.startsWith("/"));

if (rootRelativeReferences.length > 0) {
  throw new Error(
    `Packaged Electron assets must be relative to dist/index.html: ${rootRelativeReferences.join(", ")}`
  );
}

const missingReferences = localReferences.filter((reference) => {
  const filePath = resolve(dirname(entryPath), reference.split(/[?#]/, 1)[0]);
  return !existsSync(filePath);
});

if (missingReferences.length > 0) {
  throw new Error(`Desktop build references missing assets: ${missingReferences.join(", ")}`);
}

const mainProcessOutput = resolve(process.cwd(), "dist-electron");
const mainProcessFiles = findJavaScriptFiles(mainProcessOutput);
const unresolvedAliasFiles = mainProcessFiles.filter((filePath) => {
  const source = readFileSync(filePath, "utf8");
  return /["']@(?:shared|core)\//.test(source);
});

if (unresolvedAliasFiles.length > 0) {
  throw new Error(
    `Desktop main-process build contains unresolved TypeScript path aliases: ${unresolvedAliasFiles.join(", ")}`
  );
}

process.stdout.write(
  `Verified ${localReferences.length} packaged renderer assets and ${mainProcessFiles.length} main-process modules.\n`
);

function findJavaScriptFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) return findJavaScriptFiles(entryPath);
    return entry.isFile() && entry.name.endsWith(".js") ? [entryPath] : [];
  });
}
