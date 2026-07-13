import { describe, expect, it } from 'vitest';
import { getAiAbnormalReply } from '../../mock/aiAbnormalReplyStore';
import {
  buildAiCoachPrecheck,
  getAiCoachStrategy,
} from '../../mock/aiCoachStore';
import {
  aiSessionReviewOperatorFromRole,
  claimAiSessionReview,
  concludeAiSessionReview,
  createAttachmentPolicyMockSession,
  getAiSessionReview,
} from '../../mock/aiCoachSessionReviewStore';

const operator = aiSessionReviewOperatorFromRole(
  'ai_operator',
  'ai_operator',
  'AI 策略运营',
);

const attachmentStrategy = () => {
  const strategy = getAiCoachStrategy('ai-attachment-global-v10');
  if (strategy?.configType !== 'attachment_policy') {
    throw new Error('Missing published attachment policy fixture');
  }
  return strategy;
};

const validParams = (): API.AiCoachStrategySaveParams => {
  const strategy = attachmentStrategy();
  return {
    strategyId: strategy.id,
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
  };
};

describe('aiAttachmentPolicyStore', () => {
  it('validates attachment rules, formats, limits and failure messages', () => {
    expect(buildAiCoachPrecheck(validParams()).level).toBe('passed');

    const invalid = validParams();
    invalid.strategyId = 'attachment-invalid';
    invalid.businessScenes = ['error_explanation'];
    invalid.body = {
      rules: [
        {
          id: 'invalid-rule',
          attachmentType: 'image',
          allowedFormats: ['xlsx'],
          maxSizeMb: 0,
          recognitionMode: 'audio_asr',
          enabled: true,
        },
      ],
      failureMessages: {
        unsupportedType: '',
        sizeExceeded: '',
        recognitionFailed: '',
      },
    };
    const result = buildAiCoachPrecheck(invalid);
    expect(result.level).toBe('error');
    expect(result.issues.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        'attachment-size-0',
        'attachment-format-0',
        'attachment-recognition-0',
        'attachment-failure-messages',
      ]),
    );
  });

  it('sends a successful Mock sample only to session review', () => {
    const strategy = attachmentStrategy();
    const key = `attachment-success-${Date.now()}`;
    const result = createAttachmentPolicyMockSession(
      strategy,
      { scenario: 'success', dataVersion: strategy.dataVersion, idempotencyKey: key },
      operator,
    );
    expect(result.sample.result).toBe('passed');
    expect(result.sessionReview.source).toBe('attachment_policy_mock');
    expect(result.abnormalReply).toBeUndefined();

    const repeated = createAttachmentPolicyMockSession(
      strategy,
      { scenario: 'success', dataVersion: strategy.dataVersion, idempotencyKey: key },
      operator,
    );
    expect('duplicate' in repeated && repeated.duplicate).toBe(true);
    expect(repeated.sessionReview.id).toBe(result.sessionReview.id);
  });

  it('sends a failed sample to both queues with the same strategy snapshot', () => {
    const strategy = attachmentStrategy();
    const result = createAttachmentPolicyMockSession(
      strategy,
      {
        scenario: 'recognition_failed',
        dataVersion: strategy.dataVersion,
        idempotencyKey: `attachment-failure-${Date.now()}`,
      },
      operator,
    );
    expect(result.sample.result).toBe('failed');
    expect(result.abnormalReply?.abnormalType).toBe('attachment_policy_failure');
    expect(result.abnormalReply?.linkedStrategyVersion).toBe(
      result.sessionReview.strategySnapshot.strategyVersion,
    );
    expect(result.sessionReview.abnormalItemId).toBe(result.abnormalReply?.id);
  });

  it('closes the generated abnormal item as a false positive when review marks normal', () => {
    const strategy = attachmentStrategy();
    const generated = createAttachmentPolicyMockSession(
      strategy,
      {
        scenario: 'size_exceeded',
        dataVersion: strategy.dataVersion,
        idempotencyKey: `attachment-false-positive-${Date.now()}`,
      },
      operator,
    );
    const session = getAiSessionReview(generated.sessionReview.id);
    if (!session) throw new Error('Missing generated session review');
    claimAiSessionReview(session, operator);
    const concluded = concludeAiSessionReview(
      session,
      {
        conclusion: 'normal',
        reviewNote: 'Mock 数据复核后确认为误报。',
        dataVersion: session.dataVersion,
      },
      operator,
    );
    expect(concluded.session?.conclusion).toBe('normal');
    const abnormal = getAiAbnormalReply(generated.abnormalReply?.id ?? '');
    expect(abnormal?.status).toBe('closed');
    expect(abnormal?.resolutionType).toBe('false_positive');
  });
});
