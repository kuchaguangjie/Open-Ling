import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const runtimeRoot = resolve(process.cwd(), "assets/runtime");

function readPng(path: string) {
  const bytes = readFileSync(resolve(runtimeRoot, path));
  return {
    colorType: bytes.readUInt8(25),
    decodedBytes: bytes.readUInt32BE(16) * bytes.readUInt32BE(20) * 4,
    height: bytes.readUInt32BE(20),
    width: bytes.readUInt32BE(16)
  };
}

const zhouzhouRuntimePortraits = [
  "counselor-portrait-motion/zhouzhou/user-selected-v2/zhouzhou-session-default-runtime-1280w-v1.png",
  "counselor-portrait-motion/zhouzhou/user-selected-v4/zhouzhou-session-listening-runtime-1280w-v1.png",
  "counselor-portrait-motion/zhouzhou/user-selected-v2/zhouzhou-session-responding-runtime-1280w-v1.png"
];

const runtimeAvatars = [
  "counselor-dialogue-avatars/chengling/chengling-dialogue-avatar-runtime-256-v1.png",
  "counselor-dialogue-avatars/zhouzhou/user-selected/zhouzhou-dialogue-avatar-runtime-256-v1.png",
  "counselor-dialogue-avatars/linleshui/user-selected/linleshui-dialogue-avatar-runtime-256-v1.png"
];

const runtimeQuickNavIcons = [
  "lobby/quick-nav/quick-nav-appointment-runtime-256w-v1.png",
  "lobby/quick-nav/quick-nav-letters-runtime-256w-v1.png",
  "lobby/quick-nav/quick-nav-settings-runtime-256w-v1.png"
];

describe("运行时图片像素预算", () => {
  it("周舟会谈立绘覆盖 2x 显示密度，且三态解码峰值低于 32 MiB", () => {
    const images = zhouzhouRuntimePortraits.map(readPng);

    expect(images.every((image) => image.width === 1_280 && image.height === 1_920)).toBe(true);
    expect(images.every((image) => image.colorType === 6)).toBe(true);
    expect(images.reduce((sum, image) => sum + image.decodedBytes, 0)).toBeLessThan(32 * 1024 * 1024);
  });

  it("对话头像和快捷入口不解码远超实际显示尺寸的母版", () => {
    const avatars = runtimeAvatars.map(readPng);
    const quickNavIcons = runtimeQuickNavIcons.map(readPng);

    expect(avatars.every((image) => image.width === 256 && image.height === 256 && image.colorType === 6)).toBe(true);
    expect(quickNavIcons.every((image) => Math.max(image.width, image.height) === 256 && image.colorType === 6)).toBe(true);
    expect([...avatars, ...quickNavIcons].reduce((sum, image) => sum + image.decodedBytes, 0)).toBeLessThan(2 * 1024 * 1024);
  });
});
