import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useAccess, useModel } from '@umijs/max';
import { App, Button, Space, Tag, Tooltip, Typography } from 'antd';
import type React from 'react';
import { useMemo, useRef } from 'react';
import type { AdminModuleKey, PermissionAction } from '@/foundation/permissions';
import { aiSessionReviews } from '@/services/ant-design-pro/api';
import {
  businessSceneText,
  compactTextStyle,
  conclusionColor,
  conclusionText,
  conclusionValueEnum,
  reviewStatusColor,
  reviewStatusText,
  reviewStatusValueEnum,
  riskLevelColor,
  riskLevelOptions,
  riskLevelText,
  textEllipsisStyle,
} from './config';

const canOperateSessionReview = (roleId?: string) =>
  roleId === 'super_admin' || roleId === 'ai_operator';

const AiSessionReviewPage: React.FC = () => {
  const { message } = App.useApp();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const { initialState } = useModel('@@initialState');
  const roleId = initialState?.currentUser?.roleId;
  const access = useAccess() as {
    canAction?: (
      moduleKey: AdminModuleKey,
      targetAction: PermissionAction,
    ) => boolean;
  };
  const canRead = access.canAction?.('aiCoach', 'read') && canOperateSessionReview(roleId);

  const columns = useMemo<ProColumns<API.AiSessionReview>[]>(
    () => [
      {
        title: '会话 ID',
        dataIndex: 'keyword',
        width: 210,
        render: (_, record) => (
          <Space orientation="vertical" size={0} style={{ width: '100%', minWidth: 0 }}>
            <Typography.Text
              copyable={{ text: record.sessionId }}
              ellipsis={{ tooltip: record.sessionId }}
              style={compactTextStyle}
            >
              {record.sessionId}
            </Typography.Text>
            <Typography.Text type="secondary" style={compactTextStyle}>
              {record.sessionTime}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: '意图',
        dataIndex: 'intentKey',
        width: 180,
        render: (_, record) => (
          <Space orientation="vertical" size={0} style={{ width: '100%', minWidth: 0 }}>
            <Typography.Text ellipsis={{ tooltip: record.intentName }} style={compactTextStyle}>
              {record.intentName}
            </Typography.Text>
            <Typography.Text type="secondary" ellipsis={{ tooltip: record.intentKey }} style={compactTextStyle}>
              {record.intentKey}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: '策略版本',
        dataIndex: 'strategyVersion',
        width: 210,
        render: (_, record) => (
          <Space orientation="vertical" size={0} style={{ width: '100%', minWidth: 0 }}>
            <Typography.Text
              ellipsis={{ tooltip: record.strategySnapshot.strategyTitle }}
              style={compactTextStyle}
            >
              {record.strategySnapshot.strategyTitle}
            </Typography.Text>
            <Typography.Text type="secondary" style={compactTextStyle}>
              {record.strategySnapshot.strategyVersion} / {businessSceneText[record.businessScene]}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: '风险',
        dataIndex: 'riskLevel',
        width: 110,
        valueEnum: Object.fromEntries(
          riskLevelOptions.map((item) => [item.value, { text: item.label }]),
        ),
        render: (_, record) => (
          <Tag color={riskLevelColor[record.riskLevel]}>
            {riskLevelText[record.riskLevel]}
          </Tag>
        ),
      },
      {
        title: '摘要',
        dataIndex: 'summaryPreview',
        search: false,
        ellipsis: true,
        render: (_, record) => (
          <Typography.Text ellipsis={{ tooltip: record.summaryPreview }} style={textEllipsisStyle}>
            {record.summaryPreview}
          </Typography.Text>
        ),
      },
      {
        title: '状态',
        dataIndex: 'reviewStatus',
        width: 110,
        valueEnum: reviewStatusValueEnum,
        render: (_, record) => (
          <Tag color={reviewStatusColor[record.reviewStatus]}>
            {reviewStatusText[record.reviewStatus]}
          </Tag>
        ),
      },
      {
        title: '结论',
        dataIndex: 'conclusion',
        width: 100,
        valueEnum: conclusionValueEnum,
        render: (_, record) =>
          record.conclusion ? (
            <Tag color={conclusionColor[record.conclusion]}>
              {conclusionText[record.conclusion]}
            </Tag>
          ) : (
            <Typography.Text type="secondary">-</Typography.Text>
          ),
      },
      {
        title: '抽检人',
        dataIndex: 'reviewer',
        width: 110,
        search: false,
        render: (_, record) => record.reviewer || '-',
      },
      {
        title: '会话时间',
        dataIndex: 'sessionTimeRange',
        valueType: 'dateRange',
        hideInTable: true,
      },
      {
        title: '操作',
        valueType: 'option',
        width: 90,
        render: (_, record) => (
          <Tooltip title="查看">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => history.push(`/ai-coach/session-review/${record.id}`)}
            />
          </Tooltip>
        ),
      },
    ],
    [],
  );

  if (!canRead) {
    return (
      <PageContainer>
        <Typography.Text type="secondary">无权访问 AI 会话抽检。</Typography.Text>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <ProTable<API.AiSessionReview>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        search={{ labelWidth: 96 }}
        options={false}
        pagination={{ showSizeChanger: true }}
        toolBarRender={() => [
          <Tooltip title="刷新" key="reload">
            <Button
              icon={<ReloadOutlined />}
              onClick={() => actionRef.current?.reload()}
            />
          </Tooltip>,
        ]}
        request={async (params) => {
          try {
            const response = await aiSessionReviews(params);
            return {
              data: response.data ?? [],
              total: response.total ?? 0,
              success: response.success !== false,
            };
          } catch (error: any) {
            message.error(error?.data?.errorMessage || error?.message || '会话抽检加载失败');
            return { data: [], total: 0, success: false };
          }
        }}
      />
    </PageContainer>
  );
};

export default AiSessionReviewPage;
