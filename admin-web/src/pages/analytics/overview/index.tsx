import {
  DownloadOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useModel, useSearchParams } from '@umijs/max';
import { Bar, Column, Line, Pie } from '@ant-design/plots';
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Empty,
  Flex,
  Progress,
  Result,
  Row,
  Col,
  Segmented,
  Select,
  Skeleton,
  Space,
  Statistic,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  analyticsOverview,
  exportAnalyticsOverview,
} from '@/services/ant-design-pro/api';

const { RangePicker } = DatePicker;

const moduleOptions: { label: string; value: API.AnalyticsModule }[] = [
  { label: '全部', value: 'all' },
  { label: '用户', value: 'users' },
  { label: '学习路径', value: 'learningPath' },
  { label: '题库与内容', value: 'content' },
  { label: '审核发布', value: 'reviewRelease' },
  { label: '客服反馈', value: 'feedback' },
  { label: 'AI 陪练', value: 'aiCoach' },
  { label: '写译批改', value: 'writingTranslation' },
  { label: '模考', value: 'mockExam' },
];

const sectionTitle: Record<API.AnalyticsVisibleSection, string> = {
  users: '用户增长与活跃',
  learningPath: '学习路径漏斗',
  content: '题库与内容指标',
  reviewRelease: '审核发布指标',
  feedback: '客服反馈指标',
  aiCoach: 'AI 陪练占位指标',
  writingTranslation: '写译批改占位指标',
  mockExam: '模考表现',
  audit: '风险与审计摘要',
};

const defaultFilters = (): Required<Pick<API.AnalyticsFilterParams, 'startDate' | 'endDate' | 'granularity' | 'module'>> & {
  examType: API.ExamType | 'all';
} => ({
  startDate: dayjs().subtract(29, 'day').format('YYYY-MM-DD'),
  endDate: dayjs().format('YYYY-MM-DD'),
  examType: 'all',
  granularity: 'day',
  module: 'all',
});

const readFilters = (searchParams: URLSearchParams) => {
  const defaults = defaultFilters();
  return {
    startDate: searchParams.get('startDate') || defaults.startDate,
    endDate: searchParams.get('endDate') || defaults.endDate,
    examType: (searchParams.get('examType') || defaults.examType) as API.ExamType | 'all',
    granularity: (searchParams.get('granularity') || defaults.granularity) as API.AnalyticsGranularity,
    module: (searchParams.get('module') || defaults.module) as API.AnalyticsModule,
  };
};

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

const AnalyticsOverviewPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const { initialState } = useModel('@@initialState');
  const canExport = initialState?.currentUser?.actionPermissions?.analytics?.includes('export');
  const [filters, setFilters] = useState(readFilters(searchParams));
  const [data, setData] = useState<API.AnalyticsOverview>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<{ status?: '403' | '500'; message: string }>();

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
    const next = readFilters(searchParams);
    setFilters(next);
    loadData(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  const syncFilters = (next: typeof filters) => {
    setFilters(next);
    setSearchParams(
      Object.fromEntries(
        Object.entries(next).filter(([, value]) => Boolean(value)),
      ),
    );
  };

  const resetFilters = () => {
    syncFilters(defaultFilters());
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

  const visible = (section: API.AnalyticsVisibleSection) =>
    data?.visibleSections.includes(section);

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
      title="运营数据"
      content="汇总用户、学习路径、内容、审核发布和客服反馈数据，辅助内部运营判断。"
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
            <Select
              value={filters.module}
              style={{ width: 160 }}
              options={moduleOptions}
              onChange={(module) => syncFilters({ ...filters, module })}
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

            {data.summaryCards.length === 0 ? (
              <Empty description="当前筛选范围暂无运营数据" />
            ) : (
              <Row gutter={[16, 16]}>
                {data.summaryCards.map((card) => (
                  <Col key={card.id} {...cardSpan}>
                    <MetricCard card={card} />
                  </Col>
                ))}
              </Row>
            )}

            {visible('users') ? (
              <SectionCard section="users" data={data}>
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={16}>
                    {data.userTrend.length ? (
                      <Line
                        height={260}
                        data={data.userTrend}
                        xField="date"
                        yField="value"
                        colorField="metric"
                        point
                        tooltip={{ title: 'date' }}
                      />
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
              </SectionCard>
            ) : null}

            {visible('learningPath') ? (
              <SectionCard section="learningPath" data={data}>
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={14}>
                    {data.learningPathFunnel.length ? (
                      <Column
                        height={260}
                        data={data.learningPathFunnel}
                        xField="step"
                        yField="count"
                        tooltip={{ title: 'step' }}
                        label={{ text: 'count' }}
                      />
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
                      {data.learningPathMetrics.map((card) => (
                        <MetricCard key={card.id} card={card} />
                      ))}
                    </Space>
                  </Col>
                </Row>
              </SectionCard>
            ) : null}

            {visible('content') ? (
              <SectionCard section="content" data={data}>
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={8}>
                    {data.contentStatusDistribution.length ? (
                      <Pie height={240} data={data.contentStatusDistribution} angleField="value" colorField="label" />
                    ) : (
                      <Empty description="当前筛选范围暂无内容状态数据" />
                    )}
                  </Col>
                  <Col xs={24} lg={16}>
                    <Row gutter={[12, 12]}>
                      {data.contentMetrics.map((card) => (
                        <Col key={card.id} xs={24} md={12}>
                          <MetricCard card={card} />
                        </Col>
                      ))}
                    </Row>
                  </Col>
                </Row>
              </SectionCard>
            ) : null}

            {visible('reviewRelease') ? (
              <SectionCard section="reviewRelease" data={data}>
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={14}>
                    <ProTable
                      search={false}
                      pagination={false}
                      options={false}
                      rowKey="label"
                      dataSource={[
                        { label: '当前待审核', value: data.reviewReleaseStats?.pendingReview },
                        { label: '区间已通过', value: data.reviewReleaseStats?.approved },
                        { label: '区间已驳回', value: data.reviewReleaseStats?.rejected },
                        { label: '当前待发布', value: data.reviewReleaseStats?.pendingRelease },
                        { label: '区间已发布', value: data.reviewReleaseStats?.published },
                        { label: '区间已下架', value: data.reviewReleaseStats?.offline },
                        { label: '区间已回滚', value: data.reviewReleaseStats?.rolledBack },
                        { label: '区间发布失败', value: data.reviewReleaseStats?.publishFailed },
                        { label: '区间回滚失败', value: data.reviewReleaseStats?.rollbackFailed },
                      ]}
                      columns={[
                        { title: '指标', dataIndex: 'label' },
                        { title: '值', dataIndex: 'value', renderText: (value) => value ?? '--' },
                      ]}
                    />
                  </Col>
                  <Col xs={24} lg={10}>
                    <Space orientation="vertical" style={{ width: '100%' }}>
                      <Statistic title="平均审核时长" value={data.reviewReleaseStats?.averageReviewMinutes ?? '--'} suffix="分钟" />
                      <Statistic title="最长待审核时长" value={data.reviewReleaseStats?.longestPendingReviewHours ?? '--'} suffix="小时" />
                      {data.reviewRiskItems.map((item) => (
                        <Flex key={item.label} justify="space-between">
                          <Typography.Text>{item.label}</Typography.Text>
                          <Tag color={item.value > 0 ? 'error' : 'success'}>{item.value}</Tag>
                        </Flex>
                      ))}
                    </Space>
                  </Col>
                </Row>
              </SectionCard>
            ) : null}

            {visible('feedback') ? (
              <SectionCard section="feedback" data={data}>
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={12}>
                    <Bar
                      height={240}
                      data={data.feedbackDistributions.status ?? []}
                      xField="value"
                      yField="label"
                      label={{ text: 'value' }}
                    />
                  </Col>
                  <Col xs={24} lg={12}>
                    <Row gutter={[12, 12]}>
                      {[
                        ['区间新增反馈', data.feedbackStats?.newFeedback, '条'],
                        ['当前待处理', data.feedbackStats?.pending, '条'],
                        ['当前处理中', data.feedbackStats?.processing, '条'],
                        ['反馈关闭率', data.feedbackStats?.closeRate === undefined ? '--' : `${data.feedbackStats.closeRate}%`, ''],
                        ['平均处理时长', data.feedbackStats?.averageHandleHours === undefined ? '--' : data.feedbackStats.averageHandleHours, '小时'],
                        ['P0 反馈', data.feedbackStats?.p0Feedback, '条'],
                      ].map(([title, value, suffix]) => (
                        <Col key={String(title)} xs={24} md={12}>
                          <Card size="small">
                            <Statistic title={title} value={value ?? '--'} suffix={suffix} />
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </Col>
                </Row>
              </SectionCard>
            ) : null}

            {visible('mockExam') ? (
              <SectionCard section="mockExam" data={data}>
                {data.moduleSnapshots
                  .filter((item) => item.id === 'mockExam' && item.visible)
                  .map((item) => (
                    <Flex
                      key={item.id}
                      justify="space-between"
                      align="center"
                      gap={16}
                      wrap
                    >
                      <Space orientation="vertical" size={2}>
                        <Statistic
                          title={item.name}
                          value={item.displayValue}
                          suffix={item.unit}
                        />
                        <Typography.Text type="secondary">
                          {item.description}
                        </Typography.Text>
                      </Space>
                      <Button
                        type="link"
                        onClick={() => history.push(item.jumpTo || '/mock-exam/papers')}
                      >
                        查看模考试卷
                      </Button>
                    </Flex>
                  ))}
              </SectionCard>
            ) : null}

            {['aiCoach', 'writingTranslation'].some((section) =>
              visible(section as API.AnalyticsVisibleSection),
            ) ? (
              <SectionCard section="aiCoach" data={data}>
                <Row gutter={[16, 16]}>
                  {data.moduleSnapshots
                    .filter((item) => item.status === 'placeholder' && item.visible)
                    .map((item) => (
                      <Col key={item.id} xs={24} md={8}>
                        <Card size="small">
                          <Space orientation="vertical">
                            <Tag color="default">基础占位指标</Tag>
                            <Statistic title={item.name} value={item.displayValue} suffix={item.unit} />
                            <Typography.Text type="secondary">{item.description}</Typography.Text>
                            <Progress percent={item.id === 'mockExam' ? 61 : item.id === 'aiCoach' ? 8.1 : 38} size="small" />
                          </Space>
                        </Card>
                      </Col>
                    ))}
                </Row>
              </SectionCard>
            ) : null}

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
