# 周舟当前默认主立绘与背景

本目录归档当前接入咨询室的周舟默认主立绘和统一咨询室大背景。

## 当前接入

- `zhouzhou-default-present-main-transparent-v1.png`：当前周舟默认 / 主会话 / 来访者阅读思考状态人物 + 椅子透明层，来源于最初接入的周舟主图。
- `zhouzhou-listening-user-input-calm-b-transparent-v1.png`：来访者输入时的倾听状态，来源于 listening B 候选。
- `zhouzhou-responding-structure-g-transparent-v1.png`：咨询师思考与输出状态，偏“分层说明、边界澄清”的整理回应动作。
- `zhouzhou-wide-room-background-v2.png`：周舟咨询室统一大背景，同时作为会谈界面背景；周舟模式下不再叠加独立右侧背景贴片。

## 说明

- 当前默认人物层沿用用户确认的第一版周舟全身坐姿效果图，并用更明确的 `default-present-main` 命名。
- 倾听层来源于 listening B 候选，使用洋红色键控源图抠图得到透明 PNG，并用 `listening-user-input` 命名。
- 整理回应层来源于 responding G 候选，使用洋红色键控源图抠图得到透明 PNG。
- 背景层为一张完整咨询室横向大背景，左侧和中间低信息量，右侧为周舟所在窗边区域，避免咨询师背景与主会谈背景割裂。
- 第一阶段接入默认、倾听、整理回应三种状态图；暂不做表情差分。
- 本次合入主线仅包含 App 实际接入素材；探索过程文件继续保留在 feat worktree 中，不随主线精简提交。

## 2026-08-21 原始母图整张重抠

- 默认态最终改用 `../user-selected-v2/zhouzhou-session-default-original-chair-clean-hair-gap-transparent-v7.png`，倾听态最终改用 `../user-selected-v4/zhouzhou-session-listening-original-chair-clean-hair-gap-transparent-v9.png`。
- 两张 `1024 × 1536` RGB 原始母图从 Git 快照 `35cd05a` 恢复；默认态与倾听态分别从自己的母图整张重抠，不再跨状态拼接椅子。
- 使用 `bria-rmbg` 生成透明度蒙版，成品 RGB 像素只来自各自母图；随后按原有 2 倍锚点输出为 `2048 × 3072` RGBA PNG。
- 左右椅背、米白软包、坐垫、双侧扶手和木腿均按各自原图完整保留。人物、杯子、服装、姿势和脸部动画锚点未重新生成。
- `v5` / `v7` 的整图新蒙版在深色背景下暴露出头发外圈浅灰白边；`v6` / `v8` 恢复各自旧正式图顶部 `800px` 的干净 RGBA 头部区域，椅子区域与 `v5` / `v7` 保持逐字节一致。
- `v7` / `v9` 进一步只在右耳下方与颈侧发梢的三个小矩形内清除旧蒙版遗留的浅色背景阴影；皮肤、耳环、衣领、外侧发丝和椅子均未改动。
- `v4` / `v6` 跨状态椅背拼补方案因右侧透视结构不一致已淘汰，旧生产 PNG 仍保留为回滚来源。

## 2026-08-22 表达态右侧发梢修复

- 表达态改用 `../user-selected-v2/zhouzhou-session-responding-hair-gap-transparent-v3.png`。
- 根据实际会谈截图反算源图坐标，只在右下发梢外沿局部收紧透明度并清理橄榄绿背景溢色；人物 RGB、脸、耳饰、衣领、姿势、杯子与座椅均保持原图。
