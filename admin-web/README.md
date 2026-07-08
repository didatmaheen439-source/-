# 过级搭子运营管理后台

本目录基于 `ant-design/ant-design-pro` 初始化，用作「过级搭子 B 端运营管理后台」MVP 的前端基座。

## 上游信息

- 上游仓库：https://github.com/ant-design/ant-design-pro
- 当前克隆分支：`master`
- 当前 Commit：`8f268066d71309c348e1208eca203820e9249eb5`
- 开源许可证：MIT

## 技术栈

- React
- TypeScript
- Ant Design
- Ant Design ProComponents
- Umi Max
- Mock 数据
- Biome / TypeScript / Build 检查

## 当前阶段

- 已完成开源基座克隆、安装、启动、TypeScript、lint、build 和浏览器基础验证。
- 已完成最小项目信息初始化。
- 已完成十个一级模块后台骨架、RBAC 权限矩阵、七类 mock 账号、统一状态组件和公共占位页。
- 已完成 `/system/accounts` 权限与系统设置 MVP，包含账号列表、角色权限矩阵、审计日志和按钮权限验证。
- 已完成 `/review-release/pending` 审核发布中心 MVP，包含任务列表、详情抽屉、状态流转、审计日志和角色权限验证。
- 已完成 `/content/questions` 题库内容 MVP，包含题目列表、详情抽屉、独立新增/编辑页、提交审核、审核发布状态同步和审计日志。
- 已完成 `/users/list` 用户管理 MVP，包含用户列表、独立详情页、学习记录、反馈处理、必要 AI 摘要、敏感访问审计和角色权限验证。
- 已完成 `/analytics/overview` 运营数据总览 MVP，包含用户增长、学习路径漏斗、题库内容、审核发布、客服反馈、占位指标、数据质量提示和 mock 导出预览。
- 已完成 `/dashboard/overview` 运营工作台 MVP，包含欢迎区、今日待办、风险提醒、关键指标、快捷入口、模块摘要、最近处理记录和角色化权限过滤。
- 暂未接入真实后端、真实用户数据或真实 AI。
- 暂未开发完整 PRD 业务页面、题组编排、每日一句、外刊、写译题目和模考题库。

## 常用命令

```bash
npm install
npm start
npm run tsc
npm run lint
npm run build
```

## 重要文档

- `/Users/inn/Desktop/Workspace/projects/project-004-过级搭子后台管理系统/docs/base-project-verification.md`
- `/Users/inn/Desktop/Workspace/projects/project-004-过级搭子后台管理系统/docs/base-adaptation-plan.md`
- `/Users/inn/Desktop/Workspace/projects/project-004-过级搭子后台管理系统/docs/admin-route-menu-plan.md`
- `/Users/inn/Desktop/Workspace/projects/project-004-过级搭子后台管理系统/docs/admin-rbac-design.md`
- `/Users/inn/Desktop/Workspace/projects/project-004-过级搭子后台管理系统/docs/admin-foundation-implementation.md`
- `/Users/inn/Desktop/Workspace/projects/project-004-过级搭子后台管理系统/logs/system-accounts-implementation-2026-07-07.md`
- `/Users/inn/Desktop/Workspace/projects/project-004-过级搭子后台管理系统/logs/review-release-implementation-2026-07-07.md`
- `/Users/inn/Desktop/Workspace/projects/project-004-过级搭子后台管理系统/logs/content-questions-implementation-2026-07-07.md`
- `/Users/inn/Desktop/Workspace/projects/project-004-过级搭子后台管理系统/docs/user-management-mvp.md`
- `/Users/inn/Desktop/Workspace/projects/project-004-过级搭子后台管理系统/logs/user-management-mvp-2026-07-07.md`
- `/Users/inn/Desktop/Workspace/projects/project-004-过级搭子后台管理系统/docs/analytics-overview-mvp.md`
- `/Users/inn/Desktop/Workspace/projects/project-004-过级搭子后台管理系统/logs/analytics-overview-implementation-2026-07-08.md`
- `/Users/inn/Desktop/Workspace/projects/project-004-过级搭子后台管理系统/docs/dashboard-overview-mvp.md`
- `/Users/inn/Desktop/Workspace/projects/project-004-过级搭子后台管理系统/logs/dashboard-overview-implementation-2026-07-08.md`
