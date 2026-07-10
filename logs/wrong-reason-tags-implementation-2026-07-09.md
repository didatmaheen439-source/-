# 错因标签页面实现验证记录

## 范围

- 将 `/content/wrong-reason-tags` 从 PRD 占位页替换为真实错因标签字典 CRUD 页面。
- 新增隐藏路由：
  - `/content/wrong-reason-tags/new`
  - `/content/wrong-reason-tags/:id/edit`
  - `/content/wrong-reason-tags/:id`
- 新增 mock API：
  - `GET /api/content/wrong-reason-tags`
  - `GET /api/content/wrong-reason-tags/:id`
  - `POST /api/content/wrong-reason-tags`
  - `PATCH /api/content/wrong-reason-tags/:id`
  - `POST /api/content/wrong-reason-tags/:id/submit-review`
- 新增审核对象类型 `wrong_reason_tag`，归属 `题库与内容管理`，复用现有审核发布状态机、内容权限和审计日志。

## 命令验证

- `npm run test -- wrongReasonTagStore`：通过，1 个测试文件、3 个用例。
- `npm run tsc`：通过。
- `npm run test`：通过，12 个测试文件、65 个用例。
- `npm run lint`：通过，Biome 检查 322 个文件，`tsc --noEmit` 通过。
- `npx antd lint ./src`：通过，扫描 287 个文件。
- `npm run build`：通过，Utoo pack 输出 `dist`，生成错因标签列表、新建、编辑、详情静态入口。

## API Smoke

- `super_admin` 登录后：
  - 错因标签列表返回 `success: true`，包含 5 条种子数据。
  - 详情 `/api/content/wrong-reason-tags/wrong-reason-keyword-missed` 返回草稿标签。
  - 空标签名创建返回 `400`，错误信息为 `标签名是必填项。`
  - 新建唯一错因标签成功，状态为 `draft`。
  - 提交审核成功，标签状态变为 `pending_review`，生成 `wrong_reason_tag` 审核任务。
  - 发布 `review-wrong-reason-001` 成功，标签 `wrong-reason-low-review-frequency` 状态回写为 `published`。
- `customer_support` 登录后访问错因标签列表返回 `403`，错误信息为 `无权查看错因标签。`

## 浏览器验收

- 本轮尝试连接 in-app browser 时，`agent.browsers.get(...)` 连续超时；可用浏览器发现列表能返回，但 in-app browser 选择阶段不可用。
- 已用构建产物、API smoke 和命令验证覆盖主要功能闭环。
- 待浏览器控制层恢复后建议补查：
  - `/content/wrong-reason-tags` 页面不白屏、不 404、表格无重叠。
  - `/content/wrong-reason-tags/new` 默认表单可保存草稿和提交审核。
  - `/content/wrong-reason-tags/:id` 展示标签内容、版本记录和操作记录。
  - 审核发布中心对象类型筛选包含 `错因标签`。

## 非阻断说明

- 本阶段没有改题库编辑页，不强制让题目立即引用错因标签。
- 引用次数仍来自 mock 静态/聚合数据，真实后端接入时需要由引用关系表或聚合任务生成。
- 权限继续复用 `content` 一级动作，不新增细粒度 `wrongReasonTag.*` 权限。
