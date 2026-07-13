import type { AdminRoleId } from '../src/foundation/permissions';
import { nowText } from './auditStore';
import { getWritingTranslationTemplate, writingTranslationTemplatesData } from './writingTranslationTemplateStore';
import { getWritingTranslationTopic, writingTranslationTopicsData } from './writingTranslationStore';

export type RevisionOperator = { id: string; name: string; roleId: AdminRoleId; roleName: string };

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const templateRef = (template: API.WritingTranslationTemplate): API.WritingTranslationTemplateReference => ({
  templateId: template.id,
  templateName: template.name,
  templateType: template.templateType,
  version: template.version,
  releaseVersionId: template.releaseVersionId!,
  statusAtBinding: template.status,
  boundAt: nowText(),
});

const zeroEffect = (updatedAt = '2026-07-10 10:00:00'): API.RevisionEffectSummary => ({
  submissions: 0,
  triggered: 0,
  revised: 0,
  skipped: 0,
  triggerRate: 0,
  revisionRate: 0,
  completionRate: 0,
  commonIssues: [],
  updatedAt,
});

const scoring = writingTranslationTemplatesData.find((item) => item.id === 'wt-scoring-default' && item.templateType === 'scoring_template')!;
const feedback = writingTranslationTemplatesData.find((item) => item.id === 'wt-feedback-default' && item.templateType === 'feedback_template')!;

export const revisionStrategiesData: API.WritingRevisionStrategy[] = [
  {
    id: 'wt-revision-low-score-v1',
    name: '写译低分二改引导策略',
    description: '对总分偏低或语言维度偏低的提交触发二次修改。',
    topicTypes: ['writing', 'translation'],
    examTypes: ['CET4', 'CET6'],
    status: 'published',
    version: 'v1.0.0',
    dataVersion: 1,
    scoringTemplateRef: templateRef(scoring),
    feedbackTemplateRef: templateRef(feedback),
    triggerCondition: {
      scoreBelow: 38,
      dimensionScoreBelow: [{ dimensionKey: 'language', dimensionName: '语言准确性', threshold: 13 }],
      issueTags: ['language_accuracy', 'logic_gap'],
      feedbackSectionKeys: ['issues', 'revision'],
    },
    requirement: {
      focus: '优先修改语言错误和逻辑断点，保留原有观点。',
      minChangedWords: 30,
      mustAddressIssueTags: ['language_accuracy'],
      responseFormat: '按“我修改了什么 / 为什么这样改”提交。',
      deadlineMinutes: 30,
    },
    promptMode: 'ai_guided',
    promptTemplate: '请先定位最高优先级问题，再要求学生完成一次最小修改，不提供完整代写。',
    createdBy: '教研审核',
    createdById: 'teaching_reviewer',
    createdAt: '2026-07-10 10:00:00',
    updatedBy: '教研审核',
    updatedById: 'teaching_reviewer',
    updatedAt: '2026-07-10 10:00:00',
    releaseVersionId: 'release-wt-revision-low-score-v1',
    changeSummary: '初始化低分二改策略。',
    effectSummary: { ...zeroEffect(), submissions: 4, triggered: 3, revised: 2, skipped: 1, triggerRate: 75, revisionRate: 50, completionRate: 66.7, commonIssues: [{ tag: 'language_accuracy', count: 3 }, { tag: 'logic_gap', count: 2 }] },
    versionRecords: [],
    operationRecords: [],
  },
  {
    id: 'wt-revision-translation-draft',
    name: '翻译要点遗漏二改草稿',
    description: '翻译题命中要点遗漏时触发二改。',
    topicTypes: ['translation'],
    examTypes: ['CET4'],
    status: 'draft',
    version: 'v1.1.0',
    dataVersion: 1,
    scoringTemplateRef: templateRef(scoring),
    feedbackTemplateRef: templateRef(feedback),
    triggerCondition: {
      scoreBelow: 40,
      issueTags: ['missing_key_point'],
      feedbackSectionKeys: ['issues'],
    },
    requirement: {
      focus: '补齐关键语义点，避免逐字直译。',
      minChangedWords: 20,
      mustAddressIssueTags: ['missing_key_point'],
      responseFormat: '列出补充的关键点并提交修订译文。',
      deadlineMinutes: 20,
    },
    promptMode: 'inline_hint',
    promptTemplate: '提示学生补齐遗漏要点，不直接给出完整译文。',
    createdBy: 'AI 策略运营',
    createdById: 'ai_operator',
    createdAt: '2026-07-10 10:00:00',
    updatedBy: 'AI 策略运营',
    updatedById: 'ai_operator',
    updatedAt: '2026-07-10 10:00:00',
    changeSummary: '配置翻译要点遗漏二改草稿。',
    effectSummary: zeroEffect(),
    versionRecords: [],
    operationRecords: [],
  },
];

