import { ArrowLeftOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useAccess, useParams } from '@umijs/max';
import {
  App,
  Button,
  Descriptions,
  Popconfirm,
  Result,
  Skeleton,
  Space,
  Tabs,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import StatusTag from '@/components/StatusTag';
import type {
  AdminModuleKey,
  PermissionAction,
} from '@/foundation/permissions';
import {
  submitWrongReasonTagReview,
  wrongReasonTagDetail,
} from '@/services/ant-design-pro/api';
import {
  editableWrongReasonStatuses,
  examTypeOptions,
  getOptionLabel,
  questionTypeOptions,
  wrongReasonCategoryOptions,
  wrongReasonSeverityColor,
  wrongReasonSeverityOptions,
} from '../constants';

const canEditTag = (
  tag: API.WrongReasonTagItem | undefined,
  canAction?: (
    targetModule: AdminModuleKey,
    targetAction: PermissionAction,
  ) => boolean,
) =>
  Boolean(
    tag &&
      canAction?.('content', 'edit') &&
      editableWrongReasonStatuses.includes(tag.status),
  );

const canSubmitTag = (
  tag: API.WrongReasonTagItem | undefined,
  canAction?: (
    targetModule: AdminModuleKey,
    targetAction: PermissionAction,
  ) => boolean,
) =>
  Boolean(
    tag &&
      canAction?.('content', 'submit') &&
      editableWrongReasonStatuses.includes(tag.status),
  );

const WrongReasonTagDetailPage: React.FC = () => {
  const { message } = App.useApp();
  const params = useParams<{ id: string }>();
  const tagId = params.id;
  const access = useAccess() as {
    canAction?: (
      targetModule: AdminModuleKey,
      targetAction: PermissionAction,
    ) => boolean;
  };
  const [tag, setTag] = useState<API.WrongReasonTagItem>();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadTag = async () => {
    if (!tagId) return;
    setLoading(true);
    try {
      const response = await wrongReasonTagDetail(tagId);
      if (response.data) {
        setTag(response.data);
      } else {
        setNotFound(true);
      }
    } catch (error: any) {
      if (error?.data?.errorCode === '404') {
        setNotFound(true);
      } else {
        message.error(
          error?.data?.errorMessage || error?.message || '错因标签加载失败',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTag();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagId]);

  const submitReview = async () => {
    if (!tag) return;
    setSubmitting(true);
    try {
      await submitWrongReasonTagReview(tag.id, {
        changeSummary: tag.changeSummary || '提交错因标签审核。',
      });
      message.success('已提交审核');
      await loadTag();
    } catch (error: any) {
      message.error(
        error?.data?.errorMessage || error?.message || '提交审核失败',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const detailItems = useMemo(() => {
    if (!tag) return [];
    return [
      { key: 'id', label: '标签 ID', children: tag.id },
      { key: 'name', label: '标签名', children: tag.name },
      {
        key: 'category',
        label: '分类',
        children: getOptionLabel(wrongReasonCategoryOptions, tag.category),
      },
      {
        key: 'severity',
        label: '严重级别',
        children: (
          <Tag color={wrongReasonSeverityColor[tag.severity]}>
            {getOptionLabel(wrongReasonSeverityOptions, tag.severity)}
          </Tag>
        ),
      },
      {
        key: 'status',
        label: '状态',
        children: <StatusTag domain="reviewPublish" value={tag.status} />,
      },
      { key: 'referenceCount', label: '引用次数', children: tag.referenceCount },
      { key: 'version', label: '版本', children: tag.version },
      { key: 'creator', label: '创建人', children: tag.creator },
      { key: 'updatedBy', label: '更新人', children: tag.updatedBy },
      { key: 'updatedAt', label: '更新时间', children: tag.updatedAt },
    ];
  }, [tag]);

  if (loading) {
    return (
      <PageContainer title="错因标签详情">
        <Skeleton active paragraph={{ rows: 8 }} />
      </PageContainer>
    );
  }

  if (notFound || !tag) {
    return (
      <PageContainer title="错因标签详情">
        <Result
          status="404"
          title="404"
          subTitle="错因标签不存在。"
          extra={
            <Button onClick={() => history.push('/content/wrong-reason-tags')}>
              返回列表
            </Button>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="错因标签详情"
      extra={[
        <Button
          key="back"
          icon={<ArrowLeftOutlined />}
          onClick={() => history.push('/content/wrong-reason-tags')}
        >
          返回
        </Button>,
        canEditTag(tag, access.canAction) ? (
          <Button
            key="edit"
            onClick={() =>
              history.push(`/content/wrong-reason-tags/${tag.id}/edit`)
            }
          >
            编辑
          </Button>
        ) : null,
        canSubmitTag(tag, access.canAction) ? (
          <Popconfirm
            key="submit"
            title="确认提交审核？"
            description={`错因标签 ${tag.name}（${tag.version}）将进入审核发布中心。`}
            okText="提交审核"
            cancelText="取消"
            onConfirm={submitReview}
          >
            <Button type="primary" loading={submitting}>
              提交审核
            </Button>
          </Popconfirm>
        ) : null,
        tag.reviewTaskId ? (
          <Button
            key="review"
            onClick={() =>
              history.push(`/review-release/pending?keyword=${tag.reviewTaskId}`)
            }
          >
            审核任务
          </Button>
        ) : null,
      ].filter(Boolean)}
    >
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Descriptions column={2} bordered size="small" items={detailItems} />
        <Tabs
          items={[
            {
              key: 'content',
              label: '标签内容',
              children: (
                <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                  <Typography.Text strong>适用考试</Typography.Text>
                  <Space wrap size={[4, 4]}>
                    {tag.examTypes.map((item) => (
                      <Tag key={item}>{getOptionLabel(examTypeOptions, item)}</Tag>
                    ))}
                  </Space>
                  <Typography.Text strong>适用题型</Typography.Text>
                  <Space wrap size={[4, 4]}>
                    {tag.questionTypes.map((item) => (
                      <Tag key={item}>
                        {getOptionLabel(questionTypeOptions, item)}
                      </Tag>
                    ))}
                  </Space>
                  <Typography.Text strong>说明</Typography.Text>
                  <Typography.Paragraph>{tag.description}</Typography.Paragraph>
                  <Typography.Text strong>引用影响</Typography.Text>
                  <Typography.Paragraph type="secondary">
                    {tag.referenceImpact}
                  </Typography.Paragraph>
                </Space>
              ),
            },
            {
              key: 'versions',
              label: '版本记录',
              children: (
                <Timeline
                  items={tag.versionRecords.map((record) => ({
                    children: (
                      <Space orientation="vertical" size={2}>
                        <Typography.Text strong>
                          {record.version} · {record.summary}
                        </Typography.Text>
                        <Typography.Text type="secondary">
                          {record.createdBy} · {record.createdAt}
                        </Typography.Text>
                      </Space>
                    ),
                  }))}
                />
              ),
            },
            {
              key: 'operations',
              label: '操作记录',
              children: (
                <Timeline
                  items={tag.operationRecords.map((record) => ({
                    children: (
                      <Space orientation="vertical" size={2}>
                        <Typography.Text strong>
                          {record.action} · {record.reason}
                        </Typography.Text>
                        <Typography.Text type="secondary">
                          {record.operator} · {record.time}
                        </Typography.Text>
                      </Space>
                    ),
                  }))}
                />
              ),
            },
          ]}
        />
      </Space>
    </PageContainer>
  );
};

export default WrongReasonTagDetailPage;
