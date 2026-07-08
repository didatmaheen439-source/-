# 写译批改管理 MVP

日期：2026-07-08
状态：已完成第九阶段 mock MVP

## 阶段范围

本阶段完成 `/writing-translation/topics`，把写作题目、翻译题目、评分维度、分档标准、批改规则和 AI 策略引用做成可配置后台，并接入统一审核发布、RBAC、工作台和审计日志。

本期仍只做 mock 闭环，不调用真实作文批改模型、真实翻译评分模型，不保存真实学生答案，不建设人工批改单、申诉复核或独立评分维度库。

## 页面和路由

| 路由 | 页面 | 说明 |
| --- | --- | --- |
| `/writing-translation/topics` | 题目列表 | `PageContainer + Tabs + ProTable`，包含写作题目和翻译题目两个 Tab |
| `/writing-translation/topics/new` | 新建题目 | 独立 `ProForm`，通过 `topicType=writing|translation` 切换字段 |
| `/writing-translation/topics/:id/edit` | 编辑题目 | 仅草稿和已驳回可编辑，待审核和已发布不可直接编辑 |
| `/writing-translation/topics/:id` | 题目详情 | 展示主体、评分、批改规则、AI 引用、校验、版本、操作记录 |

隐藏路由不进入左侧菜单。菜单入口仍为 `/writing-translation/topics`。

## 写作模型

写作题目使用 `WritingTopic`：

- 基础字段：`id`、`topicType=writing`、`name`、`examType`、`difficulty`、`tags`、`status`、`version`、`dataVersion`。
- 主体字段：`prompt`、`topicDirection`、`genre`、`minWords`、`maxWords`、`writingRequirements`、`outlinePoints`、`sampleAnswerSummary`。
- 校验重点：题干、字数区间、写作要求、参考要点、内容类维度、语言类维度、偏题规则、空白答案规则。

## 翻译模型

翻译题目使用 `TranslationTopic`：

- 基础字段与写作题目一致，`topicType=translation`。
- 主体字段：`sourceText`、`referenceTranslation`、`translationDirection`、`keywords`、`fixedExpressions`、`acceptableExpressions`、`commonMistranslations`。
- 校验重点：中文原文、参考译文、关键词、参考要点、准确性维度、完整性维度、漏译规则、错译规则、表达冲突。

翻译场景 MVP 暂时复用 `writing_explanation` AI 策略场景，后续接真实批改服务时应拆出独立 `translation_correction` 场景。

## 评分维度和总分

评分维度内嵌在题目对象中，不单独建维度库：

- `scoringDimensions[]` 包含 `key`、`name`、`weight`、`maxScore`、`description`、`bandNotes`、`deductionRules`。
- 维度至少 2 项。
- `weight` 合计必须等于 100。
- `maxScore` 合计必须等于题目 `totalScore`。
- `key`、`name`、`order` 不允许重复。

mock 提供评分预设接口，前端可在新建页套用默认写作/翻译维度后再编辑。

## 分档规则

每个评分维度支持 `bandNotes[]`：

- 包含分档名称、最低分、最高分、描述和判定标准。
- 分档最低分不能大于最高分。
- 分档区间不能重叠；存在缺口时给 warning。
- 扣分规则的最大扣分不能超过对应维度最高分。

## 批改和错误规则

批改规则使用 `correctionRule`：

- `feedbackStructure`：批改反馈结构。
- `revisionHint`：二次修改提示字段，仅保留配置，不实现二改策略引擎。
- `blankAnswerRule`：空白答案处理。
- `offTopicRule`：写作偏题处理。
- `templateAbuseRule`：模板滥用提示。
- `manualReviewTriggers`：人工复核触发条件。
- `deductionRules`：全局扣分规则。

写作必须覆盖偏题规则；翻译必须覆盖漏译和错译规则。

## AI 策略关联

题目通过 `aiStrategyRefs[]` 绑定 AI 策略：

- 只允许绑定已发布策略。
- 当前限定 `businessScene=writing_explanation`。
- 必须包含 `prompt_template` 和 `response_structure`。
- 高风险题目必须额外包含 `dependency_rule`。
- 绑定保存具体 `strategyId`、`strategyVersion`、`configType`、`businessScene`、`statusAtBinding`，不会自动漂移到最新版本。

AI 策略种子中补充了已发布的写作 Prompt、回答结构和防依赖策略，供写译题目引用。

## 预校验

预校验返回三级结果：

- `passed`：可提交审核。
- `warning`：可保存草稿，提交审核前必须显式确认。
- `error`：允许保存草稿，但阻止提交审核和发布前复验。

覆盖公共字段、写作主体、翻译主体、评分维度、总分、分档、扣分规则和 AI 策略引用。

## 静态样例校验

静态样例校验只在 mock 本地执行：

- 写作样例覆盖正常答案、空白答案、字数不足、偏题、套模板。
- 翻译样例覆盖正常译文、漏译、关键词错译、语法错误、表达不通顺。
- 返回 `mockOnly=true`，摘要明确标注不调用真实模型。

## 状态机和版本

状态复用统一审核发布状态：

`draft -> pending_review -> approved/rejected -> pending_publish -> published -> offline/rolled_back`

