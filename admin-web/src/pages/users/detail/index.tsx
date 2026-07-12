import {
  ArrowLeftOutlined,
  EyeOutlined,
  MessageOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useModel, useParams, useSearchParams } from '@umijs/max';
import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  Result,
  Select,
  Skeleton,
  Space,
  Tabs,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import StatusTag from '@/components/StatusTag';
import { moduleLabelMap } from '@/pages/learning-path/config';
import {
  createSensitiveAccessLog,
  createUserRemark,
  operationUserAccessLogs,
  operationUserAiSummaries,
  operationUserDetail,
  operationUserFeedbacks,
  operationUserLearningRecords,
  userLearningPathMatchSummary,
  updateUserFeedbackStatus,
} from '@/services/ant-design-pro/api';
import {
  feedbackNextStatusOptions,
  feedbackStatusOptions,
  formatAccuracy,
  formatDuration,
  getOptionLabel,
  taskStatusOptions,
  toValueEnum,
} from '../constants';

type SensitiveRequest = {
  title: string;
  userId: string;
  objectType: API.SensitiveAccessObjectType;
  objectId: string;
  requestedFields: string[];
};

const roleCanViewDetail = (roleId?: string) =>
  roleId === 'super_admin' || roleId === 'customer_support';

const roleCanHandleFeedback = (roleId?: string) =>
  roleId === 'super_admin' || roleId === 'customer_support';

const aiConfigTypeText: Record<API.AiCoachConfigType, string> = {
  intent: '意图分类',
  prompt_template: 'Prompt 模板',
  response_structure: '回答结构',
  dependency_rule: '防依赖规则',
};

const aiBusinessSceneText: Record<API.AiCoachBusinessScene, string> = {
  listening_coach: '听力陪练',
  speaking_coach: '口语陪练',
  writing_explanation: '写作讲解',
  error_explanation: '错题讲解',
  learning_path_recommendation: '学习路径推荐',
};

