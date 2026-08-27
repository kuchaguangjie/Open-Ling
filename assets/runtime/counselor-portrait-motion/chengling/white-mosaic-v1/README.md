# 程灵三态透明立绘成品

本目录保留程灵咨询室右侧人物层的正式成品与可回退旧版。

## 文件

- `chengling-default-new-style-transparent-clean-v6.png`：默认持杯态当前运行时版本；在 `v5` 基础上按实机截图继续收净左右发缘圈选区域的最外层低透明残影，圈外 RGBA 不变。
- `chengling-listening-cheek-new-style-transparent-clean-v10.png`：倾听态当前运行时版本；仅重做两组披肩下摆流苏，流苏逐根分离且间隙透明。
- `chengling-responding-new-style-transparent-clean-v9.png`：回应态当前运行时版本；从 `v7` 恢复后，仅清除右肩外侧短发梢内部纵向 3 个亮灰残留像素，并调整上下 2 个抗锯齿过渡像素，其余 RGBA 不变。
- `chengling-responding-new-style-transparent-clean-v8.png`：回应态回退版本；曾收紧右肩上方发环和下方垂落发梢的 3 px 边界带，后按用户精确标注恢复。
- `chengling-responding-new-style-transparent-clean-v7.png`：回应态回退版本；在 `v6` 基础上继续清除实机截图圈出的四处发缘白点，并收净右下披肩流苏和木椅边缘的低透明脏边。
- `chengling-default-new-style-transparent-clean-v5.png`：默认持杯态上一运行时版本；清除左下和右侧头发边缘的白线、白点，保留作回退。
- `chengling-responding-new-style-transparent-clean-v5.png`：回应态上一运行时版本；清除右侧头发边缘的白线残留，保留作回退。
- `chengling-responding-new-style-transparent-clean-v6.png`：回应态上一运行时版本；收净左右四处发缘的最外层低透明残影，保留作回退。
- `chengling-default-new-style-transparent-clean-v4.png`：默认持杯态上一运行时版本；仅重做两组披肩下摆流苏，保留作回退。
- `chengling-responding-new-style-transparent-clean-v4.png`：回应态上一运行时版本；仅重做两组披肩下摆流苏，保留作回退。
- `chengling-default-new-style-transparent-clean-v1.png`：2026-08-15 新画风默认持杯态，保留作回退。
- `chengling-listening-cheek-new-style-transparent-clean-v7.png`：2026-08-15 浅灰白底重生成倾听态的坐标分区精修版；清除画面右侧三段头发白灰残留，并校正两组披肩穗子的冷灰溢色，保留作回退。
- `chengling-listening-cheek-new-style-transparent-clean-v4.png`：上一版发缘精修版，保留作回退。
- `chengling-listening-cheek-new-style-transparent-clean-v3.png`：浅灰白马赛克底彻底重生成的托腮倾听态首个运行时版，保留作回退。
- `chengling-listening-cheek-new-style-transparent-clean-v2.png`：旧洋红底源图的重新抠图版，保留作回退，不再接入运行时。
- `chengling-listening-cheek-new-style-transparent-clean-v1.png`：托腮倾听态首次抠图版，保留作回退，不再接入运行时。
- `chengling-responding-new-style-transparent-clean-v1.png`：2026-08-15 新画风掌心向上回应态，保留作回退。
- `chengling-default-transparent-bria-clean-v9.png`：默认在场态透明版，在 `v8` 基础上继续轻量修复衣服下摆穗子发灰边缘，保留自然灰阶边缘。
- `chengling-expression-transparent-bria-clean-v4.png`：表达 / 展手态透明版，在 `v3` 基础上继续轻量修复衣服下摆穗子发灰边缘，保留自然灰阶边缘。
- `chengling-listening-transparent-bria-clean-v8.png`：倾听态透明版，在 `v7` 基础上继续清理用户圈出的左右两处头发白灰点，保留自然灰阶边缘。

## 处理记录

- 使用生图模型重绘整张图，不走本地抠图流程。
- 保留主体细节：脸、头发、椅子、腿脚、衣服纹理、披肩穗子、首饰、杯子和动作。
- 仅替换原粉色背景为白色 / 浅灰马赛克背景。
- 第二轮生成加入统一色调约束：中性暖白、同曝光、同一套皮肤 / 披肩 / 木椅 / 裙子颜色，避免表达态过亮。
- 抠图工具：本地 `rembg`。
- 对比多个本地抠图候选后选用 `bria-rmbg`，再按用户截图做发丝残点、发尾残边、衣服穗子补色和 alpha 润色；默认态 `v9`、表达态 `v4`、倾听态 `v8` 仅做头发和下摆穗子局部保守修点，不处理脸、身体。
- 中间候选图、诊断图和预览图不进入仓库，只保留三张成品图。
- 2026-08-21 使用生图模型只重绘两组下摆流苏，以纯绿底提取逐根分离的新流苏，再按两个下摆坐标带拼回原始 `v1/v7/v1` 底图；区域外 RGBA 保持逐像素不变。
- 2026-08-24 根据实机截图对默认态左下、右侧和回应态右侧发缘做坐标分区修复；alpha 通道逐像素保持不变，仅将白底污染的半透明发缘 RGB 回填为最近的不透明棕色发丝颜色，并在黑、灰、暖色和咨询室背景上复核。
- 2026-08-24 第二轮根据放大实机截图细分默认态与回应态共八处圈选发缘；只降低距透明背景三像素内、且最近不透明主体属于深色头发的低透明边缘 alpha，RGB 与圈外 RGBA 均保持不变。
- 2026-08-24 第三轮继续按回应态实机圈选位置处理四处发缘及右下披肩／木椅区域；发缘只收缩与深色发丝相邻的半透明边界，右下只清理距透明背景三像素内的低透明边缘，不重绘流苏、衣服或木椅。

## 当前用途

当前咨询室右侧人物层映射：默认 / 错误使用新画风默认持杯态，用户输入使用全新托腮倾听态，连接 / 思考 / 流式回应使用新画风掌心向上回应态。

旧三张 `bria-clean` 文件暂不删除，作为可回退版。新版三态已接入 `face-motion/chengling/new-style-v1/` 的逐姿势闭眼覆盖层，回应态另有两档说话口型；旧版程灵覆盖层继续保留但不再用于这套新脸。
