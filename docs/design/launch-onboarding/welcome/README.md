# 首次欢迎页专题说明

## 视觉真值

- 方向稿：[`../welcome-threshold-direction.png`](../welcome-threshold-direction.png)
- 等待室背景：`assets/runtime/lobby/waiting-room/redesign/waiting-room-warm-crisp-final-v4.png`
- 正式 Logo：`assets/runtime/lobby/waiting-room/redesign/logo/qunxin-boat-three-people-logo-transparent-4x-v1.png`
- 纸面与木框参考：`docs/design/consultation-consent-reader/README.md`

## 本 Feat 只做欢迎页

右侧内容：

> 欢迎来到群心心理工作室

> 这里有三位 AI 心理咨询师，陪你进行情绪支持、自我探索和连续的咨询式对话。

操作：

- `继续`
- `先进入工作室看看`

按钮只通过回调表达意图。本 Feat 不判断是否首次，不写持久化，不实现后续边界说明或 API 表单。

## 页面构成

- 左侧约 56–58%：门廊与等待室内景，窗外湖光保持可见；
- 右侧约 42–44%：暖纸内容面，使用现有酒红 Logo、植物绿和中文衬线字体；
- 右下或底部保留可扩展的步骤位置，但本页不硬编码未来总步骤数；
- 窄窗口改为上下结构，按钮和正文不得被裁切。

## 素材管理

素材根目录：`assets/runtime/launch/welcome/`

- `references/`：门廊方向、等待室、纸面与品牌参考；
- `sources/`：可编辑的门框、遮罩、纹理或背景派生母版；
- `candidates/`：探索候选；
- `final/`：正式引用素材；
- `qa/`：不同窗口比例、裁切与对比检查图。

尽量直接复用现有等待室背景。若确需派生门框或遮罩，不得覆盖原图，并在 README 记录来源。

## 实现记录

- 独立组件：`apps/desktop/src/renderer/features/launch-welcome/LaunchWelcomeScreen.tsx`
- 可复用页面壳：`apps/desktop/src/renderer/features/launch-welcome/LaunchWelcomeShell.tsx`
- 正式门廊素材：`assets/runtime/launch/welcome/final/welcome-threshold-room-v1.png`

门廊素材从已确认方向稿左侧无文字区域裁切；右侧继续直接引用等待室正式 Logo 与资料桌正式纸纹。底部壳保留不含未来总步数的步骤位置，后续页面只需替换内容与 footer。
