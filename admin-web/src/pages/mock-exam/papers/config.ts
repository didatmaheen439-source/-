import type {
  MockExamPrecheckLevel,
  MockExamResultRiskLevel,
  MockExamResultRiskType,
  MockExamSectionType,
  MockExamSourceType,
} from './data';

export const examTypeOptions = [
  { label: '大学英语四级', value: 'CET4' },
  { label: '大学英语六级', value: 'CET6' },
];

export const sectionTypeOptions: Array<{
  label: string;
  value: MockExamSectionType;
}> = [
  { label: '写作', value: 'writing' },
  { label: '听力', value: 'listening' },
  { label: '阅读', value: 'reading' },
  { label: '翻译', value: 'translation' },
];

export const sectionTypeText = Object.fromEntries(
  sectionTypeOptions.map((item) => [item.value, item.label]),
) as Record<MockExamSectionType, string>;

export const sourceTypeText: Record<MockExamSourceType, string> = {
  question_bank: '题库题目',
  writing_topic: '写作题目',
  translation_topic: '翻译题目',
};

export const precheckLevelText: Record<MockExamPrecheckLevel, string> = {
  passed: '通过',
  warning: '有警告',
  error: '阻断',
};

export const precheckLevelColor: Record<MockExamPrecheckLevel, string> = {
  passed: 'success',
  warning: 'warning',
  error: 'error',
};

export const resultRiskTypeText: Record<MockExamResultRiskType, string> = {
  low_completion: '完成率低',
  low_average_score: '均分偏低',
  weak_section: '分区异常',
  weak_item: '题目异常',
  time_pressure: '时间压力',
  precheck_blocked: '校验阻断',
};

export const resultRiskLevelText: Record<MockExamResultRiskLevel, string> = {
  high: '高风险',
  medium: '需关注',
  low: '正常',
};

export const resultRiskLevelColor: Record<MockExamResultRiskLevel, string> = {
  high: 'error',
  medium: 'warning',
  low: 'success',
};

export const editableStatuses: API.ReviewTaskStatus[] = [
  'draft',
  'rejected',
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

export const textEllipsisStyle = {
  display: 'block',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const;
