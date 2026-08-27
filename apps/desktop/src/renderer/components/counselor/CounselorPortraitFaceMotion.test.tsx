import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CounselorPortraitFaceMotion } from "./CounselorPortraitFaceMotion";

vi.mock("./counselorPortraitFaceAssets", () => ({
  getCounselorPortraitFaceFrameStyle: () => undefined,
  getCounselorPortraitFaceAssets: (counselorId: string) => ({
    eyesClosed: "/eyes-closed.png",
    ...(["chengling", "zhouzhou", "linleshui"].includes(counselorId)
      ? { mouthSlight: "/mouth-slight.png", mouthOpen: "/mouth-open.png" }
      : {})
  })
}));

vi.mock("../../media/imagePreload", () => ({
  preloadDecodedImage: vi.fn(() => Promise.resolve())
}));

describe("CounselorPortraitFaceMotion", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("uses the minimum 6 second blink delay and 130 millisecond closure", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    render(<CounselorPortraitFaceMotion counselorId="chengling" status="idle" />);
    const motion = screen.getByTestId("counselor-portrait-face-motion");

    act(() => vi.advanceTimersByTime(5_999));
    expect(motion).toHaveAttribute("data-eye-frame", "open");
    act(() => vi.advanceTimersByTime(1));
    expect(motion).toHaveAttribute("data-eye-frame", "closed");
    expect(motion.querySelector(".portrait-face-motion-eyes")).toHaveAttribute("src", "/eyes-closed.png");
    act(() => vi.advanceTimersByTime(129));
    expect(motion).toHaveAttribute("data-eye-frame", "closed");
    act(() => vi.advanceTimersByTime(1));
    expect(motion).toHaveAttribute("data-eye-frame", "open");
  });

  it("uses the maximum 8 second blink delay and 150 millisecond closure", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(1);
    render(<CounselorPortraitFaceMotion counselorId="zhouzhou" status="idle" />);
    const motion = screen.getByTestId("counselor-portrait-face-motion");

    act(() => vi.advanceTimersByTime(7_999));
    expect(motion).toHaveAttribute("data-eye-frame", "open");
    act(() => vi.advanceTimersByTime(1));
    expect(motion).toHaveAttribute("data-eye-frame", "closed");
    act(() => vi.advanceTimersByTime(149));
    expect(motion).toHaveAttribute("data-eye-frame", "closed");
    act(() => vi.advanceTimersByTime(1));
    expect(motion).toHaveAttribute("data-eye-frame", "open");
  });

  it("restarts blink timing from open when the portrait state changes", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { rerender } = render(<CounselorPortraitFaceMotion counselorId="linleshui" status="idle" />);
    const motion = screen.getByTestId("counselor-portrait-face-motion");

    act(() => vi.advanceTimersByTime(7_000));
    rerender(<CounselorPortraitFaceMotion counselorId="linleshui" status="listening" />);
    act(() => vi.advanceTimersByTime(5_999));
    expect(motion).toHaveAttribute("data-eye-frame", "open");
    act(() => vi.advanceTimersByTime(1));
    expect(motion).toHaveAttribute("data-eye-frame", "closed");
  });

  it("keeps eyes still when reduced motion is requested", () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    );
    render(<CounselorPortraitFaceMotion counselorId="chengling" status="streaming" />);
    const motion = screen.getByTestId("counselor-portrait-face-motion");

    act(() => vi.advanceTimersByTime(30_000));
    expect(motion).toHaveAttribute("data-eye-frame", "open");
    expect(motion.querySelectorAll("img")).toHaveLength(0);
  });

  it("reacts to reduced-motion changes, immediately resets frames, and restarts cleanly", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    let matches = false;
    let changeListener: ((event: MediaQueryListEvent) => void) | undefined;
    const addEventListener = vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => {
      changeListener = listener;
    });
    const removeEventListener = vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => {
      if (changeListener === listener) changeListener = undefined;
    });
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        get matches() {
          return matches;
        },
        addEventListener,
        removeEventListener
      }))
    );

    const { unmount } = render(<CounselorPortraitFaceMotion counselorId="chengling" status="streaming" />);
    const motion = screen.getByTestId("counselor-portrait-face-motion");

    matches = true;
    act(() => changeListener?.({ matches: true } as MediaQueryListEvent));
    expect(motion).toHaveAttribute("data-eye-frame", "open");
    expect(motion.querySelectorAll("img")).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);

    matches = false;
    act(() => changeListener?.({ matches: false } as MediaQueryListEvent));
    expect(motion).toHaveAttribute("data-eye-frame", "open");
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    act(() => vi.advanceTimersByTime(6_000));
    expect(motion).toHaveAttribute("data-eye-frame", "closed");

    matches = true;
    act(() => changeListener?.({ matches: true } as MediaQueryListEvent));
    expect(motion).toHaveAttribute("data-eye-frame", "open");
    expect(vi.getTimerCount()).toBe(0);

    unmount();
    expect(removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears all scheduled timers when unmounted", () => {
    vi.useFakeTimers();
    const { unmount } = render(<CounselorPortraitFaceMotion counselorId="chengling" status="streaming" />);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not render a mouth layer outside streaming", () => {
    vi.useFakeTimers();
    render(<CounselorPortraitFaceMotion counselorId="zhouzhou" status="thinking" />);
    const motion = screen.getByTestId("counselor-portrait-face-motion");
    expect(motion.querySelector(".portrait-face-motion-mouth")).toBeNull();
  });

  it.each(["chengling", "linleshui"])("cycles %s's speaking mouth only while streaming", (counselorId) => {
    vi.useFakeTimers();
    const { rerender } = render(<CounselorPortraitFaceMotion counselorId={counselorId} status="thinking" />);
    const motion = screen.getByTestId("counselor-portrait-face-motion");

    expect(motion).toHaveAttribute("data-mouth-frame", "neutral");
    expect(motion.querySelector(".portrait-face-motion-mouth")).toBeNull();

    rerender(<CounselorPortraitFaceMotion counselorId={counselorId} status="streaming" />);
    expect(motion).toHaveAttribute("data-mouth-frame", "slight");
    expect(motion.querySelector(".portrait-face-motion-mouth")).toHaveAttribute("src", "/mouth-slight.png");
    act(() => vi.advanceTimersByTime(170));
    expect(motion).toHaveAttribute("data-mouth-frame", "open");
    expect(motion.querySelector(".portrait-face-motion-mouth")).toHaveAttribute("src", "/mouth-open.png");
    act(() => vi.advanceTimersByTime(340));
    expect(motion).toHaveAttribute("data-mouth-frame", "neutral");
    expect(motion.querySelector(".portrait-face-motion-mouth")).toBeNull();

    rerender(<CounselorPortraitFaceMotion counselorId={counselorId} status="idle" />);
    expect(motion).toHaveAttribute("data-mouth-frame", "neutral");
    expect(vi.getTimerCount()).toBeGreaterThan(0);
  });

  it("cycles Zhouzhou's localized mouth overlays only while streaming", () => {
    vi.useFakeTimers();
    const { rerender } = render(<CounselorPortraitFaceMotion counselorId="zhouzhou" status="thinking" />);
    const motion = screen.getByTestId("counselor-portrait-face-motion");

    expect(motion).toHaveAttribute("data-mouth-frame", "closed");
    rerender(<CounselorPortraitFaceMotion counselorId="zhouzhou" status="streaming" />);
    act(() => vi.advanceTimersByTime(79));
    expect(motion).toHaveAttribute("data-mouth-frame", "closed");
    act(() => vi.advanceTimersByTime(1));
    expect(motion).toHaveAttribute("data-mouth-frame", "slight");
    expect(motion.querySelector(".portrait-face-motion-mouth")).toHaveAttribute("src", "/mouth-slight.png");
    act(() => vi.advanceTimersByTime(110));
    expect(motion).toHaveAttribute("data-mouth-frame", "open");
    expect(motion.querySelector(".portrait-face-motion-mouth")).toHaveAttribute("src", "/mouth-open.png");

    rerender(<CounselorPortraitFaceMotion counselorId="zhouzhou" status="idle" />);
    expect(motion).toHaveAttribute("data-mouth-frame", "closed");
    expect(motion.querySelector(".portrait-face-motion-mouth")).toBeNull();
  });
});
