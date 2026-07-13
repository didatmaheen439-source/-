import { CopyOutlined, ExperimentOutlined, EyeOutlined, PlusOutlined, ReloadOutlined, SendOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useModel, useSearchParams } from '@umijs/max';
import { App, Button, Modal, Select, Space, Tabs, Tag, Typography } from 'antd';
import type React from 'react';
import { useMemo, useRef, useState } from 'react';
import StatusTag from '@/components/StatusTag';
import { advancedLearningStrategies, advancedStrategyMockProfiles, copyAdvancedLearningStrategy, runAdvancedStrategyMock, submitAdvancedLearningStrategyReview } from '@/services/ant-design-pro/api';
import { canManageAdvancedStrategy, editableStatuses, examTypeOptions, moduleLabels, moduleOptions, precheckColors, precheckLabels, statusValueEnum, strategyKindLabels } from './config';

type StrategyRow = API.AdvancedLearningStrategy & { effects?: API.StrategyEffectSummary };

const AdvancedStrategiesPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeKind, setActiveKind] = useState<API.AdvancedLearningStrategyKind>((searchParams.get('tab') as API.AdvancedLearningStrategyKind) || 'light_task');
  const [mockOpen, setMockOpen] = useState(false);
  const [profiles, setProfiles] = useState<API.StrategyMockProfile[]>([]);
  const [profileId, setProfileId] = useState<string>();
  const [mockResult, setMockResult] = useState<API.StrategyMatchRun>();
  const { initialState } = useModel('@@initialState');
  const canManage = canManageAdvancedStrategy(initialState?.currentUser?.roleId);

  const reload = () => actionRef.current?.reload();
  const changeKind = (kind: string) => {
    const next = kind as API.AdvancedLearningStrategyKind;
    setActiveKind(next);
    setSearchParams({ tab: next });
    actionRef.current?.reloadAndRest?.();
  };

  const copyStrategy = async (record: API.AdvancedLearningStrategy) => {
    try {
      const response = await copyAdvancedLearningStrategy(record.id);
      if (response.data) history.push(`/learning-path/advanced-strategies/${response.data.id}/edit`);
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '复制失败');
    }
  };

  const submitReview = async (record: API.AdvancedLearningStrategy, confirmWarnings = false) => {
    try {
      await submitAdvancedLearningStrategyReview(record.id, { dataVersion: record.dataVersion, changeSummary: record.changeSummary, confirmWarnings });
      message.success('已提交审核');
      reload();
    } catch (error: any) {
      const result = error?.data?.data as API.StrategyPrecheckResult | undefined;
      if (result?.level === 'warning' && !confirmWarnings) {
        modal.confirm({ title: '预校验存在警告', content: result.summary, okText: '确认提交', cancelText: '取消', onOk: () => submitReview(record, true) });
        return;
      }
      message.error(error?.data?.errorMessage || error?.message || '提交失败');
    }
  };

  const openMock = async () => {
    const response = await advancedStrategyMockProfiles();
    setProfiles(response.data ?? []);
    setProfileId(response.data?.[0]?.id);
    setMockResult(undefined);
    setMockOpen(true);
  };

  const runMock = async () => {
    if (!profileId) return;
    const response = await runAdvancedStrategyMock({ profileId, kind: activeKind });
    setMockResult(response.data);
    reload();
  };

  const columns = useMemo<ProColumns<StrategyRow>[]>(() => [
    { title: '策略 ID', dataIndex: 'id', width: 210, search: false, ellipsis: true, copyable: true },
    { title: '策略名称', dataIndex: 'keyword', width: 260, render: (_, record) => <Button type="link" size="small" style={{ padding: 0 }} onClick={() => history.push(`/learning-path/advanced-strategies/${record.id}`)}>{record.name}</Button> },
    { title: '考试', dataIndex: 'examType', width: 90, valueEnum: Object.fromEntries(examTypeOptions.map((item) => [item.value, { text: item.label }])) },
    { title: '模块', dataIndex: 'module', width: 100, valueEnum: Object.fromEntries(moduleOptions.map((item) => [item.value, { text: item.label }])) },
    { title: '触发摘要', dataIndex: 'trigger', width: 260, search: false, ellipsis: true, render: (_, record) => record.triggerGroup.conditions.map((item) => item.description).join(record.triggerGroup.mode === 'all' ? ' 且 ' : ' 或 ') },
    { title: '优先级', dataIndex: 'priority', width: 90, search: false, sorter: true },
    { title: '状态', dataIndex: 'status', width: 110, valueEnum: statusValueEnum, render: (_, record) => <StatusTag domain="reviewPublish" value={record.status} /> },
    { title: '预校验', dataIndex: 'precheck', width: 90, search: false, render: (_, record) => record.lastPrecheck ? <Tag color={precheckColors[record.lastPrecheck.level]}>{precheckLabels[record.lastPrecheck.level]}</Tag> : '-' },
    { title: '命中', dataIndex: ['effects', 'hits'], width: 70, search: false },
    { title: '完成率', dataIndex: ['effects', 'completionRate'], width: 90, search: false, renderText: (value) => `${value ?? 0}%` },
    { title: '更新时间', dataIndex: 'updatedAt', valueType: 'dateTime', width: 170, search: false },
    { title: '操作', valueType: 'option', fixed: 'right', width: 210, render: (_, record) => [
      <Button key="detail" type="link" size="small" icon={<EyeOutlined />} onClick={() => history.push(`/learning-path/advanced-strategies/${record.id}`)}>详情</Button>,
      canManage && editableStatuses.includes(record.status) ? <Button key="submit" type="link" size="small" icon={<SendOutlined />} onClick={() => submitReview(record)}>提交审核</Button> : null,
      canManage && !editableStatuses.includes(record.status) ? <Button key="copy" type="link" size="small" icon={<CopyOutlined />} onClick={() => copyStrategy(record)}>复制</Button> : null,
    ] },
  ], [canManage]);

  return <PageContainer title="进阶学习策略" extra={<Space><Button icon={<ExperimentOutlined />} onClick={openMock}>Mock 命中</Button>{canManage ? <Button type="primary" icon={<PlusOutlined />} onClick={() => history.push(`/learning-path/advanced-strategies/new?kind=${activeKind}`)}>新建策略</Button> : null}</Space>}>
    <Tabs activeKey={activeKind} onChange={changeKind} items={Object.entries(strategyKindLabels).map(([key, label]) => ({ key, label }))} />
    <ProTable<StrategyRow> rowKey="id" actionRef={actionRef} columns={columns} scroll={{ x: 1600 }} search={{ labelWidth: 80 }} request={async (params) => {
      const response = await advancedLearningStrategies({ ...params, kind: activeKind });
      return { data: (response.data ?? []) as StrategyRow[], total: response.total, success: response.success };
    }} toolBarRender={() => [<Button key="reload" icon={<ReloadOutlined />} onClick={reload}>刷新</Button>]} />
    <Modal title={`${strategyKindLabels[activeKind]} Mock 命中`} open={mockOpen} onCancel={() => setMockOpen(false)} onOk={runMock} okText="执行命中" cancelText="关闭">
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Select style={{ width: '100%' }} value={profileId} onChange={setProfileId} options={profiles.map((item) => ({ value: item.id, label: `${item.name} · ${item.examType} · ${moduleLabels[item.weakModule]}` }))} />
        {mockResult ? <Space orientation="vertical" size={4}><Tag color={mockResult.matched ? 'success' : 'default'}>{mockResult.matched ? '已命中' : '未命中'}</Tag><Typography.Text>{mockResult.strategyName || '-'}</Typography.Text><Typography.Text type="secondary">{mockResult.reason}</Typography.Text></Space> : null}
      </Space>
    </Modal>
  </PageContainer>;
};

export default AdvancedStrategiesPage;
