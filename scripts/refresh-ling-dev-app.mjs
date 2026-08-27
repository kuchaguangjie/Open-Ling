import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  readdirSync as readDirectorySync,
  rmSync,
  writeFileSync
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  assertLingDevSourceBranch,
  parseGitWorktreePaths,
  pathExists,
  replaceInstalledApp
} from "./lib/lingDevDeployment.mjs";

const appName = "Ling Dev.app";
const projectRoot = resolve(process.cwd());
const applicationsAppPath = join("/Applications", appName);
const refreshLockPath = join(tmpdir(), "ling-dev-refresh.lock");
const launchServices =
  "/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister";
const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: projectRoot,
  encoding: "utf8"
}).trim();
const sourceBranch = execFileSync("git", ["branch", "--show-current"], {
  cwd: projectRoot,
  encoding: "utf8"
}).trim();
const changedFiles = execFileSync("git", ["status", "--porcelain"], {
  cwd: projectRoot,
  encoding: "utf8"
}).trim().split("\n").filter(Boolean);

function run(command, args) {
  const result = spawnSync(command, args, { cwd: projectRoot, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function findBuiltApp() {
  const outputDir = join(projectRoot, "release", "dev");
  const preferredDirectories = [`mac-${process.arch}`, "mac"];
  const candidates = [
    ...preferredDirectories.map((directory) => join(outputDir, directory, appName)),
    ...readDirectorySync(outputDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("mac"))
      .map((entry) => join(outputDir, entry.name, appName))
  ];
  const appPath = candidates.find((candidate) => pathExists(candidate));
  if (!appPath) throw new Error("没有找到刚生成的 Ling Dev.app。");
  return appPath;
}

function stopRunningLingDev() {
  const result = spawnSync("pkill", ["-TERM", "-f", "/Ling Dev.app/Contents/MacOS/Ling Dev"]);
  if (result.status !== 0 && result.status !== 1) {
    throw new Error("无法关闭旧的 Ling Dev 进程。");
  }
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const probe = spawnSync("pgrep", ["-f", "/Ling Dev.app/Contents/MacOS/Ling Dev"]);
    if (probe.status === 1) return;
    spawnSync("sleep", ["0.1"]);
  }
  throw new Error("旧的 Ling Dev 进程没有在预期时间内退出。");
}

function waitForInstalledLingDev() {
  const executablePath = join(applicationsAppPath, "Contents", "MacOS", "Ling Dev");
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const probe = spawnSync("pgrep", ["-f", executablePath], { encoding: "utf8" });
    if (probe.status === 0) return probe.stdout.trim().split("\n")[0];
    spawnSync("sleep", ["0.1"]);
  }
  throw new Error("新版 Ling Dev 安装成功，但没有正常启动。");
}

function verifyInstalledLingDev() {
  const executablePath = join(applicationsAppPath, "Contents", "MacOS", "Ling Dev");
  verifyPackagedEncryptionModule(executablePath);
  const result = spawnSync(executablePath, ["--smoke-test"], {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: 30_000
  });
  if (result.status === 0) return;
  const details = [result.stderr, result.stdout].filter(Boolean).join("\n").trim();
  throw new Error(
    `新版 Ling Dev 没有通过真实启动检查${details ? `：\n${details}` : "。"}`
  );
}

function verifyPackagedEncryptionModule(executablePath) {
  const nativeModulePath = join(
    applicationsAppPath,
    "Contents",
    "Resources",
    "app.asar",
    "node_modules",
    "better-sqlite3-multiple-ciphers"
  );
  const smokeScript = [
    "const { join } = require('node:path');",
    "const { tmpdir } = require('node:os');",
    "const { unlinkSync } = require('node:fs');",
    "const Database = require(process.argv[1]);",
    "const databasePath = join(tmpdir(), `ling-packaged-encryption-${process.pid}.sqlite`);",
    "const database = new Database(databasePath);",
    "try {",
    "  database.pragma(`key = 'ling-packaged-smoke'`);",
    "  database.exec('CREATE TABLE smoke_test (value INTEGER NOT NULL); INSERT INTO smoke_test VALUES (1)');",
    "  if (database.prepare('SELECT value FROM smoke_test').get()?.value !== 1) process.exitCode = 1;",
    "} finally {",
    "  database.close();",
    "  unlinkSync(databasePath);",
    "}"
  ].join("\n");
  const result = spawnSync(executablePath, ["-e", smokeScript, nativeModulePath], {
    cwd: projectRoot,
    encoding: "utf8",
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
    timeout: 30_000
  });
  if (result.status === 0) return;
  const details = [result.stderr, result.stdout].filter(Boolean).join("\n").trim();
  throw new Error(
    `新版 Ling Dev 的加密数据库模块不可用${details ? `：\n${details}` : "。"}`
  );
}

function acquireRefreshLock() {
  try {
    mkdirSync(refreshLockPath);
  } catch {
    let activeOwner = false;
    try {
      const ownerPid = Number(readFileSync(join(refreshLockPath, "pid"), "utf8").trim());
      if (Number.isInteger(ownerPid) && ownerPid > 0) {
        process.kill(ownerPid, 0);
        activeOwner = true;
      }
    } catch {
      activeOwner = false;
    }
    if (activeOwner) {
      throw new Error("另一个 Ling Dev 刷新任务仍在运行，请稍后再试。");
    }
    rmSync(refreshLockPath, { force: true, recursive: true });
    mkdirSync(refreshLockPath);
  }
  writeFileSync(join(refreshLockPath, "pid"), `${process.pid}\n`, "utf8");
}

function registerInstalledApp() {
  if (pathExists(launchServices)) {
    run(launchServices, ["-f", applicationsAppPath]);
  }
}

function removeStaleLingDevBundles() {
  const worktreeOutput = execFileSync("git", ["worktree", "list", "--porcelain"], {
    cwd: projectRoot,
    encoding: "utf8"
  });
  const candidates = [];
  for (const worktreePath of parseGitWorktreePaths(worktreeOutput)) {
    const outputDirectory = join(worktreePath, "release", "dev");
    if (!pathExists(outputDirectory)) continue;
    for (const entry of readDirectorySync(outputDirectory, { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.startsWith("mac")) continue;
      candidates.push(join(outputDirectory, entry.name, appName));
    }
  }
  for (const entry of readDirectorySync("/Applications", { withFileTypes: true })) {
    if (entry.name.startsWith(`${appName}.backup-`)) {
      candidates.push(join("/Applications", entry.name));
    }
  }

  let removedCount = 0;
  for (const candidate of new Set(candidates)) {
    if (candidate === applicationsAppPath || !pathExists(candidate)) continue;
    if (pathExists(launchServices)) {
      spawnSync(launchServices, ["-u", candidate], { cwd: projectRoot, stdio: "ignore" });
    }
    rmSync(candidate, { force: true, recursive: true });
    removedCount += 1;
  }
  return removedCount;
}

function clearLingDevCaches() {
  const userHome = homedir();
  const userDataDirectory = join(userHome, "Library", "Application Support", "Ling Dev");
  const cachePaths = [
    join(userDataDirectory, "Cache"),
    join(userDataDirectory, "Code Cache"),
    join(userDataDirectory, "DawnGraphiteCache"),
    join(userDataDirectory, "DawnWebGPUCache"),
    join(userDataDirectory, "GPUCache"),
    join(userDataDirectory, "Shared Dictionary"),
    join(userDataDirectory, "blob_storage"),
    join(userDataDirectory, "DevToolsActivePort"),
    join(userHome, "Library", "Caches", "cn.xiaoqunpsy.ling.dev"),
    join(userHome, "Library", "Saved Application State", "cn.xiaoqunpsy.ling.dev.savedState")
  ];
  let removedCount = 0;
  for (const cachePath of cachePaths) {
    if (!pathExists(cachePath)) continue;
    rmSync(cachePath, { force: true, recursive: true });
    removedCount += 1;
  }
  return removedCount;
}

function writeBuildRecord(builtAppPath) {
  const buildRecord = {
    appPath: applicationsAppPath,
    branch: sourceBranch,
    builtAt: new Date().toISOString(),
    changedFiles,
    commit: sourceCommit,
    dirty: changedFiles.length > 0,
    packagedFrom: builtAppPath
  };
  const serializedRecord = `${JSON.stringify(buildRecord, null, 2)}\n`;
  writeFileSync(join(projectRoot, "release", "dev", "ling-dev-build.json"), serializedRecord, "utf8");
  writeFileSync(
    join(applicationsAppPath, "Contents", "Resources", "ling-dev-build.json"),
    serializedRecord,
    "utf8"
  );
}

assertLingDevSourceBranch(sourceBranch, process.env.LING_DEV_ALLOW_NON_MAIN === "1");

acquireRefreshLock();

try {
  stopRunningLingDev();
  const removedCacheCount = clearLingDevCaches();
  run("npm", ["run", "package:mac:dev"]);
  const builtAppPath = findBuiltApp();
  replaceInstalledApp({
    copyBundle: (source, target) => run("ditto", [source, target]),
    sourceAppPath: builtAppPath,
    targetAppPath: applicationsAppPath
  });
  writeBuildRecord(builtAppPath);
  registerInstalledApp();
  const removedDuplicateCount = removeStaleLingDevBundles();
  verifyInstalledLingDev();
  run("open", [applicationsAppPath]);
  const launchedPid = waitForInstalledLingDev();

  console.log(`Ling Dev 已安装并重新打开：${applicationsAppPath}`);
  console.log(`运行进程：${launchedPid}`);
  console.log(`构建来源：${sourceCommit}${changedFiles.length > 0 ? "（包含未提交修改）" : ""}`);
  console.log(`已清理 ${removedDuplicateCount} 个旧的 Ling Dev 构建副本。`);
  console.log(`已清理 ${removedCacheCount} 项 Ling Dev 缓存；本地数据和设置保持不变。`);
} finally {
  rmSync(refreshLockPath, { force: true, recursive: true });
}
