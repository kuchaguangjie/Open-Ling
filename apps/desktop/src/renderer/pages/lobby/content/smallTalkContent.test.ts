import { describe, expect, it } from "vitest";
import { getReceptionSmallTalkItems } from "./smallTalkContent";

describe("前台随便聊聊文案", () => {
  it("三位咨询师都介绍真实功能，只概括书架用途而不剧透具体故事", () => {
    for (const counselorId of ["chengling", "zhouzhou", "linleshui"] as const) {
      const items = getReceptionSmallTalkItems("zh-CN", counselorId, { hasEndedSession: false });
      expect(items).toHaveLength(9);
      expect(items.map((item) => item.topic)).toContain("bookcase");
      expect(items.every((item) => !/半罐汤|一句[“"]收到|总说[“"]没事/u.test(item.lines.join("")))).toBe(true);
      expect(items.map((item) => item.topic)).not.toContain("records");
      expect(items.map((item) => item.topic)).not.toContain("letters");
    }
  });

  it("有结束会谈后才介绍记录与来信", () => {
    const items = getReceptionSmallTalkItems("zh-CN", "chengling", { hasEndedSession: true });
    expect(items).toHaveLength(11);
    expect(items.map((item) => item.topic)).toEqual(expect.arrayContaining(["records", "letters"]));
  });

  it("英文版本不回退到中文文案", () => {
    const items = getReceptionSmallTalkItems("en-US", "zhouzhou", { hasEndedSession: false });
    expect(items).toHaveLength(9);
    expect(items.every((item) => /[A-Za-z]/u.test(item.lines[0]))).toBe(true);
  });
});
