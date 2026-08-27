export type SafetyLane = "none" | "unclear" | "imminent";

const IMMINENT_PATTERNS = [
  /杀掉自己/,
  /结束自己的生命/,
  /已经(吃|吞|服)了.{0,12}(药|片|农药)/,
  /割腕/,
  /准备跳楼/,
  /马上.*(死|跳|割|烧炭)/,
  /我(要|想要|准备|打算)自杀/,
  /\bkill myself\b/i,
  /\bsuicide (plan|tonight|now)\b/i,
  /\bgoing to (kill|end) myself\b/i
];

const UNCLEAR_PATTERNS = [
  /不想活/,
  /活着没意思/,
  /想死(?!人)/,
  /想自杀/,
  /自残/,
  /伤害自己/,
  /结束这一切/,
  /\bhurt myself\b/i,
  /\bdon't want to (live|be alive)\b/i,
  /\bwish i (were|was) dead\b/i
];

const FICTION_OR_THIRD_PARTY = [
  /电影/,
  /小说/,
  /剧情/,
  /角色/,
  /别人/,
  /他自杀了/,
  /她去世/,
  /\b(movie|novel|character|plot)\b/i
];

export function classifySafetyLane(text: string): SafetyLane {
  const content = text.trim();
  if (!content) return "none";
  const imminent = IMMINENT_PATTERNS.some((pattern) => pattern.test(content));
  const fictional = FICTION_OR_THIRD_PARTY.some((pattern) => pattern.test(content));
  if (fictional && !imminent) return "none";
  if (imminent) return "imminent";
  if (UNCLEAR_PATTERNS.some((pattern) => pattern.test(content))) return "unclear";
  return "none";
}

/**
 * Safety policy is always in the request. Lane only ADDS a crisis emphasis
 * slice; it never removes the full policy. A regex miss must not create a window.
 */
export function shouldInjectRealtimeSafety(_lane: SafetyLane) {
  return true;
}
