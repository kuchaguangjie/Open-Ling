import chenglingScene from "../../../../../../../../assets/runtime/q-style-counselor-art-v1/introductions/chengling-inner-awareness-v1.png";
import linleshuiScene from "../../../../../../../../assets/runtime/lobby/counselor-introductions/linleshui-introduction-room-corner-v4-bright.png";
import zhouzhouScene from "../../../../../../../../assets/runtime/lobby/counselor-introductions/zhouzhou-introduction-room-corner-v4.png";
import {
  getCounselorDialogueAvatar,
  getCounselorVisualAssets
} from "../../../../components/counselor/counselorPortraitAssets";
import {
  builtinCounselorPackages,
  counselorPackageRegistry,
  type SupportedLocale
} from "@shared/index";

export interface CounselorIntroductionProfile {
  avatar: string;
  consultationView: string;
  id: string;
  mirrorLabel: string;
  workingStyle: string;
  workingStyleFollowUp?: string;
  name: string;
  portrait: string;
  summary: string;
  title: string;
  topics: string[];
}

const zhCounselorIntroductionProfiles: CounselorIntroductionProfile[] = [
  {
    avatar: getCounselorDialogueAvatar("chengling"),
    id: "chengling",
    mirrorLabel: "关系与内在经验之镜",
    name: "程灵",
    title: "人本—心理动力取向心理咨询师",
    summary: "程灵重视真实、在场的交流，也尊重来访者理解和表达自己的节奏。",
    consultationView: "对她而言，咨询不是急着解释、修复或推动改变，而是先为来访者的情绪和尚待澄清的内在经验，留出被理解、被命名和继续探索的空间。",
    topics: ["亲密关系", "内在冲突", "自我探索", "个人成长"],
    workingStyle: "她从来访者当下的感受与现实处境出发，关注内在需求、关系中的互动，以及那些反复让人受困的内在冲突。",
    workingStyleFollowUp: "她不会急于下结论，而会把自己的理解作为一种可修正的可能，与来访者一起辨认它是否贴近来访者的经验。",
    portrait: chenglingScene
  },
  {
    avatar: getCounselorDialogueAvatar("zhouzhou"),
    id: "zhouzhou",
    mirrorLabel: "矛盾与选择之镜",
    name: "周舟",
    title: "焦点解决取向心理咨询师",
    summary: "周舟关注来访者当下最希望改变的困扰。她会和来访者一起看见已经有效的部分、可用的资源和能够尝试的下一步，让问题逐渐变得更清楚、更可处理。",
    consultationView: "对她而言，咨询不是反复分析问题，也不是仓促给出答案；她会和来访者一起确认希望发生的改变，发现已有资源和例外经验，并逐步找到可行的方向。",
    topics: ["压力调适", "现实困扰", "选择与决策", "拖延与回避"],
    workingStyle: "她会从来访者已经拥有的能力、支持和曾经奏效的经验出发，和来访者一起澄清目标、发现资源，并寻找能够尝试的改变。",
    workingStyleFollowUp: "她不会把咨询变成一张任务清单；方向逐渐清晰后，再和来访者找一个具体、适度、做得到的下一步。",
    portrait: zhouzhouScene
  },
  {
    avatar: getCounselorDialogueAvatar("linleshui"),
    id: "linleshui",
    mirrorLabel: "觉察与条件之镜",
    name: "林乐水",
    title: "中国传统心性哲学取向心理咨询师",
    summary: "林乐水关注来访者在痛苦、迷茫与人生变化中，如何看清自己的处境，并重新辨认真正珍视的方向。",
    consultationView: "对她而言，咨询不是劝来访者放下，也不是替来访者给出人生答案；她会尊重现实处境，和来访者一起面对选择、责任、失去与不确定，慢慢澄清真正珍视的事。",
    topics: ["人生意义", "生命转折", "价值冲突", "失落与哀伤"],
    workingStyle: "她会从来访者正在经历的具体困惑出发，关注个人选择如何与关系、责任、文化和现实限制彼此牵连。",
    workingStyleFollowUp: "传统心性中对处境、关系与变化的理解会成为她的视角之一；她仍会和来访者一起探索正在经历什么、真正看重什么，以及接下来想怎样生活。",
    portrait: linleshuiScene
  }
];

