import type { Request, Response } from 'express';
import type { AdminRoleId } from '../src/foundation/permissions';
import {
  buildAiAbnormalEvidence,
  closeAiAbnormalReply,
  closeAiAbnormalReplyWithoutFix,
  createAiAbnormalFixDraft,
  filterAiAbnormalReplies,
  getAiAbnormalReply,
  paginateAiAbnormalReplies,
  retestAiAbnormalReply,
  roleCanHandleAiAbnormal,
  snapshotAiAbnormalReply,
  startAiAbnormalReply,
  updateAiAbnormalDiagnosis,
} from './aiAbnormalReplyStore';
import { operatorFromRole } from './aiCoachStore';
import { pushOperationAuditLog } from './auditStore';
import { mockSession } from './session';

const currentRoleId = () => mockSession.currentRoleId as AdminRoleId | '';

const currentOperator = () => {
  const roleId = currentRoleId() || 'super_admin';
  return operatorFromRole(
    roleId,
    mockSession.currentAccountId,
    mockSession.currentAccountName,
  );
};

const canHandle = () => roleCanHandleAiAbnormal(currentRoleId());

const sendForbidden = (res: Response, action: string, objectId = 'ai-abnormal-reply') => {
  const roleId = currentRoleId();
  if (roleId) {
    pushOperationAuditLog({
      roleId,
      logType: 'permission_denied',
      action,
      objectType: 'ai_abnormal_reply',
      objectId,
      sourcePage: '/ai-coach/abnormal-replies',
      reason: '角色无权访问 AI 异常回复。',
      result: 'denied',
      changeSummary: `尝试执行 ${action} 被拒绝。`,
    });
  }
  res.status(403).send({
    success: false,
    errorCode: '403',
    errorMessage: '无权访问 AI 异常回复。',
  });
};

const readQuery = (query: Request['query']): API.AiAbnormalReplyQueryParams => ({
  current: Number(query.current || 1),
  pageSize: Number(query.pageSize || 20),
  keyword: typeof query.keyword === 'string' ? query.keyword : undefined,
  status: typeof query.status === 'string' ? (query.status as API.AiAbnormalReplyStatus) : undefined,
  abnormalType:
    typeof query.abnormalType === 'string'
      ? (query.abnormalType as API.AiAbnormalReplyType)
      : undefined,
  rootCauseType:
    typeof query.rootCauseType === 'string'
      ? (query.rootCauseType as API.AiCoachConfigType)
      : undefined,
  severity:
    typeof query.severity === 'string' ? (query.severity as API.AiCoachRiskLevel) : undefined,
  businessScene:
    typeof query.businessScene === 'string'
      ? (query.businessScene as API.AiCoachBusinessScene)
      : undefined,
  handler: typeof query.handler === 'string' ? query.handler : undefined,
});

const getOr404 = (id: string, res: Response) => {
  const abnormal = getAiAbnormalReply(id);
  if (!abnormal) {
    res.status(404).send({
      success: false,
      errorCode: '404',
      errorMessage: 'AI 异常回复不存在。',
    });
  }
  return abnormal;
};

const sendResult = (res: Response, result: any, successPayload: () => any) => {
  if (result?.conflict) {
    res.status(409).send({
      success: false,
      errorCode: '409',
      errorMessage: '异常数据已变化，请刷新后再操作。',
    });
    return;
  }
  if (result?.locked) {
    res.status(422).send({
      success: false,
      errorCode: '422',
      errorMessage: '当前异常状态不允许执行该操作。',
    });
    return;
  }
  if (result?.missingDiagnosis) {
    res.status(422).send({
      success: false,
      errorCode: '422',
      errorMessage: '请先完成问题归因和诊断说明。',
    });
    return;
  }
  if (result?.missingStrategy) {
    res.status(422).send({
      success: false,
      errorCode: '422',
      errorMessage: '关联策略不存在或未配置。',
    });
    return;
  }
  if (result?.mismatch) {
    res.status(422).send({
      success: false,
      errorCode: '422',
      errorMessage: '归因类型必须与关联策略类型一致。',
    });
    return;
  }
  if (result?.unpublished) {
    res.status(422).send({
      success: false,
      errorCode: '422',
      errorMessage: '修复策略发布后才能执行 Mock 复检。',
    });
    return;
  }
  if (result?.missingRetest) {
    res.status(422).send({
      success: false,
      errorCode: '422',
      errorMessage: '必须完成通过的 Mock 复检后才能关闭。',
    });
    return;
  }
  if (result?.invalid) {
    res.status(400).send({
      success: false,
      errorCode: '400',
      errorMessage: '请求参数不完整或不合法。',
    });
    return;
  }
  res.send(successPayload());
};

