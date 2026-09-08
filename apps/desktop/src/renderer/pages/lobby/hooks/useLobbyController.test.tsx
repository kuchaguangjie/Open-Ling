import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { markInformedConsentConfirmed } from "../../../flows/consultation/informedConsentStorage";
import { resetConsultationFlowStore, useConsultationFlowStore } from "../../../flows/consultation/consultationFlowStore";
import { resetAppStore, useAppStore } from "../../../stores/appStore";
import { resetSessionStore, useSessionStore } from "../../../stores/sessionStore";
import { resetSettingsStore, useSettingsStore } from "../../../stores/settingsStore";
import { useLobbyController } from "./useLobbyController";

describe("useLobbyController direct consultation entry", () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetAppStore();
    resetSessionStore();
    resetConsultationFlowStore();
    resetSettingsStore();
    useSettingsStore.setState((state) => ({ savedApi: { ...state.savedApi, apiKeySaved: true } }));
    vi.unstubAllGlobals();
    markInformedConsentConfirmed("chengling");
  });

  it("未保存的 API 草稿不能跳过正式咨询的模型配置", () => {
    vi.stubGlobal("lingDesktop", { settings: {} });
    useSettingsStore.setState((state) => ({ savedApi: { ...state.savedApi, apiKeySaved: false }, api: { ...state.api, apiKey: "draft-key" } }));
    const { result } = renderHook(() => useLobbyController());
    act(() => result.current.bookAndEnterRoom("chengling"));
    expect(result.current.showModelConnection).toBe(true);
    expect(useSessionStore.getState().sessions).toHaveLength(0);
  });

  it("预约已离开时，迟到的历史读取不会继续创建会谈", async () => {
    let resolve!: (value: number) => void;
    const visits = vi.spyOn(useSessionStore.getState(), "getCounselorVisitCount").mockReturnValue(new Promise<number>((done) => { resolve = done; }));
    const create = vi.spyOn(useSessionStore.getState(), "createDraftSession");
    try {
      const { result, unmount } = renderHook(() => useLobbyController());
      act(() => result.current.bookAndEnterRoom("chengling"));
      unmount();
      await act(async () => { resolve(0); });
      expect(create).not.toHaveBeenCalled();
      expect(useAppStore.getState().activePage).toBe("lobby");
    } finally { visits.mockRestore(); create.mockRestore(); }
  });

  it("再次点击同一位咨询师时直接回到尚未结束的会谈", async () => {
    useSessionStore.setState({
      activeSessionId: "active-chengling",
      currentCounselorId: "chengling",
      sessions: [activeSession()]
    });
    const { result } = renderHook(() => useLobbyController());

    act(() => result.current.bookAndEnterRoom("chengling"));

    await waitFor(() => expect(useConsultationFlowStore.getState().flow).toMatchObject({
      counselorId: "chengling",
      sessionId: "active-chengling",
      surface: { kind: "session" }
    }));
    expect(useSessionStore.getState().sessions).toHaveLength(1);
    expect(useAppStore.getState().activePage).toBe("room");
  });

  it("尚未开始的草稿也会直接进入，不再让用户选择", async () => {
    useSessionStore.setState({
      activeSessionId: "draft-chengling",
      currentCounselorId: "chengling",
      sessions: [{ ...activeSession(), id: "draft-chengling", status: "draft", messages: [] }]
    });
    const { result } = renderHook(() => useLobbyController());

    act(() => result.current.bookAndEnterRoom("chengling"));

    await waitFor(() => expect(useConsultationFlowStore.getState().flow).toMatchObject({
      counselorId: "chengling",
      sessionId: "draft-chengling",
      surface: { kind: "arrival" }
    }));
    expect(result.current.bookingError).toBeNull();
  });

  it("没有未结束会谈时直接创建并进入新的咨询", async () => {
    const { result } = renderHook(() => useLobbyController());

    act(() => result.current.bookAndEnterRoom("chengling"));

    await waitFor(() => expect(useConsultationFlowStore.getState().flow).toMatchObject({
      counselorId: "chengling",
      surface: { kind: "arrival" }
    }));
    expect(useSessionStore.getState().sessions).toHaveLength(1);
    expect(useAppStore.getState().activePage).toBe("room");
  });

  it("桌面端没有配置模型时，先补连 API，再进入知情同意", () => {
    vi.stubGlobal("lingDesktop", { settings: {} });
    window.localStorage.clear();
    act(() => useSettingsStore.setState((state) => ({ savedApi: { ...state.savedApi, apiKeySaved: false, apiKey: "" } })));
    const { result } = renderHook(() => useLobbyController());

    act(() => result.current.bookAndEnterRoom("linyueshui"));

    expect(result.current.showModelConnection).toBe(true);
    expect(result.current.showInformedConsent).toBe(false);
    expect(useSessionStore.getState().sessions).toHaveLength(0);

    act(() => result.current.completeModelConnection());

    expect(result.current.showModelConnection).toBe(false);
    expect(result.current.showInformedConsent).toBe(true);
  });

  it("开发网页版使用本地代理，不要求在浏览器填写 API Key", () => {
    window.localStorage.clear();
    act(() => useSettingsStore.setState((state) => ({ savedApi: { ...state.savedApi, apiKeySaved: false, apiKey: "" } })));
    const { result } = renderHook(() => useLobbyController());

    act(() => result.current.bookAndEnterRoom("linyueshui"));

    expect(result.current.showModelConnection).toBe(false);
    expect(result.current.showInformedConsent).toBe(true);
  });

  it("未设置密码时先显示安全设置，完成后接着进入知情同意", () => {
    window.localStorage.clear();
    const onSecuritySetupComplete = vi.fn();
    const { result } = renderHook(() => useLobbyController({
      onSecuritySetupComplete,
      requiresSecuritySetup: true
    }));

    act(() => result.current.bookAndEnterRoom("linyueshui"));

    expect(result.current.showSecuritySetup).toBe(true);
    expect(result.current.showInformedConsent).toBe(false);
    expect(useSessionStore.getState().sessions).toHaveLength(0);

    act(() => result.current.completeSecuritySetup());

    expect(onSecuritySetupComplete).toHaveBeenCalledTimes(1);
    expect(result.current.showSecuritySetup).toBe(false);
    expect(result.current.showInformedConsent).toBe(true);
  });

  it("暂不开启密码时继续本次咨询准备，且不标记为已完成安全设置", async () => {
    window.localStorage.clear();
    const onSecuritySetupComplete = vi.fn();
    const { result } = renderHook(() => useLobbyController({
      onSecuritySetupComplete,
      requiresSecuritySetup: true
    }));

    act(() => result.current.bookAndEnterRoom("linyueshui"));
    await waitFor(() => expect(result.current.showSecuritySetup).toBe(true));
    act(() => result.current.skipSecuritySetup());

    expect(onSecuritySetupComplete).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(result.current.showSecuritySetup).toBe(false);
      expect(result.current.showInformedConsent).toBe(true);
    });
    expect(useSessionStore.getState().sessions).toHaveLength(0);
  });

  it("暂不连接时回到预约，不创建会谈", () => {
    vi.stubGlobal("lingDesktop", { settings: {} });
    act(() => useSettingsStore.setState((state) => ({ savedApi: { ...state.savedApi, apiKeySaved: false, apiKey: "" } })));
    const { result } = renderHook(() => useLobbyController());

    act(() => result.current.bookAndEnterRoom("chengling"));
    act(() => result.current.cancelModelConnection());

    expect(result.current.showModelConnection).toBe(false);
    expect(result.current.activeFeatureId).toBe("booking");
    expect(useSessionStore.getState().sessions).toHaveLength(0);
  });
});

function activeSession() {
  return {
    id: "active-chengling",
    title: "与程灵的会谈",
    time: "刚刚",
    preview: "还在进行中",
    counselorId: "chengling",
    roomThemeId: "warm-study",
    teamId: "one-way-mirror",
    modelName: "deepseek-v4-flash",
    status: "active" as const,
    createdAt: "2026-07-14T08:00:00.000Z",
    startedAt: "2026-07-14T08:00:00.000Z",
    updatedAt: "2026-07-14T08:30:00.000Z",
    messagesLoaded: true,
    messages: []
  };
}
