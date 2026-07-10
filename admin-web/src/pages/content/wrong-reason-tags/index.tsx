import { PlusOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useAccess } from '@umijs/max';
import { App, Button, Popconfirm, Space, Tag, Tooltip, Typography } from 'antd';
import type React from 'react';
import { useRef, useState } from 'react';
import StatusTag from '@/components/StatusTag';
import type {
  AdminModuleKey,
  PermissionAction,
} from '@/foundation/permissions';
import {
  submitWrongReasonTagReview,
  wrongReasonTags,
} from '@/services/ant-design-pro/api';
import {
  editableWrongReasonStatuses,
  examTypeOptions,
  getOptionLabel,
  questionTypeOptions,
  reviewStatusOptions,
  toValueEnum,
  wrongReasonCategoryOptions,
  wrongReasonSeverityColor,
  wrongReasonSeverityOptions,
} from './constants';

const canEditTag = (
  record: API.WrongReasonTagItem,
  canAction?: (
    targetModule: AdminModuleKey,
    targetAction: PermissionAction,
  ) => boolean,
) =>
  Boolean(
    canAction?.('content', 'edit') &&
      editableWrongReasonStatuses.includes(record.status),
  );

const canSubmitTag = (
  record: API.WrongReasonTagItem,
  canAction?: (
    targetModule: AdminModuleKey,
    targetAction: PermissionAction,
  ) => boolean,
) =>
  Boolean(
    canAction?.('content', 'submit') &&
      editableWrongReasonStatuses.includes(record.status),
  );

const WrongReasonTagListPage: React.FC = () => {
  const { message } = App.useApp();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [submittingId, setSubmittingId] = useState<string>();
  const access = useAccess() as {
    canAction?: (
      targetModule: AdminModuleKey,
      targetAction: PermissionAction,
    ) => boolean;
  };

  const submitReview = async (record: API.WrongReasonTagItem) => {
    setSubmittingId(record.id);
    try {
      await submitWrongReasonTagReview(record.id, {
        changeSummary: record.changeSummary || '提交错因标签审核。',
      });
      message.success('已提交审核');
      actionRef.current?.reload();
    } catch (error: any) {
      message.error(
        error?.data?.errorMessage || error?.message || '提交审核失败',
      );
    } finally {
      setSubmittingId(undefined);
    }
  };

  const renderActions = (record: API.WrongReasonTagItem) => {
    const actions = [
      <Button
        key="detail"
        type="link"
        size="small"
        onClick={() => history.push(`/content/wrong-reason-tags/${record.id}`)}
      >
        查看
      </Button>,
    ];

    if (canEditTag(record, access.canAction)) {
      actions.push(
        <Button
          key="edit"
          type="link"
          size="small"
          onClick={() =>
            history.push(`/content/wrong-reason-tags/${record.id}/edit`)
          }
        >
          编辑
        </Button>,
      );
    }

    if (canSubmitTag(record, access.canAction)) {
      actions.push(
        <Popconfirm
          key="submit"
          title="确认提交审核？"
          description={`错因标签 ${record.name}（${record.version}）将进入审核发布中心。`}
          okText="提交审核"
          cancelText="取消"
          onConfirm={() => submitReview(record)}
        >
          <Button type="link" size="small" loading={submittingId === record.id}>
            提交审核
          </Button>
        </Popconfirm>,
      );
    }

    if (record.reviewTaskId) {
      actions.push(
        <Button
          key="review"
          type="link"
          size="small"
          onClick={() =>
            history.push(
              `/review-release/pending?keyword=${record.reviewTaskId}`,
            )
          }
        >
          审核任务
        </Button>,
      );
    }

    return <Space size={0}>{actions}</Space>;
  };

  const columns: ProColumns<API.WrongReasonTagItem>[] = [
    {
      title: '关键词',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: {
        placeholder: '标签 ID、标签名、分类或说明',
      },
    },
    {
      title: '标签名',
      dataIndex: 'name',
      width: 220,
      fixed: 'left',
      search: false,
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Button
            type="link"
            size="small"
            onClick={() =>
              history.push(`/content/wrong-reason-tags/${record.id}`)
            }
          >
            {record.name}
          </Button>
          <Typography.Text type="secondary" copyable>
            {record.id}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      valueEnum: toValueEnum(wrongReasonCategoryOptions),
      width: 120,
      renderText: (value) => getOptionLabel(wrongReasonCategoryOptions, value),
    },
    {
      title: '适用考试',
      dataIndex: 'examType',
      valueEnum: toValueEnum(examTypeOptions),
      width: 140,
      render: (_, record) => (
        <Space wrap size={[4, 4]}>
          {record.examTypes.map((item) => (
            <Tag key={item}>{getOptionLabel(examTypeOptions, item)}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '适用题型',
      dataIndex: 'questionType',
      valueEnum: toValueEnum(questionTypeOptions),
      width: 220,
      render: (_, record) => (
        <Space wrap size={[4, 4]}>
          {record.questionTypes.map((item) => (
            <Tag key={item}>{getOptionLabel(questionTypeOptions, item)}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '严重级别',
      dataIndex: 'severity',
      valueEnum: toValueEnum(wrongReasonSeverityOptions),
      width: 110,
      render: (_, record) => (
        <Tag color={wrongReasonSeverityColor[record.severity]}>
          {getOptionLabel(wrongReasonSeverityOptions, record.severity)}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueEnum: toValueEnum(reviewStatusOptions),
      width: 110,
      render: (_, record) => (
        <StatusTag domain="reviewPublish" value={record.status} />
      ),
    },
    {
      title: '引用次数',
      dataIndex: 'referenceCount',
      search: false,
      width: 100,
      sorter: true,
    },
    {
      title: '版本',
      dataIndex: 'version',
      search: false,
      width: 88,
    },
    {
      title: '更新人',
      dataIndex: 'updatedBy',
      width: 110,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      search: false,
      sorter: true,
      width: 170,
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      width: 250,
      render: (_, record) => renderActions(record),
    },
  ];

  return (
    <PageContainer title="错因标签">
      <ProTable<API.WrongReasonTagItem>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        search={{
          labelWidth: 'auto',
          defaultCollapsed: false,
        }}
        pagination={{ pageSize: 20 }}
        scroll={{ x: 1680 }}
        request={async (params) => {
          const response = await wrongReasonTags({
            ...params,
            keyword: String(params.keyword ?? '').trim(),
          });
          return {
            data: response.data ?? [],
            total: response.total ?? 0,
            success: response.success,
          };
        }}
        toolbar={{
          title: '错因标签列表',
          actions: [
            <Tooltip key="refresh" title="刷新列表">
              <Button onClick={() => actionRef.current?.reload()}>刷新</Button>
            </Tooltip>,
            access.canAction?.('content', 'create') ? (
              <Button
                key="create"
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => history.push('/content/wrong-reason-tags/new')}
              >
                新增错因标签
              </Button>
            ) : null,
          ].filter(Boolean),
        }}
      />
    </PageContainer>
  );
};

export default WrongReasonTagListPage;
