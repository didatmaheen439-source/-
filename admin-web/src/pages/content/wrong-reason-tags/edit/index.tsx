import {
  PageContainer,
  ProForm,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { history, useAccess, useParams } from '@umijs/max';
import {
  App,
  Button,
  Card,
  Descriptions,
  Form,
  Modal,
  Result,
  Skeleton,
  Space,
} from 'antd';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import StatusTag from '@/components/StatusTag';
import type {
  AdminModuleKey,
  PermissionAction,
} from '@/foundation/permissions';
import {
  createWrongReasonTag,
  submitWrongReasonTagReview,
  updateWrongReasonTag,
  wrongReasonTagDetail,
} from '@/services/ant-design-pro/api';
import {
  editableWrongReasonStatuses,
  examTypeOptions,
  questionTypeOptions,
  wrongReasonCategoryOptions,
  wrongReasonSeverityOptions,
} from '../constants';

type WrongReasonTagFormValues = {
  name: string;
  category: API.WrongReasonTagCategory;
  examTypes: API.ExamType[];
  questionTypes: API.QuestionType[];
  severity: API.WrongReasonTagSeverity;
  description: string;
  changeSummary?: string;
  referenceImpact?: string;
};

const canEditTag = (
  tag: API.WrongReasonTagItem | undefined,
  canAction?: (
    targetModule: AdminModuleKey,
    targetAction: PermissionAction,
  ) => boolean,
) =>
  Boolean(
    tag &&
      canAction?.('content', 'edit') &&
      editableWrongReasonStatuses.includes(tag.status),
  );

const toFormValues = (
  tag: API.WrongReasonTagItem,
): WrongReasonTagFormValues => ({
  name: tag.name,
  category: tag.category,
  examTypes: tag.examTypes,
  questionTypes: tag.questionTypes,
  severity: tag.severity,
  description: tag.description,
  changeSummary: tag.changeSummary,
  referenceImpact: tag.referenceImpact,
});

const toPayload = (
  values: WrongReasonTagFormValues,
): API.WrongReasonTagSaveParams => ({
  name: values.name,
  category: values.category,
  examTypes: values.examTypes,
  questionTypes: values.questionTypes,
  severity: values.severity,
  description: values.description,
  changeSummary: values.changeSummary,
  referenceImpact: values.referenceImpact,
});

const WrongReasonTagEditPage: React.FC = () => {
  const { message } = App.useApp();
  const params = useParams<{ id?: string }>();
  const tagId = params.id;
  const isCreate = !tagId;
  const [form] = Form.useForm<WrongReasonTagFormValues>();
  const access = useAccess() as {
    canAction?: (
      targetModule: AdminModuleKey,
      targetAction: PermissionAction,
    ) => boolean;
  };
  const [tag, setTag] = useState<API.WrongReasonTagItem>();
  const [loading, setLoading] = useState(Boolean(tagId));
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const canSave = isCreate
    ? Boolean(access.canAction?.('content', 'create'))
    : canEditTag(tag, access.canAction);
  const canSubmit = Boolean(access.canAction?.('content', 'submit'));
  const pageTitle = isCreate ? '新增错因标签' : '编辑错因标签';

  useEffect(() => {
    if (!tagId) return;

    const loadTag = async () => {
      setLoading(true);
      try {
        const response = await wrongReasonTagDetail(tagId);
        if (response.data) {
          setTag(response.data);
          form.setFieldsValue(toFormValues(response.data));
        } else {
          setNotFound(true);
        }
      } catch (error: any) {
        if (error?.data?.errorCode === '404') {
          setNotFound(true);
        } else {
          message.error(
            error?.data?.errorMessage ||
              error?.message ||
              '错因标签加载失败',
          );
        }
      } finally {
        setLoading(false);
      }
    };

    loadTag();
  }, [form, message, tagId]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const baseItems = useMemo(() => {
    if (!tag) return [];
    return [
      { key: 'id', label: '标签 ID', children: tag.id },
      {
        key: 'status',
        label: '状态',
        children: <StatusTag domain="reviewPublish" value={tag.status} />,
      },
      { key: 'referenceCount', label: '引用次数', children: tag.referenceCount },
      { key: 'version', label: '版本', children: tag.version },
      { key: 'updatedAt', label: '更新时间', children: tag.updatedAt },
    ];
  }, [tag]);

  const backToList = () => history.push('/content/wrong-reason-tags');

  const leavePage = () => {
    if (!dirty) {
      backToList();
      return;
    }

    Modal.confirm({
      title: '放弃未保存修改？',
      content: '当前表单已有修改，离开后这些修改不会保存。',
      okText: '放弃修改',
      cancelText: '继续编辑',
      onOk: backToList,
    });
  };

  const saveTag = async (submitAfterSave: boolean) => {
    const values = await form.validateFields();
    if (submitAfterSave && !values.changeSummary?.trim()) {
      form.setFields([
        {
          name: 'changeSummary',
          errors: ['保存并提交审核需要填写变更说明'],
        },
      ]);
      return;
    }

    const payload = toPayload(values);
    setSaving(true);
    try {
      const response = isCreate
        ? await createWrongReasonTag(payload)
        : await updateWrongReasonTag(tagId as string, payload);
      const savedTag = response.data;

      if (submitAfterSave && savedTag?.id) {
        await submitWrongReasonTagReview(savedTag.id, {
          changeSummary: values.changeSummary?.trim() || '提交错因标签审核。',
        });
        message.success('错因标签已保存并提交审核');
      } else {
        message.success('错因标签草稿已保存');
      }

      setDirty(false);
      backToList();
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (!isCreate && loading) {
    return (
      <PageContainer title={pageTitle}>
        <Skeleton active paragraph={{ rows: 8 }} />
      </PageContainer>
    );
  }

  if (notFound) {
    return (
      <PageContainer title={pageTitle}>
        <Result
          status="404"
          title="404"
          subTitle="错因标签不存在。"
          extra={<Button onClick={backToList}>返回列表</Button>}
        />
      </PageContainer>
    );
  }

  if (!canSave) {
    return (
      <PageContainer title={pageTitle}>
        <Result
          status="403"
          title="403"
          subTitle="当前账号无权编辑该错因标签。"
          extra={<Button onClick={backToList}>返回列表</Button>}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer title={pageTitle}>
      <Card variant="borderless">
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          {tag ? (
            <Descriptions column={5} size="small" bordered items={baseItems} />
          ) : null}
          <ProForm<WrongReasonTagFormValues>
            form={form}
            layout="vertical"
            requiredMark={false}
            initialValues={{
              category: 'comprehension_bias',
              examTypes: ['CET4'],
              questionTypes: ['single_choice'],
              severity: 'medium',
            }}
            onValuesChange={() => setDirty(true)}
            submitter={{
              render: () =>
                [
                  <Button key="cancel" onClick={leavePage}>
                    取消
                  </Button>,
                  <Button
                    key="save"
                    loading={saving}
                    onClick={() => saveTag(false)}
                  >
                    保存草稿
                  </Button>,
                  canSubmit ? (
                    <Button
                      key="submit"
                      type="primary"
                      loading={saving}
                      onClick={() => saveTag(true)}
                    >
                      保存并提交审核
                    </Button>
                  ) : null,
                ].filter(Boolean),
            }}
          >
            <ProFormText
              name="name"
              label="标签名"
              rules={[{ required: true, message: '请输入标签名' }]}
              placeholder="请输入标签名"
              fieldProps={{ maxLength: 40, showCount: true }}
            />
            <ProForm.Group>
              <ProFormSelect
                name="category"
                label="分类"
                width="sm"
                options={wrongReasonCategoryOptions}
                rules={[{ required: true, message: '请选择分类' }]}
              />
              <ProFormSelect
                name="severity"
                label="严重级别"
                width="sm"
                options={wrongReasonSeverityOptions}
                rules={[{ required: true, message: '请选择严重级别' }]}
              />
            </ProForm.Group>
            <ProForm.Group>
              <ProFormSelect
                name="examTypes"
                label="适用考试"
                width="md"
                mode="multiple"
                options={examTypeOptions}
                rules={[{ required: true, message: '请选择适用考试' }]}
              />
              <ProFormSelect
                name="questionTypes"
                label="适用题型"
                width="lg"
                mode="multiple"
                options={questionTypeOptions}
                rules={[{ required: true, message: '请选择适用题型' }]}
              />
            </ProForm.Group>
            <ProFormTextArea
              name="description"
              label="说明"
              rules={[{ required: true, message: '请输入说明' }]}
              placeholder="请输入运营和教研可理解的错因说明"
              fieldProps={{ rows: 4, maxLength: 300, showCount: true }}
            />
            <ProFormTextArea
              name="referenceImpact"
              label="引用影响"
              placeholder="说明该标签被题目、题组或数据引用后的影响"
              fieldProps={{ rows: 3, maxLength: 240, showCount: true }}
            />
            <ProFormTextArea
              name="changeSummary"
              label="变更说明"
              placeholder="保存并提交审核时必填"
              fieldProps={{ rows: 3, maxLength: 240, showCount: true }}
            />
          </ProForm>
        </Space>
      </Card>
    </PageContainer>
  );
};

export default WrongReasonTagEditPage;
