# Ling 提示词规则

更新日期：2026-09-12

本文是 Ling 提示词的唯一规则说明：提示词放在哪里、每层只负责什么、如何组装进请求，以及修改提示词必须遵守的约束。

规则用「必须 / 不得 / 应当」表述。这些约束多数由代码、测试或校验脚本强制，少数只靠人工遵守，后者在文末「已知缺口」中单列。

相关文档：[对话上下文核心机制](./conversation-context.md)、[记忆系统核心机制](./memory-system.md)、[咨询师包](../counselor-packages.md)、[专业咨询师扩展开发规范](../professional-counselor-extension-spec.md)。

## 为什么需要这套规则

### 与直接使用通用助手对话的区别

同一句「我今天很难受」，进入模型的东西完全不同：

| | 直接使用通用助手 | Ling |
| --- | --- | --- |
| system | 通用助手的隐藏提示词（有用、全面、结构化） | 约 270 行分层咨询师提示词 |
| 上下文 | 当前窗口历史 | 同一份，另加冻结的咨询备忘录、滚动摘要与基础资料 |
| 模型参数 | 服务方默认 | 能力表决定的消息布局、推理档位与采样参数 |
| 输出 | 直接显示，结束 | 本地加密保存；会谈结束后进入四条后场链路 |
| 跨会话 | 无 | 冻结的咨询备忘录是唯一的跨会话咨询记忆 |

每轮 system 提示词的实际规模（中文，不含注入的上下文）：

| 咨询师 | 行数 | 字符数 |
| --- | --- | --- |
| 周舟 | 272 | 9,836 |
| 程灵 | 250 | 8,742 |
| 林乐水 | 278 | 9,286 |

以 `deepseek-v4-flash` 为例：命中能力表的推理条目，Ling 会开启 thinking、下发 `reasoning_effort=high`、按对话档位采样，并使用 `reasoner-user-prefix` 布局把共同价值与场景任务前移到用户消息。在通用助手客户端使用同一模型时，以上任何一层都不存在。

### 差异的成因分布

| 差异 | 主因 |
| --- | --- |
| 不给建议、不结构化、不做正向收尾 | **提示词** |
| 人格稳定，一场会谈内不漂移 | 提示词 + 快照冻结 |
| 记得上一场会谈 | 后场链路，与提示词无关 |
| 长会谈不崩、不遗忘 | 运行时预算与摘要机制 |
| 危机时不漏也不过度触发 | 提示词 + 代码分级，两者都需要 |
| 后场产物格式不崩 | 代码校验、容错解析与重试 |
| 换模型不变质 | 能力表驱动的编译 |
| 会谈后来信、跨会话整理 | 产品流程 |

提示词文本真正不可替代的只有第一条：压制通用助手的默认行为（给建议、面面俱到、正向鼓励、总结收尾）。这一层代码拦不住，因为无法用规则判断「这句是不是在给建议」而不误伤。

其余各条提示词都做不到，只能由机制保证。工程量也印证了这一点：

```text
提示词 .md                     2,232 行
运行时实现 / 测试               2,172 / 1,530 行
后场链路实现 / 测试               993 /   894 行
```

代码中处处体现对提示词的不信任：风险路由的注释写明「正则漏检不能造成窗口」；滚动摘要必须通过结构校验；模型 JSON 必须容错解析；长度上限在代码里硬卡；来信称呼由代码生成。

还有一层反向依赖：场景提示词反复出现「先依据**独立注入**的《实时咨询安全原则》判断」「必须遵循**独立注入**的《语言与表达风格》」。这些句子之所以存在，是因为各层分别注入，模型看不到文件之间的关系。**提示词的内容已经被运行时的注入结构塑形。**

### 由此产生的规则

- 能在机制层确定保证的事，不得只写成提示词规则。提示词用于约束模型的行为倾向（给不给建议、怎么措辞、一轮推进几件事）；格式、长度、称呼、安全下限和跨会谈记忆必须由代码保证。
- 新增提示词规则前先判断：这是模型的行为倾向，还是可以判定的结构问题。后者应当落到 `contextBuilder`、`validate*` 或 `parse*` 中，并配测试。
- 判断改动方向：只搬提示词不搬机制，会像咨询师但长会谈漂移、无跨会话记忆、格式会崩；只搬机制不搬提示词，框架仍在但会退回通用助手口吻。缺提示词第一轮就能察觉，缺机制要到长会谈才暴露。

