import { ArrowLeftOutlined, CopyOutlined, EditOutlined, ExperimentOutlined, SafetyCertificateOutlined, SendOutlined } from '@ant-design/icons';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useAccess, useParams } from '@umijs/max';
import { App, Button, Card, Col, Descriptions, Form, Modal, Result, Row, Select, Skeleton, Space, Statistic, Tabs, Tag, Timeline, Typography } from 'antd';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import StatusTag from '@/components/StatusTag';
import type { AdminModuleKey, PermissionAction } from '@/foundation/permissions';
import {
  copyDailySentence,
  createDailySentenceMockEvent,
  dailySentenceDetail,
  dailySentenceEffects,
  precheckExistingDailySentence,
  submitDailySentenceReview,
} from '@/services/ant-design-pro/api';
import DailySentencePreview from '../components/DailySentencePreview';
import { editableStatuses, precheckColor, precheckText } from '../config';

const mockUsers = [
  { label: 'Mock 用户 001', value: 'mock-user-001' },
  { label: 'Mock 用户 002', value: 'mock-user-002' },
  { label: 'Mock 用户 003', value: 'mock-user-003' },
];

const DailySentenceDetailPage: React.FC = () => {
  const { id = '' } = useParams();
  const { message, modal } = App.useApp();
  const access = useAccess() as { canAction?: (module: AdminModuleKey, action: PermissionAction) => boolean };
  const [form] = Form.useForm<{ userId: string; eventType: 'read' | 'check_in' }>();
  const [item, setItem] = useState<API.DailySentenceItem>();
  const [effects, setEffects] = useState<{ summary: API.DailySentenceEffectSummary; trend: API.DailySentenceEffectTrend[] }>();
  const [loading, setLoading] = useState(true);
  const [eventOpen, setEventOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [detailResponse, effectsResponse] = await Promise.all([dailySentenceDetail(id), dailySentenceEffects(id)]);
      setItem(detailResponse.data);
      setEffects(effectsResponse.data);
    } catch {
      setItem(undefined);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const showPrecheck = async () => {
    if (!item) return;
    try {
      const response = await precheckExistingDailySentence(item.id);
      const result = response.data;
      if (!result) return;
      modal.info({
        title: `预校验${precheckText[result.level]}`,
        width: 720,
        content: <Space orientation="vertical" size={8}><Typography.Text>{result.summary}</Typography.Text>{result.issues.map((issue) => <Tag key={issue.id} color={precheckColor[issue.level]}>{issue.code} / {issue.field}：{issue.message}</Tag>)}</Space>,
      });
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '预校验失败');
    }
  };

  const submitReview = async (confirmWarnings = false) => {
    if (!item) return;
    try {
      await submitDailySentenceReview(item.id, { changeSummary: item.changeSummary, dataVersion: item.dataVersion, confirmWarnings });
      message.success('已提交审核');
      load();
    } catch (error: any) {
      const result = error?.data?.data as API.DailySentencePrecheckResult | undefined;
      if (result?.level === 'warning' && !confirmWarnings) {
        modal.confirm({ title: '预校验存在警告，确认提交？', content: result.summary, okText: '确认提交', onOk: () => submitReview(true) });
      } else message.error(error?.data?.errorMessage || error?.message || '提交审核失败');
    }
  };

  const copyVersion = async () => {
    if (!item) return;
    try {
      const response = await copyDailySentence(item.id);
      if (response.data) {
        message.success('已创建新草稿版本');
        history.push(`/content-operations/daily-sentences/${response.data.id}/edit`);
      }
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '复制失败');
    }
  };

  const createMockEvent = async () => {
    if (!item) return;
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const response = await createDailySentenceMockEvent(item.id, { ...values, eventId: `manual-${values.userId}-${values.eventType}-${Date.now()}` });
      message.success(response.data?.duplicate ? '重复行为已按幂等规则处理' : 'Mock 用户行为已记录');
      setEventOpen(false);
      form.resetFields();
      await load();
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '行为记录失败');
    } finally {
      setSubmitting(false);
    }
  };

  const versionItems = useMemo(() => item?.versionRecords.map((record) => ({
    content: <Space orientation="vertical" size={2}><Space><Tag>{record.version}</Tag><StatusTag domain="reviewPublish" value={record.status} /></Space><Typography.Text>{record.summary}</Typography.Text><Typography.Text type="secondary">{record.createdBy} · {record.createdAt}</Typography.Text></Space>,
  })) ?? [], [item]);

  if (loading) return <PageContainer><Skeleton active /></PageContainer>;
  if (!item) return <PageContainer><Result status="404" title="每日一句不存在" extra={<Button onClick={() => history.push('/content-operations/daily-sentences')}>返回列表</Button>} /></PageContainer>;

  const editable = editableStatuses.includes(item.status) && access.canAction?.('content', 'edit');
  const copyable = ['published', 'offline', 'rolled_back', 'approved', 'pending_publish'].includes(item.status) && access.canAction?.('content', 'create');
  const canSimulate = item.status === 'published' && access.canAction?.('content', 'edit');

  const tabs = [
    {
      key: 'content', label: '内容预览', children: (
        <Row gutter={24} align="top">
          <Col xs={24} lg={10}><DailySentencePreview value={{ ...item, imageUrl: item.imageAsset.url }} /></Col>
          <Col xs={24} lg={14}>
            <Descriptions bordered size="small" column={1} items={[
              { key: 'id', label: '内容 ID', children: item.id },
              { key: 'date', label: '内容日期', children: item.contentDate },
              { key: 'quote', label: '英文句子', children: item.quote },
              { key: 'translation', label: '中文译文', children: item.translation },
              { key: 'source', label: '展示出处', children: item.displaySource },
              { key: 'reference', label: '来源凭证', children: item.sourceReference },
              { key: 'asset', label: '配图素材', children: <Space>{item.imageAsset.name}<Tag color={item.imageAsset.status === 'active' ? 'green' : 'red'}>{item.imageAsset.status === 'active' ? '有效' : '已停用'}</Tag></Space> },
              { key: 'copyright', label: '素材备注', children: item.imageAsset.copyrightNote },
            ]} />
          </Col>
        </Row>
      ),
    },
    {
      key: 'release', label: '审核发布', children: <Descriptions bordered size="small" column={2} items={[
        { key: 'status', label: '当前状态', children: <StatusTag domain="reviewPublish" value={item.status} /> },
        { key: 'version', label: '版本', children: item.version },
        { key: 'mode', label: '发布方式', children: item.releaseMode === 'scheduled' ? '定时发布' : item.releaseMode === 'immediate' ? '立即发布' : '-' },
        { key: 'scheduled', label: '计划时间', children: item.scheduledAt || '-' },
        { key: 'published', label: '发布时间', children: item.publishedAt || '-' },
        { key: 'review', label: '审核任务', children: item.reviewTaskId ? <Button type="link" size="small" onClick={() => history.push(`/review-release/pending?keyword=${item.reviewTaskId}`)}>{item.reviewTaskId}</Button> : '-' },
        { key: 'summary', label: '变更摘要', span: 2, children: item.changeSummary },
        { key: 'impact', label: '影响范围', span: 2, children: item.impactScope },
      ]} />,
    },
    {
      key: 'effects', label: '内容效果', children: (
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          <Row gutter={[12, 12]}>
            <Col xs={12} md={6}><Card size="small"><Statistic title="阅读 PV" value={effects?.summary.readPv ?? 0} /></Card></Col>
            <Col xs={12} md={6}><Card size="small"><Statistic title="阅读 UV" value={effects?.summary.readUv ?? 0} /></Card></Col>
            <Col xs={12} md={6}><Card size="small"><Statistic title="打卡人数" value={effects?.summary.checkinUv ?? 0} /></Card></Col>
            <Col xs={12} md={6}><Card size="small"><Statistic title="打卡率" value={effects?.summary.checkinRate} suffix="%" /></Card></Col>
          </Row>
          <ProTable<API.DailySentenceEffectTrend>
            rowKey="date" search={false} options={false} pagination={false} dataSource={effects?.trend ?? []}
            columns={[{ title: '日期', dataIndex: 'date' }, { title: '阅读 PV', dataIndex: 'readPv' }, { title: '阅读 UV', dataIndex: 'readUv' }, { title: '打卡人数', dataIndex: 'checkinUv' }, { title: '打卡率', dataIndex: 'checkinRate', render: (_, record) => record.checkinRate === undefined ? '--' : `${record.checkinRate}%` }]}
          />
        </Space>
      ),
    },
    {
      key: 'versions', label: '版本与操作', children: <Row gutter={24}><Col xs={24} lg={12}><Typography.Title level={5}>版本记录</Typography.Title><Timeline items={versionItems} /></Col><Col xs={24} lg={12}><Typography.Title level={5}>操作记录</Typography.Title><Timeline items={item.operationRecords.map((record) => ({ content: <Space orientation="vertical" size={2}><Space><Tag color="blue">{record.action}</Tag><StatusTag domain="reviewPublish" value={record.toStatus} /></Space><Typography.Text>{record.reason}</Typography.Text><Typography.Text type="secondary">{record.operator} · {record.roleName} · {record.time}</Typography.Text></Space> }))} /></Col></Row>,
    },
  ];

  return (
    <PageContainer
      title={`每日一句 ${item.contentDate}`}
      tags={<StatusTag domain="reviewPublish" value={item.status} />}
      extra={[
        <Button key="back" icon={<ArrowLeftOutlined />} onClick={() => history.push('/content-operations/daily-sentences')}>返回列表</Button>,
        editable ? <Button key="edit" icon={<EditOutlined />} onClick={() => history.push(`/content-operations/daily-sentences/${item.id}/edit`)}>编辑内容</Button> : null,
        editable ? <Button key="precheck" icon={<SafetyCertificateOutlined />} onClick={showPrecheck}>预校验</Button> : null,
        editable && access.canAction?.('content', 'submit') ? <Button key="submit" icon={<SendOutlined />} onClick={() => submitReview()}>提交审核</Button> : null,
        copyable ? <Button key="copy" icon={<CopyOutlined />} onClick={copyVersion}>复制新版本</Button> : null,
        canSimulate ? <Button key="event" type="primary" icon={<ExperimentOutlined />} onClick={() => setEventOpen(true)}>模拟用户行为</Button> : null,
      ]}
    >
      <Tabs items={tabs} />
      <Modal title="模拟用户阅读/打卡" open={eventOpen} confirmLoading={submitting} okText="记录行为" cancelText="取消" onCancel={() => setEventOpen(false)} onOk={createMockEvent}>
        <Form form={form} layout="vertical" initialValues={{ eventType: 'read' }}>
          <Form.Item name="userId" label="Mock 用户" rules={[{ required: true }]}><Select options={mockUsers} /></Form.Item>
          <Form.Item name="eventType" label="用户行为" rules={[{ required: true }]}><Select options={[{ label: '阅读', value: 'read' }, { label: '打卡', value: 'check_in' }]} /></Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default DailySentenceDetailPage;
