import type React from 'react';
import {
  businessSceneOptions,
  businessSceneText,
  riskLevelColor,
  riskLevelOptions,
  riskLevelText,
  textEllipsisStyle,
} from '../prompts/config';

export { businessSceneOptions, businessSceneText, riskLevelColor, riskLevelOptions, riskLevelText, textEllipsisStyle };

export const reviewStatusText: Record<API.AiSessionReviewStatus, string> = {
  pending: '待抽检',
  in_review: '抽检中',
  completed: '已完成',
};

export const reviewStatusColor: Record<API.AiSessionReviewStatus, string> = {
  pending: 'default',
  in_review: 'processing',
  completed: 'success',
};

export const conclusionText: Record<API.AiSessionReviewConclusion, string> = {
  normal: '正常',
  abnormal: '异常',
};

export const conclusionColor: Record<API.AiSessionReviewConclusion, string> = {
  normal: 'success',
  abnormal: 'error',
};

export const abnormalTypeOptions = [
  { label: '答案依赖', value: 'answer_dependency' },
  { label: '边界违规', value: 'boundary_violation' },
  { label: '错误引导', value: 'incorrect_guidance' },
  { label: '敏感内容', value: 'sensitive_content' },
  { label: '附件处理失败', value: 'attachment_policy_failure' },
  { label: '其它异常', value: 'other' },
];

export const abnormalTypeText = Object.fromEntries(
  abnormalTypeOptions.map((item) => [item.value, item.label]),
) as Record<API.AiSessionAbnormalType, string>;

export const abnormalSeverityOptions = [
  { label: 'P0', value: 'P0' },
  { label: 'P1', value: 'P1' },
  { label: 'P2', value: 'P2' },
];

export const sensitiveFieldOptions = [
  { label: '上下文片段', value: 'context_excerpt' },
  { label: '用户输入片段', value: 'user_input_excerpt' },
  { label: 'AI 回复片段', value: 'assistant_reply_excerpt' },
  { label: '附件摘要', value: 'attachment_summary' },
];

export const sensitiveFieldText = Object.fromEntries(
  sensitiveFieldOptions.map((item) => [item.value, item.label]),
) as Record<API.AiSessionSensitiveFieldKey, string>;

export const reviewStatusValueEnum = {
  pending: { text: reviewStatusText.pending },
  in_review: { text: reviewStatusText.in_review },
  completed: { text: reviewStatusText.completed },
};

export const conclusionValueEnum = {
  normal: { text: conclusionText.normal },
  abnormal: { text: conclusionText.abnormal },
};

export const compactTextStyle: React.CSSProperties = {
  ...textEllipsisStyle,
  lineHeight: '22px',
};
