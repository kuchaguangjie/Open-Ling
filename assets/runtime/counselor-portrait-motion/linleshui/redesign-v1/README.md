# 林乐水咨询立绘

用户选定并接入：

- 默认：`linleshui-default-present-white-speck-clean-transparent-v3.png`（候选 C）
- 倾听：`linleshui-listening-user-input-white-speck-clean-transparent-v3.png`（候选 B）
- 回应：`linleshui-responding-thinking-white-speck-clean-transparent-v3.png`（候选 A）

三张均为 `1024 × 1536` RGBA PNG。比较 `bria-rmbg`、`birefnet-portrait`、`isnet-anime` 后采用 `bria-rmbg`；`birefnet-portrait` 会误删椅背与椅架，未采用。

已检查头发、浅色衣物、手指、杯把孔、椅垫、椅背和椅腿，并在黑、白、暖色和真实咨询背景上预览。旧眨眼叠层与新脸位置不匹配，当前已停用，待从新母版重新制作。

`v2` 曾对头顶发色区域收紧 2px Alpha，但会让侧边细发丝显得发虚，现已停用。

`v3` 重新以 `v1` 为母版，不做边缘收缩或羽化，只把头顶外缘中与白色背景一致的少量浅灰白像素设为透明：默认、倾听、回应分别只修改 30、3、1 个 Alpha 像素。RGB、正常棕色发丝、侧边发梢、脸部、耳饰、衣服、动作和其他 Alpha 均与 `v1` 完全一致。主线只收录通过验收的 `v3` 成品；早期版本与对照图保留在本地评审目录。
