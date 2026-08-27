import type { Counselor } from "../types/counselor.js";
import {
  COUNSELOR_PACKAGE_SCHEMA_VERSION,
  type CounselorPackageLocaleContent,
  type CounselorPackageManifest
} from "../types/counselorPackage.js";
import type { SupportedLocale } from "../types/settings.js";
import {
  CounselorPackageRegistry,
  createCounselorPackageRegistration
} from "./counselorPackageRegistry.js";
export { validateCounselorPackageManifest } from "./counselorPackageValidation.js";

const publisher = {
  name: "上海啸群教育科技有限公司",
  website: "https://xiaoqunpsy.cn"
};

const sharedPackageFields = {
  schemaVersion: COUNSELOR_PACKAGE_SCHEMA_VERSION,
  engineCompatibility: ">=1.0.0 <2.0.0",
  publisher,
  license: {
    prompts: "CC-BY-4.0",
    assets: "LicenseRef-Ling-Official-Assets"
  },
  safety: {
    minimumPolicyVersion: "1",
    additionalPolicies: []
  }
};

export const builtinCounselorPackages: readonly CounselorPackageManifest[] = [
  {
    ...sharedPackageFields,
    id: "chengling",
    version: "1.0.0",
    approach: "emotion-dynamic",
    localizations: {
      "zh-CN": locale(
        "程灵",
        "人本—心理动力取向心理咨询师",
        "以人本主义为关系底色，重视情绪聚焦、关系模式与内在冲突的理解。",
        ["情绪聚焦", "关系模式", "内在冲突探索"],
        "程灵",
        [
          "我们今天的咨询就先到这里。谢谢你愿意和我谈这些。",
          "今天我们就先谈到这里。刚才说过的这些，我都认真听到了。",
          "今天的咨询先到这里。谢谢你愿意把这些感受告诉我。",
          "我们今天先到这里。谢谢你愿意让我了解这些。"
        ]
      ),
      "en-US": locale(
        "Cheng Ling",
        "Person-Centered & Psychodynamic AI Counselor",
        "Grounded in a person-centered relationship, with attention to emotion, relational patterns, and inner conflict.",
        ["Emotional experience", "Relational patterns", "Inner conflict"],
        "Cheng Ling",
        [
          "We'll stop here for today. Thank you for being willing to talk with me about this.",
          "Let's leave our conversation here for today. I have listened carefully to what you shared.",
          "We'll bring today's session to a close here. Thank you for trusting me with these feelings.",
          "We'll stop here for today. Thank you for letting me understand more of what this has been like."
        ]
      )
    },
    prompts: promptResources("chengling"),
    visuals: visualResources("chengling")
  },
  {
    ...sharedPackageFields,
    id: "zhouzhou",
    version: "1.0.0",
    approach: "reality-structure",
    localizations: {
      "zh-CN": locale(
        "周舟",
        "焦点解决取向心理咨询师",
        "关注期待的改变、已有资源与例外经验，并一起寻找具体、适度、可行的下一步。",
        ["期待的改变", "已有资源", "可行的下一步"],
        "周舟",
        [
          "我们今天的咨询就先到这里。谢谢你愿意把你的想法告诉我。",
          "今天我们就先谈到这里。谢谢你愿意和我谈谈正在面对的事情。",
          "今天的咨询先到这里。谢谢你愿意把事情和想法说给我听。",
          "我们今天先到这里。谢谢你愿意和我一起看看这些问题。"
        ]
      ),
      "en-US": locale(
        "Zhou Zhou",
        "Solution-Focused AI Counselor",
        "Attends to practical structure, cognitive clarity, behavioral support, and feasible next steps.",
        ["Problem structure", "Practical action", "Clarifying boundaries"],
        "Zhou Zhou",
        [
          "We'll stop here for today. Thank you for sharing your thoughts with me.",
          "Let's leave our conversation here for today. Thank you for talking with me about what you're facing.",
          "We'll bring today's session to a close here. Thank you for putting the situation and your thoughts into words.",
          "We'll stop here for today. Thank you for looking at these questions with me."
        ]
      )
    },
    prompts: promptResources("zhouzhou"),
    visuals: visualResources("zhouzhou")
  },
  {
    ...sharedPackageFields,
    id: "linleshui",
    version: "1.0.0",
    approach: "eastern-contemplative",
    localizations: {
      "zh-CN": locale(
        "林乐水",
        "中国传统心性哲学取向心理咨询师",
        "关注人在痛苦、迷茫与人生变化中的身心、处境与价值方向。",
        ["身心觉察", "现实处境", "价值方向"],
        "林乐水",
        [
          "我们今天的咨询就先到这里。谢谢你愿意和我说这些。",
          "今天我们就先谈到这里。谢谢你愿意把这些话说给我听。",
          "今天的咨询先到这里。谢谢你愿意和我聊到这些。",
          "我们今天先到这里。谢谢你愿意让我听你说这些。"
        ]
      ),
      "en-US": locale(
        "Lin Leshui",
        "Chinese Philosophy of Mind-and-Heart–Informed AI Counselor",
        "Explores how fear, attachment, judgment, and relational expectations shape experience, helping the person return to a clearer position.",
        ["Awareness of influence", "Mind–body settling", "Clarifying proportion"],
        "Lin Leshui",
        [
          "We'll stop here for today. Thank you for being willing to tell me about this.",
          "Let's leave our conversation here for today. Thank you for putting these thoughts into words with me.",
          "We'll bring today's session to a close here. Thank you for letting our conversation reach these places.",
          "We'll stop here for today. Thank you for letting me listen."
        ]
      )
    },
    prompts: promptResources("linleshui"),
    visuals: visualResources("linleshui")
  }
];

