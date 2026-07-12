import { ArrowLeftOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useModel, useParams } from '@umijs/max';
import { App, Alert, Button, Descriptions, Popconfirm, Result, Skeleton, Space, Table, Tabs, Tag, Timeline, Typography } from 'antd';
import type React from 'react';
import { useEffect, useState } from 'react';
import StatusTag from '@/components/StatusTag';
import { contentQuestionGroupDetail, contentQuestionGroupImpact, precheckContentQuestionGroup, submitContentQuestionGroupReview } from '@/services/ant-design-pro/api';
import { audienceOptions, editableQuestionGroupStatuses, examTypeOptions, getOptionLabel, questionDifficultyOptions, questionSkillOptions, questionTypeOptions } from '../constants';

const QuestionGroupDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { message } = App.useApp();
  const { initialState } = useModel('@@initialState');
  const canWrite = ['super_admin', 'teaching_reviewer'].includes(initialState?.currentUser?.roleId ?? '');
  const [group, setGroup] = useState<API.QuestionGroupItem>();
  const [impact, setImpact] = useState<API.QuestionGroupImpact>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [detailResponse, impactResponse] = await Promise.all([contentQuestionGroupDetail(id), contentQuestionGroupImpact(id)]);
      setGroup(detailResponse.data);
      setImpact(impactResponse.data);
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '题组加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const submit = async () => {
    if (!group) return;
    setSubmitting(true);
    try {
      const checked = await precheckContentQuestionGroup(group.id);
      if (!checked.data.passed) {
        setGroup({ ...group, lastPrecheck: checked.data });
        message.error('题组校验未通过');
        return;
      }
      await submitContentQuestionGroupReview(group.id, { changeSummary: group.changeSummary || '提交题组审核。', dataVersion: group.dataVersion });
      message.success('已提交审核');
      await load();
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '提交审核失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageContainer title="题组详情"><Skeleton active paragraph={{ rows: 10 }} /></PageContainer>;
  if (!group) return <PageContainer title="题组详情"><Result status="404" title="题组不存在" extra={<Button onClick={() => history.push('/content/question-groups')}>返回列表</Button>} /></PageContainer>;

  const editable = canWrite && editableQuestionGroupStatuses.includes(group.status);
  return (
    <PageContainer
      title="题组详情"
      extra={[
        <Button key="back" icon={<ArrowLeftOutlined />} onClick={() => history.push('/content/question-groups')}>返回</Button>,
        editable ? <Button key="edit" onClick={() => history.push(`/content/question-groups/${group.id}/edit`)}>编辑</Button> : null,
        editable ? <Popconfirm key="submit" title="确认提交审核？" description="系统将重新校验题目状态、重复项、考试类型和学习模块。" onConfirm={submit}><Button type="primary" loading={submitting}>提交审核</Button></Popconfirm> : null,
        group.reviewTaskId ? <Button key="review" onClick={() => history.push(`/review-release/pending?keyword=${group.reviewTaskId}`)}>审核任务</Button> : null,
      ].filter(Boolean)}
    >
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Descriptions bordered size="small" column={3} items={[
          { key: 'id', label: '题组 ID', children: group.id }, { key: 'status', label: '状态', children: <StatusTag domain="reviewPublish" value={group.status} /> }, { key: 'version', label: '版本', children: group.version },
          { key: 'exam', label: '考试类型', children: getOptionLabel(examTypeOptions, group.examType) }, { key: 'skill', label: '学习模块', children: getOptionLabel(questionSkillOptions, group.skill) }, { key: 'minutes', label: '预计用时', children: `${group.estimatedMinutes} 分钟` },
          { key: 'audience', label: '适用人群', span: 2, children: <Space wrap>{group.audienceTags.map((tag) => <Tag key={tag}>{getOptionLabel(audienceOptions, tag)}</Tag>)}</Space> }, { key: 'updated', label: '更新时间', children: group.updatedAt },
          { key: 'description', label: '题组说明', span: 3, children: group.description },
        ]} />
        {group.lastPrecheck ? <Alert showIcon type={group.lastPrecheck.passed ? 'success' : 'error'} title={group.lastPrecheck.summary} description={group.lastPrecheck.issues.map((issue) => issue.message).join('；')} /> : null}
        <Tabs items={[
          { key: 'questions', label: `题目编排（${group.members.length}）`, children: <Table rowKey="questionId" size="small" pagination={false} dataSource={group.members} columns={[{ title: '顺序', dataIndex: 'order', width: 70 }, { title: '题目', dataIndex: 'questionTitle' }, { title: '题型', dataIndex: 'questionType', width: 110, render: (value) => getOptionLabel(questionTypeOptions, value) }, { title: '难度', dataIndex: 'difficulty', width: 90, render: (value) => getOptionLabel(questionDifficultyOptions, value) }, { title: '快照版本', dataIndex: 'questionVersion', width: 100 }]} /> },
          { key: 'impact', label: `引用影响（${impact?.total ?? 0}）`, children: impact?.total ? <Table rowKey={(item) => `${item.source}-${item.objectId}`} size="small" pagination={false} dataSource={impact.items} columns={[{ title: '来源', dataIndex: 'source', width: 120, render: (value) => value === 'learning_path' ? '学习路径' : '模考试卷' }, { title: '对象', dataIndex: 'objectName' }, { title: '对象 ID', dataIndex: 'objectId' }, { title: '状态', dataIndex: 'status', render: (value) => <StatusTag domain="reviewPublish" value={value} /> }]} /> : <Alert showIcon type="info" title="当前没有下游引用" /> },
          { key: 'versions', label: '版本记录', children: <Timeline items={group.versionRecords.map((record) => ({ children: <Space orientation="vertical" size={0}><Typography.Text strong>{record.version} · {record.summary}</Typography.Text><Typography.Text type="secondary">{record.createdBy} · {record.createdAt}</Typography.Text></Space> }))} /> },
          { key: 'operations', label: '操作记录', children: <Timeline items={group.operationRecords.map((record) => ({ children: <Space orientation="vertical" size={0}><Typography.Text strong>{record.action}</Typography.Text><Typography.Text>{record.reason}</Typography.Text><Typography.Text type="secondary">{record.operator} · {record.time}</Typography.Text></Space> }))} /> },
        ]} />
      </Space>
    </PageContainer>
  );
};

export default QuestionGroupDetailPage;
