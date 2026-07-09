import {
  ArrowLeftOutlined,
  CopyOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useAccess, useParams, useSearchParams } from '@umijs/max';
import {
  Alert,
  App,
  Button,
  Collapse,
  Descriptions,
  Flex,
  Progress,
  Result,
  Segmented,
  Skeleton,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import StatusTag from '@/components/StatusTag';
import type {
  AdminModuleKey,
  PermissionAction,
} from '@/foundation/permissions';
import type {
  MockExamPaper,
  MockExamPaperItemSnapshot,
  MockExamStatistics,
  MockExamStatisticsPeriod,
  MockExamVersionDiff,
} from '../data';
import {
  copyMockExamPaper,
  mockExamPaperDetail,
  mockExamPaperStatistics,
  mockExamPaperVersionDiff,
} from '../service';
import {
  editableStatuses,
  precheckLevelColor,
  precheckLevelText,
  sourceTypeText,
} from '../config';

const MockExamPaperDetailPage: React.FC = () => {
  const { id } = useParams();
  const { message } = App.useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [paper, setPaper] = useState<MockExamPaper>();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<MockExamStatisticsPeriod>('30d');
  const [statistics, setStatistics] = useState<MockExamStatistics>();
  const [versionDiff, setVersionDiff] = useState<MockExamVersionDiff>();
  const activeTab = searchParams.get('tab') || 'overview';
  const access = useAccess() as {
    canAction?: (
      moduleKey: AdminModuleKey,
      action: PermissionAction,
    ) => boolean;
  };
  const canCreate = Boolean(access.canAction?.('mockExam', 'create'));
  const canEdit = Boolean(access.canAction?.('mockExam', 'edit'));

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await mockExamPaperDetail(String(id));
        setPaper(response.data);
      } catch {
        setPaper(undefined);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    if (!paper || activeTab !== 'statistics') return;
    mockExamPaperStatistics(paper.id, period)
      .then((response) => setStatistics(response.data))
      .catch(() => setStatistics(undefined));
  }, [activeTab, paper, period]);

  useEffect(() => {
    if (!paper || activeTab !== 'versions') return;
    mockExamPaperVersionDiff(paper.id)
      .then((response) => setVersionDiff(response.data))
      .catch(() => setVersionDiff(undefined));
  }, [activeTab, paper]);

  const copyDraft = async () => {
    if (!paper) return;
    try {
      const response = await copyMockExamPaper(paper.id);
      if (response.data) {
        message.success('已创建新草稿');
        history.push(`/mock-exam/papers/${response.data.id}/edit`);
      }
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '复制失败');
    }
  };

  const itemColumns = useMemo(
    () => [
      { title: '顺序', dataIndex: 'order', width: 70 },
      {
        title: '题目',
        dataIndex: 'title',
        width: 280,
        ellipsis: true,
      },
      {
        title: '来源',
        dataIndex: 'sourceType',
        width: 120,
        render: (value: MockExamPaperItemSnapshot['sourceType']) =>
          sourceTypeText[value],
      },
      { title: '锁定版本', dataIndex: 'sourceVersion', width: 100 },
      { title: '分值', dataIndex: 'score', width: 90 },
    ],
    [],
  );

  if (loading) {
    return (
      <PageContainer>
        <Skeleton active />
      </PageContainer>
    );
  }

  if (!paper) {
    return (
      <PageContainer>
        <Result
          status="404"
          title="模考试卷不存在或无权访问"
          extra={
            <Button onClick={() => history.push('/mock-exam/papers')}>
              返回试卷列表
            </Button>
          }
        />
      </PageContainer>
    );
  }

  const structurePanels = paper.sections.map((section) => ({
    key: section.id,
    label: `${section.order}. ${section.name}，${section.score} 分，${section.durationMinutes} 分钟`,
    children: (
      <Space orientation="vertical" size={12} style={{ width: '100%' }}>
        <Typography.Text type="secondary">
          {section.instructions || '无分区说明'}
        </Typography.Text>
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={section.items}
          columns={itemColumns}
          scroll={{ x: 760 }}
        />
      </Space>
    ),
  }));

  const answerPanels = paper.sections.map((section) => ({
    key: section.id,
    label: `${section.order}. ${section.name}`,
    children: (
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        {section.items.map((item) => (
          <div key={item.id}>
            <Flex justify="space-between" gap={16}>
              <Typography.Text strong>
                {item.order}. {item.title}
              </Typography.Text>
              <Tag>{item.sourceVersion}</Tag>
            </Flex>
            <Typography.Paragraph style={{ marginTop: 8 }}>
              {item.stem || '无题干摘要'}
            </Typography.Paragraph>
            {item.options?.length ? (
              <Space orientation="vertical" size={2}>
                {item.options.map((option) => (
                  <Typography.Text key={option.key}>
                    {option.key}. {option.content}
                  </Typography.Text>
                ))}
              </Space>
            ) : null}
            <Descriptions
              size="small"
              column={1}
              style={{ marginTop: 8 }}
              items={[
                {
                  key: 'answer',
                  label: '参考答案',
                  children: item.answer || item.referenceAnswer || '-',
                },
                {
                  key: 'analysis',
                  label: '解析/参考要点',
                  children:
                    item.analysis ||
                    item.referencePoints?.join('；') ||
                    '-',
                },
              ]}
            />
          </div>
        ))}
      </Space>
    ),
  }));

  const tabs = [
    {
      key: 'overview',
      label: '基础信息',
      children: (
        <Descriptions
          bordered
          size="small"
          column={{ xs: 1, sm: 2, lg: 3 }}
          items={[
            { key: 'id', label: '试卷 ID', children: paper.id },
            { key: 'examType', label: '考试类型', children: paper.examType },
            {
              key: 'status',
              label: '状态',
              children: (
                <StatusTag domain="reviewPublish" value={paper.status} />
              ),
            },
            { key: 'version', label: '版本', children: paper.version },
            {
              key: 'score',
              label: '总分',
              children: paper.totalScore,
            },
            {
              key: 'minutes',
              label: '总时长',
              children: `${paper.totalMinutes} 分钟`,
            },
            {
              key: 'structure',
              label: '试卷结构',
              children: `${paper.sections.length} 分区 / ${paper.sections.reduce(
                (sum, section) => sum + section.items.length,
                0,
              )} 题`,
            },
            {
              key: 'creator',
              label: '创建人',
              children: paper.creator,
            },
            {
              key: 'updatedAt',
              label: '更新时间',
              children: paper.updatedAt,
            },
            {
              key: 'description',
              label: '试卷说明',
              children: paper.description || '-',
              span: 3,
            },
            {
              key: 'instructions',
              label: '考试说明',
              children: paper.instructions || '-',
              span: 3,
            },
            {
              key: 'impactScope',
              label: '影响范围',
              children: paper.impactScope || '-',
              span: 3,
            },
          ]}
        />
      ),
    },
    {
      key: 'structure',
      label: '试卷结构',
      children: <Collapse items={structurePanels} defaultActiveKey={[paper.sections[0]?.id]} />,
    },
    {
      key: 'answers',
      label: '参考答案',
      children: <Collapse items={answerPanels} />,
    },
    {
      key: 'statistics',
      label: '结果统计',
      children: statistics ? (
        <Space orientation="vertical" size={20} style={{ width: '100%' }}>
          <Segmented
            value={period}
            options={[
              { label: '近 7 天', value: '7d' },
              { label: '近 30 天', value: '30d' },
              { label: '全部', value: 'all' },
            ]}
            onChange={(value) =>
              setPeriod(value as MockExamStatisticsPeriod)
            }
          />
          <Descriptions
            bordered
            size="small"
            column={{ xs: 1, sm: 2, lg: 4 }}
            items={[
              {
                key: 'started',
                label: '开始人数',
                children: statistics.startedCount,
              },
              {
                key: 'completed',
                label: '完成人数',
                children: statistics.completedCount,
              },
              {
                key: 'completion',
                label: '完成率',
                children: `${statistics.completionRate}%`,
              },
              {
                key: 'averageScore',
                label: '平均分',
                children: `${statistics.averageScore} / ${statistics.totalScore}`,
              },
              {
                key: 'averageMinutes',
                label: '平均耗时',
                children: `${statistics.averageMinutes} 分钟`,
              },
              {
                key: 'privacy',
                label: '数据范围',
                children: '仅聚合 Mock，无用户答案',
              },
            ]}
          />
          <Table
            rowKey="sectionId"
            size="small"
            pagination={false}
            dataSource={statistics.sectionStats}
            columns={[
              { title: '分区', dataIndex: 'sectionName' },
              { title: '平均分', dataIndex: 'averageScore' },
              { title: '满分', dataIndex: 'fullScore' },
              {
                title: '平均得分率',
                dataIndex: 'averageRate',
                render: (value) => (
                  <Progress percent={value} size="small" />
                ),
              },
              {
                title: '平均耗时',
                dataIndex: 'averageMinutes',
                render: (value) => `${value} 分钟`,
              },
            ]}
            scroll={{ x: 760 }}
          />
        </Space>
      ) : (
        <Skeleton active />
      ),
    },
    {
      key: 'validation',
      label: '校验结果',
      children: paper.lastPrecheck ? (
        <Alert
          showIcon
          type={
            paper.lastPrecheck.level === 'error'
              ? 'error'
              : paper.lastPrecheck.level === 'warning'
                ? 'warning'
                : 'success'
          }
          title={`预校验${precheckLevelText[paper.lastPrecheck.level]}`}
          description={
            <Space orientation="vertical" size={8}>
              <Typography.Text>
                {paper.lastPrecheck.summary}
              </Typography.Text>
              {paper.lastPrecheck.issues.map((item) => (
                <Tag key={item.id} color={precheckLevelColor[item.level]}>
                  {item.code}：{item.message}
                </Tag>
              ))}
            </Space>
          }
        />
      ) : (
        <Alert type="info" showIcon title="尚未执行预校验" />
      ),
    },
    {
      key: 'versions',
      label: '版本记录',
      children: (
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={paper.versionRecords}
            columns={[
              { title: '版本', dataIndex: 'version', width: 100 },
              {
                title: '状态',
                dataIndex: 'status',
                width: 110,
                render: (value) => (
                  <StatusTag domain="reviewPublish" value={value} />
                ),
              },
              { title: '变更说明', dataIndex: 'changeSummary' },
              { title: '操作人', dataIndex: 'createdBy', width: 120 },
              { title: '时间', dataIndex: 'createdAt', width: 170 },
            ]}
            scroll={{ x: 850 }}
          />
          {versionDiff ? (
            <>
              <Typography.Title level={5}>
                {versionDiff.fromVersion} 与 {versionDiff.toVersion} 差异
              </Typography.Title>
              <Table
                rowKey="field"
                size="small"
                pagination={false}
                dataSource={versionDiff.items}
                columns={[
                  { title: '字段', dataIndex: 'field', width: 160 },
                  { title: '变更前', dataIndex: 'before' },
                  { title: '变更后', dataIndex: 'after' },
                  {
                    title: '是否变化',
                    dataIndex: 'changed',
                    width: 100,
                    render: (value) => (
                      <Tag color={value ? 'warning' : 'default'}>
                        {value ? '是' : '否'}
                      </Tag>
                    ),
                  },
                ]}
              />
            </>
          ) : null}
        </Space>
      ),
    },
    {
      key: 'operations',
      label: '操作记录',
      children: (
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={paper.operationRecords}
          columns={[
            { title: '时间', dataIndex: 'time', width: 170 },
            { title: '操作人', dataIndex: 'operator', width: 120 },
            { title: '角色', dataIndex: 'roleName', width: 120 },
            { title: '动作', dataIndex: 'action', width: 120 },
            { title: '原因', dataIndex: 'reason' },
          ]}
          scroll={{ x: 820 }}
        />
      ),
    },
  ];

  return (
    <PageContainer
      title={paper.name}
      tags={<StatusTag domain="reviewPublish" value={paper.status} />}
      extra={[
        <Button
          key="back"
          icon={<ArrowLeftOutlined />}
          onClick={() => history.push('/mock-exam/papers')}
        >
          返回列表
        </Button>,
        canEdit && editableStatuses.includes(paper.status) ? (
          <Button
            key="edit"
            type="primary"
            icon={<EditOutlined />}
            onClick={() => history.push(`/mock-exam/papers/${paper.id}/edit`)}
          >
            编辑试卷
          </Button>
        ) : null,
        canCreate && !editableStatuses.includes(paper.status) ? (
          <Button
            key="copy"
            type="primary"
            icon={<CopyOutlined />}
            onClick={copyDraft}
          >
            复制新草稿
          </Button>
        ) : null,
      ].filter(Boolean)}
    >
      <Tabs
        activeKey={activeTab}
        onChange={(tab) => setSearchParams({ tab })}
        items={tabs}
      />
    </PageContainer>
  );
};

export default MockExamPaperDetailPage;
