import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReceptionCounselorDialoguePortrait } from "./ReceptionCounselorDialoguePortrait";

vi.mock("../../../media/imagePreload", () => ({
  preloadDecodedImage: vi.fn(() => Promise.resolve())
}));

describe("ReceptionCounselorDialoguePortrait", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("moves only local mouth overlays while dialogue text is typing", async () => {
    const { rerender } = render(
      <ReceptionCounselorDialoguePortrait counselorId="linleshui" counselorName="林乐水" isSpeaking prefersReducedMotion={false} />
    );
    const portrait = screen.getByTestId("reception-counselor-dialogue-portrait");

    expect(portrait).toHaveAttribute("data-mouth-frame", "neutral");
    await act(async () => undefined);
    expect(portrait).toHaveAttribute("data-mouth-frame", "slight");
    act(() => vi.advanceTimersByTime(170));
    expect(portrait).toHaveAttribute("data-mouth-frame", "open");
    act(() => vi.advanceTimersByTime(170));
    expect(portrait).toHaveAttribute("data-mouth-frame", "slight");

    rerender(
      <ReceptionCounselorDialoguePortrait counselorId="linleshui" counselorName="林乐水" isSpeaking={false} prefersReducedMotion={false} />
    );
    expect(portrait).toHaveAttribute("data-mouth-frame", "neutral");
    expect(portrait).toHaveAttribute("data-speaking", "false");
  });

  it("blinks independently and returns to the open-eye mother image", async () => {
    render(
      <ReceptionCounselorDialoguePortrait counselorId="chengling" counselorName="程灵" isSpeaking={false} prefersReducedMotion={false} />
    );
    const portrait = screen.getByTestId("reception-counselor-dialogue-portrait");

    await act(async () => undefined);
    act(() => vi.advanceTimersByTime(6_000));
    expect(portrait).toHaveAttribute("data-eye-frame", "closed");
    act(() => vi.advanceTimersByTime(130));
    expect(portrait).toHaveAttribute("data-eye-frame", "open");
  });

  it("keeps both face animations neutral when reduced motion is requested", async () => {
    render(
      <ReceptionCounselorDialoguePortrait counselorId="zhouzhou" counselorName="周舟" isSpeaking prefersReducedMotion />
    );
    const portrait = screen.getByTestId("reception-counselor-dialogue-portrait");

    await act(async () => undefined);
    act(() => vi.advanceTimersByTime(10_000));
    expect(portrait).toHaveAttribute("data-eye-frame", "open");
    expect(portrait).toHaveAttribute("data-mouth-frame", "neutral");
    expect(portrait).toHaveAttribute("data-speaking", "false");
  });
});
