import type { DialogueFlow } from "../lobbyContracts";
import type { SupportedLocale } from "@shared/index";
import type { ReceptionCounselorId } from "../lobbyStorage";

const zhDialogueScripts: Record<DialogueFlow, { lines: string[] }> = {
  firstVisit: {
    lines: ["你好，欢迎来到群心心理工作室。今天我在前台，可以带你看看这里，也可以帮你预约。"]
  },
  returning: {
    lines: ["你好，又见面了。今天我在前台。想预约、看资料，或者只是坐一会儿，都可以。"]
  },
  tour: {
    lines: [
      "墙上的三张照片可以打开咨询师介绍册；窗边通向花园，资料桌放着使用说明和安全资料。",
      "沙发旁的「会谈记录」，可以回看已经结束的对话；咨询师写给你的信，则收在画面下方的「咨询师的信」里。",
      "想直接开始，就点下方正中的「预约咨询」；需要调整 Ling 时，右边就是「系统设置」。",
      "房间里发着柔光的小圆点，都是可以点开的入口。"
    ]
  },
  counselors: {
    lines: ["程灵、周舟、林乐水，三位老师的风格不太一样。我把介绍册打开，你先看看。"]
  },
  booking: {
    lines: ["三位老师的介绍都可以先看看。开始前，Ling 会先请你看看 AI 咨询的边界和安全说明。"]
  },
  browse: { lines: ["好，你慢慢看。想预约就用下方「预约咨询」，需要我时再点前台。"] },
  consentIntro: {
    lines: [
      "进入咨询室前，有几件重要的事需要先和你说清楚。",
      "Ling 提供的是 AI 情绪支持与自我探索，不能替代专业心理咨询、精神科诊疗、医学诊断或危机干预。",
      "接下来是知情说明。你看完，觉得可以继续，我们再继续；不想开始也没关系，随时可以返回。"
    ]
  },
  handoff: { lines: ["前一位咨询师已经去咨询室了，接下来由我替她看一会儿前台。预约、资料和设置都还在原来的位置，你可以继续刚才的安排。"] },
  smallTalk: { lines: [] }
};

const enDialogueScripts: Record<DialogueFlow, { lines: string[] }> = {
  firstVisit: {
    lines: ["Hello, and welcome to Qunxin Psychology Studio. I am at reception today. I can show you around or help you book a session."]
  },
  returning: {
    lines: ["Hello again. I am at reception today. You can book, look through the resources, or just sit for a while."]
  },
  tour: {
    lines: [
      "The three portraits on the wall open the counselor introductions. The window leads to the garden, and the Resources Desk contains guidance and safety information.",
      "“Session records” beside the sofa lets you revisit completed conversations. Letters written by your counselors are kept under “Letters” at the bottom of the screen.",
      "To begin now, choose “Book a session” in the center below. “Settings” is on the right whenever you need to adjust Ling.",
      "The small glowing spots around the room are all things you can open."
    ]
  },
  counselors: {
    lines: ["Cheng Ling, Zhou Zhou, and Lin Leshui each work a little differently. I'll open their introductions so you can look around."]
  },
  booking: {
    lines: ["You can read about all three counselors first. Before your first session, Ling will show you the boundaries of AI counseling and the essential safety information."]
  },
  browse: {
    lines: ["Take your time looking around. Use “Book a session” below when you're ready, and open reception if you need me."]
  },
  consentIntro: {
    lines: [
      "Before you enter a counseling room, there are a few important things to make clear.",
      "Ling provides AI-based emotional support and self-exploration. It cannot replace qualified counseling, psychiatric care, medical diagnosis, or crisis intervention.",
      "The informed-consent information comes next. If you read it and feel comfortable continuing, we can go on. If you do not want to begin now, you can always go back."
    ]
  },
  handoff: { lines: ["The previous counselor has gone into a counseling room, so I am covering reception for now. Booking, resources, and settings are still in the same places."] },
  smallTalk: { lines: [] }
};

export const dialogueScripts = zhDialogueScripts;

export function getDialogueScripts(
  locale: SupportedLocale,
  counselorId?: ReceptionCounselorId,
  counselorName?: string,
  handoffFromName?: string,
  isFirstReceptionMeeting = false
) {
  const scripts = locale === "en-US" ? enDialogueScripts : zhDialogueScripts;
  if (!counselorId || !counselorName) return scripts;
  const fromName = handoffFromName ?? (locale === "en-US" ? "The previous counselor" : "前一位咨询师");
  const personalized = locale === "en-US"
    ? englishReceptionCopy[counselorId]
    : chineseReceptionCopy[counselorId];
  return {
    ...scripts,
    firstVisit: { lines: [personalized.firstVisit] },
    returning: { lines: [personalized.returning] },
    handoff: {
      lines: [isFirstReceptionMeeting ? personalized.firstHandoff(fromName) : personalized.returningHandoff(fromName)]
    }
  };
}

