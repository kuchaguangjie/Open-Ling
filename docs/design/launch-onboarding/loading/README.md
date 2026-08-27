# 启动 Loading 专题说明

## 视觉真值

- 方向稿：[`../loading-lake-direction.png`](../loading-lake-direction.png)
- 正式 Logo：`assets/runtime/lobby/waiting-room/redesign/logo/qunxin-boat-three-people-logo-transparent-4x-v1.png`
- 色彩与字体：`apps/desktop/src/renderer/styles/theme.css`

方向稿中的文字和 Logo 只是布局参考，不能把整张方向稿直接当成正式页面背景。需要制作无字湖面背景，并把透明 Logo、文字和动画分别实现。

## 页面构成

1. 全屏无字湖面背景；
2. 独立三人舟透明 Logo；
3. 真实状态行；
4. 氛围短句淡入淡出；
5. 延迟出现的功能提示；
6. 克制的水影或倒影层。

## 动效限制

- 小船上下 `3–5px`，旋转不超过 `1deg`，周期 `5–6s`；
- 不制造浪花、粒子、光斑爆发或游戏式进度条；
- 减少动态时取消位移和旋转；
- 组件只根据传入 phase 显示真实状态，不自己模拟初始化进度。

## 素材管理

素材根目录：`assets/runtime/launch/loading/`

- `references/`：现有产品截图、色彩与构图参考；
- `sources/`：可继续编辑的无字背景或生成母版；
- `candidates/`：探索候选，不得被产品代码直接引用；
- `final/`：正式引用素材；
- `qa/`：边缘、尺寸、对比和多窗口检查图。

每个生成素材必须在素材目录 README 中记录来源、用途和是否正式采用。

## 已实现规格

- 组件入口：`apps/desktop/src/renderer/features/startup-loading/index.ts`；
- 输入接口：`phase: "opening" | "reading-settings" | "reading-sessions" | "ready"`，以及可选 `exiting`；
- `phase` 只映射调用方传入的真实状态，不设置模拟进度或自动完成；
- 氛围短句约每 `3.2s` 安静切换，使用 `1.1s` 淡入动画，并通过 `aria-hidden` 避免重复打断读屏；
- 功能提示在 `2.5s` 后才出现，每次打开只随机选择一条并保持不变，下次打开才重新选择；启动提前完成时不为展示文案而延长；
- 三人舟上下位移为 `-4px` 到 `4px`，另有 `±2px` 横向漂移与 `±0.85deg` 摇摆，周期 `5.8s`；倒影只改变透明度与轻微纵向位置，不做缩放；
- `prefers-reduced-motion: reduce` 下取消三人舟、倒影和文案动画；
- 组件不读取 store、localStorage 或 IPC，不承担首次用户判断和 App 接线。

视觉 QA 与正式背景的路径、来源及尺寸记录在 `assets/runtime/launch/loading/README.md`。

启动页两组轮播文案及其主线功能核对记录见 [`COPY.md`](./COPY.md)。
