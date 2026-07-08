# 用户管理 MVP

日期：2026-07-07

## 页面范围

- 用户列表：`/users/list`
- 用户详情：`/users/:id`
- 用户详情为隐藏路由，不进入侧边菜单。
- 只读审计角色不进入用户业务页面，继续通过 `/system/accounts` 的审计日志查看用户相关记录。

## 页面结构

- `/users/list` 使用 `PageContainer + ProTable`。
- `/users/:id` 使用 `PageContainer + 用户摘要 + Tabs + Descriptions + ProTable + Card`。
- 用户详情页签包括：用户概览、学习记录、反馈记录、AI 陪练摘要、处理与访问记录。

## 筛选、排序和分页

- 用户列表支持关键词、考试类型、Onboarding 状态、诊断状态、今日任务状态、反馈状态、最近活跃时间范围。
- 关键词支持用户 ID、昵称、Mock 手机号和 Mock 邮箱。
- 默认按最近活跃时间倒序；最近活跃相同时按用户 ID 排序。
- 默认每页 20 条，可切换 20、50、100 条。
- 筛选、排序和分页均由 Mock API 处理，不在前端一次性加载全部数据后伪分页。

## 字段和状态

- 用户列表字段：用户 ID、用户信息、考试类型、目标分、Onboarding 状态、诊断状态、今日任务状态、最近活跃时间、未处理反馈数、操作。
- 用户详情展示基础资料、考试目标、学习状态、学习记录、反馈记录、必要 AI 摘要、客服备注和访问记录。
- 反馈状态使用 `pending`、`processing`、`resolved`、`no_action`、`closed`。
- 学习记录状态使用 `not_started`、`in_progress`、`completed`、`interrupted`。
- 学习记录支持时间范围、学习模块、完成状态、错因标签筛选。

## 角色权限

- `super_admin`：可查看全部 Mock 用户详情、学习记录、必要敏感信息、反馈原文、AI 摘要，可添加备注和更新反馈状态。
- `customer_support`：可查看授权范围内用户详情、学习记录、必要敏感信息、反馈原文、AI 摘要，可添加备注和更新反馈状态。
- `data_analyst`：只能查看严格脱敏用户列表，不显示详情、学习记录、反馈原文、AI 摘要或反馈处理入口，直访 `/users/:id` 返回 403。
- `read_only_auditor`：不能访问 `/users/list` 或 `/users/:id`；通过系统审计入口查看用户详情访问、敏感字段访问、反馈原文访问、AI 摘要访问、反馈状态变更等记录。
- `content_operator`、`teaching_reviewer`、`ai_operator`：不能访问用户管理页面，Mock API 返回 403。

## Mock API

- `GET /api/operation/users`
- `GET /api/operation/users/:id`
- `GET /api/operation/users/:id/learning-records`
- `GET /api/operation/users/:id/feedback`
- `GET /api/operation/users/:id/ai-summaries`
- `GET /api/operation/users/:id/access-logs`
- `PATCH /api/operation/users/:id/feedback/:feedbackId/status`
- `POST /api/operation/users/:id/remarks`
- `POST /api/operation/sensitive-access-logs`

保留 Ant Design Pro 示例接口 `/api/users`，但第四阶段业务页不使用该接口。

## 脱敏规则

- 手机号：保留前 3 位和后 4 位。
- 邮箱：保留部分用户名和域名。
- 设备 ID：只显示前后少量字符。
- IP：敏感接口返回摘要，不展示完整真实 IP。
- 反馈原文和 AI 摘要默认不在详情接口返回，只展示摘要或预览。

## 敏感访问流程

1. 用户主动点击查看完整联系方式、反馈原文或 AI 摘要。
2. 前端要求填写访问原因。
3. 前端调用 `POST /api/operation/sensitive-access-logs`。
4. Mock API 再次校验角色、对象和参数。
5. 写入敏感访问日志。
6. 写入成功后返回敏感内容。
7. 写入失败、无权限或对象不存在时不返回敏感内容。

## 反馈状态流转

允许流转：

- `pending -> processing`
- `pending -> no_action`
- `processing -> resolved`
- `processing -> no_action`
- `resolved -> closed`
- `no_action -> closed`

限制：

- 不允许 `pending -> closed`。
- 不允许 `processing -> closed`。
- 已关闭反馈不允许继续修改。
- 更新时必须提交当前版本，版本冲突返回 409。
- `resolved` 需要处理结果或备注，`no_action` 需要原因。

## 已实现能力

- 用户列表搜索、筛选、排序、分页。
- 独立用户详情页。
- 用户详情展示学习路径匹配摘要；客服可查看摘要但不进入配置详情，超级管理员可跳转学习路径配置详情。
- 学习记录筛选和查看。
- 反馈记录查看、反馈原文敏感访问、状态流转、版本冲突。
- 客服备注新增和历史备注。
- AI 摘要必要信息展示，完整会话不展示。
- 敏感访问日志写入。
- 系统审计日志支持 `operation`、`sensitive_access`、`permission_denied` 类型筛选。
- Mock 数据覆盖 30 个用户及主要状态组合。

## 暂未实现能力

- 不新增用户。
- 不编辑用户考试目标。
- 不修改用户学习记录。
- 不删除用户反馈。
- 不做复杂 CRM、工单分派、SLA、封禁系统或用户运营标签。
- 不接真实后端、真实用户或真实 AI。
- 不导出用户级明细。
