import type { Request, Response } from 'express';
import { roleCanPerformAction, roleConfigs } from '../src/foundation/permissions';
import type { AdminRoleId, PermissionAction } from '../src/foundation/permissions';
import { pushOperationAuditLog } from './auditStore';
import {
  buildDailySentenceEffects,
  copyDailySentenceDraft,
  createDailySentence,
  dailySentenceImageAssets,
  filterDailySentences,
  getDailySentence,
  precheckDailySentence,
  reconcileDueDailySentenceSchedules,
  recordDailySentenceEvent,
  submitDailySentenceReview,
  updateDailySentence,
} from './dailySentenceStore';
import { mockSession } from './session';
import { reviewTasksData } from './user';

const roleId = () => mockSession.currentRoleId as AdminRoleId | '';

const operator = () => {
  const currentRoleId = roleId() || 'super_admin';
  const role = roleConfigs[currentRoleId];
  return {
    id: mockSession.currentAccountId || role.id,
    name: mockSession.currentAccountName || role.name,
    roleName: role.name,
  };
};

const canAction = (action: PermissionAction) => Boolean(roleId() && roleCanPerformAction(roleId() as AdminRoleId, 'content', action));

const sendForbidden = (res: Response, action: string, objectId = 'daily-sentence') => {
  if (roleId()) {
    pushOperationAuditLog({ roleId: roleId() as AdminRoleId, logType: 'permission_denied', action, objectType: 'content', objectId, sourcePage: '/content-operations/daily-sentences', reason: '角色无每日一句操作权限。', result: 'denied', changeSummary: `每日一句 ${action} 被拒绝。` });
  }
  res.status(403).send({ success: false, errorCode: '403', errorMessage: '无权执行每日一句操作。' });
};

const queryValue = (value: unknown) => Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '');
const pathValue = (value: string | string[]) => Array.isArray(value) ? String(value[0] ?? '') : String(value);

const readQuery = (query: Request['query']): API.DailySentenceQueryParams => ({
  current: Number(queryValue(query.current) || 1),
  pageSize: Number(queryValue(query.pageSize) || 20),
  keyword: queryValue(query.keyword) || undefined,
  startDate: queryValue(query.startDate) || undefined,
  endDate: queryValue(query.endDate) || undefined,
  status: (queryValue(query.status) as API.ReviewTaskStatus) || undefined,
  assetStatus: (queryValue(query.assetStatus) as API.DailySentenceImageAssetStatus) || undefined,
  creator: queryValue(query.creator) || undefined,
});

const audit = (action: string, result: 'success' | 'failed', objectId: string, reason: string, version?: string) => {
  if (!roleId()) return;
  pushOperationAuditLog({ roleId: roleId() as AdminRoleId, action, objectType: 'content', objectId, sourcePage: '/content-operations/daily-sentences', reason, result, changeSummary: reason, version });
};

