import type React from 'react';

export const configTypeOptions = [
  { label: '意图分类', value: 'intent' },
  { label: 'Prompt 模板', value: 'prompt_template' },
  { label: '回答结构', value: 'response_structure' },
  { label: '防依赖规则', value: 'dependency_rule' },
  { label: '附件策略', value: 'attachment_policy' },
];

export const businessSceneOptions = [
  { label: '听力陪练', value: 'listening_coach' },
  { label: '口语陪练', value: 'speaking_coach' },
  { label: '写作讲解', value: 'writing_explanation' },
  { label: '错题讲解', value: 'error_explanation' },
  { label: '学习路径推荐', value: 'learning_path_recommendation' },
];

export const examTypeOptions = [
  { label: '四级', value: 'CET4' },
  { label: '六级', value: 'CET6' },
];

export const riskLevelOptions = [
  { label: '低风险', value: 'low' },
  { label: '中风险', value: 'medium' },
  { label: '高风险', value: 'high' },
];

export const configTypeText = Object.fromEntries(
  configTypeOptions.map((item) => [item.value, item.label]),
) as Record<API.AiCoachConfigType, string>;

export const businessSceneText = Object.fromEntries(
  businessSceneOptions.map((item) => [item.value, item.label]),
) as Record<API.AiCoachBusinessScene, string>;

export const riskLevelText: Record<API.AiCoachRiskLevel, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
};

export const riskLevelColor: Record<API.AiCoachRiskLevel, string> = {
  low: 'green',
  medium: 'orange',
  high: 'red',
};

export const precheckLevelText: Record<API.AiCoachPrecheckLevel, string> = {
  passed: '通过',
  warning: '警告',
  error: '阻断',
};

export const precheckLevelColor: Record<API.AiCoachPrecheckLevel, string> = {
  passed: 'success',
  warning: 'warning',
  error: 'error',
};

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

export const editableStatuses: API.AiCoachStrategyStatus[] = ['draft', 'rejected'];

export const textEllipsisStyle: React.CSSProperties = {
  display: 'block',
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export const defaultRiskPolicy: API.AiCoachRiskPolicy = {
  dependencyPrevention: true,
  answerBoundary: '不直接代写、代答或替用户完成整篇输出，优先解释思路和下一步。',
  sensitivePolicy: '遇到隐私、作弊、代写诉求时拒绝并给出学习建议。',
  fallbackStrategy: '信息不足时追问一个澄清问题，或给出可执行的学习步骤。',
  escalationRule: '连续两次兜底后提示用户回到今日任务。',
  highRiskKeywords: ['直接答案'],
};

export const defaultBodyByType = (
  configType: API.AiCoachConfigType,
): API.AiCoachStrategySaveParams['body'] => {
  if (configType === 'intent') {
    return {
      intentKey: 'intent_custom',
      description: '识别用户当前学习诉求，并输出稳定意图标签。',
      triggerExamples: ['我想听力跟练', '这题为什么错了'],
      outputIntent: 'learning_help',
      confidenceThreshold: 0.72,
    };
  }
  if (configType === 'prompt_template') {
    return {
      systemRole: '过级搭子学习陪练',
      promptBody:
        '根据 {{examType}}、{{weakModule}} 和 {{userQuestion}} 生成分步讲解。不直接代写完整答案，先解释判断依据，再给下一步练习建议。',
      variables: [
        {
          name: 'examType',
          type: 'string',
          required: true,
          description: '考试类型',
          exampleValue: 'CET4',
        },
        {
          name: 'weakModule',
          type: 'string',
          required: true,
          description: '薄弱模块',
          exampleValue: 'listening',
        },
        {
          name: 'userQuestion',
          type: 'string',
          required: true,
          description: '用户问题摘要',
          exampleValue: '这道听力题为什么选 B',
        },
      ],
      styleRules: ['语气低压力', '先解释原因', '不直接给整篇代写'],
    };
  }
  if (configType === 'response_structure') {
    return {
      schemaName: 'coach_response',
      sections: [
        { key: 'diagnosis', title: '问题判断', required: true, description: '概括用户问题' },
        { key: 'steps', title: '处理步骤', required: true, description: '给出可执行步骤' },
        { key: 'nextTask', title: '下一步任务', required: true, description: '回到学习闭环' },
      ],
      outputExample: '{"diagnosis":"定位错误原因","steps":["先复看题干"],"nextTask":"完成 3 道同类题"}',
    };
  }
  if (configType === 'attachment_policy') {
    return {
      rules: [
        {
          id: 'attachment-rule-image',
          attachmentType: 'image',
          allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
          maxSizeMb: 10,
          recognitionMode: 'image_ocr',
          enabled: true,
        },
      ],
      failureMessages: {
        unsupportedType: '暂不支持该附件类型，请更换后重试。',
        sizeExceeded: '附件超过大小限制，请压缩后重试。',
        recognitionFailed: '附件识别失败，请检查内容清晰度后重试。',
      },
    };
  }
  return {
    dependencySignals: ['反复索要直接答案', '要求代写全文', '跳过练习步骤'],
    interventionMessage: '我可以帮你拆解思路，但不能替你直接完成。先从第一步判断依据开始。',
    maxConsecutiveAnswers: 2,
    cooldownMinutes: 15,
  };
};

export const defaultStrategyFormValues: API.AiCoachStrategySaveParams = {
  title: '',
  description: '',
  configType: 'prompt_template',
  businessScenes: ['error_explanation'],
  examTypes: ['CET4', 'CET6'],
  body: defaultBodyByType('prompt_template'),
  riskPolicy: defaultRiskPolicy,
  validationCases: [
    {
      id: 'case-basic',
      title: '配置校验通过',
      input: '用户询问今天听力怎么练。',
      expected: '返回结构化学习步骤。',
    },
    {
      id: 'case-boundary',
      title: '风险规则命中',
      input: '用户要求直接给答案。',
      expected: '触发边界提示。',
    },
  ],
  changeSummary: '',
  impactScope: '当前为草稿，不影响线上策略。',
};
