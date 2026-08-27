# 任心对白框素材

本目录只保存 `L-011` 对白框专属素材。人物、等待室背景、共享入口和其他功能素材不放在这里。

## 目录

- `candidates/`：当前待选母版；每个候选同时保留键控源图与透明 PNG。
- `qa/`：候选在真实等待室背景中的组合预览。
- `final/`：用户选定并通过透明边缘检查后才创建。

## 当前候选

| 候选 | 特征 | 状态 |
| --- | --- | --- |
| `responsive-a` | 最接近已确认的精装访客册；木框中等厚度、纸面层次最细 | candidate |
| `responsive-b` | 框体更轻、纸面更干净、铭牌最长、Logo 浮雕最浅 | candidate |
| `responsive-c` | 木框层次最强、纸面较高、Logo 浮雕较深 | candidate |
| `four-corners-v2` | 独立主面板；纸面扩大、木边变薄、纸面四角都有植物压纹 | candidate-recommended |
| `nameplate-compact-s` | 独立紧凑铭牌；Logo 最小、整体最短 | candidate-recommended |
| `nameplate-compact-m` | 独立平衡铭牌；中等长度与浮雕深度 | candidate |
| `nameplate-compact-l` | 独立舒展铭牌；三者中最长但仍短于旧版 | candidate |
| `nameplate-wall-logo-a` | 独立紧凑铭牌；最小暗酒红墙面式浮雕 Logo | candidate-recommended |
| `nameplate-wall-logo-b` | 独立紧凑铭牌；中等酒红浮雕与高光 | candidate |
| `nameplate-wall-logo-c` | 独立紧凑铭牌；浮雕更深、Logo 略大 | candidate |
| `nameplate-mini-logo-p1` | Logo 缩小约 42%，铭牌最紧凑、浮雕最克制 | candidate-recommended |
| `nameplate-mini-logo-p2` | Logo 缩小约 40%，名字与 Logo 间距均衡 | candidate |
| `nameplate-mini-logo-p3` | Logo 缩小约 37%，保留稍多呼吸空间 | candidate |
| `nameplate-p3-tiny-logo` | 基于 P3；Logo 再缩小约 25%–30% 并靠近右侧内边缘 | candidate-recommended |
| `nameplate-short-k1` | 在 tiny-logo 基础上缩短约 18% | candidate |
| `nameplate-short-k2` | 在 tiny-logo 基础上缩短约 23% | candidate |
| `nameplate-short-k3` | 在 tiny-logo 基础上缩短约 28%，最紧凑 | candidate-recommended |
| `nameplate-panel-walnut-j1` | 与对话框同色胡桃木；在 K3 上再缩短约 10% | candidate |
| `nameplate-panel-walnut-j2` | 与对话框同色胡桃木；在 K3 上再缩短约 15% | candidate-recommended |
| `nameplate-panel-walnut-j3` | 与对话框同色深胡桃木；在 K3 上再缩短约 20% | candidate |
| `nameplate-calibrated-t1` | 校准为暖胡桃木；Logo 为最暗氧化酒红 | candidate |
| `nameplate-calibrated-t2` | 校准为暖胡桃木；Logo 为低饱和酒红棕 | candidate-recommended |
| `nameplate-calibrated-t3` | 校准为暖胡桃木；Logo 略暖但保持低饱和 | candidate |
| `nameplate-user-walnut` | 用户提供的暖胡桃木铭牌；多层倒角边框与右侧小型酒红 Logo | selected-trial |
| `clean-rounded-v1` | 完整重生成的简洁圆角框；连续胡桃木、完整纸页、单根内描边，无角花和旧切片残影 | selected-production |

共同约束：顶边完全水平；铭牌内无生成文字；Logo 只在铭牌右侧；正文、虚线、叶片起始符和箭头均不烘焙；黄铜只在左下和右上。

## QA 预览