export default {
  'GET /api/content-operations/daily-sentence-image-assets': (_req: Request, res: Response) => {
    if (!canAction('read')) return sendForbidden(res, '查看素材');
    res.send({ success: true, data: dailySentenceImageAssets });
  },
  'GET /api/content-operations/daily-sentences': (req: Request, res: Response) => {
    if (!canAction('read')) return sendForbidden(res, '查看列表');
    reconcileDueDailySentenceSchedules(reviewTasksData);
    const params = readQuery(req.query);
    const rows = filterDailySentences(params);
    const current = Math.max(1, params.current || 1);
    const pageSize = Math.max(1, params.pageSize || 20);
    res.send({ success: true, data: rows.slice((current - 1) * pageSize, current * pageSize), total: rows.length, current, pageSize });
  },
  'GET /api/content-operations/daily-sentences/:id': (req: Request, res: Response) => {
    if (!canAction('read')) return sendForbidden(res, '查看详情');
    reconcileDueDailySentenceSchedules(reviewTasksData);
    const item = getDailySentence(pathValue(req.params.id));
    if (!item) return res.status(404).send({ success: false, errorCode: '404', errorMessage: '每日一句不存在。' });
    buildDailySentenceEffects(item.id);
    res.send({ success: true, data: item });
  },
  'POST /api/content-operations/daily-sentences': (req: Request, res: Response) => {
    if (!canAction('create')) return sendForbidden(res, '创建');
    const item = createDailySentence(req.body as API.DailySentenceSaveParams, operator());
    audit('创建', 'success', item.id, '创建每日一句草稿。', item.version);
    res.send({ success: true, data: item });
  },
  'PATCH /api/content-operations/daily-sentences/:id': (req: Request, res: Response) => {
    const id = pathValue(req.params.id);
    if (!canAction('edit')) return sendForbidden(res, '编辑', id);
    const result = updateDailySentence(id, req.body as API.DailySentenceSaveParams, operator());
    if (result.error === 'not_found') return res.status(404).send({ success: false, errorCode: '404', errorMessage: '每日一句不存在。' });
    if (result.error === 'not_editable') return res.status(422).send({ success: false, errorCode: '422', errorMessage: '当前状态不可编辑。' });
    if (result.error === 'version_conflict') return res.status(409).send({ success: false, errorCode: '409', errorMessage: '内容已被其他操作更新，请刷新后重试。', data: result.item });
    audit('编辑', 'success', id, '更新每日一句草稿。', result.item?.version);
    res.send({ success: true, data: result.item });
  },
  'POST /api/content-operations/daily-sentences/precheck': (req: Request, res: Response) => {
    if (!canAction('edit') && !canAction('create')) return sendForbidden(res, '预校验');
    res.send({ success: true, data: precheckDailySentence(req.body as API.DailySentenceSaveParams, req.body?.id) });
  },
  'POST /api/content-operations/daily-sentences/:id/precheck': (req: Request, res: Response) => {
    const id = pathValue(req.params.id);
    if (!canAction('read')) return sendForbidden(res, '预校验', id);
    const item = getDailySentence(id);
    if (!item) return res.status(404).send({ success: false, errorCode: '404', errorMessage: '每日一句不存在。' });
    const result = precheckDailySentence(item, id);
    item.lastPrecheck = result;
    res.send({ success: true, data: result });
  },
  'POST /api/content-operations/daily-sentences/:id/submit-review': (req: Request, res: Response) => {
    const id = pathValue(req.params.id);
    if (!canAction('submit')) return sendForbidden(res, '提交审核', id);
    const item = getDailySentence(id);
    if (!item) return res.status(404).send({ success: false, errorCode: '404', errorMessage: '每日一句不存在。' });
    if (!['draft', 'rejected'].includes(item.status)) return res.status(422).send({ success: false, errorCode: '422', errorMessage: '当前状态不可提交审核。' });
    const result = submitDailySentenceReview(item, req.body as API.DailySentenceSubmitParams, operator(), reviewTasksData);
    if (result.error === 'version_conflict') return res.status(409).send({ success: false, errorCode: '409', errorMessage: '内容版本已变化，请刷新后重试。', data: result.item });
    if (result.error === 'precheck') return res.status(422).send({ success: false, errorCode: '422', errorMessage: result.precheck?.level === 'warning' ? '预校验存在警告，请确认后提交。' : '预校验未通过。', data: result.precheck });
    audit('提交审核', 'success', id, req.body?.changeSummary || '提交每日一句审核。', item.version);
    res.send({ success: true, data: result.item });
  },
  'POST /api/content-operations/daily-sentences/:id/copy': (req: Request, res: Response) => {
    const id = pathValue(req.params.id);
    if (!canAction('create')) return sendForbidden(res, '复制新版本', id);
    const source = getDailySentence(id);
    if (!source) return res.status(404).send({ success: false, errorCode: '404', errorMessage: '每日一句不存在。' });
    if (!['published', 'offline', 'rolled_back', 'approved', 'pending_publish'].includes(source.status)) return res.status(422).send({ success: false, errorCode: '422', errorMessage: '当前状态不支持复制新版本。' });
    const item = copyDailySentenceDraft(source, operator());
    audit('复制新版本', 'success', item.id, `基于 ${source.id} 创建草稿。`, item.version);
    res.send({ success: true, data: item });
  },
  'GET /api/content-operations/daily-sentences/:id/effects': (req: Request, res: Response) => {
    const id = pathValue(req.params.id);
    if (!canAction('read')) return sendForbidden(res, '查看内容效果', id);
    const item = getDailySentence(id);
    if (!item) return res.status(404).send({ success: false, errorCode: '404', errorMessage: '每日一句不存在。' });
    res.send({ success: true, data: buildDailySentenceEffects(id) });
  },
  'POST /api/content-operations/daily-sentences/:id/mock-events': (req: Request, res: Response) => {
    const id = pathValue(req.params.id);
    if (!canAction('edit')) return sendForbidden(res, '模拟用户行为', id);
    const item = getDailySentence(id);
    if (!item) return res.status(404).send({ success: false, errorCode: '404', errorMessage: '每日一句不存在。' });
    const body = req.body as API.DailySentenceMockEventParams;
    if (!body.eventId || !body.userId || !['read', 'check_in'].includes(body.eventType)) return res.status(400).send({ success: false, errorCode: '400', errorMessage: 'Mock 用户行为参数不完整。' });
    const result = recordDailySentenceEvent(item, body);
    if (result.error === 'not_published') return res.status(422).send({ success: false, errorCode: '422', errorMessage: '只有已发布内容可以接收用户行为。' });
    audit('模拟用户行为', 'success', id, `${body.userId} 触发 ${body.eventType}。`, item.version);
    res.send({ success: true, data: result });
  },
};
