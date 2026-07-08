# 用户管理 MVP 实施与验证记录

日期：2026-07-07

## 实施范围

- 将 `/users/list` 从占位页升级为用户管理 MVP。
- 新增独立详情页 `/users/:id`。
- 实现用户列表筛选、排序、分页、详情、学习记录、反馈处理、AI 摘要、客服备注和敏感访问审计。
- 本阶段未创建 `feat/user-management-mvp` 分支，因为当前工作区已在 `feat/admin-shell-rbac` 分支且存在前三阶段未提交改动；本次继续在现有分支上增量实施并记录。

## 修改文件

- `admin-web/config/routes.ts`
- `admin-web/mock/user.ts`
- `admin-web/src/foundation/audit.ts`
- `admin-web/src/foundation/permissions.ts`
- `admin-web/src/foundation/status.ts`
- `admin-web/src/locales/zh-CN/menu.ts`
- `admin-web/src/locales/en-US/menu.ts`
- `admin-web/src/pages/users/constants.ts`
- `admin-web/src/pages/users/list/index.tsx`
- `admin-web/src/pages/users/detail/index.tsx`
- `admin-web/src/pages/system/accounts/index.tsx`
- `admin-web/src/services/ant-design-pro/api.ts`
- `admin-web/src/services/ant-design-pro/typings.d.ts`
- `docs/user-management-mvp.md`
- `docs/admin-foundation-implementation.md`
- `docs/admin-rbac-design.md`
- `README.md`
- `admin-web/README.md`

## Mock 数据和 API

- Mock 数据位于 `admin-web/mock/user.ts`。
- 新增 30 条 Mock App 用户，覆盖 CET4/CET6、Onboarding、诊断、今日任务、最近活跃、长期未活跃、有反馈、无反馈、有 AI 摘要、无 AI 摘要、空学习记录、空反馈、空 AI 摘要等状态。
- 新增 API：
  - `GET /api/operation/users`
  - `GET /api/operation/users/:id`
  - `GET /api/operation/users/:id/learning-records`
  - `GET /api/operation/users/:id/feedback`
  - `GET /api/operation/users/:id/ai-summaries`
  - `GET /api/operation/users/:id/access-logs`
  - `PATCH /api/operation/users/:id/feedback/:feedbackId/status`
  - `POST /api/operation/users/:id/remarks`
  - `POST /api/operation/sensitive-access-logs`

## API 验证

验证输出目录：

```text
/Users/inn/Desktop/Workspace/projects/project-004-过级搭子后台管理系统/logs/user-management-api-2026-07-07/
```

已生成文件：

- `login-super-admin.json`
- `super-user-list.json`
- `super-user-detail.json`
- `super-sensitive-profile.json`
- `super-feedback-update.json`
- `super-feedback-update-valid.json`
- `super-feedback-conflict.txt`
- `login-super-admin-rerun.json`
- `login-data-analyst.json`
- `data-user-list.json`
- `data-user-detail-403.txt`
- `login-content-operator.json`
- `content-users-403.txt`

结果摘要：

```json
{
  "superTotal": 30,
  "detailHasPhoneMasked": true,
  "detailHasRawFeedback": false,
  "sensitiveHasPhone": true,
  "validStatus": "resolved",
  "validVersion": 2,
  "conflictIs409": true,
  "dataHasDetailAction": false
}
```

追加边界验证：

```json
{
  "sensitiveFail": {
    "status": 500,
    "hasData": false,
    "message": "敏感访问日志写入失败，已拒绝展示内容。"
  },
  "supportDetail": {
    "status": 200,
    "actions": ["detail", "learning", "feedback", "sensitive", "remark", "feedback_status"]
  },
  "analystList": {
    "status": 200,
    "firstActions": ["list_read"]
  },
  "analystDetail": {
    "status": 403
  },
  "auditorList": {
    "status": 403
  },
  "feedbackPendingToProcessing": {
    "target": "app-user-019",
    "newStatus": "processing",
    "version": 2
  },
  "feedbackStaleConflict": {
    "status": 409,
    "message": "数据已更新，请刷新后重试。"
  },
  "emptyUserList": {
    "status": 200,
    "total": 0,
    "count": 0
  }
}
```

说明：当前 mock 登录态使用全局 `currentRoleId`，不是按 cookie 隔离；多角色 API 验证时需要在每组验证前重新登录对应角色。

## 命令验证

已执行：

```bash
cd /Users/inn/Desktop/Workspace/projects/project-004-过级搭子后台管理系统/admin-web
npm run tsc
npm run lint
npm run build
```

结果：

- `npm run tsc`：通过。
- `npm run lint`：通过，Biome 检查 295 个文件，无新增 warning，并执行 `tsc --noEmit`。
- `npm run build`：通过，生成 `users/list/index.html` 和 `users/:id/index.html`。

补充说明：

- `npm run build` 前需要停止 `npm run start`，否则会争用 `.turbopack/lock`。
- 新增 `/users/:id` 路由后，开发服务热更新阶段曾短暂出现 `Cannot find module './users/detail/index'`，完整 `npm run build` 已验证该路由可生成并访问。

## 浏览器验证

验证环境：

- 启动命令：`npm run start`
- 本地地址：`http://localhost:8000`

结果摘要：

- `super_admin` 访问 `/users/list`：用户列表可显示 30 条 Mock 用户，未出现“新增用户”入口。
- `super_admin` 访问 `/users/app-user-001`：用户详情可显示用户概览、学习记录、反馈记录、AI 陪练摘要、处理与访问记录。
- 最终重启后访问 `/users/list`：页面标题为 `用户列表 - 过级搭子运营管理后台`，列表可显示，未出现“新增用户”入口。
- 最终重启后访问 `/users/app-user-001?tab=feedback`：页面标题为 `用户详情 - 过级搭子运营管理后台`，反馈记录和更新状态入口可显示。
- 访问 `/users/not-exists`：显示用户详情 404/用户不存在状态。
- 访问 `/users/list?state=error`：显示用户列表加载失败和重试入口。
- `data_analyst` 访问 `/users/list`：只显示脱敏列表，操作列显示“仅脱敏列表”。
- `data_analyst` 直访 `/users/app-user-001`：显示 403。
- `read_only_auditor` 直访 `/users/list`：显示 403。
- `content_operator` 直访 `/users/list`：显示 403。
- 浏览器页面控制台：未捕获应用侧 error 或 warning。

浏览器自动化连接过程中出现一次外部 `Statsig` 网络超时，来源为 Codex 浏览器运行时遥测请求，不是本地应用控制台错误。

最终 `npm run start` 已恢复本地开发服务：

```text
Local: http://localhost:8000
```

启动时仍出现既有非阻断提示：

```text
Error: connect ECONNREFUSED 127.0.0.1:8001
```

该提示不影响 `http://localhost:8000` 页面访问。

## 已知风险

- Mock 登录态为全局角色状态，多角色并发验证不等同真实后端会话隔离。
- 敏感访问、脱敏和权限校验当前只在 mock 层表达，真实后端接入后必须由服务端重新实现并强制校验。
- 本阶段没有实现复杂工单、SLA、用户封禁、用户标签和用户级明细导出。
- `npm run build` 与 dev server 会争用 `.turbopack` 锁，构建前需要先停止 `npm run start`。
