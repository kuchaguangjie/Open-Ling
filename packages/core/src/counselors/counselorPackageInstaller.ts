import {
  copyFileSync,
  existsSync,
  mkdirSync,
  realpathSync,
  renameSync,
  rmSync
} from "node:fs";
import { dirname, resolve, sep } from "node:path";
import {
  CounselorPackageRegistry,
  compareCounselorPackageVersions,
  counselorPackageRegistry,
  type RegisteredCounselorPackage
} from "../../../shared/src/index.js";
import {
  getCounselorPackageResources,
  loadDirectoryCounselorPackage,
  resolvePackageResourcePath
} from "./directoryCounselorPackageLoader.js";

export function installCounselorPackageFromDirectory(
  sourceDirectory: string,
  installationDirectory: string,
  registry: CounselorPackageRegistry = counselorPackageRegistry
): RegisteredCounselorPackage {
  const inspected = loadDirectoryCounselorPackage(sourceDirectory, {
    registry: new CounselorPackageRegistry()
  });
  const packageId = inspected.manifest.id;
  if (registry.get(packageId)) throw new Error(`Counselor package already installed: ${packageId}`);

  mkdirSync(installationDirectory, { recursive: true });
  const installationRoot = realpathSync(installationDirectory);
  const targetDirectory = resolve(installationRoot, packageId);
  if (existsSync(targetDirectory)) throw new Error(`Counselor package directory already exists: ${packageId}`);
  const temporaryDirectory = createTemporaryPackageDirectory(installationRoot, packageId, "installing");

  try {
    stageCounselorPackage(sourceDirectory, temporaryDirectory, inspected);
    renameSync(temporaryDirectory, targetDirectory);
    try {
      return loadDirectoryCounselorPackage(targetDirectory, { registry });
    } catch (error) {
      rmSync(targetDirectory, { recursive: true, force: true });
      throw error;
    }
  } catch (error) {
    rmSync(temporaryDirectory, { recursive: true, force: true });
    throw error;
  }
}

export function updateCounselorPackageFromDirectory(
  sourceDirectory: string,
  installationDirectory: string,
  registry: CounselorPackageRegistry = counselorPackageRegistry
): { registration: RegisteredCounselorPackage; previousVersion: string } {
  const inspected = loadDirectoryCounselorPackage(sourceDirectory, {
    registry: new CounselorPackageRegistry()
  });
  const packageId = inspected.manifest.id;
  const current = registry.require(packageId);
  if (current.source.kind !== "directory") {
    throw new Error(`Built-in or hosted counselor package cannot be updated: ${packageId}`);
  }
  if (compareCounselorPackageVersions(inspected.manifest.version, current.manifest.version) <= 0) {
    throw new Error(
      `Counselor package update must be newer than ${current.manifest.version}: ${inspected.manifest.version}`
    );
  }

  const installationRoot = realpathSync(installationDirectory);
  const targetDirectory = resolve(installationRoot, packageId);
  const registeredRoot = realpathSync(current.source.rootDirectory);
  const expectedRoot = realpathSync(targetDirectory);
  if (registeredRoot !== expectedRoot || !registeredRoot.startsWith(`${installationRoot}${sep}`)) {
    throw new Error(`Counselor package is outside the managed installation directory: ${packageId}`);
  }

  const temporaryDirectory = createTemporaryPackageDirectory(installationRoot, packageId, "updating");
  const backupDirectory = createTemporaryPackageDirectory(installationRoot, packageId, "previous");
  const previousVersion = current.manifest.version;
  let movedCurrentToBackup = false;
  let movedUpdateToTarget = false;

  try {
    stageCounselorPackage(sourceDirectory, temporaryDirectory, inspected);
    renameSync(targetDirectory, backupDirectory);
    movedCurrentToBackup = true;
    registry.unregister(packageId);
    renameSync(temporaryDirectory, targetDirectory);
    movedUpdateToTarget = true;
    const registration = loadDirectoryCounselorPackage(targetDirectory, { registry });
    rmSync(backupDirectory, { recursive: true, force: true });
    return { registration, previousVersion };
  } catch (error) {
    if (registry.get(packageId)?.source.kind === "directory") registry.unregister(packageId);
    if (movedUpdateToTarget) rmSync(targetDirectory, { recursive: true, force: true });
    if (movedCurrentToBackup && existsSync(backupDirectory)) {
      renameSync(backupDirectory, targetDirectory);
      loadDirectoryCounselorPackage(targetDirectory, { registry });
    }
    throw error;
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
    rmSync(backupDirectory, { recursive: true, force: true });
  }
}

export function removeInstalledCounselorPackage(
  packageId: string,
  installationDirectory: string,
  registry: CounselorPackageRegistry = counselorPackageRegistry
) {
  const registration = registry.require(packageId);
  if (registration.source.kind !== "directory") {
    throw new Error(`Built-in or hosted counselor package cannot be removed: ${packageId}`);
  }
  const installationRoot = realpathSync(installationDirectory);
  const registeredRoot = realpathSync(registration.source.rootDirectory);
  const expectedRoot = realpathSync(resolve(installationRoot, packageId));
  if (
    registeredRoot !== expectedRoot ||
    !registeredRoot.startsWith(`${installationRoot}${sep}`)
  ) {
    throw new Error(`Counselor package is outside the managed installation directory: ${packageId}`);
  }
  rmSync(registeredRoot, { recursive: true });
  registry.unregister(packageId);
}

function createTemporaryPackageDirectory(
  installationRoot: string,
  packageId: string,
  operation: "installing" | "updating" | "previous"
) {
  return resolve(
    installationRoot,
    `.${operation}-${packageId}-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

function stageCounselorPackage(
  sourceDirectory: string,
  destinationDirectory: string,
  inspected: RegisteredCounselorPackage
) {
  mkdirSync(destinationDirectory);
  copyFileSync(
    resolve(inspected.source.kind === "directory" ? inspected.source.rootDirectory : sourceDirectory, "manifest.json"),
    resolve(destinationDirectory, "manifest.json")
  );
  const copiedUris = new Set<string>();
  for (const { uri } of getCounselorPackageResources(inspected.manifest)) {
    if (copiedUris.has(uri)) continue;
    copiedUris.add(uri);
    const relativePath = uri.slice("package://".length);
    const destination = resolve(destinationDirectory, relativePath);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(resolvePackageResourcePath(sourceDirectory, uri), destination);
  }
}
