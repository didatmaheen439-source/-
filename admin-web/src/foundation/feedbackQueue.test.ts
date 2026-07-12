import { describe, expect, it } from 'vitest';
import {
  canSubmitFeedbackResolution,
  feedbackStatusFromAction,
  roleCanAccessFeedbackQueue,
  roleCanUseSupportFeedbackActions,
  roleCanViewFeedbackQueueItem,
  validateFeedbackStatusAction,
} from './feedbackQueue';

describe('feedback work queue rules', () => {
  it('keeps feedback queue access separate from full user permissions', () => {
    expect(roleCanAccessFeedbackQueue('customer_support')).toBe(true);
    expect(roleCanAccessFeedbackQueue('ai_operator')).toBe(true);
    expect(roleCanAccessFeedbackQueue('content_operator')).toBe(true);
    expect(roleCanAccessFeedbackQueue('data_analyst')).toBe(false);
    expect(roleCanUseSupportFeedbackActions('ai_operator')).toBe(false);
    expect(roleCanUseSupportFeedbackActions('customer_support')).toBe(true);
  });

  it('limits business owners to assigned feedback items', () => {
    const assignment = { assigneeAccountId: 'ai_operator' };

    expect(
      roleCanViewFeedbackQueueItem('ai_operator', 'ai_operator', assignment),
    ).toBe(true);
    expect(
      roleCanViewFeedbackQueueItem(
        'content_operator',
        'content_operator',
        assignment,
      ),
    ).toBe(false);
    expect(
      roleCanViewFeedbackQueueItem('customer_support', 'customer_support'),
    ).toBe(true);
  });

  it('allows only assigned business owner to submit a resolution', () => {
    const assignment = { assigneeAccountId: 'teaching_reviewer' };

    expect(
      canSubmitFeedbackResolution(
        'teaching_reviewer',
        'teaching_reviewer',
        assignment,
      ),
    ).toBe(true);
    expect(
      canSubmitFeedbackResolution('customer_support', 'customer_support'),
    ).toBe(false);
  });

  it('validates support status actions and required reasons', () => {
    expect(feedbackStatusFromAction('resolved', 'close_resolved')).toBe(
      'closed',
    );
    expect(feedbackStatusFromAction('resolved', 'return_to_processing')).toBe(
      'processing',
    );
    expect(feedbackStatusFromAction('pending', 'mark_no_action')).toBe(
      'no_action',
    );
    expect(
      validateFeedbackStatusAction({
        currentStatus: 'resolved',
        action: 'return_to_processing',
      }).valid,
    ).toBe(false);
    expect(
      validateFeedbackStatusAction({
        currentStatus: 'resolved',
        action: 'return_to_processing',
        reason: '需要补充处理说明',
      }).nextStatus,
    ).toBe('processing');
    expect(
      validateFeedbackStatusAction({
        currentStatus: 'closed',
        action: 'mark_no_action',
        reason: '重复反馈',
      }).valid,
    ).toBe(false);
  });
});
