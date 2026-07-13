import type { Request, Response } from 'express';
import type { AdminRoleId } from '../src/foundation/permissions';
import { roleCanPerformAction, roleConfigs } from '../src/foundation/permissions';
import { pushOperationAuditLog } from './auditStore';
import { mockSession } from './session';
import { reviewTasksData } from './user';
import {
  canEditRevisionStrategy,
  copyRevisionStrategy,
  filterRevisionStrategies,
  getRevisionStrategy,
  mockRevisionRecords,
  precheckRevisionStrategy,
  revisionEffectSummary,
  runMockRevisionSubmission,
  saveRevisionStrategy,
  submitRevisionStrategyReview,
} from './writingRevisionStrategyStore';

const roleId = () => mockSession.currentRoleId as AdminRoleId | '';
const operator = () => {
  const id = roleId() || 'super_admin';
  return {
    id: mockSession.currentAccountId || id,
    name: mockSession.currentAccountName || roleConfigs[id].name,
    roleId: id,
    roleName: roleConfigs[id].name,
  };
};
const canRead = () => Boolean(roleId() && roleCanPerformAction(roleId() as AdminRoleId, 'writingTranslation', 'read'));
const forbidden = (res: Response, action: string, objectId = 'writing-revision-strategy') => {
  if (roleId()) {
    pushOperationAuditLog({
      roleId: roleId() as AdminRoleId,
      logType: 'permission_denied',
      action,
      objectType: 'writing_translation_revision_strategy',
      objectId,
      sourcePage: '/writing-translation/revision-strategies',
      reason: '角色无二改策略操作权限。',
      result: 'denied',
      changeSummary: `二改策略 ${action} 被拒绝。`,
    });
  }
  res.status(403).send({ success: false, errorCode: '403', errorMessage: '无权执行该二改策略操作。' });
};
const missing = (res: Response) => res.status(404).send({ success: false, errorCode: '404', errorMessage: '二改策略不存在。' });
const auditSuccess = (action: string, objectId: string, summary: string, version?: string) => pushOperationAuditLog({
  roleId: roleId() as AdminRoleId,
  action,
  objectType: 'writing_translation_revision_strategy',
  objectId,
  sourcePage: '/writing-translation/revision-strategies',
  reason: summary,
  result: 'success',
  changeSummary: summary,
  version,
});

