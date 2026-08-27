# Ling 开源发布清单

这份清单用于创建 Ling 新公开 GitHub 仓库。发布目标是公开当前经审核的源码，不公开旧 Git 历史、内部研究资料或用户数据。

## 一、权利与联系方式

- [ ] 确认版权主体为“上海啸群教育科技有限公司”。
- [ ] 按 `docs/project-identity.md` 检查分层身份口径：用户界面只呈现 Ling 品牌，GitHub 使用 `@Ling-Team`，正式文件识别公司主体，群心心理工作室仅作为 App 内 AI 咨询师团队设定。
- [ ] 确认 `openling@xiaoqunpsy.cn` 可正常收信，并至少有两名维护者可访问。
- [ ] 保留 Logo、应用图标和官方角色形象的权利证明或生产记录。
- [ ] 按 `docs/asset-rights-release-record.md` 完成公司内部留证；合同、订单和含个人信息的原始材料不上传 GitHub。
- [ ] 确认三位官方咨询师当前 Prompt 为此次拟公开版本。
- [x] 核对离线语音模型的上游权重许可，随模型保留 Apache-2.0 副本、来源、打包修改和校验值。
- [ ] 接受并记录上游尚未公开完整训练数据清单的透明度限制；若公司不接受，则在公开版中改为用户自行下载模型。

## 二、公开边界

- [ ] 运行 `npm run public-boundary:verify`。
- [ ] 运行 `npm run licenses:verify`；新增或升级依赖出现未审核许可时不得直接扩充白名单。
- [ ] 搜索密钥、`.env`、数据库、备份、录音、会谈导出和可识别个人的信息。
- [ ] 确认候选 Prompt、来源蒸馏、内部评审、安全测试记录和 held-out 评测数据不在公开目录。
- [ ] 确认素材分类与 `assets/ASSET_SOURCES.md` 一致。
- [ ] 人工抽查 `assets/runtime/` 和 `docs/design/` 中的旧版、测试和生产源图；只保留理解、构建或继续维护官方客户端确实需要的内容。

## 三、工程验证

- [ ] `npm ci`
- [ ] `npm run typecheck`
- [ ] `npm test -- --run`
- [ ] `npm run build`
- [ ] 在 macOS 运行开发版并完成一次新用户启动、模型连接和本地会谈写入冒烟测试。
- [ ] 让 GitHub CI 在新仓库的第一个 PR 上成功运行。

## 四、干净仓库

- [ ] 在源工作树已提交且无未保存修改时，运行 `npm run public:export -- "/path/to/Ling-public"`。
- [ ] 确认导出目录不包含 `.git`、旧 remote 或旧提交。
- [ ] 在导出目录内重新运行公开边界检查。
- [ ] 在确认所有公开内容后，将 `https://github.com/Ling-Team/Open-Ling` 设为干净导出仓库的唯一 remote，再创建第一个公开提交。

## 五、GitHub 设置

- [ ] 填写仓库描述、官方网站和 Topics。
- [ ] 启用 Issue 和 Discussion，禁止不受支持的 Wiki（如不使用）。
- [ ] 保护 `main`：禁止 force push/删除，要求 PR、CI 通过和对话已解决。
- [ ] 为组织至少设置两名管理员并开启 2FA。
- [ ] 设置安全报告联系和组织备份/恢复方式。
- [ ] 创建首个版本标签前，核对安装包版本、发布说明和已知安全边界。

## 六、社区治理

- [ ] 在正式接收外部 PR 前，确定 DCO 或 CLA，并修改 `CONTRIBUTING.md` 和 `GOVERNANCE.md`。
- [ ] 设置维护者、Issue 分类、响应时间和版本发布责任。
- [x] 明确“Ling 官方 / 合作开发 / 本地导入”的来源名称与认证边界；合作开发标识不得由第三方自行声明。
