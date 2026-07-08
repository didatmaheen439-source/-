import type { ProColumns } from '@ant-design/pro-components';
import {
  PageContainer,
  ProForm,
  ProFormSelect,
  ProFormText,
  ProTable,
} from '@ant-design/pro-components';
import { useAccess, useLocation } from '@umijs/max';
import { Alert, Card, Empty, Result, Skeleton, Space, Typography } from 'antd';
import type React from 'react';
import PermissionButton from '@/components/PermissionButton';
import StatusTag from '@/components/StatusTag';
import { modulePlaceholderConfigs } from '@/foundation/module-placeholders';
import type {
  AdminModuleKey,
  PermissionAction,
} from '@/foundation/permissions';
import { getModuleConfig } from '@/foundation/permissions';

type BusinessModulePlaceholderProps = {
  routeKey: keyof typeof modulePlaceholderConfigs;
};

type PlaceholderRow = {
  id: string;
  item: string;
  status: React.ReactNode;
  owner: string;
  updatedAt: string;
};

const actionPriority: PermissionAction[] = [
  'create',
  'edit',
  'submit',
  'approve',
  'publish',
  'export',
  'disable',
  'config',
];

const BusinessModulePlaceholder: React.FC<BusinessModulePlaceholderProps> = ({
  routeKey,
}) => {
  const location = useLocation();
  const access = useAccess();
  const query = new URLSearchParams(location.search);
  const state = query.get('state');
  const config = modulePlaceholderConfigs[routeKey];
  const moduleConfig = getModuleConfig(config.moduleKey);

  if (state === 'forbidden') {
    return (
      <PageContainer title={config.title}>
        <Result
          status="403"
          title="403"
          subTitle="当前角色没有访问该模块的权限。"
        />
      </PageContainer>
    );
  }

  if (state === 'error') {
    return (
      <PageContainer title={config.title}>
        <Result
          status="500"
          title="模块加载失败"
          subTitle="这是公共错误状态占位，后续接入真实接口后复用。"
        />
      </PageContainer>
    );
  }

  if (state === 'loading') {
    return (
      <PageContainer title={config.title}>
        <Card>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      </PageContainer>
    );
  }

  const canRead = (
    access as {
      canAction?: (
        moduleKey: AdminModuleKey,
        action: PermissionAction,
      ) => boolean;
    }
  ).canAction?.(config.moduleKey, 'read');

  if (!canRead) {
    return (
      <PageContainer title={config.title}>
        <Result
          status="403"
          title="403"
          subTitle="当前角色没有该页面的查看权限。"
        />
      </PageContainer>
    );
  }

  const columns: ProColumns<PlaceholderRow>[] = [
    {
      title: config.columns[0],
      dataIndex: 'item',
    },
    {
      title: config.columns[1],
      dataIndex: 'status',
      width: 140,
    },
    {
      title: config.columns[2],
      dataIndex: 'owner',
      width: 160,
    },
    {
      title: config.columns[3],
      dataIndex: 'updatedAt',
      valueType: 'dateTime',
      width: 180,
    },
  ];

  const dataSource: PlaceholderRow[] = [
    {
      id: `${String(routeKey)}-row-1`,
      item: config.tableTitle,
      status: <StatusTag domain="reviewPublish" value="pending_review" />,
      owner: '系统占位',
      updatedAt: '2026-07-07 10:00:00',
    },
  ];

  return (
    <PageContainer
      title={config.title}
      content={config.description}
      extra={actionPriority
        .filter((action) => config.primaryActions.includes(action))
        .map((action) => (
          <PermissionButton
            key={action}
            moduleKey={config.moduleKey}
            action={action}
            type={
              action === 'create' || action === 'publish'
                ? 'primary'
                : 'default'
            }
          />
        ))}
    >
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Alert
          showIcon
          type="info"
          title={`${moduleConfig?.name ?? config.title}基础骨架已接入`}
          description="本页使用统一页面模板、权限按钮、状态标签和公共空态。后续按 PRD 接入真实列表、筛选、详情、弹窗和审核流。"
        />

        <Card title="模块信息" size="small">
          <Space orientation="vertical" size={12}>
            <Typography.Text>{moduleConfig?.description}</Typography.Text>
            <Space wrap>
              <StatusTag domain="account" value="enabled" />
              <StatusTag domain="account" value="disabled" />
              <StatusTag domain="reviewPublish" value="pending_review" />
              <StatusTag domain="reviewPublish" value="published" />
              <StatusTag domain="systemHealth" value="exception" />
            </Space>
          </Space>
        </Card>

        <Card title="筛选区占位" size="small">
          <ProForm
            submitter={false}
            layout="inline"
            disabled
            initialValues={{ status: 'all' }}
          >
            <ProFormText
              name="keyword"
              label="关键词"
              placeholder="标题 / ID / 负责人"
            />
            <ProFormSelect
              name="status"
              label="状态"
              width="sm"
              options={[
                { label: '全部', value: 'all' },
                { label: '待审核', value: 'pending_review' },
                { label: '已发布', value: 'published' },
              ]}
            />
          </ProForm>
        </Card>

        <ProTable<PlaceholderRow>
          rowKey="id"
          search={false}
          options={false}
          pagination={{ pageSize: 10 }}
          columns={columns}
          dataSource={dataSource}
          headerTitle={config.tableTitle}
          toolBarRender={() =>
            config.primaryActions.map((action) => (
              <PermissionButton
                key={action}
                moduleKey={config.moduleKey}
                action={action}
                size="small"
              />
            ))
          }
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="功能建设中"
              />
            ),
          }}
        />
      </Space>
    </PageContainer>
  );
};

export default BusinessModulePlaceholder;
