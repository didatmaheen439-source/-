# 后台业务骨架与公共规范实施记录

日期：2026-07-07

## 实施结论

Ant Design Pro 基座已完成第一阶段后台业务骨架初始化：十个一级模块路由、中文菜单、RBAC 权限矩阵、七类 mock 账号、统一状态枚举、`StatusTag`、权限按钮、公共占位页模板和审计日志 mock 已落地。当前阶段没有接入真实后端、真实 AI 或完整业务页面。

## 实际代码位置

- 路由：`admin-web/config/routes.ts`
- 权限矩阵：`admin-web/src/foundation/permissions.ts`
- 状态常量：`admin-web/src/foundation/status.ts`
- 审计日志结构：`admin-web/src/foundation/audit.ts`
- 占位页配置：`admin-web/src/foundation/module-placeholders.ts`
- 状态标签：`admin-web/src/components/StatusTag/index.tsx`
- 权限按钮：`admin-web/src/components/PermissionButton/index.tsx`
- 公共模块占位页：`admin-web/src/components/BusinessModulePlaceholder/index.tsx`
- mock 登录与角色接口：`admin-web/mock/user.ts`
- API 类型：`admin-web/src/services/ant-design-pro/typings.d.ts`

## 十个一级模块

| 一级模块 | 默认页面 |
| --- | --- |
| 工作台 | `/dashboard/overview` |
| 用户管理 | `/users/list` |
| 题库与内容管理 | `/content/questions` |
| 学习路径配置 | `/learning-path/diagnosis-rules` |
| AI 陪练管理 | `/ai-coach/prompts` |
| 写译批改管理 | `/writing-translation/topics` |
| 模考管理 | `/mock-exam/papers` |
| 运营数据 | `/analytics/overview` |
| 审核发布 | `/review-release/pending` |
| 权限与系统设置 | `/system/accounts` |

## 公共页面模板

`BusinessModulePlaceholder` 已提供：

- `PageContainer` 标题与描述；
- 模块说明 `Alert`；
- 操作按钮区，受 `PermissionButton` 控制；
- 筛选区占位；
- `ProTable` 列表占位、分页、工具栏；
- `Empty` 空状态；
- `Result 403` 无权限状态；
- `Result 500` 错误状态；
- `Skeleton` 加载状态；
- 统一 `StatusTag` 状态展示。

加载、错误、无权限状态可通过 URL query 验证：

- `?state=loading`
- `?state=error`
- `?state=forbidden`

## 状态组件

`StatusTag` 支持以下状态域：

- 审核发布：草稿、待审核、已驳回、已通过、待发布、已发布、已下架、已回滚；
- 反馈处理：待处理、处理中、已解决、无需处理、已关闭；
- 账号：启用、停用、锁定；
- 异常处理：待处理、处理中、已解决、已关闭；
- 系统健康：正常、异常。

状态配置包含 `value`、中文 `label`、Ant Design Tag 颜色、`editable` 和 `nextActions`。

## 官方示例页处理

没有大规模删除官方示例页。原查询表格、基础表单、基础详情、分析页保留到隐藏路由：

- `/examples/list/table-list`
- `/examples/form/basic-form`
- `/examples/profile/basic`
- `/examples/dashboard/analysis`

这些页面不进入业务菜单，后续可作为 ProTable、ProForm、详情页改造参考。

## 后续开发顺序

1. 完成账号与角色管理最小真实页面，先固化权限矩阵展示与审计日志列表。
2. 完成审核发布中心，建立统一状态机和版本记录。
3. 完成题库与内容管理的列表、详情、编辑、提交审核闭环。
4. 接入用户管理、客服反馈和敏感访问日志。
5. 开发运营数据看板和导出占位接口。
6. 再扩展 AI 陪练、写译批改、学习路径和模考配置。

## 完成标准

- 每个业务页必须复用统一状态、权限按钮、审计写入约定和页面模板。
- 新增敏感字段查看、发布、停用、权限变更必须写入审计日志。
- 后端接入前，mock 必须能表达角色、动作权限、数据范围和错误态。
- 后端接入后，服务端必须重新校验菜单权限、动作权限和数据范围。

## 验证结果

