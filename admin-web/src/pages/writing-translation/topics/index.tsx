import {
  CopyOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useAccess, useModel, useSearchParams } from '@umijs/max';
import { App, Button, Modal, Space, Tabs, Tag, Tooltip, Typography } from 'antd';
import type React from 'react';
import { useMemo, useRef, useState } from 'react';
import PermissionButton from '@/components/PermissionButton';
import StatusTag from '@/components/StatusTag';
import type { AdminModuleKey, PermissionAction } from '@/foundation/permissions';
import {
  copyWritingTranslationTopic,
  precheckExistingWritingTranslationTopic,
  submitWritingTranslationReview,
  validateExistingWritingTranslationSamples,
  writingTranslationTopics,
} from '@/services/ant-design-pro/api';
import {
  difficultyOptions,
  difficultyText,
  editableStatuses,
  examTypeOptions,
  precheckLevelColor,
  precheckLevelText,
  riskLevelColor,
  riskLevelOptions,
  riskLevelText,
  statusValueEnum,
  textEllipsisStyle,
  topicTypeText,
} from './config';

const WritingTranslationTopicsPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeKey, setActiveKey] = useState<API.WritingTranslationTopicType>(
    (searchParams.get('topicType') as API.WritingTranslationTopicType) || 'writing',
  );
  const { initialState } = useModel('@@initialState');
  const roleId = initialState?.currentUser?.roleId;
  const access = useAccess() as {
    canAction?: (
      moduleKey: AdminModuleKey,
      targetAction: PermissionAction,
    ) => boolean;
  };

  const canCreate = Boolean(access.canAction?.('writingTranslation', 'create'));
  const canEdit = Boolean(access.canAction?.('writingTranslation', 'edit'));
  const canSubmit = Boolean(access.canAction?.('writingTranslation', 'submit'));

  const reload = () => actionRef.current?.reload();

  const runPrecheck = async (record: API.WritingTranslationTopic) => {
    try {
      const response = await precheckExistingWritingTranslationTopic(record.id);
      const result = response.data;
      if (!result) return;
      Modal.info({
        title: `预校验${precheckLevelText[result.level]}`,
        width: 720,
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
      reload();
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '预校验失败');
    }
  };

  const runSampleValidation = async (record: API.WritingTranslationTopic) => {
    try {
      const response = await validateExistingWritingTranslationSamples(record.id);
      const result = response.data;
      if (!result) return;
      Modal.info({
        title: '静态样例校验',
        width: 720,
        content: (
          <Space orientation="vertical" size={8} style={{ width: '100%' }}>
            <Typography.Text>{result.summary}</Typography.Text>
            {result.cases.map((item) => (
              <Tag key={item.id} color={precheckLevelColor[item.result ?? 'passed']}>
                {item.title}：{item.message}
              </Tag>
            ))}
          </Space>
        ),
      });
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '样例校验失败');
    }
  };

  const submitReview = async (
    record: API.WritingTranslationTopic,
    confirmWarnings = false,
  ) => {
    try {
      await submitWritingTranslationReview(record.id, {
        changeSummary: record.changeSummary || `提交${topicTypeText[record.topicType]}审核。`,
        dataVersion: record.dataVersion,
        confirmWarnings,
      });
      message.success('已提交审核');
      reload();
    } catch (error: any) {
      const precheck = error?.data?.data as
        | API.WritingTranslationPrecheckResult
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

  const copyDraft = async (record: API.WritingTranslationTopic) => {
    try {
      const response = await copyWritingTranslationTopic(record.id);
      if (response.data) {
        message.success('已创建新草稿版本');
        history.push(`/writing-translation/topics/${response.data.id}/edit`);
      }
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '创建草稿失败');
    }
  };

  const columns = useMemo<ProColumns<API.WritingTranslationTopic>[]>(
    () => [
      {
        title: '题目 ID',
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
        title: '题目名称',
        dataIndex: 'keyword',
        width: 300,
        render: (_, record) => (
          <Space orientation="vertical" size={0} style={{ width: '100%', minWidth: 0 }}>
            <Button
              type="link"
              size="small"
              title={record.name}
              style={{ ...textEllipsisStyle, height: 22, padding: 0, textAlign: 'left' }}
              onClick={() => history.push(`/writing-translation/topics/${record.id}`)}
            >
              {record.name}
            </Button>
            <Typography.Text
              type="secondary"
              ellipsis={{
                tooltip:
                  record.topicType === 'writing'
                    ? record.prompt
                    : record.sourceText,
              }}
              style={textEllipsisStyle}
            >
              {record.topicType === 'writing' ? record.prompt : record.sourceText}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: '题目类型',
        dataIndex: 'topicType',
        width: 110,
        hideInSearch: true,
        render: (_, record) => topicTypeText[record.topicType],
      },
      {
        title: '考试类型',
        dataIndex: 'examType',
        width: 100,
        valueEnum: Object.fromEntries(
          examTypeOptions.map((item) => [item.value, { text: item.label }]),
        ),
      },
      {
        title: '难度',
        dataIndex: 'difficulty',
        width: 100,
        valueEnum: Object.fromEntries(
          difficultyOptions.map((item) => [item.value, { text: item.label }]),
        ),
        render: (_, record) => difficultyText[record.difficulty],
      },
      {
        title: '标签',
        dataIndex: 'tag',
        width: 160,
        render: (_, record) => (
          <Space wrap size={[4, 4]}>
            {record.tags.slice(0, 3).map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </Space>
        ),
      },
      {
        title: '评分',
        dataIndex: 'dimensionCount',
        search: false,
        width: 120,
        render: (_, record) => (
          <Tooltip
            title={record.scoringDimensions
              .map((item) => `${item.name} ${item.weight}% / ${item.maxScore}分`)
              .join('；')}
          >
            <span>
              {record.scoringDimensions.length} 项 / {record.totalScore} 分
            </span>
          </Tooltip>
        ),
      },
      {
        title: 'AI 策略',
        dataIndex: 'hasAiStrategy',
        width: 130,
        valueEnum: {
          yes: { text: '已关联' },
          no: { text: '未关联' },
        },
        render: (_, record) =>
          record.aiStrategyRefs.length ? (
            <Tag color="blue">{record.aiStrategyRefs.length} 项</Tag>
          ) : (
            <Tag color="warning">未关联</Tag>
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
        title: '状态',
        dataIndex: 'status',
        width: 120,
        valueEnum: statusValueEnum,
        render: (_, record) => <StatusTag domain="reviewPublish" value={record.status} />,
      },
      {
        title: '版本',
        dataIndex: 'version',
        width: 90,
        search: false,
      },
      {
        title: '更新人',
        dataIndex: 'updatedBy',
        width: 120,
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
        width: 300,
        render: (_, record) => {
          const isEditable = editableStatuses.includes(record.status);
          return (
            <Space size={4} wrap>
              <Button
                type="link"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => history.push(`/writing-translation/topics/${record.id}`)}
              >
                查看
              </Button>
              {canEdit && isEditable ? (
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => history.push(`/writing-translation/topics/${record.id}/edit`)}
                >
                  编辑
                </Button>
              ) : null}
              {canCreate && record.status === 'published' ? (
                <Button
                  type="link"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => copyDraft(record)}
                >
                  创建新草稿
                </Button>
              ) : null}
              <Button
                type="link"
                size="small"
                icon={<SafetyCertificateOutlined />}
                onClick={() => runPrecheck(record)}
              >
                预校验
              </Button>
              <Button
                type="link"
                size="small"
                onClick={() => runSampleValidation(record)}
              >
                样例校验
              </Button>
              {canSubmit && isEditable ? (
                <Button
                  type="link"
                  size="small"
                  icon={<SendOutlined />}
                  onClick={() => submitReview(record)}
                >
                  提交审核
                </Button>
              ) : null}
              {record.reviewTaskId ? (
                <Button
                  type="link"
                  size="small"
                  onClick={() =>
                    history.push(
                      `/review-release/pending?keyword=${record.reviewTaskId}`,
                    )
                  }
                >
                  审核任务
                </Button>
              ) : null}
            </Space>
          );
        },
      },
    ],
    [canCreate, canEdit, canSubmit, modal, message],
  );

  const tabItems = [
    { key: 'writing', label: '写作题目' },
    { key: 'translation', label: '翻译题目' },
  ];

  return (
    <PageContainer>
      <Tabs
        activeKey={activeKey}
        items={tabItems}
        onChange={(key) => {
          const nextKey = key as API.WritingTranslationTopicType;
          setActiveKey(nextKey);
          setSearchParams({ topicType: nextKey });
          actionRef.current?.reloadAndRest?.();
        }}
      />
      <ProTable<API.WritingTranslationTopic, API.WritingTranslationTopicQueryParams>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 1880 }}
        pagination={{ defaultPageSize: 20, showSizeChanger: true, pageSizeOptions: [20, 50, 100] }}
        search={{ labelWidth: 96, defaultCollapsed: false }}
        request={async (params) => {
          const response = await writingTranslationTopics({
            ...params,
            topicType: activeKey,
          });
          return {
            data: response.data ?? [],
            total: response.total ?? 0,
            success: response.success !== false,
          };
        }}
        toolbar={{
          actions: [
            <Button key="reload" icon={<ReloadOutlined />} onClick={reload}>
              刷新
            </Button>,
            <PermissionButton
              key="create"
              moduleKey="writingTranslation"
              action="create"
              type="primary"
              icon={<PlusOutlined />}
              onClick={() =>
                history.push(`/writing-translation/topics/new?topicType=${activeKey}`)
              }
            >
              新增{topicTypeText[activeKey]}
            </PermissionButton>,
          ],
        }}
        tableAlertRender={false}
        options={{ density: true, fullScreen: true, reload: true, setting: true }}
      />
      {roleId === 'ai_operator' ? (
        <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
          AI 策略运营在本模块仅可查看题目和 AI 策略关联，修改策略请回到 AI 陪练管理。
        </Typography.Paragraph>
      ) : null}
    </PageContainer>
  );
};

export default WritingTranslationTopicsPage;
