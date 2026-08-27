# 后端 / 数据 / 模型进度

更新时间：2026-07-30。

## 已完成

- SQLite 初始化、版本化 migration，以及设置、会谈、消息、记忆、附件、摘要、概念化、督导、备忘录、准备状态和来信 repository。
- Electron main / preload / shared IPC 契约，统一成功失败结构和输入校验。
- SecretStore 抽象、API Key 脱敏读写、系统安全存储、旧 SQLite 密钥迁移、模型列表、连接测试和 OpenAI-compatible 流式 provider。
- 会谈 prompt snapshot、同咨询师备忘录冻结、token-first Context Planner、rolling summary 和脱敏 ContextPlan audit。
- `txt/md` 附件上下文、超长输入自动转资料、正文预算和重启读回。
- 会谈结束后的单次/长期概念化、李燕云督导、咨询备忘录、咨询师来信和失败重试状态。
- 会谈标题生成、数据 Markdown 导出、完整 SQLite 备份/恢复、本地密码锁和恢复短语。
- 删除会谈时的关联数据清理，以及新会谈与旧会谈后台收尾解耦。
- 主进程已按咨询运行时、数据、安全和 IPC 分组；Core 咨询逻辑已按实时会谈、会后整理、导入资料和共享纯逻辑分组，公共导出与运行顺序保持不变。

## 待完善

- PDF、DOC/DOCX、图片 OCR、资料管理、document summary/chunk 检索。
- 正式安装包中的系统凭据迁移、备份兼容、native SQLite 和跨平台路径验证。
- 后台整理的可观测性、取消/重试策略和真实模型质量评估。
- 如未来需要更强本地保护，单独设计数据库文件级加密与密钥恢复边界。

## 保持不变的边界

- Renderer 不直接访问数据库或完整 API Key。
- API Key 不进入 SQLite 和数据备份；系统安全存储不可用时不降级为明文保存。
- 主咨询不检索其他会谈原文；新会谈只承接创建时已完成的同咨询师备忘录。
- 审计记录不得包含会谈原文、完整 prompt、密钥或个人资料正文。
