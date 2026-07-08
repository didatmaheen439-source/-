# 过级搭子 B 端后台开源底座选型报告

日期：2026-07-06

## 结论

推荐主选：[`ant-design/ant-design-pro`](https://github.com/ant-design/ant-design-pro)

推荐备选：[`vbenjs/vue-vben-admin`](https://github.com/vbenjs/vue-vben-admin)

选择理由：

- PRD 的主要工作量是高密度后台页面：大量列表、详情、表单、筛选、状态标签、审核操作、数据看板和权限差异。
- Ant Design Pro 与 Ant Design / ProComponents 对这类内部运营后台的开发效率最高，技术栈为 React + TypeScript，且已有 `access` 权限、路由配置、mock 和典型后台页面结构。
- Vben Admin 的动态权限、菜单和现代 Vue 工程能力很强，适合作为备选；但当前主仓库工程结构更偏现代 monorepo 和 Shadcn UI，落地过级搭子 PRD 的表格/表单/审核后台时，改造和统一设计系统成本预计高于 Ant Design Pro。

## 候选评分

| 候选项目 | 技术栈 | 许可证 | 维护状态 | 评分 | 结论 |
| --- | --- | --- | --- | ---: | --- |
| [`ant-design/ant-design-pro`](https://github.com/ant-design/ant-design-pro) | React / TypeScript / Ant Design / Umi | MIT | 2026-07-06 有更新，约 38k stars | 88 | 主选 |
| [`vbenjs/vue-vben-admin`](https://github.com/vbenjs/vue-vben-admin) | Vue / TypeScript / Vite / Monorepo / Shadcn UI | MIT | 2026-07-03 有更新，约 32k stars | 86 | 备选 |
| [`soybeanjs/soybean-admin`](https://github.com/soybeanjs/soybean-admin) | Vue3 / TypeScript / Naive UI / Vite | MIT | 2026-06-14 有更新，约 14k stars | 80 | 可参考 |
| [`pure-admin/vue-pure-admin`](https://github.com/pure-admin/vue-pure-admin) | Vue3 / TypeScript / Element Plus / Vite | MIT | 2026-07-03 有更新，约 20k stars | 78 | 可参考 |
| [`kailong321200875/vue-element-plus-admin`](https://github.com/kailong321200875/vue-element-plus-admin) | Vue3 / TypeScript / Element Plus / Vite | MIT | 2026-05-25 有更新，约 3.6k stars | 72 | 次级候选 |
| [`flipped-aurora/gin-vue-admin`](https://github.com/flipped-aurora/gin-vue-admin) | Go / Gin / Vue3 / Vite | 需进一步核对 | 2026-07-06 有更新，约 24k stars | 70 | 全栈参考，不建议主选 |

## 主选：Ant Design Pro

适配点：

- 与需求中的 B 端页面形态高度匹配：工作台、列表页、详情页、表单页、图表页、账号权限页都能用现有模式扩展。
- React + TypeScript + Ant Design 是内部运营后台的稳妥组合，后续维护和找组件资料成本低。
- 已有 `src/access.ts`、`config/routes.ts`、`mock/user.ts` 等权限、路由和 mock 入口，可作为 7 类角色与路由守卫的改造起点。
- Ant Design Pro 的表格、表单、筛选、弹窗、抽屉、步骤流、图表生态更适合 PRD 中的题库、审核发布、AI 策略、模考和运营数据模块。

主要改造方向：

- 将默认权限模型扩展为 7 类角色和模块/页面/动作/数据范围四层权限。
- 新增统一状态机和版本机制，覆盖内容、题库、学习路径、AI 策略、写译和模考对象。
- 新增审计日志、敏感访问日志、导出任务日志和高风险操作原因机制。
- 用 mock/API 适配层先跑通 MVP，不接真实后端和真实 AI。

风险：

- 默认示例权限较轻，需要补齐服务端或 mock API 层的权限表达，不能只依赖前端隐藏菜单。
- 审核发布、版本回滚、敏感访问日志需要按 PRD 自建领域模型。
- 如果后续团队更偏 Vue 技术栈，主选优势会下降。

## 备选：Vue Vben Admin

适配点：

- Vue3 + TypeScript + Vite 生态成熟，动态路由、权限、菜单类后台能力强。
- MIT 许可证，维护活跃，社区规模大。
- 更适合作为强权限后台的 Vue 方案备选。

风险：

- 现主仓库更偏现代化 monorepo 和 Shadcn UI，设计系统与国内传统运营后台表格/表单习惯需要额外统一。
- 对过级搭子 PRD 的大量内容管理页，Ant Design Pro 的表格/表单效率更直接。

## 不建议作为主选的候选

- Soybean Admin：工程现代、视觉干净，适合中小型 Vue 后台，但审计/审核/版本流仍需较多自建。
- Vue Pure Admin：功能覆盖广，Element Plus 适合后台，但项目形态更偏模板集合，作为参考价值高于作为主底座。
- Vue Element Plus Admin：基础可用，但社区和维护规模弱于前两档候选。
- Gin Vue Admin：全栈能力强，内置 JWT、权限、动态路由、日志、上传下载等能力；但会把 Go 后端平台一起引入，超过当前 MVP “先用 mock/API 适配层跑通”的轻量边界。

## 下一步实施建议

1. 在本项目下创建代码子目录并拉取 `ant-design/ant-design-pro`，保留上游来源记录。
2. 先启动原项目，验证登录、菜单、权限、列表、表单和 mock。
3. 删除与过级搭子无关的示例业务，保留框架、权限、路由、布局、表格和图表能力。
4. 建立过级搭子后台的模块骨架：工作台、用户管理、题库与内容、学习路径、AI 陪练、写译批改、模考、运营数据、审核发布、权限与系统设置。
5. 先用 mock 数据实现 7 类角色、统一状态、审核发布和审计日志的 MVP 闭环。
