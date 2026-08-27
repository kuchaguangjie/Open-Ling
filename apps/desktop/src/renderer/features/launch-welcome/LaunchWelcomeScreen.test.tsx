import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSettingsStore } from "../../stores/settingsStore";
import { LaunchWelcomeScreen } from "./LaunchWelcomeScreen";

describe("首次工作室欢迎页", () => {
  it("独立呈现品牌、欢迎说明、称呼设置与单一继续操作", () => {
    useSettingsStore.setState({ profile: { displayName: "", background: "" } });
    render(<LaunchWelcomeScreen onContinue={() => undefined} />);

    expect(screen.getByRole("main", { name: "欢迎来到群心心理工作室" })).toBeInTheDocument();
    expect(screen.getByRole("figure", { name: "从湖边门廊望进群心心理工作室的等待室" })).toBeInTheDocument();
    expect(screen.getByText("群心心理工作室")).toBeInTheDocument();
    expect(screen.getByText(/这里有三位 AI 心理咨询师/)).toBeInTheDocument();
    expect(screen.getByText("01 / 03")).toBeInTheDocument();
    expect(screen.getByLabelText("你希望我们怎么称呼你？")).toBeInTheDocument();
    expect(screen.getByText(/任何让你自在的称呼都可以/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "继续" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "先进入工作室看看" })).not.toBeInTheDocument();
  });

  it("继续时保存称呼并进入下一步", async () => {
    const onContinue = vi.fn();
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    useSettingsStore.setState({ profile: { displayName: "", background: "" } });

    render(<LaunchWelcomeScreen onContinue={onContinue} />);
    fireEvent.change(screen.getByLabelText("你希望我们怎么称呼你？"), { target: { value: "  小满  " } });
    fireEvent.click(screen.getByRole("button", { name: "继续" }));

    await waitFor(() => expect(onContinue).toHaveBeenCalledTimes(1));
    expect(useSettingsStore.getState().profile.displayName).toBe("小满");
    expect(setItem).toHaveBeenLastCalledWith("ling.locale.preference", "zh-CN");
    setItem.mockRestore();
  });
});
