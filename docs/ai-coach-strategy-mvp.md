# AI 陪练策略治理 MVP

日期：2026-07-08

## 页面范围

- 策略列表：`/ai-coach/prompts`
- 新建策略：`/ai-coach/prompts/new`
- 策略详情：`/ai-coach/prompts/:id`
- 编辑策略：`/ai-coach/prompts/:id/edit`

本文件只描述策略治理模块。会话抽检已拆为独立模块，详见 `docs/ai-coach-session-review-mvp.md`；异常回复和真实 AI 调用仍不在本文件范围。

## 四种配置类型

- `intent`：意图分类，维护意图 Key、触发样例、输出意图和置信阈值。
- `prompt_template`：Prompt 模板，维护系统角色、模板正文、结构化输入变量和风格规则。
- `response_structure`：回答结构，维护 schema、区块和结构样例。
- `dependency_rule`：防依赖规则，维护依赖信号、干预话术、连续回答阈值和冷却时间。

## 五种业务场景

- `listening_coach`：听力陪练。
- `speaking_coach`：口语陪练。
- `writing_explanation`：写作讲解。
- `error_explanation`：错题讲解。
- `learning_path_recommendation`：学习路径推荐。

配置类型和业务场景是两个独立字段，列表筛选、表单保存和审核任务均分别记录。

## 已实现能力

- `/ai-coach/prompts` 使用 `PageContainer + Tabs + ProTable`，支持关键词、配置类型、业务场景、状态和风险筛选。
- 列表覆盖 16 条 mock 策略，包含四类配置、五类场景、全部审核发布状态和多种风险样例。
- 新建/编辑页使用独立 `PageContainer + ProForm`，按配置类型切换表单字段。
- Prompt 模板的输入变量使用结构化列表，不再只保存纯文本说明。
- 风险策略支持防依赖、回答边界、敏感策略、兜底策略、升级规则和高风险关键词。
- 详情页展示基础信息、配置主体、风险策略、预校验、版本快照、字段级版本差异和操作记录。
- 已发布策略不能直接覆盖，只能创建新草稿版本。
- 保存和提交时使用 `dataVersion` 做乐观锁，版本冲突返回 409。
- 预校验区分 `passed`、`warning`、`error`；阻断错误返回 422，不能提交审核。
- 静态样例校验只做本地 mock 校验，不调用真实 AI。
- 提交审核创建 `objectType=ai_coach_strategy`、`objectSubtype=configType` 的审核发布任务。
- 审核发布中心状态流转后同步更新关联策略状态。
- 发布操作对已发布 AI 策略保持幂等。
- 下架和回滚写入策略操作记录、审核任务记录和审计日志。

## 权限规则

- `super_admin`：可查看、新建、编辑、提交审核、创建新草稿，并可最终发布高风险策略。
- `ai_operator`：可查看、新建、编辑、提交审核和处理非高风险发布；不能审核自己提交的任务，不能最终发布自己提交的高风险策略。
- `read_only_auditor`：可只读查看 AI 策略，不显示新建、编辑、提交等写操作。
- 无 AI 菜单权限角色直访 AI 策略页面或 API 返回 403。
- API 层会校验 `aiCoach.read/create/edit/submit`，不能只依赖前端隐藏按钮。

## Mock API

- `GET /api/ai-coach/strategies`
- `GET /api/ai-coach/strategies/:id`
- `POST /api/ai-coach/strategies`
- `PATCH /api/ai-coach/strategies/:id`
- `POST /api/ai-coach/strategies/:id/copy`
- `POST /api/ai-coach/strategies/precheck`
- `POST /api/ai-coach/strategies/validate-samples`
- `POST /api/ai-coach/strategies/:id/submit-review`
- `GET /api/ai-coach/strategies/:id/versions`
- `GET /api/ai-coach/strategies/:id/version-diff`
- `GET /api/ai-coach/available-intents`
- `GET /api/ai-coach/available-response-structures`

## 共享数据联动

- AI 策略数据集中在 `admin-web/mock/aiCoachStore.ts`，不再堆入 `mock/user.ts`。
- 工作台 AI 待办从 AI store 和审核任务聚合，不硬编码待办数字。
- 用户详情 AI 摘要展示 `strategyId`、`strategyVersion`、`configType`、`businessScene` 和 `strategyStatusAtTime`，不提供客服跳转策略管理入口。
- 写译批改管理通过 `aiStrategyRefs` 引用已发布 AI 策略版本，当前只允许绑定 `businessScene=writing_explanation` 的 Prompt、回答结构和防依赖策略。
- 第九阶段补充了可供写译引用的已发布写作 Prompt、回答结构和防依赖策略种子；引用保存具体版本，不自动漂移到最新策略。
- 审计日志不记录完整 Prompt 正文，只记录对象、版本、状态、配置类型和变更摘要。

## 错误态

- 403：无 AI 权限或无写操作权限。
- 404：策略不存在。
- 409：保存或提交时 `dataVersion` 冲突。
- 422：当前状态不可编辑/提交，或预校验存在阻断错误。
- 500：请求体包含 `SIMULATE_AI_PRECHECK_500` 时模拟预校验或样例校验异常。

## 暂未实现能力

- 本策略治理模块不开发异常回复页面。
- 不调用真实模型。
- 不保存真实 API Key、真实用户会话或完整 Prompt 审计副本。
- 不做策略效果真实指标分析。
- 不接真实后端。
- 不为翻译批改单独拆分真实 AI 场景；第九阶段翻译题目暂时复用 `writing_explanation` 场景。
