import { describe, expect, it } from 'vitest';
import {
  canEditRevisionStrategy,
  getRevisionStrategy,
  precheckRevisionStrategy,
  runMockRevisionSubmission,
  saveRevisionStrategy,
} from '../../mock/writingRevisionStrategyStore';

const operator = {
  id: 'teaching_reviewer',
  name: '教研审核',
  roleId: 'teaching_reviewer' as const,
  roleName: '教研审核',
};

describe('writingRevisionStrategyStore', () => {
  it('keeps revision strategy edit ownership to teaching, AI and super admin', () => {
    expect(canEditRevisionStrategy('super_admin')).toBe(true);
    expect(canEditRevisionStrategy('teaching_reviewer')).toBe(true);
    expect(canEditRevisionStrategy('ai_operator')).toBe(true);
    expect(canEditRevisionStrategy('content_operator')).toBe(false);
    expect(canEditRevisionStrategy('data_analyst')).toBe(false);
  });

  it('requires published scoring and feedback template references', () => {
    const strategy = getRevisionStrategy('wt-revision-low-score-v1');
    expect(strategy).toBeTruthy();
    if (!strategy) throw new Error('seed strategy missing');
    const result = precheckRevisionStrategy({
      ...strategy,
      feedbackTemplateRef: {
        ...strategy.feedbackTemplateRef,
        templateId: 'missing-feedback-template',
      },
    });
    expect(result.level).toBe('error');
    expect(result.issues.some((item) => item.code === 'FEEDBACK_TEMPLATE_INVALID')).toBe(true);
  });

  it('saves a valid draft strategy and runs mock revision effects', () => {
    const result = saveRevisionStrategy({
      name: '单测二改策略',
      description: 'unit test',
      topicTypes: ['writing'],
      examTypes: ['CET4'],
      scoringTemplateId: 'wt-scoring-default',
      feedbackTemplateId: 'wt-feedback-default',
      triggerCondition: {
        scoreBelow: 40,
        issueTags: ['language_accuracy'],
        feedbackSectionKeys: ['issues'],
      },
      requirement: {
        focus: '修改语言错误。',
        minChangedWords: 20,
        mustAddressIssueTags: ['language_accuracy'],
        responseFormat: '说明修改点。',
        deadlineMinutes: 20,
      },
      promptMode: 'ai_guided',
      promptTemplate: '引导学生完成二次修改。',
      changeSummary: '单测创建。',
    }, operator);

    expect('strategy' in result).toBe(true);
    if (!('strategy' in result) || !result.strategy) throw new Error('strategy save failed');
    const strategy = result.strategy;
    strategy.status = 'published';
    strategy.releaseVersionId = `release-${strategy.id}-v1`;

    const mock = runMockRevisionSubmission({ strategyId: strategy.id, action: 'submit' });
    expect('record' in mock).toBe(true);
    if (!('record' in mock) || !mock.record || !mock.effect) throw new Error('mock revision failed');
    const record = mock.record;
    const effect = mock.effect;
    expect(record.triggerMatched).toBe(true);
    expect(record.status).toBe('revised');
    expect(effect.revisionRate).toBe(100);
    expect(effect.commonIssues[0].tag).toBe('language_accuracy');
  });
});
