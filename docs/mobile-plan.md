# 移动端方案分析

更新日期：2026-09-12
状态：分析稿。未做任何代码改动，不含任务拆分与工期。
比较对象：Capacitor、Tauri 2、Wails v3。

## 0. 结论

**可行，推荐 Capacitor；不推荐为此迁移到 Tauri 或 Wails。**

| 方案 | 排序 | 一句话 |
| --- | --- | --- |
| **Capacitor** | **推荐** | 后端就是 TypeScript，`packages/core` 几乎原样复用；移动端多年生产验证 |
| Tauri 2 | 备选 | 后端是 Rust，本项目要重写近一万行逻辑与测试；仅在 `core` 因其他原因已迁 Rust 时才划算 |
| Wails v3 | 不推荐 | 后端是 Go，重写代价与 Tauri 同级；而**移动端仍是 experimental**，成熟度低一档 |

三条支撑判断：

1. **真正的障碍与框架无关。** 加密数据库、161 MB 本地语音模型、会谈后整理在移动端跑不完、自带 API Key 的移动端上手流程——这四件事换任何框架都要重新解决，换框架解决不了任何一件（第 5 节）。
2. **体积论在本项目不成立。** 包体积由 363 MB 的 `assets/` 决定，不由运行时决定。三个方案的安装包基线差异（几 MB 到二十几 MB）在总盘子面前都是噪音（第 4 节）。
3. **选型的真正判据是「后端语言离现有 TypeScript 有多远」。** `packages/core`（4,826 行实现 + 4,347 行测试，产品的心脏）是 TypeScript 且**零 Electron 依赖**。Capacitor 距离为零，Tauri 是 Rust、Wails 是 Go，两者都要在另一种语言里重建这套约束。

**建议的实现形态：桌面端保持 Electron 不动，只新增移动端 Capacitor 工程。** 这与外部调研中反复出现的「Tauri desktop + Capacitor mobile 共享同一套 Web 代码」是同一个思路，只是本项目的桌面端已经存在且工作正常，不需要动它，风险更低（第 6 节）。

## 1. 现状：需要迁移的代码有多大

实测（`grep` + `wc -l`，不含 `node_modules`）：

| 层 | 实现 / 测试行数 | Electron 依赖 | 说明 |
| --- | --- | --- | --- |
| `packages/core` | 4,826 / 4,347 | **0** | 提示词、上下文、预算、后场链路；产品核心 |
| `packages/shared` | 2,052 / 653 | 0 | 类型与 IPC 契约（69 个 channel） |
| `packages/database` | 2,516 / 1,858 | 0 | SQL、repository；驱动是原生插件 |
| `apps/desktop/src/main` | 6,131 / 2,581 | 12 个 API | 进程、窗口、IPC 实现、语音、安全存储 |
| `apps/desktop/src/preload` | 319 / 0 | 2 个 API | 单文件 `index.cts`，17.8 KB |
| `apps/desktop/src/renderer` | 22,561 / 11,047 | 仅 `window.lingDesktop` | 33 个文件引用，12 个命名空间 |

Electron 运行时 API 的实际用量（来自全部 `from "electron"` 导入语句）：

```text
app  BrowserWindow  contextBridge  dialog  ipcMain  ipcRenderer
Menu  net  protocol  safeStorage  screen  shell
```

共 12 个，分布在 18 个文件。这个接触面**很窄**。

Renderer 通过桥接层接触主进程的部分，只有 12 个命名空间：

```text
accessLock  consultationPreparations  counseling  dataExports  documents
localBackups  messages  sessionLetters  sessions  settings  updates  usage
```

**换壳的边际成本集中在一个很小的接口面上，这是本项目做移动端最有利的一点。**

### 1.1 `packages/core` 的唯一硬依赖

`packages/core` 的非测试代码只用四个 Node 内置模块，且集中在 3 个文件：

