import { describe, expect, it } from "vitest";
import { getOpeningPrivacyAssurance, splitDialogueSentences } from "./counselorFlowContent";

describe("splitDialogueSentences", () => {
  it("shows one complete Chinese sentence at a time", () => {
    expect(splitDialogueSentences([
      "今天的咨询先到这里。谢谢你愿意把这些感受告诉我。",
      "我会把重点整理成一封信。"
    ])).toEqual([
      "今天的咨询先到这里。",
      "谢谢你愿意把这些感受告诉我。",
      "我会把重点整理成一封信。"
    ]);
  });
});

describe("getOpeningPrivacyAssurance", () => {
  it("首次进入时使用正式说明，并如实区分本机模型", () => {
    const zh = getOpeningPrivacyAssurance("first", "local");
    expect(zh).toContain("想先和你说清楚");
    expect(zh).toContain("不会通过 Ling 自有服务器传输");
    expect(zh).toContain("本机模型");
    expect(zh).not.toContain("模型服务商");
  });

  it("首次进入时 API 模式会说明按隐私政策处理，而不强调可能保存", () => {
    const zh = getOpeningPrivacyAssurance("first", "remote");
    expect(zh).toContain("想先和你说清楚");
    expect(zh).toContain("不会通过 Ling 自有服务器传输");
    expect(zh).toContain("模型服务商");
    expect(zh).toContain("隐私政策");
    expect(zh).not.toContain("是否保存");
  });

  it("再次进入时只做简短提醒，不再重复完整隐私说明", () => {
    const zh = getOpeningPrivacyAssurance("returning", "remote");
    expect(zh).toContain("再提醒你一句");
    expect(zh).toContain("不会通过 Ling 自有服务器传输");
    expect(zh).toContain("模型服务商");
    expect(zh).not.toContain("隐私政策");
    expect(getOpeningPrivacyAssurance("second", "local")).toContain("再提醒你一句");
  });

  it("英文版本同样覆盖本地与 API 两种情形", () => {
    expect(getOpeningPrivacyAssurance("first", "local", "en-US")).toContain("stays on this device");
    expect(getOpeningPrivacyAssurance("first", "remote", "en-US")).toContain("model provider");
    expect(getOpeningPrivacyAssurance("first", "remote", "en-US")).toContain("privacy policy");
    expect(getOpeningPrivacyAssurance("returning", "remote", "en-US")).not.toContain("privacy policy");
  });
});
