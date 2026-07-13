import type { AdminRoleId } from '../src/foundation/permissions';
import { copyAiCoachStrategyDraft } from './aiCoachStore';
import { nowText } from './auditStore';
import { aiCoachStrategiesData } from './aiCoachStore';
import {
  copyWritingTranslationTopicDraft,
  getWritingTranslationTopic,
  writingTranslationTopicsData,
} from './writingTranslationStore';

export type TemplateOperator = { id: string; name: string; roleId: AdminRoleId; roleName: string };

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const writingDimensions: API.ScoringDimension[] = [
  { key: 'content', name: '内容完整性', description: '覆盖题目要求与关键支撑信息。', weight: 40, maxScore: 20, order: 1, required: true, bandNotes: [], deductionRules: [], bonusRules: [] },
  { key: 'language', name: '语言准确性', description: '检查语法、拼写、搭配和句式。', weight: 35, maxScore: 18, order: 2, required: true, bandNotes: [], deductionRules: [], bonusRules: [] },
  { key: 'structure', name: '结构与逻辑', description: '检查段落结构、衔接和逻辑推进。', weight: 25, maxScore: 12, order: 3, required: true, bandNotes: [], deductionRules: [], bonusRules: [] },
];

const responseStrategy = aiCoachStrategiesData.find(
  (item) =>
    item.configType === 'response_structure' &&
    item.status === 'published' &&
    item.businessScenes.includes('writing_explanation'),
)!;

const responseRef: API.WritingTranslationAiStrategyReference = {
  strategyId: responseStrategy.id,
  strategyTitle: responseStrategy.title,
  strategyVersion: responseStrategy.version,
  releaseVersionId: responseStrategy.publishedVersion || responseStrategy.version,
  configType: 'response_structure',
  businessScene: 'writing_explanation',
  usage: 'feedback_structure',
  required: true,
  statusAtBinding: 'published',
  boundAt: '2026-07-10 10:00:00',
};

const base = (id: string, name: string, type: API.WritingTranslationTemplateType, owner: string): API.WritingTranslationTemplateBase => ({
  id, name, templateType: type, description: '写译批改可复用模板。', topicTypes: ['writing', 'translation'], examTypes: ['CET4', 'CET6'], status: 'published', version: 'v1.0.0', dataVersion: 1,
  createdBy: owner, createdById: type === 'scoring_template' ? 'teaching_reviewer' : 'ai_operator', createdAt: '2026-07-10 10:00:00', updatedBy: owner, updatedById: type === 'scoring_template' ? 'teaching_reviewer' : 'ai_operator', updatedAt: '2026-07-10 10:00:00',
  releaseVersionId: `release-${id}-v1`, changeSummary: '初始化可复用模板。', versionRecords: [], operationRecords: [],
});

export const writingTranslationTemplatesData: API.WritingTranslationTemplate[] = [
  { ...base('wt-scoring-default', '四六级写译通用评分标准', 'scoring_template', '教研审核'), templateType: 'scoring_template', totalScore: 50, dimensions: clone(writingDimensions) },
  { ...base('wt-feedback-default', '结构化批改反馈模板', 'feedback_template', 'AI 策略运营'), templateType: 'feedback_template', sections: [
    { key: 'overall', title: '总体评价', guidance: '概括完成质量和主要方向。', required: true, order: 1 },
    { key: 'dimensions', title: '分维度反馈', guidance: '按评分维度解释得失分。', required: true, order: 2 },
    { key: 'issues', title: '主要问题', guidance: '定位最影响结果的问题。', required: true, order: 3 },
    { key: 'revision', title: '修改建议', guidance: '给出下一步可执行建议。', required: true, order: 4 },
  ], responseStructureRef: clone(responseRef) },
  { ...base('wt-feedback-draft', '翻译精简反馈结构', 'feedback_template', 'AI 策略运营'), templateType: 'feedback_template', status: 'draft', version: 'v1.1.0', releaseVersionId: undefined, topicTypes: ['translation'], sections: [
    { key: 'overall', title: '总体评价', guidance: '概括译文质量。', required: true, order: 1 },
    { key: 'dimensions', title: '分维度反馈', guidance: '按维度反馈。', required: true, order: 2 },
  ], responseStructureRef: clone(responseRef) },
];

