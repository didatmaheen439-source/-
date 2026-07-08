export const examTypeOptions = [
  { label: '四级', value: 'CET4' },
  { label: '六级', value: 'CET6' },
];

export const onboardingStatusOptions = [
  { label: '已完成', value: 'completed' },
  { label: '未完成', value: 'not_started' },
];

export const diagnosisStatusOptions = [
  { label: '已完成', value: 'completed' },
  { label: '未完成', value: 'not_started' },
];

export const taskStatusOptions = [
  { label: '未开始', value: 'not_started' },
  { label: '进行中', value: 'in_progress' },
  { label: '已完成', value: 'completed' },
  { label: '已中断', value: 'interrupted' },
];

export const feedbackStatusOptions = [
  { label: '待处理', value: 'pending' },
  { label: '处理中', value: 'processing' },
  { label: '已处理', value: 'resolved' },
  { label: '无需处理', value: 'no_action' },
  { label: '已关闭', value: 'closed' },
];

export const feedbackNextStatusOptions: Record<
  API.UserFeedbackStatus,
  API.UserFeedbackStatus[]
> = {
  pending: ['processing', 'no_action'],
  processing: ['resolved', 'no_action'],
  resolved: ['closed'],
  no_action: ['closed'],
  closed: [],
};

export const toValueEnum = (options: { label: string; value: string }[]) =>
  options.reduce<Record<string, { text: string }>>((acc, item) => {
    acc[item.value] = { text: item.label };
    return acc;
  }, {});

export const getOptionLabel = (
  options: { label: string; value: string }[],
  value?: string,
) => options.find((item) => item.value === value)?.label ?? value ?? '-';

export const formatDuration = (seconds?: number) => {
  if (!seconds) return '-';
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes < 60) return `${minutes}分${rest ? `${rest}秒` : ''}`;
  return `${Math.floor(minutes / 60)}时${minutes % 60}分`;
};

export const formatAccuracy = (accuracy?: number) =>
  typeof accuracy === 'number' ? `${accuracy}%` : '--';