- `npm run tsc`：通过。
- `npm run lint`：通过，Biome 检查 291 个文件，无 warning。
- `npm run build`：通过，产物输出到 `admin-web/dist`。
- `npm run start`：通过，mock 开发服务运行在 `http://localhost:8000`。
- 浏览器验证：登录页、默认工作台、十个模块页面、路由刷新、角色菜单收缩、直接访问 403、按钮级权限、`StatusTag`、空/加载/错误/403 状态均通过。
- 控制台验证：修复 AntD v6 API 警告后，本次新导航无新增 warn/error。

## 2026-07-07 账号与角色页面 MVP

- `/system/accounts` 已从占位页升级为 `PageContainer + Tabs` 真实业务骨架。
- `账号列表` 展示 7 类测试账号、`disabled_admin`、角色、账号状态、数据范围、最近登录和操作列。
- `角色权限矩阵` 直接读取 `permissions.ts`，展示 7 类角色、10 个模块、9 类动作权限和 6 类数据范围。
- `审计日志` 展示登录、受限访问、发布、停用、权限变更和账号状态变更记录。
- 新增 mock API：`GET /api/admin/accounts`、`PATCH /api/admin/accounts/:id/status`。
- 新增服务函数：`adminAccounts`、`adminRoles`、`adminAuditLogs`、`updateAdminAccountStatus`。
- 新增 API 类型：`AdminAccount`、`AdminRole`、`AuditLogItem`、`AdminAccountStatusUpdateParams`。
- `super_admin` 可见新建账号、编辑权限、停用/启用、配置等写操作。
- `read_only_auditor` 可访问页面但只读，不显示写操作按钮。
- `content_operator` 直访 `/system/accounts` 仍显示 403。
- 详细执行与验证记录见 `logs/system-accounts-implementation-2026-07-07.md`。

## 2026-07-07 审核发布中心 MVP

- `/review-release/pending` 已从占位页升级为 `PageContainer + ProTable + Drawer` 真实业务骨架。
- 审核任务列表覆盖任务 ID、对象类型、对象名称、业务模块、提交人、提交时间、版本号、优先级、审核状态、风险等级和更新时间。
- 列表支持关键词、对象类型、状态、风险等级筛选，默认按更新时间倒序。
- 详情抽屉展示基础信息、变更摘要、版本信息、影响范围、审核意见、版本记录和操作记录。
- 已跑通 `pending_review -> approved/rejected`、`rejected -> pending_review`、`approved -> pending_publish`、`pending_publish -> published`、`published -> offline`、`published/offline -> rolled_back` 状态流转。
- 驳回、下架、回滚强制填写原因；发布、下架、回滚确认展示影响范围和版本号。
- 状态流转写入既有 `auditLogs`，`objectType` 使用 `review_release`，不破坏 `/system/accounts` 审计日志接口。
- 新增 mock API：`GET /api/review-release/tasks`、`GET /api/review-release/tasks/:id`、`PATCH /api/review-release/tasks/:id/status`。
- 新增服务函数：`reviewTasks`、`reviewTaskDetail`、`updateReviewTaskStatus`。
- 新增 API 类型：`ReviewTask`、`ReviewTaskStatus`、`ReviewObjectType`、`ReviewRiskLevel`、`ReviewTaskStatusUpdateParams`、`ReviewOperationRecord`、`ReviewVersionRecord`。
- `super_admin` 可审核、驳回、安排发布、发布、下架和回滚。
- `content_operator` 可查看并重新提交被驳回任务，不显示审核、发布、下架和回滚按钮。
- `teaching_reviewer` 可审核和发布教研范围任务。
- `read_only_auditor` 可查看列表和详情，不显示写操作按钮。
- `customer_support` 直访 `/review-release/pending` 显示 403。
- 详细执行与验证记录见 `logs/review-release-implementation-2026-07-07.md`。

## 2026-07-07 题库内容 MVP

