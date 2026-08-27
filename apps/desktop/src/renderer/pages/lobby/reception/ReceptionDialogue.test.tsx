import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReceptionDialogue } from "./ReceptionDialogue";

describe("咨询师前台对白框", () => {
  it("名字牌显示人物姓名和小号职位", () => {
    render(
      <ReceptionDialogue
        counselorId="chengling"
        counselorName="程灵"
        onAdvance={vi.fn()}
        options={[]}
        showChoices={false}
        text="你好，欢迎来到 Ling。"
      />
    );

    const dialogue = screen.getByRole("dialog", { name: "咨询师的前台对话" });
    expect(dialogue.querySelector(".lobby-dialogue-panel")).toBeInTheDocument();
    expect(dialogue.querySelector(".lobby-dialogue-name")).toHaveTextContent("程灵");
    expect(dialogue.querySelector(".lobby-dialogue-role")).toHaveTextContent("咨询师");
  });
});
