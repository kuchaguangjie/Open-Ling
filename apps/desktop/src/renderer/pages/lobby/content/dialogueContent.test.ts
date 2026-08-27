import { describe, expect, it } from "vitest";
import { getDialogueScripts } from "./dialogueContent";

describe("前台咨询师个性化问候", () => {
  it("第一次见面自我介绍，再次见面不重复名字", () => {
    const scripts = getDialogueScripts("zh-CN", "zhouzhou", "周舟", undefined, true);

    expect(scripts.firstVisit.lines[0]).toContain("我是周舟");
    expect(scripts.returning.lines[0]).not.toContain("我是周舟");
    expect(scripts.returning.lines[0]).toContain("又见面了");
  });

  it("三位咨询师使用不同的语言重心", () => {
    const chengling = getDialogueScripts("zh-CN", "chengling", "程灵").returning.lines[0];
    const zhouzhou = getDialogueScripts("zh-CN", "zhouzhou", "周舟").returning.lines[0];
    const linleshui = getDialogueScripts("zh-CN", "linleshui", "林乐水").returning.lines[0];

    expect(chengling).toContain("慢慢来");
    expect(zhouzhou).toContain("今天想用哪个，就点哪个");
    expect(linleshui).toContain("坐一会儿也行");
    expect(new Set([chengling, zhouzhou, linleshui]).size).toBe(3);
  });

  it("首次接班会介绍自己，见过以后只说明接班", () => {
    const first = getDialogueScripts("zh-CN", "linleshui", "林乐水", "周舟", true).handoff.lines[0];
    const returning = getDialogueScripts("zh-CN", "linleshui", "林乐水", "周舟", false).handoff.lines[0];

    expect(first).toContain("我是林乐水");
    expect(returning).not.toContain("我是林乐水");
  });
});
