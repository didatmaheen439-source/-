import {
  CopyOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SendOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useAccess, useModel, useSearchParams } from '@umijs/max';
import { App, Button, Modal, Space, Tabs, Tag, Tooltip, Typography } from 'antd';
import type React from 'react';
import { useMemo, useRef, useState } from 'react';
import PermissionButton from '@/components/PermissionButton';
import StatusTag from '@/components/StatusTag';
import type { AdminModuleKey, PermissionAction } from '@/foundation/permissions';
import {
  aiCoachStrategies,
  copyAiCoachStrategy,
  precheckAiCoachStrategy,
  submitAiCoachStrategyReview,
  validateAiCoachStrategySamples,
} from '@/services/ant-design-pro/api';
import {
  businessSceneOptions,
  businessSceneText,
  configTypeOptions,
  configTypeText,
  editableStatuses,
  precheckLevelColor,
  precheckLevelText,
  riskLevelColor,
  riskLevelOptions,
  riskLevelText,
  statusValueEnum,
  textEllipsisStyle,
} from './config';

const canWriteAiCoach = (roleId?: string) =>
  roleId === 'super_admin' || roleId === 'ai_operator';

const AiCoachStrategiesPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeKey, setActiveKey] = useState(
    searchParams.get('configType') ?? 'all',
  );
  const { initialState } = useModel('@@initialState');
  const roleId = initialState?.currentUser?.roleId;
  const access = useAccess() as {
    canAction?: (
      moduleKey: AdminModuleKey,
      targetAction: PermissionAction,
    ) => boolean;
  };

  const canCreate = access.canAction?.('aiCoach', 'create') && canWriteAiCoach(roleId);
  const canEdit = access.canAction?.('aiCoach', 'edit') && canWriteAiCoach(roleId);
  const canSubmit = access.canAction?.('aiCoach', 'submit') && canWriteAiCoach(roleId);

  const reload = () => actionRef.current?.reload();

  const goDetail = (record: API.AiCoachStrategy) => {
    history.push(`/ai-coach/prompts/${record.id}`);
  };

  const handleCopy = async (record: API.AiCoachStrategy) => {
    try {
      const response = await copyAiCoachStrategy(record.id);
      if (response.data) {
        message.success('已创建新草稿版本');
        history.push(`/ai-coach/prompts/${response.data.id}/edit`);
      }
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '复制失败');
    }
  };

  const runPrecheck = async (record: API.AiCoachStrategy) => {
    try {
      const response = await precheckAiCoachStrategy({
        strategyId: record.id,
        title: record.title,
        description: record.description,
        configType: record.configType,
        businessScenes: record.businessScenes,
        examTypes: record.examTypes,
        body: record.body,
        riskPolicy: record.riskPolicy,
        validationCases: record.validationCases,
        changeSummary: record.changeSummary,
        impactScope: record.impactScope,
        dataVersion: record.dataVersion,
      });
      const result = response.data;
      if (!result) return;
      Modal.info({
        title: `预校验${precheckLevelText[result.level]}`,
        content: (
          <Space orientation="vertical" size={8}>
            <Typography.Text>{result.summary}</Typography.Text>
            {result.issues.map((item) => (
              <Tag key={item.id} color={precheckLevelColor[item.level]}>
                {item.field}：{item.message}
              </Tag>
            ))}
          </Space>
        ),
      });
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '预校验失败');
    }
  };

  const runSampleValidation = async (record: API.AiCoachStrategy) => {
    try {
      const response = await validateAiCoachStrategySamples({
        strategyId: record.id,
        title: record.title,
        description: record.description,
        configType: record.configType,
        businessScenes: record.businessScenes,
        examTypes: record.examTypes,
        body: record.body,
        riskPolicy: record.riskPolicy,
        validationCases: record.validationCases,
        changeSummary: record.changeSummary,
        impactScope: record.impactScope,
        dataVersion: record.dataVersion,
      });
      const result = response.data;
      if (!result) return;
      Modal.info({
        title: '静态样例校验',
        content: (
          <Space orientation="vertical" size={8}>
            <Typography.Text>{result.summary}</Typography.Text>
            {result.cases.map((item) => (
              <Tag key={item.id} color={precheckLevelColor[item.result ?? 'passed']}>
                {item.title}：{item.message}
              </Tag>
            ))}
          </Space>
        ),
      });
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '样例校验失败');
    }
  };

  const submitReview = async (record: API.AiCoachStrategy, confirmWarnings = false) => {
    try {
      await submitAiCoachStrategyReview(record.id, {
        changeSummary: record.changeSummary || `提交 ${record.title} 审核。`,
        dataVersion: record.dataVersion,
        confirmWarnings,
      });
      message.success('已提交审核');
      reload();
    } catch (error: any) {
      const errorMessage = error?.data?.errorMessage || error?.message || '提交失败';
      const precheck = error?.data?.data as API.AiCoachPrecheckResult | undefined;
      if (precheck?.level === 'warning') {
        modal.confirm({
          title: '预校验存在警告，确认提交审核？',
          content: precheck.summary,
          okText: '确认提交',
          cancelText: '取消',
          onOk: () => submitReview(record, true),
        });
        return;
      }
      message.error(errorMessage);
    }
  };

  const columns = useMemo<ProColumns<API.AiCoachStrategy>[]>(
    () => [
      {
        title: '策略 ID',
        dataIndex: 'id',
        width: 210,
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
        title: '策略名称',
        dataIndex: 'keyword',
        width: 280,
        render: (_, record) => (
          <Space orientation="vertical" size={0} style={{ width: '100%', minWidth: 0 }}>
            <Button
              type="link"
              size="small"
              title={record.title}
              style={{
                ...textEllipsisStyle,
                height: 22,
                padding: 0,
                textAlign: 'left',
              }}
              onClick={() => goDetail(record)}
            >
              {record.title}
            </Button>
            <Typography.Text
              type="secondary"
              ellipsis={{ tooltip: record.description }}
              style={textEllipsisStyle}
            >
              {record.description}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: '配置类型',
        dataIndex: 'configType',
        width: 130,
        hideInSearch: activeKey !== 'all',
        valueEnum: Object.fromEntries(
          configTypeOptions.map((item) => [item.value, { text: item.label }]),
        ),
        render: (_, record) => configTypeText[record.configType],
      },
      {
        title: '业务场景',
        dataIndex: 'businessScene',
        width: 190,
        valueEnum: Object.fromEntries(
          businessSceneOptions.map((item) => [item.value, { text: item.label }]),
        ),
        render: (_, record) => (
          <Space wrap size={[4, 4]}>
            {record.businessScenes.map((scene) => (
              <Tag key={scene}>{businessSceneText[scene]}</Tag>
            ))}
          </Space>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 120,
        valueEnum: statusValueEnum,
        render: (_, record) => <StatusTag domain="reviewPublish" value={record.status} />,
      },
      {
        title: '风险',
        dataIndex: 'riskLevel',
        width: 110,
        valueEnum: Object.fromEntries(
          riskLevelOptions.map((item) => [item.value, { text: item.label }]),
        ),
        render: (_, record) => (
          <Tag color={riskLevelColor[record.riskLevel]}>
            {riskLevelText[record.riskLevel]}
          </Tag>
        ),
      },
      {
        title: '预校验',
        dataIndex: 'lastPrecheck',
        search: false,
        width: 130,
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
        title: '版本',
        dataIndex: 'version',
        width: 90,
        search: false,
      },
      {
        title: '更新人',
        dataIndex: 'updatedBy',
        width: 110,
        search: false,
      },
      {
        title: '更新时间',
        dataIndex: 'updatedAt',
        valueType: 'dateTime',
        width: 170,
        search: false,
      },
      {
        title: '操作',
        valueType: 'option',
        width: 310,
        fixed: 'right',
        render: (_, record) => (
          <Space size={4}>
            <Tooltip title="查看详情">
              <Button
                type="link"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => goDetail(record)}
              >
                查看
              </Button>
            </Tooltip>
            {canEdit && editableStatuses.includes(record.status) ? (
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => history.push(`/ai-coach/prompts/${record.id}/edit`)}
              >
                编辑
              </Button>
            ) : null}
            {canCreate && record.status === 'published' ? (
              <Button
                type="link"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => handleCopy(record)}
              >
                新草稿
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
            <Tooltip title="静态预校验">
              <Button
                type="link"
                size="small"
                icon={<SafetyCertificateOutlined />}
                onClick={() => runPrecheck(record)}
              >
                预校验
              </Button>
            </Tooltip>
            <Button
              type="link"
              size="small"
              onClick={() => runSampleValidation(record)}
            >
              样例校验
            </Button>
          </Space>
        ),
      },
    ],
    [activeKey, canCreate, canEdit, canSubmit],
  );

  const items = [
    { key: 'all', label: '全部策略' },
    ...configTypeOptions.map((item) => ({ key: item.value, label: item.label })),
  ];

  return (
    <PageContainer>
      <Tabs
        activeKey={activeKey}
        items={items}
        onChange={(key) => {
          setActiveKey(key);
          setSearchParams(key === 'all' ? {} : { configType: key });
          actionRef.current?.reload();
        }}
      />
      <ProTable<API.AiCoachStrategy>
        actionRef={actionRef}
        columns={columns}
        rowKey="id"
        search={{ labelWidth: 88 }}
        scroll={{ x: 1650 }}
        pagination={{ showSizeChanger: true, defaultPageSize: 10 }}
        request={async (params) => {
          const response = await aiCoachStrategies({
            ...params,
            configType:
              activeKey === 'all' ? params.configType : (activeKey as API.AiCoachConfigType),
          } as API.AiCoachStrategyQueryParams);
          return {
            data: response.data ?? [],
            total: response.total ?? 0,
            success: response.success !== false,
          };
        }}
        toolbar={{
          actions: [
            <Button key="reload" icon={<ReloadOutlined />} onClick={reload}>
              刷新
            </Button>,
            <PermissionButton
              key="create"
              moduleKey="aiCoach"
              action="create"
              type="primary"
              icon={<PlusOutlined />}
              onClick={() =>
                history.push(
                  activeKey === 'all'
                    ? '/ai-coach/prompts/new'
                    : `/ai-coach/prompts/new?configType=${activeKey}`,
                )
              }
            >
              新建策略
            </PermissionButton>,
          ],
        }}
      />
    </PageContainer>
  );
};

export default AiCoachStrategiesPage;
