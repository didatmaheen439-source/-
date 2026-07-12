# 过级搭子后台管理系统

## 项目目标

- 基于 GitHub 上成熟开源后台管理项目，开发「过级搭子运营管理后台」MVP。
- 首版定位为内部运营后台，覆盖用户排查、内容管理、学习路径配置、AI 治理、审核发布、运营数据、权限审计等闭环。
- 当前阶段先完成开源底座选型，不接真实后端、不接真实 AI、不开发学生端。

## 当前状态

- 已创建标准项目目录。
- 已归档 PRD 副本。
- 已完成 GitHub 候选项目初筛和评分。
- 已确认主选：`ant-design/ant-design-pro`。
- 推荐备选：`vbenjs/vue-vben-admin`。
- 已克隆主选基座到 `admin-web/`。
- 已完成依赖安装、TypeScript、lint、build 和浏览器基础验证。
- 已完成最小项目名称初始化：`过级搭子运营管理后台`。
- 已完成后台业务骨架、RBAC 权限和公共规范落地。
- 已完成 `/system/accounts` 权限与系统设置 MVP：账号列表、角色权限矩阵、审计日志和按钮权限验证。
- 已完成 `/review-release/pending` 审核发布中心 MVP：审核任务列表、详情抽屉、状态流转、审计日志和角色权限验证。
- 已完成 `/content/questions` 题库内容 MVP：题目列表、详情抽屉、独立新增/编辑页、提交审核、审核发布状态同步和审计日志。
- 已完成 `/users/list` 用户管理 MVP：用户列表、独立详情页、学习记录、反馈处理、AI 摘要、敏感访问审计和角色权限验证。
- 已完成 `/analytics/overview` 运营数据总览 MVP：用户增长、学习路径漏斗、题库内容、审核发布、客服反馈、占位指标、数据质量提示和 mock 导出预览。
- 已完成 `/dashboard/overview` 运营工作台 MVP：欢迎区、今日待办、风险提醒、关键指标、快捷入口、模块摘要、最近处理记录和角色化权限过滤。
- 已完成 `/ai-coach/prompts` AI 陪练策略治理 MVP：四类策略配置、五类业务场景、独立新建/详情/编辑页、预校验、静态样例校验、版本差异、审核发布同步和权限验证。
- 已完成 `/writing-translation/topics` 写译批改管理 MVP：写作题目、翻译题目、评分维度、批改规则、AI 策略引用、预校验、静态样例校验、审核发布同步和工作台联动。
- 已完成 `/mock-exam/papers` 模考试卷配置 MVP：CET4/CET6 模板、混合题目编排、预校验、版本快照、审核发布同步、聚合统计和跨模块联动。
- 已完成 `/learning-path/onboarding` Onboarding 配置闭环 MVP：固定五字段维护、预校验、版本复制、审核发布、固定 Mock 用户、诊断/任务命中、用户详情与漏斗回看。
- 已完成 `/content-operations/daily-sentences` 每日一句运营闭环 MVP：列表/日历、新建编辑、来源与配图校验、用户侧预览、审核排期、立即/定时发布、Mock 阅读打卡、效果回流、下架和版本复制。
- 已完成第十一阶段全链路验收与后端接入准备：新增接口契约、核心数据模型、状态机/权限基线和全链路验收记录，不新增业务页面、不接真实后端。
- 已完成外层项目 Git 初始化准备：新增 `.gitignore`，排除依赖、构建产物、缓存、备份和本机会话文件。
- 已新增项目记忆 `MEMORY.md`，并在 `项目备份/` 保存 2026-07-09 最新备份。
- 已按 PRD v1.3 P0 范围完成业务对象和语义路由建模；尚未达到可用标准的入口保留路由与产品定义，但不在生产侧边栏展示。
- 已完成“已有聚合页拆实”补强：写作题目、翻译题目、今日任务模板、系统日志入口和运营数据分区均以独立业务语义 URL 进入，但底层继续复用现有聚合页、表单、详情、审计和权限能力。
- 已完成 `/content/wrong-reason-tags` 错因标签字典 MVP：列表、详情、新建、编辑、提交审核、审核发布联动、引用次数、权限和审计闭环。
- 已完成 `/content/question-groups` 题组管理 Mock MVP：已发布题目选择、顺序编排、适用人群、发布前校验、审核发布同步、学习路径引用、模考试卷快照展开和下架影响查询。
- 已完成导航减法第一阶段并开放内容运营：生产侧边栏展示 11 个一级模块、19 个已实现二级入口，包含每日一句和外刊内容。
- 已完成 `/content-operations/articles` 外刊内容运营 Mock MVP：文章与受管素材编辑、预校验、版本快照、审核发布、Mock 用户阅读/收藏/完成事件、效果回流、风险提示、下架和回滚。
- 已建立远程唯一主干与并行开发规范：`origin/main` 是唯一线上基线，功能分支通过 Pull Request 和 GitHub Actions `Verify` 校验后合并，详见 `docs/git-parallel-development-workflow.md`。
- 本机项目根目录固定为 `main`，二级模块在 `-worktrees/<module>-<purpose>/` 独立开发；`scripts/git/` 提供主干状态检查与标准工作树创建命令。

