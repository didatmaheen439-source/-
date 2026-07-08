import type React from 'react';

export const topicTypeOptions = [
  { label: '写作题目', value: 'writing' },
  { label: '翻译题目', value: 'translation' },
];

export const examTypeOptions = [
  { label: '四级', value: 'CET4' },
  { label: '六级', value: 'CET6' },
];

export const difficultyOptions = [
  { label: '基础', value: 'easy' },
  { label: '中等', value: 'medium' },
  { label: '较难', value: 'hard' },
];

export const riskLevelOptions = [
  { label: '低风险', value: 'low' },
  { label: '中风险', value: 'medium' },
  { label: '高风险', value: 'high' },
];

export const genreOptions = [
  { label: '议论文', value: 'argumentative' },
  { label: '图表作文', value: 'chart' },
  { label: '书信', value: 'letter' },
  { label: '通知', value: 'notice' },
  { label: '海报', value: 'poster' },
];

export const topicTypeText = Object.fromEntries(
  topicTypeOptions.map((item) => [item.value, item.label]),
) as Record<API.WritingTranslationTopicType, string>;

export const difficultyText: Record<API.WritingTranslationDifficulty, string> = {
  easy: '基础',
  medium: '中等',
  hard: '较难',
};

export const riskLevelText: Record<API.WritingTranslationRiskLevel, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
};

export const riskLevelColor: Record<API.WritingTranslationRiskLevel, string> = {
  low: 'green',
  medium: 'orange',
  high: 'red',
};

export const precheckLevelText: Record<API.WritingTranslationPrecheckLevel, string> = {
  passed: '通过',
  warning: '警告',
  error: '阻断',
};

