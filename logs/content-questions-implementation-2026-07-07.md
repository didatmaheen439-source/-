# 题库内容 MVP 实施与验证记录

日期：2026-07-07

## 目标

将 `/content/questions` 从占位页升级为题库内容 MVP，跑通“题目草稿创建/编辑 -> 提交审核 -> 审核发布中心处理 -> 题目状态同步 -> 审计日志”的第一条真实业务闭环。本阶段不接真实后端、不接真实 AI、不引入新 UI 库、不开发题组、每日一句、外刊、写译题和模考题库。

## 实际改动

- `admin-web/src/pages/content/questions/index.tsx`
  - 使用 `PageContainer + ProTable` 实现题库列表。
  - 支持关键词、考试类型、题型、状态和难度筛选。
  - 支持查看详情抽屉、编辑、提交审核、查看审核任务。
- `admin-web/src/pages/content/questions/edit/index.tsx`
  - 新增独立新增/编辑页。
  - 支持保存草稿、保存后提交审核、取消离开确认和刷新离开提示。
- `admin-web/src/pages/content/questions/constants.ts`
  - 新增考试类型、题型、技能、难度和审核发布状态选项。
- `admin-web/mock/user.ts`
  - 新增题库 mock 数据和题库 CRUD API。
  - 新增提交审核 API，并创建或更新审核发布任务。
  - 审核发布中心状态流转后同步关联题目状态。
  - 创建、编辑、提交审核、审核状态同步写入审计日志。
- `admin-web/src/services/ant-design-pro/api.ts`
  - 新增题库服务函数。
- `admin-web/src/services/ant-design-pro/typings.d.ts`
  - 新增题库相关 API 类型。
- `admin-web/src/foundation/permissions.ts`
  - 补充只读审计角色的内容只读权限，支持题库只读验证。
- `admin-web/config/routes.ts`
  - 新增隐藏路由 `/content/questions/create` 和 `/content/questions/:id/edit`。
- `admin-web/src/locales/zh-CN/menu.ts`、`admin-web/src/locales/en-US/menu.ts`
  - 新增隐藏路由菜单文案。

## 执行命令与结果

### TypeScript 检查

命令：

```bash
cd /Users/inn/Desktop/Workspace/projects/project-004-过级搭子后台管理系统/admin-web
npm run tsc
```

结果：通过。

首次执行曾出现：

```text
mock/user.ts(960,5): error TS2322: Type '"content_question"' is not assignable to type 'AuditObjectType'.
```

处理方式：题库审计写入复用既有 `AuditObjectType` 的 `content`，避免临时扩大审计对象类型并影响已有审计表格。

### Lint 检查

命令：

```bash
cd /Users/inn/Desktop/Workspace/projects/project-004-过级搭子后台管理系统/admin-web
npm run lint
```

结果：通过。

输出摘要：

```text
Checked 293 files in 35ms. No fixes applied.
tsc --noEmit
```

### 构建检查

命令：

```bash
cd /Users/inn/Desktop/Workspace/projects/project-004-过级搭子后台管理系统/admin-web
npm run build
```

结果：通过，产物输出到 `admin-web/dist`。

收尾复验时，第一次重新执行 `npm run build` 曾失败，原因是 `npm run start` 的 `utoo pack dev` 进程占用 `.turbopack/lock`：

```text
Unable to acquire utoo pack build persistent cache lock at .../.turbopack/lock.
Existing process: utoo pack dev (PID 18443).
```

处理方式：停止 dev server 后重新执行 `npm run build`。

最终结果：通过。

输出摘要：

```text
info  - Umi v4.4.12
event - Build index.html
event - Build content/questions/index.html
event - Build content/questions/create/index.html
event - Build content/questions/:id/edit/index.html
event - Build production done
Complete!
```

### 启动验证

命令：

```bash
cd /Users/inn/Desktop/Workspace/projects/project-004-过级搭子后台管理系统/admin-web
npm run start
```

结果：通过。

输出摘要：

```text
utoo pack v1.4.17 ready in 836ms
http://localhost:8000
```

收尾复验时重新启动 dev server，实际监听端口为 `http://localhost:8000`。启动日志仍出现一次非阻断连接提示：

```text
Error: connect ECONNREFUSED 127.0.0.1:8001
utoo pack v1.4.17 ready in 817ms
Local: http://localhost:8000
```

页面服务和 mock API 可继续访问，需后续排查 8001 连接来源，但不阻断当前 MVP 验收。

当前开发服务地址：

```text
http://localhost:8000/content/questions
```

## API 闭环验证

验证输出文件位于：

```text
/Users/inn/Desktop/Workspace/projects/project-004-过级搭子后台管理系统/logs/content-questions-flow-2026-07-07/
```

实际生成文件：

