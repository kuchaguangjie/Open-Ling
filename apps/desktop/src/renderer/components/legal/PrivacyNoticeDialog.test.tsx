import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PrivacyNoticeDialog } from "./PrivacyNoticeDialog";

describe("PrivacyNoticeDialog", () => {
  it("opens with the short version and exposes a close action", () => {
    const onClose = vi.fn();
    render(<PrivacyNoticeDialog onClose={onClose} />);

    expect(screen.getByRole("heading", { name: "Ling 隐私说明" })).toBeInTheDocument();
    expect(screen.getAllByText(/官方版本不会通过 Ling 自有服务器接收会谈/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/openling@xiaoqunpsy\.cn/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "关闭隐私说明" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
