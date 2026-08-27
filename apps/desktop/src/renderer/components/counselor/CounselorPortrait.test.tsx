import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CounselorPortrait } from "./CounselorPortrait";
import "../../styles/global.css";

const imagePreloadMocks = vi.hoisted(() => ({
  preloadDecodedImage: vi.fn((_url?: string) => Promise.resolve())
}));

vi.mock("../../media/imagePreload", () => imagePreloadMocks);

describe("CounselorPortrait", () => {
  beforeEach(() => {
    imagePreloadMocks.preloadDecodedImage.mockReset();
    imagePreloadMocks.preloadDecodedImage.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("keeps a light previous portrait layer during a short soft transition", async () => {
    vi.useFakeTimers();
    const { container, rerender } = render(
      <CounselorPortrait counselorId="zhouzhou" counselorName="周舟" status="idle" />
    );

    expect(screen.getByAltText("周舟咨询师形象")).toHaveAttribute(
      "src",
      expect.stringContaining("zhouzhou-session-default-runtime-1280w-v1")
    );
    expect(container.querySelector('[data-portrait-layer="exiting"]')).toBeNull();

    await act(async () => {
      rerender(<CounselorPortrait counselorId="zhouzhou" counselorName="周舟" status="listening" />);
    });

    expect(screen.getByAltText("周舟咨询师形象")).toHaveAttribute(
      "src",
      expect.stringContaining("zhouzhou-session-listening-runtime-1280w-v1")
    );
    expect(container.querySelector('[data-portrait-layer="exiting"]')).toHaveAttribute(
      "src",
      expect.stringContaining("zhouzhou-session-default-runtime-1280w-v1")
    );
    expect(getComputedStyle(screen.getByAltText("周舟咨询师形象")).opacity).not.toBe("0");
    expect(getComputedStyle(container.querySelector('[data-portrait-layer="exiting"]') as Element).opacity).not.toBe(
      "0"
    );

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(container.querySelector('[data-portrait-layer="exiting"]')).toHaveAttribute(
      "src",
      expect.stringContaining("zhouzhou-session-default-runtime-1280w-v1")
    );

    act(() => {
      vi.advanceTimersByTime(120);
    });

    expect(container.querySelector('[data-portrait-layer="exiting"]')).toBeNull();
  });

  it("shows a newly selected counselor without a slow entrance once decoded", async () => {
    vi.useFakeTimers();
    const { container, rerender } = render(
      <CounselorPortrait counselorId="chengling" counselorName="程灵" status="idle" />
    );

    await act(async () => {
      rerender(<CounselorPortrait counselorId="zhouzhou" counselorName="周舟" status="idle" />);
    });

    expect(container.querySelector('[data-portrait-layer="exiting"]')).toBeNull();
    expect(screen.getByAltText("周舟咨询师形象")).toHaveClass("portrait-image-ready");
    expect(screen.getByAltText("周舟咨询师形象")).not.toHaveClass("portrait-image-entering");
  });

  it("uses the Lin Leshui portrait for Lin Leshui", () => {
    render(<CounselorPortrait counselorId="linleshui" counselorName="林乐水" status="idle" />);

    expect(screen.getByAltText("林乐水咨询师形象")).toHaveAttribute(
      "src",
      expect.stringContaining("linleshui-default-present-white-speck-clean-transparent-v3")
    );
  });

  it("mounts face motion only inside the active portrait layer", async () => {
    vi.useFakeTimers();
    const { container, rerender } = render(
      <CounselorPortrait counselorId="chengling" counselorName="程灵" status="idle" />
    );

    expect(container.querySelector('[data-portrait-layer="active"] [data-testid="counselor-portrait-face-motion"]')).not.toBeNull();
    await act(async () => {
      rerender(<CounselorPortrait counselorId="chengling" counselorName="程灵" status="listening" />);
    });

    const exiting = container.querySelector('[data-portrait-layer="exiting"]');
    expect(exiting).not.toBeNull();
    expect(exiting?.querySelector('[data-testid="counselor-portrait-face-motion"]')).toBeNull();
    expect(container.querySelectorAll('[data-testid="counselor-portrait-face-motion"]')).toHaveLength(1);
  });

  it("keeps the current portrait visible until the requested frame is decoded", async () => {
    let finishDecode: (() => void) | undefined;
    imagePreloadMocks.preloadDecodedImage.mockImplementationOnce(() => new Promise<void>((resolve) => {
      finishDecode = resolve;
    }));
    const { container, rerender } = render(
      <CounselorPortrait counselorId="zhouzhou" counselorName="周舟" status="idle" />
    );

    rerender(<CounselorPortrait counselorId="zhouzhou" counselorName="周舟" status="listening" />);

    expect(screen.getByAltText("周舟咨询师形象")).toHaveAttribute(
      "src",
      expect.stringContaining("zhouzhou-session-default-runtime-1280w-v1")
    );
    expect(container.querySelector('[data-portrait-layer="exiting"]')).toBeNull();

    await act(async () => finishDecode?.());

    expect(screen.getByAltText("周舟咨询师形象")).toHaveAttribute(
      "src",
      expect.stringContaining("zhouzhou-session-listening-runtime-1280w-v1")
    );
    expect(container.querySelector('[data-portrait-layer="exiting"]')).not.toBeNull();
  });

  it("ignores a decoded frame when a newer portrait request has replaced it", async () => {
    const decodeResolvers = new Map<string, () => void>();
    imagePreloadMocks.preloadDecodedImage.mockImplementation((url?: string) => new Promise<void>((resolve) => {
      decodeResolvers.set(url ?? "", resolve);
    }));
    const { rerender } = render(
      <CounselorPortrait counselorId="zhouzhou" counselorName="周舟" status="idle" />
    );

    act(() => {
      rerender(<CounselorPortrait counselorId="zhouzhou" counselorName="周舟" status="listening" />);
    });
    act(() => {
      rerender(<CounselorPortrait counselorId="zhouzhou" counselorName="周舟" status="streaming" />);
    });
    const listeningUrl = [...decodeResolvers.keys()].find((url) => url.includes("session-listening"));
    const respondingUrl = [...decodeResolvers.keys()].find((url) => url.includes("session-responding"));
    await act(async () => listeningUrl && decodeResolvers.get(listeningUrl)?.());

    expect(screen.getByAltText("周舟咨询师形象")).toHaveAttribute(
      "src",
      expect.stringContaining("zhouzhou-session-default-runtime-1280w-v1")
    );

    await act(async () => respondingUrl && decodeResolvers.get(respondingUrl)?.());
    expect(screen.getByAltText("周舟咨询师形象")).toHaveAttribute(
      "src",
      expect.stringContaining("zhouzhou-session-responding-runtime-1280w-v1")
    );
  });
});
