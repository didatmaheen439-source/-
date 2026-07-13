import { ArrowLeftOutlined, SaveOutlined, SafetyCertificateOutlined, SendOutlined } from '@ant-design/icons';
import { PageContainer, ProCard, ProForm, ProFormDependency, ProFormDigit, ProFormList, ProFormSelect, ProFormSwitch, ProFormText, ProFormTextArea } from '@ant-design/pro-components';
import { history, useModel, useParams, useSearchParams } from '@umijs/max';
import { App, Button, Space, Tag } from 'antd';
import type React from 'react';
import { useEffect, useState } from 'react';
import { advancedLearningStrategyDetail, advancedStrategyReferences, createAdvancedLearningStrategy, precheckAdvancedLearningStrategy, submitAdvancedLearningStrategyReview, updateAdvancedLearningStrategy } from '@/services/ant-design-pro/api';
import { canManageAdvancedStrategy, examTypeOptions, moduleOptions, precheckColors, precheckLabels, strategyKindOptions, triggerMetricLabels } from '../config';

const operatorOptions = [
  { value: 'eq', label: '等于' }, { value: 'in', label: '包含任一' }, { value: 'lt', label: '小于' },
  { value: 'lte', label: '小于等于' }, { value: 'gt', label: '大于' }, { value: 'gte', label: '大于等于' },
];

