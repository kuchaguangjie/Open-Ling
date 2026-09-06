import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "../../stores/appStore";
import { resetSessionStore, useSessionStore } from "../../stores/sessionStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { LobbyPage } from "./LobbyPage";

const welcomeStorageKey = "ling.lobby.hasSeenWelcome";

describe("等待室大厅", () => {
  beforeEach(() => {
    window.localStorage.removeItem(welcomeStorageKey);
    vi.spyOn(Math, "random").mockReturnValue(0);
    useAppStore.setState({ activePage: "lobby" });
    resetSessionStore();
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("开发审核模式可直接打开知情同意页", () => {
    render(<LobbyPage consentPreview />);

    expect(screen.getByRole("dialog", { name: "AI 咨询知情说明" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "完整知情同意书" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "咨询师的前台对话" })).not.toBeInTheDocument();
  });

  it("首次欢迎说完后自动显示四个独立选项", () => {
    render(<LobbyPage />);

    expect(screen.getByRole("img", { name: "值班咨询师在前台后" })).toBeInTheDocument();
    expect(screen.getByTestId("reception-counselor-scene-portrait")).toHaveAttribute("data-reception-state", "speaking");
    const dialogue = screen.getByRole("dialog", { name: "咨询师的前台对话" });
    expect(within(dialogue).getByRole("img", { name: "咨询师对话立绘" })).toBeInTheDocument();
    completeCurrentLine(dialogue);
    expect(within(dialogue).getByText("你好，欢迎你来。我是程灵，今天在前台。你先看看这里，或者告诉我你想从哪儿开始。", { selector: ".lobby-dialogue-text" })).toBeInTheDocument();
    expect(screen.getByTestId("reception-counselor-scene-portrait")).toHaveAttribute("data-reception-state", "choosing");

    const choices = screen.getByRole("group", { name: "接待选项" });
    expect(screen.getByRole("dialog", { name: "咨询师的前台对话" })).not.toContainElement(choices);
    expect(screen.getByText(/你好，欢迎你来/, { selector: ".lobby-dialogue-text" })).toBeInTheDocument();
    expect(document.querySelector(".lobby-dialogue-panel")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "继续" })).not.toBeInTheDocument();
    expect(within(choices).getByRole("button", { name: "我想预约心理咨询" })).toHaveFocus();
    expect(within(choices).getByRole("button", { name: "请带我看看工作室" })).toBeInTheDocument();
    expect(within(choices).getByRole("button", { name: "随便聊聊" })).toBeInTheDocument();
    expect(within(choices).getByRole("button", { name: "我先自己看看" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "进入现有咨询室" })).not.toBeInTheDocument();
  });

  it("中央选项支持数字键选择", () => {
    render(<LobbyPage />);
    advanceInitialWelcomeToChoices();

    fireEvent.keyDown(window, { key: "4" });

    expect(screen.queryByRole("dialog", { name: "咨询师的前台对话" })).not.toBeInTheDocument();
  });

  it("再次与同一位值班咨询师见面时不重复自我介绍", () => {
    render(<LobbyPage />);
    advanceInitialWelcomeToChoices();
    fireEvent.click(screen.getByRole("button", { name: "我先自己看看" }));
    fireEvent.click(screen.getByRole("button", { name: "前往前台，与值班咨询师交谈" }));
    completeCurrentLine();

    const dialogue = screen.getByRole("dialog", { name: "咨询师的前台对话" });
    expect(within(dialogue).getByText("又见面了。今天我在前台。你想预约、看看资料，或者只聊两句，都可以慢慢来。", { selector: ".lobby-dialogue-text" })).toBeInTheDocument();
    expect(within(dialogue).queryByText(/我是程灵/u, { selector: ".lobby-dialogue-text" })).not.toBeInTheDocument();
  });

  it("随便聊聊只提供继续文字对话或结束，不直接打开功能", () => {
    render(<LobbyPage />);
    advanceInitialWelcomeToChoices();
    fireEvent.click(screen.getByRole("button", { name: "随便聊聊" }));
    completeAndAdvanceSmallTalkToChoices();

    const choices = screen.getByRole("group", { name: "接待选项" });
    expect(within(choices).getAllByRole("button")).toHaveLength(2);
    expect(within(choices).getByRole("button", { name: "再多聊聊" })).toBeInTheDocument();
    expect(within(choices).getByRole("button", { name: "先聊到这，谢谢" })).toBeInTheDocument();
    expect(within(choices).queryByRole("button", { name: "打开看看" })).not.toBeInTheDocument();
  });

  it("第一次随便聊聊会先显示隐私说明，之后再选择不再重复", () => {
    render(<LobbyPage />);
    advanceInitialWelcomeToChoices();
    fireEvent.click(screen.getByRole("button", { name: "随便聊聊" }));

    completeCurrentLine();
    expect(screen.getByText(/不会调用 AI 服务，也不会生成咨询记录/, { selector: ".lobby-dialogue-text" })).toBeInTheDocument();
    completeAndAdvanceCurrentLine();
    completeCurrentLine();
    expect(screen.getByText(/生成回答需要的内容会发送给你选择的服务商/, { selector: ".lobby-dialogue-text" })).toBeInTheDocument();

    completeAndAdvanceSmallTalkToChoices();
    fireEvent.click(screen.getByRole("button", { name: "再多聊聊" }));

    expect(screen.queryByText(/不会调用 AI 服务，也不会生成咨询记录/, { selector: ".lobby-dialogue-text" })).not.toBeInTheDocument();
  });

  it("首次对白支持空格补全，并在补全后自动显示选项", () => {
    render(<LobbyPage />);

    expect(screen.queryByText("继续")).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: " " });
    expect(screen.getByText(/你好，欢迎你来/, { selector: ".lobby-dialogue-text" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "接待选项" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "继续" })).not.toBeInTheDocument();
  });

  it("对白期间点击画面任意位置可补全欢迎，并禁用等待室热点", () => {
    render(<LobbyPage />);

    const dialogue = screen.getByRole("dialog", { name: "咨询师的前台对话" });
    expect(screen.getByRole("button", { name: "打开书架故事簿" })).toBeDisabled();
    fireEvent.click(dialogue);
    expect(screen.getByText(/你好，欢迎你来/, { selector: ".lobby-dialogue-text" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "接待选项" })).toBeInTheDocument();
  });

  it("九处探索入口分别使用柔光圆点和物件文字提示", () => {
    window.localStorage.setItem(welcomeStorageKey, "true");
    render(<LobbyPage />);

    const labels = new Map([
      ["前往前台，与值班咨询师交谈", "前台"],
      ["打开书架故事簿", "书架"],
      ["查看工作室合照", "相册"],
      ["前往窗外花园", "花园"],
      ["查看使用说明与自助资料", "资料桌"],
      ["在沙发区查看会谈记录", "会谈记录"],
      ["认识程灵", "程灵"],
      ["认识周舟", "周舟"],
      ["认识林乐水", "林乐水"]
    ]);

    labels.forEach((label, ariaLabel) => {
      const hotspot = screen.getByRole("button", { name: ariaLabel });
      expect(hotspot).toHaveAttribute("data-hotspot-label", label);
      expect(hotspot.querySelector(".lobby-hotspot-beacon")).toBeInTheDocument();
      expect(hotspot.querySelector(".lobby-hotspot-glint")).not.toBeInTheDocument();
      expect(hotspot.closest(".lobby-scene-canvas")).toBeInTheDocument();
    });

    expect(document.querySelector(".lobby-stage")?.parentElement).toHaveClass("lobby-stage-shell");
    expect(document.querySelector(".lobby-scene-canvas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "系统设置" }).closest(".lobby-scene-canvas")).toBeNull();
    expect(screen.queryByRole("button", { name: "查看留言板" })).not.toBeInTheDocument();
  });

  it("工作室介绍逐句说明场景热点、沙发会谈记录与底部快捷入口", () => {
    window.localStorage.setItem(welcomeStorageKey, "true");
    render(<LobbyPage />);

    fireEvent.click(screen.getByRole("button", { name: "前往前台，与值班咨询师交谈" }));
    completeAndAdvanceCurrentLine();
    fireEvent.click(screen.getByRole("button", { name: "请带我看看工作室" }));

    const expectedLines = [
      /墙上的三张照片可以打开咨询师介绍册/,
      /沙发旁的「会谈记录」.*画面下方的「咨询师的信」/,
      /下方正中的「预约咨询」.*右边就是「系统设置」/,
      /房间里发着柔光的小圆点/
    ];
    expectedLines.forEach((line, index) => {
      completeCurrentLine();
      expect(screen.getByText(line, { selector: ".lobby-dialogue-text" })).toBeInTheDocument();
      if (index < expectedLines.length - 1) advanceCurrentLine();
    });
  });

  it("切换对话内容时保持立绘挂载", () => {
    render(<LobbyPage />);

    advanceInitialWelcomeToChoices();
    fireEvent.click(screen.getByRole("button", { name: "请带我看看工作室" }));

    const dialogue = screen.getByRole("dialog", { name: "咨询师的前台对话" });
    const portrait = screen.getByTestId("reception-counselor-dialogue-portrait");
    completeAndAdvanceCurrentLine();

    expect(screen.getByRole("dialog", { name: "咨询师的前台对话" })).toBe(dialogue);
    expect(screen.getByTestId("reception-counselor-dialogue-portrait")).toBe(portrait);
  });

  it("选择随便看看后关闭对白并保留可再次交谈的前台热点", () => {
    render(<LobbyPage />);

    advanceInitialWelcomeToChoices();
    fireEvent.click(screen.getByRole("button", { name: "我先自己看看" }));

    expect(screen.queryByRole("dialog", { name: "咨询师的前台对话" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "前往前台，与值班咨询师交谈" }));
    expect(screen.getByRole("dialog", { name: "咨询师的前台对话" })).toBeInTheDocument();
  });

  it("已看过完整欢迎时直接进入安静探索状态", () => {
    window.localStorage.setItem(welcomeStorageKey, "true");
    render(<LobbyPage />);

    expect(screen.queryByRole("dialog", { name: "咨询师的前台对话" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "前往前台，与值班咨询师交谈" })).toBeInTheDocument();
  });

  it("前台值班咨询师独立于介绍册当前选择，并使用确认后的三种状态", () => {
    window.localStorage.setItem(welcomeStorageKey, "true");
    render(<LobbyPage />);

    const initialScene = screen.getByTestId("reception-counselor-scene-portrait");
    expect(initialScene).toHaveAttribute("data-counselor-id", "chengling");
    expect(initialScene).toHaveAttribute("data-reception-state", "default");

    fireEvent.click(screen.getByRole("button", { name: "认识周舟" }));
    fireEvent.click(screen.getByRole("button", { name: "关闭咨询师介绍" }));
    expect(screen.getByTestId("reception-counselor-scene-portrait")).toHaveAttribute("data-counselor-id", "chengling");

    fireEvent.click(screen.getByRole("button", { name: "认识林乐水" }));
    fireEvent.click(screen.getByRole("button", { name: "关闭咨询师介绍" }));
    const receptionScene = screen.getByTestId("reception-counselor-scene-portrait");
    expect(receptionScene).toHaveAttribute("data-counselor-id", "chengling");
    expect(within(receptionScene).getByRole("img", { name: "值班咨询师在前台后" })).toHaveAttribute("src", expect.stringContaining("production-scene/chengling/default.png"));

    fireEvent.click(screen.getByRole("button", { name: "前往前台，与值班咨询师交谈" }));
    expect(screen.getByTestId("reception-counselor-scene-portrait")).toHaveAttribute("data-reception-state", "speaking");
    const dialoguePortrait = screen.getByTestId("reception-counselor-dialogue-portrait");
    expect(dialoguePortrait).toHaveAttribute("data-counselor-id", "chengling");
    expect(within(dialoguePortrait).getByRole("img", { name: "咨询师对话立绘" })).toHaveAttribute("src", expect.stringContaining("production-dialogue/chengling/transparent/chengling-dialogue-explain-static-hook-clean-transparent-v1.png"));

    completeAndAdvanceCurrentLine();
    expect(screen.getByTestId("reception-counselor-scene-portrait")).toHaveAttribute("data-reception-state", "choosing");
  });

  it("有进行中会谈时，前台值班不会抽到该会谈的咨询师", () => {
    window.localStorage.setItem(welcomeStorageKey, "true");
    useSessionStore.setState({
      activeSessionId: "active-chengling",
      sessions: [activeLobbySession("chengling")]
    });

    render(<LobbyPage />);

    expect(screen.getByTestId("reception-counselor-scene-portrait")).toHaveAttribute("data-counselor-id", "zhouzhou");
  });

  it("离开后重新进入等待室会保持当天的值班咨询师", () => {
    window.localStorage.setItem(welcomeStorageKey, "true");
    vi.mocked(Math.random).mockReturnValue(0);
    const firstVisit = render(<LobbyPage />);
    expect(screen.getByTestId("reception-counselor-scene-portrait")).toHaveAttribute("data-counselor-id", "chengling");

    firstVisit.unmount();
    vi.mocked(Math.random).mockReturnValue(0.99);
    render(<LobbyPage />);

    expect(screen.getByTestId("reception-counselor-scene-portrait")).toHaveAttribute("data-counselor-id", "chengling");
  });

  it("书架、沙发会谈记录与资料桌分别打开场景内的探索覆盖层", async () => {
    render(<LobbyPage />);
    dismissWelcomeDialogue();

    fireEvent.click(screen.getByRole("button", { name: "打开书架故事簿" }));
    expect(screen.getByRole("dialog", { name: "故事簿" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "故事簿" })).toBeInTheDocument();
    expect(screen.queryByText(/咨询师来信/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "关闭故事簿" }));

    fireEvent.click(screen.getByRole("button", { name: "在沙发区查看会谈记录" }));
    expect(screen.getByRole("dialog", { name: "会谈记录" })).toBeInTheDocument();
    expect(await screen.findByText("还没有会谈记录")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "关闭会谈记录" }));

    fireEvent.click(screen.getByRole("button", { name: "查看使用说明与自助资料" }));
    expect(screen.getByRole("dialog", { name: "使用说明与自助资料" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "查看使用帮助" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "查看心理危机与安全支持" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "查看知情同意书" })).toBeInTheDocument();
  });

  it("三位咨询师的合照使用自然简短的日常说明", () => {
    render(<LobbyPage />);
    dismissWelcomeDialogue();

    fireEvent.click(screen.getByRole("button", { name: "查看工作室合照" }));

    expect(screen.getByText("程灵、周舟和林乐水在工作室的一次日常留影")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "难得都在镜头里" })).toBeInTheDocument();
    expect(screen.getByText("群心心理工作室")).toBeInTheDocument();
    expect(screen.getByText("STUDIO PHOTO ARCHIVE")).toBeInTheDocument();
    expect(screen.getByText(/一个普通、也让人喜欢的下午/)).toBeInTheDocument();
    expect(screen.queryByText(/不读取|不关联会谈内容/)).not.toBeInTheDocument();
    expect(screen.queryByText(/偶尔|工作照|靠在一起|喝杯茶|好感度|解锁/)).not.toBeInTheDocument();
  });

  it("阅读资料与咨询师介绍使用统一的工作室档案结构", () => {
    render(<LobbyPage />);
    dismissWelcomeDialogue();

    fireEvent.click(screen.getByRole("button", { name: "打开书架故事簿" }));
    expect(screen.getByRole("region", { name: "工作室阅读档案" })).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("dialog", { name: "故事簿" })).getByRole("button", { name: "关闭故事簿" }));

    fireEvent.click(screen.getByRole("button", { name: "认识程灵" }));
    const counselorArchive = screen.getByRole("region", { name: "群心心理工作室咨询师档案" });
    expect(within(counselorArchive).getByRole("tab", { name: "程灵" })).toHaveAttribute("aria-selected", "true");
    expect(within(counselorArchive).getByRole("button", { name: "预约咨询" })).toBeInTheDocument();
    expect(counselorArchive.querySelector(".lobby-counselor-portrait-frame")).not.toBeInTheDocument();
    expect(counselorArchive.querySelector(".lobby-counselor-portrait-stage")).toBeInTheDocument();
    expect(counselorArchive).not.toHaveTextContent(/陪你|陪伴|接住/);
  });

  it("已预约的咨询师显示与设置页一致的咨询工作状态", () => {
    window.localStorage.setItem(welcomeStorageKey, "true");
    useSessionStore.setState({ bookedCounselorId: "chengling" });
    render(<LobbyPage />);

    fireEvent.click(screen.getByRole("button", { name: "认识程灵" }));

    expect(screen.getByRole("button", { name: "有进行中的咨询" })).toBeDisabled();
  });

  it("点击窗景可以进入花园并切换晴雨", () => {
    render(<LobbyPage />);
    dismissWelcomeDialogue();

    fireEvent.click(screen.getByRole("button", { name: "前往窗外花园" }));
    expect(screen.getByRole("region", { name: "湖畔花园" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "切换为雨天" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "切换为雨天" }));
    expect(screen.getByRole("button", { name: "切换为晴天" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "返回等待室" }));
    expect(screen.getByRole("button", { name: "前往前台，与值班咨询师交谈" })).toBeInTheDocument();
  });

  it("自由探索时底部快捷导航直接进入三个主要功能", async () => {
    window.localStorage.setItem(welcomeStorageKey, "true");
    render(<LobbyPage />);

    const quickNav = screen.getByRole("navigation", { name: "等待室快捷入口" });
    expect(within(quickNav).getAllByRole("button")).toHaveLength(3);

    fireEvent.click(within(quickNav).getByRole("button", { name: "咨询师的信" }));
    expect(screen.getByRole("dialog", { name: "咨询师的信" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "等待室快捷入口" })).not.toBeInTheDocument();
    expect(await screen.findByText("还没有来信")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "关闭来信" }));

    fireEvent.click(screen.getByRole("button", { name: "预约咨询" }));
    expect(screen.getByRole("dialog", { name: "预约咨询" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "关闭咨询师介绍" }));

    fireEvent.click(screen.getByRole("button", { name: "系统设置" }));

    expect(useAppStore.getState().activePage).toBe("settings");
  });

  it("首次预约程灵会先进入知情同意流程", () => {
    useSettingsStore.setState((state) => ({ api: { ...state.api, apiKeySaved: true } }));
    render(<LobbyPage />);

    advanceInitialWelcomeToChoices();
    fireEvent.click(screen.getByRole("button", { name: "我想预约心理咨询" }));
    fireEvent.click(screen.getByRole("button", { name: "预约咨询" }));

    expect(screen.getByRole("heading", { name: "完整知情同意书" })).toBeInTheDocument();
    expect(useSessionStore.getState().sessions).toHaveLength(0);
    expect(useAppStore.getState().activePage).toBe("lobby");
  });
});

