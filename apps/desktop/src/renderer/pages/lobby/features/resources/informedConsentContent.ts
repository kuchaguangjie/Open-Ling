import type { SupportedLocale } from "@shared/index";
import informedConsentMarkdown from "../../../../../../../../docs/design/lobby-resource-table/content/informed-consent.md?raw";
import informedConsentEnglishMarkdown from "../../../../../../../../docs/design/lobby-resource-table/content/en-US/informed-consent.md?raw";

export type InformedConsentBlock =
  | { type: "paragraph"; text: string }
  | { type: "subheading"; text: string }
  | { type: "unordered-list"; items: string[] }
  | { type: "ordered-list"; items: string[] };

export interface InformedConsentModule {
  blocks: InformedConsentBlock[];
  id: string;
  number: string;
  title: string;
}

export interface InformedConsentDocument {
  introduction: InformedConsentBlock[];
  metadata: string[];
  modules: InformedConsentModule[];
  title: string;
  version: InformedConsentBlock[];
}

function cleanText(value: string) {
  return value.replace(/<br\s*\/?>/giu, "").replace(/`/gu, "").trim();
}

function parseBlocks(lines: string[]): InformedConsentBlock[] {
  const blocks: InformedConsentBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index]?.trim() ?? "";
    if (!line || line === "---") {
      index += 1;
      continue;
    }

    if (line.startsWith("### ")) {
      blocks.push({ type: "subheading", text: cleanText(line.slice(4)) });
      index += 1;
      continue;
    }

    if (line.startsWith("- ")) {
      const items: string[] = [];
      while ((lines[index]?.trim() ?? "").startsWith("- ")) {
        items.push(cleanText((lines[index]?.trim() ?? "").slice(2)));
        index += 1;
      }
      blocks.push({ type: "unordered-list", items });
      continue;
    }

    if (/^\d+\.\s/u.test(line)) {
      const items: string[] = [];
      while (/^\d+\.\s/u.test(lines[index]?.trim() ?? "")) {
        items.push(cleanText((lines[index]?.trim() ?? "").replace(/^\d+\.\s/u, "")));
        index += 1;
      }
      blocks.push({ type: "ordered-list", items });
      continue;
    }

    blocks.push({ type: "paragraph", text: cleanText(line) });
    index += 1;
  }

  return blocks;
}

export function parseInformedConsentMarkdown(
  markdown: string,
  locale: SupportedLocale = "zh-CN"
): InformedConsentDocument {
  const reviewHeading = locale === "en-US" ? /^# Drafting and review record\s*$/mu : /^# 编写与审阅记录\s*$/mu;
  const directoryHeading = locale === "en-US" ? "## Contents" : "## 目录";
  const versionHeading = locale === "en-US" ? "## Version information" : "## 版本信息";
  const fallbackTitle = locale === "en-US"
    ? "# Informed Consent for Ling AI Counseling"
    : "# Ling 知情同意";
  const visibleMarkdown = markdown.split(reviewHeading)[0] ?? markdown;
  const lines = visibleMarkdown.split(/\r?\n/u);
  const title = cleanText((lines.find((line) => line.startsWith("# ")) ?? fallbackTitle).slice(2));
  const directoryIndex = lines.findIndex((line) => line.trim() === directoryHeading);
  const versionIndex = lines.findIndex((line) => line.trim() === versionHeading);
  const introductionLines = lines
    .slice(1, directoryIndex >= 0 ? directoryIndex : lines.length)
    .filter((line) => !line.trim().startsWith(">"));
  const metadata = lines
    .slice(1, directoryIndex >= 0 ? directoryIndex : lines.length)
    .filter((line) => line.trim().startsWith(">"))
    .map((line) => cleanText(line.trim().replace(/^>\s?/u, "")))
    .filter(Boolean);
  const modules: InformedConsentModule[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index]?.trim().match(/^## (\d+)\.\s+(.+)$/u);
    if (!match) continue;

    const [, number, moduleTitle] = match;
    let end = index + 1;
    while (end < lines.length && !lines[end]?.trim().startsWith("## ")) end += 1;
    modules.push({
      blocks: parseBlocks(lines.slice(index + 1, end)),
      id: `consent-module-${number}`,
      number,
      title: cleanText(moduleTitle)
    });
    index = end - 1;
  }

  const versionEnd = versionIndex >= 0
    ? lines.findIndex((line, index) => index > versionIndex && line.trim() === "---")
    : -1;

  return {
    introduction: parseBlocks(introductionLines),
    metadata,
    modules,
    title,
    version: versionIndex >= 0
      ? parseBlocks(lines.slice(versionIndex + 1, versionEnd >= 0 ? versionEnd : lines.length))
      : []
  };
}

const informedConsentDocuments: Record<SupportedLocale, InformedConsentDocument> = {
  "zh-CN": parseInformedConsentMarkdown(informedConsentMarkdown, "zh-CN"),
  "en-US": parseInformedConsentMarkdown(informedConsentEnglishMarkdown, "en-US")
};

export function getInformedConsentDocument(locale: SupportedLocale) {
  return informedConsentDocuments[locale];
}
