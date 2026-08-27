import type { BrowserWindow } from "electron";

const referenceLayoutWidth = 1_920;
const referenceLayoutHeight = 1_080;
const minimumUsefulZoom = 1.2;
const maximumAutomaticZoom = 2.5;
const zoomStep = 0.05;
const resizeDebounceMs = 80;

export function getAutomaticWindowZoomFactor(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return 1;
  const fittedScale = Math.min(width / referenceLayoutWidth, height / referenceLayoutHeight);
  if (fittedScale < minimumUsefulZoom) return 1;
  const steppedScale = Math.floor(fittedScale / zoomStep) * zoomStep;
  return Math.min(maximumAutomaticZoom, Math.max(1, Number(steppedScale.toFixed(2))));
}

/** Keeps large and full-screen windows close to Ling's readable 1080p layout density. */
export function installAutomaticWindowZoom(window: BrowserWindow) {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const applyZoom = () => {
    if (window.isDestroyed() || window.webContents.isDestroyed()) return;
    const [width, height] = window.getContentSize();
    window.webContents.setZoomFactor(getAutomaticWindowZoomFactor(width, height));
  };
  const scheduleZoom = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      applyZoom();
    }, resizeDebounceMs);
  };
  const cleanup = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
  };

  window.webContents.on("did-finish-load", applyZoom);
  window.on("resize", scheduleZoom);
  window.on("maximize", scheduleZoom);
  window.on("unmaximize", scheduleZoom);
  window.on("enter-full-screen", scheduleZoom);
  window.on("leave-full-screen", scheduleZoom);
  window.once("closed", cleanup);
  applyZoom();
}
