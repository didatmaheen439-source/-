import type { Request, Response } from 'express';
import { roleCanPerformAction } from '../src/foundation/permissions';
import type { AdminRoleId } from '../src/foundation/permissions';
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
import { pushOperationAuditLog } from './auditStore';
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

export default {
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
