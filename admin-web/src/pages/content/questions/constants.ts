export const examTypeOptions = [
  { label: '四级', value: 'CET4' },
  { label: '六级', value: 'CET6' },
];

export const questionTypeOptions = [
  { label: '单选题', value: 'single_choice' },
  { label: '阅读选择', value: 'reading_choice' },
  { label: '听力选择', value: 'listening_choice' },
];

export const questionSkillOptions = [
  { label: '词汇', value: 'vocabulary' },
  { label: '语法', value: 'grammar' },
  { label: '阅读', value: 'reading' },
  { label: '听力', value: 'listening' },
];

export const questionDifficultyOptions = [
  { label: '基础', value: 'easy' },
  { label: '中等', value: 'medium' },
  { label: '较难', value: 'hard' },
];

export const reviewStatusOptions = [
  { label: '草稿', value: 'draft' },
  { label: '待审核', value: 'pending_review' },
  { label: '已驳回', value: 'rejected' },
  { label: '已通过', value: 'approved' },
  { label: '待发布', value: 'pending_release' },
  { label: '已发布', value: 'published' },
  { label: '已下架', value: 'offline' },
  { label: '已回滚', value: 'rolled_back' },
];

export const optionKeys = ['A', 'B', 'C', 'D'] as const;

export const toValueEnum = (options: { label: string; value: string }[]) =>
  options.reduce<Record<string, { text: string }>>((acc, option) => {
    acc[option.value] = { text: option.label };
    return acc;
  }, {});

export const getOptionLabel = (
  options: { label: string; value: string }[],
  value?: string,
) => options.find((item) => item.value === value)?.label ?? value ?? '--';
