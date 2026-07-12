import { ArrowLeftOutlined, SafetyCertificateOutlined, SaveOutlined, SendOutlined } from '@ant-design/icons';
import { PageContainer, ProForm, ProFormDatePicker, ProFormText, ProFormTextArea } from '@ant-design/pro-components';
import { history, useAccess, useParams, useSearchParams } from '@umijs/max';
import { App, Button, Card, Col, Form, Result, Row, Select, Skeleton, Space, Tag, Typography } from 'antd';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { AdminModuleKey, PermissionAction } from '@/foundation/permissions';
import {
  createDailySentence,
  dailySentenceDetail,
  dailySentenceImageAssets,
  precheckDailySentence,
  submitDailySentenceReview,
  updateDailySentence,
} from '@/services/ant-design-pro/api';
import DailySentencePreview from '../components/DailySentencePreview';
import { editableStatuses, precheckColor, precheckText } from '../config';

type FormValues = Omit<API.DailySentenceSaveParams, 'dataVersion'>;

const DailySentenceEditPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const isCreate = !id;
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const access = useAccess() as { canAction?: (module: AdminModuleKey, action: PermissionAction) => boolean };
  const [item, setItem] = useState<API.DailySentenceItem>();
  const [assets, setAssets] = useState<API.DailySentenceImageAsset[]>([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const watched = Form.useWatch([], form) as FormValues | undefined;

  const canSave = isCreate
    ? Boolean(access.canAction?.('content', 'create'))
    : Boolean(item && access.canAction?.('content', 'edit') && editableStatuses.includes(item.status));

  useEffect(() => {
    dailySentenceImageAssets().then((response) => setAssets(response.data ?? []));
    if (!id) {
      form.setFieldsValue({
        contentDate: searchParams.get('date') || undefined,
        changeSummary: '新增每日一句内容。',
        impactScope: '影响目标日期每日一句展示。',
      } as FormValues);
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const response = await dailySentenceDetail(id);
        if (!response.data) return setNotFound(true);
        setItem(response.data);
        form.setFieldsValue({
          contentDate: response.data.contentDate,
          quote: response.data.quote,
          translation: response.data.translation,
          displaySource: response.data.displaySource,
          sourceReference: response.data.sourceReference,
          imageAssetId: response.data.imageAssetId,
          changeSummary: response.data.changeSummary,
          impactScope: response.data.impactScope,
        });
      } catch (error: any) {
        if (error?.data?.errorCode === '404') setNotFound(true);
        else message.error(error?.data?.errorMessage || error?.message || '内容加载失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [form, id, message, searchParams]);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === watched?.imageAssetId) ?? item?.imageAsset,
    [assets, item?.imageAsset, watched?.imageAssetId],
  );

  const payload = (values: FormValues): API.DailySentenceSaveParams => ({
    ...values,
    dataVersion: item?.dataVersion,
  });

  const save = async (values?: FormValues) => {
    const nextValues = values ?? await form.validateFields();
    setSaving(true);
    try {
      const response = isCreate
        ? await createDailySentence(payload(nextValues))
        : await updateDailySentence(id as string, payload(nextValues));
      if (!response.data) return undefined;
      setItem(response.data);
      message.success('草稿已保存');
      if (isCreate) history.replace(`/content-operations/daily-sentences/${response.data.id}/edit`);
      return response.data;
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '保存失败');
      return undefined;
    } finally {
      setSaving(false);
    }
  };

  const showPrecheck = async () => {
    const values = await form.validateFields();
    try {
      const response = await precheckDailySentence({ ...payload(values), id });
      const result = response.data;
      if (!result) return;
      modal.info({
        title: `预校验${precheckText[result.level]}`,
        width: 720,
        content: (
          <Space orientation="vertical" size={8} style={{ width: '100%' }}>
            <Typography.Text>{result.summary}</Typography.Text>
            {result.issues.map((issue) => <Tag key={issue.id} color={precheckColor[issue.level]}>{issue.code} / {issue.field}：{issue.message}</Tag>)}
          </Space>
        ),
      });
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '预校验失败');
    }
  };

  const submit = async (confirmWarnings = false) => {
    const saved = await save();
    if (!saved) return;
    try {
      await submitDailySentenceReview(saved.id, {
        changeSummary: saved.changeSummary,
        dataVersion: saved.dataVersion,
        confirmWarnings,
      });
      message.success('已提交审核');
      history.push(`/content-operations/daily-sentences/${saved.id}`);
    } catch (error: any) {
      const result = error?.data?.data as API.DailySentencePrecheckResult | undefined;
      if (result?.level === 'warning' && !confirmWarnings) {
        modal.confirm({ title: '预校验存在警告，确认提交？', content: result.summary, okText: '确认提交', onOk: () => submit(true) });
        return;
      }
      message.error(error?.data?.errorMessage || error?.message || '提交审核失败');
    }
  };

  if (loading) return <PageContainer><Skeleton active /></PageContainer>;
  if (notFound) return <PageContainer><Result status="404" title="每日一句不存在" extra={<Button onClick={() => history.push('/content-operations/daily-sentences')}>返回列表</Button>} /></PageContainer>;
  if (!canSave) return <PageContainer><Result status="403" title="当前内容不可编辑" extra={<Button onClick={() => history.push(`/content-operations/daily-sentences/${id}`)}>查看详情</Button>} /></PageContainer>;

  return (
    <PageContainer
      title={isCreate ? '新增每日一句' : `编辑每日一句 ${item?.contentDate ?? ''}`}
      extra={<Button icon={<ArrowLeftOutlined />} onClick={() => history.push('/content-operations/daily-sentences')}>返回列表</Button>}
    >
      <Row gutter={20} align="top">
        <Col xs={24} xl={15}>
          <ProForm<FormValues>
            form={form}
            layout="vertical"
            submitter={false}
            onFinish={async (values) => Boolean(await save(values))}
          >
            <Card title="内容与日期" size="small" style={{ marginBottom: 16 }}>
              <ProFormDatePicker name="contentDate" label="内容日期" width="md" rules={[{ required: true, message: '请选择内容日期' }]} fieldProps={{ format: 'YYYY-MM-DD' }} />
              <ProFormTextArea name="quote" label="英文句子" rules={[{ required: true }]} fieldProps={{ rows: 3, maxLength: 500, showCount: true }} />
              <ProFormTextArea name="translation" label="中文译文" rules={[{ required: true }]} fieldProps={{ rows: 3, maxLength: 500, showCount: true }} />
            </Card>
            <Card title="来源与配图" size="small" style={{ marginBottom: 16 }}>
              <ProFormText name="displaySource" label="展示出处" rules={[{ required: true }]} placeholder="作者，《作品名》" />
              <ProFormTextArea name="sourceReference" label="来源凭证" rules={[{ required: true }]} placeholder="原文链接、书目信息或可核验资料说明" fieldProps={{ rows: 2, maxLength: 500, showCount: true }} />
              <Form.Item name="imageAssetId" label="配图引用" rules={[{ required: true, message: '请选择有效配图' }]}>
                <Select
                  placeholder="选择 Mock 图片素材"
                  options={assets.map((asset) => ({ label: `${asset.name} · ${asset.source}`, value: asset.id, disabled: asset.status !== 'active' }))}
                  optionRender={(option) => {
                    const asset = assets.find((entry) => entry.id === option.value);
                    return <Space><img src={asset?.thumbnailUrl} alt="" width={32} height={42} style={{ objectFit: 'cover', borderRadius: 3 }} /><span>{option.label}</span>{asset?.status !== 'active' ? <Tag>已停用</Tag> : null}</Space>;
                  }}
                />
              </Form.Item>
              {selectedAsset ? <Typography.Text type="secondary">{selectedAsset.name}，{selectedAsset.copyrightNote}</Typography.Text> : null}
            </Card>
            <Card title="变更信息" size="small">
              <ProFormTextArea name="changeSummary" label="变更摘要" rules={[{ required: true }]} fieldProps={{ rows: 2, maxLength: 200, showCount: true }} />
              <ProFormTextArea name="impactScope" label="影响范围" rules={[{ required: true }]} fieldProps={{ rows: 2, maxLength: 200, showCount: true }} />
            </Card>
          </ProForm>
        </Col>
        <Col xs={24} xl={9}>
          <div style={{ position: 'sticky', top: 16 }}>
            <Card title="用户侧预览" size="small">
              <DailySentencePreview value={{ contentDate: String(watched?.contentDate ?? item?.contentDate ?? ''), quote: watched?.quote ?? '', translation: watched?.translation ?? '', displaySource: watched?.displaySource ?? '', imageUrl: selectedAsset?.url }} />
            </Card>
          </div>
        </Col>
      </Row>
      <Card size="small" style={{ marginTop: 16 }}>
        <Space wrap>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={() => save()}>保存草稿</Button>
          <Button icon={<SafetyCertificateOutlined />} onClick={showPrecheck}>运行预校验</Button>
          {access.canAction?.('content', 'submit') ? <Button icon={<SendOutlined />} onClick={() => submit()}>保存并提交审核</Button> : null}
        </Space>
      </Card>
    </PageContainer>
  );
};

export default DailySentenceEditPage;
