# AI 会话抽检 MVP

日期：2026-07-12

## 页面范围

- 会话抽检列表：`/ai-coach/session-review`
- 会话抽检详情：`/ai-coach/session-review/:id`

本阶段只做后台 Mock 抽检闭环，不接真实后端、真实 AI、真实用户完整会话或真实附件。

## 核心流程

`筛选 Mock 会话摘要 -> 认领抽检 -> 申请查看必要信息 -> 标记正常或异常 -> 异常时生成处理项 -> 固化关联策略版本`

## 已实现能力

- 列表支持关键词、意图、策略版本、风险、抽检状态、结论和会话时间筛选。
- 列表只展示脱敏摘要，不展示完整会话、完整用户输入、完整 AI 回复或附件原文。
- 详情页展示基础信息、脱敏摘要、风险信号、策略快照、必要信息、异常处理项和操作记录。
- 抽检任务必须先认领，认领后只有当前认领人可以申请查看必要信息、标记正常或标记异常。
- 申请查看必要信息需要填写访问原因并选择字段；只有审计写入成功后才返回字段。
- 标记正常需要抽检说明，不生成异常处理项。
- 标记异常需要异常类型、优先级、异常依据和处理说明；提交后原子生成 `AiAbnormalHandlingItem`，并固化会话当时的策略快照。
- 结论提交使用 `dataVersion` 乐观锁；异常处理项通过 `idempotencyKey` 和 `sourceSessionReviewId` 保证重复提交不会重复生成。

## 状态机

| 当前状态 | 动作 | 下一状态 | 约束 |
| --- | --- | --- | --- |
| `pending` | 认领抽检 | `in_review` | 仅 `super_admin`、`ai_operator` |
| `in_review` | 释放 | `pending` | 仅当前认领人 |
| `in_review` | 申请查看必要信息 | `in_review` | 当前认领人、访问原因、字段白名单、审计成功 |
| `in_review` | 标记正常 | `completed` | 当前认领人、`dataVersion` 一致 |
| `in_review` | 标记异常 | `completed` | 当前认领人、`dataVersion` 一致、异常参数完整 |
| `completed` | 任意写操作 | 拒绝 | MVP 不支持重开 |

## 权限规则

- `super_admin`：可访问列表和详情，可认领、释放、申请查看必要信息、提交正常或异常结论。
- `ai_operator`：可访问列表和详情，可认领、释放、申请查看必要信息、提交正常或异常结论。
- `read_only_auditor`：仍可只读查看 AI 策略，但不可进入会话抽检业务处置流；API 也会返回 403。
- 其它角色无会话抽检业务权限。

## Mock API

- `GET /api/ai-coach/session-reviews`
- `GET /api/ai-coach/session-reviews/:id`
- `POST /api/ai-coach/session-reviews/:id/claim`
- `POST /api/ai-coach/session-reviews/:id/release`
- `POST /api/ai-coach/session-reviews/:id/sensitive-access`
- `POST /api/ai-coach/session-reviews/:id/conclusion`

## 数据边界

- 会话抽检对象保存 `sessionId`、脱敏用户标签、意图、摘要、风险信号、策略快照、状态、结论、操作记录和 `dataVersion`。
- 敏感上下文只存在于 Mock store 内部；列表和详情默认不返回该字段。
- 可申请字段被限定为 `context_excerpt`、`user_input_excerpt`、`assistant_reply_excerpt`、`attachment_summary`。
- 审计日志只记录对象、字段名、原因、结果和策略版本，不记录敏感字段内容。
- 异常处理项只生成待处理项；异常回复处理和关闭流转留给 `/ai-coach/abnormal-replies` 后续模块。

## 错误态

- 403：角色无权访问会话抽检。
- 404：抽检会话不存在。
- 409：认领冲突或 `dataVersion` 冲突。
- 422：状态不允许、非当前认领人操作或参数不完整。
- 500：模拟敏感访问日志写入失败时，不返回敏感字段。

## 验证

- `npm run tsc`
- `npm run test`
- `npm run lint`
- `npx antd lint ./src`
- `npm run build`

浏览器验收需覆盖：列表筛选、详情加载、认领、申请查看必要信息、标记正常、标记异常、完成态只读、审计员 403。
