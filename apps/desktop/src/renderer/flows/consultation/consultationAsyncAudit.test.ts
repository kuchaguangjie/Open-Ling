import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore, resetAppStore } from "../../stores/appStore";
import { useSessionStore, resetSessionStore } from "../../stores/sessionStore";
import { resetSettingsStore, useSettingsStore } from "../../stores/settingsStore";
import { useConsultationFlowStore, resetConsultationFlowStore } from "./consultationFlowStore";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe("consultation async audit", () => {
  beforeEach(() => {
    vi.unstubAllGlobals(); resetAppStore(); resetSessionStore(); resetSettingsStore(); resetConsultationFlowStore();
  });
  afterEach(() => vi.restoreAllMocks());

  it("does not create a replacement after leaving during visit-history loading", async () => {
    const gate = deferred<number>();
    vi.spyOn(useSessionStore.getState(), "getCounselorVisitCount").mockReturnValue(gate.promise);
    const create = vi.spyOn(useSessionStore.getState(), "createDraftSession");
    useConsultationFlowStore.getState().openActiveSession({ counselorId: "chengling", sessionId: "old" });
    const pending = useConsultationFlowStore.getState().startNewConsultation();
    useConsultationFlowStore.getState().leaveForLobby();
    gate.resolve(1);
    await pending;
    expect(create).not.toHaveBeenCalled();
    expect(useAppStore.getState().activePage).toBe("lobby");
  });

  it.each([true, false])("does not navigate away from another session when an old cancellation completes (%s)", async (ok) => {
    const gate = deferred<{ ok: true } | { ok: false; message: string }>();
    vi.spyOn(useSessionStore.getState(), "deleteDraftSession").mockReturnValue(gate.promise);
    useConsultationFlowStore.getState().openDraftSession({ counselorId: "chengling", sessionId: "old", script: "first" });
    useConsultationFlowStore.getState().finishArrival();
    const pending = useConsultationFlowStore.getState().cancelOpening();
    useConsultationFlowStore.getState().openActiveSession({ counselorId: "zhouzhou", sessionId: "new" });
    gate.resolve(ok ? { ok: true } : { ok: false, message: "Old failure" });
    await pending;
    expect(useConsultationFlowStore.getState().flow?.sessionId).toBe("new");
    expect(useConsultationFlowStore.getState().error).toBeUndefined();
    expect(useAppStore.getState().activePage).toBe("room");
  });

  it("ignores an old activation even when the same session has been reopened", async () => {
    const gate = deferred<{ ok: true }>();
    vi.spyOn(useSessionStore.getState(), "activateDraftSession").mockReturnValue(gate.promise);
    const input = { counselorId: "chengling", sessionId: "same", script: "first" as const };
    useConsultationFlowStore.getState().openDraftSession(input);
    useConsultationFlowStore.getState().finishArrival();
    const pending = useConsultationFlowStore.getState().startSession();
    useConsultationFlowStore.getState().leaveForLobby();
    useConsultationFlowStore.getState().openDraftSession(input);
    gate.resolve({ ok: true });
    await pending;
    expect(useConsultationFlowStore.getState().flow?.surface.kind).toBe("arrival");
  });

  it("uses committed configuration for session creation and sending, never settings drafts", async () => {
    const state = useSettingsStore.getState();
    useSettingsStore.setState({ savedApi: { ...state.savedApi, modelName: "committed-model", apiBaseUrl: "https://saved.example.com/v1" } });
    state.updateApi({ modelName: "draft-model", apiKey: "draft-secret", apiBaseUrl: "https://draft.example.com/v1" });
    await useSessionStore.getState().createSession();
    expect(useSessionStore.getState().sessions[0].modelName).toBe("committed-model");
    const streamMessage = vi.fn(async () => ({ ok: true, data: { requestId: "test" } }));
    vi.stubGlobal("lingDesktop", { counseling: { streamMessage } });
    expect(useSessionStore.getState().sendPrototypeMessage("测试消息")).toBe(true);
    expect(streamMessage).toHaveBeenCalledWith(expect.objectContaining({ api: expect.objectContaining({ apiBaseUrl: "https://saved.example.com/v1", apiKey: "", modelName: "committed-model" }) }), expect.anything());
  });
});
