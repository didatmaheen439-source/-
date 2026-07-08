# 写译批改管理实施日志

日期：2026-07-08

## Git 信息

- 当前仓库：`/Users/inn/Desktop/Workspace/projects/project-004-过级搭子后台管理系统`
- 当前分支：`codex/ai-coach-strategy-mvp`
- 第八阶段 Commit ID：`7e8dc50 feat(ai-coach): complete strategy governance MVP`
- 第九阶段目标 Commit：`feat(writing-translation): complete topics config MVP`

## 实际执行命令

- `git rev-parse --show-toplevel`
  - 结果：`/Users/inn/Desktop/workspace/projects/project-004-过级搭子后台管理系统`
- `git branch --show-current`
  - 结果：`codex/ai-coach-strategy-mvp`
- `git log --oneline -8`
  - 结果：最近提交包含 `7e8dc50 feat(ai-coach): complete strategy governance MVP`
- `curl -I -s http://localhost:8000/writing-translation/topics`
  - 结果：HTTP 200
- `npm run tsc`
  - 结果：通过
- `git diff --check`
  - 结果：通过，无空白错误
- `npm run lint`
  - 结果：通过，`biome lint` 检查 309 个文件，无修复；随后 `tsc --noEmit` 通过
- 停止 `npm run start`
  - 结果：开发服务已停止，避免 `.turbopack/lock` 构建锁冲突
- `npm run build`
  - 结果：通过，`utoo pack v1.4.17 built in 3707ms`，产物输出到 `admin-web/dist`
- 重新执行 `npm run start`
  - 结果：服务恢复到 `http://localhost:8000`
- `curl -I -s http://localhost:8000/writing-translation/topics`
  - 结果：HTTP 200
- 写译 API smoke（Node fetch 脚本）
  - 结果：通过，输出 `API_SMOKE_DONE`
- Chrome headless 浏览器验证（CDP）
  - 结果：通过，输出 `BROWSER_SMOKE_DONE`

## 新增和修改文件

新增：

- `admin-web/mock/writingTranslation.ts`
- `admin-web/mock/writingTranslationStore.ts`
- `admin-web/src/pages/writing-translation/topics/config.ts`
- `admin-web/src/pages/writing-translation/topics/edit/index.tsx`
- `admin-web/src/pages/writing-translation/topics/detail/index.tsx`
- `docs/writing-translation-topics-mvp.md`
- `docs/review-release-mvp.md`
- `logs/writing-translation-topics-implementation-2026-07-08.md`

修改：

- `admin-web/config/routes.ts`
- `admin-web/mock/aiCoachStore.ts`
- `admin-web/mock/user.ts`
- `admin-web/src/foundation/audit.ts`
- `admin-web/src/foundation/permissions.ts`
- `admin-web/src/locales/zh-CN/menu.ts`
- `admin-web/src/locales/en-US/menu.ts`
- `admin-web/src/pages/dashboard/overview/index.tsx`
- `admin-web/src/pages/writing-translation/topics/index.tsx`
- `admin-web/src/services/ant-design-pro/api.ts`
- `admin-web/src/services/ant-design-pro/typings.d.ts`
- `docs/admin-foundation-implementation.md`
- `docs/admin-rbac-design.md`
- `docs/dashboard-overview-mvp.md`
- `docs/ai-coach-strategy-mvp.md`
- `README.md`
- `admin-web/README.md`
- `/Users/inn/Desktop/Workspace/COMPOUND_AND_PITFALLS_LOG.md`

## Mock Store 和 API 位置

- Store：`admin-web/mock/writingTranslationStore.ts`
- API 路由：`admin-web/mock/writingTranslation.ts`
- 审核发布同步：`admin-web/mock/user.ts`
- AI 策略引用来源：`admin-web/mock/aiCoachStore.ts`
- 服务函数：`admin-web/src/services/ant-design-pro/api.ts`
- 类型：`admin-web/src/services/ant-design-pro/typings.d.ts`

## 权限验证

已验证：

- `super_admin` 可查看、新建、编辑、提交审核、复制、审核发布、下架、回滚。
- `content_operator` 可创建、编辑、提交审核，不可审核。
- `teaching_reviewer` 可审核和发布写译任务。
- `ai_operator` 对写译模块只读，新建接口返回 403。
- `customer_support` 直访写译 API 返回 403。
- `read_only_auditor` 在 RBAC 中具备写译只读权限，无写动作。

## 评分规则验证

API smoke 已覆盖：

