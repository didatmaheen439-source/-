import {
  BranchesOutlined,
  EyeOutlined,
  FileTextOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  ModalForm,
  PageContainer,
  ProFormSelect,
  ProFormTextArea,
  ProTable,
} from '@ant-design/pro-components';
import { history, useModel, useSearchParams } from '@umijs/max';
import {
  Alert,
  App,
  Button,
  Col,
  Descriptions,
  Divider,
  Drawer,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createWritingTranslationCorrectionFixDraft,
  writingTranslationCorrectionSummaries,
  writingTranslationCorrectionSummary,
  writingTranslationCorrectionSummaryStats,
} from '@/services/ant-design-pro/api';

const topicTypeText: Record<API.WritingTranslationTopicType, string> = {
  writing: '写作',
  translation: '翻译',
};

const scoreBandText: Record<API.MockCorrectionRecord['scoreBand'], string> = {
  excellent: '高分稳定',
  stable: '正常区间',
  attention: '需要关注',
  abnormal: '异常样例',
};

const scoreBandColor: Record<API.MockCorrectionRecord['scoreBand'], string> = {
  excellent: 'green',
  stable: 'blue',
  attention: 'orange',
  abnormal: 'red',
};

const correctionStatusText: Record<API.MockCorrectionRecord['correctionStatus'], string> = {
  normal: '正常',
  needs_review: '待复核',
  abnormal: '异常',
};

const correctionStatusColor: Record<API.MockCorrectionRecord['correctionStatus'], string> = {
  normal: 'green',
  needs_review: 'orange',
  abnormal: 'red',
};

const fixStatusText: Record<API.CorrectionFixStatus, string> = {
  none: '未处理',
  draft_created: '已建草稿',
  pending_review: '审核中',
  published: '已发布',
  closed_no_fix: '无需修正',
};

const targetTypeText: Record<API.CorrectionFixTargetType, string> = {
  topic: '题目',
  scoring_template: '评分规则',
  feedback_template: '反馈模板',
  ai_strategy: 'AI 策略',
};

const targetTypeIcon: Record<API.CorrectionFixTargetType, React.ReactNode> = {
  topic: <FileTextOutlined />,
  scoring_template: <BranchesOutlined />,
  feedback_template: <ToolOutlined />,
  ai_strategy: <BranchesOutlined />,
};

const compactTextStyle: React.CSSProperties = {
  display: 'block',
  maxWidth: '100%',
  fontSize: 13,
};

const issueOptions = [
  { label: '题目要求不清', value: 'topic_requirement' },
  { label: '评分权重偏差', value: 'scoring_weight' },
  { label: '反馈建议泛化', value: 'feedback_vague' },
  { label: 'AI 结构输出偏移', value: 'ai_structure' },
  { label: '语言准确性扣分集中', value: 'language_accuracy' },
  { label: '缺少可执行修改建议', value: 'missing_revision' },
];

const canCreateFixDraft = (roleId: string | undefined, targetType: API.CorrectionFixTargetType) => {
  if (roleId === 'super_admin') return true;
  if (targetType === 'topic' || targetType === 'scoring_template') return roleId === 'teaching_reviewer';
  if (targetType === 'feedback_template' || targetType === 'ai_strategy') return roleId === 'ai_operator';
  return false;
};

const defaultTargetType = (record: API.MockCorrectionRecord): API.CorrectionFixTargetType =>
  record.rootCauseType ?? record.issueTags.find((item) => item.severity === 'high')?.causeType ?? record.issueTags[0]?.causeType ?? 'topic';

const CorrectionSummariesPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [searchParams] = useSearchParams();
  const [stats, setStats] = useState<API.CorrectionSummaryStats>();
  const [detail, setDetail] = useState<API.MockCorrectionRecord>();
  const [fixRecord, setFixRecord] = useState<API.MockCorrectionRecord>();
  const { initialState } = useModel('@@initialState');
  const roleId = initialState?.currentUser?.roleId;

  const openDetail = async (id: string) => {
    try {
      const response = await writingTranslationCorrectionSummary(id);
      if (response.data) setDetail(response.data);
    } catch (error: any) {
      message.error(error?.data?.errorMessage || '批改记录不存在');
    }
  };

  useEffect(() => {
    const recordId = searchParams.get('record');
    if (recordId) openDetail(recordId);
  }, [searchParams]);

  const columns = useMemo<ProColumns<API.MockCorrectionRecord>[]>(
    () => [
      {
        title: '关键词',
        dataIndex: 'keyword',
        hideInTable: true,
        fieldProps: { placeholder: '记录 ID、题目、问题摘要' },
      },
      {
        title: '题目',
        dataIndex: 'topicName',
        width: 260,
        render: (_, record) => (
          <Space orientation="vertical" size={0} style={{ width: '100%', minWidth: 0 }}>
            <Button type="link" size="small" style={{ padding: 0 }} onClick={() => openDetail(record.id)}>
              <Typography.Text ellipsis={{ tooltip: record.topicName }} style={compactTextStyle}>
                {record.topicName}
              </Typography.Text>
            </Button>
            <Typography.Text type="secondary" style={compactTextStyle}>
              {topicTypeText[record.topicType]} / {record.examType} / {record.topicVersion}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: '题型',
        dataIndex: 'topicType',
        width: 100,
        valueEnum: {
          writing: { text: '写作' },
          translation: { text: '翻译' },
        },
        render: (_, record) => <Tag>{topicTypeText[record.topicType]}</Tag>,
      },
      {
        title: '考试',
        dataIndex: 'examType',
        width: 90,
        valueEnum: {
          CET4: { text: 'CET4' },
          CET6: { text: 'CET6' },
        },
      },
      {
        title: '得分',
        dataIndex: 'scoreBand',
        width: 130,
        valueEnum: Object.fromEntries(
          Object.entries(scoreBandText).map(([value, text]) => [value, { text }]),
        ),
        render: (_, record) => (
          <Space orientation="vertical" size={0}>
            <Typography.Text strong>
              {record.score}/{record.totalScore}
            </Typography.Text>
            <Tag color={scoreBandColor[record.scoreBand]}>{scoreBandText[record.scoreBand]}</Tag>
          </Space>
        ),
      },
      {
        title: '常见问题',
        dataIndex: 'issueCode',
        width: 230,
        hideInTable: true,
        valueEnum: Object.fromEntries(issueOptions.map((item) => [item.value, { text: item.label }])),
      },
      {
        title: '问题摘要',
        dataIndex: 'answerSummary',
        search: false,
        ellipsis: true,
        render: (_, record) => (
          <Space orientation="vertical" size={4} style={{ width: '100%', minWidth: 0 }}>
            <Typography.Text ellipsis={{ tooltip: record.answerSummary }} style={compactTextStyle}>
              {record.answerSummary}
            </Typography.Text>
            <Space size={4} wrap>
              {record.issueTags.slice(0, 3).map((item) => (
                <Tag key={item.code} color={item.severity === 'high' ? 'red' : item.severity === 'medium' ? 'orange' : 'blue'}>
                  {item.name}
                </Tag>
              ))}
            </Space>
          </Space>
        ),
      },
      {
        title: '版本定位',
        dataIndex: 'strategyVersion',
        width: 220,
        render: (_, record) => (
          <Space orientation="vertical" size={0} style={{ width: '100%', minWidth: 0 }}>
            <Typography.Text ellipsis={{ tooltip: record.scoringTemplateRef.templateName }} style={compactTextStyle}>
              评分 {record.scoringTemplateRef.version}
            </Typography.Text>
            <Typography.Text ellipsis={{ tooltip: record.feedbackTemplateRef.templateName }} style={compactTextStyle}>
              反馈 {record.feedbackTemplateRef.version}
            </Typography.Text>
            <Typography.Text type="secondary" ellipsis={{ tooltip: record.aiStrategySnapshot.strategyTitle }} style={compactTextStyle}>
              AI {record.aiStrategyVersion}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: '状态',
        dataIndex: 'correctionStatus',
        width: 110,
        valueEnum: Object.fromEntries(
          Object.entries(correctionStatusText).map(([value, text]) => [value, { text }]),
        ),
        render: (_, record) => (
          <Tag color={correctionStatusColor[record.correctionStatus]}>
            {correctionStatusText[record.correctionStatus]}
          </Tag>
        ),
      },
      {
        title: '修正',
        dataIndex: 'fixStatus',
        width: 110,
        valueEnum: Object.fromEntries(
          Object.entries(fixStatusText).map(([value, text]) => [value, { text }]),
        ),
        render: (_, record) => fixStatusText[record.fixStatus],
      },
      {
        title: '生成时间',
        dataIndex: 'createdAt',
        width: 170,
        search: false,
      },
      {
        title: '操作',
        valueType: 'option',
        width: 120,
        fixed: 'right',
        render: (_, record) => (
          <Space size={0}>
            <Tooltip title="查看详情">
              <Button type="text" icon={<EyeOutlined />} onClick={() => openDetail(record.id)} />
            </Tooltip>
            <Tooltip title="发起修正草稿">
              <Button type="text" icon={<ToolOutlined />} onClick={() => setFixRecord(record)} />
            </Tooltip>
          </Space>
        ),
      },
    ],
    [],
  );

  return (
    <PageContainer title="批改记录摘要">
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        {stats ? (
          <Row gutter={[16, 12]}>
            <Col xs={12} md={6}>
              <Statistic title="Mock 记录" value={stats.total} />
            </Col>
            <Col xs={12} md={6}>
              <Statistic title="待复核/异常" value={stats.needsReviewCount + stats.abnormalCount} />
            </Col>
            <Col xs={12} md={6}>
              <Statistic title="平均分" value={stats.averageScore} suffix="分" />
            </Col>
            <Col xs={12} md={6}>
              <Statistic title="正常记录" value={stats.normalCount} />
            </Col>
          </Row>
        ) : null}

        {stats ? (
          <Alert
            showIcon
            type="info"
            title={
              <Space size={8} wrap>
                {stats.scoreBands.map((item) => (
                  <Tag key={item.band} color={scoreBandColor[item.band]}>
                    {item.label} {item.count}
                  </Tag>
                ))}
                {stats.topIssues.map((item) => (
                  <Tag key={item.code}>{item.name} {item.count}</Tag>
                ))}
              </Space>
            }
          />
        ) : null}

        <ProTable<API.MockCorrectionRecord>
          actionRef={actionRef}
          rowKey="id"
          columns={columns}
          scroll={{ x: 1500 }}
          search={{ labelWidth: 86, defaultCollapsed: false }}
          request={async (params) => {
            const query = params as API.CorrectionSummaryQueryParams;
            const [listResponse, statsResponse] = await Promise.all([
              writingTranslationCorrectionSummaries(query),
              writingTranslationCorrectionSummaryStats(query),
            ]);
            setStats(statsResponse.data);
            return {
              data: listResponse.data ?? [],
              total: listResponse.total,
              success: listResponse.success,
            };
          }}
        />
      </Space>

      <Drawer
        title={detail?.id}
        size="large"
        open={Boolean(detail)}
        onClose={() => setDetail(undefined)}
        extra={
          detail ? (
            <Button icon={<ToolOutlined />} onClick={() => setFixRecord(detail)}>
              发起修正草稿
            </Button>
          ) : null
        }
      >
        {detail ? (
          <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions
              bordered
              size="small"
              column={2}
              items={[
                { key: 'topic', label: '题目', children: detail.topicName },
                { key: 'type', label: '题型', children: `${topicTypeText[detail.topicType]} / ${detail.examType}` },
                { key: 'score', label: '得分', children: `${detail.score}/${detail.totalScore}，${scoreBandText[detail.scoreBand]}` },
                { key: 'status', label: '状态', children: <Tag color={correctionStatusColor[detail.correctionStatus]}>{correctionStatusText[detail.correctionStatus]}</Tag> },
                { key: 'summary', label: '脱敏答案摘要', span: 2, children: detail.answerSummary },
                { key: 'scoring', label: '评分模板', children: `${detail.scoringTemplateRef.templateName} / ${detail.scoringTemplateRef.version}` },
                { key: 'feedback', label: '反馈模板', children: `${detail.feedbackTemplateRef.templateName} / ${detail.feedbackTemplateRef.version}` },
                { key: 'ai', label: 'AI 策略', span: 2, children: `${detail.aiStrategySnapshot.strategyTitle} / ${detail.aiStrategyVersion}` },
                { key: 'diagnosis', label: '归因说明', span: 2, children: detail.diagnosis || '-' },
              ]}
            />

            <Divider>维度得分</Divider>
            <Table
              rowKey="key"
              size="small"
              pagination={false}
              dataSource={detail.dimensionScores}
              columns={[
                { title: '维度', dataIndex: 'name' },
                { title: '得分', render: (_, record: API.CorrectionDimensionScore) => `${record.score}/${record.maxScore}` },
                { title: '问题数', dataIndex: 'issueCount' },
              ]}
            />

            <Divider>常见问题</Divider>
            <Space size={8} wrap>
              {detail.issueTags.map((item) => (
                <Tag key={item.code} color={item.severity === 'high' ? 'red' : item.severity === 'medium' ? 'orange' : 'blue'}>
                  {targetTypeIcon[item.causeType]} {item.name}
                </Tag>
              ))}
            </Space>

            <Divider>反馈片段</Divider>
            <Table
              rowKey="title"
              size="small"
              pagination={false}
              dataSource={detail.feedbackSections}
              columns={[
                { title: '区块', dataIndex: 'title', width: 140 },
                { title: 'Mock 内容', dataIndex: 'content' },
              ]}
            />

            <Divider>修正草稿</Divider>
            {detail.linkedFixDrafts.length ? (
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={detail.linkedFixDrafts}
                columns={[
                  { title: '类型', render: (_, record: API.CorrectionFixDraft) => targetTypeText[record.targetType] },
                  { title: '对象', dataIndex: 'targetName' },
                  { title: '版本', dataIndex: 'targetVersion' },
                  {
                    title: '操作',
                    render: (_, record: API.CorrectionFixDraft) => (
                      <Button type="link" size="small" onClick={() => history.push(record.targetPath)}>
                        打开
                      </Button>
                    ),
                  },
                ]}
              />
            ) : (
              <Typography.Text type="secondary">暂无修正草稿</Typography.Text>
            )}
          </Space>
        ) : null}
      </Drawer>

      <ModalForm<API.CorrectionFixDraftParams>
        key={fixRecord?.id}
        title="发起修正草稿"
        open={Boolean(fixRecord)}
        initialValues={fixRecord ? { targetType: defaultTargetType(fixRecord), dataVersion: fixRecord.dataVersion } : undefined}
        modalProps={{ destroyOnHidden: true, onCancel: () => setFixRecord(undefined), width: 720 }}
        onFinish={async (values) => {
          if (!fixRecord) return false;
          if (!canCreateFixDraft(roleId, values.targetType)) {
            message.error('当前角色无权创建该类型修正草稿');
            return false;
          }
          try {
            const response = await createWritingTranslationCorrectionFixDraft(fixRecord.id, {
              ...values,
              dataVersion: fixRecord.dataVersion,
            });
            if (response.data) {
              setDetail(response.data);
              setFixRecord(undefined);
              actionRef.current?.reload();
            }
            if (response.draft) {
              const draftPath = response.draft.targetPath;
              modal.confirm({
                title: '修正草稿已创建',
                content: `${targetTypeText[response.draft.targetType]}：${response.draft.targetName} / ${response.draft.targetVersion}`,
                okText: '打开草稿',
                cancelText: '留在当前页',
                onOk: () => history.push(draftPath),
              });
            }
            return true;
          } catch (error: any) {
            message.error(error?.data?.errorMessage || '创建修正草稿失败');
            return false;
          }
        }}
      >
        {fixRecord ? (
          <Alert
            showIcon
            type="info"
            style={{ marginBottom: 16 }}
            title={`${fixRecord.topicName}，${fixRecord.score}/${fixRecord.totalScore} 分，${correctionStatusText[fixRecord.correctionStatus]}`}
          />
        ) : null}
        <ProFormSelect
          name="targetType"
          label="归因对象"
          rules={[{ required: true }]}
          options={(Object.keys(targetTypeText) as API.CorrectionFixTargetType[]).map((value) => ({
            label: targetTypeText[value],
            value,
            disabled: !canCreateFixDraft(roleId, value),
          }))}
        />
        <ProFormTextArea name="diagnosis" label="归因说明" fieldProps={{ rows: 3 }} rules={[{ required: true }]} />
        <ProFormTextArea name="changeSummary" label="草稿变更说明" fieldProps={{ rows: 3 }} rules={[{ required: true }]} />
      </ModalForm>
    </PageContainer>
  );
};

export default CorrectionSummariesPage;
