# PRD P0 二级菜单拆分验证记录

## 范围

- 按 PRD v1.3 的 P0 左侧菜单要求补齐二级入口。
- 保留已实现业务页面并复用现有聚合页。
- 未完整实现的 P0 入口接入统一只读占位页，不新增真实业务流程。

## 命令验证

- `npm run tsc`：通过。
- `npm run lint`：通过，Biome 检查 317 个文件，`tsc --noEmit` 通过。
- `npm run test`：通过，11 个测试文件、62 个测试用例全部通过。
- `npx antd lint ./src`：通过，扫描 282 个文件。
- `npm run build`：通过，Utoo pack 输出 `dist`，新增 PRD 二级路由均生成静态入口。

## 浏览器验收

- 预览地址：`http://localhost:8000`
- 登录角色：`super_admin`
- 验收结果：
  - `/dashboard/workbench` 可访问，侧边栏显示 `首页工作台`、`审核待办`。
  - `/content/articles` 可访问，页面标题为 `外刊内容`，展示只读占位提示。
  - `/learning-path/task-templates` 可访问，默认打开 `今日任务模板` Tab。
  - `/writing-translation/translation-topics` 可访问，默认打开 `翻译题目` Tab。
  - `/analytics/ai` 可访问，复用运营数据页面并进入 AI 使用入口。
  - `/review-release/versions` 可访问，页面标题为 `发布版本`，展示只读占位提示。
  - `/system/sensitive-access-logs` 可访问，默认打开 `审计日志` Tab，并按敏感访问日志入口过滤。
  - 浏览器控制台未发现阻断性 error。

## 非阻断说明

- Ant Design 侧边栏折叠状态下，浏览器 DOM 只保留当前展开组的可见子项；完整菜单覆盖以路由配置、构建产物和关键路径抽查共同确认。
- 当前只补 P0 菜单结构和只读占位，不实现 P1 菜单，不新增真实业务编辑、发布或导出流程。

## 聚合页拆实补强

### 范围

- 写译批改管理：
  - `/writing-translation/writing-topics` 作为写作题目语义入口，默认只看写作题目。
  - `/writing-translation/translation-topics` 作为翻译题目语义入口，默认只看翻译题目。
  - 新建、详情、编辑、复制草稿继续复用同一套写译列表、表单和详情组件，返回路径按入口回到对应业务对象列表。
  - 兼容路由 `/writing-translation/topics` 保留但不作为主入口。
- 学习路径配置：
  - `/learning-path/diagnosis-rules` 默认诊断规则。
  - `/learning-path/task-templates` 默认今日任务模板。
  - 新建、详情、编辑继续复用学习路径配置组件，取消、保存、返回按配置类型回到对应入口。
- 权限与系统设置：
  - `/system/accounts` 默认后台账号。
  - `/system/roles` 默认角色权限。
  - `/system/operation-logs` 默认操作日志。
  - `/system/sensitive-access-logs` 默认敏感访问日志。
  - 操作日志和敏感访问日志复用同一审计表格，仅默认 `logType` 不同。
- 运营数据：
  - `/analytics/users`、`/analytics/learning-funnel`、`/analytics/content`、`/analytics/questions`、`/analytics/wrong-reasons`、`/analytics/writing-translation`、`/analytics/mock-exam`、`/analytics/ai` 继续复用运营数据总览页。
  - 不拆八套看板，只按入口设置页面标题、说明和默认指标模块。

### 验证补充

- 命令验证：
  - `npm run tsc`：通过。
  - `npm run lint`：通过，Biome 检查 317 个文件，`tsc --noEmit` 通过。
  - `npm run test`：通过，11 个测试文件、62 个测试用例全部通过。
  - `npx antd lint ./src`：通过，扫描 282 个文件。
  - `npm run build`：首次因 8000 上的 Utoo dev server 占用 `.turbopack/lock` 失败；停止 PID 3201 后重跑通过，输出 `dist`。
- 浏览器抽查：
  - `/writing-translation/writing-topics`：标题为 `写作题目`，默认 Tab 为 `写作题目`，新增按钮为 `新增写作题目`。
  - `/writing-translation/translation-topics`：标题为 `翻译题目`，默认 Tab 为 `翻译题目`，新增按钮为 `新增翻译题目`。
  - `/writing-translation/writing-topics/new`：标题和面包屑为 `新增写作题目`，题目类型默认写作题目。
  - `/writing-translation/translation-topics/new`：标题和面包屑为 `新增翻译题目`，题目类型默认翻译题目。
  - `/learning-path/task-templates`：默认 Tab 为 `今日任务模板`。
  - `/system/operation-logs`：默认 Tab 为 `操作日志`。
  - `/system/sensitive-access-logs`：默认 Tab 为 `敏感访问日志`。
  - `/analytics/users`、`/analytics/ai`、`/analytics/questions`：页面标题和默认模块分别进入用户增长、AI 使用、题库表现。
  - 抽查期间未发现 403、404、白屏或阻断性控制台 error。
