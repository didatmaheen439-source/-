import {
  ArrowRightOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useModel, useSearchParams } from '@umijs/max';
import { App, Button, Space, Tabs, Tag, Tooltip, Typography } from 'antd';
import type React from 'react';
import { useMemo, useRef, useState } from 'react';
import StatusTag from '@/components/StatusTag';
import {
  defaultFeedbackQueueView,
  feedbackOwnerRoleLabels,
  feedbackPriorityRank,
  type FeedbackQueueItem,
  type FeedbackQueueView,
} from '@/foundation/feedbackQueue';
import {
  feedbackStatusOptions,
  toValueEnum,
} from '../constants';
import { feedbackQueue } from './service';

const priorityColors: Record<FeedbackQueueItem['priority'], string> = {
  P0: 'red',
  P1: 'orange',
  P2: 'blue',
};

const viewItems: { key: FeedbackQueueView; label: string }[] = [
  { key: 'triage', label: '待分诊' },
  { key: 'mine', label: '待我处理' },
  { key: 'processing', label: '处理中' },
  { key: 'resolved', label: '待客服确认' },
  { key: 'closed', label: '已关闭' },
];

const FeedbackQueueListPage: React.FC = () => {
  const { message } = App.useApp();
  const { initialState } = useModel('@@initialState');
  const roleId = initialState?.currentUser?.roleId;
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialView =
    (searchParams.get('view') as FeedbackQueueView | null) ??
    defaultFeedbackQueueView(roleId);
  const [view, setView] = useState<FeedbackQueueView>(initialView);

  const ownerOptions = useMemo(
    () =>
      Object.entries(feedbackOwnerRoleLabels).reduce<
        Record<string, { text: string }>
      >((acc, [value, label]) => {
        acc[value] = { text: label };
        return acc;
      }, {}),
    [],
  );

  const switchView = (nextView: string) => {
    const typedView = nextView as FeedbackQueueView;
    setView(typedView);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('view', typedView);
    setSearchParams(nextParams);
    actionRef.current?.reload();
  };

  const columns: ProColumns<FeedbackQueueItem>[] = [
    {
      title: '关键词',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '反馈编号、摘要、用户或模块' },
    },
    {
      title: '反馈编号',
      dataIndex: 'feedbackId',
      width: 210,
      fixed: 'left',
      copyable: true,
      search: false,
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Button
            type="link"
            size="small"
            onClick={() => history.push(`/users/feedback/${record.feedbackId}`)}
          >
            {record.feedbackId}
          </Button>
          <Typography.Text type="secondary">{record.type}</Typography.Text>
        </Space>
      ),
    },
    {
      title: '反馈类型',
      dataIndex: 'type',
      width: 120,
      hideInTable: true,
    },
    {
      title: '摘要',
      dataIndex: 'summary',
      width: 320,
      search: false,
      ellipsis: true,
    },
    {
      title: '脱敏用户',
      dataIndex: 'userNickname',
      width: 180,
      search: false,
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Typography.Text>{record.userNickname}</Typography.Text>
          <Typography.Text type="secondary">
            {record.userMaskedContact}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      width: 90,
      valueEnum: {
        P0: { text: 'P0' },
        P1: { text: 'P1' },
        P2: { text: 'P2' },
      },
      sorter: (a, b) =>
        feedbackPriorityRank[a.priority] - feedbackPriorityRank[b.priority],
      render: (_, record) => (
        <Tag color={priorityColors[record.priority]}>{record.priority}</Tag>
      ),
    },
    {
      title: '模块',
      dataIndex: 'relatedModule',
      width: 140,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      valueEnum: toValueEnum(feedbackStatusOptions),
      render: (_, record) => (
        <StatusTag domain="feedback" value={record.status} />
      ),
    },
    {
      title: '负责人',
      dataIndex: 'ownerAccountId',
      width: 150,
      valueEnum: ownerOptions,
      render: (_, record) => record.currentAssignment?.assigneeName ?? '-',
    },
    {
      title: '是否超时',
      dataIndex: 'overdue',
      hideInTable: true,
      valueEnum: {
        yes: { text: '已超时' },
        no: { text: '未超时' },
      },
    },
    {
      title: '停留时长',
      dataIndex: 'waitHours',
      width: 120,
      search: false,
      render: (_, record) => (
        <Space size={4}>
          <Typography.Text type={record.overdue ? 'danger' : undefined}>
            {record.waitText}
          </Typography.Text>
          {record.overdue ? <Tag color="red">风险</Tag> : null}
        </Space>
      ),
    },
    {
      title: '提交时间',
      dataIndex: 'submittedAtRange',
      valueType: 'dateRange',
      hideInTable: true,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 170,
      search: false,
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      width: 120,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<ArrowRightOutlined />}
          onClick={() => history.push(`/users/feedback/${record.feedbackId}`)}
        >
          处理
        </Button>
      ),
    },
  ];

  return (
    <PageContainer title="反馈工作队列">
      <ProTable<FeedbackQueueItem>
        actionRef={actionRef}
        rowKey="feedbackId"
        columns={columns}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        scroll={{ x: 1750 }}
        pagination={{ pageSize: 20 }}
        params={{ view }}
        request={async (params) => {
          try {
            const response = await feedbackQueue({
              ...params,
              view,
              overdue:
                params.overdue === true
                  ? 'yes'
                  : params.overdue === false
                    ? 'no'
                    : (params.overdue as 'yes' | 'no' | undefined),
            });
            return {
              data: response.data ?? [],
              total: response.total ?? 0,
              success: response.success,
            };
          } catch (error: any) {
            message.error(
              error?.data?.errorMessage ||
                error?.message ||
                '反馈队列加载失败',
            );
            return { data: [], total: 0, success: false };
          }
        }}
        toolbar={{
          title: (
            <Tabs
              activeKey={view}
              onChange={switchView}
              items={viewItems}
              size="small"
            />
          ),
          actions: [
            <Tooltip key="reload" title="刷新列表">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => actionRef.current?.reload()}
              />
            </Tooltip>,
          ],
        }}
        options={false}
        columnsState={{ persistenceKey: 'feedback-work-queue-table' }}
        onRow={(record) => ({
          onDoubleClick: () =>
            history.push(`/users/feedback/${record.feedbackId}`),
        })}
      />
    </PageContainer>
  );
};

export default FeedbackQueueListPage;