## 1. 文件位置

提示词是 Markdown 资产，位于 `packages/core/src/prompts/`，按**职能**分目录，不按咨询师分目录。中文文件在目录根部，英文在 `en-US/` 下镜像同名路径。

```text
packages/core/src/prompts/
├── counselor-cores/      # 咨询师是谁：身份、人格、理论取向、临床判断边界
├── counselor-voices/     # 咨询师怎么说话：语感、句式、允许与禁止的表达
├── tasks/                # 这一轮做什么：实时对话与会谈后任务
├── policies/             # 实时安全原则、咨询伦理
├── shared/               # 三位咨询师共用的咨询立场
├── supervisor-cores/     # 独立督导师（李燕云）人格
├── teams/                # 团队场景（占位，当前为空）
├── backstage/            # 后台 agent（占位，当前为空）
└── LICENSE.md            # 生产提示词的开放许可范围
```

当前正式文件：

| 目录 | 文件 | 说明 |
| --- | --- | --- |
| `counselor-cores/` | `chengling.md`、`zhouzhou.md`、`linleshui.md` | 各约 105–126 行 |
| `counselor-voices/` | 同上三个 | 各约 53–59 行，**只有 zh-CN** |
| `tasks/` | `counseling-dialogue-{chengling,zhouzhou,linleshui}.md` | 实时对话场景 |
| `tasks/` | `session-conceptualization.md`、`long-term-conceptualization.md`、`post-session-supervision.md`、`next-session-memo.md`、`session-letter.md` | 会谈后五个任务 |
| `policies/` | `realtime-safety.md`、`counseling-ethics.md` | 每轮实时注入 |
| `shared/` | `counseling-values.md` | 共用咨询立场 |
| `supervisor-cores/` | `li-yanyun.md` | 督导师人格 |

规则：

- 提示词必须落在上述目录内，不得写进 TypeScript 常量或数据库。
  例外：滚动摘要、资料摘要、模拟来访者的提示词当前写在代码里（见第 7 节）。
- 正式提示词文件必须是 `.md` 或 `.txt`，单个不超过 1 MiB，路径不得含 `..` 或指向上级目录。
  第三方咨询师包还必须满足 `realpath` 不越出包目录的约束。
- 生产提示词若对外开源，必须逐个登记在 `LICENSE.md`。草稿、评审记录和评测数据不得列入。

## 2. 清单与加载

提示词不硬编码在调用点，而是由咨询师包清单声明资源 URI：

- `packages/shared/src/counselors/builtinCounselorPackages.ts` 用 `builtin://prompts/<相对路径>` 声明内置咨询师使用哪些文件，中英各一份。
- 第三方包用 `package://` 引用自己目录内的文件。内置包引用 `package://` 或第三方包引用 `builtin://` 都必须报错。
- 加载与缓存集中在 `packages/core/src/prompts/counselorPromptRegistry.ts`。

规则：

- 新增提示词入口必须同时提供 `zh-CN` 与 `en-US`（`counselorCore`、`counselingDialogue` 强制；`counselorVoice` 可选但声明了就必须存在且非空）。
- 读取必须经过 registry 的 `locale` 参数。Core 层不得为了取语言去读 Renderer store，语言必须由调用链显式传入。

## 3. 分层规则

六个层各自只负责一件事，**不得跨层重复同一套规则**：

| 层 | 只负责 | 不得负责 |
| --- | --- | --- |
| 咨询师核心 | 身份、人格、理论取向、稳定的临床判断原则 | 本轮怎么回应、具体措辞 |
| 语言风格 | 表达层：语感、句子长度、允许与禁止的表达 | 理论核心、安全规则、任务目标 |
| 场景任务 | 本轮优先级、工作路径、输出格式 | 复述人格与理论 |
| 共同咨询价值 | 三位咨询师共用的立场（先理解再判断、理解可被修正等） | 任何一位咨询师的个性 |
| 实时安全原则 | 现实危险的判断与处置立场 | 普通咨询策略 |
| 咨询伦理 | 专业关系与 AI 能力边界 | 危机处置 |

规则：

- 风格层的示例句必须显式声明「只用于把握语感，不是固定句式，不要照搬」。缺少这句会显著增加模型复用例句的概率。
- 场景任务必须写明「本轮只处理一个最重要的目标」，并列出本轮**不做**什么。多目标并列是本项目最容易出现的提示词退化。
- 场景任务必须写明与独立注入文档的协作关系（安全原则何时优先、风格文档如何被引用），因为各层是分别注入的，模型看不到它们在文件系统里的关系。
- 人格层不得携带会话状态或具体记忆，否则无法跨会谈复用和冻结。

