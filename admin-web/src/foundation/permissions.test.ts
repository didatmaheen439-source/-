import { describe, expect, it } from 'vitest';

import { MOCK_LOGIN_PASSWORD, roleList } from './permissions';

describe('role login credentials', () => {
  it('uses one mock password for all official admin roles', () => {
    expect(roleList.map((role) => role.id)).toEqual([
      'super_admin',
      'content_operator',
      'teaching_reviewer',
      'ai_operator',
      'customer_support',
      'data_analyst',
      'read_only_auditor',
    ]);
    expect(roleList.every((role) => role.password === MOCK_LOGIN_PASSWORD)).toBe(
      true,
    );
    expect(MOCK_LOGIN_PASSWORD).toBe('123456789');
  });
});
