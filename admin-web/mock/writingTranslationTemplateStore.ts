import type { AdminRoleId } from '../src/foundation/permissions';
import { nowText } from './auditStore';
import { aiCoachStrategiesData } from './aiCoachStore';
import { getWritingTranslationTopic } from './writingTranslationStore';

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
  if (!scoring || !feedback || scoring.status !== 'published' || feedback.status !== 'published' || feedback.templateType !== 'feedback_template') return { invalid: true as const, errorMessage: '绑定模板已失效，不能生成新的 Mock 批改记录。' };
  const record: API.MockCorrectionRecord = { id: uid('mock-correction'), topicId: topic.id, topicName: topic.name, topicVersion: topic.version, scoringTemplateRef: clone(topic.scoringTemplateRef), feedbackTemplateRef: clone(topic.feedbackTemplateRef), aiStrategyVersion: feedback.responseStructureRef.strategyVersion, score: Math.round(topic.totalScore * 0.78), feedbackSections: feedback.sections.sort((a,b) => a.order-b.order).map((item) => ({ title: item.title, content: `Mock ${item.title}结果，仅验证结构与版本追溯。` })), createdAt: nowText(), mockOnly: true };
  mockCorrectionRecords.unshift(record); return { record };
};
