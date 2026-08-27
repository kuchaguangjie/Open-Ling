import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCounselorDialogueFaceOverlays } from "./useCounselorDialogueFaceOverlays";

describe("useCounselorDialogueFaceOverlays", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("uses the same one-layer blink timing as the session portrait", () => {
    const { result } = renderHook(() => useCounselorDialogueFaceOverlays({
      enabled: true,
      reducedMotion: false,
      speaking: false
    }));

    expect(result.current.eyeFrame).toBe("open");
    act(() => vi.advanceTimersByTime(6_000));
    expect(result.current.eyeFrame).toBe("closed");
    act(() => vi.advanceTimersByTime(130));
    expect(result.current.eyeFrame).toBe("open");
  });

  it("cycles only the two mouth overlays while speaking", () => {
    const { result, rerender } = renderHook(({ speaking }) => useCounselorDialogueFaceOverlays({
      enabled: true,
      reducedMotion: false,
      speaking
    }), { initialProps: { speaking: true } });

    expect(result.current.mouthFrame).toBe("slight");
    act(() => vi.advanceTimersByTime(170));
    expect(result.current.mouthFrame).toBe("open");
    act(() => vi.advanceTimersByTime(170));
    expect(result.current.mouthFrame).toBe("slight");
    act(() => vi.advanceTimersByTime(170));
    expect(result.current.mouthFrame).toBe("neutral");

    rerender({ speaking: false });
    expect(result.current.mouthFrame).toBe("neutral");
  });

  it("keeps both layers neutral when reduced motion is requested", () => {
    const { result } = renderHook(() => useCounselorDialogueFaceOverlays({
      enabled: true,
      reducedMotion: true,
      speaking: true
    }));

    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current).toEqual({ eyeFrame: "open", mouthFrame: "neutral" });
  });
});
