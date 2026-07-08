import type { AdminRoleId } from '../src/foundation/permissions';

const { ANT_DESIGN_PRO_ONLY_DO_NOT_USE_IN_YOUR_PRODUCTION } = process.env;

type MockSessionState = {
  currentRoleId: AdminRoleId | '';
  currentAccountId: string;
  currentAccountName: string;
};

const globalSession = globalThis as typeof globalThis & {
  __GUOJI_ADMIN_MOCK_SESSION__?: MockSessionState;
};

if (!globalSession.__GUOJI_ADMIN_MOCK_SESSION__) {
  globalSession.__GUOJI_ADMIN_MOCK_SESSION__ = {
    currentRoleId:
      ANT_DESIGN_PRO_ONLY_DO_NOT_USE_IN_YOUR_PRODUCTION === 'site'
        ? 'super_admin'
        : '',
    currentAccountId: '',
    currentAccountName: '',
  };
}

export const mockSession = globalSession.__GUOJI_ADMIN_MOCK_SESSION__;

export const loginAliases: Record<string, AdminRoleId> = {
  admin: 'super_admin',
  user: 'content_operator',
  teaching_editor: 'teaching_reviewer',
  teaching_reviewer_2: 'teaching_reviewer',
};

export const setMockSession = (
  roleId: AdminRoleId,
  accountId: string,
  accountName: string,
) => {
  mockSession.currentRoleId = roleId;
  mockSession.currentAccountId = accountId;
  mockSession.currentAccountName = accountName;
};

export const clearMockSession = () => {
  mockSession.currentRoleId = '';
  mockSession.currentAccountId = '';
  mockSession.currentAccountName = '';
};
