import type { AdminModuleKey, PermissionAction } from './permissions';

export type ModulePlaceholderConfig = {
  moduleKey: AdminModuleKey;
  title: string;
  description: string;
  primaryActions: PermissionAction[];
  tableTitle: string;
  columns: string[];
};

export const modulePlaceholderConfigs: Record<string, ModulePlaceholderConfig> =
  {
    'dashboard-overview': {
      moduleKey: 'dashboard',
      title: '工作台总览',
      description:
        '聚合待办、审核提醒、运营风险和关键指标。本阶段保留为业务骨架占位。',
      primaryActions: ['read', 'export'],
      tableTitle: '待办与风险占位',
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
    'content-questions': {
      moduleKey: 'content',
      title: '题库管理',
      description:
        '用于承接题库、题组、外刊、每日一句、写作题和翻译题等内容管理。',
      primaryActions: ['create', 'edit', 'submit', 'publish'],
      tableTitle: '内容资产占位',
      columns: ['内容名称', '审核状态', '版本', '最近更新'],
    },
    'learning-path-diagnosis-rules': {
      moduleKey: 'learningPath',
      title: '诊断规则',
      description: '用于承接学习诊断、路径阶段、任务包和推荐策略配置。',
      primaryActions: ['create', 'edit', 'submit', 'config'],
      tableTitle: '规则配置占位',
      columns: ['规则名称', '适用范围', '发布状态', '更新时间'],
    },
    'ai-coach-prompts': {
      moduleKey: 'aiCoach',
      title: '提示词策略',
      description: '用于承接 AI 陪练提示词、策略参数、风险规则和效果监控。',
      primaryActions: ['create', 'edit', 'submit', 'publish', 'config'],
      tableTitle: 'AI 策略占位',
      columns: ['策略名称', '审核状态', '风险等级', '更新时间'],
    },
    'writing-translation-topics': {
      moduleKey: 'writingTranslation',
      title: '写译题目',
      description: '用于承接写作题、翻译题、评分规则、批改维度和异常处理。',
      primaryActions: ['create', 'edit', 'submit', 'publish'],
      tableTitle: '写译内容占位',
      columns: ['题目', '类型', '审核状态', '更新时间'],
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
    'review-release-pending': {
      moduleKey: 'reviewRelease',
      title: '待审核发布',
      description: '用于承接草稿、待审核、待发布、已发布、下架和回滚工作流。',
      primaryActions: ['approve', 'publish', 'export'],
      tableTitle: '审核任务占位',
      columns: ['对象', '状态', '提交人', '更新时间'],
    },
    'system-accounts': {
      moduleKey: 'system',
      title: '账号与角色',
      description: '用于承接账号、角色、菜单、按钮权限、审计日志和安全配置。',
      primaryActions: ['create', 'edit', 'disable', 'config'],
      tableTitle: '权限配置占位',
      columns: ['账号/角色', '状态', '权限范围', '更新时间'],
    },
  };
