# Mock Exam Results Implementation

## Summary

- 新增 `/mock-exam/results` 二级页面，展示 Mock 开始、完成、完成率、均分、平均耗时和风险试卷。
- 结果详情支持分区表现、题目风险、时间配置风险和定位建议。
- 已发布、已下架和已回滚试卷可从结果页复制为修正草稿；草稿和已驳回试卷直接跳转编辑。
- 复用现有模考试卷编辑、预校验、审核发布、版本和审计链路。

## Key Files

- `admin-web/src/pages/mock-exam/results/index.tsx`
- `admin-web/mock/mockExamStore.ts`
- `admin-web/mock/mockExam.ts`
- `admin-web/src/pages/mock-exam/papers/data.ts`
- `docs/mock-exam-results-mvp.md`

## Verification

- `npm run test -- mockExamStore.test.ts routes.test.ts`：通过，2 个测试文件、15 条测试。
- `npm run test`：通过，24 个测试文件、129 条测试。
- `npm run tsc`：通过。
- `npm run lint`：通过，Biome 扫描 366 个文件无问题，TypeScript 通过。
- `npx antd lint ./src`：通过，扫描 331 个文件无问题。
- `npm run build`：通过，输出 `dist/`，78 个资源文件，并生成 `mock-exam/results/index.html`。
- API smoke：`super_admin` 可读结果、可创建修正草稿；`data_analyst` 可读但写接口 403；`ai_operator` 访问结果接口 403。
- 脱敏复验：`GET /api/mock-exam/results/mock-exam-cet6-202607` 不返回 `"answer"` 或 `referenceAnswer` 字段。
- 浏览器自动化未执行：本工作树未安装 Playwright，当前工具未暴露 in-app browser 控制能力。

## Risks

- 本期仍为 Mock 数据，题目风险和时间风险是可重复的派生样例。
- 真实后端接入时需替换为服务端聚合表或分析查询，并保留不返回用户级明细的边界。