export const mockRevisionRecords: API.MockRevisionRecord[] = [];

export const canEditRevisionStrategy = (roleId: AdminRoleId) => ['super_admin', 'teaching_reviewer', 'ai_operator'].includes(roleId);

export const getRevisionStrategy = (id: string) => revisionStrategiesData.find((item) => item.id === id);

export const filterRevisionStrategies = (query: API.WritingRevisionStrategyQueryParams) => revisionStrategiesData.filter((item) => {
  if (query.status && item.status !== query.status) return false;
  if (query.topicType && !item.topicTypes.includes(query.topicType)) return false;
  if (query.examType && !item.examTypes.includes(query.examType)) return false;
  if (query.keyword && !`${item.id} ${item.name} ${item.description}`.toLowerCase().includes(query.keyword.toLowerCase())) return false;
  return true;
});

export const precheckRevisionStrategy = (value: API.WritingRevisionStrategySaveParams | API.WritingRevisionStrategy, id?: string): API.WritingTranslationPrecheckResult => {
  const issues: API.WritingTranslationPrecheckIssue[] = [];
  const add = (level: API.WritingTranslationPrecheckLevel, code: string, field: string, message: string, suggestion: string) => issues.push({ id: uid('issue'), level, code, field, message, suggestion });
  if (!value.name?.trim()) add('error', 'NAME_REQUIRED', 'name', '策略名称不能为空。', '填写策略名称。');
  if (!value.topicTypes?.length) add('error', 'TOPIC_TYPE_REQUIRED', 'topicTypes', '至少选择一种题型。', '选择写作或翻译。');
  if (!value.examTypes?.length) add('error', 'EXAM_TYPE_REQUIRED', 'examTypes', '至少选择一种考试类型。', '选择 CET4 或 CET6。');
  const scoringTemplate = 'scoringTemplateRef' in value ? getWritingTranslationTemplate(value.scoringTemplateRef.templateId) : getWritingTranslationTemplate(value.scoringTemplateId);
  const feedbackTemplate = 'feedbackTemplateRef' in value ? getWritingTranslationTemplate(value.feedbackTemplateRef.templateId) : getWritingTranslationTemplate(value.feedbackTemplateId);
  if (!scoringTemplate || scoringTemplate.templateType !== 'scoring_template' || scoringTemplate.status !== 'published') add('error', 'SCORING_TEMPLATE_INVALID', 'scoringTemplateId', '必须绑定已发布评分模板版本。', '选择已发布评分模板。');
  if (!feedbackTemplate || feedbackTemplate.templateType !== 'feedback_template' || feedbackTemplate.status !== 'published') add('error', 'FEEDBACK_TEMPLATE_INVALID', 'feedbackTemplateId', '必须绑定已发布反馈模板版本。', '选择已发布反馈模板。');
  if (scoringTemplate && feedbackTemplate) {
    const topicMismatch = value.topicTypes.some((type) => !scoringTemplate.topicTypes.includes(type) || !feedbackTemplate.topicTypes.includes(type));
    const examMismatch = value.examTypes.some((type) => !scoringTemplate.examTypes.includes(type) || !feedbackTemplate.examTypes.includes(type));
    if (topicMismatch || examMismatch) add('error', 'TEMPLATE_SCOPE_MISMATCH', 'templateRefs', '策略适用范围必须被评分和反馈模板同时覆盖。', '调整策略范围或模板版本。');
  }
  const condition = value.triggerCondition;
  if (!condition?.scoreBelow && !condition?.dimensionScoreBelow?.length && !condition?.issueTags?.length && !condition?.feedbackSectionKeys?.length) add('error', 'TRIGGER_REQUIRED', 'triggerCondition', '至少配置一个触发条件。', '配置总分、维度、问题标签或反馈区块触发。');
  if (condition?.scoreBelow !== undefined && scoringTemplate?.templateType === 'scoring_template' && Number(condition.scoreBelow) >= scoringTemplate.totalScore) add('warning', 'SCORE_THRESHOLD_HIGH', 'triggerCondition.scoreBelow', '总分阈值接近或超过满分，可能导致过度触发。', '降低总分触发阈值。');
  if (!value.requirement?.focus?.trim()) add('error', 'REQUIREMENT_FOCUS_REQUIRED', 'requirement.focus', '二改要求不能为空。', '填写学生需要修改的重点。');
  if (!value.promptTemplate?.trim()) add('error', 'PROMPT_REQUIRED', 'promptTemplate', '提示模板不能为空。', '填写二改提示模板。');
  const level: API.WritingTranslationPrecheckLevel = issues.some((item) => item.level === 'error') ? 'error' : issues.some((item) => item.level === 'warning') ? 'warning' : 'passed';
  return { id: uid('precheck'), topicId: id, level, checkedAt: nowText(), issues, summary: level === 'passed' ? '预校验通过，可提交审核。' : `预校验发现 ${issues.length} 项问题。` };
};