- `/content/questions` 已从占位页升级为 `PageContainer + ProTable` 真实业务页。
- 题目列表覆盖题目 ID、题目标题、题干摘要、考试类型、题型、所属技能、难度、标签、版本号、审核发布状态、创建人和更新时间。
- 列表支持关键词、考试类型、题型、状态和难度筛选，默认按更新时间倒序。
- 列表行内操作支持查看详情、编辑草稿/已驳回题目、提交审核和查看审核任务。
- 新增独立新增/编辑页：`/content/questions/create`、`/content/questions/:id/edit`。
- 新增/编辑页使用 `PageContainer + ProForm`，覆盖考试类型、技能模块、题型、题干、选项、正确答案、解析、难度、标签和变更说明。
- 详情查看使用列表抽屉，展示基础信息、题干、选项、答案、解析、标签、引用影响、版本记录、审核记录和操作记录。
- 新增 mock API：`GET /api/content/questions`、`GET /api/content/questions/:id`、`POST /api/content/questions`、`PATCH /api/content/questions/:id`、`POST /api/content/questions/:id/submit-review`。
- 提交审核会创建或更新 `reviewTasksData` 中 `objectType=question_bank` 的审核任务。
- 审核发布中心状态流转后会同步更新关联题目的审核发布状态。
- 创建、编辑、提交审核、审核发布状态同步均写入既有 `auditLogs`。
- `content_operator` 可创建、编辑草稿/已驳回题目并提交审核，不可审核发布。
- `teaching_reviewer` 可查看和编辑教研范围内容，并在审核发布中心审核发布题库任务。
- `super_admin` 可执行全部操作。
- `read_only_auditor` 可查看题库列表和详情，不显示新增、编辑、提交按钮。
- `customer_support` 等无内容权限角色直访题库列表和编辑页显示 403。
- 详细执行与验证记录见 `logs/content-questions-implementation-2026-07-07.md`。

## 2026-07-07 用户管理 MVP

- `/users/list` 已从占位页升级为 `PageContainer + ProTable` 真实业务页。
- 用户列表支持关键词、考试类型、Onboarding 状态、诊断状态、今日任务状态、反馈状态和最近活跃时间筛选。
- 列表默认按最近活跃时间倒序，分页支持 20、50、100 条，不提供新增用户和用户明细导出。
- 新增独立用户详情页 `/users/:id`，不进入侧边菜单。
- 用户详情展示用户概览、考试目标、学习状态、学习记录、反馈记录、AI 陪练摘要、客服备注和敏感访问记录。
- 默认详情接口只返回脱敏手机号、脱敏邮箱、设备摘要、反馈摘要和 AI 摘要预览，不返回完整敏感内容。
- 查看完整联系方式、反馈原文和 AI 摘要前必须调用敏感访问接口，写入访问日志成功后才返回内容。
- 反馈状态流转覆盖 `pending -> processing/no_action`、`processing -> resolved/no_action`、`resolved/no_action -> closed`，并校验版本冲突和必填原因。
- `super_admin` 和 `customer_support` 可查看详情、处理反馈和添加备注。
- `data_analyst` 仅可查看严格脱敏用户列表，不显示详情和处理入口，直访详情显示 403。
- `read_only_auditor` 不进入用户列表或详情，用户相关审计记录通过系统审计日志查看。
- `content_operator`、`teaching_reviewer`、`ai_operator` 等无权限角色访问用户管理路由或 mock API 返回 403。
- 详细执行与验证记录见 `logs/user-management-mvp-2026-07-07.md`。

## 2026-07-08 运营数据总览 MVP

