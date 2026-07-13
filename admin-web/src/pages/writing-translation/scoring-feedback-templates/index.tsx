import { CopyOutlined, EditOutlined, EyeOutlined, LinkOutlined, PlusOutlined, SafetyCertificateOutlined, SendOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ModalForm, PageContainer, ProFormDigit, ProFormList, ProFormSelect, ProFormText, ProTable } from '@ant-design/pro-components';
import { history, useModel, useSearchParams } from '@umijs/max';
import { Alert, App, Button, Descriptions, Drawer, Empty, Form, Space, Table, Tabs, Tag, Typography } from 'antd';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import StatusTag from '@/components/StatusTag';
import {
  bindWritingTranslationTopicTemplates,
  copyWritingTranslationTemplate,
  createWritingTranslationTemplate,
  precheckWritingTranslationTemplate,
  runWritingTranslationMockCorrection,
  submitWritingTranslationTemplateReview,
  updateWritingTranslationTemplate,
  writingTranslationAiStrategies,
  writingTranslationTemplate,
  writingTranslationTemplateReferences,
  writingTranslationTemplates,
  writingTranslationTopicDetail,
  writingTranslationTopics,
} from '@/services/ant-design-pro/api';

const statusEnum = { draft: { text: '草稿' }, pending_review: { text: '待审核' }, rejected: { text: '已驳回' }, approved: { text: '已通过' }, pending_publish: { text: '待发布' }, published: { text: '已发布' }, offline: { text: '已下架' }, rolled_back: { text: '已回滚' } };
const typeLabel = { scoring_template: '评分维度', feedback_template: '反馈模板' } as const;
const defaultDimensions: API.ScoringDimension[] = [
  { key: 'content', name: '内容完整性', description: '覆盖题目要求。', weight: 40, maxScore: 20, order: 1, required: true, bandNotes: [], deductionRules: [], bonusRules: [] },
  { key: 'language', name: '语言准确性', description: '检查语法与表达。', weight: 35, maxScore: 18, order: 2, required: true, bandNotes: [], deductionRules: [], bonusRules: [] },
  { key: 'structure', name: '结构与逻辑', description: '检查结构与衔接。', weight: 25, maxScore: 12, order: 3, required: true, bandNotes: [], deductionRules: [], bonusRules: [] },
];
const defaultSections: API.FeedbackSection[] = [
  { key: 'overall', title: '总体评价', guidance: '概括完成质量。', required: true, order: 1 },
  { key: 'dimensions', title: '分维度反馈', guidance: '解释各维度表现。', required: true, order: 2 },
  { key: 'issues', title: '主要问题', guidance: '定位关键问题。', required: true, order: 3 },
  { key: 'revision', title: '修改建议', guidance: '提供下一步建议。', required: true, order: 4 },
];

