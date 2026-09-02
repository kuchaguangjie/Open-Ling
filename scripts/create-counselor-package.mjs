#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [targetArgument, packageId = "community-listener"] = process.argv.slice(2);

if (!targetArgument) {
  fail("Usage: npm run counselor:create -- <target-directory> [package-id]");
}
if (!/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/u.test(packageId)) {
  fail("Package id must use lowercase letters, digits, dots, underscores, or hyphens.");
}

const targetDirectory = resolve(targetArgument);
try {
  mkdirSync(targetDirectory);
} catch (error) {
  if (typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST") {
    fail(`Target already exists; no files were overwritten: ${targetDirectory}`);
  }
  throw error;
}

const manifest = {
  schemaVersion: 1,
  id: packageId,
  version: "0.1.0",
  engineCompatibility: ">=1.0.0 <2.0.0",
  publisher: { name: "Replace with your name or organization" },
  license: { prompts: "CC0-1.0", assets: "CC0-1.0" },
  approach: "integrative",
  localizations: {
    "zh-CN": {
      name: "社区倾听者",
      title: "社区示例 AI 咨询师",
      description: "一个用于学习 Ling 咨询师包结构的中立示例。",
      strengths: ["倾听", "澄清", "节奏协商"],
      opening: {
        first: ["你好，我是社区倾听者。", "我们可以从你此刻最想说的地方开始。"],
        second: ["你好，很高兴再见到你。", "今天你想从哪里开始？"],
        returning: ["你好，我们又见面了。", "今天我们可以按你的节奏来。"]
      },
      closings: ["我们今天先到这里，谢谢你愿意说这些。"]
    },
    "en-US": {
      name: "Community Listener",
      title: "Community Example AI Counselor",
      description: "A neutral example for learning the Ling counselor package structure.",
      strengths: ["Listening", "Clarification", "Pace negotiation"],
      opening: {
        first: ["Hello, I'm the Community Listener.", "We can begin with whatever feels most important right now."],
        second: ["Hello, it's good to see you again.", "Where would you like to begin today?"],
        returning: ["Hello, welcome back.", "We can move at your pace today."]
      },
      closings: ["We'll stop here for today. Thank you for being willing to share this with me."]
    }
  },
  prompts: {
    counselorCore: {
      "zh-CN": "package://prompts/core-zh.md",
      "en-US": "package://prompts/core-en.md"
    },
    counselingDialogue: {
      "zh-CN": "package://prompts/dialogue-zh.md",
      "en-US": "package://prompts/dialogue-en.md"
    },
    counselorVoice: {
      "zh-CN": "package://prompts/voice-zh.md",
      "en-US": "package://prompts/voice-en.md"
    }
  },
  safety: {
    minimumPolicyVersion: "1",
    additionalPolicies: []
  },
  visuals: {
    avatar: "package://assets/avatar.png",
    portrait: "package://assets/portrait.png",
    room: "package://assets/room.png"
  }
};

writeText("manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
writeText("prompts/core-zh.md", "# 社区倾听者核心设定\n\n你是一位谨慎、尊重来访者自主性的 AI 倾听者。\n");
writeText("prompts/core-en.md", "# Community Listener Core\n\nYou are a careful AI listener who respects the client's autonomy.\n");
writeText("prompts/dialogue-zh.md", "# 当前场景｜实时会谈\n\n优先理解当前表达，不要急于下结论或提供方案。\n");
writeText("prompts/dialogue-en.md", "# Current Scene | Live Conversation\n\nPrioritize the current expression; do not rush to conclusions or solutions.\n");
writeText("prompts/voice-zh.md", "# 语言与表达风格\n\n请在这里定义口吻、句式、节奏与需要避免的表达；不要重复理论核心或安全规则。\n");
writeText("prompts/voice-en.md", "# Language and Voice\n\nDefine tone, sentence style, pacing, and expressions to avoid here; do not repeat the theoretical core or safety rules.\n");
writeText("README.md", `# ${packageId}\n\nThis is a Ling professional counselor package development template. The included prompts and images are placeholders, not release-ready professional counseling content.\n\nBefore distribution:\n\n- have qualified professionals design and review the counselor prompts;\n- test long, multi-session, and high-risk conversations;\n- declare prompt and asset rights accurately;\n- remove prompt candidates, evaluations, test transcripts, and user feedback;\n- import the package into Ling and verify the full post-session workflow.\n\nSee \`docs/professional-counselor-extension-spec.md\` in the Ling repository.\n`);

const placeholderPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);
for (const filename of ["avatar.png", "portrait.png", "room.png"]) {
  writeBinary(`assets/${filename}`, placeholderPng);
}

process.stdout.write(`Created Ling counselor package: ${targetDirectory}\n`);
process.stdout.write("Replace the placeholder PNG files, review all prompts, and keep manifest.json in sync.\n");

function writeText(relativePath, content) {
  const filePath = resolve(targetDirectory, relativePath);
  mkdirSync(resolve(filePath, ".."), { recursive: true });
  writeFileSync(filePath, content, "utf8");
}

function writeBinary(relativePath, content) {
  const filePath = resolve(targetDirectory, relativePath);
  mkdirSync(resolve(filePath, ".."), { recursive: true });
  writeFileSync(filePath, content);
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
