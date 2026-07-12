# 反馈工作队列实现记录

日期：2026-07-12

## 范围

- 新增 `/users/feedback` 反馈工作队列列表页。
- 新增 `/users/feedback/:feedbackId` 详情页。
- 新增反馈队列 Mock API：列表、详情、分派/转派、处理结果、状态操作。
- 接入独立反馈队列权限：业务负责人只访问分派给自己的反馈，不获得用户列表和用户详情权限。
- 接入工作台反馈待办：待分诊、超时处理中、待客服确认、分派给我。
- 更新 PRD、接口契约、数据模型、状态权限基线和模块说明。

## 验证命令

| 命令 | 结果 |
| --- | --- |
| `npm ci` | 通过；worktree 下 Husky `.git can't be found` 为既有非阻断提示 |
| `npm run test -- feedbackQueue.test.ts access.test.ts routes.test.ts` | 通过，3 files / 17 tests |
| `npm run test` | 通过，18 files / 97 tests |
| `npm run tsc` | 通过 |
| `npm run lint` | 通过，Biome 检查 347 files，无问题 |
| `npx antd lint ./src` | 通过，扫描 312 files，无问题 |
| `npm run build` | 通过，输出 `dist/`，68 files |

## API Smoke

本地服务：`http://localhost:8004`

覆盖结果：

- 客服登录后读取 `GET /api/operation/feedback-queue?view=triage` 成功。
- 客服读取详情成功，具备分派权限。
- 客服分派给 `ai_operator` 后状态变为 `processing`。
- `content_operator` 访问该 AI 任务返回 `403`。
- `ai_operator` 在“待我处理”中看到该任务，并提交处理结果，状态变为 `resolved`。
- 客服确认关闭，状态变为 `closed`。
- 使用旧版本再次写状态返回 `409`。
- `data_analyst` 访问反馈队列返回 `403`。

样例对象：`app-user-014-feedback-2`。

## 浏览器验收

本地服务：`http://localhost:8004`

- 客服 `/users/feedback`：菜单显示“反馈工作队列”，列表有待分诊数据，控制台无 error/warn。
- 客服 `/users/feedback/app-user-029-feedback-2`：状态摘要、反馈摘要、脱敏用户上下文、敏感访问、分派、时间线可渲染。
- 敏感访问弹窗：1024 宽度下弹窗宽 520px，未超出 viewport，原因输入可见。
- AI 负责人 `/users/feedback`：菜单不显示“用户列表”，可进入反馈工作队列。
- AI 负责人直访 `/users/list`：返回 403，无用户表格。
- 断点检查：1440、1280、1024 宽度下队列列表、详情页均无文档级横向溢出。

## 已处理返工

- `npx antd info <Component>` 当前返回 `could not determine executable to run`，本轮以现有页面实现模式和 `npx antd lint ./src` 兜底。
- 首轮浏览器断点检查在 reload 后没有重新登录，数据不可用；后续每个断点重新登录并复验 `window.innerWidth`。
- 详情页首轮存在 `Timeline items.children` deprecated 和条件渲染 Form `useForm` 未连接警告；已改为 `items.content`，并将分派、处理结果表单拆为仅在需要时挂载的子组件。

## 未接入范围

- 不接真实后端、消息系统、自动派单或外部工单。
- 不支持多人并行子任务、主管审批式敏感访问或已关闭反馈重新打开。