function advanceInitialWelcomeToChoices() {
  completeCurrentLine();
}

function dismissWelcomeDialogue() {
  advanceInitialWelcomeToChoices();
  fireEvent.click(screen.getByRole("button", { name: "我先自己看看" }));
}

function completeCurrentLine(container?: HTMLElement) {
  const panel = (container ? within(container) : screen).queryByRole("button", { name: /显示完整对白|继续/ });
  if (!panel) return;
  if (panel.getAttribute("aria-label") === "显示完整对白") fireEvent.click(panel);
}

function advanceCurrentLine(container?: HTMLElement) {
  fireEvent.click((container ? within(container) : screen).getByRole("button", { name: "继续" }));
}

function completeAndAdvanceCurrentLine() {
  completeCurrentLine();
  const advance = screen.queryByRole("button", { name: "继续" });
  if (advance) fireEvent.click(advance);
}

function completeAndAdvanceSmallTalkToChoices() {
  for (let index = 0; index < 6; index += 1) {
    completeAndAdvanceCurrentLine();
    if (screen.queryByRole("group", { name: "接待选项" })) return;
  }
}

function activeLobbySession(counselorId: string) {
  return {
    id: `active-${counselorId}`,
    title: "进行中的会谈",
    time: "刚刚",
    preview: "还在进行中",
    counselorId,
    roomThemeId: "warm-study",
    teamId: "one-way-mirror",
    modelName: "deepseek-v4-flash",
    status: "active" as const,
    createdAt: "2026-08-17T08:00:00.000Z",
    startedAt: "2026-08-17T08:00:00.000Z",
    updatedAt: "2026-08-17T08:30:00.000Z",
    messagesLoaded: true,
    messages: []
  };
}
