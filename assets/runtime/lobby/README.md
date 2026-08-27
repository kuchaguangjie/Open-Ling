# 等待室素材

本目录仅保存现行“静态等待室 + 任心接待 + 点击探索”方案所需的位图资产，不包含用户角色、像素移动或角色切换器。

## 当前资产

- `waiting-room/waiting-room-baseline-v1.png`：用户确认的主等待室视觉基准。
- `waiting-room/counselor-team-photo-overhead-table-v1.png`、`counselor-team-photo-tea-candid-v1.png`、`counselor-team-photo-shoulder-huddle-v1.png`：点击前台小相框后可切换查看的三位咨询师日常合照。
- `receptionist/renxin/renxin-portrait-transparent-v1.png`：前台助理任心的透明半身立绘，可用于柜台后与接待对白。
- `receptionist/renxin/renxin-scene-pixel-transparent-v1.png`：任心的独立像素风场景人物，只用于柜台后的大厅状态。
- `outdoor-garden/lakeside-garden-sunny-v1.png`：窗外入口对应的湖畔花园晴天场景。
- `outdoor-garden/lakeside-garden-rainy-v1.png`：同一场景的雨天版本。

## 资源边界

- 大厅背景保持静态构图；交互热点由前端覆盖层定位，不把按钮、文字或角色直接烘焙进背景图。
- 任心的场景人物与对白人物使用不同素材：像素场景人物负责柜台后的空间关系，大半身立绘负责前景对白。
- 户外场景使用整屏切换；室内窗帘与家具不需要被抠出或动画化。
- 历史像素移动原型已单独归档到下载目录，不在当前 feat 中保留或引用。
