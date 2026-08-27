# Git 工作流

## 项目首次建立

```text
从已审核的无历史公开快照创建首次提交 → 创建 GitHub 公开仓库 → 推送 main
```

## 每个功能

```text
从 main 开分支 → 实现 → 提交 → 推送分支 → PR 审查与 CI → 合并 main
```

## 常用检查

```bash
git status
git branch --show-current
git log --oneline --decorate -5
```
