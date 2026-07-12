import {
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
} from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import {
  PageContainer,
  ProForm,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProTable,
} from '@ant-design/pro-components';
import { history, useAccess, useParams } from '@umijs/max';
import {
  Alert,
  App,
  Button,
  Collapse,
  Descriptions,
  Drawer,
  Flex,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Result,
  Select,
  Skeleton,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import type React from 'react';
import { useEffect, useState } from 'react';
import StatusTag from '@/components/StatusTag';
import type {
  AdminModuleKey,
  PermissionAction,
} from '@/foundation/permissions';
import type {
  MockExamPaper,
  MockExamPaperItemSnapshot,
  MockExamPaperSaveParams,
  MockExamPrecheckResult,
  MockExamReference,
  MockExamSection,
  MockExamSectionType,
} from '../data';
import {
  createMockExamPaper,
  expandMockExamQuestionGroup,
  mockExamPaperDetail,
  mockExamReferences,
  mockExamQuestionGroups,
  mockExamTemplate,
  precheckMockExamPaper,
  submitMockExamPaperReview,
  updateMockExamPaper,
} from '../service';
import {
  editableStatuses,
  examTypeOptions,
  precheckLevelColor,
  precheckLevelText,
  sectionTypeOptions,
  sectionTypeText,
  sourceTypeText,
} from '../config';

type BasicFormValues = Omit<MockExamPaperSaveParams, 'sections'>;

const sourceTypeForSection = (
  sectionType: MockExamSectionType,
): MockExamReference['sourceType'] | undefined => {
  if (sectionType === 'writing') return 'writing_topic';
  if (sectionType === 'translation') return 'translation_topic';
  return 'question_bank';
};

const PrecheckPanel: React.FC<{ result?: MockExamPrecheckResult }> = ({
  result,
}) => {
  if (!result) {
    return (
      <Alert
        type="info"
        showIcon
        title="尚未执行预校验"
        description="保存草稿前可检查分值、时长、题目引用和标准模板偏差。"
      />
    );
  }
  return (
    <Alert
      type={
        result.level === 'error'
          ? 'error'
          : result.level === 'warning'
            ? 'warning'
            : 'success'
      }
      showIcon
      title={`预校验${precheckLevelText[result.level]}`}
      description={
        <Space orientation="vertical" size={8}>
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

const MockExamPaperEditPage: React.FC = () => {
  const { id } = useParams();
  const isCreate = !id || id === 'new';
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<BasicFormValues>();
  const access = useAccess() as {
    canAction?: (
      moduleKey: AdminModuleKey,
      action: PermissionAction,
    ) => boolean;
  };
  const canCreate = Boolean(access.canAction?.('mockExam', 'create'));
  const canEdit = Boolean(access.canAction?.('mockExam', 'edit'));
  const canSubmit = Boolean(access.canAction?.('mockExam', 'submit'));
  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);
  const [paper, setPaper] = useState<MockExamPaper>();
  const [sections, setSections] = useState<MockExamSection[]>([]);
  const [precheck, setPrecheck] = useState<MockExamPrecheckResult>();
  const [dirty, setDirty] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [drawerSectionIndex, setDrawerSectionIndex] = useState<number>();
  const [selectedReferences, setSelectedReferences] = useState<
    MockExamReference[]
  >([]);
  const [referenceTab, setReferenceTab] = useState('questions');
  const [selectedGroup, setSelectedGroup] = useState<API.QuestionGroupItem>();
  const examType = Form.useWatch('examType', form) ?? paper?.examType ?? 'CET6';

  const noPagePermission = isCreate ? !canCreate : !canEdit;
  const canEditCurrent =
    isCreate || (paper && editableStatuses.includes(paper.status));

  const loadTemplate = async (
    targetExamType: API.ExamType,
    replace = false,
  ) => {
    const response = await mockExamTemplate(targetExamType);
    if (!response.data) return;
    const apply = () => {
      form.setFieldsValue({
        examType: targetExamType,
        totalScore: response.data?.totalScore,
        totalMinutes: response.data?.totalMinutes,
      });
      setSections(response.data?.sections ?? []);
      setDirty(true);
      setPrecheck(undefined);
    };
    if (replace && sections.length) {
      modal.confirm({
        title: '重新应用标准模板？',
        content: '当前分区和题目编排会被替换。',
        okText: '应用模板',
        cancelText: '取消',
        onOk: apply,
      });
      return;
    }
    apply();
  };

  useEffect(() => {
    if (isCreate) {
      form.setFieldsValue({
        name: '',
        description: '',
        examType: 'CET6',
        totalScore: 710,
        totalMinutes: 130,
        instructions: '按分区顺序完成全部内容。',
        changeSummary: '创建模考试卷草稿。',
        impactScope: '影响模考入口、试卷版本和聚合统计。',
      });
      loadTemplate('CET6');
      setDirty(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const response = await mockExamPaperDetail(String(id));
        if (response.data) {
          setPaper(response.data);
          setSections(response.data.sections);
          setPrecheck(response.data.lastPrecheck);
          form.setFieldsValue({
            name: response.data.name,
            description: response.data.description,
            examType: response.data.examType,
            totalScore: response.data.totalScore,
            totalMinutes: response.data.totalMinutes,
            instructions: response.data.instructions,
            changeSummary: response.data.changeSummary,
            impactScope: response.data.impactScope,
            dataVersion: response.data.dataVersion,
          });
        }
      } catch {
        setPaper(undefined);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [form, id, isCreate]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  const updateSection = (
    sectionIndex: number,
    updates: Partial<MockExamSection>,
  ) => {
    setSections((current) =>
      current.map((section, index) =>
        index === sectionIndex ? { ...section, ...updates } : section,
      ),
    );
    setDirty(true);
    setPrecheck(undefined);
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    setSections((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((item, order) => ({ ...item, order: order + 1 }));
    });
    setDirty(true);
  };

  const addSection = () => {
    setSections((current) => [
      ...current,
      {
        id: `section-custom-${Date.now()}`,
        name: '自定义分区',
        sectionType: 'reading',
        order: current.length + 1,
        score: 0,
        durationMinutes: 0,
        instructions: '',
        items: [],
      },
    ]);
    setDirty(true);
  };

  const removeSection = (index: number) => {
    setSections((current) =>
      current
        .filter((_, currentIndex) => currentIndex !== index)
        .map((item, order) => ({ ...item, order: order + 1 })),
    );
    setDirty(true);
  };

  const updateItem = (
    sectionIndex: number,
    itemIndex: number,
    updates: Partial<MockExamPaperItemSnapshot>,
  ) => {
    const section = sections[sectionIndex];
    updateSection(sectionIndex, {
      items: section.items.map((item, index) =>
        index === itemIndex ? { ...item, ...updates } : item,
      ),
    });
  };

  const moveItem = (
    sectionIndex: number,
    itemIndex: number,
    direction: -1 | 1,
  ) => {
    const section = sections[sectionIndex];
    const target = itemIndex + direction;
    if (target < 0 || target >= section.items.length) return;
    const items = [...section.items];
    [items[itemIndex], items[target]] = [items[target], items[itemIndex]];
    updateSection(sectionIndex, {
      items: items.map((item, order) => ({ ...item, order: order + 1 })),
    });
  };

  const removeItem = (sectionIndex: number, itemIndex: number) => {
    const section = sections[sectionIndex];
    updateSection(sectionIndex, {
      items: section.items
        .filter((_, index) => index !== itemIndex)
        .map((item, order) => ({ ...item, order: order + 1 })),
    });
  };

  const openReferenceDrawer = (sectionIndex: number) => {
    setDrawerSectionIndex(sectionIndex);
    setSelectedReferences([]);
    setSelectedGroup(undefined);
    setReferenceTab('questions');
  };

  const addSelectedReferences = () => {
    if (drawerSectionIndex === undefined || !selectedReferences.length) return;
    const section = sections[drawerSectionIndex];
    const existingKeys = new Set(
      section.items.map((item) => `${item.sourceType}:${item.sourceId}`),
    );
    const references = selectedReferences.filter(
      (item) => !existingKeys.has(`${item.sourceType}:${item.sourceId}`),
    );
    const usedScore = section.items.reduce((sum, item) => sum + item.score, 0);
    const remaining = Math.max(section.score - usedScore, 0);
    const score = references.length
      ? Number((remaining / references.length).toFixed(3))
      : 0;
    const items = references.map((reference, index) => ({
      id: `paper-item-${reference.sourceId}-${Date.now()}-${index}`,
      sourceType: reference.sourceType,
      sourceId: reference.sourceId,
      sourceVersion: reference.sourceVersion,
      sourceStatusAtBinding: reference.sourceStatus,
      title: reference.title,
      sectionType: reference.sectionType,
      score:
        index === references.length - 1
          ? Number((remaining - score * (references.length - 1)).toFixed(3))
          : score,
      order: section.items.length + index + 1,
    }));
    updateSection(drawerSectionIndex, {
      items: [...section.items, ...items],
    });
    setDrawerSectionIndex(undefined);
    setSelectedReferences([]);
  };

  const addSelectedGroup = async () => {
    if (drawerSectionIndex === undefined || !selectedGroup) return;
    const section = sections[drawerSectionIndex];
    const existingIds = new Set(section.items.map((item) => item.sourceId));
    const duplicateCount = selectedGroup.members.filter((member) => existingIds.has(member.questionId)).length;
    if (duplicateCount) {
      message.error(`题组中有 ${duplicateCount} 道题已在当前分区，请先移除重复题目`);
      return;
    }
    try {
      const usedScore = section.items.reduce((sum, item) => sum + item.score, 0);
      const response = await expandMockExamQuestionGroup(selectedGroup.id, {
        sectionScore: Math.max(section.score - usedScore, 0),
        startOrder: section.items.length + 1,
      });
      updateSection(drawerSectionIndex, { items: [...section.items, ...response.data] });
      setDrawerSectionIndex(undefined);
      setSelectedGroup(undefined);
      message.success(`已按题组顺序添加 ${response.data.length} 道题`);
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '题组添加失败');
    }
  };

  const payload = async (): Promise<MockExamPaperSaveParams> => {
    const values = await form.validateFields();
    return {
      ...values,
      name: values.name.trim(),
      description: values.description?.trim(),
      instructions: values.instructions?.trim(),
      changeSummary: values.changeSummary?.trim(),
      impactScope: values.impactScope?.trim(),
      sections,
      dataVersion: paper?.dataVersion ?? values.dataVersion,
    };
  };

  const runPrecheck = async () => {
    try {
      const response = await precheckMockExamPaper(await payload());
      setPrecheck(response.data);
      setActiveTab('preview');
      return response.data;
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '预校验失败');
      return undefined;
    }
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      const values = await payload();
      const response = isCreate
        ? await createMockExamPaper(values)
        : await updateMockExamPaper(String(id), values);
      if (response.data) {
        setPaper(response.data);
        setSections(response.data.sections);
        setPrecheck(response.data.lastPrecheck);
        setDirty(false);
        message.success('草稿已保存');
        if (isCreate) {
          history.replace(`/mock-exam/papers/${response.data.id}/edit`);
        }
      }
      return response.data;
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '保存失败');
      return undefined;
    } finally {
      setSaving(false);
    }
  };

  const submitReview = async (
    currentPaper?: MockExamPaper,
    confirmWarnings = false,
  ) => {
    const saved = currentPaper ?? (await saveDraft());
    if (!saved) return;
    try {
      await submitMockExamPaperReview(saved.id, {
        changeSummary: saved.changeSummary,
        dataVersion: saved.dataVersion,
        confirmWarnings,
      });
      setDirty(false);
      message.success('已保存并提交审核');
      history.push('/mock-exam/papers');
    } catch (error: any) {
      const result = error?.data?.data as MockExamPrecheckResult | undefined;
      if (result?.level === 'warning') {
        setPrecheck(result);
        setActiveTab('preview');
        modal.confirm({
          title: '预校验存在警告，确认提交审核？',
          content: result.summary,
          okText: '确认提交',
          cancelText: '继续编辑',
          onOk: () => submitReview(saved, true),
        });
        return;
      }
      if (result) {
        setPrecheck(result);
        setActiveTab('preview');
      }
      message.error(error?.data?.errorMessage || error?.message || '提交失败');
    }
  };

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

  const referenceColumns: ProColumns<MockExamReference>[] = [
    {
      title: '来源 ID',
      dataIndex: 'sourceId',
      width: 220,
      ellipsis: true,
    },
    { title: '题目名称', dataIndex: 'keyword', width: 260, ellipsis: true },
    {
      title: '来源',
      dataIndex: 'sourceType',
      width: 110,
      search: false,
      render: (_, record) => sourceTypeText[record.sourceType],
    },
    { title: '版本', dataIndex: 'sourceVersion', width: 90, search: false },
  ];

  const renderSectionItems = (section: MockExamSection, sectionIndex: number) => (
    <Table<MockExamPaperItemSnapshot>
      rowKey="id"
      size="small"
      pagination={false}
      scroll={{ x: 900 }}
      dataSource={section.items}
      columns={[
        { title: '顺序', dataIndex: 'order', width: 70 },
        {
          title: '题目',
          dataIndex: 'title',
          width: 260,
          ellipsis: true,
        },
        {
          title: '来源',
          dataIndex: 'sourceType',
          width: 110,
          render: (value) => sourceTypeText[value as MockExamReference['sourceType']],
        },
        {
          title: '锁定版本',
          dataIndex: 'sourceVersion',
          width: 100,
        },
        {
          title: '分值',
          dataIndex: 'score',
          width: 120,
          render: (_, item, itemIndex) => (
            <InputNumber
              min={0}
              precision={3}
              value={item.score}
              onChange={(value) =>
                updateItem(sectionIndex, itemIndex, {
                  score: Number(value || 0),
                })
              }
            />
          ),
        },
        {
          title: '操作',
          key: 'action',
          fixed: 'right',
          width: 150,
          render: (_, __, itemIndex) => (
            <Space size={4}>
              <Button
                type="text"
                icon={<ArrowUpOutlined />}
                disabled={itemIndex === 0}
                title="上移题目"
                onClick={() => moveItem(sectionIndex, itemIndex, -1)}
              />
              <Button
                type="text"
                icon={<ArrowDownOutlined />}
                disabled={itemIndex === section.items.length - 1}
                title="下移题目"
                onClick={() => moveItem(sectionIndex, itemIndex, 1)}
              />
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                title="移除题目"
                onClick={() => removeItem(sectionIndex, itemIndex)}
              />
            </Space>
          ),
        },
      ]}
    />
  );

  const sectionPanels = sections.map((section, sectionIndex) => ({
    key: section.id,
    label: `${section.order}. ${section.name}，${section.items.length} 题`,
    extra: (
      <Space onClick={(event) => event.stopPropagation()}>
        <Button
          type="text"
          icon={<ArrowUpOutlined />}
          disabled={sectionIndex === 0}
          title="上移分区"
          onClick={() => moveSection(sectionIndex, -1)}
        />
        <Button
          type="text"
          icon={<ArrowDownOutlined />}
          disabled={sectionIndex === sections.length - 1}
          title="下移分区"
          onClick={() => moveSection(sectionIndex, 1)}
        />
        <Popconfirm
          title="删除当前分区？"
          description="分区中的题目编排也会被移除。"
          okText="删除"
          cancelText="取消"
          onConfirm={() => removeSection(sectionIndex)}
        >
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            title="删除分区"
          />
        </Popconfirm>
      </Space>
    ),
    children: (
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Flex gap={16} wrap>
          <div style={{ width: 220 }}>
            <Typography.Text strong>分区名称</Typography.Text>
            <Input
              value={section.name}
              onChange={(event) =>
                updateSection(sectionIndex, { name: event.target.value })
              }
            />
          </div>
          <div style={{ width: 180 }}>
            <Typography.Text strong>分区类型</Typography.Text>
            <Select
              value={section.sectionType}
              options={sectionTypeOptions}
              style={{ width: '100%' }}
              onChange={(value) =>
                updateSection(sectionIndex, {
                  sectionType: value as MockExamSectionType,
                  items: [],
                })
              }
            />
          </div>
          <div style={{ width: 150 }}>
            <Typography.Text strong>分区分值</Typography.Text>
            <InputNumber
              min={0}
              precision={1}
              style={{ width: '100%' }}
              value={section.score}
              onChange={(value) =>
                updateSection(sectionIndex, { score: Number(value || 0) })
              }
            />
          </div>
          <div style={{ width: 150 }}>
            <Typography.Text strong>分区时长</Typography.Text>
            <InputNumber
              min={0}
              suffix="分钟"
              style={{ width: '100%' }}
              value={section.durationMinutes}
              onChange={(value) =>
                updateSection(sectionIndex, {
                  durationMinutes: Number(value || 0),
                })
              }
            />
          </div>
        </Flex>
        <div>
          <Typography.Text strong>分区说明</Typography.Text>
          <Input.TextArea
            rows={2}
            value={section.instructions}
            onChange={(event) =>
              updateSection(sectionIndex, {
                instructions: event.target.value,
              })
            }
          />
        </div>
        <Flex justify="space-between" align="center">
          <Typography.Text strong>题目编排</Typography.Text>
          <Button
            icon={<PlusOutlined />}
            onClick={() => openReferenceDrawer(sectionIndex)}
          >
            选择题目
          </Button>
        </Flex>
        {renderSectionItems(section, sectionIndex)}
      </Space>
    ),
  }));

  if (noPagePermission) {
    return (
      <PageContainer>
        <Result
          status="403"
          title="无权编辑模考试卷"
          extra={
            <Button onClick={() => history.push('/mock-exam/papers')}>
              返回试卷列表
            </Button>
          }
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

  if (!isCreate && !paper) {
    return (
      <PageContainer>
        <Result
          status="404"
          title="模考试卷不存在"
          extra={
            <Button onClick={() => history.push('/mock-exam/papers')}>
              返回试卷列表
            </Button>
          }
        />
      </PageContainer>
    );
  }

  if (!canEditCurrent) {
    return (
      <PageContainer>
        <Result
          status="warning"
          title="当前状态不可直接编辑"
          subTitle="待审核及后续状态需要从详情页复制为新草稿。"
          extra={
            <Button onClick={() => history.push(`/mock-exam/papers/${id}`)}>
              查看试卷详情
            </Button>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={isCreate ? '新增模考试卷' : `编辑 ${paper?.name ?? ''}`}
      tags={
        paper ? (
          <StatusTag domain="reviewPublish" value={paper.status} />
        ) : undefined
      }
    >
      <div style={{ maxWidth: 1200 }}>
        <ProForm<BasicFormValues>
          form={form}
          layout="vertical"
          submitter={{
            render: () => (
              <Flex gap={8} justify="flex-end">
                <Button icon={<ArrowLeftOutlined />} onClick={confirmBack}>
                  返回
                </Button>
                <Button
                  icon={<SafetyCertificateOutlined />}
                  onClick={runPrecheck}
                >
                  预校验
                </Button>
                <Button loading={saving} onClick={saveDraft}>
                  保存草稿
                </Button>
                {canSubmit ? (
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    loading={saving}
                    onClick={() => submitReview()}
                  >
                    保存并提交审核
                  </Button>
                ) : null}
              </Flex>
            ),
          }}
          onValuesChange={() => {
            setDirty(true);
            setPrecheck(undefined);
          }}
        >
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'basic',
                label: '基础信息',
                children: (
                  <>
                    <ProFormText
                      name="name"
                      label="试卷名称"
                      rules={[{ required: true, message: '请输入试卷名称' }]}
                    />
                    <Flex gap={16} wrap>
                      <ProFormSelect
                        name="examType"
                        label="考试类型"
                        width="sm"
                        options={examTypeOptions}
                        rules={[{ required: true }]}
                        fieldProps={{
                          onChange: (value) =>
                            loadTemplate(value as API.ExamType, true),
                        }}
                      />
                      <ProFormDigit
                        name="totalScore"
                        label="试卷总分"
                        width="sm"
                        min={1}
                        fieldProps={{ precision: 1 }}
                        rules={[{ required: true }]}
                      />
                      <ProFormDigit
                        name="totalMinutes"
                        label="试卷总时长"
                        width="sm"
                        min={1}
                        fieldProps={{ suffix: '分钟' }}
                        rules={[{ required: true }]}
                      />
                      <Button
                        style={{ marginTop: 30 }}
                        onClick={() => loadTemplate(examType, true)}
                      >
                        应用标准模板
                      </Button>
                    </Flex>
                    <ProFormTextArea
                      name="description"
                      label="试卷说明"
                      fieldProps={{ rows: 3 }}
                    />
                    <ProFormTextArea
                      name="instructions"
                      label="考试说明"
                      fieldProps={{ rows: 3 }}
                    />
                    <ProFormTextArea
                      name="changeSummary"
                      label="变更说明"
                      rules={[{ required: true, message: '请输入变更说明' }]}
                      fieldProps={{ rows: 2 }}
                    />
                    <ProFormTextArea
                      name="impactScope"
                      label="影响范围"
                      fieldProps={{ rows: 2 }}
                    />
                  </>
                ),
              },
              {
                key: 'sections',
                label: '分区编排',
                children: (
                  <Space
                    orientation="vertical"
                    size={16}
                    style={{ width: '100%' }}
                  >
                    <Flex justify="space-between" align="center">
                      <Typography.Text type="secondary">
                        分区分值和时长合计必须分别等于试卷总分和总时长。
                      </Typography.Text>
                      <Button icon={<PlusOutlined />} onClick={addSection}>
                        新增分区
                      </Button>
                    </Flex>
                    <Collapse items={sectionPanels} />
                  </Space>
                ),
              },
              {
                key: 'preview',
                label: '预览校验',
                children: (
                  <Space
                    orientation="vertical"
                    size={20}
                    style={{ width: '100%' }}
                  >
                    <PrecheckPanel result={precheck} />
                    <Descriptions
                      bordered
                      size="small"
                      column={{ xs: 1, sm: 2, lg: 4 }}
                      items={[
                        {
                          key: 'examType',
                          label: '考试类型',
                          children: examType,
                        },
                        {
                          key: 'sections',
                          label: '分区数',
                          children: sections.length,
                        },
                        {
                          key: 'items',
                          label: '题目数',
                          children: sections.reduce(
                            (sum, section) => sum + section.items.length,
                            0,
                          ),
                        },
                        {
                          key: 'score',
                          label: '分区分值合计',
                          children: sections
                            .reduce(
                              (sum, section) => sum + section.score,
                              0,
                            )
                            .toFixed(1),
                        },
                      ]}
                    />
                    {sections.map((section) => (
                      <div key={section.id}>
                        <Typography.Title level={5}>
                          {section.order}. {section.name}（
                          {sectionTypeText[section.sectionType]}）
                        </Typography.Title>
                        {renderSectionItems(
                          section,
                          sections.findIndex((item) => item.id === section.id),
                        )}
                      </div>
                    ))}
                  </Space>
                ),
              },
            ]}
          />
        </ProForm>
      </div>
      <Drawer
        title={
          drawerSectionIndex === undefined
            ? '选择题目'
            : `选择${sectionTypeText[sections[drawerSectionIndex]?.sectionType]}题目`
        }
        size={860}
        open={drawerSectionIndex !== undefined}
        onClose={() => setDrawerSectionIndex(undefined)}
        footer={
          <Flex justify="flex-end" gap={8}>
            <Button onClick={() => setDrawerSectionIndex(undefined)}>
              取消
            </Button>
            <Button
              type="primary"
              disabled={referenceTab === 'questions' ? !selectedReferences.length : !selectedGroup}
              onClick={referenceTab === 'questions' ? addSelectedReferences : addSelectedGroup}
            >
              {referenceTab === 'questions' ? '添加所选题目' : '按顺序添加题组'}
            </Button>
          </Flex>
        }
      >
        {drawerSectionIndex !== undefined ? (
          <Tabs activeKey={referenceTab} onChange={setReferenceTab} items={[
            {
              key: 'questions', label: '单题选择', children: <ProTable<MockExamReference>
                rowKey={(record) => `${record.sourceType}:${record.sourceId}`}
                columns={referenceColumns}
                search={{ labelWidth: 80, defaultCollapsed: false }} options={false}
                pagination={{ defaultPageSize: 10 }}
                request={async (params) => {
                  const section = sections[drawerSectionIndex];
                  const response = await mockExamReferences({ ...params, examType, sectionType: section.sectionType, sourceType: sourceTypeForSection(section.sectionType), availableOnly: true });
                  return { data: response.data ?? [], total: response.total ?? 0, success: response.success };
                }}
                rowSelection={{ preserveSelectedRowKeys: true, onChange: (_, rows) => setSelectedReferences(rows) }} scroll={{ x: 760 }}
              />,
            },
            {
              key: 'groups', label: '题组批量添加', disabled: !['reading', 'listening'].includes(sections[drawerSectionIndex].sectionType), children: <ProTable<API.QuestionGroupItem>
                rowKey="id" options={false} search={{ labelWidth: 80 }} pagination={{ defaultPageSize: 10 }}
                columns={[{ title: '关键词', dataIndex: 'keyword', hideInTable: true }, { title: '题组名称', dataIndex: 'name' }, { title: '题目数', dataIndex: 'members', search: false, width: 90, renderText: (_, record) => record.members.length }, { title: '版本', dataIndex: 'version', search: false, width: 90 }]}
                request={async (params) => { const response = await mockExamQuestionGroups({ ...params, examType }); return { data: response.data ?? [], total: response.total ?? 0, success: response.success }; }}
                rowSelection={{ type: 'radio', selectedRowKeys: selectedGroup ? [selectedGroup.id] : [], onChange: (_, rows) => setSelectedGroup(rows[0]) }}
              />,
            },
          ]} />
        ) : null}
      </Drawer>
    </PageContainer>
  );
};

export default MockExamPaperEditPage;