export const saveRevisionStrategy = (params: API.WritingRevisionStrategySaveParams, operator: RevisionOperator, existing?: API.WritingRevisionStrategy) => {
  if (!canEditRevisionStrategy(operator.roleId)) return { forbidden: true as const };
  if (existing && !['draft', 'rejected'].includes(existing.status)) return { locked: true as const };
  if (existing && params.dataVersion !== existing.dataVersion) return { conflict: true as const };
  const scoringTemplate = getWritingTranslationTemplate(params.scoringTemplateId);
  const feedbackTemplate = getWritingTranslationTemplate(params.feedbackTemplateId);
  if (!scoringTemplate || !feedbackTemplate) return { invalid: true as const, errorMessage: '绑定模板不存在。' };
  const timestamp = nowText();
  const common = {
    name: params.name.trim(),
    description: params.description?.trim() || '',
    topicTypes: params.topicTypes,
    examTypes: params.examTypes,
    scoringTemplateRef: templateRef(scoringTemplate),
    feedbackTemplateRef: templateRef(feedbackTemplate),
    triggerCondition: clone(params.triggerCondition),
    requirement: clone(params.requirement),
    promptMode: params.promptMode,
    promptTemplate: params.promptTemplate.trim(),
    updatedBy: operator.name,
    updatedById: operator.id,
    updatedAt: timestamp,
    changeSummary: params.changeSummary?.trim() || '更新二改策略草稿。',
  };
  if (existing) {
    Object.assign(existing, common);
    existing.dataVersion += 1;
    return { strategy: existing };
  }
  const strategy: API.WritingRevisionStrategy = {
    id: uid('wt-revision'),
    ...common,
    status: 'draft',
    version: 'v1.0.0',
    dataVersion: 1,
    createdBy: operator.name,
    createdById: operator.id,
    createdAt: timestamp,
    effectSummary: zeroEffect(timestamp),
    versionRecords: [],
    operationRecords: [],
  };
  revisionStrategiesData.unshift(strategy);
  return { strategy };
};

export const copyRevisionStrategy = (source: API.WritingRevisionStrategy, operator: RevisionOperator) => {
  const copy = clone(source);
  copy.id = uid('wt-revision');
  copy.status = 'draft';
  copy.version = `v${Number(source.version.slice(1).split('.')[0]) + 1}.0.0`;
  copy.dataVersion = 1;
  copy.reviewTaskId = undefined;
  copy.releaseVersionId = undefined;
  copy.rollbackTargetVersion = source.version;
  copy.createdBy = operator.name;
  copy.createdById = operator.id;
  copy.createdAt = nowText();
  copy.updatedBy = operator.name;
  copy.updatedById = operator.id;
  copy.updatedAt = copy.createdAt;
  copy.changeSummary = `从 ${source.version} 复制新版本。`;
  copy.effectSummary = zeroEffect(copy.createdAt);
  copy.versionRecords = [];
  copy.operationRecords = [];
  revisionStrategiesData.unshift(copy);
  return copy;
};

