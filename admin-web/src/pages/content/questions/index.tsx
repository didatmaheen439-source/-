import { PlusOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useAccess } from '@umijs/max';
import {
  App,
  Button,
  Descriptions,
  Drawer,
  Popconfirm,
  Space,
  Tabs,
  Tag,
  Timeline,
  Tooltip,
  Typography,
} from 'antd';
import type React from 'react';
import { useRef, useState } from 'react';
import StatusTag from '@/components/StatusTag';
import type {
  AdminModuleKey,
  PermissionAction,
} from '@/foundation/permissions';
import {
  contentQuestionDetail,
  contentQuestions,
  submitContentQuestionReview,
} from '@/services/ant-design-pro/api';
import {
  examTypeOptions,
  getOptionLabel,
  questionDifficultyOptions,
  questionSkillOptions,
  questionTypeOptions,
  reviewStatusOptions,
  toValueEnum,
} from './constants';

const canEditQuestion = (
  record: API.QuestionItem,
  canAction?: (
    targetModule: AdminModuleKey,
    targetAction: PermissionAction,
  ) => boolean,
) =>
  Boolean(
    canAction?.('content', 'edit') &&
      ['draft', 'rejected'].includes(record.status),
  );

const canSubmitQuestion = (
  record: API.QuestionItem,
  canAction?: (
    targetModule: AdminModuleKey,
    targetAction: PermissionAction,
  ) => boolean,
) =>
  Boolean(
    canAction?.('content', 'submit') &&
      ['draft', 'rejected'].includes(record.status),
  );

