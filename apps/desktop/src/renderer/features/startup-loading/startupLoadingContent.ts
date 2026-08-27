export type StartupLoadingPhase =
  | "opening"
  | "reading-sessions"
  | "ready";

export const STARTUP_PHASE_LABELS: Record<StartupLoadingPhase, string> = {
  opening: "正在打开 Ling……",
  "reading-sessions": "正在载入会谈记录……",
  ready: "工作室准备好了。"
};

export const STARTUP_ATMOSPHERE_LINES = [
  "程灵正沿着湖边慢慢走",
  "周舟把刚读完的书放回书架",
  "林乐水正在整理今天的咨询备忘录",
  "今天值班的咨询师正在整理前台",
  "工作室的灯已经亮起来了"
] as const;

export const STARTUP_FEATURE_HINTS = [
  "今天值班的咨询师在前台，可以介绍工作室，也可以协助预约咨询",
  "书架里的虚构故事，由三位咨询师从各自关注的心理视角创作",
  "墙上的相册里，留着三位咨询师在工作室的一张合照",
  "窗外的湖畔花园可以切换晴雨，也可以安静地停留一会儿",
  "资料桌里有使用帮助、危机支持和完整知情说明",
  "正式结束一场咨询后，生成完成的来信会收在等待室底栏的「咨询师的信」",
  "点开三位咨询师的介绍，可以了解她们如何理解咨询、如何与你工作",
  "设置里可以管理模型接入、咨询连续性、数据与隐私",
  "会谈、来信和设置默认保存在你的本地"
] as const;

const EN_STARTUP_PHASE_LABELS: Record<StartupLoadingPhase, string> = {
  opening: "Opening Ling…",
  "reading-sessions": "Loading session history…",
  ready: "The studio is ready."
};

const EN_STARTUP_ATMOSPHERE_LINES = [
  "Cheng Ling is walking slowly by the lake",
  "Zhou Zhou is returning a book to the shelf",
  "Lin Leshui is organizing today's counseling notes",
  "Today's counselor on duty is arranging the reception desk",
  "The studio lights are on"
] as const;

const EN_STARTUP_FEATURE_HINTS = [
  "The counselor on duty can introduce the studio or help you book a session",
  "The fictional stories on the bookcase reflect the perspectives of the three counselors",
  "The wall album holds a photo of the three counselors together at the studio",
  "You can change the lakeside garden between sun and rain, or stay there quietly for a while",
  "The Resources Desk contains guidance, crisis support, and the full informed-consent document",
  "After a session formally ends, its completed letter appears under “Letters from your counselors”",
  "Open a counselor introduction to learn how each counselor understands and approaches counseling",
  "Settings includes model connection, continuity between sessions, language, data, and privacy",
  "Sessions, letters, and settings are stored on this device by default"
] as const;

export function getStartupLoadingContent(locale: SupportedLocale) {
  return locale === "en-US"
    ? {
        atmosphereLines: EN_STARTUP_ATMOSPHERE_LINES,
        featureHints: EN_STARTUP_FEATURE_HINTS,
        phaseLabels: EN_STARTUP_PHASE_LABELS
      }
    : {
        atmosphereLines: STARTUP_ATMOSPHERE_LINES,
        featureHints: STARTUP_FEATURE_HINTS,
        phaseLabels: STARTUP_PHASE_LABELS
      };
}
import type { SupportedLocale } from "@shared/index";
