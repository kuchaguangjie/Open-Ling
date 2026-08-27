# Ling 咨询师包

Ling 咨询师包是一种只包含声明式配置、Prompt 和图片资源的扩展格式。咨询师包不执行 JavaScript 或其他代码，也不能直接访问数据库、API 密钥和用户文件。

本文件说明技术格式。专业责任、Prompt 要求和发布前检查见 [Ling 专业咨询师扩展开发规范](./professional-counselor-extension-spec.md)。

## 生成一个可运行的包

```bash
npm run counselor:create -- ./my-counselor my-counselor
```

命令会生成完整的 `manifest.json`、中英文 Prompt 和可替换的 PNG 占位图。如果目标目录已存在，命令会直接失败，不会覆盖原有文件。

## 本地导入

在 Ling 中打开“设置 → 咨询师扩展”，选择包含 `manifest.json` 的咨询师包文件夹。Ling 会先完成版本、Prompt、安全声明和资源路径验证，并显示发布者、理论取向和许可证预览；用户确认后，只复制清单中实际声明的 Prompt 和图片。候选稿、测试文件、隐藏文件和未声明的附带内容不会被导入。

已有本地会谈记录的导入咨询师不能直接移除，以避免历史会谈、概念化、督导、备忘录和来信失去所属咨询师。可以停用该咨询师，使其不再出现在新咨询选择中，同时继续保留全部历史资料。损坏或不兼容的包会被跳过，不会阻止 Ling 启动。

再次导入同一 `id` 时，只有版本号严格高于当前版本的包才会进入更新确认。更新只替换清单声明的正式文件；旧会谈继续使用创建时冻结的 Prompt snapshot，新咨询使用新版 Prompt。相同版本和降级导入会被拒绝，Ling 官方咨询师不能被本地包覆盖。

## Manifest 示例

下面展示 schema v1 的完整结构。示例中的 Prompt、名称、图片和许可证只是格式占位，不能直接作为专业咨询师发布。

```json
{
  "schemaVersion": 1,
  "id": "example-counselor",
  "version": "0.1.0",
  "engineCompatibility": ">=1.0.0 <2.0.0",
  "publisher": {
    "name": "Example Publisher",
    "website": "https://example.com"
  },
  "license": {
    "prompts": "CC-BY-4.0",
    "assets": "CC-BY-4.0"
  },
  "approach": "integrative",
  "localizations": {
    "zh-CN": {
      "name": "示例咨询师",
      "title": "整合取向 AI 咨询师",
      "description": "请替换为经过专业审阅的介绍。",
      "strengths": ["倾听", "澄清"],
      "opening": {
        "first": ["第一次见面，我们可以从你此刻最想说的地方开始。"],
        "second": ["我们又见面了，今天想从哪里开始？"],
        "returning": ["欢迎回来，我们可以按你的节奏继续。"]
      },
      "closings": ["今天先到这里，谢谢你愿意说这些。"]
    },
    "en-US": {
      "name": "Example Counselor",
      "title": "Integrative AI Counselor",
      "description": "Replace this with a professionally reviewed introduction.",
      "strengths": ["Listening", "Clarification"],
      "opening": {
        "first": ["We can begin with whatever feels most important right now."],
        "second": ["Welcome back. Where would you like to begin today?"],
        "returning": ["We can continue at your pace."]
      },
      "closings": ["We will stop here for today. Thank you for sharing this."]
    }
  },
  "prompts": {
    "counselorCore": {
      "zh-CN": "package://prompts/core-zh.md",
      "en-US": "package://prompts/core-en.md"
    },
    "counselingDialogue": {
      "zh-CN": "package://prompts/dialogue-zh.md",
      "en-US": "package://prompts/dialogue-en.md"
    },
    "counselorVoice": {
      "zh-CN": "package://prompts/voice-zh.md",
      "en-US": "package://prompts/voice-en.md"
    }
  },
  "safety": {
    "minimumPolicyVersion": "1",
    "additionalPolicies": ["package://policies/additional.md"]
  },
  "visuals": {
    "avatar": "package://assets/avatar.png",
    "portrait": "package://assets/portrait.png",
    "room": "package://assets/room.png"
  }
}
```

`approach` 当前接受：`emotion-dynamic`、`reality-structure`、`eastern-contemplative`、`integrative`、`emotion-focused`、`mindfulness-existential`。

`localizations.zh-CN` 与 `localizations.en-US` 都是必填项。每种语言都必须提供 `name`、`title`、`description`、非空 `strengths`、非空 `opening.first/second/returning` 和非空 `closings`。

## 关键声明

- Memory 由 Ling 统一管理。咨询师包不得声明、扩大或关闭记忆权限；基础资料和跨会谈备忘录是否进入上下文，只由 Ling 的用户设置和系统安全规则决定。
- Ling 的实时安全基线始终注入。`additionalPolicies` 只能追加规则，不能替换或削弱安全基线。
- `prompts.counselorCore` 与 `prompts.counselingDialogue` 必须同时提供 `zh-CN` 和 `en-US`；`prompts.counselorVoice` 可选，但声明的语言资源必须存在且非空。语言风格文件只负责表达层，不应用来复制理论核心或覆盖安全规则。
- 资源 URI 必须使用 `package://`，不能越出包目录。Prompt 只接受 `.md` / `.txt`，图片只接受 `.png` / `.jpg` / `.jpeg` / `.webp`。
- `manifest.json` 最大 256 KiB，单个 Prompt 最大 1 MiB，单张图片最大 10 MiB，全部已声明资源合计最大 64 MiB。可选 `openingSequence` / `closingSequence` 当前同样只能指向受支持的静态图片，不是视频或可执行动画。
- `engineCompatibility` 使用空格分隔的语义版本比较式，例如 `>=1.0.0 <2.0.0`。不包含当前 Ling 咨询师引擎版本的包会被安全跳过，不会影响应用启动。
- 每个通过验证的咨询师包都直接获得 Ling 完整的实时会谈、个案概念化、长期概念化、李燕云督导、咨询备忘录和会谈来信流程。包不声明可选 `capabilities`，也不能关闭或替换这套系统流程。

## 会谈快照与模型适配

创建会谈时，Ling 会把咨询师核心、共享咨询价值、实时会谈场景、可选语言风格、语言、包版本、内容哈希和模型运行契约写入会谈快照。更新咨询师包只影响之后创建的新会谈，既有会谈继续使用原快照。

每次模型请求仍由 Ling 注入当前咨询伦理和实时安全规则，并按预算加入基础资料、rolling summary、咨询备忘录与近期逐字消息。宿主根据模型能力选择 Prompt 编译方式和可信的供应商参数；咨询师包不能控制消息角色、上下文顺序、模型请求体或采样参数。

社区包的 Prompt 和图片由包发布者自行声明许可证。Ling 官方咨询师的名称、形象、Logo 和其他品牌素材不因 Apache-2.0 代码许可而授予第三方使用权。
