import { roleConfigs } from '../src/foundation/permissions';
import type { AdminRoleId } from '../src/foundation/permissions';
import {
  aiCoachBusinessSceneLabels,
  aiCoachConfigTypeLabels,
  aiCoachStrategiesData,
} from './aiCoachStore';
import { nowText } from './auditStore';

export type WritingTranslationOperator = {
  id: string;
  name: string;
  roleId: AdminRoleId;
  roleName: string;
};

export const writingTranslationTopicTypeLabels: Record<API.WritingTranslationTopicType, string> = {
  writing: '写作题目',
  translation: '翻译题目',
};

export const writingTranslationDifficultyLabels: Record<API.WritingTranslationDifficulty, string> = {
  easy: '基础',
  medium: '中等',
  hard: '较难',
};

export const writingTranslationRiskLevelLabels: Record<API.WritingTranslationRiskLevel, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
};

const reviewStatusActionMap: Record<API.ReviewTaskStatus, string> = {
  draft: '保存草稿',
  pending_review: '提交审核',
  rejected: '驳回',
  approved: '审核通过',
  pending_publish: '安排发布',
  published: '发布',
  offline: '下架',
  rolled_back: '回滚',
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const splitLines = (value?: string | string[]) => {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value ?? '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
};

const normalizeTags = (tags?: string[] | string) => {
  if (Array.isArray(tags)) return tags.map((item) => String(item).trim()).filter(Boolean).slice(0, 8);
  return String(tags ?? '')
    .split(/[,\n，]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
};

export const operatorFromWritingTranslationRole = (
  roleId: AdminRoleId,
  accountId?: string,
  accountName?: string,
): WritingTranslationOperator => ({
  id: accountId || roleId,
  name: accountName || roleConfigs[roleId].name,
  roleId,
  roleName: roleConfigs[roleId].name,
});

const defaultBands = (maxScore: number): API.ScoringBand[] => [
  {
    name: '优秀',
    minScore: Math.round(maxScore * 0.85),
    maxScore,
    description: '表现完整，问题较少。',
    criteria: ['要点完整', '表达清楚'],
  },
  {
    name: '良好',
    minScore: Math.round(maxScore * 0.7),
    maxScore: Math.round(maxScore * 0.85) - 1,
    description: '整体达标，有少量问题。',
    criteria: ['主要要点齐全', '存在局部表达问题'],
  },
  {
    name: '合格',
    minScore: Math.round(maxScore * 0.55),
    maxScore: Math.round(maxScore * 0.7) - 1,
    description: '完成基本要求。',
    criteria: ['保留核心信息', '问题可定位'],
  },
  {
    name: '待提升',
    minScore: 0,
    maxScore: Math.round(maxScore * 0.55) - 1,
    description: '存在较多缺失或错误。',
    criteria: ['要点不足', '需要重点修改'],
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
  description: `${name} 时按维度扣分并给出修改建议。`,
  suggestedDeduction: Math.max(1, Math.round(maxDeduction / 2)),
  repeatable: true,
  maxDeduction,
  dimensionKey,
  revisionSuggestionTemplate: `定位${name}位置，说明原因并给出一条修改方向。`,
});

const writingDimensions = (options?: {
  badWeight?: boolean;
  badMax?: boolean;
  bandConflict?: boolean;
}): API.ScoringDimension[] => {
  const weights = options?.badWeight ? [50, 30, 10] : [40, 35, 25];
  const maxScores = options?.badMax ? [18, 14, 10] : [20, 18, 12];
  const bands = options?.bandConflict
    ? [
        { name: '优秀', minScore: 15, maxScore: 20, description: '高分段。', criteria: ['完整'] },
        { name: '良好', minScore: 12, maxScore: 18, description: '存在重叠。', criteria: ['部分重叠'] },
      ]
    : undefined;
  return [
    {
      key: 'content',
      name: '内容完整性',
      description: '覆盖题目要求、观点和关键支撑信息。',
      weight: weights[0],
      maxScore: maxScores[0],
      order: 1,
      required: true,
      bandNotes: bands ?? defaultBands(maxScores[0]),
      deductionRules: [errorRule('WR_MISSING_CONTENT', '内容缺失', 'writing', 'content', 'major', 8)],
      bonusRules: ['观点完整且支撑充分时可在本维度上限内给满分。'],
    },
    {
      key: 'language',
      name: '语言准确性',
      description: '检查语法、拼写、搭配和句式准确性。',
      weight: weights[1],
      maxScore: maxScores[1],
      order: 2,
      required: true,
      bandNotes: defaultBands(maxScores[1]),
      deductionRules: [errorRule('WR_GRAMMAR', '语法错误', 'writing', 'language', 'medium', 6)],
      bonusRules: ['表达自然且错误少时可获得高分。'],
    },
    {
      key: 'structure',
      name: '结构与逻辑',
      description: '检查段落结构、衔接和逻辑推进。',
      weight: weights[2],
      maxScore: maxScores[2],
      order: 3,
      required: true,
      bandNotes: defaultBands(maxScores[2]),
      deductionRules: [errorRule('WR_LOGIC', '结构混乱', 'writing', 'structure', 'major', 5)],
      bonusRules: ['结构清晰且衔接自然时可获得高分。'],
    },
  ];
};

const translationDimensions = (options?: {
  badWeight?: boolean;
  badMax?: boolean;
  bandConflict?: boolean;
}): API.ScoringDimension[] => {
  const weights = options?.badWeight ? [45, 20, 20] : [40, 35, 25];
  const maxScores = options?.badMax ? [16, 15, 10] : [20, 18, 12];
  return [
    {
      key: 'accuracy',
      name: '信息准确性',
      description: '检查源文核心信息是否准确译出。',
      weight: weights[0],
      maxScore: maxScores[0],
      order: 1,
      required: true,
      bandNotes: options?.bandConflict
        ? [
            { name: '优秀', minScore: 15, maxScore: 20, description: '高分段。', criteria: ['准确'] },
            { name: '良好', minScore: 14, maxScore: 18, description: '存在重叠。', criteria: ['部分准确'] },
          ]
        : defaultBands(maxScores[0]),
      deductionRules: [errorRule('TR_MISTRANSLATION', '错译', 'translation', 'accuracy', 'critical', 8)],
      bonusRules: ['核心信息准确且表达自然时可获得高分。'],
    },
    {
      key: 'completeness',
      name: '信息完整性',
      description: '检查是否漏译关键句和必要修饰信息。',
      weight: weights[1],
      maxScore: maxScores[1],
      order: 2,
      required: true,
      bandNotes: defaultBands(maxScores[1]),
      deductionRules: [errorRule('TR_OMISSION', '漏译', 'translation', 'completeness', 'major', 7)],
      bonusRules: ['完整保留源文结构和关键信息。'],
    },
    {
      key: 'fluency',
      name: '语言通顺度',
      description: '检查英文表达是否通顺、连贯。',
      weight: weights[2],
      maxScore: maxScores[2],
      order: 3,
      required: true,
      bandNotes: defaultBands(maxScores[2]),
      deductionRules: [errorRule('TR_CHINGLISH', '中式英语', 'translation', 'fluency', 'medium', 5)],
      bonusRules: ['译文自然流畅时可获得高分。'],
    },
  ];
};

const correctionRuleSet = (
  topicType: API.WritingTranslationTopicType,
  options?: {
    missingOffTopic?: boolean;
    missingOmission?: boolean;
    missingMistranslation?: boolean;
  },
): API.CorrectionRuleSet => {
  const deductionRules =
    topicType === 'writing'
      ? [
          errorRule('WR_OFF_TOPIC', '偏题', 'writing', 'content', 'critical', 12),
          errorRule('WR_BLANK', '空白答案', 'writing', 'content', 'critical', 20),
          errorRule('WR_TEMPLATE_ABUSE', '疑似机械套模板', 'writing', 'structure', 'major', 8),
          errorRule('WR_WORDS_SHORT', '字数不足', 'writing', 'content', 'major', 6),
        ].filter((item) => !(options?.missingOffTopic && item.code === 'WR_OFF_TOPIC'))
      : [
          errorRule('TR_OMISSION', '漏译', 'translation', 'completeness', 'major', 8),
          errorRule('TR_MISTRANSLATION', '错译', 'translation', 'accuracy', 'critical', 10),
          errorRule('TR_KEYWORD', '关键词错误', 'translation', 'accuracy', 'major', 6),
          errorRule('TR_FIXED_EXPRESSION', '固定搭配错误', 'translation', 'fluency', 'medium', 5),
        ].filter(
          (item) =>
            !(options?.missingOmission && item.code === 'TR_OMISSION') &&
            !(options?.missingMistranslation && item.code === 'TR_MISTRANSLATION'),
        );
  return {
    feedbackStructure: ['总体评价', '分维度评价', '主要问题', '修改建议', '二次修改引导'],
    overallScoringGuide: '先判断是否完成任务，再按维度给出可追溯扣分依据。',
    deductionRules,
    bonusRules: ['表达自然且符合任务要求时可在对应维度内加分。'],
    severityRules: ['critical 触发人工复核条件', 'major 需要明确指出修改方向'],
    blankAnswerRule: '空白或无效输入按最低档处理。',
    offTopicRule: topicType === 'writing' && options?.missingOffTopic ? '' : '明显偏题时内容维度不得高于合格档。',
    insufficientInformationRule: '信息不足时提示补充必要内容，不直接生成完整答案。',
    templateAbuseRule: '疑似机械套模板时扣结构与内容分，并提示改为围绕题目展开。',
    sensitiveContentRule: '敏感或作弊诉求触发拒绝和人工复核。',
    uncertainResultRule: '规则无法判断时标记人工复核条件命中。',
    manualReviewConditions: ['critical 错误', '多维度严重扣分', 'AI 引用失效'],
    revisionHint: '优先给出一条最小修改建议，再引导用户二次修改。',
    fallbackMessage: '当前配置无法稳定判断，请转人工复核。',
  };
};

const bindAiStrategy = (
  strategyId: string,
  usage: API.WritingTranslationAiStrategyReference['usage'],
  required = true,
): API.WritingTranslationAiStrategyReference => {
  const strategy = aiCoachStrategiesData.find((item) => item.id === strategyId);
  return {
    strategyId,
    strategyTitle: strategy?.title ?? strategyId,
    strategyVersion: strategy?.version ?? 'V0.0',
    releaseVersionId: strategy?.publishedVersion ?? strategy?.version ?? 'missing',
    configType: strategy?.configType ?? 'prompt_template',
    businessScene: 'writing_explanation',
    usage,
    required,
    statusAtBinding: strategy?.status ?? 'offline',
    boundAt: '2026-07-08 09:00:00',
  };
};

const validAiRefs = () => [
  bindAiStrategy('ai-prompt-writing-v04', 'scoring_prompt'),
  bindAiStrategy('ai-structure-writing-v10', 'feedback_structure'),
  bindAiStrategy('ai-dependency-writing-v02', 'dependency_guard'),
];

const topicSnapshot = (
  topic: API.WritingTranslationTopic,
  currentOnline = topic.status === 'published',
): API.WritingTranslationTopicVersion => ({
  id: `wt-version-${topic.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  topicId: topic.id,
  topicType: topic.topicType,
  version: topic.version,
  status: topic.status,
  createdBy: topic.updatedBy,
  createdAt: topic.updatedAt,
  changeSummary: topic.changeSummary,
  currentOnline,
  snapshot: clone(topic) as any,
});

const buildWritingTopic = (params: {
  id: string;
  name: string;
  status: API.WritingTranslationStatus;
  version: string;
  examType: API.ExamType;
  difficulty: API.WritingTranslationDifficulty;
  riskLevel?: API.WritingTranslationRiskLevel;
  updatedAt: string;
  reviewTaskId?: string;
  invalid?: 'weight' | 'max_score' | 'band' | 'word_range' | 'off_topic' | 'ai_invalid' | 'no_ai';
}): API.WritingTopic => {
  const now = params.updatedAt;
  const topic: API.WritingTopic = {
    id: params.id,
    topicType: 'writing',
    name: params.name,
    description: '虚构写作题目配置，用于后台 MVP 验证。',
    examType: params.examType,
    difficulty: params.difficulty,
    tags: ['写作', params.examType === 'CET4' ? '四级' : '六级'],
    totalScore: 50,
    riskLevel: params.riskLevel ?? 'medium',
    referencePoints: ['回应题目要求', '给出清晰观点', '提供支撑理由'],
    scoringDimensions: writingDimensions({
      badWeight: params.invalid === 'weight',
      badMax: params.invalid === 'max_score',
      bandConflict: params.invalid === 'band',
    }),
    correctionRule: correctionRuleSet('writing', { missingOffTopic: params.invalid === 'off_topic' }),
    aiStrategyRefs:
      params.invalid === 'no_ai'
        ? []
        : params.invalid === 'ai_invalid'
          ? [bindAiStrategy('ai-prompt-writing-missing', 'scoring_prompt')]
          : validAiRefs(),
    status: params.status,
    version: params.version,
    dataVersion: 1,
    createdBy: '内容运营',
    createdById: 'content_operator',
    createdAt: '2026-07-08 09:00:00',
    updatedBy: params.status === 'approved' ? '教研审核' : '内容运营',
    updatedById: params.status === 'approved' ? 'teaching_reviewer' : 'content_operator',
    updatedAt: now,
    reviewTaskId: params.reviewTaskId,
    releaseVersionId: params.status === 'published' ? params.version : undefined,
    changeSummary: '维护写作题目、评分维度和批改规则。',
    internalRemark: 'Mock 数据，未接真实批改模型。',
    prompt: '请围绕日常学习计划与自我管理写一篇短文，说明你的观点并给出理由。',
    topicDirection: '学习计划',
    genre: 'argumentative',
    minWords: params.invalid === 'word_range' ? 180 : 120,
    maxWords: params.invalid === 'word_range' ? 120 : 180,
    suggestedMinutes: 30,
    writingRequirements: ['观点明确', '结构清晰', '不少于最低字数'],
    outlinePoints: ['提出观点', '解释原因', '给出行动建议'],
    sampleAnswerSummary: '范文摘要仅用于配置说明，不保存真实学生作文。',
    templateUsageWarning: '避免机械套用模板。',
    versionRecords: [],
    operationRecords: [
      {
        id: `wt-op-${params.id}-init`,
        operator: '内容运营',
        roleName: '内容运营',
        action: '保存草稿',
        toStatus: params.status,
        reason: '初始化写作题目配置。',
        time: now,
      },
    ],
  };
  topic.versionRecords = [topicSnapshot(topic, params.status === 'published')];
  return topic;
};

const buildTranslationTopic = (params: {
  id: string;
  name: string;
  status: API.WritingTranslationStatus;
  version: string;
  examType: API.ExamType;
  difficulty: API.WritingTranslationDifficulty;
  riskLevel?: API.WritingTranslationRiskLevel;
  updatedAt: string;
  reviewTaskId?: string;
  invalid?: 'reference' | 'omission' | 'mistranslation' | 'ai_invalid' | 'no_ai' | 'band';
}): API.TranslationTopic => {
  const now = params.updatedAt;
  const topic: API.TranslationTopic = {
    id: params.id,
    topicType: 'translation',
    name: params.name,
    description: '虚构翻译题目配置，用于后台 MVP 验证。',
    examType: params.examType,
    difficulty: params.difficulty,
    tags: ['翻译', params.examType === 'CET4' ? '四级' : '六级'],
    totalScore: 50,
    riskLevel: params.riskLevel ?? 'medium',
    referencePoints: ['核心信息完整', '关键词准确', '英文表达通顺'],
    scoringDimensions: translationDimensions({ bandConflict: params.invalid === 'band' }),
    correctionRule: correctionRuleSet('translation', {
      missingOmission: params.invalid === 'omission',
      missingMistranslation: params.invalid === 'mistranslation',
    }),
    aiStrategyRefs:
      params.invalid === 'no_ai'
        ? []
        : params.invalid === 'ai_invalid'
          ? [bindAiStrategy('ai-dependency-global-v11', 'dependency_guard')]
          : validAiRefs(),
    status: params.status,
    version: params.version,
    dataVersion: 1,
    createdBy: '内容运营',
    createdById: 'content_operator',
    createdAt: '2026-07-08 09:10:00',
    updatedBy: params.status === 'approved' ? '教研审核' : '内容运营',
    updatedById: params.status === 'approved' ? 'teaching_reviewer' : 'content_operator',
    updatedAt: now,
    reviewTaskId: params.reviewTaskId,
    releaseVersionId: params.status === 'published' ? params.version : undefined,
    changeSummary: '维护翻译题目、评分维度和批改规则。',
    internalRemark: '翻译场景 MVP 暂时复用 writing_explanation AI 策略。',
    sourceText: '中国传统节日体现了家庭团聚和文化传承的重要意义。',
    sourceLanguage: 'zh-CN',
    targetLanguage: 'en',
    translationDirection: 'zh-CN_to_en',
    topicDirection: '传统文化',
    referenceTranslation:
      params.invalid === 'reference'
        ? ''
        : 'Traditional Chinese festivals reflect the importance of family reunion and cultural inheritance.',
    keywords: ['traditional festivals', 'family reunion', 'cultural inheritance'],
    fixedExpressions: ['reflect the importance of', 'cultural inheritance'],
    acceptableExpressions: ['cultural heritage'],
    commonMistranslations: ['culture pass down'],
    suggestedMinutes: 25,
    versionRecords: [],
    operationRecords: [
      {
        id: `wt-op-${params.id}-init`,
        operator: '内容运营',
        roleName: '内容运营',
        action: '保存草稿',
        toStatus: params.status,
        reason: '初始化翻译题目配置。',
        time: now,
      },
    ],
  };
  topic.versionRecords = [topicSnapshot(topic, params.status === 'published')];
  return topic;
};

const initialWritingTranslationTopicsData: API.WritingTranslationTopic[] = [
  buildWritingTopic({
    id: 'writing-topic-cet4-202607',
    name: '四级写作题 2026-07',
    status: 'pending_publish',
    version: 'V1.0',
    examType: 'CET4',
    difficulty: 'medium',
    updatedAt: '2026-07-07 12:30:00',
    reviewTaskId: 'review-writing-001',
  }),
  buildWritingTopic({ id: 'writing-topic-cet6-draft', name: '六级图表写作草稿', status: 'draft', version: 'V0.2', examType: 'CET6', difficulty: 'hard', updatedAt: '2026-07-08 10:10:00' }),
  buildWritingTopic({ id: 'writing-topic-cet4-rejected', name: '四级书信写作已驳回', status: 'rejected', version: 'V0.8', examType: 'CET4', difficulty: 'easy', updatedAt: '2026-07-08 09:50:00' }),
  buildWritingTopic({ id: 'writing-topic-cet6-published', name: '六级议论文线上题', status: 'published', version: 'V1.2', examType: 'CET6', difficulty: 'medium', updatedAt: '2026-07-07 18:00:00' }),
  buildWritingTopic({ id: 'writing-topic-cet4-published', name: '四级短文写作线上题', status: 'published', version: 'V1.1', examType: 'CET4', difficulty: 'medium', updatedAt: '2026-07-07 17:50:00' }),
  buildWritingTopic({ id: 'writing-topic-weight-error', name: '写作权重错误样例', status: 'draft', version: 'V0.1', examType: 'CET4', difficulty: 'medium', updatedAt: '2026-07-08 10:20:00', invalid: 'weight' }),
  buildWritingTopic({ id: 'writing-topic-band-conflict', name: '写作分档冲突样例', status: 'draft', version: 'V0.1', examType: 'CET6', difficulty: 'hard', updatedAt: '2026-07-08 10:25:00', invalid: 'band' }),
  buildWritingTopic({ id: 'writing-topic-word-range-error', name: '写作字数范围错误样例', status: 'draft', version: 'V0.1', examType: 'CET4', difficulty: 'easy', updatedAt: '2026-07-08 10:30:00', invalid: 'word_range' }),
  buildWritingTopic({ id: 'writing-topic-offtopic-missing', name: '写作缺少偏题规则样例', status: 'draft', version: 'V0.1', examType: 'CET6', difficulty: 'medium', updatedAt: '2026-07-08 10:35:00', invalid: 'off_topic' }),
  buildTranslationTopic({ id: 'translation-topic-cet4-draft', name: '四级传统文化翻译草稿', status: 'draft', version: 'V0.1', examType: 'CET4', difficulty: 'medium', updatedAt: '2026-07-08 10:40:00' }),
  buildTranslationTopic({ id: 'translation-topic-cet6-pending', name: '六级社会发展翻译待审核', status: 'pending_review', version: 'V0.6', examType: 'CET6', difficulty: 'hard', updatedAt: '2026-07-08 10:45:00' }),
  buildTranslationTopic({ id: 'translation-topic-cet4-approved', name: '四级生活方式翻译已通过', status: 'approved', version: 'V0.9', examType: 'CET4', difficulty: 'easy', updatedAt: '2026-07-08 10:50:00' }),
  buildTranslationTopic({ id: 'translation-topic-cet6-published', name: '六级科技文化翻译线上题', status: 'published', version: 'V1.1', examType: 'CET6', difficulty: 'medium', updatedAt: '2026-07-07 17:30:00' }),
  buildTranslationTopic({ id: 'translation-topic-cet4-published', name: '四级传统文化翻译线上题', status: 'published', version: 'V1.0', examType: 'CET4', difficulty: 'medium', updatedAt: '2026-07-07 17:20:00' }),
  buildTranslationTopic({ id: 'translation-topic-cet4-offline', name: '四级已下架翻译题', status: 'offline', version: 'V1.0', examType: 'CET4', difficulty: 'medium', updatedAt: '2026-07-07 16:30:00' }),
  buildTranslationTopic({ id: 'translation-topic-reference-missing', name: '翻译缺少参考译文样例', status: 'draft', version: 'V0.1', examType: 'CET4', difficulty: 'medium', updatedAt: '2026-07-08 10:55:00', invalid: 'reference' }),
  buildTranslationTopic({ id: 'translation-topic-omission-missing', name: '翻译缺少漏译规则样例', status: 'draft', version: 'V0.1', examType: 'CET6', difficulty: 'hard', updatedAt: '2026-07-08 11:00:00', invalid: 'omission' }),
  buildTranslationTopic({ id: 'translation-topic-ai-invalid', name: '翻译 AI 引用失效样例', status: 'draft', version: 'V0.1', examType: 'CET6', difficulty: 'medium', updatedAt: '2026-07-08 11:05:00', invalid: 'ai_invalid' }),
  buildTranslationTopic({ id: 'translation-topic-no-ai-warning', name: '翻译无 AI 引用警告样例', status: 'draft', version: 'V0.1', examType: 'CET4', difficulty: 'easy', updatedAt: '2026-07-08 11:10:00', invalid: 'no_ai' }),
];

const globalWritingTranslationStore = globalThis as typeof globalThis & {
  __GUOJI_ADMIN_WRITING_TRANSLATION_TOPICS__?: API.WritingTranslationTopic[];
};

if (!globalWritingTranslationStore.__GUOJI_ADMIN_WRITING_TRANSLATION_TOPICS__) {
  globalWritingTranslationStore.__GUOJI_ADMIN_WRITING_TRANSLATION_TOPICS__ =
    initialWritingTranslationTopicsData;
}

export const writingTranslationTopicsData =
  globalWritingTranslationStore.__GUOJI_ADMIN_WRITING_TRANSLATION_TOPICS__;

export const isWritingTranslationReviewTask = (task: API.ReviewTask) =>
  task.objectType === 'writing_translation';

export const getWritingTranslationTopic = (id: string) =>
  writingTranslationTopicsData.find((item) => item.id === id);

const topicText = (topic: API.WritingTranslationTopic) =>
  [
    topic.id,
    topic.name,
    topic.description,
    topic.tags.join(' '),
    topic.topicType === 'writing' ? topic.prompt : topic.sourceText,
  ]
    .join(' ')
    .toLowerCase();

export const filterWritingTranslationTopics = (
  query: API.WritingTranslationTopicQueryParams,
) => {
  const keyword = String(query.keyword ?? '').trim().toLowerCase();
  const updatedBy = String(query.updatedBy ?? '').trim();
  return [...writingTranslationTopicsData]
    .filter((item) => !query.topicType || item.topicType === query.topicType)
    .filter((item) => !query.examType || item.examType === query.examType)
    .filter((item) => !query.difficulty || item.difficulty === query.difficulty)
    .filter((item) => !query.status || item.status === query.status)
    .filter((item) => !query.riskLevel || item.riskLevel === query.riskLevel)
    .filter((item) => !query.tag || item.tags.includes(String(query.tag)))
    .filter((item) => !updatedBy || item.updatedBy.includes(updatedBy))
    .filter((item) => {
      if (!query.hasAiStrategy) return true;
      return query.hasAiStrategy === 'yes' ? item.aiStrategyRefs.length > 0 : item.aiStrategyRefs.length === 0;
    })
    .filter((item) => !keyword || topicText(item).includes(keyword))
    .sort((first, second) => {
      const timeDiff =
        new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime();
      return timeDiff || first.id.localeCompare(second.id);
    });
};

export const paginateWritingTranslationTopics = (
  data: API.WritingTranslationTopic[],
  query: API.WritingTranslationTopicQueryParams,
) => {
  const current = Number(query.current || 1);
  const pageSize = Number(query.pageSize || 20);
  const start = (current - 1) * pageSize;
  return {
    data: data.slice(start, start + pageSize),
    total: data.length,
    current,
    pageSize,
  };
};

const addIssue = (
  issues: API.WritingTranslationPrecheckIssue[],
  level: API.WritingTranslationPrecheckLevel,
  code: string,
  field: string,
  message: string,
  suggestion: string,
) => {
  issues.push({
    id: `${code}-${issues.length + 1}`,
    level,
    code,
    field,
    message,
    suggestion,
  });
};

const validateDimensions = (
  params: Pick<API.WritingTranslationTopicBase, 'scoringDimensions' | 'totalScore'>,
  issues: API.WritingTranslationPrecheckIssue[],
) => {
  const dimensions = params.scoringDimensions ?? [];
  if (dimensions.length < 2) {
    addIssue(issues, 'error', 'DIMENSION_TOO_FEW', 'scoringDimensions', '评分维度少于 2 项。', '至少配置 2 个评分维度。');
  }
  const keys = new Set<string>();
  const names = new Set<string>();
  const orders = new Set<number>();
  let weightSum = 0;
  let scoreSum = 0;
  dimensions.forEach((dimension, index) => {
    if (keys.has(dimension.key)) addIssue(issues, 'error', 'DIMENSION_KEY_DUPLICATED', `scoringDimensions.${index}.key`, '评分维度 key 重复。', '为每个维度设置唯一 key。');
    keys.add(dimension.key);
    if (names.has(dimension.name)) addIssue(issues, 'error', 'DIMENSION_NAME_DUPLICATED', `scoringDimensions.${index}.name`, '评分维度名称重复。', '为每个维度设置唯一名称。');
    names.add(dimension.name);
    if (orders.has(dimension.order)) addIssue(issues, 'error', 'DIMENSION_ORDER_DUPLICATED', `scoringDimensions.${index}.order`, '评分维度顺序重复。', '调整维度顺序号。');
    orders.add(dimension.order);
    if (dimension.weight <= 0) addIssue(issues, 'error', 'DIMENSION_WEIGHT_INVALID', `scoringDimensions.${index}.weight`, '评分维度权重必须大于 0。', '将权重调整为正数。');
    if (dimension.maxScore <= 0) addIssue(issues, 'error', 'DIMENSION_MAX_SCORE_INVALID', `scoringDimensions.${index}.maxScore`, '维度最高分必须大于 0。', '为维度设置有效最高分。');
    if (!dimension.description) addIssue(issues, 'error', 'DIMENSION_DESCRIPTION_EMPTY', `scoringDimensions.${index}.description`, '评分说明为空。', '补充该维度评分说明。');
    weightSum += Number(dimension.weight || 0);
    scoreSum += Number(dimension.maxScore || 0);
    const sortedBands = [...(dimension.bandNotes ?? [])].sort((a, b) => a.minScore - b.minScore);
    sortedBands.forEach((band, bandIndex) => {
      if (band.minScore > band.maxScore) addIssue(issues, 'error', 'BAND_RANGE_REVERSED', `scoringDimensions.${index}.bandNotes.${bandIndex}`, '分档最低分大于最高分。', '修正分档上下限。');
      const prev = sortedBands[bandIndex - 1];
      if (prev && band.minScore <= prev.maxScore) addIssue(issues, 'error', 'BAND_RANGE_OVERLAP', `scoringDimensions.${index}.bandNotes.${bandIndex}`, '分档范围冲突。', '调整分档边界，避免区间交叉。');
      if (prev && band.minScore > prev.maxScore + 1) addIssue(issues, 'warning', 'BAND_RANGE_GAP', `scoringDimensions.${index}.bandNotes.${bandIndex}`, '分档范围存在缺口。', '补齐相邻分档分数范围。');
    });
    dimension.deductionRules?.forEach((rule, ruleIndex) => {
      if (rule.maxDeduction > dimension.maxScore) addIssue(issues, 'error', 'DEDUCTION_EXCEEDS_DIMENSION', `scoringDimensions.${index}.deductionRules.${ruleIndex}`, '扣分上限超过当前维度最高分。', '降低扣分上限或提高维度最高分。');
    });
  });
  if (weightSum !== 100) {
    addIssue(issues, 'error', 'DIMENSION_WEIGHT_SUM_INVALID', 'scoringDimensions', '评分维度权重合计不等于 100%。', '调整各维度权重，使合计为 100%。');
  }
  if (scoreSum !== params.totalScore) {
    addIssue(issues, 'error', 'DIMENSION_MAX_SCORE_SUM_INVALID', 'scoringDimensions', '评分维度最高分合计不等于总分。', '调整维度最高分或题目总分。');
  }
};

const validateAiRefs = (
  topicType: API.WritingTranslationTopicType,
  examType: API.ExamType,
  riskLevel: API.WritingTranslationRiskLevel,
  refs: API.WritingTranslationAiStrategyReference[],
  issues: API.WritingTranslationPrecheckIssue[],
) => {
  if (!refs.length) {
    addIssue(issues, 'warning', 'AI_REFERENCE_EMPTY', 'aiStrategyRefs', '未关联 AI 批改策略。', '允许纯人工规则题目，提交审核前需确认该警告。');
    return;
  }
  refs.forEach((ref, index) => {
    const strategy = aiCoachStrategiesData.find((item) => item.id === ref.strategyId);
    if (!strategy) {
      addIssue(issues, 'error', 'AI_REFERENCE_MISSING', `aiStrategyRefs.${index}.strategyId`, 'AI 策略引用失效。', '重新选择已发布的 AI 策略版本。');
      return;
    }
    if (strategy.status !== 'published') addIssue(issues, 'error', 'AI_REFERENCE_NOT_PUBLISHED', `aiStrategyRefs.${index}.statusAtBinding`, 'AI 策略未发布或已下架。', '只能绑定已发布策略。');
    if (strategy.version !== ref.strategyVersion) addIssue(issues, 'error', 'AI_REFERENCE_VERSION_INVALID', `aiStrategyRefs.${index}.strategyVersion`, 'AI 策略版本不存在或已变化。', '重新绑定具体已发布版本。');
    if (!strategy.businessScenes.includes('writing_explanation')) addIssue(issues, 'error', 'AI_REFERENCE_SCENE_CONFLICT', `aiStrategyRefs.${index}.businessScene`, 'AI 策略业务场景不兼容。', topicType === 'translation' ? '翻译题目 MVP 暂时也只能绑定 writing_explanation 场景。' : '请选择 writing_explanation 场景策略。');
    if (!strategy.examTypes.includes(examType)) addIssue(issues, 'error', 'AI_REFERENCE_EXAM_CONFLICT', `aiStrategyRefs.${index}.examType`, 'AI 策略考试类型不兼容。', '选择覆盖当前考试类型的策略。');
  });
  if (!refs.some((item) => item.configType === 'prompt_template')) addIssue(issues, 'error', 'AI_PROMPT_REQUIRED', 'aiStrategyRefs', '缺少必需 Prompt。', '绑定一个已发布 Prompt 模板。');
  if (!refs.some((item) => item.configType === 'response_structure')) addIssue(issues, 'error', 'AI_RESPONSE_REQUIRED', 'aiStrategyRefs', '缺少必需回答结构。', '绑定一个已发布回答结构。');
  if (riskLevel === 'high' && !refs.some((item) => item.configType === 'dependency_rule')) addIssue(issues, 'error', 'AI_DEPENDENCY_REQUIRED', 'aiStrategyRefs', '高风险题目缺少防依赖规则。', '绑定一个已发布防依赖策略。');
};

export const buildWritingTranslationPrecheck = (
  topic: API.WritingTranslationTopic | API.WritingTranslationTopicSaveParams,
  topicId?: string,
): API.WritingTranslationPrecheckResult => {
  const issues: API.WritingTranslationPrecheckIssue[] = [];
  const base = topic as API.WritingTranslationTopic;
  if ('simulateFailure' in topic && topic.simulateFailure) {
    addIssue(issues, 'error', 'SIMULATED_FAILURE', 'simulateFailure', '模拟预校验失败。', '关闭失败模拟后重试。');
  }
  if (!base.name) addIssue(issues, 'error', 'NAME_EMPTY', 'name', '题目名称为空。', '填写题目名称。');
  if (!base.examType) addIssue(issues, 'error', 'EXAM_TYPE_EMPTY', 'examType', '考试类型为空。', '选择四级或六级。');
  if (!base.difficulty) addIssue(issues, 'error', 'DIFFICULTY_EMPTY', 'difficulty', '难度为空。', '选择题目难度。');
  if (!['writing', 'translation'].includes(base.topicType)) addIssue(issues, 'error', 'TOPIC_TYPE_INVALID', 'topicType', '题目类型无效。', '选择写作或翻译。');
  if ((base.tags ?? []).length > 8) addIssue(issues, 'warning', 'TAG_LIMIT', 'tags', '标签数量超过上限。', '保留不超过 8 个标签。');
  if (!base.referencePoints?.length) addIssue(issues, 'error', 'REFERENCE_POINTS_EMPTY', 'referencePoints', '参考要点为空。', '至少填写 1 条参考要点。');
  if (!Number.isFinite(base.totalScore) || base.totalScore <= 0) addIssue(issues, 'error', 'TOTAL_SCORE_INVALID', 'totalScore', '总分无效。', '设置大于 0 的总分。');
  if (!base.scoringDimensions?.length) addIssue(issues, 'error', 'DIMENSION_EMPTY', 'scoringDimensions', '评分维度为空。', '配置评分维度。');
  if (!base.correctionRule) addIssue(issues, 'error', 'CORRECTION_RULE_EMPTY', 'correctionRule', '批改规则为空。', '配置批改规则。');
  if (!base.riskLevel) addIssue(issues, 'error', 'RISK_LEVEL_EMPTY', 'riskLevel', '风险等级为空。', '选择风险等级。');
  if (base.scoringTemplateRef || base.feedbackTemplateRef) {
    if (!base.scoringTemplateRef || !base.feedbackTemplateRef) {
      addIssue(issues, 'error', 'TEMPLATE_REFERENCE_INCOMPLETE', 'templateReferences', '评分模板和反馈模板必须成对绑定。', '重新绑定两个已发布模板版本。');
    }
    [base.scoringTemplateRef, base.feedbackTemplateRef].filter(Boolean).forEach((ref, index) => {
      if (ref?.statusAtBinding !== 'published' || !ref.releaseVersionId || !ref.version) {
        addIssue(issues, 'error', 'TEMPLATE_REFERENCE_INVALID', `templateReferences.${index}`, '模板发布版本引用不完整。', '重新绑定已发布模板版本。');
      }
    });
  }
  validateDimensions(base, issues);
  if (base.topicType === 'writing') {
    const writing = base as API.WritingTopic;
    if (!writing.prompt) addIssue(issues, 'error', 'WRITING_PROMPT_EMPTY', 'prompt', '写作题干为空。', '填写写作题干。');
    if (!writing.writingRequirements?.length) addIssue(issues, 'error', 'WRITING_REQUIREMENTS_EMPTY', 'writingRequirements', '写作要求为空。', '补充写作要求。');
    if ((writing.minWords ?? 0) <= 0) addIssue(issues, 'error', 'WRITING_MIN_WORDS_INVALID', 'minWords', '最小字数必须大于 0。', '设置有效最小字数。');
    if ((writing.minWords ?? 0) >= (writing.maxWords ?? 0)) addIssue(issues, 'error', 'WRITING_WORD_RANGE_INVALID', 'minWords', '写作字数范围错误。', '确保最小字数小于最大字数。');
    if (!base.scoringDimensions.some((item) => item.name.includes('内容'))) addIssue(issues, 'error', 'WRITING_CONTENT_DIMENSION_MISSING', 'scoringDimensions', '缺少内容类评分维度。', '补充内容完整性等维度。');
    if (!base.scoringDimensions.some((item) => item.name.includes('语言') || item.name.includes('准确'))) addIssue(issues, 'error', 'WRITING_LANGUAGE_DIMENSION_MISSING', 'scoringDimensions', '缺少语言类评分维度。', '补充语言准确性维度。');
    if (!base.correctionRule.offTopicRule && !base.correctionRule.deductionRules.some((item) => item.code.includes('OFF_TOPIC') || item.name.includes('偏题'))) addIssue(issues, 'error', 'WRITING_OFF_TOPIC_RULE_MISSING', 'correctionRule.offTopicRule', '写作缺少偏题规则。', '补充偏题处理规则。');
    if (!base.correctionRule.blankAnswerRule) addIssue(issues, 'error', 'BLANK_RULE_MISSING', 'correctionRule.blankAnswerRule', '缺少空白答案规则。', '补充空白答案兜底规则。');
    if (writing.templateUsageWarning && !base.correctionRule.templateAbuseRule) addIssue(issues, 'warning', 'TEMPLATE_ABUSE_RULE_MISSING', 'correctionRule.templateAbuseRule', '疑似套模板但无处理规则。', '补充模板滥用处理规则。');
  }
  if (base.topicType === 'translation') {
    const translation = base as API.TranslationTopic;
    if (!translation.sourceText) addIssue(issues, 'error', 'TRANSLATION_SOURCE_EMPTY', 'sourceText', '中文原文为空。', '填写翻译原文。');
    if (!translation.referenceTranslation) addIssue(issues, 'error', 'TRANSLATION_REFERENCE_EMPTY', 'referenceTranslation', '翻译缺少参考译文。', '补充参考译文。');
    if (translation.translationDirection !== 'zh-CN_to_en') addIssue(issues, 'error', 'TRANSLATION_DIRECTION_UNSUPPORTED', 'translationDirection', '翻译方向不支持。', '本阶段仅支持 zh-CN → en。');
    if (!translation.keywords?.length) addIssue(issues, 'error', 'TRANSLATION_KEYWORDS_EMPTY', 'keywords', '关键词为空。', '补充关键词。');
    if (!base.scoringDimensions.some((item) => item.name.includes('准确'))) addIssue(issues, 'error', 'TRANSLATION_ACCURACY_DIMENSION_MISSING', 'scoringDimensions', '缺少准确性维度。', '补充信息准确性维度。');
    if (!base.scoringDimensions.some((item) => item.name.includes('完整'))) addIssue(issues, 'error', 'TRANSLATION_COMPLETENESS_DIMENSION_MISSING', 'scoringDimensions', '缺少完整性维度。', '补充信息完整性维度。');
    if (!base.correctionRule.deductionRules.some((item) => item.code.includes('OMISSION') || item.name.includes('漏译'))) addIssue(issues, 'error', 'TRANSLATION_OMISSION_RULE_MISSING', 'correctionRule.deductionRules', '翻译缺少漏译规则。', '补充漏译扣分规则。');
    if (!base.correctionRule.deductionRules.some((item) => item.code.includes('MISTRANSLATION') || item.name.includes('错译'))) addIssue(issues, 'error', 'TRANSLATION_MISTRANSLATION_RULE_MISSING', 'correctionRule.deductionRules', '翻译缺少错译规则。', '补充错译扣分规则。');
    if (translation.acceptableExpressions?.some((item) => translation.commonMistranslations?.includes(item))) addIssue(issues, 'error', 'TRANSLATION_EXPRESSION_CONFLICT', 'acceptableExpressions', '可接受表达与错误表达冲突。', '移除冲突表达。');
  }
  validateAiRefs(base.topicType, base.examType, base.riskLevel, base.aiStrategyRefs ?? [], issues);
  const level: API.WritingTranslationPrecheckLevel = issues.some((item) => item.level === 'error')
    ? 'error'
    : issues.some((item) => item.level === 'warning')
      ? 'warning'
      : 'passed';
  return {
    id: `wt-precheck-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    topicId: topicId ?? (base.id || undefined),
    level,
    checkedAt: nowText(),
    issues,
    summary:
      level === 'passed'
        ? '配置校验通过。'
        : level === 'warning'
          ? '配置存在 warning，提交审核前需确认。'
          : '配置存在冲突，error 会阻止提交审核。',
  };
};

export const buildWritingTranslationStaticValidation = (
  topic: API.WritingTranslationTopic | API.WritingTranslationTopicSaveParams,
): API.WritingTranslationValidationResult => {
  const precheck = buildWritingTranslationPrecheck(topic);
  const topicType = topic.topicType;
  const seedCases: API.WritingTranslationValidationCase[] =
    topicType === 'writing'
      ? [
          { id: 'wr-case-normal', title: '正常答案摘要', inputSummary: '完整回应题目。', expectedRule: '配置校验通过' },
          { id: 'wr-case-blank', title: '空白答案', inputSummary: '用户未输入内容。', expectedRule: '人工复核条件命中' },
          { id: 'wr-case-short', title: '字数不足', inputSummary: '明显低于最小字数。', expectedRule: '扣分规则命中' },
          { id: 'wr-case-off-topic', title: '明显偏题', inputSummary: '主题与题干不相关。', expectedRule: '扣分规则命中' },
          { id: 'wr-case-template', title: '疑似机械套模板', inputSummary: '通用模板痕迹明显。', expectedRule: '扣分规则命中' },
        ]
      : [
          { id: 'tr-case-normal', title: '正常译文摘要', inputSummary: '核心信息完整。', expectedRule: '配置校验通过' },
          { id: 'tr-case-omission', title: '漏译', inputSummary: '缺少关键信息。', expectedRule: '扣分规则命中' },
          { id: 'tr-case-keyword', title: '关键词错译', inputSummary: '关键词表达错误。', expectedRule: '扣分规则命中' },
          { id: 'tr-case-grammar', title: '语法错误', inputSummary: '句法错误密集。', expectedRule: '扣分规则命中' },
          { id: 'tr-case-fluency', title: '表达严重不通顺', inputSummary: '英文表达不自然。', expectedRule: '人工复核条件命中' },
        ];
  const cases = seedCases.map((item, index) => {
    const aiInvalid = precheck.issues.some((issue) => issue.code.startsWith('AI_REFERENCE'));
    const hasError = precheck.level === 'error';
    return {
      ...item,
      result: hasError && index === 0 ? 'error' : precheck.level === 'warning' && index === 0 ? 'warning' : 'passed',
      message: aiInvalid
        ? 'AI 引用失效'
        : hasError && index === 0
          ? '配置存在冲突'
          : item.expectedRule,
    } as API.WritingTranslationValidationCase;
  });
  const level: API.WritingTranslationPrecheckLevel = cases.some((item) => item.result === 'error')
    ? 'error'
    : cases.some((item) => item.result === 'warning')
      ? 'warning'
      : 'passed';
  return {
    level,
    summary: '本结果来自本地静态样例校验，不调用真实模型。',
    cases,
    checkedAt: nowText(),
    mockOnly: true,
  };
};

const normalizeTopicFromParams = (
  id: string,
  params: API.WritingTranslationTopicSaveParams,
  operator: WritingTranslationOperator,
  existing?: API.WritingTranslationTopic,
): API.WritingTranslationTopic => {
  const now = nowText();
  const topicType = params.topicType;
  const base = {
    id,
    topicType,
    name: params.name,
    description: params.description ?? existing?.description ?? '',
    examType: params.examType,
    difficulty: params.difficulty,
    tags: normalizeTags(params.tags),
    totalScore: Number(params.totalScore ?? existing?.totalScore ?? 50),
    riskLevel: params.riskLevel ?? existing?.riskLevel ?? 'medium',
    referencePoints: splitLines(params.referencePoints ?? existing?.referencePoints),
    scoringDimensions:
      params.scoringDimensions ??
      existing?.scoringDimensions ??
      (topicType === 'writing' ? writingDimensions() : translationDimensions()),
    correctionRule:
      params.correctionRule ??
      existing?.correctionRule ??
      correctionRuleSet(topicType),
    aiStrategyRefs:
      params.aiStrategyRefs ??
      existing?.aiStrategyRefs ??
      validAiRefs(),
    status: existing?.status ?? 'draft',
    version: existing?.version ?? 'V0.1',
    dataVersion: existing ? existing.dataVersion + 1 : 1,
    createdBy: existing?.createdBy ?? operator.name,
    createdById: existing?.createdById ?? operator.id,
    createdAt: existing?.createdAt ?? now,
    updatedBy: operator.name,
    updatedById: operator.id,
    updatedAt: now,
    reviewTaskId: existing?.reviewTaskId,
    releaseVersionId: existing?.releaseVersionId,
    rollbackTargetVersion: existing?.rollbackTargetVersion,
    changeSummary: params.changeSummary || existing?.changeSummary || '保存写译题目草稿。',
    internalRemark: params.internalRemark ?? existing?.internalRemark,
    versionRecords: existing?.versionRecords ? clone(existing.versionRecords) : [],
    operationRecords: existing?.operationRecords ? clone(existing.operationRecords) : [],
  };
  const topic =
    topicType === 'writing'
      ? ({
          ...base,
          topicType: 'writing',
          prompt: params.prompt ?? (existing as API.WritingTopic | undefined)?.prompt ?? '',
          topicDirection:
            params.topicDirection ?? (existing as API.WritingTopic | undefined)?.topicDirection ?? '',
          genre: params.genre ?? (existing as API.WritingTopic | undefined)?.genre ?? 'argumentative',
          minWords: Number(params.minWords ?? (existing as API.WritingTopic | undefined)?.minWords ?? 120),
          maxWords: Number(params.maxWords ?? (existing as API.WritingTopic | undefined)?.maxWords ?? 180),
          suggestedMinutes: Number(params.suggestedMinutes ?? (existing as API.WritingTopic | undefined)?.suggestedMinutes ?? 30),
          writingRequirements: splitLines(params.writingRequirements ?? (existing as API.WritingTopic | undefined)?.writingRequirements),
          outlinePoints: splitLines(params.outlinePoints ?? (existing as API.WritingTopic | undefined)?.outlinePoints),
          sampleAnswerSummary:
            params.sampleAnswerSummary ?? (existing as API.WritingTopic | undefined)?.sampleAnswerSummary,
          templateUsageWarning:
            params.templateUsageWarning ?? (existing as API.WritingTopic | undefined)?.templateUsageWarning,
        } as API.WritingTopic)
      : ({
          ...base,
          topicType: 'translation',
          sourceText: params.sourceText ?? (existing as API.TranslationTopic | undefined)?.sourceText ?? '',
          sourceLanguage: 'zh-CN',
          targetLanguage: 'en',
          translationDirection:
            params.translationDirection ??
            (existing as API.TranslationTopic | undefined)?.translationDirection ??
            'zh-CN_to_en',
          topicDirection:
            params.topicDirection ?? (existing as API.TranslationTopic | undefined)?.topicDirection ?? '',
          referenceTranslation:
            params.referenceTranslation ??
            (existing as API.TranslationTopic | undefined)?.referenceTranslation ??
            '',
          keywords: splitLines(params.keywords ?? (existing as API.TranslationTopic | undefined)?.keywords),
          fixedExpressions: splitLines(params.fixedExpressions ?? (existing as API.TranslationTopic | undefined)?.fixedExpressions),
          acceptableExpressions: splitLines(params.acceptableExpressions ?? (existing as API.TranslationTopic | undefined)?.acceptableExpressions),
          commonMistranslations: splitLines(params.commonMistranslations ?? (existing as API.TranslationTopic | undefined)?.commonMistranslations),
          suggestedMinutes: Number(params.suggestedMinutes ?? (existing as API.TranslationTopic | undefined)?.suggestedMinutes ?? 25),
        } as API.TranslationTopic);
  topic.lastPrecheck = buildWritingTranslationPrecheck(topic, topic.id);
  topic.lastValidation = buildWritingTranslationStaticValidation(topic);
  topic.operationRecords.unshift({
    id: `wt-op-${topic.id}-${Date.now()}`,
    operator: operator.name,
    roleName: operator.roleName,
    action: existing ? '保存草稿' : '新建草稿',
    fromStatus: existing?.status,
    toStatus: topic.status,
    reason: topic.changeSummary,
    time: now,
  });
  topic.versionRecords.unshift(topicSnapshot(topic, topic.status === 'published'));
  return topic;
};

export const createWritingTranslationTopicRecord = (
  params: API.WritingTranslationTopicSaveParams,
  operator: WritingTranslationOperator,
) => {
  const prefix = params.topicType === 'writing' ? 'writing-topic' : 'translation-topic';
  const topic = normalizeTopicFromParams(`${prefix}-${Date.now()}`, params, operator);
  writingTranslationTopicsData.unshift(topic);
  return topic;
};

export const updateWritingTranslationTopicRecord = (
  topic: API.WritingTranslationTopic,
  params: API.WritingTranslationTopicSaveParams,
  operator: WritingTranslationOperator,
) => {
  if (params.dataVersion !== undefined && params.dataVersion !== topic.dataVersion) {
    return { conflict: true as const, topic };
  }
  if (!['draft', 'rejected'].includes(topic.status)) {
    return { locked: true as const, topic };
  }
  const updated = normalizeTopicFromParams(topic.id, params, operator, topic);
  const index = writingTranslationTopicsData.findIndex((item) => item.id === topic.id);
  writingTranslationTopicsData.splice(index, 1, updated);
  return { topic: updated };
};

export const copyWritingTranslationTopicDraft = (
  topic: API.WritingTranslationTopic,
  operator: WritingTranslationOperator,
) => {
  const now = nowText();
  const draft = clone(topic);
  draft.id = `${topic.id}-draft-${Date.now()}`;
  draft.name = `${topic.name} 新草稿`;
  draft.status = 'draft';
  draft.version = `V${(Number(topic.version.replace(/^V/, '')) + 0.1).toFixed(1)}`;
  draft.dataVersion = 1;
  draft.createdBy = operator.name;
  draft.createdById = operator.id;
  draft.createdAt = now;
  draft.updatedBy = operator.name;
  draft.updatedById = operator.id;
  draft.updatedAt = now;
  draft.reviewTaskId = undefined;
  draft.releaseVersionId = undefined;
  draft.changeSummary = '从已发布或历史版本创建新草稿。';
  draft.lastPrecheck = buildWritingTranslationPrecheck(draft, draft.id);
  draft.lastValidation = buildWritingTranslationStaticValidation(draft);
  draft.operationRecords = [
    {
      id: `wt-op-copy-${draft.id}`,
      operator: operator.name,
      roleName: operator.roleName,
      action: '复制草稿',
      fromStatus: topic.status,
      toStatus: 'draft',
      reason: '不可直接覆盖线上版本，创建新草稿。',
      time: now,
    },
  ];
  draft.versionRecords = [topicSnapshot(draft), ...topic.versionRecords];
  writingTranslationTopicsData.unshift(draft);
  return draft;
};

export const submitWritingTranslationTopicReview = (
  topic: API.WritingTranslationTopic,
  params: API.WritingTranslationSubmitParams,
  operator: WritingTranslationOperator,
  reviewTasksData: API.ReviewTask[],
) => {
  if (params.simulateTaskFailure) return { failed: true as const };
  if (params.dataVersion !== topic.dataVersion) return { conflict: true as const };
  if (!['draft', 'rejected'].includes(topic.status)) return { locked: true as const };
  const precheck = buildWritingTranslationPrecheck(topic, topic.id);
  topic.lastPrecheck = precheck;
  if (precheck.level === 'error') return { blocked: true as const, precheck };
  if (precheck.level === 'warning' && !params.confirmWarnings) {
    return { warning: true as const, precheck };
  }
  const now = nowText();
  const previousStatus = topic.status;
  const task: API.ReviewTask = {
    id: topic.reviewTaskId || `review-writing-translation-${Date.now()}`,
    objectType: 'writing_translation',
    objectSubtype: topic.topicType,
    objectTypeName: writingTranslationTopicTypeLabels[topic.topicType],
    objectId: topic.id,
    objectName: topic.name,
    moduleKey: 'writingTranslation',
    moduleName: '写译批改管理',
    submitterId: operator.id,
    submitter: operator.name,
    submittedAt: now,
    version: topic.version,
    priority: topic.riskLevel === 'high' ? 'P0' : topic.riskLevel === 'medium' ? 'P1' : 'P2',
    status: 'pending_review',
    riskLevel: topic.riskLevel,
    updatedAt: now,
    changeSummary: params.changeSummary,
    impactScope: `${writingTranslationTopicTypeLabels[topic.topicType]}，总分 ${topic.totalScore}，${topic.scoringDimensions.length} 个评分维度。`,
    reviewOpinion: '',
    reviewer: '',
    releasePlan: '审核通过后进入待发布队列。',
    rollbackTargetVersion: topic.releaseVersionId ?? topic.versionRecords.find((item) => item.currentOnline)?.version,
    versionRecords: [
      {
        id: `version-wt-${topic.id}-${Date.now()}`,
        version: topic.version,
        status: 'pending_review',
        summary: params.changeSummary,
        createdBy: operator.name,
        createdAt: now,
      },
    ],
    operationRecords: [
      {
        id: `op-wt-${topic.id}-${Date.now()}`,
        operator: operator.name,
        roleName: operator.roleName,
        action: '提交审核',
        fromStatus: previousStatus,
        toStatus: 'pending_review',
        reason: params.changeSummary,
        time: now,
      },
    ],
  };
  const existingIndex = reviewTasksData.findIndex((item) => item.id === task.id);
  if (existingIndex >= 0) reviewTasksData.splice(existingIndex, 1, task);
  else reviewTasksData.unshift(task);
  topic.status = 'pending_review';
  topic.reviewTaskId = task.id;
  topic.updatedAt = now;
  topic.updatedBy = operator.name;
  topic.updatedById = operator.id;
  topic.changeSummary = params.changeSummary;
  topic.dataVersion += 1;
  topic.operationRecords.unshift(task.operationRecords[0]);
  topic.versionRecords.unshift(topicSnapshot(topic));
  return { topic, task };
};

export const validateWritingTranslationReviewTransition = (
  task: API.ReviewTask,
  nextStatus: API.ReviewTaskStatus,
) => {
  if (!isWritingTranslationReviewTask(task)) return { ok: true as const };
  const topic = getWritingTranslationTopic(task.objectId);
  if (!topic) return { ok: false as const, errorMessage: '写译题目不存在，状态同步失败。' };
  if (nextStatus === 'published') {
    if (task.status === 'published') return { ok: true as const };
    if (task.version !== topic.version) {
      return { ok: false as const, errorMessage: '审核版本和发布版本不一致，禁止发布。' };
    }
    const precheck = buildWritingTranslationPrecheck(topic, topic.id);
    if (precheck.level === 'error') {
      return { ok: false as const, errorMessage: '发布前复验发现阻断错误，禁止发布。', precheck };
    }
  }
  if (nextStatus === 'rolled_back') {
    const targetVersion =
      task.rollbackTargetVersion ?? topic.versionRecords.find((item) => item.currentOnline)?.version;
    if (!targetVersion || !topic.versionRecords.some((item) => item.version === targetVersion)) {
      return { ok: false as const, errorMessage: '回滚目标版本不存在。' };
    }
  }
  return { ok: true as const };
};

export const syncWritingTranslationFromReviewTask = (
  task: API.ReviewTask,
  previousStatus: API.ReviewTaskStatus,
  nextStatus: API.ReviewTaskStatus,
  operator: WritingTranslationOperator,
  reason: string,
) => {
  if (!isWritingTranslationReviewTask(task)) return;
  const topic = getWritingTranslationTopic(task.objectId);
  if (!topic) return;
  const now = task.updatedAt || nowText();
  topic.status = nextStatus;
  topic.updatedBy = operator.name;
  topic.updatedById = operator.id;
  topic.updatedAt = now;
  topic.reviewTaskId = task.id;
  topic.lastPrecheck = buildWritingTranslationPrecheck(topic, topic.id);
  topic.lastValidation = buildWritingTranslationStaticValidation(topic);
  if (nextStatus === 'published') {
    topic.releaseVersionId = task.version;
    task.rollbackTargetVersion = task.version;
    topic.versionRecords.forEach((item) => {
      item.currentOnline = item.version === task.version;
    });
  }
  if (nextStatus === 'offline') {
    topic.versionRecords.forEach((item) => {
      item.currentOnline = false;
    });
  }
  if (nextStatus === 'rolled_back') {
    topic.rollbackTargetVersion =
      task.rollbackTargetVersion ?? topic.versionRecords.find((item) => item.currentOnline)?.version;
    topic.releaseVersionId = topic.rollbackTargetVersion;
    topic.versionRecords.forEach((item) => {
      item.currentOnline = item.version === topic.releaseVersionId;
    });
  }
  topic.dataVersion += 1;
  topic.operationRecords.unshift({
    id: `wt-op-review-${topic.id}-${Date.now()}`,
    operator: operator.name,
    roleName: operator.roleName,
    action: reviewStatusActionMap[nextStatus],
    fromStatus: previousStatus,
    toStatus: nextStatus,
    reason,
    time: now,
  });
  topic.versionRecords.unshift(topicSnapshot(topic, nextStatus === 'published'));
};

export const buildWritingTranslationVersionDiff = (
  topic: API.WritingTranslationTopic,
  fromVersion?: string,
  toVersion?: string,
): API.WritingTranslationVersionDiff => {
  const snapshots = topic.versionRecords;
  const from = snapshots.find((item) => item.version === fromVersion) ?? snapshots[1] ?? snapshots[0];
  const to = snapshots.find((item) => item.version === toVersion) ?? snapshots[0];
  const fromTopic = (from?.snapshot ?? {}) as API.WritingTranslationTopic;
  const toTopic = (to?.snapshot ?? {}) as API.WritingTranslationTopic;
  const items: API.WritingTranslationVersionDiffItem[] = [
    ['题目名称', fromTopic.name, toTopic.name],
    ['题干/原文', fromTopic.topicType === 'writing' ? (fromTopic as API.WritingTopic).prompt : (fromTopic as API.TranslationTopic).sourceText, toTopic.topicType === 'writing' ? (toTopic as API.WritingTopic).prompt : (toTopic as API.TranslationTopic).sourceText],
    ['字数范围', fromTopic.topicType === 'writing' ? `${(fromTopic as API.WritingTopic).minWords}-${(fromTopic as API.WritingTopic).maxWords}` : '-', toTopic.topicType === 'writing' ? `${(toTopic as API.WritingTopic).minWords}-${(toTopic as API.WritingTopic).maxWords}` : '-'],
    ['参考译文', fromTopic.topicType === 'translation' ? (fromTopic as API.TranslationTopic).referenceTranslation : '-', toTopic.topicType === 'translation' ? (toTopic as API.TranslationTopic).referenceTranslation : '-'],
    ['参考要点', fromTopic.referencePoints?.join('、'), toTopic.referencePoints?.join('、')],
    ['总分', String(fromTopic.totalScore ?? ''), String(toTopic.totalScore ?? '')],
    ['维度权重', fromTopic.scoringDimensions?.map((item) => `${item.name}:${item.weight}%`).join('；'), toTopic.scoringDimensions?.map((item) => `${item.name}:${item.weight}%`).join('；')],
    ['维度最高分', fromTopic.scoringDimensions?.map((item) => `${item.name}:${item.maxScore}`).join('；'), toTopic.scoringDimensions?.map((item) => `${item.name}:${item.maxScore}`).join('；')],
    ['错误规则', fromTopic.correctionRule?.deductionRules?.map((item) => item.name).join('、'), toTopic.correctionRule?.deductionRules?.map((item) => item.name).join('、')],
    ['AI 策略引用', fromTopic.aiStrategyRefs?.map((item) => `${item.strategyId}@${item.strategyVersion}`).join('、'), toTopic.aiStrategyRefs?.map((item) => `${item.strategyId}@${item.strategyVersion}`).join('、')],
    ['风险等级', fromTopic.riskLevel, toTopic.riskLevel],
    ['兜底规则', fromTopic.correctionRule?.fallbackMessage, toTopic.correctionRule?.fallbackMessage],
  ].map(([field, before, after]) => ({
    field: String(field),
    before: String(before ?? '-'),
    after: String(after ?? '-'),
    changed: String(before ?? '-') !== String(after ?? '-'),
  }));
  return {
    fromVersion: from?.version ?? '-',
    toVersion: to?.version ?? '-',
    items,
  };
};

export const scoringPresets: API.WritingTranslationScoringPreset[] = [
  {
    id: 'preset-writing-standard',
    topicType: 'writing',
    name: '写作标准评分维度',
    totalScore: 50,
    dimensions: writingDimensions(),
  },
  {
    id: 'preset-translation-standard',
    topicType: 'translation',
    name: '翻译标准评分维度',
    totalScore: 50,
    dimensions: translationDimensions(),
  },
];

export const availableWritingTranslationAiStrategies = (
  examType?: API.ExamType,
) =>
  aiCoachStrategiesData.filter((strategy) => {
    if (strategy.status !== 'published') return false;
    if (!strategy.businessScenes.includes('writing_explanation')) return false;
    if (!['prompt_template', 'response_structure', 'dependency_rule', 'intent'].includes(strategy.configType)) return false;
    if (examType && !strategy.examTypes.includes(examType)) return false;
    return true;
  });

export const writingTranslationDashboardStats = () => {
  const topics = writingTranslationTopicsData;
  const precheckErrors = topics.filter((item) => buildWritingTranslationPrecheck(item, item.id).level === 'error');
  const aiInvalid = topics.filter((item) =>
    buildWritingTranslationPrecheck(item, item.id).issues.some((issue) => issue.code.startsWith('AI_REFERENCE')),
  );
  return {
    draft: topics.filter((item) => item.status === 'draft').length,
    pendingReview: topics.filter((item) => item.status === 'pending_review').length,
    pendingPublish: topics.filter((item) => item.status === 'pending_publish').length,
    rejected: topics.filter((item) => item.status === 'rejected').length,
    published: topics.filter((item) => item.status === 'published').length,
    precheckErrors,
    aiInvalid,
  };
};

export const writingTranslationDashboardTodoSources = () => {
  const stats = writingTranslationDashboardStats();
  return [
    ...writingTranslationTopicsData.filter((item) => item.status === 'rejected'),
    ...stats.precheckErrors,
    ...stats.aiInvalid,
  ];
};

writingTranslationTopicsData.forEach((topic) => {
  if (!topic.lastPrecheck) {
    topic.lastPrecheck = buildWritingTranslationPrecheck(topic, topic.id);
  }
  if (!topic.lastValidation) {
    topic.lastValidation = buildWritingTranslationStaticValidation(topic);
  }
});

export const writingTranslationReferenceDescription = (
  ref: API.WritingTranslationAiStrategyReference,
) =>
  `${aiCoachConfigTypeLabels[ref.configType]} / ${aiCoachBusinessSceneLabels[ref.businessScene]} / ${ref.strategyVersion}`;