| 文件 | 用到的模块 | 移动端是否需要 |
| --- | --- | --- |
| `prompts/counselorPromptRegistry.ts` | `fs` `path` `url` | **需要** |
| `counselors/directoryCounselorPackageLoader.ts` | `fs` `path` `crypto` | 不需要（第三方咨询师包的目录加载） |
| `counselors/counselorPackageInstaller.ts` | `fs` `path` | 不需要（目录安装能力） |

后两个是第三方咨询师包从本地目录安装/加载的能力，移动端不提供这个入口，可以直接不打包。

所以**真正必须解决的只有 `counselorPromptRegistry.ts` 一个文件**。它用 `readFileSync` 加 `import.meta.url` 定位提示词文件：

```ts
const promptModuleDir = dirname(fileURLToPath(import.meta.url));
const prompt = readFileSync(filePath, "utf8").trim();
```

构建期由 `scripts/copy-prompt-assets.mjs` 把 `packages/core/src/prompts/` 下的 `.md` 拷进 `dist-electron/`，保证运行时它们是磁盘上的真实文件。

移动端要改的就是这一处：把 39 个提示词 `.md`（外加 `LICENSE.md`）在打包期内联成模块（构建期生成 `prompts.generated.ts`），或走平台的 asset 读取接口。**改动范围是一个文件加一个构建脚本**，`counselorPromptRegistry` 的路径校验、缓存、1 MiB 上限等逻辑可以整体保留。

## 2. 三个方案

### 2.1 Capacitor

**架构**：原生外壳 + 系统 WebView，业务逻辑跑在 WebView 里的 TypeScript，原生能力通过插件（TypeScript + Swift/Java）暴露。

**对本项目的意义**：后端语言与 `packages/core` 完全一致。1.1 节那一个文件的改动，就是移动化的全部核心适配成本。

**关键匹配点**：`@capacitor-community/sqlite` 的原生 iOS / Android 端**就是用 SQLCipher**，而它的 Electron 端用的正是 `better-sqlite3-multiple-ciphers`——与本项目现在使用的加密方案是同一套。这大幅降低了加密数据库这一块的迁移不确定性。

**状态**：Capacitor 8 于 2025-12 发布；社区 SQLite 插件 v8.1.1（2026-08）已支持 Capacitor 8。多年生产验证，插件生态成熟，可兼容大部分 Cordova 插件。

**主要代价**：

- **信任边界要改口**。业务逻辑在 WebView 中，API Key 必须能被 JS 读到，`docs/brief.md` 那条「不进入 Renderer」的承诺不再成立。缓解办法是用原生 HTTP 插件承担请求发送，但那需要把 `core` 的 provider 层切开（见 5.1）。
- **App Store 4.2 风险**。WebView 外壳类应用有被拒风险，远程 URL 模式尤其明显。这条 Tauri 同样有，不是 Capacitor 独有。
- WebView 的性能上限——但本项目的瓶颈是 LLM 网络调用，不是渲染。

### 2.2 Tauri 2

**架构**：Rust 后端 + 系统 WebView，前端经 `invoke` 调用 Rust 命令。移动端 Rust 编译为静态库经 FFI 调用。

**状态**：移动端 API 在 v2.0.0（2024-10）起稳定，现为 2.11 系列；有 30+ 官方插件；2024-08 经 Radically Open Security 独立安全审计，采用 capability 白名单、默认拒绝的权限模型。

**但对「移动端生产可用」这个说法要打折扣**——外部调研中的实际反馈：

- Tauri 官方自己说过 2.0「不是 mobile as first-class citizen 的版本」，移动端专属插件与文档相对稀疏。
- 有跨平台调研仓库报告 Tauri 2 iOS 在真机上出现黑屏、`PhaseScriptExecution` 构建失败、模拟器与真机行为不一致，结论是 Tauri iOS「实验性，未达生产可用」，并建议 **Tauri 用于桌面、Capacitor 用于移动**。
- 2026 年仍有资料把 Tauri 2 Mobile 标为 beta。

