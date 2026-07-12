import { describe, expect, it } from 'vitest';
import {
  closeAiAbnormalReply,
  closeAiAbnormalReplyWithoutFix,
  createAiAbnormalFixDraft,
  retestAiAbnormalReply,
  updateAiAbnormalDiagnosis,
} from '../../mock/aiAbnormalReplyStore';
import type { AiCoachOperator } from '../../mock/aiCoachStore';

const operator: AiCoachOperator = {
  id: 'ai_operator',
  name: 'AI 策略运营',
  roleId: 'ai_operator',
  roleName: 'AI 策略运营',
};

const makeAbnormal = (
  overrides: Partial<API.AiAbnormalReply> = {},
): API.AiAbnormalReply => ({
  id: `abnormal-test-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  title: '测试异常回复',
  abnormalType: 'intent_mismatch',
  severity: 'medium',
  status: 'processing',
  businessScene: 'listening_coach',
  examType: 'CET4',
  userId: 'user-test',
  userNickname: '测试用户',
  sessionId: 'mock-session-test',
  sessionStartedAt: '2026-07-12 09:00:00',
  source: 'mock_session_review',
  linkedStrategyId: 'ai-intent-listening-v12',
  linkedStrategyTitle: '听力陪练意图识别 V1.2',
  linkedStrategyVersion: 'V1.2',
  linkedStrategyStatus: 'published',
  handlerId: 'ai_operator',
  handler: 'AI 策略运营',
  handledAt: '2026-07-12 09:10:00',
  createdAt: '2026-07-12 09:00:00',
  updatedAt: '2026-07-12 09:10:00',
  dataVersion: 1,
  evidenceAccessed: false,
  operationRecords: [],
  ...overrides,
});

describe('aiAbnormalReplyStore', () => {
  it('requires root cause type to match the linked strategy type', () => {
    const abnormal = makeAbnormal();

    const result = updateAiAbnormalDiagnosis(
      abnormal,
      {
        dataVersion: abnormal.dataVersion,
        rootCauseType: 'prompt_template',
        diagnosis: '错误地归因为 Prompt。',
        linkedStrategyId: 'ai-intent-listening-v12',
      },
      operator,
    );

    expect(result).toEqual({ mismatch: true });
  });

  it('blocks fix draft creation before diagnosis is saved', () => {
    const abnormal = makeAbnormal();

    const result = createAiAbnormalFixDraft(
      abnormal,
      {
        dataVersion: abnormal.dataVersion,
        changeSummary: '尝试修复异常。',
      },
      operator,
    );

    expect(result).toEqual({ missingDiagnosis: true });
  });

  it('creates a fix draft with an abnormal regression case', () => {
    const abnormal = makeAbnormal({
      rootCauseType: 'intent',
      diagnosis: '意图分类阈值需要补充错题追问样例。',
    });

    const result = createAiAbnormalFixDraft(
      abnormal,
      {
        dataVersion: abnormal.dataVersion,
        changeSummary: '补充异常回归样例。',
      },
      operator,
    );

    expect('strategy' in result).toBe(true);
    if (!('strategy' in result)) return;
    const strategy = result.strategy;
    expect(strategy).toBeDefined();
    if (!strategy) return;
    expect(strategy.status).toBe('draft');
    expect(strategy.validationCases.some((item) => item.id === `${abnormal.id}-regression`)).toBe(true);
    expect(abnormal.fixStrategyId).toBe(strategy.id);
  });

  it('only resolves after the linked fix strategy has been published and retested', () => {
    const abnormal = makeAbnormal({
      rootCauseType: 'intent',
      diagnosis: '意图分类阈值需要补充错题追问样例。',
    });
    const draftResult = createAiAbnormalFixDraft(
      abnormal,
      {
        dataVersion: abnormal.dataVersion,
        changeSummary: '补充异常回归样例。',
      },
      operator,
    );
    expect('strategy' in draftResult).toBe(true);
    if (!('strategy' in draftResult)) return;
    const draft = draftResult.strategy;
    expect(draft).toBeDefined();
    if (!draft) return;

    const blockedRetest = retestAiAbnormalReply(
      abnormal,
      { dataVersion: abnormal.dataVersion },
      operator,
    );
    expect(blockedRetest).toEqual({ unpublished: true });

    draft.status = 'published';
    const retestResult = retestAiAbnormalReply(
      abnormal,
      { dataVersion: abnormal.dataVersion },
      operator,
    );
    expect('abnormal' in retestResult).toBe(true);
    expect(abnormal.status).toBe('resolved');
    expect(abnormal.latestRetest?.result).toBe('passed');

    const closeResult = closeAiAbnormalReply(
      abnormal,
      {
        dataVersion: abnormal.dataVersion,
        resolutionSummary: '修复版本已发布，Mock 复检通过，关闭异常。',
      },
      operator,
    );
    expect('abnormal' in closeResult).toBe(true);
    expect(abnormal.status).toBe('closed');
    expect(abnormal.resolutionType).toBe('strategy_fix');
  });

  it('supports strict audited closure without a strategy change', () => {
    const abnormal = makeAbnormal({
      diagnosis: '抽检样例归类错误，策略行为符合预期。',
      rootCauseType: 'prompt_template',
      linkedStrategyId: 'ai-prompt-error-v18',
      linkedStrategyTitle: '错题讲解 Prompt 模板 V1.8',
      linkedStrategyVersion: 'V1.8',
    });

    const invalid = closeAiAbnormalReplyWithoutFix(
      abnormal,
      {
        dataVersion: abnormal.dataVersion,
        resolutionType: 'false_positive',
        resolutionSummary: '误报',
      },
      operator,
    );
    expect(invalid).toEqual({ invalid: true });

    const result = closeAiAbnormalReplyWithoutFix(
      abnormal,
      {
        dataVersion: abnormal.dataVersion,
        resolutionType: 'false_positive',
        resolutionSummary: '受控证据复核后确认为误报，未修改策略。',
      },
      operator,
    );
    expect('abnormal' in result).toBe(true);
    expect(abnormal.status).toBe('closed');
    expect(abnormal.resolutionType).toBe('false_positive');
  });
});
