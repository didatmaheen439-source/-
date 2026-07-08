import {
  PageContainer,
  ProForm,
  ProFormRadio,
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
  contentQuestionDetail,
  createContentQuestion,
  submitContentQuestionReview,
  updateContentQuestion,
} from '@/services/ant-design-pro/api';
import {
  examTypeOptions,
  optionKeys,
  questionDifficultyOptions,
  questionSkillOptions,
  questionTypeOptions,
} from '../constants';

type QuestionFormValues = {
  title: string;
  stem: string;
  examType: API.ExamType;
  questionType: API.QuestionType;
  skill: API.QuestionSkill;
  difficulty: API.QuestionDifficulty;
  tags?: string[];
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  answer: 'A' | 'B' | 'C' | 'D';
  analysis: string;
  changeSummary?: string;
  referenceImpact?: string;
};

const canEditQuestion = (
  question: API.QuestionItem | undefined,
  canAction?: (
    targetModule: AdminModuleKey,
    targetAction: PermissionAction,
  ) => boolean,
) =>
  Boolean(
    question &&
      canAction?.('content', 'edit') &&
      ['draft', 'rejected'].includes(question.status),
  );

const toFormValues = (question: API.QuestionItem): QuestionFormValues => ({
  title: question.title,
  stem: question.stem,
  examType: question.examType,
  questionType: question.questionType,
  skill: question.skill,
  difficulty: question.difficulty,
  tags: question.tags,
  optionA: question.options.find((item) => item.key === 'A')?.content ?? '',
  optionB: question.options.find((item) => item.key === 'B')?.content ?? '',
  optionC: question.options.find((item) => item.key === 'C')?.content ?? '',
  optionD: question.options.find((item) => item.key === 'D')?.content ?? '',
  answer: question.answer,
  analysis: question.analysis,
  changeSummary: question.changeSummary,
  referenceImpact: question.referenceImpact,
});

const toPayload = (values: QuestionFormValues): API.QuestionSaveParams => ({
  title: values.title,
  stem: values.stem,
  examType: values.examType,
  questionType: values.questionType,
  skill: values.skill,
  difficulty: values.difficulty,
  tags: values.tags ?? [],
  options: optionKeys.map((key) => ({
    key,
    content: values[`option${key}` as keyof QuestionFormValues] as string,
  })),
  answer: values.answer,
  analysis: values.analysis,
  changeSummary: values.changeSummary,
  referenceImpact: values.referenceImpact,
});