**对本项目的意义**：`packages/core` 那 4,826 行实现与 4,347 行测试要在 Rust 里重建。这些测试覆盖提示词组装顺序、上下文预算边界、滚动摘要结构校验、后场链路时序——**是产品行为的真实约束，不是脚手架**。

**它唯一实在的优势**：Rust 后端持有密钥并直接发 HTTP，**能保持现有的信任边界**（5.1）。

### 2.3 Wails v3

**架构**：Go 后端 + 系统 WebView，单进程内存桥接（无 JSON 序列化），能从 Go 自动生成 TypeScript 绑定。Android 侧 Go 经 cgo 编成 `libwails.so`，过 JNI 加载。

**状态**：**v3 目前是 beta**。beta.0 于 2026-08-02 发布，2026-09-05 到 beta.16；**v2 才是当前的稳定版**。官方状态页写明移动端（iOS / Android）支持 **experimental**，且「不阻塞桌面 Beta」——即它不在兼容性承诺范围内，文档原话是 API 与构建流程「在正式版前可能大幅变化，生产环境使用风险自负」。

**对本项目的意义**：

- 后端是 Go，`packages/core` 同样要整体重写。**语言换成 Go 不会让这件事变简单。**
- 自动生成 TS 绑定确实对得上 `packages/shared` 那 69 个 channel 的契约，但它解决的是**桥接层的类型安全**，不是**核心逻辑能否复用**。省下几十行类型定义，付出近万行逻辑加测试。
- 原生依赖不是死路：sherpa-onnx 官方有 Go 绑定且支持 Android，SQLCipher 在 Go 侧需要 cgo 绑定。真正的摩擦在 cgo 交叉编译工具链（Android SDK API 35 + NDK r26+ + JDK 21 + Go 1.24+）。
- 安全模型是单进程内存桥接，**无公开的独立安全审计**。对本项目这种持有加密数据库与 API Key、还内置危机干预话术的应用，比不上 Tauri 的进程隔离加 capability 纵深防御。
- 移动端限制：不支持多窗口、菜单与系统托盘为空操作、iOS 不支持保存对话框。

**唯一会让结论翻转的情形**：团队已有 Go 背景。那时学习成本从「重学语言 + 生态」降到「重学框架」。

## 3. 三方案对照

| | Capacitor | Tauri 2 | Wails v3 |
| --- | --- | --- | --- |
| 后端语言 | **TypeScript** | Rust | Go |
| 与 `packages/core` 的距离 | **零** | 需重写 | 需重写 |
| 移动端状态 | 多年生产验证 | API 稳定，但社区反馈真机问题多、插件稀疏 | **experimental**，明确不在兼容承诺内 |
| 版本成熟度 | Capacitor 8（2025-12） | 2.11 系列（移动端自 2024-10） | **beta.16**，v2 才是稳定版 |
| 独立安全审计 | 无 | **有**（2024-08，Radically Open Security） | 无 |
| 进程模型 | 单进程 WebView | 多进程 + capability 白名单 | 单进程内存桥 |
| 安装包基线 | 系统 WebView，量级与 Tauri 相当 | 3–15 MB（core <600 KB） | 8–25 MB（Go 静态链接 runtime/GC） |
| 插件生态 | **成熟** | 桌面丰富、移动稀疏 | 较少 |
| 上手成本 | 约 1–2 周（Web 开发者） | Rust 约 3–6 个月 | Go 曲线低于 Rust，但移动端生态更小 |
| 桥接与类型 | 插件 bridge | `invoke` + JSON 序列化 | 单进程内存桥 + **自动生成 TS 绑定** |
| 本项目的复用度 | `core`+`shared` 几乎原样 | 全部重写 | 全部重写 |
| 对信任边界（5.1） | **需改口**或加原生 HTTP 插件 | **可保持** | 名义可保持，但缺纵深防御 |

上表的安装包与上手成本数字来自外部二手来源（第 9 节），**未在本项目实测**，仅用于量级参考。Wails 的体积数字为厂商自报，未独立验证。

## 4. 为什么体积论在本项目不成立

