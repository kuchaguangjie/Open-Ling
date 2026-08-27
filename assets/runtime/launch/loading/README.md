# Loading 素材清单

状态：`feat/launch-loading` 已完成正式湖面背景与多窗口 QA。

## 正式素材

| 文件 | 来源 | 用途 | 尺寸 | 正式采用 | QA |
| --- | --- | --- | --- | --- | --- |
| `final/loading-lake-background-no-ui-v1.png` | 以 `docs/design/launch-onboarding/loading-lake-direction.png` 为唯一编辑目标，使用内置 `imagegen` 做精准对象移除 | 启动 Loading 全屏无字湖面背景 | 1486×1058 RGB PNG | 是 | 下列三张窗口截图 |
| `final/ling-wordmark-green-transparent-v1.png` | 用户在启动页视觉审核中提供的 Ling 手写体透明 Logo | 底部延迟功能提示的品牌标识 | 393×208 RGBA PNG | 是 | 浏览器独立预览 |

生成方式：`gpt-image-2` 内置图像编辑。只移除方向稿中的三人舟 Logo、全部文字、盾牌图标和进度点/连线，并原位补全湖水、倒影与薄雾；要求保持原构图、晨光、山线、两侧岸景、前景植物和纸张肌理，不新增人物、船、标志或其他物件。

三人舟不烘焙进背景。组件复用正式透明 Logo：

`assets/runtime/lobby/waiting-room/redesign/logo/qunxin-boat-three-people-logo-transparent-4x-v1.png`

项目权利人提供的官方 Logo 用于确认形状与酒红色方向；正式引用采用仓库内同形、更高分辨率的 4× 透明版本，不覆盖既有 Logo 素材。

## 视觉 QA

| 文件 | 视口 | 检查结果 |
| --- | --- | --- |
| `qa/startup-loading-1920x1080-v1.png` | 16:9 | 主体、状态与底部提示完整，湖面裁切稳定 |
| `qa/startup-loading-1440x900-v1.png` | 16:10 | 上下留白与岸景完整，文字对比可读 |
| `qa/startup-loading-1100x720-v1.png` | 窄桌面 | 无横向或纵向溢出，提示未裁切 |

未保留探索候选：本次按已确认方向稿做定向去元素复刻，没有自由生成其他视觉方向。