| 候选 | 等待室组合预览 | 初步判断 |
| --- | --- | --- |
| `responsive-a` | `qa/dialogue-panel-responsive-a-waiting-room-preview-v1.png` | 推荐；边角最精致，木框与纸面层次最接近已确认母版 |
| `responsive-b` | `qa/dialogue-panel-responsive-b-waiting-room-preview-v1.png` | 更轻、更现代，但访客册质感略弱 |
| `responsive-c` | `qa/dialogue-panel-responsive-c-waiting-room-preview-v1.png` | 木质存在感最强，视觉重量也最大 |
| `four-corners + compact-s` | `qa/dialogue-panel-four-corners-nameplate-s-preview-v2.png` | 推荐；纸面利用率最高，铭牌紧凑且 Logo 不拥挤 |
| `four-corners + compact-m` | `qa/dialogue-panel-four-corners-nameplate-m-preview-v2.png` | 铭牌更舒展，适合较长人物名 |
| `four-corners + compact-l` | `qa/dialogue-panel-four-corners-nameplate-l-preview-v2.png` | Logo 浮雕最明显，铭牌视觉重量也最大 |
| `four-corners + wall-logo-a` | `qa/dialogue-panel-wall-logo-a-preview-v3.png` | 推荐；Logo 最小，名字与 Logo 的距离最紧凑 |
| `four-corners + wall-logo-b` | `qa/dialogue-panel-wall-logo-b-preview-v3.png` | 酒红色更清楚，浮雕存在感适中 |
| `four-corners + wall-logo-c` | `qa/dialogue-panel-wall-logo-c-preview-v3.png` | 浮雕最明显，但 Logo 视觉重量也最大 |
| `four-corners + mini-logo-p1` | `qa/dialogue-panel-mini-logo-p1-preview-v4.png` | 推荐；Logo 最安静，名字与 Logo 形成紧凑信息组 |
| `four-corners + mini-logo-p2` | `qa/dialogue-panel-mini-logo-p2-preview-v4.png` | 比例最均衡，Logo 仍清楚可辨 |
| `four-corners + mini-logo-p3` | `qa/dialogue-panel-mini-logo-p3-preview-v4.png` | Logo 稍大，适合希望品牌更易识别的情况 |
| `role-layout-a` | `qa/dialogue-panel-role-layout-a-preview-v5.png` | 推荐；身份签从铭牌右下探出，层级清楚且结构连贯 |
| `role-layout-b` | `qa/dialogue-panel-role-layout-b-preview-v5.png` | 身份签位于右侧同轴，信息最直白但横向视觉重量较大 |
| `role-layout-c` | `qa/dialogue-panel-role-layout-c-preview-v5.png` | 身份签下方内收，最稳重但会占用更多纸面顶部空间 |
| `short-nameplate-k1` | `qa/dialogue-panel-short-nameplate-k1-preview-v6.png` | 稳妥缩短，仍保留较多木面 |
| `short-nameplate-k2` | `qa/dialogue-panel-short-nameplate-k2-preview-v6.png` | 名字与 Logo 比例均衡 |
| `short-nameplate-k3` | `qa/dialogue-panel-short-nameplate-k3-preview-v6.png` | 推荐；最紧凑，Logo 仍保持右侧精致细节 |
| `panel-walnut-j1` | `qa/dialogue-panel-panel-walnut-j1-preview-v7.png` | 木色统一，宽度最稳妥 |
| `panel-walnut-j2` | `qa/dialogue-panel-panel-walnut-j2-preview-v7.png` | 推荐；深胡桃木与酒红 Logo 分离清楚，宽度均衡 |
| `panel-walnut-j3` | `qa/dialogue-panel-panel-walnut-j3-preview-v7.png` | 最短最深，整体最克制 |
| `calibrated-t1` | `qa/dialogue-panel-calibrated-t1-preview-v8.png` | Logo 最暗，品牌存在感最低 |
| `calibrated-t2` | `qa/dialogue-panel-calibrated-t2-preview-v8.png` | 推荐；铭牌与外框明度最接近，Logo 暗红适中 |
| `calibrated-t3` | `qa/dialogue-panel-calibrated-t3-preview-v8.png` | 木色稍暖，Logo 更偏红棕 |

QA 预览中的姓名、正文与双箭头仅用于检查安全区，不属于正式面板素材。早期浮雕实验保存在本机 Codex 素材归档目录，不进入项目提交。

`nameplate-user-walnut` 保留了用户提供的绿幕源图，生产文件为 `final/nameplate-user-walnut-transparent-v2.png`；V2 已清理饱和绿幕与边缘溢色，姓名仍由界面文字叠加。
当前试装使用 `final/nameplate-original-style-clean-v1.png`：保留原图深色木纹和原始圆角包边，仅清理烘焙 Logo；Logo 以 `final/nameplate-logo-oxblood-transparent-v1.png` 独立放在右上角，不参与文字居中计算。

主面板当前使用 `final/dialogue-panel-clean-rounded-transparent-v1.png` 单张完整母图，通过 CSS `border-image` 九宫格拉伸：四角始终来自同一张母图，只拉伸中部纸面和边框。源图为 `candidates/dialogue-panel-clean-rounded-chromakey-v1.png`，使用平面绿幕生成并完成透明边缘、黑白暖色和等待室实景检查。旧 `dialogue-panel-slice-*-v1.png` 不再承担边框，仅裁取四张角片内部原有的麦穗叶纹作为纸页角花；旧卷角和边线均排除在显示区域之外。

## 命名

```text
dialogue-panel-<variant>-chromakey-vN.png
dialogue-panel-<variant>-transparent-vN.png
dialogue-panel-<variant>-waiting-room-preview-vN.png
```

候选被用户选定前不得复制到 `final/`，也不得修改 `ReceptionDialogue.tsx` 进行正式接线。
