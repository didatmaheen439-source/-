import {
  CopyOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SendOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useLocation, useModel, useSearchParams } from '@umijs/max';
import { App, Button, Empty, Space, Tabs, Tag, Typography } from 'antd';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import StatusTag from '@/components/StatusTag';
import {
  copyLearningPathConfig,
  learningPathConfigs,
  submitLearningPathConfigReview,
} from '@/services/ant-design-pro/api';
import {
  editableStatuses,
  examTypeOptions,
  kindLabelMap,
  moduleLabelMap,
  moduleOptions,
  precheckLevelColor,
  precheckLevelText,
  statusValueEnum,
} from '../config';

const getPrefix = (kind: API.LearningPathConfigKind) =>
  kind === 'diagnosis_rule'
    ? '/learning-path/diagnosis-rules'
    : '/learning-path/task-templates';

const getKindFromPath = (pathname: string): API.LearningPathConfigKind =>
  pathname.startsWith('/learning-path/task-templates')
    ? 'today_task_template'
    : 'diagnosis_rule';

const canWriteLearningPath = (roleId?: string) =>
  roleId === 'super_admin' || roleId === 'teaching_reviewer';

const canSubmitLearningPath = canWriteLearningPath;

const getConfigModule = (record: API.LearningPathConfigItem) =>
  record.kind === 'diagnosis_rule'
    ? record.applicableModule
    : record.matchedWeakModules[0];

const getConditionSummary = (record: API.LearningPathConfigItem) => {
  if (record.kind === 'diagnosis_rule') {
    return `${record.conditionGroup.conditions.length} 个判定条件 · ${
      record.conditionGroup.mode === 'all' ? '全部满足' : '任意满足'
    }`;
  }
  return `${record.matchedWeakModules
    .map((item) => moduleLabelMap[item])
    .join('、')} · ${record.weakLevel ?? '-'}`;
};

const getOutputSummary = (record: API.LearningPathConfigItem) => {
  if (record.kind === 'diagnosis_rule') {
    return `${record.output.weakModules
      .map((item) => moduleLabelMap[item])
      .join('、')} · ${record.output.taskPriority} · ${
      record.output.estimatedMinutes
    } 分钟`;
  }
  return `${record.taskItems.length} 项 · ${record.totalEstimatedMinutes} 分钟`;
};

