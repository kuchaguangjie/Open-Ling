import { readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

const themeCss = readFileSync("apps/desktop/src/renderer/styles/theme.css", "utf8");
const mainTsx = readFileSync("apps/desktop/src/renderer/main.tsx", "utf8");
const zhenkaiFullFontSize = statSync("assets/fonts/lxgw-zhenkai/LXGWZhenKaiGB-Regular.ttf").size;
const rendererCss = [
  themeCss,
  readFileSync("apps/desktop/src/renderer/styles/global.css", "utf8"),
  readFileSync("apps/desktop/src/renderer/features/settings/memory/settings-memory.css", "utf8"),
  readFileSync("apps/desktop/src/renderer/features/settings/system/settings-system.css", "utf8")
].join("\n");

describe("Ling 字体主题", () => {
  it("内置 Noto Serif SC 全字符分片和所需字重，避免生僻字回退成不同字体", () => {
    expect(mainTsx).toContain("@fontsource/noto-serif-sc/400.css");
    expect(mainTsx).toContain("@fontsource/noto-serif-sc/600.css");
    expect(mainTsx).toContain("@fontsource/noto-serif-sc/700.css");
    expect(mainTsx).not.toContain("chinese-simplified");
  });

  it("用本地 OFL 字体文件提供臻楷正文和状态短句字体", () => {
    expect(themeCss).toContain("assets/fonts/lxgw-zhenkai/LXGWZhenKaiGB-Regular.ttf");
    expect(themeCss).toContain('format("truetype")');
    expect(zhenkaiFullFontSize).toBeGreaterThan(10 * 1024 * 1024);
  });

  it("在主题中提供 UI、标题、正文和状态短句字体 token", () => {
    expect(themeCss).toContain("--font-ui:");
    expect(themeCss).toContain("--font-title:");
    expect(themeCss).toContain("--font-letter:");
    expect(themeCss).toContain("--font-quote:");
    expect(themeCss).toContain("LXGW ZhenKai");
    expect(themeCss).toContain("Noto Serif SC");
    expect(themeCss).toContain('--font-ui: "Noto Serif SC", serif;');
    expect(themeCss).toContain('--font-letter: "LXGW ZhenKai", "Noto Serif SC", serif;');
    expect(themeCss).toContain('--font-quote: "LXGW ZhenKai", "Noto Serif SC", serif;');
  });

  it("排除方正和微软雅黑等不可用或不合适的字体", () => {
    expect(rendererCss).not.toMatch(/方正|Founder|FZ[A-Za-z-]*|Microsoft YaHei|微软雅黑/);
  });
});