export default {
  'GET /api/ai-coach/abnormal-replies': (req: Request, res: Response) => {
    if (!canHandle()) {
      sendForbidden(res, 'read');
      return;
    }
    const query = readQuery(req.query);
    const result = paginateAiAbnormalReplies(filterAiAbnormalReplies(query), query);
    res.send({ success: true, data: result.data, total: result.total });
  },

  'GET /api/ai-coach/abnormal-replies/:id': (req: Request, res: Response) => {
    if (!canHandle()) {
      sendForbidden(res, 'read', String(req.params.id));
      return;
    }
    const abnormal = getOr404(String(req.params.id), res);
    if (!abnormal) return;
    res.send({ success: true, data: snapshotAiAbnormalReply(abnormal) });
  },

  'POST /api/ai-coach/abnormal-replies/:id/access-evidence': (req: Request, res: Response) => {
    if (!canHandle()) {
      sendForbidden(res, 'access_evidence', String(req.params.id));
      return;
    }
    const abnormal = getOr404(String(req.params.id), res);
    if (!abnormal) return;
    const reason = String(req.body?.reason ?? '').trim();
    if (reason.length < 6) {
      res.status(400).send({
        success: false,
        errorCode: '400',
        errorMessage: '访问受控证据必须填写原因。',
      });
      return;
    }
    abnormal.evidenceAccessed = true;
    abnormal.updatedAt = new Date().toLocaleString('zh-CN', { hour12: false });
    abnormal.dataVersion += 1;
    const roleId = currentRoleId() as AdminRoleId;
    pushOperationAuditLog({
      roleId,
      logType: 'sensitive_access',
      action: 'access_ai_abnormal_evidence',
      objectType: 'ai_abnormal_reply',
      objectId: abnormal.id,
      objectSubtype: abnormal.abnormalType,
      sourcePage: `/ai-coach/abnormal-replies/${abnormal.id}`,
      reason,
      result: 'success',
      changeSummary: '访问 AI 异常回复受控证据，未返回完整会话原文。',
    });
    res.send({ success: true, data: buildAiAbnormalEvidence(abnormal) });
  },

  'POST /api/ai-coach/abnormal-replies/:id/start': (req: Request, res: Response) => {
    if (!canHandle()) {
      sendForbidden(res, 'start', String(req.params.id));
      return;
    }
    const abnormal = getOr404(String(req.params.id), res);
    if (!abnormal) return;
    const result = startAiAbnormalReply(abnormal, currentOperator());
    sendResult(res, result, () => ({ success: true, data: snapshotAiAbnormalReply(abnormal) }));
  },

  'PATCH /api/ai-coach/abnormal-replies/:id/diagnosis': (req: Request, res: Response) => {
    if (!canHandle()) {
      sendForbidden(res, 'diagnosis', String(req.params.id));
      return;
    }
    const abnormal = getOr404(String(req.params.id), res);
    if (!abnormal) return;
    const result = updateAiAbnormalDiagnosis(
      abnormal,
      req.body as API.AiAbnormalDiagnosisParams,
      currentOperator(),
    );
    sendResult(res, result, () => ({ success: true, data: snapshotAiAbnormalReply(abnormal) }));
  },

  'POST /api/ai-coach/abnormal-replies/:id/create-fix-draft': (req: Request, res: Response) => {
    if (!canHandle()) {
      sendForbidden(res, 'create_fix_draft', String(req.params.id));
      return;
    }
    const abnormal = getOr404(String(req.params.id), res);
    if (!abnormal) return;
    const result = createAiAbnormalFixDraft(
      abnormal,
      req.body as API.AiAbnormalCreateFixDraftParams,
      currentOperator(),
    );
    sendResult(res, result, () => ({
      success: true,
      data: {
        abnormal: snapshotAiAbnormalReply(abnormal),
        strategy: (result as { strategy: API.AiCoachStrategy }).strategy,
      },
    }));
  },

  'POST /api/ai-coach/abnormal-replies/:id/retest': (req: Request, res: Response) => {
    if (!canHandle()) {
      sendForbidden(res, 'retest', String(req.params.id));
      return;
    }
    const abnormal = getOr404(String(req.params.id), res);
    if (!abnormal) return;
    const result = retestAiAbnormalReply(
      abnormal,
      req.body as API.AiAbnormalRetestParams,
      currentOperator(),
    );
    sendResult(res, result, () => ({ success: true, data: snapshotAiAbnormalReply(abnormal) }));
  },

  'POST /api/ai-coach/abnormal-replies/:id/close': (req: Request, res: Response) => {
    if (!canHandle()) {
      sendForbidden(res, 'close', String(req.params.id));
      return;
    }
    const abnormal = getOr404(String(req.params.id), res);
    if (!abnormal) return;
    const result = closeAiAbnormalReply(
      abnormal,
      req.body as API.AiAbnormalCloseParams,
      currentOperator(),
    );
    sendResult(res, result, () => ({ success: true, data: snapshotAiAbnormalReply(abnormal) }));
  },

  'POST /api/ai-coach/abnormal-replies/:id/close-without-fix': (req: Request, res: Response) => {
    if (!canHandle()) {
      sendForbidden(res, 'close_without_fix', String(req.params.id));
      return;
    }
    const abnormal = getOr404(String(req.params.id), res);
    if (!abnormal) return;
    const result = closeAiAbnormalReplyWithoutFix(
      abnormal,
      req.body as API.AiAbnormalCloseWithoutFixParams,
      currentOperator(),
    );
    sendResult(res, result, () => ({ success: true, data: snapshotAiAbnormalReply(abnormal) }));
  },
};
