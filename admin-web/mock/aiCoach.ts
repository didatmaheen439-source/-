import type { Request, Response } from 'express';
import { roleCanPerformAction } from '../src/foundation/permissions';
import type { AdminRoleId } from '../src/foundation/permissions';
import {
  aiSessionReviewOperatorFromRole,
  canOperateAiSessionReview,
  claimAiSessionReview,
  concludeAiSessionReview,
  createAttachmentPolicyMockSession,
  filterAiSessionReviews,
  getAiSessionReview,
  getSafeAiSessionReview,
  paginateAiSessionReviews,
  readAiSessionSensitiveContext,
  releaseAiSessionReview,
} from './aiCoachSessionReviewStore';
import {
  aiCoachStrategiesData,
  buildAiCoachPrecheck,
  buildAiCoachStaticValidation,
  buildAiCoachVersionDiff,
  copyAiCoachStrategyDraft,
  createAiCoachStrategyRecord,
  filterAiCoachStrategies,
  getAiCoachStrategy,
  operatorFromRole,
  paginateAiCoachStrategies,
  submitAiCoachStrategyReview,
  updateAiCoachStrategyRecord,
} from './aiCoachStore';
import { nowText, pushOperationAuditLog } from './auditStore';
import { mockSession } from './session';
import { reviewTasksData } from './user';

const currentRoleId = () => mockSession.currentRoleId as AdminRoleId | '';

const currentOperator = () => {
  const roleId = currentRoleId() || 'super_admin';
  return operatorFromRole(
    roleId,
    mockSession.currentAccountId,
    mockSession.currentAccountName,
  );
};

const canReadAiCoach = () =>
  Boolean(currentRoleId() && roleCanPerformAction(currentRoleId() as AdminRoleId, 'aiCoach', 'read'));

const canCreateAiCoach = () =>
  Boolean(currentRoleId() && roleCanPerformAction(currentRoleId() as AdminRoleId, 'aiCoach', 'create'));

const canEditAiCoach = () =>
  Boolean(currentRoleId() && roleCanPerformAction(currentRoleId() as AdminRoleId, 'aiCoach', 'edit'));

const canSubmitAiCoach = () =>
  Boolean(currentRoleId() && roleCanPerformAction(currentRoleId() as AdminRoleId, 'aiCoach', 'submit'));

const canReviewAiSession = () =>
  Boolean(
    currentRoleId() &&
      canOperateAiSessionReview(currentRoleId()) &&
      roleCanPerformAction(currentRoleId() as AdminRoleId, 'aiCoach', 'read'),
  );

const sendForbidden = (res: Response, action: string, objectId = 'ai-coach') => {
  const roleId = currentRoleId();
  if (roleId) {
    pushOperationAuditLog({
      roleId,
      logType: 'permission_denied',
      action,
      objectType: 'ai_coach_strategy',
      objectId,
      sourcePage: '/ai-coach/prompts',
      reason: '角色无权访问 AI 陪练策略。',
      result: 'denied',
      changeSummary: `尝试执行 ${action} 被拒绝。`,
    });
  }
  res.status(403).send({
    success: false,
    errorCode: '403',
    errorMessage: '无权访问 AI 陪练策略。',
  });
};

const sendSessionReviewForbidden = (res: Response, action: string, objectId = 'ai-session-review') => {
  const roleId = currentRoleId();
  if (roleId) {
    pushOperationAuditLog({
      roleId,
      logType: 'permission_denied',
      action,
      objectType: 'ai_session_review',
      objectId,
      sourcePage: '/ai-coach/session-review',
      reason: '角色无权访问 AI 会话抽检。',
      result: 'denied',
      changeSummary: `尝试执行 ${action} 被拒绝。`,
    });
  }
  res.status(403).send({
    success: false,
    errorCode: '403',
    errorMessage: '无权访问 AI 会话抽检。',
  });
};

const bodyMaySimulate500 = (body: API.AiCoachStrategySaveParams) =>
  [body.title, body.description, JSON.stringify(body.body ?? {})].some((item) =>
    String(item ?? '').includes('SIMULATE_AI_PRECHECK_500'),
  );

