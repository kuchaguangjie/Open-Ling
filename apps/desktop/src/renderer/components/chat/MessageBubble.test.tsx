import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MessageBubble } from "./MessageBubble";

describe("MessageBubble", () => {
  it("在已完成的咨询师回复右下角提供复制按钮和悬停说明", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText }
    });

    render(<MessageBubble content="我听见了。" name="程灵" role="assistant" status="sent" />);

    const copyButton = screen.getByRole("button", { name: "复制" });
    expect(screen.getByRole("tooltip")).toHaveTextContent("复制");

    fireEvent.click(copyButton);
    expect(writeText).toHaveBeenCalledWith("我听见了。");
  });

  it("不在用户消息或尚未完成的咨询师回复上显示复制按钮", () => {
    const { rerender } = render(<MessageBubble content="我的消息" name="我" role="user" status="sent" />);
    expect(screen.queryByRole("button", { name: "复制" })).not.toBeInTheDocument();

    rerender(<MessageBubble content="正在回复" name="程灵" role="assistant" status="sending" />);
    expect(screen.queryByRole("button", { name: "复制" })).not.toBeInTheDocument();
  });

  it("流式文字已出现时仍保留有温度的回应状态，且不锁死气泡高度", () => {
    const { rerender } = render(
      <MessageBubble
        activityLabel="程灵正在慢慢回应"
        content="我听见了。"
        name="程灵"
        role="assistant"
        status="sending"
      />
    );

    expect(screen.getByText("程灵正在慢慢回应")).toBeInTheDocument();
    expect(document.querySelector<HTMLElement>(".message-bubble.assistant")?.style.height).toBe("");

    rerender(
      <MessageBubble
        activityLabel="程灵正在慢慢回应"
        content="我听见了。我们可以慢慢来，不需要急着把每件事都说清楚。"
        name="程灵"
        role="assistant"
        status="sending"
      />
    );

    expect(screen.getByText("程灵正在慢慢回应")).toBeInTheDocument();
    expect(document.querySelector<HTMLElement>(".message-bubble.assistant")?.style.height).toBe("");
  });
});
