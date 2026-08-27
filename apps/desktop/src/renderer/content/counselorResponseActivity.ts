export const counselorResponseActivityRotationMs = 3_000;

export const counselorResponseActivityPhrases = [
  "正在听你说",
  "正在整理刚才的话",
  "正在慢慢回应"
] as const;

export function buildCounselorResponseActivity(
  counselorName: string,
  rotationBucket: number,
  locale: SupportedLocale = "zh-CN"
) {
  const phrases = locale === "en-US"
    ? ["is listening", "is taking in what you said", "is forming a response"]
    : counselorResponseActivityPhrases;
  const index = Math.abs(rotationBucket) % phrases.length;
  return locale === "en-US"
    ? `${counselorName} ${phrases[index]}`
    : `${counselorName}${phrases[index]}`;
}
import type { SupportedLocale } from "@shared/index";
