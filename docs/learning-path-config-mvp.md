# 学习路径配置 MVP

日期：2026-07-07

## 页面范围

- 列表入口：`/learning-path/diagnosis-rules`
- 诊断规则新增：`/learning-path/diagnosis-rules/new`
- 诊断规则详情：`/learning-path/diagnosis-rules/:id`
- 诊断规则编辑：`/learning-path/diagnosis-rules/:id/edit`
- 今日任务模板新增：`/learning-path/task-templates/new`
- 今日任务模板详情：`/learning-path/task-templates/:id`
- 今日任务模板编辑：`/learning-path/task-templates/:id/edit`

`/learning-path/diagnosis-rules` 使用 Tabs 承载“诊断规则”和“今日任务模板”两张表。复杂新增和编辑使用独立页面，不使用抽屉表单。

轻量任务、追加陪练和复练推荐已在 2026-07-13 作为进阶策略统一入口实现，详见 `docs/advanced-learning-strategies-mvp.md`。

## 已实现能力

- 诊断规则和今日任务模板列表、筛选、分页、状态标签和更新时间倒序。
- 诊断规则字段覆盖适用用户条件、判定条件、引用题目/题组和输出结果。
- 今日任务模板字段覆盖适用用户条件、命中薄弱模块、任务项、预计分钟和是否可替换。
- 详情页展示基础信息、规则/模板主体、引用对象、预校验结果、版本记录和操作记录。
- 草稿和已驳回状态允许编辑；已发布、待发布、已下架、已回滚需要复制为新草稿。
- 保存草稿、保存后提交审核、预校验、409 数据版本冲突和 500 预校验模拟失败。
- 提交审核后创建 `objectType=learning_path_config` 的审核任务，并带 `objectSubtype=diagnosis_rule` 或 `today_task_template`。
- 审核发布中心状态流转后同步学习路径配置状态。
- 发布动作对学习路径配置支持幂等处理。
- 用户详情展示只读学习路径匹配摘要；客服能看摘要但不能跳转配置详情，超级管理员可跳转。

## Mock API

- `GET /api/learning-path/configs`
- `GET /api/learning-path/configs/:id`
- `POST /api/learning-path/configs`
- `PATCH /api/learning-path/configs/:id`
- `POST /api/learning-path/configs/:id/copy`
- `POST /api/learning-path/configs/precheck`
- `POST /api/learning-path/configs/:id/precheck`
- `POST /api/learning-path/configs/:id/submit-review`
- `GET /api/learning-path/configs/:id/versions`
- `GET /api/learning-path/references/questions`
- `GET /api/learning-path/references/question-groups`
- `GET /api/operation/users/:id/learning-path-match`

## 权限规则

- `super_admin`：可读、可新建、可编辑、可提交、可复制草稿、可从用户详情跳转配置详情。
- `teaching_reviewer`：可读、可新建、可编辑、可提交；审核发布中心中不可审核自己提交的学习路径任务。
- `content_operator`：可读学习路径列表和详情，不显示新建、编辑、提交按钮。
- `customer_support`：不可进入学习路径配置页；只能在用户详情查看学习路径匹配摘要。
- `data_analyst`：无学习路径配置访问权限，直访返回 403。
- `read_only_auditor`：按当前 RBAC 无学习路径配置写入权限，直访新增页返回 403。

## 预校验

预校验等级：

- `passed`：可保存并可提交。
- `warning`：可保存；提交审核需要显式确认。
- `error`：可保存草稿用于继续修正；提交审核被阻断。

当前校验覆盖：

- 配置名称、考试类型、优先级。
- 同考试同类型优先级冲突。
- 诊断判定条件为空、区间反向、正确率范围错误。
- 诊断输出缺失。
- 引用题目或题组不存在、不可用、考试类型不一致。
- 今日任务模板任务项为空、顺序重复、预计分钟无效、重复绑定、内容不存在、总时长过长。

## 审核职责分离

学习路径审核任务写入 `submitterId` 和 `reviewerId`。当 `objectType=learning_path_config` 且下一状态为 `approved` 或 `rejected` 时，提交账号不能审核自己的任务。

为验证该规则，mock 增加两个教研账号：

- `teaching_editor`
- `teaching_reviewer_2`

两个账号均映射到 `teaching_reviewer` 角色，但账号 ID 不同。

## 暂未实现能力

- 不做真实规则引擎。
- 不接真实用户 App。
- 不做拖拽式规则编排。
- 不接真实后端。
- 不接真实 AI。
- 不实现复杂推荐算法。
- 不做学习路径线上灰度、实验配置或多版本流量分配。
