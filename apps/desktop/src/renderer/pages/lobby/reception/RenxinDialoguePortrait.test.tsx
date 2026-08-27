import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RenxinDialoguePortrait } from "./RenxinDialoguePortrait";

vi.mock("../../../media/imagePreload", () => ({
  preloadDecodedImage: vi.fn(() => Promise.resolve())
}));

describe("RenxinDialoguePortrait", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("keeps the portrait still when reduced motion is requested", () => {
    render(<RenxinDialoguePortrait isSpeaking prefersReducedMotion />);

    const portrait = screen.getByTestId("renxin-dialogue-portrait");
    expect(portrait).toHaveAttribute("data-eye-frame", "open");
    expect(portrait).toHaveAttribute("data-mouth-frame", "closed");

    act(() => vi.advanceTimersByTime(10_000));
    expect(portrait).toHaveAttribute("data-eye-frame", "open");
    expect(portrait).toHaveAttribute("data-mouth-frame", "closed");
  });

  it("cycles quiet mouth frames only after every animation frame is decoded", async () => {
    const { rerender } = render(<RenxinDialoguePortrait isSpeaking prefersReducedMotion={false} />);
    const portrait = screen.getByTestId("renxin-dialogue-portrait");

    expect(portrait).toHaveAttribute("data-mouth-frame", "closed");
    await act(async () => undefined);
    expect(portrait).toHaveAttribute("data-mouth-frame", "small");
    act(() => vi.advanceTimersByTime(95));
    expect(portrait).toHaveAttribute("data-mouth-frame", "medium");
    act(() => vi.advanceTimersByTime(95));
    expect(portrait).toHaveAttribute("data-mouth-frame", "small");

    rerender(<RenxinDialoguePortrait isSpeaking={false} prefersReducedMotion={false} />);
    expect(portrait).toHaveAttribute("data-mouth-frame", "closed");
  });

  it("plays a complete low-frequency blink and returns to open eyes", async () => {
    render(<RenxinDialoguePortrait isSpeaking={false} prefersReducedMotion={false} />);
    const portrait = screen.getByTestId("renxin-dialogue-portrait");

    await act(async () => undefined);
    act(() => vi.advanceTimersByTime(3_800));
    expect(portrait).toHaveAttribute("data-eye-frame", "closed");
    act(() => vi.advanceTimersByTime(105));
    expect(portrait).toHaveAttribute("data-eye-frame", "open");
  });
});
