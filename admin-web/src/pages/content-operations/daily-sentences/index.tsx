import { CalendarOutlined, PlusOutlined, UnorderedListOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useAccess } from '@umijs/max';
import { App, Button, Calendar, Image, Popconfirm, Segmented, Space, Spin, Tag, Tooltip, Typography } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import StatusTag from '@/components/StatusTag';
import type { AdminModuleKey, PermissionAction } from '@/foundation/permissions';
import { copyDailySentence, dailySentences, submitDailySentenceReview } from '@/services/ant-design-pro/api';
import { editableStatuses, reviewStatusOptions, toValueEnum } from './config';

const DailySentenceListPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const access = useAccess() as { canAction?: (module: AdminModuleKey, action: PermissionAction) => boolean };
  const [mode, setMode] = useState<'list' | 'calendar'>('list');
  const [calendarRows, setCalendarRows] = useState<API.DailySentenceItem[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [submittingId, setSubmittingId] = useState<string>();

  const canCreate = Boolean(access.canAction?.('content', 'create'));
  const loadCalendar = async () => {
    setCalendarLoading(true);
    try {
      const response = await dailySentences({ current: 1, pageSize: 200 });
      setCalendarRows(response.data ?? []);
    } finally {
      setCalendarLoading(false);
    }
  };

  useEffect(() => {
    if (mode === 'calendar') loadCalendar();
  }, [mode]);

  const submitReview = async (record: API.DailySentenceItem, confirmWarnings = false) => {
    setSubmittingId(record.id);
    try {
      await submitDailySentenceReview(record.id, {
        changeSummary: record.changeSummary || `提交 ${record.contentDate} 每日一句审核。`,
        dataVersion: record.dataVersion,
        confirmWarnings,
      });
      message.success('已提交审核');
      actionRef.current?.reload();
      if (mode === 'calendar') loadCalendar();
    } catch (error: any) {
      const precheck = error?.data?.data as API.DailySentencePrecheckResult | undefined;
      if (precheck?.level === 'warning' && !confirmWarnings) {
        modal.confirm({
          title: '预校验存在警告，确认提交审核？',
          content: precheck.summary,
          okText: '确认提交',
          cancelText: '取消',
          onOk: () => submitReview(record, true),
        });
      } else {
        message.error(error?.data?.errorMessage || error?.message || '提交审核失败');
      }
    } finally {
      setSubmittingId(undefined);
    }
  };

  const copyVersion = async (record: API.DailySentenceItem) => {
    try {
      const response = await copyDailySentence(record.id);
      if (response.data) {
        message.success('已创建新草稿版本');
        history.push(`/content-operations/daily-sentences/${response.data.id}/edit`);
      }
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '复制失败');
    }
  };

  const actions = (record: API.DailySentenceItem) => {
    const items: React.ReactNode[] = [
      <Button key="detail" type="link" size="small" onClick={() => history.push(`/content-operations/daily-sentences/${record.id}`)}>查看</Button>,
    ];
    if (access.canAction?.('content', 'edit') && editableStatuses.includes(record.status)) {
      items.push(<Button key="edit" type="link" size="small" onClick={() => history.push(`/content-operations/daily-sentences/${record.id}/edit`)}>编辑</Button>);
    }
    if (access.canAction?.('content', 'submit') && editableStatuses.includes(record.status)) {
      items.push(
        <Popconfirm key="submit" title="确认提交审核？" description={`${record.contentDate} 的内容将进入审核发布中心。`} onConfirm={() => submitReview(record)}>
          <Button type="link" size="small" loading={submittingId === record.id}>提交审核</Button>
        </Popconfirm>,
      );
    }
    if (canCreate && ['published', 'offline', 'rolled_back', 'approved', 'pending_publish'].includes(record.status)) {
      items.push(<Button key="copy" type="link" size="small" onClick={() => copyVersion(record)}>复制新版本</Button>);
    }
    if (record.reviewTaskId) {
      items.push(<Button key="review" type="link" size="small" onClick={() => history.push(`/review-release/pending?keyword=${record.reviewTaskId}`)}>审核任务</Button>);
    }
    return <Space size={0}>{items.slice(0, 4)}</Space>;
  };

  const columns: ProColumns<API.DailySentenceItem>[] = [
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '内容 ID、英文、译文或出处' } },
    { title: '日期', dataIndex: 'contentDate', valueType: 'date', width: 120, fixed: 'left', render: (_, record) => <Button type="link" size="small" onClick={() => history.push(`/content-operations/daily-sentences/${record.id}`)}>{record.contentDate}</Button> },
    { title: '内容', dataIndex: 'quote', search: false, width: 300, ellipsis: true, render: (_, record) => <Space orientation="vertical" size={0}><Typography.Text strong ellipsis style={{ width: 280 }}>{record.quote}</Typography.Text><Typography.Text type="secondary" ellipsis style={{ width: 280 }}>{record.translation}</Typography.Text></Space> },
    { title: '配图', dataIndex: 'imageAssetId', search: false, width: 90, render: (_, record) => <Image src={record.imageAsset.thumbnailUrl} alt={record.imageAsset.name} width={42} height={56} style={{ objectFit: 'cover', borderRadius: 4 }} /> },
    { title: '出处', dataIndex: 'displaySource', search: false, width: 220, ellipsis: true },
    { title: '状态', dataIndex: 'status', valueEnum: toValueEnum(reviewStatusOptions), width: 110, render: (_, record) => <StatusTag domain="reviewPublish" value={record.status} /> },
    { title: '发布计划', dataIndex: 'scheduledAt', search: false, width: 180, render: (_, record) => record.scheduledAt ? <Tooltip title={record.releaseMode === 'scheduled' ? 'Asia/Shanghai 定时发布' : '立即发布'}>{record.scheduledAt}</Tooltip> : '-' },
    { title: '版本', dataIndex: 'version', search: false, width: 80 },
    { title: '阅读 UV', dataIndex: ['effects', 'readUv'], search: false, width: 90 },
    { title: '打卡率', dataIndex: ['effects', 'checkinRate'], search: false, width: 90, render: (_, record) => record.effects.checkinRate === undefined ? '--' : `${record.effects.checkinRate}%` },
    { title: '素材状态', dataIndex: 'assetStatus', valueEnum: { active: { text: '有效' }, disabled: { text: '已停用' } }, hideInTable: true },
    { title: '创建人', dataIndex: 'creator', search: false, width: 100 },
    { title: '更新时间', dataIndex: 'updatedAt', search: false, width: 170 },
    { title: '操作', valueType: 'option', fixed: 'right', width: 260, render: (_, record) => actions(record) },
  ];

  const cellRender = (date: Dayjs) => {
    const rows = calendarRows.filter((item) => item.contentDate === date.format('YYYY-MM-DD'));
    if (!rows.length) return null;
    return (
      <Space orientation="vertical" size={3} style={{ width: '100%' }}>
        {rows.slice(0, 2).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => history.push(`/content-operations/daily-sentences/${item.id}`)}
            style={{ width: '100%', padding: 4, border: 0, background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
          >
            <Space size={4} wrap><StatusTag domain="reviewPublish" value={item.status} /><Typography.Text ellipsis style={{ maxWidth: 110, fontSize: 12 }}>{item.quote}</Typography.Text></Space>
          </button>
        ))}
        {rows.length > 2 ? <Tag>另有 {rows.length - 2} 个版本</Tag> : null}
      </Space>
    );
  };

  return (
    <PageContainer title="每日一句">
      {mode === 'list' ? (
        <ProTable<API.DailySentenceItem>
          actionRef={actionRef}
          rowKey="id"
          columns={columns}
          request={async (params) => {
            const result = await dailySentences({ ...params, startDate: params.contentDate?.[0], endDate: params.contentDate?.[1] } as API.DailySentenceQueryParams);
            return { data: result.data ?? [], success: result.success, total: result.total };
          }}
          pagination={{ pageSize: 20 }}
          scroll={{ x: 1750 }}
          search={{ labelWidth: 80, defaultCollapsed: false }}
          toolBarRender={() => [
            <Segmented key="mode" value={mode} onChange={(value) => setMode(value as 'list' | 'calendar')} options={[{ label: '列表', value: 'list', icon: <UnorderedListOutlined /> }, { label: '日历', value: 'calendar', icon: <CalendarOutlined /> }]} />,
            canCreate ? <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => history.push('/content-operations/daily-sentences/new')}>新增内容</Button> : null,
          ]}
        />
      ) : (
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Segmented value={mode} onChange={(value) => setMode(value as 'list' | 'calendar')} options={[{ label: '列表', value: 'list', icon: <UnorderedListOutlined /> }, { label: '日历', value: 'calendar', icon: <CalendarOutlined /> }]} />
            {canCreate ? <Button type="primary" icon={<PlusOutlined />} onClick={() => history.push(`/content-operations/daily-sentences/new?date=${dayjs().format('YYYY-MM-DD')}`)}>新增内容</Button> : null}
          </Space>
          <Spin spinning={calendarLoading}>
            <Calendar cellRender={cellRender} />
          </Spin>
        </Space>
      )}
    </PageContainer>
  );
};

export default DailySentenceListPage;
