# 启动 Loading 文案清单

本文档是启动 Loading 两组文案的审阅稿。App 实际使用的文案位于：

`apps/desktop/src/renderer/features/startup-loading/startupLoadingContent.ts`

调整本文档后，需要同步修改上述代码文件并运行组件测试。

## 上方：工作室生活短句

显示规则：第一条立即出现，之后约每 `3.2s` 切换；只作为安静的氛围信息，不进入读屏播报；句末不加标点。

1. 程灵正沿着湖边慢慢走
2. 周舟把刚读完的书放回书架
3. 林乐水正在整理今天的咨询备忘录
4. 任心在给等待室的盆栽浇水
5. 工作室的灯已经亮起来了

## 下方：实际功能提示

显示规则：启动超过约 `2.5s` 后出现；每次打开只选择一条，本次启动期间不切换；句末不加标点。

1. 任心在前台，可以介绍工作室，也可以带你选择咨询师
2. 书架里的虚构故事，由三位咨询师从各自关注的心理视角创作
3. 墙上的相册里，留着三位咨询师在工作室的一张合照
4. 窗外的湖畔花园可以切换晴雨，也可以安静地停留一会儿
5. 资料桌里有使用帮助、危机支持和完整知情说明
6. 正式结束一场咨询后，生成完成的咨询师来信会收在沙发区
7. 点开三位咨询师的介绍，可以了解她们如何理解咨询、如何与你工作
8. 设置里可以管理模型接入、咨询连续性、数据与隐私
9. 会谈、来信和设置默认保存在你的本地

## 主线功能核对

| 等待室入口 | 实际功能 | 核对位置 |
| --- | --- | --- |
| 前台 | 与任心交谈，了解工作室或进入咨询师选择 | `pages/lobby/interaction/LobbyHotspotLayer.tsx`、`pages/lobby/content/dialogueContent.ts` |
| 书架 | 按咨询师浏览和阅读原创虚构故事 | `pages/lobby/features/bookcase/BookcaseFeature.tsx` |
| 相册 | 查看程灵、周舟和林乐水的工作室合照 | `pages/lobby/features/photo/StudioPhotoFeature.tsx` |
| 花园 | 进入湖畔花园并切换晴天、雨天 | `pages/lobby/garden/OutdoorGarden.tsx` |
| 资料桌 | 查看使用帮助、危机支持和完整知情说明 | `pages/lobby/features/resources/ResourceTableFeature.tsx` |
| 来信 | 筛选、搜索、预览和阅读咨询结束后生成的咨询师来信 | `pages/lobby/features/sofa-letters/SofaLettersFeature.tsx` |
| 三位咨询师 | 查看各自的咨询理解、工作方式、关注议题并预约咨询 | `pages/lobby/features/counselors/CounselorIntroductionFeature.tsx` |
| 设置 | 管理个人资料、模型接入、咨询连续性、数据与隐私等 | `pages/lobby/features/resources/userGuideContent.ts` |

核对基准：主线 `main`，2026-07-15。主线当前用户指南也明确写明“书架”用于阅读三位咨询师创作的虚构故事；咨询师的工作方式从三位咨询师的介绍入口查看。
