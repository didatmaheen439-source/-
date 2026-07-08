# 后台业务骨架、RBAC 权限和公共规范执行日志

日期：2026-07-07

## 已执行命令

### 读取与确认

- `pwd && git status --short --branch`
  - 结果：位于 `admin-web`，当前分支 `feat/admin-shell-rbac`，存在上一阶段初始化改动。
- `sed -n '1,260p' config/routes.ts`
  - 结果：确认仍是 Ant Design Pro 官方示例路由。
- `sed -n '1,220p' src/access.ts && sed -n '1,260p' mock/user.ts`
  - 结果：确认原权限仅有 `canAdmin`，mock 登录仅支持 `admin/user`。
- `sed -n '1,220p' src/app.tsx && sed -n '1,220p' src/locales/zh-CN/menu.ts`
  - 结果：确认布局、登录态、菜单国际化仍以官方示例为主。
- `sed -n '1,260p' src/services/ant-design-pro/typings.d.ts`
  - 结果：确认 `CurrentUser` 尚无角色、动作权限和数据范围字段。

### 文件准备

- `cp /Users/inn/Desktop/b端后台管理系统/admin-component-spec设计规范.md docs/admin-component-spec.md`
  - 结果：已将用户提供的组件规范复制为项目内标准文件，行数 1285。
- `mkdir -p ...`
  - 结果：已创建 `src/foundation`、公共组件目录和十个业务占位页目录。

### 类型检查

- `npm run tsc`
  - 结果：通过。
- `npm run lint`
  - 第一次结果：通过但有 Biome warning，`BusinessModulePlaceholder` 使用了过宽的 `Function` 类型。
  - 修复：改为 `(moduleKey: AdminModuleKey, action: PermissionAction) => boolean`。
  - 复跑结果：通过，Biome 检查 291 个文件，无 warning。
- `npm run build`
  - 结果：通过，输出目录 `admin-web/dist`，生成 39 个 assets。

### 开发服务和浏览器验证

- `npm run dev`
  - 结果：服务可启动，但脚本包含 `MOCK=none`，登录接口 `/api/login/account` 返回 404，不适合本阶段 RBAC mock 验证。
  - 处理：停止该服务，改用 `npm run start`。
- `npm run start`
  - 结果：服务启动成功，访问地址 `http://localhost:8000`。
  - 启动期间曾出现一次 `connect ECONNREFUSED 127.0.0.1:8001`，页面服务不受影响，后续浏览器验证通过。
- in-app browser 访问 `http://localhost:8000/user/login`
  - 结果：登录页可打开，标题为 `登录 - 过级搭子运营管理后台`，用户名和密码输入框存在。
- 使用 `super_admin / ant.design` 登录
  - 结果：登录成功，默认进入 `/dashboard/overview`。
  - 桌面视口 1440px 下确认十个一级菜单可见：工作台、用户管理、题库与内容管理、学习路径配置、AI 陪练管理、写译批改管理、模考管理、运营数据、审核发布、权限与系统设置。
- 访问十个默认页面
  - 结果：`/dashboard/overview`、`/users/list`、`/content/questions`、`/learning-path/diagnosis-rules`、`/ai-coach/prompts`、`/writing-translation/topics`、`/mock-exam/papers`、`/analytics/overview`、`/review-release/pending`、`/system/accounts` 均可打开。
- 角色验证
  - `content_operator`：可见工作台、题库与内容管理、学习路径配置、写译批改管理、审核发布；用户管理和系统设置隐藏；直访 `/system/accounts` 显示 403。
  - `customer_support`：可访问 `/users/list`；直访 `/content/questions` 和 `/system/accounts` 显示 403。
  - `data_analyst`：主要可见工作台和运营数据；可访问 `/analytics/overview`；直访内容模块显示 403。
  - `read_only_auditor`：可读审核发布和系统占位；直访内容模块显示 403；页面无新建、编辑、发布按钮。
  - `super_admin`：题库页显示新建、编辑、提交审核、发布按钮。
- 状态与页面状态验证
  - `StatusTag` 展示：启用、停用、待审核、已发布、异常。
  - 空态/列表占位：表格占位和 `功能建设中` 空态存在。
  - `?state=loading`：加载状态可显示。
  - `?state=error`：错误状态显示 `模块加载失败`。
  - `?state=forbidden`：无权限状态显示 403。
  - 刷新 `/analytics/overview` 后仍可访问。
- 控制台验证
  - 初次验证发现新增组件触发 AntD v6 API warning：`Space.direction` deprecated、`Alert.message` deprecated。
  - 修复：改为 `Space orientation` 和 `Alert title`。
  - 重新构建并新页面按时间戳过滤 warn/error，结果：本次导航后无新增 warn/error。

## 已实施内容

- 新增 `admin-web/PRODUCT.md`，记录后台产品方向与 UI 原则。
- 新增 `src/foundation/permissions.ts`，定义十个模块、七类角色、九类动作、六类数据范围。
- 新增 `src/foundation/status.ts`，定义审核发布、反馈、账号、异常和系统健康状态。
- 新增 `src/foundation/audit.ts`，定义审计日志字段和 mock 数据。
- 新增 `src/foundation/module-placeholders.ts`，定义十个模块占位页元数据。
- 新增 `StatusTag`、`PermissionButton`、`BusinessModulePlaceholder` 三个公共组件。
- 新增十个业务模块默认页面。
- 重写 `config/routes.ts`，业务菜单只暴露 PRD 十个一级模块，官方示例移至隐藏 `/examples/*`。
- 更新 `src/access.ts`，接入菜单、路由和按钮权限判断。
- 更新 `mock/user.ts`，支持七类测试账号、停用账号错误和审计日志接口。
- 更新登录页默认跳转 `/dashboard`，并保留账号密码输入方式。

## 待补充验证

- 无。

## 当前风险

- RBAC 当前仍是前端和 mock 表达，不是最终安全边界。
- 只读审计暂时访问 `/system/accounts` 占位页，后续应拆分系统日志入口。
- 官方示例页保留为隐藏路由，后续清理前需确认是否仍作为开发参考。
- `npm run dev` 在本项目中禁用 mock；后续需要 mock 权限验证时使用 `npm run start`。