export const mockCorrectionRecords: API.MockCorrectionRecord[] = [];

const scoreBandLabel: Record<API.MockCorrectionRecord['scoreBand'], string> = {
  excellent: '高分稳定',
  stable: '正常区间',
  attention: '需要关注',
  abnormal: '异常样例',
};

const issuePool: Record<string, Omit<API.CorrectionIssueTag, 'count'>> = {
  topic_requirement: { code: 'topic_requirement', name: '题目要求不清', severity: 'medium', causeType: 'topic' },
  scoring_weight: { code: 'scoring_weight', name: '评分权重偏差', severity: 'high', causeType: 'scoring_template' },
  feedback_vague: { code: 'feedback_vague', name: '反馈建议泛化', severity: 'medium', causeType: 'feedback_template' },
  ai_structure: { code: 'ai_structure', name: 'AI 结构输出偏移', severity: 'high', causeType: 'ai_strategy' },
  language_accuracy: { code: 'language_accuracy', name: '语言准确性扣分集中', severity: 'low', causeType: 'scoring_template' },
  missing_revision: { code: 'missing_revision', name: '缺少可执行修改建议', severity: 'medium', causeType: 'feedback_template' },
};

const buildIssues = (codes: string[]) =>
  codes.map((code) => ({ ...issuePool[code], count: 1 })).filter((item): item is API.CorrectionIssueTag => Boolean(item?.code));

const scoreBand = (score: number, totalScore: number): API.MockCorrectionRecord['scoreBand'] => {
  const ratio = totalScore ? score / totalScore : 0;
  if (ratio >= 0.86) return 'excellent';
  if (ratio >= 0.72) return 'stable';
  if (ratio >= 0.58) return 'attention';
  return 'abnormal';
};

const buildDimensionScores = (
  dimensions: API.ScoringDimension[],
  ratio: number,
  issueCodes: string[],
): API.CorrectionDimensionScore[] =>
  dimensions.map((dimension) => {
    const issueCount =
      issueCodes.includes('scoring_weight') && dimension.key === 'content'
        ? 2
        : issueCodes.includes('language_accuracy') && dimension.key === 'language'
          ? 2
          : issueCodes.includes('topic_requirement') && dimension.key === 'content'
            ? 1
            : 0;
    const penalty = issueCount * 0.08;
    return {
      key: dimension.key,
      name: dimension.name,
      score: Math.max(0, Math.round(dimension.maxScore * Math.max(0.35, ratio - penalty))),
      maxScore: dimension.maxScore,
      issueCount,
    };
  });

const buildCorrectionRecord = (
  topic: API.WritingTranslationTopic,
  scoring: API.ScoringTemplate,
  feedback: API.FeedbackTemplate,
  options: {
    id?: string;
    scoreRatio: number;
    issueCodes: string[];
    answerSummary: string;
    correctionStatus: API.MockCorrectionRecord['correctionStatus'];
    createdAt: string;
    revisionCount?: number;
  },
): API.MockCorrectionRecord => {
  const score = Math.round(scoring.totalScore * options.scoreRatio);
  const band = scoreBand(score, scoring.totalScore);
  const aiStrategySnapshot = clone(feedback.responseStructureRef);
  return {
    id: options.id ?? uid('mock-correction'),
    topicId: topic.id,
    topicName: topic.name,
    topicType: topic.topicType,
    examType: topic.examType,
    topicVersion: topic.version,
    scoringTemplateRef: clone(topic.scoringTemplateRef ?? templateRef(scoring)),
    feedbackTemplateRef: clone(topic.feedbackTemplateRef ?? templateRef(feedback)),
    aiStrategySnapshot,
    aiStrategyVersion: aiStrategySnapshot.strategyVersion,
    totalScore: scoring.totalScore,
    score,
    scoreBand: band,
    answerSummary: options.answerSummary,
    dimensionScores: buildDimensionScores(scoring.dimensions, options.scoreRatio, options.issueCodes),
    issueTags: buildIssues(options.issueCodes),
    feedbackSections: feedback.sections
      .sort((a, b) => a.order - b.order)
      .map((item) => ({
        title: item.title,
        content: `Mock ${item.title}结果，固定题目、评分模板、反馈模板与 AI 策略版本。`,
      })),
    correctionStatus: options.correctionStatus,
    revisionCount: options.revisionCount ?? 0,
    fixStatus: 'none',
    linkedFixDrafts: [],
    updatedAt: options.createdAt,
    dataVersion: 1,
    createdAt: options.createdAt,
    mockOnly: true,
  };
};

