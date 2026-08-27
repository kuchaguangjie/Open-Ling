# 咨询师立绘与动态效果设计说明

## 目标

本方向只处理咨询室右侧人物表现：立绘资产、状态命名、轻量动态和素材组织。当前不处理后端、真实对话接线、首页其他布局，也不替换设置页咨询师插画。

## 当前设计

- 背景层：沿用右侧无人温暖书房背景。
- 人物层：沿用当前程灵 + 椅子透明 PNG，组件化为 `CounselorPortrait`。
- 状态层：底部纸质状态卡继续由页面渲染。
- 动态层：通过 `counselorStatus` 映射为 `idle / listening / thinking / responding / error-soft` 等 UI 状态，再由 CSS class 驱动轻量动画。

## 动画原则

- 只使用 CSS transform、opacity、filter 和状态点 pulse。
- 人物动效控制在 2-4px 的低频呼吸/浮动，不做夸张弹跳。
- `connecting` 先复用 `thinking`，避免为短暂连接状态生成额外资产。
- 错误状态使用低饱和、静止的 `error-soft`，不做红色警报。
- 后续如拆分人物部件，优先保持人物 + 椅子整体定位稳定。

## 文件边界

- 正式咨询室接入图仍在 `assets/runtime/counseling-room/`。
- 新状态素材和 contact sheet 统一放入 `assets/runtime/counselor-portrait-motion/`。
- 设置页咨询师图继续保留在 `assets/settings/counselors/`。
