import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConsultationArrivalStage, formatConsultationArrivalCopy } from "./ConsultationArrivalStage";

describe("ConsultationArrivalStage", () => {
  afterEach(() => vi.useRealTimers());

  it("先只显示完整背景和真实日期场记，再自动进入开场", () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    const date = new Date("2026-07-13T09:30:00+08:00");

    render(
      <ConsultationArrivalStage
        backgroundSrc="/room.png"
        counselorName="程灵"
        date={date}
        onComplete={onComplete}
      />
    );

    const stage = screen.getByRole("region", { name: "进入咨询室" });
    expect(stage).toHaveStyle({ "--consultation-dialogue-background": "url(/room.png)" });
    expect(screen.getByText("2026年7月13日 · 群心心理工作室 · 程灵的咨询室", { selector: ".sr-only" })).toBeInTheDocument();
    expect(document.querySelector(".consultation-dialogue-portrait")).not.toBeInTheDocument();
    expect(document.querySelector(".consultation-dialogue-card")).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(3_000));
    act(() => vi.advanceTimersByTime(3_100));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("逐字阶段第一次点击补全场记，第二次点击立即继续", () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();

    render(
      <ConsultationArrivalStage
        counselorName="程灵"
        date={new Date("2026-07-13T09:30:00+08:00")}
        onComplete={onComplete}
      />
    );

    const stage = screen.getByRole("button", { name: "立即显示完整场记" });
    fireEvent.click(stage);
    expect(document.querySelector(".consultation-arrival-copy")).toHaveTextContent(
      "2026年7月13日 · 群心心理工作室 · 程灵的咨询室"
    );
    expect(onComplete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "继续进入咨询室" }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("按真实日期和当前咨询师生成场记", () => {
    expect(formatConsultationArrivalCopy("周舟", new Date("2026-12-05T18:00:00+08:00"))).toBe(
      "2026年12月5日 · 群心心理工作室 · 周舟的咨询室"
    );
  });
});