export const getWritingTranslationTemplate = (id: string) => writingTranslationTemplatesData.find((item) => item.id === id);

export const filterWritingTranslationTemplates = (query: API.WritingTranslationTemplateQueryParams) => writingTranslationTemplatesData.filter((item) => {
  if (query.templateType && item.templateType !== query.templateType) return false;
  if (query.status && item.status !== query.status) return false;
  if (query.topicType && !item.topicTypes.includes(query.topicType)) return false;
  if (query.examType && !item.examTypes.includes(query.examType)) return false;
  if (query.keyword && !`${item.id} ${item.name} ${item.description}`.toLowerCase().includes(query.keyword.toLowerCase())) return false;
  return true;
});

export const precheckWritingTranslationTemplate = (value: API.WritingTranslationTemplateSaveParams | API.WritingTranslationTemplate, id?: string): API.WritingTranslationPrecheckResult => {
  const issues: API.WritingTranslationPrecheckIssue[] = [];
  const add = (level: API.WritingTranslationPrecheckLevel, code: string, field: string, message: string, suggestion: string) => issues.push({ id: uid('issue'), level, code, field, message, suggestion });
  if (!value.name?.trim()) add('error', 'NAME_REQUIRED', 'name', '模板名称不能为空。', '填写模板名称。');
  if (!value.topicTypes?.length) add('error', 'TOPIC_TYPE_REQUIRED', 'topicTypes', '至少选择一种题目类型。', '选择写作或翻译。');
  if (!value.examTypes?.length) add('error', 'EXAM_TYPE_REQUIRED', 'examTypes', '至少选择一种考试类型。', '选择 CET4 或 CET6。');
  if (value.templateType === 'scoring_template') {
    const dimensions = 'dimensions' in value ? value.dimensions ?? [] : [];
    const totalScore = Number('totalScore' in value ? value.totalScore : 0);
    if (dimensions.length < 2) add('error', 'DIMENSIONS_MIN', 'dimensions', '评分维度至少两项。', '补充评分维度。');
    if (dimensions.reduce((sum, item) => sum + Number(item.weight || 0), 0) !== 100) add('error', 'WEIGHT_TOTAL', 'dimensions', '评分权重合计必须为 100%。', '调整各维度权重。');
    if (dimensions.reduce((sum, item) => sum + Number(item.maxScore || 0), 0) !== totalScore) add('error', 'SCORE_TOTAL', 'dimensions', '维度最高分合计必须等于模板总分。', '调整总分或维度最高分。');
    const unique = (values: Array<string | number>) => new Set(values).size === values.length;
    if (!unique(dimensions.map((item) => item.key)) || !unique(dimensions.map((item) => item.name)) || !unique(dimensions.map((item) => item.order))) add('error', 'DIMENSION_DUPLICATE', 'dimensions', '维度 key、名称和排序不可重复。', '修正重复项。');
  } else {
    const sections = 'sections' in value ? value.sections ?? [] : [];
    const requiredKeys = ['overall', 'dimensions', 'issues', 'revision'];
    requiredKeys.forEach((key) => { if (!sections.some((item) => item.key === key)) add('error', 'SECTION_REQUIRED', 'sections', `缺少必需反馈区块：${key}。`, '补齐标准反馈结构。'); });
    if (new Set(sections.map((item) => item.key)).size !== sections.length || new Set(sections.map((item) => item.order)).size !== sections.length) add('error', 'SECTION_DUPLICATE', 'sections', '反馈区块 key 和排序不可重复。', '修正重复区块。');
    const ref = 'responseStructureRef' in value ? value.responseStructureRef : undefined;
    const current = ref ? aiCoachStrategiesData.find((item) => item.id === ref.strategyId) : undefined;
    if (!ref || ref.configType !== 'response_structure' || current?.status !== 'published' || current.version !== ref.strategyVersion) add('error', 'RESPONSE_REF_INVALID', 'responseStructureRef', '必须引用当前有效的已发布回答结构版本。', '重新选择已发布回答结构。');
  }
  const level: API.WritingTranslationPrecheckLevel = issues.some((item) => item.level === 'error') ? 'error' : issues.some((item) => item.level === 'warning') ? 'warning' : 'passed';
  return { id: uid('precheck'), topicId: id, level, checkedAt: nowText(), issues, summary: level === 'passed' ? '预校验通过，可提交审核。' : `预校验发现 ${issues.length} 项问题。` };
};

