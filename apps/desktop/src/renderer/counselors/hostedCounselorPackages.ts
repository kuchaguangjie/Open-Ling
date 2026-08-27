import {
  counselorPackageRegistry,
  createCounselorPackageRegistration,
  type CounselorPackageManifest,
  type CounselorPackageRegistry
} from "@shared/index";

const resourceScheme = "ling-counselor-resource";

export async function syncHostedCounselorPackages() {
  const listPackages = window.lingDesktop?.counselorPackages?.list;
  if (!listPackages) return [];
  const result = await listPackages();
  if (!result.ok) return [];
  return registerHostedCounselorPackages(result.data);
}

export function registerHostedCounselorPackages(
  manifests: CounselorPackageManifest[],
  registry: CounselorPackageRegistry = counselorPackageRegistry
) {
  const registered: CounselorPackageManifest[] = [];
  for (const manifest of manifests) {
    if (registry.get(manifest.id)) continue;
    registry.register(createCounselorPackageRegistration(manifest, { kind: "host" }));
    registered.push(manifest);
  }
  return registered;
}

export function unregisterHostedCounselorPackage(
  packageId: string,
  registry: CounselorPackageRegistry = counselorPackageRegistry
) {
  const registration = registry.get(packageId);
  if (registration?.source.kind !== "host") return false;
  return registry.unregister(packageId);
}

export function getHostedCounselorVisualUrl(
  counselorId: string,
  visualKey: "avatar" | "portrait" | "room" | "openingSequence" | "closingSequence"
) {
  return `${resourceScheme}://${encodeURIComponent(counselorId)}/${visualKey}`;
}
