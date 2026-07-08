import {
  ArrowLeftOutlined,
  CopyOutlined,
  EditOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
} from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useAccess, useParams } from '@umijs/max';
import {
  Alert,
  App,
  Button,
  Descriptions,
  Empty,
  Modal,
  Result,
  Skeleton,
  Space,
  Tabs,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import StatusTag from '@/components/StatusTag';
import type { AdminModuleKey, PermissionAction } from '@/foundation/permissions';
import {
  copyWritingTranslationTopic,
  precheckExistingWritingTranslationTopic,
  submitWritingTranslationReview,
  validateExistingWritingTranslationSamples,
  writingTranslationTopicDetail,
  writingTranslationTopicVersionDiff,
} from '@/services/ant-design-pro/api';
import {
  difficultyText,
  editableStatuses,
  precheckLevelColor,
  precheckLevelText,
  riskLevelColor,
  riskLevelText,
  topicTypeText,
} from '../config';

const listText = (items?: string[]) => (items?.length ? items.join('、') : '-');

const WritingTranslationTopicDetailPage: React.FC = () => {
  const { id = '' } = useParams();
  const { message, modal } = App.useApp();
  const access = useAccess() as {
    canAction?: (
      moduleKey: AdminModuleKey,
      targetAction: PermissionAction,
    ) => boolean;
  };
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState<API.WritingTranslationTopic>();

  const canCreate = Boolean(access.canAction?.('writingTranslation', 'create'));
  const canEdit = Boolean(access.canAction?.('writingTranslation', 'edit'));
  const canSubmit = Boolean(access.canAction?.('writingTranslation', 'submit'));
  const isEditable = topic ? editableStatuses.includes(topic.status) : false;

  const load = async () => {
    setLoading(true);
    try {
      const response = await writingTranslationTopicDetail(id);
      setTopic(response.data);
    } catch {
      setTopic(undefined);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const runPrecheck = async () => {
    if (!topic) return;
    try {
      const response = await precheckExistingWritingTranslationTopic(topic.id);
      const result = response.data;
      if (!result) return;
      Modal.info({
        title: `预校验${precheckLevelText[result.level]}`,
        width: 720,
        content: (
          <Space orientation="vertical" size={8}>
            <Typography.Text>{result.summary}</Typography.Text>
            {result.issues.map((item) => (
              <Tag key={item.id} color={precheckLevelColor[item.level]}>
                {item.code} / {item.field}：{item.message}
              </Tag>
            ))}
          </Space>
        ),
      });
      load();
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '预校验失败');
    }
  };

  const runSampleValidation = async () => {
    if (!topic) return;
    try {
      const response = await validateExistingWritingTranslationSamples(topic.id);
      const result = response.data;
      if (!result) return;
      Modal.info({
        title: '静态样例校验',
        width: 720,
        content: (
          <Space orientation="vertical" size={8}>
            <Typography.Text>{result.summary}</Typography.Text>
            {result.cases.map((item) => (
              <Tag key={item.id} color={precheckLevelColor[item.result ?? 'passed']}>
                {item.title}：{item.message}
              </Tag>
            ))}
          </Space>
        ),
      });
      load();
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '样例校验失败');
    }
  };

  const submitReview = async (confirmWarnings = false) => {
    if (!topic) return;
    try {
      await submitWritingTranslationReview(topic.id, {
        changeSummary: topic.changeSummary,
        dataVersion: topic.dataVersion,
        confirmWarnings,
      });
      message.success('已提交审核');
      load();
    } catch (error: any) {
      const precheck = error?.data?.data as
        | API.WritingTranslationPrecheckResult
        | undefined;
      if (precheck?.level === 'warning') {
        modal.confirm({
          title: '预校验存在警告，确认提交审核？',
          content: precheck.summary,
          okText: '确认提交',
          cancelText: '取消',
          onOk: () => submitReview(true),
        });
        return;
      }
      message.error(error?.data?.errorMessage || error?.message || '提交失败');
    }
  };

  const copyDraft = async () => {
    if (!topic) return;
    try {
      const response = await copyWritingTranslationTopic(topic.id);
      if (response.data) {
        message.success('已创建新草稿版本');
        history.push(`/writing-translation/topics/${response.data.id}/edit`);
      }
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '创建草稿失败');
    }
  };

  const showDiff = async (snapshot: API.WritingTranslationTopicVersion, index: number) => {
    if (!topic) return;
    const next = topic.versionRecords[index - 1] ?? topic.versionRecords[0];
    const response = await writingTranslationTopicVersionDiff(topic.id, {
      fromVersion: snapshot.version,
      toVersion: next.version,
    });
    const diff = response.data;
    if (!diff) return;
    Modal.info({
      title: `版本差异 ${diff.fromVersion} -> ${diff.toVersion}`,
      width: 820,
      content: (
        <ProTable<API.WritingTranslationVersionDiffItem>
          rowKey="field"
          search={false}
          pagination={false}
          options={false}
          dataSource={diff.items}
          columns={[
            { title: '字段', dataIndex: 'field', width: 130 },
            { title: '变更前', dataIndex: 'before', ellipsis: true },
            { title: '变更后', dataIndex: 'after', ellipsis: true },
            {
              title: '变化',
              dataIndex: 'changed',
              width: 90,
              render: (_, record) =>
                record.changed ? <Tag color="blue">已变化</Tag> : <Tag>无变化</Tag>,
            },
          ]}
        />
      ),
    });
  };

  const scoringColumns = useMemo<ProColumns<API.ScoringDimension>[]>(
    () => [
      { title: '顺序', dataIndex: 'order', width: 70 },
      { title: 'Key', dataIndex: 'key', width: 120 },
      { title: '名称', dataIndex: 'name', width: 140 },
      { title: '权重', dataIndex: 'weight', width: 90, render: (_, record) => `${record.weight}%` },
      { title: '最高分', dataIndex: 'maxScore', width: 90 },
      { title: '说明', dataIndex: 'description', ellipsis: true },
      {
        title: '分档',
        dataIndex: 'bandNotes',
        width: 220,
        render: (_, record) => (
          <Space wrap size={[4, 4]}>
            {record.bandNotes.map((band) => (
              <Tag key={band.name}>
                {band.name} {band.minScore}-{band.maxScore}
              </Tag>
            ))}
          </Space>
        ),
      },
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

  if (!topic) {
    return (
      <PageContainer>
        <Result
          status="404"
          title="写译题目不存在"
          extra={<Button onClick={() => history.push('/writing-translation/topics')}>返回列表</Button>}
        />
      </PageContainer>
    );
  }

  const aiInvalid = topic.lastPrecheck?.issues.some((item) => item.code.startsWith('AI_REFERENCE'));

  const versionColumns: ProColumns<API.WritingTranslationTopicVersion>[] = [
    { title: '版本', dataIndex: 'version', width: 90 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (_, record) => <StatusTag domain="reviewPublish" value={record.status} />,
    },
    { title: '变更说明', dataIndex: 'changeSummary', ellipsis: true },
    {
      title: '线上版本',
      dataIndex: 'currentOnline',
      width: 100,
      render: (_, record) => (record.currentOnline ? <Tag color="green">线上</Tag> : <Tag>历史</Tag>),
    },
    { title: '创建人', dataIndex: 'createdBy', width: 120 },
    { title: '时间', dataIndex: 'createdAt', width: 170 },
    {
      title: '操作',
      valueType: 'option',
      width: 110,
      render: (_, record, index) => (
        <Button type="link" size="small" onClick={() => showDiff(record, index)}>
          查看差异
        </Button>
      ),
    },
  ];

  return (
    <PageContainer
      title={topic.name}
      extra={[
        <Button key="back" icon={<ArrowLeftOutlined />} onClick={() => history.back()}>
          返回
        </Button>,
        canEdit && isEditable ? (
          <Button
            key="edit"
            icon={<EditOutlined />}
            onClick={() => history.push(`/writing-translation/topics/${topic.id}/edit`)}
          >
            编辑
          </Button>
        ) : null,
        canCreate && topic.status === 'published' ? (
          <Button key="copy" icon={<CopyOutlined />} onClick={copyDraft}>
            创建新草稿
          </Button>
        ) : null,
        <Button key="precheck" icon={<SafetyCertificateOutlined />} onClick={runPrecheck}>
          预校验
        </Button>,
        <Button key="validate" onClick={runSampleValidation}>
          样例校验
        </Button>,
        canSubmit && isEditable ? (
          <Button key="submit" type="primary" icon={<SendOutlined />} onClick={() => submitReview()}>
            提交审核
          </Button>
        ) : null,
      ]}
    >
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        {aiInvalid ? (
          <Alert
            type="error"
            showIcon
            message="AI 策略引用存在风险"
            description="已发布题目不会自动下架，但新版本提交和发布前复验会阻止失效引用继续发布。"
          />
        ) : null}
        <Descriptions bordered column={3} size="small">
          <Descriptions.Item label="题目 ID">{topic.id}</Descriptions.Item>
          <Descriptions.Item label="题目类型">{topicTypeText[topic.topicType]}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <StatusTag domain="reviewPublish" value={topic.status} />
          </Descriptions.Item>
          <Descriptions.Item label="考试类型">{topic.examType}</Descriptions.Item>
          <Descriptions.Item label="难度">{difficultyText[topic.difficulty]}</Descriptions.Item>
          <Descriptions.Item label="风险">
            <Tag color={riskLevelColor[topic.riskLevel]}>
              {riskLevelText[topic.riskLevel]}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="版本">{topic.version}</Descriptions.Item>
          <Descriptions.Item label="dataVersion">{topic.dataVersion}</Descriptions.Item>
          <Descriptions.Item label="更新人">{topic.updatedBy}</Descriptions.Item>
          <Descriptions.Item label="更新时间">{topic.updatedAt}</Descriptions.Item>
          <Descriptions.Item label="审核任务">{topic.reviewTaskId ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="线上版本">{topic.releaseVersionId ?? '-'}</Descriptions.Item>
        </Descriptions>

        <Tabs
          items={[
            {
              key: 'content',
              label: '题目内容',
              children: (
                <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                  {topic.topicType === 'writing' ? (
                    <Descriptions bordered column={2} size="small">
                      <Descriptions.Item label="题干" span={2}>
                        {topic.prompt}
                      </Descriptions.Item>
                      <Descriptions.Item label="话题方向">{topic.topicDirection}</Descriptions.Item>
                      <Descriptions.Item label="体裁">{topic.genre}</Descriptions.Item>
                      <Descriptions.Item label="字数范围">{topic.minWords}-{topic.maxWords}</Descriptions.Item>
                      <Descriptions.Item label="建议时间">{topic.suggestedMinutes} 分钟</Descriptions.Item>
                      <Descriptions.Item label="写作要求" span={2}>{listText(topic.writingRequirements)}</Descriptions.Item>
                      <Descriptions.Item label="提纲要点" span={2}>{listText(topic.outlinePoints)}</Descriptions.Item>
                      <Descriptions.Item label="范文摘要" span={2}>{topic.sampleAnswerSummary ?? '-'}</Descriptions.Item>
                    </Descriptions>
                  ) : (
                    <Descriptions bordered column={2} size="small">
                      <Descriptions.Item label="中文原文" span={2}>{topic.sourceText}</Descriptions.Item>
                      <Descriptions.Item label="参考译文" span={2}>{topic.referenceTranslation || '-'}</Descriptions.Item>
                      <Descriptions.Item label="翻译方向">{topic.translationDirection}</Descriptions.Item>
                      <Descriptions.Item label="建议时间">{topic.suggestedMinutes} 分钟</Descriptions.Item>
                      <Descriptions.Item label="关键词" span={2}>{listText(topic.keywords)}</Descriptions.Item>
                      <Descriptions.Item label="固定表达" span={2}>{listText(topic.fixedExpressions)}</Descriptions.Item>
                      <Descriptions.Item label="可接受表达" span={2}>{listText(topic.acceptableExpressions)}</Descriptions.Item>
                      <Descriptions.Item label="常见误译" span={2}>{listText(topic.commonMistranslations)}</Descriptions.Item>
                    </Descriptions>
                  )}
                  <Descriptions bordered column={1} size="small">
                    <Descriptions.Item label="参考要点">{listText(topic.referencePoints)}</Descriptions.Item>
                    <Descriptions.Item label="变更说明">{topic.changeSummary}</Descriptions.Item>
                    <Descriptions.Item label="内部备注">{topic.internalRemark ?? '-'}</Descriptions.Item>
                  </Descriptions>
                </Space>
              ),
            },
            {
              key: 'scoring',
              label: '评分维度',
              children: (
                <ProTable<API.ScoringDimension>
                  rowKey="key"
                  search={false}
                  pagination={false}
                  options={false}
                  dataSource={topic.scoringDimensions}
                  columns={scoringColumns}
                />
              ),
            },
            {
              key: 'rules',
              label: '批改规则',
              children: (
                <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                  <Descriptions bordered column={2} size="small">
                    <Descriptions.Item label="反馈结构">{listText(topic.correctionRule.feedbackStructure)}</Descriptions.Item>
                    <Descriptions.Item label="人工复核">{listText(topic.correctionRule.manualReviewConditions)}</Descriptions.Item>
                    <Descriptions.Item label="总分规则" span={2}>{topic.correctionRule.overallScoringGuide}</Descriptions.Item>
                    <Descriptions.Item label="偏题规则" span={2}>{topic.correctionRule.offTopicRule || '-'}</Descriptions.Item>
                    <Descriptions.Item label="空白答案" span={2}>{topic.correctionRule.blankAnswerRule || '-'}</Descriptions.Item>
                    <Descriptions.Item label="兜底规则" span={2}>{topic.correctionRule.fallbackMessage}</Descriptions.Item>
                  </Descriptions>
                  <ProTable<API.CorrectionErrorRule>
                    rowKey="code"
                    search={false}
                    pagination={false}
                    options={false}
                    dataSource={topic.correctionRule.deductionRules}
                    columns={[
                      { title: '编码', dataIndex: 'code', width: 150 },
                      { title: '名称', dataIndex: 'name', width: 140 },
                      { title: '严重级别', dataIndex: 'severity', width: 100 },
                      { title: '维度', dataIndex: 'dimensionKey', width: 120 },
                      { title: '建议扣分', dataIndex: 'suggestedDeduction', width: 100 },
                      { title: '扣分上限', dataIndex: 'maxDeduction', width: 100 },
                      { title: '说明', dataIndex: 'description', ellipsis: true },
                    ]}
                  />
                </Space>
              ),
            },
            {
              key: 'ai',
              label: 'AI 策略关联',
              children: topic.aiStrategyRefs.length ? (
                <ProTable<API.WritingTranslationAiStrategyReference>
                  rowKey={(record) => `${record.strategyId}-${record.usage}`}
                  search={false}
                  pagination={false}
                  options={false}
                  dataSource={topic.aiStrategyRefs}
                  columns={[
                    { title: '策略 ID', dataIndex: 'strategyId', width: 220, ellipsis: true },
                    { title: '策略名称', dataIndex: 'strategyTitle', ellipsis: true },
                    { title: '版本', dataIndex: 'strategyVersion', width: 100 },
                    { title: '类型', dataIndex: 'configType', width: 150 },
                    { title: '场景', dataIndex: 'businessScene', width: 160 },
                    { title: '用途', dataIndex: 'usage', width: 140 },
                    { title: '绑定状态', dataIndex: 'statusAtBinding', width: 130, render: (_, record) => <StatusTag domain="reviewPublish" value={record.statusAtBinding} /> },
                    { title: '绑定时间', dataIndex: 'boundAt', width: 170 },
                  ]}
                />
              ) : (
                <Empty description="未关联 AI 批改策略" />
              ),
            },
            {
              key: 'validation',
              label: '校验记录',
              children: (
                <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                  {topic.lastPrecheck ? (
                    <Alert
                      type={topic.lastPrecheck.level === 'error' ? 'error' : topic.lastPrecheck.level === 'warning' ? 'warning' : 'success'}
                      showIcon
                      message={`预校验${precheckLevelText[topic.lastPrecheck.level]}`}
                      description={
                        <Space wrap>
                          {topic.lastPrecheck.issues.map((item) => (
                            <Tag key={item.id} color={precheckLevelColor[item.level]}>
                              {item.code}：{item.message}
                            </Tag>
                          ))}
                        </Space>
                      }
                    />
                  ) : null}
                  {topic.lastValidation ? (
                    <ProTable<API.WritingTranslationValidationCase>
                      rowKey="id"
                      search={false}
                      pagination={false}
                      options={false}
                      dataSource={topic.lastValidation.cases}
                      columns={[
                        { title: '样例', dataIndex: 'title', width: 160 },
                        { title: '输入摘要', dataIndex: 'inputSummary', ellipsis: true },
                        { title: '期望规则', dataIndex: 'expectedRule', width: 160 },
                        { title: '结果', dataIndex: 'result', width: 100, render: (_, record) => <Tag color={precheckLevelColor[record.result ?? 'passed']}>{record.result ?? 'passed'}</Tag> },
                        { title: '说明', dataIndex: 'message', ellipsis: true },
                      ]}
                    />
                  ) : null}
                </Space>
              ),
            },
            {
              key: 'versions',
              label: '版本记录',
              children: (
                <ProTable<API.WritingTranslationTopicVersion>
                  rowKey="id"
                  search={false}
                  pagination={false}
                  options={false}
                  dataSource={topic.versionRecords}
                  columns={versionColumns}
                />
              ),
            },
            {
              key: 'operations',
              label: '操作记录',
              children: topic.operationRecords.length ? (
                <Timeline
                  items={topic.operationRecords.map((item) => ({
                    key: item.id,
                    children: (
                      <Space orientation="vertical" size={0}>
                        <Typography.Text>
                          {item.action}：{item.reason}
                        </Typography.Text>
                        <Typography.Text type="secondary">
                          {item.operator} / {item.roleName} / {item.time}
                        </Typography.Text>
                      </Space>
                    ),
                  }))}
                />
              ) : (
                <Empty description="暂无操作记录" />
              ),
            },
          ]}
        />
      </Space>
    </PageContainer>
  );
};

export default WritingTranslationTopicDetailPage;
