# Git 初始化记录

## 操作时间

- 2026-07-07

## 项目路径

- `/Users/inn/Desktop/Workspace/projects/project-004-过级搭子后台管理系统`

## 处理内容

- 外层项目目录初始化为 Git 工程。
- 新增外层 `.gitignore`，排除依赖、构建产物、缓存、备份包、本地环境文件、密钥格式文件、运行日志、本地 agent 链接目录和可能包含本机会话的 cookie 文件。
- `admin-web/` 原本带有上游模板仓库的 `.git`，如果保留会让外层 Git 把 `admin-web` 当嵌套仓库处理。已将其移动到项目备份目录保留：
  - `backups/admin-web-original-git-20260707-163612.git`
- 移动前记录到的内部仓库状态：
  - branch: `feat/learning-path-config-mvp`
  - HEAD: `47a2d748c5299a60c9b8565c51ce3a98c518f8e5`
  - modified: `config/routes.ts`
  - modified: `src/foundation/permissions.ts`
  - modified: `src/locales/en-US/menu.ts`
  - modified: `src/locales/zh-CN/menu.ts`
  - modified: `src/services/ant-design-pro/api.ts`
  - modified: `src/services/ant-design-pro/typings.d.ts`

## 验证计划

- 执行 `git status --short --ignored` 确认源码、文档可见，`node_modules`、`dist`、`.turbopack`、`backups` 内容、`types/cache`、`.agents` 和 cookie 文件被忽略。
- 执行 `git check-ignore -v` 抽查关键排除项。

## 验证结果

- `git init -b main`：成功，外层项目仓库分支为 `main`。
- `git add --dry-run .`：成功，排除规则生效。
- `git check-ignore -v admin-web/node_modules admin-web/dist admin-web/.turbopack backups/admin-web-original-git-20260707-163612.git logs/user-management-api-2026-07-07/super.cookies admin-web/types/cache/mock/login.mock.cache.js admin-web/.agents/skills builds/.gitkeep backups/.gitkeep`：成功，确认大目录、本地缓存、备份仓库元数据和 cookie 文件被忽略，占位文件可跟踪。
- `git diff --cached --name-only | rg -n "(node_modules|admin-web/dist|\\.turbopack|backups/admin-web-original|\\.cookies|types/cache|\\.agents|\\.env|\\.pem|\\.key)" || true`：无输出，暂存区未包含上述不应进入版本库的文件。
- `git diff --cached --name-only | wc -l`：暂存 412 个文件。
- `git ls-files --stage | awk '$1 == "160000" { print }'`：无输出，确认 `admin-web/` 没有被作为 gitlink/submodule 暂存。
- `git diff --cached --check`：未通过，命中既有文件尾随空白。主要包括 Markdown 文档中的硬换行空格、curl 原始 HTTP 响应文本的 CRLF，以及上游 mock 地图文件首行空格；本次 Git 初始化不改动这些历史内容。

## 注意事项

- 当前只完成初始化和暂存，尚未创建初始 commit。
- `/Users/inn/Documents/过级搭子后台管理系统` 目录中存在先前中断留下的空 Git 仓库，本次未删除或修改。