## 4. 组装规则

组装入口是 `packages/core/src/counseling/conversation/contextBuilder.ts` 的 `buildCounselingMessages()`；调用点在 `apps/desktop/src/main/ipc/index.ts`。

### 4.1 冻结与实时

- 会谈创建时必须冻结：咨询师核心、共同咨询价值、场景任务、语言风格、团队提示、语言、咨询师包版本、内容哈希、模型运行契约。
- 咨询伦理与实时安全规则**不得冻结**，每轮按当前版本实时注入。这样安全边界的修正能立刻作用于所有进行中的会谈。
- 咨询备忘录使用独立快照冻结，一场会谈从创建到结束只读创建时冻结的那一份，不得中途热更新。
- 同一会谈的每一轮都必须读取同一份冻结内容；继续已结束的会谈沿用原快照。改提示词只影响之后新建的会谈。

### 4.2 消息顺序

当前快照版本（v5）的对话请求顺序：

```text
1. system  <咨询师>        咨询师核心 + 共同价值 + 咨询伦理 + 团队 + 场景任务 + 实时安全
2. system  basic-profile   用户主动填写的基础资料（可选，独立 2k 预算）
3. system  rolling-summary 本次会谈被裁剪的较早脉络（仅裁掉原文时注入）
4. system  consultation-memo 冻结的咨询备忘录（可选，独立 4k 预算）
5. system  <咨询师>-voice  语言风格
6. system  safety-emphasis 危机原则强调（仅风险路由命中时）
7. …      逐字消息         预算内的最近原文与当前用户消息
```

规则：

- 咨询伦理与实时安全必须位于咨询师 system 消息内，保持最高约束层级。风险路由只允许**追加**强调段，不得移除完整策略。
- 优先级声明必须写在**注入消息的正文开头**，不能只写在某个提示词文件里。例如基础资料消息必须自带「当前用户本轮表达始终优先」，备忘录必须自带「不是事实档案、诊断结论或咨询计划，理解可以被修正或撤回」。
- 团队提示当前为空串，`teams/` 三个占位文件不得被视为可用能力。
- 历史 v1–v4 快照必须继续按原格式读取，其中 v4 的语言风格已合并在 `systemPrompt` 内，不得再单独注入当前版本风格文件。

### 4.3 模型编译

同一份提示词在不同模型上使用不同的消息布局，由 `packages/core/src/providers/modelCapabilityTable.ts` 的能力表决定：

| compilerId | 触发条件 | 布局 |
| --- | --- | --- |
| `chat-system` | 默认（deepseek-chat、qwen3、grok 等） | 全部约束留在一个 system 消息 |
| `reasoner-user-prefix` | 模型命中推理能力项且 reasoning effort ≠ none（deepseek-reasoner、gpt-5/o 系列、glm-5.2+、kimi-k2.5+） | system 只留咨询师身份；共同价值与场景任务前缀到最后一条用户消息前 |
| `chat-split-system` | 环境变量 `LING_CHAT_SCENE_LAST=1` | 共同价值与团队、场景任务拆成独立 system 消息 |

规则：

- 提示词不得依赖固定的消息位置。文档化的语义结构不承诺所有模型使用相同布局。
- 新增模型必须在能力表登记，未识别模型会告警、不下发推理参数并回落到 `chat-system`。
- 厂商私有请求体参数（`thinking` / `reasoning_effort` / `thinking_budget`）只允许在 host 白名单或 `remoteProvider` 匹配时下发，否则扣留。
- 采样参数按场景取固定档位：对话 `temperature 0.7 / top_p 0.95`，会谈后任务 `temperature 0.2 / top_p 1`，评测 `temperature 0 / seed 20260825`。不接受采样参数的模型不得下发温度。

## 5. 上下文预算规则

预算定义在 `packages/core/src/counseling/conversation/contextBudgetPlanner.ts`。

```text
模型上下文窗口估计        1,000,000
本次会谈历史原文预算         80,000
滚动摘要预热阈值             40,000
滚动摘要增量更新阈值         12,000
当前用户长输入提醒阈值       20,000
当前用户消息硬上限           80,000
基础个人资料预算              2,000
咨询备忘录预算                4,000
```

