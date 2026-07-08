import type { Request, Response } from 'express';
import { roleCanPerformAction } from '../src/foundation/permissions';
import type { AdminRoleId } from '../src/foundation/permissions';
import { pushOperationAuditLog } from './auditStore';
import { mockSession } from './session';
import { reviewTasksData } from './user';
import {
  availableWritingTranslationAiStrategies,
  buildWritingTranslationPrecheck,
  buildWritingTranslationStaticValidation,
  buildWritingTranslationVersionDiff,
  copyWritingTranslationTopicDraft,
  createWritingTranslationTopicRecord,
  filterWritingTranslationTopics,
  getWritingTranslationTopic,
  operatorFromWritingTranslationRole,
  paginateWritingTranslationTopics,
  scoringPresets,
  submitWritingTranslationTopicReview,
  updateWritingTranslationTopicRecord,
  writingTranslationTopicTypeLabels,
} from './writingTranslationStore';

const currentRoleId = () => mockSession.currentRoleId as AdminRoleId | '';

const currentOperator = () => {
  const roleId = currentRoleId() || 'super_admin';
  return operatorFromWritingTranslationRole(
    roleId,
    mockSession.currentAccountId,
    mockSession.currentAccountName,
  );
};

const canReadWritingTranslation = () =>
  Boolean(
    currentRoleId() &&
      roleCanPerformAction(
        currentRoleId() as AdminRoleId,
        'writingTranslation',
        'read',
      ),
  );

const canCreateWritingTranslation = () =>
  Boolean(
    currentRoleId() &&
      roleCanPerformAction(
        currentRoleId() as AdminRoleId,
        'writingTranslation',
        'create',
      ),
  );

const canEditWritingTranslation = () =>
  Boolean(
    currentRoleId() &&
      roleCanPerformAction(
        currentRoleId() as AdminRoleId,
        'writingTranslation',
        'edit',
      ),
  );

const canSubmitWritingTranslation = () =>
  Boolean(
    currentRoleId() &&
      roleCanPerformAction(
        currentRoleId() as AdminRoleId,
        'writingTranslation',
        'submit',
      ),
  );

const sendForbidden = (res: Response, action: string, objectId = 'writing-translation') => {
  const roleId = currentRoleId();
  if (roleId) {
    pushOperationAuditLog({
      roleId,
      logType: 'permission_denied',
      action,
      objectType: 'writing_translation',
      objectId,
      sourcePage: '/writing-translation/topics',
      reason: '角色无写译批改管理权限。',
      result: 'denied',
      changeSummary: `写译批改管理 ${action} 被拒绝，未记录题干正文。`,
    });
  }
  res.status(403).send({
    success: false,
    errorCode: '403',
    errorMessage: '无权访问写译批改管理。',
  });
};

const readQuery = (query: Request['query']): API.WritingTranslationTopicQueryParams => ({
  current: Number(query.current || 1),
  pageSize: Number(query.pageSize || 20),
  topicType:
    typeof query.topicType === 'string'
      ? (query.topicType as API.WritingTranslationTopicType)
      : undefined,
  keyword: typeof query.keyword === 'string' ? query.keyword : undefined,
  examType: typeof query.examType === 'string' ? (query.examType as API.ExamType) : undefined,
  difficulty:
    typeof query.difficulty === 'string'
      ? (query.difficulty as API.WritingTranslationDifficulty)
      : undefined,
  status:
    typeof query.status === 'string'
      ? (query.status as API.WritingTranslationStatus)
      : undefined,
  riskLevel:
    typeof query.riskLevel === 'string'
      ? (query.riskLevel as API.WritingTranslationRiskLevel)
      : undefined,
  tag: typeof query.tag === 'string' ? query.tag : undefined,
  hasAiStrategy:
    typeof query.hasAiStrategy === 'string'
      ? (query.hasAiStrategy as API.WritingTranslationTopicQueryParams['hasAiStrategy'])
      : undefined,
  updatedBy: typeof query.updatedBy === 'string' ? query.updatedBy : undefined,
});

