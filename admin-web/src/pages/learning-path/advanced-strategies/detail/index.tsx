import { ArrowLeftOutlined, CopyOutlined, EditOutlined } from '@ant-design/icons';
import { PageContainer, ProCard, ProTable, StatisticCard } from '@ant-design/pro-components';
import { history, useModel, useParams } from '@umijs/max';
import { App, Button, Descriptions, Empty, Space, Spin, Tag, Timeline, Typography } from 'antd';
import type React from 'react';
import { useEffect, useState } from 'react';
import StatusTag from '@/components/StatusTag';
import { advancedLearningStrategyDetail, copyAdvancedLearningStrategy, updateAdvancedStrategyMockRun } from '@/services/ant-design-pro/api';
import { canManageAdvancedStrategy, editableStatuses, moduleLabels, precheckColors, precheckLabels, strategyKindLabels, triggerMetricLabels } from '../config';

const executionLabels: Record<API.StrategyExecutionStatus, string> = { assigned: '已分配', started: '已开始', completed: '已完成', replaced: '已替换', skipped: '已跳过', expired: '已过期' };

const AdvancedStrategyDetailPage: React.FC = () => {
  const { id = '' } = useParams();
  const { message } = App.useApp();
  const { initialState } = useModel('@@initialState');
  const [strategy, setStrategy] = useState<API.AdvancedLearningStrategy>();
  const [effects, setEffects] = useState<API.StrategyEffectSummary>();
  const [runs, setRuns] = useState<API.StrategyMatchRun[]>([]);
  const [loading, setLoading] = useState(true);
  const canManage = canManageAdvancedStrategy(initialState?.currentUser?.roleId);

  const load = async () => {
    setLoading(true);
    try {
      const response = await advancedLearningStrategyDetail(id);
      setStrategy(response.data);
      setEffects(response.effects);
      setRuns(response.runs ?? []);
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [id]);

  if (loading) return <PageContainer title="进阶学习策略详情"><Spin /></PageContainer>;
  if (!strategy) return <PageContainer><Empty description="策略不存在" /></PageContainer>;

  const copy = async () => {
    const response = await copyAdvancedLearningStrategy(strategy.id);
    if (response.data) history.push(`/learning-path/advanced-strategies/${response.data.id}/edit`);
  };
  const updateRun = async (runId: string, status: API.StrategyExecutionStatus) => {
    await updateAdvancedStrategyMockRun(runId, status);
    message.success('已更新 Mock 完成状态');
    load();
  };

  return <PageContainer title={strategy.name} extra={<Space><Button icon={<ArrowLeftOutlined />} onClick={() => history.push(`/learning-path/advanced-strategies?tab=${strategy.kind}`)}>返回</Button><StatusTag domain="reviewPublish" value={strategy.status} />{canManage && editableStatuses.includes(strategy.status) ? <Button icon={<EditOutlined />} onClick={() => history.push(`/learning-path/advanced-strategies/${strategy.id}/edit`)}>编辑</Button> : null}{canManage && !editableStatuses.includes(strategy.status) ? <Button icon={<CopyOutlined />} onClick={copy}>复制为草稿</Button> : null}</Space>}>
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <Descriptions bordered size="small" column={3}>
        <Descriptions.Item label="策略 ID">{strategy.id}</Descriptions.Item><Descriptions.Item label="类型">{strategyKindLabels[strategy.kind]}</Descriptions.Item><Descriptions.Item label="状态"><StatusTag domain="reviewPublish" value={strategy.status} /></Descriptions.Item>
        <Descriptions.Item label="考试类型">{strategy.examType}</Descriptions.Item><Descriptions.Item label="推荐模块">{moduleLabels[strategy.module]}</Descriptions.Item><Descriptions.Item label="优先级">{strategy.priority}</Descriptions.Item>
        <Descriptions.Item label="版本">{strategy.version}</Descriptions.Item><Descriptions.Item label="线上版本">{strategy.releaseVersionId || '-'}</Descriptions.Item><Descriptions.Item label="回滚目标">{strategy.rollbackTargetVersion || '-'}</Descriptions.Item>
        <Descriptions.Item label="说明" span={3}>{strategy.description}</Descriptions.Item><Descriptions.Item label="变更说明" span={3}>{strategy.changeSummary}</Descriptions.Item><Descriptions.Item label="影响范围" span={3}>{strategy.impactScope}</Descriptions.Item>
      </Descriptions>
      <ProCard title="触发与输出" split="vertical">
        <ProCard colSpan="50%"><Descriptions size="small" column={1}><Descriptions.Item label="条件关系">{strategy.triggerGroup.mode === 'all' ? '全部满足' : '任一满足'}</Descriptions.Item>{strategy.triggerGroup.conditions.map((item) => <Descriptions.Item key={item.id} label={triggerMetricLabels[item.metric]}>{item.description}</Descriptions.Item>)}</Descriptions></ProCard>
        <ProCard><Descriptions size="small" column={1}><Descriptions.Item label="主引用">{strategy.primaryReference.name} <Tag color={strategy.primaryReference.available ? 'success' : 'error'}>{strategy.primaryReference.status}</Tag></Descriptions.Item><Descriptions.Item label="轻量时长">{strategy.estimatedMinutes ? `${strategy.estimatedMinutes} 分钟` : '-'}</Descriptions.Item><Descriptions.Item label="追加数量">{strategy.practiceCount ?? '-'}</Descriptions.Item><Descriptions.Item label="复练间隔">{strategy.reviewIntervalDays !== undefined ? `${strategy.reviewIntervalDays} 天` : '-'}</Descriptions.Item><Descriptions.Item label="替代规则">{strategy.fallbackRule.enabled ? strategy.fallbackRule.targetName : '未启用'}</Descriptions.Item></Descriptions></ProCard>
      </ProCard>
      <ProCard title="预校验">{strategy.lastPrecheck ? <Space orientation="vertical"><Tag color={precheckColors[strategy.lastPrecheck.level]}>{precheckLabels[strategy.lastPrecheck.level]}</Tag><Typography.Text>{strategy.lastPrecheck.summary}</Typography.Text>{strategy.lastPrecheck.issues.map((item) => <Typography.Text key={item.id} type={item.level === 'error' ? 'danger' : 'warning'}>{item.message}</Typography.Text>)}</Space> : <Empty description="尚未预校验" />}</ProCard>
      <StatisticCard.Group direction="row"><StatisticCard statistic={{ title: 'Mock 命中', value: effects?.hits ?? 0 }} /><StatisticCard statistic={{ title: '已开始', value: effects?.started ?? 0 }} /><StatisticCard statistic={{ title: '已完成', value: effects?.completed ?? 0 }} /><StatisticCard statistic={{ title: '完成率', value: effects?.completionRate ?? 0, suffix: '%' }} /></StatisticCard.Group>
      <ProTable<API.StrategyMatchRun> rowKey="id" headerTitle="Mock 命中与完成记录" search={false} options={false} pagination={false} dataSource={runs} scroll={{ x: 1050 }} columns={[{ title: 'Mock 用户', dataIndex: 'profileName', width: 180 }, { title: '策略版本', dataIndex: 'strategyVersion', width: 100 }, { title: '命中结果', dataIndex: 'resultReferenceName', width: 220 }, { title: '替代', dataIndex: 'usedFallback', width: 80, renderText: (value) => value ? '是' : '否' }, { title: '状态', dataIndex: 'status', width: 100, renderText: (value) => executionLabels[value as API.StrategyExecutionStatus] }, { title: '原因', dataIndex: 'reason', ellipsis: true }, { title: '命中时间', dataIndex: 'matchedAt', width: 170 }, { title: '操作', valueType: 'option', width: 170, render: (_, record) => canManage ? [<Button key="start" type="link" size="small" disabled={record.status !== 'assigned'} onClick={() => updateRun(record.id, 'started')}>开始</Button>, <Button key="complete" type="link" size="small" disabled={!['assigned', 'started'].includes(record.status)} onClick={() => updateRun(record.id, 'completed')}>完成</Button>, <Button key="skip" type="link" size="small" disabled={!['assigned', 'started'].includes(record.status)} onClick={() => updateRun(record.id, 'skipped')}>跳过</Button>] : [] }]} />
      <ProCard title="版本与操作时间线"><Timeline items={[...strategy.operationRecords.map((item) => ({ content: `${item.action} · ${item.operator} · ${item.time} · ${item.reason}` })), ...strategy.versionRecords.map((item) => ({ content: `${item.version} · ${item.status} · ${item.createdAt}` }))]} /></ProCard>
    </Space>
  </PageContainer>;
};

export default AdvancedStrategyDetailPage;