const readQuery = (query: Request['query']): API.AiCoachStrategyQueryParams => ({
  current: Number(query.current || 1),
  pageSize: Number(query.pageSize || 20),
  keyword: typeof query.keyword === 'string' ? query.keyword : undefined,
  configType: typeof query.configType === 'string' ? (query.configType as API.AiCoachConfigType) : undefined,
  businessScene:
    typeof query.businessScene === 'string'
      ? (query.businessScene as API.AiCoachBusinessScene)
      : undefined,
  status: typeof query.status === 'string' ? (query.status as API.AiCoachStrategyStatus) : undefined,
  riskLevel: typeof query.riskLevel === 'string' ? (query.riskLevel as API.AiCoachRiskLevel) : undefined,
});

const readSessionReviewQuery = (query: Request['query']): API.AiSessionReviewQueryParams => ({
  current: Number(query.current || 1),
  pageSize: Number(query.pageSize || 20),
  keyword: typeof query.keyword === 'string' ? query.keyword : undefined,
  intentKey: typeof query.intentKey === 'string' ? query.intentKey : undefined,
  strategyVersion: typeof query.strategyVersion === 'string' ? query.strategyVersion : undefined,
  riskLevel: typeof query.riskLevel === 'string' ? (query.riskLevel as API.AiCoachRiskLevel) : undefined,
  reviewStatus:
    typeof query.reviewStatus === 'string'
      ? (query.reviewStatus as API.AiSessionReviewStatus)
      : undefined,
  conclusion:
    typeof query.conclusion === 'string'
      ? (query.conclusion as API.AiSessionReviewConclusion)
      : undefined,
  sessionTimeRange: Array.isArray(query.sessionTimeRange)
    ? (query.sessionTimeRange as string[])
    : typeof query.sessionTimeRange === 'string'
      ? [query.sessionTimeRange]
      : undefined,
});

