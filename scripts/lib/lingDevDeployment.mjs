import { cpSync, existsSync, lstatSync, renameSync, rmSync } from "node:fs";
import { basename, dirname, join } from "node:path";

export function assertLingDevSourceBranch(branch, allowNonMain = false) {
  if (branch === "main" || allowNonMain) return;
  throw new Error(
    `Ling Dev 只能从 main 更新；当前分支是 ${branch || "detached HEAD"}。` +
      "如需临时验证其他分支，请直接运行 package:mac:dev。"
  );
}

export function replaceInstalledApp({
  copyBundle = (source, target) => cpSync(source, target, { recursive: true }),
  sourceAppPath,
  stagingSuffix = String(process.pid),
  targetAppPath
}) {
  const parentDirectory = dirname(targetAppPath);
  const appName = basename(targetAppPath);
  const stagingPath = join(parentDirectory, `.${appName}.staging-${stagingSuffix}`);
  const previousPath = join(parentDirectory, `.${appName}.previous`);

  removePath(stagingPath);
  copyBundle(sourceAppPath, stagingPath);

  let movedPrevious = false;
  try {
    removePath(previousPath);
    if (pathExists(targetAppPath)) {
      renameSync(targetAppPath, previousPath);
      movedPrevious = true;
    }
    renameSync(stagingPath, targetAppPath);
    removePath(previousPath);
  } catch (error) {
    removePath(stagingPath);
    if (movedPrevious && !pathExists(targetAppPath) && pathExists(previousPath)) {
      renameSync(previousPath, targetAppPath);
    }
    throw error;
  }

  return targetAppPath;
}

export function pathExists(path) {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

export function parseGitWorktreePaths(porcelainOutput) {
  return porcelainOutput
    .split("\n")
    .filter((line) => line.startsWith("worktree "))
    .map((line) => line.slice("worktree ".length));
}

function removePath(path) {
  if (!pathExists(path)) return;
  rmSync(path, { force: true, recursive: true });
}
