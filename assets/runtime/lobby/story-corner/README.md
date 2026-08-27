# 书架故事角插图

生成日期：2026-07-12  
用途：`L-012` 书架故事簿文章卡片与阅读页头图。

## 文件

| 文件 | 对应文章 | 选择理由 |
| --- | --- | --- |
| `after-the-misunderstanding.webp` | 误解之后 | 雨后两张长椅留下关系距离，但不替读者解释情绪。 |
| `words-that-did-not-come.webp` | 说不出口的话 | 两只茶杯呈现具体的家庭日常，没有人物表演。 |
| `a-chair-by-the-window.webp` | 窗边的一把椅子 | 普通窗景和木椅准确呼应文章里的小空间。 |
| `walking-more-slowly.webp` | 走慢一点 | 树荫、花店和街巷能在小卡片中保持清楚层次。 |
| `practicing-goodbye.webp` | 告别的练习 | 行李、码头和远船表达离开，不使用煽情人物。 |
| `toward-the-light.webp` | 向光的一边 | 窗边绿萝和日常器物对应微小变化，避免励志符号。 |
| `half-jar-soup.webp` | 半罐汤 | 半罐汤具体呈现亲密关系里的照顾、愧疚与边界。 |
| `one-received-message.webp` | 一句“收到” | 没有可辨文字的手机通知，保留焦虑对空白的投射。 |
| `always-says-fine.webp` | 总说“没事”的人 | 空椅、外套和茶杯表现长期照顾别人后被忽略的自己。 |
| `qunxin-logo.png` | 故事角左上品牌标识 | 用户提供的群心心理暗红 logo，带透明通道，仅用于左上角品牌识别。 |

## 当前运行时彩墨组

2026-07-13 起，故事簿统一使用彩墨淡彩版本。九张图保持水墨笔触和宣纸肌理，同时以朱红、石青、藤黄、花青和草木绿避免灰暗单色。

| 文件 | 对应文章 | 画面线索 |
| --- | --- | --- |
| `half-jar-soup-ink-v1.webp` | 半罐汤 | 红色保温桶、半罐冬瓜汤与蓝布条。 |
| `seventeen-minutes-outside-ink-v1.webp` | 门外的十七分钟 | 暖光门缝、候诊长椅、水瓶与无字钟面。 |
| `red-pen-ink-v1.webp` | 红笔 | 编辑桌、红笔、旧铁皮盒和修鞋木楦。 |
| `one-received-message-ink-v1.webp` | 一句“收到” | 雨夜书桌与只亮起一个无字提示的手机。 |
| `tuesday-that-already-happened-ink-v1.webp` | 已经发生过的星期二 | 番茄牛腩、作业本、雨窗与黄色雨衣。 |
| `four-point-dinner-ink-v1.webp` | 四分的晚饭 | 青菜面、餐桌灯和等在旁边的猫。 |
| `always-says-fine-ink-v1.webp` | 总说“没事”的人 | 空椅上的珊瑚色外套、空白节目单和蓝丝带。 |
| `third-floor-room-ink-v1.webp` | 第三层的房间 | 一二层生活基础共同托住山景顶层。 |
| `last-sesame-flatbread-ink-v1.webp` | 最后一只芝麻烧饼 | 雨后烧饼铺、掰开的烧饼与裹毛巾的黄狗。 |

## 运行时规格

- 文章插图为 `720 × 450` WebP；品牌 logo 为用户提供的 `335 × 152` RGBA PNG；
- 原始生成图不进入项目运行时；
- 图片不包含用户资料、真实会谈、真实人物、文字或水印。

生成方式：OpenAI 内置图像生成工具；彩墨组逐篇按故事情节生成，经语义、裁切、清晰度与风格一致性检查后，使用项目内置 Pillow 运行时缩放为 WebP。三位咨询师头像不在此处重复生成，界面直接复用聊天气泡头像。
