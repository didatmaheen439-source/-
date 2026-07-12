import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useAccess, useModel } from '@umijs/max';
import {
  App,
  Button,
  Descriptions,
  DatePicker,
  Divider,
  Drawer,
  Form,
  Input,
  Modal,
  Popconfirm,
  Segmented,
  Space,
  Tabs,
  Tag,
  Timeline,
  Tooltip,
  Typography,
} from 'antd';
import type React from 'react';
import { useMemo, useRef, useState } from 'react';
import StatusTag from '@/components/StatusTag';
import type {
  AdminModuleKey,
  PermissionAction,
} from '@/foundation/permissions';
import {
  reviewTaskDetail,
  reviewTasks,
  updateReviewTaskStatus,
} from '@/services/ant-design-pro/api';

type ReviewAction = {
  key: string;
  label: string;
  nextStatus: API.ReviewTaskStatus;
  permission: PermissionAction;
  danger?: boolean;
  reasonRequired?: boolean;
};

const objectTypeOptions = [
  { label: '题库内容', value: 'question_bank' },
  { label: '错因标签', value: 'wrong_reason_tag' },
  { label: '每日一句', value: 'daily_sentence' },
  { label: '学习路径配置', value: 'learning_path_config' },
  { label: '学习路径规则', value: 'learning_rule' },
  { label: 'AI 陪练策略', value: 'ai_coach_strategy' },
  { label: '写译题目', value: 'writing_translation' },
  { label: '模考试卷', value: 'mock_exam' },
];

const objectSubtypeLabels: Record<string, string> = {
  onboarding_config: 'Onboarding 配置',
  diagnosis_rule: '诊断规则',
  today_task_template: '今日任务模板',
};

const riskLevelText: Record<API.ReviewRiskLevel, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

const riskLevelColor: Record<API.ReviewRiskLevel, string> = {
  low: 'green',
  medium: 'orange',
  high: 'red',
};

const reviewActionsByStatus: Partial<
  Record<API.ReviewTaskStatus, ReviewAction[]>
> = {
  pending_review: [
    {
      key: 'approve',
      label: '审核通过',
      nextStatus: 'approved',
      permission: 'approve',
    },
    {
      key: 'reject',
      label: '驳回',
      nextStatus: 'rejected',
      permission: 'approve',
      danger: true,
      reasonRequired: true,
    },
  ],
  rejected: [
    {
      key: 'resubmit',
      label: '重新提交',
      nextStatus: 'pending_review',
      permission: 'submit',
    },
  ],
  approved: [
    {
      key: 'schedule',
      label: '安排发布',
      nextStatus: 'pending_publish',
      permission: 'publish',
    },
  ],
  pending_publish: [
    {
      key: 'publish',
      label: '发布',
      nextStatus: 'published',
      permission: 'publish',
    },
  ],
  published: [
    {
      key: 'offline',
      label: '下架',
      nextStatus: 'offline',
      permission: 'publish',
      danger: true,
      reasonRequired: true,
    },
    {
      key: 'rollback',
      label: '回滚',
      nextStatus: 'rolled_back',
      permission: 'publish',
      danger: true,
      reasonRequired: true,
    },
  ],
  offline: [
    {
      key: 'rollback',
      label: '回滚',
      nextStatus: 'rolled_back',
      permission: 'publish',
      danger: true,
      reasonRequired: true,
    },
  ],
};

