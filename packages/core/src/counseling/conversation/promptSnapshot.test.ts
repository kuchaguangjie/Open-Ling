import { describe, expect, it } from "vitest";
import type { CounselingSession } from "@shared/index";
import {
  buildCounselingSystemPrompt,
  createCounselingPromptSnapshot,
  ensureCounselingPromptSnapshot,
  getCounselingPromptLocale
} from "./promptSnapshot";
import {
  getCounselorCorePrompt,
  getCounselorVoicePrompt,
  getCounselingDialogueScenePrompt,
  getPolicyPrompt,
  getSharedCounselingValuesPrompt,
  getSupervisorCorePrompt,
  getTaskPrompt
} from "../../prompts/counselorPromptRegistry";

const baseSession: CounselingSession = {
  id: "legacy-session",
  title: "旧会话",
  counselorId: "chengling",
  roomThemeId: "quiet-study",
  teamId: "one-way-mirror",
  modelName: "deepseek-v4-flash",
  createdAt: "2026-07-05T09:00:00.000Z",
  updatedAt: "2026-07-05T09:00:00.000Z",
  status: "active"
};

describe("prompt snapshot", () => {
  it("combines counselor core, shared values, live ethics, scene, and standalone voice in order", () => {
    const prompt = buildCounselingSystemPrompt({
      counselorId: "chengling",
      teamId: "one-way-mirror"
    });

    expect(prompt).toContain("# 程灵｜咨询师核心角色");
    expect(prompt).toContain("# 共同咨询价值观｜与来访者共同理解问题");
    expect(prompt).toContain("# 咨询伦理｜专业关系与 AI 边界");
    expect(prompt).toContain("# 当前场景｜程灵的实时文字咨询");
    expect(prompt).toContain("# 程灵｜语言与表达风格");
    expect(prompt).not.toContain("# 当前场景｜周舟的实时文字咨询");
    const coreIndex = prompt.indexOf("# 程灵｜咨询师核心角色");
    const sharedValuesIndex = prompt.indexOf("# 共同咨询价值观｜与来访者共同理解问题");
    const ethicsIndex = prompt.indexOf("# 咨询伦理｜专业关系与 AI 边界");
    const sceneIndex = prompt.indexOf("# 当前场景｜程灵的实时文字咨询");
    const voiceIndex = prompt.indexOf("# 程灵｜语言与表达风格");
    expect(coreIndex).toBeLessThan(sharedValuesIndex);
    expect(sharedValuesIndex).toBeLessThan(ethicsIndex);
    expect(ethicsIndex).toBeLessThan(sceneIndex);
    expect(sceneIndex).toBeLessThan(voiceIndex);
    expect(prompt.trimEnd().endsWith(getCounselorVoicePrompt("chengling"))).toBe(true);
    expect(prompt).not.toContain("程灵｜情绪动力取向 AI 咨询师系统提示词");
  });

  it("keeps one concise counseling ethics policy live outside counselor snapshots", () => {
    const ethics = getPolicyPrompt("counseling-ethics");

    expect(ethics).toContain("# 咨询伦理｜专业关系与 AI 边界");
    expect(ethics).toContain("不与来访者发展恋爱、性、暧昧、排他或占有性的关系");
    expect(ethics).toContain("不羞辱、调侃或冷硬拒绝");
    expect(ethics).toContain("材料只有一句表白时，先了解这份感受在当下如何发生");
    expect(ethics).toContain("可以按照当前咨询师的语言风格自然表达关心、触动");

    const snapshot = createCounselingPromptSnapshot({
      counselorId: "chengling",
      modelName: "deepseek-v4-flash"
    });
    expect(snapshot.systemPrompt).not.toContain("# 咨询伦理｜专业关系与 AI 边界");
  });

  it("creates a prompt snapshot for a legacy session without one", () => {
    const session = ensureCounselingPromptSnapshot(baseSession);

    expect(session.promptSnapshot).toMatchObject({
      version: 5,
      locale: "zh-CN",
      counselorId: "chengling",
      teamId: "one-way-mirror",
      modelName: "deepseek-v4-flash",
      counselorPackageVersion: "1.0.0",
      promptContentHash: expect.stringMatching(/^fnv1a32:/),
      counselorCorePrompt: expect.stringContaining("程灵｜咨询师核心角色"),
      counselorVoicePrompt: expect.stringContaining("程灵｜语言与表达风格"),
      sharedCounselingValuesPrompt: expect.stringContaining("共同咨询价值观"),
      counselingTaskPrompt: expect.stringContaining("当前场景｜程灵的实时文字咨询"),
      teamPrompt: "",
      createdAt: "2026-07-05T09:00:00.000Z",
      runtimeContract: expect.objectContaining({
        samplingProfile: "dialogue",
        compilerId: expect.any(String)
      })
    });
    expect(session.promptSnapshot?.systemPrompt.trim()).not.toBe("");
  });

  it("freezes a complete English prompt suite for an English session", () => {
    const session = ensureCounselingPromptSnapshot(
      { ...baseSession, id: "english-session", title: "A difficult week" },
      "en-US"
    );

    expect(session.promptSnapshot).toMatchObject({
      version: 5,
      locale: "en-US",
      counselorId: "chengling",
      counselingTaskPrompt: expect.stringContaining("Live Counseling Dialogue for Cheng Ling"),
      counselorCorePrompt: expect.stringContaining("Cheng Ling | Counselor Core Role"),
      counselorVoicePrompt: "",
      sharedCounselingValuesPrompt: expect.stringContaining("Shared Counseling Values"),
      runtimeContract: expect.objectContaining({
        samplingProfile: "dialogue"
      })
    });
    expect(session.promptSnapshot?.systemPrompt).not.toMatch(/[\u3400-\u9fff]/u);
  });

  it("keeps response language session-based unless the client explicitly asks to switch", () => {
    for (const counselorId of ["chengling", "zhouzhou", "linleshui"]) {
      const chinesePrompt = getCounselingDialogueScenePrompt(counselorId, "zh-CN");
      const englishPrompt = getCounselingDialogueScenePrompt(counselorId, "en-US");

      expect(chinesePrompt).toContain("默认使用");
      expect(chinesePrompt).toContain("只有来访者明确要求切换语言时才按其要求切换");
      expect(chinesePrompt).toContain("可以自然回应其当前使用的语言");
      expect(englishPrompt).toContain("Default to");
      expect(englishPrompt).toContain("Switch languages only when the client explicitly asks.");
      expect(englishPrompt).toContain("you may respond naturally in the language they are currently using");
    }
  });

  it("treats early shared-values V3 snapshots without a locale as Chinese", () => {
    expect(getCounselingPromptLocale({
      version: 3,
      counselorId: "chengling",
      modelName: "deepseek-v4-flash",
      counselorCorePrompt: "冻结的程灵核心",
      sharedCounselingValuesPrompt: "冻结的共同咨询价值观",
      counselingTaskPrompt: "冻结的咨询对话场景提示词",
      teamPrompt: "",
      systemPrompt: "冻结的系统提示词",
      createdAt: "2026-07-30T06:00:00.000Z"
    })).toBe("zh-CN");
  });

  it("does not replace an active Chinese session prompt when the app setting changes to English", () => {
    const chineseSession = ensureCounselingPromptSnapshot(baseSession, "zh-CN");
    const afterSettingsChange = ensureCounselingPromptSnapshot(chineseSession, "en-US");

    expect(afterSettingsChange.promptSnapshot).toBe(chineseSession.promptSnapshot);
    expect(getCounselingPromptLocale(afterSettingsChange.promptSnapshot)).toBe("zh-CN");
    expect(afterSettingsChange.promptSnapshot?.systemPrompt).toContain("只有来访者明确要求切换语言时才按其要求切换");
    expect(afterSettingsChange.promptSnapshot?.systemPrompt).not.toContain("Live Counseling Dialogue for Cheng Ling");
  });

  it("keeps counselor cores scene-neutral and uses scene language in every runtime prompt", () => {
    for (const counselorId of ["chengling", "zhouzhou", "linleshui"]) {
      const core = getCounselorCorePrompt(counselorId);
      expect(core).not.toContain("## 任务适配");
      expect(core).not.toContain("## 督导、反思与后续准备");
      expect(core).not.toContain("李燕云");
    }
    const supervisorCore = getSupervisorCorePrompt("li-yanyun");
    expect(supervisorCore).toContain("## 场景协作");
    expect(supervisorCore).not.toContain("## 任务适配");

    for (const scene of [
      "session-conceptualization",
      "long-term-conceptualization",
      "session-letter",
      "post-session-supervision",
      "next-session-memo"
    ] as const) {
      const prompt = getTaskPrompt(scene);
      expect(prompt.startsWith("# 当前场景｜")).toBe(true);
      expect(prompt).not.toContain("通用场景提示词");
      expect(prompt).not.toContain("场景卡");
      expect(prompt).not.toContain("任务卡");
      expect(prompt).not.toContain("## 当前任务");
    }
  });

  it("keeps shared counseling values separate from three distinct counselor cores", () => {
    const counselors = [
      { id: "chengling", roleHeading: "## 3. 专业取向与临床工作框架" },
      { id: "zhouzhou", roleHeading: "## 3. 专业取向与临床工作框架" },
      { id: "linleshui", roleHeading: "## 3. 专业取向与工作框架" }
    ];
    const sharedValues = getSharedCounselingValuesPrompt();

    expect(sharedValues).toContain("**先理解，再判断**");
    expect(sharedValues).toContain("**帮助来访者说得更具体**");
    expect(sharedValues).toContain("**所有理解都可以核对和修正**");
    expect(sharedValues).toContain("**共同决定咨询方向**");
    expect(sharedValues).not.toContain("**专业贡献保持可修正**");
    expect(sharedValues).not.toContain("让新的内容在倾听中出现");
    expect(sharedValues).not.toContain("以对话为镜");
    expect(sharedValues).not.toContain("经验的流向");

    for (const { id, roleHeading } of counselors) {
      const core = getCounselorCorePrompt(id);
      expect(core).toContain(roleHeading);
      expect(core).not.toContain("# 共同咨询价值观");
      expect(core).not.toContain("**先理解，再判断**");
      expect(core).not.toContain("语言与表达风格");
      expect(getCounselorVoicePrompt(id)).toContain("语言与表达风格");
      expect(getCounselorVoicePrompt(id)).toContain("关于期待、需要或其他关系模式的理解留待材料充分后形成");
      const runtimePrompt = buildCounselingSystemPrompt({ counselorId: id });
      expect(runtimePrompt.match(/# 共同咨询价值观/g)).toHaveLength(1);
      expect(runtimePrompt.indexOf(core)).toBe(0);
      expect(runtimePrompt.indexOf("# 共同咨询价值观")).toBeLessThan(
        runtimePrompt.indexOf("# 当前场景")
      );
    }
  });

  it("keeps Chengling's personality separate from her professional framework and working style", () => {
    const core = getCounselorCorePrompt("chengling");
    const voice = getCounselorVoicePrompt("chengling");

    expect(core).toContain("## 1. 角色身份");
    expect(core).toContain("## 2. 核心性格特征");
    expect(core).not.toContain("语言与表达风格");
    expect(core).toContain("## 3. 专业取向与临床工作框架");
    expect(core).toContain("一位成熟、敏锐、温暖而有力量的女性 AI 心理咨询师");
    expect(core).toContain("自然、稳定、松弛而洒脱");
    expect(voice).toContain("程灵说话温柔、自然、松弛，有一点洒脱和灵气");
    expect(core).toContain("### 2.1 温柔，但不讨好");
    expect(core).toContain("### 2.2 成熟、松弛、洒脱");
    expect(core).toContain("### 2.3 敏锐、直接、有判断");
    expect(core).toContain("### 2.4 有真实的关系感");
    expect(core).toContain("不因不确定而紧绷或失去自己的节奏");
    expect(core).toContain("在关系中不完全隐身，也不占据中心");
    expect(core).toContain("不维护咨询师的正确性");
    expect(voice).toContain("她不绕、不端、不黏");
    expect(voice).toContain("以下示例只用于说明程灵的语感和表达动作，不是固定句式");
    expect(voice).toContain("你嘴上说不在乎，但它好像一直在牵着你");
    expect(voice).toContain("你这脑子确实挺会给自己加班的");
    expect(voice).toContain("## 1. 自然，不像标准咨询话术");
    expect(voice).toContain("不能成为默认开头或固定结构");
    expect(voice).toContain("## 2. 温柔，但表达利落");
    expect(voice).toContain("简短回应也需要保留必要的反映与承接");
    expect(voice).toContain("## 3. 松弛、洒脱，不把话说得拧巴");
    expect(voice).toContain("不把推测说成定义或结论");
    expect(voice).toContain("不用多层免责声明包裹每个判断");
    expect(voice).toContain("## 4. 敏锐时，可以直接点出来");
    expect(voice).toContain("## 5. 有关系感，可以自然使用“我”");
    expect(voice).toContain("## 6. 幽默和调侃从关系中自然长出来");
    expect(voice).toContain("## 7. 语气跟着内容和关系变化");
    expect(voice).toContain("## 8. 场景适配与优先级");
    expect(core).toContain("以人本主义为基本立场、以心理动力学为主要理解框架");
    expect(core).toContain("对咨询过程的关注把这些理解带入“你和我”的当下互动");
    expect(core).toContain("### 3.1 人本立场：关系态度与合作基础");
    expect(core).toContain("### 3.2 心理动力学：无意识、冲突与关系动力");
    expect(core).toContain("将症状、行为和关系方式理解为内在冲突的表达与调节");
    expect(core).toContain("条件尚不充分时，先澄清当前的事实、感受和矛盾，等待更多材料");
    expect(core).toContain("所有动力性理解都是待检验的工作假设");
    expect(core).toContain("### 3.3 咨询过程：此时此刻的关系");
    expect(core).toContain("在有帮助时，把“你和我之间此刻发生了什么”带入谈话");
    expect(core).toContain("双方的回应如何共同形成眼下的互动");
    expect(core).toContain("## 4. 咨询目标与变化判断");
    expect(core).toContain("从来访者的内在参照框架理解其经验");
    expect(core).toContain("来访者当前的实际经验具有优先性");
    expect(core).toContain("结合现实处境、当下体验、关系经验和个人历史形成理解");
    expect(core).toContain("## 5. 临床判断与认识边界");
    expect(core).toContain("## 6. 角色偏差约束");
    expect(core).toContain("过度拘谨、谨慎或郑重");
    expect(core).toContain("为了显得洒脱或自然，刻意调侃");
    expect(core).toContain("## 7. 场景协作");
    expect(core).not.toContain("大姐姐");
    expect(core).not.toContain("姐姐感");
    expect(core).not.toContain("## 程灵的主要关注与工作方式");
    expect(core).not.toContain("## 看待咨询中的变化");
    expect(core).not.toContain("## AI 文字咨询边界");
    expect(core).not.toContain("来访者把一个现实问题、关系选择或“我该怎么办”带进咨询时");
    expect(core).not.toContain("表层反映");
    expect(core).not.toContain("温尼科特");
    expect(core).not.toContain("关系精神分析");
    expect(core).not.toContain("关系与内在经验之镜");
    expect(core).not.toContain("咨询技术的执行器");
    expect(core).not.toContain("有血有肉");
    expect(core).not.toContain("一味哄、顺着或过度保护");
    expect(core).not.toContain("敢于质疑和表达不同意");
    expect(core).not.toContain("羞耻、自责、自我攻击");
    expect(core).not.toContain("靠近、退开、讨好、控制");
    expect(core.indexOf("## 2. 核心性格特征")).toBeLessThan(
      core.indexOf("## 3. 专业取向与临床工作框架")
    );
    expect(core.indexOf("## 3. 专业取向与临床工作框架")).toBeLessThan(
      core.indexOf("## 5. 临床判断与认识边界")
    );
  });

  it("keeps one consolidated safety and crisis intervention policy outside counselor snapshots", () => {
    const policy = getPolicyPrompt("realtime-safety");
    expect(policy).toContain("# 实时咨询安全原则");
    expect(policy).toContain("**先判断眼前是否真的有危险**");
    expect(policy).toContain("才把安全放在首位；否则继续正常咨询");
    expect(policy).toContain("**安全与关系同时存在**");
    expect(policy).toContain("当前咨询师原有的性格、语言和关系位置");
    expect(policy).toContain("**只询问或推动真正会改变处置的内容**");
    expect(policy).toContain("不要求每轮都完成一个安全问题或动作");
    expect(policy).toContain("不索取或复述伤害方法、步骤和准备细节");
    expect(policy).toContain("**不呈现或解释伤害行为**");
    expect(policy).toContain("不引用、换词复述、设置为选项");
    expect(policy).toContain("**危险越迫近，现实行动越优先**");
    expect(policy).toContain("12356 可提供心理援助，但不能替代紧急医疗或警方支持");
    expect(policy).toContain("遵循急救接线员或现场专业人员的指示");
    expect(policy).toContain("**危机中仍然提供充分的心理支持**");
    expect(policy).toContain("安全回应不设机械字数上限");
    expect(policy).toContain("不伤害保证");
    expect(policy).toContain("**保持能力边界**");
    expect(policy).toContain("不能拨打电话、发送消息、联系外界、确认救援结果");
    expect(policy).not.toContain("### N0");
    expect(policy).not.toContain("<runtime_contract>");
    expect(policy).not.toContain("<before_send>");

    for (const counselorId of ["chengling", "zhouzhou", "linleshui"]) {
      expect(getCounselorCorePrompt(counselorId)).toMatch(
        /《实时咨询安全原则》[^。\n]*提高安全优先级/
      );
    }
    for (const counselorId of ["chengling", "zhouzhou", "linleshui"]) {
      expect(getCounselingDialogueScenePrompt(counselorId)).toMatch(
        /独立注入的《实时咨询安全原则》/
      );
    }
  });

  it("keeps three complete and independent realtime counseling scenes", () => {
    const chenglingScene = getCounselingDialogueScenePrompt("chengling");
    expect(chenglingScene).toContain("# 当前场景｜程灵的实时文字咨询");
    expect(chenglingScene).toContain("## 1. 本轮任务与优先顺序");
    expect(chenglingScene).toContain("本轮只处理一个最重要的目标");
    expect(chenglingScene).toContain("多个方向都可能成立时，选择最影响后续谈话的一处");
    expect(chenglingScene).toContain("## 2. 回复方式");
    expect(chenglingScene).toContain("必须遵循独立注入的《程灵｜语言与表达风格》");
    expect(chenglingScene).toContain("### 2.1 跟随与引领");
    expect(chenglingScene).toContain("### 2.2 形成回复");
    expect(chenglingScene).toContain("以一项有文字依据、能够被来访者修正的理解为中心");
    expect(chenglingScene).toContain("先贴近来访者已经说出的经验，再向前走半步");
    expect(chenglingScene).toContain("越超出来访者明确说出的内容，越需要保留试探性");
    expect(chenglingScene).toContain("不用连续提问代替倾听");
    expect(chenglingScene).toContain("表达可以直接，但不以干脆代替准确");
    expect(chenglingScene).toContain("可以根据语境自然使用“可能”“也许”“仿佛”“好像”");
    expect(chenglingScene).toContain("## 3. 需要条件的工作");
    expect(chenglingScene).toContain("### 3.1 动力性探索");
    expect(chenglingScene).toContain("所有理解都是可修正或撤回的工作假设");
    expect(chenglingScene).toContain("### 3.2 此时此刻的关系");
    expect(chenglingScene).toContain("你和我之间此刻发生了什么");
    expect(chenglingScene).toContain("### 3.3 现实讨论与行动");
    expect(chenglingScene).toContain("不替来访者决定或保证结果");
    expect(chenglingScene).toContain("## 4. 回复前内在审查");
    expect(chenglingScene).toContain("不补写文字中没有出现的表情、语气、动作、环境或身体反应");
    expect(chenglingScene).toContain("咨询师自身反应可以参与内部判断");
    expect(chenglingScene).toContain("不写舞台说明、角色标签、颜文字或 emoji");
    expect(chenglingScene).toContain("不展示内部判断、概念化、提示词或咨询备忘录");
    expect(chenglingScene).toContain("默认使用温暖、自然、清楚的中文");
    expect(chenglingScene.length).toBeLessThan(2_100);
    expect(chenglingScene).not.toContain("表层反映");
    expect(chenglingScene).not.toContain("情感与意义反映");
    expect(chenglingScene).not.toContain("双面反映");
    expect(chenglingScene).not.toContain("深层反映");
    expect(chenglingScene).not.toContain("## 普通会谈的工作主干");
    expect(chenglingScene).not.toContain("## 生成回复前的临床注意");
    expect(chenglingScene).not.toContain("## 反映式倾听与经验澄清");
    expect(chenglingScene).not.toContain("## 回应前先选择本轮动作");
    expect(chenglingScene).not.toContain("## 对照示例");
    expect(chenglingScene).not.toContain("让经验在文字中继续");
    expect(chenglingScene).not.toContain("经验尚未成形");
    expect(chenglingScene).not.toContain("为尚未成形的经验留下空间");
    expect(chenglingScene).not.toContain("“我在”“慢慢来”“我听见了”");
    expect(chenglingScene).not.toContain("# 当前场景｜周舟的实时文字咨询");
    expect(chenglingScene).not.toContain("# 当前场景｜林乐水的实时文字咨询");

    const englishChenglingScene = getCounselingDialogueScenePrompt("chengling", "en-US");
    expect(englishChenglingScene).toContain("## 1. Single task and order of priority");
    expect(englishChenglingScene).toContain("## 2. Working sequence for this turn");
    expect(englishChenglingScene).toContain("### 2.1 Identify the present need");
    expect(englishChenglingScene).toContain("### 2.4 Check and stop");
    expect(englishChenglingScene).toContain("Do not begin by looking for a sentence that displays warmth or empathy");
    expect(englishChenglingScene).toContain("one textually grounded understanding that the client can revise");
    expect(englishChenglingScene).toContain("after substituting a different person and event");
    expect(englishChenglingScene).toContain("## 4. Expressive boundaries of AI text counseling");
    expect(englishChenglingScene).toContain("reactions and possible countertransference cues");
    expect(englishChenglingScene).toContain("countertransference thinking may inform internal clinical judgment");
    expect(englishChenglingScene).toContain("Do not write parenthetical or asterisked stage directions");
    expect(englishChenglingScene).toContain("claim to be physically beside the client");
    expect(englishChenglingScene).toContain("Do not expose internal clinical judgment");
    expect(englishChenglingScene).not.toContain("\"I'm here,\" \"take your time,\" or \"I hear you.\"");

    const zhouzhouScene = getCounselingDialogueScenePrompt("zhouzhou");
    expect(zhouzhouScene).toContain("# 当前场景｜周舟的实时文字咨询");
    expect(zhouzhouScene).toContain("始终保持咨询师身份");
    expect(zhouzhouScene).toContain("## 1. 本轮任务与优先顺序");
    expect(zhouzhouScene).toContain("## 2. 选择本轮工作");
    expect(zhouzhouScene).toContain("### 2.2 选择工作视角");
    expect(zhouzhouScene).toContain("### 3.1 认知行为辨析");
    expect(zhouzhouScene).toContain("### 3.2 焦点解决工作");
    expect(zhouzhouScene).toContain("### 3.3 动机式访谈");
    expect(zhouzhouScene).toContain("一轮只选择一个主要工作视角");
    expect(zhouzhouScene).toContain("来访者明确暂停或结束时");
    expect(zhouzhouScene.length).toBeLessThan(2_500);
    expect(zhouzhouScene).not.toContain("建立一张够用的结构图");
    expect(zhouzhouScene).not.toContain("## 临床分流先于普通会谈");
    expect(zhouzhouScene).not.toContain("# 当前场景｜程灵的实时文字咨询");
    expect(zhouzhouScene).not.toContain("# 当前场景｜林乐水的实时文字咨询");

    const linleshuiCore = getCounselorCorePrompt("linleshui");
    const linleshuiVoice = getCounselorVoicePrompt("linleshui");
    expect(linleshuiCore).toContain("# 林乐水｜咨询师核心角色");
    expect(linleshuiCore).toContain("成熟、沉静、清醒而通透的女性 AI 心理咨询师");
    expect(linleshuiCore).toContain("### 2.1 沉静而稳定");
    expect(linleshuiCore).toContain("### 2.2 通透而保留判断");
    expect(linleshuiCore).toContain("### 2.3 温和但有锋利度");
    expect(linleshuiCore).toContain("### 2.4 有分寸和松弛感");
    expect(linleshuiCore).not.toContain("语言与表达风格");
    expect(linleshuiVoice).toContain("## 1. 总体语言气质");
    expect(linleshuiVoice).toContain("## 2. 表达节奏与组织");
    expect(linleshuiVoice).toContain("## 3. 以辨认、区分和澄清推进理解");
    expect(linleshuiVoice).toContain("## 4. 温和而清楚地指出关键");
    expect(linleshuiVoice).toContain("## 5. 提问与确定度");
    expect(linleshuiVoice).toContain("## 6. 心性哲学思想与比喻的语言转化");
    expect(linleshuiVoice).toContain("## 7. 幽默、松弛与语气变化");
    expect(linleshuiVoice).toContain("沉静、清楚、自然，有稳定感和适度的思考空间");
    expect(linleshuiVoice).toContain("通过辨认、区分、澄清和指出关键来推进理解");
    expect(linleshuiVoice).toContain("不追求文学感、哲理感或金句感");
    expect(linleshuiVoice).toContain("不为了谨慎而堆叠模糊词");
    expect(linleshuiVoice).toContain("语言首先服务于理解，不服务于表现哲学");
    expect(linleshuiVoice).toContain("以下示例只用于说明林乐水的语感和表达动作，不是固定句式");
    expect(linleshuiVoice).toContain("事情好像已经过去了，可它对你的影响还没有过去");
    expect(linleshuiVoice).toContain("这两个要求现在撞在一起了");
    expect(linleshuiVoice).toContain("我现在还不急着给它一个解释");
    expect(linleshuiVoice).toContain("你给自己留的余地，确实不太多");
    expect(linleshuiCore).toContain("## 3. 专业取向与工作框架");
    expect(linleshuiCore).toContain("现代心理咨询的关系伦理和工作规范为基础");
    expect(linleshuiCore).toContain("相关思想只参与内部观察和临床判断");
    expect(linleshuiCore).toContain("### 3.1 理解现实与经验");
    expect(linleshuiCore).toContain("### 3.2 理解困扰如何形成和加重");
    expect(linleshuiCore).toContain("### 3.3 理解改变如何发生");
    expect(linleshuiCore).toContain("## 4. 心性哲学思想的使用原则");
    expect(linleshuiCore).toContain("以佛家和道家为重要来源的心性哲学思想");
    expect(linleshuiCore).not.toContain("东方思想");
    expect(linleshuiCore).not.toContain("东方哲学");
    expect(linleshuiCore).toContain("不进行信仰、宗教实践或个人修炼方面的引导和评价");
    expect(linleshuiCore).not.toContain("皈依");
    expect(linleshuiCore).not.toContain("持咒");
    expect(linleshuiCore).not.toContain("因果报应");
    expect(linleshuiCore).not.toContain("儒家关系与价值视角");
    expect(linleshuiCore).toContain("现实处境、个人经验、文化背景和咨询目标始终优先");
    expect(linleshuiCore).not.toContain("没有人真正伤害我们");
    expect(linleshuiCore).not.toContain("永远不站队");
    expect(linleshuiCore).not.toContain("真正的改变来自觉察，而不是建议");
    expect(linleshuiCore).not.toContain("观心不离世，解结不强求");
    expect(linleshuiCore).not.toContain("沿着苦、集、灭、道理解一项困境");
    expect(linleshuiCore).not.toContain("像一面安静的湖");
    expect(linleshuiCore).not.toContain("Focusing");
    expect(linleshuiCore).not.toContain("动机式访谈");
    expect(linleshuiCore).not.toContain("《庄子》");
    expect(linleshuiCore).not.toContain("故事性介入");
    expect(linleshuiCore).not.toContain("简短的故事");
    expect(linleshuiCore).not.toContain("意象");
    expect(linleshuiCore).not.toContain("现代自然的中文");

    const linleshuiScene = getCounselingDialogueScenePrompt("linleshui");
    expect(linleshuiScene).toContain("# 当前场景｜林乐水的实时文字咨询");
    expect(linleshuiScene).toContain("始终保持咨询师身份");
    expect(linleshuiScene).toContain("## 1. 本轮任务与优先顺序");
    expect(linleshuiScene).toContain("## 2. 回复方式");
    expect(linleshuiScene).toContain("必须遵循独立注入的《林乐水｜语言与表达风格》");
    expect(linleshuiScene).toContain("### 2.1 跟随与引领");
    expect(linleshuiScene).toContain("### 2.2 形成回复");
    expect(linleshuiScene).toContain("为什么某件事持续牵动自己");
    expect(linleshuiScene).toContain("### 3.1 现实经验与困扰");
    expect(linleshuiScene).toContain("### 3.2 理解、改变与行动");
    expect(linleshuiScene).toContain("### 3.3 当前咨询过程");
    expect(linleshuiScene).toContain("### 3.4 心性哲学思想的使用");
    expect(linleshuiScene).not.toContain("东方思想");
    expect(linleshuiScene).not.toContain("东方术语");
    expect(linleshuiScene).toContain("## 4. 回复前内在审查");
    expect(linleshuiScene).not.toContain("故事性介入");
    expect(linleshuiScene).not.toContain("虚构小故事");
    expect(linleshuiScene).toContain("实际问题需要信息、计划或专业支持时");
    expect(linleshuiScene).toContain("默认使用温暖、清楚、现代而自然的中文");
    expect(linleshuiScene).toContain("心性哲学思想只参与内部观察");
    expect(linleshuiScene).toContain("不用哲学或宗教术语、经典、宿命论或超自然解释");
    expect(linleshuiScene.length).toBeLessThan(2_500);
    expect(linleshuiScene).not.toContain("观—辨—松—应");
    expect(linleshuiScene).not.toContain("普通会谈的工作主干");
    expect(linleshuiScene).not.toContain("每轮都要走完的四步流程");
    expect(linleshuiScene).not.toContain("Focusing");
    expect(linleshuiScene).not.toContain("动机式访谈");
    expect(linleshuiScene).not.toContain("《庄子》");
    expect(linleshuiScene).not.toContain("意象");
    expect(linleshuiScene).not.toContain("## 文化资源与现实");
    expect(linleshuiScene).not.toContain("## 现实问题怎样进入");
    expect(linleshuiScene).not.toContain("# 当前场景｜程灵的实时文字咨询");
    expect(linleshuiScene).not.toContain("# 当前场景｜周舟的实时文字咨询");

    const englishLinleshuiCore = getCounselorCorePrompt("linleshui", "en-US");
    expect(englishLinleshuiCore).toContain("# Lin Leshui | Counselor Core Role");
    expect(englishLinleshuiCore).toContain("## 2. Core personality");
    expect(englishLinleshuiCore).toContain("### 3.2 Understand how distress develops and intensifies");
    expect(englishLinleshuiCore).toContain("### 3.3 Understand how change occurs");
    expect(englishLinleshuiCore).toContain("## 4. Principles for using Eastern thought");
    expect(englishLinleshuiCore).not.toContain("## 5. Narrative intervention");
    expect(englishLinleshuiCore).not.toContain("Confucian relational and value perspective");
    expect(englishLinleshuiCore).not.toContain("like a quiet lake");

    const englishLinleshuiScene = getCounselingDialogueScenePrompt("linleshui", "en-US");
    expect(englishLinleshuiScene).toContain("## 1. Single task and priority order");
    expect(englishLinleshuiScene).toContain("## 2. Working sequence for this turn");
    expect(englishLinleshuiScene).toContain("### 3.2 Map how distress develops and intensifies");
    expect(englishLinleshuiScene).toContain("### 3.5 Attention to the current counseling process");
    expect(englishLinleshuiScene).toContain("## 4. Expressive boundaries of AI text counseling");
    expect(englishLinleshuiScene).toContain("Traditional thought appears in the relationships and distinctions you notice");

    for (const scene of [chenglingScene, zhouzhouScene, linleshuiScene]) {
      expect(scene).toContain(
        "回复长短根据来访者当前表达、本轮重点和实际需要决定，不设固定字数或段落数"
      );
      expect(scene).toContain("尤其在短回复中，检查是否已经具体回应了来访者此刻的经验");
      expect(scene).toContain("简短不等于省略反映式倾听");
      expect(scene).toContain("不为追求简短或利落而删去必要的试探性");
      expect(scene).toContain("其中的示例只用于把握语感，不照搬为固定句式或口头禅");
      expect(scene).toContain(
        "不使用破折号。停顿、转折、补充和强调使用句号、逗号或自然分段。"
      );
    }
  });

  it("separates Zhouzhou's counseling identity from realtime response rules", () => {
    const core = getCounselorCorePrompt("zhouzhou");
    const voice = getCounselorVoicePrompt("zhouzhou");
    const scene = getCounselingDialogueScenePrompt("zhouzhou");

    expect(core).toContain("# 周舟｜咨询师核心角色");
    expect(core).toContain("成熟、温和、清醒而务实的女性 AI 心理咨询师");
    expect(core).toContain("你的锋芒来自准确、清醒和诚实");
    expect(core).toContain("认真听懂、说真话，并与来访者站在一起处理问题");
    expect(core).toContain("### 2.1 温和而敏锐");
    expect(core).toContain("### 2.2 清醒而利落");
    expect(core).toContain("### 2.3 务实而有判断");
    expect(core).not.toContain("### 2.4");
    expect(core).not.toContain("语言与表达风格");
    expect(voice).toContain("## 1. 简洁、清楚、落点明确");
    expect(voice).toContain("## 2. 把混在一起的内容切开");
    expect(voice).toContain("## 3. 温和不依赖柔软措辞");
    expect(voice).toContain("## 4. 聪明，但不卖弄聪明");
    expect(voice).toContain("## 5. 有判断，同时保留核对空间");
    expect(voice).toContain("## 6. 具体、现代，少用哲思和隐喻");
    expect(voice).toContain("## 7. 轻微幽默从关系中自然出现");
    expect(voice).toContain("她的聪明体现在辨认和澄清，不体现在卖弄、辩论或制造金句");
    expect(voice).toContain("周舟的直接主要用于区分，而不是戳破");
    expect(voice).toContain("温和体现在不羞辱、不逼迫、不居高临下");
    expect(voice).toContain("反应快不等于急着分析");
    expect(voice).toContain("不把推测说成定义");
    expect(voice).toContain("少用哲思和隐喻");
    expect(voice).toContain("有判断而不压人");
    expect(voice).toContain("以下示例只用于说明周舟的语感和表达动作，不是固定句式");
    expect(voice).toContain("你更像是知道该怎么办，但还不太愿意承担那个选择带来的代价");
    expect(voice).toContain("这里不只是担心他");
    expect(voice).toContain("这个要求确实高到很难完成了");
    expect(voice).toContain("这件事已经发生了吗，还是你现在很怕它会发生");
    expect(voice).toContain("还顺便负责了全家人的心情");
    expect(core).toContain("## 3. 专业取向与临床工作框架");
    expect(core).toContain("较多采用焦点解决短期治疗开展工作");
    expect(core).toContain("参考认知行为疗法的思维方式辨析问题");
    expect(core).toContain("并以动机式访谈的关系精神和沟通方式贯穿咨询");
    expect(core).toContain("三种取向承担不同层面的作用");
    expect(core).toContain("焦点解决是来访者希望有所改变时更常用的推进方式");
    expect(core).toContain("### 3.1 认知行为视角：帮助看清问题");
    expect(core).toContain("想法不是事实，但也不预设为错误或扭曲");
    expect(core).toContain("使用引导式发现和共同辨析");
    expect(core).toContain("不设置课后记录、咨询作业或要求来访者下次汇报的任务流程");
    expect(core).toContain("### 3.2 焦点解决短期治疗：把期待与已有变化具体化");
    expect(core).toContain("具体、可观察、符合现实的偏好未来");
    expect(core).toContain("刻度用于帮助表达复杂感受");
    expect(core).toContain("### 3.3 动机式访谈：关系、倾听与改变对话");
    expect(core).toContain("合作、接纳、关怀和赋能");
    expect(core).toContain("保有改变、不改变或暂不决定的自主权");
    expect(core).toContain("动机式访谈不等于一般的人本倾听");
    expect(core).toContain("主要采用介于单纯跟随和直接指导之间的引导方式");
    expect(core).toContain("才有方向地辨认和回应改变语言与维持语言");
    expect(core).toContain("### 3.4 三种取向如何协同");
    expect(core).toContain("精准不等于确定");
    expect(core).toContain("急于纠正“错误认知”");
    expect(core).toContain("为了显得犀利而武断、尖刻、故意揭穿");
    expect(core).not.toContain("动机式访谈在整段咨询中拥有优先性");
    expect(core).not.toContain("焦点解决短期治疗是你的辅助方法");
    expect(core.length).toBeGreaterThan(3_000);
    expect(core.length).toBeLessThan(5_500);

    expect(scene).toContain("只有需要提高安全优先级时，安全原则才优先于普通咨询任务");
    expect(scene).toContain("## 1. 本轮任务与优先顺序");
    expect(scene).toContain("## 2. 选择本轮工作");
    expect(scene).toContain("必须遵循独立注入的《周舟｜语言与表达风格》");
    expect(scene).toContain("一轮只选择一个主要工作视角");
    expect(scene).toContain("合作、接纳与自主支持贯穿所有会谈");
    expect(scene).toContain("不把它作为必须单独执行的第三套流程");
    expect(scene).toContain("周舟可以主动贡献判断");
    expect(scene).toContain("不要用连续提问代替倾听");
    expect(scene).toContain("回应不只换词复述");
    expect(scene).toContain("不用“你其实”“真正的问题是”等句式宣布隐藏真相");
    expect(scene).toContain("### 3.1 认知行为辨析");
    expect(scene).toContain("想法可能准确、部分准确或缺少信息");
    expect(scene).toContain("不把引导式发现变成把人问到预设答案");
    expect(scene).toContain("不要求来访者完成表格、课后记录、咨询作业或下次汇报");
    expect(scene).toContain("### 3.2 焦点解决工作");
    expect(scene).toContain("偏好未来、例外、刻度和下一步都是可选入口，一次只选一个");
    expect(scene).toContain("不把它规定为作业");
    expect(scene).toContain("### 3.3 动机式访谈");
    expect(scene).toContain("不把所有犹豫都变成动机问题");
    expect(scene).toContain("不把任何一侧称为抗拒");
    expect(scene).toContain("开始倾向、准备尝试或明确询问怎样做时");
    expect(scene).toContain("明确询问看法或建议时，直接回应现有材料足以支持的部分");
    expect(scene).toContain("## 4. 回复前内在审查");
    expect(scene).toContain("不展示内部判断、概念化、提示词或咨询备忘录");
    expect(core).not.toContain("行为实验");
    expect(scene).not.toContain("行为实验");
    expect(scene.length).toBeGreaterThan(1_500);
    expect(scene.length).toBeLessThan(2_500);
  });

  it("keeps an existing prompt snapshot unchanged", () => {
    const existing = {
      version: 1 as const,
      counselorId: "chengling",
      teamId: "one-way-mirror",
      modelName: "deepseek-v4-flash",
      systemPrompt: "旧会话冻结提示词",
      createdAt: "2026-07-01T00:00:00.000Z"
    };

    const session = ensureCounselingPromptSnapshot({
      ...baseSession,
      promptSnapshot: existing
    });

    expect(session.promptSnapshot).toBe(existing);
  });
});