export default {
  'GET /api/writing-translation/revision-strategies': (req: Request, res: Response) => {
    if (!canRead()) return forbidden(res, 'read');
    const query: API.WritingRevisionStrategyQueryParams = {
      current: Number(req.query.current || 1),
      pageSize: Number(req.query.pageSize || 20),
      keyword: typeof req.query.keyword === 'string' ? req.query.keyword : undefined,
      status: typeof req.query.status === 'string' ? req.query.status as API.WritingRevisionStrategyStatus : undefined,
      topicType: typeof req.query.topicType === 'string' ? req.query.topicType as API.WritingTranslationTopicType : undefined,
      examType: typeof req.query.examType === 'string' ? req.query.examType as API.ExamType : undefined,
    };
    const rows = filterRevisionStrategies(query);
    const start = ((query.current || 1) - 1) * (query.pageSize || 20);
    res.send({ success: true, data: rows.slice(start, start + (query.pageSize || 20)), total: rows.length });
  },
  'GET /api/writing-translation/revision-strategies/:id': (req: Request, res: Response) => {
    if (!canRead()) return forbidden(res, 'read', String(req.params.id));
    const item = getRevisionStrategy(String(req.params.id));
    if (!item) return missing(res);
    res.send({ success: true, data: item });
  },
  'POST /api/writing-translation/revision-strategies': (req: Request, res: Response) => {
    if (!roleId() || !canEditRevisionStrategy(roleId() as AdminRoleId)) return forbidden(res, 'create');
    const result = saveRevisionStrategy(req.body as API.WritingRevisionStrategySaveParams, operator());
    if ('forbidden' in result) return forbidden(res, 'create');
    if ('invalid' in result) return res.status(422).send({ success: false, errorCode: '422', errorMessage: result.errorMessage });
    const strategy = result.strategy;
    if (!strategy) return res.status(500).send({ success: false, errorCode: '500', errorMessage: '二改策略创建失败。' });
    auditSuccess('create', strategy.id, '创建二改策略草稿。', strategy.version);
    res.send({ success: true, data: strategy });
  },
  'PATCH /api/writing-translation/revision-strategies/:id': (req: Request, res: Response) => {
    const item = getRevisionStrategy(String(req.params.id));
    if (!item) return missing(res);
    const result = saveRevisionStrategy(req.body as API.WritingRevisionStrategySaveParams, operator(), item);
    if ('forbidden' in result) return forbidden(res, 'edit', item.id);
    if ('conflict' in result) return res.status(409).send({ success: false, errorCode: '409', errorMessage: '策略数据已变化，请刷新后再保存。' });
    if ('locked' in result) return res.status(422).send({ success: false, errorCode: '422', errorMessage: '当前状态不可直接编辑，请复制新版本。' });
    if ('invalid' in result) return res.status(422).send({ success: false, errorCode: '422', errorMessage: result.errorMessage });
    auditSuccess('edit', item.id, result.strategy.changeSummary, result.strategy.version);
    res.send({ success: true, data: result.strategy });
  },
  'POST /api/writing-translation/revision-strategies/:id/precheck': (req: Request, res: Response) => {
    if (!canRead()) return forbidden(res, 'precheck', String(req.params.id));
    const item = getRevisionStrategy(String(req.params.id));
    if (!item) return missing(res);
    item.lastPrecheck = precheckRevisionStrategy(item, item.id);
    res.send({ success: true, data: item.lastPrecheck });
  },
  'POST /api/writing-translation/revision-strategies/:id/submit-review': (req: Request, res: Response) => {
    const item = getRevisionStrategy(String(req.params.id));
    if (!item) return missing(res);
    const result = submitRevisionStrategyReview(item, req.body as API.WritingTranslationSubmitParams, operator(), reviewTasksData);
    if ('forbidden' in result) return forbidden(res, 'submit', item.id);
    if ('conflict' in result) return res.status(409).send({ success: false, errorCode: '409', errorMessage: '策略数据已变化。' });
    if ('locked' in result) return res.status(422).send({ success: false, errorCode: '422', errorMessage: '当前状态不可提交。' });
    if ('precheck' in result && result.precheck) return res.status(422).send({ success: false, errorCode: '422', errorMessage: result.precheck.summary, data: result.precheck });
    auditSuccess('submit', item.id, req.body?.changeSummary || '提交二改策略审核。', item.version);
    res.send({ success: true, data: result.strategy, reviewTask: result.task });
  },
  'POST /api/writing-translation/revision-strategies/:id/copy': (req: Request, res: Response) => {
    const item = getRevisionStrategy(String(req.params.id));
    if (!item) return missing(res);
    if (!roleId() || !canEditRevisionStrategy(roleId() as AdminRoleId)) return forbidden(res, 'copy', item.id);
    const copy = copyRevisionStrategy(item, operator());
    auditSuccess('copy', item.id, `从 ${item.version} 复制新草稿 ${copy.version}。`, copy.version);
    res.send({ success: true, data: copy });
  },
  'GET /api/writing-translation/revision-strategies/:id/mock-records': (req: Request, res: Response) => {
    if (!canRead()) return forbidden(res, 'read_mock_records', String(req.params.id));
    const data = mockRevisionRecords.filter((record) => record.strategyId === String(req.params.id));
    res.send({ success: true, data, total: data.length });
  },
  'GET /api/writing-translation/mock-revision-records': (_req: Request, res: Response) => {
    if (!canRead()) return forbidden(res, 'read_mock_records');
    res.send({ success: true, data: mockRevisionRecords, total: mockRevisionRecords.length });
  },
  'POST /api/writing-translation/mock-revision-submissions': (req: Request, res: Response) => {
    if (!canRead()) return forbidden(res, 'mock_revision');
    const result = runMockRevisionSubmission(req.body as API.MockRevisionSubmissionParams);
    if ('invalid' in result) return res.status(422).send({ success: false, errorCode: '422', errorMessage: result.errorMessage });
    auditSuccess('mock_revision', result.record.strategyId, `生成 Mock 二改记录 ${result.record.id}。`, result.record.strategyVersion);
    res.send({ success: true, data: result.record, effect: result.effect });
  },
  'GET /api/writing-translation/revision-effects': (req: Request, res: Response) => {
    if (!canRead()) return forbidden(res, 'read_effects');
    res.send({ success: true, data: revisionEffectSummary() });
  },
};
