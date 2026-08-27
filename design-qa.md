# Ling 视觉设计 QA

## 会谈区宽度、底部安全区与标题居中

- Source visual truth: 用户提供的程灵输入框过宽及底部重叠截图
- Implementation screenshot: `output/product-design/counseling-room/width-spacing-fix-electron.png`
- State: 桌面最大窗口、侧栏收起、已有消息、输入框空闲态

### Findings

最终没有剩余 P0、P1 或 P2 问题。

- 宽度：收起侧栏后的会谈面板恢复 1240px 上限；输入框改为 `min(可用宽度, 58vw, 1120px)` 并水平居中，大窗口不再无限横向铺满。
- 底部：会谈面板恢复 26px 底部安全区；输入框底边与主玻璃框底边之间形成明确空隙，不再重叠。
- 标题：session 标题使用 `justify-self: center` 真正居中，并在主框顶边下方保留约 12px 视觉间隙。
- 内容：消息流继续占据独立的中间网格行，输入框宽度与底部间距变化没有覆盖历史消息。
- 响应式：900px 以下仍使用原有单列输入框宽度，不受桌面 1120px 上限影响。

### Interaction verification

- 在正在运行的 Electron 开发版中检查标准窗口和最大窗口，标题、消息流、输入框、附件、语音、发送按钮与人物列均正常。
- 样式回归覆盖 1240px 面板上限、26px 底部安全区、标题居中与顶部间隙。

final result: passed

## 会谈框统一横向基准修复

- Source visual truth: 用户提供的林乐水 session 2 错位实机截图
- Implementation screenshot: `output/product-design/counseling-room/alignment-fix-electron-max.png`
- State: 林乐水 session 2，已有一轮“测试”消息，侧栏收起，输入框空闲态

### Findings

最终没有剩余 P0、P1 或 P2 问题。

- P1 根因：主玻璃框和标题使用 `clamp(320px, 23vw, 470px)` 作为左起点，消息流与输入框则从会谈内容区起点布局；窗口变化时两套坐标产生 300px 以上的可见错位。
- 修复：桌面展开态主玻璃框从内容区 18px 开始；侧栏收起态统一从既有 110px 内容预留开始。标题取消额外横向偏移，输入框仅保留 24px 的内部层级缩进。
- 实机：最大窗口下，主框、标题、消息流和输入框现在共享同一左侧视觉轴；人物列完整显示，主框没有继续横穿人物区域。
- 响应式：小于 900px 时仍由既有 6px 单列内边界接管，不受桌面 110px 预留影响。

### Interaction verification

- 在正在运行的 Electron 开发版中验收林乐水 session 2，人物、历史消息、附件、语音与发送按钮均保持正常。
- 分别检查标准窗口和缩放后的最大窗口，未再出现标题/外框与输入框分属两套起点的问题。

final result: passed

## 程灵会谈室透明水玻璃与真实暖色背景

- Source visual truth: `docs/design/counseling-room/2026-08-21-water-glass-direction.png`
- Implementation screenshot: `output/product-design/counseling-room/implementation-pass-4-normalized.png`
- Full comparison image: `output/product-design/counseling-room/comparison-full-v4.jpg`（左参考、右实现）
- State: 两侧均为程灵 session 1、空消息流、侧栏收起、输入区空闲态
- Source pixels: 1697 × 901（已移除参考图的 26px macOS 窗口标题栏）
- Implementation pixels: 1697 × 901 CSS px；浏览器捕获设备比例 0.67，验收图按实际内容区域归一化到同尺寸

### Findings

最终没有剩余 P0、P1 或 P2 问题。

- 构图：桌面 16:9 下，会谈玻璃左边界与参考图一致落在约 x=408；输入框从 x=152 延伸到 x=1204，并与人物腿部区域形成轻微交叠，不再远离人物。
- 标题：标题恢复为 322 × 50px 的紧凑矩形玻璃牌，14px 圆角、暖白文字和清楚细边框；不再是胶囊，也不再横贯整个会谈框。
- 水玻璃：会谈框与输入框取消模糊，只保留透明染色、边缘高光和极轻内阴影；背景纹理保持清晰，没有磨砂白雾。
- 背景：移除房间上方两层浅米白蒙版，改为低透明暖暗角。实机画面较参考略深，木材、壁炉和地毯颜色更扎实，符合“稍微深一些但色彩更现实”的反馈。
- 控件：附件与麦克风热区提高到 40px，发送按钮提高到 48px；三者使用稳定的暗色透明底、亮色图标和描边，在窗边高光、地毯与木桌区域上都保持清楚。
- 边界：实机测量输入框底部为 y=849、发送按钮底部为 y=837，均位于 901px 可视区域内；无裁切或水平溢出。

