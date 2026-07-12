import { ArrowLeftOutlined, SaveOutlined, SendOutlined } from '@ant-design/icons';
import {
  PageContainer,
  ProForm,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { history, useModel, useParams } from '@umijs/max';
import { Alert, App, Button, Descriptions, Form, Image, Result, Skeleton, Space, Tag } from 'antd';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import StatusTag from '@/components/StatusTag';
import {
  contentArticleAssets,
  contentArticleDetail,
  createContentArticle,
  submitContentArticleReview,
  updateContentArticle,
} from '@/services/ant-design-pro/api';
import {
  articleCategoryOptions,
  articleDifficultyOptions,
  editableArticleStatuses,
  examTypeOptions,
} from '../constants';

type ArticleFormValues = Omit<API.ArticleSaveParams, 'dataVersion' | 'confirmWarnings'>;

const toFormValues = (article: API.ArticleItem): ArticleFormValues => ({
  title: article.title,
  category: article.category,
  summary: article.summary,
  body: article.body,
  difficulty: article.difficulty,
  examTypes: article.examTypes,
  sourceName: article.sourceName,
  sourceUrl: article.sourceUrl,
  assetIds: article.assets.map((item) => item.id),
  changeSummary: article.changeSummary,
  impactScope: article.impactScope,
});

const ArticleEditPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isCreate = !id;
  const { message } = App.useApp();
  const { initialState } = useModel('@@initialState');
  const [form] = Form.useForm<ArticleFormValues>();
  const [article, setArticle] = useState<API.ArticleItem>();
  const [assets, setAssets] = useState<API.ArticleAsset[]>([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const selectedAssetIds = Form.useWatch('assetIds', form) ?? [];
  const canWrite = ['super_admin', 'content_operator'].includes(initialState?.currentUser?.roleId ?? '');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [assetResponse, articleResponse] = await Promise.all([
          contentArticleAssets(),
          id ? contentArticleDetail(id) : Promise.resolve(undefined),
        ]);
        setAssets(assetResponse.data);
        if (articleResponse?.data) {
          setArticle(articleResponse.data);
          form.setFieldsValue(toFormValues(articleResponse.data));
        }
      } catch (error: any) {
        message.error(error?.data?.errorMessage || error?.message || '外刊加载失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [form, id, message]);

  const selectedAssets = useMemo(
    () => assets.filter((asset) => selectedAssetIds.includes(asset.id)),
    [assets, selectedAssetIds],
  );

  const save = async (submitAfterSave: boolean) => {
    const values = await form.validateFields();
    if (submitAfterSave && !values.changeSummary?.trim()) {
      form.setFields([{ name: 'changeSummary', errors: ['保存并提交审核需要填写变更说明'] }]);
      return;
    }
    setSaving(true);
    try {
      const payload: API.ArticleSaveParams = { ...values, dataVersion: article?.dataVersion };
      const response = isCreate
        ? await createContentArticle(payload)
        : await updateContentArticle(id as string, payload);
      if (submitAfterSave) {
        await submitContentArticleReview(response.data.id, {
          changeSummary: values.changeSummary?.trim() || '提交外刊审核。',
          dataVersion: response.data.dataVersion,
          confirmWarnings: true,
        });
        message.success('外刊已保存并提交审核');
      } else {
        message.success('外刊草稿已保存');
      }
      history.push(`/content-operations/articles/${response.data.id}`);
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageContainer title={isCreate ? '新建外刊' : '编辑外刊'}><Skeleton active paragraph={{ rows: 12 }} /></PageContainer>;
  if (!canWrite) return <PageContainer title="外刊内容"><Result status="403" title="无权编辑外刊内容" extra={<Button onClick={() => history.push('/content-operations/articles')}>返回列表</Button>} /></PageContainer>;
  if (!isCreate && (!article || !editableArticleStatuses.includes(article.status))) {
    return <PageContainer title="编辑外刊"><Result status="403" title="当前状态不可编辑" subTitle="已提交或已发布文章需要复制为新草稿。" extra={<Button onClick={() => history.push(`/content-operations/articles/${id}`)}>返回详情</Button>} /></PageContainer>;
  }

  return (
    <PageContainer
      title={isCreate ? '新建外刊' : '编辑外刊'}
      extra={<Button icon={<ArrowLeftOutlined />} onClick={() => history.push('/content-operations/articles')}>返回列表</Button>}
    >
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        {article ? <Descriptions bordered size="small" column={4} items={[
          { key: 'id', label: '文章 ID', children: article.id },
          { key: 'status', label: '状态', children: <StatusTag domain="reviewPublish" value={article.status} /> },
          { key: 'version', label: '版本', children: article.version },
          { key: 'dataVersion', label: '数据版本', children: article.dataVersion },
        ]} /> : null}
        <ProForm<ArticleFormValues>
          form={form}
          layout="vertical"
          grid
          initialValues={{ difficulty: 'medium', examTypes: ['CET4'], assetIds: [] }}
          submitter={false}
        >
          <ProFormText name="title" label="文章标题" colProps={{ span: 16 }} rules={[{ required: true }, { max: 120 }]} />
          <ProFormSelect name="category" label="分类" colProps={{ span: 8 }} options={articleCategoryOptions} rules={[{ required: true }]} />
          <ProFormTextArea name="summary" label="摘要" colProps={{ span: 24 }} fieldProps={{ rows: 3, showCount: true, maxLength: 300 }} rules={[{ required: true }]} />
          <ProFormTextArea name="body" label="正文" colProps={{ span: 24 }} fieldProps={{ rows: 18 }} rules={[{ required: true }]} />
          <ProFormSelect name="difficulty" label="难度" colProps={{ span: 8 }} options={articleDifficultyOptions} rules={[{ required: true }]} />
          <ProFormSelect name="examTypes" label="适用考试" colProps={{ span: 8 }} mode="multiple" options={examTypeOptions} rules={[{ required: true }]} />
          <ProFormSelect
            name="assetIds"
            label="文章素材"
            colProps={{ span: 8 }}
            mode="multiple"
            options={assets.map((asset) => ({ label: `${asset.name}${asset.status === 'disabled' ? '（已停用）' : ''}`, value: asset.id, disabled: asset.status === 'disabled' }))}
            rules={[{ required: true, message: '至少选择一个封面素材' }]}
          />
          <ProFormText name="sourceName" label="文章来源" colProps={{ span: 8 }} rules={[{ required: true }]} />
          <ProFormText name="sourceUrl" label="来源链接" colProps={{ span: 16 }} rules={[{ required: true }, { type: 'url' }]} />
          <ProFormTextArea name="changeSummary" label="变更说明" colProps={{ span: 12 }} fieldProps={{ rows: 3 }} />
          <ProFormTextArea name="impactScope" label="影响范围" colProps={{ span: 12 }} fieldProps={{ rows: 3 }} />
        </ProForm>

        {selectedAssets.length ? (
          <Descriptions title="素材预览" bordered size="small" column={1} items={selectedAssets.map((asset) => ({
            key: asset.id,
            label: asset.name,
            children: <Space align="start" size={16}><Image width={180} height={100} style={{ objectFit: 'cover' }} src={asset.previewUrl} alt={asset.name} /><Space orientation="vertical" size={4}><Tag color={asset.status === 'enabled' ? 'green' : 'red'}>{asset.status === 'enabled' ? '可用' : '已停用'}</Tag><span>{asset.sourceName}</span><span>{asset.licenseNote}</span></Space></Space>,
          }))} />
        ) : <Alert showIcon type="warning" title="请选择至少一个可用封面素材" />}

        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => history.push('/content-operations/articles')}>取消</Button>
          <Button icon={<SaveOutlined />} loading={saving} onClick={() => save(false)}>保存草稿</Button>
          <Button type="primary" icon={<SendOutlined />} loading={saving} onClick={() => save(true)}>保存并提交审核</Button>
        </Space>
      </Space>
    </PageContainer>
  );
};

export default ArticleEditPage;
