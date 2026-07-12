import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined } from '@ant-design/icons';
import { PageContainer, ProForm, ProFormDigit, ProFormSelect, ProFormText, ProFormTextArea } from '@ant-design/pro-components';
import { history, useModel, useParams } from '@umijs/max';
import { App, Alert, Button, Descriptions, Form, Result, Skeleton, Space, Table, Typography } from 'antd';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import StatusTag from '@/components/StatusTag';
import {
  availableQuestionGroupQuestions,
  contentQuestionGroupDetail,
  createContentQuestionGroup,
  submitContentQuestionGroupReview,
  updateContentQuestionGroup,
} from '@/services/ant-design-pro/api';
import { audienceOptions, editableQuestionGroupStatuses, examTypeOptions, getOptionLabel, questionDifficultyOptions, questionSkillOptions, questionTypeOptions } from '../constants';

type FormValues = Omit<API.QuestionGroupSaveParams, 'questionIds' | 'dataVersion'>;

const QuestionGroupEditPage: React.FC = () => {
  const { message } = App.useApp();
  const { id } = useParams<{ id?: string }>();
  const isCreate = !id;
  const { initialState } = useModel('@@initialState');
  const roleId = initialState?.currentUser?.roleId;
  const canWrite = ['super_admin', 'teaching_reviewer'].includes(roleId ?? '');
  const [form] = Form.useForm<FormValues>();
  const examType = Form.useWatch('examType', form);
  const skill = Form.useWatch('skill', form);
  const [group, setGroup] = useState<API.QuestionGroupItem>();
  const [questions, setQuestions] = useState<API.QuestionItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    contentQuestionGroupDetail(id).then((response) => {
      const item = response.data;
      setGroup(item);
      setSelectedIds(item.members.map((member) => member.questionId));
      form.setFieldsValue({ name: item.name, description: item.description, examType: item.examType, skill: item.skill, audienceTags: item.audienceTags, estimatedMinutes: item.estimatedMinutes, changeSummary: item.changeSummary, impactScope: item.impactScope });
    }).catch((error: any) => {
      if (error?.data?.errorCode === '404') setNotFound(true);
      else message.error(error?.data?.errorMessage || error?.message || '题组加载失败');
    }).finally(() => setLoading(false));
  }, [form, id, message]);

  useEffect(() => {
    if (!examType || !skill) {
      setQuestions([]);
      return;
    }
    availableQuestionGroupQuestions({ examType, skill, current: 1, pageSize: 200 }).then((response) => setQuestions(response.data ?? [])).catch(() => message.error('可选题目加载失败'));
  }, [examType, message, skill]);

  const questionMap = useMemo(() => new Map([...questions, ...(group?.members ?? []).map((member) => ({ id: member.questionId, title: member.questionTitle, version: member.questionVersion, questionType: member.questionType, difficulty: member.difficulty } as API.QuestionItem))].map((item) => [item.id, item])), [group, questions]);
  const selectedQuestions = selectedIds.map((questionId) => questionMap.get(questionId)).filter(Boolean) as API.QuestionItem[];
  const canEdit = canWrite && (isCreate || Boolean(group && editableQuestionGroupStatuses.includes(group.status)));

  const move = (index: number, offset: number) => {
    const target = index + offset;
    if (target < 0 || target >= selectedIds.length) return;
    const next = [...selectedIds];
    [next[index], next[target]] = [next[target], next[index]];
    setSelectedIds(next);
  };

  const save = async (submitAfterSave: boolean) => {
    const values = await form.validateFields();
    if (!selectedIds.length) {
      message.error('请至少选择一道已发布题目');
      return;
    }
    setSaving(true);
    try {
      const payload: API.QuestionGroupSaveParams = { ...values, questionIds: selectedIds, dataVersion: group?.dataVersion };
      const response = isCreate ? await createContentQuestionGroup(payload) : await updateContentQuestionGroup(id, payload);
      const saved = response.data;
      if (submitAfterSave) {
        await submitContentQuestionGroupReview(saved.id, { changeSummary: values.changeSummary?.trim() || '提交题组审核。', dataVersion: saved.dataVersion });
        message.success('题组已保存并提交审核');
      } else {
        message.success('题组草稿已保存');
      }
      history.push(`/content/question-groups/${saved.id}`);
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageContainer title="编辑题组"><Skeleton active paragraph={{ rows: 10 }} /></PageContainer>;
  if (notFound) return <PageContainer title="编辑题组"><Result status="404" title="题组不存在" extra={<Button onClick={() => history.push('/content/question-groups')}>返回列表</Button>} /></PageContainer>;
  if (!canEdit) return <PageContainer title={isCreate ? '新增题组' : '编辑题组'}><Result status="403" title="当前账号无权编辑该题组" extra={<Button onClick={() => history.push('/content/question-groups')}>返回列表</Button>} /></PageContainer>;

  return (
    <PageContainer title={isCreate ? '新增题组' : '编辑题组'}>
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        {group ? <Descriptions bordered size="small" column={4} items={[{ key: 'id', label: '题组 ID', children: group.id }, { key: 'status', label: '状态', children: <StatusTag domain="reviewPublish" value={group.status} /> }, { key: 'version', label: '版本', children: group.version }, { key: 'updatedAt', label: '更新时间', children: group.updatedAt }]} /> : null}
        <ProForm<FormValues>
          form={form}
          layout="vertical"
          requiredMark={false}
          initialValues={{ examType: 'CET4', skill: 'reading', audienceTags: ['foundation'], estimatedMinutes: 20 }}
          onValuesChange={(changed) => {
            if ('examType' in changed || 'skill' in changed) setSelectedIds([]);
          }}
          submitter={{ render: () => [<Button key="cancel" onClick={() => history.push('/content/question-groups')}>取消</Button>, <Button key="save" loading={saving} onClick={() => save(false)}>保存草稿</Button>, <Button key="submit" type="primary" loading={saving} onClick={() => save(true)}>保存并提交审核</Button>] }}
        >
          <ProForm.Group>
            <ProFormText name="name" label="题组名称" width="lg" rules={[{ required: true, message: '请输入题组名称' }]} fieldProps={{ maxLength: 50, showCount: true }} />
            <ProFormDigit name="estimatedMinutes" label="预计用时（分钟）" width="sm" min={1} max={300} rules={[{ required: true }]} />
          </ProForm.Group>
          <ProFormTextArea name="description" label="题组说明" rules={[{ required: true, message: '请输入题组说明' }]} fieldProps={{ rows: 2, maxLength: 200, showCount: true }} />
          <ProForm.Group>
            <ProFormSelect name="examType" label="考试类型" width="sm" options={examTypeOptions} rules={[{ required: true }]} />
            <ProFormSelect name="skill" label="学习模块" width="sm" options={questionSkillOptions} rules={[{ required: true }]} />
            <ProFormSelect name="audienceTags" label="适用人群" width="lg" mode="multiple" options={audienceOptions} rules={[{ required: true, message: '至少选择一个适用人群' }]} />
          </ProForm.Group>
          <Typography.Title level={5}>选择已发布题目</Typography.Title>
          <Table<API.QuestionItem>
            size="small" rowKey="id" pagination={{ pageSize: 8 }} dataSource={questions}
            rowSelection={{ selectedRowKeys: selectedIds, preserveSelectedRowKeys: true, onChange: (keys) => setSelectedIds(keys.map(String)) }}
            columns={[{ title: '题目', dataIndex: 'title', ellipsis: true }, { title: '题型', dataIndex: 'questionType', width: 110, render: (value) => getOptionLabel(questionTypeOptions, value) }, { title: '难度', dataIndex: 'difficulty', width: 90, render: (value) => getOptionLabel(questionDifficultyOptions, value) }, { title: '版本', dataIndex: 'version', width: 80 }]}
          />
          <Typography.Title level={5}>编排顺序（{selectedIds.length} 题）</Typography.Title>
          {!selectedIds.length ? <Alert type="info" showIcon title="尚未选择题目" /> : (
            <Table<API.QuestionItem> size="small" rowKey="id" pagination={false} dataSource={selectedQuestions} columns={[
              { title: '顺序', width: 70, render: (_, __, index) => index + 1 },
              { title: '题目', dataIndex: 'title', ellipsis: true },
              { title: '操作', width: 150, render: (_, __, index) => <Space><Button aria-label="上移" icon={<ArrowUpOutlined />} disabled={index === 0} onClick={() => move(index, -1)} /><Button aria-label="下移" icon={<ArrowDownOutlined />} disabled={index === selectedIds.length - 1} onClick={() => move(index, 1)} /><Button aria-label="移除" danger icon={<DeleteOutlined />} onClick={() => setSelectedIds((ids) => ids.filter((_, current) => current !== index))} /></Space> },
            ]} />
          )}
          <ProFormTextArea name="changeSummary" label="变更说明" rules={[{ required: true, message: '请输入变更说明' }]} fieldProps={{ rows: 2, maxLength: 200, showCount: true }} />
          <ProFormTextArea name="impactScope" label="影响范围说明" fieldProps={{ rows: 2, maxLength: 200, showCount: true }} />
        </ProForm>
      </Space>
    </PageContainer>
  );
};

export default QuestionGroupEditPage;
