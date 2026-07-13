import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  ReloadOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useAccess, useModel, useParams } from '@umijs/max';
import {
  App,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Divider,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AdminModuleKey, PermissionAction } from '@/foundation/permissions';
import {
  aiSessionReviewDetail,
  claimAiSessionReview,
  releaseAiSessionReview,
  requestAiSessionSensitiveAccess,
  submitAiSessionReviewConclusion,
} from '@/services/ant-design-pro/api';
import {
  abnormalSeverityOptions,
  abnormalTypeOptions,
  abnormalTypeText,
  businessSceneText,
  conclusionColor,
  conclusionText,
  reviewStatusColor,
  reviewStatusText,
  riskLevelColor,
  riskLevelText,
  sensitiveFieldOptions,
  sensitiveFieldText,
} from '../config';

const canOperateSessionReview = (roleId?: string) =>
  roleId === 'super_admin' || roleId === 'ai_operator';

const DetailTag: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color }) => (
  <Tag color={color} style={{ marginInlineEnd: 0 }}>
    {children}
  </Tag>
);

const AiSessionReviewDetailPage: React.FC = () => {
  const { id } = useParams();
  const { message } = App.useApp();
  const { initialState } = useModel('@@initialState');
  const roleId = initialState?.currentUser?.roleId;
  const currentOperatorId = initialState?.currentUser?.accountId || roleId;
  const access = useAccess() as {
    canAction?: (
      moduleKey: AdminModuleKey,
      targetAction: PermissionAction,
    ) => boolean;
  };
  const canRead = access.canAction?.('aiCoach', 'read') && canOperateSessionReview(roleId);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState<API.AiSessionReview>();
  const [sensitiveFields, setSensitiveFields] = useState<Partial<Record<API.AiSessionSensitiveFieldKey, string>>>({});
  const [accessOpen, setAccessOpen] = useState(false);
  const [normalOpen, setNormalOpen] = useState(false);
  const [abnormalOpen, setAbnormalOpen] = useState(false);
  const [accessForm] = Form.useForm<API.AiSessionSensitiveAccessParams>();
  const [normalForm] = Form.useForm<Pick<API.AiSessionReviewConclusionParams, 'reviewNote'>>();
  const [abnormalForm] = Form.useForm<API.AiSessionReviewConclusionParams>();

  const isCurrentReviewer = detail?.reviewerId === currentOperatorId;
  const completed = detail?.reviewStatus === 'completed';

  const loadDetail = useCallback(async () => {
    if (!id || !canRead) return;
    setLoading(true);
    try {
      const response = await aiSessionReviewDetail(id);
      setDetail(response.data);
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '会话抽检详情加载失败');
    } finally {
      setLoading(false);
    }
  }, [canRead, id, message]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const runAction = async (
    action: () => Promise<{ data?: API.AiSessionReview }>,
    successMessage: string,
  ) => {
    setSubmitting(true);
    try {
      const response = await action();
      if (response.data) setDetail(response.data);
      message.success(successMessage);
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const submitSensitiveAccess = async () => {
    if (!detail) return;
    const values = await accessForm.validateFields();
    setSubmitting(true);
    try {
      const response = await requestAiSessionSensitiveAccess(detail.id, {
        ...values,
        dataVersion: detail.dataVersion,
      });
      setSensitiveFields(response.data?.fields ?? {});
      setAccessOpen(false);
      accessForm.resetFields();
      message.success('已展示必要信息');
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '申请查看失败');
    } finally {
      setSubmitting(false);
    }
  };

  const submitNormal = async () => {
    if (!detail) return;
    const values = await normalForm.validateFields();
    setSubmitting(true);
    try {
      const response = await submitAiSessionReviewConclusion(detail.id, {
        conclusion: 'normal',
        reviewNote: values.reviewNote,
        dataVersion: detail.dataVersion,
      });
      setDetail(response.data);
      setNormalOpen(false);
      normalForm.resetFields();
      message.success('已标记正常');
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '提交结论失败');
    } finally {
      setSubmitting(false);
    }
  };

  const submitAbnormal = async () => {
    if (!detail) return;
    const values = await abnormalForm.validateFields();
    setSubmitting(true);
    try {
      const response = await submitAiSessionReviewConclusion(detail.id, {
        ...values,
        conclusion: 'abnormal',
        dataVersion: detail.dataVersion,
        idempotencyKey: `abnormal-${detail.id}`,
      });
      setDetail(response.data);
      setAbnormalOpen(false);
      abnormalForm.resetFields();
      message.success(response.abnormalItem ? '已生成异常处理项' : '已标记异常');
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '提交结论失败');
    } finally {
      setSubmitting(false);
    }
  };

  const extraActions = useMemo(() => {
    if (!detail || completed) {
      return [
        <Button key="reload" icon={<ReloadOutlined />} onClick={loadDetail}>
          刷新
        </Button>,
      ];
    }
    if (detail.reviewStatus === 'pending') {
      return [
        <Button key="reload" icon={<ReloadOutlined />} onClick={loadDetail}>
          刷新
        </Button>,
        <Button
          key="claim"
          type="primary"
          loading={submitting}
          onClick={() =>
            runAction(() => claimAiSessionReview(detail.id), '已认领抽检')
          }
        >
          认领抽检
        </Button>,
      ];
    }
    return [
      <Button key="reload" icon={<ReloadOutlined />} onClick={loadDetail}>
        刷新
      </Button>,
      isCurrentReviewer && (
        <Button
          key="release"
          icon={<RollbackOutlined />}
          loading={submitting}
          onClick={() =>
            runAction(() => releaseAiSessionReview(detail.id), '已释放抽检')
          }
        >
          释放
        </Button>
      ),
      isCurrentReviewer && (
        <Button key="access" icon={<EyeOutlined />} onClick={() => setAccessOpen(true)}>
          申请查看
        </Button>
      ),
      isCurrentReviewer && (
        <Button key="normal" icon={<CheckCircleOutlined />} onClick={() => setNormalOpen(true)}>
          标记正常
        </Button>
      ),
      isCurrentReviewer && (
        <Button
          key="abnormal"
          danger
          icon={<ExclamationCircleOutlined />}
          onClick={() => setAbnormalOpen(true)}
        >
          标记异常
        </Button>
      ),
    ].filter(Boolean);
  }, [completed, detail, isCurrentReviewer, loadDetail, submitting]);

  if (!canRead) {
    return (
      <PageContainer>
        <Typography.Text type="secondary">无权访问 AI 会话抽检。</Typography.Text>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={detail?.sessionId ?? '会话抽检详情'}
      onBack={() => history.push('/ai-coach/session-review')}
      backIcon={<ArrowLeftOutlined />}
      extra={extraActions}
    >
      <Spin spinning={loading}>
        {detail ? (
          <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            <Card size="small">
              <Descriptions
                bordered
                size="small"
                column={{ xs: 1, sm: 2, md: 3 }}
                items={[
                  { key: 'time', label: '会话时间', children: detail.sessionTime },
                  { key: 'user', label: '用户', children: detail.userLabel },
                  { key: 'exam', label: '考试', children: detail.examType },
                  { key: 'intent', label: '意图', children: `${detail.intentName} / ${detail.intentKey}` },
                  { key: 'scene', label: '业务场景', children: businessSceneText[detail.businessScene] },
                  {
                    key: 'risk',
                    label: '风险',
                    children: (
                      <DetailTag color={riskLevelColor[detail.riskLevel]}>
                        {riskLevelText[detail.riskLevel]}
                      </DetailTag>
                    ),
                  },
                  {
                    key: 'status',
                    label: '抽检状态',
                    children: (
                      <DetailTag color={reviewStatusColor[detail.reviewStatus]}>
                        {reviewStatusText[detail.reviewStatus]}
                      </DetailTag>
                    ),
                  },
                  { key: 'reviewer', label: '抽检人', children: detail.reviewer || '-' },
                  {
                    key: 'conclusion',
                    label: '结论',
                    children: detail.conclusion ? (
                      <DetailTag color={conclusionColor[detail.conclusion]}>
                        {conclusionText[detail.conclusion]}
                      </DetailTag>
                    ) : '-',
                  },
                ]}
              />
            </Card>

            <Card size="small" title="脱敏摘要">
              <Typography.Paragraph style={{ marginBottom: 0 }}>
                {detail.summary}
              </Typography.Paragraph>
              {detail.riskSignals.length ? (
                <>
                  <Divider />
                  <Space wrap>
                    {detail.riskSignals.map((item) => (
                      <Tag key={item.id} color={riskLevelColor[item.level]}>
                        {item.label}：{item.summary}
                      </Tag>
                    ))}
                  </Space>
                </>
              ) : null}
            </Card>

            <Card size="small" title="策略快照">
              <Descriptions
                size="small"
                column={{ xs: 1, sm: 2, md: 3 }}
                items={[
                  { key: 'id', label: '策略 ID', children: detail.strategySnapshot.strategyId },
                  { key: 'title', label: '策略名称', children: detail.strategySnapshot.strategyTitle },
                  { key: 'version', label: '版本', children: detail.strategySnapshot.strategyVersion },
                  { key: 'status', label: '当时状态', children: detail.strategySnapshot.statusAtTime },
                ]}
              />
            </Card>

            <Card size="small" title="必要信息">
              {Object.keys(sensitiveFields).length ? (
                <Descriptions
                  bordered
                  size="small"
                  column={1}
                  items={Object.entries(sensitiveFields).map(([field, value]) => ({
                    key: field,
                    label: sensitiveFieldText[field as API.AiSessionSensitiveFieldKey],
                    children: value,
                  }))}
                />
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="-" />
              )}
            </Card>

            {detail.abnormalItem ? (
              <Card size="small" title="异常处理项">
                <Descriptions
                  size="small"
                  column={{ xs: 1, sm: 2, md: 3 }}
                  items={[
                    { key: 'id', label: '处理项 ID', children: detail.abnormalItem.id },
                    {
                      key: 'type',
                      label: '异常类型',
                      children: abnormalTypeText[detail.abnormalItem.abnormalType],
                    },
                    { key: 'severity', label: '优先级', children: detail.abnormalItem.severity },
                    { key: 'status', label: '状态', children: detail.abnormalItem.status },
                    { key: 'createdAt', label: '创建时间', children: detail.abnormalItem.createdAt },
                    { key: 'creator', label: '创建人', children: detail.abnormalItem.creator },
                  ]}
                />
              </Card>
            ) : null}

            <Card size="small" title="操作记录">
              <Timeline
                items={detail.timeline.map((item) => ({
                  content: (
                    <Space orientation="vertical" size={2}>
                      <Typography.Text>
                        {item.action}：{item.reason}
                      </Typography.Text>
                      <Typography.Text type="secondary">
                        {item.operator} / {item.time}
                      </Typography.Text>
                    </Space>
                  ),
                }))}
              />
            </Card>
          </Space>
        ) : (
          <Empty />
        )}
      </Spin>

      <Modal
        title="申请查看必要信息"
        open={accessOpen}
        confirmLoading={submitting}
        onOk={submitSensitiveAccess}
        onCancel={() => setAccessOpen(false)}
        destroyOnHidden
      >
        <Form form={accessForm} layout="vertical">
          <Form.Item
            name="requestedFields"
            label="必要字段"
            rules={[{ required: true, message: '请选择必要字段' }]}
          >
            <Checkbox.Group options={sensitiveFieldOptions} />
          </Form.Item>
          <Form.Item
            name="accessReason"
            label="访问原因"
            rules={[{ required: true, whitespace: true, message: '请填写访问原因' }]}
          >
            <Input.TextArea rows={3} maxLength={120} showCount />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="标记正常"
        open={normalOpen}
        confirmLoading={submitting}
        onOk={submitNormal}
        onCancel={() => setNormalOpen(false)}
        destroyOnHidden
      >
        <Form form={normalForm} layout="vertical">
          <Form.Item
            name="reviewNote"
            label="抽检说明"
            rules={[{ required: true, whitespace: true, message: '请填写抽检说明' }]}
          >
            <Input.TextArea rows={3} maxLength={160} showCount />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="标记异常"
        open={abnormalOpen}
        confirmLoading={submitting}
        onOk={submitAbnormal}
        onCancel={() => setAbnormalOpen(false)}
        destroyOnHidden
      >
        <Form form={abnormalForm} layout="vertical">
          <Form.Item
            name="abnormalType"
            label="异常类型"
            rules={[{ required: true, message: '请选择异常类型' }]}
          >
            <Select options={abnormalTypeOptions} />
          </Form.Item>
          <Form.Item
            name="severity"
            label="优先级"
            rules={[{ required: true, message: '请选择优先级' }]}
          >
            <Select options={abnormalSeverityOptions} />
          </Form.Item>
          <Form.Item
            name="evidenceSummary"
            label="异常依据"
            rules={[{ required: true, whitespace: true, message: '请填写异常依据' }]}
          >
            <Input.TextArea rows={3} maxLength={180} showCount />
          </Form.Item>
          <Form.Item
            name="reviewNote"
            label="处理说明"
            rules={[{ required: true, whitespace: true, message: '请填写处理说明' }]}
          >
            <Input.TextArea rows={3} maxLength={180} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default AiSessionReviewDetailPage;
