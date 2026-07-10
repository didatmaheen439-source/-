import {
  examTypeOptions,
  getOptionLabel,
  questionTypeOptions,
  reviewStatusOptions,
  toValueEnum,
} from '../questions/constants';

export {
  examTypeOptions,
  getOptionLabel,
  questionTypeOptions,
  reviewStatusOptions,
  toValueEnum,
};

export const wrongReasonCategoryOptions = [
  { label: '理解偏差', value: 'comprehension_bias' },
  { label: '知识点缺失', value: 'knowledge_gap' },
  { label: '审题问题', value: 'question_review' },
  { label: '表达问题', value: 'expression_issue' },
  { label: '策略问题', value: 'strategy_issue' },
];

export const wrongReasonSeverityOptions = [
  { label: '低', value: 'low' },
  { label: '中', value: 'medium' },
  { label: '高', value: 'high' },
];

export const wrongReasonSeverityColor: Record<
  API.WrongReasonTagSeverity,
  string
> = {
  low: 'green',
  medium: 'orange',
  high: 'red',
};

export const editableWrongReasonStatuses: API.ReviewTaskStatus[] = [
  'draft',
  'rejected',
];
