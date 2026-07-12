import { CheckCircleOutlined, SaveOutlined, SendOutlined } from '@ant-design/icons';
import {
  PageContainer,
  ProForm,
  ProFormDigit,
  ProFormGroup,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { history, useModel, useParams } from '@umijs/max';
import { App, Button, Result, Skeleton, Space, Tag, Typography } from 'antd';
import type React from 'react';
import { useEffect, useState } from 'react';
import StatusTag from '@/components/StatusTag';
import {
  onboardingOverview,
  precheckOnboardingConfig,
  submitOnboardingConfigReview,
  updateOnboardingConfig,
} from '@/services/ant-design-pro/api';
import PrecheckResult from '../../components/PrecheckResult';

type FormValues = Omit<API.OnboardingSaveParams, 'dataVersion'> & {
  fields: API.OnboardingField[];
};

const OnboardingEditPage: React.FC = () => {
  const { id } = useParams();
  const { message, modal } = App.useApp();
  const { initialState } = useModel('@@initialState');
  const roleId = initialState?.currentUser?.roleId;
  const canWrite = roleId === 'super_admin' || roleId === 'teaching_reviewer';
  const [form] = ProForm.useForm<FormValues>();
  const [config, setConfig] = useState<API.OnboardingConfig>();
  const [precheck, setPrecheck] = useState<API.OnboardingPrecheckResult>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await onboardingOverview();
      const currentConfig = response.data?.config;
      if (currentConfig && currentConfig.id === id) {
        setConfig(currentConfig);
        setPrecheck(currentConfig.lastPrecheck);
        form.setFieldsValue(currentConfig as FormValues);
      }
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '配置加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const buildPayload = async (): Promise<API.OnboardingSaveParams> => {
    const values = await form.validateFields();
    if (!config) throw new Error('配置不存在');
    const fields = config.fields.map((field, fieldIndex) => {
      const input = values.fields?.[fieldIndex];
      return {
        ...field,
        label: String(input?.label ?? field.label).trim(),
        description: String(input?.description ?? field.description).trim(),
        options: field.options.map((item, optionIndex) => ({
          ...item,
          label: String(input?.options?.[optionIndex]?.label ?? item.label).trim(),
          enabled: input?.options?.[optionIndex]?.enabled ?? item.enabled,
          sortOrder: Number(input?.options?.[optionIndex]?.sortOrder ?? item.sortOrder),
        })),
      };
    });
    return {
      name: String(values.name || '').trim(),
      description: String(values.description || '').trim(),
      changeSummary: String(values.changeSummary || '').trim(),
      internalRemark: String(values.internalRemark || '').trim(),
      dataVersion: config.dataVersion,
      fields,
    };
  };

  const runPrecheck = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const payload = await buildPayload();
      const response = await precheckOnboardingConfig(config.id, payload);
      setPrecheck(response.data);
      if (response.data?.level === 'passed') message.success('预校验通过');
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '预校验失败');
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = async () => {
    if (!config) return undefined;
    const payload = await buildPayload();
    const response = await updateOnboardingConfig(config.id, payload);
    if (response.data) {
      setConfig(response.data);
      setPrecheck(response.data.lastPrecheck);
      setDirty(false);
    }
    return response.data;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveDraft();
      message.success('草稿已保存');
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const submitSavedConfig = async (saved: API.OnboardingConfig, confirmWarnings = false) => {
    await submitOnboardingConfigReview(saved.id, {
      changeSummary: saved.changeSummary,
      dataVersion: saved.dataVersion,
      confirmWarnings,
    });
    message.success('已提交审核');
    history.push('/learning-path/onboarding');
  };

  const handleSaveAndSubmit = async () => {
    setSaving(true);
    try {
      const saved = await saveDraft();
      if (!saved) return;
      if (saved.lastPrecheck?.level === 'error') {
        message.error('预校验存在阻断错误，不能提交审核');
        return;
      }
      if (saved.lastPrecheck?.level === 'warning') {
        modal.confirm({
          title: '预校验存在警告，确认提交审核？',
          content: saved.lastPrecheck.summary,
          okText: '确认提交',
          cancelText: '继续修改',
          onOk: () => submitSavedConfig(saved, true),
        });
        return;
      }
      await submitSavedConfig(saved);
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '提交审核失败');
    } finally {
      setSaving(false);
    }
  };

  if (!canWrite) {
    return <Result status="403" title="403" subTitle="当前账号无 Onboarding 配置写入权限。" extra={<Button onClick={() => history.push('/learning-path/onboarding')}>返回配置页</Button>} />;
  }
  if (loading) return <PageContainer title="编辑 Onboarding 配置"><Skeleton active /></PageContainer>;
  if (!config) {
    return <Result status="404" title="404" subTitle="Onboarding 配置不存在或不是当前处理版本。" extra={<Button onClick={() => history.push('/learning-path/onboarding')}>返回配置页</Button>} />;
  }
  if (!['draft', 'rejected'].includes(config.status)) {
    return <Result status="403" title="当前状态不可编辑" subTitle="已提交或已发布配置需要返回详情页继续处理。" extra={<Button onClick={() => history.push('/learning-path/onboarding')}>返回配置页</Button>} />;
  }

  return (
    <PageContainer
      title="编辑 Onboarding 配置"
      content={<Space><Tag>{config.version}</Tag><StatusTag domain="reviewPublish" value={config.status} /></Space>}
      onBack={() => history.push('/learning-path/onboarding')}
    >
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <PrecheckResult result={precheck} />
        <ProForm<FormValues>
          form={form}
          layout="vertical"
          onValuesChange={() => setDirty(true)}
          submitter={{
            render: () => [
              <Button key="precheck" icon={<CheckCircleOutlined />} loading={saving} onClick={runPrecheck}>预校验</Button>,
              <Button key="save" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>保存草稿</Button>,
              <Button key="submit" type="primary" icon={<SendOutlined />} loading={saving} onClick={handleSaveAndSubmit}>保存并提交审核</Button>,
            ],
          }}
        >
          <ProFormGroup title="基础信息">
            <ProFormText name="name" label="配置名称" width="lg" rules={[{ required: true, message: '请输入配置名称' }]} />
            <ProFormTextArea name="description" label="配置说明" width="lg" fieldProps={{ rows: 2 }} />
            <ProFormText name="changeSummary" label="变更说明" width="lg" rules={[{ required: true, message: '请输入变更说明' }]} />
            <ProFormTextArea name="internalRemark" label="内部备注" width="lg" fieldProps={{ rows: 2 }} />
          </ProFormGroup>
          {config.fields
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((field) => {
              const fieldIndex = config.fields.findIndex((item) => item.key === field.key);
              return (
                <ProFormGroup key={field.key} title={`${field.sortOrder}. ${field.label}`}>
                  <ProFormText name={['fields', fieldIndex, 'label']} label="字段名称" width="md" rules={[{ required: true }]} />
                  <ProFormText name={['fields', fieldIndex, 'description']} label="字段说明" width="lg" />
                  {field.options.map((item, optionIndex) => (
                    <Space key={item.id} align="start" wrap>
                      <ProFormText name={['fields', fieldIndex, 'options', optionIndex, 'label']} label={`选项 ${optionIndex + 1}`} width="md" rules={[{ required: true }]} />
                      <ProFormDigit name={['fields', fieldIndex, 'options', optionIndex, 'sortOrder']} label="排序" width="xs" min={1} max={field.options.length} rules={[{ required: true }]} />
                      <ProFormSwitch name={['fields', fieldIndex, 'options', optionIndex, 'enabled']} label="启用" />
                      <Typography.Text type="secondary" style={{ paddingTop: 31 }}>
                        值：{String(item.value)}{item.referencedCount ? ` · 已引用 ${item.referencedCount}` : ''}
                      </Typography.Text>
                    </Space>
                  ))}
                </ProFormGroup>
              );
            })}
        </ProForm>
      </Space>
    </PageContainer>
  );
};

export default OnboardingEditPage;