## 目录说明

- `docs/`：PRD、选型标准、选型报告和后续实施方案；第十一阶段新增后端接口契约、核心数据模型、状态机权限基线和全链路验收记录。
- `assets/`：后续设计素材、截图、图标等。
- `builds/`：后续构建产物。
- `backups/`：阶段稳定备份。
- `logs/`：验证记录、命令结果、错误原文。
- `references/`：候选仓库链接和外部参考资料。
- `.github/workflows/admin-web-ci.yml`：主干和 Pull Request 的自动类型检查、测试、lint 与构建。

## 常用命令

- `cd /Users/inn/Desktop/Workspace/projects/project-004-过级搭子后台管理系统/admin-web`
- `npm start`
- `npm run tsc`
- `npm run lint`
- `npm run build`
- `./scripts/git/check-mainline.sh --refresh`
- `./scripts/git/new-module-worktree.sh <module> <purpose>`

## 最近验证

- 2026-07-12：`/content-operations/daily-sentences` 每日一句运营闭环完成，`npm run tsc`、`npm run test`、`npm run lint`、`npx antd lint ./src`、`npm run build` 通过；浏览器验证记录见 `logs/daily-sentences-implementation-2026-07-12.md`。
- 2026-07-06：读取全局工作台、新项目 SOP、过级搭子上下文和后台 PRD。
- 2026-07-06：通过 GitHub API 和仓库公开文件初筛候选项目。
- 2026-07-06：Chrome 插件未能连接当前可控 profile，已在 `logs/selection-verification-2026-07-06.md` 记录限制。
- 2026-07-07：`admin-web` 基座安装、启动、TypeScript、lint、build 和浏览器验证完成，详见 `logs/base-project-verification-2026-07-07.md`。
- 2026-07-07：`/system/accounts` 账号与角色页面 MVP 完成，`npm run tsc`、`npm run lint`、`npm run build` 通过，浏览器验证详见 `logs/system-accounts-implementation-2026-07-07.md`。
- 2026-07-07：`/review-release/pending` 审核发布中心 MVP 完成，`npm run tsc`、`npm run lint`、`npm run build` 通过，浏览器验证详见 `logs/review-release-implementation-2026-07-07.md`。
- 2026-07-07：`/content/questions` 题库内容 MVP 完成，`npm run tsc`、`npm run lint`、`npm run build` 通过，API 和浏览器验证详见 `logs/content-questions-implementation-2026-07-07.md`。
- 2026-07-07：`/users/list` 用户管理 MVP 完成，`npm run tsc`、`npm run lint` 通过；build 与浏览器验证记录见 `logs/user-management-mvp-2026-07-07.md`。
- 2026-07-07：外层项目 Git 初始化完成，忽略规则验证详见 `logs/git-initialization-2026-07-07.md`。
- 2026-07-08：`/analytics/overview` 运营数据总览 MVP 完成，验证记录见 `logs/analytics-overview-implementation-2026-07-08.md`。
- 2026-07-08：`/dashboard/overview` 运营工作台 MVP 开发完成，验证记录见 `logs/dashboard-overview-implementation-2026-07-08.md`。
- 2026-07-08：`/ai-coach/prompts` AI 陪练策略治理 MVP 开发完成，验证记录见 `logs/ai-coach-strategy-implementation-2026-07-08.md`。
- 2026-07-08：`/writing-translation/topics` 写译批改管理 MVP 开发完成，验证记录见 `logs/writing-translation-topics-implementation-2026-07-08.md`。
- 2026-07-09：`/mock-exam/papers` 模考试卷配置 MVP 开发完成，API、浏览器和命令验证记录见 `logs/mock-exam-papers-implementation-2026-07-09.md`。
- 2026-07-09：已保存最新源码压缩包和 Git 历史包到 `项目备份/`，并更新 `MEMORY.md` 作为后续恢复上下文入口。
- 2026-07-09：第十一阶段后端接入基线完成，新增 `docs/api-contract.md`、`docs/backend-data-models.md`、`docs/backend-state-permission-baseline.md`、`docs/stage-11-regression-and-backend-baseline.md`；`npm run test`、`npm run tsc`、`npm run lint`、`npx antd lint ./src`、`npm run build` 均通过，浏览器验收记录见 `logs/stage-11-backend-baseline-2026-07-09/`。
- 2026-07-09：PRD P0 二级菜单拆分完成，`npm run tsc`、`npm run lint`、`npm run test`、`npx antd lint ./src`、`npm run build` 均通过，浏览器抽查记录见 `logs/prd-p0-menu-split-2026-07-09.md`。
- 2026-07-09：已有聚合页拆实补强完成，写译、学习路径、系统设置和运营数据入口语义化；`npm run tsc`、`npm run lint`、`npm run test`、`npx antd lint ./src`、`npm run build` 均通过，浏览器补充验收记录见 `logs/prd-p0-menu-split-2026-07-09.md`。
- 2026-07-09：`/content/wrong-reason-tags` 错因标签 MVP 完成，`npm run test -- wrongReasonTagStore`、`npm run tsc`、`npm run test`、`npm run lint`、`npx antd lint ./src`、`npm run build` 均通过；API smoke 通过，浏览器控制层超时限制见 `logs/wrong-reason-tags-implementation-2026-07-09.md`。
- 2026-07-10：导航减法第一阶段完成，保留今日任务模板、写作题目、翻译题目、后台账号和角色权限等独立业务入口；运营数据、审计日志和审核发布收敛为稳定入口，未完成页面暂时隐藏。`npm run test`（13 文件、71 测试）、`npm run lint`、`npx antd lint ./src`、`npm run build` 均通过，浏览器验收覆盖 7 类角色、旧 URL 跳转、隐藏语义 URL 高亮和客服直访系统页 403。
- 2026-07-11：建立 `origin/main` 唯一线上主干、功能分支命名和 Pull Request 合并规范；新增 GitHub Actions `Verify`，统一执行 TypeScript、71 项单测、lint 和生产构建。
- 2026-07-11：`/learning-path/onboarding` 配置闭环完成，覆盖五字段维护、预校验、审核发布、Mock 用户、版本快照、诊断/任务命中和漏斗回看；`npm run tsc`、`npm run test`（14 文件、77 测试）、`npm run lint`、`npx antd lint ./src`、`npm run build` 均通过，详见 `logs/onboarding-config-implementation-2026-07-11.md`。
- 2026-07-12：完成本机工作树收口：项目根目录与 `origin/main` 同步，已合并历史工作树已清理，`question-groups` 未提交改动原地保留；恢复包与迁移记录见 `backups/git-worktree-baseline-20260712/`、`logs/git-mainline-migration-2026-07-12.md`。
- 2026-07-12：`/content/question-groups` 题组管理 Mock MVP 完成，实施与验证记录见 `docs/question-groups-mvp.md` 和 `logs/question-groups-implementation-2026-07-11.md`。
- 2026-07-12：`/content-operations/articles` 外刊内容运营 Mock MVP 完成，领域说明和实施验证见 `docs/articles-operations-mvp.md`、`logs/articles-operations-implementation-2026-07-12.md`。
