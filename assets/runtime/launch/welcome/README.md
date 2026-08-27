# Welcome 素材清单

状态：`feat/launch-welcome` 已完成正式素材与多视口 QA。

正式结构建议：

```text
welcome/
├── references/
├── sources/
├── candidates/
├── final/
└── qa/
```

每次新增素材记录：文件名、生成或派生来源、用途、尺寸、是否正式采用、对应 QA 图。

## 正式采用

| 文件 | 来源 | 用途 | 尺寸 | 状态 | QA |
| --- | --- | --- | --- | --- | --- |
| `final/welcome-threshold-room-v1.png` | 从 `docs/design/launch-onboarding/welcome-threshold-direction.png` 左侧无文字区域无损裁切 | 欢迎页左侧门廊与等待室内景 | 828×1058 | 正式采用 | `qa/welcome-16x9.png`、`qa/welcome-16x10.png`、`qa/welcome-1100x720.png`、`qa/welcome-reduced-motion.png` |

右侧品牌继续直接引用等待室正式 Logo；纸面直接引用资料桌正式纸纹，不在本目录制造重复副本。方向稿、等待室背景、Logo 与纸面来源见 `docs/design/launch-onboarding/welcome/README.md`。

设计对照归档为 `qa/welcome-direction-comparison.png` 与 `qa/welcome-paper-comparison.png`。
