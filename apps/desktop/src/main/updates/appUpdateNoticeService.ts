import { app, BrowserWindow, ipcMain, net, shell } from "electron";
import {
  IPC_CHANNELS,
  type AppUpdateStatus,
  wrapIpcHandler
} from "../../../../../packages/shared/src/index.js";

export const LING_UPDATE_MANIFEST_URL = "https://ling.xiaoqunpsy.cn/updates/latest.json";
export const LING_DOWNLOAD_URL_PREFIX = "https://ling.xiaoqunpsy.cn/downloads/";

const FIRST_AUTOMATIC_CHECK_DELAY_MS = 30_000;
const AUTOMATIC_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const UPDATE_CHECK_TIMEOUT_MS = 10_000;
const SAFE_UPDATE_ERROR_MESSAGE = "暂时无法检查新版本，请稍后重试。";

export interface AppUpdateNoticeServiceOptions {
  enabled: boolean;
  currentVersion?: string;
  fetchLatestRelease?: () => Promise<WebsiteRelease>;
  openDownloadPage?: (url: string) => Promise<void>;
  now?: () => Date;
  broadcast?: (status: AppUpdateStatus) => void;
}

interface WebsiteRelease {
  version: string;
  downloadUrl: string;
}

export class AppUpdateNoticeService {
  private readonly enabled: boolean;
  private readonly currentVersion: string;
  private readonly fetchLatestRelease: () => Promise<WebsiteRelease>;
  private readonly openOfficialDownloadPage: (url: string) => Promise<void>;
  private readonly now: () => Date;
  private readonly broadcast: (status: AppUpdateStatus) => void;
  private status: AppUpdateStatus;
  private automaticCheckTimer: NodeJS.Timeout | null = null;
  private automaticCheckInterval: NodeJS.Timeout | null = null;
  private availableDownloadUrl: string | null = null;

  constructor(options: AppUpdateNoticeServiceOptions) {
    this.enabled = options.enabled;
    this.currentVersion = options.currentVersion ?? app.getVersion();
    this.fetchLatestRelease = options.fetchLatestRelease ?? fetchLatestReleaseFromWebsite;
    this.openOfficialDownloadPage = options.openDownloadPage ?? ((url) => shell.openExternal(url));
    this.now = options.now ?? (() => new Date());
    this.broadcast = options.broadcast ?? broadcastUpdateStatus;
    this.status = {
      state: this.enabled ? "idle" : "disabled",
      currentVersion: this.currentVersion
    };
  }

  getStatus() {
    return { ...this.status };
  }

  async checkForUpdates() {
    if (!this.enabled || this.status.state === "checking") return this.getStatus();
    this.setStatus({ state: "checking", currentVersion: this.currentVersion });
    try {
      const latestRelease = await this.fetchLatestRelease();
      const updateAvailable = isNewerVersion(latestRelease.version, this.currentVersion);
      this.availableDownloadUrl = updateAvailable ? latestRelease.downloadUrl : null;
      this.setStatus({
        state: updateAvailable ? "available" : "up-to-date",
        currentVersion: this.currentVersion,
        ...(updateAvailable ? { availableVersion: latestRelease.version } : {}),
        checkedAt: this.now().toISOString()
      });
    } catch {
      this.setStatus({
        state: "error",
        currentVersion: this.currentVersion,
        message: SAFE_UPDATE_ERROR_MESSAGE
      });
    }
    return this.getStatus();
  }

  async openDownloadPage() {
    if (!this.enabled || !this.availableDownloadUrl) return;
    await this.openOfficialDownloadPage(this.availableDownloadUrl);
  }

  startAutomaticChecks() {
    if (!this.enabled || this.automaticCheckTimer || this.automaticCheckInterval) return;
    this.automaticCheckTimer = setTimeout(() => {
      this.automaticCheckTimer = null;
      void this.checkForUpdates();
      this.automaticCheckInterval = setInterval(() => {
        void this.checkForUpdates();
      }, AUTOMATIC_CHECK_INTERVAL_MS);
      this.automaticCheckInterval.unref();
    }, FIRST_AUTOMATIC_CHECK_DELAY_MS);
    this.automaticCheckTimer.unref();
  }

  stopAutomaticChecks() {
    if (this.automaticCheckTimer) clearTimeout(this.automaticCheckTimer);
    if (this.automaticCheckInterval) clearInterval(this.automaticCheckInterval);
    this.automaticCheckTimer = null;
    this.automaticCheckInterval = null;
  }

  private setStatus(status: AppUpdateStatus) {
    this.status = status;
    this.broadcast(this.getStatus());
  }
}

export function registerAppUpdateNoticeIpc(service: AppUpdateNoticeService) {
  ipcMain.handle(IPC_CHANNELS.APP_UPDATE_STATUS, wrapIpcHandler(async () => service.getStatus()));
  ipcMain.handle(IPC_CHANNELS.APP_UPDATE_CHECK, wrapIpcHandler(async () => service.checkForUpdates()));
  ipcMain.handle(IPC_CHANNELS.APP_UPDATE_OPEN_DOWNLOAD, wrapIpcHandler(async () => service.openDownloadPage()));
}

export function isNewerVersion(candidate: string, current: string) {
  const candidateParts = parseStableVersion(candidate);
  const currentParts = parseStableVersion(current);
  for (let index = 0; index < 3; index += 1) {
    if (candidateParts[index] !== currentParts[index]) {
      return candidateParts[index] > currentParts[index];
    }
  }
  return false;
}

async function fetchLatestReleaseFromWebsite() {
  const response = await net.fetch(LING_UPDATE_MANIFEST_URL, {
    headers: { "cache-control": "no-cache" },
    signal: AbortSignal.timeout(UPDATE_CHECK_TIMEOUT_MS)
  });
  if (!response.ok) throw new Error(`Update manifest returned ${response.status}`);
  const manifest = await response.json() as { version?: unknown; downloads?: unknown };
  if (typeof manifest.version !== "string") throw new Error("Update manifest has no version");
  parseStableVersion(manifest.version);
  const platformKey = `${process.platform}-${process.arch}`;
  if (!isDownloadMap(manifest.downloads) || typeof manifest.downloads[platformKey] !== "string") {
    throw new Error(`Update manifest has no download for ${platformKey}`);
  }
  const downloadUrl = new URL(manifest.downloads[platformKey]);
  if (!downloadUrl.href.startsWith(LING_DOWNLOAD_URL_PREFIX)) {
    throw new Error("Update download must use the official Ling download directory");
  }
  return {
    version: manifest.version.replace(/^v/, ""),
    downloadUrl: downloadUrl.href
  };
}

function isDownloadMap(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseStableVersion(version: string) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
  if (!match) throw new Error("Invalid application version");
  return [Number(match[1]), Number(match[2]), Number(match[3])] as const;
}

function broadcastUpdateStatus(status: AppUpdateStatus) {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.APP_UPDATE_STATUS_CHANGED, status);
    }
  }
}
