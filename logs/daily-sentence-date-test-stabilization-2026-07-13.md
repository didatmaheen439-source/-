# 每日一句日期测试稳定性修复记录

## 背景

- 反馈工作队列 PR #8 合并到 `main` 后，在本地主干执行完整验证时，`admin-web/src/foundation/dailySentenceStore.test.ts` 出现 1 个失败用例。
- 失败用例：`blocks immediate publication of a future content date`。

## 原因

- 测试固定使用 `daily-sentence-20260713` 作为未来日期内容。
- 当前上海日期已为 2026-07-13，该 fixture 不再满足“未来日期”条件，导致断言从阻止发布变为允许发布。

## 修复

- 将测试中的“未来日期”改为按 `Asia/Shanghai` 动态计算明天。
- 测试执行时临时修改 mock fixture 的 `contentDate`，并在 `finally` 中恢复，避免污染其它用例。
- 未修改每日一句发布业务逻辑。

## 验证

- `npm run test -- dailySentenceStore.test.ts`：1 file / 7 tests passed。
- `npm run test`：20 files / 107 tests passed。
- `npm run tsc`：通过。
- `npm run lint`：通过。
- `npx antd lint ./src`：通过，320 files no issues found。
- `npm run build`：通过，输出 `dist/`，72 files。
