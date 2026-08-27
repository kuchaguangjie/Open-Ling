import type { SupportedLocale } from "@shared/index";

export interface CrisisSupportSituation {
  action: string;
  guidance: string;
  details: string[];
  icon: "person" | "shield" | "home" | "group";
}

export interface CrisisSupportContact {
  numbers: string[];
  label: string;
  description: string;
  note?: string;
}

const zhCrisisSupportSituations: CrisisSupportSituation[] = [
  {
    action: "现在就联系一个现实中的人",
    guidance: "不用把事情讲完整。发一句‘我现在可能不安全，请联系我并陪我求助。’就可以。",
    details: [
      "如果说话很难，可以把这页给对方看，或只发一句：‘我在［位置］，现在需要你联系我。’",
      "能说的话，告诉对方你在哪里、身边有没有人，以及你是否担心自己或别人马上会受伤。",
      "请对方来到你身边、保持通话，或协助联系 110、120 和就近急诊；不要只等待文字消息。"
    ],
    icon: "person"
  },
  {
    action: "先和眼前的危险拉开距离",
    guidance: "在不需要接近、搬动或争夺危险物的前提下，去更安全、有人在的地方。",
    details: [
      "在安全的情况下，离开高处、车流、火源、危险物或大量药物；不要自己携带、转移或处理危险物。",
      "请现实中你信任的人或紧急人员处理现场和危险物。如果现场有暴力风险，不要靠近、争执或强行夺取物品。",
      "先不饮酒、不驾车，也不要独处。已经受伤、服药过量、中毒或身体明显不适时，直接联系 120，不要等待症状变化。"
    ],
    icon: "home"
  },
  {
    action: "让陪伴者一起把安全放在前面",
    guidance: "陪伴不是说服或监视，而是保持现实联系，并在需要时一起联系紧急服务。",
    details: [
      "如果你在陪别人，可以直接、平静地问：‘你现在有没有想自杀，或伤害别人的念头？’直接询问不会促使对方去实施。",
      "如果对方已经行动、有马上行动的可能或无法保证安全，在你自身安全的前提下不要让其独处，并立即联系 110 或 120。",
      "如果有暴力、武器或其他现场危险，陪伴者应先保护自己和其他人、离开危险范围并报警，不要独自处置。"
    ],
    icon: "group"
  },
  {
    action: "在等待现实帮助时照顾眼前一分钟",
    guidance: "看、听或触摸安全的东西可以帮助你撑过等待，但不能替代紧急求助。",
    details: [
      "可以把脚放稳，慢慢找三样看得见的东西、两种听得到的声音，再摸一摸身边安全的物件。",
      "如果注意呼吸让你更慌，就跳过它。看、听或触摸，哪一种更可承受就用哪一种。",
      "继续和现实中的人保持联系。等眼前危险降低后，再和心理或医疗专业人员协作制定适合你的安全计划。"
    ],
    icon: "shield"
  }
];

const zhCrisisSupportEmergencyContacts: CrisisSupportContact[] = [
  {
    numbers: ["110"],
    label: "公安报警",
    description: "暴力、威胁、虐待或其他人身安全危险正在发生时。"
  },
  {
    numbers: ["120"],
    label: "医疗急救",
    description: "有人受伤、中毒、失去意识或需要紧急医疗救助时。"
  }
];

const zhCrisisSupportHotlineContacts: CrisisSupportContact[] = [
  {
    numbers: ["12356"],
    label: "全国统一心理援助热线",
    description: "提供心理支持和危机干预；不能替代 110 或 120。",
    note: "由所在地接听网络提供服务；接听时段、等待时间和可提供的帮助以当地实际情况为准。"
  }
];

