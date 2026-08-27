import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const rendererRoot = resolve(process.cwd(), "apps/desktop/src/renderer");

function readRendererFile(path: string) {
  return readFileSync(resolve(rendererRoot, path), "utf8");
}

describe("counseling room style ownership", () => {
  it("keeps consultation-room selectors out of the global stylesheet", () => {
    const globalCss = readRendererFile("styles/global.css");

    for (const selector of [
      ".room-layout",
      ".session-sidebar",
      ".conversation-panel",
      ".message-stream",
      ".input-area",
      ".context-panel",
      ".portrait-card",
      ".consultation-preparation-card",
      ".session-letter-card",
      ".session-letter-reader"
    ]) {
      expect(globalCss, `${selector} should be owned by a counseling-room module`).not.toContain(selector);
    }
  });

  it("places representative selectors in their owning module stylesheets", () => {
    expect(readRendererFile("pages/counseling-room/sidebar/sidebar.css")).toContain(".session-sidebar");
    expect(readRendererFile("pages/counseling-room/conversation/conversation.css")).toContain(".message-stream");
    expect(readRendererFile("pages/counseling-room/composer/composer.css")).toContain(".input-area");
    expect(readRendererFile("pages/counseling-room/stage/stage.css")).toContain(".portrait-card");
    expect(readRendererFile("pages/counseling-room/overlays/overlays.css")).toContain(".session-letter-reader");
  });

  it("resolves relative assets from their module stylesheet locations", () => {
    for (const relativePath of [
      "pages/counseling-room/sidebar/sidebar.css",
      "pages/counseling-room/conversation/conversation.css",
      "pages/counseling-room/composer/composer.css",
      "pages/counseling-room/stage/stage.css",
      "pages/counseling-room/overlays/overlays.css"
    ]) {
      const cssPath = resolve(rendererRoot, relativePath);
      const css = readFileSync(cssPath, "utf8");
      const assetPaths = [...css.matchAll(/url\(["']?(\.\.\/[^"')]+)["']?\)/g)].map((match) => match[1]);

      for (const assetPath of assetPaths) {
        expect(existsSync(resolve(dirname(cssPath), assetPath)), `${relativePath} should resolve ${assetPath}`).toBe(true);
      }
    }
  });

  it("keeps the opening dialogue focused instead of stretching copy edge to edge", () => {
    const transitionsCss = readRendererFile("pages/counseling-room/transitions/transitions.css");

    expect(transitionsCss).toContain(".consultation-dialogue-opening .consultation-dialogue-card");
    expect(transitionsCss).toContain(".consultation-dialogue-closing .consultation-dialogue-card");
    expect(transitionsCss).toContain("max-width: 1120px");
    expect(transitionsCss).toContain("width: clamp(620px, 50vw, 1120px)");
    expect(transitionsCss).toContain("font-size: clamp(20px, 1.45vw, 25px)");
    expect(transitionsCss).toContain("overflow-y: hidden;");
  });

  it("lets the collapsed 16:9 conversation surface fill the space up to the counselor stage", () => {
    const stageCss = readRendererFile("pages/counseling-room/stage/stage.css");
    const conversationCss = readRendererFile("pages/counseling-room/conversation/conversation.css");
    const composerCss = readRendererFile("pages/counseling-room/composer/composer.css");

    expect(stageCss).toContain("clamp(340px, 29vw, 720px)");
    expect(stageCss).toContain("@media (max-width: 1100px)");
    expect(conversationCss).toContain("max-width: 1240px");
    expect(conversationCss).toContain(".room-layout.sidebar-collapsed .conversation-panel");
    expect(conversationCss).toContain("justify-self: end");
    expect(conversationCss).toContain("max-width: 1400px");
    expect(composerCss).toContain("width: min(calc(100% - 136px), calc(58vw - 88px), 1032px)");
    expect(composerCss).toContain("justify-self: center");
    expect(stageCss).toContain("rgba(31, 21, 14, 0.085)");
    expect(stageCss).not.toContain("rgba(255, 250, 239, 0.14)");
  });

  it("keeps the history drawer as a fixed-width overlay outside the room grid", () => {
    const sidebarCss = readRendererFile("pages/counseling-room/sidebar/sidebar.css");
    const conversationCss = readRendererFile("pages/counseling-room/conversation/conversation.css");
    const archiveCss = readRendererFile("pages/counseling-room/conversation/read-only-history.css");
    const roomPage = readRendererFile("pages/CounselingRoomPage.tsx");

    expect(roomPage).toContain('"sidebar-collapsed"');
    expect(roomPage).toContain("history-open");
    expect(roomPage).toContain("consultation-archive-layout");
    expect(sidebarCss).toContain(".room-layout > .session-sidebar.history-drawer");
    expect(sidebarCss).toContain(".consultation-archive-layout > .session-sidebar.history-drawer");
    expect(sidebarCss).toContain("position: absolute !important");
    expect(sidebarCss).toContain("width: 288px");
    expect(sidebarCss).toContain("left: 92px");
    expect(sidebarCss).toContain("height: auto");
    expect(sidebarCss).toContain("white-space: nowrap");
    expect(conversationCss).toContain(".room-layout.sidebar-collapsed.history-open .conversation-panel");
    expect(conversationCss).toContain("justify-self: stretch");
    expect(conversationCss).toContain("margin-left: 250px");
    expect(conversationCss).toContain("max-width: none");
    expect(archiveCss).toContain(".consultation-archive-layout.sidebar-collapsed.history-open .consultation-history-panel");
    expect(archiveCss).toContain("width: calc(100% - 250px)");
  });

  it("themes the session title per counselor as a compact transparent glass plaque", () => {
    const conversationCss = readRendererFile("pages/counseling-room/conversation/conversation.css");

    expect(conversationCss).toContain(".room-layout-chengling");
    expect(conversationCss).toContain("--session-title-background: rgba(255, 244, 226, 0.82)");
    expect(conversationCss).toContain(".room-layout-zhouzhou");
    expect(conversationCss).toContain("--session-title-background: rgba(240, 246, 244, 0.76)");
    expect(conversationCss).toContain(".room-layout-linleshui");
    expect(conversationCss).toContain("--session-title-background: rgba(246, 248, 238, 0.76)");
    expect(conversationCss).toContain("background: var(--session-title-background");
    expect(conversationCss).toContain("padding: 16px 34px 30px");
    expect(conversationCss).toContain("border-radius: 18px");
    expect(conversationCss).toContain("border-radius: 14px");
    expect(conversationCss).toContain("--conversation-glass-left: 18px");
    expect(conversationCss).toContain("left: 64px");
    expect(conversationCss).toContain("width: min(322px, calc(100% - 24px))");
    expect(conversationCss).toContain("justify-self: center");
    expect(conversationCss).toContain("margin: 4px 0 8px");
  });
});
