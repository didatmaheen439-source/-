import type {
  AdminModuleKey,
  PermissionAction,
} from '@/foundation/permissions';
import {
  roleCanAccessModule,
  roleCanPerformAction,
} from '@/foundation/permissions';

/**
 * @see https://umijs.org/docs/max/access#access
 * */
export default function access(
  initialState: { currentUser?: API.CurrentUser } | undefined,
) {
  const { currentUser } = initialState ?? {};
  const roleId = currentUser?.roleId ?? currentUser?.access;

  return {
    canAdmin: roleId === 'super_admin',
    canAccessDashboard: roleCanAccessModule(roleId, 'dashboard'),
    canAccessUsers: roleCanAccessModule(roleId, 'users'),
    canAccessContent: roleCanAccessModule(roleId, 'content'),
    canAccessLearningPath: roleCanAccessModule(roleId, 'learningPath'),
    canAccessAiCoach: roleCanAccessModule(roleId, 'aiCoach'),
    canAccessWritingTranslation: roleCanAccessModule(
      roleId,
      'writingTranslation',
    ),
    canAccessMockExam: roleCanAccessModule(roleId, 'mockExam'),
    canAccessAnalytics: roleCanAccessModule(roleId, 'analytics'),
    canAccessReviewRelease: roleCanAccessModule(roleId, 'reviewRelease'),
    canAccessSystem: roleCanAccessModule(roleId, 'system'),
    canAction: (moduleKey: AdminModuleKey, action: PermissionAction) =>
      roleCanPerformAction(roleId, moduleKey, action),
  };
}