const ownerCanEdit = (type: API.WritingTranslationTemplateType, roleId: AdminRoleId) => roleId === 'super_admin' || (type === 'scoring_template' ? roleId === 'teaching_reviewer' : roleId === 'ai_operator');
export const canEditWritingTranslationTemplate = ownerCanEdit;

export const saveWritingTranslationTemplate = (params: API.WritingTranslationTemplateSaveParams, operator: TemplateOperator, existing?: API.WritingTranslationTemplate) => {
  if (!ownerCanEdit(params.templateType, operator.roleId)) return { forbidden: true as const };
  if (existing && !['draft', 'rejected'].includes(existing.status)) return { locked: true as const };
  if (existing && params.dataVersion !== existing.dataVersion) return { conflict: true as const };
  const timestamp = nowText();
  const common = { name: params.name.trim(), description: params.description?.trim() || '', topicTypes: params.topicTypes, examTypes: params.examTypes, updatedBy: operator.name, updatedById: operator.id, updatedAt: timestamp, changeSummary: params.changeSummary?.trim() || '更新模板草稿。' };
  if (existing) {
    Object.assign(existing, common, params.templateType === 'scoring_template' ? { totalScore: Number(params.totalScore), dimensions: clone(params.dimensions ?? []) } : { sections: clone(params.sections ?? []), responseStructureRef: clone(params.responseStructureRef!) });
    existing.dataVersion += 1;
    return { template: existing };
  }
  const id = uid(params.templateType === 'scoring_template' ? 'wt-scoring' : 'wt-feedback');
  const created = (params.templateType === 'scoring_template'
    ? { id, templateType: 'scoring_template' as const, ...common, status: 'draft' as const, version: 'v1.0.0', dataVersion: 1, createdBy: operator.name, createdById: operator.id, createdAt: timestamp, versionRecords: [], operationRecords: [], totalScore: Number(params.totalScore), dimensions: clone(params.dimensions ?? []) }
    : { id, templateType: 'feedback_template' as const, ...common, status: 'draft' as const, version: 'v1.0.0', dataVersion: 1, createdBy: operator.name, createdById: operator.id, createdAt: timestamp, versionRecords: [], operationRecords: [], sections: clone(params.sections ?? []), responseStructureRef: clone(params.responseStructureRef!) }) as API.WritingTranslationTemplate;
  writingTranslationTemplatesData.unshift(created);
  return { template: created };
};

export const copyWritingTranslationTemplate = (source: API.WritingTranslationTemplate, operator: TemplateOperator) => {
  const copy = clone(source);
  copy.id = uid(source.templateType === 'scoring_template' ? 'wt-scoring' : 'wt-feedback'); copy.status = 'draft'; copy.version = `v${Number(source.version.slice(1).split('.')[0]) + 1}.0.0`; copy.dataVersion = 1; copy.reviewTaskId = undefined; copy.releaseVersionId = undefined; copy.rollbackTargetVersion = source.version; copy.createdBy = operator.name; copy.createdById = operator.id; copy.createdAt = nowText(); copy.updatedBy = operator.name; copy.updatedById = operator.id; copy.updatedAt = copy.createdAt; copy.changeSummary = `从 ${source.version} 复制新版本。`; copy.versionRecords = []; copy.operationRecords = [];
  writingTranslationTemplatesData.unshift(copy); return copy;
};