export const precheckLevelColor: Record<API.WritingTranslationPrecheckLevel, string> = {
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

export const editableStatuses: API.WritingTranslationStatus[] = ['draft', 'rejected'];

export const textEllipsisStyle: React.CSSProperties = {
  display: 'block',
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const bandNotes = (maxScore: number): API.ScoringBand[] => [
  {
    name: '优秀',
    minScore: Math.round(maxScore * 0.85),
    maxScore,
    description: '完成度高，问题少。',
    criteria: ['要点完整', '表达清楚'],
  },
  {
    name: '良好',
    minScore: Math.round(maxScore * 0.7),
    maxScore: Math.round(maxScore * 0.85) - 1,
    description: '基本达标，有少量问题。',
    criteria: ['主要要点齐全'],
  },
  {
    name: '合格',
    minScore: Math.round(maxScore * 0.55),
    maxScore: Math.round(maxScore * 0.7) - 1,
    description: '达到最低要求。',
    criteria: ['保留核心信息'],
  },
  {
    name: '待提升',
    minScore: 0,
    maxScore: Math.round(maxScore * 0.55) - 1,
    description: '存在明显缺失。',
    criteria: ['需要重点修改'],
  },
];

const errorRule = (
  code: string,
  name: string,
  topicType: API.WritingTranslationTopicType,
  dimensionKey: string,
  severity: API.CorrectionErrorRule['severity'],
  maxDeduction: number,
): API.CorrectionErrorRule => ({
  code,
  name,
  topicType,
  severity,
  description: `${name} 时按规则扣分。`,
  suggestedDeduction: Math.max(1, Math.round(maxDeduction / 2)),
  repeatable: true,
  maxDeduction,
  dimensionKey,
  revisionSuggestionTemplate: `指出${name}位置并给出修改方向。`,
});

export const defaultWritingDimensions = (): API.ScoringDimension[] => [
  {
    key: 'content',
    name: '内容完整性',
    description: '覆盖题目要求、观点和支撑信息。',
    weight: 40,
    maxScore: 20,
    order: 1,
    required: true,
    bandNotes: bandNotes(20),
    deductionRules: [errorRule('WR_MISSING_CONTENT', '内容缺失', 'writing', 'content', 'major', 8)],
    bonusRules: ['要点完整且有支撑时可给高分。'],
  },
  {
    key: 'language',
    name: '语言准确性',
    description: '检查语法、拼写、搭配和句式。',
    weight: 35,
    maxScore: 18,
    order: 2,
    required: true,
    bandNotes: bandNotes(18),
    deductionRules: [errorRule('WR_GRAMMAR', '语法错误', 'writing', 'language', 'medium', 6)],
    bonusRules: ['表达自然且错误少时可给高分。'],
  },
  {
    key: 'structure',
    name: '结构与逻辑',
    description: '检查段落组织、衔接和逻辑推进。',
    weight: 25,
    maxScore: 12,
    order: 3,
    required: true,
    bandNotes: bandNotes(12),
    deductionRules: [errorRule('WR_LOGIC', '结构混乱', 'writing', 'structure', 'major', 5)],
    bonusRules: ['结构清晰且衔接自然时可给高分。'],
  },
];

export const defaultTranslationDimensions = (): API.ScoringDimension[] => [
  {
    key: 'accuracy',
    name: '信息准确性',
    description: '检查源文核心信息是否准确译出。',
    weight: 40,
    maxScore: 20,
    order: 1,
    required: true,
    bandNotes: bandNotes(20),
    deductionRules: [errorRule('TR_MISTRANSLATION', '错译', 'translation', 'accuracy', 'critical', 8)],
    bonusRules: ['核心信息准确且表达自然时可给高分。'],
  },
  {
    key: 'completeness',
    name: '信息完整性',
    description: '检查是否漏译关键句和必要信息。',
    weight: 35,
    maxScore: 18,
    order: 2,
    required: true,
    bandNotes: bandNotes(18),
    deductionRules: [errorRule('TR_OMISSION', '漏译', 'translation', 'completeness', 'major', 7)],
    bonusRules: ['完整保留源文信息。'],
  },
  {
    key: 'fluency',
    name: '语言通顺度',
    description: '检查英文表达是否通顺连贯。',
    weight: 25,
    maxScore: 12,
    order: 3,
    required: true,
    bandNotes: bandNotes(12),
    deductionRules: [errorRule('TR_CHINGLISH', '中式英语', 'translation', 'fluency', 'medium', 5)],
    bonusRules: ['译文自然流畅时可给高分。'],
  },
];

export const defaultCorrectionRule = (
  topicType: API.WritingTranslationTopicType,
): API.CorrectionRuleSet => ({
  feedbackStructure: ['总体评价', '分维度评价', '主要问题', '修改建议', '二次修改引导'],
  overallScoringGuide: '先判断任务完成度，再按维度给出可追溯扣分依据。',
  deductionRules:
    topicType === 'writing'
      ? [
          errorRule('WR_OFF_TOPIC', '偏题', 'writing', 'content', 'critical', 12),
          errorRule('WR_BLANK', '空白答案', 'writing', 'content', 'critical', 20),
          errorRule('WR_TEMPLATE_ABUSE', '疑似机械套模板', 'writing', 'structure', 'major', 8),
        ]
      : [
          errorRule('TR_OMISSION', '漏译', 'translation', 'completeness', 'major', 8),
          errorRule('TR_MISTRANSLATION', '错译', 'translation', 'accuracy', 'critical', 10),
          errorRule('TR_KEYWORD', '关键词错误', 'translation', 'accuracy', 'major', 6),
        ],
  bonusRules: ['表达自然且符合任务要求时可在对应维度内加分。'],
  severityRules: ['critical 触发人工复核条件', 'major 需要明确指出修改方向'],
  blankAnswerRule: '空白或无效输入按最低档处理。',
  offTopicRule: '明显偏题时内容维度不得高于合格档。',
  insufficientInformationRule: '信息不足时提示补充必要内容，不直接生成完整答案。',
  templateAbuseRule: '疑似机械套模板时扣结构与内容分。',
  sensitiveContentRule: '敏感或作弊诉求触发拒绝和人工复核。',
  uncertainResultRule: '规则无法判断时标记人工复核条件命中。',
  manualReviewConditions: ['critical 错误', '多维度严重扣分', 'AI 引用失效'],
  revisionHint: '优先给出一条最小修改建议，再引导用户二次修改。',
  fallbackMessage: '当前配置无法稳定判断，请转人工复核。',
});

export const defaultTopicFormValues = (
  topicType: API.WritingTranslationTopicType,
): API.WritingTranslationTopicSaveParams => ({
  topicType,
  name: '',
  description: '',
  examType: 'CET4',
  difficulty: 'medium',
  totalScore: 50,
  riskLevel: 'medium',
  tags: topicType === 'writing' ? ['写作'] : ['翻译'],
  referencePoints: topicType === 'writing' ? ['回应题目要求'] : ['核心信息完整'],
  scoringDimensions:
    topicType === 'writing'
      ? defaultWritingDimensions()
      : defaultTranslationDimensions(),
  correctionRule: defaultCorrectionRule(topicType),
  aiStrategyRefs: [],
  changeSummary: '',
  internalRemark: '',
  prompt: topicType === 'writing' ? '' : undefined,
  topicDirection: '',
  genre: topicType === 'writing' ? 'argumentative' : undefined,
  minWords: topicType === 'writing' ? 120 : undefined,
  maxWords: topicType === 'writing' ? 180 : undefined,
  suggestedMinutes: topicType === 'writing' ? 30 : 25,
  writingRequirements: topicType === 'writing' ? ['观点明确', '结构清晰'] : undefined,
  outlinePoints: topicType === 'writing' ? ['提出观点', '解释原因'] : undefined,
  sourceText: topicType === 'translation' ? '' : undefined,
  sourceLanguage: topicType === 'translation' ? 'zh-CN' : undefined,
  targetLanguage: topicType === 'translation' ? 'en' : undefined,
  translationDirection: topicType === 'translation' ? 'zh-CN_to_en' : undefined,
  referenceTranslation: topicType === 'translation' ? '' : undefined,
  keywords: topicType === 'translation' ? [] : undefined,
  fixedExpressions: topicType === 'translation' ? [] : undefined,
  acceptableExpressions: topicType === 'translation' ? [] : undefined,
  commonMistranslations: topicType === 'translation' ? [] : undefined,
});

export const aiUsageOptions = [
  { label: '评分 Prompt', value: 'scoring_prompt' },
  { label: '反馈结构', value: 'feedback_structure' },
  { label: '防依赖规则', value: 'dependency_guard' },
  { label: '意图提示', value: 'intent_hint' },
];
