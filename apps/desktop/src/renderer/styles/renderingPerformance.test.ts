import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readRendererCss(path: string) {
  return readFileSync(resolve(process.cwd(), "apps/desktop/src/renderer", path), "utf8");
}

describe("大面积渲染性能契约", () => {
  it("咨询室长驻大面板不使用实时背景模糊", () => {
    const conversation = readRendererCss("pages/counseling-room/conversation/conversation.css");
    const composer = readRendererCss("pages/counseling-room/composer/composer.css");
    const sidebar = readRendererCss("pages/counseling-room/sidebar/sidebar.css");
    const transitions = readRendererCss("pages/counseling-room/transitions/transitions.css");

    expect(conversation.match(/\.conversation-panel::before\s*\{[\s\S]*?\n}/)?.[0]).not.toContain("backdrop-filter");
    expect(composer.match(/\.input-area\s*\{[\s\S]*?\n}/)?.[0]).not.toContain("backdrop-filter");
    expect(sidebar.match(/\.session-sidebar\.collapsed\s*\{[\s\S]*?\n}/)?.[0]).not.toContain("backdrop-filter");
    expect(sidebar.match(/\.session-sidebar\.history-drawer\s*\{[\s\S]*?\n}/)?.[0]).not.toContain("backdrop-filter");
    expect(transitions.match(/\.consultation-confirm-backdrop\s*\{[\s\S]*?\n}/)?.[0]).not.toContain("backdrop-filter");
  });

  it("等待室全屏光斑不使用混合模式或无限位移动画", () => {
    const lobby = readRendererCss("pages/lobby/shell/lobby-shell.css");
    const dappleRule = lobby.match(/\.lobby-sun-dapple\s*\{[^}]+}/)?.[0] ?? "";

    expect(dappleRule).not.toContain("mix-blend-mode");
    expect(dappleRule).not.toContain("animation:");
    expect(lobby).not.toContain("@keyframes lobby-dapple");
  });

  it("保留人物呼吸、状态切换和图像过渡等局部细节动画", () => {
    const stage = readRendererCss("pages/counseling-room/stage/stage.css");

    expect(stage).toContain("portrait-breathe 8.8s ease-in-out infinite");
    expect(stage).toContain("portrait-listening 7.4s ease-in-out infinite");
    expect(stage).toContain("portrait-thinking 9.6s ease-in-out infinite");
    expect(stage).toContain("portrait-responding 6.8s ease-in-out infinite");
    expect(stage).toContain("portrait-image-enter 520ms cubic-bezier(0.22, 0.61, 0.36, 1)");
    expect(stage).toContain("@keyframes portrait-breathe");
    expect(stage).toContain("@keyframes portrait-listening");
    expect(stage).toContain("@keyframes portrait-thinking");
    expect(stage).toContain("@keyframes portrait-responding");
    expect(stage).toContain("@keyframes portrait-image-enter");
  });

  it("原生 4K 宽度暂停整张人物的持续位移但保留状态淡入", () => {
    const stage = readRendererCss("pages/counseling-room/stage/stage.css");
    const start = stage.indexOf("@media (min-width: 2560px)");
    const native4kRule = start < 0
      ? ""
      : stage.slice(start, stage.indexOf("@media (max-width: 1100px)", start));

    expect(native4kRule).toContain(".portrait-frame");
    expect(native4kRule).toContain("animation: none");
    expect(native4kRule).toContain("portrait-image-enter 120ms");
    expect(native4kRule).toContain("portrait-image-exit 120ms");
  });
});
