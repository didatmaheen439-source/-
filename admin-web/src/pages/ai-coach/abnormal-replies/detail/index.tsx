import {
  ArrowLeftOutlined,
  AuditOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  ExperimentOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useModel, useParams } from '@umijs/max';
import {
  Alert,
  App,
  Button,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  Result,
  Select,
  Skeleton,
  Space,
  Steps,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  accessAiAbnormalEvidence,
  aiAbnormalReplyDetail,
  aiCoachStrategies,
  closeAiAbnormalReply,
  closeAiAbnormalReplyWithoutFix,
  createAiAbnormalFixDraft,
  retestAiAbnormalReply,
  startAiAbnormalReply,
  updateAiAbnormalDiagnosis,
} from '@/services/ant-design-pro/api';
import {
  businessSceneText,
  configTypeOptions,
  configTypeText,
  precheckLevelColor,
  precheckLevelText,
  riskLevelColor,
  riskLevelText,
} from '../../prompts/config';
import {
  abnormalStatusColor,
  abnormalStatusText,
  abnormalTypeText,
  resolutionTypeOptions,
} from '../config';

type DiagnosisFormValues = {
  rootCauseType: API.AiCoachConfigType;
  linkedStrategyId: string;
  diagnosis: string;
};

type CloseFormValues = {
  resolutionType?: Exclude<API.AiAbnormalResolutionType, 'strategy_fix'>;
  resolutionSummary: string;
};

const canHandle = (roleId?: string) => roleId === 'super_admin' || roleId === 'ai_operator';

const currentStep = (abnormal: API.AiAbnormalReply) => {
  if (abnormal.status === 'closed') return 6;
  if (abnormal.status === 'resolved') return 5;
  if (abnormal.latestRetest) return 5;
  if (abnormal.fixStrategyId) return 3;
  if (abnormal.diagnosis && abnormal.rootCauseType) return 2;
  if (abnormal.status === 'processing') return 1;
  return 0;
};

const statusTag = (status: API.AiAbnormalReplyStatus) => (
  <Tag color={abnormalStatusColor[status]}>{abnormalStatusText[status]}</Tag>
);