Tauri 与 Wails 的核心卖点都是「不打包 Chromium，安装包从上百 MB 降到十几 MB」。但本项目的体积构成是：

```text
assets/runtime/lobby                             79M
assets/runtime/counselor-portrait-motion         45M
assets/runtime/counselor-opening-portraits       17M
assets/runtime/counseling-room-backgrounds       12M
assets/runtime/{q-style-art,avatars,launch,...}  16M
assets/models/voice (sherpa-onnx ASR)           161M
assets/fonts                                     18M
assets/app                                       18M
--------------------------------------------------
assets 合计                                     363M
```

**包体积由 assets 决定。** 换框架省下的是运行时的十几 MB，占总体积比例很小。

这带来一个与框架无关的必做项：**移动端必须改成按需下载资源**。语音模型已经是分片设计（`encoder.int8.onnx.part-00`、`.part-01`），这套分片 + 校验的思路可以复用到场景资源上。这件事三个方案都要做，工作量大于换框架本身。

## 5. 四个与框架无关的硬骨头

### 5.1 加密数据库与 API Key 的信任边界

现状：`better-sqlite3-multiple-ciphers` + 数据密钥 + 恢复短语；`docs/brief.md` 明确承诺：

> 完整 API Key 只由 Electron 主进程读取，并通过系统安全存储加密保存在独立凭据文件中；它不进入 SQLite、备份或 Renderer。

- **Tauri 路线**：Rust 后端持有密钥并发起 HTTP，**能保持这条边界**。
- **Wails 路线**：Go 后端名义上同样能保持，但单进程内存桥接没有 Tauri 那样的纵深防御。
- **Capacitor 路线**：若后端逻辑跑在 WebView 里，API Key 必须能被 JS 读到，**这条承诺要改口**。缓解办法是用原生 HTTP 插件承担请求发送，但那需要把 `core` 的 provider 层切开。

移动端沙箱本身隔离性足够，实际风险不高，但这是**已经写进文档的设计原则**，改它需要明确决定，不能默默绕过。

### 5.2 本地语音模型 161 MB

`assets/models/voice/` 是 zipformer 三件套（分片编码器 + `decoder.onnx` + `joiner.int8.onnx` + `tokens.txt`），配套的分片下载、hash 校验、落地逻辑在 `apps/desktop/src/main/voice/localVoiceModel.ts`（含 `localVoiceWorker.ts`）。

移动端有更省的方案：Android `SpeechRecognizer` / iOS `SFSpeechRecognizer`。而且项目已经有腾讯、阿里、豆包三路云端语音会话（`tencentVoiceSession.ts` 等），走 WebSocket，**天生跨平台，零改动**。

**移动端第一版直接砍掉本地 ASR 是合理取舍。**

### 5.3 会谈后整理在移动端跑不完

会谈后的整理是长时间串行的 LLM 调用。`runPostSessionAgentPipeline()` 串行执行四步：

```text
会话概念化 (maxTokens 8,192)  →  长期概念化 (12,000，按条件触发)
  →  督导 (6,144，超长会谈分段 3,072)  →  咨询备忘录 (4,096)
```

**会话信不在这条 pipeline 内**，由 `apps/desktop/src/main/ipc/index.ts` 中独立的一处调用生成（`maxTokens` 6,144）。两者共同构成「会谈后整理」，且都是长耗时调用。

- iOS：App 切后台几分钟即被挂起，这套整理基本跑不完。
- Android：需要 Foreground Service 常驻通知。

**这是产品假设问题，不是技术问题。** 桌面的假设是「会谈结束后后台慢慢整理，用户可以去做别的事」（`docs/brief.md` 第 6 条）。移动端这个假设不成立，要么改成「下次打开续跑」，要么让用户在前台等待——两种都会改变现有的体验设计。

### 5.4 移动端上手流程与应用商店审核

用户自带 API Key 并手填 `apiBaseUrl`，这套流程在桌面上可接受，**在手机上基本没人能走完**。这比技术选型更棘手，且没有现成答案。