- `login-content-operator.json`
- `list-before.json`
- `create-question.json`
- `submit-review.json`
- `login-teaching-reviewer.json`
- `review-approved.json`
- `review-scheduled.json`
- `review-published.json`
- `question-after-publish.json`
- `login-content-operator-resubmit.json`
- `rejected-edit.json`
- `rejected-resubmit.json`

新建题目到发布闭环结果：

```json
{
  "questionId": "question-1783408323913",
  "taskId": "review-question-1783408323951",
  "createdStatus": "draft",
  "submittedStatus": "pending_review",
  "finalStatus": "published",
  "operations": 5
}
```

已驳回题目重新编辑并提交审核结果：

```json
{
  "editStatus": "draft",
  "editVersion": "V0.9",
  "submitStatus": "pending_review",
  "taskId": "review-question-1783408492789"
}
```

收尾烟测命令：

```bash
cd /Users/inn/Desktop/Workspace/projects/project-004-过级搭子后台管理系统/admin-web
curl -s -c /tmp/guoji-admin-cookies.txt -H 'Content-Type: application/json' -d '{"username":"super_admin","password":"ant.design"}' http://localhost:8000/api/login/account
curl -s -b /tmp/guoji-admin-cookies.txt 'http://localhost:8000/api/content/questions?pageSize=2&current=1'
```

结果：`super_admin` 登录成功，题库列表接口返回 `success: true`、`total: 4`。

## 浏览器验证

工具：Codex in-app browser。

### `super_admin`

- 访问 `/content/questions`：通过。
- 页面标题：`题库管理 - 过级搭子运营管理后台`。
- 题目列表、筛选项、状态标签、操作列正常显示。
- 可见写操作：`新增题目`、`编辑`、`提交审核`。
- 可访问 `/content/questions/create`，表单包含题目标题、题干、选项、正确答案、解析、变更说明，按钮包含 `保存草稿` 和 `保存并提交审核`。
- 可访问 `/content/questions/question-cet6-listening-001/edit`，编辑页能加载 seed 题目字段值。
- 列表详情抽屉可打开，包含 `题目内容`、`版本记录`、`操作记录`，并展示正确答案和引用影响。
- 页面刷新后编辑路由仍可访问。
- 页面控制台未发现本阶段新增的阻断性错误或 Ant Design deprecated warning。

收尾复验浏览器烟测结果：

```json
{
  "url": "http://localhost:8000/content/questions",
  "title": "题库管理 - 过级搭子运营管理后台",
  "hasQuestionManagement": true,
  "hasQuestionList": true,
  "hasTableKeyword": true,
  "hasCreateButton": true,
  "hasForbidden": false,
  "consoleWarnError": []
}
```

### `read_only_auditor`

- 访问 `/content/questions`：通过。
- 可查看题库列表和详情入口。
- 不显示 `新增题目`、`编辑`、`提交审核`、`保存草稿`、`保存并提交审核`。
- 访问 `/content/questions/create`：显示 403。

### `customer_support`

- 访问 `/content/questions`：显示 403。
- 访问 `/content/questions/question-cet6-listening-001/edit`：显示 403。

## 发现的问题与修复

### Umi 嵌套路由组件路径解析失败

原始问题：

```text
Error: Cannot find module './content/questions/edit'
```

原因：新增编辑页位于 `src/pages/content/questions/edit/index.tsx`，路由组件写成 `./content/questions/edit` 时，开发服务路由生成阶段未解析到目录 index。

修复：将路由组件显式写为：

```ts
component: './content/questions/edit/index'
```

结果：开发服务恢复，新增和编辑路由可访问，构建也能生成对应页面。

## 当前已知风险

- 题库、审核任务和审计日志仍是 dev server 内存 mock，重启后会重置。
- 当前 `npm run build` 与 `npm run start` 不能同时占用同一个 `.turbopack` 缓存锁；构建前需要先停止 dev server。
- `npm run start` 日志仍偶发 `127.0.0.1:8001` 非阻断连接提示；本次 8000 页面服务和 mock API 均可访问。
- mock API 已做角色和状态校验，但真实后端接入后仍必须在服务端重新校验菜单权限、动作权限、数据范围和状态流转。
- 新增/编辑页当前只覆盖客观题结构化文本选项，未接入富文本、Markdown、文件上传、音频上传或真实题组编排。
- 未保存离开保护覆盖浏览器刷新/关闭和页面取消按钮；任意侧边菜单跳转的拦截后续可结合路由层统一补强。
- 本阶段未开发每日一句、外刊素材、写作题、翻译题和模考试卷。

## 结论

建议进入下一阶段业务改造。当前 `/content/questions` 已能作为后续每日一句、外刊、写译题目、模考题目等内容类模块的开发模板：列表筛选、详情抽屉、独立编辑页、提交审核、状态同步、角色权限和审计写入已经形成可复用闭环。
