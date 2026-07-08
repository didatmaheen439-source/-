# 运营数据总览实施日志

日期：2026-07-08

## 目标

完成第六阶段 `/analytics/overview`：把用户、学习路径、题库内容、审核发布、客服反馈等已实现 mock 业务链路汇总为运营数据看板，并保留 AI、写译、模考占位指标。

## 实际修改

- 新增 `/analytics/overview` 真实页面，替换原占位页。
- 新增运营数据 mock 聚合层，按当前登录角色返回可见分区。
- 新增 `GET /api/analytics/overview` 和 `GET /api/analytics/overview/export`。
- 新增 `analyticsOverview` 和 `exportAnalyticsOverview` 服务函数。
- 新增运营数据相关 API 类型。
- 扩展审计对象类型，允许运营数据访问和导出权限拒绝写入审计日志。
- 调整 RBAC：内容运营可看题库与审核发布数据；只读审计可看审核发布与审计摘要。
- 新增指标口径和 MVP 说明文档。

## 已执行命令

```bash
git rev-parse --show-toplevel
git branch --show-current
git status --short
npm run tsc
```

## 当前命令结果

- `git rev-parse --show-toplevel`：`/Users/inn/Desktop/Workspace/projects/project-004-过级搭子后台管理系统`
- `git branch --show-current`：`main`
- `git status --short`：第六阶段文件存在未提交改动。
- `npm run tsc`：通过。
- `git diff --check`：通过。
- `npm run lint`：通过，Biome 检查 303 个文件，无 warning；同时执行 `tsc --noEmit` 通过。
- `npm run build`：通过，输出目录 `admin-web/dist`，构建生成 `/analytics/overview/index.html`。
- `npm run start`：通过，主服务运行在 `http://localhost:8000`；最终重启仍出现既有 `127.0.0.1:8001 ECONNREFUSED` 非阻断输出。
- 启动后 API smoke：`data_analyst` 登录成功，`GET /api/analytics/overview` 返回 200、9 个可见分区、8 张核心指标卡。

## 待补充验证

- 最终提交前重新执行 `git status --short` 和 `git log --oneline -5`。

## API 验证结果

- `super_admin`：可见用户、学习路径、题库内容、审核发布、客服反馈、AI 陪练、写译、模考、审计分区；导出预览 200。
- `data_analyst`：可见全部分区；导出预览 200。
- `customer_support`：可见用户和客服反馈分区；导出预览 403。
- `content_operator`：可见题库内容和审核发布分区；导出预览 403。
- `teaching_reviewer`：可见用户、学习路径、题库内容、审核发布和写译占位分区；导出预览 403。
- `ai_operator`：可见用户、审核发布、AI 陪练占位和写译占位分区；导出预览 403。
- `read_only_auditor`：可见审核发布和审计分区；导出预览 403。
- 时间范围、考试类型、统计粒度和模块范围筛选均返回 200；`module=content` 只返回内容分区。
- 业务数据同步：客服将 `app-user-019-feedback-2` 从 `pending` 更新为 `processing` 后，运营数据反馈聚合从 `pending=6, processing=8` 变为 `pending=5, processing=9`。
- 非法时间范围返回 400。
- `simulateFailure=true` 返回 500。
- `simulateSectionError=content` 返回 200，并返回 `sectionErrors`，其他分区继续可用。
- `simulateEmpty=true` 返回 200，包含数据质量提示，响应中未出现 `NaN` 或 `Infinity`。
- 导出预览字段未包含手机号、邮箱、反馈原文、AI 会话、密码或 token 等敏感字段名。

## 浏览器验证结果

- `data_analyst` 打开 `/analytics/overview` 正常，标题为 `数据总览 - 过级搭子运营管理后台`。
- 页面渲染 8 个图表 canvas，展示用户增长、学习路径、题库内容、审核发布、客服反馈和三个占位业务分区。
- `data_analyst` 可见 `生成导出预览` 按钮。
- 控制台无新增 error 或 warn。
- 页面文本无 `NaN`、`Infinity` 或重复百分号。
- 1280x900 viewport：正文无横向溢出。
- 390x844 viewport：修复数据来源表格横向撑宽后，正文无横向溢出。
- `customer_support` 打开同页无 403，主内容仅展示用户和客服反馈相关内容，不显示导出按钮。

## 验收中发现的问题

- API 权限验收首次发现 `teaching_reviewer` 仍继承历史 `analytics.export`，返回 200，不符合第六阶段只有 `super_admin` 和 `data_analyst` 可导出的目标。
- 处理方式：将 `teaching_reviewer` 和 `ai_operator` 的 `analytics` 动作收紧为只读，导出预览仅保留给 `super_admin` 与 `data_analyst`。
- 浏览器验收发现比例指标显示为 `76.7%%`，原因是 mock `displayValue` 和页面 `suffix` 同时携带百分号；已改为 `displayValue` 只返回数字字符串，由页面统一渲染 `%`。
- 响应式验收发现 390px 下数据来源表格把正文撑宽；已为该表增加固定列宽、单行省略和 `scroll.x`。

## 已知风险

- AI 陪练、写译批改、模考仍为占位指标，不能作为真实运营决策数据。
- Mock 聚合保存在前端 dev server 内存中，重启后恢复初始数据。
- 导出预览不生成真实文件，后续接后端时需要服务端权限校验和审计。
- 当前未创建独立 `feat/analytics-overview-mvp` 分支，沿用现有 `main` 阶段提交链，便于保持与前五阶段提交顺序一致。
