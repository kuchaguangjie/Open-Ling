import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReceptionCounselorScenePortrait } from "./ReceptionCounselorScenePortrait";

const imagePreloadMocks = vi.hoisted(() => ({
  preloadDecodedImage: vi.fn(() => Promise.resolve()),
  preloadImagesWhenIdle: vi.fn(() => Promise.resolve())
}));

vi.mock("../../../media/imagePreload", () => imagePreloadMocks);

describe("ReceptionCounselorScenePortrait", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: false } as MediaQueryList);
    imagePreloadMocks.preloadDecodedImage.mockReset();
    imagePreloadMocks.preloadDecodedImage.mockResolvedValue(undefined);
    imagePreloadMocks.preloadImagesWhenIdle.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("reuses a local overlay for a complete low-frequency blink", async () => {
    render(<ReceptionCounselorScenePortrait counselorId="chengling" counselorName="程灵" state="default" />);
    const portrait = screen.getByTestId("reception-counselor-scene-portrait");

    expect(portrait).toHaveAttribute("data-eye-frame", "open");
    await act(async () => undefined);
    act(() => vi.advanceTimersByTime(6_000));
    expect(portrait).toHaveAttribute("data-eye-frame", "closed");
    expect(portrait.querySelectorAll("img")).toHaveLength(2);

    act(() => vi.advanceTimersByTime(130));
    expect(portrait).toHaveAttribute("data-eye-frame", "open");
    expect(portrait.querySelectorAll("img")).toHaveLength(1);
  });

  it("keeps the approved still portrait when reduced motion is requested", async () => {
    vi.mocked(window.matchMedia).mockReturnValue({ matches: true } as MediaQueryList);
    render(<ReceptionCounselorScenePortrait counselorId="zhouzhou" counselorName="周舟" state="speaking" />);
    const portrait = screen.getByTestId("reception-counselor-scene-portrait");

    await act(async () => undefined);
    act(() => vi.advanceTimersByTime(10_000));
    expect(portrait).toHaveAttribute("data-eye-frame", "open");
    expect(portrait.querySelectorAll("img")).toHaveLength(1);
  });

  it("keeps the current scene frame visible until a requested state is decoded", async () => {
    let finishDecode: (() => void) | undefined;
    imagePreloadMocks.preloadDecodedImage.mockImplementationOnce(() => new Promise<void>((resolve) => {
      finishDecode = resolve;
    }));
    const { rerender } = render(
      <ReceptionCounselorScenePortrait counselorId="chengling" counselorName="程灵" state="default" />
    );
    const image = screen.getByRole("img", { name: "值班咨询师在前台后" });

    rerender(<ReceptionCounselorScenePortrait counselorId="chengling" counselorName="程灵" state="speaking" />);
    expect(image).toHaveAttribute("src", expect.stringContaining("production-scene/chengling/default.png"));

    await act(async () => finishDecode?.());
    expect(image).toHaveAttribute("src", expect.stringContaining("production-scene/chengling/speaking.png"));
  });
});
