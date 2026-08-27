import { readFileSync, realpathSync, statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import {
  counselorPackageRegistry,
  createCounselorPackageRegistration,
  validateCounselorPackageManifest,
  type CounselorPackageManifest,
  type CounselorPackageRegistry,
  type RegisteredCounselorPackage
} from "../../../shared/src/index.js";
import { assertSafetyPolicyCompatibility } from "../safety/counselorPackageSafety.js";

const MAX_MANIFEST_BYTES = 262_144;
const MAX_PROMPT_BYTES = 1_048_576;
const MAX_VISUAL_BYTES = 10 * 1_048_576;
const MAX_PACKAGE_RESOURCE_BYTES = 64 * 1_048_576;
const promptExtensions = new Set([".md", ".txt"]);
const visualExtensions = new Set([".png", ".jpg", ".jpeg", ".webp"]);

export interface LoadDirectoryCounselorPackageOptions {
  registry?: CounselorPackageRegistry;
  register?: boolean;
}

export function loadDirectoryCounselorPackage(
  packageDirectory: string,
  options: LoadDirectoryCounselorPackageOptions = {}
): RegisteredCounselorPackage {
  const rootDirectory = realpathSync(packageDirectory);
  if (!statSync(rootDirectory).isDirectory()) {
    throw new Error(`Counselor package path is not a directory: ${packageDirectory}`);
  }
  const manifestPath = resolve(rootDirectory, "manifest.json");
  const manifestStats = statSync(manifestPath);
  if (!manifestStats.isFile() || manifestStats.size > MAX_MANIFEST_BYTES) {
    throw new Error("Counselor package manifest.json is missing or exceeds 256 KiB");
  }

  let manifestValue: unknown;
  try {
    manifestValue = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    throw new Error(`Counselor package manifest.json is invalid JSON: ${errorMessage(error)}`);
  }
  const validation = validateCounselorPackageManifest(manifestValue);
  if (!validation.valid) {
    throw new Error(`Invalid counselor package manifest: ${validation.errors.join("; ")}`);
  }
  const manifest = manifestValue as CounselorPackageManifest;
  assertSafetyPolicyCompatibility(manifest.safety.minimumPolicyVersion);
  validateDirectoryResources(rootDirectory, manifest);

  const registration = createCounselorPackageRegistration(manifest, {
    kind: "directory",
    rootDirectory
  });
  if (options.register !== false) {
    (options.registry ?? counselorPackageRegistry).register(registration);
  }
  return registration;
}

function validateDirectoryResources(rootDirectory: string, manifest: CounselorPackageManifest) {
  const resources = getCounselorPackageResources(manifest);
  let totalBytes = 0;
  for (const resource of resources) {
    if (!resource.uri.startsWith("package://")) {
      throw new Error(`External counselor packages may only use package:// resources: ${resource.uri}`);
    }
    const filePath = resolvePackageResourcePath(rootDirectory, resource.uri);
    const stats = statSync(filePath);
    if (!stats.isFile()) throw new Error(`Counselor package resource is not a file: ${resource.uri}`);
    const extension = extname(filePath).toLowerCase();
    const allowedExtensions = resource.kind === "prompt" ? promptExtensions : visualExtensions;
    if (!allowedExtensions.has(extension)) {
      throw new Error(`Unsupported counselor package ${resource.kind} resource type: ${resource.uri}`);
    }
    const sizeLimit = resource.kind === "prompt" ? MAX_PROMPT_BYTES : MAX_VISUAL_BYTES;
    if (stats.size > sizeLimit) {
      throw new Error(`Counselor package ${resource.kind} resource is too large: ${resource.uri}`);
    }
    totalBytes += stats.size;
  }
  if (totalBytes > MAX_PACKAGE_RESOURCE_BYTES) {
    throw new Error("Counselor package resources exceed 64 MiB");
  }
}

export function getCounselorPackageResources(manifest: CounselorPackageManifest) {
  return [
    ...Object.values(manifest.prompts.counselorCore).map((uri) => ({ uri, kind: "prompt" as const })),
    ...Object.values(manifest.prompts.counselingDialogue).map((uri) => ({ uri, kind: "prompt" as const })),
    ...Object.values(manifest.prompts.counselorVoice ?? {}).map((uri) => ({ uri, kind: "prompt" as const })),
    ...manifest.safety.additionalPolicies.map((uri) => ({ uri, kind: "prompt" as const })),
    { uri: manifest.visuals.avatar, kind: "visual" as const },
    { uri: manifest.visuals.portrait, kind: "visual" as const },
    { uri: manifest.visuals.room, kind: "visual" as const },
    ...(manifest.visuals.openingSequence ? [{ uri: manifest.visuals.openingSequence, kind: "visual" as const }] : []),
    ...(manifest.visuals.closingSequence ? [{ uri: manifest.visuals.closingSequence, kind: "visual" as const }] : [])
  ];
}

export function resolvePackageResourcePath(rootDirectory: string, resourceUri: string) {
  if (!resourceUri.startsWith("package://")) {
    throw new Error(`Unsupported package resource URI: ${resourceUri}`);
  }
  const relativePath = resourceUri.slice("package://".length);
  if (!relativePath || relativePath.startsWith("/") || relativePath.split("/").some((segment) =>
    segment === "." || segment === ".." || segment === ""
  )) {
    throw new Error(`Unsafe package resource URI: ${resourceUri}`);
  }
  const realRoot = realpathSync(rootDirectory);
  const realFile = realpathSync(resolve(realRoot, relativePath));
  if (!realFile.startsWith(`${realRoot}${sep}`)) {
    throw new Error(`Package resource escapes package directory: ${resourceUri}`);
  }
  return realFile;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