### Comparison history

1. 初版 P1：会谈框过窄且靠左，标题横贯、输入区泛白，人物与内容之间出现大块无效距离。
2. 第二版 P1：透明结构已经建立，但背景仍被页面级浅米色渐变洗白，底部裸图标在复杂背景上对比不足。
3. 最终修正：移除白色场景叠层，使用轻暖暗角；按参考图重新锁定会谈框、标题牌和输入区几何，并增强三个底部按钮的稳定对比度。

### Interaction verification

- 在开发版实机中从等待室预约程灵并跳过开场，确认 session 1 空会谈状态可正常进入。
- 辅助功能树确认“添加附件”“开始语音输入”“发送”三个按钮均存在；发送按钮空输入时维持可辨识的禁用态。
- 实机 DOM 尺寸确认标题、输入区和人物列均在默认 16:9 可视区内，没有遮挡关键操作。

### Follow-up polish

- P3：右侧人物立绘沿用项目当前正式素材，因此人物细节与生成参考图存在非结构性差异；本次没有替换人物，以避免破坏既有动作帧和会谈流程。

final result: passed

## 咨询师主题标题栏与输入框底部留白

- Source visual truth: 本地对比图中的程灵薄荷绿标题栏，并结合用户指定的“程灵改暖色、周舟浅蓝、林乐水浅绿、输入框上移”方向
- Implementation screenshot: 本地 Electron 验证截图（不随仓库分发）
- Full comparison image: 本地 QA 临时文件（不随仓库分发）
- Supporting background references:
  - `assets/runtime/counselor-portrait-motion/zhouzhou/current/zhouzhou-wide-room-background-v2.png`
  - `assets/runtime/counselor-portrait-motion/linleshui/backgrounds/linleshui-rain-window-room-background.png`
- State: 两张对比图均为程灵 session 9、相同消息内容与 1290 × 768 默认窗口；只有标题主题和输入框底部间距发生变化
- Source pixels: 1290 × 768
- Implementation pixels: 1290 × 768
- CSS viewport: 1290 × 768，device scale factor 1；无需密度归一化

### Findings

最终没有剩余 P0、P1 或 P2 问题。

- 字体与层级：标题继续使用 18px/650 的宋体体系和居中排版，主题换色没有削弱清晰度。
- 间距与布局：会谈面板底部内边距从 16px 增至 26px，输入框整体上移约 10px；外框底部现在有明确留白。外层四角由 10px 调整为 14px，标题栏顶部为 12px，圆润但仍明显比 20px 输入框利落。
- 颜色与主题：程灵使用暖米杏玻璃、棕褐标题；周舟使用浅雾蓝玻璃、灰蓝标题；林乐水使用浅鼠尾草绿玻璃、深绿色标题。
- 图像与构图：程灵真实窗口对比确认暖米杏色与深棕书架、壁炉和人物服装协调；周舟与林乐水的背景原图分别复核了浅雾蓝和浅绿的环境色依据。
- 文案：动态标题内容和 session 编号保持不变，没有因主题拆分复制或修改产品文案。

### Comparison history

1. 全局薄荷绿在程灵的暖棕场景中形成突兀的冷暖断层。
2. 修正为按 `room-layout-{counselorId}` 提供独立标题颜色变量，同时保留统一的磨砂、圆角和排版结构。
3. 程灵实窗并排复核确认暖米杏色融入场景；输入框底部留白从近贴边改善为约 16px 的可见呼吸空间。
4. 用户反馈 10px 外框偏尖后，将外框调整到 14px、标题栏顶部调整到 12px；并排复核确认四角更柔和但没有恢复最初的胶囊感。

### Interaction verification

- 在真实 Electron App 中从等待室重新进入程灵 session 9，确认会谈数据、消息滚动区、输入内容和发送按钮保持正常。
- 自动化样式回归覆盖三位咨询师的主题变量和桌面端 26px 底部内边距。

### Follow-up polish

- P3：周舟与林乐水沿用同一透明度，若未来两人的背景素材显著变亮或变暗，可只调整各自变量，不影响结构。

