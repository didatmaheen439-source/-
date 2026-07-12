import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  ReloadOutlined,
  RollbackOutlined,
  SendOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useParams } from '@umijs/max';
import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Modal,
  Result,
  Select,
  Skeleton,
  Space,
  Statistic,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import StatusTag from '@/components/StatusTag';
import {
  feedbackOwnerRoleLabels,
  feedbackOwnerRoles,
  type FeedbackQueueAssignParams,
  type FeedbackQueueDetail,
  type FeedbackQueueResolutionParams,
  type FeedbackQueueStatusAction,
} from '@/foundation/feedbackQueue';
import { createSensitiveAccessLog } from '@/services/ant-design-pro/api';
import {
  assignFeedbackQueueItem,
  feedbackQueueDetail,
  submitFeedbackQueueResolution,
  updateFeedbackQueueStatus,
} from '../service';

type AssignForm = Pick<
  FeedbackQueueAssignParams,
  'targetRole' | 'assigneeAccountId' | 'reason'
>;

type ResolutionForm = Omit<FeedbackQueueResolutionParams, 'version'>;

type StatusForm = {
  reason?: string;
};

type SensitiveForm = {
  accessReason: string;
};

const priorityColors: Record<FeedbackQueueDetail['priority'], string> = {
  P0: 'red',
  P1: 'orange',
  P2: 'blue',
};

const AssignmentCard: React.FC<{
  detail: FeedbackQueueDetail;
  pending: boolean;
  onSubmit: (values: AssignForm) => Promise<void>;
}> = ({ detail, pending, onSubmit }) => {
  const [form] = Form.useForm<AssignForm>();
  const targetRole = Form.useWatch('targetRole', form);
  const assigneeOptions = useMemo(() => {
    if (!targetRole) return [];
    return [{ label: feedbackOwnerRoleLabels[targetRole], value: targetRole }];
  }, [targetRole]);

  return (
    <Card
      title={detail.currentAssignment ? '转派负责人' : '分派负责人'}
      size="small"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          targetRole: detail.currentAssignment?.targetRole ?? 'ai_operator',
          assigneeAccountId:
            detail.currentAssignment?.assigneeAccountId ?? 'ai_operator',
        }}
      >
        <Space align="start" wrap>
          <Form.Item
            name="targetRole"
            label="目标角色"
            rules={[{ required: true, message: '请选择目标角色' }]}
          >
            <Select
              style={{ width: 180 }}
              options={feedbackOwnerRoles.map((role) => ({
                value: role,
                label: feedbackOwnerRoleLabels[role],
              }))}
              onChange={(role) => form.setFieldValue('assigneeAccountId', role)}
            />
          </Form.Item>
          <Form.Item
            name="assigneeAccountId"
            label="负责人账号"
            rules={[{ required: true, message: '请选择负责人账号' }]}
          >
            <Select style={{ width: 180 }} options={assigneeOptions} />
          </Form.Item>
          <Form.Item
            name="reason"
            label="分派原因"
            rules={[{ required: true, message: '请填写分派原因' }]}
          >
            <Input.TextArea
              rows={2}
              style={{ width: 360 }}
              showCount
              maxLength={160}
            />
          </Form.Item>
          <Form.Item label=" ">
            <Button
              type="primary"
              icon={<SwapOutlined />}
              loading={pending}
              onClick={async () => onSubmit(await form.validateFields())}
            >
              {detail.currentAssignment ? '确认转派' : '确认分派'}
            </Button>
          </Form.Item>
        </Space>
      </Form>
    </Card>
  );
};

