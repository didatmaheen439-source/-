# 审核发布中心 MVP

日期：2026-07-08

## 页面范围

- 入口：`/review-release/pending`
- 形态：`PageContainer + ProTable + Drawer`
- 目标：统一承接题库、学习路径、AI 策略、写译题目等业务对象的审核、发布、下架和回滚。

## 状态机

统一状态：

`draft -> pending_review -> approved/rejected -> pending_publish -> published -> offline/rolled_back`

业务模块不创建第二套状态机；审核发布中心负责状态流转，业务 store 负责把状态同步回业务对象。

## 已接入对象

| objectType | objectSubtype | 来源模块 | 同步方式 |
| --- | --- | --- | --- |
| `question_bank` | 题型/内容类型 | 题库与内容管理 | `mock/user.ts` 中题库状态同步 |
| `learning_path_config` | `diagnosis_rule` / `today_task_template` | 学习路径配置 | 学习路径 store 回写 |
| `ai_coach_strategy` | `intent` / `prompt_template` / `response_structure` / `dependency_rule` | AI 陪练管理 | AI store 回写 |
| `writing_translation` | `writing` / `translation` | 写译批改管理 | `writingTranslationStore.ts` 回写 |
| `mock_exam` | 试卷考试类型 | 模考管理 | `mockExamStore.ts` 发布前复验并回写 |

## 写译批改接入

第九阶段新增写译任务接入：

- 提交审核创建 `objectType=writing_translation` 任务。
- `objectSubtype` 明确区分 `writing` 和 `translation`。
- 审核任务写入 `submitterId`，用于提交人自审隔离。
- 发布前调用写译预校验，确认审核版本与题目当前版本一致。
- 发布后同步题目状态、`releaseVersionId`、在线版本标记和回滚目标版本。
- 下架、回滚同步题目状态并写入操作记录和审计日志。

## 权限与职责

- `super_admin` 可处理全部审核发布任务。
- `teaching_reviewer` 可审核和发布教研范围任务，包括题库、学习路径和写译题目。
- `ai_operator` 处理 AI 范围任务，不获得写译题目编辑权。
- `content_operator` 可查看、重新提交被驳回内容，不可审核发布。
- `read_only_auditor` 只读查看任务、详情和操作记录。
- `customer_support` 无审核发布菜单权限。

提交人不能审核自己提交的任务；写译、学习路径、AI 策略均保留提交人字段供 mock 和后端阶段复用。

## 审计日志

状态流转会写审计：

- 审核通过
- 驳回
- 安排发布
- 发布
- 下架
- 回滚
- 无权限访问
- 发布前复验失败

写译任务审计只记录对象、版本、状态、维度数量和 AI 引用数量，不记录完整题干、参考译文或真实用户答案。

## 模考试卷接入

- 提交审核创建 `objectType=mock_exam` 的任务，记录试卷版本、分区数、题目数、总分、总时长和影响范围。
- 审核任务保留 `submitterId`，同一账号不能审核自己提交的试卷。
- 审核通过、安排发布和发布沿用统一状态机；发布前调用模考试卷完整预校验。
- 发布成功后同步试卷状态、在线版本和回滚目标；重复发布保持幂等。
- 下架、回滚同步试卷状态并要求填写原因。
- 审计只记录试卷结构摘要，不记录完整题干、答案或解析。

## 已知限制

- 当前审核任务和业务对象都在 dev server 内存中。
- 发布失败、回滚失败是 mock 分支，不代表真实发布平台。
- 真实后端接入后需要服务端强制校验状态机、职责分离、版本一致和数据范围。
