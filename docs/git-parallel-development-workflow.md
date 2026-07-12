# Git 并行开发与唯一主干规范

## 唯一事实来源

- 远程 `origin/main` 是项目唯一线上主干，也是创建新工作树和判断“最新代码”的唯一基线。
- 本地目录、文件修改时间和任意功能分支都不能替代 `origin/main` 成为事实来源。
- `main` 只接收已经完成验证的集成结果，不直接承载未完成开发。

## 固定本机目录

- 本机唯一主干目录：`/Users/inn/Desktop/workspace/projects/project-004-过级搭子后台管理系统`，始终检出并同步 `main`。
- 功能工作树目录：`/Users/inn/Desktop/workspace/projects/project-004-过级搭子后台管理系统-worktrees/<module>-<purpose>`。
- 项目根目录只用于同步 `main`、创建工作树和合并后的回归；所有功能、Bug、页面排版和数据可视化改动都在独立工作树完成。
- 当前工作树是否干净、是否落后主干，使用 `./scripts/git/check-mainline.sh --refresh` 检查。该命令不会修改业务文件。

## 分支结构

- `main`：受保护的线上主干，必须始终可安装、可测试、可构建。
- `codex/<module>-<purpose>`：一个二级模块对应一个功能分支和一个工作树。
- 功能分支必须从最新 `origin/main` 创建；不得从另一个尚未合并的功能分支继续开发。
- 集成分支只在多个功能必须联合验证时临时创建，验证完成后删除，不作为长期主干。

## 开始开发

```bash
./scripts/git/check-mainline.sh --refresh
./scripts/git/new-module-worktree.sh <module> <purpose>
```

例如修复用户详情布局：

```bash
./scripts/git/new-module-worktree.sh users detail-layout-fix
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
2. 将最新 `origin/main` 合并到功能分支，解决冲突后重新验证；不在功能分支上强推改写历史。
3. 推送功能分支并创建 Pull Request，不直接推送 `main`。
4. GitHub Actions 的 `Verify` 必须通过。
5. 检查 Pull Request 文件清单，确认没有夹带其他模块。
6. 使用 squash merge，使主干上的一个模块对应一个清晰提交。
7. 合并后删除远程功能分支，并让其他开发分支重新同步 `origin/main`。

## 合并后收尾

1. 在项目根目录执行 `git pull --ff-only`，确认本机 `main` 与 `origin/main` 指向同一提交。
2. 在最新 `main` 上运行完整回归；涉及页面、图表或核心流程时，再做对应浏览器验收。
3. 仅当 PR 已合并、工作树干净且合并结果已在 `main` 核验后，执行 `git worktree remove <path>` 和 `git branch -d <branch>`。
4. squash 合并的本地分支不是 `main` 的 Git 祖先时，先比较完整文件树并确认存在项目内 Git bundle 备份，才允许受控删除该历史分支。

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
