# 第十一阶段全链路验收与后端接入基线

日期：2026-07-09

## 阶段目标

本阶段不继续铺新页面，而是把当前 mock MVP 固化为真实后端设计和联调前的基线。

产物：

- `docs/api-contract.md`
- `docs/backend-data-models.md`
- `docs/backend-state-permission-baseline.md`
- `docs/stage-11-regression-and-backend-baseline.md`
- `logs/stage-11-backend-baseline-2026-07-09/`

## 页面验收范围

| 当前页面 | PRD v1.3 对照 | 验收重点 | 当前结论 |
| --- | --- | --- | --- |
| `/dashboard/overview` | `/dashboard/workbench` | 工作台待办、风险、指标、快捷入口按角色过滤 | 通过：页面渲染，无白屏、无 403/404/500、无横向溢出 |
| `/users/list` | 用户列表 | 搜索、筛选、脱敏、详情入口、权限差异 | 通过：页面渲染，无白屏、无横向溢出；页面文本中的 `500` 为目标分业务数字，不是 500 错误页 |
| `/content/questions` | 题库管理 | 题目列表、新建/编辑、提交审核、状态标签 | 通过：页面渲染，无白屏、无 403/404/500、无横向溢出 |
| `/learning-path/diagnosis-rules` | 诊断规则、今日任务模板 | Tabs、预校验、详情/编辑、审核发布联动 | 通过：页面渲染，无白屏、无 403/404/500、无横向溢出 |
| `/ai-coach/prompts` | AI Prompt 模板及策略配置 | 四类配置、预校验、样例校验、版本差异 | 通过：页面渲染，无白屏、无 403/404/500、无横向溢出 |
| `/writing-translation/topics` | 写作/翻译题目 | 写作/翻译 Tabs、评分维度、AI 引用、审核发布 | 通过：页面渲染，无白屏、无 403/404/500、无横向溢出 |
| `/mock-exam/papers` | 模考试卷 | 试卷列表、编排、预校验、详情统计 | 通过：页面渲染，无白屏、无 403/404/500、无横向溢出 |
| `/analytics/overview` | 运营数据细分看板 | 筛选、聚合指标、导出预览、分区权限 | 通过：页面渲染，无白屏、无 403/404/500、无横向溢出 |
| `/review-release/pending` | 审核发布中心 | 审核、驳回、发布、下架、回滚状态流转 | 通过：页面渲染，无白屏、无 403/404/500、无横向溢出 |
| `/system/accounts` | 账号、角色权限、日志 | 账号列表、权限矩阵、审计日志、只读权限 | 通过：页面渲染，无白屏、无 403/404/500、无横向溢出 |

## 命令验证记录

| 命令 | 结果 | 日志 |
| --- | --- | --- |
| `npm run test` | 通过：10 个测试文件、61 条测试全部通过 | `logs/stage-11-backend-baseline-2026-07-09/npm-run-test.log` |
| `npm run tsc` | 通过 | `logs/stage-11-backend-baseline-2026-07-09/npm-run-tsc.log` |
| `npm run lint` | 通过：Biome 315 个文件无问题，TypeScript 通过 | `logs/stage-11-backend-baseline-2026-07-09/npm-run-lint.log` |
| `npx antd lint ./src` | 通过：扫描 280 个文件，无问题 | `logs/stage-11-backend-baseline-2026-07-09/npx-antd-lint.log` |
| `npm run build` | 通过：输出 `dist`，构建 53 个资源文件 | `logs/stage-11-backend-baseline-2026-07-09/npm-run-build.log` |

## 验证过程修正

- 首次 `npm run test` 失败在 `src/access.test.ts`：测试仍使用 Ant Design Pro 原始 `admin`/`user` 权限断言，和当前 `super_admin` 等 RBAC 角色不一致。
- 已将测试更新为当前项目真实角色和权限断言，运行时 `access.ts` 未改动。
- 复测 `npm run test` 通过。
- 重命名首次失败日志时曾在 `admin-web/` 目录使用错误相对路径，最终通过日志已保存到项目 `logs/`；该路径问题已追加到全局复盘日志。

## 后端接入基线结论

| 领域 | 当前基线 | 后端接入要求 |
| --- | --- | --- |
| 接口 | mock API 覆盖 10 个核心模块 | 统一响应结构、错误码、权限校验和审计 |
| 数据模型 | 核心对象在 mock store 和类型中已表达 | 后端按实体持久化，保留版本和审计 |
| 状态机 | 审核发布中心统一驱动主要业务对象 | 后端强制状态流转和职责分离 |
| 权限 | `permissions.ts` 表达菜单、动作和数据范围 | 后端逐接口强校验，前端隐藏不作为安全边界 |
| 审计 | mock 覆盖操作、敏感访问、权限拒绝 | 后端统一写入，失败操作也记录 |
| 敏感数据 | 用户详情、反馈原文、AI 摘要按需访问 | 日志写入成功后才返回敏感内容 |

## 当前不纳入第十一阶段的事项

- 不新增题组、每日一句、外刊、错因标签等新页面。
- 不拆 `/analytics/overview` 为多个细分看板。
- 不把 `/dashboard/overview` 改名为 `/dashboard/workbench`。
- 不接真实后端、真实 AI、真实用户、上传服务或真实判分。
- 不调整业务状态机、权限矩阵或页面交互。

## 验证结论

- 命令验证已完成。
- 浏览器页面验收已完成。
- 页面 dev logs 未发现阻断错误。浏览器控制层出现外部 Statsig 网络超时日志，不属于本地后台应用控制台错误。
- 非阻断风险：当前仍是内存 mock；真实后端接入前必须重新实现接口权限、状态机、审计、脱敏和版本一致性。
