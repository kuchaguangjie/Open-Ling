import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StartupLoadingScreen } from "./StartupLoadingScreen";
import { STARTUP_ATMOSPHERE_LINES, STARTUP_FEATURE_HINTS } from "./startupLoadingContent";

describe("启动湖面 Loading", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("只根据传入 phase 呈现真实启动状态", () => {
    const view = render(<StartupLoadingScreen phase="opening" />);

    expect(screen.getByRole("status")).toHaveTextContent("正在打开 Ling……");
    expect(screen.getByRole("region", { name: "Ling 启动中" })).toHaveAttribute("aria-busy", "true");

    view.rerender(<StartupLoadingScreen phase="reading-sessions" />);
    expect(screen.getByRole("status")).toHaveTextContent("正在载入会谈记录……");

    view.rerender(<StartupLoadingScreen phase="ready" />);
    expect(screen.getByRole("status")).toHaveTextContent("工作室准备好了。");
    expect(screen.getByRole("region", { name: "Ling 启动中" })).toHaveAttribute("aria-busy", "false");
  });

  it("氛围短句安静轮换且不进入读屏播报", () => {
    render(<StartupLoadingScreen phase="opening" />);

    const firstLine = screen.getByText(STARTUP_ATMOSPHERE_LINES[0]);
    expect(firstLine).toHaveAttribute("aria-hidden", "true");

    act(() => vi.advanceTimersByTime(3_200));
    expect(screen.getByText(STARTUP_ATMOSPHERE_LINES[1])).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it("功能提示在短启动过渡内出现，并在本次打开期间保持不变", () => {
    const { container } = render(<StartupLoadingScreen phase="reading-sessions" />);
    const hint = container.querySelector(".startup-loading__hint");

    expect(hint).not.toHaveClass("startup-loading__hint--visible");
    act(() => vi.advanceTimersByTime(899));
    expect(hint).not.toHaveClass("startup-loading__hint--visible");

    act(() => vi.advanceTimersByTime(1));
    expect(hint).toHaveClass("startup-loading__hint--visible");
    const selectedHint = STARTUP_FEATURE_HINTS.find((text) => screen.queryByText(text));
    expect(selectedHint).toBeDefined();

    act(() => vi.advanceTimersByTime(12_800));
    expect(screen.getByText(selectedHint as string)).toBeInTheDocument();
  });

  it("退出态只由 exiting 属性控制", () => {
    const view = render(<StartupLoadingScreen phase="ready" />);
    const region = screen.getByRole("region", { name: "Ling 启动中" });

    expect(region).not.toHaveClass("startup-loading--exiting");
    view.rerender(<StartupLoadingScreen phase="ready" exiting />);
    expect(region).toHaveClass("startup-loading--exiting");
  });

  it("功能提示与等待室真实入口一致，且不使用句末标点", () => {
    expect(STARTUP_FEATURE_HINTS).toContain("书架里的虚构故事，由三位咨询师从各自关注的心理视角创作");
    expect(STARTUP_FEATURE_HINTS).toContain("点开三位咨询师的介绍，可以了解她们如何理解咨询、如何与你工作");
    expect(STARTUP_FEATURE_HINTS).not.toContain("书架里可以了解三位咨询师的工作方式。");
    expect(STARTUP_FEATURE_HINTS.every((text) => !/[。！？]$/.test(text))).toBe(true);
    expect(STARTUP_ATMOSPHERE_LINES.every((text) => !/[。！？]$/.test(text))).toBe(true);
  });

  it("倒影保持静态，减少动态时取消小船动画", () => {
    const css = readFileSync(
      resolve(process.cwd(), "apps/desktop/src/renderer/features/startup-loading/startup-loading.css"),
      "utf8"
    );
    const reducedMotionRules = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    const reflectionRules = css.match(/\.startup-loading__reflection\s*\{([^}]+)\}/)?.[1] ?? "";

    expect(reducedMotionRules).toContain(".startup-loading__boat");
    expect(reducedMotionRules).toContain("animation: none;");
    expect(reflectionRules).not.toContain("animation:");
    expect(css).not.toContain("@keyframes startup-loading-reflection-breathe");
  });

  it("各启动阶段共用固定比例的标识占位，小船在容器内部起伏", () => {
    const css = readFileSync(
      resolve(process.cwd(), "apps/desktop/src/renderer/features/startup-loading/startup-loading.css"),
      "utf8"
    );
    const markRules = css.match(/\.startup-loading__mark\s*\{([^}]+)\}/)?.[1] ?? "";
    const boatAnimation = css.match(/@keyframes startup-loading-boat-breathe\s*\{([\s\S]+?)\n\}/)?.[1] ?? "";

    expect(markRules).toContain("aspect-ratio: 1340 / 608;");
    expect(boatAnimation).toContain("translateY(-5px)");
    expect(boatAnimation).toContain("translateY(5px)");
  });
});
