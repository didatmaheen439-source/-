export const strategyKindLabels: Record<API.AdvancedLearningStrategyKind, string> = {
  light_task: '轻量任务',
  extra_practice: '追加陪练',
  review_recommendation: '复练推荐',
};

export const strategyKindOptions = Object.entries(strategyKindLabels).map(
  ([value, label]) => ({ value, label }),
);

export const moduleLabels: Record<API.LearningPathModule, string> = {
  vocabulary: '词汇',
  grammar: '语法',
  reading: '阅读',
  listening: '听力',
  writing: '写作',
  translation: '翻译',
  mock_exam: '模考',
};

export const moduleOptions = Object.entries(moduleLabels).map(([value, label]) => ({ value, label }));
export const examTypeOptions = ['CET4', 'CET6'].map((value) => ({ value, label: value }));

export const statusValueEnum = {
  draft: { text: '草稿' },
  pending_review: { text: '待审核' },
  rejected: { text: '已驳回' },
  approved: { text: '已通过' },
  pending_publish: { text: '待发布' },
  published: { text: '已发布' },
  offline: { text: '已下架' },
  rolled_back: { text: '已回滚' },
};

export const precheckColors = { passed: 'success', warning: 'warning', error: 'error' } as const;
export const precheckLabels = { passed: '通过', warning: '警告', error: '阻断' } as const;

export const triggerMetricLabels: Record<API.StrategyTriggerMetric, string> = {
  available_minutes: '可用分钟',
  weak_module: '薄弱模块',
  accuracy: '正确率',
  consecutive_errors: '连续错题',
  wrong_reason_tag: '错因标签',
  days_since_practice: '距上次练习天数',
};

export const editableStatuses: API.ReviewTaskStatus[] = ['draft', 'rejected'];
export const canManageAdvancedStrategy = (roleId?: string) =>
  ['super_admin', 'teaching_reviewer', 'ai_operator'].includes(roleId ?? '');
