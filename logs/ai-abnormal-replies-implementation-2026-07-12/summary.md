# AI 陪练异常回复实施记录

## 范围

- 新增 `/ai-coach/abnormal-replies` 异常回复列表页。
- 新增 `/ai-coach/abnormal-replies/:id` 异常回复详情工作台。
- 新增 Mock 异常回复 Store 与 API，覆盖接手、受控证据访问、归因、修复草稿、Mock 复检、正常关闭和无策略变更关闭。
- 保持 Mock，不接真实后端、不接真实 AI、不展示完整用户会话。

## 验证记录

- `npm run test -- aiAbnormalReplyStore routes.test access.test`：通过，3 个测试文件、18 条用例。
- `npm run tsc`：通过。
- `npm run test`：通过，18 个测试文件、98 条用例。
- `npm run lint`：通过，Biome 扫描 346 个文件无问题，TypeScript 通过。
- `npx antd lint ./src`：通过，扫描 311 个文件无问题。
- `npm run build`：通过，生成 `dist/`，68 个资源文件。
- 构建前若 `npm start` 仍运行，会因 `.turbopack/lock` 被 dev server 占用失败；本轮停止 `PORT=8030 npm start` 后复跑构建通过。

## API Smoke

- AI 策略运营登录后可访问异常列表和详情。
- `POST /api/ai-coach/abnormal-replies/abnormal-ai-001/start` 可将待处理异常接手为处理中。
- `POST /api/ai-coach/abnormal-replies/abnormal-ai-001/access-evidence` 需要访问原因并返回脱敏证据。
- 只读审计直连 `GET /api/ai-coach/abnormal-replies` 返回 `403`。

## 浏览器验收

- 预览地址：`http://localhost:8030/ai-coach/abnormal-replies`
- AI 策略运营可见 `AI 陪练 / 异常回复` 菜单。
- 列表页可显示状态 Tab、筛选项、异常表格和详情入口。
- 详情页可显示处理步骤、归因表单、受控证据、Mock 复检和操作记录。
- 浏览器 console 无 error/warn。

## 已知边界

- 本阶段不建设会话抽检页和手动创建异常入口。
- Mock 复检仍为本地静态样例校验，不调用真实 AI。
- 真实后端需替换内存 Store、敏感证据存储、审计写入和乐观锁实现。