export const submitWritingTranslationTemplateReview = (template: API.WritingTranslationTemplate, params: API.WritingTranslationSubmitParams, operator: TemplateOperator, tasks: API.ReviewTask[]) => {
  if (!ownerCanEdit(template.templateType, operator.roleId)) return { forbidden: true as const };
  if (!['draft', 'rejected'].includes(template.status)) return { locked: true as const };
  if (params.dataVersion !== template.dataVersion) return { conflict: true as const };
  const precheck = precheckWritingTranslationTemplate(template, template.id); template.lastPrecheck = precheck;
  if (precheck.level === 'error' || (precheck.level === 'warning' && !params.confirmWarnings)) return { precheck };
  const task: API.ReviewTask = { id: uid('review-wt-template'), objectType: 'writing_translation_template', objectSubtype: template.templateType, objectTypeName: template.templateType === 'scoring_template' ? '评分维度模板' : '反馈模板', objectId: template.id, objectName: template.name, moduleKey: 'writingTranslation', moduleName: '写译批改', submitterId: operator.id, submitter: operator.name, submittedAt: nowText(), version: template.version, priority: 'P0', status: 'pending_review', riskLevel: 'medium', updatedAt: nowText(), changeSummary: params.changeSummary, impactScope: `${template.topicTypes.join('/')}，${template.examTypes.join('/')}`, objectDetailPath: `/writing-translation/scoring-feedback-templates/${template.id}`, versionRecords: [], operationRecords: [] };
  tasks.unshift(task); template.status = 'pending_review'; template.reviewTaskId = task.id; template.dataVersion += 1; template.updatedAt = nowText(); return { template, task };
};

export const isWritingTranslationTemplateReviewTask = (task: API.ReviewTask) => task.objectType === 'writing_translation_template';
export const validateWritingTranslationTemplateReviewTransition = (task: API.ReviewTask, next: API.ReviewTaskStatus) => {
  if (!isWritingTranslationTemplateReviewTask(task) || next !== 'published') return { ok: true as const };
  const template = getWritingTranslationTemplate(task.objectId); if (!template || template.version !== task.version) return { ok: false as const, errorMessage: '审核版本与模板当前版本不一致。' };
  const precheck = precheckWritingTranslationTemplate(template, template.id); return precheck.level === 'error' ? { ok: false as const, errorMessage: '模板发布前复验失败。', precheck } : { ok: true as const };
};
export const syncWritingTranslationTemplateFromReviewTask = (task: API.ReviewTask, next: API.ReviewTaskStatus, operator: TemplateOperator, reason: string) => {
  if (!isWritingTranslationTemplateReviewTask(task)) return;
  const template = getWritingTranslationTemplate(task.objectId); if (!template) return;
  template.status = next; template.updatedBy = operator.name; template.updatedById = operator.id; template.updatedAt = nowText(); template.dataVersion += 1;
  if (next === 'published') template.releaseVersionId = `release-${template.id}-${template.version}`;
  template.operationRecords.unshift({ id: uid('op'), operator: operator.name, roleName: operator.roleName, action: next, toStatus: next, reason, time: template.updatedAt });
  template.versionRecords.unshift({ id: uid('version'), templateId: template.id, version: template.version, status: next, createdBy: operator.name, createdAt: template.updatedAt, changeSummary: reason, currentOnline: next === 'published', snapshot: clone(template) });
};

const templateRef = (template: API.WritingTranslationTemplate): API.WritingTranslationTemplateReference => ({ templateId: template.id, templateName: template.name, templateType: template.templateType, version: template.version, releaseVersionId: template.releaseVersionId!, statusAtBinding: template.status, boundAt: nowText() });

