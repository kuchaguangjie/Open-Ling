# Ling

[简体中文](./README.md) · [English](./README.en.md)

**本地优先、面向连续会谈的开源 AI 心理咨询桌面应用。**

Ling 把 AI 会谈设计成一间可以反复回到的心理工作室，而不是一次性的问答窗口。它希望解决的不是“怎样让模型更快给出建议”，而是怎样让 AI 在持续对话中倾听、形成暂时理解、接受用户修正，并把已经形成的会谈脉络带到下一次见面。

[官方网站](https://ling.xiaoqunpsy.cn/) · [发行版本](../../releases) · [产品简报](./docs/brief.md) · [系统架构](./docs/architecture.md)

## 从前台体验到咨询连续性

用户进入的是完整的 Electron 桌面应用。等待室承担咨询师介绍、预约、知情说明和工作室导航；三间咨询室分别属于程灵、周舟和林乐水，她们具有不同的理论取向、注意方式和表达风格。故事簿、资料桌、历史记录、咨询师来信与湖畔花园，则构成正式会谈之外的阅读、回顾和过渡空间。

```text
进入工作室
  → 选择咨询师并完成知情说明
  → 开始流式会谈
  → 保存记录并在后台完成会谈后整理
  → 生成概念化、督导、咨询备忘录与来信
  → 下次会谈在用户允许的连续性范围内承接既有脉络
```

Ling 当前提供：

- 三位经过独立设计和持续测试的内置 AI 咨询师；
- 流式回复、停止、重试、历史读取、归档、继续咨询和跨会谈承接；
- `txt` / `md` 资料导入、超长文本资料化、Markdown 导出与完整本地备份/恢复；
- 会谈摘要、单次与长期个案概念化、独立督导、咨询备忘录和咨询师来信；
- 本地密码锁、恢复短语、阅读显示、语言、语音输入和咨询连续性设置；
- 用户自选的本地或远程模型，以及会谈、整理、督导和来信的模型分工。

Ling 用于情绪支持、自我探索和心理学学习，不提供医学诊断，也不替代专业心理咨询、精神科诊疗或现实中的紧急支持。

## 咨询系统如何工作

Ling 没有把咨询理论、安全要求和场景指令堆进一段不可维护的巨大 Prompt，而是将实时会谈拆成职责清楚、可测试的层次：

1. **咨询师核心**定义咨询师是谁、如何理解关系以及她的理论取向。
2. **共享咨询价值**约束三位咨询师共同的工作立场：不急于下结论，不把理论标签贴回用户身上，让理解在对话中被确认、修正或推翻。
3. **会谈场景与语言风格**把前两层落实为当前回合的倾听和回应方式。
4. **实时伦理与安全基线**由 Ling 在每次请求时注入，不被咨询师扩展或旧快照替换。
5. **上下文计划器**在明确的 token 预算内组装基础资料、rolling summary、上次咨询备忘录和近期逐字消息；当前表达始终优先。
6. **模型能力层**根据模型与可信服务端选择 system message、拆分 system message 或 reasoning user-prefix，并控制推理参数与采样策略。

创建会谈时，Ling 会冻结咨询师 Prompt、语言、包版本、内容哈希和模型运行契约。这样，同一场会谈能够保持稳定；咨询师包或应用升级后，旧会谈不会被新的角色设定悄悄改写。伦理与实时安全规则仍保持实时更新。

一场会谈结束后，后台流水线会从完整记录中形成单次概念化，并在长期脉络中更新个案理解；独立督导模块检查节奏、关系过程、遗漏和过度确定的结论；随后生成供下一次会谈使用的咨询备忘录，以及面向用户的咨询师来信。这些任务与前台界面解耦，整理期间仍可继续使用 App。

## 技术架构与数据边界

```text
Electron main
├── SQLite repositories and migrations
├── operating-system encrypted credential storage
├── model and speech-provider gateways
├── prompt compiler, context planner and safety routing
├── counseling lifecycle and post-session jobs
└── narrow, validated IPC contracts

React renderer
├── onboarding and local access lock
├── waiting room and counseling rooms
├── archives, letters, stories and local resources
└── model, privacy and accessibility settings
```

核心技术栈为 Electron、React、TypeScript、Vite、Zustand、SQLite 和 Vitest。

- 设置、会谈、消息、附件、整理结果和来信默认保存在本机；Ling 不提供自有云同步、遥测、广告或默认外部上传。
- Renderer 不直接访问数据库、系统文件或完整 API Key；这些能力只由 Electron 主进程通过受校验的 IPC 契约提供。
- API Key 使用操作系统安全存储加密，独立于 SQLite 和备份文件，不进入 Renderer。
- 使用本地模型时，模型计算可留在设备上；使用远程 API 时，完成功能所需的 Prompt、消息与受预算控制的上下文会发送给用户选择的服务商。
- 上下文审计只记录消息标识、角色、结构和 token 统计，不写入会谈正文。

## 桌面平台

官方 Electron 安装包面向：

- macOS Apple 芯片（ARM64）
- macOS Intel（x64）
- Windows x64
- Linux ARM64（DEB）

安装包可从[官方网站](https://ling.xiaoqunpsy.cn/)或仓库的[发行版本](../../releases)获取。App 只检查官网版本并提示下载，不会静默安装更新。

## 本地开发

需要 Node.js 22、npm，以及当前操作系统用于编译 Node.js 原生模块的工具链。

```bash
git clone https://github.com/Ling-Team/Open-Ling.git
cd Open-Ling
npm ci
npm run app
```

模型连接和 API Key 在 App 设置中配置，不需要把真实密钥写入源码或提交到 Git。

常用验证命令：

```bash
npm run typecheck
npm test -- --run
npm run build
npm run public-boundary:verify
```

`better-sqlite3` 在 Node/Vitest 与 Electron 下使用不同的原生 ABI；项目脚本会在测试、开发启动和打包前切换到对应版本。

## 咨询师扩展

Ling 咨询师包是声明式扩展，只包含 `manifest.json`、Prompt 和图片资源，不执行第三方 JavaScript，也不能访问数据库、API Key 或用户文件。

扩展包可以定义咨询师身份与关系定位、理论取向、实时会谈策略、中英文界面内容和视觉资源。共享咨询价值、伦理与实时安全基线、上下文预算、模型 Prompt 编译、记忆注入和会谈后任务由 Ling 统一管理。新会谈使用已安装的新版本，旧会谈继续使用创建时冻结的快照。

```bash
npm run counselor:create -- ./my-counselor my-counselor
```

详见[专业咨询师扩展开发规范](./docs/professional-counselor-extension-spec.md)和[咨询师包技术说明](./docs/counselor-packages.md)。

## 开源与许可

面向社区的源码发布在 [Ling-Team/Open-Ling](https://github.com/Ling-Team/Open-Ling)。项目使用清晰的代码、品牌和素材许可边界，便于开发者研究、验证和改进咨询系统，同时避免把官方角色形象误认为 Apache-2.0 代码的一部分。

软件代码采用 [Apache-2.0](./LICENSE)。Ling、群心心理工作室、官方 Logo、应用图标，以及程灵、周舟、林乐水的官方名称与形象不随 Apache-2.0 授权。详见[品牌与商标政策](./TRADEMARKS.md)、[素材许可说明](./ASSETS_LICENSE.md)和[第三方通知](./THIRD_PARTY_NOTICES.md)。

官方发行和版权主体为上海啸群教育科技有限公司；`Ling-Team` 是项目维护账号，“群心心理工作室”是 App 内的 AI 咨询师团队设定。

## 文档与联系

- [项目进度](./docs/progress/README.md)
- [公开发布检查清单](./docs/open-source-release-checklist.md)
- [项目身份规范](./docs/project-identity.md)
- GitHub：[Ling-Team](https://github.com/Ling-Team)
- 邮箱：openling@xiaoqunpsy.cn
- 官网：[ling.xiaoqunpsy.cn](https://ling.xiaoqunpsy.cn/)
