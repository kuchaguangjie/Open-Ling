import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BookcaseFeature } from "./BookcaseFeature";

describe("BookcaseFeature", () => {
  it("只展示故事文章，并按咨询师筛选", () => {
    render(<BookcaseFeature />);

    expect(screen.getByRole("heading", { name: "故事簿" })).toBeInTheDocument();
    expect(screen.getByText("群心心理工作室")).toBeInTheDocument();
    expect(screen.getByText("STUDIO FICTION COLLECTION")).toBeInTheDocument();
    expect(screen.getByText(/人物、情节与对话均为虚构/)).toBeInTheDocument();
    const storyIntroduction = screen.getByText(/由咨询师从各自关注的心理视角创作/);
    expect(storyIntroduction).toBeInTheDocument();
    expect(storyIntroduction.tagName).toBe("P");
    expect(storyIntroduction).toHaveClass("story-corner-library-description");
    expect(storyIntroduction).toHaveTextContent(/故事会逐渐增加/);
    expect(screen.getByText(/人物、情节与对话均为虚构，不对应真实用户/)).toHaveClass("story-corner-list-end");
    expect(document.querySelector(".story-corner-quote")).toHaveTextContent("咨询室摘句");
    expect(screen.queryByText(/咨询师.*信/)).not.toBeInTheDocument();
    expect(screen.queryByText(/程灵讲述|周舟讲述|林乐水讲述/)).not.toBeInTheDocument();
    expect(screen.getByTestId("story-scroll-region")).toHaveClass("story-corner-list");
    expect(screen.getByRole("navigation", { name: "按咨询师浏览故事" }).querySelectorAll("img"))
      .toHaveLength(3);
    expect(screen.getByRole("button", { name: "程灵的故事" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "周舟的故事" }));
    expect(screen.getByRole("button", { name: /打开《一句“收到”》/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /打开《四分的晚饭》/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /打开《半罐汤》/ })).not.toBeInTheDocument();
  });

  it("打开完整文章并在返回时恢复原卡片焦点", () => {
    render(<BookcaseFeature />);
    fireEvent.click(screen.getByRole("button", { name: "周舟的故事" }));

    const articleButton = screen.getByRole("button", { name: /打开《一句“收到”》/ });
    fireEvent.click(articleButton);

    const reader = screen.getByRole("article", { name: "一句“收到”" });
    expect(within(reader).getByRole("heading", { name: "一句“收到”" })).toBeInTheDocument();
    expect(within(reader).getAllByRole("paragraph").length).toBeGreaterThanOrEqual(4);
    expect(within(reader).getByText(/不来自任何真实会谈/)).toBeInTheDocument();
    expect(within(reader).getByText("周舟")).toBeInTheDocument();
    expect(within(reader).getByText("二〇二六年夏，写于群心心理工作室 · 微澜亭")).toBeInTheDocument();
    expect(within(reader).getByText("焦虑 · 事实与猜测")).toBeInTheDocument();
    expect(within(reader).getByText("群心心理工作室")).toBeInTheDocument();
    expect(within(reader).getByText("STUDIO FICTION COLLECTION")).toBeInTheDocument();
    const hero = within(reader).getByRole("img");
    const backButton = within(reader).getByRole("button", { name: "返回故事簿" });
    expect(hero.compareDocumentPosition(backButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(reader).getByText(/分钟阅读/)).toBeInTheDocument();
    expect(within(reader).getByTestId("story-reader-scroll-region")).toHaveClass("story-reader-scroll");
    expect(within(within(reader).getByTestId("story-reader-scroll-region"))
      .getByRole("heading", { name: "一句“收到”" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "返回故事簿" }));
    expect(screen.getByRole("button", { name: /打开《一句“收到”》/ })).toHaveFocus();
  });

  it("从完整文章返回后恢复右侧列表位置", () => {
    render(<BookcaseFeature />);
    const list = screen.getByTestId("story-scroll-region");
    list.scrollTop = 96;

    fireEvent.click(screen.getByRole("button", { name: /打开《半罐汤》/ }));
    fireEvent.click(screen.getByRole("button", { name: "返回故事簿" }));

    expect(screen.getByTestId("story-scroll-region").scrollTop).toBe(96);
  });

  it("在佛经故事改写的阅读页标注公开来源", () => {
    render(<BookcaseFeature />);
    fireEvent.click(screen.getByRole("button", { name: "林乐水的故事" }));
    fireEvent.click(screen.getByRole("button", { name: /打开《第三层的房间》/ }));

    expect(screen.getByText("灵感改写自《百喻经·三重楼喻》")).toBeInTheDocument();
    expect(screen.getByText(/不能替代由专业人员提供的心理咨询/)).toBeInTheDocument();
  });

  it.each([
    ["loading", "正在打开故事簿……"],
    ["empty", "故事簿里还没有故事"],
    ["error", "没有打开故事簿"]
  ] as const)("呈现 %s 状态", (initialStatus, expectedText) => {
    render(<BookcaseFeature initialStatus={initialStatus} />);
    expect(screen.getByText(expectedText)).toBeInTheDocument();
  });

  it("失败后可以重新打开故事列表", () => {
    render(<BookcaseFeature initialStatus="error" />);
    fireEvent.click(screen.getByRole("button", { name: "重新打开" }));
    expect(screen.getByRole("heading", { name: "故事簿" })).toBeInTheDocument();
    expect(screen.getByTestId("story-scroll-region")).toBeInTheDocument();
  });
});
