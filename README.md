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
- 已完成第十一阶段全链路验收与后端接入准备：新增接口契约、核心数据模型、状态机/权限基线和全链路验收记录，不新增业务页面、不接真实后端。
- 已完成外层项目 Git 初始化准备：新增 `.gitignore`，排除依赖、构建产物、缓存、备份和本机会话文件。
- 已新增项目记忆 `MEMORY.md`，并在 `项目备份/` 保存 2026-07-09 最新备份。

## 目录说明

- `docs/`：PRD、选型标准、选型报告和后续实施方案；第十一阶段新增后端接口契约、核心数据模型、状态机权限基线和全链路验收记录。
- `assets/`：后续设计素材、截图、图标等。
- `builds/`：后续构建产物。
- `backups/`：阶段稳定备份。
- `logs/`：验证记录、命令结果、错误原文。
- `references/`：候选仓库链接和外部参考资料。

## 常用命令

- `cd /Users/inn/Desktop/Workspace/projects/project-004-过级搭子后台管理系统/admin-web`
- `npm start`
- `npm run tsc`
- `npm run lint`
- `npm run build`

## 最近验证

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