const enCrisisSupportSituations: CrisisSupportSituation[] = [
  {
    action: "Contact a person in your life now",
    guidance: "You do not have to explain everything. One sentence is enough: “I may not be safe. Please contact me and help me get support.”",
    details: [
      "If speaking feels too difficult, show them this page or send only: “I am at [location]. Please contact me now.”",
      "If you can, tell them where you are, whether anyone is with you, and whether you are afraid that you or someone else may be harmed soon.",
      "Ask them to come to you, stay on the phone, or help contact emergency services and the nearest emergency department. Do not rely only on text messages."
    ],
    icon: "person"
  },
  {
    action: "Increase the distance from immediate danger",
    guidance: "Without approaching, moving, or fighting over a dangerous object, move to a safer place where other people are present.",
    details: [
      "When it is safe, move away from heights, traffic, fire, dangerous objects, or large quantities of medication. Do not carry, transport, or dispose of dangerous items yourself.",
      "Ask someone you trust or an emergency responder in the real world to handle the scene and any dangerous item. If violence is possible, do not approach, confront, or try to seize anything.",
      "Avoid alcohol, driving, and being alone. If injury, overdose, poisoning, or significant physical symptoms have occurred, contact medical emergency services now rather than waiting for symptoms to change."
    ],
    icon: "home"
  },
  {
    action: "Keep safety at the center of in-person support",
    guidance: "Staying with someone is not about persuasion or surveillance. It is about maintaining real-world contact and involving emergency help when needed.",
    details: [
      "If you are supporting someone else, ask directly and calmly: “Are you thinking about suicide or hurting someone?” Asking directly does not cause a person to act.",
      "If they have acted, may act soon, or cannot stay safe, do not leave them alone when it is safe for you to remain, and contact emergency services immediately.",
      "If violence, a weapon, or another scene hazard is present, protect yourself and others, move out of danger, and call emergency services. Do not manage the scene alone."
    ],
    icon: "group"
  },
  {
    action: "Attend to the next minute while real-world help is on the way",
    guidance: "Seeing, hearing, or touching something safe may help during the wait, but it does not replace urgent help.",
    details: [
      "Place both feet on a steady surface. Slowly name three things you can see, two sounds you can hear, and one safe object you can touch.",
      "If focusing on breathing makes the fear worse, skip it. Use sight, sound, or touch—whichever feels more manageable.",
      "Stay connected with a person in the real world. After immediate danger has reduced, work with a mental-health or medical professional on a collaborative safety plan."
    ],
    icon: "shield"
  }
];

const enCrisisSupportEmergencyContacts: CrisisSupportContact[] = [
  {
    numbers: ["110"],
    label: "Police emergency — mainland China",
    description: "When violence, threats, abuse, or another immediate danger to personal safety is occurring."
  },
  {
    numbers: ["120"],
    label: "Medical emergency — mainland China",
    description: "When someone is injured, poisoned, unconscious, or needs urgent medical care."
  }
];

const enCrisisSupportHotlineContacts: CrisisSupportContact[] = [
  {
    numbers: ["12356"],
    label: "National psychological assistance line — mainland China",
    description: "Psychological support and crisis intervention; it does not replace 110 or 120.",
    note: "Service is provided by the answering network in your location; hours, wait times, and available support vary locally."
  }
];

export interface CrisisSupportContent {
  emergencyContacts: CrisisSupportContact[];
  hotlineContacts: CrisisSupportContact[];
  situations: CrisisSupportSituation[];
  verification: string;
}

const crisisSupportContentByLocale: Record<SupportedLocale, CrisisSupportContent> = {
  "zh-CN": {
    emergencyContacts: zhCrisisSupportEmergencyContacts,
    hotlineContacts: zhCrisisSupportHotlineContacts,
    situations: zhCrisisSupportSituations,
    verification: "信息核验日期：2026-07-31。110、120 为中国大陆紧急服务号码；12356 为国家卫生健康委设置的全国统一心理援助热线。服务仍可能调整。"
  },
  "en-US": {
    emergencyContacts: enCrisisSupportEmergencyContacts,
    hotlineContacts: enCrisisSupportHotlineContacts,
    situations: enCrisisSupportSituations,
    verification: "Information verified July 31, 2026. In mainland China, 110 and 120 are emergency services; 12356 is the national psychological assistance line established by the National Health Commission. Services may still change."
  }
};

export function getCrisisSupportContent(locale: SupportedLocale) {
  return crisisSupportContentByLocale[locale];
}
