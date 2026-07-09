# 过级搭子后台管理系统项目记忆

## 2026-07-09

### Summary
- 当前项目是「过级搭子运营管理后台」MVP，基于 `ant-design/ant-design-pro` 改造。
- 项目根目录：`/Users/inn/Desktop/Workspace/projects/project-004-过级搭子后台管理系统`
- 前端目录：`/Users/inn/Desktop/Workspace/projects/project-004-过级搭子后台管理系统/admin-web`
- 当前分支：`codex/ai-coach-strategy-mvp`
- 最新阶段提交：`df542ab feat(mock-exam): complete paper configuration MVP`
- 第十一阶段已完成：当前 mock MVP 已固化为后端接入前的接口契约、数据模型、状态机权限和全链路验收基线。

### 已完成模块
- `/system/accounts`：权限与系统设置 MVP，包含账号列表、角色权限矩阵、审计日志和按钮权限验证。
- `/review-release/pending`：审核发布中心 MVP，包含审核任务列表、详情抽屉、状态流转、审计日志和角色权限验证。
- `/content/questions`：题库内容 MVP，包含题目列表、详情抽屉、新增/编辑页、提交审核、审核发布状态同步和审计日志。
- `/users/list`：用户管理 MVP，包含用户列表、详情页、学习记录、反馈处理、AI 摘要、敏感访问审计和权限验证。
- `/analytics/overview`：运营数据总览 MVP，包含增长、学习路径漏斗、题库、审核发布、客服反馈和 mock 导出预览。
- `/dashboard/overview`：运营工作台 MVP，包含今日待办、风险提醒、关键指标、快捷入口、模块摘要和最近处理记录。
- `/ai-coach/prompts`：AI 陪练策略治理 MVP，包含策略配置、场景覆盖、预校验、样例校验、版本差异和审核发布同步。
- `/writing-translation/topics`：写译批改管理 MVP，包含写作题目、翻译题目、评分维度、批改规则、AI 策略引用和审核发布同步。
- `/mock-exam/papers`：模考试卷配置 MVP，包含 CET4/CET6 模板、混合题目编排、预校验、版本快照、审核发布同步、聚合统计和跨模块联动。
- 第十一阶段没有新增业务页面；当前重点转为真实后端设计和联调准备。

### Key Files
- `README.md`：项目状态、常用命令和最近验证。
- `PRODUCT.md`：后台定位、用户、原则和边界。
- `admin-web/config/routes.ts`：后台路由和菜单。
- `admin-web/src/foundation/permissions.ts`：RBAC 权限矩阵。
- `admin-web/mock/user.ts`：用户、审核发布、工作台和运营数据等核心 mock 聚合。
- `admin-web/mock/contentQuestionStore.ts`：题库共享数据源。
- `admin-web/mock/mockExamStore.ts`：模考试卷共享 Store 和校验逻辑。
- `admin-web/mock/mockExam.ts`：模考试卷 Mock API。
- `docs/api-contract.md`：当前 mock API 到真实后端的接口契约基线。
- `docs/backend-data-models.md`：用户、账号角色、题库、学习路径、AI、写译、模考、审核发布和审计模型基线。
- `docs/backend-state-permission-baseline.md`：统一状态机、7 类角色权限矩阵和后端强校验要求。
- `docs/stage-11-regression-and-backend-baseline.md`：第十一阶段命令与浏览器验收记录。
- `docs/`：各阶段设计、验收和实施记录。
- `logs/`：命令输出、API/浏览器验证和阶段日志。

### Decisions
- 当前阶段仍只使用内存 Mock，不接真实后端、真实用户、真实 AI、上传服务或真实判分。
- 所有业务对象继续复用现有审核发布状态机、`PermissionButton`、RBAC 和审计日志。
- UI 继续沿用 Ant Design Pro、ProTable、ProForm、Drawer、Tabs、Tag、Tooltip 和既有状态标签，不新增 UI 组件库。
- 业务改造必须保持内部运营后台风格：高密度、克制、可扫描，避免营销页和装饰化设计。
- 真实后端接入前，mock API 也要表达权限、乐观锁、状态流转、预校验和审计，不能只靠前端隐藏按钮。

### Verification
- 最近完整验证来自第十一阶段全链路验收与后端接入基线。
- 已通过：`npm run test`、`npm run tsc`、`npm run lint`、`npx antd lint ./src`、`npm run build`。
- 浏览器验收已覆盖 10 个关键页面：`/dashboard/overview`、`/users/list`、`/content/questions`、`/learning-path/diagnosis-rules`、`/ai-coach/prompts`、`/writing-translation/topics`、`/mock-exam/papers`、`/analytics/overview`、`/review-release/pending`、`/system/accounts`。
- 角色验收已覆盖 7 类角色的工作台入口和典型越权 403。
- 第一次 `npm run test` 暴露 `src/access.test.ts` 仍使用旧 `admin/user` 权限断言，已修正为当前 RBAC 角色断言后复测通过。
- 验证日志位于 `logs/stage-11-backend-baseline-2026-07-09/`。
- 已知非阻断问题：浏览器控制层出现外部 Statsig 网络超时日志，不属于本地后台页面错误；当前仍为内存 mock，真实后端接入前必须重新实现权限、状态机、审计、脱敏和版本一致性。

### Backup
- 2026-07-09 已在项目内 `项目备份/` 保存最新备份：
  - 源码压缩包：`guojidazi-admin-backup-20260709-103633.tar.gz`
  - Git 历史包：`guojidazi-admin-git-20260709-103633.bundle`
  - 备份 manifest：`backup-manifest-20260709-103633.md`
- 源码压缩包排除了 `node_modules`、`.turbopack`、`dist`、`src/.umi`、`.git`、`backups` 和 `项目备份`，避免重复和缓存膨胀。

### Next Context
- 后续继续开发前先确认工作区是否干净：`git status --short`。
- 如果需要构建，先停止正在运行的 `npm run start`，避免 Utoo build 和 dev server 争用 `.turbopack/lock`。
- 下一阶段建议进入真实后端接口设计、数据库表设计和前后端联调准备，不要继续铺第十二个页面。
- 后端接入时以 `docs/api-contract.md`、`docs/backend-data-models.md`、`docs/backend-state-permission-baseline.md` 为基线，当前路由命名保持不变。
