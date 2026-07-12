# 过级搭子后台管理系统项目记忆

## 2026-07-12 AI Abnormal Reply Operations MVP

### Summary
- 完成 `/ai-coach/abnormal-replies` AI 陪练异常回复处置闭环，开放 AI 陪练下的“异常回复”二级入口。
- 支持异常队列、接手处理、受控证据访问、问题归因、修复策略草稿、审核发布联动、Mock 复检、正常关闭和误报/无需策略变更关闭。
- 证据访问必须填写原因并写入敏感访问审计；页面和 Mock API 均限制为 `ai_operator` 与 `super_admin`。
- 本阶段仍为 Mock，不接真实 AI、不接真实后端、不展示完整用户会话，不建设会话抽检页或手动创建异常入口。

### Key Files
- `admin-web/mock/aiAbnormalReplyStore.ts`
- `admin-web/mock/aiAbnormalReply.ts`
- `admin-web/src/pages/ai-coach/abnormal-replies/`
- `admin-web/src/foundation/aiAbnormalReplyStore.test.ts`
- `docs/ai-abnormal-replies-mvp.md`

### Decisions
- 异常回复处置只覆盖异常队列，不扩展会话抽检和手动标记异常。
- 正常关闭必须依赖发布后的修复策略和通过的 Mock 复检。
- 误报或无需策略变更允许严格关闭，但必须记录关闭类型和充分说明。
- 修复草稿复用已有 `ai_coach_strategy` 审核发布对象，不新增独立审核系统。

### Verification
- `npm run tsc`：通过。
- `npm run test`：通过，18 个测试文件、98 条测试。
- `npm run lint`：通过，Biome 扫描 346 个文件无问题，TypeScript 通过。
- `npx antd lint ./src`：通过，扫描 311 个文件无问题。
- `npm run build`：通过，生成 `dist/`，68 个资源文件。
- in-app browser：AI 策略运营可见异常回复菜单，列表和详情页可渲染，console 无 error/warn。

### Next Context
- 后续若继续 AI 会话抽检，应先建设会话样本来源和手动标记异常入口，再复用异常回复 Store 的状态机。
- 真实后端接入需优先实现异常表、证据表、复检记录、操作审计和 `dataVersion` 乐观锁。

## 2026-07-12 AI Session Review MVP

### Summary
- `/ai-coach/session-review` 已从隐藏占位入口升级为可用二级模块，包含列表筛选、详情、认领、释放、必要信息申请、正常结论和异常结论。
- 会话抽检只展示脱敏摘要；必要信息必须由当前认领人填写原因并选择字段后即时授权，审计失败时不返回字段。
- 异常结论会原子生成 `AiAbnormalHandlingItem`，并固化当次会话关联的策略 ID、标题、版本、场景和状态快照。
- `read_only_auditor` 仍可只读查看 AI 策略，但不能进入会话抽检业务处置流；页面和 Mock API 都收紧到 `super_admin` 与 `ai_operator`。

### Key Files
- `admin-web/mock/aiCoachSessionReviewStore.ts`
- `admin-web/mock/aiCoach.ts`
- `admin-web/src/pages/ai-coach/session-review/`
- `docs/ai-coach-session-review-mvp.md`
- `docs/api-contract.md`

### Decisions
- 本阶段只做后台 Mock，不接真实后端、真实 AI、真实用户完整会话或真实附件。
- 会话抽检状态机为 `pending -> in_review -> completed`；完成态 MVP 不支持重开。
- 敏感字段白名单限定为上下文片段、用户输入片段、AI 回复片段和附件摘要。
- 异常处理项只创建和交接；主干已有 `/ai-coach/abnormal-replies` 处置模块，后续需要统一两者的数据来源和状态口径。

### Verification
- `npm run tsc`：通过。
- `npm run test`：通过，19 个测试文件、102 条测试。
- `npm run lint`：通过，Biome 扫描 350 个文件无问题，TypeScript 通过。
- `npx antd lint ./src`：通过，扫描 315 个文件无问题。
- `npm run build`：通过，输出 `dist/`，70 个资源文件。
- dev server smoke：`ai_operator` 列表、异常结论和异常处理项生成通过；`read_only_auditor` 访问会话抽检 API 返回 403；记录见 `logs/ai-session-review-implementation-2026-07-12.md`。

### Next Context
- 与异常回复模块联动时，复用 `AiAbnormalHandlingItem` 的来源会话、异常类型、优先级、证据摘要和策略快照，不要重新设计来源模型。
- 接真实后端时必须保留服务端权限、字段白名单、审计先写、乐观锁、异常处理项幂等和策略版本快照。

## 2026-07-12 Daily Sentence Operations MVP

