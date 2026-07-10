import { ArrowLeftOutlined, CopyOutlined, EditOutlined } from '@ant-design/icons';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useModel, useParams } from '@umijs/max';
import {
  App,
  Button,
  Descriptions,
  Empty,
  Result,
  Space,
  Spin,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import StatusTag from '@/components/StatusTag';
import {
  copyLearningPathConfig,
  learningPathConfigDetail,
  learningPathConfigVersions,
} from '@/services/ant-design-pro/api';
import {
  editableStatuses,
  kindLabelMap,
  moduleLabelMap,
  precheckLevelColor,
  precheckLevelText,
} from '../config';
import PrecheckResult from './PrecheckResult';

type DetailPageProps = {
  kind: API.LearningPathConfigKind;
};

const DetailPage: React.FC<DetailPageProps> = ({ kind }) => {
  const { id = '' } = useParams();
  const { message } = App.useApp();
  const { initialState } = useModel('@@initialState');
  const roleId = initialState?.currentUser?.roleId;
  const [detail, setDetail] = useState<API.LearningPathConfigItem>();
  const [loading, setLoading] = useState(true);
  const canWrite = roleId === 'super_admin' || roleId === 'teaching_reviewer';
  const canEdit = Boolean(
    canWrite && detail && editableStatuses.includes(detail.status),
  );
  const listPath =
    kind === 'diagnosis_rule'
      ? '/learning-path/diagnosis-rules'
      : '/learning-path/task-templates';

  const loadDetail = async () => {
    setLoading(true);
    try {
      const response = await learningPathConfigDetail(id);
      if (response.data?.kind === kind) {
        setDetail(response.data);
      } else {
        setDetail(undefined);
      }
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id, kind]);

  const copyAsDraft = async () => {
    const response = await copyLearningPathConfig(id);
    if (response.data) {
      message.success('已复制为新草稿');
      const prefix =
        response.data.kind === 'diagnosis_rule'
          ? '/learning-path/diagnosis-rules'
          : '/learning-path/task-templates';
      history.push(`${prefix}/${response.data.id}/edit`);
    }
  };

  const taskTotalMinutes = useMemo(() => {
    if (detail?.kind !== 'today_task_template') return 0;
    return detail.taskItems.reduce(
      (sum, item) => sum + Number(item.estimatedMinutes || 0),
      0,
    );
  }, [detail]);

  if (loading) {
    return (
      <PageContainer title="学习路径配置详情">
        <Spin />
      </PageContainer>
    );
  }

  if (!detail) {
    return (
      <Result
        status="404"
        title="404"
        subTitle="学习路径配置不存在或类型不匹配。"
        extra={<Button onClick={() => history.push(listPath)}>返回列表</Button>}
      />
    );
  }

  return (
    <PageContainer
      title={detail.name}
      extra={
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => history.push(listPath)}
          >
            返回
          </Button>
          <StatusTag domain="reviewPublish" value={detail.status} />
          <Button
            icon={<EditOutlined />}
            disabled={!canEdit}
            onClick={() => {
              const prefix =
                detail.kind === 'diagnosis_rule'
                  ? '/learning-path/diagnosis-rules'
                  : '/learning-path/task-templates';
              history.push(`${prefix}/${detail.id}/edit`);
            }}
          >
            编辑
          </Button>
          {canWrite && !editableStatuses.includes(detail.status) ? (
            <Button icon={<CopyOutlined />} onClick={copyAsDraft}>
              复制为草稿
            </Button>
          ) : null}
        </Space>
      }
    >
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Descriptions bordered size="small" column={3}>
          <Descriptions.Item label="配置 ID">{detail.id}</Descriptions.Item>
          <Descriptions.Item label="类型">
            {kindLabelMap[detail.kind]}
          </Descriptions.Item>
          <Descriptions.Item label="考试类型">{detail.examType}</Descriptions.Item>
          <Descriptions.Item label="版本">{detail.version}</Descriptions.Item>
          <Descriptions.Item label="数据版本">
            {detail.dataVersion}
          </Descriptions.Item>
          <Descriptions.Item label="优先级">{detail.priority}</Descriptions.Item>
          <Descriptions.Item label="创建人">{detail.createdBy}</Descriptions.Item>
          <Descriptions.Item label="更新人">{detail.updatedBy}</Descriptions.Item>
          <Descriptions.Item label="更新时间">{detail.updatedAt}</Descriptions.Item>
          <Descriptions.Item label="审核任务">
            {detail.reviewTaskId ? (
              <Button
                type="link"
                size="small"
                onClick={() => history.push('/review-release/pending')}
              >
                {detail.reviewTaskId}
              </Button>
            ) : (
              '-'
            )}
          </Descriptions.Item>
          <Descriptions.Item label="发布版本">
            {detail.releaseVersionId || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="最近预校验">
            {detail.lastPrecheck ? (
              <Tag color={precheckLevelColor[detail.lastPrecheck.level]}>
                {precheckLevelText[detail.lastPrecheck.level]}
              </Tag>
            ) : (
              '-'
            )}
          </Descriptions.Item>
          <Descriptions.Item label="说明" span={3}>
            {detail.description || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="变更说明" span={3}>
            {detail.changeSummary}
          </Descriptions.Item>
        </Descriptions>

        {detail.kind === 'diagnosis_rule' ? (
          <>
            <Descriptions title="诊断条件与输出" bordered size="small" column={2}>
              <Descriptions.Item label="适用模块">
                {moduleLabelMap[detail.applicableModule]}
              </Descriptions.Item>
              <Descriptions.Item label="题目范围">
                {detail.questionRange}
              </Descriptions.Item>
              <Descriptions.Item label="条件关系">
                {detail.conditionGroup.mode === 'all' ? '全部满足' : '任意满足'}
              </Descriptions.Item>
              <Descriptions.Item label="输出薄弱等级">
                {detail.output.weakLevel}
              </Descriptions.Item>
              <Descriptions.Item label="输出模块" span={2}>
                <Space wrap>
                  {detail.output.weakModules.map((item) => (
                    <Tag key={item}>{moduleLabelMap[item]}</Tag>
                  ))}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="输出说明" span={2}>
                {detail.output.outputDescription}
              </Descriptions.Item>
            </Descriptions>
            <ProTable<API.DiagnosisRuleCondition>
              rowKey="id"
              search={false}
              pagination={false}
              dataSource={detail.conditionGroup.conditions}
              options={false}
              columns={[
                { title: '指标', dataIndex: 'metric' },
                { title: '运算符', dataIndex: 'operator' },
                { title: '数值', dataIndex: 'value' },
                { title: '最小值', dataIndex: 'min' },
                { title: '最大值', dataIndex: 'max' },
                { title: '错因标签', dataIndex: 'errorTag' },
                { title: '说明', dataIndex: 'description' },
              ]}
            />
            <ProTable<API.LearningPathReference>
              rowKey="id"
              search={false}
              pagination={false}
              dataSource={detail.references}
              options={false}
              locale={{ emptyText: <Empty description="暂无引用对象" /> }}
              columns={[
                { title: '引用 ID', dataIndex: 'id', copyable: true },
                { title: '名称', dataIndex: 'name' },
                { title: '类型', dataIndex: 'type' },
                { title: '模块', dataIndex: 'module', renderText: (value) => moduleLabelMap[value as API.LearningPathModule] },
                { title: '状态', dataIndex: 'status' },
                {
                  title: '可用',
                  dataIndex: 'available',
                  render: (_, record) =>
                    record.available ? <Tag color="success">可用</Tag> : <Tag color="error">不可用</Tag>,
                },
              ]}
            />
          </>
        ) : (
          <>
            <Descriptions title="任务模板" bordered size="small" column={3}>
              <Descriptions.Item label="命中薄弱模块">
                <Space wrap>
                  {detail.matchedWeakModules.map((item) => (
                    <Tag key={item}>{moduleLabelMap[item]}</Tag>
                  ))}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="薄弱等级">
                {detail.weakLevel || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="总预计分钟">
                {taskTotalMinutes}
              </Descriptions.Item>
              <Descriptions.Item label="允许替换">
                {detail.replacementAllowed ? '是' : '否'}
              </Descriptions.Item>
              <Descriptions.Item label="模板说明" span={2}>
                {detail.templateDescription || '-'}
              </Descriptions.Item>
            </Descriptions>
            <ProTable<API.LearningPathTaskItem>
              rowKey="id"
              search={false}
              pagination={false}
              dataSource={detail.taskItems}
              options={false}
              columns={[
                { title: '顺序', dataIndex: 'order', width: 80 },
                { title: '模块', dataIndex: 'module', renderText: (value) => moduleLabelMap[value as API.LearningPathModule] },
                { title: '任务类型', dataIndex: 'taskType' },
                { title: '内容 ID', dataIndex: 'contentId', copyable: true },
                { title: '内容名称', dataIndex: 'contentName' },
                { title: '预计分钟', dataIndex: 'estimatedMinutes' },
                {
                  title: '必做',
                  dataIndex: 'required',
                  render: (_, record) => (record.required ? '是' : '否'),
                },
                {
                  title: '可替换',
                  dataIndex: 'replacementAllowed',
                  render: (_, record) =>
                    record.replacementAllowed ? '是' : '否',
                },
              ]}
            />
          </>
        )}

        <PrecheckResult result={detail.lastPrecheck} />

        <ProTable<API.LearningPathConfigVersion>
          rowKey="id"
          headerTitle="版本记录"
          search={false}
          options={false}
          request={async (params) => {
            const response = await learningPathConfigVersions(id, params);
            return {
              data: response.data ?? [],
              total: response.total,
              success: response.success,
            };
          }}
          columns={[
            { title: '版本', dataIndex: 'version', width: 100 },
            {
              title: '状态',
              dataIndex: 'status',
              width: 120,
              render: (_, record) => (
                <StatusTag domain="reviewPublish" value={record.status} />
              ),
            },
            { title: '变更说明', dataIndex: 'changeSummary' },
            { title: '创建人', dataIndex: 'createdBy', width: 120 },
            { title: '创建时间', dataIndex: 'createdAt', valueType: 'dateTime', width: 180 },
            {
              title: '线上版本',
              dataIndex: 'currentOnline',
              width: 100,
              render: (_, record) =>
                record.currentOnline ? <Tag color="success">当前</Tag> : '-',
            },
          ]}
        />

        <Timeline
          items={detail.operationRecords.map((item) => ({
            content: (
              <Space orientation="vertical" size={2}>
                <Space>
                  <Tag color="blue">{item.action}</Tag>
                  {item.toStatus ? (
                    <StatusTag domain="reviewPublish" value={item.toStatus} />
                  ) : null}
                </Space>
                <Typography.Text>{item.reason}</Typography.Text>
                <Typography.Text type="secondary">
                  {item.operator} · {item.roleName} · {item.time}
                </Typography.Text>
              </Space>
            ),
          }))}
        />
      </Space>
    </PageContainer>
  );
};

export default DetailPage;
