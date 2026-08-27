import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const targetArgument = process.argv[2];
if (!targetArgument) {
  fail("Usage: npm run public:export -- <new-empty-directory>");
}

const projectRoot = run("git", ["rev-parse", "--show-toplevel"]).trim();
const targetDirectory = resolve(process.cwd(), targetArgument);

if (targetDirectory === resolve(projectRoot)) {
  fail("The export target cannot be the source repository.");
}
if (existsSync(targetDirectory)) {
  fail(`The export target already exists: ${targetDirectory}`);
}

const worktreeStatus = run("git", ["status", "--porcelain"], { cwd: projectRoot });
if (worktreeStatus.trim()) {
  fail("Commit or stash all changes before exporting the public repository.");
}

run(process.execPath, ["scripts/verify-public-boundary.mjs"], { cwd: projectRoot });

const sourceCommit = run("git", ["rev-parse", "HEAD"], { cwd: projectRoot }).trim();
const temporaryDirectory = await mkdtemp(resolve(tmpdir(), "ling-public-export-"));
const archivePath = resolve(temporaryDirectory, "ling-public-source.tar");

try {
  await mkdir(dirname(targetDirectory), { recursive: true });
  await mkdir(targetDirectory);
  run("git", ["archive", "--format=tar", `--output=${archivePath}`, "HEAD"], {
    cwd: projectRoot
  });
  run("tar", ["-xf", archivePath, "-C", targetDirectory]);
  run(process.execPath, ["scripts/verify-public-boundary.mjs"], {
    cwd: targetDirectory
  });
  await writeFile(
    resolve(targetDirectory, "PUBLIC_SOURCE_INFO.md"),
    [
      "# Public source export",
      "",
      "This directory is a history-free export prepared for the public Ling repository.",
      "",
      `- Source commit: \`${sourceCommit}\``,
      `- Exported at: \`${new Date().toISOString()}\``,
      "- Previous repository remotes and Git history are not included.",
      "",
      "Create the first public commit only after completing the release checklist.",
      ""
    ].join("\n"),
    "utf8"
  );
} catch (error) {
  await rm(targetDirectory, { recursive: true, force: true });
  throw error;
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

process.stdout.write(`History-free public source exported to:\n${targetDirectory}\n`);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    fail(`${command} ${args.join(" ")} failed${detail ? `:\n${detail}` : "."}`);
  }
  return result.stdout;
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
