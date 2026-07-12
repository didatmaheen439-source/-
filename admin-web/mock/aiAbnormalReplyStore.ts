import type { AdminRoleId } from '../src/foundation/permissions';
import { nowText } from './auditStore';
import {
  aiCoachBusinessSceneLabels,
  aiCoachConfigTypeLabels,
  buildAiCoachPrecheck,
  buildAiCoachStaticValidation,
  copyAiCoachStrategyDraft,
  getAiCoachStrategy,
  type AiCoachOperator,
} from './aiCoachStore';

type AbnormalStoreGlobal = typeof globalThis & {
  __GUOJI_ADMIN_AI_ABNORMAL_REPLIES__?: API.AiAbnormalReply[];
};

const storeGlobal = globalThis as AbnormalStoreGlobal;

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const operation = (params: {
  operator: AiCoachOperator;
  action: string;
  fromStatus?: API.AiAbnormalReplyStatus;
  toStatus: API.AiAbnormalReplyStatus;
  reason: string;
}): API.AiAbnormalOperationRecord => ({
  id: `ai-abnormal-op-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  operator: params.operator.name,
  roleName: params.operator.roleName,
  action: params.action,
  fromStatus: params.fromStatus as API.ReviewTaskStatus | undefined,
  toStatus: params.toStatus as API.ReviewTaskStatus,
  reason: params.reason,
  time: nowText(),
});

const seed = (params: {
  id: string;
  title: string;
  abnormalType: API.AiAbnormalReplyType;
  severity: API.AiCoachRiskLevel;
  status: API.AiAbnormalReplyStatus;
  businessScene: API.AiCoachBusinessScene;
  examType: API.ExamType;
  linkedStrategyId: string;
  userId: string;
  userNickname: string;
  sessionId: string;
  createdAt: string;
  handler?: string;
  rootCauseType?: API.AiCoachConfigType;
  diagnosis?: string;
  fixStrategyId?: string;
  resolutionType?: API.AiAbnormalResolutionType;
  resolutionSummary?: string;
}): API.AiAbnormalReply => {
  const strategy = getAiCoachStrategy(params.linkedStrategyId);
  return {
    id: params.id,
    title: params.title,
    abnormalType: params.abnormalType,
    severity: params.severity,
    status: params.status,
    businessScene: params.businessScene,
    examType: params.examType,
    userId: params.userId,
    userNickname: params.userNickname,
    sessionId: params.sessionId,
    sessionStartedAt: params.createdAt,
    source: 'mock_session_review',
    linkedStrategyId: params.linkedStrategyId,
    linkedStrategyTitle: strategy?.title ?? params.linkedStrategyId,
    linkedStrategyVersion: strategy?.version ?? '-',
    linkedStrategyStatus: strategy?.status ?? 'draft',
    rootCauseType: params.rootCauseType,
    diagnosis: params.diagnosis,
    fixStrategyId: params.fixStrategyId,
    fixStrategyTitle: params.fixStrategyId ? getAiCoachStrategy(params.fixStrategyId)?.title : undefined,
    fixStrategyVersion: params.fixStrategyId ? getAiCoachStrategy(params.fixStrategyId)?.version : undefined,
    resolutionType: params.resolutionType,
    resolutionSummary: params.resolutionSummary,
    handlerId: params.handler ? 'ai_operator' : undefined,
    handler: params.handler,
    handledAt: params.handler ? params.createdAt : undefined,
    closedAt: params.status === 'closed' ? params.createdAt : undefined,
    createdAt: params.createdAt,
    updatedAt: params.createdAt,
    dataVersion: 1,
    evidenceAccessed: false,
    operationRecords: [
      {
        id: `${params.id}-seed`,
        operator: 'Mock 会话抽检',
        roleName: '系统',
        action: '标记异常',
        toStatus: params.status as API.ReviewTaskStatus,
        reason: '来自 Mock 会话抽检，不包含完整会话原文。',
        time: params.createdAt,
      },
    ],
  };
};

export const aiAbnormalRepliesData: API.AiAbnormalReply[] =
  storeGlobal.__GUOJI_ADMIN_AI_ABNORMAL_REPLIES__ ??
  [
    seed({
      id: 'abnormal-ai-001',
      title: '听力陪练把错题追问分流到泛学习建议',
      abnormalType: 'intent_mismatch',
      severity: 'medium',
      status: 'pending',
      businessScene: 'listening_coach',
      examType: 'CET4',
      linkedStrategyId: 'ai-intent-listening-v12',
      userId: 'user-10001',
      userNickname: '小林',
      sessionId: 'mock-session-listening-001',
      createdAt: '2026-07-12 09:20:00',
    }),
    seed({
      id: 'abnormal-ai-002',
      title: '错题讲解缺少判断依据区块',
      abnormalType: 'structure_missing',
      severity: 'high',
      status: 'processing',
      businessScene: 'error_explanation',
      examType: 'CET6',
      linkedStrategyId: 'ai-structure-error-v08',
      userId: 'user-10006',
      userNickname: 'Mia',
      sessionId: 'mock-session-error-006',
      createdAt: '2026-07-12 10:05:00',
      handler: 'AI 策略运营',
      rootCauseType: 'response_structure',
      diagnosis: '当前回答结构草稿要求区块存在，但未明确判断依据必须回填题干证据。',
    }),
    seed({
      id: 'abnormal-ai-003',
      title: '写作讲解边界提示已修复待关闭',
      abnormalType: 'dependency_boundary_violation',
      severity: 'high',
      status: 'resolved',
      businessScene: 'writing_explanation',
      examType: 'CET4',
      linkedStrategyId: 'ai-dependency-writing-v02',
      userId: 'user-10009',
      userNickname: '灰灰',
      sessionId: 'mock-session-writing-009',
      createdAt: '2026-07-12 11:30:00',
      handler: 'AI 策略运营',
      rootCauseType: 'dependency_rule',
      diagnosis: '防依赖规则已命中代写诉求，修复版本需要验证回到修改建议而不是完整代写。',
      fixStrategyId: 'ai-dependency-writing-v02',
    }),
    seed({
      id: 'abnormal-ai-004',
      title: '口语陪练重复追问被误判异常',
      abnormalType: 'answer_deviation',
      severity: 'low',
      status: 'closed',
      businessScene: 'speaking_coach',
      examType: 'CET6',
      linkedStrategyId: 'ai-prompt-speaking-v30',
      userId: 'user-10013',
      userNickname: '阿南',
      sessionId: 'mock-session-speaking-013',
      createdAt: '2026-07-12 12:10:00',
      handler: 'AI 策略运营',
      rootCauseType: 'prompt_template',
      diagnosis: '样例包含用户主动要求继续追问，异常来源为抽检规则误判。',
      resolutionType: 'false_positive',
      resolutionSummary: '按受控证据复核为误报，未修改策略。',
    }),
  ];

storeGlobal.__GUOJI_ADMIN_AI_ABNORMAL_REPLIES__ = aiAbnormalRepliesData;

export const abnormalTypeLabels: Record<API.AiAbnormalReplyType, string> = {
  intent_mismatch: '意图误判',
  answer_deviation: '回答偏离',
  structure_missing: '结构缺失',
  dependency_boundary_violation: '边界失守',
};

export const abnormalStatusLabels: Record<API.AiAbnormalReplyStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  resolved: '已处理',
  closed: '已关闭',
};

export const resolutionTypeLabels: Record<API.AiAbnormalResolutionType, string> = {
  strategy_fix: '策略修复',
  false_positive: '误报关闭',
  no_strategy_change: '无需策略变更',
};

export const getAiAbnormalReply = (id: string) =>
  aiAbnormalRepliesData.find((item) => item.id === id);

const reviewTypeToAbnormalReplyType: Record<API.AiSessionAbnormalType, API.AiAbnormalReplyType> = {
  answer_dependency: 'dependency_boundary_violation',
  boundary_violation: 'dependency_boundary_violation',
  incorrect_guidance: 'answer_deviation',
  sensitive_content: 'answer_deviation',
  other: 'answer_deviation',
};

const reviewSeverityToRiskLevel: Record<API.AiSessionAbnormalSeverity, API.AiCoachRiskLevel> = {
  P0: 'high',
  P1: 'medium',
  P2: 'low',
};

export const createAiAbnormalReplyFromSessionReview = (params: {
  id: string;
  session: API.AiSessionReview;
  abnormalType: API.AiSessionAbnormalType;
  severity: API.AiSessionAbnormalSeverity;
  evidenceSummary: string;
  reviewNote: string;
  operator: AiCoachOperator;
}) => {
  const existing = getAiAbnormalReply(params.id);
  if (existing) return existing;
  const now = nowText();
  const abnormal: API.AiAbnormalReply = {
    id: params.id,
    title: `${params.session.intentName} 会话抽检异常`,
    abnormalType: reviewTypeToAbnormalReplyType[params.abnormalType],
    severity: reviewSeverityToRiskLevel[params.severity],
    status: 'pending',
    businessScene: params.session.businessScene,
    examType: params.session.examType,
    userId: params.session.userLabel,
    userNickname: params.session.userLabel,
    sessionId: params.session.sessionId,
    sessionStartedAt: params.session.sessionTime,
    source: 'mock_session_review',
    linkedStrategyId: params.session.strategySnapshot.strategyId,
    linkedStrategyTitle: params.session.strategySnapshot.strategyTitle,
    linkedStrategyVersion: params.session.strategySnapshot.strategyVersion,
    linkedStrategyStatus: params.session.strategySnapshot.statusAtTime,
    createdAt: now,
    updatedAt: now,
    dataVersion: 1,
    evidenceAccessed: false,
    operationRecords: [
      operation({
        operator: params.operator,
        action: '标记异常',
        toStatus: 'pending',
        reason: `${params.evidenceSummary} ${params.reviewNote}`.trim(),
      }),
    ],
  };
  aiAbnormalRepliesData.unshift(abnormal);
  return abnormal;
};

export const filterAiAbnormalReplies = (
  query: API.AiAbnormalReplyQueryParams = {},
) => {
  const keyword = query.keyword?.trim().toLowerCase();
  return aiAbnormalRepliesData
    .filter((item) => {
      const haystack = [
        item.id,
        item.title,
        item.userNickname,
        item.sessionId,
        item.linkedStrategyTitle,
        item.fixStrategyTitle,
        item.handler,
      ]
        .join(' ')
        .toLowerCase();
      if (keyword && !haystack.includes(keyword)) return false;
      if (query.status && item.status !== query.status) return false;
      if (query.abnormalType && item.abnormalType !== query.abnormalType) return false;
      if (query.rootCauseType && item.rootCauseType !== query.rootCauseType) return false;
      if (query.severity && item.severity !== query.severity) return false;
      if (query.businessScene && item.businessScene !== query.businessScene) return false;
      if (query.handler && item.handler !== query.handler) return false;
      return true;
    })
    .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));
};

export const paginateAiAbnormalReplies = (
  items: API.AiAbnormalReply[],
  query: API.AiAbnormalReplyQueryParams = {},
) => {
  const current = Number(query.current || 1);
  const pageSize = Number(query.pageSize || 20);
  const start = (current - 1) * pageSize;
  return {
    data: clone(items.slice(start, start + pageSize)),
    total: items.length,
    current,
    pageSize,
  };
};

export const buildAiAbnormalEvidence = (abnormal: API.AiAbnormalReply): API.AiAbnormalEvidence => ({
  userInput: `用户输入摘要：${abnormal.userNickname} 在 ${abnormal.sessionId} 中提出与 ${aiCoachBusinessSceneLabels[abnormal.businessScene]} 相关的学习诉求。`,
  aiReply: 'AI 回复摘要：已脱敏，仅保留异常判断所需的回复结构和边界表现。',
  expectedOutcome:
    abnormal.abnormalType === 'structure_missing'
      ? '应包含问题判断、处理步骤和下一步任务，且判断依据需要可追溯。'
      : abnormal.abnormalType === 'dependency_boundary_violation'
        ? '应拒绝代答或代写，并回到可执行学习步骤。'
        : '应命中正确意图，并输出对应学习闭环步骤。',
  observedIssue: `${abnormalTypeLabels[abnormal.abnormalType]}，当前归因：${
    abnormal.rootCauseType ? aiCoachConfigTypeLabels[abnormal.rootCauseType] : '未归因'
  }。`,
  sessionSummary: '不展示完整对话、不导出用户原文；Mock 证据仅用于后台流程验证。',
  redactionNote: '已脱敏用户原文、完整 AI 回复和会话上下文。',
});

const ensureVersion = (
  abnormal: API.AiAbnormalReply,
  dataVersion?: number,
) => {
  if (dataVersion !== undefined && abnormal.dataVersion !== dataVersion) {
    return { conflict: true as const };
  }
  return undefined;
};

const touch = (
  abnormal: API.AiAbnormalReply,
  params: {
    operator: AiCoachOperator;
    action: string;
    fromStatus?: API.AiAbnormalReplyStatus;
    toStatus?: API.AiAbnormalReplyStatus;
    reason: string;
  },
) => {
  const toStatus = params.toStatus ?? abnormal.status;
  abnormal.status = toStatus;
  abnormal.updatedAt = nowText();
  abnormal.dataVersion += 1;
  abnormal.operationRecords.unshift(
    operation({
      operator: params.operator,
      action: params.action,
      fromStatus: params.fromStatus,
      toStatus,
      reason: params.reason,
    }),
  );
};

export const startAiAbnormalReply = (
  abnormal: API.AiAbnormalReply,
  operator: AiCoachOperator,
) => {
  if (abnormal.status !== 'pending') return { locked: true as const };
  const previousStatus = abnormal.status;
  abnormal.handlerId = operator.id;
  abnormal.handler = operator.name;
  abnormal.handledAt = nowText();
  touch(abnormal, {
    operator,
    action: '接手处理',
    fromStatus: previousStatus,
    toStatus: 'processing',
    reason: 'AI 运营接手异常项。',
  });
  return { abnormal };
};

export const updateAiAbnormalDiagnosis = (
  abnormal: API.AiAbnormalReply,
  params: API.AiAbnormalDiagnosisParams,
  operator: AiCoachOperator,
) => {
  const versionCheck = ensureVersion(abnormal, params.dataVersion);
  if (versionCheck) return versionCheck;
  if (abnormal.status !== 'processing') return { locked: true as const };
  const strategy = getAiCoachStrategy(params.linkedStrategyId);
  if (!strategy) return { missingStrategy: true as const };
  if (strategy.configType !== params.rootCauseType) return { mismatch: true as const };
  if (!params.diagnosis.trim()) return { invalid: true as const };
  abnormal.rootCauseType = params.rootCauseType;
  abnormal.diagnosis = params.diagnosis.trim();
  abnormal.linkedStrategyId = strategy.id;
  abnormal.linkedStrategyTitle = strategy.title;
  abnormal.linkedStrategyVersion = strategy.version;
  abnormal.linkedStrategyStatus = strategy.status;
  touch(abnormal, {
    operator,
    action: '保存归因',
    reason: `归因为 ${aiCoachConfigTypeLabels[params.rootCauseType]}。`,
  });
  return { abnormal };
};

export const createAiAbnormalFixDraft = (
  abnormal: API.AiAbnormalReply,
  params: API.AiAbnormalCreateFixDraftParams,
  operator: AiCoachOperator,
) => {
  const versionCheck = ensureVersion(abnormal, params.dataVersion);
  if (versionCheck) return versionCheck;
  if (abnormal.status !== 'processing') return { locked: true as const };
  if (!abnormal.rootCauseType || !abnormal.diagnosis) return { missingDiagnosis: true as const };
  const strategy = getAiCoachStrategy(abnormal.linkedStrategyId);
  if (!strategy) return { missingStrategy: true as const };
  if (strategy.configType !== abnormal.rootCauseType) return { mismatch: true as const };
  const draft = copyAiCoachStrategyDraft(strategy, operator);
  draft.title = `${strategy.title} 异常修复草稿`;
  draft.changeSummary = params.changeSummary || `修复异常 ${abnormal.id}。`;
  draft.impactScope = `修复 ${abnormal.title}，发布前不影响线上策略。`;
  draft.validationCases = [
    ...draft.validationCases,
    {
      id: `${abnormal.id}-regression`,
      title: `异常复检：${abnormalTypeLabels[abnormal.abnormalType]}`,
      input: buildAiAbnormalEvidence(abnormal).userInput,
      expected: buildAiAbnormalEvidence(abnormal).expectedOutcome,
    },
  ];
  const saveParams: API.AiCoachStrategySaveParams = {
    title: draft.title,
    description: draft.description,
    configType: draft.configType,
    businessScenes: draft.businessScenes,
    examTypes: draft.examTypes,
    body: draft.body,
    riskPolicy: draft.riskPolicy,
    validationCases: draft.validationCases,
    changeSummary: draft.changeSummary,
    impactScope: draft.impactScope,
    dataVersion: draft.dataVersion,
  };
  draft.lastPrecheck = buildAiCoachPrecheck(saveParams);
  draft.lastValidation = buildAiCoachStaticValidation(saveParams);
  abnormal.fixStrategyId = draft.id;
  abnormal.fixStrategyTitle = draft.title;
  abnormal.fixStrategyVersion = draft.version;
  abnormal.latestRetest = undefined;
  touch(abnormal, {
    operator,
    action: '创建修复草稿',
    reason: draft.changeSummary,
  });
  return { abnormal, strategy: draft };
};

export const retestAiAbnormalReply = (
  abnormal: API.AiAbnormalReply,
  params: API.AiAbnormalRetestParams,
  operator: AiCoachOperator,
) => {
  const versionCheck = ensureVersion(abnormal, params.dataVersion);
  if (versionCheck) return versionCheck;
  if (!['processing', 'resolved'].includes(abnormal.status)) return { locked: true as const };
  if (!abnormal.fixStrategyId) return { missingStrategy: true as const };
  const strategy = getAiCoachStrategy(abnormal.fixStrategyId);
  if (!strategy) return { missingStrategy: true as const };
  if (strategy.status !== 'published') return { unpublished: true as const };
  const validation = buildAiCoachStaticValidation({
    title: strategy.title,
    description: strategy.description,
    configType: strategy.configType,
    businessScenes: strategy.businessScenes,
    examTypes: strategy.examTypes,
    body: strategy.body,
    riskPolicy: strategy.riskPolicy,
    validationCases: strategy.validationCases,
    changeSummary: strategy.changeSummary,
    impactScope: strategy.impactScope,
    dataVersion: strategy.dataVersion,
  });
  const regressionCase = validation.cases.find((item) => item.id === `${abnormal.id}-regression`);
  const passed = validation.level !== 'error' && regressionCase?.result !== 'error';
  const previousStatus = abnormal.status;
  abnormal.latestRetest = {
    id: `retest-${abnormal.id}-${Date.now()}`,
    strategyId: strategy.id,
    strategyTitle: strategy.title,
    strategyVersion: strategy.version,
    result: passed ? 'passed' : 'error',
    summary: passed
      ? 'Mock 复检通过，异常样例已覆盖。'
      : 'Mock 复检未通过，需继续修改策略。',
    checkedAt: nowText(),
    operator: operator.name,
    mockOnly: true,
    cases: validation.cases,
  };
  touch(abnormal, {
    operator,
    action: 'Mock 复检',
    fromStatus: previousStatus,
    toStatus: passed ? 'resolved' : 'processing',
    reason: abnormal.latestRetest.summary,
  });
  return { abnormal };
};

export const closeAiAbnormalReply = (
  abnormal: API.AiAbnormalReply,
  params: API.AiAbnormalCloseParams,
  operator: AiCoachOperator,
) => {
  const versionCheck = ensureVersion(abnormal, params.dataVersion);
  if (versionCheck) return versionCheck;
  if (abnormal.status !== 'resolved') return { locked: true as const };
  if (!abnormal.latestRetest || abnormal.latestRetest.result !== 'passed') {
    return { missingRetest: true as const };
  }
  if (!params.resolutionSummary.trim()) return { invalid: true as const };
  const previousStatus = abnormal.status;
  abnormal.resolutionType = 'strategy_fix';
  abnormal.resolutionSummary = params.resolutionSummary.trim();
  abnormal.closedAt = nowText();
  touch(abnormal, {
    operator,
    action: '关闭异常',
    fromStatus: previousStatus,
    toStatus: 'closed',
    reason: abnormal.resolutionSummary,
  });
  return { abnormal };
};

export const closeAiAbnormalReplyWithoutFix = (
  abnormal: API.AiAbnormalReply,
  params: API.AiAbnormalCloseWithoutFixParams,
  operator: AiCoachOperator,
) => {
  const versionCheck = ensureVersion(abnormal, params.dataVersion);
  if (versionCheck) return versionCheck;
  if (!['processing', 'resolved'].includes(abnormal.status)) return { locked: true as const };
  if (params.resolutionSummary.trim().length < 10) return { invalid: true as const };
  const previousStatus = abnormal.status;
  abnormal.resolutionType = params.resolutionType;
  abnormal.resolutionSummary = params.resolutionSummary.trim();
  abnormal.closedAt = nowText();
  touch(abnormal, {
    operator,
    action: '无策略变更关闭',
    fromStatus: previousStatus,
    toStatus: 'closed',
    reason: `${resolutionTypeLabels[params.resolutionType]}：${abnormal.resolutionSummary}`,
  });
  return { abnormal };
};

export const snapshotAiAbnormalReply = (abnormal: API.AiAbnormalReply) => {
  const linked = getAiCoachStrategy(abnormal.linkedStrategyId);
  const fix = abnormal.fixStrategyId ? getAiCoachStrategy(abnormal.fixStrategyId) : undefined;
  abnormal.linkedStrategyStatus = linked?.status ?? abnormal.linkedStrategyStatus;
  abnormal.linkedStrategyVersion = linked?.version ?? abnormal.linkedStrategyVersion;
  if (fix) {
    abnormal.fixStrategyTitle = fix.title;
    abnormal.fixStrategyVersion = fix.version;
    abnormal.fixReviewTaskId = fix.reviewTaskId;
  }
  return clone(abnormal);
};

export const roleCanHandleAiAbnormal = (roleId: AdminRoleId | '') =>
  roleId === 'super_admin' || roleId === 'ai_operator';
