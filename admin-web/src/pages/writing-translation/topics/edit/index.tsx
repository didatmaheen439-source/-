import {
  ArrowLeftOutlined,
  CopyOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProForm,
  ProFormDigit,
  ProFormList,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { history, useAccess, useParams, useSearchParams } from '@umijs/max';
import { Alert, App, Button, Form, Modal, Result, Skeleton, Space, Tag, Typography } from 'antd';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import StatusTag from '@/components/StatusTag';
import type { AdminModuleKey, PermissionAction } from '@/foundation/permissions';
import {
  copyWritingTranslationTopic,
  createWritingTranslationTopic,
  precheckWritingTranslationTopic,
  submitWritingTranslationReview,
  updateWritingTranslationTopic,
  validateWritingTranslationSamples,
  writingTranslationAiStrategies,
  writingTranslationTopicDetail,
} from '@/services/ant-design-pro/api';
import {
  aiUsageOptions,
  defaultCorrectionRule,
  defaultTopicFormValues,
  defaultTranslationDimensions,
  defaultWritingDimensions,
  difficultyOptions,
  editableStatuses,
  examTypeOptions,
  genreOptions,
  precheckLevelColor,
  precheckLevelText,
  riskLevelOptions,
  topicTypeOptions,
  topicTypeText,
} from '../config';

type FormValues = API.WritingTranslationTopicSaveParams & {
  aiStrategyIds?: string[];
};

const PrecheckResult: React.FC<{ result?: API.WritingTranslationPrecheckResult }> = ({ result }) => {
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
              {item.code} / {item.field}：{item.message}
            </Tag>
          ))}
        </Space>
      }
    />
  );
};

const usageByConfigType = (
  configType: API.AiCoachConfigType,
): API.WritingTranslationAiStrategyReference['usage'] => {
  if (configType === 'prompt_template') return 'scoring_prompt';
  if (configType === 'response_structure') return 'feedback_structure';
  if (configType === 'dependency_rule') return 'dependency_guard';
  return 'intent_hint';
};