const roleCanOperateTask = (
  roleId: string | undefined,
  accountId: string | undefined,
  task: API.ReviewTask,
  action: ReviewAction,
  canAction?: (
    moduleKey: AdminModuleKey,
    targetAction: PermissionAction,
  ) => boolean,
) => {
  if (!canAction?.('reviewRelease', action.permission)) return false;
  if (['approved', 'rejected'].includes(action.nextStatus) && task.submitterId === accountId) {
    return false;
  }
  if (
    task.objectType === 'ai_coach_strategy' &&
    task.riskLevel === 'high' &&
    action.nextStatus === 'published'
  ) {
    return roleId === 'super_admin' && task.submitterId !== accountId;
  }
  if (task.objectType === 'ai_coach_strategy' && action.nextStatus === 'published' && task.submitterId === accountId) {
    return false;
  }
  if (roleId === 'super_admin') return true;
  if (roleId === 'teaching_reviewer') {
    return [
      'question_bank',
      'wrong_reason_tag',
      'daily_sentence',
      'learning_rule',
      'learning_path_config',
      'writing_translation',
      'mock_exam',
    ].includes(task.objectType);
  }
  if (roleId === 'ai_operator') {
    return task.objectType === 'ai_coach_strategy';
  }
  if (roleId === 'content_operator') {
    return action.nextStatus === 'pending_review';
  }
  return false;
};

