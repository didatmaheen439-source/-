import {
  DownloadOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useLocation, useModel, useSearchParams } from '@umijs/max';
import { Bar, Column, Line, Pie } from '@ant-design/plots';
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Empty,
  Flex,
  Result,
  Row,
  Col,
  Segmented,
  Select,
  Skeleton,
  Space,
  Statistic,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  analyticsOverview,
  createAnalyticsCorrectionIntent,
  exportAnalyticsOverview,
} from '@/services/ant-design-pro/api';

const { RangePicker } = DatePicker;

const sectionTabs: Array<{
  key: API.AnalyticsVisibleSection;
  label: string;
  route: string;
}> = [
  { key: 'users', label: '用户', route: '/analytics/users' },
  { key: 'learningPath', label: '路径', route: '/analytics/learning-funnel' },
  { key: 'content', label: '内容', route: '/analytics/content' },
  { key: 'wrongReason', label: '错因', route: '/analytics/wrong-reasons' },
  { key: 'writingTranslation', label: '写译', route: '/analytics/writing-translation' },
  { key: 'mockExam', label: '模考', route: '/analytics/mock-exam' },
  { key: 'aiCoach', label: 'AI', route: '/analytics/ai' },
  { key: 'retention', label: '留存', route: '/analytics/retention' },
];

const pathModuleMap: Record<string, API.AnalyticsModule> = {
  '/analytics/users': 'users',
  '/analytics/learning-funnel': 'learningPath',
  '/analytics/content': 'content',
  '/analytics/questions': 'content',
  '/analytics/wrong-reasons': 'wrongReason',
  '/analytics/writing-translation': 'writingTranslation',
  '/analytics/mock-exam': 'mockExam',
  '/analytics/ai': 'aiCoach',
  '/analytics/retention': 'retention',
  '/analytics/overview': 'all',
};

const analyticsEntryMap: Record<
  string,
  { title: string; description: string; module: API.AnalyticsModule }
> = {
  '/analytics/users': {
    title: '用户增长',
    description: '查看用户新增、活跃和分布数据。',
    module: 'users',
  },
  '/analytics/learning-funnel': {
    title: '学习路径漏斗',
    description: '查看诊断、任务开始和任务完成的路径漏斗。',
    module: 'learningPath',
  },
  '/analytics/content': {
    title: '内容效果',
    description: '查看题库与内容资产的状态、效果和质量趋势。',
    module: 'content',
  },
  '/analytics/questions': {
    title: '题库表现',
    description: '查看题目使用、发布状态和内容表现。',
    module: 'content',
  },
  '/analytics/wrong-reasons': {
    title: '错因分布',
    description: '查看错因薄弱项、引用覆盖和可修正对象。',
    module: 'wrongReason',
  },
  '/analytics/writing-translation': {
    title: '写译效果',
    description: '查看写译题目、模板、二改策略和 Mock 批改指标。',
    module: 'writingTranslation',
  },
  '/analytics/mock-exam': {
    title: '模考表现',
    description: '查看模考试卷、完成情况和成绩表现。',
    module: 'mockExam',
  },
  '/analytics/ai': {
    title: 'AI 使用',
    description: '查看 AI 策略、异常回复和待处理项。',
    module: 'aiCoach',
  },
  '/analytics/retention': {
    title: '留存分析',
    description: '查看用户活跃、7 日留存和路径中断对象。',
    module: 'retention',
  },
  '/analytics/overview': {
    title: '数据总览',
    description: '按用户、路径、内容、错因、写译、模考、AI 和留存分区查看指标。',
    module: 'all',
  },
};

const getAnalyticsEntry = (pathname: string) =>
  analyticsEntryMap[pathname] ?? analyticsEntryMap['/analytics/overview'];

const sectionTitle: Record<API.AnalyticsVisibleSection, string> = {
  users: '用户增长与活跃',
  learningPath: '学习路径漏斗',
  content: '内容效果',
  wrongReason: '错因分布',
  reviewRelease: '审核发布指标',
  feedback: '客服反馈指标',
  aiCoach: 'AI 陪练',
  writingTranslation: '写译批改',
  mockExam: '模考表现',
  retention: '留存分析',
  audit: '风险与审计摘要',
};

const defaultFilters = (
  pathname = '/analytics/overview',
): Required<Pick<API.AnalyticsFilterParams, 'startDate' | 'endDate' | 'granularity' | 'module'>> & {
  examType: API.ExamType | 'all';
} => ({
  startDate: dayjs().subtract(29, 'day').format('YYYY-MM-DD'),
  endDate: dayjs().format('YYYY-MM-DD'),
  examType: 'all',
  granularity: 'day',
  module: pathModuleMap[pathname] ?? 'all',
});

