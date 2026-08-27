export type ResourceDocumentId = "help" | "safety" | "consent";

export interface ResourceDocumentSection {
  heading: string;
  paragraphs: string[];
  tone?: "default" | "important";
}

export interface ResourceDocument {
  id: ResourceDocumentId;
  title: string;
  summary: string;
  sections: ResourceDocumentSection[];
}

const zhResourceDocuments: ResourceDocument[] = [
  {
    id: "help",
    title: "使用帮助",
    summary: "开始、继续、离开与结束咨询",
    sections: []
  },
  {
    id: "safety",
    title: "心理危机与安全支持",
    summary: "先确保当下安全，再联系现实中的人和服务",
    sections: []
  },
  {
    id: "consent",
    title: "知情同意书",
    summary: "完整了解 AI 心理咨询、资料处理与自己的选择",
    sections: []
  }
];

const enResourceDocuments: ResourceDocument[] = [
  {
    id: "help",
    title: "Using Ling",
    summary: "Starting, continuing, leaving, and ending counseling",
    sections: []
  },
  {
    id: "safety",
    title: "Crisis & Safety Support",
    summary: "Attend to immediate safety, then connect with people and services",
    sections: []
  },
  {
    id: "consent",
    title: "Informed Consent",
    summary: "Understand AI counseling, data handling, and your choices",
    sections: []
  }
];

export function getResourceDocuments(locale: SupportedLocale) {
  return locale === "en-US" ? enResourceDocuments : zhResourceDocuments;
}
import type { SupportedLocale } from "@shared/index";
