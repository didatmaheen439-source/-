export const configKindOptions = [
  { label: '诊断规则', value: 'diagnosis_rule' },
  { label: '今日任务模板', value: 'today_task_template' },
];

export const examTypeOptions = [
  { label: '四级', value: 'CET4' },
  { label: '六级', value: 'CET6' },
];

export const moduleOptions = [
  { label: '词汇', value: 'vocabulary' },
  { label: '语法', value: 'grammar' },
  { label: '阅读', value: 'reading' },
  { label: '听力', value: 'listening' },
  { label: '写作', value: 'writing' },
  { label: '翻译', value: 'translation' },
  { label: '模考', value: 'mock_exam' },
];

export const weakLevelOptions = [
  { label: '低', value: 'low' },
  { label: '中', value: 'medium' },
  { label: '高', value: 'high' },
];

export const taskPriorityOptions = [
  { label: 'P0', value: 'P0' },
  { label: 'P1', value: 'P1' },
  { label: 'P2', value: 'P2' },
];

export const conditionModeOptions = [
  { label: '全部满足', value: 'all' },
  { label: '任意满足', value: 'any' },
];

export const metricOptions = [
  { label: '正确率', value: 'accuracy' },
  { label: '错题数量', value: 'wrong_count' },
  { label: '模块得分', value: 'module_score' },
  { label: '有效完成题目数', value: 'completed_questions' },
  { label: '错因标签命中次数', value: 'error_tag_hits' },
];

export const operatorOptions = [
  { label: '小于', value: 'lt' },
  { label: '小于等于', value: 'lte' },
  { label: '等于', value: 'eq' },
  { label: '大于等于', value: 'gte' },
  { label: '大于', value: 'gt' },
  { label: '区间', value: 'between' },
];

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

export const moduleLabelMap = Object.fromEntries(
  moduleOptions.map((item) => [item.value, item.label]),
) as Record<API.LearningPathModule, string>;

export const kindLabelMap = Object.fromEntries(
  configKindOptions.map((item) => [item.value, item.label]),
) as Record<API.LearningPathConfigKind, string>;

export const precheckLevelColor: Record<API.LearningPathPrecheckLevel, string> = {
  passed: 'success',
  warning: 'warning',
  error: 'error',
};

export const precheckLevelText: Record<API.LearningPathPrecheckLevel, string> = {
  passed: '通过',
  warning: '警告',
  error: '错误',
};

export const editableStatuses: API.LearningPathConfigStatus[] = ['draft', 'rejected'];

export const defaultDiagnosisFormValues = {
  kind: 'diagnosis_rule',
  examType: 'CET4',
  priority: 10,
  applicableModule: 'reading',
  userCondition: {
    examType: 'CET4',
    conditionMode: 'all',
    targetScoreMin: 425,
    targetScoreMax: 550,
    dailyMinutesMin: 20,
    dailyMinutesMax: 60,
    onboardingStatus: 'completed',
    diagnosisStatus: 'completed',
  },
  questionRange: '四级阅读专项',
  references: [],
  conditionGroup: {
    mode: 'all',
    conditions: [
      {
        id: 'condition-accuracy',
        metric: 'accuracy',
        operator: 'lt',
        value: 70,
        description: '正确率低于阈值。',
      },
    ],
  },
  output: {
    weakModules: ['reading'],
    weakLevel: 'medium',
    taskPriority: 'P1',
    recommendedTaskType: '专项练习',
    estimatedMinutes: 25,
    outputDescription: '阅读薄弱时推荐阅读专项任务。',
  },
};

export const defaultTemplateFormValues = {
  kind: 'today_task_template',
  examType: 'CET4',
  priority: 10,
  userCondition: {
    examType: 'CET4',
    conditionMode: 'any',
    targetScoreMin: 425,
    targetScoreMax: 550,
    dailyMinutesMin: 20,
    dailyMinutesMax: 60,
    onboardingStatus: 'completed',
    diagnosisStatus: 'completed',
    currentStudyStatus: 'in_progress',
  },
  matchedWeakModules: ['reading'],
  weakLevel: 'medium',
  replacementAllowed: true,
  taskItems: [],
};

export const buildReferenceOptions = (items: API.LearningPathReference[]) =>
  items.map((item) => ({
    label: `${item.name}（${item.id}）`,
    value: item.id,
    item,
  }));
