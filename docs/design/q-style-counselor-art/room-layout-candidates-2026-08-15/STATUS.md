# 咨询室布局候选（2026-08-15）

状态：v4 已获用户确认，已替换 App 运行时资源并合并至 `main`。

## 林乐水｜晴日湖畔室 v4（已选并接入）

- 源图：`linleshui-sunny-lakeside-visitor-chair-angle45-source-v4.png`
- 运行时：`assets/runtime/q-style-counselor-art-v1/rooms/linleshui-sunny-lakeside-v1.png`（规范化为 1672 × 941）。
- 回退图：`assets/runtime/q-style-counselor-art-v1/rooms/archive/linleshui-sunny-lakeside-pre-visitor-chair-v1.png`。
- 调整内容：来访者椅改为约 45° 斜向画面右下并略朝观众，能看见正面坐垫；同时拉开椅子与茶几的距离，使咨询区更舒展。
- 锁定内容：湖景、书柜、墙面、光线、地毯、茶几陈设、右侧咨询师安全区与整体画风。
- 尺寸：1671 × 941。

## QA

- `qa-linleshui-room-v4-with-current-portrait.png`：v4 与当前运行时林乐水透明立绘的合成检查。
- 结论：左侧空椅、中央茶几与右侧人物形成完整咨询关系；人物不遮挡桌面或书柜；右侧安全区足够。

验证：林乐水背景资源映射测试通过；TypeScript 类型检查通过。程灵、周舟及三人的人物立绘、动作、欢迎／结束图和面部动画均保持合并前的主线版本。
