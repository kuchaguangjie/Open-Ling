# 资料桌视觉素材

状态：v1 正式素材已完成  
用途：`L-013 资料桌` 文件卡目录与正文阅读层

## 生成合同

- 视觉基准：`docs/design/lobby-resource-table/resource-table-file-index-reference.png`。
- 实际位置：等待室覆盖页，最大宽度约 920px；背景会保留等待室场景并压暗。
- 锁定元素：暖象牙纸、胡桃木、克制细金线、灰绿色线稿、文件页签轮廓。
- 本轮允许变量：纸纹密度、木纹细节、线稿局部构图、透明层留白。
- 禁止内容：任何烘焙文字、按钮文案、人物、徽章、数值、游戏道具、鲜艳高饱和装饰。
- 安全区：主框中心保留大面积低信息纸面；文件卡中部与右侧不放固定装饰，以便 HTML 文字和操作对齐。
- 输出：主框底板为完整 PNG；卡片、图标和角花为透明 PNG，并保留 chromakey 源。
- 候选数量：已确认方向，每类只生产 1 个受控正式版本；技术失败时修复或重生成，不扩展新方向。

## 目录

- `frame/`：主框与暖纸底板。
- `tabs/`：可复用横向文件卡与页签。
- `icons/`：使用帮助、安全边界、知情说明三枚线稿图标。
- `ornaments/`：植物角花。
- `source/`：生成源图与 chromakey 源。
- `qa/`：透明边缘与真实背景合成检查。

## 验收

- 素材在实际 UI 尺寸仍清楚，不依赖放大查看；
- 透明层在黑、白、暖纸和等待室背景无绿/洋红色溢、白边或背景残块；
- 文件卡轮廓、三枚图标线宽和植物装饰属于同一视觉系统；
- 文字与交互保留为 HTML，不烘焙进图片；
- CSS 仅负责布局、响应式、文字、焦点和状态。

## v1 生产记录

- 主框：基于确认效果图生成完整胡桃木框与暖纸底板；首次全局去白会误伤暖纸，真实页面 QA 后改为只移除与画布边缘连通的外圈白底，中心暖纸保持完全不透明。
- 文件卡：使用纯洋红 chromakey 源生成，经 soft matte、despill 和内部残色清理输出透明 PNG。
- 图标：同一生成批次制作书本、盾牌、文档三枚线稿，先整表抠图，再按透明边界裁为独立正方形画布。
- 角花：纯洋红 chromakey 源，经 soft matte、despill 和残色清理输出透明 PNG。
- QA：`qa/resource-table-alpha-contact-sheet-v2.jpg` 检查白、黑、暖纸与灰绿背景；`qa/icons-black-v3.jpg` 检查小尺寸深色背景轮廓。四角透明、主体轮廓完整，未发现 chromakey 色溢或背景残块。
- 页面 QA：`docs/design/lobby-resource-table/qa-catalog-1440.png` 与 `qa-help-reader-1440.png` 记录目录和正文实际合成效果。

## Logo 与主框 v2

