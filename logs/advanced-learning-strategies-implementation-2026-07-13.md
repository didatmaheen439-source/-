# 进阶学习策略实施记录

日期：2026-07-13

## 范围

- 新增 `/learning-path/advanced-strategies` 可见二级入口。
- 新增三个 Tab：轻量任务、追加陪练、复练推荐。
- 新增详情、新建和编辑页。
- 新增 Mock Store、API、类型、权限、审核发布同步、工作台/运营数据/用户详情回流。
- 旧入口 `/learning-path/light-task-strategies`、`/learning-path/extra-practice-strategies`、`/learning-path/review-recommendation-strategies` 保留并重定向。

## 核心变更

- `AdvancedLearningStrategy`：策略主体、触发条件、引用对象、替代规则、线上版本和操作记录。
- `StrategyMatchRun`：Mock 用户命中和完成情况，效果统计从命中记录派生。
- 预校验覆盖名称、触发条件、主引用、替代规则、轻量时长、考试类型和优先级冲突。
- 审核发布复用 `learning_path_config`，通过 `objectSubtype` 区分三类进阶策略。
- 回滚后保留 `onlineVersion`，Mock 命中读取线上版本。
- 写操作和 Mock 命中/回填写入操作审计。

## 验证命令

- `npx max setup`：通过，重新生成 Umi/Max 类型。
- `npm run test -- advancedLearningStrategyStore`：通过，1 文件、5 测试。
- `npm run test`：通过，21 文件、112 测试。
- `npm run tsc`：通过。
- `npm run lint`：通过，Biome 扫描 360 文件无问题，TypeScript 通过。
- `npx antd lint ./src`：通过，扫描 325 文件无问题。
- `npm run build`：通过，输出 `dist/`，75 个资源文件。

## API 与权限验收

- `super_admin` 可访问列表、详情、Mock 命中。
- `ai_operator` 可读取进阶策略列表，可执行进阶策略预校验。
- `ai_operator` 访问 `/api/operation/users` 返回 403。
- `ai_operator` 调用旧 `/api/learning-path/configs/precheck` 返回 403。
- `content_operator` 调用进阶策略预校验返回 403。
- Mock 命中弹窗执行成功，页面展示已命中结果，控制台无 error/warn。

## 浏览器断点验收

dev server：`http://localhost:8004`

| 宽度 | 列表关键内容 | 详情关键内容 | 横向溢出 | 控制台 |
| --- | --- | --- | --- | --- |
| 1440 | 通过 | 通过 | 无 | 无 error/warn |
| 1280 | 通过 | 通过 | 无 | 无 error/warn |
| 1024 | 通过 | 通过 | 无 | 无 error/warn |

## 已知边界

- 本期仍为 Mock，不接真实后端、真实 App 或真实 AI。
- Mock 回滚表达线上版本指针，不恢复完整历史配置快照。
- 不做灰度实验、多版本流量分配、自动派发或复杂推荐算法。
- dev server 保持运行用于本地预览，端口为 `8004`。
