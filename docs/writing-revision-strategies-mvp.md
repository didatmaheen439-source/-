# 写译二次修改策略 MVP

日期：2026-07-13

## 目标与范围

新增 `/writing-translation/revision-strategies`，管理写译批改后的二次修改触发策略。继续使用 Mock，不接真实批改模型，不保存真实学生原文。

## 主流程

`配置触发条件 -> 绑定评分和反馈模板发布版本 -> 配置二改要求和提示方式 -> 预校验 -> 审核发布 -> Mock 学生提交触发二改 -> Mock 二次提交或跳过 -> 汇总二改率与常见问题`

## 页面结构

- `策略列表`：策略筛选、查看、新建、编辑、预校验、提交审核、复制版本、Mock 触发。
- `Mock 触发记录`：展示策略、题目、得分、触发状态、二改状态和问题标签。
- `效果汇总`：展示提交数、触发数、二改数、二改率、完成率和常见问题。

## 关键规则

- 策略必须绑定已发布评分模板和反馈模板版本。
- 策略适用题型、考试类型必须被两个模板同时覆盖。
- 至少配置一种触发条件：总分阈值、维度阈值、问题标签或反馈区块。
- 发布后不能直接覆盖修改，只能复制新版本。
- Mock 记录固定题目、评分模板、反馈模板和二改策略版本快照。
- Mock 记录只保存脱敏摘要和标签，不保存真实学生原文。

## 权限

| 角色 | 权限 |
| --- | --- |
| 超级管理员 | 读写、提交、审核发布 |
| 教研审核 | 读写、提交、审核发布 |
| AI 策略运营 | 读写、提交 |
| 数据分析 | 只读 |
| 只读审计 | 只读 |
| 内容运营 | 页面可读，策略写操作由 API 拒绝 |

## Mock API

- `GET/POST /api/writing-translation/revision-strategies`
- `GET/PATCH /api/writing-translation/revision-strategies/:id`
- `POST /api/writing-translation/revision-strategies/:id/precheck`
- `POST /api/writing-translation/revision-strategies/:id/submit-review`
- `POST /api/writing-translation/revision-strategies/:id/copy`
- `GET /api/writing-translation/revision-strategies/:id/mock-records`
- `GET /api/writing-translation/mock-revision-records`
- `POST /api/writing-translation/mock-revision-submissions`
- `GET /api/writing-translation/revision-effects`

## 已知限制

- Mock 学生提交使用固定样例生成，不代表真实批改质量。
- 效果汇总来自内存 Mock，重启 dev server 后恢复种子状态。
- 真实后端接入时需要持久化二改任务、策略发布快照、触发条件快照和学生二改状态。