const QuestionListPage: React.FC = () => {
  const { message } = App.useApp();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const access = useAccess() as {
    canAction?: (
      targetModule: AdminModuleKey,
      targetAction: PermissionAction,
    ) => boolean;
  };
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<API.QuestionItem>();
  const [submittingId, setSubmittingId] = useState<string>();

  const openDetail = async (record: API.QuestionItem) => {
    const detail = await contentQuestionDetail(record.id);
    setSelectedQuestion(detail.data ?? record);
    setDrawerOpen(true);
  };

  const submitReview = async (record: API.QuestionItem) => {
    setSubmittingId(record.id);
    try {
      await submitContentQuestionReview(record.id, {
        changeSummary: record.changeSummary || '提交题目审核。',
      });
      message.success('已提交审核');
      actionRef.current?.reload();
      if (selectedQuestion?.id === record.id) {
        const detail = await contentQuestionDetail(record.id);
        setSelectedQuestion(detail.data);
      }
    } catch (error: any) {
      message.error(
        error?.data?.errorMessage || error?.message || '提交审核失败',
      );
    } finally {
      setSubmittingId(undefined);
    }
  };

  const renderActions = (record: API.QuestionItem) => {
    const actions = [
      <Button
        key="detail"
        type="link"
        size="small"
        onClick={() => openDetail(record)}
      >
        查看
      </Button>,
    ];

    if (canEditQuestion(record, access.canAction)) {
      actions.push(
        <Button
          key="edit"
          type="link"
          size="small"
          onClick={() => history.push(`/content/questions/${record.id}/edit`)}
        >
          编辑
        </Button>,
      );
    }

    if (canSubmitQuestion(record, access.canAction)) {
      actions.push(
        <Popconfirm
          key="submit"
          title="确认提交审核？"
          description={`题目 ${record.title}（${record.version}）将进入审核发布中心。`}
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

    return <Space size={0}>{actions.slice(0, 3)}</Space>;
  };

  const columns: ProColumns<API.QuestionItem>[] = [
    {
      title: '关键词',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: {
        placeholder: '题目 ID、标题、题干或标签',
      },
    },
    {
      title: '题目',
      dataIndex: 'title',
      search: false,
      width: 260,
      fixed: 'left',
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Button type="link" size="small" onClick={() => openDetail(record)}>
            {record.title}
          </Button>
          <Typography.Text type="secondary" copyable>
            {record.id}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '题干摘要',
      dataIndex: 'stem',
      search: false,
      width: 260,
      ellipsis: true,
    },
    {
      title: '考试类型',
      dataIndex: 'examType',
      valueEnum: toValueEnum(examTypeOptions),
      width: 96,
      renderText: (value) => getOptionLabel(examTypeOptions, value),
    },
    {
      title: '题型',
      dataIndex: 'questionType',
      valueEnum: toValueEnum(questionTypeOptions),
      width: 112,
      renderText: (value) => getOptionLabel(questionTypeOptions, value),
    },
    {
      title: '技能',
      dataIndex: 'skill',
      valueEnum: toValueEnum(questionSkillOptions),
      search: false,
      width: 96,
      renderText: (value) => getOptionLabel(questionSkillOptions, value),
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      valueEnum: toValueEnum(questionDifficultyOptions),
      width: 96,
      renderText: (value) => getOptionLabel(questionDifficultyOptions, value),
    },
    {
      title: '标签',
      dataIndex: 'tags',
      search: false,
      width: 180,
      render: (_, record) => (
        <Space wrap size={[4, 4]}>
          {record.tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '版本',
      dataIndex: 'version',
      search: false,
      width: 88,
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
      title: '创建人',
      dataIndex: 'creator',
      search: false,
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
      width: 220,
      render: (_, record) => renderActions(record),
    },
  ];

  const detailItems = selectedQuestion
    ? [
        { key: 'id', label: '题目 ID', children: selectedQuestion.id },
        { key: 'title', label: '标题', children: selectedQuestion.title },
        {
          key: 'examType',
          label: '考试类型',
          children: getOptionLabel(examTypeOptions, selectedQuestion.examType),
        },
        {
          key: 'questionType',
          label: '题型',
          children: getOptionLabel(
            questionTypeOptions,
            selectedQuestion.questionType,
          ),
        },
        {
          key: 'skill',
          label: '技能',
          children: getOptionLabel(
            questionSkillOptions,
            selectedQuestion.skill,
          ),
        },
        {
          key: 'difficulty',
          label: '难度',
          children: getOptionLabel(
            questionDifficultyOptions,
            selectedQuestion.difficulty,
          ),
        },
        {
          key: 'status',
          label: '状态',
          children: (
            <StatusTag domain="reviewPublish" value={selectedQuestion.status} />
          ),
        },
        { key: 'version', label: '版本', children: selectedQuestion.version },
        { key: 'creator', label: '创建人', children: selectedQuestion.creator },
        {
          key: 'updatedAt',
          label: '更新时间',
          children: selectedQuestion.updatedAt,
        },
      ]
    : [];

  return (
    <PageContainer title="题库管理">
      <ProTable<API.QuestionItem>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        search={{
          labelWidth: 'auto',
          defaultCollapsed: false,
        }}
        pagination={{ pageSize: 20 }}
        scroll={{ x: 1420 }}
        request={async (params) => {
          const response = await contentQuestions({
            params: {
              ...params,
              keyword: String(params.keyword ?? '').trim(),
            },
          });
          return {
            data: response.data ?? [],
            total: response.total ?? 0,
            success: response.success,
          };
        }}
        toolbar={{
          title: '题目列表',
          actions: [
            <Tooltip key="refresh" title="刷新列表">
              <Button onClick={() => actionRef.current?.reload()}>刷新</Button>
            </Tooltip>,
            access.canAction?.('content', 'create') ? (
              <Button
                key="create"
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => history.push('/content/questions/create')}
              >
                新增题目
              </Button>
            ) : null,
          ].filter(Boolean),
        }}
      />

      <Drawer
        size="large"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedQuestion?.title ?? '题目详情'}
        extra={selectedQuestion ? renderActions(selectedQuestion) : null}
      >
        {selectedQuestion && (
          <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions
              column={2}
              bordered
              size="small"
              items={detailItems}
            />
            <Tabs
              items={[
                {
                  key: 'content',
                  label: '题目内容',
                  children: (
                    <Space
                      orientation="vertical"
                      size={12}
                      style={{ width: '100%' }}
                    >
                      <Typography.Text strong>题干</Typography.Text>
                      <Typography.Paragraph>
                        {selectedQuestion.stem}
                      </Typography.Paragraph>
                      <Typography.Text strong>选项</Typography.Text>
                      <Space orientation="vertical" size={6}>
                        {selectedQuestion.options.map((option) => (
                          <Typography.Text key={option.key}>
                            {option.key}. {option.content}
                            {option.key === selectedQuestion.answer ? (
                              <Tag color="success" style={{ marginLeft: 8 }}>
                                正确答案
                              </Tag>
                            ) : null}
                          </Typography.Text>
                        ))}
                      </Space>
                      <Typography.Text strong>解析</Typography.Text>
                      <Typography.Paragraph>
                        {selectedQuestion.analysis}
                      </Typography.Paragraph>
                      <Typography.Text strong>引用影响</Typography.Text>
                      <Typography.Paragraph type="secondary">
                        {selectedQuestion.referenceImpact}
                      </Typography.Paragraph>
                    </Space>
                  ),
                },
                {
                  key: 'versions',
                  label: '版本记录',
                  children: (
                    <Timeline
                      items={selectedQuestion.versionRecords.map((record) => ({
                        children: (
                          <Space orientation="vertical" size={2}>
                            <Typography.Text strong>
                              {record.version} · {record.summary}
                            </Typography.Text>
                            <Typography.Text type="secondary">
                              {record.createdBy} · {record.createdAt}
                            </Typography.Text>
                          </Space>
                        ),
                      }))}
                    />
                  ),
                },
                {
                  key: 'operations',
                  label: '操作记录',
                  children: (
                    <Timeline
                      items={selectedQuestion.operationRecords.map(
                        (record) => ({
                          children: (
                            <Space orientation="vertical" size={2}>
                              <Typography.Text strong>
                                {record.action} · {record.reason}
                              </Typography.Text>
                              <Typography.Text type="secondary">
                                {record.operator} · {record.time}
                              </Typography.Text>
                            </Space>
                          ),
                        }),
                      )}
                    />
                  ),
                },
              ]}
            />
          </Space>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default QuestionListPage;
