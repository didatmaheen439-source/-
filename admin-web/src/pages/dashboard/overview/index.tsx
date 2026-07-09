import {
  ArrowRightOutlined,
  AuditOutlined,
  BranchesOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  ExclamationCircleOutlined,
  FileDoneOutlined,
  LineChartOutlined,
  ReloadOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useModel, useSearchParams } from '@umijs/max';
import {
  Alert,
  App,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Result,
  Row,
  Select,
  Skeleton,
  Space,
  Statistic,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type React from 'react';
import { useEffect, useState } from 'react';
import {
  dashboardOverview,
  handleDashboardRisk,
  recordDashboardAction,
} from '@/services/ant-design-pro/api';

type DashboardError = {
  status?: '401' | '403' | '500';
  message: string;
};

const sectionTitle: Record<API.DashboardVisibleSection, string> = {
  welcome: '欢迎区',
  todos: '今日待办',
  risks: '超时和高风险提醒',
  metrics: '今日关键指标',
  quickActions: '快捷入口',
  moduleSnapshots: '模块状态摘要',
  recentActivities: '最近处理记录',
  aiPlaceholder: 'AI 占位摘要',
};

const todoTypeOptions: { label: string; value: API.DashboardTodoType | 'all' }[] = [
  { label: '全部待办', value: 'all' },
  { label: '待审核', value: 'pending_review' },
  { label: '待发布', value: 'pending_publish' },
  { label: '驳回待修改', value: 'rejected_content' },
  { label: '待处理反馈', value: 'pending_feedback' },
  { label: '反馈超时', value: 'stale_feedback' },
  { label: '预校验阻断', value: 'learning_path_precheck_error' },
  { label: '学习路径驳回', value: 'learning_path_rejected' },
  { label: '发布失败', value: 'publish_failed' },
  { label: '回滚失败', value: 'rollback_failed' },
  { label: '权限异常', value: 'permission_denied' },
];

const priorityOptions: { label: string; value: API.DashboardTodoPriority | 'all' }[] = [
  { label: '全部优先级', value: 'all' },
  { label: 'P0', value: 'P0' },
  { label: 'P1', value: 'P1' },
  { label: 'P2', value: 'P2' },
  { label: 'P3', value: 'P3' },
];

const priorityColors: Record<API.DashboardTodoPriority, string> = {
  P0: 'red',
  P1: 'orange',
  P2: 'blue',
  P3: 'default',
};

const riskLevelColors: Record<API.DashboardRiskLevel, string> = {
  high: 'red',
  medium: 'orange',
  low: 'blue',
};

const riskLevelNames: Record<API.DashboardRiskLevel, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

const resultColors: Record<API.DashboardRecentActivity['result'], string> = {
  success: 'success',
  denied: 'error',
  failed: 'warning',
};

const resultLabels: Record<API.DashboardRecentActivity['result'], string> = {
  success: '成功',
  denied: '拒绝',
  failed: '失败',
};

const snapshotStatusColors: Record<'normal' | 'warning' | 'risk', string> = {
  normal: 'default',
  warning: 'orange',
  risk: 'red',
};

const actionIcons: Record<string, React.ReactNode> = {
  AuditOutlined: <AuditOutlined />,
  DatabaseOutlined: <DatabaseOutlined />,
  TeamOutlined: <TeamOutlined />,
  BranchesOutlined: <BranchesOutlined />,
  LineChartOutlined: <LineChartOutlined />,
  SafetyCertificateOutlined: <SafetyCertificateOutlined />,
  RobotOutlined: <RobotOutlined />,
  FileDoneOutlined: <FileDoneOutlined />,
};

const cardSpan = { xs: 24, sm: 12, md: 12, lg: 8, xl: 6 };
const metricSpan = { xs: 24, sm: 12, md: 8, lg: 6, xl: 6 };
const tileStyle: React.CSSProperties = {
  minHeight: 118,
  padding: 12,
  border: '1px solid #f0f0f0',
  borderRadius: 6,
  background: '#fff',
};
const actionTileStyle: React.CSSProperties = {
  ...tileStyle,
  cursor: 'pointer',
};

const readFilters = (searchParams: URLSearchParams): API.DashboardFilterParams => ({
  todoType: (searchParams.get('todoType') || 'all') as API.DashboardTodoType | 'all',
  priority: (searchParams.get('priority') || 'all') as API.DashboardTodoPriority | 'all',
  simulateEmpty: searchParams.get('simulateEmpty') === 'true',
  simulateNoRisk: searchParams.get('simulateNoRisk') === 'true',
  simulateFailure: searchParams.get('simulateFailure') === 'true',
  simulateSectionError: (searchParams.get('simulateSectionError') || undefined) as
    | API.DashboardVisibleSection
    | undefined,
});

const targetUrl = (route: string, query?: Record<string, string>) => {
  const [pathname, rawQuery] = route.split('?');
  const params = new URLSearchParams(rawQuery);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
};

const requestError = (err: unknown): DashboardError => {
  const error = err as {
    response?: { status?: number };
    data?: { errorMessage?: string };
    message?: string;
  };
  const status = error.response?.status;
  return {
    status: status === 401 ? '401' : status === 403 ? '403' : '500',
    message:
      error.data?.errorMessage ||
      error.message ||
      '运营工作台加载失败',
  };
};

const SectionCard: React.FC<{
  section: API.DashboardVisibleSection;
  data?: API.DashboardOverview;
  children: React.ReactNode;
  extra?: React.ReactNode;
}> = ({ section, data, children, extra }) => {
  const error = data?.sectionErrors.find((item) => item.section === section);
  return (
    <Card title={sectionTitle[section]} size="small" extra={extra}>
      {error ? (
        <Alert
          type={error.level === 'error' ? 'error' : 'warning'}
          showIcon
          title={error.message}
          description="该区块按部分成功策略降级展示，其他区块不受影响。"
        />
      ) : (
        children
      )}
    </Card>
  );
};

const DashboardOverviewPage: React.FC = () => {
  const { message } = App.useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const { initialState } = useModel('@@initialState');
  const roleId = initialState?.currentUser?.roleId;
  const [filters, setFilters] = useState(readFilters(searchParams));
  const [data, setData] = useState<API.DashboardOverview>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<DashboardError>();

  const loadData = async (nextFilters = filters, quiet = false) => {
    if (!quiet) setLoading(true);
    setRefreshing(quiet);
    setError(undefined);
    try {
      const result = await dashboardOverview(nextFilters);
      setData(result.data);
    } catch (err) {
      setData(undefined);
      setError(requestError(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const next = readFilters(searchParams);
    setFilters(next);
    loadData(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  const updateFilters = (next: API.DashboardFilterParams) => {
    setFilters(next);
    const params = Object.fromEntries(
      Object.entries(next)
        .filter(([, value]) => value !== undefined && value !== '' && value !== false)
        .map(([key, value]) => [key, String(value)]),
    );
    setSearchParams(params);
  };

  const jumpToTarget = async (
    action: API.DashboardActionLogParams['action'],
    objectId: string,
    route: string,
    query?: Record<string, string>,
  ) => {
    const url = targetUrl(route, query);
    try {
      await recordDashboardAction({
        action,
        objectId,
        targetRoute: url,
        reason: '工作台跳转到目标业务模块。',
      });
    } catch (_err) {
      // 跳转不依赖日志写入成功，失败会由目标页权限继续兜底。
    }
    history.push(url);
  };

  const manualRefresh = async () => {
    try {
      await recordDashboardAction({
        action: 'manual_refresh',
        objectId: 'overview',
        reason: '手动刷新运营工作台。',
      });
    } catch (_err) {
      // 刷新本身继续执行，接口层会记录阻断错误。
    }
    await loadData(filters, true);
    message.success('工作台已刷新');
  };

  const markRiskHandled = async (risk: API.DashboardRiskItem) => {
    try {
      await handleDashboardRisk(risk.id, {
        reason: `在工作台处理风险：${risk.title}`,
      });
      message.success('风险已标记处理');
      await loadData(filters, true);
    } catch (err) {
      message.error(requestError(err).message);
    }
  };

  const todoColumns: ProColumns<API.DashboardTodoItem>[] = [
    {
      title: '优先级',
      dataIndex: 'priority',
      width: 90,
      render: (_, record) => (
        <Tag color={priorityColors[record.priority]}>{record.priority}</Tag>
      ),
    },
    {
      title: '待办',
      dataIndex: 'title',
      width: 320,
      render: (_, record) => (
        <Space orientation="vertical" size={2} style={{ maxWidth: 300 }}>
          <Space size={6}>
            <Tag>{record.typeName}</Tag>
            {record.overdue ? <Tag color="red">超时</Tag> : null}
          </Space>
          <Tooltip title={record.title}>
            <Typography.Text strong ellipsis>
              {record.title}
            </Typography.Text>
          </Tooltip>
          <Typography.Text type="secondary" ellipsis>
            {record.description}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '来源模块',
      dataIndex: 'sourceModuleName',
      width: 140,
      render: (_, record) => <Tag color="geekblue">{record.sourceModuleName}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'statusLabel',
      width: 120,
      render: (_, record) => <Tag>{record.statusLabel}</Tag>,
    },
    {
      title: '等待时长',
      dataIndex: 'waitText',
      width: 120,
      sorter: (a, b) => a.waitHours - b.waitHours,
      render: (_, record) => (
        <Space size={6}>
          <ClockCircleOutlined />
          <span>{record.waitText}</span>
        </Space>
      ),
    },
    {
      title: '负责人',
      dataIndex: 'owner',
      width: 120,
      ellipsis: true,
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      width: 120,
      render: (_, record) => (
        <Button
          type={record.canHandle ? 'link' : 'text'}
          size="small"
          onClick={() =>
            jumpToTarget(
              'todo_jump',
              record.objectId,
              record.targetRoute,
              record.targetQuery,
            )
          }
        >
          {record.handleActionLabel}
        </Button>
      ),
    },
  ];

  const activityColumns: ProColumns<API.DashboardRecentActivity>[] = [
    {
      title: '时间',
      dataIndex: 'time',
      width: 170,
    },
    {
      title: '模块',
      dataIndex: 'sourceModuleName',
      width: 140,
      render: (_, record) => <Tag>{record.sourceModuleName}</Tag>,
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      width: 130,
      ellipsis: true,
    },
    {
      title: '动作',
      dataIndex: 'action',
      ellipsis: true,
    },
    {
      title: '结果',
      dataIndex: 'result',
      width: 100,
      render: (_, record) => (
        <Tag color={resultColors[record.result]}>{resultLabels[record.result]}</Tag>
      ),
    },
  ];

  const visible = (section: API.DashboardVisibleSection) =>
    Boolean(data?.visibleSections.includes(section));

  if (loading && !data) {
    return (
      <PageContainer title="工作台">
        <Skeleton active paragraph={{ rows: 12 }} />
      </PageContainer>
    );
  }

  if (error && !data) {
    return (
      <PageContainer title="工作台">
        <Result
          status={error.status === '403' ? '403' : error.status === '401' ? '403' : '500'}
          title={error.status === '403' ? '无权限访问工作台' : '工作台加载失败'}
          subTitle={error.message}
          extra={
            <Button type="primary" onClick={() => loadData(filters)}>
              重试
            </Button>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="工作台"
      extra={[
        <Button
          key="refresh"
          icon={<ReloadOutlined />}
          loading={refreshing}
          onClick={manualRefresh}
        >
          刷新
        </Button>,
      ]}
    >
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        {data?.sectionErrors.length ? (
          <Alert
            type="warning"
            showIcon
            title="工作台部分区块降级展示"
            description={data.sectionErrors.map((item) => item.message).join('；')}
          />
        ) : null}
        {data?.dataQualityIssues.length ? (
          <Alert
            type={data.dataQualityIssues.some((item) => item.level === 'error') ? 'error' : 'warning'}
            showIcon
            title="数据质量提示"
            description={data.dataQualityIssues.map((item) => item.message).join('；')}
          />
        ) : null}

        {visible('welcome') ? (
          <Card size="small">
            <Flex justify="space-between" align="center" wrap="wrap" gap={16}>
              <Space orientation="vertical" size={4}>
                <Typography.Title level={4} style={{ margin: 0 }}>
                  {data?.welcome.greeting}，{data?.welcome.operatorName}
                </Typography.Title>
                <Space wrap size={8}>
                  <Tag color="blue">{data?.welcome.roleName}</Tag>
                  <Typography.Text type="secondary">
                    {data?.welcome.currentDate}
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    更新 {data?.welcome.updatedAt}
                  </Typography.Text>
                </Space>
              </Space>
              <Typography.Text>{data?.welcome.workHint}</Typography.Text>
            </Flex>
          </Card>
        ) : null}

        {visible('todos') ? (
          <SectionCard
            section="todos"
            data={data}
            extra={
              <Space wrap>
                <Select
                  size="small"
                  value={filters.todoType || 'all'}
                  options={todoTypeOptions}
                  style={{ width: 160 }}
                  onChange={(todoType) => updateFilters({ ...filters, todoType })}
                />
                <Select
                  size="small"
                  value={filters.priority || 'all'}
                  options={priorityOptions}
                  style={{ width: 140 }}
                  onChange={(priority) => updateFilters({ ...filters, priority })}
                />
              </Space>
            }
          >
            <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
              <Col {...cardSpan}>
                <Statistic title="待办总数" value={data?.todoSummary.total ?? 0} suffix="项" />
              </Col>
              <Col {...cardSpan}>
                <Statistic title="P0/P1" value={data?.todoSummary.highPriority ?? 0} suffix="项" />
              </Col>
              <Col {...cardSpan}>
                <Statistic title="超时" value={data?.todoSummary.overdue ?? 0} suffix="项" />
              </Col>
              <Col {...cardSpan}>
                <Statistic title="今日新增" value={data?.todoSummary.todayNew ?? 0} suffix="项" />
              </Col>
            </Row>
            <ProTable<API.DashboardTodoItem>
              rowKey="id"
              search={false}
              options={false}
              columns={todoColumns}
              dataSource={data?.todoItems ?? []}
              pagination={false}
              scroll={{ x: 1040 }}
              locale={{
                emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无待办" />,
              }}
            />
          </SectionCard>
        ) : null}

        {visible('risks') ? (
          <SectionCard section="risks" data={data}>
            <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
              <Col xs={24} sm={8}>
                <Statistic title="风险总数" value={data?.riskSummary.total ?? 0} suffix="项" />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic title="高风险" value={data?.riskSummary.high ?? 0} suffix="项" />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic title="关联超时" value={data?.riskSummary.overdue ?? 0} suffix="项" />
              </Col>
            </Row>
            {data?.riskItems.length ? (
              <Space orientation="vertical" size={0} style={{ width: '100%' }}>
                {data.riskItems.map((risk) => (
                  <Flex
                    key={risk.id}
                    align="flex-start"
                    justify="space-between"
                    gap={12}
                    style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}
                  >
                    <Flex align="flex-start" gap={12} style={{ minWidth: 0 }}>
                      {risk.level === 'high' ? (
                        <ExclamationCircleOutlined style={{ color: '#cf1322', marginTop: 4 }} />
                      ) : (
                        <SafetyCertificateOutlined style={{ color: '#fa8c16', marginTop: 4 }} />
                      )}
                      <Space orientation="vertical" size={2} style={{ minWidth: 0 }}>
                        <Space wrap size={6}>
                          <Tag color={riskLevelColors[risk.level]}>
                            {riskLevelNames[risk.level]}风险
                          </Tag>
                          <Typography.Text ellipsis style={{ maxWidth: 520 }}>
                            {risk.title}
                          </Typography.Text>
                        </Space>
                        <Typography.Text type="secondary">
                          {risk.sourceModuleName} / {risk.typeName} / {risk.occurredAt}
                        </Typography.Text>
                        <Typography.Text type="secondary" ellipsis>
                          {risk.description}
                        </Typography.Text>
                      </Space>
                    </Flex>
                    <Space wrap>
                      <Button
                        type="link"
                        size="small"
                        onClick={() =>
                          jumpToTarget(
                            'todo_jump',
                            risk.objectId,
                            risk.targetRoute,
                            risk.targetQuery,
                          )
                        }
                      >
                        查看
                      </Button>
                      {roleId === 'super_admin' ? (
                        <Button size="small" onClick={() => markRiskHandled(risk)}>
                          标记处理
                        </Button>
                      ) : null}
                    </Space>
                  </Flex>
                ))}
              </Space>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无风险" />
            )}
          </SectionCard>
        ) : null}

        {visible('metrics') ? (
          <SectionCard section="metrics" data={data}>
            <Row gutter={[12, 12]}>
              {(data?.summaryMetrics ?? []).map((metric) => (
                <Col key={metric.id} {...metricSpan}>
                  <div style={tileStyle}>
                    <Space orientation="vertical" size={8} style={{ width: '100%' }}>
                      <Flex justify="space-between" align="center" gap={8}>
                        <Tooltip title={metric.tooltip}>
                          <Typography.Text type="secondary" ellipsis>
                            {metric.title}
                          </Typography.Text>
                        </Tooltip>
                        <Tag color={metric.timeSemantic === 'today' ? 'blue' : 'default'}>
                          {metric.timeSemantic === 'today' ? '今日' : '快照'}
                        </Tag>
                      </Flex>
                      <Statistic
                        value={metric.displayValue}
                        suffix={metric.displayValue === '--' ? undefined : metric.unit}
                      />
                      <Flex justify="space-between" align="center">
                        <Typography.Text type="secondary">
                          {metric.comparison.available
                            ? `${metric.comparison.label} ${metric.comparison.value}`
                            : '--'}
                        </Typography.Text>
                        {metric.targetRoute ? (
                          <Button
                            type="link"
                            size="small"
                            onClick={() =>
                              jumpToTarget(
                                'quick_action_jump',
                                metric.id,
                                metric.targetRoute as string,
                              )
                            }
                          >
                            查看
                          </Button>
                        ) : null}
                      </Flex>
                    </Space>
                  </div>
                </Col>
              ))}
            </Row>
          </SectionCard>
        ) : null}

        {visible('quickActions') ? (
          <SectionCard section="quickActions" data={data}>
            <Row gutter={[12, 12]}>
              {(data?.quickActions ?? []).map((action) => (
                <Col key={action.id} {...cardSpan}>
                  <div
                    style={actionTileStyle}
                    onClick={() =>
                      jumpToTarget(
                        'quick_action_jump',
                        action.id,
                        action.targetRoute,
                        action.targetQuery,
                      )
                    }
                  >
                    <Flex justify="space-between" align="flex-start" gap={12}>
                      <Space orientation="vertical" size={6}>
                        <Space size={8}>
                          {actionIcons[action.icon] ?? <ArrowRightOutlined />}
                          <Typography.Text strong>{action.title}</Typography.Text>
                        </Space>
                        <Typography.Text type="secondary">
                          {action.description}
                        </Typography.Text>
                      </Space>
                      {action.todoCount ? (
                        <Badge count={action.todoCount} overflowCount={99} />
                      ) : (
                        <ArrowRightOutlined style={{ color: '#8c8c8c' }} />
                      )}
                    </Flex>
                  </div>
                </Col>
              ))}
            </Row>
          </SectionCard>
        ) : null}

        {visible('moduleSnapshots') ? (
          <SectionCard section="moduleSnapshots" data={data}>
            <Row gutter={[12, 12]}>
              {(data?.moduleSnapshots ?? []).map((snapshot) => (
                <Col key={snapshot.id} {...cardSpan}>
                  <div style={tileStyle}>
                    <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
                      <Typography.Text strong>{snapshot.title}</Typography.Text>
                      <Button
                        type="link"
                        size="small"
                        onClick={() =>
                          jumpToTarget(
                            'quick_action_jump',
                            snapshot.id,
                            snapshot.targetRoute,
                          )
                        }
                      >
                        进入
                      </Button>
                    </Flex>
                    <Space orientation="vertical" size={8} style={{ width: '100%' }}>
                      {snapshot.items.map((item) => (
                        <Flex key={item.label} justify="space-between" align="center">
                          <Typography.Text type="secondary">{item.label}</Typography.Text>
                          <Tag color={snapshotStatusColors[item.status ?? 'normal']}>
                            {item.value}
                          </Tag>
                        </Flex>
                      ))}
                    </Space>
                  </div>
                </Col>
              ))}
            </Row>
          </SectionCard>
        ) : null}

        {visible('recentActivities') ? (
          <SectionCard section="recentActivities" data={data}>
            <ProTable<API.DashboardRecentActivity>
              rowKey="id"
              search={false}
              options={false}
              columns={activityColumns}
              dataSource={data?.recentActivities ?? []}
              pagination={false}
              scroll={{ x: 820 }}
              locale={{
                emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无最近记录" />,
              }}
            />
          </SectionCard>
        ) : null}

        {visible('aiPlaceholder') ? (
          <Alert
            type="info"
            showIcon
            icon={<RobotOutlined />}
            title="AI 陪练指标当前仅展示占位摘要"
            description="本阶段不深入开发 AI 陪练模块，正式策略、效果和风险数据将在后续阶段接入。"
          />
        ) : null}

        {data && data.todoSummary.total === 0 && data.riskSummary.total === 0 ? (
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            title="当前角色暂无待办和风险事项"
          />
        ) : null}
      </Space>
    </PageContainer>
  );
};

export default DashboardOverviewPage;
