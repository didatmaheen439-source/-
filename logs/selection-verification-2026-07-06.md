# 选型验证记录

日期：2026-07-06

## 已执行检查

- 读取 `/Users/inn/Desktop/Workspace/GLOBAL_WORKBENCH.md`。
- 读取 `/Users/inn/Desktop/Workspace/NEW_PROJECT_SOP.md`。
- 读取 `/Users/inn/Desktop/Workspace/COMPOUND_AND_PITFALLS_LOG.md`。
- 读取过级搭子项目记忆 `/Users/inn/Documents/过级搭子/MEMORY.md`。
- 读取后台 PRD `/Users/inn/Desktop/b端后台管理系统/guojidazi_b_admin_prd_mvp.md`。
- 检查现有 Workspace 项目编号，确认本项目为 `project-004-过级搭子后台管理系统`。
- 使用 GitHub API 获取候选仓库元数据，包括 stars、forks、open issues、license、最近更新时间和默认分支。
- 使用 GitHub 公开仓库文件链接核对主选项目的 `package.json`、README、LICENSE、权限、路由和 mock 入口。
- 创建标准项目目录：`docs/`、`assets/`、`builds/`、`backups/`、`logs/`、`references/`。
- 归档 PRD 副本到 `docs/guojidazi_b_admin_prd_mvp.md`。

## GitHub 元数据摘录

| 仓库 | Stars | Forks | Issues | License | 最近 pushed_at |
| --- | ---: | ---: | ---: | --- | --- |
| `ant-design/ant-design-pro` | 38497 | 8248 | 44 | MIT | 2026-07-06T06:12:01Z |
| `vbenjs/vue-vben-admin` | 32847 | 8851 | 104 | MIT | 2026-07-03T19:34:07Z |
| `soybeanjs/soybean-admin` | 14577 | 2471 | 3 | MIT | 2026-06-14T03:14:20Z |
| `pure-admin/vue-pure-admin` | 20391 | 3760 | 1 | MIT | 2026-07-03T02:10:44Z |
| `kailong321200875/vue-element-plus-admin` | 3660 | 862 | 142 | MIT | 2026-05-25T01:18:44Z |
| `flipped-aurora/gin-vue-admin` | 24826 | 7097 | 39 | GitHub API returned NOASSERTION | 2026-07-06T08:17:02Z |

## Chrome 插件状态

用户说明 GitHub 已在 Chrome 登录，但本轮 Codex Chrome 插件无法接管：

- Chrome 正在运行。
- 本机安装了 Google Chrome。
- Codex Chrome Extension 安装并启用于 Chrome `Profile 1`。
- 插件当前选择的 `Default` profile 未安装该扩展。
- Node REPL 重试后仍返回：`Browser is not available: extension`。

因此，本轮没有使用 Chrome 登录态访问 GitHub 页面；候选判断来自 GitHub API、公开仓库文件链接和 PRD 匹配分析。

## 未执行检查

- 尚未克隆候选代码。
- 尚未安装依赖。
- 尚未本地启动 Ant Design Pro 或 Vben Admin。
- 尚未做浏览器页面截图和交互验证。

## 当前结论

- 推荐主选：`ant-design/ant-design-pro`。
- 推荐备选：`vbenjs/vue-vben-admin`。
- 下一阶段应拉取主选项目并完成本地启动验证，再进入过级搭子后台模块骨架改造。
