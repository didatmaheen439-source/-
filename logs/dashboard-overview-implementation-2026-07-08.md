# 运营工作台实施日志

日期：2026-07-08

## 目标

完成第七阶段 `/dashboard/overview`：把已完成的用户、题库、审核发布、学习路径和运营数据 mock 链路汇总成角色化运营工作台，覆盖今日待办、风险提醒、关键指标、快捷入口、模块摘要和最近处理记录。

## 实际修改

- 将 `/dashboard/overview` 从占位页替换为真实工作台页面。
- 新增工作台 mock 聚合层，按当前登录角色返回可见区块、待办、风险、指标和快捷入口。
- 新增 `GET /api/dashboard/overview`、`POST /api/dashboard/action-log`、`PATCH /api/dashboard/risks/:id/handle`。
- 新增 `dashboardOverview`、`recordDashboardAction`、`handleDashboardRisk` 服务函数。
- 新增工作台相关 API 类型。
- 扩展审计对象类型，允许工作台访问、跳转、部分失败、数据质量和风险处理写入审计日志。
- 工作台页面支持待办类型筛选、优先级筛选、手动刷新、待办跳转、快捷入口跳转和风险标记处理。

## 已执行命令

```bash
npm run tsc
npm run lint
git diff --check
npm run tsc
npm run lint
npm run build
npm run start
node - <<'NODE' # API smoke
node - <<'NODE' # 浏览器外 API 同步验收
```

## 最终命令结果

- `git diff --check`：通过。
- `npm run tsc`：通过，`tsc --noEmit` 无错误。
- `npm run lint`：通过，Biome 检查 303 个文件，无 warning；同时执行 `tsc --noEmit` 通过。
- `npm run build`：通过，输出目录 `admin-web/dist`，构建生成 `/dashboard/overview/index.html`。
- `npm run start`：通过，主服务运行在 `http://localhost:8000`；启动时仍出现既有 `127.0.0.1:8001 ECONNREFUSED` 非阻断输出。
- 最终启动后 API smoke：`super_admin` 登录成功，`GET /api/dashboard/overview` 返回 200、7 个可见区块、10 条待办、7 个指标、6 个快捷入口，响应中无 `NaN` 或 `Infinity`。

## API 验收结果

- `super_admin`：返回欢迎区、今日待办、风险、指标、快捷入口、模块摘要和最近记录；可见全量快捷入口，可处理风险。
- `content_operator`：返回内容与审核发布相关待办；不返回系统、用户反馈处理入口。
- `teaching_reviewer`：返回审核、发布、学习路径和教研范围待办。
- `ai_operator`：返回 AI 占位摘要、审核发布和 AI 相关入口。
- `customer_support`：返回用户反馈、反馈超时和客服入口。
- `data_analyst`：只返回指标、快捷入口和模块摘要；无处理按钮。
- `read_only_auditor`：返回审计风险和只读摘要；修复后只显示查看/进入，不显示处理或标记处理。
- 部分成功：`simulateSectionError=todos` 返回 200，`sectionErrors` 包含 `todos`，其他区块继续返回。
- 整体失败：`simulateFailure=true` 返回 500。
- 敏感数据：工作台响应未包含 `originalContent`、`summaryContent`、手机号、邮箱、密码或 token 等字段。

## 待办与业务状态同步验证

- 审核任务：`review-question-001` 从 `pending_review` 变为 `approved` 后，`pending_review` 待办从 1 变为 0。
- 发布任务：将一个 `approved` 任务安排为 `pending_release` 后，待发布待办从 0 变为 1；发布后从 1 变为 0。
- 驳回内容：`question-cet4-vocabulary-001` 重新提交审核后，`rejected_content` 待办从 1 变为 0。
- 用户反馈：`app-user-014-feedback-2` 从 `pending` 更新为 `processing` 后，`pending_feedback` 待办从 4 变为 3。
- 学习路径预校验：`template-cet4-empty` 补齐任务项并预校验通过后，`learning_path_precheck_error` 待办从 3 变为 2。
- 风险处理：`super_admin` 标记一个风险已处理后，风险总数从 25 变为 24。

## 浏览器验收结果

- `/dashboard/overview` 可访问，页面标题为 `工作台总览 - 过级搭子运营管理后台`。
- 已登录访问 `/` 自动重定向到 `/dashboard/overview`。
- 页面刷新后仍正常显示欢迎区、今日待办、风险提醒、今日关键指标、快捷入口、模块状态摘要和最近处理记录。
- 手动点击 `刷新` 后页面仍停留在 `/dashboard/overview`，并显示刷新成功反馈。
- 点击工作台待办可跳转目标业务页，例如进入 `/users/list?keyword=app-user-006&feedbackStatus=processing`。
- `customer_support` 直访 `/review-release/pending` 显示 403，目标页面权限仍生效。
- 空态、无风险、单区块失败和整体失败页面状态均可显示。
- 7 类角色浏览器视图已复核，区块、快捷入口和处理按钮不同；`read_only_auditor` 不显示写操作按钮。
- 控制台无本阶段新增 error 或 warn。
- 响应式验证：1440、1280、1024、768 宽度均无页面级横向滚动、无卡片重叠；窄宽度下表格在自身容器内横向滚动。
- 浏览器验证过程中出现一次浏览器插件自身 Statsig 网络超时，不来自本地页面控制台，已按非项目风险处理。

## 验收中发现的问题

- 首次浏览器角色验证发现 `read_only_auditor` 在权限异常待办上显示 `处理` 按钮。
- 原因：`dashboardTodoCanHandle` 将 `permission_denied` 的可处理条件写成了 `system.read`，只读审计因此被误判为可处理。
- 修复：将权限异常待办的处理权限收紧为 `system.config`；同时将审核发布快捷入口描述从“处理”改为“查看”，避免只读角色看到暗示写操作的文案。

## 已知风险

- 工作台聚合运行在 dev server mock 内存中，重启后风险处理、反馈处理和状态流转会恢复初始数据。
- AI 陪练、写译批改、模考仍为占位摘要，不能作为真实运营处理数据。
- 当前风险处理仅允许 `super_admin` 在工作台标记处理；后续接真实后端时需要细化风险处置权限和服务端审计。
- `npm run start` 仍输出既有 `127.0.0.1:8001 ECONNREFUSED`，但 8000 页面和 mock API 可用。
