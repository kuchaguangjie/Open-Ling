# Ling 非代码素材来源分类

本文档用于公开发布前的权利边界复核，不会把任何素材默认转为 Apache-2.0 License。具体授权以 `ASSETS_LICENSE.md`、`TRADEMARKS.md`、上游许可和文件所在目录的说明为准。

公开发布判断与公司内部留证要求见 `docs/asset-rights-release-record.md`。

## 上海啸群教育科技有限公司权利素材

以下目录中的 Ling 官方图片、界面素材、角色形象、Logo 和应用图标由上海啸群教育科技有限公司保留权利：

- `assets/app/`；
- `assets/brand/`；
- `assets/runtime/`，但不包下文单独列出的第三方音频；
- `docs/design/` 中的项目设计稿、示意图和视觉参考，但不包文件中明确标记的第三方参考。

这些素材留在公开源码中，用于构建和审查 Ling 官方客户端，不表示授予第三方作为产品品牌或素材包重新分发的权利。

## 第三方开放素材

| 类别 | 位置 | 来源与许可 | 发布状态 |
| --- | --- | --- | --- |
| 字体 | `assets/fonts/lxgw-zhenkai/` | LXGW ZhenKai，SIL Open Font License 1.1 | 许可副本已随仓库保留 |
| 花园风声 | `assets/runtime/lobby/outdoor-garden/audio/wind-through-trees-cc0.mp3` | Yoyodaman234 / Freesound，CC0 | 来源与作者已记录 |
| 花园雨声 | `assets/runtime/lobby/outdoor-garden/audio/rain-public-domain.ogg` | PDSounds / Wikimedia Commons，Public Domain | 来源已记录 |
| 花园音乐 | `assets/runtime/lobby/outdoor-garden/audio/meditation-impromptu-03-cc-by.mp3` | Kevin MacLeod，CC BY 4.0 | 要求的署名已记录 |
| 离线语音模型 | `assets/models/voice/x-asr-zh-en-punct-int8-480ms-2026-06-05/` | X-ASR 上游模型卡标为 Apache-2.0；经 k2-fsa/sherpa-onnx 发布 | 模型许可副本、来源、Ling 拆分修改和校验值已记录；完整训练数据清单未由上游公开，保留透明度说明 |

## 发布复核规则

- 公司权利素材新增外部作者或采购来源时，应保留合同、订单或授权记录，但不将合同原件上传公开仓库。
- 公司权利素材按目录归类不等于已经完成逐文件权属证明；发布负责人仍须在公司内部留存 Logo、角色形象和委托/生成素材的生产记录。
- 新增第三方素材必须同时记录来源 URL、作者、许可、修改状态和必要署名。
- 无法确认权利的文件不进入公开源码或公开安装包。
