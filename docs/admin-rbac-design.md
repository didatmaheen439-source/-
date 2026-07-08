# 过级搭子运营管理后台 RBAC 设计

日期：2026-07-07

## 目标

本阶段在 Ant Design Pro 基座上落地可扩展的 RBAC 基础能力：菜单权限、路由权限、按钮权限、角色数据范围和 mock 登录账号统一从一份角色矩阵派生。真实后端接入后，前端权限仅作为体验层控制，最终授权必须由服务端校验。

## 七类角色

| 角色 ID | 中文名称 | 主要职责 |
| --- | --- | --- |
| `super_admin` | 超级管理员 | 全部菜单、动作、权限和系统配置 |
| `content_operator` | 内容运营 | 内容维护、编辑、提交审核 |
| `teaching_reviewer` | 教研审核 | 内容质量审核、发布前复核 |
| `ai_operator` | AI 策略运营 | AI 提示词、策略、风险规则和效果观察 |
| `customer_support` | 客服 | 用户查看、反馈跟进、异常处理 |
| `data_analyst` | 数据分析 | 聚合指标、看板和导出 |
| `read_only_auditor` | 只读审计 | 审核发布记录、系统记录和权限审计 |

## 动作权限

统一动作集合定义在 `admin-web/src/foundation/permissions.ts`：

`read`、`create`、`edit`、`submit`、`approve`、`publish`、`export`、`disable`、`config`

页面按钮通过 `PermissionButton` 调用 Umi `useAccess()` 的 `canAction(moduleKey, action)` 判断，避免在业务页硬编码角色名。

## 数据范围

统一数据范围：

`all`、`business_module`、`own`、`desensitized`、`aggregate`、`audit_logs`

当前 mock 会随 `currentUser` 返回 `dataScopes`。后续真实后端必须在接口层强制执行数据范围，不能只依赖前端隐藏菜单或按钮。

## 菜单与路由权限

路由配置位于 `admin-web/config/routes.ts`。每个一级模块使用 `access` 字段接入 Umi Access：

| 模块 | 路由前缀 | Access Key |
| --- | --- | --- |
| 工作台 | `/dashboard` | `canAccessDashboard` |
| 用户管理 | `/users` | `canAccessUsers` |
| 题库与内容管理 | `/content` | `canAccessContent` |
| 学习路径配置 | `/learning-path` | `canAccessLearningPath` |
| AI 陪练管理 | `/ai-coach` | `canAccessAiCoach` |
| 写译批改管理 | `/writing-translation` | `canAccessWritingTranslation` |
| 模考管理 | `/mock-exam` | `canAccessMockExam` |
| 运营数据 | `/analytics` | `canAccessAnalytics` |
| 审核发布 | `/review-release` | `canAccessReviewRelease` |
| 权限与系统设置 | `/system` | `canAccessSystem` |

## Mock 测试账号

所有账号密码均为 `ant.design`，仅用于本地开发：

| 用户名 | 角色 |
| --- | --- |
| `super_admin` | 超级管理员 |
| `content_operator` | 内容运营 |
| `teaching_reviewer` | 教研审核 |
| `ai_operator` | AI 策略运营 |
| `customer_support` | 客服 |
| `data_analyst` | 数据分析 |
| `read_only_auditor` | 只读审计 |
| `disabled_admin` | 停用账号 mock，登录应失败 |

兼容 Ant Design Pro 原账号：`admin` 映射为 `super_admin`，`user` 映射为 `content_operator`。

## 审计日志 Mock

mock 接口：

- `GET /api/admin/audit-logs`
- `POST /api/admin/audit-logs`

日志字段包含：`operator`、`roleId`、`roleName`、`action`、`objectType`、`objectId`、`sourcePage`、`time`、`reason`、`result`、`changeSummary`。

当前已模拟登录、受限访问、提交审核、发布、停用账号、权限变更等类型，后续敏感访问和真实业务动作需要在请求层或服务端统一写日志。

## 风险与约束

- 当前权限在 mock 和前端中可表达，但不是最终安全边界。
- 暂未实现真实审计日志写入拦截器，后续接后端时需要统一封装。
- 只读审计当前可访问 `/system/accounts` 占位页，但按钮权限只读；后续应拆分系统日志页和账号页。

## 2026-07-07 用户管理权限补充

- `data_analyst` 增加 `/users/list` 脱敏列表只读入口，用于查看严格脱敏的用户列表视角；不显示详情、学习记录、反馈原文、AI 摘要或反馈处理入口。
- `read_only_auditor` 不增加 `/users/list` 或 `/users/:id` 普通业务权限；用户相关敏感访问、权限拒绝和反馈状态变更继续通过系统审计日志入口查看。
- `/users/:id` 独立详情页仅允许 `super_admin` 和 `customer_support` 访问。
- Mock API 对列表、详情、反馈处理和敏感访问均执行角色校验，不能只依赖前端隐藏菜单或按钮。

## 2026-07-07 学习路径权限补充

- `super_admin` 可读、可新建、可编辑、可提交、可复制学习路径配置，并可从用户详情跳转配置详情。
- `teaching_reviewer` 可读、可新建、可编辑、可提交学习路径配置；审核发布中心禁止审核自己提交的学习路径任务。
- `content_operator` 只读学习路径配置，不显示新建、编辑或提交按钮。
- `customer_support` 不进入学习路径配置页，只在用户详情读取学习路径匹配摘要。
- `data_analyst` 和无学习路径菜单权限角色直访学习路径配置接口返回 403。
- 新增 `teaching_editor` 和 `teaching_reviewer_2` 两个教研测试账号，用于验证同角色不同账号的自审隔离。

## 2026-07-08 运营数据权限补充

- `super_admin` 和 `data_analyst` 可查看全部运营数据分区，并可使用 mock 导出预览。
- `customer_support` 可查看用户与客服反馈分区，不显示导出按钮。
- `content_operator` 可查看题库内容与审核发布分区，不显示导出按钮。
- `teaching_reviewer` 可查看用户、学习路径、题库内容、审核发布和写译占位分区。
- `ai_operator` 可查看用户、审核发布、AI 陪练占位和写译占位分区，不显示导出按钮。
- `read_only_auditor` 可查看审核发布与审计摘要分区，不显示业务写操作。
- 运营数据 mock API 对 `analytics.read` 和 `analytics.export` 均执行接口层校验；无权限访问或导出会写入 `objectType=analytics` 的审计日志。
