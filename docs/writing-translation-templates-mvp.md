# 写译评分与反馈模板 MVP

日期：2026-07-13

## 目标与范围

本阶段新增 `/writing-translation/scoring-feedback-templates`，通过“评分维度”和“反馈模板”两个 Tab 管理可复用写译批改标准。继续使用 Mock，不调用真实批改模型，不保存真实用户答案，不建设完整批改记录摘要页。

## 角色与主流程

| 阶段 | 角色 | 输出 |
| --- | --- | --- |
| 维护评分标准 | 教研审核 | 评分维度、权重、总分和适用范围草稿 |
| 维护反馈结构 | AI 策略运营 | 反馈区块及已发布回答结构引用草稿 |
| 预校验 | Mock 系统 | 权重、总分、结构和引用校验结果 |
| 审核发布 | 教研审核或超级管理员 | 不可覆盖的已发布模板版本 |
| 题目绑定 | 教研审核 | 题目固定引用评分与反馈模板发布版本 |
| Mock 使用 | Mock 系统 | 带题目、模板和 AI 策略版本快照的批改记录 |

提交人不能审核自己的模板。反馈模板由 AI 策略运营维护，但由教研统一复核学习质量与输出结构。

## 状态与版本

复用统一状态机：

`draft -> pending_review -> approved/rejected -> pending_publish -> published -> offline/rolled_back`

- 草稿和已驳回模板可编辑。
- 已发布模板只能复制为新草稿，题目不会自动升级到新版本。
- 模板下架后禁止新绑定和新 Mock 批改，历史记录继续展示原版本快照。
- 保存、提交与题目绑定使用 `dataVersion` 乐观锁。

## 校验规则

- 评分维度至少两项，权重合计 100%，最高分合计等于模板总分。
- 维度 key、名称、排序不可重复。
- 反馈模板必须包含总体评价、分维度反馈、主要问题和修改建议。
- 反馈区块 key 与排序不可重复。
- 反馈模板必须引用有效的已发布 `response_structure` 版本。
- 题目只能绑定题型、考试类型和总分均匹配的已发布模板。

## 权限

| 角色 | 评分维度 | 反馈模板 | 题目绑定 | 审核发布 |
| --- | --- | --- | --- | --- |
| 超级管理员 | 全部 | 全部 | 是 | 是 |
| 教研审核 | 新建、编辑、提交 | 只读 | 是 | 是，禁止自审 |
| AI 策略运营 | 只读 | 新建、编辑、提交 | 否 | 否 |
| 内容运营、只读审计 | 只读 | 只读 | 否 | 否 |

Mock API 层执行相同的细粒度权限校验。

## Mock API

- `GET/POST /api/writing-translation/templates`
- `GET/PATCH /api/writing-translation/templates/:id`
- `POST /api/writing-translation/templates/:id/precheck`
- `POST /api/writing-translation/templates/:id/submit-review`
- `POST /api/writing-translation/templates/:id/copy`
- `GET /api/writing-translation/templates/:id/versions`
- `GET /api/writing-translation/templates/:id/references`
- `PATCH /api/writing-translation/topics/:id/template-references`
- `POST /api/writing-translation/mock-corrections`

## 已知限制

- Mock 数据位于开发服务器内存，重启后恢复种子状态。
- 当前只生成固定样例的 Mock 批改记录，不代表真实评分质量。
- 历史题目继续兼容内嵌评分规则；绑定模板后的题目会明确展示固定模板版本。
