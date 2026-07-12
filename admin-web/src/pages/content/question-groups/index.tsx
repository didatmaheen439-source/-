import { CopyOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useModel } from '@umijs/max';
import { App, Button, Popconfirm, Space, Tag, Tooltip, Typography } from 'antd';
import type React from 'react';
import { useRef, useState } from 'react';
import StatusTag from '@/components/StatusTag';
import {
  contentQuestionGroups,
  copyContentQuestionGroup,
  submitContentQuestionGroupReview,
} from '@/services/ant-design-pro/api';
import {
  audienceOptions,
  editableQuestionGroupStatuses,
  examTypeOptions,
  getOptionLabel,
  questionSkillOptions,
  reviewStatusOptions,
  toValueEnum,
} from './constants';

const QuestionGroupListPage: React.FC = () => {
  const { message } = App.useApp();
  const { initialState } = useModel('@@initialState');
  const roleId = initialState?.currentUser?.roleId;
  const canWrite = ['super_admin', 'teaching_reviewer'].includes(roleId ?? '');
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [pendingId, setPendingId] = useState<string>();

  const submit = async (record: API.QuestionGroupItem) => {
    setPendingId(record.id);
    try {
      await submitContentQuestionGroupReview(record.id, {
        changeSummary: record.changeSummary || '提交题组审核。',
        dataVersion: record.dataVersion,
      });
      message.success('已提交审核');
      actionRef.current?.reload();
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '提交审核失败');
    } finally {
      setPendingId(undefined);
    }
  };

  const copy = async (record: API.QuestionGroupItem) => {
    setPendingId(record.id);
    try {
      const response = await copyContentQuestionGroup(record.id);
      message.success('已复制为新草稿');
      history.push(`/content/question-groups/${response.data.id}/edit`);
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '复制失败');
    } finally {
      setPendingId(undefined);
    }
  };

  const columns: ProColumns<API.QuestionGroupItem>[] = [
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '题组 ID、名称或说明' } },
    {
      title: '题组名称', dataIndex: 'name', search: false, width: 240, fixed: 'left',
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Button type="link" size="small" onClick={() => history.push(`/content/question-groups/${record.id}`)}>{record.name}</Button>
          <Typography.Text type="secondary" copyable>{record.id}</Typography.Text>
        </Space>
      ),
    },
    { title: '考试类型', dataIndex: 'examType', width: 110, valueEnum: toValueEnum(examTypeOptions), renderText: (value) => getOptionLabel(examTypeOptions, value) },
    { title: '学习模块', dataIndex: 'skill', width: 110, valueEnum: toValueEnum(questionSkillOptions), renderText: (value) => getOptionLabel(questionSkillOptions, value) },
    {
      title: '适用人群', dataIndex: 'audienceTag', width: 230,
      valueEnum: toValueEnum(audienceOptions),
      render: (_, record) => <Space wrap size={[4, 4]}>{record.audienceTags.map((tag) => <Tag key={tag}>{getOptionLabel(audienceOptions, tag)}</Tag>)}</Space>,
    },
    { title: '题目数', dataIndex: 'members', search: false, width: 90, renderText: (_, record) => record.members.length },
    { title: '预计用时', dataIndex: 'estimatedMinutes', search: false, width: 100, renderText: (value) => `${value} 分钟` },
    { title: '状态', dataIndex: 'status', width: 110, valueEnum: toValueEnum(reviewStatusOptions), render: (_, record) => <StatusTag domain="reviewPublish" value={record.status} /> },
    { title: '版本', dataIndex: 'version', search: false, width: 80 },
    { title: '更新人', dataIndex: 'updatedBy', search: false, width: 110 },
    { title: '更新时间', dataIndex: 'updatedAt', search: false, width: 170 },
    {
      title: '操作', valueType: 'option', fixed: 'right', width: 260,
      render: (_, record) => (
        <Space size={0}>
          <Button type="link" size="small" onClick={() => history.push(`/content/question-groups/${record.id}`)}>查看</Button>
          {canWrite && editableQuestionGroupStatuses.includes(record.status) ? <Button type="link" size="small" onClick={() => history.push(`/content/question-groups/${record.id}/edit`)}>编辑</Button> : null}
          {canWrite ? <Button type="link" size="small" icon={<CopyOutlined />} loading={pendingId === record.id} onClick={() => copy(record)}>复制</Button> : null}
          {canWrite && editableQuestionGroupStatuses.includes(record.status) ? (
            <Popconfirm title="确认提交审核？" description="提交前将重新校验题目状态、重复项、考试类型和学习模块。" onConfirm={() => submit(record)}>
              <Button type="link" size="small" loading={pendingId === record.id}>提交审核</Button>
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title="题组管理">
      <ProTable<API.QuestionGroupItem>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        scroll={{ x: 1600 }}
        pagination={{ pageSize: 20 }}
        request={async (params) => {
          const response = await contentQuestionGroups(params);
          return { data: response.data ?? [], total: response.total ?? 0, success: response.success };
        }}
        toolbar={{
          title: '题组列表',
          actions: [
            <Tooltip key="reload" title="刷新列表"><Button icon={<ReloadOutlined />} onClick={() => actionRef.current?.reload()} /></Tooltip>,
            canWrite ? <Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => history.push('/content/question-groups/new')}>新增题组</Button> : null,
          ].filter(Boolean),
        }}
      />
    </PageContainer>
  );
};

export default QuestionGroupListPage;
