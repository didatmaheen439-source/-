import type { AdminRoleId, PermissionAction } from './permissions';

export type AuditObjectType =
  | 'session'
  | 'user'
  | 'content'
  | 'analytics'
  | 'dashboard'
  | 'learning_path_config'
  | 'ai_strategy'
  | 'review_release'
  | 'system_permission';

export type AuditResult = 'success' | 'denied' | 'failed';
export type AuditLogType =
  | 'operation'
  | 'sensitive_access'
  | 'permission_denied';

export type AuditLogItem = {
  id: string;
  logType?: AuditLogType;
  operator: string;
  roleId: AdminRoleId;
  roleName: string;
  action:
    | PermissionAction
    | 'login'
    | 'restricted_access'
    | 'permission_change';
  objectType: AuditObjectType;
  objectId: string;
  objectSubtype?: string;
  sourcePage: string;
  time: string;
  reason: string;
  result: AuditResult;
  changeSummary: string;
  originalStatus?: string;
  newStatus?: string;
  version?: string;
};

export const mockAuditLogs: AuditLogItem[] = [
  {
    id: 'audit-login-super-admin',
    logType: 'operation',
    operator: '超级管理员',
    roleId: 'super_admin',
    roleName: '超级管理员',
    action: 'login',
    objectType: 'session',
    objectId: 'session-dev',
    sourcePage: '/user/login',
    time: '2026-07-07 09:20:00',
    reason: '开发环境账号登录',
    result: 'success',
    changeSummary: '登录成功，载入全部菜单权限。',
  },
  {
    id: 'audit-restricted-system',
    logType: 'permission_denied',
    operator: '内容运营',
    roleId: 'content_operator',
    roleName: '内容运营',
    action: 'restricted_access',
    objectType: 'system_permission',
    objectId: 'system/accounts',
    sourcePage: '/system/accounts',
    time: '2026-07-07 09:32:00',
    reason: '角色无系统设置菜单权限',
    result: 'denied',
    changeSummary: '拦截系统账号管理直接访问。',
  },
  {
    id: 'audit-content-submit',
    logType: 'operation',
    operator: '内容运营',
    roleId: 'content_operator',
    roleName: '内容运营',
    action: 'submit',
    objectType: 'content',
    objectId: 'question-group-cet6-001',
    sourcePage: '/content/questions',
    time: '2026-07-07 10:00:00',
    reason: '题组完成初稿',
    result: 'success',
    changeSummary: '状态由草稿变更为待审核。',
  },
  {
    id: 'audit-review-publish',
    logType: 'operation',
    operator: '教研审核',
    roleId: 'teaching_reviewer',
    roleName: '教研审核',
    action: 'publish',
    objectType: 'review_release',
    objectId: 'release-20260707-001',
    sourcePage: '/review-release/pending',
    time: '2026-07-07 11:12:00',
    reason: '审核通过并进入计划发布',
    result: 'success',
    changeSummary: '内容版本发布到模拟环境。',
  },
  {
    id: 'audit-disable-user',
    logType: 'operation',
    operator: '客服',
    roleId: 'customer_support',
    roleName: '客服',
    action: 'disable',
    objectType: 'user',
    objectId: 'user-risk-001',
    sourcePage: '/users/list',
    time: '2026-07-07 13:25:00',
    reason: '异常登录触发人工处理',
    result: 'success',
    changeSummary: '账号状态由启用变更为停用。',
  },
  {
    id: 'audit-permission-change',
    logType: 'operation',
    operator: '超级管理员',
    roleId: 'super_admin',
    roleName: '超级管理员',
    action: 'permission_change',
    objectType: 'system_permission',
    objectId: 'role-data-analyst',
    sourcePage: '/system/accounts',
    time: '2026-07-07 15:40:00',
    reason: '补充运营数据导出权限',
    result: 'success',
    changeSummary: '为数据分析角色增加 analytics.export 动作权限。',
  },
];
