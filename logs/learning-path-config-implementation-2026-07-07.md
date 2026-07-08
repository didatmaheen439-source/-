# 学习路径配置实现日志

日期：2026-07-07

## Git 状态

- 当前仓库根目录：`/Users/inn/Desktop/Workspace/projects/project-004-过级搭子后台管理系统`
- 原始实现检查结果：当时 `main` 分支没有任何 commit，`git log` 返回 `fatal: your current branch 'main' does not have any commits yet`。
- 2026-07-08 Git 阶段收尾后已形成三段本地提交：
  - `chore(admin): initialize verified admin MVP baseline`
  - `feat(users): complete user management MVP`
  - `feat(learning-path): complete config MVP`
- 由于仓库在无历史状态下已混合多阶段共享文件，阶段提交按可验收边界拆分：基线承载底座、基础文档和前三阶段，第四阶段承载用户管理页面与验收记录，第五阶段承载学习路径页面、文档、日志和表格修复。
- 本阶段没有推送远程仓库，没有接入真实后端、真实用户或真实 AI。

## 实际修改

- 扩展学习路径配置类型、服务函数和 mock 数据。
- 实现 `/learning-path/diagnosis-rules` 双 Tab 列表。
- 新增诊断规则和今日任务模板的新增、编辑、详情页面。
- 审核发布中心展示学习路径子类型，并支持学习路径状态同步和自审隔离。
- 用户详情增加学习路径匹配摘要。
- 审计日志类型增加 `learning_path_config`、`objectSubtype` 和 `version`。

## 执行命令

```bash
npm run tsc
npm run lint
npm run build
```

第一次 `npm run build` 失败，原因是 `npm run start` 的 dev 进程占用 `.turbopack` 缓存锁：

```text
Unable to acquire utoo pack build persistent cache lock ... Existing process: utoo pack dev
```

处理方式：停止 dev server 后重新执行 `npm run build`。

最终结果：

- `npm run tsc`：通过。
- `npm run lint`：通过，`biome lint` 检查 303 个文件，无修复项。
- `npm run build`：通过，产物目录 `admin-web/dist`，输出 46 个 assets。

## Mock API 验证

使用 `node` + `fetch` 对 `http://localhost:8000` 验证。

已验证：

- `super_admin` 可访问诊断规则列表和今日任务模板列表。
- `super_admin` 可读取用户学习路径匹配摘要。
- `customer_support` 可读取用户学习路径匹配摘要，但访问配置详情返回 403。
- `content_operator` 可读学习路径列表，但新建配置返回 403。
- `data_analyst` 访问学习路径配置返回 403。
- `teaching_editor` 可创建诊断规则草稿。
- warning 级预校验提交审核需要 `confirmWarnings=true`。
- 提交审核后生成 `learning_path_config` 审核任务。
- `teaching_editor` 审核自己提交的任务返回 403。
- `teaching_reviewer_2` 可审核通过、安排发布和发布。
- 重复发布学习路径任务返回 200，状态保持 `published`。
- 发布后配置详情状态同步为 `published`。
- error 级预校验返回 `level=error`。
- 版本冲突更新返回 409。

## 浏览器验证

使用应用内浏览器验证：

- `/learning-path/diagnosis-rules`：诊断规则 Tab、今日任务模板 Tab、表格、新增诊断规则按钮可见。
- `/learning-path/diagnosis-rules/diagnosis-cet4-reading-core`：详情页可见“诊断条件与输出”和“版本记录”，已发布配置显示“复制为草稿”。
- `/learning-path/diagnosis-rules/new`：超级管理员可看到配置表单、预校验、保存草稿、保存并提交审核。
- `/learning-path/task-templates/new`：页面可打开，显示任务项和模板匹配。
- `/review-release/pending`：审核列表可见学习路径配置任务类型。
- `/users/app-user-001`：客服可见学习路径匹配摘要。
- `/learning-path/diagnosis-rules/new` 使用 `read_only_auditor` 访问显示 403。

控制台：

- 清理了本阶段新增页面触发的 AntD deprecated warning。
- 最后一次紧凑浏览器检查未重新在全部页面完整扫描控制台；仍建议后续在长时间浏览器会话中继续观察。

## 表格文字重叠修复

问题页面：`/learning-path/diagnosis-rules`

现象：

- 小宽度侧边栏状态下，诊断规则列表前两列出现文字互相压住。
- 长配置 ID 换行后与名称列内容接近。
- 配置名称与摘要双行展示时，被 ProTable 自动压缩列宽后更容易重叠。

