import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ConsultationPreparation, SessionLetter } from "@shared/index";
import { CounselingRoomMessageStream } from "./CounselingRoomMessageStream";

const now = "2026-07-14T10:00:00.000Z";
const basePreparation: ConsultationPreparation = {
  id: "preparation-1",
  sessionId: "session-1",
  counselorId: "chengling",
  sourceEndedAt: now,
  modelName: "test",
  status: "processing",
  phase: "supervision",
  createdAt: now,
  updatedAt: now
};
const pendingLetter: SessionLetter = {
  id: "letter-1",
  sessionId: "session-1",
  counselorId: "chengling",
  modelName: "test",
  letterMd: "",
  status: "pending",
  createdAt: now,
  updatedAt: now
};
const session = {
  id: "session-1",
  title: "会谈记录",
  time: "今天",
  preview: "",
  counselorId: "chengling",
  roomThemeId: "warm-study",
  modelName: "test",
  status: "ended" as const,
  endedAt: now,
  messages: []
};

function renderStream(preparation?: ConsultationPreparation, mode: "history-archive" | "history-closing" = "history-archive") {
  render(
    <CounselingRoomMessageStream
      activePreparation={preparation}
      activeSession={session}
      activeSessionLetter={pendingLetter}
      counselorAvatarSrc="/avatar.png"
      counselorName="程灵"
      isSessionEnded
      mode={mode}
      onOpenLetter={vi.fn()}
      onRegenerateLetter={vi.fn()}
      onRetryMessage={vi.fn()}
      onRetryPreparation={vi.fn()}
      streamRef={createRef<HTMLDivElement>()}
      userDisplayName="你"
      waitingActivityText=""
    />
  );
}

describe("CounselingRoomMessageStream post-session handoff", () => {
  it("整理进行中只显示统一进度，不公开内部阶段或重复显示来信进度", () => {
    renderStream(basePreparation);

    expect(screen.getByRole("heading", { name: "正在整理" })).toBeInTheDocument();
    expect(screen.getByText("Ling 正在整理这次咨询，并准备咨询师来信。你可以先返回等待室，处理会继续进行。")).toBeInTheDocument();
    expect(screen.queryByText("正在进行 AI 内部复核")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("咨询师的来信")).not.toBeInTheDocument();
  });

  it("整理完成后移除完成卡，并把位置交给来信状态", () => {
    renderStream({ ...basePreparation, status: "ready", phase: "complete" });

    expect(screen.queryByLabelText("咨询结束后的整理进度")).not.toBeInTheDocument();
    expect(screen.getByLabelText("咨询师的来信")).toBeInTheDocument();
  });

  it("结束后的回看不显示来信卡，来信只从等待室底栏查看", () => {
    renderStream(basePreparation, "history-closing");

    expect(screen.queryByRole("heading", { name: "正在整理" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("咨询师的来信")).not.toBeInTheDocument();
  });

  it("旧周期失效时不展示技术状态或旧来信卡", () => {
    renderStream({ ...basePreparation, status: "stale" });

    expect(screen.queryByLabelText("咨询结束后的整理进度")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("咨询师的来信")).not.toBeInTheDocument();
    expect(screen.queryByText(/已继续本次咨询|已停止/)).not.toBeInTheDocument();
  });
});

describe("CounselingRoomMessageStream user identity", () => {
  it("uses the profile display name for user messages", () => {
    render(
      <CounselingRoomMessageStream
        activeSession={{
          ...session,
          messages: [{
            id: "message-1",
            sessionId: session.id,
            role: "user",
            content: "你好",
            createdAt: now,
            status: "sent"
          }]
        }}
        counselorAvatarSrc="/avatar.png"
        counselorName="程灵"
        isSessionEnded
        onOpenLetter={vi.fn()}
        onRegenerateLetter={vi.fn()}
        onRetryMessage={vi.fn()}
        onRetryPreparation={vi.fn()}
        streamRef={createRef<HTMLDivElement>()}
        userDisplayName="Bella"
        waitingActivityText=""
      />
    );

    expect(screen.getByText("Bella")).toBeInTheDocument();
    expect(screen.queryByText("你")).not.toBeInTheDocument();
  });
});
