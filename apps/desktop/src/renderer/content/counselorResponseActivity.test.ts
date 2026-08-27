import { describe, expect, it } from "vitest";
import {
  buildCounselorResponseActivity,
  counselorResponseActivityRotationMs
} from "./counselorResponseActivity";

describe("counselorResponseActivity", () => {
  it("以3秒节奏轮换三条带咨询师姓名的回应状态", () => {
    expect(counselorResponseActivityRotationMs).toBe(3_000);
    expect(buildCounselorResponseActivity("程灵", 0)).toBe("程灵正在听你说");
    expect(buildCounselorResponseActivity("程灵", 1)).toBe("程灵正在整理刚才的话");
    expect(buildCounselorResponseActivity("程灵", 2)).toBe("程灵正在慢慢回应");
    expect(buildCounselorResponseActivity("程灵", 3)).toBe("程灵正在听你说");
  });
});
