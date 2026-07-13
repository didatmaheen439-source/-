import {
  ArrowLeftOutlined,
  CopyOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProForm,
  ProFormDependency,
  ProFormDigit,
  ProFormList,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { history, useParams, useSearchParams } from '@umijs/max';
import { Alert, App, Button, Form, Modal, Result, Skeleton, Space, Tag, Typography } from 'antd';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import StatusTag from '@/components/StatusTag';
import {
  aiCoachStrategyDetail,
  copyAiCoachStrategy,
  createAiCoachStrategy,
  precheckAiCoachStrategy,
  submitAiCoachStrategyReview,
  updateAiCoachStrategy,
  validateAiCoachStrategySamples,
} from '@/services/ant-design-pro/api';
import {
  businessSceneOptions,
  configTypeOptions,
  defaultBodyByType,
  defaultRiskPolicy,
  defaultStrategyFormValues,
  editableStatuses,
  examTypeOptions,
  precheckLevelColor,
  precheckLevelText,
} from '../config';

type FormValues = API.AiCoachStrategySaveParams;

const attachmentFormatOptions: Record<API.AiAttachmentType, string[]> = {
  image: ['jpg', 'jpeg', 'png', 'webp'],
  document: ['pdf', 'docx', 'txt'],
  audio: ['mp3', 'm4a', 'wav'],
};

const attachmentRecognitionModeByType: Record<API.AiAttachmentType, API.AiAttachmentRecognitionMode> = {
  image: 'image_ocr',
  document: 'document_text_extract',
  audio: 'audio_asr',
};

const attachmentTypeOptions: { label: string; value: API.AiAttachmentType }[] = [
  { label: '图片', value: 'image' },
  { label: '文档', value: 'document' },
  { label: '音频', value: 'audio' },
];

const attachmentRecognitionModeOptions: { label: string; value: API.AiAttachmentRecognitionMode }[] = [
  { label: '图片 OCR', value: 'image_ocr' },
  { label: '文档文本提取', value: 'document_text_extract' },
  { label: '音频 ASR', value: 'audio_asr' },
];

const normalizeAttachmentPolicyBody = (
  body: Partial<API.AiAttachmentPolicyBody> = {},
): API.AiAttachmentPolicyBody => ({
  rules: (body.rules ?? []).map((rule) => {
    const attachmentType = rule.attachmentType ?? 'image';
    const allowedFormats = new Set(attachmentFormatOptions[attachmentType]);
    return {
      ...rule,
      attachmentType,
      allowedFormats: (rule.allowedFormats ?? [])
        .map((format) => String(format).toLowerCase())
        .filter((format) => allowedFormats.has(format)),
      recognitionMode: attachmentRecognitionModeByType[attachmentType],
      enabled: rule.enabled !== false,
    };
  }),
  failureMessages: {
    unsupportedType: body.failureMessages?.unsupportedType ?? '',
    sizeExceeded: body.failureMessages?.sizeExceeded ?? '',
    recognitionFailed: body.failureMessages?.recognitionFailed ?? '',
  },
});

const toSaveParams = (values: FormValues): API.AiCoachStrategySaveParams => ({
  ...values,
  body:
    values.configType === 'attachment_policy'
      ? normalizeAttachmentPolicyBody(values.body as Partial<API.AiAttachmentPolicyBody>)
      : values.body,
  riskPolicy: {
    ...defaultRiskPolicy,
    ...(values.riskPolicy ?? {}),
  },
  validationCases: values.validationCases ?? [],
});

const PrecheckResult: React.FC<{ result?: API.AiCoachPrecheckResult }> = ({ result }) => {
  if (!result) return null;
  return (
    <Alert
      type={result.level === 'error' ? 'error' : result.level === 'warning' ? 'warning' : 'success'}
      showIcon
      title={`预校验${precheckLevelText[result.level]}`}
      description={
        <Space orientation="vertical" size={6}>
          <Typography.Text>{result.summary}</Typography.Text>
          {result.issues.map((item) => (
            <Tag key={item.id} color={precheckLevelColor[item.level]}>
              {item.field}：{item.message}
            </Tag>
          ))}
        </Space>
      }
    />
  );
};

const AiCoachStrategyEditPage: React.FC = () => {
  const { id } = useParams();
  const isCreate = !id || id === 'new';
  const [searchParams] = useSearchParams();
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [loading, setLoading] = useState(!isCreate);
  const [strategy, setStrategy] = useState<API.AiCoachStrategy>();
  const [precheckResult, setPrecheckResult] = useState<API.AiCoachPrecheckResult>();
  const [dirty, setDirty] = useState(false);

  const canEditCurrent = useMemo(
    () => !strategy || editableStatuses.includes(strategy.status),
    [strategy],
  );

  useEffect(() => {
    if (isCreate) {
      const requestedType = searchParams.get('configType') as API.AiCoachConfigType | null;
      form.setFieldsValue(
        requestedType
          ? { ...defaultStrategyFormValues, configType: requestedType, body: defaultBodyByType(requestedType) }
          : defaultStrategyFormValues,
      );
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const response = await aiCoachStrategyDetail(String(id));
        if (response.data) {
          setStrategy(response.data);
          form.setFieldsValue({
            title: response.data.title,
            description: response.data.description,
            configType: response.data.configType,
            businessScenes: response.data.businessScenes,
            examTypes: response.data.examTypes,
            body: response.data.body,
            riskPolicy: response.data.riskPolicy,
            validationCases: response.data.validationCases,
            changeSummary: response.data.changeSummary,
            impactScope: response.data.impactScope,
            dataVersion: response.data.dataVersion,
          });
          setPrecheckResult(response.data.lastPrecheck);
        }
      } catch {
        message.error('加载策略失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [form, id, isCreate, message]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  const confirmBack = () => {
    if (!dirty) {
      history.back();
      return;
    }
    modal.confirm({
      title: '离开当前编辑？',
      content: '未保存的修改会丢失。',
      okText: '离开',
      cancelText: '继续编辑',
      onOk: () => history.back(),
    });
  };

  const saveDraft = async () => {
    const values = await form.validateFields();
    const payload = { ...toSaveParams(values), strategyId: strategy?.id };
    try {
      if (isCreate) {
        const response = await createAiCoachStrategy(payload);
        message.success('草稿已保存');
        setDirty(false);
        if (response.data) history.replace(`/ai-coach/prompts/${response.data.id}/edit`);
        return response.data;
      }
      const response = await updateAiCoachStrategy(String(id), payload);
      message.success('草稿已保存');
      setDirty(false);
      if (response.data) {
        setStrategy(response.data);
        form.setFieldValue('dataVersion', response.data.dataVersion);
      }
      return response.data;
    } catch (error: any) {
      if (error?.data?.errorCode === '409') {
        modal.error({
          title: '版本已变化',
          content: error?.data?.errorMessage || '请刷新后再保存。',
        });
        return undefined;
      }
      message.error(error?.data?.errorMessage || error?.message || '保存失败');
      return undefined;
    }
  };

  const runPrecheck = async () => {
    const values = await form.validateFields();
    try {
      const response = await precheckAiCoachStrategy({ ...toSaveParams(values), strategyId: strategy?.id });
      setPrecheckResult(response.data);
      message.success('预校验完成');
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '预校验失败');
    }
  };

  const runSampleValidation = async () => {
    const values = await form.validateFields();
    try {
      const response = await validateAiCoachStrategySamples({ ...toSaveParams(values), strategyId: strategy?.id });
      const result = response.data;
      if (!result) return;
      Modal.info({
        title: '静态样例校验',
        content: (
          <Space orientation="vertical" size={8}>
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

  const submitReview = async (confirmWarnings = false) => {
    const saved = await saveDraft();
    if (!saved) return;
    try {
      await submitAiCoachStrategyReview(saved.id, {
        changeSummary: saved.changeSummary,
        dataVersion: saved.dataVersion,
        confirmWarnings,
      });
      message.success('已提交审核');
      history.push('/ai-coach/prompts');
    } catch (error: any) {
      const precheck = error?.data?.data as API.AiCoachPrecheckResult | undefined;
      if (precheck?.level === 'warning') {
        modal.confirm({
          title: '预校验存在警告，确认提交审核？',
          content: precheck.summary,
          okText: '确认提交',
          cancelText: '取消',
          onOk: () => submitReview(true),
        });
        return;
      }
      message.error(error?.data?.errorMessage || error?.message || '提交失败');
    }
  };

  const copyDraft = async () => {
    if (!strategy) return;
    try {
      const response = await copyAiCoachStrategy(strategy.id);
      if (response.data) {
        message.success('已创建新草稿版本');
        history.replace(`/ai-coach/prompts/${response.data.id}/edit`);
      }
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '复制失败');
    }
  };

  const renderBodyFields = (configType?: API.AiCoachConfigType) => {
    if (configType === 'intent') {
      return (
        <>
          <ProFormText name={['body', 'intentKey']} label="意图 Key" rules={[{ required: true }]} />
          <ProFormTextArea name={['body', 'description']} label="意图说明" rules={[{ required: true }]} />
          <ProFormSelect
            name={['body', 'triggerExamples']}
            label="触发样例"
            mode="tags"
            rules={[{ required: true }]}
          />
          <ProFormText name={['body', 'outputIntent']} label="输出意图" rules={[{ required: true }]} />
          <ProFormDigit
            name={['body', 'confidenceThreshold']}
            label="置信阈值"
            min={0}
            max={1}
            fieldProps={{ step: 0.01 }}
            rules={[{ required: true }]}
          />
        </>
      );
    }
    if (configType === 'response_structure') {
      return (
        <>
          <ProFormText name={['body', 'schemaName']} label="结构名称" rules={[{ required: true }]} />
          <ProFormList name={['body', 'sections']} label="回答区块" creatorButtonProps={{ creatorButtonText: '新增区块' }}>
            <ProFormText name="key" label="Key" rules={[{ required: true }]} />
            <ProFormText name="title" label="标题" rules={[{ required: true }]} />
            <ProFormSwitch name="required" label="必填" />
            <ProFormTextArea name="description" label="说明" rules={[{ required: true }]} />
          </ProFormList>
          <ProFormTextArea name={['body', 'outputExample']} label="结构样例" fieldProps={{ rows: 4 }} />
        </>
      );
    }
    if (configType === 'dependency_rule') {
      return (
        <>
          <ProFormSelect
            name={['body', 'dependencySignals']}
            label="依赖信号"
            mode="tags"
            rules={[{ required: true }]}
          />
          <ProFormTextArea name={['body', 'interventionMessage']} label="干预话术" rules={[{ required: true }]} />
          <ProFormDigit name={['body', 'maxConsecutiveAnswers']} label="连续回答阈值" min={1} max={10} />
          <ProFormDigit name={['body', 'cooldownMinutes']} label="冷却时间（分钟）" min={1} max={240} />
        </>
      );
    }
    if (configType === 'attachment_policy') {
      return (
        <>
          <ProFormList
            name={['body', 'rules']}
            label="附件规则"
            creatorButtonProps={{ creatorButtonText: '新增附件规则' }}
            copyIconProps={false}
          >
            <ProFormText name="id" label="规则 ID" rules={[{ required: true }]} />
            <ProFormSelect
              name="attachmentType"
              label="附件类型"
              options={attachmentTypeOptions}
              rules={[{ required: true }]}
            />
            <ProFormSelect
              name="allowedFormats"
              label="允许格式"
              mode="multiple"
              options={Object.values(attachmentFormatOptions).flat().map((value) => ({ label: value.toUpperCase(), value }))}
              rules={[{ required: true }]}
            />
            <ProFormDigit name="maxSizeMb" label="大小上限（MB）" min={0.1} max={100} rules={[{ required: true }]} />
            <ProFormSelect
              name="recognitionMode"
              label="识别方式"
              options={attachmentRecognitionModeOptions}
              rules={[{ required: true }]}
            />
            <ProFormSwitch name="enabled" label="启用" />
          </ProFormList>
          <ProFormTextArea name={['body', 'failureMessages', 'unsupportedType']} label="不支持类型提示" rules={[{ required: true }]} />
          <ProFormTextArea name={['body', 'failureMessages', 'sizeExceeded']} label="超过大小提示" rules={[{ required: true }]} />
          <ProFormTextArea name={['body', 'failureMessages', 'recognitionFailed']} label="识别失败提示" rules={[{ required: true }]} />
        </>
      );
    }
    return (
      <>
        <ProFormText name={['body', 'systemRole']} label="系统角色" rules={[{ required: true }]} />
        <ProFormTextArea
          name={['body', 'promptBody']}
          label="Prompt 模板"
          fieldProps={{ rows: 8 }}
          rules={[{ required: true }]}
        />
        <ProFormList name={['body', 'variables']} label="输入变量" creatorButtonProps={{ creatorButtonText: '新增变量' }}>
          <ProFormText name="name" label="变量名" rules={[{ required: true }]} />
          <ProFormSelect
            name="type"
            label="类型"
            valueEnum={{
              string: 'string',
              number: 'number',
              boolean: 'boolean',
              array: 'array',
              object: 'object',
            }}
            rules={[{ required: true }]}
          />
          <ProFormSwitch name="required" label="必填" />
          <ProFormText name="description" label="说明" rules={[{ required: true }]} />
          <ProFormText name="exampleValue" label="示例值" />
        </ProFormList>
        <ProFormSelect name={['body', 'styleRules']} label="风格规则" mode="tags" />
      </>
    );
  };

  if (loading) {
    return (
      <PageContainer>
        <Skeleton active />
      </PageContainer>
    );
  }

  if (!isCreate && !strategy) {
    return (
      <PageContainer>
        <Result status="404" title="AI 策略不存在" extra={<Button onClick={() => history.push('/ai-coach/prompts')}>返回列表</Button>} />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={isCreate ? '新建 AI 策略' : '编辑 AI 策略'}
      extra={[
        <Button key="back" icon={<ArrowLeftOutlined />} onClick={confirmBack}>
          返回
        </Button>,
      ]}
    >
      {!canEditCurrent ? (
        <Alert
          type="warning"
          showIcon
          title="当前版本不能直接编辑"
          description={
            <Space>
              <StatusTag domain="reviewPublish" value={strategy?.status ?? ''} />
              <Typography.Text>已发布、待审核或待发布版本不可直接覆盖，请创建新草稿。</Typography.Text>
              <Button icon={<CopyOutlined />} onClick={copyDraft}>
                创建新草稿
              </Button>
            </Space>
          }
          style={{ marginBottom: 16 }}
        />
      ) : null}
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <PrecheckResult result={precheckResult} />
        <ProForm<FormValues>
          form={form}
          layout="vertical"
          disabled={!canEditCurrent}
          submitter={{
            render: () => (
              <Space>
                <Button onClick={confirmBack}>取消</Button>
                <Button icon={<SafetyCertificateOutlined />} onClick={runPrecheck}>
                  预校验
                </Button>
                <Button onClick={runSampleValidation}>静态样例校验</Button>
                {canEditCurrent ? (
                  <Button type="primary" onClick={saveDraft}>
                    保存草稿
                  </Button>
                ) : null}
                {canEditCurrent ? (
                  <Button icon={<SendOutlined />} type="primary" onClick={() => submitReview(false)}>
                    保存后提交审核
                  </Button>
                ) : null}
              </Space>
            ),
          }}
          onValuesChange={(changedValues) => {
            setDirty(true);
            if (changedValues.configType) {
              form.setFieldValue('body', defaultBodyByType(changedValues.configType));
            }
          }}
        >
          <ProForm.Group title="基础信息">
            <ProFormText name="title" label="策略名称" width="lg" rules={[{ required: true }]} />
            <ProFormSelect
              name="configType"
              label="配置类型"
              options={configTypeOptions}
              width="md"
              rules={[{ required: true }]}
            />
            <ProFormSelect
              name="businessScenes"
              label="业务场景"
              mode="multiple"
              options={businessSceneOptions}
              width="lg"
              rules={[{ required: true }]}
            />
            <ProFormSelect
              name="examTypes"
              label="考试类型"
              mode="multiple"
              options={examTypeOptions}
              width="md"
              rules={[{ required: true }]}
            />
          </ProForm.Group>
          <ProFormTextArea name="description" label="策略说明" rules={[{ required: true }]} />
          <ProFormDependency name={['configType']}>
            {({ configType }) => (
              <ProForm.Group title="配置主体">
                {renderBodyFields(configType as API.AiCoachConfigType)}
              </ProForm.Group>
            )}
          </ProFormDependency>
          <ProForm.Group title="风险和兜底">
            <ProFormSwitch name={['riskPolicy', 'dependencyPrevention']} label="启用防依赖" />
            <ProFormSelect name={['riskPolicy', 'highRiskKeywords']} label="高风险关键词" mode="tags" width="lg" />
          </ProForm.Group>
          <ProFormTextArea name={['riskPolicy', 'answerBoundary']} label="回答边界" rules={[{ required: true }]} />
          <ProFormTextArea name={['riskPolicy', 'sensitivePolicy']} label="敏感策略" rules={[{ required: true }]} />
          <ProFormTextArea name={['riskPolicy', 'fallbackStrategy']} label="兜底策略" rules={[{ required: true }]} />
          <ProFormTextArea name={['riskPolicy', 'escalationRule']} label="升级规则" />
          <ProFormList name="validationCases" label="静态样例" creatorButtonProps={{ creatorButtonText: '新增样例' }}>
            <ProFormText name="title" label="样例名称" rules={[{ required: true }]} />
            <ProFormTextArea name="input" label="输入" rules={[{ required: true }]} />
            <ProFormTextArea name="expected" label="期望" rules={[{ required: true }]} />
          </ProFormList>
          <ProFormTextArea name="changeSummary" label="变更说明" rules={[{ required: true }]} />
          <ProFormTextArea name="impactScope" label="影响范围" rules={[{ required: true }]} />
          <ProFormDigit name="dataVersion" hidden />
        </ProForm>
      </Space>
    </PageContainer>
  );
};

export default AiCoachStrategyEditPage;