const QuestionEditPage: React.FC = () => {
  const { message } = App.useApp();
  const params = useParams<{ id?: string }>();
  const questionId = params.id;
  const isCreate = !questionId;
  const [form] = Form.useForm<QuestionFormValues>();
  const access = useAccess() as {
    canAction?: (
      targetModule: AdminModuleKey,
      targetAction: PermissionAction,
    ) => boolean;
  };
  const [question, setQuestion] = useState<API.QuestionItem>();
  const [loading, setLoading] = useState(Boolean(questionId));
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const canSave = isCreate
    ? Boolean(access.canAction?.('content', 'create'))
    : canEditQuestion(question, access.canAction);
  const canSubmit = Boolean(access.canAction?.('content', 'submit'));

  useEffect(() => {
    if (!questionId) return;

    const loadQuestion = async () => {
      setLoading(true);
      try {
        const response = await contentQuestionDetail(questionId);
        if (response.data) {
          setQuestion(response.data);
          form.setFieldsValue(toFormValues(response.data));
        }
      } catch (error: any) {
        message.error(
          error?.data?.errorMessage || error?.message || '题目加载失败',
        );
      } finally {
        setLoading(false);
      }
    };

    loadQuestion();
  }, [form, message, questionId]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const pageTitle = isCreate ? '新增题目' : '编辑题目';

  const baseItems = useMemo(() => {
    if (!question) return [];
    return [
      { key: 'id', label: '题目 ID', children: question.id },
      {
        key: 'status',
        label: '状态',
        children: <StatusTag domain="reviewPublish" value={question.status} />,
      },
      { key: 'version', label: '版本', children: question.version },
      { key: 'updatedAt', label: '更新时间', children: question.updatedAt },
    ];
  }, [question]);

  const leavePage = () => {
    if (!dirty) {
      history.push('/content/questions');
      return;
    }

    Modal.confirm({
      title: '放弃未保存修改？',
      content: '当前表单已有修改，离开后这些修改不会保存。',
      okText: '放弃修改',
      cancelText: '继续编辑',
      onOk: () => history.push('/content/questions'),
    });
  };

  const saveQuestion = async (submitAfterSave: boolean) => {
    const values = await form.validateFields();
    const payload = toPayload(values);
    setSaving(true);
    try {
      const response = isCreate
        ? await createContentQuestion(payload)
        : await updateContentQuestion(questionId as string, payload);
      const savedQuestion = response.data;

      if (submitAfterSave && savedQuestion?.id) {
        await submitContentQuestionReview(savedQuestion.id, {
          changeSummary: values.changeSummary || '提交题目审核。',
        });
        message.success('题目已保存并提交审核');
      } else {
        message.success('题目草稿已保存');
      }

      setDirty(false);
      history.push('/content/questions');
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

  if (!canSave) {
    return (
      <PageContainer title={pageTitle}>
        <Result
          status="403"
          title="403"
          subTitle="当前账号无权编辑该题目。"
          extra={
            <Button onClick={() => history.push('/content/questions')}>
              返回列表
            </Button>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer title={pageTitle}>
      <Card variant="borderless">
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          {question ? (
            <Descriptions column={4} size="small" bordered items={baseItems} />
          ) : null}
          <ProForm<QuestionFormValues>
            form={form}
            layout="vertical"
            requiredMark={false}
            initialValues={{
              examType: 'CET4',
              questionType: 'single_choice',
              skill: 'reading',
              difficulty: 'medium',
              answer: 'A',
              tags: [],
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
                    onClick={() => saveQuestion(false)}
                  >
                    保存草稿
                  </Button>,
                  canSubmit ? (
                    <Button
                      key="submit"
                      type="primary"
                      loading={saving}
                      onClick={() => saveQuestion(true)}
                    >
                      保存并提交审核
                    </Button>
                  ) : null,
                ].filter(Boolean),
            }}
          >
            <ProFormText
              name="title"
              label="题目标题"
              rules={[{ required: true, message: '请输入题目标题' }]}
              placeholder="请输入题目标题"
            />
            <ProFormTextArea
              name="stem"
              label="题干"
              rules={[{ required: true, message: '请输入题干' }]}
              placeholder="请输入题干"
              fieldProps={{ rows: 4, maxLength: 500, showCount: true }}
            />
            <ProForm.Group>
              <ProFormSelect
                name="examType"
                label="考试类型"
                width="sm"
                options={examTypeOptions}
                rules={[{ required: true, message: '请选择考试类型' }]}
              />
              <ProFormSelect
                name="questionType"
                label="题型"
                width="sm"
                options={questionTypeOptions}
                rules={[{ required: true, message: '请选择题型' }]}
              />
              <ProFormSelect
                name="skill"
                label="所属技能"
                width="sm"
                options={questionSkillOptions}
                rules={[{ required: true, message: '请选择所属技能' }]}
              />
              <ProFormSelect
                name="difficulty"
                label="难度"
                width="sm"
                options={questionDifficultyOptions}
                rules={[{ required: true, message: '请选择难度' }]}
              />
            </ProForm.Group>
            <ProFormSelect
              name="tags"
              label="标签"
              mode="tags"
              placeholder="输入标签后回车"
              fieldProps={{ tokenSeparators: [',', '，'] }}
            />
            <ProForm.Group>
              <ProFormTextArea
                name="optionA"
                label="选项 A"
                width="md"
                rules={[{ required: true, message: '请输入选项 A' }]}
              />
              <ProFormTextArea
                name="optionB"
                label="选项 B"
                width="md"
                rules={[{ required: true, message: '请输入选项 B' }]}
              />
            </ProForm.Group>
            <ProForm.Group>
              <ProFormTextArea
                name="optionC"
                label="选项 C"
                width="md"
                rules={[{ required: true, message: '请输入选项 C' }]}
              />
              <ProFormTextArea
                name="optionD"
                label="选项 D"
                width="md"
                rules={[{ required: true, message: '请输入选项 D' }]}
              />
            </ProForm.Group>
            <ProFormRadio.Group
              name="answer"
              label="正确答案"
              options={optionKeys.map((key) => ({ label: key, value: key }))}
              rules={[{ required: true, message: '请选择正确答案' }]}
            />
            <ProFormTextArea
              name="analysis"
              label="解析"
              rules={[{ required: true, message: '请输入解析' }]}
              placeholder="请输入解析"
              fieldProps={{ rows: 4, maxLength: 800, showCount: true }}
            />
            <ProFormTextArea
              name="changeSummary"
              label="变更说明"
              rules={[{ required: true, message: '请输入变更说明' }]}
              placeholder="说明本次新增或编辑的内容"
              fieldProps={{ rows: 3, maxLength: 200, showCount: true }}
            />
            <ProFormTextArea
              name="referenceImpact"
              label="引用影响"
              placeholder="说明可能影响的练习、题组、任务或模考"
              fieldProps={{ rows: 3, maxLength: 200, showCount: true }}
            />
          </ProForm>
        </Space>
      </Card>
    </PageContainer>
  );
};

export default QuestionEditPage;
