import {
  CopyOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useAccess } from '@umijs/max';
import { App, Button, Space, Tag, Tooltip, Typography } from 'antd';
import type React from 'react';
import { useMemo, useRef } from 'react';
import PermissionButton from '@/components/PermissionButton';
import StatusTag from '@/components/StatusTag';
import type {
  AdminModuleKey,
  PermissionAction,
} from '@/foundation/permissions';
import {
  copyMockExamPaper,
  mockExamPapers,
  precheckExistingMockExamPaper,
  submitMockExamPaperReview,
} from './service';
import type { MockExamPaper, MockExamPrecheckResult } from './data';
import {
  editableStatuses,
  examTypeOptions,
  precheckLevelColor,
  precheckLevelText,
  statusValueEnum,
  textEllipsisStyle,
} from './config';

const MockExamPapersPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const access = useAccess() as {
    canAction?: (
      moduleKey: AdminModuleKey,
      action: PermissionAction,
    ) => boolean;
  };
  const canCreate = Boolean(access.canAction?.('mockExam', 'create'));
  const canEdit = Boolean(access.canAction?.('mockExam', 'edit'));
  const canSubmit = Boolean(access.canAction?.('mockExam', 'submit'));

  const reload = () => actionRef.current?.reload();

  const showPrecheck = (result: MockExamPrecheckResult) => {
    modal.info({
      title: `预校验${precheckLevelText[result.level]}`,
      width: 760,
      content: (
        <Space orientation="vertical" size={8} style={{ width: '100%' }}>
          <Typography.Text>{result.summary}</Typography.Text>
          {result.issues.map((item) => (
            <Tag key={item.id} color={precheckLevelColor[item.level]}>
              {item.code} / {item.field}：{item.message}
            </Tag>
          ))}
        </Space>
      ),
    });
  };

  const runPrecheck = async (record: MockExamPaper) => {
    try {
      const response = await precheckExistingMockExamPaper(record.id);
      if (response.data) showPrecheck(response.data);
      reload();
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '预校验失败');
    }
  };

  const submitReview = async (
    record: MockExamPaper,
    confirmWarnings = false,
  ) => {
    try {
      await submitMockExamPaperReview(record.id, {
        changeSummary: record.changeSummary || '提交模考试卷审核。',
        dataVersion: record.dataVersion,
        confirmWarnings,
      });
      message.success('已提交审核');
      reload();
    } catch (error: any) {
      const precheck = error?.data?.data as
        | MockExamPrecheckResult
        | undefined;
      if (precheck?.level === 'warning') {
        modal.confirm({
          title: '预校验存在警告，确认提交审核？',
          content: precheck.summary,
          okText: '确认提交',
          cancelText: '取消',
          onOk: () => submitReview(record, true),
        });
        return;
      }
      message.error(error?.data?.errorMessage || error?.message || '提交失败');
    }
  };

  const copyDraft = async (record: MockExamPaper) => {
    try {
      const response = await copyMockExamPaper(record.id);
      if (response.data) {
        message.success('已创建新草稿');
        history.push(`/mock-exam/papers/${response.data.id}/edit`);
      }
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '复制失败');
    }
  };

  const columns = useMemo<ProColumns<MockExamPaper>[]>(
    () => [
      {
        title: '试卷 ID',
        dataIndex: 'id',
        width: 220,
        search: false,
        render: (_, record) => (
          <Typography.Text
            copyable={{ text: record.id }}
            ellipsis={{ tooltip: record.id }}
            style={textEllipsisStyle}
          >
            {record.id}
          </Typography.Text>
        ),
      },
      {
        title: '试卷名称',
        dataIndex: 'keyword',
        width: 280,
        render: (_, record) => (
          <Button
            type="link"
            size="small"
            title={record.name}
            style={{
              ...textEllipsisStyle,
              height: 22,
              padding: 0,
              textAlign: 'left',
            }}
            onClick={() => history.push(`/mock-exam/papers/${record.id}`)}
          >
            {record.name}
          </Button>
        ),
      },
      {
        title: '考试类型',
        dataIndex: 'examType',
        width: 110,
        valueEnum: Object.fromEntries(
          examTypeOptions.map((item) => [item.value, { text: item.label }]),
        ),
      },
      {
        title: '总分',
        dataIndex: 'totalScore',
        width: 90,
        search: false,
      },
      {
        title: '总时长',
        dataIndex: 'totalMinutes',
        width: 100,
        search: false,
        render: (_, record) => `${record.totalMinutes} 分钟`,
      },
      {
        title: '结构',
        key: 'structure',
        width: 130,
        search: false,
        render: (_, record) =>
          `${record.sections.length} 分区 / ${record.sections.reduce(
            (sum, section) => sum + section.items.length,
            0,
          )} 题`,
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 110,
        valueEnum: statusValueEnum,
        render: (_, record) => (
          <StatusTag domain="reviewPublish" value={record.status} />
        ),
      },
      {
        title: '版本',
        dataIndex: 'version',
        width: 90,
        search: false,
      },
      {
        title: '预校验',
        dataIndex: 'precheckLevel',
        width: 100,
        valueEnum: Object.fromEntries(
          Object.entries(precheckLevelText).map(([value, text]) => [
            value,
            { text },
          ]),
        ),
        render: (_, record) =>
          record.lastPrecheck ? (
            <Tooltip title={record.lastPrecheck.summary}>
              <Tag color={precheckLevelColor[record.lastPrecheck.level]}>
                {precheckLevelText[record.lastPrecheck.level]}
              </Tag>
            </Tooltip>
          ) : (
            '-'
          ),
      },
      {
        title: '更新人',
        dataIndex: 'updatedBy',
        width: 110,
        search: false,
      },
      {
        title: '更新时间',
        dataIndex: 'updatedAt',
        valueType: 'dateTime',
        width: 170,
        search: false,
      },
      {
        title: '操作',
        valueType: 'option',
        fixed: 'right',
        width: 280,
        render: (_, record) => {
          const editable = editableStatuses.includes(record.status);
          return [
            <Button
              key="view"
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => history.push(`/mock-exam/papers/${record.id}`)}
            >
              查看
            </Button>,
            canEdit && editable ? (
              <Button
                key="edit"
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() =>
                  history.push(`/mock-exam/papers/${record.id}/edit`)
                }
              >
                编辑
              </Button>
            ) : null,
            <Button
              key="precheck"
              type="link"
              size="small"
              icon={<SafetyCertificateOutlined />}
              onClick={() => runPrecheck(record)}
            >
              预校验
            </Button>,
            canSubmit && editable ? (
              <Button
                key="submit"
                type="link"
                size="small"
                icon={<SendOutlined />}
                onClick={() => submitReview(record)}
              >
                提交审核
              </Button>
            ) : null,
            canCreate && !editable ? (
              <Button
                key="copy"
                type="link"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => copyDraft(record)}
              >
                复制草稿
              </Button>
            ) : null,
          ].filter(Boolean);
        },
      },
    ],
    [canCreate, canEdit, canSubmit],
  );

  return (
    <PageContainer>
      <ProTable<MockExamPaper>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        request={async (params) => {
          const response = await mockExamPapers(params);
          return {
            data: response.data ?? [],
            total: response.total ?? 0,
            success: response.success,
          };
        }}
        pagination={{ defaultPageSize: 20, showSizeChanger: true }}
        search={{ labelWidth: 92, defaultCollapsed: false }}
        scroll={{ x: 1800 }}
        toolBarRender={() => [
          <PermissionButton
            key="create"
            moduleKey="mockExam"
            action="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => history.push('/mock-exam/papers/new')}
          >
            新增试卷
          </PermissionButton>,
        ]}
      />
    </PageContainer>
  );
};

export default MockExamPapersPage;