- `/analytics/overview` 已从占位页升级为真实运营数据看板。
- 页面覆盖默认最近 30 天筛选、考试类型筛选、日/周/月粒度和模块范围筛选。
- 核心指标卡汇总新增用户、活跃用户、任务完成率、待审核任务、题库可发布内容、待处理反馈，以及 AI、写译、模考占位指标。
- 用户增长与活跃分区展示趋势图、考试目标分布、Onboarding 分布、诊断完成率和今日任务完成率。
- 学习路径分区展示诊断开始、诊断完成、命中学习路径、生成今日任务、完成今日任务漏斗。
- 题库内容分区展示题库状态、题型分布、审核通过率和题组引用情况。
- 审核发布分区展示待审核、驳回、待发布、发布、下架、回滚、平均审核时长和失败统计。
- 客服反馈分区展示反馈状态、类型分布、待处理数量和平均处理时长。
- AI 陪练、写译批改、模考管理暂以 `formal=false` 占位指标呈现，不混入正式数据源。
- 新增 mock API：`GET /api/analytics/overview`、`GET /api/analytics/overview/export`。
- 新增服务函数：`analyticsOverview`、`exportAnalyticsOverview`。
- 新增 API 类型：`AnalyticsOverview`、`AnalyticsApiResponse`、`AnalyticsFilterParams`、`AnalyticsMetricCard`、`AnalyticsModuleSnapshot`、`AnalyticsExportResult` 等。
- 接口层执行 `analytics.read` 和 `analytics.export` 权限校验，并支持部分成功、空数据、整体失败和导出无权限验证。
- 详细执行与验证记录见 `logs/analytics-overview-implementation-2026-07-08.md`。

## 2026-07-08 运营工作台 MVP

- `/dashboard/overview` 已从占位页升级为真实角色化运营工作台。
- 工作台定位为今日处理入口，不复制 `/analytics/overview` 的趋势图、漏斗图、导出和多维分析能力。
- 欢迎区展示当前操作人、角色、当前日期、更新时间和当前待办摘要。
- 今日待办聚合待审核、待发布、被驳回内容、待处理反馈、学习路径预校验异常、学习路径驳回、发布失败、回滚失败和权限异常。
- 待办按优先级、是否超时、等待时长和创建时间排序，支持待办类型与优先级筛选。
- 风险提醒聚合 P0/P1、超时、发布失败、回滚失败、权限拒绝、敏感访问和权限变更记录。
- 今日关键指标来自用户、题库、学习路径、审核发布、反馈和审计 mock 共享数据，不维护静态正式数字。
- 快捷入口、模块状态摘要和最近处理记录均按 `permissions.ts` 的角色权限过滤。
- 新增 mock API：`GET /api/dashboard/overview`、`POST /api/dashboard/action-log`、`PATCH /api/dashboard/risks/:id/handle`。
- 新增服务函数：`dashboardOverview`、`recordDashboardAction`、`handleDashboardRisk`。
- 新增 API 类型：`DashboardOverview`、`DashboardTodoItem`、`DashboardRiskItem`、`DashboardMetric`、`DashboardQuickAction`、`DashboardModuleSnapshot` 等。
- 接口层支持整体失败、单区块部分成功、无待办、无风险、数据质量提示和风险处理同步。
- 详细执行与验证记录见 `logs/dashboard-overview-implementation-2026-07-08.md`。

## 2026-07-08 AI 陪练策略治理 MVP

- `/ai-coach/prompts` 已从占位页升级为 `PageContainer + Tabs + ProTable` 真实业务页。
- 新增隐藏路由 `/ai-coach/prompts/new`、`/ai-coach/prompts/:id`、`/ai-coach/prompts/:id/edit`。
- 四种配置类型：`intent`、`prompt_template`、`response_structure`、`dependency_rule`。
- 五种业务场景：听力陪练、口语陪练、写作讲解、错题讲解、学习路径推荐；配置类型和业务场景分开存储。
- 新增 AI 策略共享 Store，集中维护 16 条策略 mock 数据、预校验、静态样例校验、版本快照、字段级差异和审核状态同步。
- 新增 mock API：`GET/POST/PATCH /api/ai-coach/strategies`、复制草稿、预校验、静态样例校验、提交审核、版本和版本差异接口。
- 提交审核会创建 `objectType=ai_coach_strategy`、`objectSubtype=configType` 的审核发布任务。
- 审核发布中心状态流转会同步更新关联 AI 策略状态；发布操作对已发布策略幂等。
- 已发布策略不能直接覆盖，只能创建新草稿版本；保存和提交使用 `dataVersion` 乐观锁，冲突返回 409。
- 预校验区分通过、警告和阻断错误；阻断错误返回 422，不能提交审核。
- 工作台 AI 待办来自共享 Store，不硬编码；用户详情 AI 摘要关联策略 ID、版本、配置类型和业务场景。
- 详细执行与验证记录见 `logs/ai-coach-strategy-implementation-2026-07-08.md`。
