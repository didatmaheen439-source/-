# 项目备份记录

日期：2026-07-09

## 备份对象

- 项目：过级搭子后台管理系统
- 项目根目录：`/Users/inn/Desktop/Workspace/projects/project-004-过级搭子后台管理系统`
- 当前分支：`codex/ai-coach-strategy-mvp`
- 当前最新提交：`df542ab feat(mock-exam): complete paper configuration MVP`

## 备份文件

- 源码压缩包：`/Users/inn/Desktop/Workspace/projects/project-004-过级搭子后台管理系统/项目备份/guojidazi-admin-backup-20260709-103406.tar.gz`
- Git 历史包：`/Users/inn/Desktop/Workspace/projects/project-004-过级搭子后台管理系统/项目备份/guojidazi-admin-git-20260709-103406.bundle`

## 排除项

源码压缩包排除了以下目录或文件：

- `admin-web/node_modules`
- `admin-web/.turbopack`
- `admin-web/dist`
- `admin-web/src/.umi`
- `.git`
- `backups`
- `项目备份`
- `.DS_Store`

## 校验结果

- `tar -tzf 项目备份/guojidazi-admin-backup-20260709-103406.tar.gz`：通过，可以列出归档内容。
- `git bundle verify 项目备份/guojidazi-admin-git-20260709-103406.bundle`：通过，bundle 包含完整历史。
- `shasum -a 256 项目备份/guojidazi-admin-backup-20260709-103406.tar.gz`：
  - `72cace502bbd8d67d27be45f3a488bc3c593e010883b59df4d07ae1c855cfb59`
- `shasum -a 256 项目备份/guojidazi-admin-git-20260709-103406.bundle`：
  - `d1029501d05d0b73482be3ca7d4ccc016abf361d3a4c8a9d706b82e20fbc171e`

## 记忆更新

- 新增项目根目录 `MEMORY.md`，记录当前模块完成情况、关键文件、技术决策、验证状态、备份文件和下一步注意事项。
- 更新 `README.md`，把本次备份和项目记忆作为最新状态入口。
- 更新 `.gitignore`，避免 `项目备份/` 中的大文件进入 Git。

## 恢复提示

- 查看源码备份：
  - `tar -tzf 项目备份/guojidazi-admin-backup-20260709-103406.tar.gz`
- 解压源码备份到指定目录：
  - `tar -xzf 项目备份/guojidazi-admin-backup-20260709-103406.tar.gz -C <目标目录>`
- 从 Git bundle 恢复仓库：
  - `git clone 项目备份/guojidazi-admin-git-20260709-103406.bundle <目标目录>`
