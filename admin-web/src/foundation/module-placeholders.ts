import type { AdminModuleKey, PermissionAction } from './permissions';

export type ModulePlaceholderConfig = {
  moduleKey: AdminModuleKey;
  title: string;
  description: string;
  primaryActions: PermissionAction[];
  tableTitle: string;
  columns: string[];
};

const readonlyActions: PermissionAction[] = [];

export const modulePlaceholderConfigs: Record<string, ModulePlaceholderConfig> =
  {
    'dashboard-review-tasks': {
      moduleKey: 'dashboard',
      title: '审核待办',
      description:
        '聚合当前角色需要关注的审核、发布、回滚和高风险待办。当前阶段仅开放只读入口。',
      primaryActions: readonlyActions,
      tableTitle: '审核待办占位',
      columns: ['待办事项', '状态', '责任人', '更新时间'],
    },
    'dashboard-overview': {
      moduleKey: 'dashboard',
      title: '工作台总览',
      description:
        '聚合待办、审核提醒、运营风险和关键指标。本阶段保留为业务骨架占位。',
      primaryActions: ['read', 'export'],
      tableTitle: '待办与风险占位',
      columns: ['事项', '状态', '负责人', '更新时间'],
    },
    'dashboard-workbench': {
      moduleKey: 'dashboard',
      title: '首页工作台',
      description: 'PRD 首页工作台入口，当前复用已实现的运营工作台页面。',
      primaryActions: readonlyActions,
      tableTitle: '工作台占位',
      columns: ['事项', '状态', '负责人', '更新时间'],
    },
    'users-list': {
      moduleKey: 'users',
      title: '用户列表',
      description: '用于承接用户资料、学习状态、反馈记录和敏感访问审计。',
      primaryActions: ['read', 'edit', 'disable', 'export'],
      tableTitle: '用户数据占位',
      columns: ['用户', '账号状态', '最近学习', '处理状态'],
    },
    'users-feedback': {
      moduleKey: 'users',
      title: '反馈记录',
      description:
        '用于承接用户反馈、处理状态、客服跟进和反馈关闭记录。当前阶段暂未开放完整业务操作。',
      primaryActions: readonlyActions,
      tableTitle: '反馈记录占位',
      columns: ['反馈对象', '处理状态', '处理人', '更新时间'],
    },
    'content-questions': {
      moduleKey: 'content',
      title: '题库管理',
      description:
        '用于承接题库、题组、外刊、每日一句、写作题和翻译题等内容管理。',
      primaryActions: ['create', 'edit', 'submit', 'publish'],
      tableTitle: '内容资产占位',
      columns: ['内容名称', '审核状态', '版本', '最近更新'],
    },
    'content-question-groups': {
      moduleKey: 'content',
      title: '题组管理',
      description:
        '用于承接按考试、题型、难度和场景组合的题组。当前阶段暂未开放完整业务操作。',
      primaryActions: readonlyActions,
      tableTitle: '题组占位',
      columns: ['题组名称', '审核状态', '负责人', '更新时间'],
    },
    'content-wrong-reason-tags': {
      moduleKey: 'content',
      title: '错因标签',
      description:
        '用于承接错因标签体系、适用题型和学习路径引用。当前阶段暂未开放完整业务操作。',
      primaryActions: readonlyActions,
      tableTitle: '错因标签占位',
      columns: ['标签名称', '启用状态', '负责人', '更新时间'],
    },
    'content-operations-daily-sentences': {
      moduleKey: 'content',
      title: '每日一句',
      description:
        '用于承接每日一句内容、日期排期、讲解和发布状态。当前阶段暂未开放完整业务操作。',
      primaryActions: readonlyActions,
      tableTitle: '每日一句占位',
      columns: ['内容标题', '发布状态', '负责人', '更新时间'],
    },
    'content-operations-articles': {
      moduleKey: 'content',
      title: '外刊内容',
      description:
        '用于承接外刊文章、难度标签、题目关联和审核发布。当前阶段暂未开放完整业务操作。',
      primaryActions: readonlyActions,
      tableTitle: '外刊内容占位',
      columns: ['文章标题', '审核状态', '负责人', '更新时间'],
    },
    'learning-path-diagnosis-rules': {
      moduleKey: 'learningPath',
      title: '诊断规则',
      description: '用于承接学习诊断、路径阶段、任务包和推荐策略配置。',
      primaryActions: ['create', 'edit', 'submit', 'config'],
      tableTitle: '规则配置占位',
      columns: ['规则名称', '适用范围', '发布状态', '更新时间'],
    },
    'learning-path-task-templates': {
      moduleKey: 'learningPath',
      title: '今日任务模板',
      description: 'PRD 今日任务模板入口，当前复用学习路径配置页的任务模板视图。',
      primaryActions: readonlyActions,
      tableTitle: '任务模板占位',
      columns: ['模板名称', '适用范围', '发布状态', '更新时间'],
    },
    'learning-path-light-task-strategies': {
      moduleKey: 'learningPath',
      title: '轻量任务策略',
      description:
        '用于承接碎片时间任务、低压力学习任务和推荐条件。当前阶段暂未开放完整业务操作。',
      primaryActions: readonlyActions,
      tableTitle: '轻量任务策略占位',
      columns: ['策略名称', '发布状态', '负责人', '更新时间'],
    },
    'learning-path-extra-practice-strategies': {
      moduleKey: 'learningPath',
      title: '追加陪练策略',
      description:
        '用于承接追加陪练触发条件、任务推荐和风险控制。当前阶段暂未开放完整业务操作。',
      primaryActions: readonlyActions,
      tableTitle: '追加陪练策略占位',
      columns: ['策略名称', '发布状态', '负责人', '更新时间'],
    },
    'learning-path-review-recommendation-strategies': {
      moduleKey: 'learningPath',
      title: '复练推荐策略',
      description:
        '用于承接错题复练、间隔复习和推荐权重配置。当前阶段暂未开放完整业务操作。',
      primaryActions: readonlyActions,
      tableTitle: '复练推荐策略占位',
      columns: ['策略名称', '发布状态', '负责人', '更新时间'],
    },
    'ai-coach-intents': {
      moduleKey: 'aiCoach',
      title: '意图分类',
      description:
        '用于承接用户意图识别、场景归类和策略路由。当前阶段暂未开放完整业务操作。',
      primaryActions: readonlyActions,
      tableTitle: '意图分类占位',
      columns: ['意图名称', '启用状态', '负责人', '更新时间'],
    },
    'ai-coach-prompts': {
      moduleKey: 'aiCoach',
      title: 'Prompt 模板',
      description: '用于承接 AI 陪练提示词、策略参数、风险规则和效果监控。',
      primaryActions: ['create', 'edit', 'submit', 'publish', 'config'],
      tableTitle: 'AI 策略占位',
      columns: ['策略名称', '审核状态', '风险等级', '更新时间'],
    },
    'ai-coach-response-structures': {
      moduleKey: 'aiCoach',
      title: '回答结构',
      description:
        '用于承接 AI 回复结构、讲解框架和输出约束。当前阶段暂未开放完整业务操作。',
      primaryActions: readonlyActions,
      tableTitle: '回答结构占位',
      columns: ['结构名称', '启用状态', '负责人', '更新时间'],
    },
    'ai-coach-dependency-rules': {
      moduleKey: 'aiCoach',
      title: '防依赖规则',
      description:
        '用于承接防代写、防答案依赖和高风险回复规则。当前阶段暂未开放完整业务操作。',
      primaryActions: readonlyActions,
      tableTitle: '防依赖规则占位',
      columns: ['规则名称', '风险等级', '负责人', '更新时间'],
    },
    'ai-coach-session-review': {
      moduleKey: 'aiCoach',
      title: '会话抽检',
      description:
        '用于承接 AI 陪练会话抽检、质检结论和风险复核。当前阶段暂未开放完整业务操作。',
      primaryActions: readonlyActions,
      tableTitle: '会话抽检占位',
      columns: ['会话样本', '质检状态', '抽检人', '更新时间'],
    },
    'ai-coach-abnormal-replies': {
      moduleKey: 'aiCoach',
      title: '异常回复',
      description:
        '用于承接异常回复识别、处置记录和策略回溯。当前阶段暂未开放完整业务操作。',
      primaryActions: readonlyActions,
      tableTitle: '异常回复占位',
      columns: ['异常对象', '风险等级', '处理人', '更新时间'],
    },
    'ai-coach-strategy-versions': {
      moduleKey: 'aiCoach',
      title: '策略版本',
      description:
        '用于承接 AI 策略版本、差异记录和发布回滚。当前阶段暂未开放完整业务操作。',
      primaryActions: readonlyActions,
      tableTitle: '策略版本占位',
      columns: ['版本名称', '发布状态', '负责人', '更新时间'],
    },
    'writing-translation-writing-topics': {
      moduleKey: 'writingTranslation',
      title: '写作题目',
      description: 'PRD 写作题目入口，当前复用写译题目页并默认筛选写作题目。',
      primaryActions: readonlyActions,
      tableTitle: '写作题目占位',
      columns: ['题目', '审核状态', '负责人', '更新时间'],
    },
    'writing-translation-translation-topics': {
      moduleKey: 'writingTranslation',
      title: '翻译题目',
      description: 'PRD 翻译题目入口，当前复用写译题目页并默认筛选翻译题目。',
      primaryActions: readonlyActions,
      tableTitle: '翻译题目占位',
      columns: ['题目', '审核状态', '负责人', '更新时间'],
    },
    'writing-translation-topics': {
      moduleKey: 'writingTranslation',
      title: '写译题目',
      description: '用于承接写作题、翻译题、评分规则、批改维度和异常处理。',
      primaryActions: ['create', 'edit', 'submit', 'publish'],
      tableTitle: '写译内容占位',
      columns: ['题目', '类型', '审核状态', '更新时间'],
    },
    'writing-translation-scoring-dimensions': {
      moduleKey: 'writingTranslation',
      title: '评分维度',
      description:
        '用于承接写作和翻译评分维度、权重和适用题型。当前阶段暂未开放完整业务操作。',
      primaryActions: readonlyActions,
      tableTitle: '评分维度占位',
      columns: ['维度名称', '启用状态', '负责人', '更新时间'],
    },
    'writing-translation-feedback-templates': {
      moduleKey: 'writingTranslation',
      title: '反馈模板',
      description:
        '用于承接批改反馈模板、风险提示和 AI 策略引用。当前阶段暂未开放完整业务操作。',
      primaryActions: readonlyActions,
      tableTitle: '反馈模板占位',
      columns: ['模板名称', '启用状态', '负责人', '更新时间'],
    },
    'mock-exam-papers': {
      moduleKey: 'mockExam',
      title: '模考试卷',
      description: '用于承接模考试卷、考试配置、成绩分布和复盘规则。',
      primaryActions: ['create', 'edit', 'submit', 'publish', 'export'],
      tableTitle: '试卷配置占位',
      columns: ['试卷名称', '考试类型', '发布状态', '更新时间'],
    },
    'analytics-overview': {
      moduleKey: 'analytics',
      title: '运营数据总览',
      description:
        '用于承接用户增长、学习漏斗、内容效果、题库表现、AI 使用和留存分析。',
      primaryActions: ['read', 'export'],
      tableTitle: '指标看板占位',
      columns: ['指标', '当前值', '环比', '更新时间'],
    },
    'analytics-users': {
      moduleKey: 'analytics',
      title: '用户增长',
      description: 'PRD 用户增长入口，当前复用运营数据页并默认筛选用户分区。',
      primaryActions: readonlyActions,
      tableTitle: '用户增长占位',
      columns: ['指标', '当前值', '环比', '更新时间'],
    },
    'analytics-learning-funnel': {
      moduleKey: 'analytics',
      title: '学习路径漏斗',
      description: 'PRD 学习路径漏斗入口，当前复用运营数据页并默认筛选学习路径分区。',
      primaryActions: readonlyActions,
      tableTitle: '学习漏斗占位',
      columns: ['指标', '当前值', '环比', '更新时间'],
    },
    'analytics-content': {
      moduleKey: 'analytics',
      title: '内容效果',
      description: 'PRD 内容效果入口，当前复用运营数据页并默认筛选题库与内容分区。',
      primaryActions: readonlyActions,
      tableTitle: '内容效果占位',
      columns: ['指标', '当前值', '环比', '更新时间'],
    },
    'analytics-questions': {
      moduleKey: 'analytics',
      title: '题库表现',
      description: 'PRD 题库表现入口，当前复用运营数据页并默认筛选题库与内容分区。',
      primaryActions: readonlyActions,
      tableTitle: '题库表现占位',
      columns: ['指标', '当前值', '环比', '更新时间'],
    },
    'analytics-wrong-reasons': {
      moduleKey: 'analytics',
      title: '错因分布',
      description: 'PRD 错因分布入口，当前复用运营数据页并默认筛选题库与内容分区。',
      primaryActions: readonlyActions,
      tableTitle: '错因分布占位',
      columns: ['指标', '当前值', '环比', '更新时间'],
    },
    'analytics-writing-translation': {
      moduleKey: 'analytics',
      title: '写译效果',
      description: 'PRD 写译效果入口，当前复用运营数据页并默认筛选写译批改分区。',
      primaryActions: readonlyActions,
      tableTitle: '写译效果占位',
      columns: ['指标', '当前值', '环比', '更新时间'],
    },
    'analytics-mock-exam': {
      moduleKey: 'analytics',
      title: '模考表现',
      description: 'PRD 模考表现入口，当前复用运营数据页并默认筛选模考分区。',
      primaryActions: readonlyActions,
      tableTitle: '模考表现占位',
      columns: ['指标', '当前值', '环比', '更新时间'],
    },
    'analytics-ai': {
      moduleKey: 'analytics',
      title: 'AI 使用',
      description: 'PRD AI 使用入口，当前复用运营数据页并默认筛选 AI 陪练分区。',
      primaryActions: readonlyActions,
      tableTitle: 'AI 使用占位',
      columns: ['指标', '当前值', '环比', '更新时间'],
    },
    'review-release-pending': {
      moduleKey: 'reviewRelease',
      title: '审核发布中心',
      description: '用于承接草稿、待审核、待发布、已发布、下架和回滚工作流。',
      primaryActions: ['approve', 'publish', 'export'],
      tableTitle: '审核任务占位',
      columns: ['对象', '状态', '提交人', '更新时间'],
    },
    'review-release-versions': {
      moduleKey: 'reviewRelease',
      title: '发布版本',
      description:
        '用于承接已发布版本、版本差异、下架和回滚记录。当前阶段暂未开放完整业务操作。',
      primaryActions: readonlyActions,
      tableTitle: '发布版本占位',
      columns: ['版本对象', '发布状态', '发布人', '更新时间'],
    },
    'system-accounts': {
      moduleKey: 'system',
      title: '后台账号',
      description: '用于承接账号、角色、菜单、按钮权限、审计日志和安全配置。',
      primaryActions: ['create', 'edit', 'disable', 'config'],
      tableTitle: '权限配置占位',
      columns: ['账号/角色', '状态', '权限范围', '更新时间'],
    },
    'system-roles': {
      moduleKey: 'system',
      title: '角色权限',
      description: 'PRD 角色权限入口，当前复用权限与系统设置页的角色权限矩阵视图。',
      primaryActions: readonlyActions,
      tableTitle: '角色权限占位',
      columns: ['角色', '状态', '权限范围', '更新时间'],
    },
    'system-operation-logs': {
      moduleKey: 'system',
      title: '操作日志',
      description: 'PRD 操作日志入口，当前复用权限与系统设置页的审计日志视图。',
      primaryActions: readonlyActions,
      tableTitle: '操作日志占位',
      columns: ['操作对象', '结果', '操作人', '更新时间'],
    },
    'system-sensitive-access-logs': {
      moduleKey: 'system',
      title: '敏感访问日志',
      description: 'PRD 敏感访问日志入口，当前复用权限与系统设置页的审计日志视图。',
      primaryActions: readonlyActions,
      tableTitle: '敏感访问日志占位',
      columns: ['访问对象', '结果', '操作人', '更新时间'],
    },
  };
