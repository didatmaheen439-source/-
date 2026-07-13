import { describe, expect, it } from 'vitest';
import access from './access';

describe('access', () => {
  it('should return canAdmin true for super_admin role', () => {
    const initialState = {
      currentUser: {
        userid: '1',
        name: 'Admin User',
        avatar: 'https://example.com/avatar.png',
        roleId: 'super_admin',
      },
    };

    const result = access(initialState);

    expect(result.canAdmin).toBe(true);
    expect(result.canAccessSystem).toBe(true);
    expect(result.canAction('system', 'config')).toBe(true);
  });

  it('should return role-scoped access for content_operator role', () => {
    const initialState = {
      currentUser: {
        userid: '2',
        name: 'Regular User',
        avatar: 'https://example.com/avatar.png',
        roleId: 'content_operator',
      },
    };

    const result = access(initialState);

    expect(result.canAdmin).toBe(false);
    expect(result.canAccessContent).toBe(true);
    expect(result.canAccessSystem).toBe(false);
    expect(result.canAccessAiAbnormalReplies).toBe(false);
    expect(result.canAction('content', 'submit')).toBe(true);
    expect(result.canAction('reviewRelease', 'approve')).toBe(false);
  });

  it('should restrict abnormal reply handling to ai operators and super admins', () => {
    expect(
      access({ currentUser: { roleId: 'ai_operator' } }).canAccessAiAbnormalReplies,
    ).toBe(true);
    expect(
      access({ currentUser: { roleId: 'super_admin' } }).canAccessAiAbnormalReplies,
    ).toBe(true);
    expect(
      access({ currentUser: { roleId: 'read_only_auditor' } }).canAccessAiAbnormalReplies,
    ).toBe(false);
  });

  it('separates scoring and feedback template ownership', () => {
    const teaching = access({ currentUser: { roleId: 'teaching_reviewer' } });
    const ai = access({ currentUser: { roleId: 'ai_operator' } });
    expect(teaching.canManageScoringTemplates).toBe(true);
    expect(teaching.canManageFeedbackTemplates).toBe(false);
    expect(teaching.canBindWritingTranslationTemplates).toBe(true);
    expect(ai.canManageScoringTemplates).toBe(false);
    expect(ai.canManageFeedbackTemplates).toBe(true);
    expect(ai.canBindWritingTranslationTemplates).toBe(false);
  });

  it('allows teaching and AI operators to manage revision strategies', () => {
    expect(
      access({ currentUser: { roleId: 'teaching_reviewer' } }).canManageWritingRevisionStrategies,
    ).toBe(true);
    expect(
      access({ currentUser: { roleId: 'ai_operator' } }).canManageWritingRevisionStrategies,
    ).toBe(true);
    expect(
      access({ currentUser: { roleId: 'data_analyst' } }).canAccessWritingTranslation,
    ).toBe(true);
    expect(
      access({ currentUser: { roleId: 'data_analyst' } }).canManageWritingRevisionStrategies,
    ).toBe(false);
  });

  it('should return canAdmin false when user access is undefined', () => {
    const initialState = {
      currentUser: {
        userid: '3',
        name: 'Guest User',
        avatar: 'https://example.com/avatar.png',
      },
    };

    const result = access(initialState);

    expect(result.canAdmin).toBe(false);
  });

  it('should fall back to access when roleId is absent', () => {
    const initialState = {
      currentUser: {
        userid: '4',
        name: 'Support User',
        avatar: 'https://example.com/avatar.png',
        access: 'customer_support',
      },
    };

    const result = access(initialState);

    expect(result.canAdmin).toBe(false);
    expect(result.canAccessUsers).toBe(true);
    expect(result.canAccessUserList).toBe(true);
    expect(result.canAccessFeedbackQueue).toBe(true);
    expect(result.canAccessContent).toBe(false);
  });

  it('allows business owners to access feedback queue without user list', () => {
    const initialState = {
      currentUser: {
        userid: '5',
        name: 'AI Operator',
        avatar: 'https://example.com/avatar.png',
        roleId: 'ai_operator',
      },
    };

    const result = access(initialState);

    expect(result.canAccessUsers).toBe(true);
    expect(result.canAccessFeedbackQueue).toBe(true);
    expect(result.canAccessUserList).toBe(false);
    expect(result.canAccessUserDetail).toBe(false);
  });

  it('should return canAdmin false when currentUser is undefined', () => {
    const initialState = {
      currentUser: undefined,
    };

    const result = access(initialState);

    expect(result.canAdmin).toBeFalsy();
  });

  it('should return canAdmin false when initialState is undefined', () => {
    const result = access(undefined);

    expect(result.canAdmin).toBeFalsy();
  });
});
