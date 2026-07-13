# AI 附件策略实施记录

## 范围

- 策略配置页内附件策略 Tab。
- 附件规则预校验、审核发布复用、Mock 会话和抽检/异常队列联动。
- 不新增侧栏入口，不接真实附件或识别服务。

## 实施问题

- `new-module-worktree.sh` 内部无参数 `git pull --ff-only` 返回 `Cannot fast-forward to multiple branches`；显式执行 `git pull --ff-only origin main` 后手动创建同规范工作树。
- 跨工作树复用 `node_modules` 符号链接导致 TypeScript 6 报类型路径不可移植；改为在当前工作树执行 `npm ci`。
- `npm run build` 首次被当前工作树 dev server 占用 `.turbopack/lock` 阻塞；停止 dev server 后构建通过，构建后重新启动服务用于人工试用。

## 验证

- `npm run tsc`：通过。
- `npm run test`：通过，22 个测试文件、118 条测试。
- `npm run lint`：通过，Biome 检查 358 个文件无问题，附带 TypeScript 检查通过。
- `npx antd lint ./src`：通过，扫描 323 个文件无问题。
- `npm run build`：通过，输出 `dist/`，73 个资源文件。
- `git diff --check`：通过，无输出。
- in-app browser：在 `http://127.0.0.1:8013/ai-coach/prompts?configType=attachment_policy` 验证 `附件策略` 作为页内 Tab 展示，未新增侧栏入口；详情页可查看附件规则；成功 Mock 只生成会话抽检记录；失败 Mock 同时生成抽检记录和异常回复记录，并带可跳转目标 `href`；1024 宽度下列表和异常详情无根级横向溢出；修复后页面未新增 console error/warn。
