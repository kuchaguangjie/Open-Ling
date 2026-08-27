import { app, BrowserWindow, screen, shell } from "electron";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { LING_APP_NAME } from "./appIdentity.js";
import { isSafeExternalUrl, isTrustedRendererUrl } from "./security/rendererUrlPolicy.js";
import { installAutomaticWindowZoom } from "./windowZoom.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultWindowTitle = LING_APP_NAME;
const smokeTestArgument = "--smoke-test";

function getWindowTitle() {
  return process.env.LING_APP_TITLE?.trim() || defaultWindowTitle;
}

export function getAppIconPath() {
  if (app.isPackaged) {
    return resolve(process.resourcesPath, "assets/app/ling-app-icon-512.png");
  }
  return resolve(__dirname, "../../../../../assets/app/ling-app-icon-512.png");
}

export async function createMainWindow() {
  const icon = getAppIconPath();
  const title = getWindowTitle();
  const isSmokeTest = process.argv.includes(smokeTestArgument);
  const { width: availableWidth, height: availableHeight } = screen.getPrimaryDisplay().workAreaSize;
  const width = Math.min(1320, availableWidth);
  const height = Math.min(860, availableHeight);

  if (process.platform === "darwin") {
    app.dock?.setIcon(icon);
  }

  const window = new BrowserWindow({
    title,
    width,
    height,
    minWidth: Math.min(1100, width),
    minHeight: Math.min(720, height),
    backgroundColor: "#f4f2ec",
    icon,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      preload: resolve(__dirname, "../preload/index.cjs")
    }
  });

  installAutomaticWindowZoom(window);

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  const blockUntrustedNavigation = (url: string) => {
    if (!isTrustedRendererUrl(url)) {
      return false;
    }
    return true;
  };
  window.webContents.on("will-navigate", (event, url) => {
    if (!blockUntrustedNavigation(url)) event.preventDefault();
  });
  window.webContents.on("will-redirect", (event, url) => {
    if (!blockUntrustedNavigation(url)) event.preventDefault();
  });

  window.once("ready-to-show", () => {
    if (!isSmokeTest) window.show();
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    await window.loadURL(devServerUrl);
  } else {
    await window.loadFile(resolve(__dirname, "../../../../../dist/index.html"));
  }

  if (isSmokeTest) {
    const rendererMounted = await window.webContents.executeJavaScript(
      "Boolean(document.querySelector('#root > .app-shell'))",
      true
    );
    if (!rendererMounted) {
      throw new Error("Packaged renderer did not mount the Ling app shell.");
    }
  }

  return window;
}