const AiAbnormalReplyDetailPage: React.FC = () => {
  const { id = '' } = useParams();
  const { message } = App.useApp();
  const { initialState } = useModel('@@initialState');
  const roleId = initialState?.currentUser?.roleId;
  const canOperate = canHandle(roleId);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [abnormal, setAbnormal] = useState<API.AiAbnormalReply>();
  const [strategies, setStrategies] = useState<API.AiCoachStrategy[]>([]);
  const [evidence, setEvidence] = useState<API.AiAbnormalEvidence>();
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [closeWithoutFixOpen, setCloseWithoutFixOpen] = useState(false);
  const [diagnosisForm] = Form.useForm<DiagnosisFormValues>();
  const [evidenceForm] = Form.useForm<{ reason: string }>();
  const [closeForm] = Form.useForm<CloseFormValues>();
  const [closeWithoutFixForm] = Form.useForm<CloseFormValues>();

  const load = async () => {
    setLoading(true);
    try {
      const [detailResponse, strategyResponse] = await Promise.all([
        aiAbnormalReplyDetail(id),
        aiCoachStrategies({ current: 1, pageSize: 200 }),
      ]);
      setAbnormal(detailResponse.data);
      setStrategies(strategyResponse.data ?? []);
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '异常回复加载失败');
      setAbnormal(undefined);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!abnormal) return;
    diagnosisForm.setFieldsValue({
      rootCauseType: abnormal.rootCauseType,
      linkedStrategyId: abnormal.linkedStrategyId,
      diagnosis: abnormal.diagnosis,
    });
  }, [abnormal, diagnosisForm]);

  const selectedRootCause = Form.useWatch('rootCauseType', diagnosisForm);

  const strategyOptions = useMemo(
    () =>
      strategies
        .filter((item) => !selectedRootCause || item.configType === selectedRootCause)
        .map((item) => ({
          label: `${item.title} · ${configTypeText[item.configType]} · ${item.version} · ${item.status}`,
          value: item.id,
        })),
    [selectedRootCause, strategies],
  );

  const runAction = async (action: () => Promise<any>, successText: string) => {
    setPending(true);
    try {
      await action();
      message.success(successText);
      await load();
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || `${successText.replace('已', '')}失败`);
    } finally {
      setPending(false);
    }
  };

  const handleStart = () => {
    if (!abnormal) return;
    runAction(() => startAiAbnormalReply(abnormal.id), '已接手处理');
  };

  const saveDiagnosis = async () => {
    if (!abnormal) return;
    const values = await diagnosisForm.validateFields();
    await runAction(
      () =>
        updateAiAbnormalDiagnosis(abnormal.id, {
          dataVersion: abnormal.dataVersion,
          rootCauseType: values.rootCauseType,
          linkedStrategyId: values.linkedStrategyId,
          diagnosis: values.diagnosis,
        }),
      '已保存归因',
    );
  };

  const createFixDraft = () => {
    if (!abnormal) return;
    runAction(
      () =>
        createAiAbnormalFixDraft(abnormal.id, {
          dataVersion: abnormal.dataVersion,
          changeSummary: `修复异常 ${abnormal.id}：${abnormal.title}`,
        }),
      '已创建修复草稿',
    );
  };

  const runRetest = () => {
    if (!abnormal) return;
    runAction(
      () => retestAiAbnormalReply(abnormal.id, { dataVersion: abnormal.dataVersion }),
      '已完成 Mock 复检',
    );
  };

  const submitEvidenceAccess = async () => {
    if (!abnormal) return;
    const values = await evidenceForm.validateFields();
    setPending(true);
    try {
      const response = await accessAiAbnormalEvidence(abnormal.id, values);
      setEvidence(response.data);
      setEvidenceOpen(false);
      message.success('已记录访问原因');
      await load();
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '证据访问失败');
    } finally {
      setPending(false);
    }
  };

  const submitClose = async () => {
    if (!abnormal) return;
    const values = await closeForm.validateFields();
    await runAction(
      () =>
        closeAiAbnormalReply(abnormal.id, {
          dataVersion: abnormal.dataVersion,
          resolutionSummary: values.resolutionSummary,
        }),
      '已关闭异常',
    );
    setCloseOpen(false);
    closeForm.resetFields();
  };

  const submitCloseWithoutFix = async () => {
    if (!abnormal) return;
    const values = await closeWithoutFixForm.validateFields();
    const resolutionType = values.resolutionType;
    if (!resolutionType) return;
    await runAction(
      () =>
        closeAiAbnormalReplyWithoutFix(abnormal.id, {
          dataVersion: abnormal.dataVersion,
          resolutionType,
          resolutionSummary: values.resolutionSummary,
        }),
      '已关闭异常',
    );
    setCloseWithoutFixOpen(false);
    closeWithoutFixForm.resetFields();
  };

  if (loading) {
    return (
      <PageContainer title="异常回复详情">
        <Skeleton active paragraph={{ rows: 10 }} />
      </PageContainer>
    );
  }

  if (!abnormal) {
    return (
      <PageContainer title="异常回复详情">
        <Result
          status="404"
          title="AI 异常回复不存在"
          extra={<Button onClick={() => history.push('/ai-coach/abnormal-replies')}>返回列表</Button>}
        />
      </PageContainer>
    );
  }

  const canStart = canOperate && abnormal.status === 'pending';
  const canSaveDiagnosis = canOperate && abnormal.status === 'processing';
  const canCreateDraft =
    canOperate &&
    abnormal.status === 'processing' &&
    abnormal.rootCauseType &&
    abnormal.diagnosis &&
    !abnormal.fixStrategyId;
  const canRetest =
    canOperate && ['processing', 'resolved'].includes(abnormal.status) && Boolean(abnormal.fixStrategyId);
  const canClose = canOperate && abnormal.status === 'resolved';
  const canCloseWithoutFix = canOperate && ['processing', 'resolved'].includes(abnormal.status);

  return (
    <PageContainer
      title={abnormal.title}
      subTitle={abnormal.id}
      extra={[
        <Button key="back" icon={<ArrowLeftOutlined />} onClick={() => history.push('/ai-coach/abnormal-replies')}>
          返回列表
        </Button>,
        canStart ? (
          <Button key="start" type="primary" icon={<PlayCircleOutlined />} loading={pending} onClick={handleStart}>
            接手处理
          </Button>
        ) : null,
        canCreateDraft ? (
          <Button key="draft" icon={<CopyOutlined />} loading={pending} onClick={createFixDraft}>
            创建修复草稿
          </Button>
        ) : null,
        canRetest ? (
          <Button key="retest" icon={<ExperimentOutlined />} loading={pending} onClick={runRetest}>
            Mock 复检
          </Button>
        ) : null,
        canClose ? (
          <Button key="close" type="primary" icon={<CheckCircleOutlined />} onClick={() => setCloseOpen(true)}>
            关闭异常
          </Button>
        ) : null,
      ].filter(Boolean)}
    >
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Steps
          size="small"
          current={currentStep(abnormal)}
          items={[
            { title: '待处理' },
            { title: '接手' },
            { title: '归因' },
            { title: '修复草稿' },
            { title: '审核发布' },
            { title: 'Mock 复检' },
            { title: '关闭' },
          ]}
        />

        <Descriptions bordered size="small" column={4} items={[
          { key: 'status', label: '状态', children: statusTag(abnormal.status) },
          { key: 'type', label: '异常类型', children: abnormalTypeText[abnormal.abnormalType] },
          { key: 'severity', label: '严重级别', children: <Tag color={riskLevelColor[abnormal.severity]}>{riskLevelText[abnormal.severity]}</Tag> },
          { key: 'scene', label: '业务场景', children: businessSceneText[abnormal.businessScene] },
          { key: 'exam', label: '考试', children: abnormal.examType },
          { key: 'user', label: 'Mock 用户', children: `${abnormal.userNickname}（${abnormal.userId}）` },
          { key: 'session', label: '会话', children: abnormal.sessionId },
          { key: 'handler', label: '处理人', children: abnormal.handler ?? '-' },
        ]} />

        {abnormal.status === 'processing' && !abnormal.diagnosis ? (
          <Alert showIcon type="warning" title="需要先完成问题归因，再创建修复草稿。" />
        ) : null}
        {abnormal.fixStrategyId && !abnormal.latestRetest ? (
          <Alert showIcon type="info" title="修复草稿发布后，可在本页执行 Mock 复检。" />
        ) : null}

        <Tabs items={[
          {
            key: 'diagnosis',
            label: '归因与策略',
            children: (
              <Space orientation="vertical" size={16} style={{ width: '100%' }}>
                <Form<DiagnosisFormValues> form={diagnosisForm} layout="vertical" disabled={!canSaveDiagnosis}>
                  <Form.Item name="rootCauseType" label="问题归因" rules={[{ required: true, message: '请选择问题归因' }]}>
                    <Select options={configTypeOptions} />
                  </Form.Item>
                  <Form.Item name="linkedStrategyId" label="关联策略" rules={[{ required: true, message: '请选择关联策略' }]}>
                    <Select showSearch={{ optionFilterProp: 'label' }} options={strategyOptions} />
                  </Form.Item>
                  <Form.Item name="diagnosis" label="诊断说明" rules={[{ required: true, message: '请填写诊断说明' }]}>
                    <Input.TextArea rows={4} maxLength={500} showCount />
                  </Form.Item>
                  {canSaveDiagnosis ? (
                    <Button type="primary" onClick={saveDiagnosis} loading={pending}>
                      保存归因
                    </Button>
                  ) : null}
                </Form>
                <Descriptions bordered size="small" column={2} items={[
                  { key: 'linked', label: '原策略', children: <Typography.Link onClick={() => history.push(`/ai-coach/prompts/${abnormal.linkedStrategyId}`)}>{abnormal.linkedStrategyTitle}</Typography.Link> },
                  { key: 'linkedVersion', label: '原策略版本', children: `${abnormal.linkedStrategyVersion} · ${abnormal.linkedStrategyStatus}` },
                  { key: 'fix', label: '修复策略', children: abnormal.fixStrategyId ? <Typography.Link onClick={() => history.push(`/ai-coach/prompts/${abnormal.fixStrategyId}`)}>{abnormal.fixStrategyTitle}</Typography.Link> : '-' },
                  { key: 'review', label: '审核任务', children: abnormal.fixReviewTaskId ? <Typography.Link onClick={() => history.push(`/review-release/pending?keyword=${abnormal.fixReviewTaskId}`)}>{abnormal.fixReviewTaskId}</Typography.Link> : '-' },
                ]} />
              </Space>
            ),
          },
          {
            key: 'evidence',
            label: '受控证据',
            children: (
              <Space orientation="vertical" size={16} style={{ width: '100%' }}>
                <Alert
                  showIcon
                  type="info"
                  title="证据访问会写入敏感访问日志"
                  description="本页只展示脱敏摘要，不展示或导出完整用户会话原文。"
                />
                <Button icon={<AuditOutlined />} onClick={() => setEvidenceOpen(true)}>
                  访问证据
                </Button>
                {evidence ? (
                  <Descriptions bordered size="small" column={1} items={[
                    { key: 'input', label: '用户输入摘要', children: evidence.userInput },
                    { key: 'reply', label: 'AI 回复摘要', children: evidence.aiReply },
                    { key: 'expected', label: '期望结果', children: evidence.expectedOutcome },
                    { key: 'observed', label: '观察问题', children: evidence.observedIssue },
                    { key: 'note', label: '脱敏说明', children: evidence.redactionNote },
                  ]} />
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚未访问受控证据" />
                )}
              </Space>
            ),
          },
          {
            key: 'retest',
            label: 'Mock 复检',
            children: abnormal.latestRetest ? (
              <Space orientation="vertical" size={16} style={{ width: '100%' }}>
                <Descriptions bordered size="small" column={4} items={[
                  { key: 'result', label: '结果', children: <Tag color={precheckLevelColor[abnormal.latestRetest.result]}>{precheckLevelText[abnormal.latestRetest.result]}</Tag> },
                  { key: 'version', label: '策略版本', children: `${abnormal.latestRetest.strategyTitle} · ${abnormal.latestRetest.strategyVersion}` },
                  { key: 'operator', label: '操作人', children: abnormal.latestRetest.operator },
                  { key: 'time', label: '时间', children: abnormal.latestRetest.checkedAt },
                  { key: 'summary', label: '摘要', span: 4, children: abnormal.latestRetest.summary },
                ]} />
                <Table
                  rowKey="id"
                  size="small"
                  pagination={false}
                  dataSource={abnormal.latestRetest.cases}
                  columns={[
                    { title: '样例', dataIndex: 'title' },
                    { title: '期望', dataIndex: 'expected', ellipsis: true },
                    {
                      title: '结果',
                      dataIndex: 'result',
                      width: 100,
                      render: (value: API.AiCoachPrecheckLevel) => (
                        <Tag color={precheckLevelColor[value]}>{precheckLevelText[value]}</Tag>
                      ),
                    },
                    { title: '说明', dataIndex: 'message', ellipsis: true },
                  ]}
                />
              </Space>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚未执行 Mock 复检" />
            ),
          },
          {
            key: 'operations',
            label: '操作记录',
            children: (
              <Timeline
                items={abnormal.operationRecords.map((record) => ({
                  children: (
                    <Space orientation="vertical" size={0}>
                      <Typography.Text strong>{record.action}</Typography.Text>
                      <Typography.Text>{record.reason}</Typography.Text>
                      <Typography.Text type="secondary">
                        {record.operator} · {record.time}
                      </Typography.Text>
                    </Space>
                  ),
                }))}
              />
            ),
          },
        ]} />

        {canCloseWithoutFix ? (
          <Button onClick={() => setCloseWithoutFixOpen(true)}>误报或无需策略变更关闭</Button>
        ) : null}
      </Space>

      <Modal
        title="访问受控证据"
        open={evidenceOpen}
        onCancel={() => setEvidenceOpen(false)}
        onOk={submitEvidenceAccess}
        confirmLoading={pending}
        okText="记录并访问"
      >
        <Form form={evidenceForm} layout="vertical">
          <Form.Item name="reason" label="访问原因" rules={[{ required: true, min: 6, message: '请填写至少 6 个字符的访问原因' }]}>
            <Input.TextArea rows={3} maxLength={200} showCount />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="关闭异常"
        open={closeOpen}
        onCancel={() => setCloseOpen(false)}
        onOk={submitClose}
        confirmLoading={pending}
        okText="确认关闭"
      >
        <Form form={closeForm} layout="vertical">
          <Form.Item name="resolutionSummary" label="处理结果" rules={[{ required: true, message: '请填写处理结果' }]}>
            <Input.TextArea rows={4} maxLength={300} showCount />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="误报或无需策略变更关闭"
        open={closeWithoutFixOpen}
        onCancel={() => setCloseWithoutFixOpen(false)}
        onOk={submitCloseWithoutFix}
        confirmLoading={pending}
        okText="确认关闭"
      >
        <Form form={closeWithoutFixForm} layout="vertical">
          <Form.Item name="resolutionType" label="关闭类型" rules={[{ required: true, message: '请选择关闭类型' }]}>
            <Select options={resolutionTypeOptions} />
          </Form.Item>
          <Form.Item name="resolutionSummary" label="关闭说明" rules={[{ required: true, min: 10, message: '请填写至少 10 个字符的关闭说明' }]}>
            <Input.TextArea rows={4} maxLength={300} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default AiAbnormalReplyDetailPage;
