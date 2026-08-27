import { describe, expect, it } from "vitest";
import { parseModelJson } from "./modelJson";

describe("parseModelJson", () => {
  it("parses fenced JSON", () => {
    expect(parseModelJson('```json\n{"memoMd":"内容"}\n```')).toEqual({ memoMd: "内容" });
  });

  it("parses valid JSON when a provider omits the closing markdown fence", () => {
    expect(parseModelJson('```json\n{"supervisionMd":"内容"}')).toEqual({ supervisionMd: "内容" });
  });

  it("escapes literal control characters that models place inside JSON strings", () => {
    const raw = '{"supervisionMd":"第一行\n第二行\t结束"}';
    expect(parseModelJson(raw)).toEqual({ supervisionMd: "第一行\n第二行\t结束" });
  });

  it("does not rewrite structural whitespace outside strings", () => {
    expect(parseModelJson('{\n  "ids": ["a", "b"]\n}')).toEqual({ ids: ["a", "b"] });
  });

  it("repairs only a missing final quote when the model still emitted the closing object brace", () => {
    const raw = '{"memoMd":"# 下一次咨询备忘录\n\n内容已完整\n}';
    expect(parseModelJson(raw)).toEqual({ memoMd: "# 下一次咨询备忘录\n\n内容已完整\n" });
  });

  it("still rejects genuinely truncated JSON without a closing object brace", () => {
    expect(() => parseModelJson('{"memoMd":"只有一半')).toThrow();
    expect(() => parseModelJson('```json\n{"memoMd":"只有一半')).toThrow();
  });
});
