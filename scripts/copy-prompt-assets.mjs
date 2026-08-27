import { copyFile, mkdir, readdir } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const sourceRoot = resolve(process.cwd(), "packages/core/src/prompts");
const destinationRoot = resolve(process.cwd(), "dist-electron/packages/core/src/prompts");

async function copyMarkdownTree(sourceDirectory, destinationDirectory) {
  await mkdir(destinationDirectory, { recursive: true });
  const entries = await readdir(sourceDirectory, { withFileTypes: true });
  let copiedFileCount = 0;

  for (const entry of entries) {
    const sourcePath = join(sourceDirectory, entry.name);
    const destinationPath = join(destinationDirectory, entry.name);
    if (entry.isDirectory()) {
      copiedFileCount += await copyMarkdownTree(sourcePath, destinationPath);
      continue;
    }
    if (!entry.isFile() || extname(entry.name) !== ".md") continue;
    await copyFile(sourcePath, destinationPath);
    copiedFileCount += 1;
  }

  return copiedFileCount;
}

const copiedFileCount = await copyMarkdownTree(sourceRoot, destinationRoot);
if (copiedFileCount === 0) throw new Error("No counselor prompt assets were copied.");
process.stdout.write(`Copied ${copiedFileCount} counselor prompt assets.\n`);