const ReviewReleasePage: React.FC = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm<{ reason: string }>();
  const [releaseForm] = Form.useForm<{
    releaseMode: 'immediate' | 'scheduled';
    scheduledAt?: { format: (pattern: string) => string };
  }>();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const { initialState } = useModel('@@initialState');
  const access = useAccess() as {
    canAction?: (
      moduleKey: AdminModuleKey,
      targetAction: PermissionAction,
    ) => boolean;
  };
  const roleId = initialState?.currentUser?.roleId;
  const accountId = initialState?.currentUser?.accountId;
  const [selectedTask, setSelectedTask] = useState<API.ReviewTask>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [reasonAction, setReasonAction] = useState<ReviewAction>();
  const [reasonTask, setReasonTask] = useState<API.ReviewTask>();
  const [submitting, setSubmitting] = useState(false);
  const [releaseTask, setReleaseTask] = useState<API.ReviewTask>();

  const reloadTask = async (taskId: string) => {
    const detail = await reviewTaskDetail(taskId);
    if (detail.data) {
      setSelectedTask(detail.data);
    }
  };

  const openDetail = async (task: API.ReviewTask) => {
    const detail = await reviewTaskDetail(task.id);
    setSelectedTask(detail.data ?? task);
    setDrawerOpen(true);
  };

  const runAction = async (
    task: API.ReviewTask,
    action: ReviewAction,
    reason?: string,
  ) => {
    setSubmitting(true);
    try {
      await updateReviewTaskStatus(task.id, {
        status: action.nextStatus,
        reason,
      });
      message.success(`${action.label}已完成`);
      actionRef.current?.reload();
      await reloadTask(task.id);
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const openReasonModal = (task: API.ReviewTask, action: ReviewAction) => {
    setReasonTask(task);
    setReasonAction(action);
    form.resetFields();
  };

  const confirmReasonAction = async () => {
    const values = await form.validateFields();
    if (!reasonTask || !reasonAction) return;
    await runAction(reasonTask, reasonAction, values.reason.trim());
    setReasonAction(undefined);
    setReasonTask(undefined);
  };

  const confirmReleasePlan = async () => {
    const values = await releaseForm.validateFields();
    if (!releaseTask) return;
    setSubmitting(true);
    try {
      await updateReviewTaskStatus(releaseTask.id, {
        status: 'pending_publish',
        reason: values.releaseMode === 'scheduled' ? '已安排定时发布。' : '已安排立即发布。',
        releaseMode: values.releaseMode,
        scheduledAt:
          values.releaseMode === 'scheduled'
            ? values.scheduledAt?.format('YYYY-MM-DD HH:mm:ss')
            : undefined,
        timezone: 'Asia/Shanghai',
      });
      if (values.releaseMode === 'immediate') {
        await updateReviewTaskStatus(releaseTask.id, {
          status: 'published',
          reason: '立即发布。',
        });
      }
      message.success(values.releaseMode === 'scheduled' ? '已安排定时发布' : '已立即发布');
      setReleaseTask(undefined);
      actionRef.current?.reload();
      await reloadTask(releaseTask.id);
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '发布计划设置失败');
    } finally {
      setSubmitting(false);
    }
  };

  const renderTaskActions = (task: API.ReviewTask) => {
    const actions = (reviewActionsByStatus[task.status] ?? []).filter(
      (action) => roleCanOperateTask(roleId, accountId, task, action, access.canAction),
    );

    if (!actions.length) {
      return <Typography.Text type="secondary">只读</Typography.Text>;
    }

    return (
      <Space size={8}>
        {actions.map((action) => {
          if (action.key === 'schedule' && task.objectType === 'daily_sentence') {
            return (
              <Button
                key={action.key}
                size="small"
                type="link"
                onClick={() => {
                  releaseForm.setFieldsValue({ releaseMode: 'scheduled' });
                  setReleaseTask(task);
                }}
              >
                {action.label}
              </Button>
            );
          }
          if (action.reasonRequired) {
            return (
              <Button
                key={action.key}
                size="small"
                type="link"
                danger={action.danger}
                onClick={() => openReasonModal(task, action)}
              >
                {action.label}
              </Button>
            );
          }

          return (
            <Popconfirm
              key={action.key}
              title={`确认${action.label}？`}
              description={`对象 ${task.objectName}（${task.version}）将进入下一状态。`}
              okText={action.label}
              cancelText="取消"
              onConfirm={() => runAction(task, action, `${action.label}。`)}
            >
              <Button size="small" type="link">
                {action.label}
              </Button>
            </Popconfirm>
          );
        })}
      </Space>
    );
  };

  const columns: ProColumns<API.ReviewTask>[] = [
    {
      title: '任务 ID',
      dataIndex: 'id',
      copyable: true,
      width: 190,
    },
    {
      title: '对象名称',
      dataIndex: 'objectName',
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Button type="link" size="small" onClick={() => openDetail(record)}>
            {record.objectName}
          </Button>
          <Typography.Text type="secondary">{record.objectId}</Typography.Text>
        </Space>
      ),
    },
    {
      title: '对象类型',
      dataIndex: 'objectType',
      width: 140,
      valueEnum: Object.fromEntries(
        objectTypeOptions.map((item) => [item.value, { text: item.label }]),
      ),
      render: (_, record) => (
        <Space size={4} wrap>
          <Tag color="blue">{record.objectTypeName}</Tag>
          {record.objectSubtype ? (
            <Tag>{objectSubtypeLabels[record.objectSubtype] ?? record.objectSubtype}</Tag>
          ) : null}
        </Space>
      ),
    },
    {
      title: '业务模块',
      dataIndex: 'moduleName',
      width: 150,
      search: false,
    },
    {
      title: '提交人',
      dataIndex: 'submitter',
      width: 120,
    },
    {
      title: '提交时间',
      dataIndex: 'submittedAt',
      valueType: 'dateTime',
      width: 180,
      search: false,
    },
    {
      title: '版本号',
      dataIndex: 'version',
      width: 100,
      search: false,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      width: 100,
      valueEnum: {
        P0: { text: 'P0' },
        P1: { text: 'P1' },
        P2: { text: 'P2' },
      },
    },
    {
      title: '审核状态',
      dataIndex: 'status',
      width: 130,
      valueEnum: {
        pending_review: { text: '待审核' },
        rejected: { text: '已驳回' },
        approved: { text: '已通过' },
        pending_publish: { text: '待发布' },
        published: { text: '已发布' },
        offline: { text: '已下架' },
        rolled_back: { text: '已回滚' },
      },
      render: (_, record) => (
        <StatusTag domain="reviewPublish" value={record.status} />
      ),
    },
    {
      title: '风险等级',
      dataIndex: 'riskLevel',
      width: 120,
      valueEnum: {
        low: { text: '低' },
        medium: { text: '中' },
        high: { text: '高' },
      },
      render: (_, record) => (
        <Tag color={riskLevelColor[record.riskLevel]}>
          {riskLevelText[record.riskLevel]}
        </Tag>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      valueType: 'dateTime',
      width: 180,
      search: false,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space size={8}>
          <Button type="link" size="small" onClick={() => openDetail(record)}>
            查看详情
          </Button>
          {renderTaskActions(record)}
        </Space>
      ),
    },
  ];

  const detailItems = useMemo(() => {
    if (!selectedTask) return [];
    return [
      { key: 'id', label: '任务 ID', children: selectedTask.id },
      { key: 'object', label: '对象', children: selectedTask.objectName },
      { key: 'type', label: '对象类型', children: selectedTask.objectTypeName },
      { key: 'module', label: '业务模块', children: selectedTask.moduleName },
      { key: 'version', label: '版本号', children: selectedTask.version },
      {
        key: 'status',
        label: '状态',
        children: (
          <StatusTag domain="reviewPublish" value={selectedTask.status} />
        ),
      },
      { key: 'submitter', label: '提交人', children: selectedTask.submitter },
      {
        key: 'submittedAt',
        label: '提交时间',
        children: selectedTask.submittedAt,
      },
      {
        key: 'risk',
        label: '风险等级',
        children: (
          <Tag color={riskLevelColor[selectedTask.riskLevel]}>
            {riskLevelText[selectedTask.riskLevel]}
          </Tag>
        ),
      },
      {
        key: 'reviewer',
        label: '审核人',
        children: selectedTask.reviewer || '-',
      },
      {
        key: 'releasePlan',
        label: '发布计划',
        children: selectedTask.releasePlan,
      },
      {
        key: 'rollbackTargetVersion',
        label: '回滚目标',
        children: selectedTask.rollbackTargetVersion || '-',
      },
    ];
  }, [selectedTask]);

  return (
    <PageContainer
      title="待审核发布"
      content="统一处理内容、学习路径、AI 策略、写译题目和模考试卷的审核、发布、下架与回滚。"
    >
      <ProTable<API.ReviewTask>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        request={async (params) => {
          const result = await reviewTasks({
            params: {
              keyword: params.keyword,
              objectType: params.objectType,
              status: params.status,
              riskLevel: params.riskLevel,
            },
          });
          return {
            data: result.data ?? [],
            success: result.success,
            total: result.total,
          };
        }}
        pagination={{ pageSize: 20 }}
        scroll={{ x: 1500 }}
        search={{
          labelWidth: 80,
          defaultCollapsed: false,
        }}
        toolBarRender={() => [
          <Button key="refresh" onClick={() => actionRef.current?.reload()}>
            刷新
          </Button>,
        ]}
      />

      <Drawer
        size="large"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedTask?.objectName ?? '审核详情'}
        extra={selectedTask ? (
          <Space>
            {selectedTask.objectDetailPath ? (
              <Button onClick={() => history.push(selectedTask.objectDetailPath as string)}>
                查看业务对象
              </Button>
            ) : null}
            {renderTaskActions(selectedTask)}
          </Space>
        ) : null}
      >
        {selectedTask && (
          <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions
              column={2}
              bordered
              size="small"
              items={detailItems}
            />

            <Tabs
              items={[
                {
                  key: 'summary',
                  label: '变更摘要',
                  children: (
                    <Space
                      orientation="vertical"
                      size={12}
                      style={{ width: '100%' }}
                    >
                      <Typography.Paragraph>
                        <Typography.Text strong>变更摘要：</Typography.Text>
                        {selectedTask.changeSummary}
                      </Typography.Paragraph>
                      <Typography.Paragraph>
                        <Typography.Text strong>影响范围：</Typography.Text>
                        {selectedTask.impactScope}
                      </Typography.Paragraph>
                      <Typography.Paragraph>
                        <Typography.Text strong>审核意见：</Typography.Text>
                        {selectedTask.reviewOpinion || '暂无'}
                      </Typography.Paragraph>
                    </Space>
                  ),
                },
                {
                  key: 'versions',
                  label: '版本记录',
                  children: (
                    <Timeline
                      items={selectedTask.versionRecords.map((item) => ({
                        content: (
                          <Space orientation="vertical" size={2}>
                            <Space>
                              <Tag>{item.version}</Tag>
                              <StatusTag
                                domain="reviewPublish"
                                value={item.status}
                              />
                            </Space>
                            <Typography.Text>{item.summary}</Typography.Text>
                            <Typography.Text type="secondary">
                              {item.createdBy} · {item.createdAt}
                            </Typography.Text>
                          </Space>
                        ),
                      }))}
                    />
                  ),
                },
                {
                  key: 'operations',
                  label: '操作记录',
                  children: (
                    <Timeline
                      items={selectedTask.operationRecords.map((item) => ({
                        content: (
                          <Space orientation="vertical" size={2}>
                            <Space>
                              <Tag color="blue">{item.action}</Tag>
                              {item.fromStatus && (
                                <Tooltip
                                  title={`从 ${item.fromStatus} 到 ${item.toStatus}`}
                                >
                                  <StatusTag
                                    domain="reviewPublish"
                                    value={item.toStatus}
                                  />
                                </Tooltip>
                              )}
                            </Space>
                            <Typography.Text>{item.reason}</Typography.Text>
                            <Typography.Text type="secondary">
                              {item.operator} · {item.roleName} · {item.time}
                            </Typography.Text>
                          </Space>
                        ),
                      }))}
                    />
                  ),
                },
              ]}
            />
          </Space>
        )}
      </Drawer>

      <Modal
        title={reasonAction ? `${reasonAction.label}原因` : '操作原因'}
        open={Boolean(reasonAction)}
        confirmLoading={submitting}
        okText={reasonAction?.label ?? '确认'}
        cancelText="取消"
        onCancel={() => {
          setReasonAction(undefined);
          setReasonTask(undefined);
        }}
        onOk={confirmReasonAction}
      >
        {reasonTask && (
          <>
            <Typography.Paragraph>
              对象：{reasonTask.objectName}（{reasonTask.version}）
            </Typography.Paragraph>
            <Typography.Paragraph type="secondary">
              影响范围：{reasonTask.impactScope}
            </Typography.Paragraph>
            <Divider />
          </>
        )}
        <Form form={form} layout="vertical">
          <Form.Item
            name="reason"
            label="原因"
            rules={[
              { required: true, message: '请填写操作原因' },
              { min: 2, message: '原因至少 2 个字符' },
            ]}
          >
            <Input.TextArea
              rows={4}
              placeholder="请说明驳回、下架或回滚原因"
              maxLength={200}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="设置发布计划"
        open={Boolean(releaseTask)}
        confirmLoading={submitting}
        okText="确认发布计划"
        cancelText="取消"
        onCancel={() => setReleaseTask(undefined)}
        onOk={confirmReleasePlan}
      >
        <Form
          form={releaseForm}
          layout="vertical"
          initialValues={{ releaseMode: 'scheduled' }}
        >
          <Form.Item name="releaseMode" label="发布方式" rules={[{ required: true }]}>
            <Segmented
              block
              options={[
                { label: '定时发布', value: 'scheduled' },
                { label: '立即发布', value: 'immediate' },
              ]}
            />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(previous, current) => previous.releaseMode !== current.releaseMode}>
            {({ getFieldValue }) => getFieldValue('releaseMode') === 'scheduled' ? (
              <Form.Item
                name="scheduledAt"
                label="发布时间（Asia/Shanghai）"
                rules={[{ required: true, message: '请选择发布时间' }]}
              >
                <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm:ss" />
              </Form.Item>
            ) : null}
          </Form.Item>
          <Typography.Text type="secondary">
            定时发布时间必须与每日一句内容日期一致，发布时会再次校验配图、日期冲突和版本。
          </Typography.Text>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default ReviewReleasePage;
