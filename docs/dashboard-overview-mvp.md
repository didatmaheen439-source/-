# 运营工作台 MVP

日期：2026-07-08

## 页面范围

- 页面入口：`/dashboard/overview`
- 页面结构：`PageContainer + 欢迎区 + 今日待办 + 风险提醒 + 今日关键指标 + 快捷入口 + 模块状态摘要 + 最近处理记录`
- 本阶段只做角色化运营工作台，不复制 `/analytics/overview` 的趋势图、漏斗图和导出能力。

## 已实现能力

- 欢迎区：展示当前操作人、角色、当前日期、更新时间和当前角色待办摘要。
- 今日待办：聚合待审核、待发布、被驳回内容、待处理反馈、反馈超时、学习路径预校验阻断、学习路径驳回、AI 策略待审核、AI 策略待发布、AI 预校验阻断、高风险 AI 发布、写译待审核、写译待发布、写译预校验阻断、写译 AI 引用失效、发布失败、回滚失败和权限异常。
- 待办排序：按 `P0/P1/P2/P3`、是否超时、等待时长和创建时间排序。
- 风险提醒：聚合 P0/P1、超时、发布失败、回滚失败、权限拒绝、敏感访问和权限变更记录。
- 今日关键指标：今日新增用户、今日活跃用户、今日任务完成率、当前待审核、当前待发布、当前待处理反馈和当前高风险事项。
- 快捷入口：按当前角色权限返回可访问业务模块入口，不返回无目标路由权限的入口。
- 模块状态摘要：展示审核发布、题库内容、用户反馈、学习路径、系统审计、AI 策略治理和写译批改摘要。
- 最近处理记录：按角色可见范围展示操作、敏感访问、权限拒绝和失败记录。
- 部分成功：支持单区块模拟失败，接口仍返回 200 并返回 `sectionErrors`。
- 数据质量提示：检查无权限待办、无权限快捷入口、无效路由、负等待时长和无效指标值。
- 风险处理：`super_admin` 可在工作台把风险标记为已处理，刷新后风险数量同步变化。

## Mock API

- `GET /api/dashboard/overview`
- `POST /api/dashboard/action-log`
- `PATCH /api/dashboard/risks/:id/handle`

支持参数：

- `todoType`
- `priority`
- `simulateEmpty`
- `simulateNoRisk`
- `simulateFailure`
- `simulateSectionError`

## 权限规则

- `super_admin`：可见全量区块、全量待办、全量快捷入口，并可处理风险。
- `content_operator`：可见内容、审核发布相关待办和内容快捷入口。
- `teaching_reviewer`：可见审核、发布、学习路径和教研相关待办。
- `ai_operator`：可见 AI、审核发布和相关占位摘要。
- `customer_support`：可见用户反馈、敏感访问提醒和客服相关入口。
- `data_analyst`：可见指标摘要、数据质量提醒和只读分析入口。
- `read_only_auditor`：可见审计风险、只读摘要和操作记录，不展示写操作。

接口层会基于 `permissions.ts` 过滤待办、快捷入口和模块摘要。目标页面仍保留自身路由和接口权限校验。

## 数据来源

- 用户与反馈：`operationUsersData`
- 题库内容：`questionData`
- 学习路径配置：`learningPathConfigsData`
- 审核发布：`reviewTasksData`
- 审计日志：`auditLogs`
- AI 策略治理：`aiCoachStrategiesData`
- 写译批改：`writingTranslationTopicsData`
- 权限矩阵：`roleConfigs`、`roleCanPerformAction`

工作台不维护静态正式数字，所有正式数值来自已有 mock 业务数据；AI 策略和写译待办来自共享 Store，不在工作台硬编码。

## 错误态和空状态

- 整体失败：`simulateFailure=true` 返回 500，页面展示失败结果。
- 部分成功：`simulateSectionError=<section>` 返回 200，目标区块展示降级提示。
- 无待办：待办表展示空状态。
- 无风险：风险列表展示空状态。
- 空分母：比例指标显示 `--`，不显示 `NaN` 或 `Infinity`。

## 暂未实现能力

- 不做自定义工作台、拖拽布局或个人配置。
- 不新增独立待办中心或通知中心。
- 不接 WebSocket、真实后端、真实 AI 或真实数据仓库。
- 不开发 AI 会话抽检、异常回复、模考管理的完整业务明细；写译批改已接入题目配置和工作台摘要，但批改效果指标仍未接入正式数据源。
- 不展示用户手机号、邮箱、反馈原文或 AI 会话原文等敏感明文。
