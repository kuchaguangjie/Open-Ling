import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readRendererFile = (path: string) => readFileSync(`apps/desktop/src/renderer/${path}`, "utf8");

describe("Ling 动效主题契约", () => {
  it("提供统一的快速反馈、表面和页面动效 token", () => {
    const themeCss = readRendererFile("styles/theme.css");

    expect(themeCss).toContain("--motion-duration-fast: 140ms");
    expect(themeCss).toContain("--motion-duration-content: 220ms");
    expect(themeCss).toContain("--motion-duration-surface: 210ms");
    expect(themeCss).toContain("--motion-duration-page: 280ms");
    expect(themeCss).toContain("--motion-ease-standard:");
    expect(themeCss).toContain("--motion-ease-emphasized:");
    expect(themeCss).toContain("--motion-distance-surface:");
    expect(themeCss).toContain("--motion-distance-page:");
  });

  it("避免让整屏页面和大内容区参与合成动画", () => {
    const appTsx = readRendererFile("App.tsx");
    const globalCss = readRendererFile("styles/global.css");
    const baseMotionCss = globalCss.slice(0, globalCss.indexOf("@media (prefers-reduced-motion: reduce)"));
    const lobbyFrameCss = readRendererFile("pages/lobby/features/lobby-feature-frame.css");

    expect(appTsx).toContain('className="app-page-transition"');
    expect(appTsx).toContain("key={visiblePage}");
    const pageTransitionRule = baseMotionCss.match(/\.app-page-transition\s*\{[\s\S]*?\n}/)?.[0] ?? "";
    const contentSwapRule = baseMotionCss.match(/\.ling-motion-content-swap\s*\{[\s\S]*?\n}/)?.[0] ?? "";

    expect(pageTransitionRule).not.toContain("animation:");
    expect(pageTransitionRule).not.toContain("transform:");
    expect(contentSwapRule).not.toContain("animation:");
    expect(contentSwapRule).not.toContain("transform:");
    expect(globalCss).not.toContain("@keyframes app-page-enter");
    expect(globalCss).not.toContain("@keyframes ling-motion-content-swap-enter");
    expect(lobbyFrameCss).toContain("lobby-overlay-backdrop-enter");
    expect(lobbyFrameCss).toContain("opacity: 0");
    expect(lobbyFrameCss).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("小范围有限入场动画不长期强制保留合成层", () => {
    const globalCss = readRendererFile("styles/global.css");
    const lobbyFrameCss = readRendererFile("pages/lobby/features/lobby-feature-frame.css");
    const settingsCss = readRendererFile("features/settings/system/settings-system.css");
    const lobbyPanelRule = lobbyFrameCss.match(/\.lobby-overlay-panel\s*\{[^}]+}/)?.[0] ?? "";
    const settingsContentRule = settingsCss.match(/\.system-content-transition\s*\{[\s\S]*?\n}/)?.[0] ?? "";

    expect(lobbyPanelRule).toContain("lobby-overlay-panel-enter");
    expect(lobbyPanelRule).not.toContain("will-change");
    expect(settingsContentRule).not.toContain("animation:");
    expect(settingsContentRule).not.toContain("transform:");
    expect(settingsContentRule).not.toContain("will-change");
  });

  it("设置内容即时切换，小型确认框、popover 和记录菜单保留动效", () => {
    const settingsCss = readRendererFile("features/settings/system/settings-system.css");
    const recordsCss = readRendererFile("pages/lobby/features/sofa-records/consultation-records.css");

    expect(settingsCss).not.toContain("settings-content-enter");
    expect(settingsCss).toContain("settings-dialog-enter");
    expect(settingsCss).toContain("settings-popover-enter");
    expect(settingsCss).toContain("@media (prefers-reduced-motion: reduce)");
    expect(recordsCss).toContain("consultation-record-menu-enter");
    expect(recordsCss).toContain("consultation-record-reader-enter");
    expect(recordsCss).toContain("@media (prefers-reduced-motion: reduce)");
    expect(recordsCss).toContain(".consultation-record-reader-backdrop,");
  });

  it("保留等待室内容切换标记，便于集中约束大面积动效", () => {
    const resourceTable = readRendererFile("pages/lobby/features/resources/ResourceTableFeature.tsx");
    const resourceReader = readRendererFile("pages/lobby/features/resources/ResourceDocumentReaderLayout.tsx");
    const consent = readRendererFile("pages/lobby/features/consent/InformedConsentPage.tsx");
    const bookcase = readRendererFile("pages/lobby/features/bookcase/BookcaseFeature.tsx");
    const settings = readRendererFile("features/settings/system/SettingsSystemPage.tsx");
    const letters = readRendererFile("pages/lobby/features/sofa-letters/SofaLettersFeature.tsx");
    const records = readRendererFile("pages/lobby/features/sofa-records/ConsultationRecordsFeature.tsx");
    const garden = readRendererFile("pages/lobby/garden/OutdoorGarden.tsx");

    expect(resourceTable).toContain("ling-motion-content-swap");
    expect(resourceReader).toContain("ling-motion-content-swap");
    expect(consent).toContain("ling-motion-content-swap");
    expect(bookcase).toContain("ling-motion-content-swap");
    expect(settings).toContain("system-content-transition");
    expect(letters).toContain("ling-motion-content-swap");
    expect(records).toContain("ling-motion-content-swap");
    expect(garden).toContain("ling-motion-page-enter");
  });

  it("避免花园全屏图片和裁剪反光层触发 4K 合成缺口", () => {
    const gardenCss = readRendererFile("pages/lobby/garden/outdoor-garden.css");
    const gardenLayers = readRendererFile("pages/lobby/garden/GardenSceneLayers.tsx");
    const canopyRule = gardenCss.match(/\.garden-canopy \{[\s\S]*?\n}/)?.[0];

    expect(gardenCss).not.toContain("will-change: filter, transform");
    expect(canopyRule).toContain("will-change: transform");
    expect(canopyRule).not.toContain("height: 104%");
    expect(canopyRule).not.toContain("width: 104%");
    expect(gardenCss).not.toContain(".lobby-garden-practicing .garden-canopy");
    expect(gardenCss).not.toContain("@keyframes garden-canopy-single-breeze");
    expect(gardenCss).toContain("@keyframes garden-canopy-local-breeze");
    expect(gardenCss).not.toContain("mix-blend-mode");
    expect(gardenCss).not.toContain("contain: paint");
    expect(gardenCss).not.toContain("backface-visibility: hidden");
    expect(gardenLayers).toContain('className="garden-scene-background"');
    expect(gardenLayers).not.toContain("garden-lake-reflection");
    expect(gardenLayers).not.toContain("garden-rain-far");
    expect(gardenLayers).not.toContain("garden-rain-near");
    expect(gardenLayers).not.toContain("garden-mist");
  });
});
