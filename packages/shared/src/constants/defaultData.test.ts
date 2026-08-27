import { describe, expect, it } from "vitest";
import { defaultCounselors } from "./defaultCounselors";
import { defaultRoomThemes } from "./defaultRoomThemes";

describe("Ling 默认数据", () => {
  it("包含三位内置咨询师", () => {
    expect(defaultCounselors).toHaveLength(3);
    expect(defaultCounselors.map((counselor) => counselor.name)).toEqual(["程灵", "周舟", "林乐水"]);
    expect(defaultCounselors.map((counselor) => counselor.title)).toEqual([
      "人本—心理动力取向心理咨询师",
      "焦点解决取向心理咨询师",
      "中国传统心性哲学取向心理咨询师"
    ]);
  });

  it("包含四个内置咨询室主题", () => {
    expect(defaultRoomThemes).toHaveLength(4);
    expect(defaultRoomThemes.map((theme) => theme.name)).toEqual(["温暖书房", "清冷书房", "雨夜咨询室", "白色静室"]);
  });
});
