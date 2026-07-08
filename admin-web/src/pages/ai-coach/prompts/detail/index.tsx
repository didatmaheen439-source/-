import {
  ArrowLeftOutlined,
  CopyOutlined,
  EditOutlined,
  SendOutlined,
} from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useAccess, useModel, useParams } from '@umijs/max';
import {
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
import { useEffect, useState } from 'react';
import StatusTag from '@/components/StatusTag';
import type { AdminModuleKey, PermissionAction } from '@/foundation/permissions';
import {
  aiCoachStrategyDetail,
  aiCoachStrategyVersionDiff,
  copyAiCoachStrategy,
  submitAiCoachStrategyReview,
} from '@/services/ant-design-pro/api';
import {
  businessSceneText,
  configTypeText,
  editableStatuses,
  precheckLevelColor,
  precheckLevelText,
  riskLevelColor,
  riskLevelText,
} from '../config';

const bodyLines = (strategy: API.AiCoachStrategy) => {
  if (strategy.configType === 'intent') {
    const body = strategy.body as API.AiCoachIntentBody;
    return [
      ['意图 Key', body.intentKey],
      ['输出意图', body.outputIntent],
      ['置信阈值', String(body.confidenceThreshold)],
      ['触发样例', body.triggerExamples.join('、')],
    ];
  }
  if (strategy.configType === 'prompt_template') {
    const body = strategy.body as API.AiCoachPromptTemplateBody;
    return [
      ['系统角色', body.systemRole],
      ['输入变量', body.variables.map((item) => item.name).join('、')],
      ['风格规则', body.styleRules.join('、')],
      ['模板摘要', body.promptBody],
    ];
  }
  if (strategy.configType === 'response_structure') {
    const body = strategy.body as API.AiCoachResponseStructureBody;
    return [
      ['结构名称', body.schemaName],
      ['区块', body.sections.map((item) => item.title).join('、')],
      ['结构样例', body.outputExample],
    ];
  }
  const body = strategy.body as API.AiCoachDependencyRuleBody;
  return [
    ['依赖信号', body.dependencySignals.join('、')],
    ['干预话术', body.interventionMessage],
    ['连续回答阈值', String(body.maxConsecutiveAnswers)],
    ['冷却时间', `${body.cooldownMinutes} 分钟`],
  ];
};

const AiCoachStrategyDetailPage: React.FC = () => {
  const { id = '' } = useParams();
  const { message, modal } = App.useApp();
  const { initialState } = useModel('@@initialState');
  const roleId = initialState?.currentUser?.roleId;
  const access = useAccess() as {
    canAction?: (
      moduleKey: AdminModuleKey,
      targetAction: PermissionAction,
    ) => boolean;
  };
  const [loading, setLoading] = useState(true);
  const [strategy, setStrategy] = useState<API.AiCoachStrategy>();

  const canEdit =
    (roleId === 'super_admin' || roleId === 'ai_operator') &&
    access.canAction?.('aiCoach', 'edit') &&
    strategy &&
    editableStatuses.includes(strategy.status);
  const canCopy =
    (roleId === 'super_admin' || roleId === 'ai_operator') &&
    access.canAction?.('aiCoach', 'create') &&
    strategy?.status === 'published';
  const canSubmit =
    (roleId === 'super_admin' || roleId === 'ai_operator') &&
    access.canAction?.('aiCoach', 'submit') &&
    strategy &&
    editableStatuses.includes(strategy.status);

  const load = async () => {
    setLoading(true);
    try {
      const response = await aiCoachStrategyDetail(id);
      setStrategy(response.data);
    } catch {
      setStrategy(undefined);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const copyDraft = async () => {
    if (!strategy) return;
    try {
      const response = await copyAiCoachStrategy(strategy.id);
      if (response.data) {
        message.success('已创建新草稿版本');
        history.push(`/ai-coach/prompts/${response.data.id}/edit`);
      }
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '复制失败');
    }
  };

  const submitReview = async (confirmWarnings = false) => {
    if (!strategy) return;
    try {
      await submitAiCoachStrategyReview(strategy.id, {
        changeSummary: strategy.changeSummary,
        dataVersion: strategy.dataVersion,
        confirmWarnings,
      });
      message.success('已提交审核');
      load();
    } catch (error: any) {
      const precheck = error?.data?.data as API.AiCoachPrecheckResult | undefined;
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

  const showDiff = async (snapshot: API.AiCoachVersionSnapshot, index: number) => {
    if (!strategy) return;
    const next = strategy.versionSnapshots[index - 1] ?? strategy.versionSnapshots[0];
    const response = await aiCoachStrategyVersionDiff(strategy.id, {
      fromVersion: snapshot.version,
      toVersion: next.version,
    });
    const diff = response.data;
    if (!diff) return;
    Modal.info({
      title: `版本差异 ${diff.fromVersion} -> ${diff.toVersion}`,
      width: 720,
      content: (
        <ProTable<API.AiCoachVersionDiffItem>
          rowKey="field"
          search={false}
          pagination={false}
          options={false}
          dataSource={diff.items}
          columns={[
            { title: '字段', dataIndex: 'field', width: 120 },
            { title: '变更前', dataIndex: 'before', ellipsis: true },
            { title: '变更后', dataIndex: 'after', ellipsis: true },
            {
              title: '变化',
              dataIndex: 'changed',
              width: 90,
              render: (_, record) => (record.changed ? <Tag color="blue">已变化</Tag> : <Tag>无变化</Tag>),
            },
          ]}
        />
      ),
    });
  };

  if (loading) {
    return (
      <PageContainer>
        <Skeleton active />
      </PageContainer>
    );
  }

  if (!strategy) {
    return (
      <PageContainer>
        <Result
          status="404"
          title="AI 策略不存在"
          extra={<Button onClick={() => history.push('/ai-coach/prompts')}>返回列表</Button>}
        />
      </PageContainer>
    );
  }

  const versionColumns: ProColumns<API.AiCoachVersionSnapshot>[] = [
    { title: '版本', dataIndex: 'version', width: 100 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (_, record) => <StatusTag domain="reviewPublish" value={record.status} />,
    },
    {
      title: '主体摘要',
      dataIndex: 'bodySummary',
      ellipsis: true,
    },
    { title: '创建人', dataIndex: 'createdBy', width: 120 },
    { title: '时间', dataIndex: 'createdAt', valueType: 'dateTime', width: 170 },
    {
      title: '操作',
      valueType: 'option',
      width: 100,
      render: (_, record, index) => (
        <Button type="link" size="small" onClick={() => showDiff(record, index)}>
          查看差异
        </Button>
      ),
    },
  ];

  return (
    <PageContainer
      title={strategy.title}
      extra={[
        <Button key="back" icon={<ArrowLeftOutlined />} onClick={() => history.back()}>
          返回
        </Button>,
        canEdit ? (
          <Button
            key="edit"
            icon={<EditOutlined />}
            type="primary"
            onClick={() => history.push(`/ai-coach/prompts/${strategy.id}/edit`)}
          >
            编辑
          </Button>
        ) : null,
        canCopy ? (
          <Button key="copy" icon={<CopyOutlined />} onClick={copyDraft}>
            创建新草稿
          </Button>
        ) : null,
        canSubmit ? (
          <Button key="submit" icon={<SendOutlined />} onClick={() => submitReview(false)}>
            提交审核
          </Button>
        ) : null,
      ].filter(Boolean)}
    >
      <Tabs
        items={[
          {
            key: 'overview',
            label: '基础信息',
            children: (
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="策略 ID">{strategy.id}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <StatusTag domain="reviewPublish" value={strategy.status} />
                </Descriptions.Item>
                <Descriptions.Item label="配置类型">{configTypeText[strategy.configType]}</Descriptions.Item>
                <Descriptions.Item label="业务场景">
                  <Space wrap size={[4, 4]}>
                    {strategy.businessScenes.map((scene) => (
                      <Tag key={scene}>{businessSceneText[scene]}</Tag>
                    ))}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="风险等级">
                  <Tag color={riskLevelColor[strategy.riskLevel]}>
                    {riskLevelText[strategy.riskLevel]}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="版本">{strategy.version}</Descriptions.Item>
                <Descriptions.Item label="创建人">{strategy.creator}</Descriptions.Item>
                <Descriptions.Item label="更新人">{strategy.updatedBy}</Descriptions.Item>
                <Descriptions.Item label="更新时间">{strategy.updatedAt}</Descriptions.Item>
                <Descriptions.Item label="审核任务">{strategy.reviewTaskId ?? '-'}</Descriptions.Item>
                <Descriptions.Item label="策略说明" span={2}>{strategy.description}</Descriptions.Item>
                <Descriptions.Item label="影响范围" span={2}>{strategy.impactScope}</Descriptions.Item>
              </Descriptions>
            ),
          },
          {
            key: 'body',
            label: '配置主体',
            children: (
              <Descriptions bordered column={1} size="small">
                {bodyLines(strategy).map(([label, value]) => (
                  <Descriptions.Item label={label} key={label}>
                    <Typography.Paragraph style={{ marginBottom: 0 }}>
                      {value}
                    </Typography.Paragraph>
                  </Descriptions.Item>
                ))}
              </Descriptions>
            ),
          },
          {
            key: 'risk',
            label: '风险和兜底',
            children: (
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="防依赖">
                  {strategy.riskPolicy.dependencyPrevention ? '启用' : '关闭'}
                </Descriptions.Item>
                <Descriptions.Item label="回答边界">{strategy.riskPolicy.answerBoundary}</Descriptions.Item>
                <Descriptions.Item label="敏感策略">{strategy.riskPolicy.sensitivePolicy}</Descriptions.Item>
                <Descriptions.Item label="兜底策略">{strategy.riskPolicy.fallbackStrategy}</Descriptions.Item>
                <Descriptions.Item label="升级规则">{strategy.riskPolicy.escalationRule ?? '-'}</Descriptions.Item>
              </Descriptions>
            ),
          },
          {
            key: 'precheck',
            label: '预校验',
            children: strategy.lastPrecheck ? (
              <Space orientation="vertical" size={12}>
                <Tag color={precheckLevelColor[strategy.lastPrecheck.level]}>
                  {precheckLevelText[strategy.lastPrecheck.level]}
                </Tag>
                <Typography.Text>{strategy.lastPrecheck.summary}</Typography.Text>
                {strategy.lastPrecheck.issues.map((item) => (
                  <Tag key={item.id} color={precheckLevelColor[item.level]}>
                    {item.field}：{item.message}
                  </Tag>
                ))}
              </Space>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ),
          },
          {
            key: 'versions',
            label: '版本记录',
            children: (
              <ProTable<API.AiCoachVersionSnapshot>
                rowKey={(record) => `${record.version}-${record.createdAt}`}
                search={false}
                options={false}
                pagination={false}
                dataSource={strategy.versionSnapshots}
                columns={versionColumns}
              />
            ),
          },
          {
            key: 'operations',
            label: '操作记录',
            children: (
              <Timeline
                items={strategy.operationRecords.map((item) => ({
                  children: `${item.time} ${item.operator} ${item.action}：${item.reason}`,
                }))}
              />
            ),
          },
        ]}
      />
    </PageContainer>
  );
};

export default AiCoachStrategyDetailPage;
