# 咨询开场立绘素材

本目录保存 `C-006 咨询开场立绘` 的任务内素材，不覆盖正式会谈右侧常驻人物立绘。

## 当前素材状态

| 咨询师 | 开场动作 | 结束动作 | 状态 |
| --- | --- | --- | --- |
| 程灵 | `reflective-waist` 从容回应姿势 | `contained-arms` 沉静倾听姿势 | 透明母图、眨眼与口型帧已完成并经用户确认 |
| 周舟 | `opening-mug` 低位持杯姿势 | `closing-relaxed` 自然站姿 | 颈侧头发与口型复修，最终素材为 `v3` |
| 林乐水 | `opening-one-hand-cup` 单手持花杯 | `closing-relaxed` 双臂自然下垂 | 耳环跨帧稳定性复修，最终素材为 `v4` |

## 集成用最终版本

| 咨询师 | 开场 | 结束 |
| --- | --- | --- |
| 程灵 | `chengling-opening-reflective-waist-<state>-transparent-v2.png` | `chengling-opening-contained-arms-<state>-transparent-v1.png` |
| 周舟 | `zhouzhou-opening-mug-<state>-transparent-v3.png` | `zhouzhou-closing-relaxed-<state>-transparent-v3.png` |
| 林乐水 | `linleshui-opening-one-hand-cup-<state>-transparent-v4.png` | `linleshui-closing-relaxed-<state>-transparent-v4.png` |

`<state>` 仅允许：`neutral`、`eyes-half`、`eyes-closed`、`mouth-slight`、`mouth-open`。运行时使用 `final/` 中完整透明 PNG 切帧；`qa/` 的 GIF/WebP 只用于审阅，不作为正式页面素材。

2026-07-13 的自然化重制以各自动作的 `neutral` 为身份、姿势、服装、道具和透明轮廓母图，只重绘眼睑与口型区域；`neutral` 也随整套素材升版，但视觉不变。用户复审后再次把动态像素限制到双眼或嘴唇的独立小遮罩：林乐水耳环与耳旁发丝、周舟颈侧头发在所有状态都逐像素回到母图，周舟两级口型重新生成。所有新帧恢复母图原始 Alpha。旧版本保留用于回溯，禁止运行时接入。

## 接入边界

- 程灵开场使用“从容回应”，咨询结束使用“沉静倾听”。
- 当前仅保存和管理人物素材；对话框与开场/收尾舞台尚未完成，因此不修改页面配置或共享入口。
- 后续由 `S-001 咨询完整流程` 或对应集成任务统一接线，不在素材制作阶段修改共享状态、IPC 或正式会谈右侧人物层。