### Summary
- 完成 `/content-operations/daily-sentences` 每日一句运营闭环，开放“内容运营”一级菜单和“每日一句”二级入口，外刊继续隐藏。
- 支持列表/日历、新建编辑、来源凭证、Mock 配图引用、用户侧预览、预校验、审核发布、立即/定时发布、Mock 用户阅读/打卡、效果回流、下架和复制新版本。
- 每日一句加入统一 `daily_sentence` 审核对象、内容指标和操作审计；内容运营不能审核发布，教研审核和超级管理员按既有职责处理。

### Key Files
- `admin-web/mock/dailySentenceStore.ts`
- `admin-web/mock/dailySentence.ts`
- `admin-web/src/pages/content-operations/daily-sentences/`
- `admin-web/src/pages/review-release/pending/index.tsx`

### Decisions
- 本阶段只改后台 Mock，不修改 Expo App，不建设独立素材管理模块。
- Mock 素材选择器只允许引用有效素材，来源凭证和配图状态在提交与发布前复验。
- 定时发布使用 `Asia/Shanghai`，由每日一句、审核或运营数据请求触发 Mock 调度；真实后端需替换为持久化任务队列。
- 用户行为 MVP 只记录阅读和打卡；事件按 `eventId` 幂等，打卡按用户和内容版本去重。

### Verification
- `npm run tsc`：通过。
- `npm run test`：通过，15 个测试文件、84 条测试。
- `npm run lint`：通过，Biome 扫描 332 个文件无问题，TypeScript 通过。
- `npx antd lint ./src`：通过，扫描 297 个文件无问题。
- `npm run build`：通过，生成 `dist/`，共 60 个资源文件。
- in-app browser：超级管理员可见内容运营和每日一句；列表、日历、详情预览、审核发布任务与 Mock 阅读回流均通过，阅读 PV 从 2 增至 3。

### Next Context
- 若继续外刊模块，复用每日一句的来源、素材引用、审核发布、版本和效果回流边界。
- 接真实后端时优先替换内存 Store、请求触发式调度和 Mock 用户事件，不改变页面状态语义。

## 2026-07-12 External Article Operations MVP

### Summary
- 内容运营一级菜单已开放，`/content-operations/articles` 从占位页升级为外刊列表、独立编辑页和详情页。
- 外刊复用统一审核发布状态机，内容运营负责创建、编辑和提交，教研负责审核、发布、下架和回滚；已发布内容通过复制生成新草稿，禁止覆盖线上版本。
- 新增受管 Mock 素材、不可变提交快照、唯一线上版本指针、Mock 用户阅读/收藏/完成事件和幂等聚合。
- 外刊效果回流到文章详情、运营数据和工作台风险；低完成率只生成提示，不自动下架。

### Key Files
- `admin-web/mock/articleStore.ts`
- `admin-web/src/pages/content-operations/articles/`
- `admin-web/mock/user.ts`
- `docs/articles-operations-mvp.md`

### Decisions
- 本阶段不修改 Expo App，不接真实后端、对象存储或定时任务。
- 素材只做文章内受管选择和引用校验，不建设独立素材管理页。
- 事件按 `eventId` 幂等，效果按文章线上版本聚合；下架后拒绝新事件，回滚后只接受恢复版本。
- 阅读 UV 少于 20 标记样本不足；样本达到 20 且完成率低于 35% 标记低完成率，处置仍由授权角色人工执行。

### Verification
- 详见 `logs/articles-operations-implementation-2026-07-12.md`。

### Next Context
- 真实后端接入时应保持文章快照、线上版本指针、事件幂等键和聚合口径，不把统计数字改为可直接写入字段。
- 独立素材库、真实上传、自动发布和移动端事件接入均为后续范围。

## 2026-07-12 Feedback Work Queue MVP

### Summary
- `/users/feedback` 从隐藏占位升级为反馈工作队列二级模块，并新增 `/users/feedback/:feedbackId` 详情页。
- 队列覆盖客服待分诊、敏感原文授权、分派/转派唯一负责人、业务负责人回填、客服退回或关闭、无需处理和完整时间线。
- 反馈队列与用户详情共用 `operationUsersData.feedbacks` 状态和版本，不维护重复反馈状态。
- 工作台同步客服待分诊、超时处理中、待验收反馈，以及内容/教研/AI 负责人“分派给我”的反馈任务。

### Key Files
- `admin-web/mock/user.ts`
- `admin-web/src/foundation/feedbackQueue.ts`
- `admin-web/src/pages/users/feedback/`
- `docs/feedback-work-queue-mvp.md`

### Decisions
- 本期继续使用 Mock，不接真实后端、消息系统、自动派单或外部工单。
- 敏感访问沿用既有原因即时授权机制，`sourcePage` 记录为 `/users/feedback`。
- 业务负责人只获得反馈队列对象级权限，不获得 `/users/list` 或 `/users/:id` 权限。
- `closed` 为终态，本期不支持重新打开。

