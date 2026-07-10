import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useLocation } from '@umijs/max';
import {
  App,
  Button,
  Card,
  Popconfirm,
  Space,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type React from 'react';
import { useRef } from 'react';
import PermissionButton from '@/components/PermissionButton';
import StatusTag from '@/components/StatusTag';
import {
  actionLabels,
  adminModules,
  dataScopeLabels,
  permissionActions,
} from '@/foundation/permissions';
import {
  adminAccounts,
  adminAuditLogs,
  adminRoles,
  updateAdminAccountStatus,
} from '@/services/ant-design-pro/api';

const accountStatusText: Record<API.AdminAccountStatus, string> = {
  enabled: '启用',
  disabled: '停用',
  locked: '锁定',
};

const resultColorMap: Record<API.AuditLogItem['result'], string> = {
  success: 'success',
  denied: 'error',
  failed: 'warning',
};

const resultTextMap: Record<API.AuditLogItem['result'], string> = {
  success: '成功',
  denied: '拒绝',
  failed: '失败',
};

const logTypeTextMap: Record<
  NonNullable<API.AuditLogItem['logType']>,
  string
> = {
  operation: '普通操作',
  sensitive_access: '敏感访问',
  permission_denied: '权限拒绝',
};

const getActiveTabFromPath = (pathname: string) => {
  if (pathname === '/system/roles') return 'roles';
  if (pathname === '/system/operation-logs') return 'operationLogs';
  if (pathname === '/system/sensitive-access-logs') return 'sensitiveAccessLogs';
  return 'accounts';
};

const tabPathMap: Record<string, string> = {
  accounts: '/system/accounts',
  roles: '/system/roles',
  operationLogs: '/system/operation-logs',
  sensitiveAccessLogs: '/system/sensitive-access-logs',
};

const renderDataScopes = (dataScopes?: string[]) => (
  <Space wrap size={[4, 4]}>
    {(dataScopes ?? []).map((scope) => (
      <Tag key={scope}>
        {dataScopeLabels[scope as keyof typeof dataScopeLabels] ?? scope}
      </Tag>
    ))}
  </Space>
);

const renderActionTags = (actions?: string[]) => (
  <Space wrap size={[4, 4]}>
    {(actions ?? []).map((action) => (
      <Tag key={action} color="blue">
        {actionLabels[action as keyof typeof actionLabels] ?? action}
      </Tag>
    ))}
  </Space>
);

const AccountsPage: React.FC = () => {
  const { message } = App.useApp();
  const location = useLocation();
  const accountTableRef = useRef<ActionType | undefined>(undefined);
  const auditTableRef = useRef<ActionType | undefined>(undefined);
  const activeTab = getActiveTabFromPath(location.pathname);

  const handleStatusChange = async (
    account: API.AdminAccount,
    status: API.AdminAccountStatus,
  ) => {
    await updateAdminAccountStatus(account.id, {
      status,
      reason: `在账号列表中将 ${account.username} 调整为${accountStatusText[status]}`,
    });
    message.success(`账号已${accountStatusText[status]}`);
    accountTableRef.current?.reload();
    auditTableRef.current?.reload();
  };

  const accountColumns: ProColumns<API.AdminAccount>[] = [
    {
      title: '账号',
      dataIndex: 'username',
      copyable: true,
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Typography.Text strong>{record.username}</Typography.Text>
          <Typography.Text type="secondary">
            {record.displayName}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '角色',
      dataIndex: 'roleName',
      width: 140,
      render: (_, record) => <Tag color="geekblue">{record.roleName}</Tag>,
    },
    {
      title: '账号状态',
      dataIndex: 'status',
      width: 120,
      valueEnum: {
        enabled: { text: '启用' },
        disabled: { text: '停用' },
        locked: { text: '锁定' },
      },
      render: (_, record) => (
        <StatusTag domain="account" value={record.status} />
      ),
    },
    {
      title: '数据范围',
      dataIndex: 'dataScopes',
      search: false,
      render: (_, record) => renderDataScopes(record.dataScopes),
    },
    {
      title: '最近登录',
      dataIndex: 'lastLoginAt',
      valueType: 'dateTime',
      width: 180,
      search: false,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      width: 180,
      search: false,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 220,
      fixed: 'right',
      render: (_, record) => {
        const nextStatus = record.status === 'enabled' ? 'disabled' : 'enabled';
        const statusActionText = nextStatus === 'enabled' ? '启用' : '停用';

        return (
          <Space size={8}>
            <PermissionButton
              moduleKey="system"
              action="edit"
              type="link"
              size="small"
              onClick={() => message.info('编辑权限将在接入后端后启用')}
            >
              编辑权限
            </PermissionButton>
            <Popconfirm
              title={`确认${statusActionText}该账号？`}
              description={`账号 ${record.username} 将变更为${accountStatusText[nextStatus]}状态。`}
              okText={statusActionText}
              cancelText="取消"
              onConfirm={() => handleStatusChange(record, nextStatus)}
            >
              <PermissionButton
                moduleKey="system"
                action="disable"
                type="link"
                size="small"
                danger={nextStatus === 'disabled'}
              >
                {statusActionText}
              </PermissionButton>
            </Popconfirm>
            <PermissionButton
              moduleKey="system"
              action="config"
              type="link"
              size="small"
              onClick={() => message.info('配置入口将在第二阶段细化')}
            >
              配置
            </PermissionButton>
          </Space>
        );
      },
    },
  ];

  const roleColumns: ProColumns<API.AdminRole>[] = [
    {
      title: '角色',
      dataIndex: 'name',
      fixed: 'left',
      width: 180,
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Typography.Text strong>{record.name}</Typography.Text>
          <Typography.Text type="secondary">{record.id}</Typography.Text>
        </Space>
      ),
    },
    {
      title: '数据范围',
      dataIndex: 'dataScopes',
      width: 220,
      render: (_, record) => renderDataScopes(record.dataScopes),
    },
    ...adminModules.map<ProColumns<API.AdminRole>>((moduleConfig) => ({
      title: moduleConfig.name,
      dataIndex: moduleConfig.key,
      width: 220,
      search: false,
      render: (_, record) => {
        const canAccess = record.modules.includes(moduleConfig.key);
        const actions = record.actions[moduleConfig.key] ?? [];
        if (!canAccess) {
          return <Typography.Text type="secondary">无权限</Typography.Text>;
        }
        return (
          <Tooltip title={moduleConfig.description}>
            <Space orientation="vertical" size={4}>
              <Tag color="success">菜单可见</Tag>
              {renderActionTags(actions)}
            </Space>
          </Tooltip>
        );
      },
    })),
  ];

  const auditColumns: ProColumns<API.AuditLogItem>[] = [
    {
      title: '操作时间',
      dataIndex: 'time',
      valueType: 'dateTime',
      width: 180,
    },
    {
      title: '日志类型',
      dataIndex: 'logType',
      width: 120,
      valueEnum: {
        operation: { text: '普通操作' },
        sensitive_access: { text: '敏感访问' },
        permission_denied: { text: '权限拒绝' },
      },
      render: (_, record) => (
        <Tag
          color={
            record.logType === 'sensitive_access'
              ? 'gold'
              : record.logType === 'permission_denied'
                ? 'red'
                : 'blue'
          }
        >
          {record.logType ? logTypeTextMap[record.logType] : '普通操作'}
        </Tag>
      ),
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      width: 140,
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Typography.Text>{record.operator}</Typography.Text>
          <Typography.Text type="secondary">{record.roleName}</Typography.Text>
        </Space>
      ),
    },
    {
      title: '动作',
      dataIndex: 'action',
      width: 140,
      render: (_, record) => (
        <Tag>
          {actionLabels[record.action as keyof typeof actionLabels] ??
            record.action}
        </Tag>
      ),
    },
    {
      title: '对象',
      dataIndex: 'objectId',
      width: 220,
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Typography.Text>{record.objectId}</Typography.Text>
          <Typography.Text type="secondary">
            {record.objectType}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '对象类型',
      dataIndex: 'objectType',
      hideInTable: true,
      valueEnum: {
        session: { text: '会话' },
        user: { text: '用户' },
        content: { text: '内容' },
        ai_coach_strategy: { text: 'AI 陪练策略' },
        review_release: { text: '审核发布' },
        system_permission: { text: '系统权限' },
      },
    },
    {
      title: '来源页面',
      dataIndex: 'sourcePage',
      width: 180,
      copyable: true,
    },
    {
      title: '结果',
      dataIndex: 'result',
      width: 100,
      render: (_, record) => (
        <Tag color={resultColorMap[record.result]}>
          {resultTextMap[record.result]}
        </Tag>
      ),
    },
    {
      title: '原因',
      dataIndex: 'reason',
      ellipsis: true,
      search: false,
    },
    {
      title: '变更摘要',
      dataIndex: 'changeSummary',
      ellipsis: true,
      search: false,
    },
  ];

  const renderAuditTable = (logType: API.AuditLogType) => (
    <ProTable<API.AuditLogItem>
      actionRef={auditTableRef}
      rowKey="id"
      columns={auditColumns}
      request={async (params) => {
        const result = await adminAuditLogs({
          params: {
            logType: params.logType || logType,
            objectType: params.objectType,
          },
        });
        return {
          data: result.data ?? [],
          success: result.success,
          total: result.total,
        };
      }}
      pagination={{ pageSize: 20 }}
      scroll={{ x: 1300 }}
      search={{
        labelWidth: 80,
      }}
      toolBarRender={() => [
        <Button key="refresh" onClick={() => auditTableRef.current?.reload()}>
          刷新
        </Button>,
      ]}
    />
  );

  return (
    <PageContainer
      title="账号与角色"
      content="管理后台账号、角色权限矩阵和权限相关审计日志。本阶段使用 mock 数据验证权限闭环。"
      extra={[
        <PermissionButton
          key="create"
          moduleKey="system"
          action="create"
          type="primary"
          onClick={() => message.info('新建账号将在接入后端后启用')}
        >
          新建账号
        </PermissionButton>,
        <PermissionButton
          key="config"
          moduleKey="system"
          action="config"
          onClick={() => message.info('系统配置将在第二阶段细化')}
        >
          配置
        </PermissionButton>,
      ]}
    >
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => history.push(tabPathMap[key] ?? '/system/accounts')}
          items={[
            {
              key: 'accounts',
              label: '账号列表',
              children: (
                <ProTable<API.AdminAccount>
                  actionRef={accountTableRef}
                  rowKey="id"
                  columns={accountColumns}
                  request={async () => {
                    const result = await adminAccounts();
                    return {
                      data: result.data ?? [],
                      success: result.success,
                      total: result.total,
                    };
                  }}
                  pagination={{ pageSize: 20 }}
                  scroll={{ x: 1100 }}
                  search={{
                    labelWidth: 80,
                  }}
                  toolBarRender={() => [
                    <Button
                      key="refresh"
                      onClick={() => accountTableRef.current?.reload()}
                    >
                      刷新
                    </Button>,
                  ]}
                />
              ),
            },
            {
              key: 'roles',
              label: '角色权限矩阵',
              children: (
                <ProTable<API.AdminRole>
                  rowKey="id"
                  columns={roleColumns}
                  request={async () => {
                    const result = await adminRoles();
                    return {
                      data: result.data ?? [],
                      success: result.success,
                      total: result.total,
                    };
                  }}
                  search={false}
                  options={false}
                  pagination={false}
                  scroll={{ x: 2600 }}
                  headerTitle={`7 类角色 / ${adminModules.length} 个模块 / ${permissionActions.length} 类动作权限`}
                />
              ),
            },
            {
              key: 'operationLogs',
              label: '操作日志',
              children: renderAuditTable('operation'),
            },
            {
              key: 'sensitiveAccessLogs',
              label: '敏感访问日志',
              children: renderAuditTable('sensitive_access'),
            },
          ]}
        />
      </Card>
    </PageContainer>
  );
};

export default AccountsPage;