const TemplatePage: React.FC = () => {
  const { message, modal } = App.useApp();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [searchParams] = useSearchParams();
  const [activeType, setActiveType] = useState<API.WritingTranslationTemplateType>(searchParams.get('tab') === 'feedback' ? 'feedback_template' : 'scoring_template');
  const [detail, setDetail] = useState<API.WritingTranslationTemplate>();
  const [editing, setEditing] = useState<API.WritingTranslationTemplate | 'new'>();
  const [references, setReferences] = useState<API.MockCorrectionRecord[]>([]);
  const [strategies, setStrategies] = useState<API.AiCoachStrategy[]>([]);
  const [topics, setTopics] = useState<API.WritingTranslationTopic[]>([]);
  const [templates, setTemplates] = useState<API.WritingTranslationTemplate[]>([]);
  const { initialState } = useModel('@@initialState');
  const roleId = initialState?.currentUser?.roleId;
  const canManage = roleId === 'super_admin' || (activeType === 'scoring_template' ? roleId === 'teaching_reviewer' : roleId === 'ai_operator');
  const canBind = roleId === 'super_admin' || roleId === 'teaching_reviewer';

  const loadReferences = async (item: API.WritingTranslationTemplate) => {
    const response = await writingTranslationTemplateReferences(item.id); setReferences(response.data ?? []);
  };
  useEffect(() => {
    writingTranslationAiStrategies().then((res) => setStrategies((res.data ?? []).filter((item) => item.configType === 'response_structure' && item.status === 'published')));
    writingTranslationTopics({ current: 1, pageSize: 200 }).then((res) => setTopics(res.data ?? []));
    writingTranslationTemplates({ current: 1, pageSize: 200 }).then((res) => setTemplates(res.data ?? []));
  }, []);

  const openDetail = async (record: API.WritingTranslationTemplate) => {
    const response = await writingTranslationTemplate(record.id); if (response.data) { setDetail(response.data); loadReferences(response.data); }
  };
  const submit = async (record: API.WritingTranslationTemplate) => {
    try { await submitWritingTranslationTemplateReview(record.id, { dataVersion: record.dataVersion, changeSummary: record.changeSummary || '提交模板审核。' }); message.success('已提交审核'); actionRef.current?.reload(); }
    catch (error: any) { message.error(error?.data?.errorMessage || error?.message || '提交失败'); }
  };
  const precheck = async (record: API.WritingTranslationTemplate) => {
    try { const response = await precheckWritingTranslationTemplate(record.id); const result = response.data; if (!result) return; modal.info({ title: result.level === 'passed' ? '预校验通过' : '预校验结果', width: 720, content: <Space orientation="vertical" size={8}>{<Typography.Text>{result.summary}</Typography.Text>}{result.issues.map((item) => <Tag key={item.id} color={item.level === 'error' ? 'error' : 'warning'}>{item.code}：{item.message}</Tag>)}</Space> }); actionRef.current?.reload(); }
    catch (error: any) { message.error(error?.data?.errorMessage || '预校验失败'); }
  };
  const copyVersion = async (record: API.WritingTranslationTemplate) => {
    try { const response = await copyWritingTranslationTemplate(record.id); if (response.data) { setEditing(response.data); message.success('已创建新草稿版本'); actionRef.current?.reload(); } }
    catch (error: any) { message.error(error?.data?.errorMessage || '复制失败'); }
  };

  const columns = useMemo<ProColumns<API.WritingTranslationTemplate>[]>(() => [
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '模板 ID、名称或说明' } },
    { title: '模板名称', dataIndex: 'name', width: 260, render: (_, record) => <Button type="link" size="small" onClick={() => openDetail(record)}>{record.name}</Button> },
    { title: '适用题型', dataIndex: 'topicType', width: 150, valueEnum: { writing: { text: '写作' }, translation: { text: '翻译' } }, render: (_, record) => <Space size={4}>{record.topicTypes.map((item) => <Tag key={item}>{item === 'writing' ? '写作' : '翻译'}</Tag>)}</Space> },
    { title: '考试类型', dataIndex: 'examType', width: 150, valueEnum: { cet4: { text: 'CET4' }, cet6: { text: 'CET6' } }, render: (_, record) => record.examTypes.map((item) => item.toUpperCase()).join(' / ') },
    { title: '配置摘要', search: false, width: 220, render: (_, record) => record.templateType === 'scoring_template' ? `${record.dimensions.length} 个维度 / ${record.totalScore} 分` : `${record.sections.length} 个反馈区块` },
    { title: '状态', dataIndex: 'status', width: 110, valueEnum: statusEnum, render: (_, record) => <StatusTag domain="reviewPublish" value={record.status} /> },
    { title: '版本', dataIndex: 'version', search: false, width: 90 },
    { title: '负责人', dataIndex: 'updatedBy', search: false, width: 110 },
    { title: '更新时间', dataIndex: 'updatedAt', search: false, width: 170 },
    { title: '操作', valueType: 'option', fixed: 'right', width: 300, render: (_, record) => <Space size={0}>
      <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>查看</Button>
      {canManage && ['draft', 'rejected'].includes(record.status) ? <Button type="link" size="small" icon={<EditOutlined />} onClick={() => setEditing(record)}>编辑</Button> : null}
      <Button type="link" size="small" icon={<SafetyCertificateOutlined />} onClick={() => precheck(record)}>预校验</Button>
      {canManage && ['draft', 'rejected'].includes(record.status) ? <Button type="link" size="small" icon={<SendOutlined />} onClick={() => submit(record)}>提交审核</Button> : null}
      {canManage && ['published', 'offline', 'rolled_back'].includes(record.status) ? <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => copyVersion(record)}>复制版本</Button> : null}
    </Space> },
  ], [canManage]);

  const currentEditing = editing === 'new' ? undefined : editing;
  const initialValues = currentEditing ? { ...currentEditing, responseStrategyId: currentEditing.templateType === 'feedback_template' ? currentEditing.responseStructureRef.strategyId : undefined } : activeType === 'scoring_template' ? { templateType: activeType, topicTypes: ['writing'], examTypes: ['CET4'], totalScore: 50, dimensions: defaultDimensions } : { templateType: activeType, topicTypes: ['writing'], examTypes: ['CET4'], sections: defaultSections };

  return <PageContainer title="评分与反馈模板">
    <ProTable<API.WritingTranslationTemplate> actionRef={actionRef} rowKey="id" columns={columns} scroll={{ x: 1500 }} search={{ labelWidth: 80, defaultCollapsed: false }} params={{ templateType: activeType }} request={async (params) => { const result = await writingTranslationTemplates({ ...params, templateType: activeType } as API.WritingTranslationTemplateQueryParams); setTemplates((prev) => [...prev.filter((item) => item.templateType !== activeType), ...(result.data ?? [])]); return { data: result.data ?? [], total: result.total, success: result.success }; }} toolbar={{ title: <Tabs activeKey={activeType} onChange={(key) => { const type = key as API.WritingTranslationTemplateType; setActiveType(type); history.replace(`/writing-translation/scoring-feedback-templates?tab=${type === 'feedback_template' ? 'feedback' : 'scoring'}`); actionRef.current?.reloadAndRest?.(); }} items={[{ key: 'scoring_template', label: '评分维度' }, { key: 'feedback_template', label: '反馈模板' }]} />, actions: [canBind ? <BindTopicButton key="bind" topics={topics} templates={templates} onSuccess={() => message.success('已绑定题目模板版本')} /> : null, canManage ? <Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => setEditing('new')}>新建{typeLabel[activeType]}</Button> : null] }} />

    <ModalForm<API.WritingTranslationTemplateSaveParams> key={`${editing === 'new' ? 'new' : currentEditing?.id}-${activeType}`} title={`${currentEditing ? '编辑' : '新建'}${typeLabel[currentEditing?.templateType ?? activeType]}`} open={Boolean(editing)} initialValues={initialValues} modalProps={{ destroyOnHidden: true, onCancel: () => setEditing(undefined), width: 840 }} onFinish={async (values: any) => {
      const type = currentEditing?.templateType ?? activeType; const strategy = strategies.find((item) => item.id === values.responseStrategyId);
      const payload: API.WritingTranslationTemplateSaveParams = { ...values, templateType: type, dataVersion: currentEditing?.dataVersion, changeSummary: values.changeSummary || `${currentEditing ? '更新' : '创建'}${typeLabel[type]}草稿。`, responseStructureRef: strategy ? { strategyId: strategy.id, strategyTitle: strategy.title, strategyVersion: strategy.version, releaseVersionId: strategy.publishedVersion || strategy.version, configType: 'response_structure', businessScene: 'writing_explanation', usage: 'feedback_structure', required: true, statusAtBinding: strategy.status, boundAt: new Date().toISOString() } : undefined };
      try { if (currentEditing) await updateWritingTranslationTemplate(currentEditing.id, payload); else await createWritingTranslationTemplate(payload); message.success('草稿已保存'); setEditing(undefined); actionRef.current?.reload(); return true; } catch (error: any) { message.error(error?.data?.errorMessage || '保存失败'); return false; }
    }}>
      <ProFormText name="name" label="模板名称" rules={[{ required: true }]} />
      <ProFormText name="description" label="模板说明" />
      <ProFormSelect name="topicTypes" label="适用题型" mode="multiple" options={[{ label: '写作', value: 'writing' }, { label: '翻译', value: 'translation' }]} rules={[{ required: true }]} />
      <ProFormSelect name="examTypes" label="考试类型" mode="multiple" options={[{ label: 'CET4', value: 'CET4' }, { label: 'CET6', value: 'CET6' }]} rules={[{ required: true }]} />
      {(currentEditing?.templateType ?? activeType) === 'scoring_template' ? <>
        <ProFormDigit name="totalScore" label="模板总分" min={1} max={1000} rules={[{ required: true }]} />
        <ProFormList name="dimensions" label="评分维度" creatorButtonProps={{ creatorButtonText: '新增评分维度' }} min={2} itemRender={({ listDom, action }) => <Space align="start" style={{ width: '100%' }}>{listDom}{action}</Space>}>
          <ProFormText name="key" label="Key" width="xs" rules={[{ required: true }]} /><ProFormText name="name" label="维度名称" width="sm" rules={[{ required: true }]} /><ProFormDigit name="weight" label="权重 %" width="xs" min={0} max={100} /><ProFormDigit name="maxScore" label="最高分" width="xs" min={0} /><ProFormDigit name="order" label="排序" width="xs" min={1} /><ProFormText name="description" label="评分说明" width="md" />
        </ProFormList>
      </> : <>
        <ProFormSelect name="responseStrategyId" label="AI 回答结构版本" options={strategies.map((item) => ({ label: `${item.title} / ${item.version}`, value: item.id }))} rules={[{ required: true }]} showSearch={{ optionFilterProp: 'label' }} />
        <ProFormList name="sections" label="反馈区块" creatorButtonProps={{ creatorButtonText: '新增反馈区块' }} min={4} itemRender={({ listDom, action }) => <Space align="start" style={{ width: '100%' }}>{listDom}{action}</Space>}>
          <ProFormText name="key" label="Key" width="xs" rules={[{ required: true }]} /><ProFormText name="title" label="区块名称" width="sm" rules={[{ required: true }]} /><ProFormText name="guidance" label="反馈指导" width="md" rules={[{ required: true }]} /><ProFormDigit name="order" label="排序" width="xs" min={1} />
        </ProFormList>
      </>}
      <ProFormText name="changeSummary" label="变更说明" rules={[{ required: true }]} />
    </ModalForm>

    <Drawer title={detail?.name} size="large" open={Boolean(detail)} onClose={() => setDetail(undefined)} extra={detail?.reviewTaskId ? <Button onClick={() => history.push(`/review-release/pending?keyword=${detail.reviewTaskId}`)}>查看审核任务</Button> : null}>
      {detail ? <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        {detail.lastPrecheck && detail.lastPrecheck.level !== 'passed' ? <Alert type="warning" showIcon title={detail.lastPrecheck.summary} /> : null}
        <Descriptions bordered size="small" column={2} items={[{ key: 'type', label: '模板类型', children: typeLabel[detail.templateType] }, { key: 'status', label: '状态', children: <StatusTag domain="reviewPublish" value={detail.status} /> }, { key: 'version', label: '版本', children: detail.version }, { key: 'release', label: '发布版本', children: detail.releaseVersionId || '-' }, { key: 'topic', label: '适用题型', children: detail.topicTypes.join(' / ') }, { key: 'exam', label: '考试类型', children: detail.examTypes.map((item) => item.toUpperCase()).join(' / ') }, { key: 'owner', label: '负责人', children: detail.updatedBy }, { key: 'time', label: '更新时间', children: detail.updatedAt }]} />
        {detail.templateType === 'scoring_template' ? <Table rowKey="key" size="small" pagination={false} dataSource={detail.dimensions} columns={[{ title: '维度', dataIndex: 'name' }, { title: '权重', dataIndex: 'weight', render: (value) => `${value}%` }, { title: '最高分', dataIndex: 'maxScore' }, { title: '说明', dataIndex: 'description' }]} /> : <><Table rowKey="key" size="small" pagination={false} dataSource={detail.sections} columns={[{ title: '反馈区块', dataIndex: 'title' }, { title: '排序', dataIndex: 'order' }, { title: '反馈指导', dataIndex: 'guidance' }]} /><Descriptions size="small" bordered items={[{ key: 'strategy', label: 'AI 回答结构', children: `${detail.responseStructureRef.strategyTitle} / ${detail.responseStructureRef.strategyVersion}` }]} /></>}
        <Typography.Title level={5}>Mock 使用记录</Typography.Title>
        {references.length ? <Table rowKey="id" size="small" pagination={false} dataSource={references} columns={[{ title: '记录 ID', dataIndex: 'id', render: (value) => <Button type="link" size="small" onClick={() => history.push(`/writing-translation/correction-summaries?record=${value}`)}>{value}</Button> }, { title: '题目', dataIndex: 'topicName' }, { title: '得分', render: (_, record: API.MockCorrectionRecord) => `${record.score}/${record.totalScore}` }, { title: '生成时间', dataIndex: 'createdAt' }]} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无 Mock 批改使用记录" />}
      </Space> : null}
    </Drawer>
  </PageContainer>;
};

