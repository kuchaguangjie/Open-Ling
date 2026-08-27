# 设计稿与 UI 方案

重要 UI 页面可以在这里沉淀草图、高保真 HTML、截图或设计说明，再进入正式前端实现。已实现且不再提供长期参考的过程稿和 QA 截图应及时删除。

推荐目录：

```text
docs/design/<screen-or-flow>/
├── README.md
├── index.html
└── screenshot.png
```

原则：

- Codex 默认负责高保真 UI 方向、视觉方案和关键交互设计，除非用户指定其他工具。
- 设计稿用于确认方向，不等同于生产代码。
- 用户确认方向后直接进入对应功能分支实现；只有跨模块或存在重要取舍时才补充简洁方案。

当前设计：

- [多语言与英文版本](./localization/README.md)
- [启动、首次引导与咨询前模型连接](./launch-onboarding/README.md)
- [咨询完整循环](./consultation-complete-loop/README.md)
- [首次知情说明阅读器](./consultation-consent-reader/README.md)
- [咨询室视觉与交互](./counseling-room/README.md)
- [等待室场景框架](./lobby-scene-framework/README.md)
- [咨询师介绍](./lobby-counselor-introduction/README.md)
- [资料桌](./lobby-resource-table/README.md)
- [沙发来信](./lobby-sofa-letters/README.md)
- [会谈记录](./lobby-consultation-history/README.md)
- [等待室统一面板](./lobby-unified-panels/README.md)
- [任心角色](./renxin-character/README.md)
- [咨询师立绘状态](./counselor-portrait-motion/README.md)
- [字体系统](./font-system/README.md)
- [App 图标](./app-icon/README.md)
