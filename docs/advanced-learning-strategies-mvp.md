# 进阶学习策略 Mock MVP

日期：2026-07-13

## 页面范围

- 列表入口：`/learning-path/advanced-strategies`
- 新建策略：`/learning-path/advanced-strategies/new`
- 策略详情：`/learning-path/advanced-strategies/:id`
- 策略编辑：`/learning-path/advanced-strategies/:id/edit`
- 旧语义入口继续保留并重定向到统一入口：
  - `/learning-path/light-task-strategies?tab=light_task`
  - `/learning-path/extra-practice-strategies?tab=extra_practice`
  - `/learning-path/review-recommendation-strategies?tab=review_recommendation`

## 核心闭环

本模块把轻量任务、追加陪练和复练推荐合并为一个二级入口、三个 Tab，覆盖：

1. 配置触发条件、优先级、主引用和替代规则。
2. 执行发布前预校验，阻断无效引用、轻量任务时长异常和非法状态。
3. 提交统一审核发布任务，复用 `learning_path_config` 审核对象。
4. 审核通过后发布；下架或回滚由审核发布中心流转并同步线上版本。
5. 使用 Mock 用户执行策略命中，按优先级选择已发布或已回滚线上版本。
6. 回填 Mock 命中状态并在详情、用户详情、工作台和运营数据中回流效果。

## 已实现能力

- 三类策略同页管理：轻量任务、追加陪练、复练推荐。
- 列表支持类型 Tab、关键词、考试类型、模块、状态筛选、优先级排序、命中数和完成率。
- 详情展示状态、版本、线上版本、回滚目标、触发条件、主引用、替代规则、预校验、Mock 命中记录、版本和操作时间线。
- 编辑页支持基础信息、触发条件组、主引用对象、替代目标和类型专属字段。
- 轻量任务限制 5 到 15 分钟。
- 替代规则要求替代目标存在、可用且不能与主目标相同。
- 同考试、同类型、同模块、同优先级会产生预校验警告。
- 写接口写入操作审计，审核发布同步对象级操作记录。
- `dataVersion` 乐观锁覆盖编辑和提交审核。
- `onlineVersion` 表达当前线上服务版本；回滚后 Mock 命中继续读取回滚版本。

## Mock API

- `GET /api/learning-path/advanced-strategies`
- `GET /api/learning-path/advanced-strategies/:id`
- `POST /api/learning-path/advanced-strategies`
- `PATCH /api/learning-path/advanced-strategies/:id`
- `POST /api/learning-path/advanced-strategies/precheck`
- `POST /api/learning-path/advanced-strategies/:id/precheck`
- `POST /api/learning-path/advanced-strategies/:id/submit-review`
- `POST /api/learning-path/advanced-strategies/:id/copy`
- `GET /api/learning-path/advanced-strategies/:id/effects`
- `GET /api/learning-path/advanced-strategies/:id/versions`
- `GET /api/learning-path/advanced-strategies/references`
- `GET /api/learning-path/advanced-strategies/mock-profiles`
- `POST /api/learning-path/advanced-strategies/mock-runs`
- `PATCH /api/learning-path/advanced-strategies/mock-runs/:id/status`

## 权限规则

- `super_admin`：全量读写、提交审核、复制、Mock 命中和回填。
- `teaching_reviewer`：读写、提交审核、复制、Mock 命中和回填；审核发布中心仍禁止审核自己提交的学习路径任务。
- `ai_operator`：仅对进阶学习策略具备读写和提交能力；不能写旧诊断规则和今日任务模板，不能进入用户列表。
- `content_operator`：只读学习路径，不显示进阶策略写操作，写接口返回 403。
- 其它无学习路径权限角色直访接口返回 403。

## 暂未实现能力

- 不接真实后端、真实 App、真实 AI 或真实规则引擎。
- 不做灰度实验、多版本流量分配、自动派发或复杂推荐算法。
- 不建设独立素材库、任务编排器或外部消息系统。
- Mock 回滚只表达线上版本指针，不恢复完整历史配置快照。
