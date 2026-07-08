# 权限与系统设置账号页面实施日志

日期：2026-07-07

## 实施范围

- 将 `/system/accounts` 从占位页升级为权限管理 MVP 页面。
- 新增账号列表、角色权限矩阵、审计日志三个 Tab。
- 扩展 mock API 支持账号列表和账号状态变更。
- 状态变更写入 mock 审计日志。
- 保持 mock 闭环，不接真实后端。

## 修改摘要

- `admin-web/src/pages/system/accounts/index.tsx`
  - 新增 `PageContainer + Tabs + ProTable` 页面。
  - `账号列表` 展示账号、角色、账号状态、数据范围、最近登录、创建时间和操作列。
  - `角色权限矩阵` 从 `permissions.ts` 读取 7 类角色、10 个模块、9 类动作权限和数据范围。
  - `审计日志` 展示操作时间、操作人、动作、对象、来源页面、结果、原因和变更摘要。
- `admin-web/mock/user.ts`
  - 新增 `GET /api/admin/accounts`。
  - 新增 `PATCH /api/admin/accounts/:id/status`。
  - 状态变更写入 `auditLogs`。
  - 登录时校验 `disabled` 和 `locked` 状态。
- `admin-web/src/services/ant-design-pro/api.ts`
  - 新增 `adminAccounts`、`adminRoles`、`adminAuditLogs`、`updateAdminAccountStatus`。
- `admin-web/src/services/ant-design-pro/typings.d.ts`
  - 新增 `AdminAccount`、`AdminRole`、`AuditLogItem`、`AdminAccountStatusUpdateParams` 等类型。

## 执行命令和结果

- `npm run tsc`
  - 第一次失败：
    - `mock/user.ts` 中 Express route params 类型可能为 `string[]`。
    - `useRef<ActionType>()` 在当前 React 类型下缺少初值。
  - 修复：
    - 收窄 `req.params.id`。
    - 改为 `useRef<ActionType | undefined>(undefined)`。
  - 复跑结果：通过。
- `npm run lint`
  - 结果：通过，Biome 检查 291 个文件，无 warning。
- `npm run build`
  - 结果：通过，输出目录 `admin-web/dist`，生成 39 个 assets。
- `npm run start`
  - 结果：通过，mock 开发服务运行在 `http://localhost:8000`。

## 浏览器验证结果

- `super_admin` 访问 `/system/accounts`
  - 三个 Tab 可见：账号列表、角色权限矩阵、审计日志。
  - 账号列表可见 7 类测试账号和 `disabled_admin`。
  - 可见新建账号、编辑权限、停用、配置等写操作按钮。
- 角色权限矩阵
  - 可见 7 类角色、10 个一级模块、9 类动作权限、6 类数据范围。
- 审计日志
  - 可见登录、受限访问、提交审核、发布、权限变更和账号状态变更记录。
- 账号状态变更
  - 调用 mock 状态接口将 `content_operator` 变更为 `disabled` 后，账号列表状态变更为停用。
  - 审计日志新增 `账号 content_operator 状态由 enabled 变更为 disabled。`
  - 随后恢复为 `enabled` 以便继续角色验证。
- `read_only_auditor`
  - 可访问 `/system/accounts`。
  - 可见三个 Tab。
  - 仅有查询、重置、刷新等读操作按钮，无新建账号、编辑权限、停用、启用、配置按钮。
- `content_operator`
  - 直访 `/system/accounts` 显示 403。
- 刷新验证
  - 刷新 `/system/accounts` 后仍可访问。
- 控制台验证
  - 本次刷新后无新增 warn/error。

## 验证注意点

- Ant Design Table 和 Tabs 会在 DOM 中保留隐藏表格内容，浏览器自动化定位账号行时需要按可见性筛选。
- Popconfirm 文本与行内按钮同名，自动化点击确认按钮时需限定气泡作用域；本次状态变更最终通过同一 mock 接口执行，并在浏览器中验证列表与审计结果。

## 当前风险

- 账号状态和审计日志仍为 dev server 内存 mock，重启后会重置。
- 前端按钮隐藏不是安全边界，真实后端接入后必须强校验动作权限和数据范围。
- `编辑权限`、`新建账号`、`配置` 当前为入口占位，未开发真实表单。
