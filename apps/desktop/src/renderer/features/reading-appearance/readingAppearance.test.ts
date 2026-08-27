import { describe, expect, it } from "vitest";
import { applyReadingAppearance, getReadingPreviewStyle } from "./readingAppearance";

describe("reading appearance", () => {
  it("applies the selected readable sizes and spacing as document variables", () => {
    const root = document.createElement("div");

    applyReadingAppearance({ textSize: "large", lineSpacing: "relaxed" }, root);

    expect(root.style.getPropertyValue("--reading-message-font-size")).toBe("17.25px");
    expect(root.style.getPropertyValue("--reading-letter-reader-line-height")).toBe("2.12");
    expect(root.dataset.readingTextSize).toBe("large");
    expect(root.dataset.readingLineSpacing).toBe("relaxed");
    expect(root.dataset.lingCursorTheme).toBe("d");
  });

  it("keeps the preview proportions aligned with the reading content", () => {
    expect(getReadingPreviewStyle({ textSize: "small", lineSpacing: "compact" })).toEqual({
      fontSize: "15px",
      lineHeight: "1.74"
    });
    expect(getReadingPreviewStyle({ textSize: "standard", lineSpacing: "standard" })).toEqual({
      fontSize: "16px",
      lineHeight: "1.92"
    });
  });
});