const ResolutionCard: React.FC<{
  pending: boolean;
  onSubmit: (values: ResolutionForm) => Promise<void>;
}> = ({ pending, onSubmit }) => {
  const [form] = Form.useForm<ResolutionForm>();
  return (
    <Card title="处理结果" size="small">
      <Form form={form} layout="vertical">
        <Form.Item
          name="resultSummary"
          label="结果摘要"
          rules={[{ required: true, message: '请填写结果摘要' }]}
        >
          <Input maxLength={80} showCount />
        </Form.Item>
        <Form.Item
          name="processNote"
          label="处理说明"
          rules={[{ required: true, message: '请填写处理说明' }]}
        >
          <Input.TextArea rows={4} maxLength={300} showCount />
        </Form.Item>
        <Form.Item name="relatedObject" label="关联业务对象">
          <Input placeholder="可选，填写内容、教研或 AI 策略对象编号" />
        </Form.Item>
        <Button
          type="primary"
          icon={<SendOutlined />}
          loading={pending}
          onClick={async () => {
            await onSubmit(await form.validateFields());
            form.resetFields();
          }}
        >
          提交结果
        </Button>
      </Form>
    </Card>
  );
};

const FeedbackQueueDetailPage: React.FC = () => {
  const { feedbackId } = useParams<{ feedbackId: string }>();
  const { message, modal } = App.useApp();
  const [detail, setDetail] = useState<FeedbackQueueDetail>();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [sensitiveOpen, setSensitiveOpen] = useState(false);
  const [statusAction, setStatusAction] =
    useState<FeedbackQueueStatusAction>();
  const [statusForm] = Form.useForm<StatusForm>();
  const [sensitiveForm] = Form.useForm<SensitiveForm>();

  const load = async () => {
    if (!feedbackId) return;
    setLoading(true);
    try {
      const response = await feedbackQueueDetail(feedbackId);
      setDetail(response.data);
    } catch (error: any) {
      message.error(
        error?.data?.errorMessage || error?.message || '反馈详情加载失败',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedbackId]);

  const submitAssign = async (values: AssignForm) => {
    if (!detail || !feedbackId) return;
    setPending(true);
    try {
      const response = await assignFeedbackQueueItem(feedbackId, {
        ...values,
        version: detail.version,
      });
      setDetail(response.data);
      message.success(detail.currentAssignment ? '已转派' : '已分派');
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '分派失败');
    } finally {
      setPending(false);
    }
  };

  const submitResolution = async (values: ResolutionForm) => {
    if (!detail || !feedbackId) return;
    setPending(true);
    try {
      const response = await submitFeedbackQueueResolution(feedbackId, {
        ...values,
        version: detail.version,
      });
      setDetail(response.data);
      message.success('处理结果已提交');
    } catch (error: any) {
      message.error(
        error?.data?.errorMessage || error?.message || '结果提交失败',
      );
    } finally {
      setPending(false);
    }
  };

  const openStatusModal = (action: FeedbackQueueStatusAction) => {
    setStatusAction(action);
    statusForm.resetFields();
  };

  const submitStatus = async () => {
    if (!detail || !feedbackId || !statusAction) return;
    const values = await statusForm.validateFields();
    setPending(true);
    try {
      const response = await updateFeedbackQueueStatus(feedbackId, {
        action: statusAction,
        reason: values.reason,
        version: detail.version,
      });
      setDetail(response.data);
      setStatusAction(undefined);
      message.success('反馈状态已更新');
    } catch (error: any) {
      message.error(
        error?.data?.errorMessage || error?.message || '状态更新失败',
      );
    } finally {
      setPending(false);
    }
  };

  const submitSensitiveAccess = async () => {
    if (!detail) return;
    const values = await sensitiveForm.validateFields();
    setPending(true);
    try {
      const response = await createSensitiveAccessLog({
        userId: detail.userId,
        objectType: 'feedback_original_content',
        objectId: detail.feedbackId,
        accessReason: values.accessReason,
        sourcePage: '/users/feedback',
        requestedFields: ['originalContent'],
      });
      setSensitiveOpen(false);
      modal.info({
        title: '反馈原文',
        width: 680,
        content: (
          <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>
            {response.data?.content}
          </Typography.Paragraph>
        ),
      });
      await load();
    } catch (error: any) {
      message.error(
        error?.data?.errorMessage ||
          error?.message ||
          '敏感访问授权失败',
      );
    } finally {
      setPending(false);
    }
  };

  if (loading) {
    return (
      <PageContainer title="反馈详情">
        <Skeleton active paragraph={{ rows: 12 }} />
      </PageContainer>
    );
  }

  if (!detail) {
    return (
      <PageContainer title="反馈详情">
        <Result
          status="404"
          title="反馈不存在或无权查看"
          extra={
            <Button onClick={() => history.push('/users/feedback')}>
              返回队列
            </Button>
          }
        />
      </PageContainer>
    );
  }

  const canOperate = detail.status !== 'closed';
  const statusModalTitle =
    statusAction === 'return_to_processing'
      ? '退回补充'
      : statusAction === 'mark_no_action'
        ? '标记无需处理'
        : '确认关闭';

  return (
    <PageContainer
      title={detail.feedbackId}
      subTitle="反馈工作队列"
      extra={[
        <Button
          key="back"
          icon={<ArrowLeftOutlined />}
          onClick={() => history.push('/users/feedback')}
        >
          返回队列
        </Button>,
        <Button key="reload" icon={<ReloadOutlined />} onClick={load}>
          刷新
        </Button>,
      ]}
    >
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Card size="small">
          <Space wrap size={24}>
            <Statistic
              title="状态"
              valueRender={() => (
                <StatusTag domain="feedback" value={detail.status} />
              )}
            />
            <Statistic
              title="优先级"
              valueRender={() => (
                <Tag color={priorityColors[detail.priority]}>
                  {detail.priority}
                </Tag>
              )}
            />
            <Statistic
              title="当前负责人"
              value={detail.currentAssignment?.assigneeName ?? '未分派'}
            />
            <Statistic
              title="停留时长"
              valueRender={() => (
                <Typography.Text type={detail.overdue ? 'danger' : undefined}>
                  {detail.waitText}
                </Typography.Text>
              )}
            />
            <Statistic
              title="下一步"
              value={
                detail.status === 'pending'
                  ? '客服分派'
                  : detail.status === 'processing'
                    ? '负责人回填'
                    : detail.status === 'resolved'
                      ? '客服验收'
                      : '只读归档'
              }
            />
          </Space>
        </Card>

        {detail.overdue ? (
          <Alert
            showIcon
            type="warning"
            title="该反馈已达到超时风险口径"
            description="待分诊超过 24 小时或处理中超过 48 小时会进入工作台风险提醒。"
          />
        ) : null}

        <Descriptions bordered size="small" column={2}>
          <Descriptions.Item label="反馈摘要" span={2}>
            {detail.summary}
          </Descriptions.Item>
          <Descriptions.Item label="反馈类型">{detail.type}</Descriptions.Item>
          <Descriptions.Item label="关联模块">
            {detail.relatedModule}
          </Descriptions.Item>
          <Descriptions.Item label="提交时间">
            {detail.submittedAt}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间">
            {detail.updatedAt}
          </Descriptions.Item>
        </Descriptions>

        <Card title="脱敏用户上下文" size="small">
          <Descriptions size="small" column={2}>
            <Descriptions.Item label="昵称">
              {detail.scopedUserContext.nickname}
            </Descriptions.Item>
            <Descriptions.Item label="考试目标">
              {detail.scopedUserContext.examTarget}
            </Descriptions.Item>
            <Descriptions.Item label="学习状态">
              {detail.scopedUserContext.learningStatus}
            </Descriptions.Item>
            <Descriptions.Item label="薄弱模块">
              <Space wrap>
                {detail.scopedUserContext.weakModules.map((item) => (
                  <Tag key={item}>{item}</Tag>
                ))}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="学习摘要" span={2}>
              {detail.scopedUserContext.recentLearningSummary}
            </Descriptions.Item>
            <Descriptions.Item label="AI 摘要" span={2}>
              {detail.scopedUserContext.aiSummaryPreview}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card
          title="查看反馈原文"
          size="small"
          extra={
            <Button
              icon={<EyeOutlined />}
              disabled={!detail.permissions.canSensitiveAccess}
              onClick={() => {
                sensitiveForm.setFieldsValue({
                  accessReason: '反馈工作队列排查用户原文',
                });
                setSensitiveOpen(true);
              }}
            >
              填写原因并查看
            </Button>
          }
        >
          <Typography.Text type="secondary">
            反馈原文仅在敏感访问日志写入成功后临时展示，不进入列表或持久缓存。
          </Typography.Text>
        </Card>

        {detail.permissions.canAssign && canOperate ? (
          <AssignmentCard
            detail={detail}
            pending={pending}
            onSubmit={submitAssign}
          />
        ) : null}

        {detail.permissions.canSubmitResolution && detail.status === 'processing' ? (
          <ResolutionCard pending={pending} onSubmit={submitResolution} />
        ) : null}

        {detail.permissions.canClose && detail.status === 'resolved' ? (
          <Card title="客服验收" size="small">
            <Space wrap>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => openStatusModal('close_resolved')}
              >
                确认关闭
              </Button>
              <Button
                icon={<RollbackOutlined />}
                onClick={() => openStatusModal('return_to_processing')}
              >
                退回补充
              </Button>
            </Space>
          </Card>
        ) : null}

        {detail.permissions.canMarkNoAction &&
        ['pending', 'processing'].includes(detail.status) ? (
          <Card title="无需处理" size="small">
            <Button onClick={() => openStatusModal('mark_no_action')}>
              标记无需处理
            </Button>
          </Card>
        ) : null}

        {detail.permissions.canClose && detail.status === 'no_action' ? (
          <Card title="关闭反馈" size="small">
            <Button
              type="primary"
              onClick={() => openStatusModal('close_no_action')}
            >
              关闭无需处理反馈
            </Button>
          </Card>
        ) : null}

        <Card title="处理记录" size="small">
          <Timeline
            items={detail.timeline.map((event) => ({
              content: (
                <Space orientation="vertical" size={0}>
                  <Typography.Text strong>{event.title}</Typography.Text>
                  <Typography.Text>{event.description}</Typography.Text>
                  <Typography.Text type="secondary">
                    {event.operator} · {event.time}
                  </Typography.Text>
                </Space>
              ),
            }))}
          />
        </Card>
      </Space>

      <Modal
        title="敏感访问"
        open={sensitiveOpen}
        okText="写入日志并查看"
        cancelText="取消"
        confirmLoading={pending}
        onOk={submitSensitiveAccess}
        onCancel={() => setSensitiveOpen(false)}
        destroyOnHidden
      >
        <Alert
          type="warning"
          showIcon
          title="写入敏感访问日志失败时不会展示反馈原文。"
          style={{ marginBottom: 16 }}
        />
        <Form form={sensitiveForm} layout="vertical">
          <Form.Item
            name="accessReason"
            label="访问原因"
            rules={[{ required: true, message: '请填写访问原因' }]}
          >
            <Input.TextArea rows={3} maxLength={120} showCount />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={statusModalTitle}
        open={Boolean(statusAction)}
        okText="确认"
        cancelText="取消"
        confirmLoading={pending}
        onOk={submitStatus}
        onCancel={() => setStatusAction(undefined)}
        destroyOnHidden
      >
        <Form form={statusForm} layout="vertical">
          <Form.Item
            name="reason"
            label="原因"
            rules={
              statusAction === 'return_to_processing' ||
              statusAction === 'mark_no_action'
                ? [{ required: true, message: '请填写原因' }]
                : []
            }
          >
            <Input.TextArea rows={3} maxLength={180} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default FeedbackQueueDetailPage;
