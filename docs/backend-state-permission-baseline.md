# 后端状态机与权限基线

日期：2026-07-09

## 目标

本文档固化当前 mock MVP 的统一状态机、状态可操作规则和 7 类角色权限矩阵，作为真实后端授权和状态流转设计基线。

前端菜单、按钮和隐藏路由只做体验控制。真实后端必须在每个接口重新校验账号状态、角色、模块权限、动作权限、数据范围、对象状态、对象归属、版本和审计要求。

## 统一审核发布状态机

```text
draft -> pending_review -> approved -> pending_publish -> published
draft -> pending_review -> rejected -> draft
published -> offline
published -> rolled_back
offline -> rolled_back
published/offline/rolled_back -> draft (copy only)
```

| 状态 | 可编辑 | 可提交审核 | 可审核 | 可安排发布 | 可发布 | 可下架 | 可回滚 | 可复制新草稿 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `draft` | 是 | 是 | 否 | 否 | 否 | 否 | 否 | 否 |
| `pending_review` | 否 | 否 | 是 | 否 | 否 | 否 | 否 | 否 |
| `rejected` | 是 | 是 | 否 | 否 | 否 | 否 | 否 | 是 |
| `approved` | 否 | 否 | 否 | 是 | 否 | 否 | 否 | 是 |
| `pending_publish` | 否 | 否 | 否 | 否 | 是 | 否 | 否 | 是 |
| `published` | 否 | 否 | 否 | 否 | 否 | 是 | 是 | 是 |
| `offline` | 否 | 否 | 否 | 否 | 否 | 否 | 是 | 是 |
| `rolled_back` | 否 | 否 | 否 | 否 | 否 | 否 | 否 | 是 |

## 操作规则

| 操作 | 前置状态 | 后置状态 | 后端强校验 |
| --- | --- | --- | --- |
| 保存草稿 | `draft`、`rejected` | 原状态 | 写权限、`dataVersion`、字段校验 |
| 提交审核 | `draft`、`rejected` | `pending_review` | 提交权限、预校验无 error、版本一致、影响范围 |
| 审核通过 | `pending_review` | `approved` | 审核权限、提交人不能审核自己 |
| 审核驳回 | `pending_review` | `rejected` | 审核权限、驳回原因必填、提交人不能审核自己 |
| 安排发布 | `approved` | `pending_publish` | 发布权限、发布说明和影响范围 |
| 发布 | `pending_publish` | `published` | 发布权限、发布前复验、版本一致、幂等 |
| 下架 | `published` | `offline` | 发布权限、引用影响确认、原因必填 |
| 回滚 | `published`、`offline` | `rolled_back` 或历史版本生效 | 发布权限、目标版本可用、原因必填 |
| 复制新草稿 | `published`、`offline`、`rolled_back`、`approved`、`pending_publish` | `draft` | 编辑权限、记录来源版本 |

## 反馈工作队列状态机

```text
pending -> processing -> resolved -> closed
pending -> no_action -> closed
processing -> no_action -> closed
resolved -> processing (return)
processing -> processing (transfer)
```

| 操作 | 前置状态 | 后置状态 | 后端强校验 |
| --- | --- | --- | --- |
| 分派 | `pending` | `processing` | 客服/超管、目标负责人启用、原因必填、版本一致 |
| 转派 | `processing` | `processing` | 客服/超管、记录转派历史、旧负责人失去写权限 |
| 提交结果 | `processing` | `resolved` | 当前负责人、结果摘要和处理说明必填、版本一致 |
| 退回补充 | `resolved` | `processing` | 客服/超管、退回原因必填、版本一致 |
| 确认关闭 | `resolved` | `closed` | 客服/超管、版本一致 |
| 无需处理 | `pending`、`processing` | `no_action` | 客服/超管、原因必填、版本一致 |
| 关闭无需处理 | `no_action` | `closed` | 客服/超管、版本一致 |

`closed` 为终态，本期不支持重新打开。反馈队列和用户详情反馈记录必须共用同一状态、版本和审计来源。

## 必须写审计日志的操作

- 登录成功、登录失败、账号停用后登录拒绝。
- 无权限访问页面、接口、按钮动作或数据范围。
- 创建、编辑、复制、提交审核、审核通过、审核驳回。
- 安排发布、发布、发布失败、下架、下架失败、回滚、回滚失败。
- 权限变更、账号启用、账号停用、唯一超管保护失败。
- 敏感数据访问成功和失败。
- 反馈分派、转派、处理结果提交、退回、无需处理和关闭。
- 导出申请、导出失败和导出字段范围。

