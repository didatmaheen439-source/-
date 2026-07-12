# Onboarding 配置闭环实施与验收

日期：2026-07-11

## 实施结果

- 新增 Onboarding 配置详情和独立编辑页。
- 接入既有学习路径权限、审核发布状态机、版本记录和发布前复验。
- 新增全局单例 Mock 配置、固定模拟用户、答案快照和规则求值。
- 用户详情增加 Onboarding 配置版本与五项答案回看。
- 学习路径漏斗直接聚合固定 Mock 用户状态与匹配摘要。
- 新增预校验、快照、停用选项和已发布规则匹配单元测试。

## 浏览器验收

- 超级管理员打开 `/learning-path/onboarding`，五字段、V1.0 线上状态、预校验和版本记录正常。
- 默认 Mock 输入为 CET4、500 分、2026-12-12、30 分钟、steady。
- 完成 Mock 后命中 `diagnosis-cet4-reading-core` 和 `template-cet4-reading-daily`。
- 用户详情显示 V1.0 配置快照、五项答案、诊断规则和任务模板。
- 超级管理员复制并提交 V1.1；`teaching_reviewer_2` 完成审核、安排发布和发布。
- V1.1 发布后，已完成用户仍保留 V1.0 快照；重置后再次完成使用 V1.1。
- CET4 漏斗完成前为 `16/13/3/2`，重置后回退为 `15/12/2/1`，再次完成后恢复。

## 权限验收

- `ai_operator`：配置读取 200，重置 Mock 403。
- `customer_support`：用户详情 200，Onboarding 配置 403。
- `data_analyst`：学习路径漏斗 200，用户详情 403。

## 验证命令

- `npm run tsc`：通过。
- `npm run test`：通过，14 个测试文件、77 个测试。
- `npm run lint`：通过，Biome 检查 326 个文件，无警告；内含 TypeScript 检查通过。
- `npx antd lint ./src`：通过，扫描 291 个文件，无问题。
- `npm run build`：通过，`admin-web/dist/` 生成 58 个资源文件。
- `git diff --check`：通过。

## 剩余验证限制

- 浏览器完成桌面宽度页面与完整任务流验收，无重叠或内容截断。
- 尝试将 in-app browser 临时视口设置为 390x844，但页面读取到的 `window.innerWidth` 仍为 1280，因此本次未获得真实窄屏布局证据。
- 本模块定位为桌面运营后台；如后续要求移动端使用，需要补充独立窄屏浏览器或设备验收。
