# App 图标设计记录

## 当前选定方向

用户确认使用 Ling 像素风头像图标作为 App 图标：

- 主体：Ling 近景半身像，温柔、安静、成熟。
- 风格：高清像素风，保留像素边缘与纸面质感。
- 背景：暖纸色底，带柔和绿色底蕴和低饱和植物叶片。
- 边框：细圆角纸质边框，轻微阴影。
- 禁用方向：医疗符号、红十字、通用聊天气泡、过厚边框、绿色圆盘。

## 资产位置

- 正式主图标：`assets/app/ling-app-icon.png`
- macOS 图标：`assets/app/ling-app-icon.icns`
- Windows 图标：`assets/app/ling-app-icon.ico`
- 多尺寸 PNG：`assets/app/ling-app-icon-*.png`
- 生成记录：`assets/runtime/app-icon/`

## 接入位置

Electron 开发窗口图标在 `apps/desktop/src/main/window.ts` 中读取 `assets/app/ling-app-icon.png`。