const WritingTranslationTopicEditPage: React.FC = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isCreate = !id || id === 'new';
  const initialTopicType =
    (searchParams.get('topicType') as API.WritingTranslationTopicType) || 'writing';
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const access = useAccess() as {
    canAction?: (
      moduleKey: AdminModuleKey,
      targetAction: PermissionAction,
    ) => boolean;
  };
  const canCreate = Boolean(access.canAction?.('writingTranslation', 'create'));
  const canEdit = Boolean(access.canAction?.('writingTranslation', 'edit'));
  const canSubmit = Boolean(access.canAction?.('writingTranslation', 'submit'));
  const [loading, setLoading] = useState(!isCreate);
  const [topic, setTopic] = useState<API.WritingTranslationTopic>();
  const [aiStrategies, setAiStrategies] = useState<API.AiCoachStrategy[]>([]);
  const [precheckResult, setPrecheckResult] = useState<API.WritingTranslationPrecheckResult>();
  const [dirty, setDirty] = useState(false);
  const watchedTopicType =
    Form.useWatch('topicType', form) ?? initialTopicType;

  const canEditCurrent = useMemo(
    () => !topic || editableStatuses.includes(topic.status),
    [topic],
  );

  const noPagePermission = isCreate ? !canCreate : !canEdit;

  useEffect(() => {
    const loadAiStrategies = async () => {
      try {
        const response = await writingTranslationAiStrategies();
        setAiStrategies(response.data ?? []);
      } catch {
        setAiStrategies([]);
      }
    };
    loadAiStrategies();
  }, []);

  useEffect(() => {
    if (isCreate) {
      form.setFieldsValue(defaultTopicFormValues(initialTopicType));
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const response = await writingTranslationTopicDetail(String(id));
        const data = response.data;
        if (data) {
          setTopic(data);
          form.setFieldsValue({
            ...data,
            aiStrategyIds: data.aiStrategyRefs.map((item) => item.strategyId),
            dataVersion: data.dataVersion,
          });
          setPrecheckResult(data.lastPrecheck);
        }
      } catch {
        setTopic(undefined);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [form, id, initialTopicType, isCreate]);

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

  const normalizePayload = (values: FormValues): API.WritingTranslationTopicSaveParams => {
    const topicType = values.topicType;
    const selectedStrategies = aiStrategies.filter((item) =>
      values.aiStrategyIds?.includes(item.id),
    );
    const aiStrategyRefs: API.WritingTranslationAiStrategyReference[] =
      selectedStrategies.map((strategy) => ({
        strategyId: strategy.id,
        strategyTitle: strategy.title,
        strategyVersion: strategy.version,
        releaseVersionId: strategy.publishedVersion ?? strategy.version,
        configType: strategy.configType,
        businessScene: 'writing_explanation',
        usage: usageByConfigType(strategy.configType),
        required: strategy.configType !== 'intent',
        statusAtBinding: strategy.status,
        boundAt: new Date().toLocaleString('zh-CN', { hour12: false }),
      }));
    return {
      ...values,
      tags: values.tags ?? [],
      referencePoints: values.referencePoints ?? [],
      scoringDimensions:
        values.scoringDimensions ??
        (topicType === 'writing'
          ? defaultWritingDimensions()
          : defaultTranslationDimensions()),
      correctionRule:
        values.correctionRule ?? defaultCorrectionRule(topicType),
      aiStrategyRefs,
    };
  };

  const saveDraft = async () => {
    const values = await form.validateFields();
    const payload = normalizePayload(values);
    try {
      if (isCreate) {
        const response = await createWritingTranslationTopic(payload);
        message.success('草稿已保存');
        setDirty(false);
        if (response.data) {
          history.replace(`/writing-translation/topics/${response.data.id}/edit`);
        }
        return response.data;
      }
      const response = await updateWritingTranslationTopic(String(id), payload);
      message.success('草稿已保存');
      setDirty(false);
      if (response.data) {
        setTopic(response.data);
        form.setFieldValue('dataVersion', response.data.dataVersion);
        setPrecheckResult(response.data.lastPrecheck);
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
      const response = await precheckWritingTranslationTopic(normalizePayload(values));
      setPrecheckResult(response.data);
      message.success('预校验完成');
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '预校验失败');
    }
  };

  const runSampleValidation = async () => {
    const values = await form.validateFields();
    try {
      const response = await validateWritingTranslationSamples(normalizePayload(values));
      const result = response.data;
      if (!result) return;
      Modal.info({
        title: '静态样例校验',
        width: 720,
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
      await submitWritingTranslationReview(saved.id, {
        changeSummary: saved.changeSummary,
        dataVersion: saved.dataVersion,
        confirmWarnings,
      });
      message.success('已提交审核');
      history.push('/writing-translation/topics');
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
          onOk: () => submitReview(true),
        });
        return;
      }
      message.error(error?.data?.errorMessage || error?.message || '提交失败');
    }
  };

  const copyDraft = async () => {
    if (!topic) return;
    try {
      const response = await copyWritingTranslationTopic(topic.id);
      if (response.data) {
        message.success('已创建新草稿版本');
        history.replace(`/writing-translation/topics/${response.data.id}/edit`);
      }
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '创建草稿失败');
    }
  };

  if (noPagePermission) {
    return (
      <PageContainer>
        <Result
          status="403"
          title="无写译题目写权限"
          subTitle="当前角色只能查看写译题目或没有模块权限。"
          extra={<Button onClick={() => history.push('/writing-translation/topics')}>返回列表</Button>}
        />
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer>
        <Skeleton active />
      </PageContainer>
    );
  }

  if (!isCreate && !topic) {
    return (
      <PageContainer>
        <Result
          status="404"
          title="写译题目不存在"
          extra={<Button onClick={() => history.push('/writing-translation/topics')}>返回列表</Button>}
        />
      </PageContainer>
    );
  }

  if (!isCreate && topic && !canEditCurrent) {
    return (
      <PageContainer>
        <Result
          status="403"
          title="当前状态不可直接编辑"
          subTitle="待审核、已通过、待发布、已发布、已下架和已回滚题目不能直接覆盖。"
          extra={
            <Space>
              <Button onClick={() => history.push(`/writing-translation/topics/${topic.id}`)}>查看详情</Button>
              {canCreate && topic.status === 'published' ? (
                <Button type="primary" icon={<CopyOutlined />} onClick={copyDraft}>
                  创建新草稿
                </Button>
              ) : null}
            </Space>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={isCreate ? `新增${topicTypeText[watchedTopicType]}` : `编辑${topic?.name ?? ''}`}
      extra={[
        <Button key="back" icon={<ArrowLeftOutlined />} onClick={confirmBack}>
          返回
        </Button>,
        <Button key="precheck" icon={<SafetyCertificateOutlined />} onClick={runPrecheck}>
          预校验
        </Button>,
        <Button key="validate" onClick={runSampleValidation}>
          样例校验
        </Button>,
        <Button key="save" onClick={saveDraft}>
          保存草稿
        </Button>,
        canSubmit ? (
          <Button key="submit" type="primary" icon={<SendOutlined />} onClick={() => submitReview()}>
            保存并提交审核
          </Button>
        ) : null,
      ]}
    >
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        {topic ? (
          <Alert
            type="info"
            showIcon
            title={
              <Space>
                <span>当前状态</span>
                <StatusTag domain="reviewPublish" value={topic.status} />
                <span>版本 {topic.version}</span>
              </Space>
            }
          />
        ) : null}
        <PrecheckResult result={precheckResult} />
        <ProForm<FormValues>
          form={form}
          layout="vertical"
          submitter={false}
          onValuesChange={(changed) => {
            setDirty(true);
            if (changed.topicType && isCreate) {
              form.setFieldsValue(defaultTopicFormValues(changed.topicType));
            }
          }}
          grid
        >
          <ProFormText name="dataVersion" hidden />
          <ProForm.Group title="基础信息">
            <ProFormSelect
              name="topicType"
              label="题目类型"
              width="sm"
              readonly={!isCreate}
              rules={[{ required: true }]}
              options={topicTypeOptions}
            />
            <ProFormText name="name" label="题目名称" width="lg" rules={[{ required: true }]} />
            <ProFormSelect name="examType" label="考试类型" width="xs" rules={[{ required: true }]} options={examTypeOptions} />
            <ProFormSelect name="difficulty" label="难度" width="xs" rules={[{ required: true }]} options={difficultyOptions} />
            <ProFormSelect name="riskLevel" label="风险等级" width="xs" rules={[{ required: true }]} options={riskLevelOptions} />
            <ProFormDigit name="totalScore" label="总分" width="xs" min={1} rules={[{ required: true }]} />
            <ProFormSelect name="tags" label="标签" width="lg" mode="tags" />
          </ProForm.Group>
          <ProFormTextArea name="description" label="说明" fieldProps={{ rows: 2 }} />

          {watchedTopicType === 'writing' ? (
            <ProForm.Group title="写作题目">
              <ProFormTextArea name="prompt" label="题干" colProps={{ span: 24 }} fieldProps={{ rows: 4 }} rules={[{ required: true }]} />
              <ProFormText name="topicDirection" label="话题方向" width="md" />
              <ProFormSelect name="genre" label="体裁" width="sm" options={genreOptions} />
              <ProFormDigit name="minWords" label="最小字数" width="xs" min={1} />
              <ProFormDigit name="maxWords" label="最大字数" width="xs" min={1} />
              <ProFormDigit name="suggestedMinutes" label="建议分钟" width="xs" min={1} />
              <ProFormSelect name="writingRequirements" label="写作要求" width="xl" mode="tags" />
              <ProFormSelect name="outlinePoints" label="提纲要点" width="xl" mode="tags" />
              <ProFormTextArea name="sampleAnswerSummary" label="范文摘要" colProps={{ span: 12 }} fieldProps={{ rows: 3 }} />
              <ProFormTextArea name="templateUsageWarning" label="模板警示" colProps={{ span: 12 }} fieldProps={{ rows: 3 }} />
            </ProForm.Group>
          ) : (
            <ProForm.Group title="翻译题目">
              <ProFormTextArea name="sourceText" label="中文原文" colProps={{ span: 24 }} fieldProps={{ rows: 4 }} rules={[{ required: true }]} />
              <ProFormTextArea name="referenceTranslation" label="参考译文" colProps={{ span: 24 }} fieldProps={{ rows: 4 }} rules={[{ required: true }]} />
              <ProFormText name="topicDirection" label="话题方向" width="md" />
              <ProFormSelect name="translationDirection" label="翻译方向" width="sm" options={[{ label: 'zh-CN → en', value: 'zh-CN_to_en' }]} />
              <ProFormDigit name="suggestedMinutes" label="建议分钟" width="xs" min={1} />
              <ProFormSelect name="keywords" label="关键词" width="xl" mode="tags" />
              <ProFormSelect name="fixedExpressions" label="固定表达" width="xl" mode="tags" />
              <ProFormSelect name="acceptableExpressions" label="可接受表达" width="xl" mode="tags" />
              <ProFormSelect name="commonMistranslations" label="常见误译" width="xl" mode="tags" />
            </ProForm.Group>
          )}

          <ProForm.Group title="参考要点">
            <ProFormSelect name="referencePoints" label="参考要点" width="xl" mode="tags" rules={[{ required: true }]} />
          </ProForm.Group>

          <ProFormList
            name="scoringDimensions"
            label="评分维度"
            creatorButtonProps={{ creatorButtonText: '新增评分维度' }}
            min={1}
          >
            <ProForm.Group>
              <ProFormText name="key" label="Key" width="xs" rules={[{ required: true }]} />
              <ProFormText name="name" label="名称" width="sm" rules={[{ required: true }]} />
              <ProFormDigit name="order" label="顺序" width="xs" min={1} />
              <ProFormDigit name="weight" label="权重%" width="xs" min={0} max={100} />
              <ProFormDigit name="maxScore" label="最高分" width="xs" min={0} />
              <ProFormTextArea name="description" label="评分说明" colProps={{ span: 10 }} fieldProps={{ rows: 2 }} />
            </ProForm.Group>
          </ProFormList>

          <ProForm.Group title="批改规则">
            <ProFormSelect name={['correctionRule', 'feedbackStructure']} label="反馈结构" width="xl" mode="tags" />
            <ProFormTextArea name={['correctionRule', 'overallScoringGuide']} label="总分规则" colProps={{ span: 12 }} fieldProps={{ rows: 3 }} />
            <ProFormTextArea name={['correctionRule', 'offTopicRule']} label="偏题规则" colProps={{ span: 12 }} fieldProps={{ rows: 3 }} />
            <ProFormTextArea name={['correctionRule', 'blankAnswerRule']} label="空白答案规则" colProps={{ span: 12 }} fieldProps={{ rows: 3 }} />
            <ProFormTextArea name={['correctionRule', 'templateAbuseRule']} label="模板滥用规则" colProps={{ span: 12 }} fieldProps={{ rows: 3 }} />
            <ProFormTextArea name={['correctionRule', 'fallbackMessage']} label="兜底规则" colProps={{ span: 12 }} fieldProps={{ rows: 3 }} />
            <ProFormSelect name={['correctionRule', 'manualReviewConditions']} label="人工复核条件" width="xl" mode="tags" />
          </ProForm.Group>

          <ProFormList
            name={['correctionRule', 'deductionRules']}
            label="错误与扣分规则"
            creatorButtonProps={{ creatorButtonText: '新增错误规则' }}
          >
            <ProForm.Group>
              <ProFormText name="code" label="规则编码" width="sm" rules={[{ required: true }]} />
              <ProFormText name="name" label="规则名称" width="sm" rules={[{ required: true }]} />
              <ProFormSelect
                name="severity"
                label="严重级别"
                width="xs"
                options={[
                  { label: 'minor', value: 'minor' },
                  { label: 'medium', value: 'medium' },
                  { label: 'major', value: 'major' },
                  { label: 'critical', value: 'critical' },
                ]}
              />
              <ProFormText name="dimensionKey" label="维度 Key" width="xs" />
              <ProFormDigit name="suggestedDeduction" label="建议扣分" width="xs" min={0} />
              <ProFormDigit name="maxDeduction" label="扣分上限" width="xs" min={0} />
              <ProFormTextArea name="description" label="说明" colProps={{ span: 10 }} fieldProps={{ rows: 2 }} />
            </ProForm.Group>
          </ProFormList>

          <ProForm.Group title="AI 策略关联">
            <ProFormSelect
              name="aiStrategyIds"
              label="固定版本策略"
              width="xl"
              mode="multiple"
              options={aiStrategies.map((item) => ({
                label: `${item.title} / ${item.configType} / ${item.version}`,
                value: item.id,
              }))}
              tooltip="翻译题目 MVP 暂时复用 writing_explanation 场景策略。"
            />
            <ProFormSelect
              name="aiUsagePreview"
              label="用途参考"
              width="lg"
              mode="multiple"
              disabled
              options={aiUsageOptions}
            />
          </ProForm.Group>

          <ProForm.Group title="变更说明">
            <ProFormTextArea name="changeSummary" label="变更说明" colProps={{ span: 12 }} fieldProps={{ rows: 3 }} rules={[{ required: true }]} />
            <ProFormTextArea name="internalRemark" label="内部备注" colProps={{ span: 12 }} fieldProps={{ rows: 3 }} />
          </ProForm.Group>
        </ProForm>
      </Space>
    </PageContainer>
  );
};

export default WritingTranslationTopicEditPage;
