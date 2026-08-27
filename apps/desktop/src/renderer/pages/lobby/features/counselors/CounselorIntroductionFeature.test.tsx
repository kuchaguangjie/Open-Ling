import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { builtinCounselorPackages, counselorPackageRegistry } from "@shared/index";
import { resetSessionStore, useSessionStore } from "../../../../stores/sessionStore";
import { resetSettingsStore, useSettingsStore } from "../../../../stores/settingsStore";
import { registerHostedCounselorPackages } from "../../../../counselors/hostedCounselorPackages";
import { CounselorIntroductionFeature } from "./CounselorIntroductionFeature";

describe("咨询师介绍册", () => {
  beforeEach(() => {
    resetSessionStore();
    resetSettingsStore();
    Object.defineProperty(Image.prototype, "decode", {
      configurable: true,
      value: vi.fn(async () => undefined)
    });
  });
  afterEach(() => {
    if (counselorPackageRegistry.get("introduction-community-listener")?.source.kind === "host") {
      counselorPackageRegistry.unregister("introduction-community-listener");
    }
  });

  it("使用工作室介绍册结构展示程灵的精简专业资料", () => {
    renderFeature();

    expect(screen.getByRole("img", { name: "群心心理工作室" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "程灵对话头像" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "周舟对话头像" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "林乐水对话头像" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ling 咨询师共同相信" })).toBeInTheDocument();
    expect(screen.getByText(/心理咨询师不是掌握答案的人，而是一面镜子/)).toBeInTheDocument();
    expect(screen.getByText(/咨询的过程，不是向外寻找某个现成的答案/)).toBeInTheDocument();
    expect(screen.getByText(/和你一起，探索内心尚未被看见和理解的部分，慢慢认识自己/)).toBeInTheDocument();
    expect(screen.getByText("正在了解")).toBeInTheDocument();
    expect(screen.queryByText("关系与内在经验之镜")).not.toBeInTheDocument();
    expect(screen.queryByText("矛盾与选择之镜")).not.toBeInTheDocument();
    expect(screen.queryByText("觉察与条件之镜")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "程灵咨询师介绍" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "程灵" })).toBeInTheDocument();
    expect(screen.getByText("人本—心理动力取向心理咨询师")).toBeInTheDocument();
    expect(screen.getByText(/程灵重视真实、在场的交流，也尊重来访者理解和表达自己的节奏/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "她如何理解咨询" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "她如何与来访者工作" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "她较常关注的议题" })).toBeInTheDocument();
    expect(screen.getByText("亲密关系")).toBeInTheDocument();
    expect(screen.getByText("内在冲突")).toBeInTheDocument();
    expect(screen.getByText("自我探索")).toBeInTheDocument();
    expect(screen.getByText("个人成长")).toBeInTheDocument();
    const aiBoundaryTrigger = screen.getByRole("button", { name: "查看 AI 咨询师说明" });
    const bookingButton = screen.getByRole("button", { name: "预约咨询" });
    expect(aiBoundaryTrigger).toBeInTheDocument();
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveTextContent(/她是 AI 咨询师，可提供心理支持，但不能替代专业心理咨询/);
    expect(bookingButton.closest(".lobby-book-control")).toContainElement(aiBoundaryTrigger);
    expect(document.querySelectorAll(".lobby-counselor-shared-belief-copy p span")).toHaveLength(3);
  });

  it("切换咨询师会等目标立绘准备好再发出既有切换命令", async () => {
    const onCounselorChange = vi.fn();
    renderFeature({ onCounselorChange });

    fireEvent.click(screen.getByRole("tab", { name: "周舟" }));

    await waitFor(() => expect(onCounselorChange).toHaveBeenCalledWith("zhouzhou"));
  });

  it("离开介绍页后取消尚未开始的后台立绘解码", () => {
    const abortSpy = vi.spyOn(AbortController.prototype, "abort");
    const { unmount } = renderFeature();

    unmount();

    expect(abortSpy).toHaveBeenCalled();
  });

  it("以相同结构展示周舟与林乐水的专业资料", () => {
    const { rerender } = renderFeature({ selectedCounselorId: "zhouzhou" });

    expect(screen.getByRole("heading", { name: "周舟" })).toBeInTheDocument();
    expect(screen.getByText("焦点解决取向心理咨询师")).toBeInTheDocument();
    expect(screen.getByText(/周舟关注来访者当下最希望改变的困扰/)).toBeInTheDocument();
    expect(screen.getByText("选择与决策")).toBeInTheDocument();
    expect(screen.getByText(/她不会把咨询变成一张任务清单/)).toBeInTheDocument();

    rerender(
      <CounselorIntroductionFeature
        mode="introduction"
        onBook={vi.fn()}
        onCounselorChange={vi.fn()}
        selectedCounselorId="linleshui"
      />
    );

    expect(screen.getByRole("heading", { name: "林乐水" })).toBeInTheDocument();
    expect(screen.getByText("中国传统心性哲学取向心理咨询师")).toBeInTheDocument();
    expect(screen.getByText(/林乐水关注来访者在痛苦、迷茫与人生变化中/)).toBeInTheDocument();
    expect(screen.getByText("人生意义")).toBeInTheDocument();
    expect(screen.getByText("失落与哀伤")).toBeInTheDocument();
    expect(screen.getByText(/传统心性中对处境、关系与变化的理解/)).toBeInTheDocument();
    expect(screen.queryByText(/存在与东方哲学取向|东方哲学中关于人生处境/)).not.toBeInTheDocument();
  });

  it("切换时只保留当前已预加载立绘且不创建大图过渡层", () => {
    const { container, rerender } = renderFeature({ selectedCounselorId: "chengling" });
    const chenglingPortrait = container.querySelector('[data-counselor-id="chengling"]');
    expect(chenglingPortrait).toBeInTheDocument();
    expect(container.querySelector('[data-counselor-id="zhouzhou"]')).not.toBeInTheDocument();

    rerender(
      <CounselorIntroductionFeature
        mode="introduction"
        onBook={vi.fn()}
        onCounselorChange={vi.fn()}
        selectedCounselorId="zhouzhou"
      />
    );

    const portraitStage = container.querySelector<HTMLElement>(".lobby-counselor-portrait-stage");
    const detailsTransition = container.querySelector<HTMLElement>(".lobby-counselor-details-transition");
    expect(portraitStage).not.toHaveAttribute("data-transitioning");
    expect(container.querySelector('[data-counselor-id="chengling"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-counselor-id="zhouzhou"]')).toHaveClass("lobby-counselor-portrait-active");
    expect(detailsTransition?.querySelector(".lobby-counselor-details-outgoing")).not.toBeInTheDocument();
    expect(detailsTransition?.querySelectorAll(".lobby-counselor-details-layer")).toHaveLength(1);
    expect(detailsTransition?.querySelector(".lobby-counselor-details-layer")).toHaveTextContent("周舟");

    expect(container.querySelectorAll(".lobby-counselor-portrait-stage img")).toHaveLength(1);
  });

  it("预约状态与命令保持现有契约", () => {
    const onBook = vi.fn();
    const { container, rerender } = renderFeature({ onBook });

    fireEvent.click(screen.getByRole("button", { name: "预约咨询" }));
    expect(onBook).toHaveBeenCalledWith("chengling");

    act(() => useSessionStore.setState({ bookedCounselorId: "chengling" }));
    rerender(
      <CounselorIntroductionFeature
        mode="booking"
        onBook={onBook}
        onCounselorChange={vi.fn()}
        selectedCounselorId="chengling"
      />
    );
    expect(screen.getByRole("button", { name: "有进行中的咨询" })).toBeDisabled();
    expect(screen.queryByText(/开始前会再次说明 AI 的能力/)).not.toBeInTheDocument();
    expect(container.querySelector(".lobby-booking-note")).not.toBeInTheDocument();
  });

  it("不出现角色图鉴和模糊咨询关系的文案", () => {
    const { container } = renderFeature();

    expect(container).not.toHaveTextContent(/陪你|陪伴|接住|LING STUDIO|FOLIO|NO\.|01\s*\/\s*03/);
  });

  it("让社区咨询师使用同一介绍与预约流程", () => {
    const manifest = structuredClone(builtinCounselorPackages[0]);
    manifest.id = "introduction-community-listener";
    manifest.publisher = { name: "Community Studio" };
    manifest.localizations["zh-CN"] = {
      ...manifest.localizations["zh-CN"],
      name: "社区倾听者",
      title: "社区整合取向咨询师",
      description: "关注慢节奏的理解与澄清。",
      strengths: ["倾听", "澄清"]
    };
    registerHostedCounselorPackages([manifest]);
    const onBook = vi.fn();

    renderFeature({ onBook, selectedCounselorId: manifest.id });

    expect(screen.getByRole("tab", { name: "社区倾听者" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "社区倾听者咨询师介绍" })).toBeInTheDocument();
    expect(screen.getByText(/Community Studio 提供/)).toBeInTheDocument();
    expect(screen.getByText(/由 Ling 统一运行/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "预约咨询" }));
    expect(onBook).toHaveBeenCalledWith(manifest.id);
  });

  it("停用本地导入咨询师后不再提供新的介绍与预约入口", () => {
    const manifest = structuredClone(builtinCounselorPackages[0]);
    manifest.id = "introduction-community-listener";
    manifest.localizations["zh-CN"] = {
      ...manifest.localizations["zh-CN"],
      name: "已停用倾听者"
    };
    registerHostedCounselorPackages([manifest]);
    useSettingsStore.setState({ disabledCounselorIds: [manifest.id] });

    renderFeature({ selectedCounselorId: manifest.id });

    expect(screen.queryByRole("tab", { name: "已停用倾听者" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "程灵咨询师介绍" })).toBeInTheDocument();
  });
});

function renderFeature(overrides?: {
  onBook?: (counselorId: string) => void;
  onCounselorChange?: (counselorId: string) => void;
  selectedCounselorId?: string;
}) {
  return render(
    <CounselorIntroductionFeature
      mode="introduction"
      onBook={overrides?.onBook ?? vi.fn()}
      onCounselorChange={overrides?.onCounselorChange ?? vi.fn()}
      selectedCounselorId={overrides?.selectedCounselorId ?? "chengling"}
    />
  );
}
