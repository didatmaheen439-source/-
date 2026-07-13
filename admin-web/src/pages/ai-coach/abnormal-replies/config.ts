export const abnormalStatusText: Record<API.AiAbnormalReplyStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  resolved: '已处理',
  closed: '已关闭',
};

export const abnormalStatusColor: Record<API.AiAbnormalReplyStatus, string> = {
  pending: 'orange',
  processing: 'blue',
  resolved: 'green',
  closed: 'default',
};

export const abnormalTypeText: Record<API.AiAbnormalReplyType, string> = {
  intent_mismatch: '意图误判',
  answer_deviation: '回答偏离',
  structure_missing: '结构缺失',
  dependency_boundary_violation: '边界失守',
  attachment_policy_failure: '附件处理失败',
};

export const resolutionTypeText: Record<API.AiAbnormalResolutionType, string> = {
  strategy_fix: '策略修复',
  false_positive: '误报关闭',
  no_strategy_change: '无需策略变更',
};

export const statusValueEnum = {
  pending: { text: '待处理' },
  processing: { text: '处理中' },
  resolved: { text: '已处理' },
  closed: { text: '已关闭' },
};

export const abnormalTypeOptions = [
  { label: '意图误判', value: 'intent_mismatch' },
  { label: '回答偏离', value: 'answer_deviation' },
  { label: '结构缺失', value: 'structure_missing' },
  { label: '边界失守', value: 'dependency_boundary_violation' },
  { label: '附件处理失败', value: 'attachment_policy_failure' },
];

export const resolutionTypeOptions = [
  { label: '误报关闭', value: 'false_positive' },
  { label: '无需策略变更', value: 'no_strategy_change' },
];

export const statusStepIndex: Record<API.AiAbnormalReplyStatus, number> = {
  pending: 0,
  processing: 1,
  resolved: 5,
  closed: 6,
};
