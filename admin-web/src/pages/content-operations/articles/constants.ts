import { examTypeOptions, getOptionLabel, reviewStatusOptions, toValueEnum } from '../../content/questions/constants';

export { examTypeOptions, getOptionLabel, reviewStatusOptions, toValueEnum };

export const articleDifficultyOptions = [
  { label: '基础', value: 'easy' },
  { label: '中等', value: 'medium' },
  { label: '较难', value: 'hard' },
];

export const articleCategoryOptions = [
  { label: '环境科普', value: '环境科普' },
  { label: '学习方法', value: '学习方法' },
  { label: '语言文化', value: '语言文化' },
  { label: '社会观察', value: '社会观察' },
  { label: '科技趋势', value: '科技趋势' },
];

export const articleRiskOptions = [
  { label: '样本不足', value: 'insufficient_sample' },
  { label: '低完成率', value: 'low_completion' },
  { label: '趋势恶化', value: 'completion_decline' },
];

export const editableArticleStatuses: API.ReviewTaskStatus[] = ['draft', 'rejected'];

export const riskColor: Record<API.ArticleEffectRisk['level'], string> = {
  info: 'default',
  warning: 'orange',
  high: 'red',
};
