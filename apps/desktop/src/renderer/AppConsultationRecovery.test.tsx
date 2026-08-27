import { StrictMode } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CounselingSession } from "@shared/index";
import { readActiveConsultationFlow, writeActiveConsultationFlow } from "./flows/consultation/consultationFlowStorage";
import { resetConsultationFlowStore } from "./flows/consultation/consultationFlowStore";
import { App } from "./App";
import { resetAppStore } from "./stores/appStore";
import { resetSessionStore } from "./stores/sessionStore";
import { resetSettingsStore } from "./stores/settingsStore";

describe("App 咨询流程恢复", () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetAppStore();
    resetSessionStore();
    resetSettingsStore();
    resetConsultationFlowStore();
    vi.unstubAllGlobals();
  });

  it("先读回数据库，再把 starting + active 校正为正式咨询", async () => {
    const session = persistedSession("active");
    writeActiveConsultationFlow({
      counselorId: "chengling",
      sessionId: session.id,
      script: "first",
      surface: { kind: "starting", lineIndex: 2 }
    });
    vi.stubGlobal("lingDesktop", desktopApi(session));

    render(<App />);

    expect(screen.getByRole("region", { name: "正在读取 Ling 本机资料" })).toBeInTheDocument();
    expect(await screen.findByLabelText("会谈输入框")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "咨询开场" })).not.toBeInTheDocument();
  });

  it("保存的 opening 只有数据库仍为 draft 时才恢复开场", async () => {
    const session = persistedSession("draft");
    writeActiveConsultationFlow({
      counselorId: "chengling",
      sessionId: session.id,
      script: "first",
      surface: { kind: "opening", lineIndex: 1 }
    });
    vi.stubGlobal("lingDesktop", desktopApi(session));

    render(<App />);

    expect(await screen.findByRole("region", { name: "咨询开场" })).toBeInTheDocument();
    expect(screen.queryByLabelText("会谈输入框")).not.toBeInTheDocument();
  });

  it("StrictMode 两次启动共享同一次读取，不会提前清除恢复指针", async () => {
    const session = persistedSession("active");
    writeActiveConsultationFlow({
      counselorId: "chengling",
      sessionId: session.id,
      script: "returning",
      surface: { kind: "session" }
    });
    let resolveList!: (value: { ok: true; data: CounselingSession[] }) => void;
    const list = vi.fn(() => new Promise<{ ok: true; data: CounselingSession[] }>((resolve) => {
      resolveList = resolve;
    }));
    vi.stubGlobal("lingDesktop", {
      ...desktopApi(session),
      sessions: { ...desktopApi(session).sessions, list }
    });

    render(<StrictMode><App /></StrictMode>);

    await waitFor(() => expect(list).toHaveBeenCalledTimes(1));
    expect(readActiveConsultationFlow()?.sessionId).toBe(session.id);
    await act(async () => resolveList({ ok: true, data: [session] }));
    expect(await screen.findByLabelText("会谈输入框")).toBeInTheDocument();
    expect(readActiveConsultationFlow()?.surface.kind).toBe("session");
  });

  it("读取失败保留恢复指针并允许重试", async () => {
    const session = persistedSession("active");
    writeActiveConsultationFlow({
      counselorId: "chengling",
      sessionId: session.id,
      script: "returning",
      surface: { kind: "session" }
    });
    const list = vi
      .fn()
      .mockResolvedValueOnce({ ok: false as const, error: { code: "INTERNAL", message: "数据库暂时忙碌" } })
      .mockResolvedValueOnce({ ok: true as const, data: [session] });
    vi.stubGlobal("lingDesktop", {
      ...desktopApi(session),
      sessions: { ...desktopApi(session).sessions, list }
    });

    render(<App />);

    expect(await screen.findByRole("region", { name: "Ling 本机资料读取失败" })).toBeInTheDocument();
    expect(readActiveConsultationFlow()?.sessionId).toBe(session.id);
    fireEvent.click(screen.getByRole("button", { name: "重新读取" }));
    expect(await screen.findByLabelText("会谈输入框")).toBeInTheDocument();
    expect(list).toHaveBeenCalledTimes(2);
  });
});

function desktopApi(session: CounselingSession) {
  return {
    settings: { read: vi.fn(async () => ({ ok: true as const, data: null })) },
    sessions: {
      list: vi.fn(async () => ({ ok: true as const, data: [session] })),
      get: vi.fn(async () => ({ ok: true as const, data: session }))
    },
    messages: { listBySessionId: vi.fn(async () => ({ ok: true as const, data: [] })) }
  };
}

function persistedSession(status: CounselingSession["status"]): CounselingSession {
  const now = "2026-07-12T12:00:00.000Z";
  return {
    id: "session-restored",
    title: "恢复中的会谈",
    counselorId: "chengling",
    roomThemeId: "warm-study",
    teamId: "one-way-mirror",
    modelName: "test",
    createdAt: now,
    startedAt: now,
    updatedAt: now,
    status
  };
}
