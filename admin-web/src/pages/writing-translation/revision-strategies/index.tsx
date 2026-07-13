import {
  CopyOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  ModalForm,
  PageContainer,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProTable,
} from '@ant-design/pro-components';
import { history, useModel, useSearchParams } from '@umijs/max';
import { Alert, App, Button, Descriptions, Drawer, Empty, Space, Table, Tabs, Tag, Typography } from 'antd';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import StatusTag from '@/components/StatusTag';
import {
  copyWritingRevisionStrategy,
  createWritingRevisionStrategy,
  precheckWritingRevisionStrategy,
  runWritingRevisionMockSubmission,
  submitWritingRevisionStrategyReview,
  updateWritingRevisionStrategy,
  writingRevisionEffects,
  writingRevisionMockRecords,
  writingRevisionStrategies,
  writingRevisionStrategy,
  writingRevisionStrategyMockRecords,
  writingTranslationTemplates,
  writingTranslationTopics,
} from '@/services/ant-design-pro/api';

type TabKey = 'strategies' | 'mock' | 'effects';
type RevisionFormValues = {
  name: string;
  description?: string;
  topicTypes: API.WritingTranslationTopicType[];
  examTypes: API.ExamType[];
  scoringTemplateId: string;
  feedbackTemplateId: string;
  scoreBelow?: number;
  dimensionKey?: string;
  dimensionName?: string;
  dimensionThreshold?: number;
  issueTags?: string[];
  feedbackSectionKeys?: string[];
  focus: string;
  minChangedWords: number;
  mustAddressIssueTags?: string[];
  responseFormat: string;
  deadlineMinutes: number;
  promptMode: API.RevisionPromptMode;
  promptTemplate: string;
  changeSummary: string;
};

const statusEnum = { draft: { text: '草稿' }, pending_review: { text: '待审核' }, rejected: { text: '已驳回' }, approved: { text: '已通过' }, pending_publish: { text: '待发布' }, published: { text: '已发布' }, offline: { text: '已下架' }, rolled_back: { text: '已回滚' } };
const promptModeText: Record<API.RevisionPromptMode, string> = { inline_hint: '页面内提示', ai_guided: 'AI 引导提示', strong_reminder: '强提醒' };
const issueOptions = [
  { label: '语言准确性', value: 'language_accuracy' },
  { label: '逻辑断点', value: 'logic_gap' },
  { label: '要点遗漏', value: 'missing_key_point' },
  { label: '结构松散', value: 'structure_weak' },
];
const feedbackSectionOptions = [
  { label: '主要问题', value: 'issues' },
  { label: '修改建议', value: 'revision' },
  { label: '分维度反馈', value: 'dimensions' },
];

const flattenStrategy = (strategy?: API.WritingRevisionStrategy, activeTemplates?: API.WritingTranslationTemplate[]): Partial<RevisionFormValues> => {
  if (!strategy) {
    const scoring = activeTemplates?.find((item) => item.templateType === 'scoring_template' && item.status === 'published');
    const feedback = activeTemplates?.find((item) => item.templateType === 'feedback_template' && item.status === 'published');
    return {
      topicTypes: ['writing'],
      examTypes: ['CET4'],
      scoringTemplateId: scoring?.id,
      feedbackTemplateId: feedback?.id,
      scoreBelow: 38,
      dimensionKey: 'language',
      dimensionName: '语言准确性',
      dimensionThreshold: 13,
      issueTags: ['language_accuracy'],
      feedbackSectionKeys: ['issues', 'revision'],
      focus: '优先修改语言错误和逻辑断点，保留原有观点。',
      minChangedWords: 30,
      mustAddressIssueTags: ['language_accuracy'],
      responseFormat: '按“我修改了什么 / 为什么这样改”提交。',
      deadlineMinutes: 30,
      promptMode: 'ai_guided',
      promptTemplate: '请先定位最高优先级问题，再要求学生完成一次最小修改，不提供完整代写。',
      changeSummary: '创建二改策略草稿。',
    };
  }
  const dimension = strategy.triggerCondition.dimensionScoreBelow?.[0];
  return {
    ...strategy,
    scoringTemplateId: strategy.scoringTemplateRef.templateId,
    feedbackTemplateId: strategy.feedbackTemplateRef.templateId,
    scoreBelow: strategy.triggerCondition.scoreBelow,
    dimensionKey: dimension?.dimensionKey,
    dimensionName: dimension?.dimensionName,
    dimensionThreshold: dimension?.threshold,
    issueTags: strategy.triggerCondition.issueTags,
    feedbackSectionKeys: strategy.triggerCondition.feedbackSectionKeys,
    focus: strategy.requirement.focus,
    minChangedWords: strategy.requirement.minChangedWords,
    mustAddressIssueTags: strategy.requirement.mustAddressIssueTags,
    responseFormat: strategy.requirement.responseFormat,
    deadlineMinutes: strategy.requirement.deadlineMinutes,
  };
};

