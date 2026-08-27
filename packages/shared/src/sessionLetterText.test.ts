import { describe, expect, it } from "vitest";
import {
  formatSessionLetterMarkdown,
  isSessionLetterSalutation,
  splitSessionLetterParagraphs
} from "./sessionLetterText";

describe("session letter text", () => {
  it("removes a generic salutation when no profile name is set", () => {
    expect(formatSessionLetterMarkdown("亲爱的你：\n\n这次会谈里，你只说了短短一句。", "", "zh-CN"))
      .toBe("这次会谈里，你只说了短短一句。");
  });

  it("adds the configured form of address as a flush-left first line", () => {
    expect(splitSessionLetterParagraphs("这次会谈里，你只说了短短一句。", " 小满 ", "zh-CN"))
      .toEqual(["小满：", "这次会谈里，你只说了短短一句。"]);
    expect(isSessionLetterSalutation("小满：")).toBe(true);
  });

  it("uses English letter punctuation without an intimate greeting", () => {
    expect(formatSessionLetterMarkdown("Dear you,\n\nI remember the pause today.", "Alex", "en-US"))
      .toBe("Alex,\n\nI remember the pause today.");
  });
});
