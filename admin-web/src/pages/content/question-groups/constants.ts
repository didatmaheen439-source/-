import {
  examTypeOptions,
  getOptionLabel,
  questionDifficultyOptions,
  questionSkillOptions,
  questionTypeOptions,
  reviewStatusOptions,
  toValueEnum,
} from '../questions/constants';

export {
  examTypeOptions,
  getOptionLabel,
  questionDifficultyOptions,
  questionSkillOptions,
  questionTypeOptions,
  reviewStatusOptions,
  toValueEnum,
};

export const audienceOptions = [
  { label: '基础巩固', value: 'foundation' },
  { label: '专项提升', value: 'skill_improvement' },
  { label: '冲刺练习', value: 'exam_sprint' },
];

export const editableQuestionGroupStatuses: API.ReviewTaskStatus[] = [
  'draft',
  'rejected',
];
