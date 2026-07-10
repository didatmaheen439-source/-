import { PlusOutlined } from '@ant-design/icons';
import {
  PageContainer,
  ProForm,
  ProFormDigit,
  ProFormGroup,
  ProFormList,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { history, useModel, useParams } from '@umijs/max';
import { App, Button, Result, Space, Spin, Typography } from 'antd';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import StatusTag from '@/components/StatusTag';
import {
  availableLearningPathQuestionGroups,
  availableLearningPathQuestions,
  createLearningPathConfig,
  learningPathConfigDetail,
  precheckExistingLearningPathConfig,
  precheckLearningPathConfig,
  submitLearningPathConfigReview,
  updateLearningPathConfig,
} from '@/services/ant-design-pro/api';
import {
  buildReferenceOptions,
  conditionModeOptions,
  defaultDiagnosisFormValues,
  defaultTemplateFormValues,
  editableStatuses,
  examTypeOptions,
  metricOptions,
  moduleOptions,
  operatorOptions,
  taskPriorityOptions,
  weakLevelOptions,
} from '../config';
import PrecheckResult from './PrecheckResult';

type EditPageProps = {
  kind: API.LearningPathConfigKind;
};

type FormValues = API.LearningPathSaveParams & {
  submitAfterSave?: boolean;
};

const getPrefix = (kind: API.LearningPathConfigKind) =>
  kind === 'diagnosis_rule'
    ? '/learning-path/diagnosis-rules'
    : '/learning-path/task-templates';

const toReferenceItems = (
  ids: string[] = [],
  references: API.LearningPathReference[],
) =>
  ids.map((id) => references.find((item) => item.id === id) ?? {
    id,
    type: 'question' as const,
    name: id,
    examType: 'CET4' as const,
    module: 'reading' as const,
    status: 'disabled' as const,
    available: false,
  });

const toInitialValues = (
  kind: API.LearningPathConfigKind,
  detail?: API.LearningPathConfigItem,
) => {
  if (!detail) {
    return kind === 'diagnosis_rule'
      ? defaultDiagnosisFormValues
      : defaultTemplateFormValues;
  }
  if (detail.kind === 'diagnosis_rule') {
    return {
      ...detail,
      referenceIds: detail.references.map((item) => item.id),
      conditionGroup: {
        ...detail.conditionGroup,
        conditions: detail.conditionGroup.conditions.map((item) => ({
          ...item,
          value: item.value ?? item.min,
        })),
      },
    };
  }
  return {
    ...detail,
    taskItems: detail.taskItems.map((item) => ({ ...item })),
  };
};

const normalizeValues = (
  kind: API.LearningPathConfigKind,
  values: FormValues,
  detail: API.LearningPathConfigItem | undefined,
  references: API.LearningPathReference[],
): API.LearningPathSaveParams => {
  const base = {
    ...values,
    kind,
    name: values.name?.trim(),
    description: values.description?.trim(),
    changeSummary: values.changeSummary?.trim(),
    internalRemark: values.internalRemark?.trim(),
    dataVersion: detail?.dataVersion ?? values.dataVersion,
  };

  if (kind === 'diagnosis_rule') {
    const referenceIds = ((values as any).referenceIds ?? []) as string[];
    return {
      ...base,
      references: toReferenceItems(referenceIds, references),
      conditionGroup: {
        ...((values as Partial<API.DiagnosisRule>).conditionGroup ?? {
          mode: 'all',
          conditions: [],
        }),
        conditions: (
          (values as Partial<API.DiagnosisRule>).conditionGroup?.conditions ?? []
        ).map((item, index) => ({
          ...item,
          id: item.id || `condition-${Date.now()}-${index}`,
          value: item.operator === 'between' ? undefined : Number(item.value ?? 0),
          min: item.operator === 'between' ? Number(item.min ?? 0) : undefined,
          max: item.operator === 'between' ? Number(item.max ?? 0) : undefined,
        })),
      },
    };
  }

  const taskItems = ((values as Partial<API.TodayTaskTemplate>).taskItems ?? [])
    .map((item, index) => {
      const reference = references.find((ref) => ref.id === item.contentId);
      return {
        ...item,
        id: item.id || `task-${Date.now()}-${index}`,
        order: Number(item.order ?? index + 1),
        module: item.module ?? reference?.module ?? 'reading',
        contentType: item.contentType ?? reference?.type ?? 'question',
        contentName: reference?.name ?? item.contentName ?? item.contentId,
        estimatedMinutes: Number(item.estimatedMinutes ?? 0),
        required: item.required ?? true,
        replacementAllowed: item.replacementAllowed ?? true,
      };
    });

  return {
    ...base,
    taskItems,
    totalEstimatedMinutes: taskItems.reduce(
      (sum, item) => sum + Number(item.estimatedMinutes || 0),
      0,
    ),
  };
};

const EditPage: React.FC<EditPageProps> = ({ kind }) => {
  const { id } = useParams();
  const isCreate = !id;
  const { message, modal } = App.useApp();
  const [form] = ProForm.useForm<FormValues>();
  const { initialState } = useModel('@@initialState');
  const roleId = initialState?.currentUser?.roleId;
  const [detail, setDetail] = useState<API.LearningPathConfigItem>();
  const [precheck, setPrecheck] = useState<API.LearningPathPrecheckResult>();
  const [references, setReferences] = useState<API.LearningPathReference[]>([]);
  const [loading, setLoading] = useState(!isCreate);
  const [dirty, setDirty] = useState(false);
  const canWrite = roleId === 'super_admin' || roleId === 'teaching_reviewer';

  const title = kind === 'diagnosis_rule' ? '诊断规则' : '今日任务模板';
  const referenceOptions = useMemo(
    () => buildReferenceOptions(references),
    [references],
  );
  const canEdit =
    canWrite && (!detail || editableStatuses.includes(detail.status));
  const listPath = getPrefix(kind);

  const loadData = async () => {
    setLoading(true);
    try {
      const [questions, groups] = await Promise.all([
        availableLearningPathQuestions({ pageSize: 100 }),
        availableLearningPathQuestionGroups({ pageSize: 100 }),
      ]);
      setReferences([...(questions.data ?? []), ...(groups.data ?? [])]);
      if (id) {
        const response = await learningPathConfigDetail(id);
        if (!response.data || response.data.kind !== kind) {
          setDetail(undefined);
        } else {
          setDetail(response.data);
          setPrecheck(response.data.lastPrecheck);
          form.setFieldsValue(toInitialValues(kind, response.data) as FormValues);
        }
      } else {
        form.setFieldsValue(toInitialValues(kind) as FormValues);
      }
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id, kind]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  if (!canWrite) {
    return (
      <Result
        status="403"
        title="403"
        subTitle="当前账号无学习路径配置写入权限。"
        extra={<Button onClick={() => history.push(listPath)}>返回列表</Button>}
      />
    );
  }

  if (loading) {
    return (
      <PageContainer title={`${isCreate ? '新增' : '编辑'}${title}`}>
        <Spin />
      </PageContainer>
    );
  }

  if (id && !detail) {
    return (
      <Result
        status="404"
        title="404"
        subTitle="学习路径配置不存在或类型不匹配。"
        extra={<Button onClick={() => history.push(listPath)}>返回列表</Button>}
      />
    );
  }

  if (!canEdit) {
    return (
      <Result
        status="403"
        title="当前状态不可直接编辑"
        subTitle="已发布、待发布、已下架或已回滚配置需要先复制为新草稿。"
        extra={<Button onClick={() => history.push(listPath)}>返回列表</Button>}
      />
    );
  }

  const runPrecheck = async () => {
    const values = await form.validateFields();
    const payload = normalizeValues(kind, values, detail, references);
    const response = detail
      ? await precheckExistingLearningPathConfig(detail.id, payload)
      : await precheckLearningPathConfig(payload);
    setPrecheck(response.data);
    if (response.data?.level === 'error') {
      message.error('预校验存在阻断错误');
    } else if (response.data?.level === 'warning') {
      message.warning('预校验存在警告');
    } else {
      message.success('预校验通过');
    }
    return response.data;
  };

  const saveDraft = async (values: FormValues) => {
    const payload = normalizeValues(kind, values, detail, references);
    const checked = await (detail
      ? precheckExistingLearningPathConfig(detail.id, payload)
      : precheckLearningPathConfig(payload));
    setPrecheck(checked.data);
    if (checked.data?.level === 'error') {
      message.error('预校验存在阻断错误，不能保存');
      return false;
    }
    const response = detail
      ? await updateLearningPathConfig(detail.id, payload)
      : await createLearningPathConfig(payload);
    if (!response.data) return false;
    setDirty(false);
    setDetail(response.data);
    message.success('草稿已保存');
    if (values.submitAfterSave) {
      const savedConfig = response.data;
      const submit = async (confirmWarnings = false) =>
        submitLearningPathConfigReview(savedConfig.id, {
          changeSummary: payload.changeSummary || '保存后提交审核。',
          dataVersion: savedConfig.dataVersion,
          confirmWarnings,
        });
      if (checked.data?.level === 'warning') {
        modal.confirm({
          title: '预校验存在警告，确认提交审核？',
          content: checked.data.summary,
          onOk: async () => {
            await submit(true);
            message.success('已提交审核');
            history.push('/review-release/pending');
          },
        });
        return true;
      }
      await submit(false);
      message.success('已提交审核');
      history.push('/review-release/pending');
      return true;
    }
    history.push(listPath);
    return true;
  };

  return (
    <PageContainer
      title={`${isCreate ? '新增' : '编辑'}${title}`}
      extra={
        detail ? (
          <Space>
            <StatusTag domain="reviewPublish" value={detail.status} />
            <Typography.Text type="secondary">
              {detail.version} · 数据版本 {detail.dataVersion}
            </Typography.Text>
          </Space>
        ) : null
      }
    >
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <PrecheckResult result={precheck} />
        <ProForm<FormValues>
          form={form}
          layout="vertical"
          submitter={{
            searchConfig: { submitText: '保存草稿', resetText: '取消' },
            render: (_, doms) => (
              <Space>
                <Button onClick={() => history.push(listPath)}>
                  取消
                </Button>
                <Button onClick={runPrecheck}>预校验</Button>
                {doms[1]}
                <Button
                  type="primary"
                  onClick={async () => {
                    form.setFieldValue('submitAfterSave', true);
                    await form.submit();
                  }}
                >
                  保存并提交审核
                </Button>
              </Space>
            ),
          }}
          onValuesChange={() => setDirty(true)}
          onFinish={saveDraft}
        >
          <ProFormText name="kind" hidden initialValue={kind} />
          <ProFormText name="dataVersion" hidden />
          <ProFormText name="submitAfterSave" hidden />
          <ProFormGroup>
            <ProFormText
              name="name"
              label="配置名称"
              width="lg"
              rules={[{ required: true, message: '请输入配置名称' }]}
            />
            <ProFormSelect
              name="examType"
              label="考试类型"
              width="sm"
              options={examTypeOptions}
              rules={[{ required: true, message: '请选择考试类型' }]}
            />
            <ProFormDigit
              name="priority"
              label="优先级"
              width="sm"
              min={1}
              max={99}
              rules={[{ required: true, message: '请输入优先级' }]}
            />
          </ProFormGroup>
          <ProFormTextArea name="description" label="配置说明" fieldProps={{ rows: 2 }} />

          <ProFormGroup title="适用用户条件">
            <ProFormSelect
              name={['userCondition', 'conditionMode']}
              label="条件关系"
              width="sm"
              options={conditionModeOptions}
            />
            <ProFormDigit name={['userCondition', 'targetScoreMin']} label="目标分下限" width="sm" />
            <ProFormDigit name={['userCondition', 'targetScoreMax']} label="目标分上限" width="sm" />
            <ProFormDigit name={['userCondition', 'dailyMinutesMin']} label="每日分钟下限" width="sm" />
            <ProFormDigit name={['userCondition', 'dailyMinutesMax']} label="每日分钟上限" width="sm" />
          </ProFormGroup>

          {kind === 'diagnosis_rule' ? (
            <>
              <ProFormGroup title="诊断判定">
                <ProFormSelect
                  name="applicableModule"
                  label="适用模块"
                  width="sm"
                  options={moduleOptions}
                  rules={[{ required: true, message: '请选择适用模块' }]}
                />
                <ProFormText name="questionRange" label="题目范围" width="md" />
                <ProFormSelect
                  name="referenceIds"
                  label="引用题目/题组"
                  width="xl"
                  mode="multiple"
                  options={referenceOptions}
                  rules={[{ required: true, message: '请选择引用对象' }]}
                />
              </ProFormGroup>
              <ProFormSelect
                name={['conditionGroup', 'mode']}
                label="判定条件关系"
                width="sm"
                options={conditionModeOptions}
              />
              <ProFormList
                name={['conditionGroup', 'conditions']}
                label="判定条件"
                creatorButtonProps={{ icon: <PlusOutlined />, creatorButtonText: '新增条件' }}
                min={1}
              >
                <ProFormGroup>
                  <ProFormSelect name="metric" label="指标" width="sm" options={metricOptions} />
                  <ProFormSelect name="operator" label="运算符" width="xs" options={operatorOptions} />
                  <ProFormDigit name="value" label="数值" width="xs" />
                  <ProFormDigit name="min" label="最小值" width="xs" />
                  <ProFormDigit name="max" label="最大值" width="xs" />
                  <ProFormText name="errorTag" label="错因标签" width="sm" />
                  <ProFormText name="description" label="说明" width="md" />
                </ProFormGroup>
              </ProFormList>
              <ProFormGroup title="诊断输出">
                <ProFormSelect
                  name={['output', 'weakModules']}
                  label="薄弱模块"
                  width="md"
                  mode="multiple"
                  options={moduleOptions}
                />
                <ProFormSelect name={['output', 'weakLevel']} label="薄弱等级" width="sm" options={weakLevelOptions} />
                <ProFormSelect name={['output', 'taskPriority']} label="任务优先级" width="sm" options={taskPriorityOptions} />
                <ProFormText name={['output', 'recommendedTaskType']} label="推荐任务类型" width="sm" />
                <ProFormDigit name={['output', 'estimatedMinutes']} label="预计分钟" width="sm" min={1} />
              </ProFormGroup>
              <ProFormTextArea name={['output', 'outputDescription']} label="输出说明" fieldProps={{ rows: 2 }} />
            </>
          ) : (
            <>
              <ProFormGroup title="模板匹配">
                <ProFormSelect
                  name="matchedWeakModules"
                  label="命中薄弱模块"
                  width="md"
                  mode="multiple"
                  options={moduleOptions}
                  rules={[{ required: true, message: '请选择薄弱模块' }]}
                />
                <ProFormSelect name="weakLevel" label="薄弱等级" width="sm" options={weakLevelOptions} />
                <ProFormSwitch name="replacementAllowed" label="允许替换" />
              </ProFormGroup>
              <ProFormList
                name="taskItems"
                label="任务项"
                creatorButtonProps={{ icon: <PlusOutlined />, creatorButtonText: '新增任务项' }}
                min={1}
              >
                <ProFormGroup>
                  <ProFormDigit name="order" label="顺序" width="xs" min={1} />
                  <ProFormSelect name="module" label="模块" width="sm" options={moduleOptions} />
                  <ProFormText name="taskType" label="任务类型" width="sm" />
                  <ProFormSelect
                    name="contentId"
                    label="引用内容"
                    width="lg"
                    options={referenceOptions}
                    rules={[{ required: true, message: '请选择引用内容' }]}
                  />
                  <ProFormDigit name="estimatedMinutes" label="预计分钟" width="sm" min={1} />
                  <ProFormSwitch name="required" label="必做" />
                  <ProFormSwitch name="replacementAllowed" label="可替换" />
                </ProFormGroup>
              </ProFormList>
              <ProFormTextArea name="templateDescription" label="模板说明" fieldProps={{ rows: 2 }} />
            </>
          )}

          <ProFormTextArea
            name="changeSummary"
            label="变更说明"
            rules={[{ required: true, message: '请输入变更说明' }]}
            fieldProps={{ rows: 3 }}
          />
          <ProFormTextArea name="internalRemark" label="内部备注" fieldProps={{ rows: 2 }} />
        </ProForm>
      </Space>
    </PageContainer>
  );
};

export default EditPage;