const BindTopicButton: React.FC<{ topics: API.WritingTranslationTopic[]; templates: API.WritingTranslationTemplate[]; onSuccess: () => void }> = ({ topics, templates, onSuccess }) => {
  const { message, modal } = App.useApp(); const [form] = Form.useForm();
  return <ModalForm title="绑定题目模板版本" trigger={<Button icon={<LinkOutlined />}>绑定题目</Button>} form={form} modalProps={{ destroyOnHidden: true }} onFinish={async (values: any) => {
    try { const topicResponse = await writingTranslationTopicDetail(values.topicId); const topic = topicResponse.data; if (!topic) return false; await bindWritingTranslationTopicTemplates(topic.id, { scoringTemplateId: values.scoringTemplateId, feedbackTemplateId: values.feedbackTemplateId, dataVersion: topic.dataVersion }); const correction = await runWritingTranslationMockCorrection(topic.id); onSuccess(); modal.info({ title: 'Mock 批改记录已生成', content: correction.data ? `${correction.data.topicName}：${correction.data.score} 分，已固定题目与模板版本。` : '模板绑定成功。' }); return true; } catch (error: any) { message.error(error?.data?.errorMessage || '绑定失败'); return false; }
  }}>
    <ProFormSelect name="topicId" label="题目" options={topics.filter((item) => ['draft', 'rejected'].includes(item.status)).map((item) => ({ label: `${item.name} / ${item.version}`, value: item.id }))} rules={[{ required: true }]} showSearch={{ optionFilterProp: 'label' }} />
    <ProFormSelect name="scoringTemplateId" label="评分模板版本" options={templates.filter((item) => item.templateType === 'scoring_template' && item.status === 'published').map((item) => ({ label: `${item.name} / ${item.version}`, value: item.id }))} rules={[{ required: true }]} showSearch={{ optionFilterProp: 'label' }} />
    <ProFormSelect name="feedbackTemplateId" label="反馈模板版本" options={templates.filter((item) => item.templateType === 'feedback_template' && item.status === 'published').map((item) => ({ label: `${item.name} / ${item.version}`, value: item.id }))} rules={[{ required: true }]} showSearch={{ optionFilterProp: 'label' }} />
  </ModalForm>;
};

export default TemplatePage;
