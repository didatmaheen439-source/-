# 反馈工作队列 MVP

## 目标

在“用户与反馈”下新增 `/users/feedback` 反馈工作队列，闭环覆盖：

1. 客服筛选待分诊反馈。
2. 查看脱敏用户上下文和必要学习、AI 摘要。
3. 客服填写原因后通过既有敏感访问接口临时查看反馈原文。
4. 客服分派或转派唯一负责人。
5. 内容、教研或 AI 负责人处理并回填结果。
6. 客服验收关闭，或退回原负责人补充。
7. 状态、分派、处理结果、敏感访问与关闭写入时间线和操作审计。

## 页面

| 路由 | 菜单 | 说明 |
| --- | --- | --- |
| `/users/feedback` | 反馈工作队列 | 角色化队列列表，支持待分诊、待我处理、处理中、待客服确认、已关闭视图 |
| `/users/feedback/:feedbackId` | 隐藏详情 | 反馈详情、脱敏上下文、敏感访问、分派、处理回填、客服验收和时间线 |

`/users/list` 仍为用户列表，业务负责人不获得用户列表或用户详情权限。

## 状态机

| 操作 | 状态迁移 | 角色 | 规则 |
| --- | --- | --- | --- |
| 分派 | `pending -> processing` | 客服、超管 | 负责人账号必须启用，原因必填 |
| 转派 | `processing -> processing` | 客服、超管 | 记录转派历史，旧负责人失去写权限 |
| 提交处理结果 | `processing -> resolved` | 当前负责人 | 结果摘要和处理说明必填 |
| 退回补充 | `resolved -> processing` | 客服、超管 | 退回原因必填 |
| 确认关闭 | `resolved -> closed` | 客服、超管 | `closed` 为终态 |
| 无需处理 | `pending/processing -> no_action -> closed` | 客服、超管 | 标记无需处理原因必填 |

所有写接口携带 `version`。版本冲突返回 `409`，无权限返回 `403`，非法状态、停用账号或缺失结果返回 `422`。

## 权限

| 角色 | 队列范围 | 操作 |
| --- | --- | --- |
| `customer_support` | 全部反馈 | 查看队列、敏感访问、分派、转派、退回、无需处理、关闭 |
| `super_admin` | 全部反馈 | 同客服 |
| `content_operator` | 仅分派给自己的反馈 | 查看脱敏上下文、提交处理结果 |
| `teaching_reviewer` | 仅分派给自己的反馈 | 查看脱敏上下文、提交处理结果 |
| `ai_operator` | 仅分派给自己的反馈 | 查看脱敏上下文、提交处理结果 |

业务负责人不能进入 `/users/list`、`/users/:id`，不能访问联系方式、反馈原文或完整 AI 会话。

## Mock 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/operation/feedback-queue` | 分页、筛选、角色范围过滤 |
| `GET` | `/api/operation/feedback-queue/:feedbackId` | 详情和权限裁剪后的脱敏上下文 |
| `POST` | `/api/operation/feedback-queue/:feedbackId/assign` | 分派或转派 |
| `POST` | `/api/operation/feedback-queue/:feedbackId/resolution` | 当前负责人提交处理结果 |
| `PATCH` | `/api/operation/feedback-queue/:feedbackId/status` | 退回、无需处理、关闭 |

敏感访问继续使用 `/api/operation/sensitive-access-logs`，`sourcePage` 为 `/users/feedback`。

## 工作台同步

- 客服工作台展示待分诊、超时处理中和待客服确认反馈。
- 内容、教研、AI 工作台展示“分派给我”和自己名下的超时处理中反馈。
- 所有工作台反馈待办跳转 `/users/feedback/:feedbackId`。
- 队列、用户详情、工作台和运营数据均使用 `operationUsersData.feedbacks` 作为状态来源，不维护重复计数。

## 边界

- 本期只使用内存 Mock，不接真实后端、消息系统、自动派单或外部工单。
- 不建设独立敏感审批中心。
- 不支持多人并行子任务和已关闭反馈重新打开。
- 反馈原文只在敏感访问成功后的弹窗中临时展示。
