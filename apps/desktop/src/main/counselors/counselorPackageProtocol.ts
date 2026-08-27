import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { protocol } from "electron";
import { counselorPackageRegistry } from "../../../../../packages/shared/src/index.js";
import { resolvePackageResourcePath } from "../../../../../packages/core/src/counselors/directoryCounselorPackageLoader.js";

export const COUNSELOR_PACKAGE_RESOURCE_SCHEME = "ling-counselor-resource";

const visualKeys = new Set(["avatar", "portrait", "room", "openingSequence", "closingSequence"]);
const mimeTypes: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

export function registerCounselorPackageProtocol() {
  protocol.handle(COUNSELOR_PACKAGE_RESOURCE_SCHEME, async (request) => {
    try {
      const resource = resolveCounselorPackageVisualRequest(request.url);
      return new Response(readFileSync(resource.filePath), {
        headers: {
          "Content-Type": resource.mimeType,
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff"
        }
      });
    } catch {
      return new Response("Counselor package visual not found", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }
  });
}

export function resolveCounselorPackageVisualRequest(requestUrl: string) {
  const url = new URL(requestUrl);
  if (url.protocol !== `${COUNSELOR_PACKAGE_RESOURCE_SCHEME}:` || url.username || url.password || url.port) {
    throw new Error("Invalid counselor package resource URL");
  }
  const packageId = url.hostname;
  const visualKey = decodeURIComponent(url.pathname.slice(1));
  if (!packageId || !visualKeys.has(visualKey) || url.search || url.hash) {
    throw new Error("Invalid counselor package visual request");
  }
  const registration = counselorPackageRegistry.require(packageId);
  if (registration.source.kind !== "directory") {
    throw new Error("Only directory package visuals use the host resource protocol");
  }
  const resourceUri = registration.manifest.visuals[
    visualKey as keyof typeof registration.manifest.visuals
  ];
  if (!resourceUri) throw new Error("Counselor package visual is not declared");
  const filePath = resolvePackageResourcePath(registration.source.rootDirectory, resourceUri);
  const mimeType = mimeTypes[extname(filePath).toLowerCase()];
  if (!mimeType) throw new Error("Unsupported counselor package visual type");
  return { packageId, visualKey, filePath, mimeType };
}
