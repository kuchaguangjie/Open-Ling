import { EventEmitter } from "node:events";
import type { BrowserWindow } from "electron";
import { describe, expect, it, vi } from "vitest";
import { getAutomaticWindowZoomFactor, installAutomaticWindowZoom } from "./windowZoom";

describe("automatic window zoom", () => {
  it.each([
    [1_320, 860, 1],
    [1_920, 1_080, 1],
    [2_560, 1_440, 1.3],
    [3_440, 1_440, 1.3],
    [3_840, 2_160, 2],
    [4_096, 2_160, 2],
    [5_120, 2_880, 2.5]
  ])("maps %d×%d to a readable zoom factor", (width, height, expected) => {
    expect(getAutomaticWindowZoomFactor(width, height)).toBe(expected);
  });

  it("falls back safely for invalid dimensions", () => {
    expect(getAutomaticWindowZoomFactor(0, 2_160)).toBe(1);
    expect(getAutomaticWindowZoomFactor(Number.NaN, 2_160)).toBe(1);
  });

  it("updates the whole renderer zoom after a large window is resized or enters full screen", () => {
    vi.useFakeTimers();
    let contentSize: [number, number] = [1_320, 860];
    const windowEvents = new EventEmitter();
    const webContentsEvents = new EventEmitter();
    const setZoomFactor = vi.fn();
    const fakeWindow = Object.assign(windowEvents, {
      getContentSize: () => contentSize,
      isDestroyed: () => false,
      webContents: Object.assign(webContentsEvents, {
        isDestroyed: () => false,
        setZoomFactor
      })
    }) as unknown as BrowserWindow;

    installAutomaticWindowZoom(fakeWindow);
    expect(setZoomFactor).toHaveBeenLastCalledWith(1);

    contentSize = [3_840, 2_160];
    windowEvents.emit("resize");
    vi.advanceTimersByTime(80);
    expect(setZoomFactor).toHaveBeenLastCalledWith(2);

    contentSize = [2_560, 1_440];
    windowEvents.emit("enter-full-screen");
    vi.advanceTimersByTime(80);
    expect(setZoomFactor).toHaveBeenLastCalledWith(1.3);
    vi.useRealTimers();
  });
});
