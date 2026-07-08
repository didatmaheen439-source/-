# 后台路由与菜单规划

日期：2026-07-07

本文件只定义规划，不一次性创建全部业务页面。

## 一级菜单规划

| 一级模块 | 路由前缀 | 建议 icon | 主要页面 |
| --- | --- | --- | --- |
| 工作台 | `/dashboard` | `dashboard` | 今日待办、审核待办、异常提醒、核心指标、最近发布、风险提示 |
| 用户管理 | `/users` | `user` | 用户列表、用户详情、学习记录、AI 陪练摘要、反馈记录、隐私处理记录 |
| 题库与内容管理 | `/content` | `book` | 题库管理、题组管理、错因标签、每日一句、外刊内容、内容素材 |
| 学习路径配置 | `/learning-path` | `branches` | Onboarding 配置、诊断规则、今日任务模板、轻量任务策略、追加陪练策略、复练推荐策略 |
| AI 陪练管理 | `/ai-coach` | `robot` | 意图分类、Prompt 模板、回答结构、防依赖规则、附件策略、会话抽检、异常回复、策略版本 |
| 写译批改管理 | `/writing-translation` | `edit` | 写作题目、翻译题目、评分维度、反馈模板、二次修改策略、批改记录摘要、批改效果 |
| 模考管理 | `/mock-exam` | `fileDone` | 模考试卷、试卷分区、题目编排、计时配置、参考答案、结果统计、版本记录 |
| 运营数据 | `/analytics` | `barChart` | 用户增长、学习路径漏斗、内容效果、题库表现、错因分布、写译效果、模考表现、AI 使用、留存分析 |
| 审核发布 | `/review-release` | `audit` | 待审核、已通过、已驳回、待发布、已发布、下架记录、回滚记录、发布版本 |
| 权限与系统设置 | `/system` | `setting` | 后台账号、角色权限、权限点、审核流程配置、系统参数、操作日志、敏感数据访问日志、登录与安全记录 |

## 路由映射建议

```text
/dashboard
  /dashboard/todos
  /dashboard/reviews
  /dashboard/alerts
  /dashboard/metrics
  /dashboard/releases
  /dashboard/risks

/users
  /users/list
  /users/:id
  /users/:id/learning-records
  /users/:id/ai-summaries
  /users/feedback
  /users/privacy-logs

/content
  /content/questions
  /content/question-groups
  /content/error-tags
  /content/daily-sentences
  /content/articles
  /content/assets

/learning-path
  /learning-path/onboarding
  /learning-path/diagnosis-rules
  /learning-path/diagnosis-rules/new
  /learning-path/diagnosis-rules/:id
  /learning-path/diagnosis-rules/:id/edit
  /learning-path/task-templates
  /learning-path/task-templates/new
  /learning-path/task-templates/:id
  /learning-path/task-templates/:id/edit
  /learning-path/light-task-strategies
  /learning-path/follow-up-coach-strategies
  /learning-path/repractice-strategies

/ai-coach
  /ai-coach/intents
  /ai-coach/prompts
  /ai-coach/response-structures
  /ai-coach/dependency-rules
  /ai-coach/attachment-policies
  /ai-coach/session-reviews
  /ai-coach/abnormal-replies
  /ai-coach/strategy-versions

/writing-translation
  /writing-translation/writing-topics
  /writing-translation/translation-topics
  /writing-translation/scoring-dimensions
  /writing-translation/feedback-templates
  /writing-translation/revision-strategies
  /writing-translation/correction-summaries
  /writing-translation/effectiveness

/mock-exam
  /mock-exam/papers
  /mock-exam/sections
  /mock-exam/question-arrangement
  /mock-exam/timing
  /mock-exam/answers
  /mock-exam/statistics
  /mock-exam/versions

/analytics
  /analytics/users
  /analytics/learning-funnel
  /analytics/content
  /analytics/questions
  /analytics/error-tags
  /analytics/writing-translation
  /analytics/mock-exams
  /analytics/ai
  /analytics/retention

/review-release
  /review-release/pending-review
  /review-release/approved
  /review-release/rejected
  /review-release/pending-release
  /review-release/published
  /review-release/offline-records
  /review-release/rollback-records
  /review-release/versions

/system
  /system/accounts
  /system/roles
  /system/permission-points
  /system/review-workflows
  /system/parameters
  /system/operation-logs
  /system/sensitive-access-logs
  /system/login-security
```

## 权限规划

- 每个一级菜单先映射模块权限。
- 每个二级页面再映射页面权限。
- 页面内按钮使用动作权限：`R`、`C`、`E`、`S`、`A`、`P`、`D`、`X`、`Config`。
- 数据权限在 mock/API 层返回当前用户可见的数据范围和可执行操作，不能只靠前端隐藏。

## 暂不创建页面的原因

- 当前阶段目标是验证基座和初始化准备。
- 十个模块页面需要统一状态、版本、权限、审计和 mock 模型后再创建，避免先铺空页面再返工。