const UserDetailPage: React.FC = () => {
  const { id = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { initialState } = useModel('@@initialState');
  const roleId = initialState?.currentUser?.roleId;
  const { message, modal } = App.useApp();
  const [detail, setDetail] = useState<API.AdminUser>();
  const [learningPathMatch, setLearningPathMatch] =
    useState<API.UserLearningPathMatchSummary>();
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<'403' | '404' | '500'>();
  const [activeTab, setActiveTab] = useState(
    searchParams.get('tab') ?? 'overview',
  );
  const [remarkDraft, setRemarkDraft] = useState('');
  const [remarkSubmitting, setRemarkSubmitting] = useState(false);
  const [sensitiveRequest, setSensitiveRequest] = useState<SensitiveRequest>();
  const [sensitiveForm] = Form.useForm<{ accessReason: string }>();
  const [feedbackForm] = Form.useForm<{
    status: API.UserFeedbackStatus;
    reason: string;
    remark: string;
  }>();
  const [feedbackTarget, setFeedbackTarget] = useState<API.UserFeedbackItem>();
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const feedbackTableRef = useRef<ActionType | undefined>(undefined);
  const accessLogTableRef = useRef<ActionType | undefined>(undefined);

  const canViewDetail = roleCanViewDetail(roleId);
  const canHandleFeedback = roleCanHandleFeedback(roleId);
  const canOpenLearningPathConfig = roleId === 'super_admin';

  const loadDetail = async () => {
    if (!canViewDetail) {
      setErrorStatus('403');
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorStatus(undefined);
    try {
      const response = await operationUserDetail(id);
      if (!response.data) {
        setErrorStatus('404');
      } else {
        setDetail(response.data);
        const matchResponse = await userLearningPathMatchSummary(id);
        setLearningPathMatch(matchResponse.data);
      }
    } catch (error: any) {
      const status = error?.response?.status;
      setErrorStatus(status === 403 ? '403' : status === 404 ? '404' : '500');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id, canViewDetail]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!remarkDraft.trim()) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [remarkDraft]);

  const safeSetTab = (nextTab: string) => {
    const apply = () => {
      setActiveTab(nextTab);
      setSearchParams({ tab: nextTab });
    };
    if (remarkDraft.trim()) {
      modal.confirm({
        title: '当前备注尚未保存，确认切换？',
        content: '切换页签后，未保存的备注内容不会提交。',
        okText: '确认切换',
        cancelText: '继续编辑',
        onOk: apply,
      });
      return;
    }
    apply();
  };

  const submitRemark = async () => {
    const content = remarkDraft.trim();
    if (!content) {
      message.warning('备注内容不能为空');
      return;
    }
    setRemarkSubmitting(true);
    try {
      await createUserRemark(id, { content });
      message.success('客服备注保存成功');
      setRemarkDraft('');
      await loadDetail();
    } catch (error: any) {
      message.error(
        error?.data?.errorMessage || error?.message || '备注提交失败',
      );
    } finally {
      setRemarkSubmitting(false);
    }
  };

  const openSensitiveModal = (request: SensitiveRequest) => {
    setSensitiveRequest(request);
    sensitiveForm.setFieldsValue({ accessReason: '客服排查用户反馈' });
  };

  const submitSensitiveAccess = async () => {
    if (!sensitiveRequest) return;
    const values = await sensitiveForm.validateFields();
    try {
      const response = await createSensitiveAccessLog({
        userId: sensitiveRequest.userId,
        objectType: sensitiveRequest.objectType,
        objectId: sensitiveRequest.objectId,
        requestedFields: sensitiveRequest.requestedFields,
        sourcePage: `/users/${id}`,
        accessReason: values.accessReason,
      });
      setSensitiveRequest(undefined);
      accessLogTableRef.current?.reload();
      if (response.data?.fields) {
        modal.info({
          title: sensitiveRequest.title,
          width: 640,
          content: (
            <Descriptions column={1} size="small">
              {Object.entries(response.data.fields).map(([field, value]) => (
                <Descriptions.Item key={field} label={field}>
                  {value}
                </Descriptions.Item>
              ))}
            </Descriptions>
          ),
        });
        return;
      }
      modal.info({
        title: sensitiveRequest.title,
        width: 640,
        content: (
          <Typography.Paragraph>{response.data?.content}</Typography.Paragraph>
        ),
      });
    } catch (error: any) {
      message.error(
        error?.data?.errorMessage || error?.message || '敏感访问授权失败',
      );
    }
  };

  const openFeedbackStatusModal = (feedback: API.UserFeedbackItem) => {
    setFeedbackTarget(feedback);
    feedbackForm.resetFields();
  };

  const submitFeedbackStatus = async () => {
    if (!feedbackTarget) return;
    const values = await feedbackForm.validateFields();
    setFeedbackSubmitting(true);
    try {
      await updateUserFeedbackStatus(id, feedbackTarget.id, {
        status: values.status,
        reason: values.reason,
        remark: values.remark,
        version: feedbackTarget.version,
      });
      message.success('反馈状态更新成功');
      setFeedbackTarget(undefined);
      feedbackTableRef.current?.reload();
      await loadDetail();
    } catch (error: any) {
      message.error(
        error?.data?.errorMessage || error?.message || '反馈状态更新失败',
      );
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const learningColumns: ProColumns<API.UserLearningRecord>[] = [
    {
      title: '记录 ID',
      dataIndex: 'id',
      width: 180,
      search: false,
      copyable: true,
    },
    {
      title: '日期',
      dataIndex: 'date',
      valueType: 'date',
      width: 120,
      search: false,
    },
    {
      title: '时间范围',
      dataIndex: 'dateRange',
      valueType: 'dateRange',
      hideInTable: true,
    },
    {
      title: '学习模块',
      dataIndex: 'module',
      width: 120,
      valueEnum: ['词汇', '听力', '阅读', '写作', '翻译', '模考'].reduce<
        Record<string, { text: string }>
      >((acc, item) => {
        acc[item] = { text: item };
        return acc;
      }, {}),
    },
    { title: '任务类型', dataIndex: 'taskType', width: 120, search: false },
    {
      title: '完成状态',
      dataIndex: 'status',
      width: 110,
      valueEnum: toValueEnum(taskStatusOptions),
      renderText: (value) => getOptionLabel(taskStatusOptions, value),
    },
    {
      title: '正确率',
      dataIndex: 'accuracy',
      search: false,
      width: 90,
      renderText: (value) => formatAccuracy(value as number | undefined),
    },
    {
      title: '错因标签',
      dataIndex: 'errorTag',
      hideInTable: true,
      fieldProps: {
        placeholder: '输入错因标签',
      },
    },
    {
      title: '错因',
      dataIndex: 'errorTags',
      search: false,
      width: 160,
      render: (_, record) => (
        <Space wrap size={[4, 4]}>
          {record.errorTags.length
            ? record.errorTags.map((tag) => <Tag key={tag}>{tag}</Tag>)
            : '--'}
        </Space>
      ),
    },
    {
      title: '耗时',
      dataIndex: 'durationSeconds',
      search: false,
      width: 100,
      renderText: (value) => formatDuration(value as number),
    },
    {
      title: '关联对象',
      dataIndex: 'relatedObjectId',
      search: false,
      width: 220,
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Typography.Text copyable>{record.relatedObjectId}</Typography.Text>
          <Typography.Text type="secondary">
            {record.relatedObjectSummary}
          </Typography.Text>
        </Space>
      ),
    },
  ];

  const feedbackColumns: ProColumns<API.UserFeedbackItem>[] = [
    {
      title: '反馈 ID',
      dataIndex: 'id',
      width: 190,
      search: false,
      copyable: true,
    },
    { title: '反馈类型', dataIndex: 'type', width: 120, search: false },
    {
      title: '内容摘要',
      dataIndex: 'summary',
      width: 260,
      search: false,
      ellipsis: true,
    },
    {
      title: '提交时间',
      dataIndex: 'submittedAt',
      valueType: 'dateTime',
      width: 170,
      search: false,
    },
    { title: '优先级', dataIndex: 'priority', width: 90, search: false },
    {
      title: '处理状态',
      dataIndex: 'status',
      width: 110,
      valueEnum: toValueEnum(feedbackStatusOptions),
      render: (_, record) => (
        <StatusTag domain="feedback" value={record.status} />
      ),
    },
    {
      title: '关联模块',
      dataIndex: 'relatedModule',
      width: 140,
      search: false,
    },
    {
      title: '处理人',
      dataIndex: 'handler',
      width: 110,
      search: false,
      renderText: (value) => value || '-',
    },
    { title: '版本', dataIndex: 'version', width: 80, search: false },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      width: 220,
      render: (_, record) => (
        <Space size={0}>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() =>
              openSensitiveModal({
                title: '反馈原文',
                userId: id,
                objectType: 'feedback_original_content',
                objectId: record.id,
                requestedFields: ['originalContent'],
              })
            }
          >
            查看原文
          </Button>
          {canHandleFeedback &&
          feedbackNextStatusOptions[record.status].length > 0 ? (
            <Button
              type="link"
              size="small"
              icon={<MessageOutlined />}
              onClick={() => openFeedbackStatusModal(record)}
            >
              更新状态
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  const aiColumns: ProColumns<API.UserAiSummary>[] = [
    { title: '会话 ID', dataIndex: 'id', width: 180, copyable: true },
    {
      title: '会话时间',
      dataIndex: 'sessionTime',
      valueType: 'dateTime',
      width: 170,
    },
    { title: '意图', dataIndex: 'intent', width: 120 },
    { title: '附件', dataIndex: 'attachmentType', width: 100 },
    {
      title: '异常',
      dataIndex: 'abnormalFlag',
      width: 90,
      render: (_, record) =>
        record.abnormalFlag ? <Tag color="error">异常</Tag> : <Tag>正常</Tag>,
    },
    { title: '处理状态', dataIndex: 'processStatus', width: 120 },
    { title: '策略 ID', dataIndex: 'strategyId', width: 180, copyable: true },
    {
      title: '配置类型',
      dataIndex: 'configType',
      width: 130,
      render: (_, record) => aiConfigTypeText[record.configType],
    },
    {
      title: '业务场景',
      dataIndex: 'businessScene',
      width: 140,
      render: (_, record) => aiBusinessSceneText[record.businessScene],
    },
    { title: '策略版本', dataIndex: 'strategyVersion', width: 100 },
    {
      title: '当时状态',
      dataIndex: 'strategyStatusAtTime',
      width: 110,
      render: (_, record) => (
        <StatusTag domain="reviewPublish" value={record.strategyStatusAtTime} />
      ),
    },
    { title: '摘要预览', dataIndex: 'summaryPreview', ellipsis: true },
    {
      title: '操作',
      valueType: 'option',
      width: 140,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          onClick={() =>
            openSensitiveModal({
              title: 'AI 陪练摘要',
              userId: id,
              objectType: 'ai_conversation_summary',
              objectId: record.id,
              requestedFields: ['summaryContent'],
            })
          }
        >
          查看摘要
        </Button>
      ),
    },
  ];

  const accessLogColumns: ProColumns<API.UserSensitiveAccessLog>[] = [
    { title: '时间', dataIndex: 'time', valueType: 'dateTime', width: 170 },
    { title: '操作人', dataIndex: 'operator', width: 110 },
    { title: '角色', dataIndex: 'roleName', width: 110 },
    { title: '对象类型', dataIndex: 'objectType', width: 180 },
    { title: '对象 ID', dataIndex: 'objectId', width: 180, copyable: true },
    { title: '来源页面', dataIndex: 'sourcePage', width: 160 },
    { title: '原因', dataIndex: 'accessReason', ellipsis: true },
    {
      title: '结果',
      dataIndex: 'result',
      width: 90,
      render: (_, record) => (
        <Tag
          color={
            record.result === 'success'
              ? 'success'
              : record.result === 'denied'
                ? 'error'
                : 'warning'
          }
        >
          {record.result}
        </Tag>
      ),
    },
  ];

  const tabItems = useMemo(
    () => [
      {
        key: 'overview',
        label: '用户概览',
        children: detail ? (
          <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            <Alert
              type="info"
              showIcon
              title="敏感字段默认脱敏展示，查看完整联系方式、反馈原文或 AI 摘要前会写入访问日志。"
            />
            <Card title="基础资料">
              <Descriptions column={2}>
                <Descriptions.Item label="用户 ID">
                  {detail.id}
                </Descriptions.Item>
                <Descriptions.Item label="昵称">
                  <Space>
                    {detail.nickname}
                    {detail.isMockUser ? <Tag>Mock</Tag> : null}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="手机号">
                  {detail.phoneMasked}
                </Descriptions.Item>
                <Descriptions.Item label="邮箱">
                  {detail.emailMasked}
                </Descriptions.Item>
                <Descriptions.Item label="设备摘要">
                  {detail.deviceSummary}
                </Descriptions.Item>
                <Descriptions.Item label="注册时间">
                  {detail.registerAt}
                </Descriptions.Item>
                <Descriptions.Item label="最近活跃">
                  {detail.lastActiveAt}
                </Descriptions.Item>
                <Descriptions.Item label="操作">
                  <Button
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() =>
                      openSensitiveModal({
                        title: '完整联系方式与设备摘要',
                        userId: id,
                        objectType: 'user_private_profile',
                        objectId: id,
                        requestedFields: ['phone', 'email', 'deviceId', 'ip'],
                      })
                    }
                  >
                    查看完整敏感字段
                  </Button>
                </Descriptions.Item>
              </Descriptions>
            </Card>
            <Card title="考试目标">
              <Descriptions column={4}>
                <Descriptions.Item label="考试类型">
                  {detail.examProfile.examType}
                </Descriptions.Item>
                <Descriptions.Item label="目标分">
                  {detail.examProfile.targetScore}
                </Descriptions.Item>
                <Descriptions.Item label="考试日期">
                  {detail.examProfile.examDate}
                </Descriptions.Item>
                <Descriptions.Item label="每日学习">
                  {detail.examProfile.dailyStudyMinutes} 分钟
                </Descriptions.Item>
              </Descriptions>
            </Card>
            <Card title="学习状态">
              <Descriptions column={3}>
                <Descriptions.Item label="Onboarding">
                  {detail.learningStatus.onboardingStatus === 'completed'
                    ? '已完成'
                    : '未完成'}
                </Descriptions.Item>
                <Descriptions.Item label="诊断状态">
                  {detail.learningStatus.diagnosisStatus === 'completed'
                    ? '已完成'
                    : '未完成'}
                </Descriptions.Item>
                <Descriptions.Item label="今日任务">
                  {getOptionLabel(
                    taskStatusOptions,
                    detail.learningStatus.todayTaskStatus,
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="今日进度">
                  {detail.learningStatus.todayTaskProgress}%
                </Descriptions.Item>
                <Descriptions.Item label="薄弱模块">
                  <Space wrap>
                    {detail.learningStatus.weakModules.map((item) => (
                      <Tag key={item}>{item}</Tag>
                    ))}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="最近学习">
                  {detail.learningStatus.lastStudyAt}
                </Descriptions.Item>
              </Descriptions>
            </Card>
            <Card title="学习路径匹配摘要">
              {learningPathMatch?.onboardingConfig ||
              learningPathMatch?.diagnosisRule ||
              learningPathMatch?.todayTaskTemplate ? (
                <Descriptions column={2}>
                  <Descriptions.Item label="Onboarding 配置" span={2}>
                    {learningPathMatch.onboardingConfig ? (
                      <Space orientation="vertical" size={6}>
                        <Space wrap>
                          {canOpenLearningPathConfig ? (
                            <Button
                              type="link"
                              size="small"
                              onClick={() => history.push('/learning-path/onboarding')}
                            >
                              {learningPathMatch.onboardingConfig.configName}
                            </Button>
                          ) : (
                            <Typography.Text>
                              {learningPathMatch.onboardingConfig.configName}
                            </Typography.Text>
                          )}
                          <Tag>{learningPathMatch.onboardingConfig.version}</Tag>
                          <Typography.Text type="secondary">
                            完成时间：{learningPathMatch.onboardingConfig.completedAt}
                          </Typography.Text>
                        </Space>
                        <Space wrap>
                          {learningPathMatch.onboardingConfig.answers.map((answer) => (
                            <Tag key={answer.fieldKey}>
                              {answer.fieldLabel}：{answer.optionLabel}
                            </Tag>
                          ))}
                        </Space>
                      </Space>
                    ) : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="命中诊断规则">
                    {learningPathMatch.diagnosisRule ? (
                      <Space orientation="vertical" size={2}>
                        <Space wrap>
                          {canOpenLearningPathConfig ? (
                            <Button
                              type="link"
                              size="small"
                              onClick={() =>
                                history.push(
                                  `/learning-path/diagnosis-rules/${learningPathMatch.diagnosisRule?.ruleId}`,
                                )
                              }
                            >
                              {learningPathMatch.diagnosisRule.ruleName}
                            </Button>
                          ) : (
                            <Typography.Text>
                              {learningPathMatch.diagnosisRule.ruleName}
                            </Typography.Text>
                          )}
                          <Tag>{learningPathMatch.diagnosisRule.version}</Tag>
                          <StatusTag
                            domain="reviewPublish"
                            value={learningPathMatch.diagnosisRule.status}
                          />
                          {learningPathMatch.diagnosisRule.currentOnline ? (
                            <Tag color="success">线上生效</Tag>
                          ) : (
                            <Tag color="warning">非线上版本</Tag>
                          )}
                        </Space>
                        <Space wrap>
                          {learningPathMatch.diagnosisRule.weakModules.map(
                            (item) => (
                              <Tag key={item}>{moduleLabelMap[item]}</Tag>
                            ),
                          )}
                          <Tag>
                            {learningPathMatch.diagnosisRule.weakLevel}
                          </Tag>
                          <Tag>
                            {learningPathMatch.diagnosisRule.taskPriority}
                          </Tag>
                        </Space>
                        <Typography.Text type="secondary">
                          命中时间：{learningPathMatch.diagnosisRule.matchedAt}
                        </Typography.Text>
                      </Space>
                    ) : (
                      '-'
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="今日任务模板">
                    {learningPathMatch.todayTaskTemplate ? (
                      <Space orientation="vertical" size={2}>
                        <Space wrap>
                          {canOpenLearningPathConfig ? (
                            <Button
                              type="link"
                              size="small"
                              onClick={() =>
                                history.push(
                                  `/learning-path/task-templates/${learningPathMatch.todayTaskTemplate?.templateId}`,
                                )
                              }
                            >
                              {
                                learningPathMatch.todayTaskTemplate
                                  .templateName
                              }
                            </Button>
                          ) : (
                            <Typography.Text>
                              {
                                learningPathMatch.todayTaskTemplate
                                  .templateName
                              }
                            </Typography.Text>
                          )}
                          <Tag>
                            {learningPathMatch.todayTaskTemplate.version}
                          </Tag>
                          <StatusTag
                            domain="reviewPublish"
                            value={learningPathMatch.todayTaskTemplate.status}
                          />
                          {learningPathMatch.todayTaskTemplate.currentOnline ? (
                            <Tag color="success">线上生效</Tag>
                          ) : (
                            <Tag color="warning">非线上版本</Tag>
                          )}
                        </Space>
                        <Typography.Text>
                          {learningPathMatch.todayTaskTemplate.taskItemCount}{' '}
                          项 ·{' '}
                          {
                            learningPathMatch.todayTaskTemplate
                              .totalEstimatedMinutes
                          }{' '}
                          分钟
                        </Typography.Text>
                        <Typography.Text type="secondary">
                          命中时间：
                          {learningPathMatch.todayTaskTemplate.matchedAt}
                        </Typography.Text>
                      </Space>
                    ) : (
                      '-'
                    )}
                  </Descriptions.Item>
                </Descriptions>
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="暂无学习路径匹配结果"
                />
              )}
            </Card>
          </Space>
        ) : null,
      },
      {
        key: 'learning',
        label: '学习记录',
        children: (
          <ProTable<API.UserLearningRecord>
            rowKey="id"
            columns={learningColumns}
            search={{ labelWidth: 90, span: 6 }}
            pagination={{
              defaultPageSize: 20,
              pageSizeOptions: [20, 50, 100],
              showSizeChanger: true,
            }}
            locale={{
              emptyText: (
                <Empty
                  description="该用户暂无学习记录"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ),
            }}
            request={async (params) => {
              const response = await operationUserLearningRecords(id, {
                current: params.current,
                pageSize: params.pageSize,
                dateRange: params.dateRange as string[] | undefined,
                module: params.module,
                status: params.status,
                errorTag: params.errorTag,
              });
              return {
                data: response.data ?? [],
                total: response.total ?? 0,
                success: response.success,
              };
            }}
          />
        ),
      },
      {
        key: 'feedback',
        label: '反馈记录',
        children: (
          <ProTable<API.UserFeedbackItem>
            actionRef={feedbackTableRef}
            rowKey="id"
            columns={feedbackColumns}
            search={{ labelWidth: 90, span: 6 }}
            pagination={{
              defaultPageSize: 20,
              pageSizeOptions: [20, 50, 100],
              showSizeChanger: true,
            }}
            scroll={{ x: 1300 }}
            locale={{
              emptyText: (
                <Empty
                  description="该用户暂无反馈记录"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ),
            }}
            request={async (params) => {
              const response = await operationUserFeedbacks(id, {
                current: params.current,
                pageSize: params.pageSize,
                status: params.status,
              });
              return {
                data: response.data ?? [],
                total: response.total ?? 0,
                success: response.success,
              };
            }}
          />
        ),
      },
      {
        key: 'ai',
        label: 'AI 陪练摘要',
        children: (
          <ProTable<API.UserAiSummary>
            rowKey="id"
            columns={aiColumns}
            search={false}
            pagination={{
              defaultPageSize: 20,
              pageSizeOptions: [20, 50, 100],
              showSizeChanger: true,
            }}
            scroll={{ x: 1200 }}
            locale={{
              emptyText: (
                <Empty
                  description="该用户暂无可查看的 AI 陪练摘要"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ),
            }}
            request={async (params) => {
              const response = await operationUserAiSummaries(id, {
                current: params.current,
                pageSize: params.pageSize,
              });
              return {
                data: response.data ?? [],
                total: response.total ?? 0,
                success: response.success,
              };
            }}
          />
        ),
      },
      {
        key: 'records',
        label: '处理与访问记录',
        children: detail ? (
          <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            {canHandleFeedback ? (
              <Card title="客服处理备注">
                <Input.TextArea
                  value={remarkDraft}
                  onChange={(event) => setRemarkDraft(event.target.value)}
                  rows={3}
                  maxLength={300}
                  showCount
                  placeholder="记录本次排查结论或后续处理建议"
                />
                <Space style={{ marginTop: 12 }}>
                  <Button
                    type="primary"
                    loading={remarkSubmitting}
                    onClick={submitRemark}
                  >
                    保存备注
                  </Button>
                </Space>
              </Card>
            ) : null}
            <Card title="历史备注">
              {detail.remarks?.length ? (
                <Timeline
                  items={detail.remarks.map((remark) => ({
                    children: `${remark.createdAt} ${remark.operator}：${remark.content}`,
                  }))}
                />
              ) : (
                <Empty
                  description="暂无客服处理备注"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </Card>
            <ProTable<API.UserSensitiveAccessLog>
              actionRef={accessLogTableRef}
              rowKey="id"
              columns={accessLogColumns}
              search={false}
              scroll={{ x: 1200 }}
              pagination={{
                defaultPageSize: 20,
                pageSizeOptions: [20, 50, 100],
                showSizeChanger: true,
              }}
              locale={{
                emptyText: (
                  <Empty
                    description="暂无相关访问记录"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ),
              }}
              request={async (params) => {
                const response = await operationUserAccessLogs(id, {
                  current: params.current,
                  pageSize: params.pageSize,
                });
                return {
                  data: response.data ?? [],
                  total: response.total ?? 0,
                  success: response.success,
                };
              }}
            />
          </Space>
        ) : null,
      },
    ],
    [
      detail,
      id,
      remarkDraft,
      remarkSubmitting,
      canHandleFeedback,
      canOpenLearningPathConfig,
      learningPathMatch,
    ],
  );

  if (loading) {
    return (
      <PageContainer title="用户详情">
        <Card>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      </PageContainer>
    );
  }

  if (errorStatus) {
    return (
      <PageContainer title="用户详情">
        <Result
          status={errorStatus}
          title={errorStatus}
          subTitle={
            errorStatus === '403'
              ? '当前账号无用户详情访问权限。'
              : errorStatus === '404'
                ? '用户不存在。'
                : '用户详情加载失败。'
          }
          extra={
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => history.push('/users/list')}
              >
                返回用户列表
              </Button>
              {errorStatus === '500' ? (
                <Button icon={<ReloadOutlined />} onClick={loadDetail}>
                  重试
                </Button>
              ) : null}
            </Space>
          }
        />
      </PageContainer>
    );
  }

  if (!detail) {
    return (
      <PageContainer title="用户详情">
        <Empty description="用户不存在" />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={`${detail.nickname} 用户详情`}
      content="展示用户学习状态、反馈记录和必要 AI 摘要；敏感内容查看前会写入访问日志。"
      extra={[
        <Button
          key="back"
          icon={<ArrowLeftOutlined />}
          onClick={() => history.push('/users/list')}
        >
          返回用户列表
        </Button>,
        <Button key="feedback" onClick={() => safeSetTab('feedback')}>
          查看相关反馈
        </Button>,
        canHandleFeedback ? (
          <Button
            key="remark"
            type="primary"
            onClick={() => safeSetTab('records')}
          >
            添加客服备注
          </Button>
        ) : null,
      ]}
    >
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Card>
          <Descriptions column={4}>
            <Descriptions.Item label="用户 ID">{detail.id}</Descriptions.Item>
            <Descriptions.Item label="考试类型">
              {detail.examProfile.examType}
            </Descriptions.Item>
            <Descriptions.Item label="目标分">
              {detail.examProfile.targetScore}
            </Descriptions.Item>
            <Descriptions.Item label="最近活跃">
              {detail.lastActiveAt}
            </Descriptions.Item>
            <Descriptions.Item label="当前学习状态">
              {detail.currentStudyStatus}
            </Descriptions.Item>
            <Descriptions.Item label="未处理反馈">
              {detail.unhandledFeedbackCount}
            </Descriptions.Item>
            <Descriptions.Item label="手机号">
              {detail.phoneMasked}
            </Descriptions.Item>
            <Descriptions.Item label="邮箱">
              {detail.emailMasked}
            </Descriptions.Item>
          </Descriptions>
        </Card>
        <Tabs activeKey={activeTab} onChange={safeSetTab} items={tabItems} />
      </Space>

      <Modal
        title={sensitiveRequest?.title ?? '敏感访问'}
        open={Boolean(sensitiveRequest)}
        okText="写入日志并查看"
        cancelText="取消"
        onOk={submitSensitiveAccess}
        onCancel={() => setSensitiveRequest(undefined)}
        destroyOnHidden
      >
        <Alert
          type="warning"
          showIcon
          title="查看敏感信息前必须写入访问日志，写入失败时不会展示内容。"
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
        title="更新反馈状态"
        open={Boolean(feedbackTarget)}
        okText="确认更新"
        cancelText="取消"
        confirmLoading={feedbackSubmitting}
        onOk={submitFeedbackStatus}
        onCancel={() => setFeedbackTarget(undefined)}
        destroyOnHidden
      >
        <Form form={feedbackForm} layout="vertical">
          <Form.Item label="当前状态">
            {feedbackTarget ? (
              <StatusTag domain="feedback" value={feedbackTarget.status} />
            ) : null}
          </Form.Item>
          <Form.Item
            name="status"
            label="目标状态"
            rules={[{ required: true, message: '请选择目标状态' }]}
          >
            <Select
              options={(feedbackTarget
                ? feedbackNextStatusOptions[feedbackTarget.status]
                : []
              ).map((value) => ({
                value,
                label: getOptionLabel(feedbackStatusOptions, value),
              }))}
            />
          </Form.Item>
          <Form.Item name="reason" label="处理原因">
            <Input.TextArea rows={3} maxLength={160} showCount />
          </Form.Item>
          <Form.Item name="remark" label="处理备注">
            <Input.TextArea rows={3} maxLength={200} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default UserDetailPage;