export const counselorPackageRegistry = new CounselorPackageRegistry(
  builtinCounselorPackages.map((manifest) =>
    createCounselorPackageRegistration(manifest, { kind: "builtin" })
  )
);

export function getCounselorPackage(counselorId: string) {
  return counselorPackageRegistry.get(counselorId)?.manifest;
}

export function requireCounselorPackage(counselorId: string) {
  return counselorPackageRegistry.require(counselorId).manifest;
}

export function getBuiltinCounselorPackage(counselorId: string) {
  const registration = counselorPackageRegistry.get(counselorId);
  return registration?.source.kind === "builtin" ? registration.manifest : undefined;
}

export function requireBuiltinCounselorPackage(counselorId: string) {
  const manifest = getBuiltinCounselorPackage(counselorId);
  if (!manifest) throw new Error(`Unknown counselor package: ${counselorId}`);
  return manifest;
}

export function getCounselorPackageLocaleContent(
  counselorId: string,
  localeId: SupportedLocale
) {
  return getCounselorPackage(counselorId)?.localizations[localeId];
}

export function toCounselor(manifest: CounselorPackageManifest, localeId: SupportedLocale): Counselor {
  const content = manifest.localizations[localeId];
  return {
    id: manifest.id,
    name: content.name,
    approach: manifest.approach,
    title: content.title,
    description: content.description,
    strengths: [...content.strengths]
  };
}

function locale(
  name: string,
  title: string,
  description: string,
  strengths: string[],
  openingName: string,
  closings: string[]
): CounselorPackageLocaleContent {
  const isEnglish = /^[A-Z]/u.test(name);
  return {
    name,
    title,
    description,
    strengths,
    opening: isEnglish ? {
      first: [`Hello, I'm ${openingName}. Welcome to my counseling room.`, "Come in and take any seat that feels comfortable. We can begin when you're settled."],
      second: ["Hello again. It's good to see you back.", "Come in and take any seat that feels comfortable. We can begin when you're settled."],
      returning: ["Hello, it's good to see you again.", "Come in and take any seat that feels comfortable. We can begin when you're settled."]
    } : {
      first: [`你好，我是${openingName}。第一次见面，欢迎你来到我的咨询室。`, "请进，请随意坐。等你安顿好，我们再开始。"],
      second: ["你好，又见面了。欢迎你再来。", "请进，请随意坐。等你安顿好，我们再开始。"],
      returning: ["你好，我们又见面了。", "请进，请随意坐。等你安顿好，我们再开始。"]
    },
    closings
  };
}

function promptResources(counselorId: string) {
  return {
    counselorCore: {
      "zh-CN": `builtin://prompts/counselor-cores/${counselorId}.md`,
      "en-US": `builtin://prompts/en-US/counselor-cores/${counselorId}.md`
    },
    counselingDialogue: {
      "zh-CN": `builtin://prompts/tasks/counseling-dialogue-${counselorId}.md`,
      "en-US": `builtin://prompts/en-US/tasks/counseling-dialogue-${counselorId}.md`
    },
    counselorVoice: {
      "zh-CN": `builtin://prompts/counselor-voices/${counselorId}.md`
    }
  };
}

function visualResources(counselorId: string) {
  return {
    avatar: `builtin://${counselorId}/avatar`,
    portrait: `builtin://${counselorId}/portrait`,
    room: `builtin://${counselorId}/room`,
    openingSequence: `builtin://${counselorId}/opening-sequence`,
    closingSequence: `builtin://${counselorId}/closing-sequence`
  };
}