final result: passed

## 会谈室标题居中与外框锐角化

- Source visual truth: 本地 Electron 参考截图，并结合用户指定的“标题居中、外框圆角更小、标题水玻璃更轻”修改方向
- Implementation screenshot: 本地 Electron 验证截图（不随仓库分发）
- Comparison images: 本地 QA 临时文件（不随仓库分发）
- State: 两张图均为 Ling 桌面 App、程灵会谈室和默认 1290 × 768 窗口；会谈编号与消息内容不同，但标题栏、外框和立绘构图处于可直接比较的同一布局状态
- Source pixels: 1290 × 768
- Implementation pixels: 1290 × 768
- CSS viewport: 1290 × 768，device scale factor 1；无需密度归一化

### Findings

最终没有剩余 P0、P1 或 P2 问题。

- 字体与层级：标题改为居中，使用现有 `--font-title` 宋体体系、17px/620 字重和轻微字距；相比左对齐版本，标题不再与消息头像形成拥挤的左侧视觉堆叠。
- 间距与圆角：外层会谈玻璃框从 20px 收到 10px，标题栏顶部圆角为 8px；内部输入框保留更柔和的 20px，形成清楚的外框与内部控件层级，而不是机械对齐。
- 颜色与材质：标题栏改为 70% 浅薄荷磨砂玻璃、12px 背景模糊、鼠尾草绿分割线和深绿色文字；既遮住书架的复杂纹理，又与输入框的清新配色形成统一。
- 图像与构图：右侧程灵立绘的尺寸、位置和清晰度没有变化；外框锐角化没有侵入人物区域。
- 文案：继续只显示“与程灵的会谈 · session N”，没有恢复“当前会谈”等冗余标签。

### Comparison history

1. 第一版标题左对齐、外框 20px，形成明显的圆润卡片感，标题与左侧消息内容抢占同一视觉轴。
2. 第一轮修正将标题居中、外框收至 12px，并尝试手写感标题字体；真实窗口复核发现标题在书架背景上偏轻。
3. 第二轮将外框收至 10px，标题换回更清楚的宋体体系并提升字重；真实窗口仍发现深色文字会与深棕书架混在一起。
4. 最终改为茶灰烟熏玻璃和暖白标题，并把背景模糊提升至 6px；并排对比确认书架纹理不再破坏字形，标题在默认窗口下一眼可读。
5. 用户反馈茶灰色过深后，进一步改为浅薄荷磨砂玻璃和深绿色标题；对比确认文字仍清楚，同时整体明显更轻、更清新。

### Interaction verification

- 在真实 Electron App 中确认标题动态内容、单行省略、居中排版和默认窗口构图。
- 1290 × 768 实际窗口未出现标题截断、布局跳位或外框覆盖立绘。

### Follow-up polish

- P3：浅薄荷栏在暖色场景里会形成轻微冷暖对比，这是为了与输入框和发送按钮建立同一套清新界面色。

final result: passed

## 会谈室标题水玻璃栏

- Source visual truth: 本地生成的设计参考（不随仓库分发）
- Implementation screenshot: 本地 Electron 验证截图（不随仓库分发）
- Comparison images: 本地 QA 临时文件（不随仓库分发）
- State: 设计稿为空会谈状态；实现图为真实 Electron App 的 session 2 已有消息状态。标题栏、外框、输入框和立绘比例可直接比较。
- Viewport: 实现图 1290 × 768 CSS px，device scale factor 1
- Source pixels: 1554 × 1012
- Implementation pixels: 1290 × 768

### Findings

最终没有剩余 P0、P1 或 P2 问题。

- 信息层级：删除“当前会谈”辅助标签，只保留“与程灵的会谈 · session 2”动态标题，避免标题区占两层高度。
- 标题栏：改为约 48px 高的贯通式水玻璃栏；细分割线建立边界，背景仍可看见且标题在复杂场景中保持清晰。
- 空间效率：标题栏上下留白明显收窄，消息流获得更多可用高度。
- 圆角系统：会谈外框和输入框统一为 20px 圆角；标题栏使用与外框相接的 18px 顶部圆角，视觉上属于同一套比例。
- 构图平衡：右侧大幅立绘的尺寸与位置保持不变；会谈区右边界继续向右延伸，但没有侵入人物主体。
- 工具图标：附件和麦克风默认使用裸图标，只有悬停或键盘聚焦时才出现轻量圆形反馈。

