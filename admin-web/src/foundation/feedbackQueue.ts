export type FeedbackOwnerRole =
  | 'content_operator'
  | 'teaching_reviewer'
  | 'ai_operator';

export type FeedbackQueueView =
  | 'triage'
  | 'mine'
  | 'processing'
  | 'resolved'
  | 'closed';

export type FeedbackQueueStatusAction =
  | 'return_to_processing'
  | 'close_resolved'
  | 'mark_no_action'
  | 'close_no_action';

export type FeedbackAssignment = {
  id: string;
  feedbackId: string;
  targetRole: FeedbackOwnerRole;
  targetRoleName: string;
  assigneeAccountId: string;
  assigneeName: string;
  assignedByAccountId: string;
  assignedByName: string;
  reason: string;
  assignedAt: string;
  transferFromAccountId?: string;
  transferFromName?: string;
};

export type FeedbackResolution = {
  id: string;
  feedbackId: string;
  resultSummary: string;
  processNote: string;
  relatedObject?: string;
  submittedByAccountId: string;
  submittedByName: string;
  submittedAt: string;
};

export type FeedbackTimelineEvent = {
  id: string;
  type:
    | 'status'
    | 'assignment'
    | 'transfer'
    | 'resolution'
    | 'return'
    | 'close'
    | 'sensitive_access';
  title: string;
  description: string;
  operator: string;
  time: string;
};

export type FeedbackScopedUserContext = {
  nickname: string;
  examTarget: string;
  learningStatus: string;
  weakModules: string[];
  recentLearningSummary: string;
  aiSummaryPreview: string;
};

export type FeedbackQueueItem = {
  id: string;
  feedbackId: string;
  userId: string;
  userNickname: string;
  userMaskedContact: string;
  type: string;
  summary: string;
  priority: 'P0' | 'P1' | 'P2';
  status: API.UserFeedbackStatus;
  relatedModule: string;
  submittedAt: string;
  updatedAt: string;
  version: number;
  waitHours: number;
  waitText: string;
  overdue: boolean;
  currentAssignment?: FeedbackAssignment;
};

export type FeedbackQueueDetail = FeedbackQueueItem & {
  remark?: string;
  originalContentAvailable: boolean;
  scopedUserContext: FeedbackScopedUserContext;
  assignments: FeedbackAssignment[];
  resolutions: FeedbackResolution[];
  timeline: FeedbackTimelineEvent[];
  permissions: {
    canSensitiveAccess: boolean;
    canAssign: boolean;
    canSubmitResolution: boolean;
    canReturn: boolean;
    canClose: boolean;
    canMarkNoAction: boolean;
  };
};

export type FeedbackQueueQueryParams = {
  current?: number;
  pageSize?: number;
  view?: FeedbackQueueView;
  keyword?: string;
  type?: string;
  priority?: 'P0' | 'P1' | 'P2';
  relatedModule?: string;
  status?: API.UserFeedbackStatus;
  ownerAccountId?: string;
  overdue?: 'yes' | 'no';
  submittedAtRange?: string[];
};

export type FeedbackQueueAssignParams = {
  targetRole: FeedbackOwnerRole;
  assigneeAccountId: string;
  reason: string;
  version: number;
};

export type FeedbackQueueResolutionParams = {
  resultSummary: string;
  processNote: string;
  relatedObject?: string;
  version: number;
};

export type FeedbackQueueStatusParams = {
  action: FeedbackQueueStatusAction;
  reason?: string;
  version: number;
};

export const feedbackOwnerRoles: FeedbackOwnerRole[] = [
  'content_operator',
  'teaching_reviewer',
  'ai_operator',
];

export const feedbackOwnerRoleLabels: Record<FeedbackOwnerRole, string> = {
  content_operator: '内容运营',
  teaching_reviewer: '教研审核',
  ai_operator: 'AI 策略运营',
};

