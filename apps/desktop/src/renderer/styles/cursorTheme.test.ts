import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const cursorCss = readFileSync("apps/desktop/src/renderer/styles/cursor.css", "utf8");
const rendererEntry = readFileSync("apps/desktop/src/renderer/main.tsx", "utf8");
const creamTextCursor = readFileSync("apps/desktop/src/renderer/styles/cursors/ling-q-arrow-text.svg", "utf8");
const settingsCss = readFileSync("apps/desktop/src/renderer/features/settings/system/settings-system.css", "utf8");
const cursorDirectory = "apps/desktop/src/renderer/styles/cursors";
const cursorThemeSuffixes = ["", "-b", "-c", "-d", "-e"];
const cursorStateFiles = ["arrow{theme}-default", "hand{theme}-action", "hand{theme}-pressed", "arrow{theme}-text"];

function cursorGeometrySignature(fileName: string) {
  return readFileSync(`${cursorDirectory}/${fileName}`, "utf8")
    .replace(/(fill|stroke)="#[0-9A-Fa-f]+"/g, '$1="#COLOR"');
}

describe("Q-style arrow cursor theme", () => {
  it("loads the packaged pointer states from the renderer entry", () => {
    expect(rendererEntry).toContain('import "./styles/cursor.css"');
    expect(rendererEntry).not.toContain("mountLingDefaultCursor");
    expect(cursorCss).toContain('--ling-cursor-default-image: url("./cursors/ling-q-arrow-default.png")');
    expect(cursorCss).toContain('url("./cursors/ling-q-arrow-default.png") 3 3');
    expect(cursorCss).toContain('url("./cursors/ling-q-hand-action.png") 12 3');
    expect(cursorCss).toContain('url("./cursors/ling-q-hand-pressed.png") 12 4');
    for (const theme of ["b", "c", "d", "e"]) {
      expect(cursorCss).toContain(`:root[data-ling-cursor-theme="${theme}"]`);
      expect(cursorCss).toContain(`url("./cursors/ling-q-hand-${theme}-action.png") 12 3`);
      expect(cursorCss).toContain(`url("./cursors/ling-q-arrow-${theme}-text.png") 16 16`);
    }
  });

  it("keeps semantic cursor feedback for editing and unavailable controls", () => {
    expect(cursorCss).toContain("body *");
    expect(cursorCss).toContain("cursor: inherit !important");
    expect(cursorCss).toContain("cursor: var(--ling-cursor-default) !important");
    expect(cursorCss.match(/body :is\(/g)).toHaveLength(6);
    expect(cursorCss).not.toContain("body :where(");
    expect(cursorCss).toContain('input[type="text"]');
    expect(cursorCss).toContain('url("./cursors/ling-q-arrow-text.png") 16 16');
    expect(cursorCss).toContain("cursor: var(--ling-cursor-text) !important");
    expect(cursorCss).toContain(":disabled");
    expect(cursorCss).not.toContain("cursor: not-allowed !important");
    expect(cursorCss).toContain('[aria-busy="true"]');
    expect(cursorCss).not.toContain("cursor: wait !important");
    expect(cursorCss).not.toContain("cursor: none !important");
    expect(cursorCss).not.toContain("body:active");
    expect(cursorCss).not.toContain(".ling-default-cursor");
    expect(rendererEntry).not.toContain("pointermove");
  });

  it("keeps the dark I-beam caps with a theme-colored center", () => {
    expect(creamTextCursor).toContain('stroke="#513D30"');
    expect(creamTextCursor).toContain('stroke="#F6D99F"');
  });

  it("uses identical geometry for every color of each cursor state", () => {
    for (const fileName of cursorStateFiles) {
      const signatures = cursorThemeSuffixes.map((theme) =>
        cursorGeometrySignature(`ling-q-${fileName.replace("{theme}", theme)}.svg`),
      );
      expect(new Set(signatures).size).toBe(1);
    }
  });

  it("ships PNG cursor fallbacks compatible with the desktop Chromium runtime", () => {
    for (const fileName of cursorStateFiles) {
      for (const theme of cursorThemeSuffixes) {
        const png = readFileSync(`${cursorDirectory}/ling-q-${fileName.replace("{theme}", theme)}.png`);
        expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
      }
    }
  });

  it("contains cursor option text at compact window heights", () => {
    expect(settingsCss).toMatch(/min-width:\s*0;\s*overflow:\s*hidden;/);
    expect(settingsCss).toContain("text-overflow: ellipsis;");
    expect(settingsCss).toContain("grid-template-columns: minmax(0, 1fr);");
    expect(settingsCss).not.toContain("grid-template-columns: auto 1fr;");
  });

  it("keeps nested button content on the parent cursor state", () => {
    const style = document.createElement("style");
    style.textContent = cursorCss;
    const fixture = document.createElement("div");
    fixture.innerHTML = `
      <button type="button"><span>设置</span></button>
      <div><span>普通文字</span></div>
      <input type="text" />
    `;
    document.head.append(style);
    document.body.append(fixture);

    try {
      expect(getComputedStyle(fixture.querySelector("button")!).cursor).toContain("var(--ling-cursor-action)");
      expect(getComputedStyle(fixture.querySelector("button span")!).cursor).toBe("inherit");
      expect(getComputedStyle(fixture.querySelector("div span")!).cursor).toBe("inherit");
      expect(getComputedStyle(fixture.querySelector("input")!).cursor).toContain("var(--ling-cursor-text)");
    } finally {
      style.remove();
      fixture.remove();
    }
  });
});
