import { ArrowLeftOutlined, CopyOutlined, EditOutlined, SendOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useModel, useParams } from '@umijs/max';
import { Alert, App, Button, Descriptions, Image, Popconfirm, Progress, Result, Skeleton, Space, Table, Tabs, Tag, Timeline, Typography } from 'antd';
import type React from 'react';
import { useEffect, useState } from 'react';
import StatusTag from '@/components/StatusTag';
import {
  contentArticleDetail,
  contentArticleEffects,
  copyContentArticle,
  precheckContentArticle,
  submitContentArticleReview,
} from '@/services/ant-design-pro/api';
import { articleDifficultyOptions, editableArticleStatuses, getOptionLabel, riskColor } from '../constants';

const ArticleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { message } = App.useApp();
  const { initialState } = useModel('@@initialState');
  const roleId = initialState?.currentUser?.roleId ?? '';
  const canWrite = ['super_admin', 'content_operator'].includes(roleId);
  const [article, setArticle] = useState<API.ArticleItem>();
  const [effects, setEffects] = useState<API.ArticleEffectSummary>();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [detailResponse, effectResponse] = await Promise.all([contentArticleDetail(id), contentArticleEffects(id)]);
      setArticle(detailResponse.data);
      setEffects(effectResponse.data);
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '外刊加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const submit = async () => {
    if (!article) return;
    setPending(true);
    try {
      const checked = await precheckContentArticle(article.id);
      if (!checked.data.passed) {
        setArticle({ ...article, lastPrecheck: checked.data });
        message.error('外刊校验未通过');
        return;
      }
      await submitContentArticleReview(article.id, { changeSummary: article.changeSummary || '提交外刊审核。', dataVersion: article.dataVersion, confirmWarnings: true });
      message.success('已提交审核');
      await load();
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '提交审核失败');
    } finally {
      setPending(false);
    }
  };

  const copy = async () => {
    if (!article) return;
    setPending(true);
    try {
      const response = await copyContentArticle(article.id);
      message.success('已复制为新草稿');
      history.push(`/content-operations/articles/${response.data.id}/edit`);
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '复制失败');
    } finally {
      setPending(false);
    }
  };

  if (loading) return <PageContainer title="外刊详情"><Skeleton active paragraph={{ rows: 12 }} /></PageContainer>;
  if (!article) return <PageContainer title="外刊详情"><Result status="404" title="外刊不存在" extra={<Button onClick={() => history.push('/content-operations/articles')}>返回列表</Button>} /></PageContainer>;

  const editable = canWrite && editableArticleStatuses.includes(article.status);
  const servingSnapshot = article.snapshots.find((item) => item.id === article.servingVersionId);

  return (
    <PageContainer
      title={article.title}
      subTitle={article.id}
      extra={[
        <Button key="back" icon={<ArrowLeftOutlined />} onClick={() => history.push('/content-operations/articles')}>返回列表</Button>,
        editable ? <Button key="edit" icon={<EditOutlined />} onClick={() => history.push(`/content-operations/articles/${article.id}/edit`)}>编辑文章</Button> : null,
        canWrite && !editable ? <Button key="copy" icon={<CopyOutlined />} loading={pending} onClick={copy}>创建新版本</Button> : null,
        editable ? <Popconfirm key="submit" title="确认提交审核？" description="提交前会重新校验正文、来源、素材和版本。" onConfirm={submit}><Button type="primary" icon={<SendOutlined />} loading={pending}>提交审核</Button></Popconfirm> : null,
        article.reviewTaskId ? <Button key="review" onClick={() => history.push(`/review-release/pending?keyword=${article.reviewTaskId}`)}>审核任务</Button> : null,
      ].filter(Boolean)}
    >
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Descriptions bordered size="small" column={4} items={[
          { key: 'status', label: '审核状态', children: <StatusTag domain="reviewPublish" value={article.status} /> },
          { key: 'version', label: '编辑版本', children: article.version },
          { key: 'online', label: '线上状态', children: <Tag color={article.isOnline ? 'green' : 'default'}>{article.isOnline ? '在线' : '未上线'}</Tag> },
          { key: 'serving', label: '线上版本', children: servingSnapshot?.version ?? '-' },
          { key: 'category', label: '分类', children: article.category },
          { key: 'difficulty', label: '难度', children: getOptionLabel(articleDifficultyOptions, article.difficulty) },
          { key: 'exam', label: '适用考试', children: <Space wrap>{article.examTypes.map((item) => <Tag key={item}>{item}</Tag>)}</Space> },
          { key: 'updated', label: '更新时间', children: article.updatedAt },
        ]} />

        {article.lastPrecheck ? <Alert showIcon type={article.lastPrecheck.passed ? 'success' : 'error'} title={article.lastPrecheck.summary} description={article.lastPrecheck.issues.map((issue) => issue.message).join('；')} /> : null}
        {effects?.risks.map((risk) => <Alert key={risk.code} showIcon type={risk.level === 'high' ? 'error' : risk.level === 'warning' ? 'warning' : 'info'} title={risk.label} description={`${risk.description} 风险只用于人工复核，不会自动改变文章状态。`} />)}

        <Tabs items={[
          {
            key: 'content', label: '文章内容', children: <Space orientation="vertical" size={16} style={{ width: '100%' }}>
              <Descriptions bordered size="small" column={2} items={[
                { key: 'summary', label: '摘要', span: 2, children: article.summary },
                { key: 'source', label: '文章来源', children: article.sourceName },
                { key: 'sourceUrl', label: '来源链接', children: <Typography.Link href={article.sourceUrl} target="_blank" rel="noreferrer">查看来源</Typography.Link> },
                { key: 'change', label: '变更说明', children: article.changeSummary },
                { key: 'impact', label: '影响范围', children: article.impactScope },
              ]} />
              <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', maxWidth: '75ch', fontSize: 16, lineHeight: 1.8 }}>{article.body}</Typography.Paragraph>
            </Space>,
          },
          {
            key: 'assets', label: `素材与来源（${article.assets.length}）`, children: <Table
              rowKey="id" size="small" pagination={false} dataSource={article.assets}
              columns={[
                { title: '预览', dataIndex: 'previewUrl', width: 180, render: (url, asset) => <Image width={140} height={80} style={{ objectFit: 'cover' }} src={url} alt={asset.name} /> },
                { title: '素材名称', dataIndex: 'name' },
                { title: '用途', dataIndex: 'usage', width: 100, render: (value) => value === 'cover' ? '封面' : '正文' },
                { title: '来源', dataIndex: 'sourceName', width: 140 },
                { title: '授权说明', dataIndex: 'licenseNote' },
                { title: '状态', dataIndex: 'status', width: 100, render: (value) => <Tag color={value === 'enabled' ? 'green' : 'red'}>{value === 'enabled' ? '可用' : '已停用'}</Tag> },
              ]}
            />,
          },
          {
            key: 'effects', label: '内容效果', children: effects ? <Space orientation="vertical" size={16} style={{ width: '100%' }}>
              <Descriptions bordered size="small" column={6} items={[
                { key: 'version', label: '统计版本', children: effects.version },
                { key: 'views', label: '阅读 PV', children: effects.views },
                { key: 'readers', label: '阅读 UV', children: effects.readers },
                { key: 'favorites', label: '收藏人数', children: effects.favorites },
                { key: 'completions', label: '完成人数', children: effects.completions },
                { key: 'rate', label: '完成率', children: `${effects.completionRate}%` },
              ]} />
              <Progress percent={effects.completionRate} status={effects.completionRate < 35 && effects.readers >= 20 ? 'exception' : 'normal'} />
              <Table rowKey="date" size="small" pagination={false} dataSource={effects.trend} columns={[
                { title: '日期', dataIndex: 'date' },
                { title: '阅读 PV', dataIndex: 'views' },
                { title: '阅读 UV', dataIndex: 'readers' },
                { title: '完成人数', dataIndex: 'completions' },
              ]} />
              <Space wrap>{effects.risks.map((risk) => <Tag key={risk.code} color={riskColor[risk.level]}>{risk.label}</Tag>)}</Space>
            </Space> : <Alert showIcon type="info" title="暂无效果数据" />,
          },
          {
            key: 'versions', label: '版本记录', children: <Timeline items={article.versionRecords.map((record) => ({ children: <Space orientation="vertical" size={0}><Typography.Text strong>{record.version} · {record.summary}</Typography.Text><Typography.Text type="secondary">{record.createdBy} · {record.createdAt}</Typography.Text></Space> }))} />,
          },
          {
            key: 'operations', label: '操作记录', children: <Timeline items={article.operationRecords.map((record) => ({ children: <Space orientation="vertical" size={0}><Typography.Text strong>{record.action}</Typography.Text><Typography.Text>{record.reason}</Typography.Text><Typography.Text type="secondary">{record.operator} · {record.time}</Typography.Text></Space> }))} />,
          },
        ]} />
      </Space>
    </PageContainer>
  );
};

export default ArticleDetailPage;
