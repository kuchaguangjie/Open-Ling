import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(
  resolve(process.cwd(), "apps/desktop/src/renderer/features/launch-welcome/launch-welcome.css"),
  "utf8"
);

describe("首次工作室欢迎页样式", () => {
  it("包含窄窗口纵向结构，且不动画整幅场景与内容面板", () => {
    expect(styles).toContain("@media (max-width: 860px)");
    expect(styles).toContain("grid-template-rows: minmax(250px, 42vh) minmax(430px, auto)");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).not.toContain("launch-welcome-scene-enter");
    expect(styles).not.toContain("launch-welcome-content-enter");
  });
});
