# AI 陪练策略治理实施日志

日期：2026-07-08

## 执行范围

- 将 `/ai-coach/prompts` 从占位页升级为 AI 陪练策略治理 MVP。
- 新增隐藏路由 `/ai-coach/prompts/new`、`/ai-coach/prompts/:id`、`/ai-coach/prompts/:id/edit`。
- 新增 AI 策略共享 mock store、mock API、服务函数、类型定义和文档。
- 同步审核发布、工作台、用户详情和 RBAC 文档。

## 关键实现

- `mock/aiCoachStore.ts`：集中维护 16 条策略、预校验、静态样例校验、版本快照、字段级差异、提交审核和审核状态同步。
- `mock/aiCoach.ts`：提供 AI 策略 mock API，覆盖 403、404、409、422、500。
- `mock/user.ts`：导出审核任务数组，审核发布流转时同步 AI 策略状态；登录/登出同步共享 mock session。
- `src/pages/ai-coach/prompts/index.tsx`：策略列表、筛选、Tab、状态/风险标签和权限按钮。
- `src/pages/ai-coach/prompts/edit/index.tsx`：独立新建/编辑页，按配置类型切换表单。
- `src/pages/ai-coach/prompts/detail/index.tsx`：详情、版本记录、字段级差异和操作记录。

## 状态与对象命名

- 统一使用 `pending_publish`，不引入 `pending_release`。
- AI 审核任务统一使用 `objectType=ai_coach_strategy`。
- `objectSubtype` 存储配置类型：`intent`、`prompt_template`、`response_structure`、`dependency_rule`。
- 业务场景单独存储在 `businessScenes`，不和配置类型混用。

## 权限与安全

- `super_admin` 可执行全部 AI 策略操作，并负责高风险策略最终发布。
- `ai_operator` 可创建、编辑和提交 AI 策略，但提交人不能审核自己，高风险策略不能由提交人最终发布。
- `read_only_auditor` 只读 AI 策略。
- API 层校验 `aiCoach.read/create/edit/submit`，无权限返回 403 并写审计。
- 审计日志只写对象、状态、版本和摘要，不写完整 Prompt 正文。

## 命令验证结果

- `git diff --check`：通过，无空白错误。
- `npm run tsc`：通过，`tsc --noEmit` 无错误。
- `npm run lint`：通过，Biome 检查 306 个文件，无修复项；随后 `tsc --noEmit` 通过。
- `npm run build`：通过，Utoo 输出 `dist`，构建产物包含 `/ai-coach/prompts`、`/ai-coach/prompts/new`、`/ai-coach/prompts/:id/edit`、`/ai-coach/prompts/:id`。

## API 验证结果

- `super_admin` 获取策略列表、详情、版本差异：200。
- 新建有效策略：200。
- 过期 `dataVersion` 更新：409。
- 有效策略提交审核：200，生成 `objectType=ai_coach_strategy` 审核任务。
- 预校验阻断策略提交：422。
- `SIMULATE_AI_PRECHECK_500`：500。
- 高风险策略未确认警告提交：422；确认后提交：200。
- 提交人自审：403。
- `super_admin` 审核通过、安排发布、发布：200；重复发布幂等：200。
- 高风险策略提交人最终发布：403。
- `read_only_auditor` 可读策略列表但新建返回 403。
- `customer_support` 访问 AI 策略 API 返回 403。
- 客服用户详情 AI 摘要返回 `strategyId`、`configType`、`businessScene`。
- 工作台 `todoItems` 返回 `ai_strategy_*` 类型待办，来源为共享 Store。

## 浏览器验证结果

- `/ai-coach/prompts`
- `/ai-coach/prompts/new`
- `/ai-coach/prompts/:id`
- `/ai-coach/prompts/:id/edit`
- `/review-release/pending`
- `/dashboard/overview`
- `/users/:id`
- `read_only_auditor` 访问 AI 策略列表只读，无新建、编辑、提交按钮。
- `customer_support` 直访 AI 策略页面显示 403。
- 390x844 窄视口下 AI 列表不白屏，表格可横向滚动。
- 浏览器控制台无 error/warning。

## 当前限制

- 本阶段只做 mock 闭环，不接真实 AI 和真实后端。
- 静态样例校验不是模型评测。
- AI 策略效果指标仍待后续真实数据源接入。
- 开发服务启动时仍会输出既有 `127.0.0.1:8001 ECONNREFUSED` 提示，本阶段按非阻断风险处理，`http://localhost:8000` 页面和 API 可用。