### Verification
- `npm run test`：通过，18 files / 97 tests。
- `npm run tsc`：通过。
- `npm run lint`：通过，Biome 检查 347 files，无问题。
- `npx antd lint ./src`：通过，扫描 312 files，无问题。
- `npm run build`：通过，输出 `dist/`，68 files。
- API smoke 和浏览器断点验收详见 `logs/feedback-work-queue-implementation-2026-07-12.md`。

## 2026-07-10 Navigation Reduction Stage 1

### Summary
- 已按责任边界和稳定业务对象重构侧边栏：代码中建立 11 个一级模块，当前展示 10 个可用一级模块和 15 个已实现二级入口。
- 新增“内容运营”一级模块并承接每日一句、外刊内容；由于两个子页面仍为占位，父级和子级暂时隐藏，旧 `/content/...` 地址仅重定向到同一业务对象的新语义地址。
- 今日任务模板、写作题目、翻译题目、后台账号和角色权限保持独立菜单，不因底层复用同一组件而合并。
- 运营数据收敛为“数据总览”，系统日志收敛为“审计日志”，审核发布版本作为隐藏语义视图；原有细分 URL 继续可直接访问并映射到主菜单高亮。
- 七类角色继续作为权限与责任集合，不解释为七名全职员工；本阶段不修改 RBAC、Mock API、审核状态机或对象级职责分离逻辑。

### Key Files
- `admin-web/config/routes.ts`
- `admin-web/src/foundation/routes.test.ts`
- `admin-web/src/locales/zh-CN/menu.ts`
- `admin-web/src/foundation/permissions.ts`
- `PRODUCT.md`

### Decisions
- 未完成的稳定业务对象只隐藏生产菜单，不删除 PRD、权限归属、占位配置或未来语义路由。
- 只对同一业务能力迁移使用重定向；未实现能力不得跳转到无关模块首页。
- 内容运营暂时复用既有 `content` 模块权限，后续权限与后端阶段再评估动作和数据范围拆分。
- 对象级创建、审核、发布、回滚职责分离是后续后端实现的强制约束，不混入本次导航任务。

### Verification
- `npm run test -- routes.test.ts`：通过，1 个测试文件、6 条导航结构断言全部通过。
- `npm run test`：通过，13 个测试文件、71 条测试全部通过。
- `npm run lint`：通过，Biome 检查 323 个文件无问题，`tsc --noEmit` 通过。
- `npx antd lint ./src`：通过，扫描 288 个文件无问题。
- `npm run build`：通过，生成 `dist/`，共 56 个资源文件。
- in-app browser：通过；超级管理员显示 10 个当前可用一级模块，15 个已实现二级入口由路由测试固定；7 类角色菜单与现有权限矩阵一致；客服直访 `/system/accounts` 显示 403；旧审核待办和内容运营地址跳转正确；运营数据、敏感访问日志语义 URL 正确高亮合并后的主菜单。

### Next Context
- 当前可见二级入口固定为 15 个；恢复任何占位入口前，必须先具备独立语义 URL、核心任务、加载/空/错误/无权限状态及完整验证。
- “内容运营”首个可用页面完成后，移除父级 `hideInMenu` 并单独执行角色菜单与直接 URL 验收。

## 2026-07-09

### Summary
- 当前项目是「过级搭子运营管理后台」MVP，基于 `ant-design/ant-design-pro` 改造。
- 项目根目录：`/Users/inn/Desktop/Workspace/projects/project-004-过级搭子后台管理系统`
- 前端目录：`/Users/inn/Desktop/Workspace/projects/project-004-过级搭子后台管理系统/admin-web`
- 当前分支：`codex/ai-coach-strategy-mvp`
- 最新阶段提交：`df542ab feat(mock-exam): complete paper configuration MVP`
- 第十一阶段已完成：当前 mock MVP 已固化为后端接入前的接口契约、数据模型、状态机权限和全链路验收基线。
- PRD v1.3 P0 二级菜单拆分已完成：左侧菜单补齐题组、错因标签、每日一句、外刊、学习路径策略、AI 治理子项、写作题目、翻译题目、运营数据分区、发布版本和系统日志入口；未完整实现的 P0 入口统一接入只读占位页。
- 已有聚合页拆实补强已完成：写作题目、翻译题目、今日任务模板、操作日志、敏感访问日志和运营数据分区都可通过独立业务语义 URL 进入；底层仍复用现有列表、表单、详情、Tab、筛选、权限和审计能力。
- `/content/wrong-reason-tags` 错因标签字典 MVP 已完成：基础字典型 CRUD、引用次数、版本记录、操作记录、提交审核、`wrong_reason_tag` 审核任务和发布状态回写已打通。

