# 运营数据分区 Tab 实施记录

## 日期

2026-07-13

## 改动范围

- `admin-web/src/pages/analytics/overview/index.tsx`
- `admin-web/mock/user.ts`
- `admin-web/src/services/ant-design-pro/api.ts`
- `admin-web/src/services/ant-design-pro/typings.d.ts`
- `admin-web/config/routes.ts`
- `admin-web/src/foundation/module-placeholders.ts`
- `admin-web/src/locales/zh-CN/menu.ts`
- `admin-web/src/locales/en-US/menu.ts`
- `admin-web/src/foundation/routes.test.ts`
- `docs/analytics-partition-tabs-mvp.md`

## 实施说明

- 数据总览页面从模块下拉改为页面内分区 Tab。
- 分区范围为用户、路径、内容、错因、写译、模考、AI、留存。
- 新增隐藏语义路由 `/analytics/retention`，不增加可见侧栏二级菜单。
- Mock 聚合新增分区指标、趋势、分布、下钻对象和修正意图接口。
- 修正意图只记录审计日志并跳转对象归属页面，不在运营数据页直接修改业务对象。

## 验证结果

- `npm run test -- routes.test.ts`：通过，1 个文件 / 7 个用例。
- `npm run lint`：通过，Biome lint 无问题，`tsc --noEmit` 通过。
- `npx antd lint ./src`：通过，330 个文件无问题。
- `npm run build`：通过，输出 `admin-web/dist/`，包含 `/analytics/retention` 隐藏路由静态页。
- 浏览器验收：
  - `data_analyst` 访问 `/analytics/overview`：8 个 Tab 可见，侧栏无留存二级入口，无横向溢出。
  - `data_analyst` 访问 AI 分区：下钻对象可见，但无 AI 目标模块权限时展示“无目标权限”，不跳 403。
  - `super_admin` 访问 AI 分区：点击“处理异常”后进入 `/ai-coach/abnormal-replies/abnormal-ai-001`，异常详情流程可见。
  - 直接访问 `module=retention`：留存指标、低频活跃用户下钻和“查看用户”动作可见，无横向溢出。

## 返工记录

- 首次构建时同工作树 dev server 占用 `.turbopack/lock`，停止 dev server 后重新执行 `npm run build` 通过。
- 首次浏览器点击使用宽泛按钮筛选，误点到非目标按钮；后续改用快照里的精确按钮名。
- 数据分析角色能查看全量运营数据，但不能进入 AI 目标对象页；已补充 `targetAccessible` 和 `correctionAccessible`，前端隐藏不可达操作，Mock 接口也拒绝无目标权限的修正意图。
