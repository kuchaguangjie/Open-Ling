import { describe, expect, it } from "vitest";
import { getStoryArticles, storyArticles, storyCounselors } from "./storyContent";

describe("storyContent", () => {
  it("为三位咨询师各提供三篇带彩墨插图的文章", () => {
    expect(storyArticles).toHaveLength(9);

    for (const counselor of storyCounselors) {
      expect(getStoryArticles(counselor.id)).toHaveLength(3);
    }

    for (const article of storyArticles) {
      expect(article.imageUrl).toMatch(/\.webp$/);
      expect(article.imageUrl).toContain("-ink-v1");
      expect(article.imageAlt.length).toBeGreaterThan(0);
      expect(article.theme.length).toBeGreaterThan(0);
      expect(article.paragraphs.length).toBeGreaterThanOrEqual(4);
      expect(article.byline.author).toBe(storyCounselors.find(({ id }) => id === article.counselorId)?.name);
      expect(article.byline.season).toMatch(/^二〇二六年/);
      expect(article.byline.location.length).toBeGreaterThan(1);
      expect(article.paragraphs.join(" ")).not.toMatch(/程灵讲述|周舟讲述|林乐水讲述/);
    }
  });

  it("只为佛经故事改写标注公开来源", () => {
    expect(storyArticles.filter((article) => article.sourceNote)).toHaveLength(2);
    expect(storyArticles.find((article) => article.id === "third-floor-room")?.sourceNote)
      .toContain("百喻经");
  });
});
