// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { CounselingSession } from "@shared/index";
import { loadOrCreateSessionMemoryContext } from "./sessionMemorySnapshot";

function session(overrides: Partial<CounselingSession> = {}): CounselingSession {
  return {
    id: "session-current",
    title: "当前会谈",
    counselorId: "chengling",
    roomThemeId: "quiet-study",
    modelName: "deepseek-v4-flash",
    status: "active",
    ...overrides
  };
}

describe("loadOrCreateSessionMemoryContext", () => {
  it("loads the latest memo once and saves its session snapshot", async () => {
    const loadCurrentContext = vi.fn().mockResolvedValue({
      consultationMemo: "咨询备忘录 v1",
      sourceMemoId: "memo-1"
    });
    const saveSnapshot = vi.fn().mockResolvedValue(undefined);

    const result = await loadOrCreateSessionMemoryContext({
      session: session(),
      enabled: true,
      loadCurrentContext,
      saveSnapshot,
      now: "2026-07-10T08:00:00.000Z"
    });

    expect(result).toEqual({
      consultationMemo: "咨询备忘录 v1",
      sourceMemoId: "memo-1"
    });
    expect(loadCurrentContext).toHaveBeenCalledTimes(1);
    expect(saveSnapshot).toHaveBeenCalledWith({
      version: 2,
      enabled: true,
      consultationMemo: "咨询备忘录 v1",
      sourceMemoId: "memo-1",
      createdAt: "2026-07-10T08:00:00.000Z"
    });
  });

  it("reuses the saved session snapshot without loading a newer memo", async () => {
    const loadCurrentContext = vi.fn().mockResolvedValue({ consultationMemo: "咨询备忘录 v2" });
    const saveSnapshot = vi.fn().mockResolvedValue(undefined);

    const result = await loadOrCreateSessionMemoryContext({
      session: session({
        memorySnapshot: {
          version: 2,
          enabled: true,
          consultationMemo: "咨询备忘录 v1",
          sourceMemoId: "memo-1",
          createdAt: "2026-07-10T08:00:00.000Z"
        }
      }),
      enabled: true,
      loadCurrentContext,
      saveSnapshot,
      now: "2026-07-10T09:00:00.000Z"
    });

    expect(result).toEqual({
      consultationMemo: "咨询备忘录 v1",
      sourceMemoId: "memo-1"
    });
    expect(loadCurrentContext).not.toHaveBeenCalled();
    expect(saveSnapshot).not.toHaveBeenCalled();
  });

  it("freezes a disabled session without loading the current memo", async () => {
    const loadCurrentContext = vi.fn().mockResolvedValue({ consultationMemo: "不应读取" });
    const saveSnapshot = vi.fn().mockResolvedValue(undefined);

    const result = await loadOrCreateSessionMemoryContext({
      session: session(),
      enabled: false,
      loadCurrentContext,
      saveSnapshot,
      now: "2026-07-10T08:00:00.000Z"
    });

    expect(result).toEqual({});
    expect(loadCurrentContext).not.toHaveBeenCalled();
    expect(saveSnapshot).toHaveBeenCalledWith({
      version: 2,
      enabled: false,
      createdAt: "2026-07-10T08:00:00.000Z"
    });
  });
});