- `brand/qunxin-studio-logo-final-v1.png`：项目权利人提供的官方原比例透明 PNG；不重绘、不改色，仅在目录页以低透明度缩放使用。
- `frame/resource-table-frame-natural-corners-v2.png`：以 v1 主框为基准局部重做内侧金线四角，去掉向内凹的角花，改为连续圆弧与小叶片收尾；木框、暖纸和外部 alpha 继续沿用既有视觉基线。
- `source/resource-table-frame-natural-corners-source-v2.png`：图像编辑生成源，保留供后续追溯。
- `qa/resource-logo-frame-v2-contact-sheet.jpg`：Logo 在暖纸、深色和中性背景上的低透明度检查，以及新主框轮廓检查。
- `frame/resource-table-frame-natural-corners-clean-v6.png`：对 v2 外沿重新从自身源图计算八方向连通 alpha，并对半透明边缘做去白污染；解决深色等待室背景上出现白边的问题。
- `frame/resource-table-frame-clean-edge-v7.png`：在 v6 基础上对外沿 alpha 做 2px 局部收缩和轻量抗锯齿，移除四角与直边残留的白色毛边；当前按原图木框真实内沿使用 `44 52 45 52` 九宫格切片，避免把浅色纸面带入转角，也避免宽屏拉伸造成四边厚度失衡。深色、白色、暖棕和纸色角部检查见 `qa/frame-v7-clean-edge-contact-sheet.png`。
- `source/resource-table-rounded-frame-chromakey-v8.png`：以 v7 木纹与色调为参考重新生成的纯木框绿幕源；内外轮廓均为连续圆角，内部不再包含纸面。
- `frame/resource-table-rounded-frame-transparent-v8.png`：v8 绿幕源经本地柔边去绿与 1px 边缘收缩得到的透明成品；当前以 84px 九宫格切片供三个面板共用，内页保持独立 10px 圆角。
- `frame/resource-table-rounded-ring-final-v10.png`：基于 v9 胡桃木纹理收窄的正式木环；画布保持 1404×828，外圆角 48px、内圆角 24px、四边 24px，替代略厚的 v9。
- `frame/resource-table-rounded-ring-walnut-deep-v11.png`：保持 v10 几何与透明边缘不变，将橘黄色相向中深胡桃棕收敛，整体明度约降低 18%、饱和度约降低 18%；当前为三个面板共用的正式木框。
- `frame/resource-table-rounded-ring-walnut-seamless-v12.png`：保持 v11 色彩、24px 厚度和 alpha 轮廓不变，对四个转角做 alpha 感知的局部木纹融合，清除放大时可见的斜向明暗拼接线；当前为三个面板共用的正式木框。角部检查见 `qa/frame-v12-seamless-corners.png`。
- `frame/resource-table-rounded-ring-double-bevel-v13.png`：撤销 v12 的角部柔化，恢复 v11 清晰木纹；沿外圆角和内圆角增加连续的明暗压边，使直边的双层木质结构完整绕过四个转角。当前为三个面板共用的正式木框，角部检查见 `qa/frame-v13-double-bevel-corners.png`。
- `frame/resource-table-walnut-nine-slice-deep-v22.png`：三面板共用的独立深胡桃木底框，按 CSS `border-image` 九宫格切片设计。中心与外圈均透明，只保留低饱和、连续双层木质斜面；四角保持原始比例，四条边独立延展，避免面板宽高比变化时木纹和圆角被整体拉伸。洋红键控源使用硬边收缩与去色溢处理，中心、外角 alpha 为 0，木框主体 alpha 为 255。
- `frame/resource-table-walnut-nine-slice-dialogue-v23.png`：上一版三面板共用木框。沿用 v22 的透明九宫格结构和双层圆角轮廓，木色改为接待对话框主面板同档的暖棕胡桃木；去除刻花、回形线和重复装饰，只保留沿四边自然延续的克制木纹。键控使用 2px 硬边收缩与洋红去溢，透明区域与木框主体之间没有半透明脏边；现保留作回退基线。
- `frame/dialogue-slices-v24/`：当前三面板共用的正式木框八切片。参考接待对话框结构，从重新生成的暖棕自然胡桃木框中导出四个固定比例圆角块和四条边；角块不拉伸，边块只沿自身轴向延展，CSS 以 2px 重叠覆盖拼接缝。素材保留连续双层压边和清晰自然木纹，不含刻花、钩形、角部缺口或半透明脏边；v23 保留作回退基线。
- `frame/resource-table-paper-blank-v20.png`：独立的无字暖象牙纸纹层，仅保留低对比、无方向的自然纤维与轻微斑驳，不含边框、花纹、横线或阴影。页面圆角、木框露出厚度与内衬描边均由 CSS 控制。
- `qa/frame-v6-dark-clean.png`：正式框体在深色背景上的全尺寸边缘检查。

## 危机与安全支持 v1

- 视觉基准：`docs/design/lobby-resource-table/crisis-support-reference-v1.png`；只锁定暖象牙纸、暗森林绿线稿、淡金褐边线、卡片层级和留白，不采用效果图中的示例号码或医院信息。
- `crisis-support/icons/`：电话、人物、盾牌、房屋、陪伴者、心形标记、医院和右箭头八枚透明 PNG。全部由同一视觉合同生成，原始洋红 chromakey 背景经本地 soft matte、despill 和边缘清理后输出，并缩放到 256×256 画布。
- `crisis-support/texture/ivory-paper-texture-v1.png`：768×768 可平铺暖象牙纸纹；页面通过半透明底色降低对比，不承载任何文字。
- 页面用法：图标只承担快速识别，正文、号码、按钮、电话链接、焦点状态与响应式布局均由 HTML/CSS 实现；只有首屏紧急号码 `110`、`120` 使用克制红色。
- 适用范围：仅用于资料桌「危机与安全支持」审阅页，不替代机构 Logo、正式急救标识或专业风险判断。
- QA：`docs/design/lobby-resource-table/qa-crisis-icons-v1.png` 同时检查白、黑、暖纸和正式纸纹背景；图标主体完整，未发现明显洋红残色、白边或背景残块。

## 资料入口插画卡 v1

- 视觉基准：用户确认的三张手绘入口卡，采用克制可爱、偏水粉蜡笔的二维质感；不继续使用书本封面形态。
- `cards/resource-help-card-transparent-v1.png`：使用帮助入口，橄榄绿卡身、指南针、道路与终点小旗。
- `cards/resource-safety-card-transparent-v1.png`：心理危机与安全支持入口，陶土红卡身、电话听筒与信号线。
- `cards/resource-consent-card-transparent-v1.png`：知情同意书入口，暖灰米色卡身、知情说明纸张与钢笔。
- `cards/source/resource-cards-chromakey-sheet-v1.png` 与三个 `*-chromakey-v1.png` 保留生成源；洋红底经本地 chromakey、去色溢和独立残片过滤后输出透明 PNG。
- 三张卡片底部均保留无字暖象牙色区域；标题、摘要、查看入口、键盘焦点与响应式布局继续由 HTML/CSS 承载，避免烘焙文字。
- QA：`cards/qa/resource-cards-transparent-qa-v4.jpg` 检查白、黑、暖纸与正式纸面背景；未发现洋红边、灰底残块或卡外细线。
