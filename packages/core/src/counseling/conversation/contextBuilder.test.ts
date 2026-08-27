// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildCounselingMessages } from "./contextBuilder";
import type { SessionMessage } from "@shared/index";

const messages: SessionMessage[] = [
  {
    id: "m1",
    sessionId: "s1",
    role: "user",
    content: "第一条",
    createdAt: "2026-07-03T10:00:00.000Z",
    metadata: { uiOnly: true }
  },
  {
    id: "m2",
    sessionId: "s1",
    role: "assistant",
    content: "第二条",
    createdAt: "2026-07-03T10:01:00.000Z",
    metadata: { localDraftId: "x" }
  },
  {
    id: "m3",
    sessionId: "s1",
    role: "user",
    content: "第三条",
    createdAt: "2026-07-03T10:02:00.000Z"
  }
];

describe("buildCounselingMessages", () => {
  it("uses counselor-specific test prompts", () => {
    const chengling = buildCounselingMessages({ counselorId: "chengling", teamId: "one-way-mirror", messages: [] });
    const zhouzhou = buildCounselingMessages({ counselorId: "zhouzhou", teamId: "one-way-mirror", messages: [] });
    const linleshui = buildCounselingMessages({ counselorId: "linleshui", teamId: "one-way-mirror", messages: [] });

    expect(chengling[0].role).toBe("system");
    expect(chengling[0].content).toContain("程灵｜咨询师核心角色");
    expect(zhouzhou[0].content).toContain("周舟｜咨询师核心角色");
    expect(linleshui[0].content).toContain("林乐水｜咨询师核心角色");
    expect(zhouzhou[0].content).not.toBe(chengling[0].content);
    expect(linleshui[0].content).not.toBe(chengling[0].content);
    for (const result of [chengling, zhouzhou, linleshui]) {
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        role: "system",
        content: expect.stringContaining("实时咨询安全原则")
      });
      expect(result[0].content).toContain("# 咨询伦理｜专业关系与 AI 边界");
      expect(result[0].content.indexOf("# 共同咨询价值观")).toBeLessThan(
        result[0].content.indexOf("# 咨询伦理｜专业关系与 AI 边界")
      );
      expect(result[0].content.indexOf("# 咨询伦理｜专业关系与 AI 边界")).toBeLessThan(
        result[0].content.indexOf("# 当前场景")
      );
      expect(result[0].content.lastIndexOf("# 实时咨询安全原则")).toBeGreaterThan(
        result[0].content.indexOf("# 当前场景")
      );
      expect(result[1]).toMatchObject({ role: "system", id: expect.stringMatching(/-voice$/) });
      expect(result[1].content).toContain("语言与表达风格");
    }
  });

  it("uses a frozen session prompt snapshot when provided", () => {
    const result = buildCounselingMessages({
      counselorId: "chengling",
      teamId: "one-way-mirror",
      messages: [],
      promptSnapshot: {
        version: 1,
        counselorId: "chengling",
        teamId: "one-way-mirror",
        modelName: "deepseek-v4-flash",
        systemPrompt: "冻结的程灵提示词快照",
        createdAt: "2026-07-05T12:00:00.000Z"
      }
    });

    expect(result[0].content).toContain("冻结的程灵提示词快照");
    expect(result[0].content).toContain("# 咨询伦理｜专业关系与 AI 边界");
    expect(result[0].content).toContain("实时咨询安全原则");
    expect(result[0].content).not.toContain("程灵｜咨询师核心提示词");
    expect(result).toHaveLength(1);
  });

  it("keeps a V4 session on its frozen combined voice instead of injecting the current standalone voice", () => {
    const result = buildCounselingMessages({
      counselorId: "chengling",
      teamId: "one-way-mirror",
      messages: [],
      promptSnapshot: {
        version: 4,
        locale: "zh-CN",
        counselorId: "chengling",
        teamId: "one-way-mirror",
        modelName: "deepseek-v4-flash",
        counselorPackageVersion: "1.0.0",
        promptContentHash: "fnv1a32:12345678",
        counselorCorePrompt: "冻结的旧核心，已经包含旧语言风格。",
        sharedCounselingValuesPrompt: "冻结的共同价值观",
        counselingTaskPrompt: "冻结的旧场景",
        teamPrompt: "",
        systemPrompt: "冻结的旧完整系统提示词",
        createdAt: "2026-08-07T12:00:00.000Z"
      }
    });

    expect(result.map((message) => message.id)).toEqual(["system-chengling"]);
    expect(result[0].content).toContain("冻结的旧核心，已经包含旧语言风格。");
    expect(result[0].content).toContain("# 咨询伦理｜专业关系与 AI 边界");
    expect(result[0].content).not.toContain("# 程灵｜语言与表达风格");
  });

  it("places a V5 frozen standalone voice after optional context and before conversation history", () => {
    const result = buildCounselingMessages({
      counselorId: "chengling",
      teamId: "one-way-mirror",
      messages: [messages[0]],
      basicProfile: "希望被称呼为小满。",
      promptSnapshot: {
        version: 5,
        locale: "zh-CN",
        counselorId: "chengling",
        teamId: "one-way-mirror",
        modelName: "deepseek-v4-flash",
        counselorPackageVersion: "1.0.0",
        promptContentHash: "fnv1a32:87654321",
        counselorCorePrompt: "冻结的新版核心",
        counselorVoicePrompt: "# 冻结的独立语言风格",
        sharedCounselingValuesPrompt: "冻结的共同价值观",
        counselingTaskPrompt: "冻结的新版场景",
        teamPrompt: "",
        systemPrompt: "冻结的新版完整系统提示词",
        createdAt: "2026-08-25T12:00:00.000Z"
      }
    });

    expect(result.map((message) => message.id)).toEqual([
      "system-chengling",
      "system-basic-profile",
      "system-chengling-voice",
      "m1"
    ]);
    expect(result[2].content).toBe("# 冻结的独立语言风格");
  });

  it("keeps the Chinese prompt suite while passing an English client message through unchanged", () => {
    const englishMessage: SessionMessage = {
      id: "english-input",
      sessionId: "s-language",
      role: "user",
      content: "Could we continue in English? I feel torn between staying and leaving.",
      createdAt: "2026-07-30T06:00:00.000Z",
      status: "sent"
    };
    const result = buildCounselingMessages({
      counselorId: "chengling",
      teamId: "one-way-mirror",
      messages: [englishMessage]
    });

    expect(result[0].content).toContain("只有来访者明确要求切换语言时");
    expect(result[0].content).not.toContain("Live Counseling Dialogue for Cheng Ling");
    expect(result[0].content).toContain("实时咨询安全原则");
    expect(result.at(-1)?.content).toBe(englishMessage.content);
  });

  it("keeps full fitting history and strips local metadata", () => {
    const result = buildCounselingMessages({
      counselorId: "chengling",
      teamId: "one-way-mirror",
      messages
    });

    expect(result.map((message) => message.content)).toEqual([
      expect.stringMatching(/程灵[\s\S]*实时咨询安全原则/),
      expect.stringContaining("程灵｜语言与表达风格"),
      "第一条",
      "第二条",
      "第三条"
    ]);
    expect(result[3]).not.toHaveProperty("metadata");
    expect(result[4]).not.toHaveProperty("metadata");
  });

  it("keeps team prompt space empty until the user confirms team prompts", () => {
    const result = buildCounselingMessages({ counselorId: "chengling", teamId: "supervision", messages: [] });

    expect(result).toHaveLength(2);
    expect(result[0].content).toContain("实时咨询安全原则");
  });

  it("injects one consultation memo after the counselor system prompt", () => {
    const result = buildCounselingMessages({
      counselorId: "chengling",
      teamId: "one-way-mirror",
      messages: [messages[0]],
      consultationMemo: "# 下一次咨询备忘录\n\n用户偏好慢一点的回应节奏，旧理解仍可修正。"
    });

    expect(result.map((message) => message.id)).toEqual([
      "system-chengling",
      "system-consultation-memo",
      "system-chengling-voice",
      "m1"
    ]);
    expect(result[1].content).toContain("用户偏好慢一点的回应节奏");
    expect(result[1].content).toContain("为本次会谈准备的内部咨询备忘录");
    expect(result[1].content).toContain("# 咨询备忘录");
    expect(result[1].content).not.toContain("下一次咨询备忘录");
    expect(result[1].content).toContain("不是事实档案、诊断结论或咨询计划");
    expect(result[1].content).toContain("当前表达始终优先");
  });

  it("injects user-entered basic profile after the counselor system prompt", () => {
    const result = buildCounselingMessages({
      counselorId: "chengling",
      teamId: "one-way-mirror",
      messages: [messages[0]],
      basicProfile: "- 希望被称呼为：Bella\n- 用户愿意提前告知的背景：希望对话慢一点。"
    });

    expect(result.map((message) => message.id)).toEqual([
      "system-chengling",
      "system-basic-profile",
      "system-chengling-voice",
      "m1"
    ]);
    expect(result[1].content).toContain("用户主动填写的基础个人资料");
    expect(result[1].content).toContain("希望被称呼为：Bella");
    expect(result[1].content).toContain("当前用户本轮表达始终优先");
  });

  it("does not inject an empty basic profile context", () => {
    const result = buildCounselingMessages({
      counselorId: "chengling",
      teamId: "one-way-mirror",
      messages: [messages[0]],
      basicProfile: "   "
    });

    expect(result.map((message) => message.id)).toEqual(["system-chengling", "system-chengling-voice", "m1"]);
  });

  it("truncates the consultation memo by its own budget without removing the current user message", () => {
    const result = buildCounselingMessages({
      counselorId: "chengling",
      teamId: "one-way-mirror",
      messages: [messages[0]],
      consultationMemo: `${"备忘".repeat(80)}备忘录尾部不应出现`,
      consultationMemoBudgetTokens: 70
    });

    expect(result.at(-1)?.id).toBe("m1");
    expect(result.find((message) => message.id === "system-consultation-memo")?.content).toContain("已按上下文预算截断");
    expect(result.map((message) => message.content).join("\n")).not.toContain("尾部不应出现");
  });

  it("truncates basic profile by its own budget without removing the current user message", () => {
    const result = buildCounselingMessages({
      counselorId: "chengling",
      teamId: "one-way-mirror",
      messages: [messages[0]],
      basicProfile: `${"背景".repeat(80)}背景尾部不应出现`,
      basicProfileBudgetTokens: 70
    });

    expect(result.at(-1)?.id).toBe("m1");
    expect(result.find((message) => message.id === "system-basic-profile")?.content).toContain("已按上下文预算截断");
    expect(result.map((message) => message.content).join("\n")).not.toContain("背景尾部不应出现");
  });

  it("does not inject rolling summary while all original history fits the token budget", () => {
    const result = buildCounselingMessages({
      counselorId: "chengling",
      teamId: "one-way-mirror",
      messages: [messages[0]],
      rollingSummary: "### 重要事实\n- 用户提到最近很累。\n\n### 事情经过\n- 用户描述了疲惫感。"
    });

    expect(result.map((message) => message.id)).toEqual(["system-chengling", "system-chengling-voice", "m1"]);
  });

  it("injects rolling summary only when older original history is omitted by token budget", () => {
    const longHistory: SessionMessage[] = Array.from({ length: 16 }, (_, index) => ({
      id: `m-${index}`,
      sessionId: "s-long",
      role: index % 2 === 0 ? "user" : "assistant",
      content: `消息 ${index}`,
      createdAt: `2026-07-03T10:${String(index).padStart(2, "0")}:00.000Z`,
      status: "sent"
    }));

    const result = buildCounselingMessages({
      counselorId: "chengling",
      teamId: "one-way-mirror",
      messages: longHistory,
      rollingSummary: "### 重要事实\n- 用户提到较早背景。\n\n### 事情经过\n- 较早会谈已有展开。",
      shortTermHistoryBudgetTokens: 20
    });

    expect(result.map((message) => message.id)).toEqual([
      "system-chengling",
      "system-rolling-summary",
      "system-chengling-voice",
      "m-12",
      "m-13",
      "m-14",
      "m-15"
    ]);
    expect(result[1].content).toContain("未逐字注入的较早会谈脉络摘要");
  });

  it("keeps the newest oversized message when token budget would otherwise remove everything", () => {
    const result = buildCounselingMessages({
      counselorId: "chengling",
      teamId: "one-way-mirror",
      messages: [
        { ...messages[0], id: "older", content: "较早消息" },
        { ...messages[1], id: "newest", content: "这是一条超过预算但必须保留的最新消息" }
      ],
      shortTermHistoryBudgetTokens: 5
    });

    expect(result.map((message) => message.id)).toEqual(["system-chengling", "system-chengling-voice", "newest"]);
  });
  it("always keeps realtime safety inside the counselor system prompt", () => {
    for (const safetyLane of [undefined, "none", "unclear", "imminent"] as const) {
      const result = buildCounselingMessages({
        counselorId: "chengling",
        teamId: "one-way-mirror",
        messages: [],
        safetyLane
      });
      expect(result[0].content).toContain("# 实时咨询安全原则");
      expect(result[0].content).toContain("危险越迫近，现实行动越优先");
    }
  });

  it("adds a crisis emphasis slice only when the lane is not none", () => {
    const none = buildCounselingMessages({
      counselorId: "chengling",
      teamId: "one-way-mirror",
      messages: [],
      safetyLane: "none"
    });
    expect(none.some((message) => message.id === "system-safety-emphasis")).toBe(false);

    const imminent = buildCounselingMessages({
      counselorId: "chengling",
      teamId: "one-way-mirror",
      messages: [],
      safetyLane: "imminent"
    });
    const emphasis = imminent.find((message) => message.id === "system-safety-emphasis");
    expect(emphasis?.content).toContain("# 实时咨询安全原则");
    expect(emphasis?.content).toContain("危险越迫近，现实行动越优先");
    expect(imminent.map((message) => message.id)).toContain("system-chengling-voice");
  });

});
