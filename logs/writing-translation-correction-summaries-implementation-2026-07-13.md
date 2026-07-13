# 写译批改批改记录摘要实施记录

## 变更范围

- 新增 `/writing-translation/correction-summaries` 二级页面。
- 扩展 Mock 批改记录结构，增加脱敏答案摘要、维度得分、问题标签、版本快照、修正状态和关联草稿。
- 新增批改记录摘要列表、详情、统计和修正草稿 Mock API。
- 评分与反馈模板页的 Mock 使用记录可跳转到批改记录摘要详情。
- 更新路由、菜单文案、服务 API 类型、项目 README、MEMORY 和模块文档。

## 数据与权限

- 当前仍为 Mock 数据，不接真实后端、真实 AI 或真实用户答案。
- 页面展示脱敏答案摘要和聚合问题，不展示用户完整原文。
- 教研/超级管理员可创建题目和评分规则修正草稿。
- AI 策略运营/超级管理员可创建反馈模板和 AI 策略修正草稿。
- 客服、数据分析和只读审计保持只读。

## 验证记录

- `npm run test -- writingTranslationTemplateStore.test.ts routes.test.ts`：通过，2 个测试文件、15 条测试。
- `npm run tsc`：通过。
- `npm run lint`：通过，Biome 扫描 364 个文件无问题，TypeScript 通过。
- `npx antd lint ./src`：通过，扫描 329 个文件无问题。
- `npm run test`：通过，23 个测试文件、126 条测试。
- `npm run build`：通过，输出 `dist/`，77 个资源文件，包含 `writing-translation/correction-summaries/index.html`。
- Chrome + Playwright 烟测：`http://localhost:8023/writing-translation/correction-summaries` 可渲染；列表、统计、版本定位、`?record=mock-correction-translation-cet6-003` 详情抽屉通过；页面控制台 0 error；未出现“用户完整作答”文本。

## 返工记录

- 初次验证失败：当前 worktree 缺少 `node_modules`，`vitest` 和 `tsc` 找不到命令；执行 `npm ci` 后恢复。
- 初次单测失败：测试先生成普通 Mock 记录，导致异常预置数据未注入；改为按固定 seed ID 判断是否已注入。
- 初次类型检查失败：AntD v6 `Divider` 类型不接受旧方向值；移除方向属性。
- 初次 AntD 检查出现 `Alert message` deprecated；改为 `title`。
- 初次 Biome 检查出现非空断言；改为提前保存 `draftPath`。
- 最终生产构建首次被同工作树 dev server 占用 `.turbopack/lock` 阻塞；停止 `PORT=8023 npm start` 后复跑 `npm run build` 通过。

## 剩余风险

- 页面仍为内存 Mock，刷新 dev server 会重置运行时创建的修正草稿。
- 真实后端阶段需要补持久化表、对象级权限、审计、幂等键和脱敏策略。
- 本轮未做多角色浏览器逐项验收，角色边界由单测和 Store 权限逻辑覆盖。
