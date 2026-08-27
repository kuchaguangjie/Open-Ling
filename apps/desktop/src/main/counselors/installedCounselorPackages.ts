import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  counselorPackageRegistry,
  type CounselorPackageRegistry,
  type RegisteredCounselorPackage
} from "../../../../../packages/shared/src/index.js";
import { loadDirectoryCounselorPackage } from "../../../../../packages/core/src/counselors/directoryCounselorPackageLoader.js";

export interface InstalledCounselorPackageDiagnostic {
  directoryName: string;
  message: string;
}

export interface InstalledCounselorPackageScanResult {
  loaded: RegisteredCounselorPackage[];
  diagnostics: InstalledCounselorPackageDiagnostic[];
}

export function loadInstalledCounselorPackages(
  packagesDirectory: string,
  registry: CounselorPackageRegistry = counselorPackageRegistry
): InstalledCounselorPackageScanResult {
  const loaded: RegisteredCounselorPackage[] = [];
  const diagnostics: InstalledCounselorPackageDiagnostic[] = [];
  let entries;

  try {
    entries = readdirSync(packagesDirectory, { withFileTypes: true });
  } catch (error) {
    if (isMissingDirectoryError(error)) return { loaded, diagnostics };
    return {
      loaded,
      diagnostics: [{ directoryName: ".", message: errorMessage(error) }]
    };
  }

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    try {
      loaded.push(loadDirectoryCounselorPackage(resolve(packagesDirectory, entry.name), { registry }));
    } catch (error) {
      diagnostics.push({ directoryName: entry.name, message: errorMessage(error) });
    }
  }

  return { loaded, diagnostics };
}

function isMissingDirectoryError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
