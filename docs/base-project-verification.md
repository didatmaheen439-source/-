# Ant Design Pro 基座验证记录

日期：2026-07-07

## 基础信息

- 仓库地址：https://github.com/ant-design/ant-design-pro
- 本地目录：`/Users/inn/Desktop/Workspace/projects/project-004-过级搭子后台管理系统/admin-web`
- 当前分支：`master`
- 当前 Commit：`8f268066d71309c348e1208eca203820e9249eb5`
- Commit 时间：`2026-07-06 14:12:00 +0800`
- Commit 信息：`ci: split Ant Design CLI workflow (#11898)`
- 克隆日期：`2026-07-07`
- 开源许可证：MIT
- 许可证判断：MIT 允许复制、修改、合并、发布、分发、再授权和销售，需保留版权和许可证声明；允许当前内部后台 MVP 的二次开发用途。

## 技术栈版本

| 项 | 版本或配置 |
| --- | --- |
| Node 要求 | `>=22.0.0` |
| 当前 Node | `v24.16.0` |
| npm | `11.13.0` |
| Corepack | `0.35.0` |
| 包管理器 | npm，仓库包含 `package-lock.json` 和 `.npmrc` |
| React | `19.2.5` |
| React DOM | `19.2.5` |
| TypeScript | `6.0.3` |
| Ant Design | `6.5.0` |
| Ant Design ProComponents | `3.1.12-0` |
| Umi Max | `4.6.67` |
| Utoo pack | `1.4.17` |
| Biome | `2.5.0` |

## 官方推荐命令

- 安装：`npm install`
- 启动：`npm start`
- 构建：`npm run build`

项目脚本补充：

- TypeScript 检查：`npm run tsc`
- Lint：`npm run lint`
- 生产无 dev 依赖审计：`npm audit --omit=dev`

## 实际执行结果

| 命令 | 结果 |
| --- | --- |
| `git clone https://github.com/ant-design/ant-design-pro.git admin-web` | 成功，保留 `.git` 上游信息 |
| `npm install` | 成功，安装 2053 个包，触发 `prepare`、`max setup` 和 Umi 文件生成 |
| `npm audit --omit=dev` | 退出 0，生产依赖未发现漏洞 |
| `npm audit --audit-level=moderate` | 退出 1，完整开发依赖链有 51 个漏洞：10 low、30 moderate、10 high、1 critical |
| `npm run tsc` | 退出 0 |
| `npm run lint` | 退出 0，Biome 检查 274 个文件，无修复 |
| `npm run build` | 首次在 dev server 运行时失败，原因是 `.turbopack` 锁被 dev 进程占用 |
| 停止 dev server 后重新执行 `npm run build` | 退出 0，输出 `dist/`，89 个 assets |
| `npm start` | 成功，本地地址 `http://localhost:8000` |

## 页面验证结果

浏览器验证使用本地 in-app browser 完成，未依赖 Chrome GitHub 登录态。

| 页面 | 结果 |
| --- | --- |
| `/user/login?redirect=%2F` | 可打开；标题为 `登录 - 过级搭子运营管理后台`；登录页显示「过级搭子运营管理后台」和「内部运营后台 MVP 基座验证版」 |
| `/dashboard/analysis` | 登录后可进入；Pro Layout、图表卡片、统计卡、表格类指标可渲染 |
| `/list/table-list` | 可访问；侧边菜单、顶部导航、筛选表单、表格、分页、状态文本、操作按钮可显示 |
| `/profile/basic` | 可访问；详情、Descriptions、表格和进度类信息可显示 |
| `/form/basic-form` | 可访问；表单、输入项、提交和重置按钮可显示 |
| `/form/basic-form` 刷新 | 刷新后仍可访问 |
| `查询表格 -> 新建` | 能打开「新建规则」弹窗，弹窗和表单存在 |

## 控制台错误

- 登录页、分析页、表格页、详情页、表单页最终验证均未发现阻断性 console error。
- 点击「新建」弹窗时捕获到一条上游示例 warning，被浏览器记录为 error 级别：
  - `Warning: Instance created by useForm is not connected to any Form element. Forget to pass form prop?`
  - 影响判断：不阻断弹窗打开和页面渲染，但后续业务改造时应修复或避免沿用该示例写法。

## 依赖和授权风险

- 未发现必须付费组件、商业授权依赖或必须付费服务。
- README 中涉及 `preview.pro.ant.design`、Umi、Utoo、Ant Design X、Claude Code Skills 等外部链接或工具说明，但本地安装、启动和构建不依赖付费服务。
- 完整 `npm audit` 存在开发依赖链风险，尤其包括 `immer` critical、`mockjs` high、`react-router` moderate、`esbuild` moderate、`@babel/core` 等。生产依赖审计为 0 漏洞。
- 本阶段不建议为了审计结果大范围升级 Umi、React、Ant Design 或构建链；进入业务开发前应把这些漏洞列为基座风险，优先关注是否影响本地开发工具或未来部署链路。

## 初始化结果

已完成最小项目信息初始化：

- `package.json` name 改为 `guoji-dazi-admin-web`。
- `package.json` description 改为 `过级搭子运营管理后台`。
- 浏览器标题、登录页标题、页面 Logo 文案、Footer、manifest、OpenAPI 标题改为「过级搭子运营管理后台」。
- 暂未设计新 Logo，登录页不再显示原 Ant Design logo 图片。
- 保留 React、TypeScript、Ant Design、Pro Layout、路由、权限、Mock、请求封装、表格表单、ESLint/Biome、TypeScript 和构建配置。

## 缺失输入

- `docs/admin-component-spec.md` 当前不存在，未能读取。后续如补充该文档，需要重新校对组件规划。

## 是否建议进入业务改造阶段

建议进入下一阶段，但带三个前提：

- 保留 Ant Design Pro 基础设施，不先大规模清理示例。
- 先建立 10 个一级模块的路由和菜单骨架，再逐步替换示例页。
- 在正式部署或接真实后端前，专项处理完整开发依赖审计风险和 mock/openapi 构建链风险。