const seedMockCorrectionRecords = () => {
  if (mockCorrectionRecords.some((item) => item.id === 'mock-correction-translation-cet6-003')) return;
  const scoring = getWritingTranslationTemplate('wt-scoring-default');
  const feedback = getWritingTranslationTemplate('wt-feedback-default');
  if (!scoring || scoring.templateType !== 'scoring_template' || !feedback || feedback.templateType !== 'feedback_template') return;
  [
    {
      topicId: 'writing-topic-cet6-published',
      id: 'mock-correction-writing-cet6-001',
      scoreRatio: 0.88,
      issueCodes: ['language_accuracy'],
      answerSummary: '脱敏摘要：观点完整，个别长句语法和搭配需要修正。',
      correctionStatus: 'normal' as const,
      createdAt: '2026-07-12 09:20:00',
      revisionCount: 1,
    },
    {
      topicId: 'writing-topic-cet4-published',
      id: 'mock-correction-writing-cet4-002',
      scoreRatio: 0.62,
      issueCodes: ['topic_requirement', 'feedback_vague'],
      answerSummary: '脱敏摘要：答题方向接近主题，但任务要点覆盖不足，反馈建议偏泛。',
      correctionStatus: 'needs_review' as const,
      createdAt: '2026-07-12 10:15:00',
      revisionCount: 0,
    },
    {
      topicId: 'translation-topic-cet6-published',
      id: 'mock-correction-translation-cet6-003',
      scoreRatio: 0.54,
      issueCodes: ['scoring_weight', 'ai_structure'],
      answerSummary: '脱敏摘要：译文信息遗漏较多，AI 输出结构出现非模板区块。',
      correctionStatus: 'abnormal' as const,
      createdAt: '2026-07-12 11:05:00',
      revisionCount: 0,
    },
    {
      topicId: 'translation-topic-cet4-published',
      id: 'mock-correction-translation-cet4-004',
      scoreRatio: 0.76,
      issueCodes: ['missing_revision'],
      answerSummary: '脱敏摘要：译文基本准确，但修改建议缺少可直接执行的下一步。',
      correctionStatus: 'needs_review' as const,
      createdAt: '2026-07-12 13:40:00',
      revisionCount: 2,
    },
  ].forEach((item) => {
    const topic = getWritingTranslationTopic(item.topicId);
    if (topic) mockCorrectionRecords.push(buildCorrectionRecord(topic, scoring, feedback, item));
  });
};

export const getCorrectionSummary = (id: string) => {
  seedMockCorrectionRecords();
  return mockCorrectionRecords.find((item) => item.id === id);
};

export const filterCorrectionSummaries = (query: API.CorrectionSummaryQueryParams = {}) => {
  seedMockCorrectionRecords();
  return mockCorrectionRecords.filter((item) => {
    if (query.keyword) {
      const keyword = query.keyword.toLowerCase();
      const haystack = `${item.id} ${item.topicName} ${item.topicId} ${item.answerSummary} ${item.issueTags.map((tag) => tag.name).join(' ')}`.toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }
    if (query.topicType && item.topicType !== query.topicType) return false;
    if (query.examType && item.examType !== query.examType) return false;
    if (query.scoreBand && item.scoreBand !== query.scoreBand) return false;
    if (query.correctionStatus && item.correctionStatus !== query.correctionStatus) return false;
    if (query.fixStatus && item.fixStatus !== query.fixStatus) return false;
    if (query.issueCode && !item.issueTags.some((tag) => tag.code === query.issueCode)) return false;
    if (query.causeType && !item.issueTags.some((tag) => tag.causeType === query.causeType) && item.rootCauseType !== query.causeType) return false;
    if (query.strategyVersion && item.aiStrategyVersion !== query.strategyVersion) return false;
    return true;
  });
};

