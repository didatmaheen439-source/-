import type {
  MockExamPrecheckLevel,
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