const textEllipsisStyle: React.CSSProperties = {
  display: 'block',
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const LearningPathListPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const diagnosisRef = useRef<ActionType | undefined>(undefined);
  const templateRef = useRef<ActionType | undefined>(undefined);
  const { initialState } = useModel('@@initialState');
  const roleId = initialState?.currentUser?.roleId;
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [activeKey, setActiveKey] = useState(
    searchParams.get('tab') ?? getKindFromPath(location.pathname),
  );

  const canWrite = canWriteLearningPath(roleId);
  const canSubmit = canSubmitLearningPath(roleId);

  useEffect(() => {
    setActiveKey(
      (searchParams.get('tab') as API.LearningPathConfigKind | null) ??
        getKindFromPath(location.pathname),
    );
  }, [location.pathname, searchParams.toString()]);

  const reloadTables = () => {
    diagnosisRef.current?.reload();
    templateRef.current?.reload();
  };

  const submitReview = async (record: API.LearningPathConfigItem) => {
    if (record.lastPrecheck?.level === 'warning') {
      modal.confirm({
        title: '预校验存在警告，确认提交审核？',
        content: record.lastPrecheck.summary,
        okText: '确认提交',
        cancelText: '取消',
        onOk: async () => {
          await submitLearningPathConfigReview(record.id, {
            changeSummary: record.changeSummary,
            dataVersion: record.dataVersion,
            confirmWarnings: true,
          });
          message.success('已提交审核');
          reloadTables();
        },
      });
      return;
    }
    try {
      await submitLearningPathConfigReview(record.id, {
        changeSummary: record.changeSummary,
        dataVersion: record.dataVersion,
      });
      message.success('已提交审核');
      reloadTables();
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '提交失败');
    }
  };

  const copyAsDraft = async (record: API.LearningPathConfigItem) => {
    try {
      const response = await copyLearningPathConfig(record.id);
      if (response.data) {
        message.success('已复制为新草稿');
        history.push(`${getPrefix(response.data.kind)}/${response.data.id}/edit`);
      }
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '复制失败');
    }
  };

  const columns = useMemo<ProColumns<API.LearningPathConfigItem>[]>(
    () => [
      {
        title: '配置 ID',
        dataIndex: 'id',
        width: 230,
        search: false,
        render: (_, record) => (
          <Typography.Text
            copyable={{ text: record.id }}
            ellipsis={{ tooltip: record.id }}
            style={textEllipsisStyle}
          >
            {record.id}
          </Typography.Text>
        ),
      },
      {
        title: '配置名称',
        dataIndex: 'keyword',
        width: 280,
        render: (_, record) => (
          <Space
            orientation="vertical"
            size={0}
            style={{ width: '100%', minWidth: 0 }}
          >
            <Button
              type="link"
              size="small"
              title={record.name}
              style={{
                ...textEllipsisStyle,
                height: 22,
                padding: 0,
                textAlign: 'left',
              }}
              onClick={() => history.push(`${getPrefix(record.kind)}/${record.id}`)}
            >
              {record.name}
            </Button>
            <Typography.Text
              type="secondary"
              ellipsis={{ tooltip: record.description || record.changeSummary }}
              style={textEllipsisStyle}
            >
              {record.description || record.changeSummary}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: '考试类型',
        dataIndex: 'examType',
        width: 110,
        valueEnum: Object.fromEntries(
          examTypeOptions.map((item) => [item.value, { text: item.label }]),
        ),
      },
      {
        title: '业务模块',
        dataIndex: 'module',
        width: 130,
        valueEnum: Object.fromEntries(
          moduleOptions.map((item) => [item.value, { text: item.label }]),
        ),
        render: (_, record) => {
          const moduleName = getConfigModule(record);
          return moduleName ? moduleLabelMap[moduleName] : '-';
        },
      },
      {
        title: '优先级',
        dataIndex: 'priority',
        width: 100,
        sorter: true,
      },
      {
        title: '条件摘要',
        dataIndex: 'conditionType',
        search: activeKey !== 'today_task_template',
        width: 220,
        render: (_, record) => getConditionSummary(record),
      },
      {
        title: '输出/任务',
        dataIndex: 'outputSummary',
        search: false,
        width: 220,
        render: (_, record) => getOutputSummary(record),
      },
      {
        title: '总时长下限',
        dataIndex: 'totalMinutesMin',
        valueType: 'digit',
        hideInTable: true,
        hideInSearch: activeKey !== 'today_task_template',
      },
      {
        title: '总时长上限',
        dataIndex: 'totalMinutesMax',
        valueType: 'digit',
        hideInTable: true,
        hideInSearch: activeKey !== 'today_task_template',
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 120,
        valueEnum: statusValueEnum,
        render: (_, record) => (
          <StatusTag domain="reviewPublish" value={record.status} />
        ),
      },
      {
        title: '版本',
        dataIndex: 'version',
        width: 90,
        search: false,
      },
      {
        title: '预校验',
        dataIndex: ['lastPrecheck', 'level'],
        width: 110,
        search: false,
        render: (_, record) =>
          record.lastPrecheck ? (
            <Tag color={precheckLevelColor[record.lastPrecheck.level]}>
              {precheckLevelText[record.lastPrecheck.level]}
            </Tag>
          ) : (
            '-'
          ),
      },
      {
        title: '更新人',
        dataIndex: 'updatedBy',
        width: 120,
        search: false,
      },
      {
        title: '更新时间',
        dataIndex: 'updatedAt',
        valueType: 'dateTime',
        width: 180,
        search: false,
        sorter: true,
      },
      {
        title: '更新时间',
        dataIndex: 'updatedAtRange',
        valueType: 'dateRange',
        hideInTable: true,
      },
      {
        title: '操作',
        valueType: 'option',
        fixed: 'right',
        width: 250,
        render: (_, record) => (
          <Space size={0}>
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => history.push(`${getPrefix(record.kind)}/${record.id}`)}
            >
              查看
            </Button>
            {canWrite && editableStatuses.includes(record.status) ? (
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() =>
                  history.push(`${getPrefix(record.kind)}/${record.id}/edit`)
                }
              >
                编辑
              </Button>
            ) : null}
            {canSubmit && editableStatuses.includes(record.status) ? (
              <Button
                type="link"
                size="small"
                icon={<SendOutlined />}
                onClick={() => submitReview(record)}
              >
                提交审核
              </Button>
            ) : null}
            {canWrite && !editableStatuses.includes(record.status) ? (
              <Button
                type="link"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => copyAsDraft(record)}
              >
                复制草稿
              </Button>
            ) : null}
          </Space>
        ),
      },
    ],
    [activeKey, canSubmit, canWrite],
  );

  const renderTable = (kind: API.LearningPathConfigKind) => (
    <ProTable<API.LearningPathConfigItem>
      actionRef={kind === 'diagnosis_rule' ? diagnosisRef : templateRef}
      rowKey="id"
      columns={columns}
      request={async (params, sorter) => {
        const response = await learningPathConfigs({
          ...params,
          kind,
          sorter: Object.keys(sorter ?? {}).join(','),
        });
        return {
          data: response.data ?? [],
          total: response.total,
          success: response.success,
        };
      }}
      pagination={{
        defaultPageSize: 20,
        pageSizeOptions: [20, 50, 100],
        showSizeChanger: true,
      }}
      search={{ labelWidth: 90, defaultCollapsed: false }}
      scroll={{ x: 2160 }}
      locale={{
        emptyText: (
          <Empty
            description={
              kind === 'diagnosis_rule'
                ? '暂无诊断规则'
                : '暂无今日任务模板'
            }
          />
        ),
      }}
      toolBarRender={() => [
        <Button key="refresh" icon={<ReloadOutlined />} onClick={reloadTables}>
          刷新
        </Button>,
        canWrite ? (
          <Button
            key="new"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => history.push(`${getPrefix(kind)}/new`)}
          >
            {kind === 'diagnosis_rule' ? '新增诊断规则' : '新增任务模板'}
          </Button>
        ) : null,
      ]}
    />
  );

  return (
    <PageContainer
      title="学习路径配置"
      content="管理诊断规则和今日任务模板，提交后进入审核发布中心。"
    >
      <Tabs
        activeKey={activeKey}
        onChange={(key) => {
          const nextKind = key as API.LearningPathConfigKind;
          setActiveKey(nextKind);
          history.push(getPrefix(nextKind));
        }}
        items={[
          {
            key: 'diagnosis_rule',
            label: kindLabelMap.diagnosis_rule,
            children: renderTable('diagnosis_rule'),
          },
          {
            key: 'today_task_template',
            label: kindLabelMap.today_task_template,
            children: renderTable('today_task_template'),
          },
        ]}
      />
    </PageContainer>
  );
};

export default LearningPathListPage;