### Interaction verification

- 在真实 Electron App 中确认动态标题、单行省略、输入框空闲态和默认窗口布局。
- 辅助功能树确认附件、麦克风按钮及其说明文本均可识别。
- 自动化测试覆盖附件/麦克风说明、语音快捷键录入与清除，以及会谈室布局回归。

### Follow-up polish

- P3：实现图的玻璃栏在书架深色区域上比概念图略显乳白，这是为了让深浅混合背景上的深色动态标题维持稳定对比度。

final result: passed

## 会谈室空间与立绘比例

- Source visual truth: 用户提供的本地参考图（不随仓库分发）
- Implementation screenshot: 本地 Electron 验证截图（不随仓库分发）
- Comparison image: 本地 QA 临时文件（不随仓库分发）
- State: Ling 桌面 App，会谈 session 2，侧栏收起，输入框空闲
- Viewport: 1290 × 768 CSS px，device scale factor 1
- Source pixels: 2128 × 1384
- Implementation pixels: 1290 × 768

### Findings

最终没有剩余 P0、P1 或 P2 问题。

- 视觉重心：右侧程灵立绘保持完整的大幅呈现，约占默认窗口 35%–40%；人物没有被聊天区挤压，也没有缩成边缘装饰。
- 空间分配：左侧会谈区适度收紧，玻璃框的有效内容区域向上下左右扩展；立绘与会谈区之间仍保留清楚的视觉分界。
- 顶部内容：消息流顶部内边距收至 12px，头像、名字和首条消息不再受隐形空栏挤压或贴边截断。
- 输入区：输入框空闲高度从 166px 收至 142px；正文从组件顶部约 14px 开始，减少无意义的上方留白。
- 横向效率：收起侧栏后的内部左侧预留从 202px 收至 110px，输入框横向外边距从 64px 收至 24px；扩大内容本身，而不是覆盖立绘。
- 响应式边界：桌面端右侧主视觉列使用 `clamp()` 保持最小宽度；较窄桌面窗口仍优先保留人物体量。
- 原有审美：暖色场景、通透玻璃、浅色气泡和大立绘的既有设计语言保持不变，没有引入新的视觉体系。

### Comparison history

1. 第一轮发现 P2：扩大内容区时，右侧列从 430px 收到了 380px，默认窗口下会轻微削弱人物的主视觉地位。
2. 修复：右侧列改为 `clamp(410px, 36vw, 520px)`；程灵立绘上限从 640px 提至 680px，同时保持右侧定位。
3. 最终并排复核：人物体量不小于原始截图，左侧内容更有效率，玻璃框与立绘之间没有重叠或失衡。

### Interaction verification

- 在真实 Electron App 中复核 session 2 默认窗口状态。
- 在浏览器中完成预约、跳过开场、发送消息，并打开语音首次使用提示。
- 输入框空闲态、语音提示态、消息新增后的滚动布局均未出现跳位。

### Follow-up polish

- P3：小于 900px 的移动式单列布局仍隐藏立绘，这是既有产品断点行为；本次“右侧大立绘”保证覆盖桌面会谈体验。

final result: passed

## 语音输入框

- Source visual truth: 本地生成的设计参考（不随仓库分发）
- Implementation screenshot: 本地 Electron 验证截图（不随仓库分发）
- Comparison image: 本地 QA 临时文件（不随仓库分发）
- State: Ling 桌面 App，本地语音正在听写，环境音量接近静音
- Viewport: 1290 × 768 CSS px，device scale factor 1

### Findings

最终没有剩余 P0、P1 或 P2 问题。

- 实时文字仍是输入框主体；“正在听写”降为小号辅助信息。
- 附件、停止、长声轨、发送保持同一基线，停止入口唯一且清楚。
- 暖白、浅薄荷绿、鼠尾草绿和珊瑚红与确认稿一致。
- 交互图标来自 Phosphor；中央 Canvas 声轨由实时音量驱动。
- 听写态只显示“正在听写”，停止后立即移除状态。

### Interaction verification

- 在真实 Electron App 中连续完成两次开始听写与停止听写。
- 点击停止后立即恢复“开始语音输入”，未显示阻塞式“正在结束听写”。
- 本地识别最终解码超时回归测试验证：最后 partial 会提交为 final，并必定发送 stopped。

final result: passed
