# 模考试卷配置 MVP

日期：2026-07-09

## 页面范围

- 列表：`/mock-exam/papers`
- 新建：`/mock-exam/papers/new`
- 编辑：`/mock-exam/papers/:id/edit`
- 详情：`/mock-exam/papers/:id`
- 页面目标：完成试卷创建、混合编排、预校验、审核发布、版本追踪和聚合统计闭环。

## 数据模型

- `MockExamPaper`：试卷基础信息、状态、版本、数据版本和当前在线版本。
- `MockExamSection`：分区名称、类型、顺序、分值、时长、说明和题目列表。
- `MockExamPaperItemSnapshot`：来源 ID、来源类型、绑定版本、题目内容和答案快照。
- `MockExamPrecheckResult`：`passed`、`warning`、`error` 三级校验结果。
- 版本快照、字段差异、操作记录和聚合统计均由模考共享 Store 维护。

## 标准模板

- CET4：总分 710，总时长 125 分钟。
- CET6：总分 710，总时长 130 分钟。
- 默认分区：写作 15%、听力 35%、阅读 35%、翻译 15%。
- 写作、阅读、翻译分别为 30、40、30 分钟；听力 CET4 为 25 分钟，CET6 为 30 分钟。
- 默认值参考中国教育考试网公布的 CET 笔试结构与分数解释；模板允许调整，偏离标准结构产生 warning。

## 题目引用

- 听力、阅读分区只允许选择同考试类型且已发布的题库客观题。
- 写作、翻译分区只允许选择同考试类型且已发布的写译题目。
- 试卷保存题目来源、绑定版本和内容快照；来源升级不覆盖已锁定快照。
- 来源下架、删除或考试类型不匹配会在下一次提交或发布复验时阻断。
- `mock/contentQuestionStore.ts` 统一维护题库数据和引用查询，保持原题库 API 行为不变。

## 预校验

阻断错误：

- 无分区、空分区、重复顺序或重复题目。
- 引用不存在、已下架或考试类型不匹配。
- 题目分值与分区分值不一致。
- 分区分值与总分不一致。
- 分区时长与总时长不一致。

警告：

- 偏离标准分区或标准题量不足。
- 来源存在新版本但试卷仍锁定旧快照。
- 试卷说明或影响范围缺失。

草稿允许带 error 保存；error 阻止提交审核；warning 需要确认后提交。

## 状态与审核

- 草稿和已驳回试卷可编辑。
- 待审核及之后状态锁定。
- 已发布、已下架和已回滚试卷只能复制为新草稿。
- 提交审核创建 `objectType=mock_exam` 的任务。
- 发布前重新执行完整校验，发布成功后写入在线版本和回滚目标。
- 下架和回滚原因必填；重复发布保持幂等。
- 提交人与审核人按账号 ID 隔离，`teaching_editor` 与 `teaching_reviewer_2` 用于验证同角色不同账号的职责分离。

## 权限

- `super_admin`：全部操作。
- `teaching_reviewer`：查看、新建、编辑、提交，并在审核发布中心审核和发布。
- `data_analyst`：只读查看试卷和聚合统计。
- `read_only_auditor`：只读查看试卷、版本和操作记录。
- `customer_support`：不进入模考管理，仅在用户学习记录中查看试卷 ID、版本和结果摘要。
- `content_operator`、`ai_operator`：菜单不可见，页面和 API 直访返回 403。

## Mock API

- `GET /api/mock-exam/papers`
- `GET /api/mock-exam/papers/:id`
- `POST /api/mock-exam/papers`
- `PATCH /api/mock-exam/papers/:id`
- `POST /api/mock-exam/papers/:id/copy`
- `POST /api/mock-exam/papers/precheck`
- `POST /api/mock-exam/papers/:id/precheck`
- `POST /api/mock-exam/papers/:id/submit-review`
- `GET /api/mock-exam/papers/:id/versions`
- `GET /api/mock-exam/papers/:id/versions/diff`
- `GET /api/mock-exam/references`
- `GET /api/mock-exam/papers/:id/statistics`
- `GET /api/mock-exam/templates/:examType`

保存与提交携带 `dataVersion`；版本冲突返回 409，业务校验失败返回 422，无权限返回 403，模拟服务异常返回 500。

## 聚合统计与联动

- 详情统计包含开始人数、完成人数、完成率、平均分、平均耗时和分区平均得分。
- 统计结果不返回用户 ID、逐题答案、作文原文或翻译原文。
- 工作台接入模考待审核、待发布和预校验阻断摘要。
- 运营数据将模考数据源标记为 `formal=true`。
- 用户学习记录只增加试卷 ID、版本和聚合结果摘要。

## 当前限制

- 数据只保存在开发服务器内存中，重启后重置。
- 不提供学生端作答、倒计时、断点续答、交卷、判分、反作弊或成绩换算。
- 当前发布种子用于验证后台闭环，尚未覆盖完整 CET 官方题型和题量。
- 不接真实后端、真实用户、音频文件或真实阅卷服务。