export const feedbackQueueRoleLabels: Record<string, string> = {
  super_admin: '超级管理员',
  customer_support: '客服',
  ...feedbackOwnerRoleLabels,
};

export const feedbackPriorityRank: Record<'P0' | 'P1' | 'P2', number> = {
  P0: 0,
  P1: 1,
  P2: 2,
};

export const roleCanAccessFeedbackQueue = (roleId?: string) =>
  Boolean(
    roleId &&
      (roleId === 'super_admin' ||
        roleId === 'customer_support' ||
        feedbackOwnerRoles.includes(roleId as FeedbackOwnerRole)),
  );

export const roleCanUseSupportFeedbackActions = (roleId?: string) =>
  roleId === 'super_admin' || roleId === 'customer_support';

export const isFeedbackOwnerRole = (
  roleId?: string,
): roleId is FeedbackOwnerRole =>
  Boolean(roleId && feedbackOwnerRoles.includes(roleId as FeedbackOwnerRole));

export const roleCanViewFeedbackQueueItem = (
  roleId: string | undefined,
  accountId: string | undefined,
  assignment?: Pick<FeedbackAssignment, 'assigneeAccountId'>,
) => {
  if (roleCanUseSupportFeedbackActions(roleId)) return true;
  if (!roleId || !accountId || !assignment) return false;
  return (
    isFeedbackOwnerRole(roleId) &&
    assignment.assigneeAccountId === accountId
  );
};

export const canSubmitFeedbackResolution = (
  roleId: string | undefined,
  accountId: string | undefined,
  assignment?: Pick<FeedbackAssignment, 'assigneeAccountId'>,
) =>
  roleCanViewFeedbackQueueItem(roleId, accountId, assignment) &&
  !roleCanUseSupportFeedbackActions(roleId);

export const feedbackStatusFromAction = (
  currentStatus: API.UserFeedbackStatus,
  action: FeedbackQueueStatusAction,
): API.UserFeedbackStatus | undefined => {
  if (action === 'return_to_processing' && currentStatus === 'resolved') {
    return 'processing';
  }
  if (action === 'close_resolved' && currentStatus === 'resolved') {
    return 'closed';
  }
  if (
    action === 'mark_no_action' &&
    (currentStatus === 'pending' || currentStatus === 'processing')
  ) {
    return 'no_action';
  }
  if (action === 'close_no_action' && currentStatus === 'no_action') {
    return 'closed';
  }
  return undefined;
};

export const validateFeedbackStatusAction = (params: {
  currentStatus: API.UserFeedbackStatus;
  action: FeedbackQueueStatusAction;
  reason?: string;
}) => {
  const nextStatus = feedbackStatusFromAction(
    params.currentStatus,
    params.action,
  );
  if (!nextStatus) {
    return { valid: false, message: '反馈状态流转不符合规则。' };
  }
  if (
    (params.action === 'return_to_processing' ||
      params.action === 'mark_no_action') &&
    !params.reason?.trim()
  ) {
    return { valid: false, message: '请填写原因。' };
  }
  return { valid: true, nextStatus };
};

export const feedbackWaitInfo = (
  status: API.UserFeedbackStatus,
  submittedAt: string,
  updatedAt: string,
  nowMs = Date.now(),
) => {
  const anchor = status === 'pending' ? submittedAt : updatedAt;
  const start = new Date(anchor).getTime();
  const waitHours = Number.isFinite(start)
    ? Math.max(0, Number(((nowMs - start) / 3_600_000).toFixed(1)))
    : 0;
  const waitText =
    waitHours < 1 ? `${Math.round(waitHours * 60)} 分钟` : `${waitHours.toFixed(1)} 小时`;
  const overdue =
    (status === 'pending' && waitHours > 24) ||
    (status === 'processing' && waitHours > 48);
  return { waitHours, waitText, overdue };
};

export const defaultFeedbackQueueView = (roleId?: string): FeedbackQueueView =>
  roleCanUseSupportFeedbackActions(roleId) ? 'triage' : 'mine';
