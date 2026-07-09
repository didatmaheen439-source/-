import {
  EyeOutlined,
  FileSearchOutlined,
  MessageOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useModel, useSearchParams } from '@umijs/max';
import { Button, Empty, Result, Space, Tag, Typography } from 'antd';
import type React from 'react';
import { useRef } from 'react';
import { operationUsers } from '@/services/ant-design-pro/api';
import {
  diagnosisStatusOptions,
  examTypeOptions,
  feedbackStatusOptions,
  getOptionLabel,
  onboardingStatusOptions,
  taskStatusOptions,
  toValueEnum,
} from '../constants';

const roleCanOpenUserDetail = (roleId?: string) =>
  roleId === 'super_admin' || roleId === 'customer_support';

const UserListPage: React.FC = () => {
  const tableRef = useRef<ActionType | undefined>(undefined);
  const [searchParams] = useSearchParams();
  const { initialState } = useModel('@@initialState');
  const roleId = initialState?.currentUser?.roleId;

  if (searchParams.get('state') === 'forbidden') {
    return (
      <Result status="403" title="403" subTitle="当前账号无用户管理权限。" />
    );
  }

  if (searchParams.get('state') === 'error') {
    return (
      <Result
        status="500"
        title="用户列表加载失败"
        subTitle="请稍后重试，或检查 mock 服务是否正常。"
        extra={<Button onClick={() => tableRef.current?.reload()}>重试</Button>}
      />
    );
  }

  const canOpenDetail = roleCanOpenUserDetail(roleId);

  const columns: ProColumns<API.AdminUser>[] = [
    {
      title: '关键词',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: {
        placeholder: '用户 ID、昵称、手机号或邮箱',
      },
    },
    {
      title: '用户 ID',
      dataIndex: 'id',
      width: 150,
      fixed: 'left',
      search: false,
      copyable: true,
    },
    {
      title: '用户信息',
      dataIndex: 'nickname',
      width: 220,
      search: false,
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Typography.Text strong>{record.nickname}</Typography.Text>
          <Typography.Text type="secondary">
            {record.phoneMasked}
          </Typography.Text>
          <Typography.Text type="secondary">
            {record.emailMasked}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '考试类型',
      dataIndex: 'examType',
      valueEnum: toValueEnum(examTypeOptions),
      width: 96,
      renderText: (_, record) =>
        getOptionLabel(examTypeOptions, record.examProfile.examType),
    },
    {
      title: '目标分',
      dataIndex: ['examProfile', 'targetScore'],
      search: false,
      width: 90,
      renderText: (_, record) => record.examProfile.targetScore,
    },
    {
      title: 'Onboarding',
      dataIndex: 'onboardingStatus',
      valueEnum: toValueEnum(onboardingStatusOptions),
      width: 120,
      renderText: (_, record) =>
        getOptionLabel(
          onboardingStatusOptions,
          record.learningStatus.onboardingStatus,
        ),
    },
    {
      title: '诊断状态',
      dataIndex: 'diagnosisStatus',
      valueEnum: toValueEnum(diagnosisStatusOptions),
      width: 110,
      renderText: (_, record) =>
        getOptionLabel(
          diagnosisStatusOptions,
          record.learningStatus.diagnosisStatus,
        ),
    },
    {
      title: '今日任务',
      dataIndex: 'todayTaskStatus',
      valueEnum: toValueEnum(taskStatusOptions),
      width: 110,
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Typography.Text>
            {getOptionLabel(
              taskStatusOptions,
              record.learningStatus.todayTaskStatus,
            )}
          </Typography.Text>
          <Typography.Text type="secondary">
            {record.learningStatus.todayTaskProgress}%
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '反馈状态',
      dataIndex: 'feedbackStatus',
      hideInTable: true,
      valueEnum: toValueEnum(feedbackStatusOptions),
    },
    {
      title: '最近活跃',
      dataIndex: 'lastActiveAt',
      valueType: 'dateTime',
      sorter: true,
      defaultSortOrder: 'descend',
      width: 170,
      search: false,
    },
    {
      title: '最近活跃时间',
      dataIndex: 'lastActiveRange',
      valueType: 'dateTimeRange',
      hideInTable: true,
      search: {
        transform: (value) => ({ lastActiveRange: value }),
      },
    },
    {
      title: '未处理反馈',
      dataIndex: 'unhandledFeedbackCount',
      search: false,
      width: 110,
      render: (_, record) =>
        record.unhandledFeedbackCount > 0 ? (
          <Tag color="warning">{record.unhandledFeedbackCount}</Tag>
        ) : (
          <Typography.Text type="secondary">0</Typography.Text>
        ),
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      width: canOpenDetail ? 230 : 120,
      render: (_, record) => {
        if (!canOpenDetail) {
          return <Typography.Text type="secondary">仅脱敏列表</Typography.Text>;
        }
        return (
          <Space size={0}>
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => history.push(`/users/${record.id}`)}
            >
              查看详情
            </Button>
            <Button
              type="link"
              size="small"
              icon={<FileSearchOutlined />}
              onClick={() => history.push(`/users/${record.id}?tab=learning`)}
            >
              学习记录
            </Button>
            <Button
              type="link"
              size="small"
              icon={<MessageOutlined />}
              onClick={() => history.push(`/users/${record.id}?tab=feedback`)}
            >
              反馈
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <PageContainer
      title="用户管理"
      content="查询用户学习状态、反馈记录和必要的 AI 陪练摘要，用于客服问题排查。"
    >
      <ProTable<API.AdminUser>
        actionRef={tableRef}
        rowKey="id"
        columns={columns}
        cardBordered
        scroll={{ x: 1500 }}
        search={{
          labelWidth: 110,
          span: 6,
          defaultCollapsed: false,
        }}
        pagination={{
          defaultPageSize: 20,
          pageSizeOptions: [20, 50, 100],
          showSizeChanger: true,
        }}
        options={{
          fullScreen: true,
          reload: true,
          density: true,
          setting: true,
        }}
        toolBarRender={() => [
          <Button
            key="reload"
            icon={<ReloadOutlined />}
            onClick={() => tableRef.current?.reload()}
          >
            刷新
          </Button>,
        ]}
        locale={{
          emptyText: (
            <Empty
              description="暂无符合条件的用户"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ),
        }}
        loading={searchParams.get('state') === 'loading'}
        request={async (params, sorter) => {
          const response = await operationUsers({
            current: params.current,
            pageSize: params.pageSize,
            keyword:
              typeof params.keyword === 'string'
                ? params.keyword.trim()
                : params.keyword,
            examType: params.examType,
            onboardingStatus: params.onboardingStatus,
            diagnosisStatus: params.diagnosisStatus,
            todayTaskStatus: params.todayTaskStatus,
            feedbackStatus: params.feedbackStatus,
            lastActiveRange: params.lastActiveRange,
            sorter: JSON.stringify(sorter),
          });
          return {
            data: response.data ?? [],
            total: response.total ?? 0,
            success: response.success,
          };
        }}
      />
    </PageContainer>
  );
};

export default UserListPage;
