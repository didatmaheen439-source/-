import {
  CopyOutlined,
  EditOutlined,
  EyeOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useAccess } from '@umijs/max';
import {
  Alert,
  App,
  Button,
  Descriptions,
  Drawer,
  Flex,
  Progress,
  Row,
  Col,
  Segmented,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type React from 'react';
import { useMemo, useRef, useState } from 'react';
import PermissionButton from '@/components/PermissionButton';
import StatusTag from '@/components/StatusTag';
import type {
  AdminModuleKey,
  PermissionAction,
} from '@/foundation/permissions';
import {
  examTypeOptions,
  resultRiskLevelColor,
  resultRiskLevelText,
  resultRiskTypeText,
  sourceTypeText,
  statusValueEnum,
  textEllipsisStyle,
} from '../papers/config';
import type {
  MockExamItemStatistic,
  MockExamResultDetail,
  MockExamResultItem,
  MockExamResultListResponse,
  MockExamResultQueryParams,
  MockExamStatisticsPeriod,
} from '../papers/data';
import {
  createMockExamResultFixDraft,
  mockExamResultDetail,
  mockExamResults,
} from '../papers/service';

const periodOptions: { label: string; value: MockExamStatisticsPeriod }[] = [
  { label: '近 7 天', value: '7d' },
  { label: '近 30 天', value: '30d' },
  { label: '全部', value: 'all' },
];

const riskValueEnum = Object.fromEntries(
  Object.entries(resultRiskTypeText).map(([value, text]) => [
    value,
    { text },
  ]),
);

const completionBandValueEnum = {
  low: { text: '低于 60%' },
  normal: { text: '60%-80%' },
  high: { text: '80% 以上' },
};

const riskTag = (value: MockExamResultItem['riskLevel']) => (
  <Tag color={resultRiskLevelColor[value]}>{resultRiskLevelText[value]}</Tag>
);

const MockExamResultsPage: React.FC = () => {
  const { message } = App.useApp();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [period, setPeriod] = useState<MockExamStatisticsPeriod>('30d');
  const [summary, setSummary] =
    useState<MockExamResultListResponse['summary']>();
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<MockExamResultDetail>();
  const access = useAccess() as {
    canAction?: (
      moduleKey: AdminModuleKey,
      action: PermissionAction,
    ) => boolean;
  };
  const canCreate = Boolean(access.canAction?.('mockExam', 'create'));
  const canEdit = Boolean(access.canAction?.('mockExam', 'edit'));

  const reload = () => actionRef.current?.reload();

  const openDetail = async (record: MockExamResultItem) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(undefined);
    try {
      const response = await mockExamResultDetail(record.paperId, period);
      setDetail(response.data);
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '加载失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleFix = async (record: MockExamResultItem) => {
    if (['draft', 'rejected'].includes(record.status)) {
      history.push(`/mock-exam/papers/${record.paperId}/edit`);
      return;
    }
    try {
      const response = await createMockExamResultFixDraft(record.paperId, {
        reason: '根据模考结果风险创建修正草稿。',
      });
      if (response.data) {
        message.success('已创建修正草稿');
        history.push(`/mock-exam/papers/${response.data.id}/edit`);
      }
    } catch (error: any) {
      message.error(
        error?.data?.errorMessage || error?.message || '创建草稿失败',
      );
    }
  };

  const canFixRecord = (record: MockExamResultItem) => {
    if (['pending_review', 'approved', 'pending_publish'].includes(record.status)) {
      return false;
    }
    if (['draft', 'rejected'].includes(record.status)) return canEdit;
    return canCreate;
  };

  const columns = useMemo<ProColumns<MockExamResultItem>[]>(
    () => [
      {
        title: '试卷',
        dataIndex: 'keyword',
        width: 260,
        render: (_, record) => (
          <Space orientation="vertical" size={0} style={{ width: '100%' }}>
            <Button
              type="link"
              size="small"
              title={record.paperName}
              style={{
                ...textEllipsisStyle,
                height: 22,
                padding: 0,
                textAlign: 'left',
              }}
              onClick={() => openDetail(record)}
            >
              {record.paperName}
            </Button>
            <Typography.Text type="secondary" style={textEllipsisStyle}>
              {record.paperId} / {record.paperVersion}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: '考试类型',
        dataIndex: 'examType',
        width: 110,
        valueEnum: Object.fromEntries(
          examTypeOptions.map((item) => [item.value, { text: item.label }]),
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 110,
        valueEnum: statusValueEnum,
        render: (_, record) => (
          <StatusTag domain="reviewPublish" value={record.status} />
        ),
      },
      {
        title: '风险类型',
        dataIndex: 'riskType',
        hideInTable: true,
        valueEnum: riskValueEnum,
      },
      {
        title: '完成率',
        dataIndex: 'completionBand',
        width: 120,
        valueEnum: completionBandValueEnum,
        render: (_, record) => (
          <Progress
            percent={record.completionRate}
            size="small"
            status={record.completionRate < 60 ? 'exception' : 'normal'}
          />
        ),
      },
      {
        title: '均分',
        dataIndex: 'averageBand',
        width: 120,
        valueEnum: completionBandValueEnum,
        render: (_, record) => `${record.averageScore} / ${record.totalScore}`,
      },
      {
        title: '开始/完成',
        dataIndex: 'startedCount',
        width: 120,
        search: false,
        render: (_, record) => `${record.startedCount} / ${record.completedCount}`,
      },
      {
        title: '薄弱分区',
        dataIndex: 'lowestSectionName',
        width: 150,
        search: false,
        render: (_, record) =>
          `${record.lowestSectionName} ${record.lowestSectionRate}%`,
      },
      {
        title: '风险',
        dataIndex: 'riskLevel',
        width: 190,
        search: false,
        render: (_, record) => (
          <Space wrap size={4}>
            {riskTag(record.riskLevel)}
            {record.riskTypes.slice(0, 2).map((risk) => (
              <Tag key={risk}>{resultRiskTypeText[risk]}</Tag>
            ))}
          </Space>
        ),
      },
      {
        title: '更新时间',
        dataIndex: 'updatedAt',
        width: 170,
        search: false,
      },
      {
        title: '操作',
        valueType: 'option',
        width: 190,
        fixed: 'right',
        render: (_, record) => (
          <Space size={4}>
            <Tooltip title="查看定位">
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => openDetail(record)}
              />
            </Tooltip>
            <PermissionButton
              moduleKey="mockExam"
              action={['draft', 'rejected'].includes(record.status) ? 'edit' : 'create'}
              type="text"
              size="small"
              icon={
                ['draft', 'rejected'].includes(record.status) ? (
                  <EditOutlined />
                ) : (
                  <CopyOutlined />
                )
              }
              disabled={!canFixRecord(record)}
              onClick={() => handleFix(record)}
            >
              修正
            </PermissionButton>
          </Space>
        ),
      },
    ],
    [canCreate, canEdit, period],
  );

  const sectionColumns = [
    { title: '分区', dataIndex: 'sectionName' },
    { title: '平均分', dataIndex: 'averageScore' },
    { title: '满分', dataIndex: 'fullScore' },
    {
      title: '得分率',
      dataIndex: 'averageRate',
      render: (value: number) => (
        <Progress percent={value} size="small" status={value < 55 ? 'exception' : 'normal'} />
      ),
    },
    {
      title: '平均耗时',
      dataIndex: 'averageMinutes',
      render: (value: number) => `${value} 分钟`,
    },
  ];

  const itemColumns = [
    { title: '题目', dataIndex: 'title', width: 260, ellipsis: true },
    { title: '分区', dataIndex: 'sectionName', width: 100 },
    {
      title: '来源',
      dataIndex: 'sourceType',
      width: 110,
      render: (value: MockExamItemStatistic['sourceType']) => sourceTypeText[value],
    },
    {
      title: '得分率',
      dataIndex: 'averageRate',
      width: 140,
      render: (value: number) => (
        <Progress percent={value} size="small" status={value < 45 ? 'exception' : 'normal'} />
      ),
    },
    {
      title: '跳过率',
      dataIndex: 'skipRate',
      width: 110,
      render: (value: number) => `${value}%`,
    },
    {
      title: '原因',
      dataIndex: 'riskReasons',
      render: (value: string[]) => value.join('；') || '-',
    },
  ];

  const timeColumns = [
    { title: '范围', dataIndex: 'targetName' },
    {
      title: '配置时长',
      dataIndex: 'configuredMinutes',
      render: (value: number) => `${value} 分钟`,
    },
    {
      title: '平均耗时',
      dataIndex: 'averageMinutes',
      render: (value: number) => `${value} 分钟`,
    },
    {
      title: '耗时压力',
      dataIndex: 'pressureRate',
      render: (value: number) => (
        <Progress percent={value} size="small" status={value >= 100 ? 'exception' : 'normal'} />
      ),
    },
    { title: '判断', dataIndex: 'message' },
  ];

  return (
    <PageContainer>
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Alert
          showIcon
          type="info"
          title="仅展示聚合 Mock 结果"
          description="本页用于定位试卷、题目和时间配置问题，不返回用户 ID、逐题答案、作文原文或翻译原文。"
        />
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={4}>
            <Statistic title="开始人数" value={summary?.startedCount ?? 0} />
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Statistic title="完成人数" value={summary?.completedCount ?? 0} />
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Statistic
              title="完成率"
              value={summary?.completionRate ?? 0}
              suffix="%"
            />
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Statistic
              title="平均得分率"
              value={summary?.averageScoreRate ?? 0}
              suffix="%"
            />
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Statistic
              title="平均耗时"
              value={summary?.averageMinutes ?? 0}
              suffix="分钟"
            />
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Statistic title="风险试卷" value={summary?.riskPaperCount ?? 0} />
          </Col>
        </Row>
        <ProTable<MockExamResultItem, MockExamResultQueryParams>
          rowKey="paperId"
          actionRef={actionRef}
          columns={columns}
          scroll={{ x: 1320 }}
          search={{ labelWidth: 96 }}
          toolbar={{
            title: '模考结果',
            actions: [
              <Segmented
                key="period"
                value={period}
                options={periodOptions}
                onChange={(value) => {
                  setPeriod(value as MockExamStatisticsPeriod);
                  reload();
                }}
              />,
            ],
          }}
          request={async (params) => {
            const response = await mockExamResults({ ...params, period });
            setSummary(response.summary);
            return {
              data: response.data,
              total: response.total,
              success: response.success,
            };
          }}
          pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        />
      </Space>
      <Drawer
        size="large"
        open={detailOpen}
        title="模考结果定位"
        onClose={() => setDetailOpen(false)}
        extra={
          detail ? (
            <Flex gap={8}>
              <Button onClick={() => history.push(`/mock-exam/papers/${detail.summary.paperId}`)}>
                查看试卷
              </Button>
              <PermissionButton
                moduleKey="mockExam"
                action={
                  ['draft', 'rejected'].includes(detail.summary.status)
                    ? 'edit'
                    : 'create'
                }
                type="primary"
                disabled={!canFixRecord(detail.summary)}
                onClick={() => handleFix(detail.summary)}
              >
                修正配置
              </PermissionButton>
            </Flex>
          ) : null
        }
      >
        {detailLoading ? (
          <Skeleton active />
        ) : detail ? (
          <Space orientation="vertical" size={20} style={{ width: '100%' }}>
            <Descriptions
              bordered
              size="small"
              column={{ xs: 1, sm: 2 }}
              items={[
                { key: 'paper', label: '试卷', children: detail.summary.paperName },
                { key: 'version', label: '版本', children: detail.summary.paperVersion },
                {
                  key: 'status',
                  label: '状态',
                  children: (
                    <StatusTag domain="reviewPublish" value={detail.summary.status} />
                  ),
                },
                {
                  key: 'risk',
                  label: '风险',
                  children: (
                    <Space wrap size={4}>
                      {riskTag(detail.summary.riskLevel)}
                      {detail.summary.riskTypes.map((risk) => (
                        <Tag key={risk}>{resultRiskTypeText[risk]}</Tag>
                      ))}
                    </Space>
                  ),
                },
                {
                  key: 'completion',
                  label: '开始/完成',
                  children: `${detail.summary.startedCount} / ${detail.summary.completedCount}，${detail.summary.completionRate}%`,
                },
                {
                  key: 'score',
                  label: '均分',
                  children: `${detail.summary.averageScore} / ${detail.summary.totalScore}`,
                },
              ]}
            />
            <Space orientation="vertical" size={8} style={{ width: '100%' }}>
              <Typography.Title level={5}>定位建议</Typography.Title>
              {detail.diagnosis.map((item) => (
                <Alert
                  key={item.id}
                  showIcon
                  type={item.riskType ? 'warning' : 'success'}
                  icon={item.riskType ? <WarningOutlined /> : undefined}
                  title={item.title}
                  description={`${item.description} ${item.suggestion}`}
                />
              ))}
            </Space>
            <Space orientation="vertical" size={8} style={{ width: '100%' }}>
              <Typography.Title level={5}>分区表现</Typography.Title>
              <Table
                rowKey="sectionId"
                size="small"
                pagination={false}
                dataSource={detail.statistics.sectionStats}
                columns={sectionColumns}
                scroll={{ x: 760 }}
              />
            </Space>
            <Space orientation="vertical" size={8} style={{ width: '100%' }}>
              <Typography.Title level={5}>题目风险</Typography.Title>
              <Table
                rowKey="itemId"
                size="small"
                dataSource={detail.itemStats.filter((item) => item.riskReasons.length)}
                columns={itemColumns}
                pagination={{ pageSize: 5 }}
                scroll={{ x: 880 }}
              />
            </Space>
            <Space orientation="vertical" size={8} style={{ width: '100%' }}>
              <Typography.Title level={5}>时间配置风险</Typography.Title>
              <Table
                rowKey="targetId"
                size="small"
                dataSource={detail.timeRisks}
                columns={timeColumns}
                pagination={false}
                scroll={{ x: 760 }}
              />
            </Space>
          </Space>
        ) : null}
      </Drawer>
    </PageContainer>
  );
};

export default MockExamResultsPage;
