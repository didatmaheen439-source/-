import { CopyOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useModel } from '@umijs/max';
import { App, Button, Popconfirm, Progress, Space, Tag, Tooltip, Typography } from 'antd';
import type React from 'react';
import { useRef, useState } from 'react';
import StatusTag from '@/components/StatusTag';
import { contentArticles, copyContentArticle, submitContentArticleReview } from '@/services/ant-design-pro/api';
import {
  articleCategoryOptions,
  articleDifficultyOptions,
  articleRiskOptions,
  editableArticleStatuses,
  examTypeOptions,
  getOptionLabel,
  reviewStatusOptions,
  riskColor,
  toValueEnum,
} from './constants';

const ArticleListPage: React.FC = () => {
  const { message } = App.useApp();
  const { initialState } = useModel('@@initialState');
  const canWrite = ['super_admin', 'content_operator'].includes(initialState?.currentUser?.roleId ?? '');
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [pendingId, setPendingId] = useState<string>();

  const submit = async (article: API.ArticleItem) => {
    setPendingId(article.id);
    try {
      await submitContentArticleReview(article.id, {
        changeSummary: article.changeSummary || '提交外刊审核。',
        dataVersion: article.dataVersion,
        confirmWarnings: true,
      });
      message.success('已提交审核');
      actionRef.current?.reload();
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '提交审核失败');
    } finally {
      setPendingId(undefined);
    }
  };

  const copy = async (article: API.ArticleItem) => {
    setPendingId(article.id);
    try {
      const response = await copyContentArticle(article.id);
      message.success('已复制为新草稿');
      history.push(`/content-operations/articles/${response.data.id}/edit`);
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '复制失败');
    } finally {
      setPendingId(undefined);
    }
  };

  const columns: ProColumns<API.ArticleItem>[] = [
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '文章 ID、标题、摘要或来源' } },
    {
      title: '文章标题', dataIndex: 'title', search: false, width: 300, fixed: 'left',
      render: (_, article) => (
        <Space orientation="vertical" size={0}>
          <Button type="link" size="small" onClick={() => history.push(`/content-operations/articles/${article.id}`)}>{article.title}</Button>
          <Typography.Text type="secondary" copyable>{article.id}</Typography.Text>
        </Space>
      ),
    },
    { title: '分类', dataIndex: 'category', width: 120, valueEnum: toValueEnum(articleCategoryOptions) },
    { title: '难度', dataIndex: 'difficulty', width: 100, valueEnum: toValueEnum(articleDifficultyOptions), renderText: (value) => getOptionLabel(articleDifficultyOptions, value) },
    { title: '适用考试', dataIndex: 'examType', width: 150, valueEnum: toValueEnum(examTypeOptions), render: (_, article) => <Space wrap size={[4, 4]}>{article.examTypes.map((item) => <Tag key={item}>{item}</Tag>)}</Space> },
    { title: '状态', dataIndex: 'status', width: 110, valueEnum: toValueEnum(reviewStatusOptions), render: (_, article) => <StatusTag domain="reviewPublish" value={article.status} /> },
    { title: '线上版本', dataIndex: 'version', search: false, width: 100, renderText: (_, article) => article.isOnline ? article.effects.version : '-' },
    { title: '阅读 UV', dataIndex: ['effects', 'readers'], search: false, width: 100 },
    { title: '收藏', dataIndex: ['effects', 'favorites'], search: false, width: 90 },
    {
      title: '完成率', dataIndex: ['effects', 'completionRate'], search: false, width: 130,
      render: (_, article) => <Progress percent={article.effects.completionRate} size="small" status={article.effects.completionRate < 35 && article.effects.readers >= 20 ? 'exception' : 'normal'} />,
    },
    {
      title: '效果风险', dataIndex: 'risk', width: 130, valueEnum: toValueEnum(articleRiskOptions),
      render: (_, article) => article.effects.risks.length ? <Space wrap size={[4, 4]}>{article.effects.risks.map((risk) => <Tag key={risk.code} color={riskColor[risk.level]}>{risk.label}</Tag>)}</Space> : <Tag color="green">正常</Tag>,
    },
    { title: '更新时间', dataIndex: 'updatedAt', search: false, width: 170 },
    {
      title: '操作', valueType: 'option', fixed: 'right', width: 280,
      render: (_, article) => (
        <Space size={0}>
          <Button type="link" size="small" onClick={() => history.push(`/content-operations/articles/${article.id}`)}>查看</Button>
          {canWrite && editableArticleStatuses.includes(article.status) ? <Button type="link" size="small" onClick={() => history.push(`/content-operations/articles/${article.id}/edit`)}>编辑</Button> : null}
          {canWrite && !editableArticleStatuses.includes(article.status) ? <Button type="link" size="small" icon={<CopyOutlined />} loading={pendingId === article.id} onClick={() => copy(article)}>新版本</Button> : null}
          {canWrite && editableArticleStatuses.includes(article.status) ? (
            <Popconfirm title="确认提交审核？" description="系统将重新校验正文、来源、素材和版本。" onConfirm={() => submit(article)}>
              <Button type="link" size="small" loading={pendingId === article.id}>提交审核</Button>
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title="外刊内容">
      <ProTable<API.ArticleItem>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        scroll={{ x: 1850 }}
        pagination={{ pageSize: 20 }}
        request={async (params) => {
          const response = await contentArticles(params as API.ArticleQueryParams);
          return { data: response.data ?? [], total: response.total ?? 0, success: response.success };
        }}
        toolbar={{
          title: '文章列表',
          actions: [
            <Tooltip key="reload" title="刷新列表"><Button icon={<ReloadOutlined />} onClick={() => actionRef.current?.reload()} /></Tooltip>,
            canWrite ? <Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => history.push('/content-operations/articles/new')}>新建文章</Button> : null,
          ].filter(Boolean),
        }}
      />
    </PageContainer>
  );
};

export default ArticleListPage;
