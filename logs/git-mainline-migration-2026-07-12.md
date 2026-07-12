# Git 主干收口记录

## 结果

- 远程默认分支为 `main`，`protect main` 规则集处于 Active。
- 远程仅保留 `main`，提交为 `8fb258d9e054d9870cfdd44bdd9a3d8024409ba5`。
- 项目根目录 `/Users/inn/Desktop/workspace/projects/project-004-过级搭子后台管理系统` 已切换为本机 `main` 并与 `origin/main` 同步。
- 已清理已包含于主干的历史集成、AI 治理、反馈队列、导航和看板分支及其工作树。
- Onboarding 分支已先核验与 `origin/main` 的完整文件树一致，再释放；其远程分支此前已随 PR 删除。
- `question-groups` 含未提交改动，未被切换、同步、清理或覆盖，继续作为唯一活动模块工作树。
- 当前 Codex 会话工作树保持为 `origin/main` 的 detached 基线，不占用业务分支。

## 恢复包

- 文件：`backups/git-worktree-baseline-20260712/repository.bundle`
- SHA-256：`6f360d4c397e0273b35604b3aede241ca6d7d8b6b0901ce375b9d47e955d1724`
- 生成方式：`git bundle create repository.bundle --all`

## 后续规则

- `origin/main` 是唯一线上事实来源。
- 项目根目录只用于本机 `main` 同步与合并后回归。
- 新模块必须从最新 `origin/main` 创建独立 `codex/<module>-<purpose>` 分支和工作树。
- 功能完成后经 PR、`Verify` 和 squash merge 合入；合并结果核验后再删除功能分支与工作树。
