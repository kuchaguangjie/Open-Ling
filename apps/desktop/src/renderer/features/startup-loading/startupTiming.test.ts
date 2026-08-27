import { describe, expect, it } from "vitest";
import {
  getStartupDelayBeforeReady,
  STARTUP_EXIT_DURATION_MS,
  STARTUP_MINIMUM_VISIBLE_MS,
  STARTUP_PHASE_MIN_VISIBLE_MS,
  STARTUP_READY_HOLD_MS
} from "./startupTiming";

describe("启动页展示时序", () => {
  it("每个用户可见阶段至少保留一秒", () => {
    expect(STARTUP_MINIMUM_VISIBLE_MS).toBe(3_000);
    expect(STARTUP_PHASE_MIN_VISIBLE_MS).toBe(1_000);
    expect(STARTUP_READY_HOLD_MS).toBe(1_000);
    expect(getStartupDelayBeforeReady(0, 160)).toBe(1_840);
    expect(getStartupDelayBeforeReady(0, 2_000)).toBe(0);
  });

  it("后台耗时超过最短展示时间时，不额外等待", () => {
    expect(getStartupDelayBeforeReady(0, 3_001)).toBe(0);
  });

  it("退场等待只比 CSS 淡出稍长，不留下透明阻塞层", () => {
    expect(STARTUP_EXIT_DURATION_MS).toBe(180);
  });
});
