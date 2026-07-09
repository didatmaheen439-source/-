# 第十一阶段浏览器验收记录

日期：2026-07-09

## 环境

- 本地服务：`http://localhost:8000`
- 启动命令：`npm start`
- 验收方式：应用内浏览器，直达路由并读取页面标题、页面文本长度、403/404/500 标记、横向溢出和页面 dev logs。

## 关键页面

| 页面 | 标题 | 结果 |
| --- | --- | --- |
| `/dashboard/overview` | 工作台总览 | 通过，无白屏、无错误页、无横向溢出 |
| `/users/list` | 用户列表 | 通过，无白屏、无横向溢出；文本中的 `500` 是目标分业务数字 |
| `/content/questions` | 题库管理 | 通过，无白屏、无错误页、无横向溢出 |
| `/learning-path/diagnosis-rules` | 诊断规则 | 通过，无白屏、无错误页、无横向溢出 |
| `/ai-coach/prompts` | 提示词策略 | 通过，无白屏、无错误页、无横向溢出 |
| `/writing-translation/topics` | 写译题目 | 通过，无白屏、无错误页、无横向溢出 |
| `/mock-exam/papers` | 模考试卷 | 通过，无白屏、无错误页、无横向溢出 |
| `/analytics/overview` | 数据总览 | 通过，无白屏、无错误页、无横向溢出 |
| `/review-release/pending` | 待审核发布 | 通过，无白屏、无错误页、无横向溢出 |
| `/system/accounts` | 账号与角色 | 通过，无白屏、无错误页、无横向溢出 |

## 角色权限

| 角色 | 工作台关键入口 | 越权访问检查 |
| --- | --- | --- |
| `super_admin` | 可见用户管理、权限与系统设置等全量入口 | 未设置越权路径 |
| `content_operator` | 可见题库与内容管理、审核发布 | 直访 `/system/accounts` 返回 403 |
| `teaching_reviewer` | 可见学习路径配置、模考管理 | 直访 `/system/accounts` 返回 403 |
| `ai_operator` | 可见 AI 陪练管理、审核发布 | 直访 `/users/list` 返回 403 |
| `customer_support` | 可见用户管理、运营数据 | 直访 `/review-release/pending` 返回 403 |
| `data_analyst` | 可见运营数据、模考管理 | 直访 `/system/accounts` 返回 403 |
| `read_only_auditor` | 可见审核发布、权限与系统设置 | 直访 `/users/list` 返回 403 |

## 控制台和风险

- 页面 dev logs 未发现本地应用阻断错误。
- 浏览器控制层出现外部 Statsig 网络超时日志，不属于 `localhost:8000` 后台页面错误。
- 当前验收未做逐按钮点击流转，只确认页面渲染、角色入口和典型越权 403。
