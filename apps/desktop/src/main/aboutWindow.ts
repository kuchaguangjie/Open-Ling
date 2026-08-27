import { app, BrowserWindow, shell } from "electron";
import { readFileSync } from "node:fs";
import {
  LING_CONTACT_EMAIL,
  LING_COPYRIGHT_NOTICE,
  LING_MAINTAINER,
  LING_PROJECT_RELEASE_STATUS
} from "./appIdentity.js";
import { isSafeExternalUrl } from "./security/rendererUrlPolicy.js";
import { getAppIconPath } from "./window.js";

let aboutWindow: BrowserWindow | null = null;

export async function showAboutWindow(parent?: BrowserWindow | null) {
  if (aboutWindow && !aboutWindow.isDestroyed()) {
    aboutWindow.show();
    aboutWindow.focus();
    return;
  }

  const iconData = readFileSync(getAppIconPath()).toString("base64");
  aboutWindow = new BrowserWindow({
    ...(parent ? { parent } : {}),
    width: 460,
    height: 450,
    title: "关于 Ling",
    backgroundColor: "#f2f3f4",
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    resizable: false,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  aboutWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeAboutUrl(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  aboutWindow.webContents.on("will-navigate", (event, url) => {
    event.preventDefault();
    if (isSafeAboutUrl(url)) void shell.openExternal(url);
  });
  aboutWindow.once("ready-to-show", () => aboutWindow?.show());
  aboutWindow.once("closed", () => {
    aboutWindow = null;
  });

  const html = createAboutWindowHtml({
    iconData,
    version: app.getVersion()
  });
  await aboutWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`);
}

export function createAboutWindowHtml(input: { iconData: string; version: string }) {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>关于 Ling</title>
    <style>
      :root { color-scheme: light; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", sans-serif; }
      * { box-sizing: border-box; }
      html, body { width: 100%; height: 100%; margin: 0; }
      body { background: #f2f3f4; color: #1f2023; user-select: none; }
      main { min-height: 100%; padding: 42px 34px 26px; display: flex; flex-direction: column; align-items: center; text-align: center; }
      img { width: 94px; height: 94px; border-radius: 22px; box-shadow: 0 7px 18px rgba(29, 33, 38, 0.18); }
      h1 { margin: 23px 0 6px; font-size: 30px; line-height: 1.15; font-weight: 700; letter-spacing: -0.4px; }
      .version { margin: 0; color: #555960; font-size: 15px; line-height: 1.4; }
      .details { margin: 27px 0 0; display: grid; gap: 9px; justify-items: center; font-size: 15px; line-height: 1.35; }
      .details p { margin: 0; }
      a { color: #30343a; text-decoration: none; }
      a:hover { color: #47654a; text-decoration: underline; }
      .copyright { margin: auto 0 0; color: #686b70; font-size: 13px; line-height: 1.4; }
    </style>
  </head>
  <body>
    <main>
      <img alt="Ling" src="data:image/png;base64,${input.iconData}" />
      <h1>Ling</h1>
      <p class="version">v${escapeHtml(input.version)}</p>
      <section class="details" aria-label="项目信息">
        <p>${LING_MAINTAINER}</p>
        <p><a href="mailto:${LING_CONTACT_EMAIL}">${LING_CONTACT_EMAIL}</a></p>
        <p>${LING_PROJECT_RELEASE_STATUS}</p>
      </section>
      <p class="copyright">${LING_COPYRIGHT_NOTICE}</p>
    </main>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isSafeAboutUrl(url: string) {
  return isSafeExternalUrl(url) || url === `mailto:${LING_CONTACT_EMAIL}`;
}