- 评分维度少于 2 项识别为 error。
- 权重合计不等于 100 识别为 error。
- 维度最高分合计不等于题目总分识别为 error。
- 分档区间重叠识别为 error。
- 扣分规则超过维度最高分在预校验中支持识别。

## AI 引用验证

已覆盖：

- AI 策略不存在识别为 `AI_REFERENCE_*` error。
- AI 策略版本、状态、业务场景和考试类型会被校验。
- 无 AI 引用返回 warning，提交审核前需要显式确认。
- 高风险题目必须包含防依赖规则。

## 预校验验证

已覆盖：

- error 阻止提交审核。
- warning 首次提交返回 422，确认后可提交。
- 发布前复验会再次检查评分规则和 AI 引用。
- 预校验模拟失败接口保留 500 分支。

## 审核发布验证

已覆盖：

- 提交审核生成 `objectType=writing_translation`。
- 审核任务写入 `objectSubtype=writing|translation`。
- 待审核题目不可直接编辑。
- `content_operator` 不可审核。
- `teaching_reviewer` 可审核、安排发布、发布、下架、回滚。
- 发布幂等。
- 发布后题目状态同步。
- 下架和回滚原因必填。
- 回滚目标版本存在性校验。

## 工作台验证

已覆盖：

- `/dashboard/overview` 模块摘要包含写译数据。
- 写译待审核、待发布、预校验阻断、AI 引用失效加入工作台待办和风险。
- 写译相关操作记录进入最近处理记录的角色过滤范围。

## 浏览器验证

in-app browser 控制通道限制：

- 当前 in-app browser 可打开页面，但通过 Node REPL 调用 `tab.goto()` 时两次超时，超时点在浏览器控制通道，不是页面 HTTP 响应。
- 已改用本机 Chrome headless + CDP 完成页面验证。

Chrome headless 验证结果：

- `/writing-translation/topics`：1280x900、1024x768、390x844 均无白屏、无 403、无顶层横向溢出、console error/warn 为 0。
- `/writing-translation/topics/new?topicType=writing`：1280x900 无白屏、无 403、console error/warn 为 0。
- `/writing-translation/topics/new?topicType=translation`：1280x900 无白屏、无 403、console error/warn 为 0。
- `/writing-translation/topics/writing-topic-cet6-draft/edit`：1280x900 无白屏、无 403、console error/warn 为 0。
- `/writing-translation/topics/writing-topic-cet6-published`：1280x900 无白屏、无 403、console error/warn 为 0。
- `/review-release/pending`：1280x900 无白屏、无 403、console error/warn 为 0。
- `/dashboard/overview`：1280x900 无白屏、无 403、console error/warn 为 0。

## 错误和修复

1. API smoke 首次失败：AI 写作策略种子只覆盖 CET6，导致 CET4 写译题目预校验出现考试类型不兼容。
   - 修复：调整 `ai-prompt-writing-v04` 和 `ai-structure-writing-v10` 的种子，使写译可引用策略覆盖 CET4/CET6。

2. API smoke 首次回滚失败：新发布的写译题目没有可用 `rollbackTargetVersion`。
   - 修复：写译发布同步时设置 `task.rollbackTargetVersion = task.version`，保证发布后可按版本回滚。

3. 浏览器验证首次失败：React Intl 缺少隐藏路由菜单 key。
   - 修复：补充 `menu.ai-coach.prompt-*` 和 `menu.writing-translation.topic-*` 的中英文 locale。

4. 浏览器验证二次失败：AntD v6 deprecated warning。
   - 修复：写译编辑页 `Alert message` 改为 `title`；工作台 `Space direction` 改为 `orientation`，并用普通行布局替换 deprecated `List`。

5. in-app browser 自动化通道超时。
   - 处理：保留限制记录，改用 Chrome headless + CDP 做实际浏览器验收。

## 未执行事项

- 未调用真实作文批改模型。
- 未调用真实翻译评分模型。
- 未保存真实学生答案。
- 未开发人工批改单、申诉、复核、批改效果看板。
- 未开发独立评分维度库。
- 未修改用户端 App。
- 未推送远程仓库。

## 已知风险

- mock 数据存储在 dev server 内存中，重启后恢复初始状态。
- 翻译题目暂时复用 `writing_explanation` AI 策略场景。
- AI 策略下架后不会自动下架已发布题目，只在预校验和发布前复验中阻止新版本发布。
- 静态样例校验只能验证规则配置，不代表真实批改质量。
- 原项目既有 `127.0.0.1:8001 ECONNREFUSED` 仍按非阻断风险处理，只要 8000 页面和 API 可用。
