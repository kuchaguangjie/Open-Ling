import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCounselorFaceMotion } from "./useCounselorFaceMotion";

describe("useCounselorFaceMotion", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    vi.stubGlobal("matchMedia", vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    })));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("uses only mouth frames while speaking and returns to neutral afterwards", () => {
    const { result, rerender } = renderHook(({ speaking }) => useCounselorFaceMotion({ enabled: true, speaking }), {
      initialProps: { speaking: true }
    });

    expect(result.current.face).toBe("neutral");
    act(() => vi.advanceTimersByTime(170));
    expect(result.current.face).toBe("mouth-slight");
    act(() => vi.advanceTimersByTime(170));
    expect(result.current.face).toBe("mouth-open");

    rerender({ speaking: false });
    expect(result.current.face).toBe("neutral");
  });

  it("blinks in the required half → closed → half → neutral sequence", () => {
    const { result } = renderHook(() => useCounselorFaceMotion({ enabled: true, speaking: false }));

    act(() => vi.advanceTimersByTime(2500));
    expect(result.current.face).toBe("eyes-half");
    act(() => vi.advanceTimersByTime(70));
    expect(result.current.face).toBe("eyes-closed");
    act(() => vi.advanceTimersByTime(70));
    expect(result.current.face).toBe("eyes-half");
    act(() => vi.advanceTimersByTime(70));
    expect(result.current.face).toBe("neutral");
  });

  it("stays neutral in reduced-motion mode", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    })));
    const { result } = renderHook(() => useCounselorFaceMotion({ enabled: true, speaking: true }));

    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current.face).toBe("neutral");
  });
});
