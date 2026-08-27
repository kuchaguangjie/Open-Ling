# L-011 对话框视觉 QA

- Source visual truth: 本地生成的设计参考（不随仓库分发）
- Implementation screenshot: `output/design-qa/choices-rounded-innerline.png`
- Full-view comparison: `output/design-qa/choices-reference-comparison.png`
- Dialogue screenshot: `output/design-qa/dialogue-rounded-innerline.png`
- Production frame: `assets/final/dialogue-panel-clean-rounded-transparent-v1.png`
- Viewport: 1600 × 900（16:9）
- State: 回访对白结束后的四选项状态；底部对白框保留

## Full-view comparison evidence

实现保留了参考图的独立选项结构、暖白纸面、细木色外框、内描边和右侧箭头，同时遵循已确认的产品逻辑：不使用遮罩，并保留下方对白框。选项整体与字号已放大，选项与对白框之间仍有间距，人物面部未被遮挡。

## Focused region comparison evidence

选项区域需要单独检查，因为内描边、圆角和箭头在全景中尺寸较小。实现中的四张卡片圆角一致，每张只保留一根距外边 6px 的 1px 内描边，无原先四角装饰线；数字无木质底框，正文最高 24px，文字与箭头对齐稳定。对白框外层使用完整重生成母图，纸页与单根内描边由独立 CSS 层绘制；旧九宫格边框切片已停用。

## Required fidelity surfaces

- Fonts and typography: 沿用项目标题字体与既有字号，选项层级和正文可读性稳定。
- Spacing and layout rhythm: 四张卡片等宽等距，中央排列，未与下方对白框重叠。
- Colors and visual tokens: 继续使用暖白纸面、胡桃木棕和低饱和金色内线；没有新增红色或冷灰遮罩。
- Image quality and asset fidelity: 等待室、任心立绘和名字牌保持不变；胡桃木框通过 `border-image` 保持角部比例，纸页纹理平铺，CSS 描边不随位图缩放发虚。
- Copy and content: 对白与四个选项文案保持原样。

## Comparison history

1. 初检发现只增强四个角切片会暴露九宫格色差接缝（P1）。
2. 修复为对完整九宫格统一轻微增强对比度；复检未再出现接缝。
3. 选项卡去除四角装饰线，改为圆角、内描边和右侧小箭头；复检与选定方向一致。
4. 根据用户复检反馈，移除多层 inset 阴影；选项和对白框均收敛为单根有间距的 1px 内描边，并放大选项与字号。
5. 用户指出旧圆角残影仍露出。重新生成完整框体母图，清理绿幕并改用单母图 `border-image` 九宫格；在黑、白、暖色及等待室背景上复检四角无脏边。
6. 用户指出木框露出偏多且内线缩放发虚。将纸页拆为独立 CSS 层，木框只保留 10px 左右露出；内外圆角边线均由 CSS 绘制，位图只提供胡桃木与轻微纸张纹理。
7. 最终纸页角花直接裁取旧四角片中的原版麦穗叶纹，分别保持四个原始方向；裁剪排除旧卷角与旧边线，CSS 内描边独立置于花纹上层，确保边线连续干净。

## Findings

- 无未解决的 P0、P1 或 P2 问题。
- 无残留的阻塞性视觉问题；后续仅需按用户主观偏好微调选项最终尺寸。

## Interaction and runtime checks

- 鼠标推进与选项点击状态可见。
- 选项状态继续保留底部对白框。
- 浏览器控制台错误：0。
- 相关测试：16/16 通过。
- TypeScript 类型检查与生产构建通过。

final result: passed
