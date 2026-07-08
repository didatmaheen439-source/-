# 审核发布中心实施日志

日期：2026-07-07

## 实施范围

- 将 `/review-release/pending` 从占位页升级为审核发布 MVP 页面。
- 新增审核任务列表、详情抽屉、状态流转、mock 审计写入和角色权限验证。
- 继续使用 Ant Design Pro、ProTable、Drawer、StatusTag、RBAC 矩阵和 mock API。
- 未接真实后端、真实用户数据或真实 AI。

## 修改摘要

- `admin-web/src/pages/review-release/pending/index.tsx`
  - 新增 `PageContainer + ProTable + Drawer` 页面。
  - 列表字段包含任务 ID、对象类型、对象名称、业务模块、提交人、提交时间、版本号、优先级、审核状态、风险等级和更新时间。
  - 支持关键词、对象类型、状态和风险等级筛选。
  - 详情抽屉展示基础信息、变更摘要、影响范围、审核意见、版本记录和操作记录。
  - 根据当前任务状态和当前角色显示审核、驳回、重新提交、安排发布、发布、下架和回滚按钮。
- `admin-web/mock/user.ts`
  - 新增审核任务 mock 数据，覆盖题库内容、学习路径规则、AI 策略、写译题目和模考试卷。
  - 新增 `GET /api/review-release/tasks`。
  - 新增 `GET /api/review-release/tasks/:id`。
  - 新增 `PATCH /api/review-release/tasks/:id/status`。
  - 状态流转时校验角色、动作权限、数据范围、合法状态迁移和必填原因。
  - 状态流转写入既有 `auditLogs`，`objectType` 为 `review_release`。
- `admin-web/src/services/ant-design-pro/api.ts`
  - 新增 `reviewTasks`、`reviewTaskDetail`、`updateReviewTaskStatus`。
- `admin-web/src/services/ant-design-pro/typings.d.ts`
  - 新增 `ReviewTask`、`ReviewTaskStatus`、`ReviewObjectType`、`ReviewRiskLevel`、`ReviewTaskStatusUpdateParams`、`ReviewOperationRecord`、`ReviewVersionRecord` 等类型。
- `admin-web/src/foundation/permissions.ts`
  - 按 PRD 权限矩阵补齐 `ai_operator` 在审核发布模块的 `publish` 动作。

## 执行命令和结果

- `npm run tsc`
  - 结果：通过。
- `npm run lint`
  - 结果：通过，Biome 检查 291 个文件，无 fixes。
- `npm run build`
  - 结果：通过，输出目录 `admin-web/dist`，生成 39 个 assets。
  - 构建产物包含 `review-release/pending/index.html`。
- `npm run start`
  - 结果：通过，mock 开发服务运行在 `http://localhost:8000`。
  - 启动阶段仍出现 `connect ECONNREFUSED 127.0.0.1:8001`，与基座阶段一致，未阻断 `http://localhost:8000` 访问。

## 浏览器验证结果

- `super_admin` 访问 `/review-release/pending`
  - 列表、筛选、分页、状态标签和行内操作可见。
  - 列表包含待审核、已驳回、已通过、待发布、已发布、已下架、已回滚任务。
  - 对象类型包含题库内容、学习路径规则、AI 策略、写译题目和模考试卷。
  - 详情抽屉可打开，包含基础信息、变更摘要、版本记录和操作记录。
- 状态流转
  - 空原因驳回返回 `400`，原因必填校验生效。
  - 已验证驳回、重新提交、审核通过、安排发布、发布、下架、回滚均返回 `200`。
  - 状态流转结果写入操作记录，并同步出现在 `/system/accounts` 审计日志 Tab 中。
  - 流转验证响应已归档到 `logs/review-release-flow-2026-07-07/`。
- `content_operator`
  - 可访问 `/review-release/pending`。
  - 可看到重新提交入口。
  - 不显示审核通过、驳回、安排发布、发布、下架和回滚按钮。
- `teaching_reviewer`
  - 可访问 `/review-release/pending`。
  - 可审核和发布教研范围任务。
- `read_only_auditor`
  - 可访问 `/review-release/pending`。
  - 可查看列表和详情。
  - 不显示任何写操作按钮。
- `customer_support`
  - 直访 `/review-release/pending` 显示 403。
- 刷新验证
  - 刷新 `/review-release/pending` 后仍可访问，未退回登录页或 403。
- 控制台验证
  - 初次验证发现 AntD Drawer `width` deprecated warning。
  - 已将审核详情抽屉从 `width={760}` 改为 `size="large"`。
  - 复测 fresh tab 页面 console 过滤后为空，无新增阻断错误或 AntD deprecated warning。

## 验证注意点

- 本阶段状态流转保存在 dev server 内存中，重启 `npm run start` 后 mock 数据会重置。
- 在一次 curl 验证中，响应 JSON 曾先写入 `/tmp/review-*.json`，随后已迁移到项目日志目录 `logs/review-release-flow-2026-07-07/`；全局踩坑日志已补充记录。
- 浏览器控制曾在旧 tab 的 reload/goto 上超时；按浏览器故障排查说明改用 fresh tab 后验证通过。
- 工具层出现过 ChatGPT/Statsig 外部初始化超时输出，不属于本地应用页面 console；本地页面 console 复测为空。

## 当前风险

- 权限和状态流转虽在 mock API 层校验，但仍不是生产安全边界；真实后端接入后必须在服务端重新校验菜单、动作和数据范围。
- 审计日志当前为内存 mock，dev server 重启后会重置。
- 详情抽屉中的版本差异为结构化摘要，尚未实现真实文本 diff。
- 审核发布模块当前只完成待审核中心 MVP，未拆分已通过、已驳回、发布版本、下架记录和回滚记录等完整二级页面。
