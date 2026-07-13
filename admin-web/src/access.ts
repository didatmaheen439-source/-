import type {
  AdminModuleKey,
  PermissionAction,
} from '@/foundation/permissions';
import {
  roleCanAccessFeedbackQueue,
  roleCanAccessModule,
  roleCanAccessUserArea,
  roleCanAccessUserDetail,
  roleCanAccessUserList,
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
    canAccessUsers: roleCanAccessUserArea(roleId),
    canAccessUserList: roleCanAccessUserList(roleId),
    canAccessUserDetail: roleCanAccessUserDetail(roleId),
    canAccessFeedbackQueue: roleCanAccessFeedbackQueue(roleId),
    canAccessContent: roleCanAccessModule(roleId, 'content'),
    canAccessLearningPath: roleCanAccessModule(roleId, 'learningPath'),
    canAccessAiCoach: roleCanAccessModule(roleId, 'aiCoach'),
    canAccessAiAbnormalReplies:
      roleId === 'super_admin' || roleId === 'ai_operator',
    canAccessWritingTranslation: roleCanAccessModule(
      roleId,
      'writingTranslation',
    ),
    canManageScoringTemplates:
      roleId === 'super_admin' || roleId === 'teaching_reviewer',
    canManageFeedbackTemplates:
      roleId === 'super_admin' || roleId === 'ai_operator',
    canBindWritingTranslationTemplates:
      roleId === 'super_admin' || roleId === 'teaching_reviewer',
    canAccessMockExam: roleCanAccessModule(roleId, 'mockExam'),
    canAccessAnalytics: roleCanAccessModule(roleId, 'analytics'),
    canAccessReviewRelease: roleCanAccessModule(roleId, 'reviewRelease'),
    canAccessSystem: roleCanAccessModule(roleId, 'system'),
    canAction: (moduleKey: AdminModuleKey, action: PermissionAction) =>
      roleCanPerformAction(roleId, moduleKey, action),
  };
}