原因：

- `配置 ID` 使用长英文/连字符 ID，默认表格列宽不足时会换行。
- `配置名称` 同时显示标题和摘要，摘要未限制单行省略。
- 表格横向滚动宽度偏小，多个业务列和操作列共同挤压前两列。

修复：

- `配置 ID` 列设置固定宽度，并使用单行省略和 tooltip 展示完整内容。
- `配置名称` 列设置固定宽度，标题和摘要都限制单行省略，摘要保留 tooltip。
- 表格横向滚动宽度从 `1800` 增加到 `2160`，避免核心业务列被过度压缩。

修复后验证：

- `npm run tsc`：通过。
- `npm run lint`：通过。
- `npm run build`：通过。
- 浏览器 DOM 复查：`配置 ID` 列宽约 `230px`，`配置名称` 列宽约 `280px`，首行高度约 `69px`，未再出现文字重叠。

## 第五阶段复核

复核时间：2026-07-08

Git 检查：

- `git rev-parse --show-toplevel`：返回项目 Git 根目录。
- `git branch --show-current`：`main`。
- `git status --short --untracked-files=all`：无输出，工作区干净。
- `git log --oneline -5`：确认三段提交顺序为学习路径、用户管理、基线。

命令验证：

- `git diff --check`：通过，无空白错误。
- `npm run tsc`：通过。
- `npm run lint`：通过，`biome lint` 检查 303 个文件，无修复项，随后 `tsc --noEmit` 通过。
- 停止 8000 dev server 后执行 `npm run build`：通过，产物目录 `admin-web/dist`，输出 46 个 assets。
- 重新执行 `npm run start`：`http://localhost:8000` ready；仍出现已知的 `127.0.0.1:8001 ECONNREFUSED`，不阻断 8000 页面和 mock API。

API 复核：

- `diagnosis_rule` 和 `today_task_template` 两类配置列表均返回数据。
- warning 级预校验可区分，未确认 warning 提交审核返回 400，确认后可生成审核任务。
- error 级预校验可区分，error 配置提交审核返回 400。
- 版本冲突更新返回 409。
- 预校验 `simulateFailure` 返回 500。
- 提交审核生成 `objectType=learning_path_config` 且包含 `objectSubtype=diagnosis_rule`。
- 提交人自审返回 403。
- `teaching_reviewer_2` 可审核通过、安排发布、发布。
- 发布后学习路径配置状态同步为 `published`，重复发布返回 200 且保持 `published`。
- 客服可读取用户学习路径摘要，但访问学习路径配置详情返回 403。
- 数据分析角色访问学习路径配置列表返回 403。

浏览器复核：

- `/learning-path/diagnosis-rules`：诊断规则和今日任务模板两个 Tab 可见，列表可见。
- `/learning-path/diagnosis-rules/new`：可打开新建诊断规则表单。
- `/learning-path/diagnosis-rules/diagnosis-cet4-reading-core`：详情页可打开。
- `/learning-path/diagnosis-rules/diagnosis-cet4-vocab-draft/edit`：草稿编辑页可打开并显示保存操作。
- `/learning-path/task-templates/new`：可打开新建今日任务模板表单。
- `/learning-path/task-templates/template-cet4-reading-daily`：详情页可打开。
- `/learning-path/task-templates/template-cet6-listening-daily/edit`：草稿编辑页可打开并显示保存操作。
- `/review-release/pending`：审核发布列表可打开。
- `/users/app-user-001`：客服账号可看到学习路径摘要。
- `read_only_auditor` 访问 `/learning-path/diagnosis-rules/new` 显示 403。
- `data_analyst` 访问 `/learning-path/diagnosis-rules` 显示 403。
- 浏览器页面 console 日志为空；浏览器控制工具自身出现过一次 Statsig 外部请求超时，不属于本地应用 console。

## 已知风险

- 当前 mock 数据在 dev server 内存中，重启后本次 API 验证创建的数据会丢失。
- error 级配置允许保存草稿，但提交审核会被阻断；这是为了支持运营继续修正草稿。
- 仓库原始状态没有 commit 历史，三段提交是 2026-07-08 基于当前混合改动整理形成；共享文件未做逐 hunk 历史还原。
- 浏览器验证只覆盖关键页面和角色，不等同于完整 E2E 自动化测试。