export const submitRevisionStrategyReview = (strategy: API.WritingRevisionStrategy, params: API.WritingTranslationSubmitParams, operator: RevisionOperator, tasks: API.ReviewTask[]) => {
  if (!canEditRevisionStrategy(operator.roleId)) return { forbidden: true as const };
  if (!['draft', 'rejected'].includes(strategy.status)) return { locked: true as const };
  if (params.dataVersion !== strategy.dataVersion) return { conflict: true as const };
  const precheck = precheckRevisionStrategy(strategy, strategy.id);
  strategy.lastPrecheck = precheck;
  if (precheck.level === 'error' || (precheck.level === 'warning' && !params.confirmWarnings)) return { precheck };
  const task: API.ReviewTask = {
    id: uid('review-wt-revision'),
    objectType: 'writing_translation_revision_strategy',
    objectSubtype: 'revision_strategy',
    objectTypeName: '二次修改策略',
    objectId: strategy.id,
    objectName: strategy.name,
    moduleKey: 'writingTranslation',
    moduleName: '写译批改',
    submitterId: operator.id,
    submitter: operator.name,
    submittedAt: nowText(),
    version: strategy.version,
    priority: 'P1',
    status: 'pending_review',
    riskLevel: 'medium',
    updatedAt: nowText(),
    changeSummary: params.changeSummary,
    impactScope: `${strategy.topicTypes.join('/')}，${strategy.examTypes.join('/')}`,
    objectDetailPath: `/writing-translation/revision-strategies?strategyId=${strategy.id}`,
    versionRecords: [],
    operationRecords: [],
  };
  tasks.unshift(task);
  strategy.status = 'pending_review';
  strategy.reviewTaskId = task.id;
  strategy.dataVersion += 1;
  strategy.updatedAt = nowText();
  return { strategy, task };
};

export const isRevisionStrategyReviewTask = (task: API.ReviewTask) => task.objectType === 'writing_translation_revision_strategy';

export const validateRevisionStrategyReviewTransition = (task: API.ReviewTask, next: API.ReviewTaskStatus) => {
  if (!isRevisionStrategyReviewTask(task) || next !== 'published') return { ok: true as const };
  const strategy = getRevisionStrategy(task.objectId);
  if (!strategy || strategy.version !== task.version) return { ok: false as const, errorMessage: '审核版本与二改策略当前版本不一致。' };
  const precheck = precheckRevisionStrategy(strategy, strategy.id);
  return precheck.level === 'error' ? { ok: false as const, errorMessage: '二改策略发布前复验失败。', precheck } : { ok: true as const };
};

export const syncRevisionStrategyFromReviewTask = (task: API.ReviewTask, next: API.ReviewTaskStatus, operator: RevisionOperator, reason: string) => {
  if (!isRevisionStrategyReviewTask(task)) return;
  const strategy = getRevisionStrategy(task.objectId);
  if (!strategy) return;
  strategy.status = next;
  strategy.updatedBy = operator.name;
  strategy.updatedById = operator.id;
  strategy.updatedAt = nowText();
  strategy.dataVersion += 1;
  if (next === 'published') strategy.releaseVersionId = `release-${strategy.id}-${strategy.version}`;
  strategy.operationRecords.unshift({ id: uid('op'), operator: operator.name, roleName: operator.roleName, action: next, toStatus: next, reason, time: strategy.updatedAt });
  strategy.versionRecords.unshift({ id: uid('version'), strategyId: strategy.id, version: strategy.version, status: next, createdBy: operator.name, createdAt: strategy.updatedAt, changeSummary: reason, currentOnline: next === 'published', snapshot: clone(strategy) });
};

