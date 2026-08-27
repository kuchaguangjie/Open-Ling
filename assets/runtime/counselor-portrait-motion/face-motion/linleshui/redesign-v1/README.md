# 林乐水咨询立绘面部动画 v1

基于 `redesign-v1` 三张正式咨询立绘制作，采用与母版同尺寸的透明局部叠层：

- 默认闭眼：`default/linleshui-default-eyes-closed-overlay-redesign-v1.png`
- 倾听闭眼：`listening/linleshui-listening-eyes-closed-overlay-redesign-v1.png`
- 回应闭眼：`responding/linleshui-responding-eyes-closed-overlay-redesign-v1.png`
- 回应轻启口：`responding/linleshui-responding-mouth-slight-overlay-redesign-v1.png`
- 回应张口：`responding/linleshui-responding-mouth-open-overlay-redesign-v1.png`

制作方式：先对各自正式母版的脸部局部进行身份锁定编辑，再做亚像素配准；只提取双眼或嘴部的小范围区域，色温匹配后放回原始 `1024 × 1536` 画布。头发、眉毛、鼻子、脸型、服装、姿势、杯子、座椅及人物透明边缘均未被替换。

三态使用 6–8 秒随机眨眼、闭眼 130–150 毫秒；嘴部只在林乐水 `streaming` 回应状态按“轻启 → 张口 → 轻启 → 闭合”循环。已在真实咨询室背景和实际显示尺寸检查局部接缝、眼位、睫毛、口型与快速切换稳定性。
