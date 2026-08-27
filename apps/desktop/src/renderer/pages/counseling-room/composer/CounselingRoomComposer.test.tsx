import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { CounselingRoomComposer } from "./CounselingRoomComposer";

describe("CounselingRoomComposer", () => {
  it("offers local voice input and uses a compact send action", () => {
    render(
      <CounselingRoomComposer
        attachmentAcceptValue=".txt"
        attachmentError=""
        attachmentNotice=""
        draft="想说一点事情"
        fileInputRef={createRef<HTMLInputElement>()}
        hasActiveSession
        isBusyInAnotherSession={false}
        isComposerDisabled={false}
        isSendDisabled={false}
        isActiveSessionStreaming={false}
        isSessionEnded={false}
        pendingAttachments={[]}
        onAttachmentChange={vi.fn()}
        onCancelStreaming={vi.fn()}
        onDraftBlur={vi.fn()}
        onDraftChange={vi.fn()}
        onDraftFocus={vi.fn()}
        onDraftPaste={vi.fn()}
        onRemoveAttachment={vi.fn()}
        onSend={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "开始语音输入" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "发送" })).toBeInTheDocument();
    expect(screen.getByRole("tooltip", { name: /语音输入.*可在设置中添加快捷键/ })).toBeInTheDocument();
    expect(screen.queryByText("发送")).not.toBeInTheDocument();
  });
});
