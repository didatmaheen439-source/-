# 外刊内容运营 Mock MVP

## 目标

建立“内容生产、审核发布、Mock 用户消费、效果回流、下架或回滚”的完整任务闭环，同时保持创建、审核和发布职责分离。

## 业务边界

- 内容运营创建、编辑、预校验并提交外刊。
- 教研审核查看文章、素材、来源、版本和影响范围，执行审核、发布、下架或回滚。
- Mock 用户目录只返回有效线上版本，并接收阅读、收藏、取消收藏和完成事件。
- 工作台和运营数据只展示聚合结果，风险规则不会自动改变文章状态。
- 不接真实后端、移动端、对象存储、定时发布或独立素材库。

## 核心模型

- `ArticleItem` 保存编辑状态、数据版本、审核状态和线上版本指针。
- `ArticleVersionSnapshot` 在提交审核时生成不可变内容与素材快照。
- `ArticleUserEvent` 使用 `eventId` 幂等，事件类型为 `view`、`favorite_add`、`favorite_remove`、`complete`。
- `ArticleEffectSummary` 按线上文章版本计算 PV、UV、收藏人数、完成人数、完成率、趋势和风险。

## 状态与版本

```text
draft -> pending_review -> approved -> pending_publish -> published
pending_review -> rejected -> draft
published -> offline
published/offline -> rolled_back
```

- 只有草稿和驳回状态可编辑。
- 已发布文章必须复制为新草稿，原线上版本不变。
- 下架关闭线上可见性但保留历史事件与版本。
- 回滚恢复历史已发布快照为唯一线上版本。

## 指标口径

- 阅读 PV：有效 `view` 事件数。
- 阅读 UV：同版本发生阅读的去重用户数。
- 收藏人数：按收藏和取消收藏事件计算的当前收藏用户数。
- 完成人数：同版本完成文章的去重用户数。
- 完成率：完成人数 / 阅读 UV。
- 阅读 UV 少于 20 时仅显示样本不足；达到 20 且完成率低于 35% 时提示低完成率。

## 关键接口

- `/api/content/articles`：后台列表和创建。
- `/api/content/articles/:id`：详情和编辑。
- `/api/content/articles/:id/precheck`：提交与发布前校验。
- `/api/content/articles/:id/submit-review`：生成快照并提交审核。
- `/api/content/articles/:id/effects`：文章版本效果聚合。
- `/api/mock-app/articles`：Mock 用户线上文章目录。
- `/api/mock-app/articles/:id/events`：Mock 用户行为事件写入。

## 权限与审计

- 内容运营可创建、编辑和提交本人负责的外刊，不可审核、发布、下架或回滚。
- 教研审核可审核和发布外刊，但不能审核自己的提交。
- 超级管理员具备紧急处置能力。
- 创建、编辑、提交、审核、发布、下架、回滚、失败和越权操作均进入现有审计体系。
