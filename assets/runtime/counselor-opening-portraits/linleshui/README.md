# 林乐水开场与结束对话立绘

状态：两张母图已由用户确认，透明母版、眨眼帧和说话口型帧已完成。

## 已确认用途

- 开场：`opening-one-hand-cup`，单手低位持花杯；作为来访者第一次进入咨询室时温和、生活化的开场姿势。
- 结束：`closing-relaxed`，双臂自然下垂、无道具；用于安静、松弛而不过度挽留地结束交流。
- 暂不接入页面；等待对话框和开场/收尾舞台完成后，由集成任务统一配置。

`opening-observing-gesture` 与 `closing-one-hand-cup` 是上一轮用途理解错误时生成的历史命名，保留用于回溯，不再作为后续集成入口。

## 源图与透明化

- `sources/linleshui-opening-one-hand-cup-chromakey-v1.png`
- `sources/linleshui-closing-relaxed-chromakey-v1.png`
- 两张源图均为平坦洋红键控背景；比较 soft、contract、tight 三种候选后，采用轻微 `1px` 边缘收缩的 contract 版本。
- 已在黑色、白色、暖棕色和林乐水真实咨询室背景上检查人物、低马尾、衣缘、手与杯子轮廓。

## 动态帧

每个姿势均包含五张同画布透明 PNG：`neutral`、`eyes-half`、`eyes-closed`、`mouth-slight`、`mouth-open`。

所有动态帧继承各自透明母版的 Alpha 和轮廓 RGB，仅无缝替换眼睛或嘴部，避免头发、衣服、手势和杯子在切帧时闪动。

修复记录：首轮面部融合框误触下颌外的透明像素，导致色键去溢色后隐藏在透明区的 RGB 被带入嘴边，同时结束姿势的眨眼框未完整覆盖双眼。现已按坐标网格重新校准双眼与嘴部，并让融合遮罩强制限定在 `Alpha >= 250` 的不透明人物区域内；GIF/WebP 均已重新导出。

`v2` 表情重做：用户认为上一版眨眼弧度和张嘴幅度不自然。新版本重新生成较轻的眼睑与唇部变化，并改用小范围羽化贴片，不再使用会改变周围皮肤明暗的泊松融合。当前审阅入口为 `opening-one-hand-cup` 与 `closing-relaxed` 的 `face-motion-preview-v2`。

预览：

- `qa/linleshui-opening-one-hand-cup-face-motion-preview-v2.gif`
- `qa/linleshui-opening-one-hand-cup-face-motion-preview-v2.webp`
- `qa/linleshui-closing-relaxed-face-motion-preview-v2.gif`
- `qa/linleshui-closing-relaxed-face-motion-preview-v2.webp`

抠图检查：

- `qa/linleshui-opening-one-hand-cup-cutout-backgrounds-v1.jpg`
- `qa/linleshui-closing-relaxed-cutout-backgrounds-v1.jpg`

## 边界

- 不修改正式会谈右侧常驻人物素材。
- 不修改共享状态、IPC、数据库或咨询流程。
- 页面调用交给后续对话舞台集成任务。