## 角色权限矩阵

动作：R=查看，C=创建，E=编辑，S=提交审核，A=审核，P=发布/下架/回滚，D=导出，Disable=停用，Config=配置。

| 角色 | 工作台 | 用户管理 | 题库与内容 | 学习路径 | AI 陪练 | 写译批改 | 模考 | 运营数据 | 审核发布 | 权限系统 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 超级管理员 | R | R/E/Disable | R/C/E/S/A/P/D/Disable/Config | R/C/E/S/A/P/D/Disable/Config | R/C/E/S/A/P/D/Disable/Config | R/C/E/S/A/P/D/Disable/Config | R/C/E/S/A/P/D/Disable/Config | R/D | R/A/P | R/C/E/S/A/P/D/Disable/Config |
| 内容运营 | R | - | R/C/E/S | R | - | R/C/E/S | - | R | R/S | - |
| 教研审核 | R | - | R/E/S/A/P | R/E/S/A/P | - | R | R/C/E/S/A/P | R | R/A/P | - |
| AI 策略运营 | R | - | - | R | R/C/E/S/P/Config | R | - | R | R/S/P | - |
| 客服 | R | R/E/Disable | - | - | - | - | - | R | - | - |
| 数据分析 | R | R | - | - | - | - | R | R/D | - | - |
| 只读审计 | R | - | R | - | R | R | R | R | R | R |

说明：

- 反馈工作队列是 `用户与反馈` 下的独立访问能力：客服/超管可看全量并分派验收；内容运营、教研审核、AI 策略运营只能查看和处理分派给自己的反馈，不因此获得 `/users/list` 或 `/users/:id` 权限。
- 当前 `customer_support` 在权限矩阵中具备 `users.disable`，但页面实际主要用于反馈处理和用户排查；真实后端需确认是否保留停用动作。
- 当前 `ai_operator` 在审核发布模块具备发布动作，用于 AI 范围任务；后端需按 `objectType=ai_coach_strategy` 限制范围。
- 当前 `teaching_reviewer` 的写译页面为只读，写译审核发布动作通过审核发布中心执行。
- `read_only_auditor` 不得出现任何新增、编辑、审核、发布、停用、回滚执行按钮。

## 数据范围矩阵

| 数据范围 | 含义 | 适用角色 |
| --- | --- | --- |
| `all` | 全量数据 | 超级管理员 |
| `business_module` | 所属业务模块数据 | 内容运营、教研审核、AI 策略运营 |
| `own` | 本人创建或本人处理数据 | 内容运营、客服 |
| `desensitized` | 脱敏数据 | 客服、数据分析、审计及部分业务角色 |
| `aggregate` | 聚合指标 | 数据分析、业务角色、超管 |
| `audit_logs` | 审计日志 | 只读审计、超管 |

## 后端接口校验顺序

1. 校验登录态和账号状态。
2. 校验菜单/模块访问权限。
3. 校验动作权限。
4. 校验数据范围和对象归属。
5. 校验对象状态是否允许该操作。
6. 校验 `dataVersion` 或审核任务版本。
7. 校验引用影响、发布前复验或敏感访问原因。
8. 写入审计日志。
9. 执行业务状态变更或返回敏感数据。

敏感访问必须先写审计日志，日志写入失败则拒绝返回敏感字段。

## 当前实现命名与 PRD v1.3 对照

| 当前实现 | PRD v1.3 对照 | 处理原则 |
| --- | --- | --- |
| `/dashboard/overview` | `/dashboard/workbench` | 当前命名为准，不强制改名 |
| `/analytics/overview` | `/analytics/users` 等细分看板 | 当前聚合页为基线，后续可拆分 |
| `/system/accounts` Tabs | 后台账号、角色权限、操作日志、敏感访问日志 | 当前聚合页为基线，后端可按实体拆接口 |
| `/learning-path/diagnosis-rules` Tabs | 诊断规则、今日任务模板 | 当前聚合页为基线 |

## 后端接入风险

- 当前 mock 登录态是开发服务器内存状态，不等同生产会话隔离。
- 当前部分响应结构未统一，前端接真实后端前需要适配层或统一改造。
- 当前审计日志由 mock 分散写入，真实后端需要统一审计服务或中间件。
- 当前部分权限既在页面层也在 mock 层表达，真实后端必须以服务端结果为准。
