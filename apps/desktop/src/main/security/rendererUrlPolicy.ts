import { app } from "electron";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const devServerUrl = process.env.VITE_DEV_SERVER_URL?.trim() || "";

export function isTrustedRendererUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol === "file:") {
      const expectedRendererPath = getExpectedRendererPath();
      if (!expectedRendererPath) return false;
      return normalizePath(fileUrlToLocalPath(url)) === normalizePath(expectedRendererPath);
    }
    if (!devServerUrl) return false;
    return url.origin === new URL(devServerUrl).origin;
  } catch {
    return false;
  }
}

function getExpectedRendererPath() {
  try {
    return resolve(app.getAppPath(), "dist", "index.html");
  } catch {
    return "";
  }
}

/** Windows rejects Unix-style `file:///ling/...` URLs in fileURLToPath; fall back to pathname. */
function fileUrlToLocalPath(url: URL) {
  try {
    return fileURLToPath(url);
  } catch {
    return decodeURIComponent(url.pathname);
  }
}

function normalizePath(pathValue: string) {
  return resolve(pathValue).replaceAll("\\", "/").toLowerCase();
}

export function isSafeExternalUrl(rawUrl: string) {
  try {
    const protocol = new URL(rawUrl).protocol;
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}
