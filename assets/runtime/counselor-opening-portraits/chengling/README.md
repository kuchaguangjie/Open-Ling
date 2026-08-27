# 程灵开场对话立绘

状态：新画风 `new-style-v1` 已完成透明母图，并按正式会谈立绘的稳定方案接入局部眨眼和说话覆盖层。

已确认用途：

- 开场：`reflective-waist` 从容回应姿势；用于第一次进入咨询室时的简短交流。
- 结束：`contained-arms` 沉静倾听姿势；用于咨询结束前的收尾交流。
- 暂不接入页面；等待对话框和开场/收尾舞台完成后，由集成任务统一配置动作切换。

## 已选母图

- `sources/chengling-opening-contained-arms-source-v1.png`
  - 角色用途：沉静倾听、容纳与等待。
  - 动作：前臂在腰前低位交错，肩线舒展。
- `sources/chengling-opening-reflective-waist-source-v1.png`
  - 角色用途：从容回应、说明与开场表达。
  - 动作：一手靠近上腹，另一手稳定停在腰侧。

两张均为 `1145 × 1373`、无 Alpha 的浅色背景生成源图。保留源图，不直接覆盖。

## 旧画风历史动态制作方向

以下内容仅记录旧画风素材的完整帧方案；新画风运行时已改用本文末尾的局部覆盖层方案。

1. 先将母图抠为同尺寸透明 PNG，并在真实咨询室背景上检查发丝、披肩流苏和手指边缘。
2. 每个动作保持身体、头部、头发、服装和首饰完全静止，只制作局部面部变化后合成为同画布完整帧：
   - 眼睛：睁眼、半闭、闭眼；
   - 嘴巴：闭嘴、微张、正常说话。
3. 当前采用同画布完整帧切换，而不是运行时局部贴片。局部贴片在皮肤渐变处会暴露接缝；完整帧通过局部无缝融合保留身体像素不变，更接近早期视觉小说的稳定切帧效果。
4. 默认眨眼序列：睁眼 → 半闭 → 闭眼 → 半闭 → 睁眼，总时长约 `220–300ms`，间隔随机约 `2.5–5s`。
5. 文字逐字出现时，嘴巴在闭嘴、微张和正常张嘴之间低频切换；文字完成后回到闭嘴。
6. 说话期间暂不触发眨眼，避免额外制作眼睛和嘴巴的组合帧；一句话结束后恢复随机眨眼。
7. 系统启用减少动态时，停用随机眨眼与口型，仅显示静态母图。

## 从容回应姿势的动态帧

- `v1` 已被用户退回：浅色源背景污染头发边缘；动态帧又错误地重新带入源图 RGB，GIF 切帧时轮廓闪烁。
- `v2` 使用 `bria-rmbg` Alpha、边缘 RGB 向主体内部颜色去污染、轻微 1px Alpha 收缩；所有动态帧从同一透明母图进行局部无缝面部替换。
- 自动检查要求所有帧 Alpha 哈希一致，并且面部区域以外 RGB 逐像素不变。

用户已确认的 `v2` 文件：

- `final/chengling-opening-reflective-waist-neutral-transparent-v2.png`
- `final/chengling-opening-reflective-waist-eyes-half-transparent-v2.png`
- `final/chengling-opening-reflective-waist-eyes-closed-transparent-v2.png`
- `final/chengling-opening-reflective-waist-mouth-slight-transparent-v2.png`
- `final/chengling-opening-reflective-waist-mouth-open-transparent-v2.png`

动态预览：`qa/chengling-reflective-waist-face-motion-preview-v4.gif`；另有不受 GIF 调色板限制的 `WebP` 版本。

抠图背景检查：`qa/chengling-reflective-waist-cutout-backgrounds-v2.jpg`。

## 沉静倾听姿势的动态帧

- 原始浅色背景与浅色披肩、细发丝过于接近，自动抠图会留下灰白色块；继续扩大去污染范围会反过来损伤发丝和衣缘。
- 按抠图停止条件，重新生成角色不变、纯洋红背景的隔离源图 `sources/chengling-opening-contained-arms-chromakey-v1.png`。
- 透明母图使用柔和色键、去洋红溢色、1px Alpha 收缩和 3px 边缘主体色回填；动态帧全部继承这一张母图的 Alpha 与轮廓 RGB，仅无缝替换眼睛或嘴部。

当前文件：

- `final/chengling-opening-contained-arms-neutral-transparent-v1.png`
- `final/chengling-opening-contained-arms-eyes-half-transparent-v1.png`
- `final/chengling-opening-contained-arms-eyes-closed-transparent-v1.png`
- `final/chengling-opening-contained-arms-mouth-slight-transparent-v1.png`
- `final/chengling-opening-contained-arms-mouth-open-transparent-v1.png`

动态预览：`qa/chengling-contained-arms-face-motion-preview-v1.gif`；另有无 GIF 调色板限制的 `WebP` 版本。

抠图背景检查：`qa/chengling-contained-arms-cutout-backgrounds-v1.jpg`。

自动检查结果：五帧 Alpha 哈希完全一致，四角透明，眼睛/嘴巴目标区域之外 RGB 逐像素不变。

## 边界

- 不修改正式会谈右侧常驻人物状态素材。
- 不在本素材任务中修改共享状态、IPC、数据库或会谈流程。
- 两个姿势何时切换由开场/收尾舞台实现或集成任务确定。

## 新画风运行时素材

- 开场：`new-style-v1/chengling-opening-welcome-closed-mouth-transparent-v1.png`
- 结束：`new-style-v1/chengling-closing-folded-hands-transparent-clean-v2.png`
- 两张均使用 `bria-rmbg` 抠图，并完成头发、袖口、手指和衣缘的分区检查。
- 开场和结束各有三张同画布透明局部层：`eyes-closed`、`mouth-slight`、`mouth-open`。运行时母图始终不换，避免头发、衣服、首饰和身体在切帧时闪变。
- 眨眼沿用正式会谈立绘节奏：每 `6–8s` 叠加一次闭眼层，保持 `130–150ms` 后撤掉；不制作半闭眼整图。
- 说话沿用正式会谈立绘节奏：`轻启 → 张口 → 轻启 → 闭嘴`，每帧 `170ms`。
- 覆盖层位于 `new-style-v1/face-motion/{opening,closing}/`，透明区域仅包含眼区或嘴区。
- `clean-v2` 根据实际网页反馈，按坐标局部移除了结束立绘左右外侧四段灰白背景残留；没有全图收缩 Alpha。
