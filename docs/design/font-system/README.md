# 字体系统方案

## 已确认方向

采用“方案一：现代安静 + 书卷气”。

- UI 操作层：内置 Noto Serif SC，用于按钮、输入框、表单、会谈列表、系统设置等区域，避免不同系统回退到不同字体。
- 页面标题 / 咨询师姓名 / 重要栏目标题：内置 Noto Serif SC，用于建立书卷气和安静的标题层级。
- 来信正文 / 阶段性理解 / 记忆摘录：内置 LXGW ZhenKai，用于较长的情绪与叙事文本。
- 咨询师状态短句：内置 LXGW ZhenKai，用于右侧状态卡里的短句，让咨询师在场感更接近清秀楷意。

## 版权边界

- 不使用方正系列字体，不内置需要商业授权的字体。
- Noto Serif SC 和 LXGW ZhenKai 均按 SIL Open Font License 1.1 使用。
- 当前内置 Noto Serif SC 简体中文 400 / 600 / 700 权重和 LXGW ZhenKai，并保留对应许可证或 npm 包授权信息。
- 不再依赖系统默认中文字体决定主要 UI 外观。

## 验收标准

- CSS 不再出现方正、微软雅黑、Songti、STSong、Kaiti、STKaiti 等旧硬编码字体。
- 主题层提供语义字体 token，页面样式通过 token 使用字体。
- 系统设置等操作密集页面使用 Noto Serif SC，保持清楚、克制，不大面积使用文楷。
- 右侧咨询师状态短句使用 LXGW ZhenKai。