审核方面：

- App Store **4.2 条（最低功能性）** 有拒绝 WebView 壳应用的风险。Capacitor 与 Tauri 都会遇到，不是某一家的劣势。
- 应用内置危机热线与自杀干预话术，心理健康类应用的审核要求会更高。

**这是「主要测 Android」的另一个理由**：Android 侧宽松得多，把 iOS 推到验证之后。

## 6. 推荐路径

### 第一步：桌面端不动，新增移动端 Capacitor PoC

目标只有一个——**在 Android 上跑通一次完整会谈**。现有 Electron 桌面端不改，避免同时动两条战线。PoC 范围：

| 项 | 做法 |
| --- | --- |
| 提示词 | 打包期内联成模块，绕开 `readFileSync` |
| 数据库 | `@capacitor-community/sqlite`（原生走 SQLCipher，与现有加密方案同源），保留 SQL 与 repository 逻辑 |
| API Key | 原生 HTTP 插件发请求，**保住「不进 Renderer」的边界** |
| 语音 | 砍掉本地 ASR，只留三路云端 WebSocket 语音（零改动） |
| 后场链路 | 改成前台跑 + 可续跑，不做后台常驻 |
| 资源 | 按需下载；复用语音模型已有的分片 + 校验思路 |
| 范围 | 不做第三方咨询师包安装、不做多窗口、不做自动更新 |

这一步能验证第 5 节里除审核之外的绝大部分风险，成本远低于换框架。**即使最终改主意要上 Tauri，这次移动端适配的成果（资源按需下载、后场链路续跑、语音策略、UI 适配）也都能带走。**

### 第二步：PoC 成立后再谈框架

届时应能回答那个决定了框架选择的问题：

> `packages/core` 继续留在 TypeScript，还是迁到 Rust / Go？

- **留在 TS** → Capacitor。选 Tauri 或 Wails 只会让你多写一遍后端，而且核心测试要重建。
- **迁到系统语言** → 才轮到 Tauri 与 Wails 比较；且那是一个需要重建整套测试基线的独立工程，**与「做移动端」不应绑在一起做。**

### 备选：先做移动端独立小范围

如果目标只是验证「手机端有没有人用」，可以考虑第三种范围：**移动端只做归档 + 来信 + 语音输入 + 简单对话**，不做完整会谈。这样 SQLCipher、后场链路、本地 ASR 三块全部绕开。

**但这个方案有一个当前不存在的前提：数据同步。** 项目现在没有任何云端同步能力，数据只在本机（`localBackups`、`dataExports` 都是本地能力）。移动端要看到桌面端的会谈归档与来信，必须先做同步机制——而那件事的工作量可能超过前两步。**所以这个备选只在「移动端独立产生数据」时成立**（例如手机上做语音日记、由移动端自己生成来信），不是桌面端数据的延伸。

## 7. Tauri 或 Wails 什么时候才是正确选择

不是「Tauri / Wails 不好」，而是它们解决的问题与本项目的现状不匹配。

**Tauri 2 会在下列情况下变成正确选择：**

- `packages/core` 因其他原因（性能、复用、多端一致性）**已经**迁到 Rust——那时 Tauri 的移动端支持是免费的。
- 需要同时覆盖桌面三平台 + 移动双平台，且愿意为此投入一轮完整的后端重写。

**Wails v3 的额外前提：**

- 团队**已经**有 Go 背景，且移动端支持已脱离 experimental、v3 正式 GA。

反过来，有一种想法**不构成**选 Tauri 的理由：以为「用 Rust 后端能更好地保护 API Key」。当前架构里密钥的隔离靠的是**进程边界与系统安全存储**，不是语言。Rust 能保住这条边界（5.1），但那是「Tauri 不会更差」，不是「Tauri 更好」。如果产品最终决定改成服务端代理 API Key（端上不再持有），这条边界本身就不存在了，各方案回到同一起点。

## 8. 需要确认的问题

以下问题会影响上文的结论，尚未确定：

