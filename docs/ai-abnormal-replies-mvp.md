# AI 陪练异常回复 Mock MVP

## 范围

- 页面：`/ai-coach/abnormal-replies`、`/ai-coach/abnormal-replies/:id`
- 角色：仅 `ai_operator` 与 `super_admin` 可访问和处置。
- 数据：固定 Mock 异常种子，不接真实 AI、不展示完整用户会话、不导出用户原文。

## 主流程

`待处理 -> 接手处理 -> 访问受控证据 -> 保存问题归因 -> 创建修复草稿 -> 审核发布 -> Mock 复检 -> 已处理 -> 关闭`

## 状态约束

- `pending` 只能接手进入 `processing`。
- `processing` 必须先保存 `rootCauseType + diagnosis + linkedStrategyId`，且归因类型必须匹配关联策略类型。
- 修复草稿从关联策略快照复制，并自动追加异常回归样例。
- Mock 复检只能在修复策略发布后执行；未发布返回 `422`。
- 复检通过后进入 `resolved`，正常关闭必须填写处理结果。
- 误报或无需策略变更可从 `processing/resolved` 严格关闭，但必须填写关闭类型和充分说明。

## 审计与权限

- 受控证据访问要求填写原因，并写入 `sensitive_access` 审计日志。
- API 层同样校验 `ai_operator/super_admin`，其他角色返回 `403`。
- 页面级路由使用 `canAccessAiAbnormalReplies`，不依赖菜单隐藏作为权限。

## 后端接入注意

- 内存 Store 需替换为持久化异常表、异常证据表、复检记录表和操作记录表。
- `dataVersion` 当前用于 Mock 乐观锁，真实后端需使用版本号或更新时间 CAS。
- Mock 复检只做静态样例校验，真实后端应接入可审计的回归测试执行记录，但仍不得保存完整敏感对话。
