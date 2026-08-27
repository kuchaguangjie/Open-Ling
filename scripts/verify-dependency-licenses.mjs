import { readFile } from "node:fs/promises";

const allowedLicenses = new Set([
  "(BSD-2-Clause OR MIT OR Apache-2.0)",
  "(MIT OR CC0-1.0)",
  "(MIT OR WTFPL)",
  "(WTFPL OR MIT)",
  "0BSD",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "BlueOak-1.0.0",
  "CC-BY-4.0",
  "ISC",
  "MIT",
  "MIT-0",
  "OFL-1.1",
  "Python-2.0",
  "WTFPL",
  "WTFPL OR ISC"
]);

const packageLock = JSON.parse(await readFile(new URL("../package-lock.json", import.meta.url), "utf8"));
const dependencies = Object.entries(packageLock.packages ?? {})
  .filter(([path]) => path.includes("node_modules/"))
  .map(([path, metadata]) => ({
    license: typeof metadata.license === "string" ? metadata.license : "",
    name: path.slice(path.lastIndexOf("node_modules/") + "node_modules/".length),
    version: metadata.version ?? "unknown"
  }));

const errors = [];
for (const dependency of dependencies) {
  if (!dependency.license) {
    errors.push(`${dependency.name}@${dependency.version}: missing license metadata`);
  } else if (!allowedLicenses.has(dependency.license)) {
    errors.push(`${dependency.name}@${dependency.version}: unreviewed license ${dependency.license}`);
  }
}

if (errors.length > 0) {
  process.stderr.write([
    "Dependency license verification failed.",
    ...errors,
    "Review each dependency and update the allowlist only after confirming redistribution terms."
  ].join("\n") + "\n");
  process.exitCode = 1;
} else {
  const licenseCounts = new Map();
  for (const dependency of dependencies) {
    licenseCounts.set(dependency.license, (licenseCounts.get(dependency.license) ?? 0) + 1);
  }
  process.stdout.write(
    `Verified ${dependencies.length} locked npm packages across ${licenseCounts.size} reviewed license expressions.\n`
  );
}
