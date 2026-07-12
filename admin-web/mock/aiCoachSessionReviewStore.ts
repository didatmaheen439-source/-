import { roleConfigs } from '../src/foundation/permissions';
import type { AdminRoleId } from '../src/foundation/permissions';
import { createAiAbnormalReplyFromSessionReview } from './aiAbnormalReplyStore';
import { nowText } from './auditStore';
import { getAiCoachStrategy } from './aiCoachStore';

export type AiSessionReviewOperator = {
  id: string;
  name: string;
  roleId: AdminRoleId;
  roleName: string;
};

type InternalAiSessionReview = API.AiSessionReview & {
  sensitiveContext: Record<API.AiSessionSensitiveFieldKey, string>;
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const aiSessionSensitiveFieldLabels: Record<API.AiSessionSensitiveFieldKey, string> = {
  context_excerpt: '上下文片段',
  user_input_excerpt: '用户输入片段',
  assistant_reply_excerpt: 'AI 回复片段',
  attachment_summary: '附件摘要',
};

export const aiSessionAbnormalTypeLabels: Record<API.AiSessionAbnormalType, string> = {
  answer_dependency: '答案依赖',
  boundary_violation: '边界违规',
  incorrect_guidance: '错误引导',
  sensitive_content: '敏感内容',
  other: '其它异常',
};

export const canOperateAiSessionReview = (roleId?: string) =>
  roleId === 'super_admin' || roleId === 'ai_operator';

export const aiSessionReviewOperatorFromRole = (
  roleId: AdminRoleId,
  accountId?: string,
  accountName?: string,
): AiSessionReviewOperator => ({
  id: accountId || roleId,
  name: accountName || roleConfigs[roleId].name,
  roleId,
  roleName: roleConfigs[roleId].name,
});

const strategySnapshot = (
  strategyId: string,
  businessScene: API.AiCoachBusinessScene,
): API.AiSessionStrategySnapshot => {
  const strategy = getAiCoachStrategy(strategyId);
  return {
    strategyId,
    strategyTitle: strategy?.title ?? '历史策略快照',
    strategyVersion: strategy?.version ?? 'V1.0',
    configType: strategy?.configType ?? 'prompt_template',
    businessScene,
    statusAtTime: strategy?.status ?? 'offline',
  };
};

const timelineItem = (
  id: string,
  operator: string,
  roleName: string,
  action: string,
  reason: string,
  toStatus?: API.AiSessionReviewStatus,
  fromStatus?: API.AiSessionReviewStatus,
): API.AiSessionReviewTimelineItem => ({
  id,
  operator,
  roleName,
  action,
  fromStatus,
  toStatus,
  reason,
  time: nowText(),
  result: 'success',
});

const createSessionReview = (params: {
  id: string;
  sessionId: string;
  sessionTime: string;
  userLabel: string;
  examType: API.ExamType;
  intentKey: string;
  intentName: string;
  businessScene: API.AiCoachBusinessScene;
  summaryPreview: string;
  summary: string;
  riskLevel: API.AiCoachRiskLevel;
  riskSignals: API.AiSessionRiskSignal[];
  strategyId: string;
  reviewStatus?: API.AiSessionReviewStatus;
  sensitiveContext: Record<API.AiSessionSensitiveFieldKey, string>;
}): InternalAiSessionReview => ({
  id: params.id,
  sessionId: params.sessionId,
  sessionTime: params.sessionTime,
  userLabel: params.userLabel,
  examType: params.examType,
  intentKey: params.intentKey,
  intentName: params.intentName,
  businessScene: params.businessScene,
  summaryPreview: params.summaryPreview,
  summary: params.summary,
  riskLevel: params.riskLevel,
  riskSignals: params.riskSignals,
  strategySnapshot: strategySnapshot(params.strategyId, params.businessScene),
  reviewStatus: params.reviewStatus ?? 'pending',
  timeline: [
    {
      id: `${params.id}-created`,
      operator: '系统',
      roleName: '系统',
      action: '生成抽检样本',
      toStatus: params.reviewStatus ?? 'pending',
      reason: 'Mock 会话摘要进入抽检池。',
      time: params.sessionTime,
      result: 'success',
    },
  ],
  dataVersion: 1,
  updatedAt: params.sessionTime,
  sensitiveContext: params.sensitiveContext,
});

export const aiAbnormalHandlingItemsData: API.AiAbnormalHandlingItem[] = [];

export const aiSessionReviewsData: InternalAiSessionReview[] = [
  createSessionReview({
    id: 'ai-session-review-20260712-001',
    sessionId: 'mock-session-listening-7194',
    sessionTime: '2026-07-12 09:24:18',
    userLabel: '脱敏用户 A',
    examType: 'CET4',
    intentKey: 'intent_listening_followup',
    intentName: '听力错因追问',
    businessScene: 'listening_coach',
    summaryPreview: '用户围绕听力第 12 题追问错因，AI 给出定位步骤和跟练建议。',
    summary: '会话围绕听力错因复盘展开。AI 先归纳题干定位点，再提示用户复听关键词，并给出下一步跟练任务。',
    riskLevel: 'medium',
    riskSignals: [
      {
        id: 'risk-direct-answer',
        label: '直接答案诉求',
        level: 'medium',
        summary: '用户一度要求直接给选项，AI 已回到解析步骤。',
      },
    ],
    strategyId: 'ai-intent-listening-v12',
    sensitiveContext: {
      context_excerpt: '用户来自今日听力任务，上一题错误标签为定位词遗漏。',
      user_input_excerpt: '我就是想知道这题为什么选 B，能不能直接告诉我听哪里？',
      assistant_reply_excerpt: '先不直接跳到答案，我们按定位词和转折词两步看。',
      attachment_summary: '关联题目：听力短对话第 12 题，未包含原始音频。',
    },
  }),
  createSessionReview({
    id: 'ai-session-review-20260712-002',
    sessionId: 'mock-session-writing-2810',
    sessionTime: '2026-07-12 10:16:42',
    userLabel: '脱敏用户 B',
    examType: 'CET6',
    intentKey: 'intent_writing_polish',
    intentName: '写作表达润色',
    businessScene: 'writing_explanation',
    summaryPreview: '用户希望 AI 改写作文段落，AI 给出结构建议后提供局部表达替换。',
    summary: '会话命中写作讲解场景。AI 识别出用户希望整体代写的风险，保留局部表达建议，并要求用户先补充论点。',
    riskLevel: 'high',
    riskSignals: [
      {
        id: 'risk-ghost-writing',
        label: '代写边界',
        level: 'high',
        summary: '用户要求直接重写整段，需复核是否越过写作辅助边界。',
      },
      {
        id: 'risk-policy-version',
        label: '高风险策略',
        level: 'medium',
        summary: '会话关联策略为高风险 Prompt 模板。',
      },
    ],
    strategyId: 'ai-prompt-writing-v04',
    sensitiveContext: {
      context_excerpt: '用户处于写作专项练习，题目为观点论证类作文。',
      user_input_excerpt: '帮我把这一段直接改得像高分作文，可以整段替换。',
      assistant_reply_excerpt: '我可以指出结构问题和给局部表达，但不会替你完成整段。',
      attachment_summary: '附件仅保留作文段落长度和错误类型摘要，不含完整原文。',
    },
  }),
  createSessionReview({
    id: 'ai-session-review-20260712-003',
    sessionId: 'mock-session-error-5531',
    sessionTime: '2026-07-12 11:03:05',
    userLabel: '脱敏用户 C',
    examType: 'CET4',
    intentKey: 'intent_error_explanation',
    intentName: '错题讲解',
    businessScene: 'error_explanation',
    summaryPreview: '用户询问阅读错题，AI 按题干定位、选项排除和回练建议完成讲解。',
    summary: '错题讲解流程完整，AI 未直接代答，先解释定位依据，再安排同类题回练。',
    riskLevel: 'low',
    riskSignals: [],
    strategyId: 'ai-structure-error-explain-v11',
    sensitiveContext: {
      context_excerpt: '用户最近弱项为阅读细节题，今日任务完成 3/5。',
      user_input_excerpt: '我不懂为什么 C 不对，文章里不是有这个词吗？',
      assistant_reply_excerpt: '这个词出现了，但选项偷换了对象，我们看主语和范围。',
      attachment_summary: '关联阅读题：细节理解，材料内容已脱敏摘要化。',
    },
  }),
  createSessionReview({
    id: 'ai-session-review-20260712-004',
    sessionId: 'mock-session-plan-9082',
    sessionTime: '2026-07-12 12:28:51',
    userLabel: '脱敏用户 D',
    examType: 'CET6',
    intentKey: 'intent_learning_path',
    intentName: '学习路径推荐',
    businessScene: 'learning_path_recommendation',
    summaryPreview: '用户询问今日学习安排，AI 根据弱项摘要推荐听力和翻译任务。',
    summary: '学习路径推荐基于脱敏弱项和任务进度，输出了两个短任务和复盘提醒。',
    riskLevel: 'low',
    riskSignals: [],
    strategyId: 'ai-prompt-path-v07',
    reviewStatus: 'completed',
    sensitiveContext: {
      context_excerpt: '用户近 7 日听力正确率低于平均值，翻译任务中断一次。',
      user_input_excerpt: '今天只有半小时，该先做什么？',
      assistant_reply_excerpt: '先做 12 分钟听力定位，再做 10 分钟翻译句式复盘。',
      attachment_summary: '无附件。',
    },
  }),
];

aiSessionReviewsData[3].conclusion = 'normal';
aiSessionReviewsData[3].reviewNote = '摘要、策略和风险信号一致，未发现异常。';
aiSessionReviewsData[3].reviewerId = 'ai_operator';
aiSessionReviewsData[3].reviewer = 'AI 策略运营';
aiSessionReviewsData[3].reviewedAt = '2026-07-12 12:36:20';
aiSessionReviewsData[3].updatedAt = '2026-07-12 12:36:20';
aiSessionReviewsData[3].timeline.unshift({
  id: 'ai-session-review-20260712-004-completed',
  operator: 'AI 策略运营',
  roleName: 'AI 策略运营',
  action: '标记正常',
  fromStatus: 'in_review',
  toStatus: 'completed',
  reason: '摘要、策略和风险信号一致，未发现异常。',
  time: '2026-07-12 12:36:20',
  result: 'success',
});

const sanitizeSessionReview = (session: InternalAiSessionReview): API.AiSessionReview => {
  const { sensitiveContext: _sensitiveContext, ...safeSession } = session;
  return clone({
    ...safeSession,
    abnormalItem: session.abnormalItemId
      ? aiAbnormalHandlingItemsData.find((item) => item.id === session.abnormalItemId)
      : undefined,
  });
};

export const getAiSessionReview = (id: string) =>
  aiSessionReviewsData.find((item) => item.id === id);

export const getSafeAiSessionReview = (id: string) => {
  const session = getAiSessionReview(id);
  return session ? sanitizeSessionReview(session) : undefined;
};

export const filterAiSessionReviews = (
  query: API.AiSessionReviewQueryParams = {},
): API.AiSessionReview[] => {
  const keyword = query.keyword?.trim().toLowerCase();
  const startTime = query.sessionTimeRange?.[0] ? new Date(query.sessionTimeRange[0]).getTime() : undefined;
  const endTime = query.sessionTimeRange?.[1] ? new Date(query.sessionTimeRange[1]).getTime() + 24 * 60 * 60 * 1000 - 1 : undefined;
  return aiSessionReviewsData
    .filter((item) => {
      if (keyword) {
        const haystack = [
          item.id,
          item.sessionId,
          item.intentKey,
          item.intentName,
          item.summaryPreview,
          item.strategySnapshot.strategyTitle,
          item.strategySnapshot.strategyVersion,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }
      if (query.intentKey && item.intentKey !== query.intentKey) return false;
      if (query.strategyVersion && item.strategySnapshot.strategyVersion !== query.strategyVersion) return false;
      if (query.riskLevel && item.riskLevel !== query.riskLevel) return false;
      if (query.reviewStatus && item.reviewStatus !== query.reviewStatus) return false;
      if (query.conclusion && item.conclusion !== query.conclusion) return false;
      const sessionTime = new Date(item.sessionTime).getTime();
      if (startTime && sessionTime < startTime) return false;
      if (endTime && sessionTime > endTime) return false;
      return true;
    })
    .sort((first, second) => second.sessionTime.localeCompare(first.sessionTime))
    .map(sanitizeSessionReview);
};

export const paginateAiSessionReviews = (
  items: API.AiSessionReview[],
  query: API.AiSessionReviewQueryParams = {},
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

export const claimAiSessionReview = (
  session: InternalAiSessionReview,
  operator: AiSessionReviewOperator,
) => {
  if (session.reviewStatus === 'completed') return { locked: true as const };
  if (session.reviewStatus === 'in_review' && session.reviewerId !== operator.id) {
    return { conflict: true as const };
  }
  if (session.reviewStatus === 'in_review' && session.reviewerId === operator.id) {
    return { session: sanitizeSessionReview(session), unchanged: true as const };
  }
  const previousStatus = session.reviewStatus;
  const now = nowText();
  session.reviewStatus = 'in_review';
  session.reviewerId = operator.id;
  session.reviewer = operator.name;
  session.updatedAt = now;
  session.dataVersion += 1;
  session.timeline.unshift(
    timelineItem(
      `claim-${session.id}-${Date.now()}`,
      operator.name,
      operator.roleName,
      '认领抽检',
      '认领会话抽检任务。',
      'in_review',
      previousStatus,
    ),
  );
  return { session: sanitizeSessionReview(session) };
};

export const releaseAiSessionReview = (
  session: InternalAiSessionReview,
  operator: AiSessionReviewOperator,
) => {
  if (session.reviewStatus !== 'in_review' || session.reviewerId !== operator.id) {
    return { locked: true as const };
  }
  const now = nowText();
  session.reviewStatus = 'pending';
  session.reviewerId = undefined;
  session.reviewer = undefined;
  session.updatedAt = now;
  session.dataVersion += 1;
  session.timeline.unshift(
    timelineItem(
      `release-${session.id}-${Date.now()}`,
      operator.name,
      operator.roleName,
      '释放抽检',
      '释放会话抽检任务。',
      'pending',
      'in_review',
    ),
  );
  return { session: sanitizeSessionReview(session) };
};

export const readAiSessionSensitiveContext = (
  session: InternalAiSessionReview,
  params: API.AiSessionSensitiveAccessParams,
  operator: AiSessionReviewOperator,
) => {
  if (params.dataVersion !== undefined && params.dataVersion !== session.dataVersion) {
    return { conflict: true as const };
  }
  if (session.reviewStatus !== 'in_review' || session.reviewerId !== operator.id) {
    return { locked: true as const };
  }
  if (!params.accessReason?.trim() || !params.requestedFields?.length) {
    return { invalid: true as const };
  }
  const fields = params.requestedFields.reduce<Partial<Record<API.AiSessionSensitiveFieldKey, string>>>(
    (acc, field) => {
      if (session.sensitiveContext[field]) acc[field] = session.sensitiveContext[field];
      return acc;
    },
    {},
  );
  return { fields };
};

export const concludeAiSessionReview = (
  session: InternalAiSessionReview,
  params: API.AiSessionReviewConclusionParams,
  operator: AiSessionReviewOperator,
) => {
  if (
    params.conclusion === 'abnormal' &&
    params.idempotencyKey &&
    session.abnormalItemId === params.idempotencyKey
  ) {
    const abnormalItem = aiAbnormalHandlingItemsData.find((item) => item.id === session.abnormalItemId);
    return { session: sanitizeSessionReview(session), abnormalItem, unchanged: true as const };
  }
  if (params.dataVersion !== session.dataVersion) return { conflict: true as const };
  if (session.reviewStatus !== 'in_review' || session.reviewerId !== operator.id) {
    return { locked: true as const };
  }
  if (!params.reviewNote?.trim()) return { invalid: true as const };
  if (
    params.conclusion === 'abnormal' &&
    (!params.abnormalType || !params.severity || !params.evidenceSummary?.trim())
  ) {
    return { invalid: true as const };
  }
  const now = nowText();
  let abnormalItem: API.AiAbnormalHandlingItem | undefined;
  if (params.conclusion === 'abnormal') {
    const existing = aiAbnormalHandlingItemsData.find(
      (item) => item.sourceSessionReviewId === session.id,
    );
    abnormalItem =
      existing ??
      {
        id: params.idempotencyKey || `abnormal-${session.id}-${Date.now()}`,
        sourceSessionReviewId: session.id,
        sourceSessionId: session.sessionId,
        abnormalType: params.abnormalType as API.AiSessionAbnormalType,
        severity: params.severity as API.AiSessionAbnormalSeverity,
        evidenceSummary: params.evidenceSummary as string,
        reviewNote: params.reviewNote,
        strategySnapshot: clone(session.strategySnapshot),
        status: 'pending',
        creatorId: operator.id,
        creator: operator.name,
        createdAt: now,
        updatedAt: now,
      };
    if (!existing) aiAbnormalHandlingItemsData.unshift(abnormalItem);
    createAiAbnormalReplyFromSessionReview({
      id: abnormalItem.id,
      session: sanitizeSessionReview(session),
      abnormalType: abnormalItem.abnormalType,
      severity: abnormalItem.severity,
      evidenceSummary: abnormalItem.evidenceSummary,
      reviewNote: abnormalItem.reviewNote,
      operator,
    });
    session.abnormalItemId = abnormalItem.id;
  }
  session.reviewStatus = 'completed';
  session.conclusion = params.conclusion;
  session.reviewNote = params.reviewNote;
  session.reviewedAt = now;
  session.updatedAt = now;
  session.dataVersion += 1;
  session.timeline.unshift(
    timelineItem(
      `conclusion-${session.id}-${Date.now()}`,
      operator.name,
      operator.roleName,
      params.conclusion === 'abnormal' ? '标记异常' : '标记正常',
      params.reviewNote,
      'completed',
      'in_review',
    ),
  );
  return { session: sanitizeSessionReview(session), abnormalItem };
};
