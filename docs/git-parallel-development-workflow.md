# Git 并行开发与唯一主干规范

## 唯一事实来源

- 远程 `origin/main` 是项目唯一线上主干，也是创建新工作树和判断“最新代码”的唯一基线。
- 本地目录、文件修改时间和任意功能分支都不能替代 `origin/main` 成为事实来源。
- `main` 只接收已经完成验证的集成结果，不直接承载未完成开发。

## 分支结构

- `main`：受保护的线上主干，必须始终可安装、可测试、可构建。
- `codex/<module>-<purpose>`：一个二级模块对应一个功能分支和一个工作树。
- 功能分支必须从最新 `origin/main` 创建；不得从另一个尚未合并的功能分支继续开发。
- 集成分支只在多个功能必须联合验证时临时创建，验证完成后删除，不作为长期主干。

## 开始开发

```bash
git fetch origin --prune
git worktree add <worktree-path> -b codex/<module>-<purpose> origin/main
```

开始修改前必须确认：

```bash
git status --short --branch
git merge-base --is-ancestor origin/main HEAD
```

## 提交边界

- 一个模块形成一个可独立择取、回滚和审查的提交序列。
- 提交前检查所有新增文件，不能只查看已跟踪文件：

```bash
git status --short
git diff --check
git ls-files --others --exclude-standard
```

- 不提交 `node_modules/`、`dist/`、缓存、临时截图、账号凭据或本地会话数据。
- 共享文件发生冲突时必须按业务语义合并，重点检查路由、菜单、权限、Mock 全局状态、API 类型和审核发布同步。

## 合并主干

1. 从远程更新最新基线：`git fetch origin --prune`。
2. 将功能分支同步到最新 `origin/main`，解决冲突后重新验证。
3. 推送功能分支并创建 Pull Request，不直接推送 `main`。
4. GitHub Actions 的 `Verify` 必须通过。
5. 检查 Pull Request 文件清单，确认没有夹带其他模块。
6. 使用 squash merge，使主干上的一个模块对应一个清晰提交。
7. 合并后删除远程功能分支，并让其他开发分支重新同步 `origin/main`。

## 必须通过的验证

在 `admin-web/` 执行：

```bash
npm run tsc
npm run test
npm run lint
npm run build
```

涉及页面、路由、权限或核心流程时，还必须完成对应角色的浏览器主流程回归。Mock 内存数据会在服务重启后重置，不能把运行时数据当作持久化验证结果。

## 禁止事项

- 禁止把“文件夹最新”当作“代码最新”。
- 禁止从包含其他未合并功能的工作树直接合并到 `main`。
- 禁止在验证失败、存在未解决冲突或文件清单不完整时合并。
- 禁止强推或删除 `main`。
- 禁止绕过 Pull Request 和 CI 直接更新远程主干。
