import { mockAuditLogs } from '../src/foundation/audit';
import { roleConfigs } from '../src/foundation/permissions';
import type { AdminRoleId } from '../src/foundation/permissions';

export const nowText = () => new Date().toLocaleString('zh-CN', { hour12: false });

export const auditLogs: API.AuditLogItem[] = [...mockAuditLogs];

const reqObjectIdFromSource = (action: string, sourcePage: string) => {
  if (action === 'login') return 'session-dev';
  return sourcePage.replace(/^\//, '') || 'system/accounts';
};

export const pushOperationAuditLog = (params: {
  roleId: AdminRoleId;
  logType?: API.AuditLogType;
  action: string;
  objectType?: string;
  objectId: string;
  objectSubtype?: string;
  sourcePage: string;
  reason: string;
  result: 'success' | 'denied' | 'failed';
  changeSummary: string;
  originalStatus?: string;
  newStatus?: string;
  version?: string;
}) => {
  const role = roleConfigs[params.roleId];
  auditLogs.unshift({
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    logType: params.logType ?? 'operation',
    operator: role.name,
    roleId: role.id,
    roleName: role.name,
    action: params.action,
    objectType: params.objectType ?? 'user',
    objectId: params.objectId,
    objectSubtype: params.objectSubtype,
    sourcePage: params.sourcePage,
    time: nowText(),
    reason: params.reason,
    result: params.result,
    changeSummary: params.changeSummary,
    originalStatus: params.originalStatus,
    newStatus: params.newStatus,
    version: params.version,
  });
};

export const pushAuditLog = (
  roleId: AdminRoleId,
  action: string,
  result: 'success' | 'denied' | 'failed',
  sourcePage: string,
  changeSummary: string,
) => {
  const role = roleConfigs[roleId];
  auditLogs.unshift({
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    operator: role.name,
    roleId: role.id,
    roleName: role.name,
    action,
    objectType: action === 'login' ? 'session' : 'system_permission',
    objectId: reqObjectIdFromSource(action, sourcePage),
    sourcePage,
    time: nowText(),
    reason: '开发环境 mock 操作',
    result,
    changeSummary,
  });
};
