import type { Request, Response } from 'express';
import type { AdminRoleId } from '../src/foundation/permissions';
import { roleCanPerformAction, roleConfigs } from '../src/foundation/permissions';
import { pushOperationAuditLog } from './auditStore';
import { mockSession } from './session';
import { reviewTasksData } from './user';
import {
  bindTemplatesToTopic,
  canEditWritingTranslationTemplate,
  copyWritingTranslationTemplate,
  correctionSummaryStats,
  createCorrectionFixDraft,
  filterCorrectionSummaries,
  filterWritingTranslationTemplates,
  getCorrectionSummary,
  getWritingTranslationTemplate,
  mockCorrectionRecords,
  precheckWritingTranslationTemplate,
  runMockCorrection,
  saveWritingTranslationTemplate,
  submitWritingTranslationTemplateReview,
} from './writingTranslationTemplateStore';

const roleId = () => mockSession.currentRoleId as AdminRoleId | '';
const operator = () => {
  const id = roleId() || 'super_admin';
  return { id: mockSession.currentAccountId || id, name: mockSession.currentAccountName || roleConfigs[id].name, roleId: id, roleName: roleConfigs[id].name };
};
const canRead = () => Boolean(roleId() && roleCanPerformAction(roleId() as AdminRoleId, 'writingTranslation', 'read'));
const forbidden = (res: Response, action: string, objectId = 'writing-translation-template') => {
  if (roleId()) pushOperationAuditLog({ roleId: roleId() as AdminRoleId, logType: 'permission_denied', action, objectType: 'writing_translation_template', objectId, sourcePage: '/writing-translation/scoring-feedback-templates', reason: '角色无模板操作权限。', result: 'denied', changeSummary: `写译模板 ${action} 被拒绝。` });
  res.status(403).send({ success: false, errorCode: '403', errorMessage: '无权执行该模板操作。' });
};
const missing = (res: Response) => res.status(404).send({ success: false, errorCode: '404', errorMessage: '模板不存在。' });
const auditSuccess = (action: string, objectId: string, summary: string, version?: string) => pushOperationAuditLog({ roleId: roleId() as AdminRoleId, action, objectType: 'writing_translation_template', objectId, sourcePage: '/writing-translation/scoring-feedback-templates', reason: summary, result: 'success', changeSummary: summary, version });

const correctionQuery = (req: Request): API.CorrectionSummaryQueryParams => ({
  current: Number(req.query.current || 1),
  pageSize: Number(req.query.pageSize || 20),
  keyword: typeof req.query.keyword === 'string' ? req.query.keyword : undefined,
  topicType: typeof req.query.topicType === 'string' ? req.query.topicType as API.WritingTranslationTopicType : undefined,
  examType: typeof req.query.examType === 'string' ? req.query.examType as API.ExamType : undefined,
  scoreBand: typeof req.query.scoreBand === 'string' ? req.query.scoreBand as API.MockCorrectionRecord['scoreBand'] : undefined,
  correctionStatus: typeof req.query.correctionStatus === 'string' ? req.query.correctionStatus as API.MockCorrectionRecord['correctionStatus'] : undefined,
  fixStatus: typeof req.query.fixStatus === 'string' ? req.query.fixStatus as API.CorrectionFixStatus : undefined,
  issueCode: typeof req.query.issueCode === 'string' ? req.query.issueCode : undefined,
  causeType: typeof req.query.causeType === 'string' ? req.query.causeType as API.CorrectionFixTargetType : undefined,
  strategyVersion: typeof req.query.strategyVersion === 'string' ? req.query.strategyVersion : undefined,
});

