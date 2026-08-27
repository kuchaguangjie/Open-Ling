# 周舟开场与结束对话立绘

状态：两张母图已由用户确认，透明母版、眨眼帧和说话口型帧已完成。

## 已确认用途

- 开场：`opening-mug`，单手低位持杯，保持周舟清晰、可靠而不催促的第一印象。
- 结束：`closing-relaxed`，双臂自然放松，作为咨询结束时平静、不过度挽留的收尾姿势。
- 暂不接入页面；等待对话框和开场/收尾舞台完成后，由集成任务统一配置。

## 源图与透明化

- `sources/zhouzhou-opening-mug-chromakey-v1.png`
- `sources/zhouzhou-closing-relaxed-chromakey-v1.png`
- 两张源图均使用平坦洋红键控背景；比较 soft、contract、tight 三种色键候选后，采用轻微 `1px` 边缘收缩的 contract 版本。
- 已检查黑色、白色、暖棕色和周舟真实咨询室背景；可见主体边缘无洋红残留。

## 动态帧

每个姿势均包含五张同画布透明 PNG：

- `neutral`
- `eyes-half`
- `eyes-closed`
- `mouth-slight`
- `mouth-open`

所有动态帧继承各自透明母版的 Alpha 和轮廓 RGB，仅无缝替换眼睛或嘴部，避免头发、服装、手部和杯子在切帧时闪动。

预览：

- `qa/zhouzhou-opening-mug-face-motion-preview-v1.gif`
- `qa/zhouzhou-opening-mug-face-motion-preview-v1.webp`
- `qa/zhouzhou-closing-relaxed-face-motion-preview-v1.gif`
- `qa/zhouzhou-closing-relaxed-face-motion-preview-v1.webp`

抠图检查：

- `qa/zhouzhou-opening-mug-cutout-backgrounds-v1.jpg`
- `qa/zhouzhou-closing-relaxed-cutout-backgrounds-v1.jpg`

## 边界

- 不修改正式会谈右侧常驻人物素材。
- 不修改共享状态、IPC、数据库或咨询流程。
- 开场与结束动作的页面调用交给后续对话舞台集成任务。