const computeEffect = (strategyId: string): API.RevisionEffectSummary => {
  const records = mockRevisionRecords.filter((record) => record.strategyId === strategyId);
  const triggered = records.filter((record) => record.triggerMatched).length;
  const revised = records.filter((record) => record.status === 'revised').length;
  const skipped = records.filter((record) => record.status === 'skipped').length;
  const issueCounts = records.flatMap((record) => record.issueTags).reduce<Record<string, number>>((acc, tag) => {
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {});
  return {
    submissions: records.length,
    triggered,
    revised,
    skipped,
    triggerRate: records.length ? Number(((triggered / records.length) * 100).toFixed(1)) : 0,
    revisionRate: records.length ? Number(((revised / records.length) * 100).toFixed(1)) : 0,
    completionRate: triggered ? Number(((revised / triggered) * 100).toFixed(1)) : 0,
    commonIssues: Object.entries(issueCounts).sort((a, b) => b[1] - a[1]).map(([tag, count]) => ({ tag, count })).slice(0, 5),
    updatedAt: nowText(),
  };
};

export const runMockRevisionSubmission = (params: API.MockRevisionSubmissionParams) => {
  const strategy = getRevisionStrategy(params.strategyId);
  if (!strategy || strategy.status !== 'published') return { invalid: true as const, errorMessage: '只能使用已发布二改策略生成 Mock 提交。' };
  const topic = params.topicId ? getWritingTranslationTopic(params.topicId) : writingTranslationTopicsData.find((item) => strategy.topicTypes.includes(item.topicType) && strategy.examTypes.includes(item.examType));
  if (!topic) return { invalid: true as const, errorMessage: '没有可用于 Mock 的写译题目。' };
  const scoringTemplate = getWritingTranslationTemplate(strategy.scoringTemplateRef.templateId);
  const issueTags = strategy.triggerCondition.issueTags?.length ? clone(strategy.triggerCondition.issueTags) : ['language_accuracy'];
  const score = Math.max(0, Math.min(topic.totalScore, Math.round((strategy.triggerCondition.scoreBelow ?? topic.totalScore * 0.75) - 2)));
  const dimensionScores = scoringTemplate?.templateType === 'scoring_template'
    ? scoringTemplate.dimensions.map((dimension) => ({ dimensionKey: dimension.key, dimensionName: dimension.name, score: Math.max(0, Math.round(dimension.maxScore * 0.65)), maxScore: dimension.maxScore }))
    : [];
  const dimensionMatched = strategy.triggerCondition.dimensionScoreBelow?.some((condition) => {
    const scoreItem = dimensionScores.find((item) => item.dimensionKey === condition.dimensionKey);
    return scoreItem ? scoreItem.score < condition.threshold : false;
  }) ?? false;
  const triggerMatched = Boolean((strategy.triggerCondition.scoreBelow !== undefined && score < strategy.triggerCondition.scoreBelow) || dimensionMatched || issueTags.length);
  const record: API.MockRevisionRecord = {
    id: uid('mock-revision'),
    strategyId: strategy.id,
    strategyName: strategy.name,
    strategyVersion: strategy.version,
    topicId: topic.id,
    topicName: topic.name,
    topicType: topic.topicType,
    topicVersion: topic.version,
    scoringTemplateRef: clone(strategy.scoringTemplateRef),
    feedbackTemplateRef: clone(strategy.feedbackTemplateRef),
    score,
    dimensionScores,
    issueTags,
    triggerMatched,
    triggerSnapshot: clone(strategy.triggerCondition),
    requirementSnapshot: clone(strategy.requirement),
    status: triggerMatched ? (params.action === 'skip' ? 'skipped' : 'revised') : 'not_triggered',
    firstSubmittedAt: nowText(),
    revisedAt: triggerMatched && params.action !== 'skip' ? nowText() : undefined,
    mockOnly: true,
  };
  mockRevisionRecords.unshift(record);
  strategy.effectSummary = computeEffect(strategy.id);
  return { record, effect: strategy.effectSummary };
};

export const revisionEffectSummary = () => revisionStrategiesData.map((strategy) => ({ ...strategy.effectSummary, strategyId: strategy.id, strategyName: strategy.name, version: strategy.version }));