### 已完成模块
- `/system/accounts`：权限与系统设置 MVP，包含账号列表、角色权限矩阵、审计日志和按钮权限验证。
- `/review-release/pending`：审核发布中心 MVP，包含审核任务列表、详情抽屉、状态流转、审计日志和角色权限验证。
- `/content/questions`：题库内容 MVP，包含题目列表、详情抽屉、新增/编辑页、提交审核、审核发布状态同步和审计日志。
- `/content/wrong-reason-tags`：错因标签字典 MVP，包含标签列表、详情页、新增/编辑页、分类、适用考试、适用题型、严重级别、引用次数、提交审核、审核发布状态同步和审计日志。
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
- `admin-web/src/pages/prd-placeholder/index.tsx`：PRD P0 未完整实现入口的统一只读占位页。
- `admin-web/src/foundation/module-placeholders.ts`：PRD P0 占位入口配置。
- `admin-web/src/foundation/permissions.ts`：RBAC 权限矩阵。
- `admin-web/mock/user.ts`：用户、审核发布、工作台和运营数据等核心 mock 聚合。
- `admin-web/mock/contentQuestionStore.ts`：题库共享数据源。
- `admin-web/src/pages/content/wrong-reason-tags/`：错因标签列表、详情、编辑页面和 store 单测。
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
- 左侧菜单只承载稳定业务对象集合；详情、新建、编辑、动态 `:id`、审核状态切换和版本差异页继续隐藏，不放入左侧菜单。
- 二级入口优先表达“业务对象”，不按菜单数量复制页面。写译题目、学习路径配置、系统设置和运营数据的拆分要继续复用共享组件，只有对象模型、权限边界、状态机或后端表真正不同才拆独立实现。

### Verification
- 最近完整验证来自第十一阶段全链路验收与后端接入基线。
- 已通过：`npm run test`、`npm run tsc`、`npm run lint`、`npx antd lint ./src`、`npm run build`。
- 浏览器验收已覆盖 10 个关键页面：`/dashboard/overview`、`/users/list`、`/content/questions`、`/learning-path/diagnosis-rules`、`/ai-coach/prompts`、`/writing-translation/topics`、`/mock-exam/papers`、`/analytics/overview`、`/review-release/pending`、`/system/accounts`。
- 角色验收已覆盖 7 类角色的工作台入口和典型越权 403。
- 第一次 `npm run test` 暴露 `src/access.test.ts` 仍使用旧 `admin/user` 权限断言，已修正为当前 RBAC 角色断言后复测通过。
- 验证日志位于 `logs/stage-11-backend-baseline-2026-07-09/`。
- PRD P0 二级菜单拆分验证已通过：`npm run tsc`、`npm run lint`、`npm run test`、`npx antd lint ./src`、`npm run build`；浏览器抽查见 `logs/prd-p0-menu-split-2026-07-09.md`。
- 已有聚合页拆实补强验证已通过：`npm run tsc`、`npm run lint`、`npm run test`、`npx antd lint ./src`、`npm run build`；浏览器抽查覆盖 `/writing-translation/writing-topics`、`/writing-translation/translation-topics`、对应新建页、`/learning-path/task-templates`、`/system/operation-logs`、`/system/sensitive-access-logs`、`/analytics/users`、`/analytics/ai`、`/analytics/questions`。
- 错因标签 MVP 验证已通过：`npm run test -- wrongReasonTagStore`、`npm run tsc`、`npm run test`、`npm run lint`、`npx antd lint ./src`、`npm run build`；API smoke 覆盖列表、详情、400 校验、403 权限、新建、提交审核和审核发布状态回写。浏览器控制层本轮连接 in-app browser 超时，需后续补视觉验收。
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

## 2026-07-11 题组管理 Mock MVP

### Summary
- `/content/question-groups` 已从隐藏占位入口升级为可用二级模块，包含列表、新建/编辑、详情、复制、预校验和提交审核。
- 题组固定为单一考试类型、单一学习模块和多个固定适用人群标签，只允许选择已发布且考试类型、学习模块一致的题目。
- 题组审核复用统一审核发布中心，`question_group` 状态会回写题组；发布前再次校验题目状态和一致性。
- 学习路径只展示已发布且校验通过的题组；模考试卷可按题组顺序展开为题目快照，并保留题组 ID、名称和版本来源。
- 题组详情的引用影响同时聚合学习路径配置和带题组来源的模考试卷，为下架判断提供依据。

### Key Files
- `admin-web/mock/questionGroupStore.ts`
- `admin-web/src/pages/content/question-groups/`
- `admin-web/mock/mockExamStore.ts`
- `admin-web/src/pages/mock-exam/papers/edit/index.tsx`
- `docs/question-groups-mvp.md`
