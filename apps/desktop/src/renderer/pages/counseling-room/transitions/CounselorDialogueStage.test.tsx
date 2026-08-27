import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CounselorDialogueStage } from "./CounselorDialogueStage";

describe("CounselorDialogueStage 咨询师姓名牌", () => {
  it.each(["程灵", "周舟", "林乐水"])("为 %s 只显示姓名和心理咨询师身份", (counselorName) => {
    const { container } = render(
      <CounselorDialogueStage
        counselorName={counselorName}
        phase="opening"
        text="我在这里。"
      />
    );

    const nameplate = container.querySelector(".consultation-dialogue-nameplate");
    expect(nameplate).toHaveTextContent(`${counselorName}心理咨询师`);
    expect(nameplate).not.toHaveTextContent(/AI|工作室/);
    expect(screen.getByRole("heading", { name: counselorName })).toBeInTheDocument();
    expect(container.querySelector(".consultation-dialogue-kicker")).toHaveTextContent("心理咨询师");
  });
});
