import { EyeOutlined, PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useModel, useSearchParams } from '@umijs/max';
import { App, Button, Space, Tabs, Tag, Tooltip, Typography } from 'antd';
import type React from 'react';
import { useMemo, useRef, useState } from 'react';
import {
  aiAbnormalReplies,
  startAiAbnormalReply,
} from '@/services/ant-design-pro/api';
import {
  businessSceneOptions,
  businessSceneText,
  configTypeOptions,
  configTypeText,
  riskLevelColor,
  riskLevelOptions,
  riskLevelText,
  textEllipsisStyle,
} from '../prompts/config';
import {
  abnormalStatusColor,
  abnormalStatusText,
  abnormalTypeOptions,
  abnormalTypeText,
  statusValueEnum,
} from './config';

const canHandle = (roleId?: string) => roleId === 'super_admin' || roleId === 'ai_operator';

const AiAbnormalRepliesPage: React.FC = () => {
  const { message } = App.useApp();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeKey, setActiveKey] = useState(searchParams.get('status') ?? 'all');
  const { initialState } = useModel('@@initialState');
  const roleId = initialState?.currentUser?.roleId;
  const canOperate = canHandle(roleId);

  const reload = () => actionRef.current?.reload();

  const changeStatusTab = (key: string) => {
    setActiveKey(key);
    const next = new URLSearchParams(searchParams);
    if (key === 'all') next.delete('status');
    else next.set('status', key);
    setSearchParams(next);
    actionRef.current?.reload();
  };

  const handleStart = async (record: API.AiAbnormalReply) => {
    try {
      await startAiAbnormalReply(record.id);
      message.success('已接手处理');
      reload();
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '接手失败');
    }
  };

  const columns = useMemo<ProColumns<API.AiAbnormalReply>[]>(
    () => [
      {
        title: '异常项',
        dataIndex: 'keyword',
        width: 320,
        render: (_, record) => (
          <Space orientation="vertical" size={0} style={{ width: '100%', minWidth: 0 }}>
            <Button
              type="link"
              size="small"
              title={record.title}
              style={{ ...textEllipsisStyle, height: 22, padding: 0, textAlign: 'left' }}
              onClick={() => history.push(`/ai-coach/abnormal-replies/${record.id}`)}
            >
              {record.title}
            </Button>
            <Typography.Text type="secondary" style={textEllipsisStyle} ellipsis={{ tooltip: record.id }}>
              {record.id} · {record.sessionId}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 110,
        valueEnum: statusValueEnum,
        hideInSearch: activeKey !== 'all',
        render: (_, record) => (
          <Tag color={abnormalStatusColor[record.status]}>{abnormalStatusText[record.status]}</Tag>
        ),
      },
      {
        title: '异常类型',
        dataIndex: 'abnormalType',
        width: 130,
        valueEnum: Object.fromEntries(
          abnormalTypeOptions.map((item) => [item.value, { text: item.label }]),
        ),
        render: (_, record) => abnormalTypeText[record.abnormalType],
      },
      {
        title: '严重级别',
        dataIndex: 'severity',
        width: 110,
        valueEnum: Object.fromEntries(
          riskLevelOptions.map((item) => [item.value, { text: item.label }]),
        ),
        render: (_, record) => <Tag color={riskLevelColor[record.severity]}>{riskLevelText[record.severity]}</Tag>,
      },
      {
        title: '业务场景',
        dataIndex: 'businessScene',
        width: 140,
        valueEnum: Object.fromEntries(
          businessSceneOptions.map((item) => [item.value, { text: item.label }]),
        ),
        render: (_, record) => businessSceneText[record.businessScene],
      },
      {
        title: '归因',
        dataIndex: 'rootCauseType',
        width: 130,
        valueEnum: Object.fromEntries(
          configTypeOptions.map((item) => [item.value, { text: item.label }]),
        ),
        render: (_, record) =>
          record.rootCauseType ? (
            <Tag>{configTypeText[record.rootCauseType]}</Tag>
          ) : (
            <Typography.Text type="secondary">未归因</Typography.Text>
          ),
      },
      {
        title: '关联策略',
        dataIndex: 'linkedStrategyTitle',
        width: 260,
        search: false,
        render: (_, record) => (
          <Tooltip title={`${record.linkedStrategyTitle} ${record.linkedStrategyVersion}`}>
            <Typography.Text style={textEllipsisStyle}>{record.linkedStrategyTitle}</Typography.Text>
          </Tooltip>
        ),
      },
      {
        title: '处理人',
        dataIndex: 'handler',
        width: 120,
        render: (_, record) => record.handler ?? <Typography.Text type="secondary">未接手</Typography.Text>,
      },
      {
        title: '更新时间',
        dataIndex: 'updatedAt',
        search: false,
        width: 170,
        valueType: 'dateTime',
      },
      {
        title: '操作',
        valueType: 'option',
        width: 150,
        fixed: 'right',
        render: (_, record) => [
          <Button
            key="detail"
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => history.push(`/ai-coach/abnormal-replies/${record.id}`)}
          >
            查看
          </Button>,
          record.status === 'pending' && canOperate ? (
            <Button
              key="start"
              type="link"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleStart(record)}
            >
              接手
            </Button>
          ) : null,
        ].filter(Boolean),
      },
    ],
    [activeKey, canOperate],
  );

  return (
    <PageContainer>
      <ProTable<API.AiAbnormalReply>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        scroll={{ x: 1500 }}
        search={{ labelWidth: 88, defaultCollapsed: false }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        toolbar={{
          title: (
            <Tabs
              activeKey={activeKey}
              onChange={changeStatusTab}
              items={[
                { key: 'all', label: '全部' },
                { key: 'pending', label: '待处理' },
                { key: 'processing', label: '处理中' },
                { key: 'resolved', label: '已处理' },
                { key: 'closed', label: '已关闭' },
              ]}
            />
          ),
          actions: [
            <Button key="reload" icon={<ReloadOutlined />} onClick={reload}>
              刷新
            </Button>,
          ],
        }}
        params={{ status: activeKey === 'all' ? undefined : activeKey }}
        request={async (params) => {
          const response = await aiAbnormalReplies({
            ...params,
            status: activeKey === 'all' ? undefined : (activeKey as API.AiAbnormalReplyStatus),
          });
          return {
            data: response.data ?? [],
            total: response.total ?? 0,
            success: response.success !== false,
          };
        }}
      />
    </PageContainer>
  );
};

export default AiAbnormalRepliesPage;
