# 仓库目录拆分方案

日期：2026-07-15

状态：已完成，并于 `090685c` 合入 `main`。

## 目标

在不改变功能、界面文案、IPC channel、共享类型、数据库 schema、持久化格式和模型上下文顺序的前提下，让目录按业务职责而不是开发过程组织。

本次重构只允许三类修改：

1. 移动文件并更新导入路径；
2. 把无状态常量、类型、展示组件或纯函数抽到同一业务目录；
3. 为原公共入口保留稳定的统一导出。

禁止顺手修改业务行为、调整 UI、改文案、改数据结构或引入新框架。测试只允许更新已经脱离当前生产 UI 的旧断言，不以修改测试掩盖行为回归。

## 当前问题

- 原 `assets/generated/` 已经只剩生产素材，但目录名仍像临时生成区，无法区分运行时资产和过程稿。
- Renderer 同时使用 `pages/`、`features/`、`flows/`、`stores/` 表达业务边界；设置功能分散在三个平级页面目录中，Dev-only 页面混在正式页面里。
- Electron main 的安全、数据、咨询运行时文件全部平铺，`ipc.ts` 同时注册所有业务域。
- `packages/core/src/counseling/` 同时放实时会谈、上下文、会后整理、资料处理和通用模型解析。
- `sessionStore.ts` 同时管理会谈目录、生命周期、流式请求、消息变更和展示格式；直接拆 Zustand action 风险较高。

## 目标结构

```text
apps/desktop/src/
├── main/
│   ├── counseling/       # 会谈运行时、上下文审计、会后整理协调
│   ├── data/             # 导出、备份
│   ├── security/         # 本地密码锁
│   ├── ipc/              # IPC 统一注册入口
│   ├── index.ts
│   └── window.ts
└── renderer/
    ├── devtools/         # 仅 DEV 可达的视觉审阅页面
    ├── features/
    │   ├── settings/     # 设置壳、系统设置、记忆设置
    │   └── ...
    ├── flows/            # 跨页面咨询流程
    ├── pages/            # 正式顶层页面与大型场景
    └── stores/
        └── session/      # store 公共入口与无状态辅助模块

packages/core/src/counseling/
├── conversation/        # 实时请求、prompt snapshot、上下文预算、摘要
├── post-session/        # 概念化、督导、备忘录、来信
├── documents/           # 导入资料上下文
└── shared/              # 模型 JSON、标题、流式结果等通用纯逻辑

assets/runtime/           # App 实际打包或运行时引用的正式素材
```

## 实施阶段

### 1. 运行时素材与 Dev 工具

- `assets/generated/` 整体更名为 `assets/runtime/`，同步更新 TS/TSX/CSS/HTML 和仍保留的素材说明。
- 把 `DialogueStageDesignDemoPage`、`SidebarDesignDemoPage` 与专用样式移动到 `renderer/devtools/`。
- 保留查询参数和 `App.tsx` 的 DEV 门禁，页面行为不变。

验收：生产构建可以解析全部素材；Dev 查询参数仍通过类型检查和现有测试。

### 2. Renderer 设置功能

- 将 `SettingsPage`、`settings-system`、`settings-memory` 归入 `renderer/features/settings/`。
- 保留 `SettingsPage` 作为设置功能唯一入口，并由目录 `index.ts` 导出。
- 页面组件和 CSS 内容不改，只更新相对导入与测试位置。

验收：设置相关测试、App 测试、类型检查和构建结果与移动前一致。

### 3. Electron main 业务目录

- 密码锁移动到 `main/security/`。
- 导出与备份移动到 `main/data/`。
- consultation preparation、session runtime、memory snapshot、context audit 移动到 `main/counseling/`。
- `ipc.ts` 移入 `main/ipc/index.ts`，保留 `createIpcRepositories` 与 `registerIpcHandlers` 导出名。
- 本轮不继续拆分 handler 闭包；待具备覆盖全部 channel 的集成测试后，再按业务域拆文件。
- `main/index.ts` 只更新导入路径，IPC channel 与 handler 内容不变。

验收：所有 main 单元测试、shared IPC contract、typecheck 和 Electron TypeScript build 通过。

### 4. Core counseling 领域目录

- 按实时会谈、会后整理、资料和共享纯函数移动文件。
- `packages/core/src/index.ts` 继续提供原有公共导出；仓库内部导入统一指向新位置。
- 不修改 prompt 文本、预算常量、模型调用顺序和算法。

验收：core/database/main 全部测试通过，构建产物成功。

### 5. Session store 安全拆分

- 保留 `useSessionStore`、`resetSessionStore` 和 `SessionState` 的公共入口与 Zustand action 实现。
- 首轮只把无状态的消息格式、会谈展示元数据、附件 metadata 和时间格式函数移到 `stores/session/` 辅助模块。
- 流式 listener、轮询定时器、Zustand `set/get` action 和会谈生命周期本轮不跨文件拆开，避免引入闭包、循环依赖和竞态变化。

验收：sessionStore、App、咨询 flow、IPC lifecycle 与数据库测试全部通过。

## 全量验收

```bash
npm run typecheck
npm test -- --run
npm run build
```

另外检查：

- `git diff --check`；
- Markdown 内部链接；
- 不存在对原 `assets/generated/` 或其他旧文件路径的非说明性残留引用；
- 生产构建输出包含所有当前场景、人物、来信、启动和资料桌素材；
- 509/509 项测试、171/171 个测试套件全部通过；拆分前 7 项 `App.test.tsx` 失败经核对均为旧 UI 断言，生产逻辑未因此改变。
- TypeScript 前后端类型检查、生产构建、`git diff --check` 和 99 份 Markdown 内链检查通过。

## 回退边界

任何后续调整若出现新增行为性失败，应只回退对应结构修改，不修改测试去适配回归。只有确认测试引用旧文件路径或断言已经不存在的旧界面时，才允许同步更新测试，并先核对生产行为没有变化。