export const correctionSummaryStats = (query: API.CorrectionSummaryQueryParams = {}): API.CorrectionSummaryStats => {
  const rows = filterCorrectionSummaries(query);
  const issueMap = new Map<string, API.CorrectionIssueTag>();
  const dimensionMap = new Map<string, { key: string; name: string; total: number; count: number; maxScore: number }>();
  rows.forEach((record) => {
    record.issueTags.forEach((tag) => {
      const current = issueMap.get(tag.code);
      issueMap.set(tag.code, current ? { ...current, count: current.count + tag.count } : { ...tag });
    });
    record.dimensionScores.forEach((dimension) => {
      const current = dimensionMap.get(dimension.key) ?? { key: dimension.key, name: dimension.name, total: 0, count: 0, maxScore: dimension.maxScore };
      current.total += dimension.score;
      current.count += 1;
      dimensionMap.set(dimension.key, current);
    });
  });
  const countByBand = (band: API.MockCorrectionRecord['scoreBand']) => rows.filter((item) => item.scoreBand === band).length;
  return {
    total: rows.length,
    normalCount: rows.filter((item) => item.correctionStatus === 'normal').length,
    abnormalCount: rows.filter((item) => item.correctionStatus === 'abnormal').length,
    needsReviewCount: rows.filter((item) => item.correctionStatus === 'needs_review').length,
    averageScore: rows.length ? Math.round(rows.reduce((sum, item) => sum + item.score, 0) / rows.length) : 0,
    scoreBands: (Object.keys(scoreBandLabel) as API.MockCorrectionRecord['scoreBand'][]).map((band) => ({ band, label: scoreBandLabel[band], count: countByBand(band) })),
    topIssues: [...issueMap.values()].sort((a, b) => b.count - a.count).slice(0, 5),
    dimensionAverages: [...dimensionMap.values()].map((item) => ({ key: item.key, name: item.name, averageScore: item.count ? Math.round(item.total / item.count) : 0, maxScore: item.maxScore })),
  };
};

export const createCorrectionFixDraft = (
  recordId: string,
  params: API.CorrectionFixDraftParams,
  operator: TemplateOperator,
) => {
  const record = getCorrectionSummary(recordId);
  if (!record) return { missing: true as const };
  if (record.dataVersion !== params.dataVersion) return { conflict: true as const };
  if (!params.diagnosis?.trim() || !params.changeSummary?.trim()) return { invalid: true as const, errorMessage: '需填写归因说明和变更说明。' };

  const now = nowText();
  let draft: API.CorrectionFixDraft | undefined;
  if (params.targetType === 'topic') {
    if (!['super_admin', 'teaching_reviewer'].includes(operator.roleId)) return { forbidden: true as const };
    const topic = getWritingTranslationTopic(record.topicId);
    if (!topic) return { invalid: true as const, errorMessage: '关联题目不存在。' };
    const topicDraft = copyWritingTranslationTopicDraft(topic, operator);
    topicDraft.changeSummary = params.changeSummary;
    draft = {
      id: `fix-draft-${topicDraft.id}`,
      targetType: 'topic',
      targetId: topicDraft.id,
      targetName: topicDraft.name,
      targetVersion: topicDraft.version,
      targetPath: `/writing-translation/${topicDraft.topicType === 'writing' ? 'writing-topics' : 'translation-topics'}/${topicDraft.id}/edit`,
      createdBy: operator.name,
      createdAt: now,
    };
  } else if (params.targetType === 'scoring_template' || params.targetType === 'feedback_template') {
    if (!canEditWritingTranslationTemplate(params.targetType, operator.roleId)) return { forbidden: true as const };
    const templateId = params.targetType === 'scoring_template' ? record.scoringTemplateRef.templateId : record.feedbackTemplateRef.templateId;
    const template = getWritingTranslationTemplate(templateId);
    if (!template) return { invalid: true as const, errorMessage: '关联模板不存在。' };
    const templateDraft = copyWritingTranslationTemplate(template, operator);
    templateDraft.changeSummary = params.changeSummary;
    draft = {
      id: `fix-draft-${templateDraft.id}`,
      targetType: params.targetType,
      targetId: templateDraft.id,
      targetName: templateDraft.name,
      targetVersion: templateDraft.version,
      targetPath: `/writing-translation/scoring-feedback-templates?tab=${templateDraft.templateType === 'feedback_template' ? 'feedback' : 'scoring'}`,
      createdBy: operator.name,
      createdAt: now,
    };
  } else {
    if (!['super_admin', 'ai_operator'].includes(operator.roleId)) return { forbidden: true as const };
    const strategy = aiCoachStrategiesData.find((item) => item.id === record.aiStrategySnapshot.strategyId);
    if (!strategy) return { invalid: true as const, errorMessage: '关联 AI 策略不存在。' };
    const strategyDraft = copyAiCoachStrategyDraft(strategy, operator);
    strategyDraft.changeSummary = params.changeSummary;
    draft = {
      id: `fix-draft-${strategyDraft.id}`,
      targetType: 'ai_strategy',
      targetId: strategyDraft.id,
      targetName: strategyDraft.title,
      targetVersion: strategyDraft.version,
      targetPath: `/ai-coach/prompts/${strategyDraft.id}/edit`,
      createdBy: operator.name,
      createdAt: now,
    };
  }

  record.rootCauseType = params.targetType;
  record.diagnosis = params.diagnosis.trim();
  record.fixStatus = 'draft_created';
  record.linkedFixDrafts.unshift(draft);
  record.dataVersion += 1;
  record.updatedAt = now;
  return { record, draft };
};

