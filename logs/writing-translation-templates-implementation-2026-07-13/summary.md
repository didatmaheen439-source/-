# 写译评分与反馈模板实施记录

日期：2026-07-13

## 实施范围

- 单一二级入口与评分维度、反馈模板两个 Tab。
- 独立模板 Store、Mock API、版本、预校验和统一审核发布接线。
- 题目发布版本引用、服务端评分/反馈快照和 Mock 批改版本追溯。
- 教研与 AI 策略运营的类型级权限隔离。

## 验证

- 浏览器验证：本地 dev server `http://localhost:8002/writing-translation/scoring-feedback-templates?tab=feedback`；超级管理员可见单一二级入口、评分维度/反馈模板 Tab、反馈模板列表、绑定题目、新建反馈模板、查看/预校验/复制版本/提交审核操作；发布版反馈模板详情显示 `写作讲解回答结构 V1.0 / V1.0`，无浏览器 `warn`/`error`。
- API 权限烟测：`ai_operator` 读取模板 200、创建评分模板 403、创建反馈模板 200；`teaching_reviewer` 读取模板 200、创建反馈模板 403、创建评分模板 200；`content_operator` 读取模板 200、创建反馈模板 403。
- `npm run tsc`：通过。
- `npm run test`：通过，21 个测试文件、114 条测试。
- `npm run lint`：通过，Biome 扫描 357 个文件无问题，`tsc --noEmit` 通过。
- `npx antd lint ./src`：通过，扫描 322 个文件无问题。
- `npm run build`：通过，输出 `dist/`，73 个资源文件。

## 风险

- 仅为内存 Mock，不包含真实后端持久化和真实批改模型。
- Mock 批改记录只验证结构与版本追溯，不验证模型质量。
- 本地 API 烟测在 dev server 内存中生成过临时草稿，重启 dev server 后恢复种子数据。