export default {
  'GET /api/writing-translation/correction-summaries/stats': (req: Request, res: Response) => {
    if (!canRead()) return forbidden(res, 'read_correction_summary');
    res.send({ success: true, data: correctionSummaryStats(correctionQuery(req)) });
  },
  'GET /api/writing-translation/correction-summaries': (req: Request, res: Response) => {
    if (!canRead()) return forbidden(res, 'read_correction_summary');
    const query = correctionQuery(req);
    const rows = filterCorrectionSummaries(query);
    const start = ((query.current || 1) - 1) * (query.pageSize || 20);
    res.send({ success: true, data: rows.slice(start, start + (query.pageSize || 20)), total: rows.length });
  },
  'GET /api/writing-translation/correction-summaries/:id': (req: Request, res: Response) => {
    if (!canRead()) return forbidden(res, 'read_correction_summary', String(req.params.id));
    const record = getCorrectionSummary(String(req.params.id));
    if (!record) return res.status(404).send({ success: false, errorCode: '404', errorMessage: '批改记录不存在。' });
    res.send({ success: true, data: record });
  },
  'POST /api/writing-translation/correction-summaries/:id/fix-drafts': (req: Request, res: Response) => {
    if (!roleId()) return forbidden(res, 'create_fix_draft', String(req.params.id));
    const result = createCorrectionFixDraft(String(req.params.id), req.body as API.CorrectionFixDraftParams, operator());
    if ('missing' in result) return res.status(404).send({ success: false, errorCode: '404', errorMessage: '批改记录不存在。' });
    if ('forbidden' in result) return forbidden(res, 'create_fix_draft', String(req.params.id));
    if ('conflict' in result) return res.status(409).send({ success: false, errorCode: '409', errorMessage: '批改记录已变化，请刷新后再操作。' });
    if ('invalid' in result) return res.status(422).send({ success: false, errorCode: '422', errorMessage: result.errorMessage });
    pushOperationAuditLog({ roleId: roleId() as AdminRoleId, action: 'create_fix_draft', objectType: 'writing_translation_correction_summary', objectId: result.record.id, sourcePage: '/writing-translation/correction-summaries', reason: req.body?.diagnosis || '从批改记录发起修正草稿。', result: 'success', changeSummary: `创建${result.draft.targetName}修正草稿，来源 ${result.record.id}。`, version: result.draft.targetVersion });
    res.send({ success: true, data: result.record, draft: result.draft });
  },
  'GET /api/writing-translation/templates': (req: Request, res: Response) => {
    if (!canRead()) return forbidden(res, 'read');
    const query: API.WritingTranslationTemplateQueryParams = { current: Number(req.query.current || 1), pageSize: Number(req.query.pageSize || 20), templateType: typeof req.query.templateType === 'string' ? req.query.templateType as API.WritingTranslationTemplateType : undefined, keyword: typeof req.query.keyword === 'string' ? req.query.keyword : undefined, status: typeof req.query.status === 'string' ? req.query.status as API.WritingTranslationTemplateStatus : undefined, topicType: typeof req.query.topicType === 'string' ? req.query.topicType as API.WritingTranslationTopicType : undefined, examType: typeof req.query.examType === 'string' ? req.query.examType as API.ExamType : undefined };
    const rows = filterWritingTranslationTemplates(query); const start = ((query.current || 1) - 1) * (query.pageSize || 20);
    res.send({ success: true, data: rows.slice(start, start + (query.pageSize || 20)), total: rows.length });
  },
  'GET /api/writing-translation/templates/:id': (req: Request, res: Response) => {
    if (!canRead()) return forbidden(res, 'read', String(req.params.id)); const item = getWritingTranslationTemplate(String(req.params.id)); if (!item) return missing(res); res.send({ success: true, data: item });
  },
  'POST /api/writing-translation/templates': (req: Request, res: Response) => {
    const body = req.body as API.WritingTranslationTemplateSaveParams; if (!roleId() || !canEditWritingTranslationTemplate(body.templateType, roleId() as AdminRoleId)) return forbidden(res, 'create');
    const result = saveWritingTranslationTemplate(body, operator()); if ('forbidden' in result) return forbidden(res, 'create'); if (!result.template) return res.status(500).send({ success: false, errorCode: '500', errorMessage: '模板创建失败。' });
    auditSuccess('create', result.template.id, `创建${result.template.templateType === 'scoring_template' ? '评分维度' : '反馈'}模板草稿。`, result.template.version);
    res.send({ success: true, data: result.template });
  },
  'PATCH /api/writing-translation/templates/:id': (req: Request, res: Response) => {
    const item = getWritingTranslationTemplate(String(req.params.id)); if (!item) return missing(res); const result = saveWritingTranslationTemplate(req.body as API.WritingTranslationTemplateSaveParams, operator(), item);
    if ('forbidden' in result) return forbidden(res, 'edit', item.id); if ('conflict' in result) return res.status(409).send({ success: false, errorCode: '409', errorMessage: '模板数据已变化，请刷新后再保存。' }); if ('locked' in result) return res.status(422).send({ success: false, errorCode: '422', errorMessage: '当前状态不可直接编辑，请复制新版本。' }); auditSuccess('edit', item.id, result.template.changeSummary, result.template.version); res.send({ success: true, data: result.template });
  },
  'POST /api/writing-translation/templates/:id/precheck': (req: Request, res: Response) => {
    if (!canRead()) return forbidden(res, 'precheck', String(req.params.id)); const item = getWritingTranslationTemplate(String(req.params.id)); if (!item) return missing(res); item.lastPrecheck = precheckWritingTranslationTemplate(item, item.id); res.send({ success: true, data: item.lastPrecheck });
  },
  'POST /api/writing-translation/templates/:id/submit-review': (req: Request, res: Response) => {
    const item = getWritingTranslationTemplate(String(req.params.id)); if (!item) return missing(res); const result = submitWritingTranslationTemplateReview(item, req.body as API.WritingTranslationSubmitParams, operator(), reviewTasksData);
    if ('forbidden' in result) return forbidden(res, 'submit', item.id); if ('conflict' in result) return res.status(409).send({ success: false, errorCode: '409', errorMessage: '模板数据已变化。' }); if ('locked' in result) return res.status(422).send({ success: false, errorCode: '422', errorMessage: '当前状态不可提交。' }); if ('precheck' in result && result.precheck) return res.status(422).send({ success: false, errorCode: '422', errorMessage: result.precheck.summary, data: result.precheck }); auditSuccess('submit', item.id, req.body?.changeSummary || '提交模板审核。', item.version); res.send({ success: true, data: result.template, reviewTask: result.task });
  },
  'POST /api/writing-translation/templates/:id/copy': (req: Request, res: Response) => {
    const item = getWritingTranslationTemplate(String(req.params.id)); if (!item) return missing(res); if (!roleId() || !canEditWritingTranslationTemplate(item.templateType, roleId() as AdminRoleId)) return forbidden(res, 'copy', item.id); const copy = copyWritingTranslationTemplate(item, operator()); auditSuccess('copy', item.id, `从 ${item.version} 复制新草稿 ${copy.version}。`, copy.version); res.send({ success: true, data: copy });
  },
  'GET /api/writing-translation/templates/:id/versions': (req: Request, res: Response) => {
    if (!canRead()) return forbidden(res, 'read_versions', String(req.params.id)); const item = getWritingTranslationTemplate(String(req.params.id)); if (!item) return missing(res); res.send({ success: true, data: item.versionRecords, total: item.versionRecords.length });
  },
  'GET /api/writing-translation/templates/:id/references': (req: Request, res: Response) => {
    if (!canRead()) return forbidden(res, 'read_references', String(req.params.id)); const id = String(req.params.id); const data = mockCorrectionRecords.filter((record) => record.scoringTemplateRef.templateId === id || record.feedbackTemplateRef.templateId === id); res.send({ success: true, data, total: data.length });
  },
  'PATCH /api/writing-translation/topics/:id/template-references': (req: Request, res: Response) => {
    const result = bindTemplatesToTopic(String(req.params.id), req.body as API.WritingTranslationTopicTemplateBindingParams, operator()); if ('forbidden' in result) return forbidden(res, 'bind_topic', String(req.params.id)); if ('missing' in result) return res.status(404).send({ success: false, errorCode: '404', errorMessage: '题目不存在。' }); if ('conflict' in result) return res.status(409).send({ success: false, errorCode: '409', errorMessage: '题目数据已变化。' }); if ('locked' in result) return res.status(422).send({ success: false, errorCode: '422', errorMessage: '只能调整草稿或已驳回题目的模板引用。' }); if ('invalid' in result) return res.status(422).send({ success: false, errorCode: '422', errorMessage: result.errorMessage }); auditSuccess('bind_topic', String(req.params.id), '绑定评分模板与反馈模板发布版本。', result.topic.version); res.send({ success: true, data: result.topic });
  },
  'POST /api/writing-translation/mock-corrections': (req: Request, res: Response) => {
    if (!canRead()) return forbidden(res, 'mock_correction'); const result = runMockCorrection(String(req.body?.topicId || '')); if ('invalid' in result) return res.status(422).send({ success: false, errorCode: '422', errorMessage: result.errorMessage }); auditSuccess('mock_correction', result.record.topicId, `生成 Mock 批改记录 ${result.record.id}，不记录用户原文。`, result.record.topicVersion); res.send({ success: true, data: result.record });
  },
};
