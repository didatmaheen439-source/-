# 后端接入接口契约基线

日期：2026-07-09

## 目标

本文档把当前「过级搭子运营管理后台」mock API 固化为后端接入前的接口契约基线。契约以当前实现命名为准，不强制改成 PRD v1.3 的路由命名。

当前阶段仍不接真实后端、真实 AI、真实用户、上传服务或真实判分。真实后端接入时必须重新实现权限、数据范围、状态流转、乐观锁、审计日志和敏感字段脱敏，不能把前端隐藏按钮作为安全边界。

## 通用约定

### 当前 mock 响应现状

当前接口存在两类响应形态：

- Ant Design Pro / Umi mock 常用形态：`{ success, data, total }` 或直接返回业务对象。
- 登录和部分示例接口保留 Ant Design Pro 原始结构。

### 后端建议统一响应

真实后端建议统一为：

```json
{
  "code": 0,
  "message": "success",
  "data": {},
  "traceId": "server-trace-id"
}
```

分页建议统一为：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [],
    "total": 0,
    "page": 1,
    "pageSize": 20
  },
  "traceId": "server-trace-id"
}
```

### 后端错误码建议

| 错误码 | 含义 | 当前 mock 对应 |
| --- | --- | --- |
| 40001 | 参数错误 | 表单校验失败、必填缺失 |
| 40101 | 未登录或登录失效 | 登录态缺失、停用账号 |
| 40301 | 无权限 | 菜单、动作或数据范围无权限 |
| 40401 | 对象不存在 | ID 不存在或不可访问 |
| 40901 | 状态冲突 | 当前状态不允许操作 |
| 40902 | 版本冲突 | `dataVersion` 不匹配 |
| 40903 | 引用冲突 | 被题组、任务、试卷或策略引用 |
| 42201 | 预校验阻断 | `precheck.level=error` |
| 50001 | 系统错误 | mock 模拟失败 |
| 50002 | 审计日志写入失败 | 敏感访问不得展示数据 |

### 字段分类

| 字段类型 | 定义 | 后端要求 |
| --- | --- | --- |
| 展示字段 | 页面列表、详情、标签、摘要直接展示 | 可由持久化字段或聚合结果生成 |
| 持久化字段 | 业务对象 ID、状态、版本、创建人、更新时间、配置主体 | 必须入库并支持审计追踪 |
| 聚合字段 | 工作台、运营数据、统计卡片、趋势图 | 可由后端查询或离线聚合生成 |
| 敏感字段 | 联系方式、设备、反馈原文、AI 摘要、用户级明细 | 必须脱敏、按需授权、访问前写审计 |
| 审计字段 | 操作人、角色、动作、对象、原因、结果、时间 | 必须只增不改，失败操作也记录 |

## 身份与当前用户

| 接口 | 用途 | 请求参数 | 返回要点 | 权限和审计 |
| --- | --- | --- | --- | --- |
| `POST /api/login/account` | 登录 | `username`、`password`、`type` | 登录状态、角色、账号信息 | 后端需校验账号状态；停用账号拒绝登录并记录登录失败 |
| `POST /api/login/outLogin` | 退出登录 | 无 | 退出结果 | 后端清理会话 |
| `GET /api/currentUser` | 当前用户 | 会话 Cookie / Token | `accountId`、`roleId`、菜单权限、动作权限、数据范围 | 后端返回当前账号真实权限，不由前端推导 |

## 工作台 `/dashboard/overview`

| 接口 | 请求参数 | 返回要点 | 权限要求 | 审计要求 |
| --- | --- | --- | --- | --- |
| `GET /api/dashboard/overview` | `todoType`、`priority`、`simulateEmpty`、`simulateNoRisk`、`simulateFailure`、`simulateSectionError` | 欢迎区、今日待办、风险提醒、关键指标、快捷入口、模块摘要、最近处理记录、分区错误 | `dashboard.read`；数据按当前角色过滤 | 无权限待办和无效跳转需记录风险或权限拒绝 |
| `POST /api/dashboard/action-log` | 动作类型、目标路由、对象信息 | 动作记录结果 | 目标路由和动作仍需后端二次校验 | 记录工作台入口触发的关键操作 |
| `PATCH /api/dashboard/risks/:id/handle` | `reason`、处理说明 | 风险处理结果 | 当前仅 `super_admin` 可处理 | 记录风险处理人、原因和结果 |

后端必须持久化或可追溯字段：待办来源对象、对象状态、优先级、目标路由、风险等级、处理状态、处理人、处理时间。

## 用户管理 `/users/list`、`/users/:id`

| 接口 | 请求参数 | 返回要点 | 权限要求 | 审计要求 |
| --- | --- | --- | --- | --- |
| `GET /api/operation/users` | 关键词、考试类型、Onboarding、诊断、今日任务、反馈状态、活跃时间、分页 | 脱敏用户列表、允许操作 | `users.read`；数据分析仅脱敏列表 | 无权限访问记录 `permission_denied` |
| `GET /api/operation/users/:id` | `id` | 用户目标、诊断、今日任务、反馈摘要、脱敏资料 | `super_admin`、`customer_support` | 详情访问可写普通操作日志 |
| `GET /api/operation/users/:id/learning-records` | 时间、模块、完成状态、错因、分页 | 学习记录列表 | 客服或超管 | 不提供批量导出用户级明细 |
| `GET /api/operation/users/:id/feedback` | 状态、分页 | 反馈记录摘要 | 客服或超管 | 反馈原文需通过敏感访问接口授权 |
| `GET /api/operation/users/:id/ai-summaries` | 意图、策略版本、分页 | AI 摘要，不含完整会话 | 客服或超管 | 完整敏感摘要需访问前写日志 |
| `GET /api/operation/users/:id/access-logs` | 类型、时间、分页 | 敏感访问记录 | 客服或超管 | 只读 |
| `PATCH /api/operation/users/:id/feedback/:feedbackId/status` | `status`、`reason`、`result`、`dataVersion` | 反馈状态更新结果 | `users.edit`，数据分析不可操作 | 记录状态前后、原因、结果；版本冲突返回 409 |
| `POST /api/operation/users/:id/remarks` | 备注内容 | 备注记录 | 客服或超管 | 写操作日志 |
| `POST /api/operation/sensitive-access-logs` | 目标类型、目标 ID、访问原因 | 授权后的敏感内容或拒绝结果 | 角色、对象和原因均通过才返回内容 | 日志写入成功后才展示敏感字段 |
| `GET /api/operation/users/:id/learning-path-match` | `id` | 用户命中的学习路径摘要 | 用户详情授权范围 | 只读摘要，不暴露配置写入口 |

后端必须持久化字段：用户目标、学习记录、反馈记录、客服备注、敏感访问日志、反馈状态版本号。联系方式、设备、反馈原文、AI 摘要为敏感字段。

## 题库与内容管理 `/content/questions`

| 接口 | 请求参数 | 返回要点 | 权限要求 | 审计要求 |
| --- | --- | --- | --- | --- |
| `GET /api/content/questions` | 关键词、考试类型、题型、状态、难度、分页 | 题目列表、版本、状态、可执行动作 | `content.read` | 无权限访问记录 |
| `GET /api/content/questions/:id` | `id` | 题目详情、答案、解析、引用影响、版本、操作记录 | `content.read` | 只读 |
| `POST /api/content/questions` | 题干、选项、答案、解析、难度、标签、变更说明 | 新草稿 | `content.create` | 记录创建 |
| `PATCH /api/content/questions/:id` | 题目字段、`dataVersion` | 更新后草稿 | `content.edit`；仅草稿/已驳回 | 记录字段摘要；版本冲突返回 409 |
| `POST /api/content/questions/:id/submit-review` | 变更说明、影响范围、`dataVersion` | 审核任务 ID | `content.submit`；阻断校验不得提交 | 记录提交审核并创建版本快照 |

后端必须持久化字段：题目主体、答案、解析、状态、版本、数据版本、创建/更新人、审核任务、版本记录、引用关系。答案和解析不属于用户隐私，但审计日志不应写入完整题干和答案全文。

## 学习路径配置 `/learning-path/diagnosis-rules`

| 接口 | 请求参数 | 返回要点 | 权限要求 | 审计要求 |
| --- | --- | --- | --- | --- |
| `GET /api/learning-path/configs` | 配置类型、关键词、考试类型、状态、分页 | 诊断规则和今日任务模板列表 | `learningPath.read` | 无权限访问记录 |
| `GET /api/learning-path/configs/:id` | `id` | 配置详情、引用、预校验、版本、操作记录 | `learningPath.read` | 只读 |
| `POST /api/learning-path/configs` | 配置类型、条件、输出、任务项 | 新草稿 | `learningPath.create` 或当前写权限角色 | 记录创建 |
| `PATCH /api/learning-path/configs/:id` | 配置字段、`dataVersion` | 更新后配置 | `learningPath.edit`；仅草稿/已驳回 | 记录字段摘要 |
| `POST /api/learning-path/configs/:id/copy` | 复制原因 | 新草稿 | `learningPath.edit` | 记录复制来源 |
| `POST /api/learning-path/configs/precheck` | 新建态配置 | 预校验结果 | `learningPath.read` | 不落正式操作日志，可记录校验摘要 |
| `POST /api/learning-path/configs/:id/precheck` | 当前配置 | 预校验结果 | `learningPath.read` | 更新最近校验结果 |
| `POST /api/learning-path/configs/:id/submit-review` | 变更说明、影响范围、`dataVersion` | 审核任务 ID | `learningPath.submit` | 记录提交审核 |
| `GET /api/learning-path/configs/:id/versions` | `id` | 版本列表 | `learningPath.read` | 只读 |
| `GET /api/learning-path/references/questions` | 搜索、考试类型 | 可引用题目 | `learningPath.read` | 只读 |
| `GET /api/learning-path/references/question-groups` | 搜索、考试类型 | 可引用题组 | `learningPath.read` | 只读 |

后端必须持久化字段：配置类型、适用条件、判定条件、输出、任务项、引用对象、优先级、状态、版本、预校验结果、审核任务。

## AI 陪练管理 `/ai-coach/prompts`

| 接口 | 请求参数 | 返回要点 | 权限要求 | 审计要求 |
| --- | --- | --- | --- | --- |
| `GET /api/ai-coach/strategies` | 配置类型、业务场景、状态、风险、分页 | 策略列表、可执行动作 | `aiCoach.read` | 无权限访问记录 |
| `GET /api/ai-coach/strategies/:id` | `id` | 策略详情、风险策略、测试样例、版本、操作记录 | `aiCoach.read` | 不在日志展示完整 Prompt 正文 |
| `POST /api/ai-coach/strategies` | 配置主体、风险策略、测试样例 | 新草稿 | `aiCoach.create` | 记录创建摘要 |
| `PATCH /api/ai-coach/strategies/:id` | 策略字段、`dataVersion` | 更新后草稿 | `aiCoach.edit`；仅草稿/已驳回 | 版本冲突返回 409 |
| `POST /api/ai-coach/strategies/:id/copy` | 复制原因 | 新草稿 | `aiCoach.edit` | 记录复制来源 |
| `POST /api/ai-coach/strategies/precheck` | 策略字段 | 预校验结果 | `aiCoach.read` | 不调用真实模型 |
| `POST /api/ai-coach/strategies/validate-samples` | 测试样例 | 静态样例校验结果 | `aiCoach.read` | 标记 `mockOnly` |
| `POST /api/ai-coach/strategies/:id/submit-review` | 变更说明、影响范围、`dataVersion` | 审核任务 ID | `aiCoach.submit` | 记录提交审核 |
| `GET /api/ai-coach/strategies/:id/versions` | `id` | 策略版本 | `aiCoach.read` | 只读 |
| `GET /api/ai-coach/strategies/:id/version-diff` | 版本参数 | 字段级差异 | `aiCoach.read` | 不返回密钥或敏感正文 |
| `GET /api/ai-coach/available-intents` | 无 | 可引用意图 | `aiCoach.read` | 只读 |
| `GET /api/ai-coach/available-response-structures` | 无 | 可引用回答结构 | `aiCoach.read` | 只读 |

后端必须持久化字段：配置类型、业务场景、策略主体、风险等级、测试样例、预校验结果、版本快照、发布版本、审计摘要。禁止保存真实密钥或用户完整会话到审计日志。

## AI 会话抽检 `/ai-coach/session-review`

| 接口 | 请求参数 | 返回要点 | 权限要求 | 审计要求 |
| --- | --- | --- | --- | --- |
| `GET /api/ai-coach/session-reviews` | 关键词、意图、策略版本、风险、状态、结论、会话时间、分页 | 脱敏会话摘要列表 | `super_admin` 或 `ai_operator` 且 `aiCoach.read` | 无权限访问记录 |
| `GET /api/ai-coach/session-reviews/:id` | `id` | 脱敏详情、风险信号、策略快照、操作记录 | `super_admin` 或 `ai_operator` 且 `aiCoach.read` | 不返回完整会话 |
| `POST /api/ai-coach/session-reviews/:id/claim` | `id` | 认领后的抽检详情 | 当前允许角色 | 记录认领摘要 |
| `POST /api/ai-coach/session-reviews/:id/release` | `id` | 释放后的抽检详情 | 当前认领人 | 记录释放摘要 |
| `POST /api/ai-coach/session-reviews/:id/sensitive-access` | 字段白名单、访问原因、`dataVersion` | 审计成功后的必要字段 | 当前认领人 | 先写敏感访问审计，失败不得返回字段 |
| `POST /api/ai-coach/session-reviews/:id/conclusion` | 结论、说明、异常类型、优先级、依据、`dataVersion`、幂等键 | 完成后的抽检详情；异常时返回处理项 | 当前认领人 | 记录正常/异常结论和策略版本 |

后端必须持久化字段：会话抽检状态、脱敏摘要、风险信号、策略版本快照、认领人、结论、异常处理项、操作记录和 `dataVersion`。敏感字段必须按字段白名单即时授权，禁止默认返回完整会话或把敏感内容写入审计日志。

## 写译批改管理 `/writing-translation/topics`

| 接口 | 请求参数 | 返回要点 | 权限要求 | 审计要求 |
| --- | --- | --- | --- | --- |
| `GET /api/writing-translation/topics` | 题目类型、考试类型、状态、难度、分页 | 写作/翻译题目列表 | `writingTranslation.read` | 无权限访问记录 |
| `GET /api/writing-translation/topics/:id` | `id` | 题目详情、评分维度、批改规则、AI 引用、版本 | `writingTranslation.read` | 不记录真实学生答案 |
| `POST /api/writing-translation/topics` | 题目主体、评分维度、批改规则、AI 引用 | 新草稿 | `writingTranslation.create` | 记录创建摘要 |
| `PATCH /api/writing-translation/topics/:id` | 题目字段、`dataVersion` | 更新后题目 | `writingTranslation.edit`；仅草稿/已驳回 | 版本冲突返回 409 |
| `POST /api/writing-translation/topics/:id/copy` | 复制原因 | 新草稿 | `writingTranslation.edit` | 记录复制来源 |
| `POST /api/writing-translation/topics/precheck` | 新建态字段 | 预校验结果 | `writingTranslation.read` | 只记录摘要 |
| `POST /api/writing-translation/topics/:id/precheck` | 当前题目 | 预校验结果 | `writingTranslation.read` | 更新最近校验 |
| `POST /api/writing-translation/topics/validate-samples` | 样例 | 静态样例校验 | `writingTranslation.read` | `mockOnly=true` |
| `POST /api/writing-translation/topics/:id/validate-samples` | 样例 | 静态样例校验 | `writingTranslation.read` | `mockOnly=true` |
| `POST /api/writing-translation/topics/:id/submit-review` | 变更说明、影响范围、`dataVersion` | 审核任务 ID | `writingTranslation.submit` | 记录提交审核 |
| `GET /api/writing-translation/topics/:id/versions` | `id` | 版本记录 | `writingTranslation.read` | 只读 |
| `GET /api/writing-translation/topics/:id/versions/diff` | 版本参数 | 版本差异 | `writingTranslation.read` | 不返回用户答案 |
| `GET /api/writing-translation/references/scoring-presets` | 题型 | 评分预设 | `writingTranslation.read` | 只读 |
| `GET /api/writing-translation/references/ai-strategies` | 场景、配置类型 | 可引用 AI 策略 | `writingTranslation.read` | 只读 |

后端必须持久化字段：题目主体、评分维度、批改规则、AI 策略引用、状态、版本、数据版本、校验结果、审核任务、发布版本。

## 模考管理 `/mock-exam/papers`

| 接口 | 请求参数 | 返回要点 | 权限要求 | 审计要求 |
| --- | --- | --- | --- | --- |
| `GET /api/mock-exam/papers` | 关键词、考试类型、状态、分页 | 试卷列表、统计摘要 | `mockExam.read` | 无权限访问记录 |
| `GET /api/mock-exam/papers/:id` | `id` | 试卷详情、分区、题目快照、版本、操作记录 | `mockExam.read` | 不在审计日志保存完整题干答案 |
| `POST /api/mock-exam/papers` | 试卷信息、分区、题目引用 | 新草稿 | `mockExam.create` | 记录创建 |
| `PATCH /api/mock-exam/papers/:id` | 试卷字段、`dataVersion` | 更新后试卷 | `mockExam.edit`；仅草稿/已驳回 | 版本冲突返回 409 |
| `POST /api/mock-exam/papers/:id/copy` | 复制原因 | 新草稿 | `mockExam.edit` | 记录复制来源 |
| `POST /api/mock-exam/papers/precheck` | 新建态试卷 | 预校验结果 | `mockExam.read` | 只记录摘要 |
| `POST /api/mock-exam/papers/:id/precheck` | 当前试卷 | 预校验结果 | `mockExam.read` | 更新最近校验 |
| `POST /api/mock-exam/papers/:id/submit-review` | 变更说明、影响范围、`dataVersion` | 审核任务 ID | `mockExam.submit` | 记录提交审核 |
| `GET /api/mock-exam/papers/:id/versions` | `id` | 版本记录 | `mockExam.read` | 只读 |
| `GET /api/mock-exam/papers/:id/versions/diff` | 版本参数 | 版本差异 | `mockExam.read` | 只读 |
| `GET /api/mock-exam/references` | 来源类型、考试类型、关键词 | 可引用题目 | `mockExam.read` | 只读 |
| `GET /api/mock-exam/papers/:id/statistics` | `id` | 聚合统计 | `mockExam.read` | 不返回用户级明细 |
| `GET /api/mock-exam/templates/:examType` | 考试类型 | 标准模板 | `mockExam.read` | 只读 |

后端必须持久化字段：试卷主体、分区、题目快照、总分、时长、状态、版本、在线版本、预校验、统计聚合。

## 运营数据 `/analytics/overview`

| 接口 | 请求参数 | 返回要点 | 权限要求 | 审计要求 |
| --- | --- | --- | --- | --- |
| `GET /api/analytics/overview` | `startDate`、`endDate`、`examType`、`granularity`、`module`、模拟参数 | 指标卡片、分区图表、数据来源、分区错误 | `analytics.read`；按角色过滤分区 | 无权限访问记录 |
| `GET /api/analytics/overview/export` | 当前筛选条件 | Mock 导出预览字段和条件 | `analytics.export` | 记录导出申请、筛选条件和结果 |

后端必须确保导出只包含聚合字段，不包含用户 ID、联系方式、用户原文、完整会话或逐题明细。

## 审核发布 `/review-release/pending`

| 接口 | 请求参数 | 返回要点 | 权限要求 | 审计要求 |
| --- | --- | --- | --- | --- |
| `GET /api/review-release/tasks` | 对象类型、状态、风险、关键词、分页 | 审核任务列表 | `reviewRelease.read` | 无权限访问记录 |
| `GET /api/review-release/tasks/:id` | `id` | 任务详情、对象快照、版本、影响范围、操作记录 | `reviewRelease.read` | 只读 |
| `PATCH /api/review-release/tasks/:id/status` | 目标状态、原因、版本 | 状态流转结果 | `approve`、`publish` 或对象范围权限 | 每次成功/失败均写操作日志 |

后端必须执行：提交人不得审核自己；发布前复验业务对象；下架和回滚原因必填；失败不得改变线上有效版本。

## 权限与系统设置 `/system/accounts`

| 接口 | 请求参数 | 返回要点 | 权限要求 | 审计要求 |
| --- | --- | --- | --- | --- |
| `GET /api/admin/accounts` | 角色、状态、关键词 | 后台账号列表 | `system.read` | 只读 |
| `PATCH /api/admin/accounts/:id/status` | `status`、原因 | 启用/停用结果 | `system.disable` 或 `system.config` | 记录账号状态变更；唯一超管保护 |
| `GET /api/admin/roles` | 无 | 7 类角色、10 模块、动作权限、数据范围 | `system.read` | 只读 |
| `GET /api/admin/audit-logs` | 类型、对象、角色、时间、分页 | 操作、敏感访问、权限拒绝日志 | `system.read` 或审计角色 | 日志只读 |
| `POST /api/admin/audit-logs` | 日志字段 | 写入结果 | 后端内部或授权服务调用 | 真实后端应统一封装，不建议前端随意写 |

后端必须持久化字段：账号、角色、权限点、数据范围、账号状态、登录安全记录、操作日志、敏感访问日志、权限拒绝日志。

## 后端接入前必须确认

- 统一响应结构和错误码是否一次性切换，还是通过前端适配层兼容当前 mock 响应。
- 审核发布任务与业务对象版本快照是否由同一事务写入。
- 敏感访问日志写入失败时，后端必须拒绝返回敏感内容。
- 当前内存 mock 的全局状态、乐观锁和状态机不能直接迁移为生产安全边界。
