# Ant Design Pro 基座适配计划

日期：2026-07-07

## 当前目录结构

`admin-web` 当前关键目录：

- `config/`：Umi 配置、路由、默认布局设置、代理、OpenAPI 配置。
- `mock/`：登录、用户、列表、图表等示例 mock。
- `src/access.ts`：Umi access 权限入口。
- `src/app.tsx`：全局初始状态、登录守卫、Pro Layout、请求配置。
- `src/components/`：Footer、HeaderDropdown、RightContent、错误边界、通用列表辅助组件等。
- `src/pages/`：示例页面，包括 dashboard、form、list、profile、account、exception、chatbot、user/login。
- `src/services/`：请求封装生成的 API service。
- `src/locales/`：菜单、页面、设置项等国际化文案。
- `types/`：API 类型和 Umi 类型。
- `dist/`：构建产物。
- `node_modules/`：依赖安装目录。

## 推荐保留目录

- `config/`
- `mock/`
- `src/access.ts`
- `src/app.tsx`
- `src/components/`
- `src/pages/user/login`
- `src/pages/exception`
- `src/services/`
- `src/locales/`
- `types/`
- `package.json`
- `package-lock.json`
- `.npmrc`
- TypeScript、Biome、Umi、构建相关配置文件

保留原因：

- 这些目录承载登录、权限、路由、布局、mock、请求、错误边界、国际化和构建流程，是后续 PRD 页面改造的基础设施。

## 推荐后续清理的演示目录

暂时不删除，第一阶段业务骨架完成后再清理：

- `src/pages/dashboard/*`：保留 `analysis` / `workplace` 作为工作台和运营数据参考。
- `src/pages/form/*`：保留作为内容编辑、规则编辑、审核配置表单参考。
- `src/pages/list/*` 和 `src/pages/table-list`：保留作为题库、用户、审核发布、日志列表参考。
- `src/pages/profile/*`：保留作为用户详情、内容详情、版本详情参考。
- `src/pages/result/*`：可作为发布成功、提交审核成功、失败页参考。
- `src/pages/account/*`：可作为后台账号和个人设置参考。
- `src/pages/chatbot`：后续 AI 陪练抽检/策略调试页可参考，但不能直接作为真实 AI 接入。

不建议运行 `npm run simple`，因为它会不可逆删除大量可复用页面模板。

## PRD 十个一级模块适配分析

| PRD 模块 | 可直接复用 | 需要改造 | 需要新增 |
| --- | --- | --- | --- |
| 工作台 | dashboard/workplace、analysis 的卡片、趋势、待办布局 | 替换为角色待办、审核待办、异常提醒、最近发布 | 角色过滤、跳转业务详情、风险摘要 |
| 用户管理 | table-list、profile/basic、Descriptions、ProTable | 字段改为用户、学习记录、反馈、AI 摘要 | 敏感访问先写日志、客服备注、反馈流转 |
| 题库与内容管理 | ProTable、CreateForm、UpdateForm、Drawer、Modal | 表单字段改为题目、题组、每日一句、外刊、素材 | 版本、引用影响、上下架、内容状态机 |
| 学习路径配置 | form/basic、form/advanced、table-list | 改为诊断规则、今日任务模板、轻量任务策略 | 规则预校验、冲突提示、题组绑定 |
| AI 陪练管理 | chatbot 页面、table-list、profile/advanced | chatbot 仅作 UI 参考，不接真实 AI | Prompt、意图、回答结构、防依赖、会话抽检、异常闭环 |
| 写译批改管理 | form、table、profile 详情模板 | 改为写作题、翻译题、评分维度、反馈模板 | 批改效果聚合、二改策略、用户原文脱敏 |
| 模考管理 | table-list、advanced form、profile detail | 改为试卷、分区、题目编排、计时配置 | 分值校验、试卷预览、结果统计 |
| 运营数据 | dashboard/analysis、@ant-design/plots | 图表口径改为用户、内容、题库、写译、模考、AI | 聚合导出、指标定义、角色可见指标 |
| 审核发布 | table-list、result、modal confirm | 改为待审核、已通过、待发布、发布版本 | 统一审核状态机、版本差异、下架/回滚原因 |
| 权限与系统设置 | admin 权限示例、account/settings、src/access.ts | 扩展为 7 类角色、菜单/页面/动作/数据范围权限 | 权限矩阵、唯一超管保护、登录/操作/敏感访问日志 |

## 可删除与不可删除边界

可以后续删除：

- 与商城、销售、门店、退货等无关的 mock 文案和示例字段。
- 多语言中未使用的演示文案。
- 示例外链、社交登录图标、演示欢迎页内容。

暂时不能删除：

- `src/app.tsx` 的登录守卫、layout、request 配置。
- `src/access.ts` 权限入口。
- `config/routes.ts` 路由配置。
- `mock/user.ts` 登录 mock 和 currentUser mock。
- `src/services/` 请求入口。
- `src/locales/zh-CN/menu.ts` 和相关菜单国际化机制。
- 表格、表单、详情、异常页、结果页模板。

## 公共组件复用方案

- 列表页：以 `src/pages/table-list/index.tsx` 的 `ProTable`、搜索项、分页、操作列为模板。
- 创建/编辑：以 `CreateForm`、`UpdateForm`、`Modal`、`Drawer` 和 `ProForm` 为基础。
- 详情页：以 `profile/basic` 的 `Descriptions`、明细表、进度/状态为模板。
- 审核弹窗：复用 `Modal`，统一要求原因、影响范围和二次确认。
- 状态展示：统一封装业务 `StatusTag`，状态来源使用 PRD 中的统一状态枚举。
- 版本信息：详情页统一展示 ID、状态、版本号、创建人、创建时间、更新人、更新时间。
- 权限按钮：基于 Umi `access` 和后续 action 权限扩展控制按钮显示与 API 操作。
- 数据看板：以 dashboard/analysis 和 `@ant-design/plots` 作为指标卡、趋势图和分布图基础。

## 第一阶段开发顺序

1. 建立过级搭子后台路由和菜单骨架。
2. 扩展角色模型和 `src/access.ts`，先落 7 类角色的前端可见性。
3. 建立统一状态枚举、操作原因字段、版本字段和 mock 数据结构。
4. 实现审核发布基础闭环：草稿、待审核、已通过、待发布、已发布、下架、回滚。
5. 实现用户管理、题库与内容管理的 P0 列表和详情。
6. 实现学习路径、AI 陪练、写译、模考的配置列表和详情骨架。
7. 实现运营数据基础看板和聚合导出占位。
8. 实现权限与系统设置中的账号、角色、操作日志、敏感访问日志骨架。

## 每一步完成标准

- 路由可直接访问，刷新不 404。
- 菜单按角色显示。
- 列表有搜索、筛选、分页、加载、空、错误和无权限状态。
- 表单有必填校验、离开确认或未保存提醒设计。
- 高风险操作有二次确认和原因字段。
- 关键操作写入 mock 审计日志。
- `npm run tsc`、`npm run lint`、`npm run build` 可通过。
- 浏览器至少验证登录、菜单、目标页面、刷新路由和一个关键交互。