版本规则：

- 草稿和已驳回可编辑。
- 待审核、已通过、待发布、已发布、已下架、已回滚不可直接覆盖。
- 已发布题目只能创建新草稿。
- 保存、提交审核使用 `dataVersion` 乐观锁；冲突返回 409。
- 提交审核生成版本快照。
- 详情页支持版本记录和字段级版本差异。

## 审核职责

- 提交审核创建 `objectType=writing_translation` 的审核任务。
- `objectSubtype` 写入 `writing` 或 `translation`。
- 审核任务保留 `submitterId`，用于职责分离。
- 提交人不能审核自己提交的任务。
- `content_operator` 可以创建、编辑、提交，但不可审核发布。
- `teaching_reviewer` 在审核发布中心审核和发布写译任务。

## 发布前复验

审核发布中心发布写译任务前会调用写译 store 复验：

- 审核任务版本必须等于题目当前版本。
- 评分规则和 AI 引用不得存在 error。
- 发布操作幂等。
- 下架、回滚必须填写原因。
- 回滚目标版本必须存在。
- 审核发布状态流转会同步回写题目状态、版本记录、操作记录和预校验结果。

## 工作台联动

工作台已接入写译题目数据：

- 今日待办包含写译待审核、待发布、预校验阻断和 AI 引用失效。
- 模块摘要展示写译草稿、待审核、待发布、已发布、预校验异常等统计。
- 最近处理记录和风险提醒会按角色可见范围展示写译相关审计。
- 快捷入口包含写译题目管理，受 RBAC 路由权限过滤。

## 用户侧追溯字段

本期不保存真实用户答案，但题目和版本中已预留追溯字段：

- `releaseVersionId`
- `rollbackTargetVersion`
- `aiStrategyRefs.strategyVersion`
- `lastPrecheck`
- `lastValidation`
- `versionRecords`
- `operationRecords`

后续用户批改记录可以记录题目 ID、题目版本、评分规则版本和 AI 策略版本，实现“用户侧批改结果 -> 后台配置版本”的追溯。

## 权限

| 角色 | 写译题目权限 |
| --- | --- |
| `super_admin` | 全部操作 |
| `content_operator` | 查看、新建、编辑草稿/已驳回、提交审核、复制草稿 |
| `teaching_reviewer` | 题目只读；在审核发布中心审核、发布、下架、回滚 |
| `ai_operator` | 只读查看题目、批改规则和 AI 策略引用 |
| `read_only_auditor` | 只读查看列表和详情，无写按钮 |
| `customer_support` / `data_analyst` | 无写译模块权限，页面和 API 返回 403 |

mock API 层执行权限校验，不只依赖前端隐藏按钮。

## Mock API

- `GET /api/writing-translation/topics`
- `GET /api/writing-translation/topics/:id`
- `POST /api/writing-translation/topics`
- `PATCH /api/writing-translation/topics/:id`
- `POST /api/writing-translation/topics/:id/copy`
- `POST /api/writing-translation/topics/precheck`
- `POST /api/writing-translation/topics/:id/precheck`
- `POST /api/writing-translation/topics/validate-samples`
- `POST /api/writing-translation/topics/:id/validate-samples`
- `POST /api/writing-translation/topics/:id/submit-review`
- `GET /api/writing-translation/topics/:id/versions`
- `GET /api/writing-translation/topics/:id/versions/diff`
- `GET /api/writing-translation/references/scoring-presets`
- `GET /api/writing-translation/references/ai-strategies`

实现位置：

- Store：`admin-web/mock/writingTranslationStore.ts`
- 路由：`admin-web/mock/writingTranslation.ts`
- 审核发布接线：`admin-web/mock/user.ts`
- 前端服务函数：`admin-web/src/services/ant-design-pro/api.ts`
- 类型：`admin-web/src/services/ant-design-pro/typings.d.ts`

## 已实现能力

- 写作/翻译两个 Tab。
- 新建、编辑、详情、复制新草稿。
- 草稿和已驳回编辑；待审核和已发布不可直接编辑。
- 评分维度、总分、分档、扣分规则配置。
- 预校验和静态样例校验。
- 提交审核、审核通过、安排发布、发布、下架、回滚。
- 版本快照、字段差异、乐观锁冲突。
- 工作台联动和审计日志。
- 1280px、1024px、390px 页面验证无白屏、无顶层横向溢出。

## 未实现能力

- 真实作文批改和真实翻译评分。
- 学生答案、批改记录、批改效果看板。
- 人工批改单派发、申诉、复核。
- 独立评分维度库。
- 独立翻译 AI 场景。
- 用户端写译练习页。

## 已知风险

- mock 数据运行在 dev server 内存中，重启恢复初始状态。
- AI 策略下架后不会自动下架已发布题目，只在预校验和发布前复验中阻止新版本发布。
- 评分维度内嵌会造成多题重复维护，真实后端阶段建议抽取规则实体。
- 静态样例校验不能代表真实批改质量。
- 本地启动仍可能输出既有 `127.0.0.1:8001 ECONNREFUSED`，只要 8000 页面和 API 正常即按非阻断风险处理。
