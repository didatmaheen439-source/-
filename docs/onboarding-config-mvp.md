# Onboarding 配置闭环 MVP

日期：2026-07-11

## 目标与范围

- 新增 `/learning-path/onboarding` 可见二级入口和独立编辑页。
- 支持固定五字段配置、预校验、版本复制、审核发布、固定 Mock 用户回归、用户详情和学习路径漏斗回看。
- 固定字段与移动端现有契约一致：考试类型、目标分、考试日期、每日学习时长、最近状态。
- 本阶段只使用后台 Mock 数据，不连接真实 App、真实后端或真实诊断引擎。

## 核心流程

教研复制线上配置为草稿 -> 编辑并预校验 -> 提交审核 -> 另一账号审核 -> 安排发布 -> 发布 -> 固定 Mock 用户完成 Onboarding -> 命中已发布诊断规则和任务模板 -> 用户详情与漏斗回看。

## 页面与权限

- `super_admin`、`teaching_reviewer`：维护、预校验、提交审核和运行 Mock。
- `ai_operator`、`content_operator`：只读 Onboarding 配置。
- `customer_support`：不可进入配置页，可查看用户详情中的版本化匹配摘要。
- `data_analyst`：只查看聚合漏斗，不可查看用户详情。
- 审核发布继续执行提交人与审核人分离。

## 配置契约

- 考试类型：`CET4`、`CET6`。
- 目标分：`425`、`500`、`600`。
- 考试日期：系统生成未来两次 CET 日期，并保留 `default`（暂不确定）。
- 每日学习时长：`5`、`15`、`30` 分钟。
- 最近状态：`steady`、`tired`、`anxious`。
- 固定字段不可新增、删除、停用或调整字段顺序；选项允许改文案、排序和启停。
- 已被用户答案快照引用的选项不可物理删除。

## 预校验

- 固定五字段必须各存在一次，字段类型与顺序必须正确。
- 每个字段至少保留一个启用选项。
- 选项名称不能为空；值必须属于内置契约；值和排序不可重复。
- 停用部分受支持选项返回警告；结构、类型、值或排序错误返回阻断错误。
- 保存和提交携带 `dataVersion`，并发版本不一致返回 409。
- 发布前再次执行结构化预校验，错误配置返回 422 且不改变当前线上版本。

## Mock 求值

- 固定 Mock 用户 ID：`mock-onboarding-user`，支持完成和重置。
- 默认回归输入：`CET4 / 500 / 下一次考试日期 / 30 分钟 / steady`。
- Mock 诊断输入固定包含阅读正确率 60%，仅用于验证规则链路，不代表真实算法。
- 诊断规则和任务模板只读取 `published` 状态，按数值优先级从低到高取第一条匹配。
- 用户答案快照固定记录配置 ID、配置名、版本、完成时间和五项选项文案；发布新版本不会改写既有快照。
- 漏斗直接从用户状态和匹配摘要聚合，完成与重置不写固定展示数字。

## Mock API

- `GET /api/learning-path/onboarding`
- `PATCH /api/learning-path/onboarding/:id`
- `POST /api/learning-path/onboarding/:id/copy`
- `POST /api/learning-path/onboarding/:id/precheck`
- `POST /api/learning-path/onboarding/:id/submit-review`
- `GET /api/learning-path/onboarding/:id/versions`
- `POST /api/learning-path/onboarding/mock-user/complete`
- `POST /api/learning-path/onboarding/mock-user/reset`

## 已知边界

- 不同步配置到移动端 App。
- 不实现任意字段、拖拽表单、灰度发布或真实用户重算。
- Mock 用户重置会清除该固定用户的答案和匹配摘要；普通历史用户数据不受影响。
