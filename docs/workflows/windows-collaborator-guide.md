# Windows 协作者使用说明

本文面向第一次在 Windows 上参与 Ling 项目的协作者。按下面步骤做即可启动本地开发版 App。

## 1. 准备工具

请先安装：

- Git for Windows
- Node.js LTS，建议使用 Node 22
- Visual Studio Build Tools 2022

安装 Visual Studio Build Tools 时至少勾选：

- Desktop development with C++
- MSVC v143 C++ build tools
- Windows 10/11 SDK

Ling 使用 `better-sqlite3` 作为本地 SQLite native 依赖。如果没有 C++ build tools，`npm ci` 或 rebuild SQLite 时可能失败。

## 2. 克隆仓库

在 GitHub 仓库页面复制官方仓库 URL，然后在 PowerShell 或 Windows Terminal 里执行：

```powershell
git clone <official-repository-url>
cd ling
```

## 3. 安装依赖

在项目根目录执行：

```powershell
npm ci
```

如果这里报 `better-sqlite3`、`node-gyp`、`MSBuild` 或 C++ 编译相关错误，先确认 Visual Studio Build Tools 已安装，再重新执行：

```powershell
npm ci
```

## 4. 启动开发版 App

```powershell
npm run app
```

启动后会同时运行 Vite 开发服务和 Electron 桌面端。主线固定使用：

```text
http://127.0.0.1:45174/
```

如果提示端口被占用，先关闭已有 Ling 开发服务或 Electron 窗口，再重新运行 `npm run app`。

## 5. 网页预览

只想看网页预览时可以运行：

```powershell
npm run dev
```

然后打开：

```text
http://127.0.0.1:45174/
```

注意：网页预览不等同于完整 Electron App。涉及 SQLite、本地密钥、系统文件选择、Electron IPC 的能力，仍以 `npm run app` 为准。

## 6. 配置模型

Ling 不自带 API Key。首次启动后进入：

```text
设置 -> 系统设置 -> 模型接入
```

填写：

- API Base URL，例如 `https://api.deepseek.com`
- API Key
- 默认模型，例如 `deepseek-v4-flash`

API Key 保存在你自己的本机数据目录，不会提交到 GitHub。

## 7. 常用验证命令

提交代码前至少运行：

```powershell
npm run typecheck
npm test -- --run
npm run build
```

如果刚运行过 `npm run app`，再跑测试时脚本会自动把 `better-sqlite3` rebuild 回 Node/Vitest 使用的 ABI。

## 8. 协作规则

- 不直接在 `main` 上开发新功能。
- 从最新 `main` 创建自己的功能分支，例如 `feat/windows-startup-docs`。
- 不提交 `.env`、API Key、本地 SQLite 数据库、导出文件、日志、录音或照片。
- 改动前先阅读 `AGENTS.md`、`README.md` 和 `docs/progress/README.md`。
- 如果要改重要 UI，先检查现有设计语言；方向不明确时先给出方案。

推荐分支流程：

```powershell
git checkout main
git pull
git checkout -b feat/your-feature-name
```

完成后：

```powershell
git status --short
npm run typecheck
npm test -- --run
npm run build
git add <本次任务相关文件>
git commit -m "feat: your feature summary"
git push -u origin feat/your-feature-name
```

然后在 GitHub 上发 Pull Request，等待审查和合并。

## 9. 常见问题

### npm ci 卡在 Electron 下载

检查网络代理或公司网络限制。Electron 包较大，下载失败时可以换网络后重试：

```powershell
npm ci
```

### better-sqlite3 编译失败

通常是 Visual Studio Build Tools 没装全。安装 C++ build tools 和 Windows SDK 后重新执行：

```powershell
npm ci
```

### npm run app 提示 45174 端口被占用

关闭已有 Ling 开发服务或 Electron 窗口后重试。也可以在 PowerShell 里查找占用端口的进程：

```powershell
netstat -ano | findstr :45174
```

确认是旧 Ling 进程后，在任务管理器里结束该进程。

### App 能打开但模型连不上

检查：

- API Key 是否填写并保存；
- Base URL 是否正确；
- 模型名是否可用；
- 本机网络是否能访问模型服务；
- 是否在 Electron App 里测试，而不是只打开网页预览。