export default {
  'GET /api/ai-coach/session-reviews': (req: Request, res: Response) => {
    if (!canReviewAiSession()) {
      sendSessionReviewForbidden(res, 'read');
      return;
    }
    const query = readSessionReviewQuery(req.query);
    const filtered = filterAiSessionReviews(query);
    const result = paginateAiSessionReviews(filtered, query);
    res.send({ success: true, data: result.data, total: result.total });
  },

  'GET /api/ai-coach/session-reviews/:id': (req: Request, res: Response) => {
    if (!canReviewAiSession()) {
      sendSessionReviewForbidden(res, 'read', String(req.params.id));
      return;
    }
    const session = getSafeAiSessionReview(String(req.params.id));
    if (!session) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: 'AI 会话抽检不存在。',
      });
      return;
    }
    res.send({ success: true, data: session });
  },

  'POST /api/ai-coach/session-reviews/:id/claim': (req: Request, res: Response) => {
    if (!canReviewAiSession()) {
      sendSessionReviewForbidden(res, 'claim', String(req.params.id));
      return;
    }
    const session = getAiSessionReview(String(req.params.id));
    if (!session) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: 'AI 会话抽检不存在。',
      });
      return;
    }
    const roleId = currentRoleId() as AdminRoleId;
    const operator = aiSessionReviewOperatorFromRole(
      roleId,
      mockSession.currentAccountId,
      mockSession.currentAccountName,
    );
    const result = claimAiSessionReview(session, operator);
    if ('conflict' in result) {
      res.status(409).send({
        success: false,
        errorCode: '409',
        errorMessage: '该会话已被其他运营认领。',
      });
      return;
    }
    if ('locked' in result) {
      res.status(422).send({
        success: false,
        errorCode: '422',
        errorMessage: '已完成的会话抽检不能重新认领。',
      });
      return;
    }
    pushOperationAuditLog({
      roleId,
      action: 'claim',
      objectType: 'ai_session_review',
      objectId: session.id,
      sourcePage: `/ai-coach/session-review/${session.id}`,
      reason: '认领会话抽检任务。',
      result: 'success',
      changeSummary: `认领 AI 会话抽检：${session.sessionId}。`,
      newStatus: result.session.reviewStatus,
      version: result.session.strategySnapshot.strategyVersion,
    });
    res.send({ success: true, data: result.session });
  },

  'POST /api/ai-coach/session-reviews/:id/release': (req: Request, res: Response) => {
    if (!canReviewAiSession()) {
      sendSessionReviewForbidden(res, 'release', String(req.params.id));
      return;
    }
    const session = getAiSessionReview(String(req.params.id));
    if (!session) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: 'AI 会话抽检不存在。',
      });
      return;
    }
    const roleId = currentRoleId() as AdminRoleId;
    const operator = aiSessionReviewOperatorFromRole(
      roleId,
      mockSession.currentAccountId,
      mockSession.currentAccountName,
    );
    const result = releaseAiSessionReview(session, operator);
    if ('locked' in result) {
      res.status(422).send({
        success: false,
        errorCode: '422',
        errorMessage: '只能释放本人正在抽检的会话。',
      });
      return;
    }
    pushOperationAuditLog({
      roleId,
      action: 'release',
      objectType: 'ai_session_review',
      objectId: session.id,
      sourcePage: `/ai-coach/session-review/${session.id}`,
      reason: '释放会话抽检任务。',
      result: 'success',
      changeSummary: `释放 AI 会话抽检：${session.sessionId}。`,
      newStatus: result.session.reviewStatus,
      version: result.session.strategySnapshot.strategyVersion,
    });
    res.send({ success: true, data: result.session });
  },

  'POST /api/ai-coach/session-reviews/:id/sensitive-access': (req: Request, res: Response) => {
    if (!canReviewAiSession()) {
      sendSessionReviewForbidden(res, 'sensitive_access', String(req.params.id));
      return;
    }
    const session = getAiSessionReview(String(req.params.id));
    if (!session) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: 'AI 会话抽检不存在。',
      });
      return;
    }
    const roleId = currentRoleId() as AdminRoleId;
    const operator = aiSessionReviewOperatorFromRole(
      roleId,
      mockSession.currentAccountId,
      mockSession.currentAccountName,
    );
    const body = req.body as API.AiSessionSensitiveAccessParams;
    const accessLog: API.UserSensitiveAccessLog = {
      id: `access-ai-session-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      userId: session.userLabel,
      objectType: 'ai_session_review_context',
      objectId: session.id,
      operator: operator.name,
      roleName: operator.roleName,
      sourcePage: `/ai-coach/session-review/${session.id}`,
      requestedFields: body.requestedFields ?? [],
      accessReason: body.accessReason,
      result: body.simulateFailure ? 'failed' : 'success',
      time: nowText(),
    };
    if (body.simulateFailure || session.id === 'simulate-log-failure') {
      pushOperationAuditLog({
        roleId,
        logType: 'sensitive_access',
        action: 'read',
        objectType: 'ai_session_review',
        objectId: session.id,
        sourcePage: `/ai-coach/session-review/${session.id}`,
        reason: body.accessReason || '申请查看必要信息。',
        result: 'failed',
        changeSummary: '敏感访问日志写入失败，已拒绝展示内容。',
      });
      res.status(500).send({
        success: false,
        errorCode: '500',
        errorMessage: '敏感访问日志写入失败，已拒绝展示内容。',
      });
      return;
    }
    const result = readAiSessionSensitiveContext(session, body, operator);
    if ('conflict' in result) {
      res.status(409).send({
        success: false,
        errorCode: '409',
        errorMessage: '会话抽检版本已变化，请刷新后再申请查看。',
      });
      return;
    }
    if ('locked' in result) {
      res.status(422).send({
        success: false,
        errorCode: '422',
        errorMessage: '需先认领该会话抽检，且只能由当前认领人查看必要信息。',
      });
      return;
    }
    if ('invalid' in result) {
      res.status(422).send({
        success: false,
        errorCode: '422',
        errorMessage: '请填写访问原因并选择必要字段。',
      });
      return;
    }
    pushOperationAuditLog({
      roleId,
      logType: 'sensitive_access',
      action: 'read',
      objectType: 'ai_session_review',
      objectId: session.id,
      sourcePage: `/ai-coach/session-review/${session.id}`,
      reason: body.accessReason,
      result: 'success',
      changeSummary: `查看 AI 会话抽检必要信息：${body.requestedFields.join('、')}。`,
      version: session.strategySnapshot.strategyVersion,
    });
    res.send({
      success: true,
      data: {
        accessLog,
        fields: result.fields,
      },
    });
  },

  'POST /api/ai-coach/session-reviews/:id/conclusion': (req: Request, res: Response) => {
    if (!canReviewAiSession()) {
      sendSessionReviewForbidden(res, 'conclusion', String(req.params.id));
      return;
    }
    const session = getAiSessionReview(String(req.params.id));
    if (!session) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: 'AI 会话抽检不存在。',
      });
      return;
    }
    const roleId = currentRoleId() as AdminRoleId;
    const operator = aiSessionReviewOperatorFromRole(
      roleId,
      mockSession.currentAccountId,
      mockSession.currentAccountName,
    );
    const body = req.body as API.AiSessionReviewConclusionParams;
    const result = concludeAiSessionReview(session, body, operator);
    if ('conflict' in result) {
      res.status(409).send({
        success: false,
        errorCode: '409',
        errorMessage: '会话抽检版本已变化，请刷新后再提交结论。',
      });
      return;
    }
    if ('locked' in result) {
      res.status(422).send({
        success: false,
        errorCode: '422',
        errorMessage: '只能由当前认领人提交进行中的会话抽检结论。',
      });
      return;
    }
    if ('invalid' in result) {
      res.status(422).send({
        success: false,
        errorCode: '422',
        errorMessage: '结论参数不完整。',
      });
      return;
    }
    pushOperationAuditLog({
      roleId,
      action: body.conclusion === 'abnormal' ? 'mark_abnormal' : 'mark_normal',
      objectType: 'ai_session_review',
      objectId: session.id,
      objectSubtype: body.abnormalType,
      sourcePage: `/ai-coach/session-review/${session.id}`,
      reason: body.reviewNote,
      result: 'success',
      changeSummary:
        body.conclusion === 'abnormal'
          ? `标记 AI 会话抽检异常并生成处理项：${result.abnormalItem?.id ?? ''}。`
          : `标记 AI 会话抽检正常：${session.sessionId}。`,
      newStatus: result.session.reviewStatus,
      version: session.strategySnapshot.strategyVersion,
    });
    res.send({
      success: true,
      data: result.session,
      abnormalItem: result.abnormalItem,
    });
  },

  'GET /api/ai-coach/strategies': (req: Request, res: Response) => {
    if (!canReadAiCoach()) {
      sendForbidden(res, 'read');
      return;
    }
    const query = readQuery(req.query);
    const filtered = filterAiCoachStrategies(query);
    const result = paginateAiCoachStrategies(filtered, query);
    res.send({ success: true, data: result.data, total: result.total });
  },

  'GET /api/ai-coach/strategies/:id': (req: Request, res: Response) => {
    if (!canReadAiCoach()) {
      sendForbidden(res, 'read', String(req.params.id));
      return;
    }
    const strategy = getAiCoachStrategy(String(req.params.id));
    if (!strategy) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: 'AI 策略不存在。',
      });
      return;
    }
    res.send({ success: true, data: strategy });
  },

  'POST /api/ai-coach/strategies': (req: Request, res: Response) => {
    if (!canCreateAiCoach()) {
      sendForbidden(res, 'create');
      return;
    }
    const body = req.body as API.AiCoachStrategySaveParams;
    const strategy = createAiCoachStrategyRecord(body, currentOperator());
    pushOperationAuditLog({
      roleId: currentRoleId() as AdminRoleId,
      action: 'create',
      objectType: 'ai_coach_strategy',
      objectId: strategy.id,
      objectSubtype: strategy.configType,
      sourcePage: '/ai-coach/prompts/new',
      reason: body.changeSummary || '保存 AI 策略草稿。',
      result: 'success',
      changeSummary: `保存 AI 策略草稿：${strategy.title}，配置类型 ${strategy.configType}。`,
      newStatus: strategy.status,
      version: strategy.version,
    });
    res.send({ success: true, data: strategy });
  },

  'PATCH /api/ai-coach/strategies/:id': (req: Request, res: Response) => {
    if (!canEditAiCoach()) {
      sendForbidden(res, 'edit', String(req.params.id));
      return;
    }
    const strategy = getAiCoachStrategy(String(req.params.id));
    if (!strategy) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: 'AI 策略不存在。',
      });
      return;
    }
    const result = updateAiCoachStrategyRecord(
      strategy,
      req.body as API.AiCoachStrategySaveParams,
      currentOperator(),
    );
    if ('conflict' in result) {
      res.status(409).send({
        success: false,
        errorCode: '409',
        errorMessage: '策略版本已变化，请刷新后再保存。',
        data: strategy,
      });
      return;
    }
    if ('locked' in result) {
      res.status(422).send({
        success: false,
        errorCode: '422',
        errorMessage: '已发布或审核中的策略不能直接覆盖，请创建新草稿版本。',
      });
      return;
    }
    pushOperationAuditLog({
      roleId: currentRoleId() as AdminRoleId,
      action: 'edit',
      objectType: 'ai_coach_strategy',
      objectId: strategy.id,
      objectSubtype: strategy.configType,
      sourcePage: `/ai-coach/prompts/${strategy.id}/edit`,
      reason: strategy.changeSummary,
      result: 'success',
      changeSummary: `更新 AI 策略草稿：${strategy.title}，未记录完整 Prompt 正文。`,
      originalStatus: strategy.status,
      newStatus: strategy.status,
      version: strategy.version,
    });
    res.send({ success: true, data: result.strategy });
  },

  'POST /api/ai-coach/strategies/:id/copy': (req: Request, res: Response) => {
    if (!canCreateAiCoach()) {
      sendForbidden(res, 'copy', String(req.params.id));
      return;
    }
    const strategy = getAiCoachStrategy(String(req.params.id));
    if (!strategy) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: 'AI 策略不存在。',
      });
      return;
    }
    const draft = copyAiCoachStrategyDraft(strategy, currentOperator());
    pushOperationAuditLog({
      roleId: currentRoleId() as AdminRoleId,
      action: 'copy',
      objectType: 'ai_coach_strategy',
      objectId: strategy.id,
      objectSubtype: strategy.configType,
      sourcePage: `/ai-coach/prompts/${strategy.id}`,
      reason: '从已发布或历史版本创建新草稿。',
      result: 'success',
      changeSummary: `创建 AI 策略新草稿：${draft.id}。`,
      originalStatus: strategy.status,
      newStatus: draft.status,
      version: draft.version,
    });
    res.send({ success: true, data: draft });
  },

  'POST /api/ai-coach/strategies/precheck': (req: Request, res: Response) => {
    if (!canReadAiCoach()) {
      sendForbidden(res, 'precheck');
      return;
    }
    const body = req.body as API.AiCoachStrategySaveParams;
    if (bodyMaySimulate500(body)) {
      res.status(500).send({
        success: false,
        errorCode: '500',
        errorMessage: '模拟预校验服务异常。',
      });
      return;
    }
    const result = buildAiCoachPrecheck(body);
    res.send({ success: true, data: result });
  },

  'POST /api/ai-coach/strategies/validate-samples': (req: Request, res: Response) => {
    if (!canReadAiCoach()) {
      sendForbidden(res, 'validate_samples');
      return;
    }
    const body = req.body as API.AiCoachStrategySaveParams;
    if (bodyMaySimulate500(body)) {
      res.status(500).send({
        success: false,
        errorCode: '500',
        errorMessage: '模拟静态样例校验异常。',
      });
      return;
    }
    const result = buildAiCoachStaticValidation(body);
    res.send({ success: true, data: result });
  },

  'POST /api/ai-coach/strategies/:id/submit-review': (req: Request, res: Response) => {
    if (!canSubmitAiCoach()) {
      sendForbidden(res, 'submit', String(req.params.id));
      return;
    }
    const strategy = getAiCoachStrategy(String(req.params.id));
    if (!strategy) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: 'AI 策略不存在。',
      });
      return;
    }
    const result = submitAiCoachStrategyReview(
      strategy,
      req.body as API.AiCoachStrategySubmitParams,
      currentOperator(),
      reviewTasksData,
    );
    if ('conflict' in result) {
      res.status(409).send({
        success: false,
        errorCode: '409',
        errorMessage: '策略版本已变化，请刷新后再提交。',
      });
      return;
    }
    if ('locked' in result) {
      res.status(422).send({
        success: false,
        errorCode: '422',
        errorMessage: '当前状态不能提交审核。',
      });
      return;
    }
    if ('blocked' in result) {
      res.status(422).send({
        success: false,
        errorCode: '422',
        errorMessage: '预校验存在阻断错误，不能提交审核。',
        data: result.precheck,
      });
      return;
    }
    if ('warning' in result) {
      res.status(422).send({
        success: false,
        errorCode: '422',
        errorMessage: '预校验存在警告，请确认后再提交。',
        data: result.precheck,
      });
      return;
    }
    pushOperationAuditLog({
      roleId: currentRoleId() as AdminRoleId,
      action: 'submit_review',
      objectType: 'ai_coach_strategy',
      objectId: strategy.id,
      objectSubtype: strategy.configType,
      sourcePage: `/ai-coach/prompts/${strategy.id}`,
      reason: req.body?.changeSummary || '提交 AI 策略审核。',
      result: 'success',
      changeSummary: `AI 策略 ${strategy.id} 已提交审核，未记录完整 Prompt 正文。`,
      originalStatus: 'draft',
      newStatus: 'pending_review',
      version: strategy.version,
    });
    res.send({ success: true, data: result.strategy, reviewTask: result.task });
  },

  'POST /api/ai-coach/strategies/:id/mock-attachment-session': (req: Request, res: Response) => {
    if (!canEditAiCoach() || !canReviewAiSession()) {
      sendForbidden(res, 'mock_attachment_session', String(req.params.id));
      return;
    }
    const strategy = getAiCoachStrategy(String(req.params.id));
    if (!strategy) {
      res.status(404).send({ success: false, errorCode: '404', errorMessage: 'AI 策略不存在。' });
      return;
    }
    if (strategy.configType !== 'attachment_policy') {
      res.status(422).send({ success: false, errorCode: '422', errorMessage: '只有附件策略可以触发附件 Mock 会话。' });
      return;
    }
    if (strategy.status !== 'published') {
      res.status(422).send({ success: false, errorCode: '422', errorMessage: '附件策略发布后才能触发 Mock 会话。' });
      return;
    }
    const body = req.body as API.AiAttachmentMockSessionParams;
    if (body.dataVersion !== strategy.dataVersion) {
      res.status(409).send({ success: false, errorCode: '409', errorMessage: '策略版本已变化，请刷新后重试。' });
      return;
    }
    if (!body.idempotencyKey?.trim() || !['success', 'unsupported_type', 'size_exceeded', 'recognition_failed'].includes(body.scenario)) {
      res.status(400).send({ success: false, errorCode: '400', errorMessage: 'Mock 场景或幂等键无效。' });
      return;
    }
    const result = createAttachmentPolicyMockSession(
      strategy,
      body,
      aiSessionReviewOperatorFromRole(currentRoleId() as AdminRoleId, mockSession.currentAccountId, mockSession.currentAccountName),
    );
    pushOperationAuditLog({
      roleId: currentRoleId() as AdminRoleId,
      action: 'mock_attachment_session',
      objectType: 'ai_coach_strategy',
      objectId: strategy.id,
      objectSubtype: strategy.configType,
      sourcePage: `/ai-coach/prompts/${strategy.id}`,
      reason: `触发附件 Mock 场景：${body.scenario}。`,
      result: 'success',
      changeSummary: `生成会话抽检 ${result.sessionReview.id}${result.abnormalReply ? ` 和异常项 ${result.abnormalReply.id}` : ''}。`,
      version: strategy.version,
    });
    res.send({ success: true, data: result });
  },

  'GET /api/ai-coach/strategies/:id/versions': (req: Request, res: Response) => {
    if (!canReadAiCoach()) {
      sendForbidden(res, 'read_versions', String(req.params.id));
      return;
    }
    const strategy = getAiCoachStrategy(String(req.params.id));
    if (!strategy) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: 'AI 策略不存在。',
      });
      return;
    }
    res.send({ success: true, data: strategy.versionSnapshots });
  },

  'GET /api/ai-coach/strategies/:id/version-diff': (req: Request, res: Response) => {
    if (!canReadAiCoach()) {
      sendForbidden(res, 'read_version_diff', String(req.params.id));
      return;
    }
    const strategy = getAiCoachStrategy(String(req.params.id));
    if (!strategy) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: 'AI 策略不存在。',
      });
      return;
    }
    const data = buildAiCoachVersionDiff(
      strategy,
      typeof req.query.fromVersion === 'string' ? req.query.fromVersion : undefined,
      typeof req.query.toVersion === 'string' ? req.query.toVersion : undefined,
    );
    res.send({ success: true, data });
  },

  'GET /api/ai-coach/available-intents': (_req: Request, res: Response) => {
    if (!canReadAiCoach()) {
      sendForbidden(res, 'read_available_intents');
      return;
    }
    res.send({
      success: true,
      data: aiCoachStrategiesData.filter((item) => item.configType === 'intent' && item.status === 'published'),
    });
  },

  'GET /api/ai-coach/available-response-structures': (_req: Request, res: Response) => {
    if (!canReadAiCoach()) {
      sendForbidden(res, 'read_available_response_structures');
      return;
    }
    res.send({
      success: true,
      data: aiCoachStrategiesData.filter(
        (item) => item.configType === 'response_structure' && item.status === 'published',
      ),
    });
  },
};