const EditAdvancedStrategyPage: React.FC = () => {
  const { id = '' } = useParams();
  const [searchParams] = useSearchParams();
  const isNew = !id || id === 'new';
  const { message, modal } = App.useApp();
  const { initialState } = useModel('@@initialState');
  const [form] = ProForm.useForm();
  const [strategy, setStrategy] = useState<API.AdvancedLearningStrategy>();
  const [references, setReferences] = useState<API.StrategyReference[]>([]);
  const [precheck, setPrecheck] = useState<API.StrategyPrecheckResult>();
  const canManage = canManageAdvancedStrategy(initialState?.currentUser?.roleId);

  useEffect(() => {
    if (!canManage) history.replace('/exception/403');
  }, [canManage]);

  useEffect(() => {
    const load = async () => {
      const refs = await advancedStrategyReferences();
      setReferences(refs.data ?? []);
      if (isNew) {
        const kind = (searchParams.get('kind') as API.AdvancedLearningStrategyKind) || 'light_task';
        form.setFieldsValue({ kind, examType: 'CET4', module: 'reading', priority: 10, triggerGroup: { mode: 'all', conditions: [{ metric: 'available_minutes', operator: 'gte', value: '10', description: '可用时间满足任务要求' }] }, fallbackRule: { enabled: false, trigger: 'primary_unavailable' }, estimatedMinutes: 10, practiceCount: 1, reviewIntervalDays: 3 });
        return;
      }
      const response = await advancedLearningStrategyDetail(id);
      if (response.data) {
        setStrategy(response.data);
        setPrecheck(response.data.lastPrecheck);
        form.setFieldsValue({ ...response.data, primaryReferenceId: response.data.primaryReference.id, fallbackTargetId: response.data.fallbackRule.targetId });
      }
    };
    load().catch((error: any) => message.error(error?.data?.errorMessage || error?.message || '加载失败'));
  }, [id]);

  const buildPayload = (values: any): API.AdvancedLearningStrategySaveParams => {
    const primaryReference = references.find((item) => item.id === values.primaryReferenceId);
    if (!primaryReference) throw new Error('请选择主引用对象。');
    const fallback = references.find((item) => item.id === values.fallbackTargetId);
    return {
      ...values,
      id: strategy?.id,
      dataVersion: strategy?.dataVersion,
      primaryReference,
      fallbackRule: { ...values.fallbackRule, targetId: fallback?.id, targetName: fallback?.name },
      triggerGroup: { ...values.triggerGroup, conditions: values.triggerGroup.conditions.map((item: any, index: number) => ({ ...item, id: item.id || `condition-${Date.now()}-${index}`, value: ['available_minutes', 'accuracy', 'consecutive_errors', 'days_since_practice'].includes(item.metric) ? Number(item.value) : item.metric === 'wrong_reason_tag' ? String(item.value).split(',').map((value) => value.trim()).filter(Boolean) : item.value })) },
    };
  };

  const save = async (values: any) => {
    try {
      const payload = buildPayload(values);
      const response = isNew ? await createAdvancedLearningStrategy(payload) : await updateAdvancedLearningStrategy(id, payload);
      if (response.data) {
        message.success('已保存草稿');
        history.replace(`/learning-path/advanced-strategies/${response.data.id}/edit`);
        setStrategy(response.data);
        setPrecheck(response.data.lastPrecheck);
      }
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '保存失败');
    }
  };

  const runPrecheck = async () => {
    try {
      const payload = buildPayload(await form.validateFields());
      const response = await precheckAdvancedLearningStrategy(payload);
      setPrecheck(response.data);
      if (response.data) message.info(response.data.summary);
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '预校验失败');
    }
  };

  const submit = async (confirmWarnings = false) => {
    if (!strategy) {
      message.warning('请先保存草稿。');
      return;
    }
    try {
      await submitAdvancedLearningStrategyReview(strategy.id, { dataVersion: strategy.dataVersion, changeSummary: form.getFieldValue('changeSummary'), confirmWarnings });
      message.success('已提交审核');
      history.push(`/learning-path/advanced-strategies/${strategy.id}`);
    } catch (error: any) {
      const result = error?.data?.data as API.StrategyPrecheckResult | undefined;
      if (result?.level === 'warning' && !confirmWarnings) {
        modal.confirm({ title: '预校验存在警告', content: result.summary, okText: '确认提交', cancelText: '取消', onOk: () => submit(true) });
        return;
      }
      message.error(error?.data?.errorMessage || error?.message || '提交失败');
    }
  };

  return <PageContainer title={isNew ? '新建进阶学习策略' : `编辑策略：${strategy?.name ?? ''}`} extra={<Space><Button icon={<ArrowLeftOutlined />} onClick={() => history.push('/learning-path/advanced-strategies')}>返回</Button>{precheck ? <Tag color={precheckColors[precheck.level]}>预校验{precheckLabels[precheck.level]}</Tag> : null}<Button icon={<SafetyCertificateOutlined />} onClick={runPrecheck}>预校验</Button><Button type="primary" icon={<SendOutlined />} disabled={!strategy} onClick={() => submit()}>提交审核</Button></Space>}>
    <ProForm form={form} submitter={{ searchConfig: { submitText: '保存草稿' }, submitButtonProps: { icon: <SaveOutlined /> }, resetButtonProps: false }} onFinish={save}>
      <ProCard title="基本信息" split="vertical">
        <ProCard colSpan="50%"><ProFormText name="name" label="策略名称" rules={[{ required: true }]} /><ProFormSelect name="kind" label="策略类型" options={strategyKindOptions} disabled={!isNew} rules={[{ required: true }]} /><ProFormSelect name="examType" label="考试类型" options={examTypeOptions} rules={[{ required: true }]} /><ProFormSelect name="module" label="推荐模块" options={moduleOptions} rules={[{ required: true }]} /><ProFormDigit name="priority" label="优先级" min={1} max={999} rules={[{ required: true }]} /></ProCard>
        <ProCard><ProFormTextArea name="description" label="策略说明" fieldProps={{ rows: 3 }} /><ProFormTextArea name="changeSummary" label="变更说明" rules={[{ required: true }]} fieldProps={{ rows: 2 }} /><ProFormTextArea name="impactScope" label="影响范围" rules={[{ required: true }]} fieldProps={{ rows: 2 }} /></ProCard>
      </ProCard>
      <ProCard title="触发条件" style={{ marginTop: 16 }}>
        <ProFormSelect name={['triggerGroup', 'mode']} label="条件关系" options={[{ value: 'all', label: '全部满足' }, { value: 'any', label: '任一满足' }]} rules={[{ required: true }]} />
        <ProFormList name={['triggerGroup', 'conditions']} min={1} copyIconProps={false} creatorButtonProps={{ creatorButtonText: '添加触发条件' }}>
          <ProForm.Group><ProFormSelect name="metric" label="指标" width="sm" options={Object.entries(triggerMetricLabels).map(([value, label]) => ({ value, label }))} rules={[{ required: true }]} /><ProFormSelect name="operator" label="运算符" width="sm" options={operatorOptions} rules={[{ required: true }]} /><ProFormText name="value" label="条件值" width="sm" rules={[{ required: true }]} /><ProFormText name="description" label="条件说明" width="md" rules={[{ required: true }]} /></ProForm.Group>
        </ProFormList>
      </ProCard>
      <ProCard title="推荐与替代" style={{ marginTop: 16 }}>
        <ProFormSelect name="primaryReferenceId" label="主引用对象" options={references.map((item) => ({ value: item.id, label: `${item.name} · ${item.status}`, disabled: !item.available }))} rules={[{ required: true }]} />
        <ProFormDependency name={['kind']}>{({ kind }) => <><ProFormDigit name="estimatedMinutes" label="预计分钟" hidden={kind !== 'light_task'} min={1} max={60} /><ProFormDigit name="practiceCount" label="追加练习数" hidden={kind !== 'extra_practice'} min={1} max={10} /><ProFormDigit name="reviewIntervalDays" label="复练间隔天数" hidden={kind !== 'review_recommendation'} min={0} max={365} /></>}</ProFormDependency>
        <ProFormSwitch name={['fallbackRule', 'enabled']} label="启用替代规则" />
        <ProFormDependency name={['fallbackRule']} ignoreFormListField>{({ fallbackRule }) => fallbackRule?.enabled ? <><ProFormSelect name={['fallbackRule', 'trigger']} label="替代触发" options={[{ value: 'primary_unavailable', label: '主引用不可用' }, { value: 'already_completed', label: '主任务已完成' }, { value: 'insufficient_time', label: '可用时间不足' }]} /><ProFormSelect name="fallbackTargetId" label="替代目标" options={references.map((item) => ({ value: item.id, label: item.name, disabled: !item.available }))} rules={[{ required: true }]} /></> : null}</ProFormDependency>
      </ProCard>
    </ProForm>
  </PageContainer>;
};

export default EditAdvancedStrategyPage;