const readFilters = (searchParams: URLSearchParams, pathname?: string) => {
  const defaults = defaultFilters(pathname);
  return {
    startDate: searchParams.get('startDate') || defaults.startDate,
    endDate: searchParams.get('endDate') || defaults.endDate,
    examType: (searchParams.get('examType') || defaults.examType) as API.ExamType | 'all',
    granularity: (searchParams.get('granularity') || defaults.granularity) as API.AnalyticsGranularity,
    module: (searchParams.get('module') || defaults.module) as API.AnalyticsModule,
  };
};

const filterEntries = (filters: ReturnType<typeof readFilters>) =>
  Object.fromEntries(
    Object.entries(filters).filter(([, value]) => Boolean(value)),
  );

const comparisonColor = (card: API.AnalyticsMetricCard) => {
  if (!card.comparison.available || card.comparison.rate === undefined) return 'default';
  if (card.direction === 'risk') return card.comparison.rate > 0 ? 'error' : 'success';
  if (card.direction === 'positive') return card.comparison.rate >= 0 ? 'success' : 'warning';
  return 'default';
};

const renderComparison = (card: API.AnalyticsMetricCard) => {
  if (!card.comparison.available || card.comparison.rate === undefined) return '--';
  const prefix = card.comparison.rate > 0 ? '+' : '';
  return `${prefix}${card.comparison.rate}%`;
};

const cardSpan = { xs: 24, sm: 12, md: 8, lg: 6, xl: 6 };

const riskColor: Record<API.AnalyticsDrilldownRiskLevel, string> = {
  info: 'blue',
  warning: 'warning',
  error: 'error',
};

const MetricCard: React.FC<{ card: API.AnalyticsMetricCard }> = ({ card }) => (
  <Card size="small">
    <Space orientation="vertical" size={8} style={{ width: '100%' }}>
      <Flex justify="space-between" align="center" gap={8}>
        <Space size={6}>
          <Typography.Text type="secondary">{card.title}</Typography.Text>
          <Tooltip title={card.tooltip}>
            <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
          </Tooltip>
        </Space>
        <Tag color={card.timeSemantic === 'interval' ? 'blue' : 'default'}>
          {card.timeSemantic === 'interval' ? '区间' : '快照'}
        </Tag>
      </Flex>
      <Statistic value={card.displayValue} suffix={card.unit} />
      <Flex justify="space-between" align="center">
        <Tag color={comparisonColor(card)}>{renderComparison(card)}</Tag>
        {card.jumpTo ? (
          <Button type="link" size="small" onClick={() => history.push(card.jumpTo as string)}>
            查看
          </Button>
        ) : (
          <Typography.Text type="secondary">更新 {card.updatedAt}</Typography.Text>
        )}
      </Flex>
    </Space>
  </Card>
);

const MetricsGrid: React.FC<{ metrics?: API.AnalyticsMetricCard[] }> = ({ metrics = [] }) => {
  if (!metrics.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前分区暂无指标" />;
  }
  return (
    <Row gutter={[16, 16]}>
      {metrics.map((card) => (
        <Col key={card.id} {...cardSpan}>
          <MetricCard card={card} />
        </Col>
      ))}
    </Row>
  );
};

const SectionCard: React.FC<{
  section: API.AnalyticsVisibleSection;
  data?: API.AnalyticsOverview;
  children: React.ReactNode;
}> = ({ section, data, children }) => {
  const error = data?.sectionErrors.find((item) => item.section === section);
  if (error) {
    return (
      <Card title={sectionTitle[section]} size="small">
        <Alert
          type="error"
          showIcon
          title={error.message}
          description="该区块按部分成功策略降级展示，其他区块不受影响。"
        />
      </Card>
    );
  }
  return (
    <Card title={sectionTitle[section]} size="small">
      {children}
    </Card>
  );
};

const AnalyticsOverviewPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const analyticsEntry = getAnalyticsEntry(location.pathname);
  const { initialState } = useModel('@@initialState');
  const canExport = initialState?.currentUser?.actionPermissions?.analytics?.includes('export');
  const [filters, setFilters] = useState(readFilters(searchParams, location.pathname));
  const [data, setData] = useState<API.AnalyticsOverview>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<{ status?: '403' | '500'; message: string }>();
  const [correctionLoadingId, setCorrectionLoadingId] = useState<string>();

  const queryParams = useMemo(
    () => ({
      startDate: filters.startDate,
      endDate: filters.endDate,
      examType: filters.examType,
      granularity: filters.granularity,
      module: filters.module,
    }),
    [filters],
  );

  const loadData = async (nextFilters = filters, quiet = false) => {
    if (!quiet) setLoading(true);
    setRefreshing(quiet);
    setError(undefined);
    try {
      const result = await analyticsOverview(nextFilters);
      setData(result.data);
    } catch (err: any) {
      setData(undefined);
      setError({
        status: err?.response?.status === 403 ? '403' : '500',
        message: err?.data?.errorMessage || err?.message || '运营数据加载失败',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const next = readFilters(searchParams, location.pathname);
    setFilters(next);
    loadData(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, searchParams.toString()]);

  const syncFilters = (next: typeof filters) => {
    setFilters(next);
    setSearchParams(filterEntries(next));
  };

  const resetFilters = () => {
    syncFilters(defaultFilters(location.pathname));
  };

  const exportPreview = async () => {
    try {
      const result = await exportAnalyticsOverview(queryParams);
      if (result.data) {
        modal.info({
          title: 'Mock 聚合导出预览',
          content: (
            <Space orientation="vertical">
              <Typography.Text>{result.data.message}</Typography.Text>
              <Typography.Text type="secondary">
                区块数 {result.data.sectionCount}，指标数 {result.data.metricCount}，不包含敏感字段。
              </Typography.Text>
            </Space>
          ),
        });
      }
    } catch (err: any) {
      message.error(err?.data?.errorMessage || err?.message || '生成导出预览失败');
    }
  };

  const availableTabs = useMemo(() => {
    const visibleSections = data?.visibleSections ?? [];
    return sectionTabs.filter((item) => visibleSections.includes(item.key));
  }, [data?.visibleSections]);

  const activeSection = useMemo<API.AnalyticsVisibleSection>(() => {
    const moduleSection = filters.module === 'all' ? undefined : filters.module;
    if (moduleSection && availableTabs.some((item) => item.key === moduleSection)) {
      return moduleSection as API.AnalyticsVisibleSection;
    }
    return availableTabs[0]?.key ?? 'users';
  }, [availableTabs, filters.module]);

  const switchSection = (section: API.AnalyticsVisibleSection) => {
    const next = { ...filters, module: section };
    const search = new URLSearchParams(filterEntries(next)).toString();
    history.replace(`/analytics/overview?${search}`);
  };

  const handleCorrection = async (item: API.AnalyticsDrilldownItem) => {
    setCorrectionLoadingId(item.id);
    try {
      const result = await createAnalyticsCorrectionIntent({
        drilldownId: item.id,
        section: item.section,
        objectType: item.objectType,
        objectId: item.objectId,
        objectName: item.objectName,
        metricLabel: item.metricLabel,
        metricValue: item.metricValue,
        riskLevel: item.riskLevel,
        targetRoute: item.targetRoute,
        correctionRoute: item.correctionRoute,
        reason: item.reason,
      });
      message.success('已记录修正意图');
      history.push(result.data?.targetRoute || item.correctionRoute || item.targetRoute);
    } catch (err: any) {
      message.error(err?.data?.errorMessage || err?.message || '发起修正失败');
    } finally {
      setCorrectionLoadingId(undefined);
    }
  };

  const renderDrilldownTable = (section: API.AnalyticsVisibleSection) => {
    const rows = data?.drilldowns?.[section] ?? [];
    return (
      <ProTable<API.AnalyticsDrilldownItem>
        headerTitle="下钻对象与修正建议"
        search={false}
        options={false}
        pagination={false}
        rowKey="id"
        dataSource={rows}
        scroll={{ x: 1100 }}
        locale={{ emptyText: '当前分区暂无可下钻对象' }}
        columns={[
          { title: '对象', dataIndex: 'objectName', width: 220, ellipsis: true },
          { title: '类型', dataIndex: 'objectType', width: 120 },
          { title: '指标', dataIndex: 'metricLabel', width: 140 },
          { title: '值', dataIndex: 'metricValue', width: 130 },
          {
            title: '风险',
            dataIndex: 'riskLevel',
            width: 100,
            render: (_, record) => <Tag color={riskColor[record.riskLevel]}>{record.riskLevel}</Tag>,
          },
          { title: '原因', dataIndex: 'reason', ellipsis: true },
          {
            title: '操作',
            valueType: 'option',
            width: 190,
            render: (_, record) => {
              const actions: React.ReactNode[] = [];
              if (record.targetAccessible !== false) {
                actions.push(
                  <Button
                    key="view"
                    type="link"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => history.push(record.targetRoute)}
                  >
                    查看
                  </Button>,
                );
              }
              if (record.correctionRoute && record.correctionAccessible !== false) {
                actions.push(
                  <Button
                    key="correct"
                    type="link"
                    size="small"
                    icon={<ToolOutlined />}
                    loading={correctionLoadingId === record.id}
                    onClick={() => handleCorrection(record)}
                  >
                    {record.correctionLabel || '发起修正'}
                  </Button>,
                );
              }
              return actions.length ? actions : <Typography.Text type="secondary">无目标权限</Typography.Text>;
            },
          },
        ]}
      />
    );
  };

  const renderSectionBody = (section: API.AnalyticsVisibleSection) => {
    if (!data) return null;
    const metrics = data.sectionMetrics?.[section] ?? [];
    const distributions = data.sectionDistributions?.[section] ?? [];
    const trends = data.sectionTrends?.[section] ?? [];

    if (section === 'users') {
      return (
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          <MetricsGrid metrics={metrics} />
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={16}>
              {data.userTrend.length ? (
                <Line height={260} data={data.userTrend} xField="date" yField="value" colorField="metric" point tooltip={{ title: 'date' }} />
              ) : (
                <Empty description="当前筛选范围暂无用户趋势" />
              )}
            </Col>
            <Col xs={24} lg={8}>
              <Space orientation="vertical" style={{ width: '100%' }}>
                {Object.entries(data.userDistributions).map(([key, rows]) => (
                  <Card key={key} size="small" title={key}>
                    {rows.length ? (
                      <Pie height={160} data={rows} angleField="value" colorField="label" legend={false} />
                    ) : (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    )}
                  </Card>
                ))}
              </Space>
            </Col>
          </Row>
          {renderDrilldownTable(section)}
        </Space>
      );
    }

    if (section === 'learningPath') {
      return (
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          <MetricsGrid metrics={metrics} />
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={14}>
              {data.learningPathFunnel.length ? (
                <Column height={260} data={data.learningPathFunnel} xField="step" yField="count" tooltip={{ title: 'step' }} label={{ text: 'count' }} />
              ) : (
                <Empty description="当前筛选范围暂无学习路径漏斗" />
              )}
            </Col>
            <Col xs={24} lg={10}>
              <Space orientation="vertical" style={{ width: '100%' }}>
                {data.learningPathFunnel.map((item) => (
                  <Flex key={item.step} justify="space-between" align="center">
                    <Typography.Text>{item.step}</Typography.Text>
                    <Space>
                      <Typography.Text strong>{item.count}</Typography.Text>
                      <Tag>{item.previousRate === undefined ? '--' : `${item.previousRate}%`}</Tag>
                    </Space>
                  </Flex>
                ))}
              </Space>
            </Col>
          </Row>
          {renderDrilldownTable(section)}
        </Space>
      );
    }

    if (section === 'content') {
      return (
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          <MetricsGrid metrics={metrics} />
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={8}>
              {data.contentStatusDistribution.length ? (
                <Pie height={240} data={data.contentStatusDistribution} angleField="value" colorField="label" />
              ) : (
                <Empty description="当前筛选范围暂无内容状态数据" />
              )}
            </Col>
            <Col xs={24} lg={16}>
              {data.moduleSnapshots.filter((item) => item.visible && ['content', 'wrongReason'].includes(item.id)).map((item) => (
                <Card key={item.id} size="small" style={{ marginBottom: 12 }}>
                  <Statistic title={item.name} value={item.displayValue} suffix={item.unit} />
                  <Typography.Text type="secondary">{item.description}</Typography.Text>
                </Card>
              ))}
            </Col>
          </Row>
          {renderDrilldownTable(section)}
        </Space>
      );
    }

    if (section === 'wrongReason') {
      return (
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          <MetricsGrid metrics={metrics} />
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={10}>
              {distributions.length ? (
                <Pie height={240} data={distributions} angleField="value" colorField="label" />
              ) : (
                <Empty description="当前筛选范围暂无错因分布" />
              )}
            </Col>
            <Col xs={24} lg={14}>
              <Bar height={240} data={distributions} xField="value" yField="label" label={{ text: 'value' }} />
            </Col>
          </Row>
          {renderDrilldownTable(section)}
        </Space>
      );
    }

    if (section === 'retention') {
      return (
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          <MetricsGrid metrics={metrics} />
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={15}>
              {trends.length ? (
                <Line height={260} data={trends} xField="date" yField="value" colorField="metric" point />
              ) : (
                <Empty description="当前筛选范围暂无留存趋势" />
              )}
            </Col>
            <Col xs={24} lg={9}>
              {distributions.length ? (
                <Pie height={240} data={distributions} angleField="value" colorField="label" />
              ) : (
                <Empty description="当前筛选范围暂无留存分布" />
              )}
            </Col>
          </Row>
          {renderDrilldownTable(section)}
        </Space>
      );
    }

    return (
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <MetricsGrid metrics={metrics} />
        {distributions.length ? (
          <Bar height={260} data={distributions} xField="value" yField="label" colorField="group" label={{ text: 'value' }} />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前分区暂无分布数据" />
        )}
        {renderDrilldownTable(section)}
      </Space>
    );
  };

  if (error?.status === '403') {
    return <Result status="403" title="403" subTitle={error.message} />;
  }

  if (error?.status === '500') {
    return (
      <Result
        status="500"
        title="运营数据加载失败"
        subTitle={error.message}
        extra={<Button onClick={() => loadData(filters)}>重试</Button>}
      />
    );
  }

  return (
    <PageContainer
      title={analyticsEntry.title}
      content={analyticsEntry.description}
      extra={
        canExport ? (
          <Button icon={<DownloadOutlined />} onClick={exportPreview}>
            生成导出预览
          </Button>
        ) : undefined
      }
    >
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Card size="small">
          <Flex wrap="wrap" gap={12} align="center">
            <RangePicker
              allowClear={false}
              value={[dayjs(filters.startDate), dayjs(filters.endDate)] as [Dayjs, Dayjs]}
              presets={[
                { label: '最近 7 天', value: [dayjs().subtract(6, 'day'), dayjs()] },
                { label: '最近 30 天', value: [dayjs().subtract(29, 'day'), dayjs()] },
                { label: '最近 90 天', value: [dayjs().subtract(89, 'day'), dayjs()] },
              ]}
              onChange={(dates) => {
                if (!dates?.[0] || !dates?.[1]) return;
                syncFilters({
                  ...filters,
                  startDate: dates[0].format('YYYY-MM-DD'),
                  endDate: dates[1].format('YYYY-MM-DD'),
                });
              }}
            />
            <Select
              value={filters.examType}
              style={{ width: 120 }}
              options={[
                { label: '全部考试', value: 'all' },
                { label: 'CET4', value: 'CET4' },
                { label: 'CET6', value: 'CET6' },
              ]}
              onChange={(examType) => syncFilters({ ...filters, examType })}
            />
            <Segmented
              value={filters.granularity}
              options={[
                { label: '日', value: 'day' },
                { label: '周', value: 'week' },
                { label: '月', value: 'month' },
              ]}
              onChange={(granularity) =>
                syncFilters({ ...filters, granularity: granularity as API.AnalyticsGranularity })
              }
            />
            <Button icon={<ReloadOutlined />} loading={refreshing} onClick={() => loadData(filters, true)}>
              刷新
            </Button>
            <Button onClick={resetFilters}>重置</Button>
          </Flex>
        </Card>

        {loading ? (
          <Skeleton active paragraph={{ rows: 12 }} />
        ) : data ? (
          <>
            {data.dataQualityIssues.length > 0 ? (
              <Alert
                type={data.dataQualityIssues.some((item) => item.level === 'error') ? 'error' : 'warning'}
                showIcon
                title="数据质量提示"
                description={data.dataQualityIssues.map((item) => item.message).join('；')}
              />
            ) : null}

            <Tabs
              activeKey={activeSection}
              onChange={(key) => switchSection(key as API.AnalyticsVisibleSection)}
              items={availableTabs.map((item) => ({ key: item.key, label: item.label }))}
            />

            {availableTabs.length === 0 ? (
              <Empty description="当前角色暂无可查看的数据分区" />
            ) : (
              <SectionCard section={activeSection} data={data}>
                {renderSectionBody(activeSection)}
              </SectionCard>
            )}

            <Card title="数据来源与口径" size="small">
              <ProTable
                search={false}
                pagination={false}
                options={false}
                rowKey="section"
                dataSource={data.dataSources}
                scroll={{ x: 720 }}
                columns={[
                  {
                    title: '区块',
                    dataIndex: 'section',
                    width: 160,
                    renderText: (value) => sectionTitle[value as API.AnalyticsVisibleSection] ?? value,
                  },
                  { title: '数据来源', dataIndex: 'source', width: 440, ellipsis: true },
                  {
                    title: '指标类型',
                    dataIndex: 'formal',
                    width: 120,
                    render: (_, record) => <Tag color={record.formal ? 'green' : 'default'}>{record.formal ? '正式指标' : '占位指标'}</Tag>,
                  },
                ]}
              />
            </Card>
          </>
        ) : (
          <Empty description="当前筛选范围暂无运营数据" />
        )}
      </Space>
    </PageContainer>
  );
};

export default AnalyticsOverviewPage;