type PersonalizedReceptionCopy = {
  firstVisit: string;
  returning: string;
  firstHandoff: (fromName: string) => string;
  returningHandoff: (fromName: string) => string;
};

const chineseReceptionCopy: Record<ReceptionCounselorId, PersonalizedReceptionCopy> = {
  chengling: {
    firstVisit: "你好，欢迎你来。我是程灵，今天在前台。你先看看这里，或者告诉我你想从哪儿开始。",
    returning: "又见面了。今天我在前台。你想预约、看看资料，或者只聊两句，都可以慢慢来。",
    firstHandoff: (fromName) => `${fromName}去咨询室了。你好，我是程灵，接下来我替她看一会儿前台。你不用接着刚才的节奏，先看看也可以。`,
    returningHandoff: (fromName) => `${fromName}去咨询室了，接下来我替她看一会儿前台。这里还是原来的样子，你按自己的节奏来。`
  },
  zhouzhou: {
    firstVisit: "你好，我是周舟，今天轮到我值班。预约、资料和设置都在这间等待室里；你想先弄清哪一件，我们就从哪一件开始。",
    returning: "又见面了。入口还是这些。今天想用哪个，就点哪个。",
    firstHandoff: (fromName) => `${fromName}已经进咨询室了。你好，我是周舟，我来接班。入口都没动，需要哪一个就用哪一个。`,
    returningHandoff: (fromName) => `${fromName}已经进咨询室了，我来接班。入口都在原处，需要哪一个就用哪一个。`
  },
  linleshui: {
    firstVisit: "你好，我是林乐水，今天在前台。你可以四处看看，也可以先坐一会儿。想去哪儿，就去哪儿。",
    returning: "又见面了。今天想去哪儿就去哪儿，不用先想理由；什么都不选，坐一会儿也行。",
    firstHandoff: (fromName) => `${fromName}去咨询室了。你好，我是林乐水，接下来由我守着前台。这里还是原来的样子，你可以慢慢接上自己的安排。`,
    returningHandoff: (fromName) => `${fromName}去咨询室了，接下来由我守着前台。这里还是原来的样子，你慢慢接上自己的安排。`
  }
};

const englishReceptionCopy: Record<ReceptionCounselorId, PersonalizedReceptionCopy> = {
  chengling: {
    firstVisit: "Hello, and welcome. I am Cheng Ling, at reception today. You can look around, or tell me where you would like to begin.",
    returning: "Good to see you again. I am at reception today. You can book, look through the resources, or simply talk for a moment. Take your time.",
    firstHandoff: (fromName) => `${fromName} has gone into a counseling room. Hello, I am Cheng Ling, and I will cover reception. You do not have to keep the earlier pace; looking around first is fine.`,
    returningHandoff: (fromName) => `${fromName} has gone into a counseling room, so I will cover reception. Everything is still where it was; take it at your own pace.`
  },
  zhouzhou: {
    firstVisit: "Hello, I am Zhou Zhou, and it is my turn at reception today. Booking, resources, and settings are all in this room. Tell me which one you want to make clear first.",
    returning: "Good to see you again. The entrances are the same. Use whichever one you want today.",
    firstHandoff: (fromName) => `${fromName} has gone into a counseling room. Hello, I am Zhou Zhou, taking over reception. Nothing moved; use whichever entrance you need.`,
    returningHandoff: (fromName) => `${fromName} has gone into a counseling room, and I am taking over. Everything is in its usual place; use what you need.`
  },
  linleshui: {
    firstVisit: "Hello, I am Lin Leshui, at reception today. You can look around or sit for a while. Go wherever you feel like going.",
    returning: "Good to see you again. Go wherever you like today, with no reason needed. Or choose nothing and sit here for a while.",
    firstHandoff: (fromName) => `${fromName} has gone into a counseling room. Hello, I am Lin Leshui, and I will keep reception for now. The room is unchanged; you can return to your plans slowly.`,
    returningHandoff: (fromName) => `${fromName} has gone into a counseling room, and I will keep reception for now. The room is unchanged; return to your plans slowly.`
  }
};