const bodyMaySimulate500 = (body?: API.WritingTranslationTopicSaveParams) =>
  Boolean(
    body?.simulateFailure ||
      [body?.name, body?.changeSummary, body?.internalRemark].some((item) =>
        String(item ?? '').includes('SIMULATE_WRITING_TRANSLATION_500'),
      ),
  );

const sanitizeSummary = (topic: API.WritingTranslationTopic) =>
  `${writingTranslationTopicTypeLabels[topic.topicType]} ${topic.id}，版本 ${topic.version}，维度 ${topic.scoringDimensions.length} 项，AI 引用 ${topic.aiStrategyRefs.length} 项。`;

export default {
  'GET /api/writing-translation/topics': (req: Request, res: Response) => {
    if (!canReadWritingTranslation()) {
      sendForbidden(res, 'read');
      return;
    }
    const query = readQuery(req.query);
    const filtered = filterWritingTranslationTopics(query);
    const result = paginateWritingTranslationTopics(filtered, query);
    res.send({ success: true, ...result });
  },

  'GET /api/writing-translation/topics/:id': (req: Request, res: Response) => {
    if (!canReadWritingTranslation()) {
      sendForbidden(res, 'read', String(req.params.id));
      return;
    }
    const topic = getWritingTranslationTopic(String(req.params.id));
    if (!topic) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: '写译题目不存在。',
      });
      return;
    }
    res.send({ success: true, data: topic });
  },

  'POST /api/writing-translation/topics': (req: Request, res: Response) => {
    if (!canCreateWritingTranslation()) {
      sendForbidden(res, 'create');
      return;
    }
    const body = req.body as API.WritingTranslationTopicSaveParams;
    if (bodyMaySimulate500(body)) {
      res.status(500).send({
        success: false,
        errorCode: '500',
        errorMessage: '模拟写译题目创建失败。',
      });
      return;
    }
    const topic = createWritingTranslationTopicRecord(body, currentOperator());
    pushOperationAuditLog({
      roleId: currentRoleId() as AdminRoleId,
      action: 'create',
      objectType: 'writing_translation',
      objectSubtype: topic.topicType,
      objectId: topic.id,
      sourcePage: '/writing-translation/topics/new',
      reason: body.changeSummary || '保存写译题目草稿。',
      result: 'success',
      changeSummary: `新建写译题目草稿：${sanitizeSummary(topic)}`,
      newStatus: topic.status,
      version: topic.version,
    });
    res.send({ success: true, data: topic });
  },

  'PATCH /api/writing-translation/topics/:id': (req: Request, res: Response) => {
    if (!canEditWritingTranslation()) {
      sendForbidden(res, 'edit', String(req.params.id));
      return;
    }
    const topic = getWritingTranslationTopic(String(req.params.id));
    if (!topic) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: '写译题目不存在。',
      });
      return;
    }
    const body = req.body as API.WritingTranslationTopicSaveParams;
    if (bodyMaySimulate500(body)) {
      res.status(500).send({
        success: false,
        errorCode: '500',
        errorMessage: '模拟写译题目更新失败。',
      });
      return;
    }
    const result = updateWritingTranslationTopicRecord(topic, body, currentOperator());
    if ('conflict' in result) {
      pushOperationAuditLog({
        roleId: currentRoleId() as AdminRoleId,
        action: 'version_conflict',
        objectType: 'writing_translation',
        objectSubtype: topic.topicType,
        objectId: topic.id,
        sourcePage: `/writing-translation/topics/${topic.id}/edit`,
        reason: '提交 dataVersion 不是最新版本。',
        result: 'failed',
        changeSummary: `写译题目保存冲突：${topic.id}，未覆盖最新数据。`,
        version: topic.version,
      });
      res.status(409).send({
        success: false,
        errorCode: '409',
        errorMessage: '题目版本已变化，请刷新后再保存。',
        data: topic,
      });
      return;
    }
    if ('locked' in result) {
      res.status(422).send({
        success: false,
        errorCode: '422',
        errorMessage: '当前状态不能直接编辑，请创建新草稿版本。',
      });
      return;
    }
    pushOperationAuditLog({
      roleId: currentRoleId() as AdminRoleId,
      action: 'edit',
      objectType: 'writing_translation',
      objectSubtype: result.topic.topicType,
      objectId: result.topic.id,
      sourcePage: `/writing-translation/topics/${result.topic.id}/edit`,
      reason: result.topic.changeSummary,
      result: 'success',
      changeSummary: `更新写译题目草稿：${sanitizeSummary(result.topic)} 未记录完整题干或参考译文。`,
      originalStatus: topic.status,
      newStatus: result.topic.status,
      version: result.topic.version,
    });
    res.send({ success: true, data: result.topic });
  },

  'POST /api/writing-translation/topics/:id/copy': (req: Request, res: Response) => {
    if (!canCreateWritingTranslation()) {
      sendForbidden(res, 'copy', String(req.params.id));
      return;
    }
    const topic = getWritingTranslationTopic(String(req.params.id));
    if (!topic) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: '写译题目不存在。',
      });
      return;
    }
    const draft = copyWritingTranslationTopicDraft(topic, currentOperator());
    pushOperationAuditLog({
      roleId: currentRoleId() as AdminRoleId,
      action: 'copy',
      objectType: 'writing_translation',
      objectSubtype: topic.topicType,
      objectId: topic.id,
      sourcePage: `/writing-translation/topics/${topic.id}`,
      reason: '从已发布或历史版本创建新草稿。',
      result: 'success',
      changeSummary: `创建写译题目新草稿：${draft.id}，未覆盖线上版本。`,
      originalStatus: topic.status,
      newStatus: draft.status,
      version: draft.version,
    });
    res.send({ success: true, data: draft });
  },

  'POST /api/writing-translation/topics/precheck': (req: Request, res: Response) => {
    if (!canReadWritingTranslation()) {
      sendForbidden(res, 'precheck');
      return;
    }
    const body = req.body as API.WritingTranslationTopicSaveParams;
    if (bodyMaySimulate500(body)) {
      res.status(500).send({
        success: false,
        errorCode: '500',
        errorMessage: '模拟写译预校验失败。',
      });
      return;
    }
    res.send({ success: true, data: buildWritingTranslationPrecheck(body) });
  },

  'POST /api/writing-translation/topics/:id/precheck': (req: Request, res: Response) => {
    if (!canReadWritingTranslation()) {
      sendForbidden(res, 'precheck', String(req.params.id));
      return;
    }
    const topic = getWritingTranslationTopic(String(req.params.id));
    if (!topic) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: '写译题目不存在。',
      });
      return;
    }
    const result = buildWritingTranslationPrecheck(req.body?.name ? req.body : topic, topic.id);
    topic.lastPrecheck = result;
    pushOperationAuditLog({
      roleId: currentRoleId() as AdminRoleId,
      action: 'precheck',
      objectType: 'writing_translation',
      objectSubtype: topic.topicType,
      objectId: topic.id,
      sourcePage: `/writing-translation/topics/${topic.id}`,
      reason: '执行写译题目静态预校验。',
      result: result.level === 'error' ? 'failed' : 'success',
      changeSummary: `写译预校验：${topic.id}，结果 ${result.level}，问题 ${result.issues.length} 条。`,
      version: topic.version,
    });
    res.send({ success: true, data: result });
  },

  'POST /api/writing-translation/topics/validate-samples': (req: Request, res: Response) => {
    if (!canReadWritingTranslation()) {
      sendForbidden(res, 'validate_samples');
      return;
    }
    const body = req.body as API.WritingTranslationTopicSaveParams;
    if (bodyMaySimulate500(body)) {
      res.status(500).send({
        success: false,
        errorCode: '500',
        errorMessage: '模拟写译静态样例校验失败。',
      });
      return;
    }
    res.send({ success: true, data: buildWritingTranslationStaticValidation(body) });
  },

  'POST /api/writing-translation/topics/:id/validate-samples': (req: Request, res: Response) => {
    if (!canReadWritingTranslation()) {
      sendForbidden(res, 'validate_samples', String(req.params.id));
      return;
    }
    const topic = getWritingTranslationTopic(String(req.params.id));
    if (!topic) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: '写译题目不存在。',
      });
      return;
    }
    const result = buildWritingTranslationStaticValidation(req.body?.name ? req.body : topic);
    topic.lastValidation = result;
    pushOperationAuditLog({
      roleId: currentRoleId() as AdminRoleId,
      action: 'validate_samples',
      objectType: 'writing_translation',
      objectSubtype: topic.topicType,
      objectId: topic.id,
      sourcePage: `/writing-translation/topics/${topic.id}`,
      reason: '执行本地静态样例校验。',
      result: result.level === 'error' ? 'failed' : 'success',
      changeSummary: `静态样例校验：${topic.id}，结果 ${result.level}，不调用真实模型。`,
      version: topic.version,
    });
    res.send({ success: true, data: result });
  },

  'POST /api/writing-translation/topics/:id/submit-review': (req: Request, res: Response) => {
    if (!canSubmitWritingTranslation()) {
      sendForbidden(res, 'submit', String(req.params.id));
      return;
    }
    const topic = getWritingTranslationTopic(String(req.params.id));
    if (!topic) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: '写译题目不存在。',
      });
      return;
    }
    const result = submitWritingTranslationTopicReview(
      topic,
      req.body as API.WritingTranslationSubmitParams,
      currentOperator(),
      reviewTasksData,
    );
    if ('failed' in result) {
      res.status(500).send({
        success: false,
        errorCode: '500',
        errorMessage: '模拟审核任务创建失败。',
      });
      return;
    }
    if ('conflict' in result) {
      res.status(409).send({
        success: false,
        errorCode: '409',
        errorMessage: '题目版本已变化，请刷新后再提交审核。',
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
      objectType: 'writing_translation',
      objectSubtype: result.topic.topicType,
      objectId: result.topic.id,
      sourcePage: `/writing-translation/topics/${result.topic.id}`,
      reason: req.body?.changeSummary || '提交写译题目审核。',
      result: 'success',
      changeSummary: `提交写译题目审核：${sanitizeSummary(result.topic)}`,
      originalStatus: 'draft',
      newStatus: result.topic.status,
      version: result.topic.version,
    });
    res.send({ success: true, data: result.topic, reviewTask: result.task });
  },

  'GET /api/writing-translation/topics/:id/versions': (req: Request, res: Response) => {
    if (!canReadWritingTranslation()) {
      sendForbidden(res, 'read_versions', String(req.params.id));
      return;
    }
    const topic = getWritingTranslationTopic(String(req.params.id));
    if (!topic) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: '写译题目不存在。',
      });
      return;
    }
    res.send({ success: true, data: topic.versionRecords });
  },

  'GET /api/writing-translation/topics/:id/versions/diff': (req: Request, res: Response) => {
    if (!canReadWritingTranslation()) {
      sendForbidden(res, 'read_version_diff', String(req.params.id));
      return;
    }
    const topic = getWritingTranslationTopic(String(req.params.id));
    if (!topic) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: '写译题目不存在。',
      });
      return;
    }
    res.send({
      success: true,
      data: buildWritingTranslationVersionDiff(
        topic,
        typeof req.query.fromVersion === 'string' ? req.query.fromVersion : undefined,
        typeof req.query.toVersion === 'string' ? req.query.toVersion : undefined,
      ),
    });
  },

  'GET /api/writing-translation/references/scoring-presets': (req: Request, res: Response) => {
    if (!canReadWritingTranslation()) {
      sendForbidden(res, 'read_scoring_presets');
      return;
    }
    const topicType =
      typeof req.query.topicType === 'string'
        ? (req.query.topicType as API.WritingTranslationTopicType)
        : undefined;
    res.send({
      success: true,
      data: scoringPresets.filter((item) => !topicType || item.topicType === topicType),
    });
  },

  'GET /api/writing-translation/references/ai-strategies': (req: Request, res: Response) => {
    if (!canReadWritingTranslation()) {
      sendForbidden(res, 'read_ai_strategies');
      return;
    }
    const examType =
      typeof req.query.examType === 'string' ? (req.query.examType as API.ExamType) : undefined;
    res.send({
      success: true,
      data: availableWritingTranslationAiStrategies(examType),
    });
  },
};