1. **移动端的定位**是「完整会谈的第二入口」，还是「桌面端的配套/补充」？前者要做完第一步和第二步，后者可能只需要第 6 节的备选方案。
2. **是否接受在移动端放宽「API Key 不进入 Renderer」**？如果坚持不放宽，Capacitor 路线必须配原生 HTTP 插件。
3. **移动端是否必须支持无网络的本地模型**？如果必须，5.2 节的「砍掉本地 ASR」不成立，成本显著上升。
4. **会谈后整理能否接受延迟到下次打开**？这决定了后场链路要不要在移动端重做调度。
5. **团队是否有 Rust 或 Go 的背景？** 这直接决定 Tauri / Wails 的重估结论——若已有 Go 背景，Wails 需要的只是等它离开 experimental。

## 9. 依据

### 代码与文档（本项目实测）

| 结论 | 依据 |
| --- | --- |
| `packages/core` 零 Electron 依赖 | `grep -rn 'from "electron"' packages/core packages/shared packages/database` → 0 |
| core 的 Node 内置依赖集中 | 见 1.1 节的文件表 |
| 提示词按文件读取 | `packages/core/src/prompts/counselorPromptRegistry.ts`、`scripts/copy-prompt-assets.mjs` |
| 桥接面为 12 个命名空间 | `apps/desktop/src/renderer` 中 `lingDesktop.*` 的去重统计 |
| 信任边界 | `docs/brief.md`、`docs/decisions/2026-07-03-api-key-storage.md` |
| 后场链路时序与上限 | `packages/core/src/agents/postSessionAgentPipeline.ts`、`apps/desktop/src/main/ipc/index.ts`（来信）、`docs/core-mechanisms/prompt-rules.md` 第 7 节 |
| 云端语音已跨平台 | `apps/desktop/src/main/voice/{aliyun,tencent,doubao}VoiceSession.ts` |

### 外部资料

以下为二手来源。**第 2、3、4 节中的框架体积、上手成本、状态与审核判断均未在本项目实测**，仅用于量级与方向参考。

- [Wails v3 Beta: a new foundation for Go desktop applications](https://v3.wails.io/blog/wails-v3-beta/)
- [Wails Status（Current Status: Beta）](https://github.com/wailsapp/wails/blob/main/docs/src/content/docs/status.mdx)
- [Wails v3 Mobile Overview（experimental 说明与平台限制）](https://v3.wails.io/guides/mobile/)
- [Wails v3 Android 构建指南（NDK / JDK / libwails.so / JNI）](https://github.com/wailsapp/wails/blob/main/v3/ANDROID.md)
- [Tauri Mobile (iOS) | zudo-tauri-wisdom](https://takazudomodular.com/pj/zudo-tauri/docs/mobile/)
- [Cross-Platform Distribution 调研（Tauri iOS 真机问题，建议 Tauri 桌面 + Capacitor 移动）](https://github.com/trebeljahr/tiao/blob/main/docs/investigations/016-cross-platform-distribution.md)
- [Mobile Framework Decision Matrix 2026（Capacitor 83 / Tauri 80，上手成本对比）](https://www.oflight.co.jp/en/columns/mobile-framework-decision-matrix-2026)
- [capacitor-community/sqlite（原生 SQLCipher，Electron 端用 better-sqlite3-multiple-ciphers）](https://github.com/capacitor-community/sqlite)
- [2026 主流 WebView 桌面框架横评：Electron、Tauri、Wails 怎么选？](https://www.codef.cc/webview-desktop-framework-horizontal-review.html)
- [Tauri v2 vs Electron 2026: The Honest Comparison](https://www.buildmvpfast.com/blog/tauri-v2-vs-electron-desktop-apps-2026)
- [Electron vs Tauri 2026: Bundle Size, RAM, Security and Team Fit](https://www.pkgpulse.com/guides/electron-vs-tauri-2026)
- [sherpa-onnx（支持 Go 与 Android）](https://github.com/k2-fsa/sherpa-onnx)
