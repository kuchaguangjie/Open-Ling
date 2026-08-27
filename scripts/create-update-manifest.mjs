import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(await readFile(resolve(projectRoot, "package.json"), "utf8"));
const outputPath = resolve(projectRoot, process.argv[2] ?? "release/update/latest.json");

if (typeof packageJson.version !== "string" || !/^\d+\.\d+\.\d+$/.test(packageJson.version)) {
  throw new Error("package.json must contain a stable semantic version");
}

await mkdir(dirname(outputPath), { recursive: true });
const downloadRoot = `https://ling.xiaoqunpsy.cn/downloads/${packageJson.version}`;
const manifest = {
  version: packageJson.version,
  downloads: {
    "win32-x64": `${downloadRoot}/Ling-${packageJson.version}-win-x64.exe`,
    "darwin-arm64": `${downloadRoot}/Ling-${packageJson.version}-mac-arm64.dmg`,
    "darwin-x64": `${downloadRoot}/Ling-${packageJson.version}-mac-x64.dmg`,
    "linux-arm64": `${downloadRoot}/Ling-${packageJson.version}-linux-arm64.deb`
  }
};
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(outputPath);