const buildPayload = (values: RevisionFormValues, dataVersion?: number): API.WritingRevisionStrategySaveParams => ({
  name: values.name,
  description: values.description,
  topicTypes: values.topicTypes,
  examTypes: values.examTypes,
  scoringTemplateId: values.scoringTemplateId,
  feedbackTemplateId: values.feedbackTemplateId,
  triggerCondition: {
    scoreBelow: values.scoreBelow,
    dimensionScoreBelow: values.dimensionKey && values.dimensionThreshold !== undefined ? [{ dimensionKey: values.dimensionKey, dimensionName: values.dimensionName || values.dimensionKey, threshold: values.dimensionThreshold }] : [],
    issueTags: values.issueTags ?? [],
    feedbackSectionKeys: values.feedbackSectionKeys ?? [],
  },
  requirement: {
    focus: values.focus,
    minChangedWords: values.minChangedWords,
    mustAddressIssueTags: values.mustAddressIssueTags ?? [],
    responseFormat: values.responseFormat,
    deadlineMinutes: values.deadlineMinutes,
  },
  promptMode: values.promptMode,
  promptTemplate: values.promptTemplate,
  changeSummary: values.changeSummary,
  dataVersion,
});

const RevisionStrategiesPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const mockActionRef = useRef<ActionType | undefined>(undefined);
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>((searchParams.get('tab') as TabKey) || 'strategies');
  const [detail, setDetail] = useState<API.WritingRevisionStrategy>();
  const [editing, setEditing] = useState<API.WritingRevisionStrategy | 'new'>();
  const [templates, setTemplates] = useState<API.WritingTranslationTemplate[]>([]);
  const [topics, setTopics] = useState<API.WritingTranslationTopic[]>([]);
  const [mockRecords, setMockRecords] = useState<API.MockRevisionRecord[]>([]);
  const [effects, setEffects] = useState<Array<API.RevisionEffectSummary & { strategyId: string; strategyName: string; version: string }>>([]);
  const { initialState } = useModel('@@initialState');
  const roleId = initialState?.currentUser?.roleId;
  const canManage = roleId === 'super_admin' || roleId === 'teaching_reviewer' || roleId === 'ai_operator';

  const loadReferences = async (strategy: API.WritingRevisionStrategy) => {
    const response = await writingRevisionStrategyMockRecords(strategy.id);
    setMockRecords(response.data ?? []);
  };
  const loadEffects = async () => {
    const response = await writingRevisionEffects();
    setEffects(response.data ?? []);
  };
  useEffect(() => {
    writingTranslationTemplates({ current: 1, pageSize: 200 }).then((res) => setTemplates(res.data ?? []));
    writingTranslationTopics({ current: 1, pageSize: 200 }).then((res) => setTopics(res.data ?? []));
    loadEffects();
  }, []);

  const openDetail = async (record: API.WritingRevisionStrategy) => {
    const response = await writingRevisionStrategy(record.id);
    if (response.data) {
      setDetail(response.data);
      loadReferences(response.data);
    }
  };
  const precheck = async (record: API.WritingRevisionStrategy) => {
    try {
      const response = await precheckWritingRevisionStrategy(record.id);
      const result = response.data;
      if (!result) return;
      modal.info({
        title: result.level === 'passed' ? '预校验通过' : '预校验结果',
        width: 720,
        content: <Space orientation="vertical" size={8}>
          <Typography.Text>{result.summary}</Typography.Text>
          {result.issues.map((item) => <Tag key={item.id} color={item.level === 'error' ? 'error' : 'warning'}>{item.code}：{item.message}</Tag>)}
        </Space>,
      });
      actionRef.current?.reload();
    } catch (error: any) {
      message.error(error?.data?.errorMessage || '预校验失败');
    }
  };
  const submitReview = async (record: API.WritingRevisionStrategy) => {
    try {
      await submitWritingRevisionStrategyReview(record.id, { dataVersion: record.dataVersion, changeSummary: record.changeSummary || '提交二改策略审核。' });
      message.success('已提交审核');
      actionRef.current?.reload();
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '提交失败');
    }
  };
  const copyVersion = async (record: API.WritingRevisionStrategy) => {
    try {
      const response = await copyWritingRevisionStrategy(record.id);
      if (response.data) {
        setEditing(response.data);
        message.success('已创建新草稿版本');
        actionRef.current?.reload();
      }
    } catch (error: any) {
      message.error(error?.data?.errorMessage || '复制失败');
    }
  };
  const runMock = async (strategyId: string, action: 'submit' | 'skip' = 'submit') => {
    try {
      const response = await runWritingRevisionMockSubmission({ strategyId, topicId: topics[0]?.id, action });
      if (response.data) {
        message.success(`Mock 二改${response.data.status === 'skipped' ? '跳过' : '提交'}已记录`);
        setMockRecords((prev) => [response.data as API.MockRevisionRecord, ...prev.filter((item) => item.id !== response.data?.id)]);
        actionRef.current?.reload();
        mockActionRef.current?.reload();
        loadEffects();
        if (detail?.id === strategyId) loadReferences(detail);
      }
    } catch (error: any) {
      message.error(error?.data?.errorMessage || 'Mock 提交失败');
    }
  };

  const columns = useMemo<ProColumns<API.WritingRevisionStrategy>[]>(() => [
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '策略 ID、名称或说明' } },
    { title: '策略名称', dataIndex: 'name', width: 260, render: (_, record) => <Button type="link" size="small" onClick={() => openDetail(record)}>{record.name}</Button> },
    { title: '适用题型', dataIndex: 'topicType', width: 130, valueEnum: { writing: { text: '写作' }, translation: { text: '翻译' } }, render: (_, record) => <Space size={4}>{record.topicTypes.map((item) => <Tag key={item}>{item === 'writing' ? '写作' : '翻译'}</Tag>)}</Space> },
    { title: '考试类型', dataIndex: 'examType', width: 130, valueEnum: { CET4: { text: 'CET4' }, CET6: { text: 'CET6' } }, render: (_, record) => record.examTypes.join(' / ') },
    { title: '触发条件', search: false, width: 240, render: (_, record) => <Space orientation="vertical" size={0}><span>总分低于 {record.triggerCondition.scoreBelow ?? '-'}</span><span>{record.triggerCondition.issueTags?.join(' / ') || '未配置标签'}</span></Space> },
    { title: '提示方式', dataIndex: 'promptMode', search: false, width: 120, render: (_, record) => promptModeText[record.promptMode] },
    { title: '状态', dataIndex: 'status', width: 110, valueEnum: statusEnum, render: (_, record) => <StatusTag domain="reviewPublish" value={record.status} /> },
    { title: '版本', dataIndex: 'version', search: false, width: 90 },
    { title: '二改率', search: false, width: 100, render: (_, record) => `${record.effectSummary.revisionRate}%` },
    { title: '更新时间', dataIndex: 'updatedAt', search: false, width: 170 },
    { title: '操作', valueType: 'option', fixed: 'right', width: 340, render: (_, record) => <Space size={0}>
      <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>查看</Button>
      {canManage && ['draft', 'rejected'].includes(record.status) ? <Button type="link" size="small" icon={<EditOutlined />} onClick={() => setEditing(record)}>编辑</Button> : null}
      <Button type="link" size="small" icon={<SafetyCertificateOutlined />} onClick={() => precheck(record)}>预校验</Button>
      {canManage && ['draft', 'rejected'].includes(record.status) ? <Button type="link" size="small" icon={<SendOutlined />} onClick={() => submitReview(record)}>提交审核</Button> : null}
      {canManage && ['published', 'offline', 'rolled_back'].includes(record.status) ? <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => copyVersion(record)}>复制版本</Button> : null}
      {record.status === 'published' ? <Button type="link" size="small" onClick={() => runMock(record.id)}>Mock 触发</Button> : null}
    </Space> },
  ], [canManage, topics]);

  const currentEditing = editing === 'new' ? undefined : editing;
  const formInitialValues = flattenStrategy(currentEditing, templates);
  const publishedScoring = templates.filter((item) => item.templateType === 'scoring_template' && item.status === 'published').map((item) => ({ label: `${item.name} / ${item.version}`, value: item.id }));
  const publishedFeedback = templates.filter((item) => item.templateType === 'feedback_template' && item.status === 'published').map((item) => ({ label: `${item.name} / ${item.version}`, value: item.id }));

  return <PageContainer title="二次修改策略">
    <Tabs activeKey={activeTab} onChange={(key) => { const tab = key as TabKey; setActiveTab(tab); history.replace(`/writing-translation/revision-strategies?tab=${tab}`); }} items={[
      { key: 'strategies', label: '策略列表' },
      { key: 'mock', label: 'Mock 触发记录' },
      { key: 'effects', label: '效果汇总' },
    ]} />

    {activeTab === 'strategies' ? <ProTable<API.WritingRevisionStrategy> actionRef={actionRef} rowKey="id" columns={columns} scroll={{ x: 1600 }} search={{ labelWidth: 80, defaultCollapsed: false }} request={async (params) => {
      const result = await writingRevisionStrategies(params as API.WritingRevisionStrategyQueryParams);
      return { data: result.data ?? [], total: result.total, success: result.success };
    }} toolbar={{ actions: canManage ? [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => setEditing('new')}>新建二改策略</Button>] : [] }} /> : null}

    {activeTab === 'mock' ? <ProTable<API.MockRevisionRecord> actionRef={mockActionRef} rowKey="id" search={false} scroll={{ x: 1300 }} request={async () => {
      const result = await writingRevisionMockRecords();
      setMockRecords(result.data ?? []);
      return { data: result.data ?? [], total: result.total, success: result.success };
    }} toolBarRender={() => [detail ? <Button key="refresh" onClick={() => loadReferences(detail)}>刷新当前策略记录</Button> : null].filter(Boolean) as React.ReactNode[]} columns={[
      { title: '记录 ID', dataIndex: 'id', width: 220 },
      { title: '策略', dataIndex: 'strategyName', width: 220 },
      { title: '题目', dataIndex: 'topicName', width: 220 },
      { title: '得分', dataIndex: 'score', width: 80 },
      { title: '状态', dataIndex: 'status', width: 110, render: (_, record) => <Tag color={record.status === 'revised' ? 'success' : record.status === 'skipped' ? 'warning' : 'default'}>{record.status}</Tag> },
      { title: '问题标签', dataIndex: 'issueTags', width: 180, render: (_, record) => record.issueTags.join(' / ') },
      { title: '提交时间', dataIndex: 'firstSubmittedAt', width: 170 },
    ]} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="先在策略列表点击 Mock 触发生成记录" /> }} /> : null}

    {activeTab === 'effects' ? <Table rowKey="strategyId" dataSource={effects} pagination={false} columns={[
      { title: '策略', dataIndex: 'strategyName' },
      { title: '版本', dataIndex: 'version', width: 100 },
      { title: '提交数', dataIndex: 'submissions', width: 90 },
      { title: '触发数', dataIndex: 'triggered', width: 90 },
      { title: '二改数', dataIndex: 'revised', width: 90 },
      { title: '二改率', dataIndex: 'revisionRate', width: 100, render: (value) => `${value}%` },
      { title: '完成率', dataIndex: 'completionRate', width: 100, render: (value) => `${value}%` },
      { title: '常见问题', dataIndex: 'commonIssues', render: (items: API.RevisionEffectSummary['commonIssues']) => items?.length ? items.map((item) => <Tag key={item.tag}>{item.tag} x {item.count}</Tag>) : '-' },
      { title: '更新时间', dataIndex: 'updatedAt', width: 170 },
    ]} /> : null}

    <ModalForm<RevisionFormValues> key={`${editing === 'new' ? 'new' : currentEditing?.id}-${templates.length}`} title={`${currentEditing ? '编辑' : '新建'}二改策略`} open={Boolean(editing)} initialValues={formInitialValues} modalProps={{ destroyOnHidden: true, onCancel: () => setEditing(undefined), width: 860 }} onFinish={async (values) => {
      const payload = buildPayload(values, currentEditing?.dataVersion);
      try {
        if (currentEditing) await updateWritingRevisionStrategy(currentEditing.id, payload);
        else await createWritingRevisionStrategy(payload);
        message.success('草稿已保存');
        setEditing(undefined);
        actionRef.current?.reload();
        return true;
      } catch (error: any) {
        message.error(error?.data?.errorMessage || '保存失败');
        return false;
      }
    }}>
      <ProFormText name="name" label="策略名称" rules={[{ required: true }]} />
      <ProFormText name="description" label="策略说明" />
      <ProFormSelect name="topicTypes" label="适用题型" mode="multiple" options={[{ label: '写作', value: 'writing' }, { label: '翻译', value: 'translation' }]} rules={[{ required: true }]} />
      <ProFormSelect name="examTypes" label="考试类型" mode="multiple" options={[{ label: 'CET4', value: 'CET4' }, { label: 'CET6', value: 'CET6' }]} rules={[{ required: true }]} />
      <ProFormSelect name="scoringTemplateId" label="评分模板版本" options={publishedScoring} rules={[{ required: true }]} showSearch={{ optionFilterProp: 'label' }} />
      <ProFormSelect name="feedbackTemplateId" label="反馈模板版本" options={publishedFeedback} rules={[{ required: true }]} showSearch={{ optionFilterProp: 'label' }} />
      <ProFormDigit name="scoreBelow" label="总分低于触发" min={0} max={1000} />
      <Space align="start" style={{ width: '100%' }}>
        <ProFormText name="dimensionKey" label="维度 Key" width="sm" />
        <ProFormText name="dimensionName" label="维度名称" width="sm" />
        <ProFormDigit name="dimensionThreshold" label="维度低于触发" min={0} width="sm" />
      </Space>
      <ProFormSelect name="issueTags" label="触发问题标签" mode="tags" options={issueOptions} />
      <ProFormSelect name="feedbackSectionKeys" label="触发反馈区块" mode="multiple" options={feedbackSectionOptions} />
      <ProFormTextArea name="focus" label="二改要求" rules={[{ required: true }]} fieldProps={{ rows: 2 }} />
      <ProFormDigit name="minChangedWords" label="最少修改词数" min={0} rules={[{ required: true }]} />
      <ProFormSelect name="mustAddressIssueTags" label="必须处理的问题" mode="tags" options={issueOptions} />
      <ProFormText name="responseFormat" label="提交格式" rules={[{ required: true }]} />
      <ProFormDigit name="deadlineMinutes" label="Mock 截止分钟" min={1} rules={[{ required: true }]} />
      <ProFormSelect name="promptMode" label="提示方式" options={Object.entries(promptModeText).map(([value, label]) => ({ value, label }))} rules={[{ required: true }]} />
      <ProFormTextArea name="promptTemplate" label="提示模板" rules={[{ required: true }]} fieldProps={{ rows: 3 }} />
      <ProFormText name="changeSummary" label="变更说明" rules={[{ required: true }]} />
    </ModalForm>

    <Drawer title={detail?.name} size="large" open={Boolean(detail)} onClose={() => setDetail(undefined)} extra={detail?.reviewTaskId ? <Button onClick={() => history.push(`/review-release/pending?keyword=${detail.reviewTaskId}`)}>查看审核任务</Button> : null}>
      {detail ? <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        {detail.lastPrecheck && detail.lastPrecheck.level !== 'passed' ? <Alert type="warning" showIcon title={detail.lastPrecheck.summary} /> : null}
        <Descriptions bordered size="small" column={2} items={[
          { key: 'status', label: '状态', children: <StatusTag domain="reviewPublish" value={detail.status} /> },
          { key: 'version', label: '版本', children: detail.version },
          { key: 'release', label: '发布版本', children: detail.releaseVersionId || '-' },
          { key: 'scope', label: '适用范围', children: `${detail.topicTypes.join('/')}，${detail.examTypes.join('/')}` },
          { key: 'scoring', label: '评分模板', children: `${detail.scoringTemplateRef.templateName} / ${detail.scoringTemplateRef.version}` },
          { key: 'feedback', label: '反馈模板', children: `${detail.feedbackTemplateRef.templateName} / ${detail.feedbackTemplateRef.version}` },
          { key: 'mode', label: '提示方式', children: promptModeText[detail.promptMode] },
          { key: 'time', label: '更新时间', children: detail.updatedAt },
        ]} />
        <Descriptions bordered size="small" column={1} items={[
          { key: 'trigger', label: '触发条件', children: `总分低于 ${detail.triggerCondition.scoreBelow ?? '-'}；标签 ${detail.triggerCondition.issueTags?.join(' / ') || '-'}` },
          { key: 'requirement', label: '二改要求', children: detail.requirement.focus },
          { key: 'format', label: '提交格式', children: detail.requirement.responseFormat },
          { key: 'prompt', label: '提示模板', children: detail.promptTemplate },
        ]} />
        <Table rowKey="id" size="small" pagination={false} dataSource={mockRecords} columns={[
          { title: '题目', dataIndex: 'topicName' },
          { title: '得分', dataIndex: 'score', width: 80 },
          { title: '状态', dataIndex: 'status', width: 110 },
          { title: '问题标签', dataIndex: 'issueTags', render: (_, record) => record.issueTags.join(' / ') },
          { title: '时间', dataIndex: 'firstSubmittedAt', width: 170 },
        ]} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无 Mock 二改记录" /> }} />
      </Space> : null}
    </Drawer>
  </PageContainer>;
};

export default RevisionStrategiesPage;