export const bindTemplatesToTopic = (topicId: string, params: API.WritingTranslationTopicTemplateBindingParams, operator: TemplateOperator) => {
  if (!['super_admin', 'teaching_reviewer'].includes(operator.roleId)) return { forbidden: true as const };
  const topic = getWritingTranslationTopic(topicId); if (!topic) return { missing: true as const };
  if (!['draft', 'rejected'].includes(topic.status)) return { locked: true as const };
  if (topic.dataVersion !== params.dataVersion) return { conflict: true as const };
  const scoring = getWritingTranslationTemplate(params.scoringTemplateId); const feedback = getWritingTranslationTemplate(params.feedbackTemplateId);
  if (!scoring || scoring.templateType !== 'scoring_template' || scoring.status !== 'published' || !feedback || feedback.templateType !== 'feedback_template' || feedback.status !== 'published') return { invalid: true as const, errorMessage: '只能绑定已发布的评分模板和反馈模板。' };
  if (!scoring.topicTypes.includes(topic.topicType) || !feedback.topicTypes.includes(topic.topicType) || !scoring.examTypes.includes(topic.examType) || !feedback.examTypes.includes(topic.examType) || scoring.totalScore !== topic.totalScore) return { invalid: true as const, errorMessage: '模板适用题型、考试类型或总分与题目不匹配。' };
  topic.scoringTemplateRef = templateRef(scoring); topic.feedbackTemplateRef = templateRef(feedback); topic.scoringDimensions = clone(scoring.dimensions); topic.correctionRule.feedbackStructure = feedback.sections.sort((a,b) => a.order-b.order).map((item) => item.title); topic.dataVersion += 1; topic.updatedAt = nowText(); topic.updatedBy = operator.name; return { topic };
};

export const runMockCorrection = (topicId: string) => {
  const topic = getWritingTranslationTopic(topicId); if (!topic?.scoringTemplateRef || !topic.feedbackTemplateRef) return { invalid: true as const, errorMessage: '题目尚未绑定完整模板版本。' };
  const scoring = getWritingTranslationTemplate(topic.scoringTemplateRef.templateId); const feedback = getWritingTranslationTemplate(topic.feedbackTemplateRef.templateId);
  if (!scoring || scoring.templateType !== 'scoring_template' || !feedback || scoring.status !== 'published' || feedback.status !== 'published' || feedback.templateType !== 'feedback_template') return { invalid: true as const, errorMessage: '绑定模板已失效，不能生成新的 Mock 批改记录。' };
  const record = buildCorrectionRecord(topic, scoring, feedback, {
    scoreRatio: 0.78,
    issueCodes: topic.topicType === 'writing' ? ['language_accuracy', 'missing_revision'] : ['topic_requirement'],
    answerSummary: '脱敏摘要：Mock 会话仅保留结构化表现，不记录用户原文。',
    correctionStatus: 'normal',
    createdAt: nowText(),
  });
  mockCorrectionRecords.unshift(record); return { record };
};
