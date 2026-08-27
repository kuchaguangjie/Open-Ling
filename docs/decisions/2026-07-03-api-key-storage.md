# API Key 本地存储边界

日期：2026-07-03

## 决定

第一版建立 `SecretStore` 接口，并使用本地 SQLite `secrets` 表作为 fallback 实现。普通 `settings` 只保存模型 Base URL、模型名和密钥状态，不保存完整 API Key。

## 原因

- Ling 后续会开源，API Key 不能出现在仓库、日志、测试输出或普通设置读回中。
- 当前阶段需要先保证 DeepSeek / OpenAI-compatible 对话链路可用。
- 系统钥匙串接入涉及 macOS / Windows / Linux 差异，适合在打包验证阶段替换 SecretStore 实现。

## 影响

- renderer 默认拿不到完整 API Key，只能看到 `apiKeySaved` / `apiKeyPreview`。
- Electron main process 在发起模型调用时从 SecretStore 读取完整 key。
- `DEEPSEEK_API_KEY` 环境变量仅作为本地开发和 smoke test 回退。
- 后续接入 macOS Keychain / Windows Credential Manager 时，应保持 `SecretStore` 接口不变，替换底层实现。