规则：

- 历史超预算时必须从最新消息向前保留；只有确实省略了较早原文且摘要可用时才注入滚动摘要。
- 单条消息即使超过预算也必须保留最新一条，不得把当前用户消息裁掉。
- 基础资料、备忘录各自受独立预算约束，截断必须插入显式截断标记，不得静默丢弃。
- 摘要不可用时必须保留最近原文并记录审计警告，不得阻断咨询。
- 每轮请求必须生成脱敏上下文审计。审计不得包含消息正文、提示词正文、资料正文、摘要正文、备忘录正文或 API Key。
- 超过 20,000 字符的单条输入必须自动转存为本地资料附件；资料超过 200,000 字符时必须改用事实性摘要并标注它不是完整原文。

## 6. 安全与伦理规则

- 实时安全策略必须每轮注入且永不缺席。风险分级只决定是否**额外**追加危机强调段，不得作为开关使用。这一条有明确的注释约束：正则漏检不能造成窗口。
- 风险分级必须能区分「现在正在发生的危险」「不确定」「无」，并且必须能识别虚构、比喻与第三者叙述并降级，避免把讨论电影剧情当成危机。
- 安全策略必须写明能力边界（不能读取位置、不能拨打电话、不能确认救援结果）与本地紧急资源。
- 咨询伦理必须写明 AI 身份诚实、专业关系边界，以及来访者表达爱慕或依赖时的处理立场。
- 咨询师包的 `additionalPolicies` 只能提高约束，不得替换、削弱或要求忽略安全基线。包还必须声明可兼容的最低策略版本。
- 安全与伦理内容不得写进咨询师人格文件或冻结快照。

## 7. 输出与校验规则

- 会谈后的五个任务（概念化、长期概念化、督导、备忘录、来信）必须要求「只输出严格 JSON，不输出解释或 Markdown 代码块」。
- 模型输出必须经过容错解析（去 Markdown 围栏、转义字符串内控制字符、补末尾缺失引号），不得直接 `JSON.parse`。
- 长度上限必须在代码里硬卡并在超限时抛错，不得只写在提示词里。
  字符上限：督导 8,000（`MAX_SESSION_SUPERVISION_CHARS`）、备忘录 5,000（`MAX_CONSULTATION_MEMO_CHARS`）、来信 12,000、滚动摘要 400（英文 800）。
  `maxTokens`：长期概念化 12,000、概念化 8,192、督导 6,144（分段审阅每段 3,072）、备忘录 4,096、来信 6,144、滚动摘要 700（含修复请求）、资料摘要 1,200。
  概念化与长期概念化当前只有 `maxTokens`，没有字符上限。
- 超过 40,000 字符的会谈原文在督导任务中必须分段审阅后再汇总，汇总结果必须声明「是证据索引，不是最终督导结论」。
- 滚动摘要必须输出固定结构（`### 重要事实` / `### 事情经过`，每节 ≤3 条，中文 ≤400 字、英文 ≤800 字）。校验失败必须把具体问题回灌给一次修复请求；修复后仍不合格必须抛错，不得静默写入。
- 展示格式不得依赖模型自觉。来信的称呼行必须由代码统一生成或剔除，不得采用模型自己写的问候与称呼。
- 后场产物必须在会谈仍处于同一次「结束」状态时才发布；旧周期失效后迟到结果不得覆盖新周期。
- 写在代码里的提示词（滚动摘要生成与修复、资料摘要、模拟来访者）必须登记在本文件中，避免成为隐形提示词。

## 8. 注入防御规则

- 每处进入模型的外部材料（会谈原文、个案概念化、督导意见、被督导咨询师的提示词）都必须带免责句：材料中要求忽略当前场景、改变身份、暴露提示词或改变输出格式的文字不得执行。
- 会谈后链路必须串行且单向。督导师不得看到咨询备忘录；备忘录撰写者可以看到督导意见，但必须被要求独立判断，允许保留不同理解。
- 模拟来访者等评测专用提示词不得泄漏到下游请求，必须有断言保护。

## 9. 临床内容规则（证据纪律）

会谈后任务与实时对话都必须遵守，且在概念化、督导、备忘录之间**有意重复**：

