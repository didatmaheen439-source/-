export const reviewStatusOptions = [
  { label: '草稿', value: 'draft' },
  { label: '待审核', value: 'pending_review' },
  { label: '已驳回', value: 'rejected' },
  { label: '已通过', value: 'approved' },
  { label: '待发布', value: 'pending_publish' },
  { label: '已发布', value: 'published' },
  { label: '已下架', value: 'offline' },
  { label: '已回滚', value: 'rolled_back' },
] as const;

export const editableStatuses: API.ReviewTaskStatus[] = ['draft', 'rejected'];

export const toValueEnum = (options: readonly { label: string; value: string }[]) =>
  Object.fromEntries(options.map((item) => [item.value, { text: item.label }]));

export const precheckColor: Record<API.DailySentencePrecheckLevel, string> = {
  passed: 'green',
  warning: 'orange',
  error: 'red',
};

export const precheckText: Record<API.DailySentencePrecheckLevel, string> = {
  passed: '通过',
  warning: '有警告',
  error: '未通过',
};
