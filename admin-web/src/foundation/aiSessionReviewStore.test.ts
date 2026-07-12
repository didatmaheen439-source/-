import { describe, expect, it } from 'vitest';
import { getAiAbnormalReply } from '../../mock/aiAbnormalReplyStore';
import {
  aiAbnormalHandlingItemsData,
  aiSessionReviewOperatorFromRole,
  claimAiSessionReview,
  concludeAiSessionReview,
  filterAiSessionReviews,
  getAiSessionReview,
  readAiSessionSensitiveContext,
} from '../../mock/aiCoachSessionReviewStore';

const operator = aiSessionReviewOperatorFromRole('ai_operator', 'ai_operator', 'AI 策略运营');

const requiredSession = (id: string) => {
  const session = getAiSessionReview(id);
  if (!session) throw new Error(`Missing AI session review fixture: ${id}`);
  return session;
};

describe('aiSessionReviewStore', () => {
  it('filters session reviews without leaking sensitive context', () => {
    const result = filterAiSessionReviews({
      riskLevel: 'high',
      reviewStatus: 'pending',
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('ai-session-review-20260712-002');
    expect(JSON.stringify(result)).not.toContain('sensitiveContext');
    expect(JSON.stringify(result)).not.toContain('直接改得像高分作文');
  });

  it('requires claim before reading selected sensitive fields', () => {
    const session = requiredSession('ai-session-review-20260712-001');
    const locked = readAiSessionSensitiveContext(
      session,
      {
        requestedFields: ['user_input_excerpt'],
        accessReason: '核对是否存在直接答案诉求。',
        dataVersion: session.dataVersion,
      },
      operator,
    );
    expect(locked).toEqual({ locked: true });

    const claimed = claimAiSessionReview(session, operator);
    if (!('session' in claimed) || !claimed.session) {
      throw new Error('Claim should return the session');
    }
    expect(claimed.session.reviewStatus).toBe('in_review');

    const result = readAiSessionSensitiveContext(
      session,
      {
        requestedFields: ['user_input_excerpt'],
        accessReason: '核对是否存在直接答案诉求。',
        dataVersion: session.dataVersion,
      },
      operator,
    );
    if (!('fields' in result)) {
      throw new Error('Sensitive access should return selected fields');
    }
    const fields = result.fields ?? {};
    expect(Object.keys(fields)).toEqual(['user_input_excerpt']);
    expect(JSON.stringify(result)).not.toContain('context_excerpt');
  });

  it('uses optimistic locking for conclusions', () => {
    const session = requiredSession('ai-session-review-20260712-003');
    const staleVersion = session.dataVersion;
    claimAiSessionReview(session, operator);
    const result = concludeAiSessionReview(
      session,
      {
        conclusion: 'normal',
        reviewNote: '测试旧版本提交。',
        dataVersion: staleVersion,
      },
      operator,
    );
    expect(result).toEqual({ conflict: true });
  });

  it('creates one abnormal item atomically and keeps the strategy snapshot', () => {
    const session = requiredSession('ai-session-review-20260712-002');
    claimAiSessionReview(session, operator);
    const beforeCount = aiAbnormalHandlingItemsData.length;
    const result = concludeAiSessionReview(
      session,
      {
        conclusion: 'abnormal',
        abnormalType: 'boundary_violation',
        severity: 'P1',
        evidenceSummary: '用户请求整段替换，需进入异常处理。',
        reviewNote: '确认存在写作边界风险。',
        dataVersion: session.dataVersion,
        idempotencyKey: `abnormal-${session.id}`,
      },
      operator,
    );
    expect('abnormalItem' in result && result.abnormalItem?.sourceSessionReviewId).toBe(session.id);
    expect(aiAbnormalHandlingItemsData).toHaveLength(beforeCount + 1);
    expect(result.abnormalItem?.strategySnapshot.strategyId).toBe(session.strategySnapshot.strategyId);
    expect(result.session?.reviewStatus).toBe('completed');
    expect(getAiAbnormalReply(result.abnormalItem?.id ?? '')?.status).toBe('pending');

    const repeated = concludeAiSessionReview(
      session,
      {
        conclusion: 'abnormal',
        abnormalType: 'boundary_violation',
        severity: 'P1',
        evidenceSummary: '重复提交。',
        reviewNote: '重复提交。',
        dataVersion: session.dataVersion - 1,
        idempotencyKey: `abnormal-${session.id}`,
      },
      operator,
    );
    expect('unchanged' in repeated && repeated.unchanged).toBe(true);
    expect(aiAbnormalHandlingItemsData).toHaveLength(beforeCount + 1);
  });
});
