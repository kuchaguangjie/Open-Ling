import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSettingsStore } from "../../../stores/settingsStore";
import { OutdoorGarden } from "./OutdoorGarden";

describe("OutdoorGarden", () => {
  it("renders sunny local motion layers without moving the UI", () => {
    render(<OutdoorGarden onBack={() => undefined} onToggleWeather={() => undefined} weather="sunny" />);

    expect(screen.getByTestId("garden-scene-layers")).toHaveAttribute("data-weather", "sunny");
    expect(screen.getByTestId("garden-canopy-single")).toHaveClass("garden-canopy-local-breeze");
    expect(screen.queryByTestId("garden-canopy-middle")).not.toBeInTheDocument();
    expect(screen.queryByTestId("garden-canopy-lower")).not.toBeInTheDocument();
    expect(screen.queryByTestId("garden-left-clean-patch")).not.toBeInTheDocument();
    expect(screen.getByTestId("garden-scene-background").tagName).toBe("IMG");
    expect(screen.queryByTestId("garden-lake-reflection")).not.toBeInTheDocument();
    expect(screen.queryByTestId("garden-lake-sparkles")).not.toBeInTheDocument();
    expect(screen.queryByTestId("garden-lake-water")).not.toBeInTheDocument();
  });

  it("uses the baked rainy artwork without extra full-screen compositor layers", () => {
    const onBack = vi.fn();
    const onToggleWeather = vi.fn();
    render(<OutdoorGarden onBack={onBack} onToggleWeather={onToggleWeather} weather="rainy" />);

    expect(screen.queryByTestId("garden-rain-near")).not.toBeInTheDocument();
    expect(screen.queryByTestId("garden-rain-far")).not.toBeInTheDocument();
    expect(screen.queryByTestId("garden-mist")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "返回等待室" }));
    fireEvent.click(screen.getByRole("button", { name: "切换为晴天" }));

    expect(onBack).toHaveBeenCalledOnce();
    expect(onToggleWeather).toHaveBeenCalledOnce();
  });

  it("keeps the scenery layer mounted while weather changes so its motion stays continuous", () => {
    const { rerender } = render(<OutdoorGarden onBack={() => undefined} onToggleWeather={() => undefined} weather="sunny" />);
    const sceneLayers = screen.getByTestId("garden-scene-layers");

    rerender(<OutdoorGarden onBack={() => undefined} onToggleWeather={() => undefined} weather="rainy" />);

    expect(screen.getByTestId("garden-scene-layers")).toBe(sceneLayers);
    expect(sceneLayers).toHaveAttribute("data-weather", "rainy");
    expect(sceneLayers).not.toHaveClass("ling-motion-surface-enter");
  });

  it("guides breathing without countdowns, rounds or completion pressure", () => {
    vi.useFakeTimers();
    render(<OutdoorGarden onBack={() => undefined} onToggleWeather={() => undefined} weather="sunny" />);

    fireEvent.click(screen.getByRole("button", { name: "开始呼吸" }));

    expect(screen.getByTestId("garden-scene-layers")).toBeInTheDocument();
    expect(screen.getByTestId("garden-breathing-aura")).toBeInTheDocument();
    expect(screen.getByText("吸气")).toBeInTheDocument();
    expect(screen.getByTestId("garden-mindfulness-guidance")).not.toBeEmptyDOMElement();
    expect(screen.queryByText(/轮|倒计时|完成/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "自然声 开" })).toBeInTheDocument();

    const inhaleGuidance = screen.getByTestId("garden-mindfulness-guidance").textContent;
    act(() => {
      vi.advanceTimersByTime(3999);
    });
    expect(screen.getByTestId("garden-mindfulness-guidance")).toHaveTextContent(inhaleGuidance ?? "");
    act(() => {
      vi.advanceTimersByTime(121);
    });
    expect(screen.getByText("呼气")).toBeInTheDocument();
    const exhaleGuidance = screen.getByTestId("garden-mindfulness-guidance").textContent;
    expect(exhaleGuidance).not.toBe(inhaleGuidance);

    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(screen.getByTestId("garden-mindfulness-guidance")).toHaveTextContent(exhaleGuidance ?? "");
    act(() => {
      vi.advanceTimersByTime(121);
    });
    expect(screen.getByText("吸气")).toBeInTheDocument();
    expect(screen.getByTestId("garden-mindfulness-guidance").textContent).not.toBe(exhaleGuidance);

    fireEvent.click(screen.getByRole("button", { name: "暂停" }));
    expect(screen.getByText("慢慢来")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "继续" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "结束练习" }));
    expect(screen.getByRole("button", { name: "开始呼吸" })).toBeInTheDocument();
    expect(screen.queryByTestId("garden-breathing-aura")).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it("keeps the layered nature sound available in rainy weather", () => {
    render(<OutdoorGarden onBack={() => undefined} onToggleWeather={() => undefined} weather="rainy" />);

    fireEvent.click(screen.getByRole("button", { name: "开始呼吸" }));

    expect(screen.getByRole("button", { name: "自然声 开" })).toBeInTheDocument();
  });

  it("localizes the complete breathing practice in English", () => {
    useSettingsStore.getState().updateLocale("en-US");
    render(<OutdoorGarden onBack={() => undefined} onToggleWeather={() => undefined} weather="sunny" />);

    expect(screen.getByRole("button", { name: "Begin breathing" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Begin breathing" }));

    expect(screen.getByText("Inhale")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nature sounds on" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "End practice" })).toBeInTheDocument();
  });
});
