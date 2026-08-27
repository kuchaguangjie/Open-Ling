import {
  builtinCounselorPackages,
  getCounselorPackageLocaleContent,
  type ModelConnectionKind,
  type SupportedLocale
} from "@shared/index";
import type { ConsultationOpeningScript } from "./consultationFlowMachine";

export interface CounselorFlowCopy {
  opening: {
    first: string[];
    second: string[];
    returning: string[];
  };
  closings: string[];
}

const zhFallbackCopy: CounselorFlowCopy = {
  opening: {
    first: ["你好。你可以按自己的节奏，从此刻最想谈的地方开始。"],
    second: ["你好，又见面了。欢迎你再来。"],
    returning: ["欢迎回来。我们从今天最想谈的地方开始。"]
  },
  closings: ["今天的咨询先到这里。谢谢你愿意和我谈这些。"]
};

const enFallbackCopy: CounselorFlowCopy = {
  opening: {
    first: ["Hello. Begin wherever feels most important right now, at your own pace."],
    second: ["Hello again. It's good to see you back."],
    returning: ["Welcome back. We can begin with what feels most important today."]
  },
  closings: ["We'll stop here for today. Thank you for talking with me."]
};

/** Backward-compatible Chinese view generated from the package registry. */
export const counselorFlowContent: Record<string, CounselorFlowCopy> = Object.fromEntries(
  builtinCounselorPackages.map((manifest) => {
    const content = manifest.localizations["zh-CN"];
    return [manifest.id, { opening: content.opening, closings: content.closings }];
  })
);

export function getCounselorFlowCopy(counselorId: string, locale: SupportedLocale = "zh-CN") {
  const packageContent = getCounselorPackageLocaleContent(counselorId, locale);
  if (packageContent) {
    return {
      opening: packageContent.opening,
      closings: packageContent.closings
    };
  }
  return locale === "en-US" ? enFallbackCopy : zhFallbackCopy;
}

/** Keeps the staged counselling dialogue to one complete thought per card. */
export function splitDialogueSentences(lines: string[]) {
  return lines.flatMap((line) =>
    line.match(/[^。！？.!?]+[。！？.!?]?/gu)?.map((sentence) => sentence.trim()).filter(Boolean) ?? []
  );
}

/**
 * 每次会谈开始前的隐私说明。
 * 放在开场对白的最后一句（组），让来访者在点击“开始咨询”前再次确认资料边界。
 */
export function getOpeningPrivacyAssurance(
  script: ConsultationOpeningScript,
  connectionKind: ModelConnectionKind,
  locale: SupportedLocale = "zh-CN"
) {
  if (script !== "first") {
    if (locale === "en-US") {
      if (connectionKind === "local") {
        return "Before we begin, one quick reminder: in the official version of Ling, your conversation record stays on this device and is not transmitted through Ling-operated servers.";
      }
      return "Before we begin, one quick reminder: in the official version of Ling, your conversation record is stored on this device and is not transmitted through Ling-operated servers; needed content is sent to the model provider you connected to generate responses.";
    }
    if (connectionKind === "local") {
      return "开始前，也再提醒你一句：在 Ling 官方版本中，你的对话记录只保存在这台设备上，不会通过 Ling 自有服务器传输。";
    }
    return "开始前，也再提醒你一句：在 Ling 官方版本中，你的对话记录保存在这台设备上，不会通过 Ling 自有服务器传输；为了生成回应，必要内容会发送给你接入的模型服务商。";
  }

  if (locale === "en-US") {
    const leadIn = "Before we begin, I want to be clear: ";
    const storedLocally = "In the official version of Ling, your conversation record is stored on this device and is not transmitted through Ling-operated servers.";
    if (connectionKind === "local") {
      return `${leadIn}${storedLocally} You are using a local model, so the content used to respond to you stays on this device.`;
    }
    return `${leadIn}${storedLocally} To respond to you, needed content is sent to the model provider you connected so it can complete this response; the provider handles it according to its own privacy policy, which you can review at any time.`;
  }

  const leadIn = "开始前，我想先和你说清楚：";
  const storedLocally = "在 Ling 官方版本中，你在这里的对话记录会保存在这台设备上，不会通过 Ling 自有服务器传输。";
  if (connectionKind === "local") {
    return `${leadIn}${storedLocally}你当前使用本机模型，用于回应你的内容不会离开这台设备。`;
  }
  return `${leadIn}${storedLocally}但为了让模型回应你，必要的内容会发送给你当前接入的模型服务商，用于完成这次回应；对方会按照自己的隐私政策处理，你也可以随时查看。`;
}

export function getLetterNotice(
  reason: "letter-pending" | "letter-failed" | "letter-unknown",
  locale: SupportedLocale = "zh-CN"
) {
  if (locale === "en-US") {
    if (reason === "letter-pending") return "The letter is still being written. You can return to the waiting room and check “Letters from your counselors” in the bottom bar later.";
    if (reason === "letter-failed") return "The letter could not be completed just now. You can return to the waiting room and try “Letters from your counselors” in the bottom bar later.";
    return "I can't confirm the letter's status right now. Please try “Letters from your counselors” in the bottom bar later.";
  }
  if (reason === "letter-pending") return "信还在写。你可以先回等待室，稍后在底栏的「咨询师的信」里看看。";
  if (reason === "letter-failed") return "这封信暂时还没有写好。你可以先回等待室，稍后在底栏的「咨询师的信」里再来看看。";
  return "我暂时还不能确认这封信的状态。你可以稍后在底栏的「咨询师的信」里再试一次。";
}