const enCounselorIntroductionProfiles: CounselorIntroductionProfile[] = [
  {
    avatar: getCounselorDialogueAvatar("chengling"),
    id: "chengling",
    mirrorLabel: "A mirror for relationship and inner experience",
    name: "Cheng Ling",
    title: "Person-Centered & Psychodynamic AI Counselor",
    summary: "Cheng Ling values genuine, present-moment conversation and respects each person’s pace in understanding and expressing their experience.",
    consultationView: "For her, counseling is not about rushing to interpret, repair, or push for change. It begins by making room for emotion and for inner experience that has not yet become clear—to be understood, put into words, and explored further.",
    topics: ["Intimate relationships", "Inner conflict", "Self-exploration", "Personal growth"],
    workingStyle: "She begins with what the person is feeling and facing now, while attending to inner needs, relational interactions, and conflicts that repeatedly leave the person feeling stuck.",
    workingStyleFollowUp: "She does not hurry toward conclusions. She offers her understanding as a possibility that can be corrected and examines together with the person whether it fits their lived experience.",
    portrait: chenglingScene
  },
  {
    avatar: getCounselorDialogueAvatar("zhouzhou"),
    id: "zhouzhou",
    mirrorLabel: "A mirror for dilemmas and choice",
    name: "Zhou Zhou",
    title: "Solution-Focused AI Counselor",
    summary: "Zhou Zhou attends to the concern a person most wants to change now. Together, they notice what is already working, the resources available, and a next step worth trying, so the problem can become clearer and more manageable.",
    consultationView: "For her, counseling is neither repeated analysis of the problem nor a hurried answer. She works with the person to clarify the change they hope for, identify resources and exceptions, and gradually find a feasible direction.",
    topics: ["Coping with stress", "Practical difficulties", "Choices and decisions", "Procrastination and avoidance"],
    workingStyle: "She starts with abilities, support, and past experiences that have already helped, then works collaboratively to clarify goals, identify resources, and find changes that could be tried.",
    workingStyleFollowUp: "She does not turn counseling into a task list. Once a direction becomes clearer, she helps find one next step that is specific, appropriately sized, and achievable.",
    portrait: zhouzhouScene
  },
  {
    avatar: getCounselorDialogueAvatar("linleshui"),
    id: "linleshui",
    mirrorLabel: "A mirror for awareness and conditions",
    name: "Lin Leshui",
    title: "Chinese Philosophy of Mind-and-Heart–Informed AI Counselor",
    summary: "Lin Leshui attends to how a person can see their circumstances more clearly amid pain, uncertainty, and life transition, and discern again what they genuinely value.",
    consultationView: "For her, counseling is neither persuading someone to let go nor supplying an answer about how to live. She respects real circumstances and explores choice, responsibility, loss, and uncertainty with the person, gradually clarifying what truly matters.",
    topics: ["Meaning in life", "Life transitions", "Value conflicts", "Loss and grief"],
    workingStyle: "She begins with the person’s concrete difficulty and considers how individual choice is intertwined with relationships, responsibility, culture, and practical constraints.",
    workingStyleFollowUp: "Chinese traditions of understanding circumstance, relationship, and change are one part of her perspective. She still works with the person to explore what is happening, what matters most, and how they want to live next.",
    portrait: linleshuiScene
  }
];

const counselorIntroductionProfilesByLocale: Record<SupportedLocale, CounselorIntroductionProfile[]> = {
  "zh-CN": zhCounselorIntroductionProfiles,
  "en-US": enCounselorIntroductionProfiles
};

export function getCounselorIntroductionProfiles(
  locale: SupportedLocale,
  disabledCounselorIds: readonly string[] = []
) {
  const officialProfiles = counselorIntroductionProfilesByLocale[locale];
  const officialIds = new Set(builtinCounselorPackages.map(({ id }) => id));
  const disabledIds = new Set(disabledCounselorIds);
  const communityProfiles: CounselorIntroductionProfile[] = counselorPackageRegistry.list()
    .filter(({ manifest }) => !officialIds.has(manifest.id) && !disabledIds.has(manifest.id))
    .map(({ manifest }) => {
      const copy = manifest.localizations[locale];
      const visuals = getCounselorVisualAssets(manifest.id);
      return {
        avatar: visuals.dialogueAvatar,
        id: manifest.id,
        mirrorLabel: locale === "en-US" ? "Locally imported AI counselor character" : "本地导入 AI 咨询角色",
        name: copy.name,
        title: copy.title,
        summary: copy.description,
        consultationView: locale === "en-US"
          ? `This AI counselor character and its theoretical orientation are provided by ${manifest.publisher.name}. Ling continues to provide the system safety, memory, reflection, supervision, and letter workflow.`
          : `该 AI 咨询角色的人格与理论取向由 ${manifest.publisher.name} 提供；系统安全、记忆、会后反思、督导和来信流程仍由 Ling 统一运行。`,
        workingStyle: locale === "en-US"
          ? `The package describes its areas of focus as: ${copy.strengths.join(", ")}. The counselor must still treat each understanding as revisable and prioritize the client's current expression.`
          : `该咨询师包标注的关注方向包括：${copy.strengths.join("、")}。咨询中仍需将所有理解保持为可修正的可能，并以来访者当下表达为先。`,
        topics: [...copy.strengths],
        portrait: visuals.portrait
      } satisfies CounselorIntroductionProfile;
    });
  return [...officialProfiles, ...communityProfiles];
}
