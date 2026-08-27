# 技术结构

本文只记录当前主线已经成立、会影响后续开发的结构事实。

## 技术栈

- Electron 34、React 19、TypeScript、Vite、Zustand；
- SQLite + `better-sqlite3`；
- OpenAI-compatible Chat Completions API，主线以 DeepSeek 为默认配置和主要验证目标；
- Vitest、Testing Library，以及少量 Electron/脚本等价验收；
- macOS、Windows 与 Linux 安装包由本地 Mac 和独立虚拟机构建；macOS 发行包经过 Developer ID 签名与 Apple 公证。App 只提供官网版本检查和下载提示，不执行应用内自动替换。

## 运行时边界

- **Renderer**：页面、交互状态、会谈展示和流式事件消费；不直接访问数据库，不保存完整 API Key。
- **Preload**：通过 `window.lingDesktop` 暴露受限能力，并把 renderer 调用映射到共享 IPC 契约。
- **Electron main**：窗口、SQLite、SecretStore、文件选择、导入导出、备份恢复、模型请求、上下文组装、后台整理和脱敏审计。
- **Core**：与 Electron/React 无关的咨询引擎、上下文预算、prompt、provider、summary、概念化、督导、备忘录、来信和 exporter。
- **Database**：schema、版本化 migration 和 repository。
- **Shared**：跨端类型、默认数据、IPC channel 和 validator。

页面不得直接访问数据库。新增跨端能力应先定义共享类型和 IPC 契约，再在 main、preload、renderer 三端接线。

## 咨询师包

程灵、周舟和林乐水已经通过版本化的内置咨询师包 registry 提供，不再由默认咨询师常量、会谈文案和 Prompt registry 各自维护一份身份配置。

咨询师包 v1 声明：

- schema 版本、包 ID、包版本与引擎兼容范围；
- 发布者和 Prompt/素材许可；
- 中英文介绍、理论取向、开闭场文案；
- 咨询师核心、实时会谈与可选语言风格 Prompt 资源；
- 安全基线版本、额外安全规则和视觉资源逻辑 ID。

Memory、共享咨询价值、实时伦理与安全、Prompt 编译、概念化、李燕云督导、咨询备忘录和来信由 Ling 固定提供，不属于咨询师包可开关能力。新会谈的 Prompt snapshot v5 冻结语言、咨询师包版本、Prompt 内容指纹、核心/场景/语言风格 Prompt 和模型运行契约；同 ID 包只允许更新到更高版本，旧会谈继续使用原有快照。历史 v1–v4 snapshot 继续按原有格式读取。实时伦理与安全规则每轮使用当前版本注入，不属于冻结的人格内容。v1 咨询师包仅加载声明式内容，不允许执行第三方代码、直接访问数据库或自行发起网络请求。完整开源边界见 [`architecture/open-source-framework-plan.md`](./architecture/open-source-framework-plan.md)。

## 核心数据流

### 会谈请求

```text
Renderer 输入
  → Preload / IPC
  → Main 读取会谈、模型设置和冻结快照
  → Core 按模型契约编译咨询师核心、共享价值、当前场景与语言风格
  → Core 注入当前伦理/安全规则，并按预算加入个人资料、咨询备忘录、摘要与近期消息
  → OpenAI-compatible Provider
  → 流式事件返回 Renderer
  → Main 持久化最终消息
```

长会谈使用 token-first 预算：保留能放下的最近原文，在达到阈值时生成或注入 rolling summary。ContextPlan audit 只写结构、预算和裁剪状态，不写会谈原文、完整 prompt 或密钥。

### 会谈结束

```text
结束会谈
  → 单次完整概念化
  → 必要时更新长期完整概念化
  → 李燕云独立督导
  → 原咨询师咨询备忘录
  → 咨询师来信
```

后台链路按咨询师串行运行，但不阻塞用户开始新会谈。新会谈只冻结创建当时已经 ready 的最近一份同咨询师备忘录，不在会谈中途热更新，也不跨咨询师共享。

## 目录职责

- `apps/desktop/src/main/`：Electron 主进程；`counseling/` 放会谈运行时与后台协调，`data/` 放导出备份，`security/` 放本地密码锁，`ipc/` 是统一 IPC 注册入口。
- `apps/desktop/src/preload/`：桌面能力 bridge。
- `apps/desktop/src/renderer/`：React App；`pages/` 放正式顶层场景，`features/` 放业务功能，`flows/` 放跨页面流程，`stores/` 放状态，`devtools/` 放仅开发环境可达的审阅页面。
- `packages/core/`：可独立测试的业务与模型逻辑；咨询域按 `conversation/`、`post-session/`、`documents/` 和 `shared/` 分组。
- `packages/database/`：本地数据库与 repository。
- `packages/shared/`：跨包契约和共享常量。
- `assets/`：生产使用的 App、品牌、字体、场景和人物素材；生成后被产品正式采用的运行时素材统一放在 `assets/runtime/`，不保留候选图和 QA 过程稿。
- `docs/`：当前产品说明、架构、机制、设计、决策、进度和协作说明。
- `scripts/`：仍需要人工运行的本地开发入口。

当前关键结构：

```text
apps/desktop/src/
├── main/{counseling,data,ipc,security}
├── preload/
└── renderer/{devtools,features,flows,pages,stores}

packages/core/src/counseling/
├── conversation/       # 实时会谈、上下文预算、Prompt 快照与摘要
├── post-session/       # 概念化、督导、备忘录与来信
├── documents/          # 导入资料上下文
└── shared/             # 咨询域通用纯逻辑

assets/runtime/          # App 实际引用的正式运行时素材
```

`sessionStore.ts` 保留 Zustand action、流式监听、定时器和会谈生命周期；无状态的类型、展示格式和消息辅助函数位于 `renderer/stores/session/`。IPC handler 本轮仍集中注册，避免拆动共享闭包与运行期协调顺序。

本次目录整理的边界、迁移映射和验收结果见 [`architecture/repository-restructure-plan.md`](./architecture/repository-restructure-plan.md)。

## 本地数据与安全

- 用户数据目录由 Electron `app.getPath("userData")` 决定。
- SQLite 保存 settings、sessions、messages、memories、imported documents、rolling summaries、prompt snapshots、session/long-term conceptualizations、session supervisions、consultation memos、consultation preparations、session letters 和 secrets fallback。
- 本地资料库使用独立数据密钥加密；启动密码或系统安全存储负责解锁该密钥，恢复短语用于重设密码。
- 完整备份包含本地资料和设置，不包含 API Key；恢复会替换当前资料库并重启 App。
- `.env`、密钥、真实数据库、个人资料、录音、照片、备份和导出文件不得提交。

## 已知限制

- `better-sqlite3` 的 Node/Vitest 与 Electron native ABI 不同，项目脚本会在入口间 rebuild。
- 主开发服务固定为 `127.0.0.1:45174` 且使用 strict port。
- API Key 与语音服务凭据通过 Electron `safeStorage` 使用操作系统安全后端加密，并独立于 SQLite 和备份文件保存。
- PDF/DOCX/OCR、资料管理和 chunk 检索尚未实现。
- 原生 SQLite 模块需要分别匹配 Node/Vitest、Electron 和目标操作系统架构；发布前必须在对应系统安装并冒烟验证。
