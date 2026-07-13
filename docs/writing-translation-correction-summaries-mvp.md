# 写译批改批改记录摘要 MVP

## 目标

- 新增 `/writing-translation/correction-summaries` 二级页面，用于查看 Mock 批改结果、评分分布、常见问题和异常归因。
- 运营人员可从批改记录定位题目、评分模板、反馈模板和 AI 策略版本，并按归因创建修正草稿。
- 当前阶段只使用 Mock 数据和脱敏摘要，不接真实后端、真实 AI 或真实用户答案。

## 核心流程

1. 在批改记录摘要列表按题型、考试、分数段、状态、问题标签和修正状态筛选 Mock 记录。
2. 查看详情抽屉，核对脱敏答案摘要、维度得分、反馈片段、题目版本、模板版本和 AI 策略版本。
3. 选择归因对象：题目、评分规则、反馈模板或 AI 策略。
4. 创建对应修正草稿：
   - 题目：复制原题目为草稿，跳转写作/翻译题目编辑页。
   - 评分规则：复制评分模板为草稿。
   - 反馈模板：复制反馈模板为草稿。
   - AI 策略：复制 AI 策略为草稿，跳转 AI 策略编辑页。
5. 草稿后续继续复用既有预校验、审核发布和审计链路。

## Mock 接口

- `GET /api/writing-translation/correction-summaries`
- `GET /api/writing-translation/correction-summaries/stats`
- `GET /api/writing-translation/correction-summaries/:id`
- `POST /api/writing-translation/correction-summaries/:id/fix-drafts`

## 权限与数据边界

- 读权限沿用 `writingTranslation.read`。
- 教研审核和超级管理员可创建题目、评分规则修正草稿。
- AI 策略运营和超级管理员可创建反馈模板、AI 策略修正草稿。
- 客服、数据分析和只读审计保持只读，页面不暴露用户完整原文。

## 验证

- 相关单测覆盖路由、菜单、摘要统计、脱敏边界、修正草稿和权限边界。
- 完整验证以本模块实施日志为准。