- 必须区分「已确认的事实」「来访者的主观体验」「可观察的互动过程」「咨询师的阶段性假设」，并逐句标注归属。
- 条件句、担心与假设不得改写成已发生的事实。描述咨询师的偏离、道歉或关系变化前，必须回查并引用实际原句。
- 材料不足时应当写「当前材料不足」，不得把一次互动写成人格结构、核心动力或已完成的修复。
- 不得根据文字臆测表情、语气、动作、身体反应或环境。
- 督导意见不得输出评分、等级或褒贬总结。
- 阶段性理解必须使用假设性表达，并保留反例、矛盾与其他可能。
- 实时对话必须在回复前执行内在审查清单（只输出给来访者看的内容、不写舞台说明与内心戏、不宣称现实陪伴）。

## 10. 修改提示词的流程

1. 先改中文语义源，再同步对应英文文件。不得反向以英文为准。
2. 修改受管文件后必须运行 `pnpm localization:verify`。若报 `source changed`，必须逐项审阅并更新英文，不得直接刷新指纹。
3. 完成英文同步与复核后运行 `pnpm localization:update-hashes` 确认新的对应关系。
4. 提交前至少运行 `pnpm typecheck`、`pnpm test -- --run`、`pnpm build`。
5. 涉及提示词内容变化时应当同步更新 `promptContentHash` 相关的评测基线。评测必须区分「临床内容变化」与「布局/安全注入变化」。

当前受 `docs/design/localization/source-manifest.json` 指纹管理的提示词共 15 对：

```text
counselor-cores/{chengling,zhouzhou,linleshui}
shared/counseling-values
policies/{counseling-ethics,realtime-safety}
supervisor-cores/li-yanyun
tasks/counseling-dialogue-{chengling,zhouzhou,linleshui}
tasks/{session-conceptualization,long-term-conceptualization,post-session-supervision,next-session-memo,session-letter}
```

规则：

- 修改已在快照中冻结的层（核心、价值、场景、风格）只影响新建会谈；不得试图让改动追溯影响进行中的会谈。
- 修改实时注入的层（伦理、安全）会影响所有会谈，必须按安全版本流程处理。
- 正式提示词必须由具备相应专业能力的人员审阅，并在至少一个普通 chat 模型和一个 reasoning 模型上验证，不得依赖特定消息位置或供应商私有参数。

## 11. 已知缺口

以下内容与上文的规则不一致，修改提示词时需要知道：

- `counselor-voices/` 只有中文。英文会谈拿不到语言风格层。
- `en-US/tasks/counseling-dialogue-{zhouzhou,linleshui}.md` 中仍写着默认使用 natural Chinese，会把英文会谈拉回中文。`pnpm localization:verify` 只检查字符指纹，检查不出这类语义残留。
- `teams/` 与 `backstage/` 六个文件是占位符，`getTeamPrompt()` 返回空串。团队与多 agent 目前只有接口。
- 禁止破折号、禁止舞台说明、禁止 emoji 等风格规则只写在提示词里，代码侧没有运行时强制或后处理。
- 会谈来信场景只注入咨询师核心、任务与语言风格，不注入咨询伦理与实时安全策略。是否有意如此需要确认。
- `packages/core/src/prompts/promptBuilder.ts` 已无人调用，是死代码。
- `docs/design/localization/README.md` 描述的 `zh-CN/` 子目录与 `promptManifest.ts` 未落地，实际结构以本文件第 1 节为准。

## 12. 权威来源

文档会滞后，以下文件是规则的最终依据：

| 主题 | 文件 |
| --- | --- |
| 文件读取、路径校验、缓存 | `packages/core/src/prompts/counselorPromptRegistry.ts` |
| 清单与资源 URI 声明 | `packages/shared/src/counselors/builtinCounselorPackages.ts` |
| 快照冻结与版本 | `packages/core/src/counseling/conversation/promptSnapshot.ts` |
| 组装顺序 | `packages/core/src/counseling/conversation/contextBuilder.ts` |
| 模型编译 | `packages/core/src/counseling/compiler/promptCompiler.ts` |
| 模型能力表与采样 | `packages/core/src/providers/modelCapabilityTable.ts` |
| 预算与审计 | `packages/core/src/counseling/conversation/contextBudgetPlanner.ts` |
| 风险分级 | `packages/core/src/counseling/guards/safetyRouter.ts` |
| 安全策略拼接 | `packages/core/src/safety/counselorPackageSafety.ts` |
| 滚动摘要与修复 | `packages/core/src/counseling/conversation/rollingSummary.ts` |
| 会谈后链路顺序 | `packages/core/src/agents/postSessionAgentPipeline.ts` |
